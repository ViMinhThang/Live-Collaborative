package model

type Hub struct {

	//Registered clients
	clients map[*Client]bool

	// message broadcast to all clients
	broadcast chan []byte

	//Register request from a client
	register chan *Client

	//Unregister request from a client
	unregister chan *Client
}

func NewHub() *Hub {
	hub := &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
	return hub
}
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client, status := range h.clients {
				if status == true {
					client.send <- message
				}
			}
		}
	}
}
