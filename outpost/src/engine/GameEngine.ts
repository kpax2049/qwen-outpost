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
  type ItemType,
  type PowerSummary,
  type BuildingInspection,
  type ConveyorConnection,
  BuildingTypeMap,
  Dir,
  BUILDING_DEFS,
  MAP_SIZE,
  RESOURCE_NAMES,
  BUILDING_NAMES,
  ITEM_DISPLAY_NAMES,
  DELTA,
  oppositeDirection,
  DIR_NAMES,
} from '../types';

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
    inventory: type === 'storage' || type === 'chest' ? [{ type: 'stone', amount: 1 }] : [],
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
          facing: Dir.Down,
          inventory: [{ type: 'wood', amount: 5 }, { type: 'stone', amount: 5 }],
          maxInventorySlots: 20,
          stats: { stonesMined: 0, woodChopped: 0, ingotsCrafted: 0, enginesCrafted: 0, ironIngotsCrafted: 0, copperWiresCrafted: 0, minersBuilt: 0, generatorsBuilt: 0, smeltersBuilt: 0, assemblersBuilt: 0, conveyorsBuilt: 0, timePlayed: 0 },
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
    this.updateGenerators();
    this.updatePowerGrid();
    this.updateBuildings();
    this.updateConveyors();
    this.updateStatusReasons();
    this.checkWinCondition();
  }

  /**
   * Burn one unit of coal per maxProgress ticks while the generator has fuel.
   * A generator is "active" (producing power) only while it has coal.
   */
  private updateGenerators(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building || tile.building.type !== BuildingTypeMap.generator) continue;
        const b = tile.building;
        const coal = this.getItemInInventory(b, 'coal');
        if (coal && coal.amount > 0) {
          b.active = true;
          b.progress++;
          if (b.progress >= b.maxProgress) {
            b.progress = 0;
            this.removeItemFromInventory(b, 'coal', 1);
            b.fuelBurned = (b.fuelBurned ?? 0) + 1;
          }
        } else {
          b.active = false;
          b.progress = 0;
        }
      }
    }
  }

  private _power: PowerSummary = { produced: 0, consumed: 0, surplus: 0, enough: false, generatorCount: 0, fueledGenerators: 0, consumerCount: 0 };

  /**
   * Global power grid. Produced power = active (fueled) generators only.
   * Consumers are powered when production covers consumption.
   *
   * Conveyor Belts are PASSIVE LOGISTICS — they do NOT consume or count
   * toward grid power. They are always active and run regardless of the
   * grid state. Only Miner / Smelter / Furnace / Assembler draw power.
   */
  private updatePowerGrid(): void {
    let totalProduced = 0;
    let totalConsumed = 0;
    let generatorCount = 0;
    let fueledGenerators = 0;
    let consumerCount = 0;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building) continue;
        const b = tile.building;

        // Conveyors are passive — never count toward power.
        if (b.type === BuildingTypeMap.conveyor) continue;

        if (b.powerProduced) {
          generatorCount++;
          if (b.active) {
            totalProduced += b.powerProduced;
            fueledGenerators++;
          }
        } else if (b.powerConsumed > 0) {
          totalConsumed += b.powerConsumed;
          consumerCount++;
        }
      }
    }

    const enough = totalProduced >= totalConsumed || (generatorCount === 0 && consumerCount === 0);
    this._power = {
      produced: totalProduced,
      consumed: totalConsumed,
      surplus: totalProduced - totalConsumed,
      enough,
      generatorCount,
      fueledGenerators,
      consumerCount,
    };

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building) continue;
        const b = tile.building;

        // Conveyors: always active (passive logistics).
        if (b.type === BuildingTypeMap.conveyor) {
          b.active = true;
          continue;
        }

        if (b.powerProduced) {
          // Generators: leave active as set by updateGenerators (fuel-driven)
        } else if (b.powerConsumed > 0) {
          b.active = enough;
        } else {
          b.active = true; // passive storage/chest
        }
      }
    }
  }

  getPowerSummary(): PowerSummary {
    this.updatePowerGrid();
    return { ...this._power };
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
        const p = this._state.save.player;
        if (b.producesItem === 'iron_ingot') { p.stats.ironIngotsCrafted++; p.stats.ingotsCrafted++; }
        else if (b.producesItem === 'steel_plate') { p.stats.ingotsCrafted++; }
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

    if (produced) {
      const p = this._state.save.player;
      if (recipe.output === 'copper_wire') { p.stats.copperWiresCrafted++; }
      else if (recipe.output === 'engine') { p.stats.enginesCrafted++; }
      this.tryOutputToAdjacent(x, y, tile);
    }
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

  private updateConveyors(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building || tile.building.type !== BuildingTypeMap.conveyor) continue;

        const b = tile.building;
        const invItem = b.inventory[0];

        // Compute blocked state while holding an item
        if (invItem && invItem.amount > 0) {
          const handoff = this.conveyorCanOutput(x, y, b, invItem.type);
          b.blocked = !handoff.ok;
          b.statusReason = handoff.ok ? undefined : handoff.reason;
        } else {
          b.blocked = false;
          b.statusReason = undefined;
        }

        if (!invItem || invItem.amount <= 0) {
          b.progress = 0;
          continue;
        }
        if (!b.active) {
          b.progress = 0;
          continue;
        }
        if (b.blocked) {
          continue; // belt is stalled; do not advance
        }

        b.progress++;
        if (b.progress >= b.maxProgress) {
          b.progress = 0;
          this.transferConveyorItem(x, y, b, invItem);
        }
      }
    }
  }

  /**
   * Can the item on this conveyor move to the tile in front of it next tick?
   */
  private conveyorCanOutput(x: number, y: number, b: Building, itemType: string): { ok: boolean; reason?: string } {
    const dir = b.direction;
    const nx = x + DELTA[dir].x;
    const ny = y + DELTA[dir].y;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) {
      return { ok: false, reason: 'Belt ends at the map edge' };
    }
    const nextTile = this._state.save.map[ny][nx];
    if (!nextTile.building) {
      return { ok: false, reason: 'Nothing ahead — belt ends' };
    }
    if (nextTile.building.type === BuildingTypeMap.conveyor) {
      const nextDir = nextTile.building.direction;
      if (nextDir === oppositeDirection(dir)) {
        return { ok: false, reason: 'Next belt points back — head-on conflict' };
      }
      if (this.canAddToInventory(nextTile.building, itemType)) {
        return { ok: true };
      }
      return { ok: false, reason: 'Next belt already full' };
    }
    if (this.canBuildingAccept(nextTile.building, itemType)) {
      return { ok: true };
    }
    return { ok: false, reason: `${BUILDING_NAMES[nextTile.building.type] ?? nextTile.building.type} will not accept items here` };
  }

  private transferConveyorItem(x: number, y: number, b: Building, invItem: Item): void {
    const dir = b.direction;
    const nx = x + DELTA[dir].x;
    const ny = y + DELTA[dir].y;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return;

    const nextTile = this._state.save.map[ny][nx];
    if (!nextTile.building) return;

    if (nextTile.building.type === BuildingTypeMap.conveyor) {
      const nextDir = nextTile.building.direction;
      if (nextDir === oppositeDirection(dir)) return; // head-on safe-guard
      if (this.canAddToInventory(nextTile.building, invItem.type)) {
        this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
        this.consumeOne(b, invItem);
      }
      return;
    }

    if (this.canBuildingAccept(nextTile.building, invItem.type)) {
      this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
      this.consumeOne(b, invItem);
    }
  }

  private consumeOne(building: Building, item: Item): void {
    item.amount--;
    if (item.amount <= 0) {
      building.inventory = building.inventory.filter(i => i !== item && i.amount > 0);
    }
  }

  /**
   * Whether a building can receive a given item type (has room and accepts it).
   */
  private canBuildingAccept(building: Building, itemType: string): boolean {
    if (!this.canAddToInventory(building, itemType)) return false;
    switch (building.type) {
      case BuildingTypeMap.storage:
      case BuildingTypeMap.chest:
        return true;
      case BuildingTypeMap.generator:
        return itemType === 'coal';
      case BuildingTypeMap.smelter:
      case BuildingTypeMap.steel_smelter:
        return !!building.consumesItems?.some(c => c.type === itemType);
      case BuildingTypeMap.assembler:
        return ['copper', 'iron_ingot', 'copper_wire', 'steel_plate', 'gear'].includes(itemType);
      case BuildingTypeMap.miner:
      case BuildingTypeMap.conveyor:
        return false;
    }
    return false;
  }

  private tryOutputToAdjacent(x: number, y: number, tile: Tile): void {
    const b = tile.building!;
    const dirs: DirectionValue[] = b.outputDirection ? [b.outputDirection] : [1, 2, 3, 0];

    // Prefer pushing the produced item out, then anything else stored.
    const prefer = b.producesItem ? this.getItemInInventory(b, b.producesItem) : undefined;
    const invItem = (prefer && prefer.amount > 0 ? prefer : this.getFirstItem(b)) ?? undefined;
    if (!invItem || invItem.amount <= 0) return;

    for (const dir of dirs) {
      const nx = x + DELTA[dir].x;
      const ny = y + DELTA[dir].y;
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;

      const nextTile = this._state.save.map[ny][nx];
      if (!nextTile.building) continue;

      if (nextTile.building.type === BuildingTypeMap.conveyor) {
        // Don't push into a conveyor facing back at us (would bounce).
        if (nextTile.building.direction === oppositeDirection(dir)) continue;
        if (this.canAddToInventory(nextTile.building, invItem.type)) {
          this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
          this.consumeOne(b, invItem);
          return;
        }
        continue;
      }

      if (this.canBuildingAccept(nextTile.building, invItem.type)) {
        this.addToInventory(nextTile.building, { type: invItem.type, amount: 1 });
        this.consumeOne(b, invItem);
        return;
      }
    }
  }

  // ==================== PLAYER ACTIONS ====================

  movePlayer(dx: number, dy: number): boolean {
    const p = this._state.save.player;
    if (dx !== 0 || dy !== 0) {
      p.facing = (dx === 1 ? Dir.Right : dx === -1 ? Dir.Left : dy === -1 ? Dir.Up : Dir.Down) as DirectionValue;
    }
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return false;
    const tile = this._state.save.map[ny][nx];
    if (tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'forest') return false;
    // Allow movement onto building tiles to interact with them (rotate/remove)
    p.x = nx;
    p.y = ny;
    return true;
  }

  getFacing(): DirectionValue {
    return this._state.save.player.facing;
  }

  getFacingTile(): { x: number; y: number } | null {
    const p = this._state.save.player;
    const delta = DELTA[p.facing];
    const nx = p.x + delta.x;
    const ny = p.y + delta.y;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return null;
    return { x: nx, y: ny };
  }

  getTileInteractive(x: number, y: number): boolean {
    const tile = this._state.save.map[y][x];
    if (!tile) return false;
    if (tile.resource && tile.resource.amount > 0) return true;
    return tile.terrain === 'rock' || tile.terrain === 'forest';
  }

  // The tile that pressing E will harvest.
  // Prefers the tile being faced; falls back to the tile under the player.
  getInteractiveTile(): { x: number; y: number } | null {
    const facing = this.getFacingTile();
    if (facing && this.getTileInteractive(facing.x, facing.y)) return facing;
    const p = this._state.save.player;
    if (this.getTileInteractive(p.x, p.y)) return { x: p.x, y: p.y };
    return null;
  }

  getInteractiveLabel(): string {
    const target = this.getInteractiveTile();
    if (!target) return '';
    const tile = this._state.save.map[target.y][target.x];
    if (tile.resource && tile.resource.amount > 0) return RESOURCE_NAMES[tile.resource.type];
    if (tile.terrain === 'rock') return 'Stone';
    if (tile.terrain === 'forest') return 'Wood';
    return '';
  }

  interact(): { x: number; y: number; kind: 'resource' | 'rock' | 'tree'; type: string } | null {
    const target = this.getInteractiveTile();
    if (!target) return null;
    const tile = this._state.save.map[target.y][target.x];

    if (tile.resource && tile.resource.amount > 0) {
      tile.resource.amount--;
      if (tile.resource.amount < 0) tile.resource.amount = 0;
      this.addToPlayerInventory({ type: tile.resource.type, amount: 1 });
      const p = this._state.save.player;
      p.stats.stonesMined++;
      if (tile.resource.type === 'wood') p.stats.woodChopped++;
      return { x: target.x, y: target.y, kind: 'resource', type: tile.resource.type };
    }

    if (tile.terrain === 'rock') {
      this.addToPlayerInventory({ type: 'stone', amount: 1 });
      tile.terrain = 'grass';
      this._state.save.player.stats.stonesMined++;
      return { x: target.x, y: target.y, kind: 'rock', type: 'stone' };
    }

    if (tile.terrain === 'forest') {
      this.addToPlayerInventory({ type: 'wood', amount: 1 });
      tile.terrain = 'grass';
      const p = this._state.save.player;
      p.stats.stonesMined++;
      p.stats.woodChopped++;
      return { x: target.x, y: target.y, kind: 'tree', type: 'wood' };
    }

    return null;
  }

  mineResource(): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.resource && tile.resource.amount > 0) {
      tile.resource.amount--;
      if (tile.resource.amount < 0) tile.resource.amount = 0;
      this.addToPlayerInventory({ type: tile.resource.type, amount: 1 });
      p.stats.stonesMined++;
      if (tile.resource.type === 'wood') p.stats.woodChopped++;
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
    if (tile.terrain === 'forest') {
      this.addToPlayerInventory({ type: 'wood', amount: 1 });
      tile.terrain = 'grass';
      p.stats.stonesMined++;
      p.stats.woodChopped++;
      return true;
    }
    return false;
  }

  placeBuildingAt(buildingType: BuildingTypeValue, tx: number, ty: number): boolean {
    if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) return false;
    const tile = this._state.save.map[ty][tx];
    const p = this._state.save.player;
    const isPlayerTile = p.x === tx && p.y === ty;
    if (tile.building || (!isPlayerTile && (tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'forest'))) return false;

    const def = BUILDING_DEFS[buildingType];
    if (!this.canAfford(def.cost)) return false;

    for (const cost of def.cost) {
      this.removeItemFromPlayerInventory(cost.resource, cost.amount);
    }

    const building = createBuilding(buildingType);
    // Apply the currently selected build direction (conveyor route preview).
    const buildDir = this._state.save.player._buildDirection;
    if (buildDir !== undefined) {
      building.direction = buildDir;
    }
    tile.building = building;
    
    // Move player off the tile if they were standing on it
    if (isPlayerTile) {
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
          const ntile = this._state.save.map[ny][nx];
          if (!ntile.building && ntile.terrain !== 'water' && ntile.terrain !== 'rock' && ntile.terrain !== 'forest') {
            p.x = nx;
            p.y = ny;
            break;
          }
        }
      }
    }
    this._state.save.player.stats[`${building.type}sBuilt`] = (this._state.save.player.stats[`${building.type}sBuilt`] as number) + 1;
    return true;
  }

  placeBuilding(buildingType: BuildingTypeValue): boolean {
    const p = this._state.save.player;
    const tile = this._state.save.map[p.y][p.x];
    if (tile.building || tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'forest') return false;

    const def = BUILDING_DEFS[buildingType];
    if (!this.canAfford(def.cost)) return false;

    for (const cost of def.cost) {
      this.removeItemFromPlayerInventory(cost.resource, cost.amount);
    }

    const building = createBuilding(buildingType);
    const buildDir = this._state.save.player._buildDirection;
    if (buildDir !== undefined) {
      building.direction = buildDir;
    }
    tile.building = building;
    this._state.save.player.stats[`${building.type}sBuilt`] = (this._state.save.player.stats[`${building.type}sBuilt`] as number) + 1;
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
            this.consumeOne(tile.building, invItem);
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

  getBuildDirection(): DirectionValue {
    return this._state.save.player._buildDirection ?? Dir.Down;
  }

  // ==================== BUILDING OBSERVABILITY ====================

  /**
   * Whether a building can be placed at (tx,ty) given terrain/building occupancy.
   * Does not check cost or player proximity.
   */
  canPlaceAt(buildingType: BuildingTypeValue, tx: number, ty: number): { ok: boolean; reason?: string } {
    if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) {
      return { ok: false, reason: 'Outside the map' };
    }
    const tile = this._state.save.map[ty][tx];
    const p = this._state.save.player;
    const isPlayerTile = p.x === tx && p.y === ty;
    if (tile.building) return { ok: false, reason: 'Tile already has a building' };
    if (!isPlayerTile && (tile.terrain === 'water' || tile.terrain === 'rock' || tile.terrain === 'forest')) {
      return { ok: false, reason: 'Cannot build on terrain' };
    }
    if (!this.canAfford(BUILDING_DEFS[buildingType].cost)) {
      return { ok: false, reason: 'Not enough resources' };
    }
    return { ok: true };
  }

  /**
   * Connection info for the tile in front of a conveyor (following its direction).
   */
  private getOutConnection(x: number, y: number, b: Building): ConveyorConnection {
    const dir = b.direction;
    const nx = x + DELTA[dir].x;
    const ny = y + DELTA[dir].y;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) {
      return { kind: 'none', label: 'Open end (map edge)' };
    }
    const nextTile = this._state.save.map[ny][nx];
    if (!nextTile.building) {
      return { kind: 'none', label: 'Open end' };
    }
    if (nextTile.building.type === BuildingTypeMap.conveyor) {
      const nd = nextTile.building.direction;
      if (nd === dir) return { kind: 'straight', label: 'Straight on' };
      if (nd === oppositeDirection(dir)) return { kind: 'headon', label: 'Points back at this belt — blocked' };
      return {
        kind: 'turn',
        label: `Turns ${DIR_NAMES[nd].toLowerCase()}`,
        toDir: nd,
      };
    }
    return {
      kind: 'machine',
      label: BUILDING_NAMES[nextTile.building.type] ?? nextTile.building.type,
      machineType: nextTile.building.type,
    };
  }

  /**
   * §3.2 — Compute the incoming side for a conveyor at (x, y).
   *
   * Scans the four cardinal neighbor tiles. A neighbor at side D feeds this
   * tile when the neighbor is a conveyor whose direction points INTO (x, y).
   *
   * Priority (tiebreaker for display only): North > East > South > West
   * (i.e. scan order).
   *
   * Returns the DirectionValue of the side from which the first valid
   * incoming belt enters, or undefined when no belt feeds this tile.
   */
  computeIncomingSide(x: number, y: number): DirectionValue | undefined {
    const scanOrder: DirectionValue[] = [Dir.Up, Dir.Right, Dir.Down, Dir.Left];
    for (const D of scanOrder) {
      const nx = x + DELTA[D].x;
      const ny = y + DELTA[D].y;
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      const tile = this._state.save.map[ny][nx];
      if (tile.building?.type === BuildingTypeMap.conveyor) {
        // Neighbor points INTO this tile when its direction equals opposite(D)
        if (tile.building.direction === oppositeDirection(D)) {
          return D;
        }
      }
    }
    return undefined;
  }

  /**
   * §2.3 — Flow for a belt tile (internal, not persisted).
   *
   * Returns { output, incomingSide } where output is the belt's
   * authoritative direction and incomingSide is derived from neighbor
   * topology (§3.2).
   */
  getBeltFlow(x: number, y: number): { output: DirectionValue; incomingSide?: DirectionValue } | null {
    const tile = this._state.save.map[y]?.[x];
    if (!tile?.building || tile.building.type !== BuildingTypeMap.conveyor) return null;
    return {
      output: tile.building.direction,
      incomingSide: this.computeIncomingSide(x, y),
    };
  }

  /**
   * Connection info for what feeds into this conveyor:
   *   - a belt from a perpendicular neighbor pointing into this tile (turn / elbow)
   *   - a belt from the opposite side pointing the same way (straight feed)
   *
   * Uses directional connectivity (§3.1): a neighbor feeds this tile iff
   * neighbor.direction === opposite(D) where D is the side direction
   * from this tile toward the neighbor.
   */
  private getInConnection(x: number, y: number, b: Building): ConveyorConnection | null {
    // §3.2 — Scan all four cardinal sides for belts whose direction points INTO this tile.
    // Priority: North > East > South > West (scan order).
    const scanOrder: DirectionValue[] = [Dir.Up, Dir.Right, Dir.Down, Dir.Left];
    for (const side of scanOrder) {
      const nx = x + DELTA[side].x;
      const ny = y + DELTA[side].y;
      if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
      const tile = this._state.save.map[ny][nx];
      if (tile.building?.type !== BuildingTypeMap.conveyor) continue;
      const nd = tile.building.direction;
      // Neighbor feeds this tile when its direction points into (x, y).
      if (nd !== oppositeDirection(side)) continue;

      // Determine geometry relationship.
      if (nd === b.direction) {
        // Same direction — straight feed through (entry from opposite side).
        return { kind: 'straight', label: 'Straight feed from behind' };
      }

      // Perpendicular — elbow entry.
      return {
        kind: 'turn',
        label: `Enters via a turn from ${DIR_NAMES[nd].toLowerCase()}`,
        toDir: nd,
      };
    }

    return null;
  }

  /**
   * §8.4 — Rotate a conveyor at an arbitrary tile (remote rotation).
   *
   * Called from the InspectionPanel's rotate button. Does not require
   * the player to be standing on the tile.
   */
  rotateBuildingAt(x: number, y: number): void {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return;
    const tile = this._state.save.map[y][x];
    if (!tile.building || tile.building.type !== BuildingTypeMap.conveyor) return;
    tile.building.direction = ((tile.building.direction + 1) % 4) as DirectionValue;
  }

  /**
   * Per-building status reason used by the inspection panel (and stored each tick).
   */
  private computeBuildingStatus(x: number, y: number, b: Building): { status: string; statusColor: 'ok' | 'warn' | 'bad' } {
    const total = b.inventory.reduce((s, i) => s + i.amount, 0);

    switch (b.type) {
      case BuildingTypeMap.generator: {
        const coal = this.getItemInInventory(b, 'coal');
        if (!coal || coal.amount <= 0) return { status: 'No Fuel', statusColor: 'bad' };
        return { status: `Producing ${b.powerProduced ?? 0} power`, statusColor: 'ok' };
      }
      case BuildingTypeMap.miner: {
        const tile = this._state.save.map[y][x];
        if (!b.active) return { status: 'No Power', statusColor: 'bad' };
        if (!tile.resource || tile.resource.amount <= 0) return { status: 'No Resource Below', statusColor: 'warn' };
        if (total >= b.maxInventory) return { status: 'Output Blocked (inventory full)', statusColor: 'bad' };
        return { status: 'Mining', statusColor: 'ok' };
      }
      case BuildingTypeMap.conveyor: {
        const invItem = b.inventory[0];
        if (!invItem || invItem.amount <= 0) return { status: 'Idle — waiting for item', statusColor: 'warn' };
        if (b.blocked) return { status: b.statusReason ?? 'Blocked', statusColor: 'bad' };
        return { status: 'Transporting', statusColor: 'ok' };
      }
      case BuildingTypeMap.smelter:
      case BuildingTypeMap.steel_smelter: {
        if (!b.active) return { status: 'No Power', statusColor: 'bad' };
        if (!b.consumesItems) return { status: 'Idle', statusColor: 'warn' };
        const missing = b.consumesItems.filter(c => {
          const inv = this.getItemInInventory(b, c.type);
          return !inv || inv.amount < c.amount;
        });
        if (missing.length > 0) {
          const names = missing.map(c => `${c.amount}x ${ITEM_DISPLAY_NAMES[c.type] ?? c.type}`);
          return { status: `Waiting for Input (${names.join(', ')})`, statusColor: 'warn' };
        }
        if (b.producesItem && !this.canAddToInventory(b, b.producesItem)) {
          return { status: 'Output Blocked (full)', statusColor: 'bad' };
        }
        return { status: 'Smelting', statusColor: 'ok' };
      }
      case BuildingTypeMap.assembler: {
        if (!b.active) return { status: 'No Power', statusColor: 'bad' };
        // Determine what the next craftable recipe needs.
        const recipes: { inputs: { type: string; amount: number }[]; output: string }[] = [
          { inputs: [{ type: 'copper', amount: 1 }], output: 'copper_wire' },
          { inputs: [{ type: 'iron_ingot', amount: 2 }, { type: 'copper_wire', amount: 2 }], output: 'gear' },
          { inputs: [{ type: 'steel_plate', amount: 1 }, { type: 'gear', amount: 1 }, { type: 'copper_wire', amount: 2 }], output: 'engine' },
        ];
        const ready = recipes.find(r => {
          const has = r.inputs.every(c => {
            const inv = this.getItemInInventory(b, c.type);
            return inv && inv.amount >= c.amount;
          });
          return has && this.canAddToInventory(b, r.output);
        });
        if (!ready) {
          const needed = recipes.filter(r => r.inputs.every(c => {
            const inv = this.getItemInInventory(b, c.type);
            return inv && inv.amount >= c.amount;
          }));
          if (needed.length > 0) {
            return { status: 'Output Blocked (output full)', statusColor: 'bad' };
          }
          const want = recipes[0].inputs.map(c => `${c.amount}x ${ITEM_DISPLAY_NAMES[c.type as ItemType] ?? c.type}`).join(', ');
          return { status: `Waiting for Input (e.g. ${want})`, statusColor: 'warn' };
        }
        return { status: 'Crafting', statusColor: 'ok' };
      }
      case BuildingTypeMap.storage:
      case BuildingTypeMap.chest:
        return { status: total > 0 ? `${total} / ${b.maxInventory} items stored` : 'Empty', statusColor: 'ok' };
    }
    return { status: 'Idle', statusColor: 'warn' };
  }

  /** Refresh statusReason/blocked on every building each tick (kept fresh for UI). */
  private updateStatusReasons(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (!tile.building) continue;
        const b = tile.building;
        const { status } = this.computeBuildingStatus(x, y, b);
        b.statusReason = status;
        if (b.type === BuildingTypeMap.conveyor && b.inventory[0]) {
          b.blocked = b.blocked ?? false;
        }
      }
    }
  }

  /**
   * Compute the output direction for each cell in a drag route path.
   *
   * Mirrors the direction assignment logic in the App layer:
   *   - If there is a next cell, the direction is along the path to that cell.
   *   - Otherwise (last cell), the build direction is used.
   *
   * @param path - Ordered list of tiles forming the route.
   * @param lastDir - Build direction used when no next cell exists (last cell).
   * @returns Array of directions, one per cell. Same length as path.
   */
  static computeRouteDirections(path: { x: number; y: number }[], lastDir: DirectionValue): DirectionValue[] {
    const dirs: DirectionValue[] = [];
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      const next = path[i + 1];
      const dir: DirectionValue =
        next && next.x !== cell.x ? (next.x > cell.x ? Dir.Right : Dir.Left)
        : next ? (next.y > cell.y ? Dir.Down : Dir.Up)
        : lastDir;
      dirs.push(dir);
    }
    return dirs;
  }

  getConnections(x: number, y: number): { incoming: ConveyorConnection | null; outgoing: ConveyorConnection } | null {
    const tile = this._state.save.map[y]?.[x];
    if (!tile?.building || tile.building.type !== BuildingTypeMap.conveyor) return null;
    return {
      incoming: this.getInConnection(x, y, tile.building),
      outgoing: this.getOutConnection(x, y, tile.building),
    };
  }

  inspectBuilding(x: number, y: number): BuildingInspection | null {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null;
    const tile = this._state.save.map[y][x];
    if (!tile.building) return null;
    const b = tile.building;
    const def = BUILDING_DEFS[b.type];
    const { status, statusColor } = this.computeBuildingStatus(x, y, b);
    const totalItems = b.inventory.reduce((s, i) => s + i.amount, 0);
    const p = this._state.save.player;

    const data: BuildingInspection = {
      x,
      y,
      type: b.type,
      name: def.name,
      direction: b.direction,
      directionLabel: `${DIR_NAMES[b.direction]} ${['\u25B2', '\u25B6', '\u25BC', '\u25C0'][b.direction]}`,
      active: b.active,
      status,
      statusColor,
      blocked: !!b.blocked,
      inventory: b.inventory.map(i => ({ ...i })),
      usedSlots: totalItems,
      maxInventory: b.maxInventory,
      progress: b.progress,
      maxProgress: b.maxProgress,
      progressPct: b.maxProgress > 1 ? Math.min(100, Math.floor((b.progress / b.maxProgress) * 100)) : 0,
      powerConsumed: b.powerConsumed,
      powerProduced: b.powerProduced ?? 0,
      producesItem: b.producesItem ? RESOURCE_NAMES[b.producesItem as ResourceTypeValue] ?? b.producesItem : undefined,
      consumesItems: b.consumesItems?.map(c => ({ ...c })),
      isPlayerStanding: p.x === x && p.y === y,
    };

    if (b.type === BuildingTypeMap.miner) {
      if (tile.resource) {
        data.resourceOnTile = { type: RESOURCE_NAMES[tile.resource.type] ?? tile.resource.type, amount: tile.resource.amount };
      }
    }

    if (b.type === BuildingTypeMap.generator) {
      const coal = this.getItemInInventory(b, 'coal');
      data.fuelCoal = coal?.amount ?? 0;
      data.fuelPct = b.maxProgress > 1 ? Math.min(100, Math.floor(((b.maxProgress - b.progress) / b.maxProgress) * 100)) : 0;
      data.fuelBurned = b.fuelBurned ?? 0;
    }

    if (b.type === BuildingTypeMap.conveyor) {
      data.connection = {
        incoming: this.getInConnection(x, y, b),
        outgoing: this.getOutConnection(x, y, b),
      };
      data.beltItem = b.inventory[0]?.amount > 0 ? (ITEM_DISPLAY_NAMES[b.inventory[0].type as ItemType] ?? b.inventory[0].type) : null;
    }

    return data;
  }

  /**
   * Deposit one item of `type` from the player's inventory into a building they can reach (inspected).
   */
  depositItemToBuilding(x: number, y: number, type: string): boolean {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
    const tile = this._state.save.map[y][x];
    if (!tile.building) return false;
    const p = this._state.save.player;
    const nearby = Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1;
    if (!nearby) return false;

    if (!this.canBuildingAccept(tile.building, type)) return false;
    if (!this.canAddToInventory(tile.building, type)) return false;
    const playerItem = this.getItemInPlayerInventory(type);
    if (!playerItem || playerItem.amount <= 0) return false;

    this.addToInventory(tile.building, { type: type as ItemType, amount: 1 });
    this.removeItemFromPlayerInventory(type, 1);
    return true;
  }

  buildingAcceptsItem(x: number, y: number, type: string): boolean {
    const tile = x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE ? this._state.save.map[y][x] : undefined;
    if (!tile?.building) return false;
    return this.canBuildingAccept(tile.building, type) && this.canAddToInventory(tile.building, type);
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

  countBuildings(type?: BuildingTypeValue): number {
    let count = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = this._state.save.map[y][x];
        if (tile.building && (!type || tile.building.type === type)) count++;
      }
    }
    return count;
  }

  getPlayerPosition(): { x: number; y: number } {
    return { x: this._state.save.player.x, y: this._state.save.player.y };
  }
}
