package model

import (
	"encoding/json"
	"log"
	"sort"
)

type BroadcastMsg struct {
	Data   []byte
	Sender *Client
}

type DBOpType string

const (
	OpInsert DBOpType = "INSERT"
	OpDelete DBOpType = "DELETE"
)

const (
	EventTypeInsert   = "INSERT"
	EventTypeDelete   = "DELETE"
	EventTypeSync     = "SYNC"
	EventTypePresence = "PRESENCE"
)

type DBOp struct {
	Type DBOpType
	Char Char
}

// DocumentRepository defines the interface for database operations
type DocumentRepository interface {
	InsertCharacter(char Char)
	DeleteCharacter(position []int, id CharID)
	DeleteTombstones()
}

type Hub struct {
	Clients         map[*Client]bool
	Broadcast       chan BroadcastMsg
	Register        chan *Client
	Unregister      chan *Client
	Document        []Char
	SaveQueue       chan DBOp
	Repo            DocumentRepository
	VectorClock     VectorClock
	Presences       map[string]Presence
	opsSinceCompact int
}

func NewHub(repo DocumentRepository) *Hub {
	hub := &Hub{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan BroadcastMsg),
		Document:   []Char{},
		SaveQueue:  make(chan DBOp, 1024),
		Repo:       repo,
		VectorClock: make(VectorClock),
		Presences:  make(map[string]Presence),
	}
	return hub
}

func (h *Hub) RunDBWorker() {
	for op := range h.SaveQueue {
		if h.Repo == nil {
			continue
		}
		switch op.Type {
		case OpInsert:
			h.Repo.InsertCharacter(op.Char)
		case OpDelete:
			h.Repo.DeleteCharacter(op.Char.Position, op.Char.ID)
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.register(client)
		case client := <-h.Unregister:
			h.unregister(client)
		case msg := <-h.Broadcast:
			h.handleBroadcast(msg)
		}
	}
}

func (h *Hub) register(client *Client) {
	h.Clients[client] = true
	docData, err := json.Marshal(h.Document)
	if err != nil {
		log.Printf("Failed to marshal document for sync: %v", err)
		return
	}

	presences := make([]Presence, 0, len(h.Presences))
	for _, p := range h.Presences {
		presences = append(presences, p)
	}

	syncEvent, err := json.Marshal(Event{
		Type:      EventTypeSync,
		Data:      json.RawMessage(docData),
		Clock:     h.VectorClock,
		Presences: presences,
	})
	if err != nil {
		log.Printf("Failed to marshal sync event: %v", err)
		return
	}
	client.Send <- syncEvent
}

func (h *Hub) unregister(client *Client) {
	if _, ok := h.Clients[client]; ok {
		delete(h.Clients, client)
		delete(h.Presences, client.ID)
		close(client.Send)
	}
}

func (h *Hub) handleBroadcast(msg BroadcastMsg) {
	var event Event
	if err := json.Unmarshal(msg.Data, &event); err != nil {
		log.Printf("Unmarshal broadcast event: %v", err)
		return
	}

	switch event.Type {
	case EventTypeInsert:
		h.processInsert(event)
	case EventTypeDelete:
		h.processDelete(event)
	case EventTypePresence:
		h.processPresence(event, msg.Sender)
		return
	default:
		log.Printf("Unknown event type: %s", event.Type)
		return
	}

	h.broadcastToOthers(msg.Data, msg.Sender)
}

func (h *Hub) processInsert(event Event) {
	var char Char
	if err := json.Unmarshal(event.Data, &char); err != nil {
		log.Printf("Unmarshal char: %v", err)
		return
	}

	// Causal ordering check via vector clock
	if lastCounter, seen := h.VectorClock[char.ID.UserID]; seen && char.ID.Counter <= lastCounter {
		log.Printf("Stale insert from %s (counter %d <= %d)", char.ID.UserID, char.ID.Counter, lastCounter)
		return
	}

	h.VectorClock = MergeClocks(h.VectorClock, char.Clock)
	h.handleInsert(char)
	h.SaveQueue <- DBOp{Type: OpInsert, Char: char}
}

func (h *Hub) processDelete(event Event) {
	var deleteReq struct {
		Position []int  `json:"position"`
		ID       CharID `json:"id"`
	}
	if err := json.Unmarshal(event.Data, &deleteReq); err != nil {
		log.Printf("Unmarshal delete: %v", err)
		return
	}

	h.handleDelete(deleteReq.Position, deleteReq.ID)
	h.SaveQueue <- DBOp{
		Type: OpDelete,
		Char: Char{Position: deleteReq.Position, ID: deleteReq.ID},
	}
}

func (h *Hub) processPresence(event Event, sender *Client) {
	var presence Presence
	if err := json.Unmarshal(event.Data, &presence); err != nil {
		log.Printf("Unmarshal presence: %v", err)
		return
	}

	h.Presences[sender.ID] = presence

	h.broadcastToOthers(marshalPresenceEvent(presence), sender)
}

func marshalPresenceEvent(presence Presence) []byte {
	presenceData, _ := json.Marshal(presence)
	event := Event{
		Type: EventTypePresence,
		Data: json.RawMessage(presenceData),
	}
	data, _ := json.Marshal(event)
	return data
}

func (h *Hub) broadcastToOthers(data []byte, sender *Client) {
	for client := range h.Clients {
		if client == sender {
			continue
		}
		select {
		case client.Send <- data:
		default:
			h.unregister(client)
		}
	}
}

func (h *Hub) checkCompaction() {
	h.opsSinceCompact++
	if h.opsSinceCompact >= 500 {
		h.compactTombstones()
	}
}

func (h *Hub) compactTombstones() {
	h.opsSinceCompact = 0
	before := len(h.Document)
	kept := make([]Char, 0, before)
	for _, c := range h.Document {
		if !c.Deleted {
			kept = append(kept, c)
		}
	}
	h.Document = kept
	log.Printf("Compacted document: %d tombstones removed, %d characters remain", before-len(h.Document), len(h.Document))
	if h.Repo != nil {
		h.Repo.DeleteTombstones()
	}
}

func (h *Hub) handleInsert(newChar Char) {
	index := sort.Search(len(h.Document), func(i int) bool {
		return IsLess(newChar, h.Document[i])
	})

	// Dedup by (userId, counter) at insertion point
	if index < len(h.Document) &&
		h.Document[index].ID.UserID == newChar.ID.UserID &&
		h.Document[index].ID.Counter == newChar.ID.Counter {
		return
	}

	h.Document = append(h.Document[:index], append([]Char{newChar}, h.Document[index:]...)...)
	h.checkCompaction()
}

func (h *Hub) handleDelete(targetPos []int, targetID CharID) {
	// 1. Fast search to the neighborhood
	index := sort.Search(len(h.Document), func(i int) bool {
		// We look for the first element >= our target position (using ComparePositions)
		return ComparePositions(h.Document[i].Position, targetPos) >= 0
	})

	// 2. Linear check in case of ties at that position
	for i := index; i < len(h.Document); i++ {
		// If we've moved past the target position entirely, stop
		if ComparePositions(h.Document[i].Position, targetPos) != 0 {
			break
		}
		// If IDs match, we found our target!
		if h.Document[i].ID == targetID {
			h.Document[i].Deleted = true
			h.checkCompaction()
			break
		}
	}
}
