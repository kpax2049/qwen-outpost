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
