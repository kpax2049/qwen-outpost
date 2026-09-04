import React from 'react';
import { BUILDING_DEFS, BUILDING_COLORS, ITEM_COLORS } from '../types';
import type { BuildingInspection, BuildingTypeValue } from '../types';

export interface InspectionData {
  building: BuildingInspection | null;
  playerItems: { type: string; amount: number }[];
}

interface InspectionPanelProps {
  data: InspectionData;
  onClose: () => void;
  onDeposit: (type: string) => void;
  canDeposit: (type: string) => boolean;
  onWithdraw: (type: string) => void;
  canWithdraw: (type: string) => boolean;
  onRotate: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  ok: { color: '#5fcb93', bg: 'rgba(95,203,147,.1)' },
  warn: { color: '#5faee0', bg: 'rgba(95,174,224,.1)' },
  bad: { color: '#ec6058', bg: 'rgba(236,96,88,.1)' },
  blocked: { color: '#f6bb45', bg: 'rgba(246,187,69,.1)' },
  idle: { color: '#98a0a9', bg: 'rgba(152,160,169,.1)' },
};

function getBuildingColor(type: BuildingTypeValue): string {
  return BUILDING_COLORS[type] || '#666';
}

function getBuildingShape(type: BuildingTypeValue): string {
  return BUILDING_DEFS[type].shape;
}

const DEPOSIT_DISPLAY: Record<string, string> = {
  coal: 'Coal',
  iron: 'Iron Ore',
  copper: 'Copper Ore',
  wood: 'Wood',
  stone: 'Stone',
  gold: 'Gold Ore',
  iron_ingot: 'Iron Ingot',
  copper_wire: 'Copper Wire',
  steel_plate: 'Steel Plate',
  circuit: 'Circuit Board',
  gear: 'Gear',
  engine: 'Engine',
};

export const InspectionPanel: React.FC<InspectionPanelProps> = ({ data, onClose, onDeposit, canDeposit, onWithdraw, canWithdraw, onRotate }) => {
  const { building, playerItems } = data;

  return (
    <div style={{
      position: 'absolute', right: 8, top: 50,
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 20, width: 320,
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
      maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
    }}>
      {!building ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12, color: '#5e6873',
        }}>
          Select a building to inspect
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', background: '#1d242e',
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 3, background: getBuildingColor(building.type),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, flexShrink: 0,
            }}>
              {getBuildingShape(building.type) === 'circle' ? '\u2699' : getBuildingShape(building.type) === 'diamond' ? '\u25C6' : getBuildingShape(building.type) === 'arrow' ? '\u27A1' : '\u25A0'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 13, fontWeight: 700, letterSpacing: '.1em',
                color: '#e8edf2',
              }}>
                {building.name}
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, color: '#6e7b88', marginTop: 2,
              }}>
                tile {building.x}, {building.y}
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 22, height: 22, display: 'grid', placeItems: 'center',
              borderRadius: 3, background: '#101418', color: '#94a2b0',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, cursor: 'pointer', border: 'none',
            }}>
              ×
            </button>
          </div>

          <div style={{ padding: 14 }}>
            {/* Status badge */}
            {(() => {
              const config = STATUS_CONFIG[building.statusColor] || STATUS_CONFIG.idle;
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px',
                  background: config.bg,
                  borderLeft: `3px solid ${config.color}`,
                  borderRadius: 2, marginBottom: 12,
                }}>
                  <div style={{
                    display: 'flex', gap: 3,
                  }}>
                    <div style={{ width: 4, height: 14, background: config.color }} />
                    <div style={{ width: 4, height: 14, background: config.color }} />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "'Chakra Petch', sans-serif",
                      fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                      color: config.color,
                    }}>
                      {building.status}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Rotation button for conveyors */}
            {building.type === 'conveyor' && (
              <button onClick={onRotate} style={{
                display: 'block', width: '100%', marginBottom: 12, height: 30,
                background: '#1d242e',
                border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 3,
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '.12em',
                color: '#c6d2de', cursor: 'pointer', textAlign: 'center',
              }}>
                ROTATE R — {building.directionLabel}
              </button>
            )}

            {/* Cycle progress */}
            {building.progress !== undefined && building.maxProgress > 1 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: '#94a2b0', marginBottom: 5,
                }}>
                  <span>CYCLE</span>
                  <span style={{ color: '#e8edf2' }}>{Math.round(building.progressPct)}%</span>
                </div>
                <div style={{
                  height: 8, background: '#0e131a', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${building.progressPct}%`, height: 8,
                    borderRadius: 2,
                    background: building.active ? '#5fcb93' : '#ec6058',
                  }} />
                </div>
              </div>
            )}

            {/* Power info */}
            {building.powerConsumed > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: '#94a2b0', marginBottom: 10,
              }}>
                <span>POWER</span>
                <span style={{ color: building.active ? '#5fcb93' : '#ec6058' }}>
                  {building.active ? `${building.powerConsumed} {'\u26A1'} drawn · OK` : 'No Power'}
                </span>
              </div>
            )}
            {building.powerProduced > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: '#94a2b0', marginBottom: 10,
              }}>
                <span>POWER</span>
                <span style={{ color: building.active ? '#5fcb93' : '#98a0a9' }}>
                  {building.active ? `Producing ${building.powerProduced} {'\u26A1'}` : 'Not Producing'}
                </span>
              </div>
            )}

            {/* Fuel */}
            {building.fuelCoal !== undefined && (
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11, color: '#94a2b0', marginBottom: 5,
                }}>
                  <span>FUEL (COAL)</span>
                  <span style={{ color: '#e8edf2' }}>
                    {building.fuelCoal} left · {building.fuelBurned ?? 0} burned
                  </span>
                </div>
                <div style={{
                  height: 8, background: '#0e131a', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${building.fuelPct ?? 0}%`, height: 8,
                    borderRadius: 2, background: '#e8ae4a',
                  }} />
                </div>
              </div>
            )}

            {/* Belt item */}
            {building.beltItem !== undefined && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: '#94a2b0', marginBottom: 10,
              }}>
                <span>CARRYING</span>
                <span style={{ color: '#e8edf2' }}>{building.beltItem ?? '—'}</span>
              </div>
            )}

            {/* Storage */}
            <div style={{
              fontFamily: "'Chakra Petch', sans-serif",
              fontSize: 10, letterSpacing: '.16em',
              color: '#6e7b88', marginBottom: 8,
            }}>
              CONTENTS
            </div>
            {building.inventory.length === 0 ? (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: '#6e7b88', marginBottom: 12,
              }}>
                Empty
              </div>
            ) : (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12,
              }}>
                {building.inventory.map((item, idx) => {
                  const color = '#94a2b0';
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 8px',
                      background: '#101720',
                      border: '1px solid rgba(255,255,255,.07)',
                      borderRadius: 3,
                    }}>
                      <span style={{
                        width: 11, height: 11, background: color,
                        border: '1px solid #101418',
                      }} />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11, color: '#e8edf2',
                      }}>
                        {item.type}: {item.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Direction */}
            {building.direction !== undefined && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: '#94a2b0', marginBottom: 10,
              }}>
                <span>DIRECTION</span>
                <span style={{ color: '#e8edf2' }}>{building.directionLabel}</span>
              </div>
            )}

            {/* Remove button */}
            {building.type !== 'conveyor' && (
              <button style={{
                display: 'block', width: '100%', height: 30, marginTop: 8,
                background: '#1d242e', border: '1px solid rgba(255,255,255,.09)',
                borderRadius: 3,
                fontFamily: "'Chakra Petch', sans-serif",
                fontSize: 11, fontWeight: 600, letterSpacing: '.12em',
                color: '#ec6058', cursor: 'pointer', textAlign: 'center',
              }}>
                REMOVE Q
              </button>
            )}

            {/* Take from building */}
            {building.inventory.length > 0 && building.type !== 'conveyor' && (
              <>
                <div style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: 10, letterSpacing: '.16em',
                  color: '#6e7b88', marginTop: 14, marginBottom: 8,
                  paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)',
                }}>
                  TAKE FROM RELAY
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {building.inventory.map((item, idx) => {
                    const color = ITEM_COLORS[item.type as keyof typeof ITEM_COLORS] ?? '#94a2b0';
                    const ok = canWithdraw(item.type);
                    return (
                      <button
                        key={idx}
                        disabled={!ok || item.amount <= 0}
                        onClick={() => onWithdraw(item.type)}
                        style={{
                          height: 30, padding: '0 6px 0 8px',
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: ok ? '#1f2732' : '#101418',
                          border: ok ? '1px solid rgba(246,187,69,.3)' : '1px solid rgba(255,255,255,.07)',
                          borderRadius: 3,
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 11,
                          color: ok ? '#f6bb45' : '#5e6873',
                          cursor: ok ? 'pointer' : 'not-allowed',
                          opacity: ok ? 1 : 0.5,
                        }}
                      >
                        <span style={{
                          width: 11, height: 11, background: color,
                          border: '1px solid #101418',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: "'Chakra Petch', sans-serif",
                          fontSize: 10, fontWeight: 600, letterSpacing: '.05em',
                          color: '#c6d2de',
                        }}>
                          {DEPOSIT_DISPLAY[item.type] ?? item.type}
                        </span>
                        <span style={{
                          color: ok ? '#e8edf2' : '#5e6873',
                          minWidth: 18, textAlign: 'right',
                        }}>
                          {item.amount}
                        </span>
                        <span style={{
                          width: 18, height: 18, display: 'grid', placeItems: 'center',
                          background: '#0e131a', borderRadius: 2,
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 12, fontWeight: 700,
                        }}>
                          −
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Deposit buttons */}
            {playerItems.length > 0 && (
              <>
                <div style={{
                  fontFamily: "'Chakra Petch', sans-serif",
                  fontSize: 10, letterSpacing: '.16em',
                  color: '#6e7b88', marginTop: 14, marginBottom: 8,
                  paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)',
                }}>
                  GIVE FROM INVENTORY
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {playerItems.map((item, idx) => {
                    const ok = canDeposit(item.type);
                    return (
                      <button
                        key={idx}
                        disabled={!ok || item.amount <= 0}
                        onClick={() => onDeposit(item.type)}
                        style={{
                          height: 30, padding: '0 12px',
                          display: 'grid', placeItems: 'center',
                          background: ok ? '#1f2732' : '#101418',
                          border: ok ? '1px solid rgba(95,203,147,.3)' : '1px solid rgba(255,255,255,.07)',
                          borderRadius: 3,
                          fontFamily: "'Chakra Petch', sans-serif",
                          fontSize: 11, fontWeight: 600, letterSpacing: '.1em',
                          color: ok ? '#5fcb93' : '#5e6873',
                          cursor: ok ? 'pointer' : 'not-allowed',
                          opacity: ok ? 1 : 0.5,
                        }}
                      >
                        {DEPOSIT_DISPLAY[item.type] ?? item.type} +1
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
