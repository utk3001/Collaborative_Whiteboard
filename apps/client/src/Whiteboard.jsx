import React, { useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import { useSync } from './useSync';

const COLORS = ['#FF4136', '#0074D9', '#2ECC40', '#FF851B', '#B10DC9'];

export default function Whiteboard({ roomId }) {
  const { shapes, cursors, updateShape, updateCursor, addShape } = useSync(roomId);

  const handleDragMove = (e, shapeId) => {
    // Optimistic local update fires instantly
    const node = e.target;
    updateShape(shapeId, { x: node.x(), y: node.y() });
  };

  const handleMouseMove = (e) => {
    // Only broadcast cursor position occasionally (throttled/debounced in production, simple here)
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (pos) {
      updateCursor(pos.x, pos.y);
    }
  };

  const handleAddShape = () => {
    const type = Math.random() > 0.5 ? 'rect' : 'circle';
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    // Random position
    const x = Math.floor(Math.random() * 300) + 100;
    const y = Math.floor(Math.random() * 300) + 100;
    addShape(type, x, y, 100, 100, color);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', zIndex: 10, padding: 20, pointerEvents: 'none' }}>
        <h1 style={{ fontFamily: 'Inter, sans-serif', color: 'white', margin: 0, paddingBottom: 10 }}>Room: {roomId}</h1>
        <button 
          onClick={handleAddShape}
          style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', background: '#0074D9', color: 'white', border: 'none', borderRadius: 4, pointerEvents: 'auto' }}
        >
          Add Shape
        </button>
      </div>

      <Stage 
        width={window.innerWidth} 
        height={window.innerHeight} 
        onMouseMove={handleMouseMove}
      >
        <Layer>
          {Object.entries(shapes).map(([shapeId, props]) => {
            if (props.type === 'rect') {
              return (
                <Rect
                  key={shapeId}
                  x={props.x}
                  y={props.y}
                  width={props.width}
                  height={props.height}
                  fill={props.color}
                  draggable
                  onDragMove={(e) => handleDragMove(e, shapeId)}
                  shadowBlur={10}
                  shadowColor="black"
                  shadowOpacity={0.5}
                />
              );
            }
            if (props.type === 'circle') {
              return (
                <Circle
                  key={shapeId}
                  x={props.x}
                  y={props.y}
                  radius={props.width / 2}
                  fill={props.color}
                  draggable
                  onDragMove={(e) => handleDragMove(e, shapeId)}
                  shadowBlur={10}
                  shadowColor="black"
                  shadowOpacity={0.5}
                />
              );
            }
            return null;
          })}

          {/* Render Remote Cursors */}
          {Object.values(cursors).map((cursor) => {
            // Ignore stale cursors
            if (Date.now() - cursor.timestamp > 3000) return null;
            
            return (
              <React.Fragment key={cursor.clientId}>
                <Circle
                  x={cursor.x}
                  y={cursor.y}
                  radius={4}
                  fill="#FFDC00"
                />
                <Text
                  x={cursor.x + 10}
                  y={cursor.y + 10}
                  text={cursor.clientId.substring(0, 4)}
                  fontSize={14}
                  fontFamily="Inter"
                  fill="#FFDC00"
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
