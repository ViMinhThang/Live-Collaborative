package model

import (
	"log"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Client struct {
	Hub     *Hub
	Conn    *websocket.Conn
	Send    chan []byte
	ID      string
	Counter int
}

func NewClient(ws *websocket.Conn, h *Hub) *Client {
	client := &Client{
		Hub:     h,
		Conn:    ws,
		Send:    make(chan []byte, 256),
		ID:      uuid.New().String(),
		Counter: 0,
	}
	return client
}
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
		c.Hub.Broadcast <- message
	}
}
func (client *Client) WritePump(messageType int) {
	for message := range client.Send {
		err := client.Conn.WriteMessage(messageType, message)
		if err != nil {
			log.Println("write: ", err)
		}
	}
}
