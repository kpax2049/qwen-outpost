import React from 'react';
import { BUILDING_DEFS, ITEM_DISPLAY_NAMES, BUILDING_NAMES } from '../types';
import type { Item, BuildingTypeValue } from '../types';

const SPRITE_BASE = '/assets/relay-seven';

interface BuildMenuProps {
  onSelectBuild: (type: BuildingTypeValue) => void;
  activeBuild: BuildingTypeValue | null;
  selectedBuild: BuildingTypeValue | null;
  onDetailSelect: (type: BuildingTypeValue | null) => void;
  playerInventory: Item[];
}

const BUILD_ORDER: BuildingTypeValue[] = [
  'miner', 'conveyor', 'storage', 'chest', 'generator', 'smelter', 'steel_smelter', 'assembler',
];

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

function itemSpritePath(type: string): string | null {
  const map: Record<string, string> = {
    stone: 'R-item-stone',
    iron: 'R-item-iron',
    copper: 'R-item-copper',
    coal: 'R-item-coal',
    gold: 'R-item-gold',
    wood: 'R-item-wood',
    iron_ingot: 'R-item-ingot',
    copper_wire: 'R-item-wire',
    steel_plate: 'R-item-plate',
    circuit: 'R-item-circuit',
    gear: 'R-item-gear',
    engine: 'R-item-engine',
  };
  return map[type] ?? null;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  onSelectBuild,
  activeBuild,
  selectedBuild,
  onDetailSelect,
  playerInventory,
}) => {
  function canAfford(buildingType: BuildingTypeValue): boolean {
    const def = BUILDING_DEFS[buildingType];
    for (const cost of def.cost) {
      const item = playerInventory.find(i => i.type === cost.resource);
      if (!item || item.amount < cost.amount) return false;
    }
    return true;
  }

  function hasResource(_type: BuildingTypeValue, resource: string): boolean {
    const item = playerInventory.find(i => i.type === resource);
    return item ? item.amount > 0 : false;
  }

  const selDef = selectedBuild ? BUILDING_DEFS[selectedBuild] : null;

  return (
    <div style={{
      position: 'absolute', top: 50, left: 8,
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 20, minWidth: 380,
      maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
    }}>
      {/* Header */}
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
          BUILD
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: '#6e7b88',
        }}>
          ESC to close
        </span>
      </div>

      {/* Build list */}
      <div style={{ padding: 8 }}>
        {BUILD_ORDER.map(type => {
          const def = BUILDING_DEFS[type];
          const affordable = canAfford(type);
          const isActive = activeBuild === type;
          const isSelected = selectedBuild === type;

          return (
            <div
              key={type}
              onClick={() => {
                onSelectBuild(type);
              }}
              onMouseEnter={() => {
                onDetailSelect(type);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px',
                background: isSelected ? '#1f2732' : isActive ? '#1a2230' : '#171d26',
                border: isSelected
                  ? '1px solid #e8ae4a'
                  : isActive
                    ? '1px solid #5a8abf'
                    : '1px solid rgba(255,255,255,.07)',
                borderRadius: 4,
                cursor: affordable ? 'pointer' : 'not-allowed',
                opacity: affordable ? 1 : 0.45,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {(() => {
                  const spritePath = buildingSpritePath(type);
                  if (spritePath) {
                    return (
                      <img
                        src={`${SPRITE_BASE}/${spritePath}.png`}
                        width={40}
                        height={40}
                        alt={def.name}
                        style={{ imageRendering: 'pixelated', display: 'block' }}
                      />
                    );
                  }
                  return (
                    <div style={{
                      width: 40, height: 40, borderRadius: 3, background: def.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18,
                    }}>
                      {def.shape === 'circle' ? '\u2699' : def.shape === 'diamond' ? '\u25C6' : def.shape === 'arrow' ? '\u27A1' : '\u25A0'}
                    </div>
                  );
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: 13, fontWeight: 600, letterSpacing: '.06em',
                  color: '#e8edf2',
                }}>
                  {def.name}
                </div>
                <div style={{
                  display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                }}>
                  {def.cost.map((c, i) => {
                    const spritePath = itemSpritePath(c.resource);
                    const displayName = ITEM_DISPLAY_NAMES[c.resource] || c.resource;
                    const has = hasResource(type, c.resource);
                    return (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', borderRadius: 2,
                        background: has ? '#101418' : '#1a1010',
                        color: has ? '#c6cdd4' : '#ec6058',
                      }}>
                        {spritePath ? (
                          <img
                            src={`${SPRITE_BASE}/${spritePath}.png`}
                            width={14}
                            height={14}
                            alt=""
                            style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                          />
                        ) : null}
                        {c.amount} {displayName}
                      </span>
                    );
                  })}
                  {def.powerConsumed > 0 && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 2,
                      background: '#101418',
                      color: '#f07050',
                    }}>
                      -{def.powerConsumed} {'\u26A1'}
                    </span>
                  )}
                  {def.powerProduced && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 2,
                      background: '#0a1a10',
                      color: '#5fcb93',
                    }}>
                      +{def.powerProduced} {'\u26A1'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selDef && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,.08)',
          background: '#111820',
          padding: '12px 14px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
          }}>
            {(() => {
              const spritePath = buildingSpritePath(selDef.type);
              if (spritePath) {
                return (
                  <img
                    src={`${SPRITE_BASE}/${spritePath}.png`}
                    width={48}
                    height={48}
                    alt={selDef.name}
                    style={{ imageRendering: 'pixelated' }}
                  />
                );
              }
              return (
                <div style={{
                  width: 48, height: 48, borderRadius: 4, background: selDef.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22,
                }}>
                  {selDef.shape === 'circle' ? '\u2699' : selDef.shape === 'diamond' ? '\u25C6' : selDef.shape === 'arrow' ? '\u27A1' : '\u25A0'}
                </div>
              );
            })()}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 14, fontWeight: 700, letterSpacing: '.05em',
                color: '#e8edf2',
              }}>
                {BUILDING_NAMES[selDef.type] ?? selDef.name}
              </div>
              {activeBuild === selDef.type && (
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, color: '#e8ae4a', marginTop: 2,
                }}>
                  ARMED — click map to place
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, lineHeight: 1.5,
            color: '#9aa8b4',
            marginBottom: 10,
          }}>
            {selDef.description}
          </div>

          {/* Costs */}
          {selDef.cost.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                COST
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {selDef.cost.map((c, i) => {
                  const spritePath = itemSpritePath(c.resource);
                  const displayName = ITEM_DISPLAY_NAMES[c.resource] || c.resource;
                  const has = hasResource(selDef.type, c.resource);
                  return (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 3,
                      background: has ? '#0e1510' : '#1a1010',
                      border: has ? '1px solid rgba(95,203,147,.25)' : '1px solid rgba(236,96,88,.2)',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: has ? '#8ab88a' : '#ec6058',
                    }}>
                      {spritePath ? (
                        <img
                          src={`${SPRITE_BASE}/${spritePath}.png`}
                          width={16}
                          height={16}
                          alt=""
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : null}
                      {c.amount}x {displayName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Power */}
          {(selDef.powerConsumed > 0 || selDef.powerProduced) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                POWER
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {selDef.powerProduced && (
                  <span style={{
                    padding: '3px 8px', borderRadius: 3,
                    background: '#0a1a10',
                    border: '1px solid rgba(95,203,147,.2)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#5fcb93',
                  }}>
                    Produces +{selDef.powerProduced} {'\u26A1'}
                  </span>
                )}
                {selDef.powerConsumed > 0 && (
                  <span style={{
                    padding: '3px 8px', borderRadius: 3,
                    background: '#1a1010',
                    border: '1px solid rgba(240,112,80,.2)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#f07050',
                  }}>
                    Consumes {selDef.powerConsumed} {'\u26A1'}/tick
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Inventory */}
          {selDef.maxInventory > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                INVENTORY
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#8a9aa4',
              }}>
                Up to {selDef.maxInventory} items
              </div>
            </div>
          )}

          {/* Special notes based on type */}
          {selDef.type === 'generator' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                FUEL
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#e8ae4a',
              }}>
                Requires Coal in inventory. Holds up to 20 units. Burns 1 per {selDef.maxProgress} ticks.
              </div>
            </div>
          )}

          {selDef.type === 'miner' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                REQUIREMENT
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#e8ae4a',
              }}>
                Place directly on a resource deposit (coal, iron, copper, stone, etc). Mines automatically.
              </div>
            </div>
          )}

          {(selDef.type === 'smelter' || selDef.type === 'steel_smelter') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                RECIPE
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#8a9aa4',
              }}>
                Consumes:{' '}
                {selDef.consumesItems?.map(c =>
                  `${c.amount}x ${ITEM_DISPLAY_NAMES[c.type as keyof typeof ITEM_DISPLAY_NAMES] ?? c.type}`
                ).join(', ')}{' '}
                {'\u2192'} Produces: {ITEM_DISPLAY_NAMES[selDef.producesItem as keyof typeof ITEM_DISPLAY_NAMES] ?? selDef.producesItem}
              </div>
            </div>
          )}

          {selDef.type === 'assembler' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                CAPABILITIES
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#8a9aa4',
              }}>
                Crafts copper wire, gears, and engines from raw materials and components.
              </div>
            </div>
          )}

          {selDef.type === 'conveyor' && (
            <div style={{ marginBottom: 8 }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, fontWeight: 600, letterSpacing: '.1em',
                color: '#5a6a7a',
                marginBottom: 4,
              }}>
                NOTE
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                color: '#5fcb93',
              }}>
                Passive logistics — no power required. Click-drag to place a multi-tile route. Press R to rotate direction.
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{
            display: 'flex', gap: 6, marginTop: 4,
          }}>
            <button
              onClick={() => onSelectBuild(selDef.type)}
              style={{
                flex: 1, padding: '6px 12px',
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                background: activeBuild === selDef.type
                  ? '#e8ae4a'
                  : canAfford(selDef.type)
                    ? '#2a4a6a'
                    : '#1a1a2a',
                color: activeBuild === selDef.type
                  ? '#0b0e12'
                  : canAfford(selDef.type)
                    ? '#e8edf2'
                    : '#5a6a7a',
                border: 'none',
                borderRadius: 3,
                cursor: canAfford(selDef.type) ? 'pointer' : 'not-allowed',
              }}
            >
              {activeBuild === selDef.type ? 'CANCEL' : 'SELECT'}
            </button>
            <button
              onClick={() => onDetailSelect(null)}
              style={{
                padding: '6px 12px',
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '.08em',
                background: '#1a1a2a',
                color: '#6e7b88',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
