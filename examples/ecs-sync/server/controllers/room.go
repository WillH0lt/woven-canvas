package controllers

import (
	"encoding/json"
	"log"

	"ecs-sync-server/models"
	"ecs-sync-server/socket"
)

type RoomController struct {
	hub        *socket.Hub
	timestamp  int64
	state      map[string]models.ComponentData
	timestamps map[string]models.FieldTimestamps
}

// NewRoomController creates a RoomController and wires it to the hub.
func NewRoomController(hub *socket.Hub) *RoomController {
	rc := &RoomController{
		hub:        hub,
		state:      make(map[string]models.ComponentData),
		timestamps: make(map[string]models.FieldTimestamps),
	}
	hub.OnMessage = rc.HandleMessage
	return rc
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
	if len(req.Patches) == 0 {
		return
	}

	r.timestamp++
	ts := r.timestamp

	// Apply patches to document state
	for _, patch := range req.Patches {
		r.applyPatch(patch, ts)
	}

	// Ack the sender with their messageId and the assigned timestamp
	ack := models.AckResponse{
		Type:      "ack",
		MessageID: req.MessageID,
		Timestamp: ts,
	}
	if ackData, err := json.Marshal(ack); err == nil {
		r.hub.SendTo(client, ackData)
	}

	// Broadcast patches to all other clients
	broadcast := models.PatchBroadcast{
		Type:      "patch",
		Patches:   req.Patches,
		ClientID:  client.ClientID,
		Timestamp: ts,
	}
	if data, err := json.Marshal(broadcast); err == nil {
		r.hub.BroadcastExcept(client, data)
	}
}

func (r *RoomController) handleReconnect(client *socket.Client, req models.ReconnectRequest) {
	// Apply offline patches the client accumulated while disconnected
	if len(req.Patches) > 0 {
		r.timestamp++
		ts := r.timestamp

		for _, patch := range req.Patches {
			r.applyPatch(patch, ts)
		}

		// Broadcast offline patches to other clients
		broadcast := models.PatchBroadcast{
			Type:      "patch",
			Patches:   req.Patches,
			ClientID:  client.ClientID,
			Timestamp: ts,
		}
		if data, err := json.Marshal(broadcast); err == nil {
			r.hub.BroadcastExcept(client, data)
		}
	}

	// Build diff since client's last known timestamp
	diff := r.buildDiff(req.LastTimestamp)
	if len(diff) == 0 {
		return
	}

	response := models.PatchBroadcast{
		Type:      "patch",
		Patches:   []models.Patch{diff},
		Timestamp: r.timestamp,
	}
	data, err := json.Marshal(response)
	if err != nil {
		log.Printf("Failed to marshal reconnect patch: %v", err)
		return
	}
	r.hub.SendTo(client, data)
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

// applyPatch merges a patch into the document state and records
// field-level timestamps. A patch with _exists: false replaces the
// entry entirely (clearing old fields) to act as a tombstone.
func (r *RoomController) applyPatch(patch models.Patch, ts int64) {
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
