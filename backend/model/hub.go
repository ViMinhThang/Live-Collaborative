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

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan BroadcastMsg
	Register   chan *Client
	Unregister chan *Client
	Document   []Char
}

func NewHub() *Hub {
	hub := &Hub{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan BroadcastMsg),
		Document:   []Char{},
	}
	return hub
}
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			// Sync current document state
			docData, _ := json.Marshal(h.Document)
			syncEvent, _ := json.Marshal(Event{
				Type: "SYNC",
				Data: json.RawMessage(docData),
			})
			client.Send <- syncEvent
		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
		case msg := <-h.Broadcast:
			var event Event
			if err := json.Unmarshal(msg.Data, &event); err != nil {
				log.Printf("Unmarshal: %v", err)
				continue
			}

			switch event.Type {
			case "INSERT":
				var char Char
				if err := json.Unmarshal(event.Data, &char); err != nil {
					log.Printf("Unmarshal char: %v", err)
					continue
				}
				if char.ID.Counter <= msg.Sender.Counter {
					log.Printf("Duplicate event from %s (counter %d <= %d)", msg.Sender.ID, char.ID.Counter, msg.Sender.Counter)
					continue
				}
				msg.Sender.Counter = char.ID.Counter
				h.handleInsert(char)
			case "DELETE":
				var deleteReq struct {
					Position []int  `json:"position"`
					ID       CharID `json:"id"`
				}
				if err := json.Unmarshal(event.Data, &deleteReq); err != nil {
					log.Printf("Unmarshal delete: %v", err)
					continue
				}
				h.handleDelete(deleteReq.Position, deleteReq.ID)
			default:
				log.Printf("Unknown event type: %s", event.Type)
			}
			for client := range h.Clients {
				if client == msg.Sender {
					continue
				}
				select {
				case client.Send <- msg.Data:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		}
	}
}

func (h *Hub) handleInsert(newChar Char) {
	index := sort.Search(len(h.Document), func(i int) bool {
		return IsLess(newChar, h.Document[i])
	})

	h.Document = append(h.Document[:index], append([]Char{newChar}, h.Document[index:]...)...)
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
			break
		}
	}
}
