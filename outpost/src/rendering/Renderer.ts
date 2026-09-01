import {
  TILE_SIZE,
  MAP_SIZE,
  type Building,
  type Tile,
  type PlayerState,
  type TerrainValue,
  type ResourceTypeValue,
  type DirectionValue,
  type ItemType,
  RESOURCE_COLORS,
  ITEM_COLORS,
  directionVector,
  Dir,
  type BuildingTypeValue,
} from '../types';
import { AssetLoader } from './AssetLoader';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RenderOptions {
  selectedTile?: { x: number; y: number } | null;
  /** Preview tile for placement, with a validity flag for coloring. */
  buildPreview?: { x: number; y: number } | null;
  buildColor?: string;
  buildValid?: boolean;
  /** Multi-tile conveyor route being dragged. */
  buildPath?: { x: number; y: number }[];
  buildPathValid?: boolean;
  buildDirection?: DirectionValue;
  inspectedTile?: { x: number; y: number } | null;
  interactiveTile?: { x: number; y: number } | null;
  interactiveLabel?: string;
  facing?: DirectionValue;
  /** Hide the bottom-right minimap (used by the dev-only visual showcase). */
  showMinimap?: boolean;
  /**
   * Hide the player sprite (defaults to shown).
   *
   * Used by the dev-only Visual Showcase to keep isolated asset boards
   * (terrain / resource / building swatches) free of the player sprite so each
   * swatch demonstrates exactly one asset/state. Production gameplay never
   * sets this, so the player renders as usual.
   */
  showPlayer?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ConveyorAnim {
  offset: number;
}

/** Canvas angle (radians) subtended by each world direction from the center. */
const DIR_ANGLE: Record<DirectionValue, number> = {
  [Dir.Up]: -Math.PI / 2,
  [Dir.Right]: 0,
  [Dir.Down]: Math.PI / 2,
  [Dir.Left]: Math.PI,
};

/** Deterministic Park-Miller LCG (same scheme as the game-world PRNG). */
class LcgRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  /** Pre-rendered terrain tiles (TILE_SIZE each). */
  private terrainCache: Map<TerrainValue, HTMLCanvasElement> = new Map();
  private particles: Particle[] = [];
  private frameCount = 0;
  private lastTickBuildings: Map<string, boolean> = new Map();
  private conveyorAnims: Map<string, ConveyorAnim> = new Map();
  private waterTime = 0;

  /** Sprite asset loader for Relay Seven assets. */
  private assetLoader: AssetLoader;

  /**
   * Deterministic PRNG used ONLY for cosmetic terrain-tile texture generation
   * (grass/sand base shade + speckles). Gameplay is unaffected; this makes each
   * Renderer instance produce identical tile art so screenshots are reproducible.
   */
  private terrainRand = new LcgRandom(987654321);

  /**
   * Deterministic PRNG for cosmetic particle spawns (velocities, life, size).
   * Gameplay feel is unchanged while keeping render output bit-reproducible.
   */
  private particleRand = new LcgRandom(135797531);

  /** Caches for sprite canvases keyed by type+direction+state. */
  private beltSpriteCache = new Map<string, HTMLCanvasElement>();
  /** Caches for the repeated belt strips used by the scrolling-tread animation. */
  private beltStripCache = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement, assetLoader: AssetLoader) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assetLoader = assetLoader;
    this.loadTerrainSprites();
  }

  // ======================== Sprite Key Mappings ========================

  private getBuildingSpriteKey(type: BuildingTypeValue): string {
    const map: Record<BuildingTypeValue, string> = {
      storage: 'R-b-storage',
      chest: 'R-b-chest',
      generator: 'R-b-generator',
      miner: 'R-b-miner',
      conveyor: 'R-b-conveyor',
      smelter: 'R-b-smelter',
      steel_smelter: 'R-b-steel',
      assembler: 'R-b-assembler',
    };
    return map[type] ?? '';
  }

  private getBeltSpriteKey(direction: DirectionValue): string {
    const map: Record<DirectionValue, string> = {
      [Dir.Up]: 'R-belt-up',
      [Dir.Right]: 'R-belt-right',
      [Dir.Down]: 'R-belt-down',
      [Dir.Left]: 'R-belt-left',
    };
    return map[direction] ?? 'R-belt-right';
  }

  private getItemSpriteKey(itemType: ItemType): string | undefined {
    const map: Partial<Record<ItemType, string>> = {
      coal: 'R-item-coal',
      stone: 'R-item-stone',
      iron: 'R-item-iron',
      copper: 'R-item-copper',
      gold: 'R-item-gold',
      wood: 'R-item-wood',
      iron_ingot: 'R-item-ingot',
      steel_plate: 'R-item-plate',
      copper_wire: 'R-item-wire',
      gear: 'R-item-gear',
      circuit: 'R-item-circuit',
      engine: 'R-item-engine',
    };
    return map[itemType];
  }

  // ======================== Terrain Cache ========================

  /**
   * Build the terrain tile cache from Relay Seven sprites.
   * Each 32x32 sprite is scaled to TILE_SIZE with nearest-neighbor for crisp pixels.
   */
  private loadTerrainSprites(): void {
    const spriteNames: Record<TerrainValue, string> = {
      grass: 'R-grass',
      forest: 'R-forest',
      sand: 'R-sand',
      water: 'R-water',
      rock: 'R-rock',
      dirt: 'R-grass',
    };

    for (const [terrain, name] of Object.entries(spriteNames) as [TerrainValue, string][]) {
      const sprite = this.assetLoader.get(name);
      if (sprite) {
        const vc = document.createElement('canvas');
        vc.width = TILE_SIZE;
        vc.height = TILE_SIZE;
        const vctx = vc.getContext('2d')!;
        vctx.imageSmoothingEnabled = false;
        vctx.drawImage(sprite.canvas, 0, 0);

        if (terrain !== 'water' && terrain !== 'rock') {
          for (let i = 0; i < 6; i++) {
            const nx = this.terrainRand.next() * TILE_SIZE;
            const ny = this.terrainRand.next() * TILE_SIZE;
            const shade = this.terrainRand.next();
            if (shade < 0.33) {
              vctx.fillStyle = 'rgba(0,0,0,0.06)';
            } else if (shade < 0.66) {
              vctx.fillStyle = 'rgba(255,255,255,0.04)';
            } else {
              continue;
            }
            vctx.fillRect(nx, ny, 2, 2);
          }
        }

        this.terrainCache.set(terrain, vc);
      } else {
        const fc = document.createElement('canvas');
        fc.width = TILE_SIZE;
        fc.height = TILE_SIZE;
        const fctx = fc.getContext('2d')!;
        const fallbackColors: Record<TerrainValue, string> = {
          grass: '#3a7a2a',
          forest: '#2d5a1e',
          sand: '#c4a35a',
          water: '#1a4a7a',
          rock: '#6a6a6a',
          dirt: '#8a7a5a',
        };
        fctx.fillStyle = fallbackColors[terrain] ?? '#333';
        fctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        this.terrainCache.set(terrain, fc);
      }
    }
  }

  /** Rebuild the terrain tile cache after assets finish loading. */
  public updateTerrainCache(): void {
    this.terrainCache.clear();
    this.loadTerrainSprites();
  }

  // ======================== Particle System ========================

  private spawnParticle(x: number, y: number, color: string, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (this.particleRand.next() - 0.5) * 2,
        vy: -this.particleRand.next() * 2 - 0.5,
        life: 30 + this.particleRand.next() * 20,
        maxLife: 50,
        color,
        size: 1 + this.particleRand.next() * 2,
      });
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawWaterAnimation(x: number, y: number): void {
    const { ctx } = this;
    const wave1 = Math.sin(this.waterTime + x * 0.3 + y * 0.2) * 3;
    const wave2 = Math.sin(this.waterTime * 0.7 + x * 0.2 - y * 0.3) * 2;

    ctx.save();
    ctx.translate(x * TILE_SIZE, y * TILE_SIZE);

    ctx.fillStyle = 'rgba(58, 122, 170, 0.15)';
    ctx.fillRect(0, TILE_SIZE / 2 + wave1, TILE_SIZE, 3);
    ctx.fillStyle = 'rgba(70, 134, 186, 0.12)';
    ctx.fillRect(0, TILE_SIZE / 3 + wave2, TILE_SIZE, 2);

    ctx.restore();
  }

  // ======================== Main Render ========================

  render(map: Tile[][], player: PlayerState, camera: Camera, options: RenderOptions): void {
    this.frameCount++;
    this.waterTime += 0.05;

    const { ctx } = this;
    const { selectedTile, buildPreview, buildColor, buildValid, buildPath, buildPathValid, buildDirection, inspectedTile, interactiveTile, interactiveLabel, facing } = options;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Visible tile range
    const startTileX = Math.floor(-camera.x / (TILE_SIZE * camera.zoom));
    const startTileY = Math.floor(-camera.y / (TILE_SIZE * camera.zoom));
    const endTileX = startTileX + Math.ceil(this.canvas.width / (TILE_SIZE * camera.zoom)) + 1;
    const endTileY = startTileY + Math.ceil(this.canvas.height / (TILE_SIZE * camera.zoom)) + 1;

    // Terrain tiles
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        const tileCanvas = this.terrainCache.get(tile.terrain);
        if (tileCanvas) {
          ctx.drawImage(tileCanvas, x * TILE_SIZE, y * TILE_SIZE);
        }
        if (tile.terrain === 'water') {
          this.drawWaterAnimation(x, y);
        }
      }
    }

    // Resource deposits
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        if (tile.resource && tile.resource.amount > 0) {
          this.drawResource(x, y, tile.resource);
        }
      }
    }

    // Track building state changes for particles
    const currentTickBuildings = new Map<string, boolean>();
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        if (tile.building) {
          const key = `${x},${y}`;
          currentTickBuildings.set(key, tile.building.active);
        }
      }
    }

    // Spawn particles for newly activated buildings
    for (const [key, active] of currentTickBuildings) {
      const wasActive = this.lastTickBuildings.get(key);
      if (active && !wasActive) {
        const [bx, by] = key.split(',').map(Number);
        const cx = bx * TILE_SIZE + TILE_SIZE / 2;
        const cy = by * TILE_SIZE + TILE_SIZE / 2;
        this.spawnParticle(cx, cy, '#ffaa44', 5);
      }
    }
    this.lastTickBuildings.clear();
    for (const [key, active] of currentTickBuildings) {
      this.lastTickBuildings.set(key, active);
    }

    // Buildings
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        if (tile.building) {
          this.drawBuilding(x, y, tile.building, map);
        }
      }
    }

    // Power grid links
    this.drawPowerLinks(map, startTileX, startTileY, endTileX, endTileY);

    // Player
    if (options.showPlayer !== false) {
      this.drawPlayer(player.x, player.y, facing ?? player.facing);
    }

    // Particles
    this.drawParticles();

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, startTileY * TILE_SIZE);
      ctx.lineTo(x * TILE_SIZE, endTileY * TILE_SIZE);
      ctx.stroke();
    }
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      ctx.beginPath();
      ctx.moveTo(startTileX * TILE_SIZE, y * TILE_SIZE);
      ctx.lineTo(endTileX * TILE_SIZE, y * TILE_SIZE);
      ctx.stroke();
    }

    ctx.restore();

    // UI overlays
    this.drawUIOverlays(camera, selectedTile, buildPreview, buildColor, buildValid, buildPath, buildPathValid, buildDirection, inspectedTile, interactiveTile, interactiveLabel);

    // Minimap
    if (options.showMinimap !== false) {
      this.drawMinimap(map, player ? { x: player.x, y: player.y } : undefined);
    }

    this.updateParticles();
  }

  private drawUIOverlays(
    camera: Camera,
    selectedTile: { x: number; y: number } | null | undefined,
    buildPreview: { x: number; y: number } | null | undefined,
    buildColor: string | undefined,
    buildValid: boolean | undefined,
    buildPath: { x: number; y: number }[] | undefined,
    buildPathValid: boolean | undefined,
    buildDirection: DirectionValue | undefined,
    inspectedTile: { x: number; y: number } | null | undefined,
    interactiveTile: { x: number; y: number } | null | undefined,
    interactiveLabel: string | undefined,
  ): void {
    const { ctx } = this;

    // Selected tile highlight
    if (selectedTile) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.strokeStyle = 'rgba(255, 255, 100, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selectedTile.x * TILE_SIZE - 1,
        selectedTile.y * TILE_SIZE - 1,
        TILE_SIZE + 2,
        TILE_SIZE + 2,
      );
      ctx.restore();
    }

    // Inspected tile highlight
    if (inspectedTile) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.fillStyle = 'rgba(120, 190, 255, 0.10)';
      ctx.fillRect(inspectedTile.x * TILE_SIZE, inspectedTile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = 'rgba(140, 200, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        inspectedTile.x * TILE_SIZE - 2,
        inspectedTile.y * TILE_SIZE - 2,
        TILE_SIZE + 4,
        TILE_SIZE + 4,
      );
      ctx.restore();
    }

    // Interactive tile (E to interact)
    if (interactiveTile) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        interactiveTile.x * TILE_SIZE - 2,
        interactiveTile.y * TILE_SIZE - 2,
        TILE_SIZE + 4,
        TILE_SIZE + 4,
      );
      ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
      ctx.fillRect(
        interactiveTile.x * TILE_SIZE,
        interactiveTile.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      if (interactiveLabel) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const text = `E: ${interactiveLabel}`;
        ctx.font = 'bold 11px monospace';
        const tw = ctx.measureText(text).width + 12;
        ctx.fillRect(
          interactiveTile.x * TILE_SIZE + TILE_SIZE / 2 - tw / 2,
          interactiveTile.y * TILE_SIZE - 18,
          tw,
          16,
        );
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, interactiveTile.x * TILE_SIZE + TILE_SIZE / 2, interactiveTile.y * TILE_SIZE - 10);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }

    // Build preview
    if (buildPreview) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      const { x, y } = buildPreview;
      const bx = x * TILE_SIZE;
      const by = y * TILE_SIZE;
      if (buildColor) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = buildColor;
        ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1.0;
      }
      if (buildValid === false) {
        ctx.fillStyle = 'rgba(255, 40, 40, 0.28)';
        ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      } else if (buildColor) {
        ctx.strokeStyle = 'rgba(180, 255, 180, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
      if (buildDirection !== undefined) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(bx + TILE_SIZE / 2, by + TILE_SIZE / 2, 9, 0, Math.PI * 2);
        ctx.fill();
        this.drawArrow(bx + TILE_SIZE / 2, by + TILE_SIZE / 2, buildDirection, 10);
      }
      ctx.restore();
    }

    // Conveyor build path
    if (buildPath && buildPath.length > 0) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      const valid = buildPathValid !== false;
      ctx.strokeStyle = valid ? 'rgba(180, 255, 180, 0.6)' : 'rgba(255, 80, 80, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < buildPath.length; i++) {
        const t = buildPath[i];
        const cx2 = t.x * TILE_SIZE + TILE_SIZE / 2;
        const cy2 = t.y * TILE_SIZE + TILE_SIZE / 2;
        if (i === 0) ctx.moveTo(cx2, cy2); else ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const t of buildPath) {
        const tx = t.x * TILE_SIZE;
        const ty = t.y * TILE_SIZE;
        const last = t === buildPath[buildPath.length - 1];
        ctx.globalAlpha = last ? 0.55 : 0.3;
        ctx.fillStyle = buildColor ?? '#444444';
        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1;
        if (last) {
          ctx.strokeStyle = valid ? 'rgba(180,255,180,0.8)' : '#ff4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
      }
      ctx.restore();
    }

    // Map border
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    ctx.restore();
  }

  // ======================== Resource Rendering ========================

  private drawResource(gx: number, gy: number, resource: { type: ResourceTypeValue; amount: number }): void {
    const { ctx } = this;
    const spriteKey = this.getResourceSpriteKey(resource.type);
    const sprite = this.assetLoader.get(spriteKey);

    if (sprite) {
      const depletion = Math.max(0.4, resource.amount / 100);
      const size = Math.floor(32 * (0.6 + 0.4 * depletion));
      const offset = (TILE_SIZE - size) / 2;
      ctx.drawImage(
        sprite.canvas,
        gx * TILE_SIZE + offset,
        gy * TILE_SIZE + offset,
        size, size,
      );
    } else {
      this.drawResourceFallback(gx, gy, resource);
    }
  }

  private getResourceSpriteKey(type: ResourceTypeValue): string {
    const map: Record<ResourceTypeValue, string> = {
      wood: 'R-res-wood',
      stone: 'R-res-stone',
      iron: 'R-res-iron',
      copper: 'R-res-copper',
      coal: 'R-res-coal',
      gold: 'R-res-gold',
    };
    return map[type] ?? 'R-res-stone';
  }

  private drawResourceFallback(gx: number, gy: number, resource: { type: ResourceTypeValue; amount: number }): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;
    const color = RESOURCE_COLORS[resource.type] || '#888';
    const size = Math.max(4, Math.min(12, resource.amount / 20));
    const depletion = Math.max(0.3, resource.amount / 100);

    ctx.globalAlpha = depletion;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    switch (resource.type) {
      case 'stone': {
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(cx - size * 0.3, cy - size * 0.3, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'iron':
      case 'copper': {
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'coal': {
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'gold': {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? size : size * 0.4;
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'wood': {
        ctx.fillStyle = '#6a4a1a';
        ctx.fillRect(cx - size / 4, cy, size / 2, size * 0.9);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.6, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - size * 0.3, cy - size * 0.7, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    if (resource.amount < 50) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(resource.amount), cx, cy + size + 8);
    }
  }

  // ======================== Building Rendering ========================

  private drawBuilding(gx: number, gy: number, building: Building, map: Tile[][]): void {
    // Conveyor gets full sprite-based rendering
    if (building.type === 'conveyor') {
      this.drawConveyor(gx, gy, building, map);
      return;
    }

    // Get cached building sprite
    const spriteKey = this.getBuildingSpriteKey(building.type);
    const baseSprite = this.assetLoader.get(spriteKey);

    if (baseSprite) {
      this.drawBuildingSprite(gx, gy, baseSprite, building);
    } else {
      // Fallback: procedural rendering
      this.drawBuildingFallback(gx, gy, building, map);
    }
  }

  /** Draw a building sprite with state-based overlays. */
  private drawBuildingSprite(gx: number, gy: number, baseSprite: { canvas: HTMLCanvasElement }, building: Building): void {
    const { ctx } = this;
    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx + 3, by + 3, TILE_SIZE - 4, TILE_SIZE - 4);

    // Base sprite
    ctx.drawImage(baseSprite.canvas, bx, by);

    // State overlay
    const hasPower = building.active;
    const isBlocked = !!building.blocked;
    const isWorking = hasPower && building.maxProgress > 1 && building.progress > 0 && building.progress < building.maxProgress;
    const isIdle = hasPower && (building.maxProgress <= 1 || building.progress === 0 || building.progress >= building.maxProgress);

    if (isBlocked) {
      // Blocked: dark overlay with red pulse + gate
      ctx.fillStyle = 'rgba(60, 20, 20, 0.35)';
      ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);

      // Red gate at exit edge
      const dir = building.direction;
      const perp = { x: directionVector(dir).y, y: directionVector(dir).x };
      const exitEdge = this.edgeMid(building.direction);
      const ex = bx + exitEdge.x;
      const ey = by + exitEdge.y;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - perp.x * 9, ey - perp.y * 9);
      ctx.lineTo(ex + perp.x * 9, ey + perp.y * 9);
      ctx.stroke();

      // Pulsing border
      const pulse = Math.sin(this.frameCount * 0.15) * 0.35 + 0.55;
      ctx.strokeStyle = `rgba(255, 68, 68, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    } else if (!hasPower) {
      // No power: blue-gray wash over sprite
      ctx.fillStyle = 'rgba(40, 50, 70, 0.35)';
      ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
    } else if (isWorking) {
      // Working: warm amber glow/pulse around edges
      const pulse = Math.sin(this.frameCount * 0.08) * 0.12 + 0.18;
      ctx.shadowColor = '#ffaa44';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(255, 170, 68, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.shadowBlur = 0;

      // Subtle amber top accent
      ctx.fillStyle = 'rgba(255, 170, 68, 0.08)';
      ctx.fillRect(bx, by, TILE_SIZE, 4);
    } else if (isIdle) {
      // Idle with power: slight dimming
      ctx.fillStyle = 'rgba(20, 20, 30, 0.12)';
      ctx.fillRect(bx, by, TILE_SIZE, TILE_SIZE);
    }

    // Progress bar (industrial treatment)
    this.drawIndustrialProgress(gx, gy, building, isWorking);

    // Inventory count bubble
    const totalItems = building.inventory.reduce((sum, i) => sum + i.amount, 0);
    if (totalItems > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.arc(cx, cy + 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(Math.min(totalItems, 99)), cx, cy + 10);
      ctx.textBaseline = 'alphabetic';
    }

    // Power indicator dot
    if (building.powerConsumed > 0) {
      const px = bx + TILE_SIZE - 6;
      const py = by + 6;
      ctx.fillStyle = hasPower ? '#44ff44' : '#ff4444';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (hasPower) {
        const pulse = Math.sin(this.frameCount * 0.1) * 0.3 + 0.5;
        ctx.strokeStyle = `rgba(68, 255, 68, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Direction indicator for miners
    if (building.type === 'miner' && !isBlocked) {
      this.drawArrow(cx, cy - 3, building.direction, 6);
    }
  }

  /** Fallback procedural building rendering (when sprites aren't available). */
  private drawBuildingFallback(gx: number, gy: number, building: Building, _map: Tile[][]): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;
    const def = this.getBuildingDef(building.type);
    const color = def.color;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(gx * TILE_SIZE + 3, gy * TILE_SIZE + 3, TILE_SIZE - 4, TILE_SIZE - 4);

    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(gx * TILE_SIZE + 2, gy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    if (building.active) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }

    ctx.strokeStyle = building.active ? '#4a8a4a' : '#8a4a4a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gx * TILE_SIZE + 2, gy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.shadowBlur = 0;

    ctx.fillStyle = color;

    switch (def.shape) {
      case 'rect': {
        const inset = 8;
        ctx.fillRect(gx * TILE_SIZE + inset, gy * TILE_SIZE + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(gx * TILE_SIZE + inset, gy * TILE_SIZE + inset, TILE_SIZE - inset * 2, 2);
        break;
      }
      case 'circle': {
        const grad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, TILE_SIZE / 2 - 8);
        grad.addColorStop(0, '#ff6633');
        grad.addColorStop(1, '#cc4400');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
        if (building.active && this.frameCount % 20 === 0) {
          this.spawnParticle(cx, gy * TILE_SIZE, '#888', 1);
        }
        break;
      }
      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(cx, cy - TILE_SIZE / 2 + 8);
        ctx.lineTo(cx + TILE_SIZE / 2 - 8, cy);
        ctx.lineTo(cx, cy + TILE_SIZE / 2 - 8);
        ctx.lineTo(cx - TILE_SIZE / 2 + 8, cy);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    // Progress bar (fallback)
    if (building.maxProgress > 1) {
      const barWidth = TILE_SIZE - 16;
      const barHeight = 4;
      const barX = gx * TILE_SIZE + 8;
      const barY = gy * TILE_SIZE + TILE_SIZE - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
      const progress = building.progress / building.maxProgress;
      const barColor = building.active ? '#44cc44' : '#cc4444';
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(barX, barY, barWidth * progress, 1);
    }

    const totalItems = building.inventory.reduce((sum, i) => sum + i.amount, 0);
    if (totalItems > 0 && building.type !== 'conveyor') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(totalItems), cx, cy + 8);
      ctx.textBaseline = 'alphabetic';
    }

    if (building.type === 'miner') {
      this.drawArrow(cx, cy - 2, building.direction, 6);
    }

    if (building.powerConsumed > 0) {
      const px = gx * TILE_SIZE + TILE_SIZE - 6;
      const py = gy * TILE_SIZE + 6;
      ctx.fillStyle = building.active ? '#44ff44' : '#ff4444';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (building.active) {
        const pulse = Math.sin(this.frameCount * 0.1) * 0.3 + 0.5;
        ctx.strokeStyle = `rgba(68, 255, 68, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ======================== Conveyor / Belt Rendering ========================

  /** Geometry derived from (direction, incomingSide). */
  private getGeometry(dir: DirectionValue, incomingSide?: DirectionValue): 'straight' | 'elbow' {
    if (incomingSide === undefined) return 'straight';
    const opp = ((incomingSide + 2) % 4) as DirectionValue;
    if (dir === opp) return 'straight';
    return 'elbow';
  }

  /**
   * Elbow orientation (rotation + optional mirror).
   *
   * The base `R-belt-elbow.png` sprite at 0° shows a belt turning from the
   * East edge to the South edge (a clockwise quarter turn in canvas coords).
   * For a target elbow (incomingSide → output):
   *   - rotate the sprite so its entry rail sits on the incoming edge;
   *   - when the output is reached by a counter-clockwise turn (shortest-arc
   *     delta is negative), mirror across the incoming edge's axis so the
   *     band bulges the other way.
   * This is the single mapping shared by the belt artwork, its flow direction,
   * and the transported-item path (getElbowPoint uses the same shortest arc).
   */
  private elbowRotation(dir: DirectionValue, incomingSide: DirectionValue): { angle: number; flipH: boolean; flipV: boolean } {
    // Angle to rotate the base sprite so its entry (East) rail lands on the
    // incoming edge. Positive = clockwise in canvas coordinates.
    const rotateToIncoming: Record<DirectionValue, number> = {
      [Dir.Up]: -Math.PI / 2,
      [Dir.Right]: 0,
      [Dir.Down]: Math.PI / 2,
      [Dir.Left]: Math.PI,
    };
    const angle = rotateToIncoming[incomingSide];

    // Does the item's arc travel counter-clockwise? (shortest-arc delta)
    let delta = DIR_ANGLE[dir] - DIR_ANGLE[incomingSide];
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    const counterClockwise = delta < 0;
    if (counterClockwise) {
      // Mirror keeps the incoming edge fixed while flipping the bulge to the
      // other side of the turn. Incoming West/East -> vertical mirror;
      // incoming North/South -> horizontal mirror.
      return {
        angle,
        flipH: incomingSide === Dir.Up || incomingSide === Dir.Down,
        flipV: incomingSide === Dir.Left || incomingSide === Dir.Right,
      };
    }
    return { angle, flipH: false, flipV: false };
  }

  /**
   * The pre-scaled (TILE_SIZE) canvas for a straight belt sprite in a given
   * direction. The chevrons in the sprite already point along the flow output.
   */
  private getStraightBeltCanvas(dir: DirectionValue): HTMLCanvasElement {
    const cachedKey = `straight_${dir}`;
    const cached = this.beltSpriteCache.get(cachedKey);
    if (cached) return cached;

    const sprite = this.assetLoader.get(this.getBeltSpriteKey(dir));
    if (sprite) {
      const c = document.createElement('canvas');
      c.width = TILE_SIZE;
      c.height = TILE_SIZE;
      const sctx = c.getContext('2d')!;
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(sprite.canvas, 0, 0, TILE_SIZE, TILE_SIZE);
      this.beltSpriteCache.set(cachedKey, c);
      return c;
    }
    const marker = this.createBeltErrorMarker('missing belt sprite');
    this.beltSpriteCache.set(cachedKey, marker);
    return marker;
  }

  /**
   * A strip of three repeated straight-belt tiles used to drive the scrolling
   * tread. The belt sprite's own chevron band repeats every 24px at TILE_SIZE,
   * so shifting the source window reproduces the Relay Seven "scrolling tread"
   * without any procedural chevron overlay.
   */
  private getBeltStrip(dir: DirectionValue): HTMLCanvasElement {
    const cachedKey = `strip_${dir}`;
    const cached = this.beltStripCache.get(cachedKey);
    if (cached) return cached;

    const horizontal = dir === Dir.Right || dir === Dir.Left;
    const c = document.createElement('canvas');
    c.width = horizontal ? TILE_SIZE * 3 : TILE_SIZE;
    c.height = horizontal ? TILE_SIZE : TILE_SIZE * 3;
    const sctx = c.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    const tile = this.getStraightBeltCanvas(dir);
    for (let i = 0; i < 3; i++) {
      const ox = horizontal ? i * TILE_SIZE : 0;
      const oy = horizontal ? 0 : i * TILE_SIZE;
      sctx.drawImage(tile, ox, oy);
    }
    this.beltStripCache.set(cachedKey, c);
    return c;
  }

  /**
   * Elbow path point at parameter t ∈ [0,1].
   * t=0 → entry side midpoint, t=1 → output side midpoint.
   * The shortest-arc sweep matches the elbow sprite's band from elbowRotation.
   */
  private getElbowPoint(gx: number, gy: number, dir: DirectionValue, incomingSide: DirectionValue, t: number): { x: number; y: number } {
    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;
    const cx = bx + TILE_SIZE / 2;
    const cy = by + TILE_SIZE / 2;
    const inset = 6;

    const entryAngle = DIR_ANGLE[incomingSide];
    const outputAngle = DIR_ANGLE[dir];

    // Determine shortest arc direction (CW or CCW)
    let delta = outputAngle - entryAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    const angle = entryAngle + delta * t;
    const radius = TILE_SIZE / 2 - inset;

    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  }

  private drawConveyor(gx: number, gy: number, building: Building, map: Tile[][]): void {
    const { ctx } = this;
    const dir = building.direction;
    const key = `${gx},${gy}`;

    if (!this.conveyorAnims.has(key)) {
      this.conveyorAnims.set(key, { offset: 0 });
    }
    const anim = this.conveyorAnims.get(key)!;

    // Compute geometry from engine flow state
    const incomingSide = this.computeIncomingSideFromMap(gx, gy, map);
    const geometry = this.getGeometry(dir, incomingSide);

    const moving = building.active && !building.blocked;
    if (moving) {
      anim.offset = (anim.offset + 1) % 12;
    }
    const phase = anim.offset / 12;

    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;

    // Dark base underneath
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    // Sprite selection based on geometry
    if (geometry === 'straight') {
      ctx.drawImage(this.getStraightBeltCanvas(dir), bx, by);
    } else {
      // Elbow: rotate (and mirror when CCW) the base R-belt-elbow sprite so its
      // band connects the same two edges and bulges the same way as the item arc.
      const cachedKey = `elbow_${dir}_${incomingSide}`;
      let beltCanvas = this.beltSpriteCache.get(cachedKey);
      if (!beltCanvas) {
        const sprite = this.assetLoader.get('R-belt-elbow');
        if (sprite) {
          const c = document.createElement('canvas');
          c.width = TILE_SIZE;
          c.height = TILE_SIZE;
          const sctx = c.getContext('2d')!;
          sctx.imageSmoothingEnabled = false;
          const { angle, flipH, flipV } = this.elbowRotation(dir, incomingSide!);
          sctx.translate(TILE_SIZE / 2, TILE_SIZE / 2);
          if (flipH) sctx.scale(-1, 1);
          if (flipV) sctx.scale(1, -1);
          sctx.rotate(angle);
          sctx.drawImage(sprite.canvas, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
          beltCanvas = c;
          this.beltSpriteCache.set(cachedKey, c);
        } else {
          beltCanvas = this.createBeltErrorMarker('missing elbow sprite');
          this.beltSpriteCache.set(cachedKey, beltCanvas);
        }
      }
      ctx.drawImage(beltCanvas, bx, by);
    }

    // Draw connected belt edges (seamless chains)
    this.drawBeltConnections(gx, gy, map);

    // Scrolling tread on straight belts: the sprite's own chevrons travel in
    // the flow direction (Relay Seven motion). Elbows keep their static
    // connecting-band sprite.
    if (moving && geometry === 'straight') {
      this.drawBeltTreadScroll(gx, gy, dir, phase);
    }

    // Blocked state (red gate + overlay)
    if (building.blocked) {
      ctx.fillStyle = 'rgba(255, 30, 30, 0.15)';
      ctx.fillRect(bx + 3, by + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      // Gate line at exit edge
      const perp = { x: directionVector(dir).y, y: directionVector(dir).x };
      const exitMid = this.edgeMid(dir);
      const ex = bx + exitMid.x;
      const ey = by + exitMid.y;
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - perp.x * 9, ey - perp.y * 9);
      ctx.lineTo(ex + perp.x * 9, ey + perp.y * 9);
      ctx.stroke();

      // Pulsing red border
      const pulse = Math.sin(this.frameCount * 0.15) * 0.35 + 0.55;
      ctx.strokeStyle = `rgba(255, 50, 50, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }

    // Idle state: barely perceptible dimming to indicate "waiting for item"
    if (building.active && !building.blocked && building.inventory.every(i => i.amount <= 0)) {
      ctx.fillStyle = 'rgba(30, 30, 40, 0.06)';
      ctx.fillRect(bx + 3, by + 3, TILE_SIZE - 6, TILE_SIZE - 6);
    }

    // Belt item (sprite-based)
    this.drawBeltItem(gx, gy, building, dir, geometry, incomingSide);
  }

  /** Compute incomingSide by scanning neighbors in the map (CONVEYOR_DESIGN.md §3.2). */
  private computeIncomingSideFromMap(gx: number, gy: number, map: Tile[][]): DirectionValue | undefined {
    const scanOrder: DirectionValue[] = [Dir.Up, Dir.Right, Dir.Down, Dir.Left];
    for (const side of scanOrder) {
      const nx = gx + directionVector(side).x;
      const ny = gy + directionVector(side).y;
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      const neighbor = map[ny][nx];
      if (neighbor.building?.type !== 'conveyor') continue;
      const nd = neighbor.building.direction;
      // Neighbor feeds this tile when its direction points into (gx, gy).
      if (nd !== ((side + 2) % 4) as DirectionValue) continue;
      return side;
    }
    return undefined;
  }

  /** Draw seamless connections between adjacent belts. */
  private drawBeltConnections(gx: number, gy: number, map: Tile[][]): void {
    const { ctx } = this;
    const inset = 4;
    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;

    for (const side of [Dir.Up, Dir.Right, Dir.Down, Dir.Left] as DirectionValue[]) {
      const nx = gx + directionVector(side).x;
      const ny = gy + directionVector(side).y;
      const isConnected =
        nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE &&
        map[ny][nx].building?.type === 'conveyor';

      if (!isConnected) {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.6)';
        if (side === Dir.Up) ctx.fillRect(bx + inset, by, TILE_SIZE - inset * 2, inset);
        if (side === Dir.Down) ctx.fillRect(bx + inset, by + TILE_SIZE - inset, TILE_SIZE - inset * 2, inset);
        if (side === Dir.Left) ctx.fillRect(bx, by + inset, inset, TILE_SIZE - inset * 2);
        if (side === Dir.Right) ctx.fillRect(bx + TILE_SIZE - inset, by + inset, inset, TILE_SIZE - inset * 2);
      }
    }
  }

  /** Create an error marker canvas when a belt sprite is missing. */
  private createBeltErrorMarker(reason: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a2020';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    console.error(`[Renderer] Belt sprite error: ${reason}`);
    return c;
  }

  /**
   * Scrolling tread for straight belts (Relay Seven "scrolling tread" style).
   *
   * The belt sprite already carries its amber chevron band; drawing the
   * repeating strip through a moving source window makes those chevrons travel
   * along the belt in the flow direction. This is a pure re-scroll of the
   * sprite's own art — no procedural chevron overlay.
   *
   * The chevron pattern repeats every 24px at TILE_SIZE (16px in the 32px
   * sprite × 1.5 scale), so a phase cycle of one period wraps seamlessly.
   */
  private drawBeltTreadScroll(gx: number, gy: number, dir: DirectionValue, phase: number): void {
    const { ctx } = this;
    const strip = this.getBeltStrip(dir);
    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;
    const horizontal = dir === Dir.Right || dir === Dir.Left;
    const period = 16 * (TILE_SIZE / 32);
    const off = Math.floor(phase * period);
    // Features travel toward the output: sample the strip so the pattern moves
    // along +directionVector. Right/Down scroll forward by rewinding the source.
    const src = (dir === Dir.Right || dir === Dir.Down) ? period - off : off;
    if (horizontal) {
      ctx.drawImage(strip, src, 0, TILE_SIZE, TILE_SIZE, bx, by, TILE_SIZE, TILE_SIZE);
    } else {
      ctx.drawImage(strip, 0, src, TILE_SIZE, TILE_SIZE, bx, by, TILE_SIZE, TILE_SIZE);
    }
  }

  /** Get a position along the belt at parameter t (used by tread animation and item rendering). */
  private getBeltPoint(gx: number, gy: number, dir: DirectionValue, t: number): { x: number; y: number } {
    const bx = gx * TILE_SIZE;
    const by = gy * TILE_SIZE;
    const inset = 6;

    switch (dir) {
      case Dir.Right:
        return {
          x: bx + inset + t * (TILE_SIZE - inset * 2),
          y: by + TILE_SIZE / 2,
        };
      case Dir.Down:
        return {
          x: bx + TILE_SIZE / 2,
          y: by + inset + t * (TILE_SIZE - inset * 2),
        };
      case Dir.Up:
        return {
          x: bx + TILE_SIZE / 2,
          y: by + TILE_SIZE - inset - t * (TILE_SIZE - inset * 2),
        };
      case Dir.Left:
        return {
          x: bx + TILE_SIZE - inset - t * (TILE_SIZE - inset * 2),
          y: by + TILE_SIZE / 2,
        };
    }
  }

  /** Get the midpoint of an edge in local tile coordinates. */
  private edgeMid(dir: DirectionValue): { x: number; y: number } {
    const h = TILE_SIZE / 2;
    switch (dir) {
      case Dir.Up: return { x: h, y: 0 };
      case Dir.Down: return { x: h, y: TILE_SIZE };
      case Dir.Left: return { x: 0, y: h };
      case Dir.Right: return { x: TILE_SIZE, y: h };
    }
  }

  // ======================== Belt Item Rendering ========================

  private drawBeltItem(gx: number, gy: number, building: Building, dir: DirectionValue, geometry: 'straight' | 'elbow', incomingSide?: DirectionValue): void {
    const { ctx } = this;

    // Find the first item type on this belt
    const invItem = building.inventory[0];
    if (!invItem || invItem.amount <= 0) return;

    // Position along belt based on progress
    const t = building.blocked ? 0.95 : Math.min(0.92, building.maxProgress > 0 ? building.progress / building.maxProgress : 0.5);
    let pos: { x: number; y: number };
    if (geometry === 'elbow' && incomingSide) {
      pos = this.getElbowPoint(gx, gy, dir, incomingSide, t);
    } else {
      pos = this.getBeltPoint(gx, gy, dir, t);
    }

    // Get item sprite
    const itemSpriteKey = this.getItemSpriteKey(invItem.type as ItemType);
    const itemSprite = itemSpriteKey ? this.assetLoader.get(itemSpriteKey) : null;

    const spriteX = pos.x;
    const spriteY = pos.y;

    if (itemSprite) {
      // Draw item sprite with shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(spriteX + 1, spriteY + 2, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.drawImage(itemSprite.canvas, spriteX - 16, spriteY - 16, 32, 32);
    } else {
      // Fallback: colored circle
      const color = ITEM_COLORS[invItem.type as ItemType] ?? '#dddddd';
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(spriteX + 1, spriteY + 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(spriteX, spriteY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // ======================== Industrial Progress Bar ========================

  private drawIndustrialProgress(gx: number, gy: number, building: Building, isWorking: boolean): void {
    const { ctx } = this;

    if (building.maxProgress <= 1) return;

    const barWidth = TILE_SIZE - 12;
    const barHeight = 5;
    const barX = gx * TILE_SIZE + 6;
    const barY = gy * TILE_SIZE + TILE_SIZE - 9;

    // Dark recessed housing
    ctx.fillStyle = 'rgba(15, 15, 25, 0.85)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Inner recess (darker)
    ctx.fillStyle = 'rgba(25, 25, 40, 0.9)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Tick marks (industrial scale)
    const tickCount = 8;
    for (let i = 0; i <= tickCount; i++) {
      const tx = barX + (i / tickCount) * barWidth;
      const tickH = i % 2 === 0 ? 3 : 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(tx, barY + barHeight - tickH, 0.5, tickH);
    }

    // Progress fill with amber/sodium color for working machines
    const progress = building.progress / building.maxProgress;

    if (progress > 0) {
      if (isWorking) {
        // Amber glow fill with subtle gradient
        const grad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        grad.addColorStop(0, 'rgba(255, 180, 80, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 150, 50, 0.85)');
        grad.addColorStop(1, 'rgba(220, 120, 30, 0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * progress, barHeight - 2);

        // Glow effect
        ctx.shadowColor = '#ffaa33';
        ctx.shadowBlur = 3;
        ctx.strokeStyle = 'rgba(255, 180, 80, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX + 1, barY + 1, (barWidth - 2) * progress, barHeight - 2);
        ctx.shadowBlur = 0;
      } else {
        // Idle: muted blue-gray
        ctx.fillStyle = 'rgba(80, 90, 120, 0.5)';
        ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * progress, barHeight - 2);
      }
    }

    // Top highlight line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(barX, barY, barWidth, 1);

    // Housing border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
  }

  // ======================== Player Rendering ========================

  private drawPlayer(gx: number, gy: number, facing: DirectionValue): void {
    const { ctx } = this;
    const spriteKey = facing === Dir.Up
      ? 'R-player-up'
      : facing === Dir.Down
        ? 'R-player-down'
        : 'R-player-side';

    const sprite = this.assetLoader.get(spriteKey);

    if (sprite) {
      ctx.drawImage(sprite.canvas, gx * TILE_SIZE, gy * TILE_SIZE);
    } else {
      this.drawPlayerFallback(gx, gy, facing);
    }
  }

  private drawPlayerFallback(gx: number, gy: number, facing: DirectionValue): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + TILE_SIZE / 2 - 4, TILE_SIZE / 2 - 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, TILE_SIZE / 2 - 6);
    bodyGrad.addColorStop(0, '#66aaff');
    bodyGrad.addColorStop(1, '#4488ff');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    switch (facing) {
      case Dir.Up: ctx.rotate(-Math.PI / 2); break;
      case Dir.Right: ctx.rotate(0); break;
      case Dir.Down: ctx.rotate(Math.PI / 2); break;
      case Dir.Left: ctx.rotate(Math.PI); break;
    }
    ctx.fillStyle = 'rgba(255, 220, 120, 0.95)';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-1, -5);
    ctx.lineTo(-1, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const pulse = Math.sin(this.frameCount * 0.05) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(68, 136, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ======================== Arrow Drawing ========================

  private drawArrow(cx: number, cy: number, direction: DirectionValue, size: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy);

    switch (direction) {
      case Dir.Up: ctx.rotate(-Math.PI / 2); break;
      case Dir.Right: ctx.rotate(0); break;
      case Dir.Down: ctx.rotate(Math.PI / 2); break;
      case Dir.Left: ctx.rotate(Math.PI); break;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(-size * 0.4, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ======================== Power Links ========================

  private drawPowerLinks(map: Tile[][], startTileX: number, startTileY: number, endTileX: number, endTileY: number): void {
    const { ctx } = this;
    const gens: { x: number; y: number }[] = [];
    const consumers: { x: number; y: number }[] = [];

    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const b = map[y][x].building;
        if (!b) continue;
        if (b.powerProduced && b.active) gens.push({ x, y });
        else if (b.powerConsumed > 0 && b.active) consumers.push({ x, y });
      }
    }

    if (gens.length === 0 || consumers.length === 0) return;

    const LINK_CAP = 6;

    for (const g of gens) {
      const sorted = [...consumers]
        .map(c => ({ c, d: Math.abs(c.x - g.x) + Math.abs(c.y - g.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LINK_CAP);

      for (const { c } of sorted) {
        const path = this.powerCable(g, c);
        ctx.strokeStyle = 'rgba(110, 200, 255, 0.10)';
        ctx.lineWidth = 2.5;
        this.tracePowerCable(path);
        ctx.stroke();

        const phase = (this.frameCount * 0.03 + g.x * 0.13 + g.y * 0.07) % 1;
        const p = this.powerPoint(path, phase);
        ctx.fillStyle = 'rgba(140, 220, 255, 0.85)';
        ctx.shadowColor = '#66ccff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const gcx = g.x * TILE_SIZE + TILE_SIZE / 2;
      const gcy = g.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(gcx, gcy, TILE_SIZE / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private powerCable(a: { x: number; y: number }, b: { x: number; y: number }) {
    const T = TILE_SIZE;
    return {
      ax: a.x * T + T / 2,
      ay: a.y * T + T / 2,
      bx: b.x * T + T / 2,
      by: b.y * T + T / 2,
      mx: b.x * T + T / 2,
      my: a.y * T + T / 2,
    };
  }

  private tracePowerCable(c: { ax: number; ay: number; bx: number; by: number; mx: number; my: number }): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(c.ax, c.ay);
    ctx.lineTo(c.mx, c.my);
    ctx.lineTo(c.bx, c.by);
  }

  private powerPoint(c: { ax: number; ay: number; bx: number; by: number; mx: number; my: number }, t: number): { x: number; y: number } {
    const seg1Len = Math.abs(c.mx - c.ax) + Math.abs(c.my - c.ay);
    const seg2Len = Math.abs(c.bx - c.mx) + Math.abs(c.by - c.my);
    const total = seg1Len + seg2Len || 1;
    const d = t * total;
    if (d <= seg1Len) {
      const f = seg1Len === 0 ? 0 : d / seg1Len;
      return { x: c.ax + (c.mx - c.ax) * f, y: c.ay + (c.my - c.ay) * f };
    }
    const f = seg2Len === 0 ? 0 : (d - seg1Len) / seg2Len;
    return { x: c.mx + (c.bx - c.mx) * f, y: c.my + (c.by - c.my) * f };
  }

  // ======================== Minimap ========================

  private drawMinimap(map: Tile[][], playerPos: { x: number; y: number } | undefined): void {
    const { ctx } = this;
    const minimapSize = 160;
    const scale = minimapSize / MAP_SIZE;
    const mx = this.canvas.width - minimapSize - 10;
    const my = this.canvas.height - minimapSize - 40;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mx - 2, my - 2, minimapSize + 4, minimapSize + 4);

    const terrainColors: Record<TerrainValue, string> = {
      grass: '#3a5a2e',
      forest: '#2d5a1e',
      sand: '#c4a35a',
      water: '#1a4a7a',
      rock: '#6a6a6a',
      dirt: '#6a5a3a',
    };

    for (let y = 0; y < MAP_SIZE; y += 2) {
      for (let x = 0; x < MAP_SIZE; x += 2) {
        const tile = map[y][x];
        ctx.fillStyle = terrainColors[tile.terrain] || '#3a5a2e';
        ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);

        if (tile.resource && tile.resource.amount > 0) {
          ctx.fillStyle = RESOURCE_COLORS[tile.resource.type] || '#888';
          ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);
        }

        if (tile.building) {
          const def = this.getBuildingDef(tile.building.type);
          ctx.fillStyle = def.color;
          ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);
        }
      }
    }

    if (playerPos) {
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(mx + playerPos.x * scale, my + playerPos.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ======================== Helpers ========================

  private getBuildingDef(type: string): { color: string; shape: string; name: string } {
    const defs: Record<string, { color: string; shape: string; name: string }> = {
      storage: { color: '#5b7a4f', shape: 'rect', name: 'Storage' },
      chest: { color: '#7a9a5f', shape: 'rect', name: 'Chest' },
      generator: { color: '#cc4400', shape: 'circle', name: 'Generator' },
      miner: { color: '#6666aa', shape: 'diamond', name: 'Miner' },
      conveyor: { color: '#444444', shape: 'arrow', name: 'Conveyor' },
      smelter: { color: '#ff4400', shape: 'rect', name: 'Smelter' },
      steel_smelter: { color: '#4444cc', shape: 'rect', name: 'Steel Furnace' },
      assembler: { color: '#00aa44', shape: 'diamond', name: 'Assembler' },
    };
    return defs[type] || { color: '#888', shape: 'rect', name: 'Unknown' };
  }
}
