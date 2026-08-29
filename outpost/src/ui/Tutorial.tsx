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
}

const TUTORIAL_COLORS: Record<string, string> = {
  move: '#4488ff',
  wood: '#8a5a2a',
  stone: '#8a8a8a',
  build: '#ffaa00',
  place: '#ffaa00',
  next: '#cc4400',
};

export const Tutorial: React.FC<TutorialProps> = ({ steps, dismissed, onDismiss, onManualNext }) => {
  if (dismissed) return null;

  const visible = steps.filter(s => !s.done);
  const allDone = visible.length === 0;
  const current = visible[0];

  if (allDone) {
    return (
      <div style={{
        position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(20,40,20,0.95)', border: '1px solid rgba(68,204,68,0.4)',
        borderRadius: 6, padding: '10px 16px', zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: '#44cc44', fontSize: 14 }}>✓</span>
        <span style={{ color: '#ddd', fontSize: 13 }}>
          Tutorial complete! Build your outpost — open the build menu with{' '}
          <strong style={{ color: '#ffaa00' }}>B</strong>.
        </span>
        <button onClick={onDismiss}
          style={{ background: 'rgba(255,255,255,0.1)', color: '#aaa', border: 'none', borderRadius: 3, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
          OK
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)',
      width: 440, maxWidth: '90vw',
      background: 'rgba(20,20,40,0.96)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8, padding: 14, zIndex: 30, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ color: '#ffcc00', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
          TUTORIAL
        </div>
        <button onClick={onDismiss} style={{
          background: 'transparent', color: '#888', border: 'none', fontSize: 11, cursor: 'pointer',
        }}>
          Skip tutorial
        </button>
      </div>

      <div style={{ color: TUTORIAL_COLORS[current.id] || '#ffaa00', fontSize: 15, fontWeight: 'bold', marginBottom: 4 }}>
        {current.title}
      </div>
      <div style={{ color: '#ddd', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
        {current.body}
      </div>

      {current.manual ? (
        <button onClick={() => onManualNext(current.id)} style={{
          background: '#ffaa00', color: '#1a1a2e', border: 'none', borderRadius: 4,
          padding: '6px 16px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
        }}>
          Continue
        </button>
      ) : (
        <div style={{ color: '#888', fontSize: 11, fontStyle: 'italic' }}>
          {current.id === 'move' ? 'Use WASD / Arrow keys to move to a nearby goal.' : 'Complete the action above — it will auto-advance.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
        {steps.map(s => (
          <div key={s.id} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: s.done ? '#44cc44' : (s.id === current.id ? '#ffaa00' : 'rgba(255,255,255,0.15)'),
          }} />
        ))}
      </div>
    </div>
  );
};
