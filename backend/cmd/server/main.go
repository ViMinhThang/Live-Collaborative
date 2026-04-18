package main

import (
	"flag"
	"live-collaborative/internal/database"
	"live-collaborative/internal/handler"
	"live-collaborative/internal/model"
	"live-collaborative/internal/service"
	"log"
	"net/http"

	"github.com/joho/godotenv"
)

var addr = flag.String("addr", "0.0.0.0:8080", "http server address")

func main() {
	flag.Parse()

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: No .env file found or error loading it: %v", err)
	}

	// Initialize DB
	database.Init()
	database.DB.AutoMigrate(&model.Characters{})

	// Initialize Service
	docService := &service.DocumentService{}

	// Initialize Hub with Service
	hub := model.NewHub(docService)

	// Load existing document from DB
	existingDoc, err := docService.LoadDocument()
	if err != nil {
		log.Printf("Warning: Failed to load document from DB: %v", err)
	} else {
		hub.Document = existingDoc
		log.Printf("Loaded %d characters from database", len(existingDoc))
	}

	// Start Hub and DB Worker
	go hub.Run()
	go hub.RunDBWorker()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		handler.ServeWs(hub, w, r)
	})

	log.Printf("Server is starting on port %s", *addr)
	err = http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
