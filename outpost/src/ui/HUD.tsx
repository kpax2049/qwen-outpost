import React from 'react';
import type { BuildingTypeValue, DirectionValue, PowerSummary, Item } from '../types';
import { BUILDING_NAMES, ITEM_DISPLAY_NAMES } from '../types';
import type { ItemType } from '../types';

const SPRITE_BASE = import.meta.env.BASE_URL + 'assets/relay-seven';

const MATERIALS: ItemType[] = [
  'wood', 'stone', 'iron', 'copper', 'coal', 'gold',
  'iron_ingot', 'copper_wire', 'steel_plate',
];

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

interface HUDProps {
  tickRate: number;
  paused: boolean;
  onTogglePause: () => void;
  onIncreaseSpeed: () => void;
  onDecreaseSpeed: () => void;
  onResetSpeed: () => void;
  onToggleBuildMenu: () => void;
  onToggleInventory: () => void;
  onToggleHelp: () => void;
  onToggleTutorial: () => void;
  onToggleObjectives: () => void;
  onTogglePower: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
  buildType: BuildingTypeValue | null;
  buildDirection?: DirectionValue;
  onDeselectBuild: () => void;
  saveStatus: { message: string; type: 'success' | 'error' | 'info' } | null;
  power?: PowerSummary;
  showPowerPanel: boolean;
  playerInventory: Item[];
}

const DIR_HINT: Record<number, string> = { 0: 'Up \u25B2', 1: 'Right \u25B6', 2: 'Down \u25BC', 3: 'Left \u25C0' };

export const HUD: React.FC<HUDProps> = ({
  tickRate,
  onIncreaseSpeed, onDecreaseSpeed, onResetSpeed,
  onToggleBuildMenu, onToggleInventory, onToggleHelp, onToggleTutorial, onToggleObjectives, onTogglePower,
  onSave, onLoad, onNewGame,
  buildType, buildDirection, onDeselectBuild,
  saveStatus, power, showPowerPanel, playerInventory,
}) => {
  const speedRates = [1, 5, 10, 20];
  const isSpeedActive = (rate: number) => {
    if (rate === 10 && tickRate === 10) return true;
    return tickRate === rate;
  };

  const buildLabel = buildType ? BUILDING_NAMES[buildType] : null;

  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 56,
        display: 'flex', alignItems: 'center',
        padding: '0 14px',
        background: '#141a20',
        borderBottom: '1px solid #2a333c',
        boxShadow: 'inset 0 1px 0 #39434d',
        zIndex: 10,
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 18, fontWeight: 700, letterSpacing: '.22em',
            color: '#e6ebef',
          }}>
            OUTPOST
          </span>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, color: '#6e7b88',
          }}>
            v1.0
          </span>
        </div>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.1)', margin: '0 8px' }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: 3, background: '#0d1318', border: '1px solid #2a333c', borderRadius: 4,
        }}>
          {speedRates.map(rate => {
            const active = isSpeedActive(rate);
            const isReset = rate === 10;
            const label = isReset ? 'II' : `x${rate}`;
            return (
              <button
                key={rate}
                onClick={() => {
                  if (isReset) { onResetSpeed(); return; }
                  onResetSpeed();
                  if (rate !== 10) onIncreaseSpeed();
                }}
                style={{
                  width: 30, height: 22,
                  display: 'grid', placeItems: 'center',
                  background: active ? '#ffb347' : rate === 10 ? '#1f2831' : '#0d1318',
                  color: active ? '#1b1204' : rate === 10 ? '#6f7d89' : '#cbd6e0',
                  border: rate === 10 ? 'none' : active ? 'none' : '1px solid #2a333c',
                  borderRadius: 3,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
          <button onClick={onIncreaseSpeed} style={{
            width: 28, height: 22, display: 'grid', placeItems: 'center',
            background: 'transparent', color: '#6f7d89',
            border: 'none', fontSize: 12, cursor: 'pointer',
          }}>+</button>
          <button onClick={onDecreaseSpeed} style={{
            width: 28, height: 22, display: 'grid', placeItems: 'center',
            background: 'transparent', color: '#6f7d89',
            border: 'none', fontSize: 12, cursor: 'pointer',
          }}>-</button>
        </div>

        {power && (
          <div
            onClick={onTogglePower}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              height: 30, padding: '0 12px',
              background: '#0d1318', border: '1px solid #2a333c', borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: power.enough ? '#7ddc8a' : '#ec6058',
              ...(power.enough ? {} : { animation: 'emberpulse 1.2s ease-in-out infinite' }),
            }} />
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: '#e6ebef',
            }}>
              {power.produced}
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11, color: '#6f7d89',
            }}>
              / {power.consumed}
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, fontWeight: 600,
              color: power.surplus >= 0 ? '#7ddc8a' : '#ec6058',
            }}>
              {power.surplus >= 0 ? '+' : ''}{power.surplus}
            </span>
            <span style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 10, letterSpacing: '.14em',
              color: '#6f7d89',
            }}>
              POWER
            </span>
          </div>
        )}

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.1)', margin: '0 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {MATERIALS.map(type => {
            const invItem = playerInventory.find(i => i.type === type);
            if (!invItem || invItem.amount <= 0) return null;
            const spritePath = itemSpritePath(type);
            return (
              <div
                key={type}
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  padding: '2px 5px',
                  background: '#0d1318', border: '1px solid #2a333c', borderRadius: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {spritePath && (
                  <img
                    src={`${SPRITE_BASE}/${spritePath}.png`}
                    width={14}
                    height={14}
                    alt=""
                    style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                  />
                )}
                <span style={{
                  fontSize: 9, color: '#94a3af',
                  fontFamily: "'IBM Plex Mono', monospace",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: 48,
                }}>
                  {ITEM_DISPLAY_NAMES[type] || type}
                </span>
                <span style={{
                  fontSize: 9, color: '#e6ebef', fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                  flexShrink: 0,
                }}>
                  x{invItem.amount}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={onToggleBuildMenu} style={{
            height: 30, padding: '0 13px',
            display: 'grid', placeItems: 'center',
            background: '#ffb347',
            color: '#1b1204',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
            border: 'none', borderRadius: 4,
            cursor: 'pointer',
          }}>
            BUILD <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, opacity: 0.6,
            }}>B</span>
          </button>
          <button onClick={onToggleInventory} style={{
            height: 30, padding: '0 13px',
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 600, letterSpacing: '.1em',
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            INVENTORY <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: '#6e7b88',
            }}>I</span>
          </button>
          <button onClick={onToggleObjectives} style={{
            height: 30, padding: '0 13px',
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 600, letterSpacing: '.1em',
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            OBJECTIVES <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: '#6e7b88',
            }}>O</span>
          </button>
          <button onClick={onToggleHelp} style={{
            width: 30, height: 30,
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 13, fontWeight: 700,
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            ?
          </button>
          <button onClick={onToggleTutorial} style={{
            width: 30, height: 30,
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#e8ae4a',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 9, fontWeight: 700, letterSpacing: '.05em',
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            TUT
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.1)', margin: '0 4px' }} />

          <button onClick={onSave} style={{
            width: 30, height: 30,
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 600,
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="1" width="8" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="4" y1="1" x2="4" y2="3" stroke="currentColor" strokeWidth="1.5" />
              <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button onClick={onLoad} style={{
            width: 30, height: 30,
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 600,
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={onNewGame} style={{
            width: 30, height: 30,
            display: 'grid', placeItems: 'center',
            background: '#1f2831',
            color: '#cbd6e0',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 600,
            border: '1px solid #2f3a45', borderRadius: 4,
            cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="3" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {buildType && (
        <div style={{
          position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px',
          background: '#ffb347',
          color: '#1b1204',
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
          borderRadius: '0 0 4px 4px',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <span>Building: {buildLabel}</span>
          {buildDirection !== undefined && (
            <span style={{
              background: 'rgba(0,0,0,0.15)', borderRadius: 3,
              padding: '2px 7px', fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {DIR_HINT[buildDirection]}
            </span>
          )}
          <button onClick={onDeselectBuild} style={{
            background: 'rgba(0,0,0,0.15)', color: '#1b1204',
            border: 'none', borderRadius: 3,
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 11, fontWeight: 600, letterSpacing: '.1em',
            padding: '2px 8px', cursor: 'pointer', marginLeft: 4,
          }}>
            CANCEL
          </button>
        </div>
      )}

      {buildType === 'conveyor' && (
        <div style={{
          position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
          background: '#141a20', color: '#94a3af',
          padding: '5px 12px', borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          border: '1px solid #2a333c',
          zIndex: 10, whiteSpace: 'nowrap',
        }}>
          WASD / RMB move · RMB collect · drag lay belt (auto-corners) · R rotate · click place
        </div>
      )}
      {buildType && buildType !== 'conveyor' && (
        <div style={{
          position: 'absolute', top: 88, left: '50%', transform: 'translateX(-50%)',
          background: '#141a20', color: '#94a3af',
          padding: '5px 12px', borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          border: '1px solid #2a333c',
          zIndex: 10, whiteSpace: 'nowrap',
        }}>
          WASD / RMB move · click to place — stays selected until Cancel or Esc
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6,
        padding: '7px 12px',
        background: 'rgba(20,25,34,.92)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: 4,
        zIndex: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: '#94a3af',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ color: '#e6ebef' }}>WASD / RMB</span> move
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>E</span> harvest
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>RMB</span> collect
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>drag</span> lay belt
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>R</span> rotate
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>Q</span> remove
        <span style={{ color: '#3e4a57' }}>&middot;</span>
        <span style={{ color: '#e6ebef' }}>SPACE</span> pause
      </div>

      {saveStatus && (
        <div style={{
          position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
          background: saveStatus.type === 'success' ? '#7ddc8a' :
            saveStatus.type === 'error' ? '#ec6058' : '#5faee0',
          color: '#141a20',
          padding: '6px 16px',
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
          borderRadius: '0 0 4px 4px',
          zIndex: 30,
        }}>
          {saveStatus.message}
        </div>
      )}

      {showPowerPanel && power && (
        <div style={{
          position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
          width: 340,
          background: '#141a20',
          border: '1px solid #2a333c',
          borderRadius: 4,
          zIndex: 25,
          boxShadow: '0 12px 32px rgba(0,0,0,.5)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: '#1b232c',
            borderBottom: '1px solid #2a333c',
          }}>
            <span style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
              color: '#cbd6e0',
            }}>
              POWER GRID
            </span>
            <button
              onClick={onTogglePower}
              style={{
                width: 22, height: 22,
                display: 'grid', placeItems: 'center',
                background: 'transparent', border: '1px solid #2a333c',
                borderRadius: 3, cursor: 'pointer',
                color: '#6f7d89', fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace" }}>
                Production
              </span>
              <span style={{ fontSize: 14, color: '#7ddc8a', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                +{power.produced}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace" }}>
                Consumption
              </span>
              <span style={{ fontSize: 14, color: '#ec6058', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                -{power.consumed}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 8px',
              background: power.enough ? 'rgba(125,220,138,.08)' : 'rgba(236,96,88,.08)',
              border: `1px solid ${power.enough ? 'rgba(125,220,138,.2)' : 'rgba(236,96,88,.2)'}`,
              borderRadius: 3,
            }}>
              <span style={{ fontSize: 11, color: '#94a3af', fontFamily: "'IBM Plex Mono', monospace" }}>
                Surplus
              </span>
              <span style={{
                fontSize: 14, fontWeight: 600,
                color: power.surplus >= 0 ? '#7ddc8a' : '#ec6058',
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {power.surplus >= 0 ? '+' : ''}{power.surplus}
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace" }}>
                Generators
              </span>
              <span style={{ fontSize: 11, color: '#cbd6e0', fontFamily: "'IBM Plex Mono', monospace" }}>
                {power.fueledGenerators}/{power.generatorCount} active
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace" }}>
                Consumers
              </span>
              <span style={{ fontSize: 11, color: '#cbd6e0', fontFamily: "'IBM Plex Mono', monospace" }}>
                {power.consumerCount} machines
              </span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace" }}>
                Status
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '.1em',
                color: power.enough ? '#7ddc8a' : '#ec6058',
                fontFamily: "'Chakra Petch', sans-serif",
              }}>
                {power.enough ? 'FULLY POWERED' : 'POWER DEFICIT'}
              </span>
            </div>
          </div>
          <div style={{
            padding: '6px 12px',
            borderTop: '1px solid #2a333c',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{
              fontSize: 9, color: '#4a5a6a', fontFamily: "'IBM Plex Mono', monospace",
            }}>
              Press Esc or click ✕ to close
            </span>
            <button
              onClick={onTogglePower}
              style={{
                fontSize: 9, color: '#6f7d89', fontFamily: "'IBM Plex Mono', monospace",
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
