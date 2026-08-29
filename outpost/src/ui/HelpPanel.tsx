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
      <div>Press <strong>B</strong>, pick a building, hover to preview, click to place</div>
      <div><strong>A/S/W/D or Arrow keys</strong> - Set conveyor direction before placing</div>
      <div><strong>R</strong> - Rotate the conveyor direction</div>
      <div><strong>Enter/click</strong> - Place on the highlighted tile</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ff66ff', fontWeight: 'bold' }}>Power & Conveyors</div>
      <div>• Conveyors face a direction — arrows animate the direction items travel</div>
      <div>• Elbows (corners) are drawn as curves; items follow the bend automatically</div>
      <div>• A red gate + pulsing red glow means the belt is <strong>blocked</strong> (e.g. two belts facing each other)</div>
      <div>• Generators burn 1 Coal every 50 ticks and need Coal to produce power</div>
      <div>• All machines share one power grid — watch the POWER GRID panel top-right</div>
      <div>• Click a building to inspect; use "Give" buttons to deposit fuel/ore nearby</div>
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
      <div><strong>Esc</strong> - Deselect build mode</div>
    </div>

    <div style={{ color: '#ddd', fontSize: 11, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, lineHeight: 1.6 }}>
      <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Building your first power line</div>
      <div>1. Place a Coal Generator on grass</div>
      <div>2. Inspect it and give it Coal (or mine coal and stand near it to hand it in)</div>
      <div>3. Put a Miner on a coal deposit</div>
      <div>4. Lay a Conveyor line from the Miner toward the Generator — use A/S/W/D or R so belts point the right way and turn at corners</div>
      <div>5. Watch the POWER GRID panel: surplus should stay positive</div>
      <div>6. If a belt glows red it's blocked — check its direction and the building it leads into</div>
    </div>
  </div>
);
