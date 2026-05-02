# LiveSync — Real-Time Collaborative Editor

A real-time collaborative text editor using CRDT (Conflict-free Replicated Data Type) for conflict-free concurrent editing.

## Architecture

```
frontend/  →  React 19 + TypeScript + Vite 8 + Tailwind CSS v4
backend/   →  Go 1.26 + Gorilla WebSocket + PostgreSQL (GORM)
infra      →  Docker Compose + Nginx + Jenkins CI/CD
```

## How it works

- **CRDT with fractional indexing**: Each character gets a position array between its neighbors. Concurrent inserts at the same position generate deeper positions without conflict.
- **Vector clocks**: Track per-user event counters for causal ordering.
- **WebSocket broadcast**: All connected clients receive real-time updates.
- **Optimistic updates**: Local edits appear instantly; server confirms asynchronously.
- **PostgreSQL persistence**: Document state persists across restarts.

## Quick start

### Prerequisites

- Go 1.26+
- Node.js 24+
- PostgreSQL 16+

### Development

```bash
# Backend
cd backend
cp .env.example .env   # set DATABASE_URL
go run ./cmd/server

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up -d
```

- Frontend: http://localhost:5000
- Backend WebSocket: ws://localhost:5000/ws

## Tests

```bash
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm test
```

## CI/CD

Two pipelines (both active):
- **Jenkins** (`Jenkinsfile`): Builds Docker images, pushes to GHCR, deploys to EC2
- **GitHub Actions** (`.github/workflows/`): Build, trivy-scan, cosign-sign, and deploy to staging → production

## Project structure

```
backend/
├── cmd/server/main.go       # Entry point
├── internal/
│   ├── database/            # PostgreSQL connection
│   ├── handler/             # WebSocket upgrade
│   ├── model/               # CRDT types, Hub, Client
│   └── service/             # DB operations
frontend/
├── src/
│   ├── App.tsx              # Editor UI
│   ├── hooks/use-editor.ts  # WebSocket + CRDT hook
│   ├── lib/crdt.ts          # CRDT implementation
│   └── components/ui/       # shadcn UI components
```
