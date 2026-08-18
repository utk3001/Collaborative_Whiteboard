import { LWWMap } from 'crdt-core';

export class RoomManager {
  constructor(redisAdapter) {
    this.redisAdapter = redisAdapter;
    // Map of roomId -> { map: LWWMap, clients: Set<WebSocket> }
    this.rooms = new Map();
    // Concurrency lock for room initialization
    this.pendingRooms = new Map();
  }

  /**
   * Retrieves an existing room or creates a new one safely without race conditions.
   */
  async getOrCreateRoom(roomId) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    if (this.pendingRooms.has(roomId)) {
      return this.pendingRooms.get(roomId);
    }

    const initPromise = (async () => {
      // Baseline Sync from Redis
      const snapshot = await this.redisAdapter.getSnapshot(roomId);
      const crdtMap = new LWWMap('server', snapshot || {});

      const room = {
        map: crdtMap,
        clients: new Set(),
      };
      
      this.rooms.set(roomId, room);

      // Subscribe to Redis Pub/Sub for this room's deltas (cross-node routing)
      await this.redisAdapter.subscribeToRoom(roomId, (deltaMessage) => {
        // Merge incoming cross-node delta into server's local in-memory snapshot
        room.map.merge(deltaMessage.state);
        
        // Forward the delta to all WebSockets connected to this specific Node instance
        const payload = JSON.stringify({ type: 'delta', delta: deltaMessage.state });
        for (const client of room.clients) {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(payload);
          }
        }
      });

      this.pendingRooms.delete(roomId);
      return room;
    })();

    this.pendingRooms.set(roomId, initPromise);
    return initPromise;
  }

  /**
   * Handles a new WebSocket client joining a room.
   */
  async joinRoom(roomId, clientId, ws) {
    const room = await this.getOrCreateRoom(roomId);
    room.clients.add(ws);

    // Baseline Sync: Immediately send the full CRDT state (including meta) to the new client
    ws.send(JSON.stringify({ type: 'baseline', state: room.map.state }));

    // Listen for deltas from this specific client
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'delta') {
          // 1. Merge into server's local LWWMap immediately
          room.map.merge(data.delta);

          // 2. Strict Write-Then-Broadcast enforcement:
          // Synchronously await the write to Redis, then Pub/Sub broadcast
          await this.redisAdapter.saveSnapshotAndBroadcast(roomId, room.map.state, { state: data.delta });
          
          // Note: The broadcast will be picked up by the subscribe handler above,
          // which will forward it back to the client (and all others). 
          // The client's local LWWMap idempotency will harmlessly ignore the echo.
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      room.clients.delete(ws);
      // Optional: if (room.clients.size === 0) cleanup logic here
    });
  }
}
