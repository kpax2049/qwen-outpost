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

  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [buildType, setBuildType] = useState<BuildingTypeValue | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showObjectives, setShowObjectives] = useState(true);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [cameraStart, setCameraStart] = useState<{ x: number; y: number } | null>(null);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [nearbyBuildings, setNearbyBuildings] = useState<import('./types').Tile[]>([]);

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

  // Stable refs for the game loop so the effect is never torn down by React state changes
  const cameraRef = useRef(camera);
  const mousePosRef = useRef(mousePos);
  const buildTypeRef = useRef(buildType);
  const selectedTileRef = useRef(selectedTile);
  const showWinRef = useRef(showWinMessage);
  const setShowWinRef = useRef(setShowWinMessage);
  const handleSaveRef = useRef(handleSave);
  const handleLoadRef = useRef(handleLoad);

  // Sync refs with state (no effect restart because nothing is in the dep array)
  useEffect(() => { cameraRef.current = camera; });
  useEffect(() => { mousePosRef.current = mousePos; });
  useEffect(() => { buildTypeRef.current = buildType; });
  useEffect(() => { selectedTileRef.current = selectedTile; });
  useEffect(() => { showWinRef.current = showWinMessage; });
  useEffect(() => { setShowWinRef.current = setShowWinMessage; });

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
      const camX = pos.x * 48 - canvas.width / (2 * 1.2);
      const camY = pos.y * 48 - canvas.height / (2 * 1.2);
      setCamera({ x: camX, y: camY, zoom: 1.2 });
    };

    resize();
    window.addEventListener('resize', resize);

    rendererRef.current = new Renderer(canvas);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;

      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          e.preventDefault();
          engine.movePlayer(0, -1);
          break;
        case 's': case 'arrowdown':
          e.preventDefault();
          engine.movePlayer(0, 1);
          break;
        case 'a': case 'arrowleft':
          e.preventDefault();
          engine.movePlayer(-1, 0);
          break;
        case 'd': case 'arrowright':
          e.preventDefault();
          engine.movePlayer(1, 0);
          break;
        case 'e':
          engine.mineResource();
          break;
        case 'r':
          engine.rotateBuilding();
          break;
        case 'q':
          engine.removeBuilding();
          break;
        case ' ':
          e.preventDefault();
          engine.setPaused(!engine.getConfig().paused);
          break;
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
        case 'b':
          setShowBuildMenu(prev => !prev);
          setShowInventory(false);
          setShowHelp(false);
          break;
        case 'i':
          setShowInventory(prev => !prev);
          setShowBuildMenu(false);
          setShowHelp(false);
          break;
        case 'h':
          setShowHelp(prev => !prev);
          setShowBuildMenu(false);
          setShowInventory(false);
          break;
        case 'o':
          setShowObjectives(prev => !prev);
          break;
        case 'escape':
          setBuildType(null);
          setShowBuildMenu(false);
          setShowInventory(false);
          setShowHelp(false);
          break;
        case 'f5':
          e.preventDefault();
          handleSaveRef.current();
          break;
        case 'f9':
          e.preventDefault();
          handleLoadRef.current();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stable game loop - no volatile state in deps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;

    let lastTime = performance.now();

    const gameLoop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const engine = engineRef.current;
      const renderer = rendererRef.current!;

      tickAccumulatorRef.current += delta;
      const tickInterval = 1 / engine.getConfig().tickRate;

      while (tickAccumulatorRef.current >= tickInterval) {
        engine.tick();
        tickAccumulatorRef.current -= tickInterval;
      }

      if (engine.getWinState() && !showWinRef.current) {
        setShowWinRef.current(true);
        setShowWinMessage(true);
      }

      const pos = engine.getPlayerPosition();
      setCamera(prev => {
        const targetX = pos.x * 48 - canvas.width / (2 * prev.zoom);
        const targetY = pos.y * 48 - canvas.height / (2 * prev.zoom);
        return {
          ...prev,
          x: prev.x + (targetX - prev.x) * 0.1,
          y: prev.y + (targetY - prev.y) * 0.1,
        };
      });

      // Update nearby buildings periodically
      const buildings = engine.getNearbyBuildings(pos.x, pos.y, 3);
      setNearbyBuildings(buildings);

      const mouseW = mousePosRef.current;
      const bt = buildTypeRef.current;
      const selTile = selectedTileRef.current;

      let previewTile: { x: number; y: number } | null = null;
      let previewColor: string | undefined;
      if (bt && mouseW) {
        const mouseWCam = {
          x: (mouseW.x - cameraRef.current.x) / cameraRef.current.zoom,
          y: (mouseW.y - cameraRef.current.y) / cameraRef.current.zoom,
        };
        const tx = Math.floor(mouseWCam.x / 48);
        const ty = Math.floor(mouseWCam.y / 48);
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
    };

    const rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, []); // Empty deps = never restarts

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setMousePos({ x: mx, y: my });

    if (isDragging && dragStart && cameraStart) {
      setCamera(prev => ({
        ...prev,
        x: cameraStart.x + (mx - dragStart.x),
        y: cameraStart.y + (my - dragStart.y),
      }));
      return;
    }

    const worldX = (mx - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (my - cameraRef.current.y) / cameraRef.current.zoom;
    const tx = Math.floor(worldX / 48);
    const ty = Math.floor(worldY / 48);

    if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
      setSelectedTile({ x: tx, y: ty });
    }
  }, [isDragging, dragStart, cameraStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setCameraStart({ x: cameraRef.current.x, y: cameraRef.current.y });
      return;
    }

    const bt = buildTypeRef.current;
    const st = selectedTileRef.current;
    if (bt && st) {
      const engine = engineRef.current;
      const player = engine.player;
      const dx = Math.abs(st.x - player.x);
      const dy = Math.abs(st.y - player.y);

      if (dx <= 1 && dy <= 1) {
        engine.placeBuilding(bt);
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setCameraStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    setCamera(prev => {
      const newZoom = Math.max(0.3, Math.min(3, prev.zoom - e.deltaY * 0.001));
      return { ...prev, zoom: newZoom };
    });
  }, []);

  const handleBuildSelect = (type: BuildingTypeValue) => {
    if (buildType === type) {
      setBuildType(null);
    } else {
      setBuildType(type);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (buildType && ['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        const engine = engineRef.current;
        switch (e.key.toLowerCase()) {
          case 'q': engine.setBuildDirection(Dir.Up); break;
          case 'w': engine.setBuildDirection(Dir.Right); break;
          case 'e': engine.setBuildDirection(Dir.Down); break;
          case 'r': engine.setBuildDirection(Dir.Left); break;
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveRef.current();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLoadRef.current();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [buildType]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#1a1a2e', position: 'relative', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: buildType ? 'crosshair' : 'default' }}
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
        onDeselectBuild={() => setBuildType(null)}
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
      {showObjectives && <ObjectivesPanel enginesCrafted={engineRef.current.player.stats.enginesCrafted} />}
    </div>
  );
};

export default App;
