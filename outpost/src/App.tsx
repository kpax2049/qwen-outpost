import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { Renderer } from './rendering/Renderer';
import type { Camera } from './rendering/Renderer';
import { Dir, BUILDING_COLORS } from './types';
import type { BuildingTypeValue } from './types';
import { HUD } from './ui/HUD';
import { BuildMenu } from './ui/BuildMenu';
import { InventoryPanel } from './ui/InventoryPanel';
import { HelpPanel } from './ui/HelpPanel';
import { ObjectivesPanel } from './ui/ObjectivesPanel';

const SAVE_KEY = 'outpost-save';
const TILE_SIZE = 48;

function saveGame(engine: GameEngine): string {
  const data = engine.save();
  localStorage.setItem(SAVE_KEY, data);
  return data;
}

function loadGame(engine: GameEngine): boolean {
  const data = localStorage.getItem(SAVE_KEY);
  if (!data) return false;
  try {
    engine.load(data);
    return true;
  } catch {
    return false;
  }
}

function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine(42));
  const rendererRef = useRef<Renderer | null>(null);
  const tickAccumulatorRef = useRef<number>(0);

  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const buildTypeRef = useRef<BuildingTypeValue | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cameraStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectedTileRef = useRef<{ x: number; y: number } | null>(null);
  const showWinRef = useRef(false);

  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showObjectives, setShowObjectives] = useState(true);
  const [buildType, setBuildType] = useState<BuildingTypeValue | null>(null);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [nearbyBuildings, setNearbyBuildings] = useState<import('./types').Tile[]>([]);
  const [, setRenderTick] = useState(0);

  const handleSave = useCallback(() => {
    try {
      saveGame(engineRef.current);
      setSaveStatus({ message: 'Game saved!', type: 'success' });
    } catch {
      setSaveStatus({ message: 'Failed to save game', type: 'error' });
    }
    setTimeout(() => setSaveStatus(null), 2000);
  }, []);

  const handleLoad = useCallback(() => {
    try {
      if (loadGame(engineRef.current)) {
        setSaveStatus({ message: 'Game loaded!', type: 'success' });
      } else {
        setSaveStatus({ message: 'No save game found', type: 'error' });
      }
    } catch {
      setSaveStatus({ message: 'Failed to load game', type: 'error' });
    }
    setTimeout(() => setSaveStatus(null), 2000);
  }, []);

  const handleNewGame = useCallback(() => {
    if (confirm('Start a new game? Current progress will be lost (use Save to keep it).')) {
      clearSave();
      engineRef.current = new GameEngine(Math.floor(Math.random() * 999999));
      setSaveStatus({ message: 'New game started!', type: 'info' });
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const engine = engineRef.current;
      const pos = engine.getPlayerPosition();
      const zoom = cameraRef.current.zoom;
      cameraRef.current.x = canvas.width / 2 - pos.x * TILE_SIZE * zoom;
      cameraRef.current.y = canvas.height / 2 - pos.y * TILE_SIZE * zoom;
    };

    resize();
    window.addEventListener('resize', resize);

    rendererRef.current = new Renderer(canvas);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Consolidated single keydown handler reading from refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      const bt = buildTypeRef.current;

      if (bt && ['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        switch (e.key.toLowerCase()) {
          case 'q': engine.setBuildDirection(Dir.Up); break;
          case 'w': engine.setBuildDirection(Dir.Right); break;
          case 'e': engine.setBuildDirection(Dir.Down); break;
          case 'r': engine.setBuildDirection(Dir.Left); break;
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          if (!bt) { e.preventDefault(); engine.movePlayer(0, -1); setRenderTick(t => t + 1); }
          break;
        case 's': case 'arrowdown':
          if (!bt) { e.preventDefault(); engine.movePlayer(0, 1); setRenderTick(t => t + 1); }
          break;
        case 'a': case 'arrowleft':
          if (!bt) { e.preventDefault(); engine.movePlayer(-1, 0); setRenderTick(t => t + 1); }
          break;
        case 'd': case 'arrowright':
          if (!bt) { e.preventDefault(); engine.movePlayer(1, 0); setRenderTick(t => t + 1); }
          break;
        case 'e':
          if (!bt) { engine.mineResource(); engine.mineTile(); setRenderTick(t => t + 1); }
          break;
        case 'r':
          if (!bt) { engine.rotateBuilding(); setRenderTick(t => t + 1); }
          break;
        case 'q':
          if (!bt) { engine.removeBuilding(); setRenderTick(t => t + 1); }
          break;
        case ' ':
          e.preventDefault();
          engine.setPaused(!engine.getConfig().paused);
          break;
      }

      switch (e.key.toLowerCase()) {
        case '=': case '+':
          engine.setTickRate(engine.getConfig().tickRate + 1);
          break;
        case '-':
          engine.setTickRate(engine.getConfig().tickRate - 1);
          break;
        case '0': engine.setTickRate(1); break;
        case '1': engine.setTickRate(5); break;
        case '2': engine.setTickRate(10); break;
        case '3': engine.setTickRate(20); break;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          setShowBuildMenu(prev => { setShowInventory(false); setShowHelp(false); return !prev; });
          break;
        case 'i':
          setShowInventory(prev => { setShowBuildMenu(false); setShowHelp(false); return !prev; });
          break;
        case 'h':
          setShowHelp(prev => { setShowBuildMenu(false); setShowInventory(false); return !prev; });
          break;
        case 'o':
          setShowObjectives(prev => !prev);
          break;
      }

      if (e.key.toLowerCase() === 'escape') {
        setBuildType(null);
        buildTypeRef.current = null;
        setShowBuildMenu(false);
        setShowInventory(false);
        setShowHelp(false);
      }

      if (e.key.toLowerCase() === 'f5') {
        e.preventDefault();
        handleSave();
      }
      if (e.key.toLowerCase() === 'f9') {
        e.preventDefault();
        handleLoad();
      }

      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLoad();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleLoad]);

  // Stable game loop - no volatile state in deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const gameLoop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      frameCount++;

      const engine = engineRef.current;
      const renderer = rendererRef.current!;

      tickAccumulatorRef.current += delta;
      const tickInterval = 1 / engine.getConfig().tickRate;

      while (tickAccumulatorRef.current >= tickInterval) {
        engine.tick();
        tickAccumulatorRef.current -= tickInterval;
      }

      if (engine.getWinState() && !showWinRef.current) {
        showWinRef.current = true;
        setShowWinMessage(true);
      }

      const pos = engine.getPlayerPosition();

      if (!isDraggingRef.current) {
        const targetX = canvas.width / 2 - pos.x * TILE_SIZE * cameraRef.current.zoom;
        const targetY = canvas.height / 2 - pos.y * TILE_SIZE * cameraRef.current.zoom;
        cameraRef.current.x += (targetX - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (targetY - cameraRef.current.y) * 0.1;
      }

      if (frameCount % 30 === 0) {
        const buildings = engine.getNearbyBuildings(pos.x, pos.y, 3);
        setNearbyBuildings(buildings);
      }

      const bt = buildTypeRef.current;
      const mouseW = mousePosRef.current;
      const selTile = selectedTileRef.current;

      let previewTile: { x: number; y: number } | null = null;
      let previewColor: string | undefined;
      if (bt && mouseW) {
        const mouseWCam = {
          x: (mouseW.x - cameraRef.current.x) / cameraRef.current.zoom,
          y: (mouseW.y - cameraRef.current.y) / cameraRef.current.zoom,
        };
        const tx = Math.floor(mouseWCam.x / TILE_SIZE);
        const ty = Math.floor(mouseWCam.y / TILE_SIZE);
        if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
          previewTile = { x: tx, y: ty };
          previewColor = BUILDING_COLORS[bt];
        }
      }

      renderer.render(
        engine.map,
        engine.player,
        cameraRef.current,
        {
          selectedTile: selTile,
          buildPreview: previewTile,
          buildColor: previewColor,
        }
      );

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    mousePosRef.current = { x: mx, y: my };

    if (isDraggingRef.current && dragStartRef.current && cameraStartRef.current) {
      cameraRef.current.x = cameraStartRef.current.x + (mx - dragStartRef.current.x);
      cameraRef.current.y = cameraStartRef.current.y + (my - dragStartRef.current.y);
      return;
    }

    const worldX = (mx - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (my - cameraRef.current.y) / cameraRef.current.zoom;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);

    if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
      selectedTileRef.current = { x: tx, y: ty };
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      cameraStartRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
      e.preventDefault();
      return;
    }

    const bt = buildTypeRef.current;
    if (bt) {
      const worldX = (mx - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (my - cameraRef.current.y) / cameraRef.current.zoom;
      const tx = Math.floor(worldX / TILE_SIZE);
      const ty = Math.floor(worldY / TILE_SIZE);
      selectedTileRef.current = { x: tx, y: ty };

      if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
        const engine = engineRef.current;
        const player = engine.player;
        const dx = Math.abs(tx - player.x);
        const dy = Math.abs(ty - player.y);

        if (dx <= 1 && dy <= 1) {
          engine.placeBuildingAt(bt, tx, ty);
          setRenderTick(t => t + 1);
        }
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    cameraStartRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.3, Math.min(3, cameraRef.current.zoom + zoomDelta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = (mx - cameraRef.current.x) / cameraRef.current.zoom;
      const worldY = (my - cameraRef.current.y) / cameraRef.current.zoom;
      cameraRef.current.x = mx - worldX * newZoom;
      cameraRef.current.y = my - worldY * newZoom;
    }
    cameraRef.current.zoom = newZoom;
  }, []);

  const handleBuildSelect = (type: BuildingTypeValue) => {
    if (buildType === type) {
      setBuildType(null);
      buildTypeRef.current = null;
    } else {
      setBuildType(type);
      buildTypeRef.current = type;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a1a2e', position: 'relative', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
        onWheel={handleWheel}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      {showWinMessage && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 100,
        }}>
          <h1 style={{ color: '#ffd700', fontSize: 48, margin: 0, textShadow: '0 0 20px rgba(255,215,0,0.5)' }}>
            Outpost Established!
          </h1>
          <p style={{ color: '#ccc', fontSize: 18, marginTop: 16 }}>
            You've crafted 5 engines and built a thriving outpost.
          </p>
          <button
            onClick={() => {
              setShowWinMessage(false);
              showWinRef.current = false;
              engineRef.current.resetWinState();
            }}
            style={{
              marginTop: 24, padding: '12px 32px', background: '#4488ff', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer',
            }}
          >
            Continue Playing
          </button>
        </div>
      )}

      <HUD
        tickRate={engineRef.current.getConfig().tickRate}
        paused={engineRef.current.getConfig().paused}
        onTogglePause={() => engineRef.current.setPaused(!engineRef.current.getConfig().paused)}
        onIncreaseSpeed={() => engineRef.current.setTickRate(engineRef.current.getConfig().tickRate + 1)}
        onDecreaseSpeed={() => engineRef.current.setTickRate(engineRef.current.getConfig().tickRate - 1)}
        onResetSpeed={() => engineRef.current.setTickRate(10)}
        onToggleBuildMenu={() => { setShowBuildMenu(!showBuildMenu); setShowInventory(false); setShowHelp(false); }}
        onToggleInventory={() => { setShowInventory(!showInventory); setShowBuildMenu(false); setShowHelp(false); }}
        onToggleHelp={() => { setShowHelp(!showHelp); setShowBuildMenu(false); setShowInventory(false); }}
        onToggleObjectives={() => setShowObjectives(!showObjectives)}
        onSave={handleSave}
        onLoad={handleLoad}
        onNewGame={handleNewGame}
        buildType={buildType}
        onDeselectBuild={() => { setBuildType(null); buildTypeRef.current = null; }}
        saveStatus={saveStatus}
      />

      {showBuildMenu && (
        <BuildMenu
          onSelectBuild={handleBuildSelect}
          activeBuild={buildType}
          playerInventory={engineRef.current.player.inventory}
        />
      )}

      {showInventory && (
        <InventoryPanel
          playerInventory={engineRef.current.player.inventory}
          nearbyBuildings={nearbyBuildings}
          playerStats={engineRef.current.player.stats}
        />
      )}

      {showHelp && <HelpPanel />}
      {showObjectives && <ObjectivesPanel enginesCrafted={engineRef.current.player.stats.enginesCrafted} stonesMined={engineRef.current.player.stats.stonesMined} />}
    </div>
  );
};

export default App;
