import React from 'react';
import { ITEM_DISPLAY_NAMES, ITEM_COLORS, BUILDING_NAMES } from '../types';
import type { Item, Tile } from '../types';

interface InventoryPanelProps {
  playerInventory: Item[];
  nearbyBuildings: Tile[];
  playerStats: {
    stonesMined: number;
    ingotsCrafted: number;
    enginesCrafted: number;
    timePlayed: number;
  };
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ playerInventory, nearbyBuildings, playerStats }) => {
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 8, right: 8,
      background: 'rgba(20,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6, zIndex: 20, display: 'flex', gap: 0,
      maxHeight: '50vh',
    }}>
      {/* Player Inventory */}
      <div style={{ flex: 1, padding: 12, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ color: '#44aaff', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
          Player Inventory
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {playerInventory.length === 0 && (
            <div style={{ color: '#666', fontSize: 11 }}>Empty - mine resources with [E]</div>
          )}
          {playerInventory.map((item, idx) => {
            const color = ITEM_COLORS[item.type] || '#888';
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', background: 'rgba(255,255,255,0.05)',
                borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 2, background: color,
                  boxShadow: `0 0 4px ${color}44`,
                }} />
                <span style={{ color: '#ddd', fontSize: 11 }}>
                  {ITEM_DISPLAY_NAMES[item.type] || item.type}
                </span>
                <span style={{ color: '#4488ff', fontSize: 11, fontWeight: 'bold' }}>
                  x{item.amount}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
          <div style={{ color: '#888', fontSize: 10 }}>
            Stones: {playerStats.stonesMined} | Ingots: {playerStats.ingotsCrafted} | Engines: {playerStats.enginesCrafted} | Time: {formatTime(playerStats.timePlayed)}
          </div>
        </div>
      </div>

      {/* Nearby Buildings */}
      <div style={{ flex: 2, padding: 12 }}>
        <div style={{ color: '#ffaa00', fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
          Nearby Buildings
        </div>
        {nearbyBuildings.length === 0 ? (
          <div style={{ color: '#666', fontSize: 11 }}>No buildings nearby. Move closer or place buildings.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {nearbyBuildings.map((tile, idx) => {
              if (!tile.building) return null;
              const b = tile.building;
              const totalItems = b.inventory.reduce((s, i) => s + i.amount, 0);
              const name = BUILDING_NAMES[b.type] || b.type;

              return (
                <div key={idx} style={{
                  padding: '4px 8px', background: b.active ? 'rgba(0,0,0,0.3)' : 'rgba(100,0,0,0.3)',
                  borderRadius: 4, border: `1px solid ${b.active ? 'rgba(68,204,68,0.3)' : 'rgba(204,68,68,0.3)'}`,
                  minWidth: 120,
                }}>
                  <div style={{ color: b.active ? '#ddd' : '#888', fontSize: 10, fontWeight: 'bold' }}>
                    {b.active ? '\u25CF' : '\u25CB'} {name}
                  </div>
                  <div style={{ color: '#888', fontSize: 9 }}>
                    {totalItems > 0 ? `${totalItems} items` : 'empty'}
                  </div>
                  {b.maxProgress > 1 && (
                    <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                      {Math.floor((b.progress / b.maxProgress) * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
