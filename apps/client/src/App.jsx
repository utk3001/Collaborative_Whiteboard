import React, { useState, useEffect } from 'react';
import Whiteboard from './Whiteboard';
import './App.css';

function App() {
  const [roomId, setRoomId] = useState('');
  const [joinInput, setJoinInput] = useState('');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setRoomId(hash);
    }

    const handleHashChange = () => {
      setRoomId(window.location.hash.replace('#', ''));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleCreateRoom = () => {
    const newRoom = Math.random().toString(36).substring(2, 8);
    window.location.hash = newRoom;
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinInput.trim()) {
      window.location.hash = joinInput.trim();
    }
  };

  if (roomId) {
    return <Whiteboard roomId={roomId} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#222', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #0074D9, #B10DC9)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0, 116, 217, 0.4)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
        </div>

        <h1 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '24px', fontWeight: 700 }}>Collaborative Whiteboard</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 30px 0', fontSize: '14px', lineHeight: '1.5' }}>Draw, design, and collaborate with your team in real-time.</p>
        
        <button 
          onClick={handleCreateRoom}
          style={{ width: '100%', padding: '14px', background: '#0074D9', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s, transform 0.1s', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          onMouseOver={(e) => e.target.style.background = '#0056a3'}
          onMouseOut={(e) => e.target.style.background = '#0074D9'}
          onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
        >
          Create New Room
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>OR JOIN</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Enter Room ID" 
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '15px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            onFocus={(e) => e.target.style.border = '1px solid #0074D9'}
            onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
          />
          <button 
            type="submit"
            disabled={!joinInput.trim()}
            style={{ padding: '0 20px', background: joinInput.trim() ? 'rgba(255,255,255,0.1)' : 'transparent', color: joinInput.trim() ? 'white' : 'rgba(255,255,255,0.3)', border: joinInput.trim() ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: joinInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            onMouseOver={(e) => { if(joinInput.trim()) e.target.style.background = 'rgba(255,255,255,0.2)' }}
            onMouseOut={(e) => { if(joinInput.trim()) e.target.style.background = 'rgba(255,255,255,0.1)' }}
          >
            Join
          </button>
        </form>

      </div>
    </div>
  );
}

export default App;
