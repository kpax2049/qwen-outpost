import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { Renderer } from './rendering/Renderer';
import type { Camera } from './rendering/Renderer';
import { AssetLoader } from './rendering/AssetLoader';
import { BUILDING_COLORS, BuildingTypeMap } from './types';
import type { BuildingTypeValue, PowerSummary, DirectionValue } from './types';
import { HUD } from './ui/HUD';
import { BuildMenu } from './ui/BuildMenu';
import { InventoryPanel } from './ui/InventoryPanel';
import { HelpPanel } from './ui/HelpPanel';
import { ObjectivesPanel } from './ui/ObjectivesPanel';
import { Tutorial } from './ui/Tutorial';
import { InspectionPanel, type InspectionData } from './ui/InspectionPanel';
import type { TutorialStep } from './ui/Tutorial';

const SAVE_KEY = 'outpost-save';
const TILE_SIZE = 48;
/** How far (Chebyshev distance) the player can place a building from their tile. */
const BUILD_RANGE = 6;

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

/** Whether a build tile is placeable at (tx,ty): valid terrain/occupancy AND within range. */
function thisTilePlaceable(engine: GameEngine, buildingType: BuildingTypeValue, tx: number, ty: number): boolean {
  const p = engine.player;
  const inRange = Math.max(Math.abs(tx - p.x), Math.abs(ty - p.y)) <= BUILD_RANGE;
  return inRange && engine.canPlaceAt(buildingType, tx, ty).ok;
}

/**
 * Build an axis-aligned (L/straight) tile path from anchor to target, walking one
 * orthogonal leg first then the other. Returns the list of distinct tiles.
 */
function buildOrthoPath(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
  const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
  let x = a.x;
  let y = a.y;
  path.push({ x, y });
  // Walk the dominant axis first, then the other (gives one clean orthogonal bend).
  if (Math.abs(dx) >= Math.abs(dy)) {
    while (x !== b.x) { x += stepX; path.push({ x, y }); }
    while (y !== b.y) { y += stepY; path.push({ x, y }); }
  } else {
    while (y !== b.y) { y += stepY; path.push({ x, y }); }
    while (x !== b.x) { x += stepX; path.push({ x, y }); }
  }
  return path;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine(42));
  const rendererRef = useRef<Renderer | null>(null);
  const assetLoaderRef = useRef<AssetLoader | null>(null);
  const tickAccumulatorRef = useRef<number>(0);

  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const buildTypeRef = useRef<BuildingTypeValue | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cameraStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectedTileRef = useRef<{ x: number; y: number } | null>(null);
  // Conveyor route drag state (plain left-click while the conveyor tool is armed).
  const buildDraggingRef = useRef(false);
  const buildDragAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const buildDragPathRef = useRef<{ x: number; y: number }[]>([]);
  const inspectedRef = useRef<{ x: number; y: number } | null>(null);
  const showWinRef = useRef(false);
  // Mirrors of menu-open state for the (stale-closure-free) keydown handler.
  const buildMenuOpenRef = useRef(false);
  const inventoryOpenRef = useRef(false);
  const helpOpenRef = useRef(false);
  const powerPanelOpenRef = useRef(false);
  const tutorialOpenRef = useRef(false);

  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showObjectives, setShowObjectives] = useState(true);
  const [showPowerPanel, setShowPowerPanel] = useState(false);
  const [buildType, setBuildType] = useState<BuildingTypeValue | null>(null);
  const [selectedBuild, setSelectedBuild] = useState<BuildingTypeValue | null>(null);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [nearbyBuildings, setNearbyBuildings] = useState<import('./types').Tile[]>([]);
  const [, setRenderTick] = useState(0);
  const [, setTickVersion] = useState(0);
  const [powerState, setPowerState] = useState<PowerSummary | null>(null);
  const [inspectedData, setInspectedData] = useState<InspectionData | null>(null);

  const [tutorialDismissed, setTutorialDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('outpost-tutorial-done') === '1'; } catch { return false; }
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({});
  const [tutorialDoneMap, setTutorialDoneMap] = useState<Record<string, boolean>>({});

  const handleDismissTutorial = useCallback(() => {
    setTutorialDismissed(true);
    setShowTutorial(false);
    try { localStorage.setItem('outpost-tutorial-done', '1'); } catch { /* ignore */ }
  }, []);

  const handleToggleTutorial = useCallback(() => {
    setShowTutorial(prev => {
      const n = !prev;
      tutorialOpenRef.current = n;
      if (n) setTutorialDismissed(false);
      return n;
    });
  }, []);

  const handleManualNext = useCallback((id: string) => {
    setManualDone(prev => ({ ...prev, [id]: true }));
  }, []);

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

  const closeInspection = useCallback(() => {
    inspectedRef.current = null;
    setInspectedData(null);
    setRenderTick(t => t + 1);
  }, []);

  // Initialize renderer and start asset loading.
  // The renderer is created immediately (with fallback colors) and asset loading
  // happens in parallel. Once assets are ready, the renderer's terrain cache is
  // updated with the sprite-based tiles.
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

    // Create asset loader and start loading in parallel.
    const loader = new AssetLoader();
    assetLoaderRef.current = loader;

    const spriteKeys = [
      'R-player-up', 'R-player-down', 'R-player-side',
      'R-grass', 'R-forest', 'R-sand', 'R-water', 'R-rock',
      'R-res-wood', 'R-res-stone', 'R-res-iron', 'R-res-copper', 'R-res-coal', 'R-res-gold',
      'R-b-storage', 'R-b-chest', 'R-b-generator', 'R-b-miner',
      'R-b-conveyor', 'R-b-smelter', 'R-b-steel', 'R-b-assembler',
      'R-belt-right', 'R-belt-up', 'R-belt-down', 'R-belt-left', 'R-belt-elbow',
    ];

    const itemSpriteKeys = [
      'R-item-coal', 'R-item-stone', 'R-item-iron', 'R-item-copper', 'R-item-gold', 'R-item-wood',
      'R-item-ingot', 'R-item-plate', 'R-item-wire', 'R-item-gear', 'R-item-circuit', 'R-item-engine',
    ];

    // Create the renderer immediately (it uses fallback colors until assets load).
    rendererRef.current = new Renderer(canvas, loader);

    // Once assets are ready, update the renderer's terrain cache with sprites and load items.
    loader.load(spriteKeys).then(() => {
      rendererRef.current!.updateTerrainCache();
      // Item sprites are 16x16 native — load them at 32px so they're clearly visible on conveyors.
      return loader.load(itemSpriteKeys, 32);
    }).catch(err => {
      console.warn('Asset loading failed (using fallback visuals):', err);
    });

    (window as unknown as { __outpost?: unknown }).__outpost = {
      get engine() { return engineRef.current; },
      get camera() { return cameraRef.current; },
    };

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Consolidated single keydown handler reading from refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      const bt = buildTypeRef.current;

      // Move always works, regardless of build state. This is the QOL core of
      // building while roaming: WASD/arrows never get hijacked by a build tool.
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          e.preventDefault(); engine.movePlayer(0, -1); setRenderTick(t => t + 1); break;
        case 's': case 'arrowdown':
          e.preventDefault(); engine.movePlayer(0, 1); setRenderTick(t => t + 1); break;
        case 'a': case 'arrowleft':
          e.preventDefault(); engine.movePlayer(-1, 0); setRenderTick(t => t + 1); break;
        case 'd': case 'arrowright':
          e.preventDefault(); engine.movePlayer(1, 0); setRenderTick(t => t + 1); break;
      }

      // R rotates: with a build tool armed it rotates the direction the (single-click)
      // building will face; otherwise, if a conveyor is inspected, it rotates that
      // conveyor REMOTELY (no need to stand on it). With nothing inspected it rotates
      // the building underfoot.
      if (e.key.toLowerCase() === 'r') {
        if (bt) {
          engine.setBuildDirection(((engine.getBuildDirection() + 1) % 4) as DirectionValue);
          setRenderTick(t => t + 1);
        } else {
          const insp = inspectedRef.current;
          const inspectedBuilding = insp ? engine.inspectBuilding(insp.x, insp.y) : null;
          if (insp && inspectedBuilding && inspectedBuilding.type === BuildingTypeMap.conveyor) {
            engine.rotateBuildingAt(insp.x, insp.y);
          } else {
            engine.rotateBuilding();
          }
          setRenderTick(t => t + 1);
        }
        return;
      }
      if (e.key.toLowerCase() === 'e' && !bt) {
        engine.interact();
        setRenderTick(t => t + 1);
      }
      if (e.key.toLowerCase() === 'q' && !bt) {
        engine.removeBuilding();
        setRenderTick(t => t + 1);
      }
      if (e.key.toLowerCase() === 't' && !bt) {
        const insp = inspectedRef.current;
        if (insp) {
          engine.takeInspectedItem(insp.x, insp.y);
          setRenderTick(t => t + 1);
        }
      }
      if (e.key.toLowerCase() === ' ') {
        e.preventDefault();
        engine.setPaused(!engine.getConfig().paused);
        return;
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
          setShowInventory(false); inventoryOpenRef.current = false;
          setShowHelp(false); helpOpenRef.current = false;
          setShowBuildMenu(prev => { const n = !prev; buildMenuOpenRef.current = n; return n; });
          break;
        case 'i':
          setShowBuildMenu(false); buildMenuOpenRef.current = false;
          setShowHelp(false); helpOpenRef.current = false;
          setShowInventory(prev => { const n = !prev; inventoryOpenRef.current = n; return n; });
          break;
        case 'h':
          setShowBuildMenu(false); buildMenuOpenRef.current = false;
          setShowInventory(false); inventoryOpenRef.current = false;
          setShowHelp(prev => { const n = !prev; helpOpenRef.current = n; return n; });
          break;
        case 'o':
          setShowObjectives(prev => !prev);
          break;
      }

      // Staged Escape: first drop the armed build tool (keep menus), then close
      // open panels. It never destroys more than one layer at a time.
      if (e.key.toLowerCase() === 'escape') {
        if (bt) {
          setBuildType(null);
          buildTypeRef.current = null;
          setSelectedBuild(null);
        } else if (inspectedRef.current) {
          closeInspection();
        } else if (tutorialOpenRef.current) {
          setShowTutorial(false);
          tutorialOpenRef.current = false;
        } else if (buildMenuOpenRef.current || inventoryOpenRef.current || helpOpenRef.current) {
          setShowBuildMenu(false); buildMenuOpenRef.current = false;
          setShowInventory(false); inventoryOpenRef.current = false;
          setShowHelp(false); helpOpenRef.current = false;
        } else if (powerPanelOpenRef.current) {
          setShowPowerPanel(false); powerPanelOpenRef.current = false;
        }
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
  }, [handleSave, handleLoad, closeInspection]);

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
        setTickVersion(v => v + 1);
        tickAccumulatorRef.current -= tickInterval;
      }

      if (engine.getWinState() && !showWinRef.current) {
        showWinRef.current = true;
        setShowWinMessage(true);
      }

      const pos = engine.getPlayerPosition();

      if (frameCount % 30 === 0) {
        const buildings = engine.getNearbyBuildings(pos.x, pos.y, 3);
        setNearbyBuildings(buildings);
      }

      if (frameCount % 6 === 0) {
        setPowerState(engine.getPowerSummary());
        const ip = inspectedRef.current;
        if (ip) {
          setInspectedData({
            building: engine.inspectBuilding(ip.x, ip.y),
            playerItems: engine.player.inventory
              .filter(i => i.amount > 0)
              .map(i => ({ type: i.type as string, amount: i.amount })),
          });
        }
      }

      const bt = buildTypeRef.current;
      const mouseW = mousePosRef.current;
      const selTile = selectedTileRef.current;

      const interactiveTile = bt ? null : engine.getInteractiveTile();
      const interactiveLabel = bt ? '' : engine.getInteractiveLabel();

      // Suppress camera auto-follow while panning OR while building a conveyor route.
      if (!isDraggingRef.current && !buildDraggingRef.current) {
        const targetX = canvas.width / 2 - pos.x * TILE_SIZE * cameraRef.current.zoom;
        const targetY = canvas.height / 2 - pos.y * TILE_SIZE * cameraRef.current.zoom;
        cameraRef.current.x += (targetX - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (targetY - cameraRef.current.y) * 0.1;
      }

      // Conveyor route being dragged: preview the whole path.
      let buildPath: { x: number; y: number }[] | undefined;
      if (buildDraggingRef.current && buildDragPathRef.current.length > 0) {
        buildPath = buildDragPathRef.current;
      }

      let previewTile: { x: number; y: number } | null = null;
      let previewColor: string | undefined;
      let buildValid: boolean | undefined;
      if (bt && !buildPath && mouseW && !buildDraggingRef.current) {
        const mouseWCam = {
          x: (mouseW.x - cameraRef.current.x) / cameraRef.current.zoom,
          y: (mouseW.y - cameraRef.current.y) / cameraRef.current.zoom,
        };
        const tx = Math.floor(mouseWCam.x / TILE_SIZE);
        const ty = Math.floor(mouseWCam.y / TILE_SIZE);
        if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
          previewTile = { x: tx, y: ty };
          previewColor = BUILDING_COLORS[bt];
          buildValid = thisTilePlaceable(engine, bt, tx, ty);
        }
      }

      const buildPathValid = buildPath && bt
        ? buildPath.every(c => thisTilePlaceable(engine, bt as BuildingTypeValue, c.x, c.y))
        : undefined;
      renderer.render(
        engine.map,
        engine.player,
        cameraRef.current,
        {
          selectedTile: selTile,
          buildPreview: previewTile,
          buildColor: previewColor,
          buildValid,
          buildPath,
          buildPathValid,
          buildDirection: bt === 'conveyor' ? engine.getBuildDirection() : undefined,
          inspectedTile: inspectedRef.current,
          interactiveTile,
          interactiveLabel,
          facing: engine.getFacing(),
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

    // While dragging a conveyor route, extend the path toward the cursor.
    if (buildDraggingRef.current && buildDragAnchorRef.current) {
      if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
        buildDragPathRef.current = buildOrthoPath(buildDragAnchorRef.current, { x: tx, y: ty });
      } else {
        buildDragPathRef.current = [buildDragAnchorRef.current];
      }
      setRenderTick(t => t + 1);
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
      const engine = engineRef.current;

      if (tx < 0 || tx >= 120 || ty < 0 || ty >= 120) return;

      // Conveyor: a plain left-drag draws an orthogonal multi-tile route.
      // On mouse down we anchor the route; on mouse up we lay it out.
      if (bt === 'conveyor') {
        buildDraggingRef.current = true;
        buildDragAnchorRef.current = { x: tx, y: ty };
        buildDragPathRef.current = [{ x: tx, y: ty }];
        setRenderTick(t => t + 1);
        return;
      }

      // Non-conveyor: single-click placement (still sticky / repeatable).
      if (thisTilePlaceable(engine, bt, tx, ty)) {
        engine.placeBuildingAt(bt, tx, ty);
        setRenderTick(t => t + 1);
      }
      return;
    }

    // Not in build mode: left click inspects the tile at the cursor.
    const worldX = (mx - cameraRef.current.x) / cameraRef.current.zoom;
    const worldY = (my - cameraRef.current.y) / cameraRef.current.zoom;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    if (tx >= 0 && tx < 120 && ty >= 0 && ty < 120) {
      selectedTileRef.current = { x: tx, y: ty };
      inspectedRef.current = { x: tx, y: ty };
      const engine = engineRef.current;
      const building = engine.inspectBuilding(tx, ty);
      setInspectedData({
        building,
        playerItems: engine.player.inventory
          .filter(i => i.amount > 0)
          .map(i => ({ type: i.type as string, amount: i.amount })),
      });
      setRenderTick(t => t + 1);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
    cameraStartRef.current = null;

    // Finish a conveyor route drag: layer the path with auto-orientation.
    if (buildDraggingRef.current) {
      const path = buildDragPathRef.current;
      buildDraggingRef.current = false;
      buildDragAnchorRef.current = null;
      buildDragPathRef.current = [];
      if (buildTypeRef.current === 'conveyor' && path.length > 0) {
        const engine = engineRef.current;
        const dirs = GameEngine.computeRouteDirections(path, engine.getBuildDirection());
        dirs.forEach((dir, i) => {
          engine.setBuildDirection(dir);
          engine.placeBuildingAt('conveyor', path[i].x, path[i].y);
        });
        setRenderTick(t => t + 1);
      }
    }
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Attach non-passive so we can preventDefault (zoom the canvas on scroll).
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleBuildSelect = (type: BuildingTypeValue) => {
    if (buildType === type) {
      setBuildType(null);
      buildTypeRef.current = null;
    } else {
      setBuildType(type);
      buildTypeRef.current = type;
      setSelectedBuild(type);
    }
  };

  const handleBuildDetailSelect = useCallback((type: BuildingTypeValue | null) => {
    setSelectedBuild(type);
  }, []);

  const handleDeposit = useCallback((type: string) => {
    const ip = inspectedRef.current;
    const engine = engineRef.current;
    if (!ip) return;
    engine.depositItemToBuilding(ip.x, ip.y, type);
    setRenderTick(t => t + 1);
    setInspectedData({
      building: engine.inspectBuilding(ip.x, ip.y),
      playerItems: engine.player.inventory
        .filter(i => i.amount > 0)
        .map(i => ({ type: i.type as string, amount: i.amount })),
    });
  }, []);

  const canDeposit = useCallback((type: string): boolean => {
    const ip = inspectedRef.current;
    if (!ip) return false;
    return engineRef.current.buildingAcceptsItem(ip.x, ip.y, type);
  }, []);

  const handleRotateInspected = useCallback(() => {
    const ip = inspectedRef.current;
    const engine = engineRef.current;
    if (!ip) return;
    engine.rotateBuildingAt(ip.x, ip.y);
    setRenderTick(t => t + 1);
    setInspectedData({
      building: engine.inspectBuilding(ip.x, ip.y),
      playerItems: engine.player.inventory
        .filter(i => i.amount > 0)
        .map(i => ({ type: i.type as string, amount: i.amount })),
    });
  }, []);

  const handleWithdraw = useCallback((type: string) => {
    const ip = inspectedRef.current;
    const engine = engineRef.current;
    if (!ip) return;
    engine.withdrawItemFromBuilding(ip.x, ip.y, type);
    setRenderTick(t => t + 1);
    setInspectedData({
      building: engine.inspectBuilding(ip.x, ip.y),
      playerItems: engine.player.inventory
        .filter(i => i.amount > 0)
        .map(i => ({ type: i.type as string, amount: i.amount })),
    });
  }, []);

  const canWithdraw = useCallback((type: string): boolean => {
    const ip = inspectedRef.current;
    if (!ip) return false;
    return engineRef.current.buildingCanWithdrawItem(ip.x, ip.y, type);
  }, []);

  const eng = engineRef.current;
  const playerInv = eng.player.inventory;
  const cMove = eng.player.x !== 60 || eng.player.y !== 60;
  const cWood = eng.player.stats.woodChopped >= 1;
  const cStone = (playerInv.find(i => i.type === 'stone')?.amount ?? 0) > 5 || eng.player.stats.stonesMined >= 2;
  const cBuild = showBuildMenu || showInventory || showHelp;
  const cPlace = eng.countBuildings() >= 1;
  const cBelt = eng.countBuildings('conveyor') >= 3;
  const powerNow = eng.getPowerSummary();
  const cPower = powerNow.fueledGenerators >= 1 && powerNow.produced > 0;
  const cInspect = !!inspectedData?.building;

  useEffect(() => {
    setTutorialDoneMap(prev => {
      const completions: [string, boolean][] = [
        ['move', cMove], ['wood', cWood], ['stone', cStone], ['build', cBuild], ['place', cPlace],
        ['belt', cBelt], ['power', cPower], ['inspect', cInspect],
      ];
      let change = false;
      const next = { ...prev };
      for (const [k, v] of completions) {
        if (v && !next[k]) { next[k] = true; change = true; }
      }
      return change ? next : prev;
    });
  }, [cMove, cWood, cStone, cBuild, cPlace, cBelt, cPower, cInspect]);

  // Effective done = fresh condition OR already sticky-completed (never regresses)
  const effectiveDone: Record<string, boolean> = { ...tutorialDoneMap };
  for (const [k, v] of [
    ['move', cMove], ['wood', cWood], ['stone', cStone], ['build', cBuild], ['place', cPlace],
    ['belt', cBelt], ['power', cPower], ['inspect', cInspect],
  ] as [string, boolean][]) {
    if (v) effectiveDone[k] = true;
  }
  const seenNext = !!manualDone['next'];

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'move', title: 'Move Around',
      body: 'Use WASD or Arrow keys to move. Scroll to zoom and Alt+Click to pan. Head toward a green forest tree to begin gathering.',
      done: effectiveDone.move,
    },
    {
      id: 'wood', title: 'Gather Wood',
      body: 'Face a tree and press E to chop it for Wood. The highlighted orange tile shows exactly what E will interact with.',
      done: effectiveDone.wood,
    },
    {
      id: 'stone', title: 'Gather Stone',
      body: 'Find gray rock, face it, and press E to mine Stone. Trees and rocks are obstacles — stand next to them, face them, and press E. Ore deposits (coal, iron, copper, gold) are mined the same way.',
      done: effectiveDone.stone,
    },
    {
      id: 'build', title: 'Open the Build Menu',
      body: 'Press B (or click Build above) to open the build menu and select a structure.',
      done: effectiveDone.build,
    },
    {
      id: 'place', title: 'Place a Building',
      body: 'Pick a building, then click a tile to place it. You can keep moving with WASD while the tool is armed — it stays selected for repeated placement until you press Esc or Cancel. A chest costs 3 Stone.',
      done: effectiveDone.place,
    },
    {
      id: 'belt', title: 'Chain Conveyors',
      body: 'Select the Conveyor, then CLICK-DRAG across the map to lay a whole belt route in one stroke — belts point and turn at corners automatically. Use R to flip the direction of a single belt. Belts that face each other get blocked and glow red. Click any building to inspect its status.',
      done: effectiveDone.belt,
    },
    {
      id: 'power', title: 'Power Your Grid',
      body: 'Place a Coal Generator and give it Coal (click it, then "Coal +1"). One global grid powers the ENTIRE outpost — no cables needed, distance doesn\'t matter. Machines and belts stop without enough power; watch the OUTPOST POWER GRID panel top-right.',
      done: effectiveDone.power,
    },
    {
      id: 'inspect', title: 'Inspect a Building',
      body: 'Click any building to open its inspector: status, power, inventory, belt connections and fuel left. A stopped machine clearly says why (e.g. "No Power — shared Outpost Grid"). Blocked belts show a red gate — clicking them explains why.',
      done: effectiveDone.inspect,
    },
    {
      id: 'next', title: 'Automate A Coal Line',
      body: 'Now build a working line: Miner on a coal deposit → Conveyors (click-drag bends 90° automatically) → Coal Generator. The global grid powers it all, so keep the surplus positive, then use Smelters and Assemblers to craft 5 engines!',
      done: seenNext, manual: true,
    },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0b0e12', position: 'relative', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
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
        onToggleBuildMenu={() => { const n = !showBuildMenu; setShowBuildMenu(n); buildMenuOpenRef.current = n; setShowInventory(false); inventoryOpenRef.current = false; setShowHelp(false); helpOpenRef.current = false; }}
        onToggleInventory={() => { const n = !showInventory; setShowInventory(n); inventoryOpenRef.current = n; setShowBuildMenu(false); buildMenuOpenRef.current = false; setShowHelp(false); helpOpenRef.current = false; }}
        onToggleHelp={() => { const n = !showHelp; setShowHelp(n); helpOpenRef.current = n; setShowBuildMenu(false); buildMenuOpenRef.current = false; setShowInventory(false); inventoryOpenRef.current = false; }}
        onToggleTutorial={() => { const n = !showTutorial; setShowTutorial(n); tutorialOpenRef.current = n; }}
        onToggleObjectives={() => setShowObjectives(!showObjectives)}
        onTogglePower={() => { const n = !showPowerPanel; setShowPowerPanel(n); powerPanelOpenRef.current = n; }}
        onSave={handleSave}
        onLoad={handleLoad}
        onNewGame={handleNewGame}
        buildType={buildType}
        buildDirection={buildType === 'conveyor' ? engineRef.current.getBuildDirection() : undefined}
        onDeselectBuild={() => { setBuildType(null); buildTypeRef.current = null; }}
        saveStatus={saveStatus}
        power={powerState ?? undefined}
        showPowerPanel={showPowerPanel}
        playerInventory={engineRef.current.player.inventory}
      />

      {showBuildMenu && (
        <BuildMenu
          onSelectBuild={handleBuildSelect}
          activeBuild={buildType}
          selectedBuild={selectedBuild}
          onDetailSelect={handleBuildDetailSelect}
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

      {showHelp && <HelpPanel onReviewTutorial={handleToggleTutorial} />}
      {showObjectives && <ObjectivesPanel stats={engineRef.current.player.stats} />}

      {inspectedData && (buildType === null) && (
        <InspectionPanel
          data={inspectedData}
          onClose={closeInspection}
          onDeposit={handleDeposit}
          canDeposit={canDeposit}
          onWithdraw={handleWithdraw}
          canWithdraw={canWithdraw}
          onRotate={handleRotateInspected}
        />
      )}

      <Tutorial
        steps={tutorialSteps}
        dismissed={tutorialDismissed}
        onDismiss={handleDismissTutorial}
        onManualNext={handleManualNext}
        show={showTutorial}
      />
    </div>
  );
};

export default App;
