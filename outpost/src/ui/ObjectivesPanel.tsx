import React from 'react';

interface Stats {
  stonesMined: number;
  woodChopped: number;
  ingotsCrafted: number;
  enginesCrafted: number;
  ironIngotsCrafted: number;
  copperWiresCrafted: number;
  minersBuilt: number;
  generatorsBuilt: number;
  smeltersBuilt: number;
  assemblersBuilt: number;
  conveyorsBuilt: number;
  timePlayed: number;
}

interface ObjectivesPanelProps {
  stats: Stats;
}

export const ObjectivesPanel: React.FC<ObjectivesPanelProps> = ({ stats }) => {
  const objectives = [
    { id: 1, title: 'First Steps', desc: 'Mine your first resource', check: stats.stonesMined >= 1 },
    { id: 2, title: 'Gathering', desc: 'Mine 10 resources', check: stats.stonesMined >= 10 },
    { id: 3, title: 'Automation', desc: 'Place a Miner', check: stats.minersBuilt >= 1 },
    { id: 4, title: 'Power Up', desc: 'Build a Coal Generator', check: stats.generatorsBuilt >= 1 },
    { id: 5, title: 'Processing', desc: 'Build a Smelter', check: stats.smeltersBuilt >= 1 },
    { id: 6, title: 'Production', desc: 'Produce 5 Iron Ingots', check: stats.ironIngotsCrafted >= 5 },
    { id: 7, title: 'Logistics', desc: 'Build 3 Conveyors', check: stats.conveyorsBuilt >= 3 },
    { id: 8, title: 'Advanced', desc: 'Build an Assembler', check: stats.assemblersBuilt >= 1 },
    { id: 9, title: 'Engineering', desc: 'Produce 3 Copper Wires', check: stats.copperWiresCrafted >= 3 },
    { id: 10, title: 'Outpost Established!', desc: 'Produce 5 Engines', check: stats.enginesCrafted >= 5 },
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
