package models

// ComponentData is a map of field names to values for a single component.
type ComponentData map[string]interface{}

// FieldTimestamps tracks the last-modified timestamp for each field in a component.
type FieldTimestamps map[string]int64

// Patch is a set of component updates keyed by stableId/componentName.
type Patch map[string]interface{}

// --- Client requests ---

// PatchRequest is sent by a client to apply mutations.
// May contain document patches, ephemeral patches, or both.
type PatchRequest struct {
	Type             string  `json:"type"`
	MessageID        string  `json:"messageId"`
	DocumentPatches  []Patch `json:"documentPatches,omitempty"`
	EphemeralPatches []Patch `json:"ephemeralPatches,omitempty"`
}

// ReconnectRequest is sent by a client to catch up after a disconnect.
// DocumentPatches contains offline changes the server hasn't seen yet.
// EphemeralPatches contains the client's current ephemeral state to restore.
type ReconnectRequest struct {
	Type             string  `json:"type"`
	LastTimestamp     int64   `json:"lastTimestamp"`
	DocumentPatches  []Patch `json:"documentPatches,omitempty"`
	EphemeralPatches []Patch `json:"ephemeralPatches,omitempty"`
}

// --- Server responses ---

// AckResponse is sent back to the sender to confirm a patch was applied.
type AckResponse struct {
	Type      string `json:"type"`
	MessageID string `json:"messageId"`
	Timestamp int64  `json:"timestamp"`
}

// PatchBroadcast is sent to other clients when state changes.
// May contain document patches, ephemeral patches, or both.
type PatchBroadcast struct {
	Type             string  `json:"type"`
	DocumentPatches  []Patch `json:"documentPatches,omitempty"`
	EphemeralPatches []Patch `json:"ephemeralPatches,omitempty"`
	ClientID         string  `json:"clientId"`
	Timestamp        int64   `json:"timestamp"`
}

// ClientCountBroadcast is sent to all clients when the connected client count changes.
type ClientCountBroadcast struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}
