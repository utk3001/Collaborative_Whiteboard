# Real-Time Collaborative Whiteboard

![UI Showcase](https://img.shields.io/badge/UI-React%20%2B%20Konva-blue)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20WebSockets-brightgreen)
![State](https://img.shields.io/badge/Sync-Custom%20CRDT-purple)

A high-performance, real-time collaborative whiteboard built with a custom Conflict-Free Replicated Data Type (CRDT) sync layer. This project is designed to handle high-concurrency editing sessions with sub-millisecond local optimistic rendering and guaranteed eventual consistency across all clients—without relying on a central locking mechanism.

## 🚀 Features

- **Conflict-Free Multi-User Editing:** Powered by a custom Last-Writer-Wins (LWW) Map CRDT using Hybrid Logical Clocks (HLCs) and Client-ID tiebreakers to resolve concurrent edits deterministically.
- **Sub-Millisecond Optimistic Rendering:** Local state is updated instantly (bypassing React re-renders during active dragging) to eliminate input lag, while debounced deltas are synchronized in the background.
- **Write-Then-Broadcast Architecture:** Guarantees durable state by ensuring WebSockets only broadcast deltas via Redis Pub/Sub *after* they are successfully written to the Redis snapshot.
- **Ephemeral Multi-Cursor Presence:** Live cursor tracking bypasses the CRDT and Redis entirely, preventing state bloat while providing real-time user presence.
- **Undo/Redo Coalescing Engine:** Intelligently throttles and merges high-frequency UI events (like color picker sliding) to keep the local Undo stack clean and usable.
- **Dynamic Rooms:** Generates secure, shareable room links on the fly.

## 🛠️ Tech Stack

- **Frontend:** React, Vite, HTML5 Canvas (`react-konva`)
- **Backend:** Node.js, WebSockets (`ws`)
- **State & Pub/Sub:** Redis
- **Data Structures:** Custom LWW-Map CRDT with Hybrid Logical Clocks (HLCs)

## 🏗️ Architecture

This project is structured as a monorepo:

- `apps/client`: The React + Vite frontend application.
- `apps/server`: The Node.js WebSocket server and Redis adapter.
- `packages/crdt-core`: The headless, pure-JavaScript implementation of the LWW-Map CRDT.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker (for Redis)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/utk3001/Collaborative_Whiteboard.git
   cd Collaborative_Whiteboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Redis container:**
   ```bash
   docker-compose up -d
   ```

4. **Start the development servers:**
   ```bash
   npm run dev
   ```
   *This command leverages npm workspaces to concurrently start both the Vite frontend (`localhost:5173`) and the Node backend (`localhost:3000`).*

## 💡 How it Works: The CRDT Core

Rather than passing full state objects over the wire, this application synchronizes **deltas**. 
When a user changes a shape's color, the CRDT generates a microscopic delta containing just that specific property update, stamped with a Hybrid Logical Clock. 
If two users modify the same property at the exact same millisecond, the mathematical properties of the LWW-Map ensure that both clients will deterministically converge on the exact same final state.
