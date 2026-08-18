import WebSocket from 'ws';

const NUM_CLIENTS = 50;
const MSGS_PER_SEC = 20;
const DURATION_SEC = 10;
const ROOM = 'load-test-room';

async function run() {
  console.log(`Starting load test: ${NUM_CLIENTS} clients blasting ${MSGS_PER_SEC} msg/s for ${DURATION_SEC}s...`);

  const latencies = [];

  // 1. Setup Observer
  const observer = new WebSocket(`ws://localhost:3001/?room=${ROOM}&clientId=observer`);
  
  observer.on('message', (msg) => {
    const data = JSON.parse(msg);
    // We only track the specific testShape to measure latency
    if (data.type === 'delta' && data.delta.testShape) {
      const sendTime = data.delta.testShape.meta.x.timestamp;
      const latency = Date.now() - sendTime;
      latencies.push(latency);
    }
  });

  // Wait for observer
  await new Promise(r => setTimeout(r, 1000));

  // 2. Setup Blasters
  const blasters = [];
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const ws = new WebSocket(`ws://localhost:3001/?room=${ROOM}&clientId=blaster-${i}`);
    blasters.push(ws);
  }

  await new Promise(r => setTimeout(r, 2000)); // wait for connections & baseline sync

  console.log('All clients connected. Blasting...');

  const intervalMs = 1000 / MSGS_PER_SEC;

  const intervals = blasters.map((ws, i) => {
    return setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const delta = {
          "testShape": {
            data: { x: Math.random() * 100 },
            // Inject timestamp here to measure true E2E latency (including Redis Write-Then-Broadcast)
            meta: { x: { timestamp: now, clientId: `blaster-${i}` } }
          }
        };
        ws.send(JSON.stringify({ type: 'delta', delta }));
      }
    }, intervalMs);
  });

  // Run for DURATION_SEC
  await new Promise(r => setTimeout(r, DURATION_SEC * 1000));

  console.log('Stopping blasters...');
  intervals.forEach(clearInterval);
  blasters.forEach(ws => ws.close());
  
  // Wait a moment for any remaining inflight messages
  await new Promise(r => setTimeout(r, 1000));
  observer.close();

  if (latencies.length === 0) {
    console.log('No messages received by observer!');
    process.exit(1);
  }

  // Calculate metrics
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = sum / latencies.length;
  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  console.log(`\n=== LOAD TEST RESULTS ===`);
  console.log(`Total Messages Processed: ${latencies.length} (Expected: ~${NUM_CLIENTS * MSGS_PER_SEC * DURATION_SEC})`);
  console.log(`Average E2E Latency: ${avg.toFixed(2)} ms`);
  console.log(`P95 E2E Latency:     ${p95} ms`);
  console.log(`P99 E2E Latency:     ${p99} ms`);
  console.log(`=========================\n`);
}

run().catch(console.error);
