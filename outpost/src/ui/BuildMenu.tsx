import React from 'react';
import { BUILDING_DEFS, ITEM_DISPLAY_NAMES } from '../types';
import type { Item, BuildingTypeValue } from '../types';

const SPRITE_BASE = '/assets/relay-seven';

interface BuildMenuProps {
  onSelectBuild: (type: BuildingTypeValue) => void;
  activeBuild: BuildingTypeValue | null;
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
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 20, minWidth: 310,
      maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
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
          BUILD
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: '#6e7b88',
        }}>
          ESC to close
        </span>
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
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px',
                background: activeBuild === type ? '#1f2732' : '#171d26',
                border: activeBuild === type ? '1px solid #e8ae4a' : '1px solid rgba(255,255,255,.07)',
                borderRadius: 4, cursor: affordable ? 'pointer' : 'not-allowed',
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
                    return (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 6px', borderRadius: 2,
                        background: affordable ? '#101418' : '#101418',
                        color: affordable ? '#c6cdd4' : '#ec6058',
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
                      color: '#5fcb93',
                    }}>
                      -{def.powerConsumed} {'\u26A1'}
                    </span>
                  )}
                  {def.powerProduced && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 2,
                      background: '#101418',
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
    </div>
  );
};
