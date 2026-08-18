import { LWWMap } from './LWWMap.js';

describe('LWWMap CRDT Core', () => {

  test('Conflict Resolution (Concurrent Writes)', () => {
    const time = Date.now();
    
    const clientA = new LWWMap('client-A');
    const clientB = new LWWMap('client-B');

    // Both clients modify the same property at the exact same timestamp
    clientA.set('shape-1', 'x', 100, time);
    clientB.set('shape-1', 'x', 200, time);

    clientA.merge(clientB.state);
    clientB.merge(clientA.state);

    // 'client-B' > 'client-A' lexicographically, so client-B should win the tiebreak
    expect(clientA.get()['shape-1'].x).toBe(200);
    expect(clientB.get()['shape-1'].x).toBe(200);
  });

  test('Commutativity (A merge B == B merge A)', () => {
    const clientA = new LWWMap('A');
    const clientB = new LWWMap('B');

    clientA.set('s1', 'color', 'red', 10);
    clientB.set('s1', 'color', 'blue', 20); // Higher timestamp
    
    clientA.set('s2', 'x', 50, 30);
    clientB.set('s2', 'x', 60, 15); // Lower timestamp

    // Create clones for identical execution tests
    const cloneA1 = new LWWMap('A', clientA.state);
    const cloneB1 = new LWWMap('B', clientB.state);

    const cloneA2 = new LWWMap('A', clientA.state);
    const cloneB2 = new LWWMap('B', clientB.state);

    // A merges B
    cloneA1.merge(cloneB1.state);
    // B merges A
    cloneB2.merge(cloneA2.state);

    expect(cloneA1.state).toEqual(cloneB2.state);
    
    const view = cloneA1.get();
    expect(view['s1'].color).toBe('blue'); // B won
    expect(view['s2'].x).toBe(50); // A won
  });

  test('Idempotency (A merge B merge B == A merge B)', () => {
    const clientA = new LWWMap('A');
    const clientB = new LWWMap('B');

    clientA.set('s1', 'x', 10, 100);
    clientB.set('s1', 'x', 20, 200);

    clientA.merge(clientB.state);
    const stateAfterFirstMerge = JSON.parse(JSON.stringify(clientA.state));
    
    // Merge again
    clientA.merge(clientB.state);
    clientA.merge(clientB.state);
    
    expect(clientA.state).toEqual(stateAfterFirstMerge);
  });

  test('Associativity (A merge (B merge C) == (A merge B) merge C)', () => {
    const clientA = new LWWMap('A');
    const clientB = new LWWMap('B');
    const clientC = new LWWMap('C');

    clientA.set('s1', 'val', 1, 10);
    clientB.set('s1', 'val', 2, 20);
    clientC.set('s1', 'val', 3, 30);

    // (A merge B) merge C
    const result1 = new LWWMap('A', clientA.state);
    result1.merge(clientB.state);
    result1.merge(clientC.state);

    // A merge (B merge C)
    const bMergeC = new LWWMap('B', clientB.state);
    bMergeC.merge(clientC.state);
    
    const result2 = new LWWMap('A', clientA.state);
    result2.merge(bMergeC.state);

    expect(result1.state).toEqual(result2.state);
  });

  test('Tombstone Deletions', () => {
    const clientA = new LWWMap('A');
    const clientB = new LWWMap('B');

    clientA.set('s1', 'x', 10, 100);
    clientB.merge(clientA.state);

    // Client B deletes it
    clientB.delete('s1', 200);

    // Client A sends a delayed property update
    clientA.set('s1', 'y', 20, 150);

    clientA.merge(clientB.state);
    clientB.merge(clientA.state);

    // The shape should be deleted in the materialized view for both
    expect(clientA.get()['s1']).toBeUndefined();
    expect(clientB.get()['s1']).toBeUndefined();
    
    // But the data internally should still contain the delayed 'y' update (just hidden by the tombstone)
    expect(clientA.state['s1'].data.y).toBe(20);
  });

  test('End-to-End Convergence (N-Replicas with Random Interleaved Updates)', () => {
    const N = 3;
    const clients = Array.from({ length: N }, (_, i) => new LWWMap(`client-${i}`));

    // Simulate random concurrent updates
    for (let i = 0; i < 50; i++) {
      const client = clients[Math.floor(Math.random() * N)];
      const shapeId = `shape-${Math.floor(Math.random() * 5)}`;
      const prop = Math.random() > 0.5 ? 'x' : 'y';
      const val = Math.floor(Math.random() * 100);
      
      // Simulate slight timestamp skew
      const time = Date.now() + Math.floor(Math.random() * 10 - 5);
      
      client.set(shapeId, prop, val, time);
    }

    // Gossip everything to everyone (Network partition heals)
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          clients[i].merge(clients[j].state);
        }
      }
    }
    // One more full round to ensure complete propagation
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          clients[i].merge(clients[j].state);
        }
      }
    }

    // Assert all replicas converged to identical byte-state
    const finalState = clients[0].state;
    for (let i = 1; i < N; i++) {
      expect(clients[i].state).toEqual(finalState);
    }
  });
});
