import React from 'react';
import { ITEM_DISPLAY_NAMES, BUILDING_NAMES } from '../types';
import type { Item, Tile, ItemType } from '../types';

const SPRITE_BASE = '/assets/relay-seven';

function itemSpritePath(type: string): string {
  const map: Record<string, string> = {
    stone: 'R-item-stone',
    iron: 'R-item-iron',
    copper: 'R-item-copper',
    coal: 'R-item-coal',
    gold: 'R-item-gold',
    iron_ingot: 'R-item-ingot',
    copper_wire: 'R-item-wire',
    steel_plate: 'R-item-plate',
    circuit: 'R-item-circuit',
    gear: 'R-item-gear',
    engine: 'R-item-engine',
    wood: 'R-item-wood',
  };
  return map[type] ?? null;
}

function buildingSpritePath(type: string): string {
  const map: Record<string, string> = {
    storage: 'R-b-storage',
    chest: 'R-b-chest',
    generator: 'R-b-generator',
    miner: 'R-b-miner',
    conveyor: 'R-b-conveyor',
    smelter: 'R-b-smelter',
    steel_smelter: 'R-b-steel',
    assembler: 'R-b-assembler',
  };
  return map[type] ?? null;
}

const COMMON_MATERIALS: string[] = [
  'stone', 'iron', 'copper', 'coal', 'gold',
  'iron_ingot', 'copper_wire', 'steel_plate', 'circuit', 'gear', 'engine',
];

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

/** Minimized inventory bar — always visible at bottom center. */
export const MinimizedInventoryBar: React.FC<{ playerInventory: Item[] }> = ({ playerInventory }) => (
  <div style={{
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 1,
    padding: '5px 8px',
    background: '#141a20',
    border: '1px solid #2a333c',
    boxShadow: 'inset 0 1px 0 #39434d',
    borderRadius: 2,
    zIndex: 15,
    overflow: 'hidden',
  }}>
    {COMMON_MATERIALS.map(type => {
      const invItem = playerInventory.find(i => i.type === type);
      if (!invItem || invItem.amount <= 0) return null;
      const spritePath = itemSpritePath(type);
      const displayName = ITEM_DISPLAY_NAMES[type as ItemType] || type;
      return (
        <div
          key={type}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 6px',
            background: '#0f151b',
            border: '1px solid #232c34',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {spritePath && (
            <img
              src={`${SPRITE_BASE}/${spritePath}.png`}
              width={16}
              height={16}
              alt={displayName}
              style={{ imageRendering: 'pixelated', flexShrink: 0 }}
            />
          )}
          <span style={{
            fontSize: 10, color: '#94a3af',
            fontFamily: "'IBM Plex Sans', sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 60,
          }}>
            {displayName}
          </span>
          <span style={{
            fontSize: 10, color: '#e6ebef', fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            flexShrink: 0,
          }}>
            x{invItem.amount}
          </span>
        </div>
      );
    })}
    {playerInventory.every(i => i.amount <= 0) && (
      <span style={{
        fontSize: 10, color: '#5a6a7a',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        Empty
      </span>
    )}
  </div>
);

/** Expanded inventory panel — shown when inventory is toggled open. */
export const InventoryPanel: React.FC<InventoryPanelProps> = ({ playerInventory, nearbyBuildings }) => {
  const totalTypes = playerInventory.length;
  const totalItems = playerInventory.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{
      position: 'absolute', top: 56, right: 8, bottom: 36,
      width: 272,
      background: '#141a20',
      border: '1px solid #2a333c',
      boxShadow: 'inset 0 1px 0 #39434d',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        background: '#1b232c',
        borderBottom: '1px solid #2a333c',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: '#cbd6e0',
        }}>
          INVENTORY
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: '#6f7d89',
        }}>
          {totalTypes} types, {totalItems} items
        </span>
      </div>

      {/* Player Inventory */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 10px',
      }}>
        {playerInventory.length === 0 ? (
          <div style={{
            color: '#5a6a7a',
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '12px 0',
            textAlign: 'center',
          }}>
            Empty - mine resources with [E]
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {playerInventory.map((item, idx) => {
              const spritePath = itemSpritePath(item.type);
              const displayName = ITEM_DISPLAY_NAMES[item.type as ItemType] || item.type;
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  background: '#0f151b',
                  border: '1px solid #232c34',
                  borderRadius: 2,
                }}>
                  {spritePath ? (
                    <img
                      src={`${SPRITE_BASE}/${spritePath}.png`}
                      width={24}
                      height={24}
                      alt={displayName}
                      style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 14, height: 14, borderRadius: 2, background: '#555',
                      flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: 11, color: '#cbd6e0', flex: 1,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}>
                    {displayName}
                  </span>
                  <span style={{
                    fontSize: 12, color: '#e6ebef', fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    x{item.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: '#2a333c',
        flexShrink: 0,
      }} />

      {/* Nearby Buildings */}
      <div style={{
        maxHeight: '45%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '6px 10px 4px',
          borderBottom: '1px solid #2a333c',
          background: '#1b232c',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: '#ffb347',
          }}>
            NEARBY BUILDINGS
          </span>
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
        }}>
          {nearbyBuildings.length === 0 ? (
            <div style={{
              color: '#5a6a7a',
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
              padding: '8px 0',
              textAlign: 'center',
            }}>
              No buildings nearby.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nearbyBuildings.map((tile, idx) => {
                if (!tile.building) return null;
                const b = tile.building;
                const totalItems = b.inventory.reduce((s, i) => s + i.amount, 0);
                const name = BUILDING_NAMES[b.type] || b.type;
                const spritePath = buildingSpritePath(b.type);
                const progressPct = b.maxProgress > 1
                  ? Math.floor((b.progress / b.maxProgress) * 100)
                  : 0;

                return (
                  <div key={idx} style={{
                    background: b.active ? '#0f151b' : '#1a0f0f',
                    border: `1px solid ${b.active ? '#232c34' : '#3a1a1a'}`,
                    borderRadius: 2,
                    padding: '5px 6px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {spritePath ? (
                        <img
                          src={`${SPRITE_BASE}/${spritePath}.png`}
                          width={32}
                          height={32}
                          alt={name}
                          style={{
                            imageRendering: 'pixelated',
                            opacity: b.active ? 1 : 0.5,
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginBottom: 1,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: b.active ? '#7ddc8a' : '#ec6058',
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 11, color: b.active ? '#cbd6e0' : '#7a6a6a',
                            fontFamily: "'Chakra Petch', sans-serif",
                            fontWeight: 600, letterSpacing: '.06em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {name}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 9, color: '#5a6a7a',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}>
                          {totalItems > 0 ? `${totalItems} items` : 'empty'}
                          {b.maxProgress > 1 && ` · ${progressPct}%`}
                        </div>
                        {b.maxProgress > 1 && (
                          <div style={{
                            marginTop: 4,
                            position: 'relative',
                            height: 10,
                            background: '#080b0e',
                            boxShadow: '0 0 0 1px #12161a, inset 0 -1px 0 #3d454c',
                            overflow: 'hidden',
                            borderRadius: 1,
                          }}>
                            <div style={{
                              position: 'absolute',
                              left: 1, right: 1, top: 2, bottom: 2,
                              background: 'repeating-linear-gradient(90deg, #161e24 0 5.5%, #080b0e 5.5% 7%)',
                            }} />
                            <div style={{
                              position: 'absolute',
                              left: 1, top: 2, bottom: 2,
                              width: `${Math.max(0, progressPct)}%`,
                              background: 'repeating-linear-gradient(90deg, #7ddc8a 0 5.5%, #0d1a12 5.5% 7%)',
                            }} />
                            <div style={{
                              position: 'absolute',
                              left: 1, right: 1, top: 2, height: 1,
                              background: 'rgba(255,255,255,.12)',
                            }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
