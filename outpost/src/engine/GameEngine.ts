import {
  type Tile,
  type Item,
  type SaveData,
  type GameState,
  type PlayerState,
  type Building,
  type BuildingTypeValue,
  type DirectionValue,
  type ResourceTypeValue,
  BuildingTypeMap,
  Dir,
  BUILDING_DEFS,
  MAP_SIZE,
} from '../types';
import type { ItemType } from '../types';

// ==================== SEEDED PRNG ====================

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ==================== MAP GENERATION ====================

function generateMap(seed: number): Tile[][] {
  const rng = new SeededRandom(seed);
  const map: Tile[][] = [];

  for (let y = 0; y < MAP_SIZE; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      map[y][x] = { terrain: 'grass' };
    }
  }

  const waterCount = rng.nextInt(4, 8);
  for (let i = 0; i < waterCount; i++) {
    const cx = rng.nextInt(15, MAP_SIZE - 15);
    const cy = rng.nextInt(15, MAP_SIZE - 15);
    const radius = rng.nextInt(4, 10);
    placeWater(map, cx, cy, radius);
  }

  const rockCount = rng.nextInt(5, 12);
  for (let i = 0; i < rockCount; i++) {
    const cx = rng.nextInt(10, MAP_SIZE - 10);
    const cy = rng.nextInt(10, MAP_SIZE - 10);
    const radius = rng.nextInt(2, 5);
    placeRock(map, cx, cy, radius);
  }

  const forestCount = rng.nextInt(8, 15);
  for (let i = 0; i < forestCount; i++) {
    const cx = rng.nextInt(10, MAP_SIZE - 10);
    const cy = rng.nextInt(10, MAP_SIZE - 10);
    const radius = rng.nextInt(3, 7);
    placeForest(map, cx, cy, radius, rng);
  }

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].terrain === 'water') {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < MAP_SIZE && nx >= 0 && nx < MAP_SIZE && map[ny][nx].terrain === 'grass') {
              map[ny][nx].terrain = 'sand';
            }
          }
        }
      }
    }
  }

  placeResourceDeposits(map, rng);

  const startX = Math.floor(MAP_SIZE / 2);
  const startY = Math.floor(MAP_SIZE / 2);
  clearArea(map, startX, startY, 5);

  return map;
}

function placeWater(map: Tile[][], cx: number, cy: number, radius: number) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (y < 0 || y >= MAP_SIZE || x < 0 || x >= MAP_SIZE) continue;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) map[y][x].terrain = 'water';
    }
  }
}

function placeRock(map: Tile[][], cx: number, cy: number, radius: number) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (y < 0 || y >= MAP_SIZE || x < 0 || x >= MAP_SIZE) continue;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius) map[y][x].terrain = 'rock';
    }
  }
}

function placeForest(map: Tile[][], cx: number, cy: number, radius: number, rng: SeededRandom) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (y < 0 || y >= MAP_SIZE || x < 0 || x >= MAP_SIZE) continue;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius && map[y][x].terrain === 'grass' && rng.next() < 0.7) {
        map[y][x].terrain = 'forest';
      }
    }
  }
}

function placeResourceDeposits(map: Tile[][], rng: SeededRandom) {
  const depositTypes: { type: ResourceTypeValue; count: number; radiusRange: [number, number]; minDist: number }[] = [
    { type: 'stone', count: 12, radiusRange: [2, 5], minDist: 3 },
    { type: 'iron', count: 8, radiusRange: [2, 4], minDist: 4 },
    { type: 'copper', count: 6, radiusRange: [2, 3], minDist: 5 },
    { type: 'coal', count: 6, radiusRange: [2, 3], minDist: 5 },
    { type: 'gold', count: 3, radiusRange: [1, 2], minDist: 8 },
  ];

  for (const dep of depositTypes) {
    for (let i = 0; i < dep.count; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const cx = rng.nextInt(dep.minDist, MAP_SIZE - dep.minDist);
        const cy = rng.nextInt(dep.minDist, MAP_SIZE - dep.minDist);
        const radius = rng.nextInt(dep.radiusRange[0], dep.radiusRange[1]);
        if (canPlaceDeposit(map, cx, cy, radius)) {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (Math.abs(dx) + Math.abs(dy) <= radius + 1) {
                const ny = cy + dy;
                const nx = cx + dx;
                if (ny >= 0 && ny < MAP_SIZE && nx >= 0 && nx < MAP_SIZE) {
                  if ((map[ny][nx].terrain === 'grass' || map[ny][nx].terrain === 'sand') && !map[ny][nx].resource) {
                    map[ny][nx].resource = { type: dep.type, amount: rng.nextInt(50, 200) };
                  }
                }
              }
            }
          }
          break;
        }
        attempts++;
      }
    }
  }
}

function canPlaceDeposit(map: Tile[][], cx: number, cy: number, radius: number): boolean {
  for (let dy = -radius - 1; dy <= radius + 1; dy++) {
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const ny = cy + dy;
      const nx = cx + dx;
      if (ny < 0 || ny >= MAP_SIZE || nx < 0 || nx >= MAP_SIZE) return false;
      if (map[ny][nx].terrain === 'water' || map[ny][nx].terrain === 'rock') return false;
    }
  }
  return true;
}

function clearArea(map: Tile[][], cx: number, cy: number, radius: number) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (y < 0 || y >= MAP_SIZE || x < 0 || x >= MAP_SIZE) continue;
      map[y][x].terrain = 'grass';
      map[y][x].resource = undefined;
      map[y][x].building = undefined;
    }
  }
}

// ==================== BUILDING CREATION ====================

function createBuilding(type: BuildingTypeValue): Building {
  const def = BUILDING_DEFS[type];
  return {
    type,
    direction: Dir.Down,
    active: false,
    powerConsumed: def.powerConsumed,
    powerProduced: def.powerProduced,
    inventory: [{ type: 'stone', amount: 1 }],
    maxInventory: def.maxInventory,
    progress: 0,
    maxProgress: def.maxProgress,
    producesItem: def.producesItem,
    consumesItems: def.consumesItems,
    outputDirection: def.outputDirection,
  };
}

// ==================== GAME ENGINE ====================

export class GameEngine {
  private _state: GameState;

  constructor(seed: number = 42) {
    const map = generateMap(seed);
    const startX = Math.floor(MAP_SIZE / 2);
    const startY = Math.floor(MAP_SIZE / 2);

    this._state = {
      config: { tickRate: 10, paused: false },
      save: {
        seed,
        map,
        player: {
          x: startX,
          y: startY,
          inventory: [{ type: 'stone', amount: 5 }],
          maxInventorySlots: 20,
          stats: { stonesMined: 0, ingotsCrafted: 0, enginesCrafted: 0, timePlayed: 0 },
        },
        tick: 0,
        gameTime: 0,
        won: false,
      },
    };
  }

  get state(): GameState { return this._state; }
  get map(): Tile[][] { return this._state.save.map; }
  get player(): PlayerState { return this._state.save.player; }
  get tickCount(): number { return this._state.save.tick; }
  getConfig(): { tickRate: number; paused: boolean } { return { ...this._state.config }; }

  setPaused(paused: boolean): void { this._state.config.paused = paused; }
  setTickRate(rate: number): void { this._state.config.tickRate = Math.max(1, Math.min(20, rate)); }

  tick(): void {
    if (this._state.config.paused) return;
    this._state.save.tick++;
    this._state.save.gameTime++;
    this.updatePower();
    this.updateBuildings();
    this.updateConveyors();
    this.checkWinCondition();
  }

  private updatePower(): void {
    const p = this._state.save.player;
    const range = 30;
    let totalProduced = 0;
    let totalConsumed = 0;

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
        const tile = this._state.save.map[ny][nx];
        if (tile.building) {
          if (tile.building.powerProduced) totalProduced += tile.building.powerProduced;
          if (tile.building.powerConsumed) totalConsumed += tile.building.powerConsumed;
        }
      }
    }

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (tile.building) {
          tile.building.active = tile.building.powerProduced
            ? true
            : totalProduced >= totalConsumed;
        }
      }
    }
  }

  private updateBuildings(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building) continue;
        const b = tile.building;
        if (!b.active) continue;

        switch (b.type) {
          case BuildingTypeMap.miner: this.updateMiner(x, y, tile); break;
          case BuildingTypeMap.smelter:
          case BuildingTypeMap.steel_smelter: this.updateSmelter(x, y, tile); break;
          case BuildingTypeMap.assembler: this.updateAssembler(x, y, tile); break;
          case BuildingTypeMap.generator: this.updateGenerator(x, y, tile); break;
        }
      }
    }
  }

  private updateMiner(x: number, y: number, tile: Tile): void {
    const b = tile.building!;
    if (!tile.resource || tile.resource.amount <= 0) return;

    b.progress++;
    if (b.progress >= b.maxProgress) {
      b.progress = 0;
      tile.resource.amount--;
      if (tile.resource.amount < 0) tile.resource.amount = 0;
      this.addToInventory(b, { type: tile.resource.type, amount: 1 });
      b.producesItem = tile.resource.type;
      this.tryOutputToAdjacent(x, y, tile);
    }
  }

  private updateSmelter(x: number, y: number, tile: Tile): void {
    const b = tile.building!;
    if (!b.consumesItems) return;

    const hasAllItems = !b.consumesItems.some(c => {
      const invItem = this.getItemInInventory(b, c.type);
      return !invItem || invItem.amount < c.amount;
    });
    if (!hasAllItems) return;

    b.progress++;
    if (b.progress >= b.maxProgress) {
      b.progress = 0;
      for (const c of b.consumesItems) {
        this.removeItemFromInventory(b, c.type, c.amount);
      }
      if (b.producesItem) {
        this.addToInventory(b, { type: b.producesItem, amount: 1 });
      }
      this.tryOutputToAdjacent(x, y, tile);
    }
  }

  private updateAssembler(x: number, y: number, tile: Tile): void {
    const b = tile.building!;
    let produced = false;

    // Determine which recipe to run based on available ingredients (priority order)
    const recipe = this.getAssemblerRecipe(b);

    if (recipe) {
      b.progress++;
      if (b.progress >= recipe.threshold) {
        b.progress = 0;
        for (const c of recipe.inputs) {
          this.removeItemFromInventory(b, c.type, c.amount);
        }
        this.addToInventory(b, { type: recipe.output, amount: 1 });
        produced = true;
      }
    }

    if (produced) this.tryOutputToAdjacent(x, y, tile);
  }

  private getAssemblerRecipe(b: Building): { inputs: { type: string; amount: number }[]; output: ItemType; threshold: number } | null {
    // Copper wire: 1 copper -> 1 copper_wire (30 ticks)
    {
      const copper = this.getItemInInventory(b, 'copper');
      if (copper && copper.amount >= 1 && this.canAddToInventory(b, 'copper_wire')) {
        return { inputs: [{ type: 'copper', amount: 1 }], output: 'copper_wire' as ItemType, threshold: 30 };
      }
    }
    // Gears: 2 iron_ingot + 2 copper_wire -> 1 gear (40 ticks)
    {
      const ingot = this.getItemInInventory(b, 'iron_ingot');
      const wire = this.getItemInInventory(b, 'copper_wire');
      if (ingot && ingot.amount >= 2 && wire && wire.amount >= 2 && this.canAddToInventory(b, 'gear')) {
        return { inputs: [{ type: 'iron_ingot', amount: 2 }, { type: 'copper_wire', amount: 2 }], output: 'gear' as ItemType, threshold: 40 };
      }
    }
    // Engine: 1 steel_plate + 1 gear + 2 copper_wire -> 1 engine (80 ticks)
    {
      const steel = this.getItemInInventory(b, 'steel_plate');
      const gear = this.getItemInInventory(b, 'gear');
      const wire = this.getItemInInventory(b, 'copper_wire');
      if (steel && steel.amount >= 1 && gear && gear.amount >= 1 && wire && wire.amount >= 2 && this.canAddToInventory(b, 'engine')) {
        return { inputs: [{ type: 'steel_plate', amount: 1 }, { type: 'gear', amount: 1 }, { type: 'copper_wire', amount: 2 }], output: 'engine' as ItemType, threshold: 80 };
      }
    }
    return null;
  }

  private updateGenerator(_x: number, _y: number, tile: Tile): void {
    const b = tile.building!;
    const coal = this.getItemInInventory(b, 'coal');
    if (coal && coal.amount > 0) {
      b.active = true;
      this.removeItemFromInventory(b, 'coal', 1);
    } else {
      b.active = false;
    }
  }

  private updateConveyors(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building || tile.building.type !== BuildingTypeMap.conveyor) continue;

        const b = tile.building;
        const invItem = b.inventory[0];
        if (invItem && invItem.amount > 0) {
          b.progress++;
          if (b.progress >= b.maxProgress) {
            b.progress = 0;
            const dir = b.direction;
            const nextX = x + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
            const nextY = y + (dir === 0 ? -1 : dir === 2 ? 1 : 0);

            if (nextX >= 0 && nextX < MAP_SIZE && nextY >= 0 && nextY < MAP_SIZE) {
              const nextTile = this._state.save.map[nextY][nextX];
              if (nextTile.building && nextTile.building.type !== BuildingTypeMap.conveyor) {
                if (this.canAddToInventory(nextTile.building, invItem.type)) {
                  this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
                  invItem.amount--;
                }
              }
            }
          }
        }
      }
    }
  }

  private tryOutputToAdjacent(x: number, y: number, tile: Tile): void {
    const b = tile.building!;
    const dirs: DirectionValue[] = b.outputDirection ? [b.outputDirection] : [1, 2, 3, 0];

    for (const dir of dirs) {
      const nx = x + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
      const ny = y + (dir === 0 ? -1 : dir === 2 ? 1 : 0);
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;

      const nextTile = this._state.save.map[ny][nx];
      const invItem = this.getFirstItem(b);
      if (!invItem || invItem.amount <= 0) return;

      if (nextTile.building && nextTile.building.type === BuildingTypeMap.conveyor) {
        if (this.canAddToInventory(nextTile.building, invItem.type)) {
          this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
          invItem.amount--;
          return;
        }
        continue;
      }

      if (nextTile.building && (nextTile.building.type === BuildingTypeMap.storage || nextTile.building.type === BuildingTypeMap.chest)) {
        if (this.canAddToInventory(nextTile.building, invItem.type)) {
          this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
          invItem.amount--;
          return;
        }
        continue;
      }

      if (nextTile.building && (nextTile.building.type === BuildingTypeMap.smelter || nextTile.building.type === BuildingTypeMap.steel_smelter || nextTile.building.type === BuildingTypeMap.assembler)) {
        if (nextTile.building.consumesItems?.some(c => c.type === invItem.type)) {
          if (this.canAddToInventory(nextTile.building, invItem.type)) {
            this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
            invItem.amount--;
            return;
          }
        }
        continue;
      }
    }
  }

  // ==================== PLAYER ACTIONS ====================

  movePlayer(dx: number, dy: number): boolean {
    const p = this._state.save.player;
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return false;
    const tile = this._state.save.map[ny][nx];
    if (tile.terrain === 'water' || tile.terrain === 'rock') return false;
    if (tile.building) return false;
    p.x = nx;
    p.y = ny;
    return true;
  }

  mineResource(): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.resource && tile.resource.amount > 0) {
      tile.resource.amount--;
      if (tile.resource.amount < 0) tile.resource.amount = 0;
      this.addToPlayerInventory({ type: tile.resource.type, amount: 1 });
      p.stats.stonesMined++;
      return true;
    }
    return false;
  }

  mineTile(): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.terrain === 'rock') {
      this.addToPlayerInventory({ type: 'stone', amount: 1 });
      tile.terrain = 'grass';
      p.stats.stonesMined++;
      return true;
    }
    return false;
  }

  placeBuildingAt(buildingType: BuildingTypeValue, tx: number, ty: number): boolean {
    if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) return false;
    const tile = this._state.save.map[ty][tx];
    const p = this._state.save.player;
    const isPlayerTile = p.x === tx && p.y === ty;
    if (tile.building || (!isPlayerTile && (tile.terrain === 'water' || tile.terrain === 'rock'))) return false;

    const def = BUILDING_DEFS[buildingType];
    if (!this.canAfford(def.cost)) return false;

    for (const cost of def.cost) {
      this.removeItemFromPlayerInventory(cost.resource, cost.amount);
    }

    const building = createBuilding(buildingType);
    tile.building = building;
    
    // Move player off the tile if they were standing on it
    if (isPlayerTile) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
          const ntile = this._state.save.map[ny][nx];
          if (!ntile.building && ntile.terrain !== 'water' && ntile.terrain !== 'rock') {
            p.x = nx;
            p.y = ny;
            break;
          }
        }
      }
    }
    return true;
  }

  placeBuilding(buildingType: BuildingTypeValue): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.building || tile.terrain === 'water' || tile.terrain === 'rock') return false;

    const def = BUILDING_DEFS[buildingType];
    if (!this.canAfford(def.cost)) return false;

    for (const cost of def.cost) {
      this.removeItemFromPlayerInventory(cost.resource, cost.amount);
    }

    const building = createBuilding(buildingType);
    tile.building = building;
    return true;
  }

  removeBuilding(): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (!tile.building) return false;

    const def = BUILDING_DEFS[tile.building.type];
    if (def) {
      for (const cost of def.cost) {
        this.addToPlayerInventory({ type: cost.resource, amount: Math.floor(cost.amount / 2) });
      }
    }
    tile.building = undefined;
    return true;
  }

  rotateBuilding(): void {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.building) {
      tile.building.direction = ((tile.building.direction + 1) % 4) as DirectionValue;
    }
  }

  pickUpItem(): boolean {
    const p = this._state.save.player;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
        const tile = this._state.save.map[ny][nx];
        if (tile.building && tile.building.type !== BuildingTypeMap.conveyor) {
          const invItem = this.getFirstItem(tile.building);
          if (invItem && invItem.amount > 0) {
            this.addToPlayerInventory({ type: invItem.type, amount: 1 });
            invItem.amount--;
            return true;
          }
        }
      }
    }
    return false;
  }

  setBuildDirection(direction: DirectionValue): void {
    this._state.save.player._buildDirection = direction;
  }

  // ==================== INVENTORY HELPERS ====================

  private addToPlayerInventory(item: Item): void {
    const p = this._state.save.player;
    for (const invItem of p.inventory) {
      if (invItem.type === item.type) {
        invItem.amount += item.amount;
        return;
      }
    }
    if (p.inventory.length < p.maxInventorySlots) {
      p.inventory.push({ type: item.type, amount: item.amount });
    }
  }

  private removeItemFromPlayerInventory(type: string, amount: number): void {
    const p = this._state.save.player;
    let remaining = amount;
    for (let i = p.inventory.length - 1; i >= 0; i--) {
      if (remaining <= 0) break;
      const invItem = p.inventory[i];
      if (invItem.type === type) {
        const take = Math.min(invItem.amount, remaining);
        invItem.amount -= take;
        remaining -= take;
        if (invItem.amount <= 0) p.inventory.splice(i, 1);
      }
    }
    p.inventory = p.inventory.filter(i => i.amount > 0);
  }

  addToInventory(building: Building, item: Item): void {
    for (const invItem of building.inventory) {
      if (invItem.type === item.type) {
        const space = building.maxInventory - invItem.amount;
        if (space > 0) {
          invItem.amount += Math.min(space, item.amount);
          return;
        }
      }
    }
    if (building.inventory.length < building.maxInventory) {
      building.inventory.push({ type: item.type, amount: item.amount });
    }
  }

  private removeItemFromInventory(building: Building, type: string, amount: number): void {
    let remaining = amount;
    for (let i = 0; i < building.inventory.length; i++) {
      if (remaining <= 0) break;
      const invItem = building.inventory[i];
      if (invItem.type === type) {
        const take = Math.min(invItem.amount, remaining);
        invItem.amount -= take;
        remaining -= take;
        if (invItem.amount <= 0) {
          building.inventory.splice(i, 1);
          i--;
        }
      }
    }
  }

  getItemInInventory(building: Building, type: string): Item | undefined {
    return building.inventory.find(i => i.type === type);
  }

  canAddToInventory(building: Building, type: string): boolean {
    const item = this.getItemInInventory(building, type);
    if (item) return item.amount < building.maxInventory;
    return building.inventory.length < building.maxInventory;
  }

  getFirstItem(building: Building): Item | undefined {
    return building.inventory.find(i => i.amount > 0);
  }

  private getItemInPlayerInventory(type: string): Item | undefined {
    return this._state.save.player.inventory.find(i => i.type === type);
  }

  canAfford(cost: { resource: string; amount: number }[]): boolean {
    for (const c of cost) {
      const item = this.getItemInPlayerInventory(c.resource);
      if (!item || item.amount < c.amount) return false;
    }
    return true;
  }

  // ==================== SAVE/LOAD ====================

  save(): string { return JSON.stringify(this._state.save); }

  load(data: string): void { this._state.save = JSON.parse(data); }

  getSaveData(): SaveData { return this._state.save; }

  // ==================== WIN CONDITION ====================

  private checkWinCondition(): void {
    const p = this._state.save.player;
    if (p.stats.enginesCrafted >= 5 && !this._state.save.won) {
      this._state.save.won = true;
    }
  }

  getWinState(): boolean { return this._state.save.won; }
  resetWinState(): void { this._state.save.won = false; }

  getTile(x: number, y: number): Tile | undefined {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return undefined;
    return this._state.save.map[y][x];
  }

  getNearbyBuildings(x: number, y: number, radius: number): Tile[] {
    const result: Tile[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
        const tile = this._state.save.map[ny][nx];
        if (tile.building) result.push(tile);
      }
    }
    return result;
  }

  getPlayerPosition(): { x: number; y: number } {
    return { x: this._state.save.player.x, y: this._state.save.player.y };
  }
}
