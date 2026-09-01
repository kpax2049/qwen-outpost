import React from 'react';

interface ObjectivesPanelProps {
  enginesCrafted: number;
  stonesMined: number;
}

export const ObjectivesPanel: React.FC<ObjectivesPanelProps> = ({ enginesCrafted, stonesMined }) => {
  const objectives = [
    { id: 1, title: 'First Steps', desc: 'Mine your first resource', check: stonesMined >= 1 },
    { id: 2, title: 'Gathering', desc: 'Mine 10 resources', check: stonesMined >= 10 },
    { id: 3, title: 'Automation', desc: 'Place a Miner', check: false },
    { id: 4, title: 'Power Up', desc: 'Build a Coal Generator', check: false },
    { id: 5, title: 'Processing', desc: 'Build a Smelter', check: false },
    { id: 6, title: 'Production', desc: 'Craft 5 Iron Ingots', check: false },
    { id: 7, title: 'Logistics', desc: 'Build 3 Conveyors', check: false },
    { id: 8, title: 'Advanced', desc: 'Build an Assembler', check: false },
    { id: 9, title: 'Engineering', desc: 'Craft 3 Copper Wires', check: false },
    { id: 10, title: 'Outpost Established!', desc: 'Craft 5 Engines', check: enginesCrafted >= 5 },
  ];

  return (
    <div style={{
      position: 'absolute', top: 50, right: 8,
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 20, width: 300,
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
      maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#1d242e',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}>
        <span style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
          color: '#e8edf2',
        }}>
          OBJECTIVES
        </span>
      </div>

      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {objectives.map(obj => {
          const completed = obj.check;
          return (
            <div key={obj.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              background: completed ? 'rgba(95,203,147,.08)' : '#101720',
              border: completed ? '1px solid rgba(95,203,147,.2)' : '1px solid rgba(255,255,255,.07)',
              borderRadius: 3,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 3,
                background: completed ? '#5fcb93' : '#101418',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12, color: completed ? '#0b0e12' : '#5e6873',
                }}>
                  {completed ? '✓' : ''}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 12, color: completed ? '#e8edf2' : '#94a2b0',
                  fontWeight: completed ? 600 : 400,
                }}>
                  {obj.title}
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 11, color: '#7e8c9a', marginTop: 2,
                }}>
                  {obj.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
