import React from 'react';
import type { BuildingTypeValue } from '../types';

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
  onToggleObjectives: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
  buildType: BuildingTypeValue | null;
  onDeselectBuild: () => void;
  saveStatus: { message: string; type: 'success' | 'error' | 'info' } | null;
}

export const HUD: React.FC<HUDProps> = ({
  tickRate, paused,
  onTogglePause, onIncreaseSpeed, onDecreaseSpeed, onResetSpeed,
  onToggleBuildMenu, onToggleInventory, onToggleHelp, onToggleObjectives,
  onSave, onLoad, onNewGame,
  buildType, onDeselectBuild,
  saveStatus,
}) => {
  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'linear-gradient(180deg, rgba(20,20,40,0.95) 0%, rgba(20,20,40,0.7) 80%, transparent 100%)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4488ff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 }}>
            OUTPOST
          </span>
          <span style={{ color: '#666', fontSize: 11 }}>v1.0</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 4px' }}>
            {[1, 5, 10, 20].map(rate => (
              <button
                key={rate}
                onClick={() => rate === 10 ? onResetSpeed() : null}
                style={{
                  padding: '2px 6px', background: tickRate === rate ? 'rgba(68,136,255,0.3)' : 'transparent',
                  color: tickRate === rate ? '#4488ff' : '#888',
                  border: 'none', borderRadius: 2, fontSize: 11, cursor: 'pointer', minWidth: 24,
                }}
              >
                {rate === 10 ? 'x1' : `x${rate}`}
              </button>
            ))}
            <button onClick={onIncreaseSpeed} style={{
              padding: '2px 4px', background: 'transparent', color: '#888',
              border: 'none', fontSize: 12, cursor: 'pointer',
            }}>+</button>
            <button onClick={onDecreaseSpeed} style={{
              padding: '2px 4px', background: 'transparent', color: '#888',
              border: 'none', fontSize: 12, cursor: 'pointer',
            }}>-</button>
          </div>

          <button onClick={onTogglePause} style={{
            padding: '4px 12px',
            background: paused ? 'rgba(204,68,68,0.3)' : 'rgba(68,204,68,0.3)',
            color: paused ? '#cc4444' : '#44cc44',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            {paused ? '\u25B6 PLAY' : '\u23F8 PAUSE'}
          </button>

          <button onClick={onToggleBuildMenu} style={{
            padding: '4px 10px', background: 'rgba(255,170,0,0.2)', color: '#ffaa00',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Build [B]
          </button>
          <button onClick={onToggleInventory} style={{
            padding: '4px 10px', background: 'rgba(68,170,255,0.2)', color: '#44aaff',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Inventory [I]
          </button>
          <button onClick={onToggleObjectives} style={{
            padding: '4px 10px', background: 'rgba(255,200,0,0.2)', color: '#ffcc00',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Objectives [O]
          </button>
          <button onClick={onToggleHelp} style={{
            padding: '4px 10px', background: 'rgba(100,100,100,0.3)', color: '#aaa',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Help [H]
          </button>

          <button onClick={onSave} style={{
            padding: '4px 10px', background: 'rgba(0,200,100,0.2)', color: '#44cc88',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Save [Ctrl+S]
          </button>
          <button onClick={onLoad} style={{
            padding: '4px 10px', background: 'rgba(100,150,255,0.2)', color: '#88aaff',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            Load [Ctrl+L]
          </button>
          <button onClick={onNewGame} style={{
            padding: '4px 10px', background: 'rgba(200,50,50,0.2)', color: '#cc6666',
            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}>
            New Game
          </button>
        </div>
      </div>

      {buildType && (
        <div style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,170,0,0.9)', color: '#000', padding: '6px 16px',
          borderRadius: 4, fontSize: 13, fontWeight: 'bold', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>Building: {buildType}</span>
          <button onClick={onDeselectBuild} style={{
            background: 'rgba(0,0,0,0.2)', color: '#000', border: 'none',
            borderRadius: 2, cursor: 'pointer', padding: '2px 6px', fontSize: 11,
          }}>
            Cancel
          </button>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        background: 'rgba(20,20,40,0.7)', borderRadius: 4, padding: '6px 10px',
        color: '#666', fontSize: 10, lineHeight: 1.6, zIndex: 10,
      }}>
        <div>WASD/Arrows: Move | E: Harvest (facing tile) | R: Rotate | Q: Remove</div>
        <div>Alt+Click: Pan | Scroll: Zoom | Space: Pause</div>
      </div>

      {saveStatus && (
        <div style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
          background: saveStatus.type === 'success' ? 'rgba(0,150,80,0.9)' :
            saveStatus.type === 'error' ? 'rgba(180,40,40,0.9)' : 'rgba(40,100,180,0.9)',
          color: '#fff', padding: '8px 20px',
          borderRadius: 4, fontSize: 13, fontWeight: 'bold', zIndex: 30,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {saveStatus.message}
        </div>
      )}
    </>
  );
};
