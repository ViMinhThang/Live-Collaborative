package main

import (
	"flag"
	"log"
	"net/http"
	"networking/model"

	"github.com/gorilla/websocket"
)

var addr = flag.String("addr", "localhost:8080", "http server address")

var upgrader = websocket.Upgrader{}

func serveWs(h *model.Hub, w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("upgrade: ", err)
	}
	defer c.Close()
	client := model.NewClient(c, h)
	client.Hub.Register <- client
	go client.WritePump(1)
	client.ReadPump()

}

func main() {
	hub := model.NewHub()
	go hub.Run()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	log.Printf("Server is starting on port %s", *addr)
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAnServe: ", err)
	}
}
