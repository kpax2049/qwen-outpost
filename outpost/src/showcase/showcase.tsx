// Developer-only Visual Showcase / Asset Atlas for Outpost.
//
// This page deliberately displays every game asset and important visual state in a
// controlled, labelled layout so a visual design agent can inspect the CURRENT game
// without playing through it. It is a separate dev entry (showcase.html) and is not
// linked from, nor does it affect, normal production gameplay (main.tsx / App.tsx).
//
// The world/swatch panels use the REAL Renderer (src/rendering/Renderer.ts) so the
// atlas faithfully shows how the game actually draws terrain, resources, buildings,
// conveyors, power links, the player, etc. The UI panels reuse the real React
// components (HUD, BuildMenu, InventoryPanel, HelpPanel, ObjectivesPanel, Tutorial,
// InspectionPanel) with realistic props and real styling.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Renderer } from '../rendering/Renderer';
import type { Camera, RenderOptions } from '../rendering/Renderer';
import { GameEngine } from '../engine/GameEngine';
import { AssetLoader } from '../rendering/AssetLoader';
import {
  makeEngine,
  put,
  setTerrain,
  setResource,
  makeBuilding,
  clearBox,
  ALL_BUILDING_TYPES,
  frameBoard,
  frameTile,
  showcaseOptions,
  isolatedOptions,
  gameplayOptions,
  makeCoalChainScene,
} from './scenes';
import { Dir, BUILDING_NAMES, BUILDING_DEFS, ITEM_COLORS } from '../types';
import type { Item, PowerSummary, DirectionValue } from '../types';
import { HUD } from '../ui/HUD';
import { BuildMenu } from '../ui/BuildMenu';
import { InventoryPanel } from '../ui/InventoryPanel';
import { HelpPanel } from '../ui/HelpPanel';
import { ObjectivesPanel } from '../ui/ObjectivesPanel';
import { Tutorial } from '../ui/Tutorial';
import { InspectionPanel } from '../ui/InspectionPanel';
import type { TutorialStep } from '../ui/Tutorial';
import type { InspectionData } from '../ui/InspectionPanel';

// ====================================================================
// Reusable primitives
// ====================================================================

/** Renders a scene to a canvas using the real Renderer, once, deterministically. */
function WorldCanvas({
  buildScene,
  width,
  height,
}: {
  buildScene: () => { engine: GameEngine; camera: Camera; options?: RenderOptions };
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<AssetLoader | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load assets once per canvas mount
  useEffect(() => {
    if (loaderRef.current) return; // Already loaded for this canvas
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;

    const loader = new AssetLoader();
    loaderRef.current = loader;
    const spriteKeys = [
      'R-player-up', 'R-player-down', 'R-player-side',
      'R-grass', 'R-forest', 'R-sand', 'R-water', 'R-rock',
      'R-res-wood', 'R-res-stone', 'R-res-iron', 'R-res-copper', 'R-res-coal', 'R-res-gold',
      'R-b-storage', 'R-b-chest', 'R-b-generator', 'R-b-miner',
      'R-b-conveyor', 'R-b-smelter', 'R-b-steel', 'R-b-assembler',
      'R-belt-right', 'R-belt-up', 'R-belt-down', 'R-belt-left', 'R-belt-elbow',
      'R-item-coal', 'R-item-stone', 'R-item-iron', 'R-item-copper', 'R-item-gold', 'R-item-wood',
      'R-item-ingot', 'R-item-plate', 'R-item-wire', 'R-item-gear', 'R-item-circuit', 'R-item-engine',
    ];
    loader.load(spriteKeys).then(() => {
      rendererRef.current = new Renderer(canvas, loader);
      setLoaded(true);
    }).catch(() => {
      rendererRef.current = new Renderer(canvas, loader);
      setLoaded(true);
    });
  }, [width, height]);

  // Render scene once assets are loaded
  useEffect(() => {
    if (!loaded || !rendererRef.current) return;
    const { engine, camera, options } = buildScene();
    const resolved = options ?? showcaseOptions();
    rendererRef.current.render(engine.map, engine.player, camera, resolved);
    const canvas = ref.current;
    if (canvas) {
      canvas.dataset.showPlayer = String(resolved.showPlayer !== false);
    }
  }, [loaded, buildScene]);

  return <canvas ref={ref} style={{ display: 'block', imageRendering: 'pixelated' }} />;
}

/** A single-tile labelled swatch (terrain / resource / building / machine state). */
function Swatch({
  build,
  caption,
  width = 150,
  height = 150,
  zoom = 2.4,
  options,
}: {
  build: (e: GameEngine) => void;
  caption: string;
  width?: number;
  height?: number;
  zoom?: number;
  options?: RenderOptions;
}) {
  const scene = () => {
    const e = makeEngine();
    build(e);
    return { engine: e, camera: frameTile(60, 60, zoom, width, height), options: isolatedOptions(options) };
  };
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <WorldCanvas buildScene={scene} width={width} height={height} />
      <figcaption style={{ color: '#cfd6e6', fontSize: 11, textAlign: 'center', maxWidth: width }}>{caption}</figcaption>
    </figure>
  );
}

/** A multi-tile labelled board (conveyor runs, routes, connected scenes). */
function TileBoard({
  rows,
  cols,
  origin,
  zoom = 1,
  setup,
  caption,
  options,
}: {
  rows: number;
  cols: number;
  origin: { x: number; y: number };
  zoom?: number;
  setup: (e: GameEngine) => void;
  caption: string;
  options?: RenderOptions;
}) {
  const { camera, width, height } = frameBoard(origin, rows, cols, zoom);
  const scene = () => {
    const e = makeEngine();
    clearBox(e, origin.x, origin.y, cols, rows);
    setup(e);
    return { engine: e, camera, options: isolatedOptions(options) };
  };
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <WorldCanvas buildScene={scene} width={Math.round(width)} height={Math.round(height)} />
      <figcaption style={{ color: '#cfd6e6', fontSize: 11, textAlign: 'center' }}>{caption}</figcaption>
    </figure>
  );
}

/** A relative-positioned stage that simulates the in-game canvas + overlay UI. */
function Stage({
  scene,
  width,
  height,
  background = '#1a1a2e',
  style,
  children,
}: {
  scene: { engine: GameEngine; camera: Camera } | null;
  width: number;
  height: number;
  background?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        background,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 4,
        flexShrink: 0,
        ...(style ?? {}),
      }}
    >
      {scene && (
        <WorldCanvas buildScene={() => ({ engine: scene.engine, camera: scene.camera, options: gameplayOptions() })} width={width} height={height} />
      )}
      {children}
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '26px 0 10px', color: '#ffcc66', fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{children}</h3>;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-scenario={id} style={{ padding: '22px 26px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <h2 style={{ margin: '0 0 18px', color: '#fff', fontSize: 20, fontWeight: 800 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </section>
  );
}

function SwatchRow({ items }: { items: { caption: string; build: (e: GameEngine) => void; zoom?: number; width?: number; height?: number; options?: RenderOptions }[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
      {items.map((it, i) => (
        <Swatch key={i} build={it.build} caption={it.caption} zoom={it.zoom} width={it.width} height={it.height} options={it.options} />
      ))}
    </div>
  );
}

// ====================================================================
// Gameplay base used by the world-stage scenarios
// ====================================================================

function buildGameplayBase() {
  const e = makeEngine(4242, 20);
  // Player center
  e.player.x = 55;
  e.player.y = 56;

  // Miner on a coal deposit -> belts -> storage (a small automated chain)
  setResource(e, 54, 54, 'coal', 150);
  put(e, 54, 54, makeBuilding('miner', { active: true, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 9, inventory: [{ type: 'coal', amount: 2 }] }));
  put(e, 54, 55, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 4, inventory: [{ type: 'coal', amount: 1 }] }));
  put(e, 54, 56, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8, inventory: [{ type: 'coal', amount: 1 }] }));
  put(e, 54, 57, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 1, inventory: [{ type: 'coal', amount: 1 }] }));
  put(e, 54, 58, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'coal', amount: 7 }, { type: 'stone', amount: 12 }] }));

  // Two fueled generators (power the whole base; links drawn to consumers)
  put(e, 57, 53, makeBuilding('generator', { active: true, powerProduced: 50, maxProgress: 50, progress: 20, inventory: [{ type: 'coal', amount: 4 }], fuelBurned: 5 }));
  put(e, 60, 53, makeBuilding('generator', { active: true, powerProduced: 50, maxProgress: 50, progress: 34, inventory: [{ type: 'coal', amount: 6 }], fuelBurned: 2 }));

  // Production machines, each mid-progress (working)
  put(e, 59, 56, makeBuilding('smelter', { active: true, powerConsumed: 10, maxProgress: 60, progress: 27, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] }));
  put(e, 61, 56, makeBuilding('steel_smelter', { active: true, powerConsumed: 20, maxProgress: 90, progress: 41, inventory: [{ type: 'iron', amount: 3 }, { type: 'coal', amount: 3 }] }));
  put(e, 63, 56, makeBuilding('assembler', { active: true, powerConsumed: 15, maxProgress: 80, progress: 36, inventory: [{ type: 'iron_ingot', amount: 3 }, { type: 'copper_wire', amount: 3 }] }));

  // Passive storage + chest
  put(e, 64, 58, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'iron_ingot', amount: 11 }, { type: 'gear', amount: 4 }] }));
  put(e, 66, 58, makeBuilding('chest', { active: true, maxInventory: 20, inventory: [{ type: 'copper', amount: 8 }] }));

  // A second belt run to give the scene more conveyor variety
  put(e, 57, 58, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 5, inventory: [{ type: 'iron_ingot', amount: 1 }] }));
  put(e, 58, 58, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 10, inventory: [{ type: 'iron_ingot', amount: 1 }] }));

  const origin = { x: 50, y: 50 };
  const { camera, width, height } = frameBoard(origin, 12, 18, 0.95, 20);
  return { engine: e, camera, width: Math.round(width), height: Math.round(height) };
}

// ====================================================================
// Showcase component
// ====================================================================

// Fixed canvas size used by the construction-mode demonstration stages.
const CONSTRUCTION_W = 1180;
const CONSTRUCTION_H = 430;

const ITEM_CHIPS: { key: string; color: string; name: string }[] = [
  { key: 'wood', color: ITEM_COLORS.wood, name: 'Wood' },
  { key: 'stone', color: ITEM_COLORS.stone, name: 'Stone' },
  { key: 'iron', color: ITEM_COLORS.iron, name: 'Iron Ore' },
  { key: 'copper', color: ITEM_COLORS.copper, name: 'Copper Ore' },
  { key: 'coal', color: ITEM_COLORS.coal, name: 'Coal' },
  { key: 'gold', color: ITEM_COLORS.gold, name: 'Gold Ore' },
  { key: 'iron_ingot', color: ITEM_COLORS.iron_ingot, name: 'Iron Ingot' },
  { key: 'copper_wire', color: ITEM_COLORS.copper_wire, name: 'Copper Wire' },
  { key: 'steel_plate', color: ITEM_COLORS.steel_plate, name: 'Steel Plate' },
  { key: 'circuit', color: ITEM_COLORS.circuit, name: 'Circuit Board' },
  { key: 'gear', color: ITEM_COLORS.gear, name: 'Gear' },
  { key: 'engine', color: ITEM_COLORS.engine, name: 'Engine' },
];

// Machine-state swatches (one per representative state)
const MACHINE_STATES: { caption: string; build: (e: GameEngine) => void }[] = [
  {
    caption: `Generator — Working (fueled)`,
    build: (e) => put(e, 60, 60, makeBuilding('generator', { active: true, powerProduced: 50, direction: Dir.Down, maxProgress: 50, progress: 18, inventory: [{ type: 'coal', amount: 3 }], fuelBurned: 4 })),
  },
  {
    caption: `Generator — No Fuel`,
    build: (e) => put(e, 60, 60, makeBuilding('generator', { active: false, powerProduced: 50, direction: Dir.Down, maxProgress: 50, progress: 0, inventory: [] })),
  },
  {
    caption: `Miner — Mining (on coal)`,
    build: (e) => {
      setResource(e, 60, 60, 'coal', 130);
      put(e, 60, 60, makeBuilding('miner', { active: true, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 13, inventory: [{ type: 'coal', amount: 2 }] }));
    },
  },
  {
    caption: `Miner — No Power`,
    build: (e) => {
      setResource(e, 60, 60, 'coal', 90);
      put(e, 60, 60, makeBuilding('miner', { active: false, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 0, inventory: [] }));
    },
  },
  {
    caption: `Miner — Output Blocked (inventory full)`,
    build: (e) => {
      setResource(e, 60, 60, 'iron', 120);
      put(e, 60, 60, makeBuilding('miner', { active: true, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 0, maxInventory: 10, inventory: [{ type: 'iron', amount: 10 }] }));
    },
  },
  {
    caption: `Smelter — Smelting (progress)`,
    build: (e) => put(e, 60, 60, makeBuilding('smelter', { active: true, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 27, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] })),
  },
  {
    caption: `Smelter — Waiting for Input`,
    build: (e) => put(e, 60, 60, makeBuilding('smelter', { active: true, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 0, inventory: [{ type: 'iron', amount: 2 }] })),
  },
  {
    caption: `Smelter — No Power`,
    build: (e) => put(e, 60, 60, makeBuilding('smelter', { active: false, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 0, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] })),
  },
  {
    caption: `Smelter — Output Blocked (full)`,
    build: (e) => put(e, 60, 60, makeBuilding('smelter', { active: true, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 0, maxInventory: 20, inventory: [{ type: 'iron_ingot', amount: 20 }] })),
  },
  {
    caption: `Steel Furnace — Smelting`,
    build: (e) => put(e, 60, 60, makeBuilding('steel_smelter', { active: true, powerConsumed: 20, direction: Dir.Down, maxProgress: 90, progress: 52, inventory: [{ type: 'iron', amount: 3 }, { type: 'coal', amount: 3 }] })),
  },
  {
    caption: `Steel Furnace — Waiting for Input`,
    build: (e) => put(e, 60, 60, makeBuilding('steel_smelter', { active: true, powerConsumed: 20, direction: Dir.Down, maxProgress: 90, progress: 0, inventory: [{ type: 'coal', amount: 2 }] })),
  },
  {
    caption: `Assembler — Crafting (progress)`,
    build: (e) => put(e, 60, 60, makeBuilding('assembler', { active: true, powerConsumed: 15, direction: Dir.Down, maxProgress: 80, progress: 44, inventory: [{ type: 'copper', amount: 6 }] })),
  },
  {
    caption: `Assembler — Waiting for Input`,
    build: (e) => put(e, 60, 60, makeBuilding('assembler', { active: true, powerConsumed: 15, direction: Dir.Down, maxProgress: 80, progress: 0, inventory: [{ type: 'coal', amount: 1 }] })),
  },
  {
    caption: `Assembler — No Power`,
    build: (e) => put(e, 60, 60, makeBuilding('assembler', { active: false, powerConsumed: 15, direction: Dir.Down, maxProgress: 80, progress: 0, inventory: [{ type: 'copper', amount: 4 }] })),
  },
  {
    caption: `Conveyor — Transporting (item moving)`,
    build: (e) => put(e, 60, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 6, inventory: [{ type: 'iron_ingot', amount: 1 }] })),
  },
  {
    caption: `Conveyor — Idle (waiting for item)`,
    build: (e) => put(e, 60, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 0, inventory: [] })),
  },
  {
    caption: `Conveyor — Blocked (jam / red gate)`,
    build: (e) => put(e, 60, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 12, inventory: [{ type: 'stone', amount: 1 }], blocked: true })),
  },
  {
    caption: `Conveyor — No Power`,
    build: (e) => put(e, 60, 60, makeBuilding('conveyor', { active: false, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 0, inventory: [{ type: 'stone', amount: 1 }] })),
  },
  {
    caption: `Storage — Filled (count bubble)`,
    build: (e) => put(e, 60, 60, makeBuilding('storage', { active: true, direction: Dir.Down, maxInventory: 100, inventory: [{ type: 'iron_ingot', amount: 12 }, { type: 'gear', amount: 3 }] })),
  },
  {
    caption: `Chest — Passive storage`,
    build: (e) => put(e, 60, 60, makeBuilding('chest', { active: true, direction: Dir.Down, maxInventory: 20, inventory: [{ type: 'coal', amount: 6 }] })),
  },
];

// Conveyor route demonstrations
function ConveyorLegendRow() {
  const dirs: { d: DirectionValue; label: string }[] = [
    { d: Dir.Up, label: 'Direction: Up ▲' },
    { d: Dir.Right, label: 'Direction: Right ▶' },
    { d: Dir.Down, label: 'Direction: Down ▼' },
    { d: Dir.Left, label: 'Direction: Left ◀' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
      {dirs.map(({ d, label }, i) => {
        const x = 56 + i;
        const scene = () => {
          const e = makeEngine();
          put(e, x, 60, makeBuilding('conveyor', { active: true, powerConsumed: 1, direction: d, maxProgress: 12, progress: 6, inventory: [{ type: 'stone', amount: 1 }] }));
          return { engine: e, camera: frameTile(x, 60, 2.4, 150, 150), options: isolatedOptions() };
        };
        return (
          <figure key={i} style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <WorldCanvas buildScene={scene} width={150} height={150} />
            <figcaption style={{ color: '#cfd6e6', fontSize: 11 }}>{label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function Showcase() {
  const gameplay = useMemo(() => buildGameplayBase(), []);
  const coalChain = useMemo(() => {
    const s = makeCoalChainScene();
    // Run a few ticks so the belt animation progresses.
    for (let i = 0; i < 12; i++) s.engine.tick();
    return s;
  }, []);

  // Tutorial steps mirroring the real game (some completed, some pending).
  const tutorialSteps: TutorialStep[] = [
    { id: 'move', title: 'Move Around', body: 'Use WASD or Arrow keys to move. Scroll to zoom and Alt+Click to pan.', done: true },
    { id: 'wood', title: 'Gather Wood', body: 'Face a tree and press E to chop it for Wood.', done: true },
    { id: 'stone', title: 'Gather Stone', body: 'Face a rock and press E to mine Stone.', done: false },
    { id: 'build', title: 'Open the Build Menu', body: 'Press B (or click Build above) to open the build menu and select a structure.', done: false },
    { id: 'place', title: 'Place a Building', body: 'Pick a building, then click a tile to place it.', done: false },
    { id: 'belt', title: 'Chain Conveyors', body: 'Select the Conveyor, then CLICK-DRAG across the map to lay a route.', done: false },
    { id: 'power', title: 'Power Your Grid', body: 'Place a Coal Generator and give it Coal. One global grid powers the whole outpost.', done: false },
    { id: 'inspect', title: 'Inspect a Building', body: 'Click any building to open its inspector.', done: false },
    { id: 'next', title: 'Automate A Coal Line', body: 'Build a working line: Miner → Conveyors → Coal Generator.', done: false, manual: true },
  ];

  // Player inventory used by panels/HUD (realistic starter-ish plus gathered items)
  const playerItems: Item[] = [
    { type: 'wood', amount: 8 },
    { type: 'stone', amount: 6 },
    { type: 'coal', amount: 4 },
    { type: 'iron', amount: 2 },
    { type: 'copper', amount: 3 },
    { type: 'gold', amount: 1 },
  ];

  // Inspection data for the real InspectionPanel (inspects the smelter in the base)
  const inspection = useMemo<InspectionData | null>(() => {
    const engine = gameplay.engine;
    return {
      building: engine.inspectBuilding(59, 56),
      playerItems: playerItems.filter((i) => i.amount > 0).map((i) => ({ type: i.type as string, amount: i.amount })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameplay]);

  const power: PowerSummary | undefined = useMemo(() => gameplay.engine.getPowerSummary(), [gameplay]);

  const buildMenuScene = () => {
    const e = makeEngine(4242, 20);
    e.player.x = 55;
    e.player.y = 56;
    put(e, 56, 55, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'stone', amount: 9 }] }));
    // Preview the placement of a new Miner on an empty grass tile (valid, green)
    return {
      engine: e,
      camera: frameTile(56, 56, 1.6, CONSTRUCTION_W, CONSTRUCTION_H),
      options: gameplayOptions({ buildPreview: { x: 56, y: 56 }, buildColor: BUILDING_DEFS['miner'].color, buildValid: true, buildDirection: Dir.Down }),
    };
  };

  const miningPreviewScene = () => {
    const e = makeEngine(4242, 20);
    e.player.x = 56;
    e.player.y = 56;
    put(e, 56, 56, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'stone', amount: 9 }] }));
    return {
      engine: e,
      camera: frameTile(56, 56, 1.6, CONSTRUCTION_W, CONSTRUCTION_H),
      options: gameplayOptions({
        buildPreview: { x: 56, y: 56 },
        buildColor: BUILDING_DEFS['miner'].color,
        buildValid: false,
        buildDirection: Dir.Down,
      }),
    };
  };

  const powerLinkScene = () => {
    // Generator + consumers within radius 6 so the Renderer draws power links.
    const e = makeEngine(777, 16);
    put(e, 54, 54, makeBuilding('generator', { active: true, powerProduced: 50, maxProgress: 50, progress: 30, inventory: [{ type: 'coal', amount: 5 }], fuelBurned: 3 }));
    put(e, 57, 54, makeBuilding('smelter', { active: true, powerConsumed: 10, maxProgress: 60, progress: 30, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] }));
    put(e, 54, 57, makeBuilding('miner', { active: true, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 8, inventory: [{ type: 'coal', amount: 1 }] }));
    setResource(e, 54, 57, 'coal', 120);
    put(e, 56, 56, makeBuilding('assembler', { active: true, powerConsumed: 15, maxProgress: 80, progress: 22, inventory: [{ type: 'copper', amount: 4 }] }));
    const origin = { x: 52, y: 52 };
    const { camera, width, height } = frameBoard(origin, 6, 6, 1.4, 24);
    return { engine: e, camera, width: Math.round(width), height: Math.round(height), options: gameplayOptions() };
  };

  const terrainBoard = () => {
    const e = makeEngine(111, 16);
    e.player.x = 60;
    e.player.y = 60;
    // Plant varied terrain tiles in a row for a single world view.
    const t = [
      { x: 56, y: 58, terrain: 'grass' as const },
      { x: 57, y: 58, terrain: 'forest' as const },
      { x: 58, y: 58, terrain: 'sand' as const },
      { x: 59, y: 58, terrain: 'water' as const },
      { x: 60, y: 58, terrain: 'rock' as const },
      { x: 61, y: 58, terrain: 'grass' as const },
    ];
    for (const { x, y, terrain } of t) setTerrain(e, x, y, terrain);
    const origin = { x: 54, y: 55 };
    const { camera, width, height } = frameBoard(origin, 4, 9, 1.6, 20);
    return { engine: e, camera, width: Math.round(width), height: Math.round(height), options: isolatedOptions() };
  };

  const resourceBoard = () => {
    const e = makeEngine(222, 16);
    const deposits: { x: number; y: number; type: 'wood' | 'stone' | 'iron' | 'copper' | 'coal' | 'gold'; amount: number }[] = [
      { x: 56, y: 58, type: 'wood', amount: 90 },
      { x: 57, y: 59, type: 'stone', amount: 80 },
      { x: 58, y: 58, type: 'iron', amount: 110 },
      { x: 59, y: 59, type: 'copper', amount: 95 },
      { x: 60, y: 58, type: 'coal', amount: 120 },
      { x: 61, y: 59, type: 'gold', amount: 60 },
    ];
    for (const d of deposits) setResource(e, d.x, d.y, d.type, d.amount);
    const origin = { x: 53, y: 55 };
    const { camera, width, height } = frameBoard(origin, 6, 10, 1.5, 20);
    return { engine: e, camera, width: Math.round(width), height: Math.round(height), options: isolatedOptions() };
  };


  return (
    <div style={{ background: '#0f1020', color: '#e6e9f2', fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', minHeight: '100vh' }}>
      <div
        data-banner
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,11,25,0.97)',
          borderBottom: '1px solid rgba(255,170,0,0.35)',
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: '#ffaa00', fontWeight: 800, letterSpacing: 1 }}>OUTPOST · DEV VISUAL SHOWCASE</span>
        <span style={{ color: '#8892a8', fontSize: 11 }}>
          This is a developer-only asset atlas — not part of normal gameplay. Use the buttons to isolate a view (also used by the screenshot script).
        </span>
        {[
          ['atlas', 'Atlas'],
          ['terrain', 'Terrain'],
          ['resources', 'Resources'],
          ['machines', 'Machine States'],
          ['conveyors', 'Conveyors'],
          ['gameplay', 'Gameplay'],
          ['construction', 'Construction'],
          ['hud', 'HUD / Build UI'],
          ['inspection', 'Inspection / Power'],
          ['help', 'Tutorial / Objectives / Help'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => (window as unknown as { __showcase?: { show: (key: string) => void } }).__showcase?.show(k)}
            style={{ background: 'rgba(68,136,255,0.18)', color: '#88ccff', border: '1px solid rgba(68,136,255,0.5)', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => (window as unknown as { __showcase?: { showAll: () => void } }).__showcase?.showAll()}
          style={{ background: 'rgba(120,120,160,0.2)', color: '#ccc', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
        >
          Show All
        </button>
      </div>

      {/* 01 — Visual Atlas */}
      <Section id="atlas" title="01 · Visual Atlas — every asset side by side">
        <GroupTitle>Terrain</GroupTitle>
        <SwatchRow
          items={[
            { caption: 'Grass', build: (e) => setTerrain(e, 60, 60, 'grass') },
            { caption: 'Forest (tree)', build: (e) => setTerrain(e, 60, 60, 'forest') },
            { caption: 'Sand', build: (e) => setTerrain(e, 60, 60, 'sand') },
            { caption: 'Water', build: (e) => setTerrain(e, 60, 60, 'water') },
            { caption: 'Rock', build: (e) => setTerrain(e, 60, 60, 'rock') },
          ]}
        />
        <GroupTitle>Resources (deposits)</GroupTitle>
        <SwatchRow
          items={[
            { caption: 'Wood', build: (e) => setResource(e, 60, 60, 'wood', 90) },
            { caption: 'Stone', build: (e) => setResource(e, 60, 60, 'stone', 80) },
            { caption: 'Iron Ore', build: (e) => setResource(e, 60, 60, 'iron', 110) },
            { caption: 'Copper Ore', build: (e) => setResource(e, 60, 60, 'copper', 95) },
            { caption: 'Coal', build: (e) => setResource(e, 60, 60, 'coal', 120) },
            { caption: 'Gold Ore', build: (e) => setResource(e, 60, 60, 'gold', 60) },
          ]}
        />
        <GroupTitle>Buildings (idle-but-energized color swatches)</GroupTitle>
        <SwatchRow
          items={ALL_BUILDING_TYPES.map((type) => ({
            caption: BUILDING_NAMES[type],
            build: (e) => put(e, 60, 60, makeBuilding(type, { active: true, direction: Dir.Down })),
          }))}
        />
        <GroupTitle>Inventory / item colors (UI chips)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ITEM_CHIPS.map((it) => (
            <span
              key={it.key}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '5px 9px', fontSize: 11, color: '#ddd' }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 2, background: it.color, boxShadow: `0 0 4px ${it.color}55` }} />
              {it.name}
            </span>
          ))}
        </div>
        <GroupTitle>Player (only shown here + in gameplay scenes)</GroupTitle>
        <div data-player-example>
          <SwatchRow
            items={[
              {
                caption: 'Player — default skin, facing down',
                options: { showPlayer: true },
                build: (e) => {
                  // The player sprite is placed at the board centre by makeEngine.
                  void e;
                },
              },
            ]}
          />
        </div>
      </Section>

      {/* 02 — World and Terrain */}
      <Section id="terrain" title="02 · World &amp; Terrain">
        <GroupTitle>Terrain tiles (single swatch each)</GroupTitle>
        <SwatchRow
          items={[
            { caption: 'Grass — base walkable terrain', build: (e) => setTerrain(e, 60, 60, 'grass') },
            { caption: 'Forest — non-walkable, chop for Wood (E)', build: (e) => setTerrain(e, 60, 60, 'forest') },
            { caption: 'Sand — beach ring around water', build: (e) => setTerrain(e, 60, 60, 'sand') },
            { caption: 'Water — non-walkable, animated waves', build: (e) => setTerrain(e, 60, 60, 'water') },
            { caption: 'Rock — non-walkable, mine for Stone (E)', build: (e) => setTerrain(e, 60, 60, 'rock') },
          ]}
        />
        <GroupTitle>Natural terrain mix (world view)</GroupTitle>
        <WorldCanvas buildScene={terrainBoard} width={terrainBoard().width} height={terrainBoard().height} />
        <div style={{ color: '#7f8aa6', fontSize: 11 }}>The engine's seeded map lays out terrain in natural clusters; this row shows each tile type adjacent for comparison. Water animates with a wave overlay; forest/rock render obstacles.</div>
      </Section>

      {/* 03 — Resources */}
      <Section id="resources" title="03 · Resources">
        <GroupTitle>Deposit renderings (sized/glowing by amount)</GroupTitle>
        <SwatchRow
          items={[
            { caption: 'Wood deposit (tree + log)', build: (e) => setResource(e, 60, 60, 'wood', 90) },
            { caption: 'Stone deposit (circle)', build: (e) => setResource(e, 60, 60, 'stone', 80) },
            { caption: 'Iron Ore (diamond)', build: (e) => setResource(e, 60, 60, 'iron', 110) },
            { caption: 'Copper Ore (diamond)', build: (e) => setResource(e, 60, 60, 'copper', 95) },
            { caption: 'Coal (circle)', build: (e) => setResource(e, 60, 60, 'coal', 120) },
            { caption: 'Gold Ore (5-point star)', build: (e) => setResource(e, 60, 60, 'gold', 60) },
          ]}
        />
        <GroupTitle>Deposit row (world view)</GroupTitle>
        <WorldCanvas buildScene={resourceBoard} width={resourceBoard().width} height={resourceBoard().height} />
        <GroupTitle>Processed items + inventory colors</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ITEM_CHIPS.map((it) => (
            <span
              key={it.key}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '5px 9px', fontSize: 11, color: '#ddd' }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 2, background: it.color, boxShadow: `0 0 4px ${it.color}55` }} />
              {it.name}
            </span>
          ))}
        </div>
      </Section>

      {/* 04 — Buildings & Machine States */}
      <Section id="machines" title="04 · Buildings &amp; Machine States">
        <GroupTitle>All building types (colour + shape legend)</GroupTitle>
        <SwatchRow
          items={ALL_BUILDING_TYPES.map((type) => ({
            caption: `${BUILDING_NAMES[type]} (${BUILDING_DEFS[type].shape})`,
            build: (e) => put(e, 60, 60, makeBuilding(type, { active: true, direction: Dir.Down })),
          }))}
        />
        <GroupTitle>Representative machine states (working / idle / no-power / no-fuel / waiting / blocked / progress)</GroupTitle>
        <SwatchRow items={MACHINE_STATES.map((s) => ({ caption: s.caption, build: s.build, zoom: 2.1 }))} />
        <GroupTitle>Side-by-side: powered vs no-power (state difference)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 59, y: 59 }}
            zoom={2.0}
            caption="Powered Miner (working — amber glow + progress bar)"
            setup={(e) => {
              setResource(e, 59, 59, 'coal', 100);
              put(e, 59, 59, makeBuilding('miner', { active: true, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 15, inventory: [{ type: 'coal', amount: 3 }] }));
            }}
          />
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 62, y: 59 }}
            zoom={2.0}
            caption="Unpowered Miner (blue-gray wash — no output)"
            setup={(e) => {
              setResource(e, 62, 59, 'coal', 100);
              put(e, 62, 59, makeBuilding('miner', { active: false, powerConsumed: 5, direction: Dir.Down, maxProgress: 30, progress: 0, inventory: [] }));
            }}
          />
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 59, y: 62 }}
            zoom={2.0}
            caption="Powered Smelter (smelting — amber glow + progress)"
            setup={(e) => {
              put(e, 59, 62, makeBuilding('smelter', { active: true, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 30, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] }));
            }}
          />
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 62, y: 62 }}
            zoom={2.0}
            caption="Unpowered Smelter (blue-gray — stopped)"
            setup={(e) => {
              put(e, 62, 62, makeBuilding('smelter', { active: false, powerConsumed: 10, direction: Dir.Down, maxProgress: 60, progress: 0, inventory: [{ type: 'iron', amount: 2 }, { type: 'coal', amount: 3 }] }));
            }}
          />
        </div>
      </Section>

      {/* 05 — Conveyors & Routing */}
      <Section id="conveyors" title="05 · Conveyors &amp; Routing">
        <GroupTitle>All four cardinal directions</GroupTitle>
        <ConveyorLegendRow />
        <GroupTitle>Straight runs (horizontal &amp; vertical, connected)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={1}
            cols={5}
            origin={{ x: 40, y: 60 }}
            caption="Horizontal straight run → (5 belts, items flowing right)"
            setup={(e) => {
              for (let i = 0; i < 5; i++) {
                put(e, 40 + i, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: i === 0 ? 6 : 2, inventory: i === 0 ? [{ type: 'coal', amount: 1 }] : [] }));
              }
            }}
          />
          <TileBoard
            rows={4}
            cols={1}
            origin={{ x: 60, y: 40 }}
            caption="Vertical straight run ↓ (4 belts)"
            setup={(e) => {
              for (let i = 0; i < 4; i++) {
                put(e, 60, 40 + i, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: i === 1 ? 7 : 1, inventory: i === 1 ? [{ type: 'iron_ingot', amount: 1 }] : [] }));
              }
            }}
          />
        </div>

        <GroupTitle>90° turns (elbows — curved belt path with connecting band)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 44, y: 60 }}
            caption="Right → Down corner"
            setup={(e) => {
              put(e, 44, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3, inventory: [{ type: 'stone', amount: 1 }] }));
              put(e, 45, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 }));
            }}
          />
          <TileBoard
            rows={2}
            cols={1}
            origin={{ x: 48, y: 52 }}
            caption="Down → Right corner"
            setup={(e) => {
              put(e, 48, 52, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 }));
              put(e, 48, 53, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3, inventory: [{ type: 'copper_wire', amount: 1 }] }));
            }}
          />
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 52, y: 62 }}
            caption="Right → Up corner"
            setup={(e) => {
              put(e, 52, 62, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3 }));
              put(e, 53, 62, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Up, maxProgress: 12, progress: 8, inventory: [{ type: 'gear', amount: 1 }] }));
            }}
          />
        </div>

        <GroupTitle>Connected route (zigzag: vertical run → horizontal run)</GroupTitle>
        <TileBoard
          rows={5}
          cols={5}
          origin={{ x: 42, y: 46 }}
          caption="Connected L/zigzag route — belts chain together, corners auto-orient"
          setup={(e) => {
            for (let i = 0; i < 4; i++) put(e, 44, 46 + i, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: (i * 3) % 10 }));
            for (let i = 0; i < 4; i++) put(e, 44 + i, 49, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: (i + 1) * 2 }));
          }}
        />

        <GroupTitle>Moving items, blocked / head-on conflicts, and placement preview</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 56, y: 52 }}
            zoom={2.2}
            caption="Moving item mid-belt (iron ingot travelling)"
            setup={(e) => put(e, 56, 52, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 6, inventory: [{ type: 'iron_ingot', amount: 1 }] }))}
          />
          <TileBoard
            rows={1}
            cols={2}
            origin={{ x: 58, y: 52 }}
            zoom={1.8}
            caption="Head-on conflict — belts face each other → both block (red gate)"
            setup={(e) => {
              put(e, 58, 52, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 12, inventory: [{ type: 'stone', amount: 1 }], blocked: true }));
              put(e, 59, 52, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Left, maxProgress: 12, progress: 12, inventory: [{ type: 'coal', amount: 1 }], blocked: true }));
            }}
          />
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 62, y: 52 }}
            zoom={2.2}
            caption="Blocked open-end belt (jam at belt end — red gate)"
            setup={(e) => put(e, 62, 52, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 12, inventory: [{ type: 'stone', amount: 1 }], blocked: true }))}
          />
        </div>

        <GroupTitle>All 8 directed elbows (output direction × entry direction)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {/* Up elbows */}
          <TileBoard rows={2} cols={1} origin={{ x: 42, y: 40 }} zoom={2.0} caption="Right→Up elbow" setup={(e) => { put(e, 42, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Up, maxProgress: 12, progress: 8 })); put(e, 42, 40, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3, inventory: [{ type: 'stone', amount: 1 }] })); }} />
          <TileBoard rows={2} cols={1} origin={{ x: 44, y: 40 }} zoom={2.0} caption="Left→Up elbow" setup={(e) => { put(e, 44, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Up, maxProgress: 12, progress: 8 })); put(e, 45, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Left, maxProgress: 12, progress: 3 })); }} />
          {/* Right elbows */}
          <TileBoard rows={1} cols={2} origin={{ x: 46, y: 40 }} zoom={2.0} caption="Up→Right elbow" setup={(e) => { put(e, 46, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3 })); put(e, 47, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 })); }} />
          <TileBoard rows={1} cols={2} origin={{ x: 48, y: 42 }} zoom={2.0} caption="Down→Right elbow" setup={(e) => { put(e, 48, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3, inventory: [{ type: 'iron_ingot', amount: 1 }] })); put(e, 48, 42, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 })); }} />
          {/* Down elbows */}
          <TileBoard rows={2} cols={1} origin={{ x: 50, y: 40 }} zoom={2.0} caption="Left→Down elbow" setup={(e) => { put(e, 50, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 })); put(e, 49, 40, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Left, maxProgress: 12, progress: 3 })); }} />
          <TileBoard rows={2} cols={1} origin={{ x: 52, y: 40 }} zoom={2.0} caption="Right→Down elbow" setup={(e) => { put(e, 52, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 })); put(e, 53, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 3 })); }} />
          {/* Left elbows */}
          <TileBoard rows={1} cols={2} origin={{ x: 54, y: 40 }} zoom={2.0} caption="Down→Left elbow" setup={(e) => { put(e, 54, 40, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Left, maxProgress: 12, progress: 3 })); put(e, 54, 41, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Up, maxProgress: 12, progress: 8 })); }} />
          <TileBoard rows={1} cols={2} origin={{ x: 56, y: 40 }} zoom={2.0} caption="Up→Left elbow" setup={(e) => { put(e, 56, 40, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Left, maxProgress: 12, progress: 3 })); put(e, 56, 39, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 8 })); }} />
        </div>

        <GroupTitle>Placement preview (valid green / invalid red)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={3}
            cols={3}
            origin={{ x: 64, y: 54 }}
            zoom={1.6}
            caption="Valid placement preview (green outline highlight)"
            setup={(e) => {
              put(e, 65, 55, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'stone', amount: 9 }] }));
            }}
            options={{
              buildPreview: { x: 66, y: 55 },
              buildColor: BUILDING_DEFS['storage'].color,
              buildValid: true,
              buildDirection: Dir.Down,
            }}
          />
          <TileBoard
            rows={3}
            cols={3}
            origin={{ x: 68, y: 54 }}
            zoom={1.6}
            caption="Invalid placement preview (red — tile occupied / bad terrain)"
            setup={(e) => {
              put(e, 69, 55, makeBuilding('storage', { active: true, maxInventory: 100, inventory: [{ type: 'stone', amount: 9 }] }));
            }}
            options={{
              buildPreview: { x: 69, y: 55 },
              buildColor: BUILDING_DEFS['storage'].color,
              buildValid: false,
              buildDirection: Dir.Down,
            }}
          />
        </div>

        <GroupTitle>Belt item sprites (multiple item types visible on conveyors)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 56, y: 60 }}
            zoom={2.5}
            caption="Coal on belt (R-item-coal sprite, 16×16 → 32px)"
            setup={(e) => put(e, 56, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 6, inventory: [{ type: 'coal', amount: 1 }] }))}
          />
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 60, y: 60 }}
            zoom={2.5}
            caption="Iron Ingot on belt (R-item-ingot sprite, 16×16 → 32px)"
            setup={(e) => put(e, 60, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 6, inventory: [{ type: 'iron_ingot', amount: 1 }] }))}
          />
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 64, y: 60 }}
            zoom={2.5}
            caption="Copper Wire on belt (R-item-wire sprite, 16×16 → 32px)"
            setup={(e) => put(e, 64, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 6, inventory: [{ type: 'copper_wire', amount: 1 }] }))}
          />
          <TileBoard
            rows={1}
            cols={1}
            origin={{ x: 68, y: 60 }}
            zoom={2.5}
            caption="Circuit Board on belt (R-item-circuit sprite, 16×16 → 32px)"
            setup={(e) => put(e, 68, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Right, maxProgress: 12, progress: 6, inventory: [{ type: 'circuit', amount: 1 }] }))}
          />
        </div>
      </Section>

      {/* 05b — Coal-chain Bootstrap (miner → belts → generator) */}
      <Section id="coal-chain" title="05b · Coal-chain Bootstrap (miner → passive belts → generator)">
        <Stage scene={{ engine: coalChain.engine, camera: coalChain.camera }} width={coalChain.width} height={coalChain.height}>
          <></>
        </Stage>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          A coal chain: Miner (seeded with coal) → 3 passive conveyors (powerConsumed: 0) → Generator.
          The chain runs with zero grid power — belts are always active. After enough ticks, mined coal travels the belt chain and fuels the generator, which then powers downstream machines.
          This is the bootstrap workflow for a zero-power grid.
        </div>
      </Section>

      {/* 06 — Normal Gameplay */}
      <Section id="gameplay" title="06 · Normal Gameplay (populated outpost)">
        <Stage scene={{ engine: gameplay.engine, camera: gameplay.camera }} width={gameplay.width} height={gameplay.height}>
          <HUD
            tickRate={10}
            paused={false}
            onTogglePause={() => {}}
            onIncreaseSpeed={() => {}}
            onDecreaseSpeed={() => {}}
            onResetSpeed={() => {}}
            onToggleBuildMenu={() => {}}
            onToggleInventory={() => {}}
            onToggleHelp={() => {}}
            onToggleObjectives={() => {}}
            onTogglePower={() => {}}
            onSave={() => {}}
            onLoad={() => {}}
            onNewGame={() => {}}
            buildType={null}
            onDeselectBuild={() => {}}
            saveStatus={null}
            power={power}
            showPowerPanel={false}
            playerInventory={playerItems}
          />
          <ObjectivesPanel stats={{ stonesMined: 12, woodChopped: 0, ingotsCrafted: 0, enginesCrafted: 1, ironIngotsCrafted: 0, copperWiresCrafted: 0, minersBuilt: 0, generatorsBuilt: 0, smeltersBuilt: 0, assemblersBuilt: 0, conveyorsBuilt: 0, timePlayed: 0 }} />
        </Stage>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          A populated base: two fueled generators, production machines (smelter / steel / assembler), a miner→belt→storage coal chain, and passive storage/chest. HUD + objectives overlay as in normal play.
        </div>
      </Section>

      {/* 07 — Construction Mode */}
      <Section id="construction" title="07 · Construction Mode (build tool armed)">
        <Stage scene={null} width={CONSTRUCTION_W} height={CONSTRUCTION_H}>
          <div style={{ position: 'absolute', inset: 0, padding: 0 }}>
            <WorldCanvas buildScene={buildMenuScene} width={CONSTRUCTION_W} height={CONSTRUCTION_H} />
            <HUD
              tickRate={10}
              paused={false}
              onTogglePause={() => {}}
              onIncreaseSpeed={() => {}}
              onDecreaseSpeed={() => {}}
              onResetSpeed={() => {}}
              onToggleBuildMenu={() => {}}
              onToggleInventory={() => {}}
              onToggleHelp={() => {}}
              onToggleObjectives={() => {}}
              onTogglePower={() => {}}
              onSave={() => {}}
              onLoad={() => {}}
              onNewGame={() => {}}
              buildType={'miner'}
              buildDirection={Dir.Down}
              onDeselectBuild={() => {}}
              saveStatus={null}
              showPowerPanel={false}
              playerInventory={playerItems}
            />
            <div style={{ position: 'absolute', top: 50, left: 8, zIndex: 20 }}>
              <BuildMenu onSelectBuild={() => {}} activeBuild={'miner'} playerInventory={playerItems} />
            </div>
          </div>
        </Stage>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          Compare the two canvases above/below: the top shows a <strong>valid</strong> placement preview (green), the bottom an <strong>invalid</strong> one (red, tile already occupied). The build ribbon + Build Menu are armed.
        </div>
        <Stage scene={null} width={CONSTRUCTION_W} height={CONSTRUCTION_H} style={{ marginTop: 10 }}>
          <div style={{ position: 'absolute', inset: 0, padding: 0 }}>
            <WorldCanvas buildScene={miningPreviewScene} width={CONSTRUCTION_W} height={CONSTRUCTION_H} />
          </div>
        </Stage>
      </Section>

      {/* 08 — HUD & Build UI */}
      <Section id="hud" title="08 · HUD &amp; Build UI">
        <Stage scene={{ engine: gameplay.engine, camera: gameplay.camera }} width={gameplay.width} height={gameplay.height}>
          <HUD
            tickRate={10}
            paused={false}
            onTogglePause={() => {}}
            onIncreaseSpeed={() => {}}
            onDecreaseSpeed={() => {}}
            onResetSpeed={() => {}}
            onToggleBuildMenu={() => {}}
            onToggleInventory={() => {}}
            onToggleHelp={() => {}}
            onToggleObjectives={() => {}}
            onTogglePower={() => {}}
            onSave={() => {}}
            onLoad={() => {}}
            onNewGame={() => {}}
            buildType={'conveyor'}
            buildDirection={Dir.Right}
            onDeselectBuild={() => {}}
            saveStatus={{ message: 'Game saved!', type: 'success' }}
            power={power}
            showPowerPanel={false}
            playerInventory={playerItems}
          />
          <div style={{ position: 'absolute', top: 50, left: 8, zIndex: 20 }}>
            <BuildMenu onSelectBuild={() => {}} activeBuild={'conveyor'} playerInventory={playerItems} />
          </div>
          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 20 }}>
            <InventoryPanel
              playerInventory={playerItems}
              nearbyBuildings={gameplay.engine.getNearbyBuildings(55, 56, 6)}
              playerStats={{ ...gameplay.engine.player.stats, timePlayed: 245 }}
            />
          </div>
        </Stage>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          Top HUD (speed controls, pause, power grid, controls hint, save/load/new), Build Menu (affordability + cost chips), and the bottom Inventory / Nearby Buildings panel.
        </div>
      </Section>

      {/* 09 — Inspection & Power */}
      <Section id="inspection" title="09 · Inspection &amp; Power Grid">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <Stage scene={{ engine: gameplay.engine, camera: gameplay.camera }} width={gameplay.width} height={gameplay.height}>
            <HUD
              tickRate={10}
              paused={false}
              onTogglePause={() => {}}
              onIncreaseSpeed={() => {}}
              onDecreaseSpeed={() => {}}
              onResetSpeed={() => {}}
              onToggleBuildMenu={() => {}}
              onToggleInventory={() => {}}
              onToggleHelp={() => {}}
              onToggleObjectives={() => {}}
              onTogglePower={() => {}}
              onSave={() => {}}
              onLoad={() => {}}
              onNewGame={() => {}}
              buildType={null}
              onDeselectBuild={() => {}}
              saveStatus={null}
              power={power}
              showPowerPanel={false}
              playerInventory={playerItems}
            />
            {(inspection && (
              <InspectionPanel data={inspection} onClose={() => {}} onDeposit={() => {}} canDeposit={() => false} onRotate={() => {}} />
            )) || <></>}
          </Stage>
        </div>
        <GroupTitle>Power-link visualization (generator → consumers L-shaped cables)</GroupTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {(() => {
            const s = powerLinkScene();
            return <WorldCanvas buildScene={powerLinkScene} width={s.width} height={s.height} />;
          })()}
        </div>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          The inspection panel (right) shows a machine's status, power, cycle progress, fuel, connections, storage, and deposit buttons. The small board shows the animated power links + dashed generator ring used to visualise the shared grid.
        </div>
      </Section>

      {/* 10 — Tutorial / Objectives / Help */}
      <Section id="help" title="10 · Tutorial, Objectives &amp; Help">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', position: 'relative' }}>
          <HelpPanel />
          <div style={{ minWidth: 300 }}>
            <Tutorial
              steps={tutorialSteps}
              dismissed={false}
              onDismiss={() => {}}
              onManualNext={() => {}}
            />
          </div>
          <ObjectivesPanel stats={{ stonesMined: 12, woodChopped: 0, ingotsCrafted: 0, enginesCrafted: 1, ironIngotsCrafted: 0, copperWiresCrafted: 0, minersBuilt: 0, generatorsBuilt: 0, smeltersBuilt: 0, assemblersBuilt: 0, conveyorsBuilt: 0, timePlayed: 0 }} />
        </div>
        <div style={{ color: '#7f8aa6', fontSize: 11, marginTop: 8 }}>
          The real Help panel (controls reference), the active first-run Tutorial card (with step progress dots), and the Objectives tracker — as they appear in normal play.
        </div>
      </Section>

      <div style={{ padding: '18px 26px', color: '#5c6478', fontSize: 11 }}>
        End of showcase. All panels render the real game Renderer and real React UI components. Nothing here changes gameplay.
      </div>
    </div>
  );
}

// ====================================================================
// Mount + dev-only global hook (used by the screenshot script)
// ====================================================================

function installShowcaseControls() {
  const api = {
    show(key: string) {
      document.querySelectorAll('[data-scenario]').forEach((el) => {
        const s = el.getAttribute('data-scenario');
        (el as HTMLElement).style.display = s === key ? '' : 'none';
      });
      const banner = document.querySelector('[data-banner]') as HTMLElement | null;
      if (banner) banner.style.display = 'none';
      window.scrollTo(0, 0);
    },
    showAll() {
      document.querySelectorAll('[data-scenario]').forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      const banner = document.querySelector('[data-banner]') as HTMLElement | null;
      if (banner) banner.style.display = '';
      window.scrollTo(0, 0);
    },
  };
  (window as unknown as { __showcase?: typeof api }).__showcase = api;
}

installShowcaseControls();

const root = document.getElementById('root')!;
root.innerHTML = '';
createRoot(root).render(<Showcase />);
