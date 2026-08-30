// Shared helpers used by the developer-only Visual Showcase / Asset Atlas.
//
// These are DEV-ONLY constructs. They manipulate the game state directly (bypassing
// affordability checks) purely to arrange deterministic, labelled visual scenes.
// They are never referenced by production gameplay (App.tsx / main.tsx).

import { GameEngine } from '../engine/GameEngine';
import { TILE_SIZE, MAP_SIZE, Dir } from '../types';
import type { Building, BuildingTypeValue, ResourceTypeValue, Tile } from '../types';
import type { Camera, RenderOptions } from '../rendering/Renderer';

export const T = TILE_SIZE;

/** Fresh engine with a wide central region cleared to plain grass (a clean board). */
export function makeEngine(seed = 9000, boardRadius = 14): GameEngine {
  const e = new GameEngine(seed);
  clearBoard(e, 60, 60, boardRadius);
  // Move the player onto the board so overlay scenes behave like normal gameplay.
  e.player.x = 60;
  e.player.y = 60;
  e.player.facing = Dir.Down;
  return e;
}

/** Clear a rectangular region to plain grass with no resource or building. */
export function clearBoard(e: GameEngine, cx: number, cy: number, radius: number): void {
  for (let y = Math.max(0, cy - radius); y <= Math.min(MAP_SIZE - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(MAP_SIZE - 1, cx + radius); x++) {
      e.map[y][x] = { terrain: 'grass' };
    }
  }
}

/** Clear an arbitrary box (top-left + size) to plain grass. */
export function clearBox(e: GameEngine, x0: number, y0: number, w: number, h: number, pad = 1): void {
  for (let y = Math.max(0, y0 - pad); y <= Math.min(MAP_SIZE - 1, y0 + h - 1 + pad); y++) {
    for (let x = Math.max(0, x0 - pad); x <= Math.min(MAP_SIZE - 1, x0 + w - 1 + pad); x++) {
      e.map[y][x] = { terrain: 'grass' };
    }
  }
}

/** Place a building on a cleared grass tile (dev-only: skips affordability). */
export function put(e: GameEngine, x: number, y: number, b: Building): void {
  e.map[y][x] = { terrain: 'grass', building: b };
}

/** Set a tile's terrain (used for terrain swatches). */
export function setTerrain(e: GameEngine, x: number, y: number, terrain: Tile['terrain']): void {
  const tile = e.map[y][x];
  e.map[y][x] = { ...tile, terrain };
}

/** Set a tile's resource deposit. */
export function setResource(e: GameEngine, x: number, y: number, type: ResourceTypeValue, amount: number): void {
  const tile = e.map[y][x];
  e.map[y][x] = { ...tile, resource: { type, amount } };
}

/** Convenience: build a Building object with sane defaults and overrides. */
export function makeBuilding(type: BuildingTypeValue, partial: Partial<Building> = {}): Building {
  const base: Building = {
    type,
    direction: Dir.Down,
    active: false,
    powerConsumed: 0,
    inventory: [],
    maxInventory: 8,
    progress: 0,
    maxProgress: 1,
  };
  return { ...base, ...partial };
}

/** All building types in a fixed order (used by the legend). */
export const ALL_BUILDING_TYPES: BuildingTypeValue[] = [
  'storage',
  'chest',
  'generator',
  'miner',
  'conveyor',
  'smelter',
  'steel_smelter',
  'assembler',
];

/** Camera centred on the middle of a rows x cols tile board rooted at `o`. */
export function frameBoard(
  o: { x: number; y: number },
  rows: number,
  cols: number,
  zoom: number,
  pad = 16,
): { camera: Camera; width: number; height: number } {
  const cx = o.x + (cols - 1) / 2;
  const cy = o.y + (rows - 1) / 2;
  const worldCX = (cx + 0.5) * T * zoom;
  const worldCY = (cy + 0.5) * T * zoom;
  const width = cols * T * zoom + pad * 2;
  const height = rows * T * zoom + pad * 2;
  return { camera: { x: width / 2 - worldCX, y: height / 2 - worldCY, zoom }, width, height };
}

/** Camera centred on a single tile. */
export function frameTile(x: number, y: number, zoom: number, width: number, height: number): Camera {
  return { x: width / 2 - (x + 0.5) * T * zoom, y: height / 2 - (y + 0.5) * T * zoom, zoom };
}

/** Default render options for the showcase: no minimap, no overlays. */
export function showcaseOptions(): RenderOptions {
  return { showMinimap: false };
}

/**
 * Render options for an ISOLATED asset board (a terrain / resource / building /
 * machine-state swatch). The player sprite is disabled so each swatch shows exactly
 * the one asset/state it is labelled with and is never covered by the player.
 */
export function isolatedOptions(extra: RenderOptions = {}): RenderOptions {
  return { ...showcaseOptions(), showPlayer: false, ...extra };
}

/**
 * Render options for a GAMEPLAY-style scene (populated base, construction mode,
 * inspection, HUD). The player sprite is enabled, exactly as in normal play.
 */
export function gameplayOptions(extra: RenderOptions = {}): RenderOptions {
  return { ...showcaseOptions(), showPlayer: true, ...extra };
}

// ====================================================================
// Coal-chain bootstrap scene: Miner → belts → Generator (passive)
// ====================================================================

/**
 * A deterministic coal-chain bootstrap scene.
 * Layout (vertical column, top to bottom):
 *   (60,57) — Miner (coal deposit underneath, active)
 *   (60,58) — Conveyor (Down)
 *   (60,59) — Conveyor (Down)
 *   (60,60) — Conveyor (Down)
 *   (60,61) — Generator (passive belt feeds coal in)
 *
 * The player is hidden. Conveyors have powerConsumed: 0.
 * After enough ticks, mined coal travels the belt chain and fuels the generator.
 */
export function makeCoalChainScene(): { engine: GameEngine; camera: Camera; width: number; height: number } {
  const e = new GameEngine(42);
  clearBox(e, 58, 55, 5, 9);

  // Miner with coal deposit.
  setResource(e, 60, 57, 'coal', 100);
  put(e, 60, 57, makeBuilding('miner', {
    active: true, powerConsumed: 5, direction: Dir.Down,
    maxProgress: 30, progress: 12,
    inventory: [{ type: 'coal', amount: 2 }],
  }));

  // 3 passive conveyors.
  put(e, 60, 58, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 6, inventory: [{ type: 'coal', amount: 1 }] }));
  put(e, 60, 59, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 3 }));
  put(e, 60, 60, makeBuilding('conveyor', { active: true, powerConsumed: 0, direction: Dir.Down, maxProgress: 12, progress: 9, inventory: [{ type: 'coal', amount: 1 }] }));

  // Generator at the bottom (receives coal from belt chain).
  put(e, 60, 61, makeBuilding('generator', { active: false, powerProduced: 50, maxProgress: 50, progress: 0, inventory: [] }));

  e.player.x = 100; // move player off-board so it doesn't obscure the scene.
  e.player.y = 100;

  const { camera, width, height } = frameBoard({ x: 60, y: 58 }, 5, 1, 1.8, 32);
  return { engine: e, camera, width, height };
}

export function coalChainOptions(): RenderOptions {
  return { ...isolatedOptions(), showPlayer: false };
}
