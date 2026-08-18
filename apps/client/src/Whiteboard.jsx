import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, RegularPolygon, Star, Transformer } from 'react-konva';
import { useSync } from './useSync';

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
  '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
  '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130'
];

export default function Whiteboard({ roomId }) {
  const { shapes, cursors, updateShape, updateCursor, addShape, undo, redo, clearAll, undoStack, redoStack, pushUndo } = useSync(roomId);
  
  const [selectedType, setSelectedType] = React.useState('rect');
  const [selectedColor, setSelectedColor] = React.useState('#0074D9');
  const [selectedShapeId, setSelectedShapeId] = React.useState(null);
  const [showClearModal, setShowClearModal] = React.useState(false);
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const trRef = useRef();
  const layerRef = useRef();
  const dragStartStates = useRef({});

  const currentColor = selectedShapeId && shapes[selectedShapeId] ? shapes[selectedShapeId].color : selectedColor;

  // Attach transformer to selected shape
  useEffect(() => {
    if (selectedShapeId && layerRef.current && trRef.current) {
      const node = layerRef.current.findOne('#' + selectedShapeId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedShapeId, shapes]);

  const handleDragStart = (e, shapeId) => {
    dragStartStates.current[shapeId] = {
      x: e.target.x(),
      y: e.target.y()
    };
  };

  const handleDragMove = (e, shapeId) => {
    // Optimistic local update fires instantly, skip undo stack spam
    const node = e.target;
    updateShape(shapeId, { x: node.x(), y: node.y() }, false, true);
  };

  const handleDragEnd = (e, shapeId) => {
    const prevState = dragStartStates.current[shapeId];
    if (prevState) {
      pushUndo(shapeId, prevState, { x: e.target.x(), y: e.target.y() });
    }
  };

  const handleTransformEnd = (e, shapeId) => {
    const node = e.target;
    updateShape(shapeId, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation()
    });
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (pos) {
      updateCursor(pos.x, pos.y);
    }
  };

  const checkDeselect = (e) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedShapeId(null);
      setShowColorPicker(false);
    }
  };

  const handleAddShape = () => {
    const x = Math.floor(Math.random() * 300) + 100;
    const y = Math.floor(Math.random() * 300) + 100;
    addShape(selectedType, x, y, 100, 100, selectedColor);
  };

  const handleDeleteSelected = () => {
    if (selectedShapeId) {
      updateShape(selectedShapeId, { _deleted: true });
      setSelectedShapeId(null);
    }
  };

  // Keep track of stack length to force React re-render when they change
  const [undoLength, setUndoLength] = React.useState(0);
  const [redoLength, setRedoLength] = React.useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (undoStack.current.length !== undoLength) setUndoLength(undoStack.current.length);
      if (redoStack.current.length !== redoLength) setRedoLength(redoStack.current.length);
    }, 100);
    return () => clearInterval(interval);
  }, [undoLength, redoLength, undoStack, redoStack]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a1a', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', zIndex: 10, padding: 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', color: 'white', margin: 0, fontSize: '28px', fontWeight: 700 }}>Room: {roomId}</h1>
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                const btn = document.getElementById('copy-btn');
                if (btn) {
                  btn.innerText = 'Copied!';
                  setTimeout(() => btn.innerText = 'Copy Link', 2000);
                }
              }}
              id="copy-btn"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'all 0.2s' }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              Copy Link
            </button>
            <button 
              onClick={() => window.location.hash = ''}
              style={{ background: 'rgba(255,65,54,0.1)', color: '#FF4136', border: '1px solid rgba(255,65,54,0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'all 0.2s' }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,65,54,0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,65,54,0.1)'}
            >
              Leave Room
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', pointerEvents: 'auto', background: 'rgba(40, 40, 40, 0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          
          {/* HISTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '1px', fontWeight: 600 }}>History</label>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', height: '38px', boxSizing: 'border-box' }}>
              <button 
                onClick={undo}
                disabled={undoLength === 0}
                style={{ 
                  width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: undoLength > 0 ? 'pointer' : 'not-allowed', 
                  background: 'transparent', color: undoLength > 0 ? 'white' : 'rgba(255,255,255,0.3)', 
                  border: 'none', borderRadius: '6px', transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { if (undoLength > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { if (undoLength > 0) e.currentTarget.style.background = 'transparent'; }}
                title="Undo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 14 4 9 9 4"></polyline>
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                </svg>
              </button>

              <button 
                onClick={redo}
                disabled={redoLength === 0}
                style={{ 
                  width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: redoLength > 0 ? 'pointer' : 'not-allowed', 
                  background: 'transparent', color: redoLength > 0 ? 'white' : 'rgba(255,255,255,0.3)', 
                  border: 'none', borderRadius: '6px', transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { if (redoLength > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={(e) => { if (redoLength > 0) e.currentTarget.style.background = 'transparent'; }}
                title="Redo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 14 20 9 15 4"></polyline>
                  <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ width: '1px', height: '38px', background: 'rgba(255,255,255,0.1)' }} />

          {/* SHAPE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '1px', fontWeight: 600 }}>Shape</label>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', height: '38px', boxSizing: 'border-box' }}>
              <button title="Rectangle" onClick={() => setSelectedType('rect')} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType === 'rect' ? '#0074D9' : 'transparent', color: selectedType === 'rect' ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedType === 'rect' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
              </button>

              <button title="Circle" onClick={() => setSelectedType('circle')} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType === 'circle' ? '#0074D9' : 'transparent', color: selectedType === 'circle' ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedType === 'circle' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
              </button>

              <button title="Triangle" onClick={() => setSelectedType('triangle')} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType === 'triangle' ? '#0074D9' : 'transparent', color: selectedType === 'triangle' ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedType === 'triangle' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
              </button>

              <button title="Hexagon" onClick={() => setSelectedType('hexagon')} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType === 'hexagon' ? '#0074D9' : 'transparent', color: selectedType === 'hexagon' ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedType === 'hexagon' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              </button>

              <button title="Star" onClick={() => setSelectedType('star')} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType === 'star' ? '#0074D9' : 'transparent', color: selectedType === 'star' ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedType === 'star' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </button>
            </div>
          </div>

          <div style={{ width: '1px', height: '38px', background: 'rgba(255,255,255,0.1)' }} />

          {/* COLOR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '1px', fontWeight: 600 }}>Color</label>
            <div 
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ width: '44px', height: '38px', borderRadius: '8px', cursor: 'pointer', background: currentColor, border: '1px solid rgba(255,255,255,0.2)', boxSizing: 'border-box' }}
            />
            
            {showColorPicker && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }} onClick={() => setShowColorPicker(false)} />
                <div style={{ position: 'absolute', top: '100%', marginTop: '10px', left: 0, background: '#222', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
                    {COLOR_PALETTE.map(c => (
                      <div 
                        key={c} 
                        onClick={() => {
                          setSelectedColor(c);
                          if (selectedShapeId) updateShape(selectedShapeId, { color: c });
                          setShowColorPicker(false);
                        }}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', transform: currentColor === c ? 'scale(1.2)' : 'none', transition: 'transform 0.1s' }}
                      />
                    ))}
                  </div>
                  
                  <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '1px', fontWeight: 600 }}>CUSTOM</span>
                    <input 
                      type="color" 
                      value={currentColor}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setSelectedColor(newColor);
                        if (selectedShapeId) updateShape(selectedShapeId, { color: newColor });
                      }}
                      style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={handleAddShape}
            style={{ marginLeft: '4px', padding: '0 20px', height: '38px', fontSize: '14px', cursor: 'pointer', background: '#0074D9', color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'background 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
            onMouseOver={(e) => e.target.style.background = '#0056a3'}
            onMouseOut={(e) => e.target.style.background = '#0074D9'}
          >
            Add Shape
          </button>

          <div style={{ width: '1px', height: '38px', background: 'rgba(255,255,255,0.1)', marginLeft: '4px' }} />
          
          {/* ACTIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter, sans-serif', letterSpacing: '1px', fontWeight: 600 }}>Manage</label>
            <div style={{ display: 'flex', gap: '8px', height: '38px' }}>
              <button 
                onClick={handleDeleteSelected}
                disabled={!selectedShapeId}
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: selectedShapeId ? 'pointer' : 'not-allowed', 
                  background: selectedShapeId ? '#FF4136' : 'rgba(255,255,255,0.1)', 
                  color: selectedShapeId ? 'white' : 'rgba(255,255,255,0.3)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  transition: 'all 0.2s ease', 
                  boxShadow: selectedShapeId ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' 
                }}
                onMouseOver={(e) => { if (selectedShapeId) e.currentTarget.style.background = '#d13228'; }}
                onMouseOut={(e) => { if (selectedShapeId) e.currentTarget.style.background = '#FF4136'; }}
                title="Delete Selected Shape"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>

              <button 
                onClick={() => setShowClearModal(true)}
                style={{ padding: '0 16px', height: '38px', fontSize: '13px', cursor: 'pointer', background: 'transparent', color: '#FF4136', border: '1px solid #FF4136', borderRadius: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'background 0.2s ease' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 65, 54, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Clear All
              </button>
            </div>
          </div>

        </div>
      </div>

      <Stage 
        width={window.innerWidth} 
        height={window.innerHeight} 
        onMouseMove={handleMouseMove}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        <Layer ref={layerRef}>
          {Object.entries(shapes).map(([shapeId, props]) => {
            if (props._deleted) return null; // Filter out tombstones

            const commonProps = {
              id: shapeId,
              key: shapeId,
              x: props.x,
              y: props.y,
              scaleX: props.scaleX || 1,
              scaleY: props.scaleY || 1,
              rotation: props.rotation || 0,
              fill: props.color,
              draggable: true,
              onClick: () => setSelectedShapeId(shapeId),
              onTap: () => setSelectedShapeId(shapeId),
              onDragStart: (e) => handleDragStart(e, shapeId),
              onDragMove: (e) => handleDragMove(e, shapeId),
              onDragEnd: (e) => handleDragEnd(e, shapeId),
              onTransformEnd: (e) => handleTransformEnd(e, shapeId),
              shadowBlur: selectedShapeId === shapeId ? 20 : 10,
              shadowColor: selectedShapeId === shapeId ? "#0074D9" : "black",
              shadowOpacity: selectedShapeId === shapeId ? 0.8 : 0.5
            };

            switch (props.type) {
              case 'rect':
                return <Rect {...commonProps} width={props.width} height={props.height} />;
              case 'circle':
                return <Circle {...commonProps} radius={props.width / 2} />;
              case 'triangle':
                return <RegularPolygon {...commonProps} sides={3} radius={props.width / 2} />;
              case 'hexagon':
                return <RegularPolygon {...commonProps} sides={6} radius={props.width / 2} />;
              case 'star':
                return <Star {...commonProps} numPoints={5} innerRadius={props.width / 4} outerRadius={props.width / 2} />;
              default:
                return null;
            }
          })}

          {selectedShapeId && (
            <Transformer 
              ref={trRef} 
              boundBoxFunc={(oldBox, newBox) => {
                // Prevent scaling too small
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}

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
                  fontFamily="Inter, sans-serif"
                  fill="#FFDC00"
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>

      {/* Custom Clear All Modal */}
      {showClearModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#222', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '320px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', color: 'white', margin: '0 0 10px 0', fontSize: '20px' }}>Clear Whiteboard?</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', fontSize: '14px', lineHeight: '1.5' }}>This will permanently delete all shapes for everyone in the room. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowClearModal(false)}
                style={{ flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              >Cancel</button>
              <button 
                onClick={() => { clearAll(); setShowClearModal(false); }}
                style={{ flex: 1, padding: '10px 16px', background: '#FF4136', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = '#d13228'}
                onMouseOut={(e) => e.target.style.background = '#FF4136'}
              >Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
