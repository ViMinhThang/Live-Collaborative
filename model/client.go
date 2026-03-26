package model

import "github.com/gorilla/websocket"

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

func NewClient(ws *websocket.Conn, h *Hub) *Client {
	client := &Client{
		hub:  h,
		conn: ws,
		send: make(chan []byte),
	}
	return client
}
