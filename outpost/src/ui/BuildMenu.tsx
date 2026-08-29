import React from 'react';
import { BUILDING_DEFS, ITEM_DISPLAY_NAMES } from '../types';
import type { Item, BuildingTypeValue } from '../types';

interface BuildMenuProps {
  onSelectBuild: (type: BuildingTypeValue) => void;
  activeBuild: BuildingTypeValue | null;
  playerInventory: Item[];
}

const BUILD_ORDER: BuildingTypeValue[] = [
  'miner', 'conveyor', 'storage', 'chest', 'generator', 'smelter', 'steel_smelter', 'assembler',
];

export const BuildMenu: React.FC<BuildMenuProps> = ({ onSelectBuild, activeBuild, playerInventory }) => {
  function canAfford(buildingType: BuildingTypeValue): boolean {
    const def = BUILDING_DEFS[buildingType];
    for (const cost of def.cost) {
      const item = playerInventory.find(i => i.type === cost.resource);
      if (!item || item.amount < cost.amount) return false;
    }
    return true;
  }

  return (
    <div style={{
      position: 'absolute', top: 50, left: 8,
      background: 'rgba(20,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6, padding: 0, zIndex: 20, minWidth: 300,
      maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
    }}>
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)',
        color: '#ffaa00', fontSize: 14, fontWeight: 'bold',
      }}>
        Build Menu
      </div>
      <div style={{ padding: 8 }}>
        {BUILD_ORDER.map(type => {
          const def = BUILDING_DEFS[type];
          const affordable = canAfford(type);

          return (
            <div
              key={type}
              onClick={() => affordable && onSelectBuild(type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', marginBottom: 4,
                background: activeBuild === type ? 'rgba(255,170,0,0.2)' :
                  affordable ? 'rgba(255,255,255,0.05)' : 'rgba(255,0,0,0.1)',
                border: activeBuild === type ? '1px solid rgba(255,170,0,0.5)' :
                  affordable ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,0,0,0.2)',
                borderRadius: 4, cursor: affordable ? 'pointer' : 'not-allowed',
                opacity: affordable ? 1 : 0.5,
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 4, background: def.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, flexShrink: 0,
              }}>
                {def.shape === 'circle' ? '\u2699' : def.shape === 'diamond' ? '\u25C6' : def.shape === 'arrow' ? '\u27A1' : '\u25A0'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#ddd', fontSize: 12, fontWeight: 'bold' }}>{def.name}</div>
                <div style={{ color: '#888', fontSize: 10 }}>{def.description}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  {def.cost.map((c, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: '1px 4px', borderRadius: 2,
                      background: affordable ? 'rgba(0,0,0,0.3)' : 'rgba(255,0,0,0.2)',
                      color: affordable ? '#aaa' : '#ff6666',
                    }}>
                      {c.amount}x {ITEM_DISPLAY_NAMES[c.resource] || c.resource}
                    </span>
                  ))}
                  {def.powerConsumed > 0 && (
                    <span style={{
                      fontSize: 9, padding: '1px 4px', borderRadius: 2,
                      background: 'rgba(255,200,0,0.2)', color: '#ffcc00',
                    }}>
                      {'\u26A1'}{def.powerConsumed}
                    </span>
                  )}
                  {def.powerProduced && (
                    <span style={{
                      fontSize: 9, padding: '1px 4px', borderRadius: 2,
                      background: 'rgba(0,255,0,0.2)', color: '#44ff44',
                    }}>
                      {'\u26A1+'}{def.powerProduced}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
