import React from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  done: boolean;
  manual?: boolean;
}

interface TutorialProps {
  steps: TutorialStep[];
  dismissed: boolean;
  onDismiss: () => void;
  onManualNext: (id: string) => void;
  show?: boolean;
}

const STEP_COLORS: Record<string, string> = {
  move: '#5faee0',
  wood: '#e8ae4a',
  stone: '#c6cdd4',
  build: '#e8ae4a',
  place: '#5fcb93',
  belt: '#94a2b0',
  power: '#f0774a',
  inspect: '#5faee0',
  next: '#5fcb93',
};

export const Tutorial: React.FC<TutorialProps> = ({ steps, dismissed, onDismiss, onManualNext, show }) => {
  if (dismissed && !show) return null;

  const visible = steps.filter(s => !s.done);
  const allDone = visible.length === 0;
  const current = visible[0];

  if (allDone) {
    return (
      <div style={{
        position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
        background: '#141922', border: '1px solid rgba(95,203,147,.3)',
        borderRadius: 5, padding: '12px 16px', zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 18px 44px rgba(0,0,0,.55)',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14, color: '#5fcb93',
        }}>
          ✓
        </span>
        <span style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13, color: '#c6d2de', flex: 1,
        }}>
          Tutorial complete! Build your outpost — open the build menu with{' '}
          <strong style={{ color: '#e8ae4a' }}>B</strong>.
        </span>
        <button onClick={onDismiss} style={{
          height: 28, padding: '0 12px',
          display: 'grid', placeItems: 'center',
          background: '#101720', color: '#94a2b0',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: 3,
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 11, fontWeight: 600, letterSpacing: '.1em',
          cursor: 'pointer',
        }}>
          OK
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
      width: 460, maxWidth: '90vw',
      background: '#141922', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 5, zIndex: 30,
      boxShadow: '0 18px 44px rgba(0,0,0,.55)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', background: '#1d242e',
        borderBottom: '1px solid rgba(255,255,255,.08)',
      }}>
        <div style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: '.16em',
          color: '#e8ae4a',
        }}>
          TUTORIAL
        </div>
        <button onClick={onDismiss} style={{
          height: 24, padding: '0 10px',
          display: 'grid', placeItems: 'center',
          background: 'transparent', color: '#7e8c9a',
          border: 'none',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 11, cursor: 'pointer',
        }}>
          Skip tutorial
        </button>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 15, fontWeight: 700, letterSpacing: '.06em',
          color: STEP_COLORS[current.id] || '#e8ae4a', marginBottom: 8,
        }}>
          {current.title}
        </div>
        <div style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13, color: '#c6d2de', lineHeight: 1.6, marginBottom: 14,
        }}>
          {current.body}
        </div>

        {current.manual ? (
          <button onClick={() => onManualNext(current.id)} style={{
            height: 32, padding: '0 20px',
            display: 'grid', placeItems: 'center',
            background: '#e8ae4a',
            color: '#0b0e12',
            fontFamily: "'Chakra Petch', sans-serif",
            fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
            border: 'none', borderRadius: 4,
            cursor: 'pointer',
          }}>
            CONTINUE
          </button>
        ) : (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: '#7e8c9a', fontStyle: 'italic',
          }}>
            {current.id === 'move' ? 'Use WASD / Arrow keys to move to a nearby goal.' : 'Complete the action above — it will auto-advance.'}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 6, alignItems: 'center', marginTop: 14,
          paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)',
        }}>
          {steps.map(s => (
            <div key={s.id} style={{
              height: 4, flex: 1, borderRadius: 2,
              background: s.done ? '#5fcb93' : (s.id === current.id ? '#e8ae4a' : 'rgba(255,255,255,.1)'),
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};
