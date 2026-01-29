package controllers

import (
	"encoding/json"
	"log"
	"time"

	"ecs-sync-server/socket"
)

const oplogMaxAge = 1 * time.Hour

// Patch mirrors the TypeScript Patch type:
// Record<string, ComponentData | null>
type Patch map[string]interface{}

// ClientMessage is what the client sends over WebSocket.
type ClientMessage struct {
	Type         string  `json:"type"`
	Patches      []Patch `json:"patches,omitempty"`
	LastTimestamp int64   `json:"lastTimestamp,omitempty"`
}

// ServerMessage is what the server broadcasts to clients.
type ServerMessage struct {
	Type      string                 `json:"type"`
	Patches   []Patch                `json:"patches,omitempty"`
	ClientID  string                 `json:"clientId,omitempty"`
	Timestamp int64                  `json:"timestamp"`
	State     map[string]interface{} `json:"state,omitempty"`
}

// OpLogEntry stores a broadcast for replay on reconnection.
type OpLogEntry struct {
	Patches   []Patch
	ClientID  string
	Timestamp int64
	CreatedAt time.Time
}

type RoomController struct {
	hub       *socket.Hub
	timestamp int64
	oplog     []OpLogEntry
	state     map[string]interface{}
}

// NewRoomController creates a RoomController and wires it to the hub.
func NewRoomController(hub *socket.Hub) *RoomController {
	rc := &RoomController{
		hub:   hub,
		state: make(map[string]interface{}),
	}
	hub.OnMessage = rc.HandleMessage
	hub.OnTick = rc.PruneOplog
	return rc
}

func (r *RoomController) HandleMessage(client *socket.Client, data []byte) {
	var msg ClientMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Invalid message from %s: %v", client.ClientID, err)
		return
	}

	switch msg.Type {
	case "patch":
		r.handlePatch(client, msg.Patches)
	case "reconnect":
		r.handleReconnect(client, msg.LastTimestamp)
	default:
		log.Printf("Unknown message type from %s: %s", client.ClientID, msg.Type)
	}
}

func (r *RoomController) handlePatch(client *socket.Client, patches []Patch) {
	if len(patches) == 0 {
		return
	}

	r.timestamp++
	ts := r.timestamp

	// Apply patches to document state
	for _, patch := range patches {
		r.applyPatch(patch)
	}

	// Store in oplog for reconnection replay
	r.oplog = append(r.oplog, OpLogEntry{
		Patches:   patches,
		ClientID:  client.ClientID,
		Timestamp: ts,
		CreatedAt: time.Now(),
	})

	// Broadcast to ALL clients (including sender — echo protocol)
	serverMsg := ServerMessage{
		Type:      "patch",
		Patches:   patches,
		ClientID:  client.ClientID,
		Timestamp: ts,
	}

	data, err := json.Marshal(serverMsg)
	if err != nil {
		log.Printf("Failed to marshal server message: %v", err)
		return
	}

	r.hub.Broadcast(data)
}

func (r *RoomController) handleReconnect(client *socket.Client, lastTimestamp int64) {
	// Find first oplog entry after lastTimestamp
	startIdx := -1
	for i, entry := range r.oplog {
		if entry.Timestamp > lastTimestamp {
			startIdx = i
			break
		}
	}

	if lastTimestamp > 0 && startIdx == -1 && r.timestamp > lastTimestamp {
		// Client is too far behind (oplog has been pruned), send full sync
		serverMsg := ServerMessage{
			Type:      "full-sync",
			State:     r.state,
			Timestamp: r.timestamp,
		}
		data, err := json.Marshal(serverMsg)
		if err != nil {
			log.Printf("Failed to marshal full-sync: %v", err)
			return
		}
		r.hub.SendTo(client, data)
		return
	}

	if startIdx == -1 {
		return
	}

	// Replay missed operations
	for _, entry := range r.oplog[startIdx:] {
		serverMsg := ServerMessage{
			Type:      "patch",
			Patches:   entry.Patches,
			ClientID:  entry.ClientID,
			Timestamp: entry.Timestamp,
		}
		data, err := json.Marshal(serverMsg)
		if err != nil {
			continue
		}
		r.hub.SendTo(client, data)
	}
}

// applyPatch merges a patch into the document state.
// null values delete the key, otherwise fields are merged.
func (r *RoomController) applyPatch(patch Patch) {
	for key, value := range patch {
		if value == nil {
			delete(r.state, key)
			continue
		}

		valueMap, ok := value.(map[string]interface{})
		if !ok {
			r.state[key] = value
			continue
		}

		existing, exists := r.state[key]
		if !exists {
			r.state[key] = valueMap
			continue
		}

		existingMap, ok := existing.(map[string]interface{})
		if !ok {
			r.state[key] = valueMap
			continue
		}

		// Merge fields into existing component data
		for k, v := range valueMap {
			existingMap[k] = v
		}
	}
}

// PruneOplog removes oplog entries older than oplogMaxAge.
func (r *RoomController) PruneOplog() {
	cutoff := time.Now().Add(-oplogMaxAge)
	idx := 0
	for i, entry := range r.oplog {
		if entry.CreatedAt.After(cutoff) {
			idx = i
			break
		}
		idx = i + 1
	}

	if idx > 0 {
		r.oplog = r.oplog[idx:]
		log.Printf("Pruned %d oplog entries, %d remaining", idx, len(r.oplog))
	}
}
