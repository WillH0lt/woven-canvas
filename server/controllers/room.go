package controllers

import (
	"encoding/json"
	"log"

	"ecs-sync-server/models"
	"ecs-sync-server/socket"
)

type RoomController struct {
	hub            *socket.Hub
	timestamp      int64
	state          map[string]models.ComponentData
	timestamps     map[string]models.FieldTimestamps
	ephemeralState map[string]models.Patch
}

// NewRoomController creates a RoomController and wires it to the hub.
func NewRoomController(hub *socket.Hub) *RoomController {
	rc := &RoomController{
		hub:            hub,
		state:          make(map[string]models.ComponentData),
		timestamps:     make(map[string]models.FieldTimestamps),
		ephemeralState: make(map[string]models.Patch),
	}
	hub.OnMessage = rc.HandleMessage
	hub.OnConnect = rc.handleConnect
	hub.OnDisconnect = rc.handleDisconnect
	return rc
}

func (r *RoomController) broadcastClientCount(count int) {
	msg := models.ClientCountBroadcast{
		Type:  "clientCount",
		Count: count,
	}
	if data, err := json.Marshal(msg); err == nil {
		r.hub.Broadcast(data)
	}
}

func (r *RoomController) handleConnect(client *socket.Client, count int) {
	// Send existing ephemeral state from all other clients to the new client
	snapshot := r.buildEphemeralSnapshot(client.ClientID)
	if len(snapshot) > 0 {
		msg := models.PatchBroadcast{
			Type:             "patch",
			EphemeralPatches: []models.Patch{snapshot},
			ClientID:         "",
			Timestamp:        r.timestamp,
		}
		if data, err := json.Marshal(msg); err == nil {
			r.hub.SendTo(client, data)
		}
	}

	r.broadcastClientCount(count)
}

func (r *RoomController) handleDisconnect(client *socket.Client, count int) {
	// Clean up ephemeral state for the disconnected client
	if ephPatch, ok := r.ephemeralState[client.ClientID]; ok {
		// Build deletion patch for all keys this client owned
		deletionPatch := make(models.Patch, len(ephPatch))
		for key := range ephPatch {
			deletionPatch[key] = map[string]interface{}{"_exists": false}
		}
		delete(r.ephemeralState, client.ClientID)

		// Broadcast deletions to remaining clients
		if len(deletionPatch) > 0 {
			broadcast := models.PatchBroadcast{
				Type:             "patch",
				EphemeralPatches: []models.Patch{deletionPatch},
				ClientID:         client.ClientID,
				Timestamp:        r.timestamp,
			}
			if data, err := json.Marshal(broadcast); err == nil {
				r.hub.Broadcast(data)
			}
		}
	}

	r.broadcastClientCount(count)
}

func (r *RoomController) HandleMessage(client *socket.Client, data []byte) {
	var envelope struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &envelope); err != nil {
		log.Printf("Invalid message from %s: %v", client.ClientID, err)
		return
	}

	switch envelope.Type {
	case "patch":
		var req models.PatchRequest
		if err := json.Unmarshal(data, &req); err != nil {
			log.Printf("Invalid patch message from %s: %v", client.ClientID, err)
			return
		}
		r.handlePatch(client, req)
	case "reconnect":
		var req models.ReconnectRequest
		if err := json.Unmarshal(data, &req); err != nil {
			log.Printf("Invalid reconnect message from %s: %v", client.ClientID, err)
			return
		}
		r.handleReconnect(client, req)
	default:
		log.Printf("Unknown message type from %s: %s", client.ClientID, envelope.Type)
	}
}

func (r *RoomController) handlePatch(client *socket.Client, req models.PatchRequest) {
	hasDoc := len(req.DocumentPatches) > 0
	hasEph := len(req.EphemeralPatches) > 0
	if !hasDoc && !hasEph {
		return
	}

	// Apply document patches to persistent state
	if hasDoc {
		r.timestamp++
		for _, patch := range req.DocumentPatches {
			r.applyDocumentPatch(patch, r.timestamp)
		}
	}

	// Store ephemeral patches namespaced by client
	if hasEph {
		r.applyEphemeralPatch(client.ClientID, req.EphemeralPatches)
	}

	// Ack the sender with their messageId and the assigned timestamp
	ack := models.AckResponse{
		Type:      "ack",
		MessageID: req.MessageID,
		Timestamp: r.timestamp,
	}
	if ackData, err := json.Marshal(ack); err == nil {
		r.hub.SendTo(client, ackData)
	}

	// Broadcast to all other clients
	broadcast := models.PatchBroadcast{
		Type:      "patch",
		ClientID:  client.ClientID,
		Timestamp: r.timestamp,
	}
	if hasDoc {
		broadcast.DocumentPatches = req.DocumentPatches
	}
	if hasEph {
		broadcast.EphemeralPatches = req.EphemeralPatches
	}
	if data, err := json.Marshal(broadcast); err == nil {
		r.hub.BroadcastExcept(client, data)
	}
}

func (r *RoomController) handleReconnect(client *socket.Client, req models.ReconnectRequest) {
	hasDoc := len(req.DocumentPatches) > 0
	hasEph := len(req.EphemeralPatches) > 0

	// Apply offline document patches and restore ephemeral state
	if hasDoc {
		r.timestamp++
		for _, patch := range req.DocumentPatches {
			r.applyDocumentPatch(patch, r.timestamp)
		}
	}
	if hasEph {
		r.applyEphemeralPatch(client.ClientID, req.EphemeralPatches)
	}

	// Broadcast both to other clients in a single message
	if hasDoc || hasEph {
		broadcast := models.PatchBroadcast{
			Type:      "patch",
			ClientID:  client.ClientID,
			Timestamp: r.timestamp,
		}
		if hasDoc {
			broadcast.DocumentPatches = req.DocumentPatches
		}
		if hasEph {
			broadcast.EphemeralPatches = req.EphemeralPatches
		}
		if data, err := json.Marshal(broadcast); err == nil {
			r.hub.BroadcastExcept(client, data)
		}
	}

	// Send document diff since client's last known timestamp
	diff := r.buildDiff(req.LastTimestamp)

	// Merge all OTHER clients' ephemeral state to send to the reconnecting client
	othersEph := r.buildEphemeralSnapshot(client.ClientID)

	if len(diff) == 0 && len(othersEph) == 0 {
		return
	}

	response := models.PatchBroadcast{
		Type:      "patch",
		ClientID:  "",
		Timestamp: r.timestamp,
	}
	if len(diff) > 0 {
		response.DocumentPatches = []models.Patch{diff}
	}
	if len(othersEph) > 0 {
		response.EphemeralPatches = []models.Patch{othersEph}
	}
	data, err := json.Marshal(response)
	if err != nil {
		log.Printf("Failed to marshal reconnect patch: %v", err)
		return
	}
	r.hub.SendTo(client, data)
}

// applyEphemeralPatch merges patches into the ephemeral state for a client.
func (r *RoomController) applyEphemeralPatch(clientID string, patches []models.Patch) {
	existing, ok := r.ephemeralState[clientID]
	if !ok {
		existing = make(models.Patch)
		r.ephemeralState[clientID] = existing
	}
	for _, patch := range patches {
		for key, value := range patch {
			valueMap, ok := value.(map[string]interface{})
			if !ok {
				existing[key] = value
				continue
			}
			if ex, ok := valueMap["_exists"]; ok && ex == false {
				delete(existing, key)
			} else {
				existing[key] = value
			}
		}
	}
}

// buildEphemeralSnapshot merges ephemeral state from all clients except the given one.
func (r *RoomController) buildEphemeralSnapshot(excludeClientID string) models.Patch {
	merged := make(models.Patch)
	for clientID, patch := range r.ephemeralState {
		if clientID == excludeClientID {
			continue
		}
		for key, value := range patch {
			merged[key] = value
		}
	}
	return merged
}

// buildDiff walks the timestamps record and collects all state fields
// that changed after the given timestamp into a single patch.
func (r *RoomController) buildDiff(since int64) models.Patch {
	diff := make(models.Patch)

	for key, fieldTs := range r.timestamps {
		stateMap := r.state[key]
		fieldDiff := make(models.ComponentData)
		for field, ts := range fieldTs {
			if ts > since {
				fieldDiff[field] = stateMap[field]
			}
		}
		if len(fieldDiff) > 0 {
			diff[key] = fieldDiff
		}
	}

	return diff
}

// applyDocumentPatch merges a patch into the document state and records
// field-level timestamps. A patch with _exists: false replaces the
// entry entirely (clearing old fields) to act as a tombstone.
func (r *RoomController) applyDocumentPatch(patch models.Patch, ts int64) {
	for key, value := range patch {
		valueMap, ok := value.(map[string]interface{})
		if !ok {
			log.Printf("Unexpected non-map value for key %s, skipping", key)
			continue
		}

		// _exists: false replaces the entire entry, clearing old fields
		if exists, ok := valueMap["_exists"]; ok && exists == false {
			r.state[key] = valueMap
			r.setFieldTimestamps(key, valueMap, ts)
			continue
		}

		existing, exists := r.state[key]
		if !exists {
			r.state[key] = valueMap
			r.setFieldTimestamps(key, valueMap, ts)
			continue
		}

		// Merge fields into existing component data and record timestamps
		for k, v := range valueMap {
			existing[k] = v
		}
		for k := range valueMap {
			r.timestamps[key][k] = ts
		}
	}
}

// setFieldTimestamps creates a new timestamp entry for all fields in a component.
func (r *RoomController) setFieldTimestamps(key string, fields models.ComponentData, ts int64) {
	tsMap := make(models.FieldTimestamps, len(fields))
	for k := range fields {
		tsMap[k] = ts
	}
	r.timestamps[key] = tsMap
}
