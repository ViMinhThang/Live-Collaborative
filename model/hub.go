package model

type Hub struct {

	//Registered clients
	clients map[*Client]bool

	// message boardcast to all clients
	boardcast chan []byte

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
		boardcast:  make(chan []byte),
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
				close(client.content)
			}
		case message := <-h.boardcast:
			for client, status := range h.clients {
				if status == true {
					client.content <- message
				}
			}
		}
	}
}
