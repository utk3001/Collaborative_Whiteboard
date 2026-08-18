import WebSocket from 'ws';

async function runTest() {
  console.log('Testing WebSocket Delta Routing...');
  
  const clientA = new WebSocket('ws://localhost:3001/?room=test-room&clientId=A');
  const clientB = new WebSocket('ws://localhost:3001/?room=test-room&clientId=B');
  const clientC = new WebSocket('ws://localhost:3001/?room=other-room&clientId=C');

  let receivedByB = false;
  let receivedByC = false;

  clientB.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'delta') {
      console.log('Client B received delta successfully!');
      receivedByB = true;
    }
  });

  clientC.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'delta') {
      console.error('FAIL: Client C received delta meant for test-room!');
      receivedByC = true;
    }
  });

  // Wait for connections and baseline syncs to finish
  await new Promise(r => setTimeout(r, 1000));

  // Client A sends a delta
  const delta = {
    "shape-xyz": {
      data: { x: 500 },
      meta: { x: { timestamp: Date.now(), clientId: 'A' } }
    }
  };

  console.log('Client A sending delta...');
  clientA.send(JSON.stringify({ type: 'delta', delta }));

  // Wait to allow routing
  await new Promise(r => setTimeout(r, 1000));

  if (receivedByB && !receivedByC) {
    console.log('SUCCESS: Delta routing works. Room isolation verified.');
  } else {
    console.log('FAILED.');
  }

  clientA.close();
  clientB.close();
  clientC.close();
  process.exit(0);
}

runTest();
