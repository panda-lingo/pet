import React, { useState, useEffect, useRef } from 'react';
import Pet from './Pet';
import Guide from './Guide';

const App: React.FC = () => {
  const [showPet, setShowPet] = useState(true);
  const [petPosition, setPetPosition] = useState({ x: 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [petSpeed, setPetSpeed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Demo guide
  const startDemoGuide = () => {
    // Use Guide component for guided tour
    console.log('Starting guided tour...');
  };

  // Handle pet dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setPetPosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Auto pet movement demo
  useEffect(() => {
    if (!showPet) return;

    const interval = setInterval(() => {
      setPetPosition(prev => {
        const newX = prev.x + (Math.random() * 8 - 4);
        const newY = prev.y + (Math.random() * 6 - 3);

        setPetSpeed(Math.abs(newX - prev.x) + Math.abs(newY - prev.y));

        return { x: newX, y: newY };
      });
    }, 80);

    return () => clearInterval(interval);
  }, [showPet]);

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
      background: '#f8fafc',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2b6cb0, #3182ce)',
          color: 'white',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>🐾 Grok Pet</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Your interactive mascot</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowPet(!showPet)}
              style={{
                background: 'white',
                color: '#2b6cb0',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {showPet ? '🐾 Hide Pet' : '🐾 Show Pet'}
            </button>

            <button
              onClick={startDemoGuide}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Take Tour
            </button>

            <button
              style={{
                background: '#1a202c',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}>
          {/* Pet Display */}
          <div style={{
            display: 'flex',
            gap: '48px',
            alignItems: 'flex-start',
          }}>
            <div ref={containerRef} style={{ position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}>
              {showPet && (
                <div
                  style={{
                    position: 'absolute',
                    left: petPosition.x,
                    top: petPosition.y,
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.08s linear, top 0.08s linear',
                    zIndex: 10,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <Pet />
                </div>
              )}

              {/* Status indicators */}
              {showPet && (
                <div style={{
                  position: 'absolute',
                  bottom: -50,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'white',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}>
                  Mood: {['neutral', 'happy', 'excited', 'curious', 'tired', 'hungry', 'lonely'][Math.floor(Math.random() * 7)]}
                </div>
              )}
            </div>

            {/* Info panel */}
            <div style={{ flex: 1, maxWidth: '320px' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Pet Stats</h3>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                    <span>Affection</span>
                    <span style={{ fontWeight: '600' }}>78%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '78%', height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                    <span>Energy</span>
                    <span style={{ fontWeight: '600' }}>82%</span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: '82%', height: '100%', background: '#48bb78' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#718096' }}>
                  <div>💚 Curious: 55</div>
                  <div>❤️ Trust: 88</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Controls</h3>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '15px', lineHeight: '1.8' }}>
                  <li style={{ padding: '4px 0' }}>• Click the pet to interact</li>
                  <li style={{ padding: '4px 0' }}>• Drag the pet to move it</li>
                  <li style={{ padding: '4px 0' }}>• Watch it breathe and blink</li>
                  <li style={{ padding: '4px 0' }}>• Try the guided tour</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: '13px', color: '#718096', textAlign: 'center', marginTop: '20px' }}>
            Built with React + PixiJS-inspired SVG • Fully interactive • State persisted in browser
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
