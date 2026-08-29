import React from 'react';
import type { BuildingInspection, PowerSummary } from '../types';

export interface InspectionData {
  building: BuildingInspection | null;
  power: PowerSummary;
  playerItems: { type: string; amount: number }[];
}

interface InspectionPanelProps {
  data: InspectionData;
  onClose: () => void;
  onDeposit: (type: string) => void;
  canDeposit: (type: string) => boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ok: '#44cc44',
  warn: '#ffcc00',
  bad: '#ff4444',
};

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

export const InspectionPanel: React.FC<InspectionPanelProps> = ({ data, onClose, onDeposit, canDeposit }) => {
  const { building, power, playerItems } = data;

  return (
    <div style={{
      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
      background: 'rgba(20,20,40,0.96)', border: '1px solid rgba(140,200,255,0.35)',
      borderRadius: 8, padding: 14, zIndex: 20, width: 300,
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: building ? STATUS_COLORS[building.statusColor] || '#999' : '#666' }} />
          <span style={{ color: '#eee', fontSize: 14, fontWeight: 'bold' }}>
            {building ? building.name : 'Nothing Inspected'}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', color: '#aaa', border: 'none',
          borderRadius: 3, cursor: 'pointer', padding: '2px 7px', fontSize: 12,
        }}>×</button>
      </div>

      {!building ? (
        <div style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
          Click any tile to inspect its building. Buildings have a status code; blocked belts show a red gate in the world.
          <div style={{ marginTop: 10 }}>
            <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>Power: </span>
            <span style={{ color: power.enough ? '#44cc44' : '#ff4444' }}>
              {power.produced} ⚡ produced / {power.consumed} ⚡ used
            </span>
            <div style={{ color: '#9ab', fontSize: 11, marginTop: 4 }}>
              All machines share ONE outpost-wide power grid. Fuel a Generator (add Coal) to power every machine on the map.
            </div>
            {power.generatorCount === 0 && (
              <div style={{ color: '#ffaa00', fontSize: 11, marginTop: 4 }}>
                Place a Coal Generator and feed it Coal to power your machines.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div style={{ color: STATUS_COLORS[building.statusColor] || '#ccc', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
            {building.status}
          </div>

          <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.7 }}>
            {building.direction !== undefined && (
              <div><span style={{ color: '#888' }}>Direction:</span> {building.directionLabel}</div>
            )}
            <div>
              <span style={{ color: '#888' }}>Power:</span>{' '}
              {building.powerConsumed > 0 && (
                <span style={{ color: building.active ? '#44cc44' : '#ff4444' }}>
                  {building.active ? 'Powered' : 'No Power'} —{' '}
                  <span style={{ fontSize: 11 }}>
                    shared Outpost Grid ({power.produced}⚡ / {power.consumed}⚡)
                  </span>
                </span>
              )}
              {building.powerProduced > 0 && <span>{building.active ? 'Producing' : 'Not Producing'} ({building.powerProduced}⚡)</span>}
              {building.powerConsumed === 0 && building.powerProduced === 0 && <span>Passive (no power needed)</span>}
            </div>

            {building.powerConsumed > 0 && !building.active && (
              <div style={{ marginTop: 6, padding: 6, background: 'rgba(255,68,68,0.12)', borderRadius: 4, fontSize: 11, color: '#ff8a8a', lineHeight: 1.5 }}>
                The whole outpost shares ONE power grid — no cables needed. This machine is
                stopped because the grid lacks power ({power.produced}⚡ produced vs {power.consumed}⚡ used).
                Add Coal to a Generator, or remove machines until surplus is positive.
              </div>
            )}

            {(building.progress !== undefined && building.maxProgress > 1) && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: 11 }}>
                  <span>Cycle</span>
                  <span>{building.progressPct}%</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 3, height: 6, marginTop: 2 }}>
                  <div style={{
                    width: `${building.progressPct}%`, height: 6, borderRadius: 3,
                    background: building.active ? '#44cc44' : '#cc4444',
                  }} />
                </div>
              </div>
            )}

            {building.fuelCoal !== undefined && (
              <div style={{ marginTop: 6, padding: 6, background: 'rgba(204,68,0,0.12)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff9955', fontSize: 11 }}>
                  <span>Fuel (Coal)</span>
                  <span>{building.fuelCoal} left · {building.fuelBurned ?? 0} burned</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 3, height: 5, marginTop: 3 }}>
                  <div style={{ width: `${building.fuelPct ?? 0}%`, height: 5, borderRadius: 3, background: '#ff7733' }} />
                </div>
              </div>
            )}

            {building.beltItem !== undefined && (
              <div><span style={{ color: '#888' }}>Carrying:</span> <span style={{ color: '#eee' }}>{building.beltItem ?? '—'}</span></div>
            )}

            {building.connection && (
              <div style={{ marginTop: 4 }}>
                <div style={{ color: '#888' }}>Connections</div>
                <div style={{ fontSize: 11, color: '#bbb' }}>
                  <div>← {building.connection.incoming ? building.connection.incoming.label : 'Nothing feeds in'}</div>
                  <div>→ {building.connection.outgoing ? building.connection.outgoing.label : 'Open end'}</div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 6 }}>
              <span style={{ color: '#888' }}>Storage:</span>{' '}
              {building.inventory.length === 0 ? (
                <span style={{ color: '#666' }}>Empty</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                  {building.inventory.map((item, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(255,255,255,0.08)', color: '#ddd', padding: '2px 6px',
                      borderRadius: 3, fontSize: 11,
                    }}>
                      {item.type}: {item.amount}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {playerItems.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
              <div style={{ color: '#888', fontSize: 11, marginBottom: 5 }}>Give one from your inventory</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {playerItems.map((item, idx) => {
                  const ok = canDeposit(item.type);
                  return (
                    <button
                      key={idx}
                      disabled={!ok || item.amount <= 0}
                      onClick={() => onDeposit(item.type)}
                      style={{
                        background: ok ? 'rgba(0,180,120,0.2)' : 'rgba(255,255,255,0.05)',
                        color: ok ? '#44cc88' : '#666',
                        border: ok ? '1px solid rgba(68,204,136,0.4)' : '1px solid transparent',
                        borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: ok ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {DEPOSIT_DISPLAY[item.type] ?? item.type} +1
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};