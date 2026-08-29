import React from 'react';

interface ObjectivesPanelProps {
  enginesCrafted: number;
  stonesMined: number;
}

export const ObjectivesPanel: React.FC<ObjectivesPanelProps> = ({ enginesCrafted, stonesMined }) => {
  const objectives = [
    { id: 1, title: 'First Steps', desc: 'Mine your first resource', check: stonesMined >= 1, alwaysShow: true },
    { id: 2, title: 'Gathering', desc: 'Mine 10 resources', check: stonesMined >= 10, metric: 'stones' },
    { id: 3, title: 'Automation', desc: 'Place a Miner', check: false, metric: 'miners' },
    { id: 4, title: 'Power Up', desc: 'Build a Coal Generator', check: false, metric: 'generators' },
    { id: 5, title: 'Processing', desc: 'Build a Smelter', check: false, metric: 'smelters' },
    { id: 6, title: 'Production', desc: 'Craft 5 Iron Ingots', check: false, metric: 'ingots' },
    { id: 7, title: 'Logistics', desc: 'Build 3 Conveyors', check: false, metric: 'conveyors' },
    { id: 8, title: 'Advanced', desc: 'Build an Assembler', check: false, metric: 'assemblers' },
    { id: 9, title: 'Engineering', desc: 'Craft 3 Copper Wires', check: false, metric: 'wires' },
    { id: 10, title: 'Outpost Established!', desc: 'Craft 5 Engines', check: enginesCrafted >= 5, metric: 'engines' },
  ];

  return (
    <div style={{
      position: 'absolute', top: 50, right: 8,
      background: 'rgba(20,20,40,0.95)', border: '1px solid rgba(255,200,0,0.2)',
      borderRadius: 6, padding: 16, zIndex: 20, width: 280,
    }}>
      <div style={{ color: '#ffcc00', fontSize: 14, fontWeight: 'bold', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        🎯 Objectives
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {objectives.map(obj => {
          const completed = obj.check;
          return (
            <div key={obj.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 4,
              background: completed ? 'rgba(68,204,68,0.15)' : 'rgba(255,255,255,0.03)',
              border: completed ? '1px solid rgba(68,204,68,0.3)' : '1px solid rgba(255,255,255,0.05)',
              opacity: completed ? 1 : 0.7,
            }}>
              <span style={{ color: completed ? '#44cc44' : '#666', fontSize: 14 }}>
                {completed ? '✓' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: completed ? '#ddd' : '#888', fontSize: 11, fontWeight: completed ? 'bold' : 'normal' }}>
                  {obj.title}
                </div>
                <div style={{ color: '#666', fontSize: 10 }}>{obj.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
