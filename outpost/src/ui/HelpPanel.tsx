import React from 'react';

export const HelpPanel: React.FC = () => (
  <div style={{
    position: 'absolute', top: 50, right: 8,
    background: 'rgba(20,20,40,0.95)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, padding: 16, zIndex: 20, width: 320,
    maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
  }}>
    <div style={{ color: '#aaa', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>
      Controls & Help
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8 }}>
      <div style={{ color: '#4488ff', fontWeight: 'bold' }}>Movement</div>
      <div>WASD / Arrow Keys - Move player</div>
      <div>Alt + Click - Pan camera</div>
      <div>Scroll wheel - Zoom</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#44cc44', fontWeight: 'bold' }}>Actions</div>
      <div><strong>E</strong> - Harvest the tile you're facing (or standing on)</div>
      <div>&nbsp;&nbsp;- Trees → Wood, Rocks → Stone, Ore deposits → their ore</div>
      <div><strong>R</strong> - Rotate building on current tile</div>
      <div><strong>Q</strong> - Remove building (get half refund)</div>
      <div><strong>Left-Click a building</strong> - Inspect it (status, power, storage, deposits)</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>Build Mode</div>
      <div>Press <strong>B</strong>, pick a building. You can keep <strong>moving</strong> while a build tool is armed.</div>
      <div><strong>Left-Click</strong> - Place on the tile under the cursor (within ~6 tiles of you)</div>
      <div><strong>Left-Click + Drag</strong> (Conveyor) - Lay a multi-tile belt route in one stroke; corners are pointed automatically</div>
      <div><strong>R</strong> - Rotate the direction a single-click conveyor will face</div>
      <div>The selected building stays armed for repeated placement until you <strong>Cancel</strong> or press <strong>Esc</strong></div>
      <div><strong>Esc</strong> - First deselects the build tool, next press closes the menu (staged)</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ff66ff', fontWeight: 'bold' }}>Power & Conveyors</div>
      <div>• <strong>One shared power grid</strong>: every machine on the map draws from the same pool. No cables, poles, or ranges — just build a Generator, feed it Coal, and the whole outpost is powered. Energy links are drawn in the world to show generator → machine connections.</div>
      <div>• Conveyors face a direction — arrows animate the direction items travel</div>
      <div>• Elbows (corners) are drawn as curves; items follow the bend automatically</div>
      <div>• A red gate + pulsing red glow means the belt is <strong>blocked</strong> (e.g. two belts facing each other)</div>
      <div>• Generators burn 1 Coal every 50 ticks and need Coal to produce power</div>
      <div>• Watch the <strong>OUTPOST POWER GRID</strong> panel top-right; click a building to inspect and see why it runs or stops</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ffcc00', fontWeight: 'bold' }}>Simulation</div>
      <div><strong>Space</strong> - Pause / Resume</div>
      <div><strong>+/-</strong> - Adjust simulation speed</div>
      <div><strong>0-3</strong> - Quick speed presets (x1, x5, x10, x20)</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ff66ff', fontWeight: 'bold' }}>UI</div>
      <div><strong>B</strong> - Toggle build menu</div>
      <div><strong>I</strong> - Toggle inventory panel</div>
      <div><strong>O</strong> - Toggle objectives</div>
      <div><strong>H</strong> - Toggle this help</div>
      <div><strong>Esc</strong> - Deselect build tool, then close panels (one layer at a time)</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 11, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, lineHeight: 1.6 }}>
      <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Building your first power line</div>
      <div>1. Place a Coal Generator on grass</div>
      <div>2. Inspect it and give it Coal (or mine coal and stand near it to hand it in)</div>
      <div>3. Put a Miner on a coal deposit</div>
      <div>4. Pick the Conveyor tool and <strong>click-drag</strong> a route from the Miner toward the Generator — belts point and turn by themselves (press R to flip a single belt)</div>
      <div>5. Watch the OUTPOST POWER GRID panel: surplus should stay positive. Since the grid is global, the Miner and belts are powered no matter how far they are from the Generator.</div>
      <div>6. If a belt glows red it's blocked — check its direction and the building it leads into</div>
    </div>
  </div>
);
