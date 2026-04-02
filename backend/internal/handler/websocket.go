package handler

import (
	"live-collaborative/internal/model"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ServeWs(hub *model.Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to websocket: %v", err)
		return
	}

	client := model.NewClient(conn, hub)
	client.Hub.Register <- client

	// Start the pumps for reading and writing
	go client.WritePump(websocket.TextMessage)
	client.ReadPump()
}
