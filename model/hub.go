package model

type Hub struct {

	//Registered clients
	Clients map[*Client]bool

	// message broadcast to all clients
	Broadcast chan []byte

	//Register request from a client
	Register chan *Client

	//Unregister request from a client
	Unregister chan *Client
}

func NewHub() *Hub {
	hub := &Hub{
		Clients:    make(map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
	}
	return hub
}
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
		case message := <-h.Broadcast:
    		for client := range h.clients {
        		select {
          			case client.Send <- message:
             		// Message sent successfully!
            		default:
              		// If the channel is full, we assume the client is stuck
                	close(client.Send)
                 	delete(h.clients, client)
        }
    }
	}
}
