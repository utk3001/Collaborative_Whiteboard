import Whiteboard from './Whiteboard';
import './App.css';

function App() {
  // Use URL hash for dynamic rooms, default to 'demo'
  const roomId = window.location.hash.replace('#', '') || 'demo';

  return (
    <Whiteboard roomId={roomId} />
  );
}

export default App;
