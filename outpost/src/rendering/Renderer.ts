import {
  TILE_SIZE,
  MAP_SIZE,
  type Building,
  type Tile,
  type PlayerState,
  type TerrainValue,
  type ResourceTypeValue,
  type DirectionValue,
  RESOURCE_COLORS,
  Dir,
} from '../types';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RenderOptions {
  selectedTile: { x: number; y: number } | null;
  buildPreview: { x: number; y: number } | null;
  buildColor?: string;
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

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrainCache: Map<string, HTMLCanvasElement> = new Map();
  private particles: Particle[] = [];
  private frameCount = 0;
  private lastTickBuildings: Map<string, boolean> = new Map();
  private conveyorAnims: Map<string, ConveyorAnim> = new Map();
  private waterTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.generateTerrainTiles();
  }

  private generateTerrainTiles(): void {
    const terrains: TerrainValue[] = ['grass', 'forest', 'sand', 'water', 'rock'];

    for (const terrain of terrains) {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = TILE_SIZE;
      tileCanvas.height = TILE_SIZE;
      const ctx = tileCanvas.getContext('2d')!;

      switch (terrain) {
        case 'grass': {
          const shade = Math.random() * 0.15;
          ctx.fillStyle = `rgb(${50 + shade * 100}, ${120 + shade * 80}, ${40 + shade * 60})`;
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = `rgba(${30 + Math.random() * 30}, ${100 + Math.random() * 50}, ${20 + Math.random() * 30}, 0.3)`;
            ctx.fillRect(Math.random() * TILE_SIZE, Math.random() * TILE_SIZE, 2, 4);
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
          break;
        }
        case 'forest': {
          ctx.fillStyle = '#2d5a1e';
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(TILE_SIZE / 2 - 3, TILE_SIZE / 2, 6, TILE_SIZE / 2);
          ctx.fillStyle = '#1a4a0e';
          ctx.beginPath();
          ctx.arc(TILE_SIZE / 2, TILE_SIZE / 3, TILE_SIZE / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#2a6a1e';
          ctx.beginPath();
          ctx.arc(TILE_SIZE / 2 - 3, TILE_SIZE / 3 - 2, TILE_SIZE / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
          break;
        }
        case 'sand': {
          ctx.fillStyle = '#c4a35a';
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = `rgba(${180 + Math.random() * 40}, ${160 + Math.random() * 30}, ${80 + Math.random() * 40}, 0.3)`;
            ctx.beginPath();
            ctx.arc(Math.random() * TILE_SIZE, Math.random() * TILE_SIZE, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
          break;
        }
        case 'water': {
          ctx.fillStyle = '#1a4a7a';
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          const grad = ctx.createLinearGradient(0, 0, TILE_SIZE, TILE_SIZE);
          grad.addColorStop(0, 'rgba(42, 106, 154, 0.3)');
          grad.addColorStop(0.5, 'rgba(58, 122, 170, 0.2)');
          grad.addColorStop(1, 'rgba(42, 106, 154, 0.3)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
          break;
        }
        case 'rock': {
          ctx.fillStyle = '#6a6a6a';
          ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#7a7a7a';
          ctx.beginPath();
          ctx.moveTo(TILE_SIZE * 0.1, TILE_SIZE * 0.9);
          ctx.lineTo(TILE_SIZE * 0.3, TILE_SIZE * 0.2);
          ctx.lineTo(TILE_SIZE * 0.7, TILE_SIZE * 0.1);
          ctx.lineTo(TILE_SIZE * 0.9, TILE_SIZE * 0.5);
          ctx.lineTo(TILE_SIZE * 0.8, TILE_SIZE * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#5a5a5a';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
          break;
        }
      }

      this.terrainCache.set(terrain, tileCanvas);
    }
  }

  private spawnParticle(x: number, y: number, color: string, count: number = 5): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.5,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color,
        size: 1 + Math.random() * 2,
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

  render(map: Tile[][], player: PlayerState, camera: Camera, options: RenderOptions): void {
    this.frameCount++;
    this.waterTime += 0.05;

    const { ctx } = this;
    const { selectedTile, buildPreview, buildColor } = options;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    const startTileX = Math.floor(-camera.x / (TILE_SIZE * camera.zoom));
    const startTileY = Math.floor(-camera.y / (TILE_SIZE * camera.zoom));
    const endTileX = startTileX + Math.ceil(this.canvas.width / (TILE_SIZE * camera.zoom)) + 1;
    const endTileY = startTileY + Math.ceil(this.canvas.height / (TILE_SIZE * camera.zoom)) + 1;

    // Render terrain
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

    // Render resource deposits
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        if (tile.resource && tile.resource.amount > 0) {
          this.drawResource(x, y, tile.resource);
        }
      }
    }

    // Track building changes for particle effects
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
        this.spawnParticle(cx, cy, '#44ff44', 3);
      }
    }
    this.lastTickBuildings.clear();
    for (const [key, active] of currentTickBuildings) {
      this.lastTickBuildings.set(key, active);
    }

    // Render buildings
    for (let y = Math.max(0, startTileY); y < Math.min(MAP_SIZE, endTileY); y++) {
      for (let x = Math.max(0, startTileX); x < Math.min(MAP_SIZE, endTileX); x++) {
        const tile = map[y][x];
        if (tile.building) {
          this.drawBuilding(x, y, tile.building, map);
        }
      }
    }

    // Render player
    this.drawPlayer(player.x, player.y);

    // Render particles
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
        TILE_SIZE + 2
      );

      ctx.restore();
    }

    if (buildPreview && buildColor) {
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      const { x, y } = buildPreview;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = buildColor;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1.0;

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

    // Minimap
    this.drawMinimap(map, player ? { x: player.x, y: player.y } : undefined);

    this.updateParticles();
  }

  private drawResource(gx: number, gy: number, resource: { type: ResourceTypeValue; amount: number }): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;
    const color = RESOURCE_COLORS[resource.type] || '#888';
    const size = Math.max(4, Math.min(12, resource.amount / 20));
    const depletion = Math.max(0.3, resource.amount / 100);

    ctx.globalAlpha = depletion;
    ctx.fillStyle = color;

    // Glow effect
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

  private drawBuilding(gx: number, gy: number, building: Building, _map: Tile[][]): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;
    const def = this.getBuildingDef(building.type);
    const color = def.color;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(gx * TILE_SIZE + 3, gy * TILE_SIZE + 3, TILE_SIZE - 4, TILE_SIZE - 4);

    // Base
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(gx * TILE_SIZE + 2, gy * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    // Active glow
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
        // Top highlight
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

        // Smoke particles from generator when active
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
      case 'arrow': {
        // Animated conveyor
        const key = `${gx},${gy}`;
        if (!this.conveyorAnims.has(key)) {
          this.conveyorAnims.set(key, { offset: 0 });
        }
        const anim = this.conveyorAnims.get(key)!;
        if (building.active) {
          anim.offset = (anim.offset + 1) % 12;
        }

        this.drawConveyor(gx, gy, building.direction, anim.offset);
        break;
      }
    }

    // Progress bar with gradient
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

      // Bar highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(barX, barY, barWidth * progress, 1);
    }

    // Inventory count with background
    const totalItems = building.inventory.reduce((sum, i) => sum + i.amount, 0);
    if (totalItems > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.arc(cx, cy + 8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(totalItems), cx, cy + 8);
    }
    ctx.textBaseline = 'alphabetic';

    // Direction indicator for conveyors and miners
    if (building.type === 'conveyor' || building.type === 'miner') {
      this.drawArrow(cx, cy - 2, building.direction, 6);
    }

    // Power indicator
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

  private drawConveyor(gx: number, gy: number, direction: DirectionValue, animOffset: number): void {
    const { ctx } = this;
    const inset = 10;
    ctx.fillStyle = '#444444';
    ctx.fillRect(gx * TILE_SIZE + inset, gy * TILE_SIZE + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);

    // Animated lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 1.5;
    const lineCount = 4;
    for (let i = 0; i < lineCount; i++) {
      let offset = (i * (TILE_SIZE / lineCount) + animOffset) % TILE_SIZE;
      offset -= 10;

      ctx.beginPath();
      switch (direction) {
        case Dir.Up:
        case Dir.Down:
          ctx.moveTo(gx * TILE_SIZE + TILE_SIZE / 2, gy * TILE_SIZE + offset);
          ctx.lineTo(gx * TILE_SIZE + TILE_SIZE / 2, gy * TILE_SIZE + offset + 8);
          break;
        case Dir.Right:
        case Dir.Left:
          ctx.moveTo(gx * TILE_SIZE + offset, gy * TILE_SIZE + TILE_SIZE / 2);
          ctx.lineTo(gx * TILE_SIZE + offset + 8, gy * TILE_SIZE + TILE_SIZE / 2);
          break;
      }
      ctx.stroke();
    }
  }

  private drawArrow(cx: number, cy: number, direction: DirectionValue, size: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy);

    switch (direction) {
      case Dir.Up:
        ctx.rotate(-Math.PI / 2);
        break;
      case Dir.Right:
        ctx.rotate(0);
        break;
      case Dir.Down:
        ctx.rotate(Math.PI / 2);
        break;
      case Dir.Left:
        ctx.rotate(Math.PI);
        break;
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

  private drawPlayer(gx: number, gy: number): void {
    const { ctx } = this;
    const cx = gx * TILE_SIZE + TILE_SIZE / 2;
    const cy = gy * TILE_SIZE + TILE_SIZE / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + TILE_SIZE / 2 - 4, TILE_SIZE / 2 - 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyGrad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, TILE_SIZE / 2 - 6);
    bodyGrad.addColorStop(0, '#66aaff');
    bodyGrad.addColorStop(1, '#4488ff');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing ring
    const pulse = Math.sin(this.frameCount * 0.05) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(68, 136, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawMinimap(map: Tile[][], playerPos: { x: number; y: number } | undefined): void {
    const { ctx } = this;
    const minimapSize = 160;
    const scale = minimapSize / MAP_SIZE;
    const mx = this.canvas.width - minimapSize - 10;
    const my = this.canvas.height - minimapSize - 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mx - 2, my - 2, minimapSize + 4, minimapSize + 4);

    // Terrain
    const terrainColors: Record<TerrainValue, string> = {
      grass: '#3a5a2e',
      forest: '#2d5a1e',
      sand: '#c4a35a',
      water: '#1a4a7a',
      rock: '#6a6a6a',
    };

    for (let y = 0; y < MAP_SIZE; y += 2) {
      for (let x = 0; x < MAP_SIZE; x += 2) {
        const tile = map[y][x];
        ctx.fillStyle = terrainColors[tile.terrain] || '#3a5a2e';
        ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);

        // Resources
        if (tile.resource && tile.resource.amount > 0) {
          ctx.fillStyle = RESOURCE_COLORS[tile.resource.type] || '#888';
          ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);
        }

        // Buildings
        if (tile.building) {
          const def = this.getBuildingDef(tile.building.type);
          ctx.fillStyle = def.color;
          ctx.fillRect(mx + x * scale, my + y * scale, scale * 2 + 1, scale * 2 + 1);
        }
      }
    }

    // Player
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
