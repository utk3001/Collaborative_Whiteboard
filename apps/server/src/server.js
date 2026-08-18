import { WebSocketServer } from 'ws';
import http from 'http';
import { RedisAdapter } from './RedisAdapter.js';
import { RoomManager } from './RoomManager.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer();
const wss = new WebSocketServer({ server });

const redisAdapter = new RedisAdapter(process.env.REDIS_URL || 'redis://localhost:6379');
const roomManager = new RoomManager(redisAdapter);

wss.on('connection', async (ws, req) => {
  // Parse URL: ws://localhost:3001/?room=room1&clientId=user1
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default-room';
  const clientId = url.searchParams.get('clientId') || Math.random().toString(36).substring(7);

  console.log(`Client ${clientId} connecting to room ${roomId}`);
  
  try {
    await roomManager.joinRoom(roomId, clientId, ws);
  } catch (err) {
    console.error('Failed to join room', err);
    ws.close();
  }
});

if (process.env.METRICS === 'true') {
  let lastCpu = process.cpuUsage();
  let lastTime = process.hrtime.bigint();
  setInterval(() => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage(lastCpu);
    lastCpu = process.cpuUsage();
    
    const time = process.hrtime.bigint();
    const timeDiffMs = Number(time - lastTime) / 1000000;
    lastTime = time;
    
    // CPU usage percent: (user + system time in ms) / wall clock time in ms
    const cpuPercent = ((cpu.user + cpu.system) / 1000) / timeDiffMs * 100;
    console.log(`METRICS | CPU: ${cpuPercent.toFixed(2)}% | Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  }, 2000);
}

server.listen(PORT, async () => {
  await redisAdapter.connect();
  console.log(`WebSocket server listening on port ${PORT}`);
});

export { server, wss, redisAdapter };
