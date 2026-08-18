import { createClient } from 'redis';

export class RedisAdapter {
  constructor(redisUrl = 'redis://localhost:6379') {
    this.client = createClient({ url: redisUrl });
    this.subscriber = this.client.duplicate();

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
  }

  async connect() {
    await this.client.connect();
    await this.subscriber.connect();
    console.log('Connected to Redis for state persistence and pub/sub.');
  }

  async getSnapshot(roomId) {
    const data = await this.client.get(`room:${roomId}:snapshot`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Enforces Write-Then-Broadcast ordering durability guarantee.
   * Updates the persisted snapshot synchronously,
   * then broadcasts the delta via Pub/Sub to other instances.
   */
  async saveSnapshotAndBroadcast(roomId, snapshot, delta) {
    // We use a Redis MULTI transaction to guarantee atomicity.
    // The SET happens, and the PUBLISH happens immediately after.
    const multi = this.client.multi();
    
    multi.set(`room:${roomId}:snapshot`, JSON.stringify(snapshot));
    multi.publish(`room:${roomId}:deltas`, JSON.stringify(delta));
    
    await multi.exec();
  }

  async subscribeToRoom(roomId, callback) {
    await this.subscriber.subscribe(`room:${roomId}:deltas`, (message) => {
      callback(JSON.parse(message));
    });
  }

  async disconnect() {
    await this.subscriber.unsubscribe();
    await this.client.quit();
    await this.subscriber.quit();
  }
}
