import React from 'react';

export interface HelpPanelProps {
  onReviewTutorial?: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ onReviewTutorial }) => (
  <div style={{
    position: 'absolute', top: 50, right: 8,
    background: '#141922', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 5, zIndex: 20, width: 340,
    maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
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
        CONTROLS & HELP
      </span>
    </div>

    <div style={{ padding: 14 }}>
      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#5fcb93', marginBottom: 6,
      }}>
        MOVEMENT
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div>WASD / Arrow Keys — Manual movement</div>
        <div>Right-Click empty terrain — Pathfind and move to that tile</div>
        <div>Right-Click Wood / Stone — Move onto the tile and auto-collect</div>
        <div>Right-Click Coal / Iron / Copper / Gold — Path to an adjacent tile and continuously harvest</div>
        <div>Alt + Click — Pan camera</div>
        <div>Scroll wheel — Zoom</div>
      </div>

      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#5fcb93', marginBottom: 6,
      }}>
        ACTIONS
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div><strong style={{ color: '#e8edf2' }}>RMB Wood / Stone</strong> — Move onto the tile and auto-collect</div>
        <div>&nbsp;&nbsp;- Walking across Wood / Stone also auto-collects them</div>
        <div><strong style={{ color: '#e8edf2' }}>RMB Coal / Iron / Copper / Gold</strong> — Path to an adjacent tile and continuously harvest</div>
        <div><strong style={{ color: '#e8edf2' }}>E</strong> — Manual harvesting / interact fallback</div>
        <div style={{ color: '#7e8c9a', fontStyle: 'italic', marginTop: 2 }}>WASD or a new RMB command cancels mouse-driven movement/harvesting</div>
        <div style={{ height: 6 }}></div>
        <div><strong style={{ color: '#e8edf2' }}>R</strong> — Rotate building (remote if inspected, current tile otherwise)</div>
        <div><strong style={{ color: '#e8edf2' }}>Q</strong> — Remove building (demolish; remote if inspected, current tile otherwise, half refund)</div>
        <div><strong style={{ color: '#e8edf2' }}>Left-Click a building</strong> — Inspect it (status, power, storage, deposits)</div>
      </div>

      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#e8ae4a', marginBottom: 6,
      }}>
        BUILD MODE
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div>Press <strong style={{ color: '#e8edf2' }}>B</strong>, pick a building. You can keep <strong style={{ color: '#e8edf2' }}>moving</strong> while a build tool is armed.</div>
        <div><strong style={{ color: '#e8edf2' }}>Left-Click</strong> — Place on the tile under the cursor (within ~6 tiles of you)</div>
        <div><strong style={{ color: '#e8edf2' }}>Left-Click + Drag</strong> (Conveyor) — Lay a multi-tile belt route in one stroke; corners are pointed automatically</div>
        <div><strong style={{ color: '#e8edf2' }}>R</strong> — Rotate the direction a single-click conveyor will face</div>
        <div>The selected building stays armed for repeated placement until you <strong style={{ color: '#e8edf2' }}>Cancel</strong> or press <strong style={{ color: '#e8edf2' }}>Esc</strong></div>
      </div>

      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#5faee0', marginBottom: 6,
      }}>
        POWER & CONVEYORS
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div>• <strong style={{ color: '#e8edf2' }}>One shared power grid</strong>: every machine on the map draws from the same pool. No cables, poles, or ranges — just build a Generator, feed it Coal, and the whole outpost is powered.</div>
        <div>• Conveyors face a direction — arrows animate the direction items travel</div>
        <div>• A red gate + pulsing red glow means the belt is <strong style={{ color: '#e8edf2' }}>blocked</strong> (e.g. two belts facing each other)</div>
      </div>

      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#f6bb45', marginBottom: 6,
      }}>
        SIMULATION
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div><strong style={{ color: '#e8edf2' }}>Space</strong> — Pause / Resume</div>
        <div><strong style={{ color: '#e8edf2' }}>+/-</strong> — Adjust simulation speed</div>
        <div><strong style={{ color: '#e8edf2' }}>0-3</strong> — Quick speed presets (x1, x5, x10, x20)</div>
      </div>

      <div style={{
        fontFamily: "'Chakra Petch', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
        color: '#94a2b0', marginBottom: 6,
      }}>
        UI
      </div>
      <div style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#c6d2de', lineHeight: 1.7, marginBottom: 14,
      }}>
        <div><strong style={{ color: '#e8edf2' }}>B</strong> — Toggle build menu</div>
        <div><strong style={{ color: '#e8edf2' }}>I</strong> — Toggle inventory panel</div>
        <div><strong style={{ color: '#e8edf2' }}>O</strong> — Toggle objectives</div>
        <div><strong style={{ color: '#e8edf2' }}>H</strong> — Toggle this help</div>
        <div><strong style={{ color: '#e8edf2' }}>Esc</strong> — Deselect build tool, then close panels (one layer at a time)</div>
      </div>

      <div style={{
        padding: 12, background: '#101720', borderRadius: 3,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12, color: '#94a2b0', lineHeight: 1.6,
        borderTop: '2px solid #e8ae4a',
      }}>
        <div style={{
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
          color: '#e8ae4a', marginBottom: 6,
        }}>
          Building your first power line
        </div>
        <div>1. Place a Coal Generator on grass</div>
        <div>2. Inspect it and give it Coal (or mine coal and stand near it to hand it in)</div>
        <div>3. Put a Miner on a coal deposit</div>
        <div>4. Pick the Conveyor tool and <strong style={{ color: '#e8edf2' }}>click-drag</strong> a route from the Miner toward the Generator — belts point and turn by themselves</div>
        <div>5. Watch the <strong style={{ color: '#e8edf2' }}>OUTPOST POWER GRID</strong> panel: surplus should stay positive</div>
        <div>6. If a belt glows red it's blocked — check its direction and the building it leads into</div>
      </div>

      {onReviewTutorial && (
        <button onClick={onReviewTutorial} style={{
          width: '100%',
          marginTop: 12,
          padding: '8px 12px',
          display: 'grid', placeItems: 'center',
          background: '#e8ae4a',
          color: '#0b0e12',
          fontFamily: "'Chakra Petch', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          border: 'none', borderRadius: 4,
          cursor: 'pointer',
        }}>
          REVIEW TUTORIAL
        </button>
      )}
    </div>
  </div>
);
