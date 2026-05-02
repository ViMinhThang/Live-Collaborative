package main

import (
	"context"
	"flag"
	"live-collaborative/internal/database"
	"live-collaborative/internal/handler"
	"live-collaborative/internal/model"
	"live-collaborative/internal/service"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handler.ServeWs(hub, w, r)
	})

	srv := &http.Server{Addr: *addr}
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server is starting on port %s", *addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("ListenAndServe: ", err)
		}
	}()

	<-shutdown
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)

	// Close the save queue (DB worker will drain remaining items)
	close(hub.SaveQueue)
	log.Println("Server stopped")
}
