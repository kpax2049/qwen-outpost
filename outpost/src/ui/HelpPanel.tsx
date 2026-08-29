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
    </div>

    <div style={{ color: '#ddd', fontSize: 12, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
      <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>Simulation</div>
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
      <div style={{ color: '#ffcc00', fontWeight: 'bold', marginBottom: 4 }}>Tips</div>
      <div>• Face a tree or rock and press E to gather Wood / Stone (they're obstacles — stand next to them)</div>
      <div>• Stand on or face an ore deposit (coal, iron, copper, gold) and press E to mine it</div>
      <div>• The orange highlight shows what pressing E will harvest</div>
      <div>• Place miners on resource deposits to automate gathering</div>
      <div>• Use conveyors to transport items between buildings</div>
      <div>• Smelters need ore + coal to make ingots</div>
      <div>• Assemblers craft advanced items from ingots and wires</div>
      <div>• Buildings need power from generators to operate</div>
      <div>• Place buildings adjacent to each other for connections</div>
    </div>
  </div>
);
