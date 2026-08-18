import { RedisAdapter } from './RedisAdapter.js';

async function test() {
  const adapter = new RedisAdapter();
  await adapter.connect();

  const roomId = 'test-room-1';

  // 1. Subscribe to the room to catch the broadcast
  await adapter.subscribeToRoom(roomId, (delta) => {
    console.log('Received Broadcast Delta:', delta);
  });

  // 2. Perform Write-Then-Broadcast
  const dummySnapshot = { shapes: { "shape-1": { x: 100, y: 100 } } };
  const dummyDelta = { id: "shape-1", x: 100, y: 100, _timestamp: Date.now() };
  
  console.log('Saving snapshot and broadcasting delta...');
  await adapter.saveSnapshotAndBroadcast(roomId, dummySnapshot, dummyDelta);

  // Wait a moment for pub/sub message to arrive
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Verify Snapshot
  const loadedSnapshot = await adapter.getSnapshot(roomId);
  console.log('Loaded Snapshot from Redis:', loadedSnapshot);

  await adapter.disconnect();
}

test().catch(console.error);
