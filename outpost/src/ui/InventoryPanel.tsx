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

  const totalItems = playerInventory.reduce((sum, item) => sum + item.amount, 0);
  const totalTypes = playerInventory.filter(i => i.amount > 0).length;

  return (
    <div style={{
      position: 'absolute', bottom: 8, left: 8, right: 8,
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 20, display: 'flex', flexDirection: 'column',
      maxHeight: '50vh',
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#1d242e',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}>
        <span style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
          color: '#e8edf2',
        }}>
          CARRYING
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: '#6e7b88',
        }}>
          {totalTypes} types · {totalItems} items
        </span>
      </div>

      <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, overflowY: 'auto' }}>
        {playerInventory.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: '#6e7b88',
          }}>
            Empty — mine resources with [E]
          </div>
        )}
        {playerInventory.map((item, idx) => {
          if (item.amount <= 0) return null;
          const color = ITEM_COLORS[item.type] || '#94a2b0';
          const isCoal = item.type === 'coal';
          const isOre = ['iron', 'copper', 'gold'].includes(item.type);

          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', background: '#101720', borderRadius: 3,
            }}>
              <div style={{
                width: 14, height: 14,
                background: color,
                border: '2px solid #101418',
                borderRadius: isCoal ? '50%' : isOre ? '2px' : '2px',
                transform: isOre ? 'rotate(45deg)' : undefined,
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12, color: '#c6d2de',
              }}>
                {ITEM_DISPLAY_NAMES[item.type] || item.type}
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12, color: '#e8edf2',
              }}>
                {item.amount}
              </span>
            </div>
          );
        })}
      </div>

      {nearbyBuildings.length > 0 && (
        <>
          <div style={{
            padding: '8px 14px', background: '#101720',
            borderTop: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 10, letterSpacing: '.16em',
              color: '#6e7b88', marginBottom: 6,
            }}>
              NEARBY BUILDINGS
            </div>
          </div>
          <div style={{
            padding: '0 10px 10px',
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            {nearbyBuildings.map((tile, idx) => {
              if (!tile.building) return null;
              const b = tile.building;
              const totalItems = b.inventory.reduce((s, i) => s + i.amount, 0);

              return (
                <div key={idx} style={{
                  padding: '4px 8px',
                  background: b.active ? '#2e4a2c' : '#101418',
                  border: `1px solid ${b.active ? 'rgba(95,203,147,.3)' : 'rgba(236,96,88,.3)'}`,
                  borderRadius: 3,
                  minWidth: 100,
                }}>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, color: b.active ? '#e8edf2' : '#5e6873',
                  }}>
                    {b.active ? '\u25CF' : '\u25CB'} {BUILDING_NAMES[b.type] || b.type}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, color: '#7e8c9a', marginTop: 2,
                  }}>
                    {totalItems > 0 ? `${totalItems} items` : 'empty'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{
        padding: '8px 14px', background: '#101720',
        borderTop: '1px solid rgba(255,255,255,.08)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: '#7e8c9a',
      }}>
        <span>Stones: {playerStats.stonesMined}</span>
        <span>Ingots: {playerStats.ingotsCrafted}</span>
        <span>Engines: {playerStats.enginesCrafted}</span>
        <span>Time: {formatTime(playerStats.timePlayed)}</span>
      </div>
    </div>
  );
};
