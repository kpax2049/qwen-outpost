// ==================== CORE TYPES ====================

export const TILE_SIZE = 48;
export const MAP_SIZE = 120;

// Terrain types
export type Terrain = 'grass' | 'forest' | 'water' | 'rock' | 'sand' | 'dirt';

export const TerrainMap = {
  grass: 'grass',
  forest: 'forest',
  water: 'water',
  rock: 'rock',
  sand: 'sand',
  dirt: 'dirt',
} as const;

export type TerrainValue = typeof TerrainMap[keyof typeof TerrainMap];

// Resource types
export type ResourceType = 'wood' | 'stone' | 'iron' | 'copper' | 'coal' | 'gold';

export const ResourceTypeMap = {
  wood: 'wood',
  stone: 'stone',
  iron: 'iron',
  copper: 'copper',
  coal: 'coal',
  gold: 'gold',
} as const;

export type ResourceTypeValue = typeof ResourceTypeMap[keyof typeof ResourceTypeMap];

export const RESOURCE_COLORS: Record<ResourceTypeValue, string> = {
  wood: '#8a5a2a',
  stone: '#8a8a8a',
  iron: '#a0522d',
  copper: '#b87333',
  coal: '#2a2a2a',
  gold: '#ffd700',
};

export const RESOURCE_NAMES: Record<ResourceTypeValue, string> = {
  wood: 'Wood',
  stone: 'Stone',
  iron: 'Iron Ore',
  copper: 'Copper Ore',
  coal: 'Coal',
  gold: 'Gold Ore',
};

// Item types
export type ItemType = ResourceTypeValue
  | 'iron_ingot'
  | 'copper_wire'
  | 'steel_plate'
  | 'circuit'
  | 'gear'
  | 'engine';

export const ItemTypeMap = {
  wood: 'wood',
  stone: 'stone',
  iron: 'iron',
  copper: 'copper',
  coal: 'coal',
  gold: 'gold',
  iron_ingot: 'iron_ingot',
  copper_wire: 'copper_wire',
  steel_plate: 'steel_plate',
  circuit: 'circuit',
  gear: 'gear',
  engine: 'engine',
} as const;

export const ITEM_DISPLAY_NAMES: Record<ItemType, string> = {
  wood: 'Wood',
  stone: 'Stone',
  iron: 'Iron Ore',
  copper: 'Copper Ore',
  coal: 'Coal',
  gold: 'Gold Ore',
  iron_ingot: 'Iron Ingot',
  copper_wire: 'Copper Wire',
  steel_plate: 'Steel Plate',
  circuit: 'Circuit Board',
  gear: 'Gear',
  engine: 'Engine',
};

export const ITEM_COLORS: Record<ItemType, string> = {
  wood: '#8a5a2a',
  stone: '#8a8a8a',
  iron: '#a0522d',
  copper: '#b87333',
  coal: '#2a2a2a',
  gold: '#ffd700',
  iron_ingot: '#c0c0c0',
  copper_wire: '#e67300',
  steel_plate: '#4a4a6a',
  circuit: '#00cc44',
  gear: '#b0b0b0',
  engine: '#ff6600',
};

// Item interface
export interface Item {
  type: ItemType;
  amount: number;
}

// Directions
export type Direction = 0 | 1 | 2 | 3;

export const Dir = {
  Up: 0,
  Right: 1,
  Down: 2,
  Left: 3,
} as const;

export type DirectionValue = typeof Dir[keyof typeof Dir];

export const DELTA: Record<DirectionValue, { x: number; y: number }> = {
  [Dir.Up]: { x: 0, y: -1 },
  [Dir.Right]: { x: 1, y: 0 },
  [Dir.Down]: { x: 0, y: 1 },
  [Dir.Left]: { x: -1, y: 0 },
};

export const DIR_NAMES: Record<DirectionValue, string> = {
  [Dir.Up]: 'Up',
  [Dir.Right]: 'Right',
  [Dir.Down]: 'Down',
  [Dir.Left]: 'Left',
};

export const DIR_ARROWS: Record<DirectionValue, string> = {
  [Dir.Up]: '\u25B2', // ▲
  [Dir.Right]: '\u25B6', // ▶
  [Dir.Down]: '\u25BC', // ▼
  [Dir.Left]: '\u25C0', // ◀
};

export function oppositeDirection(dir: DirectionValue): DirectionValue {
  return ((dir + 2) % 4) as DirectionValue;
}

export function directionVector(dir: DirectionValue): { x: number; y: number } {
  return DELTA[dir];
}

// Tile on the world map
export interface Tile {
  terrain: TerrainValue;
  resource?: {
    type: ResourceTypeValue;
    amount: number;
  };
  building?: Building;
}

// ==================== BUILDING TYPES ====================

export type BuildingType =
  | 'storage'
  | 'chest'
  | 'generator'
  | 'miner'
  | 'conveyor'
  | 'smelter'
  | 'steel_smelter'
  | 'assembler';

export const BuildingTypeMap = {
  storage: 'storage',
  chest: 'chest',
  generator: 'generator',
  miner: 'miner',
  conveyor: 'conveyor',
  smelter: 'smelter',
  steel_smelter: 'steel_smelter',
  assembler: 'assembler',
} as const;

export type BuildingTypeValue = typeof BuildingTypeMap[keyof typeof BuildingTypeMap];

// ==================== ASSEMBLER RECIPES ====================

export type AsmRecipe = 'copper_wire' | 'gear' | 'engine';

export interface AsmRecipeDef {
  output: ItemType;
  inputs: { type: ItemType; amount: number }[];
  threshold: number;
  label: string;
}

export const ASM_RECIPES: Record<AsmRecipe, AsmRecipeDef> = {
  copper_wire: {
    output: 'copper_wire',
    inputs: [{ type: 'copper', amount: 1 }],
    threshold: 30,
    label: 'Copper Wire',
  },
  gear: {
    output: 'gear',
    inputs: [{ type: 'iron_ingot', amount: 2 }, { type: 'copper_wire', amount: 2 }],
    threshold: 40,
    label: 'Gear',
  },
  engine: {
    output: 'engine',
    inputs: [{ type: 'steel_plate', amount: 1 }, { type: 'gear', amount: 1 }, { type: 'copper_wire', amount: 2 }],
    threshold: 80,
    label: 'Engine',
  },
};

export const ASM_RECIPE_ORDER: AsmRecipe[] = ['copper_wire', 'gear', 'engine'];

export interface Building {
  type: BuildingTypeValue;
  direction: DirectionValue;
  active: boolean;
  powerConsumed: number;
  powerProduced?: number;
  inventory: Item[];
  maxInventory: number;
  progress: number;
  maxProgress: number;
  producesItem?: ItemType;
  consumesItems?: { type: ItemType; amount: number }[];
  outputDirection?: DirectionValue;
  /** Coal consumed by this generator (observable fuel history). */
  fuelBurned?: number;
  /** True when this conveyor/machine is holding an item it cannot push forward. */
  blocked?: boolean;
  /** Human-readable reason a machine is not progressing. */
  statusReason?: string;
  /** For assemblers: which recipe this building is crafting. */
  selectedRecipe?: AsmRecipe;
}

export interface PlayerState {
  x: number;
  y: number;
  facing: DirectionValue;
  inventory: Item[];
  maxInventorySlots: number;
  stats: {
    stonesMined: number;
    woodChopped: number;
    ingotsCrafted: number;
    enginesCrafted: number;
    ironIngotsCrafted: number;
    copperWiresCrafted: number;
    minersBuilt: number;
    generatorsBuilt: number;
    smeltersBuilt: number;
    assemblersBuilt: number;
    conveyorsBuilt: number;
    timePlayed: number;
  };
  _buildDirection?: DirectionValue;
}

// ==================== GAME STATE ====================

export interface SaveData {
  seed: number;
  map: Tile[][];
  player: PlayerState;
  tick: number;
  gameTime: number;
  won: boolean;
}

export interface GameConfig {
  tickRate: number;
  paused: boolean;
}

export interface GameState {
  config: GameConfig;
  save: SaveData;
}

// ==================== BUILDING DEFINITIONS ====================

export interface BuildingDefinition {
  type: BuildingTypeValue;
  name: string;
  description: string;
  cost: { resource: ItemType; amount: number }[];
  powerConsumed: number;
  powerProduced?: number;
  maxInventory: number;
  maxProgress: number;
  producesItem?: ItemType;
  consumesItems?: { type: ItemType; amount: number }[];
  outputDirection?: DirectionValue;
  color: string;
  shape: 'rect' | 'circle' | 'diamond' | 'arrow';
}

export const BUILDING_DEFS: Record<BuildingTypeValue, BuildingDefinition> = {
  storage: {
    type: 'storage',
    name: 'Storage Container',
    description: 'Stores up to 100 items of any type.',
    cost: [{ resource: 'stone', amount: 5 }],
    powerConsumed: 0,
    maxInventory: 100,
    maxProgress: 1,
    color: '#5b7a4f',
    shape: 'rect',
  },
  chest: {
    type: 'chest',
    name: 'Small Chest',
    description: 'Stores up to 20 items.',
    cost: [{ resource: 'stone', amount: 3 }],
    powerConsumed: 0,
    maxInventory: 20,
    maxProgress: 1,
    color: '#7a9a5f',
    shape: 'rect',
  },
  generator: {
    type: 'generator',
    name: 'Coal Generator',
    description: 'Produces 50 power. Consumes Coal.',
    cost: [
      { resource: 'iron', amount: 5 },
      { resource: 'copper', amount: 3 },
      { resource: 'stone', amount: 5 },
    ],
    powerConsumed: 0,
    powerProduced: 50,
    maxInventory: 20,
    maxProgress: 50,
    color: '#cc4400',
    shape: 'circle',
  },
  miner: {
    type: 'miner',
    name: 'Miner',
    description: 'Automatically mines the resource on its tile.',
    cost: [
      { resource: 'iron', amount: 3 },
      { resource: 'stone', amount: 2 },
    ],
    powerConsumed: 5,
    maxInventory: 10,
    maxProgress: 30,
    color: '#6666aa',
    shape: 'diamond',
  },
  conveyor: {
    type: 'conveyor',
    name: 'Conveyor Belt',
    description: 'Passive logistics. Transports items in the facing direction without consuming power.',
    cost: [{ resource: 'stone', amount: 2 }],
    powerConsumed: 0,
    maxInventory: 1,
    maxProgress: 12,
    color: '#444444',
    shape: 'arrow',
  },
  smelter: {
    type: 'smelter',
    name: 'Smelter',
    description: 'Smelts iron ore + coal into iron ingots.',
    cost: [
      { resource: 'iron', amount: 5 },
      { resource: 'coal', amount: 3 },
      { resource: 'stone', amount: 5 },
    ],
    powerConsumed: 10,
    maxInventory: 20,
    maxProgress: 60,
    producesItem: 'iron_ingot',
    consumesItems: [
      { type: 'iron', amount: 1 },
      { type: 'coal', amount: 1 },
    ],
    color: '#ff4400',
    shape: 'rect',
  },
  steel_smelter: {
    type: 'steel_smelter',
    name: 'Steel Furnace',
    description: 'Makes steel plates from iron ore + coal.',
    cost: [
      { resource: 'iron', amount: 10 },
      { resource: 'copper', amount: 5 },
      { resource: 'stone', amount: 10 },
    ],
    powerConsumed: 20,
    maxInventory: 20,
    maxProgress: 90,
    producesItem: 'steel_plate',
    consumesItems: [
      { type: 'iron', amount: 2 },
      { type: 'coal', amount: 2 },
    ],
    color: '#4444cc',
    shape: 'rect',
  },
  assembler: {
    type: 'assembler',
    name: 'Assembler',
    description: 'Crafts gears, wires, and engines.',
    cost: [
      { resource: 'iron', amount: 8 },
      { resource: 'copper', amount: 8 },
      { resource: 'stone', amount: 5 },
    ],
    powerConsumed: 15,
    maxInventory: 30,
    maxProgress: 80,
    producesItem: 'gear',
    consumesItems: [
      { type: 'iron_ingot', amount: 2 },
      { type: 'copper_wire', amount: 2 },
    ],
    color: '#00aa44',
    shape: 'diamond',
  },
};

export const BUILDING_COLORS: Record<BuildingTypeValue, string> = {
  storage: '#5b7a4f',
  chest: '#7a9a5f',
  generator: '#cc4400',
  miner: '#6666aa',
  conveyor: '#444444',
  smelter: '#ff4400',
  steel_smelter: '#4444cc',
  assembler: '#00aa44',
};

export const BUILDING_NAMES: Record<BuildingTypeValue, string> = {
  storage: 'Storage',
  chest: 'Chest',
  generator: 'Generator',
  miner: 'Miner',
  conveyor: 'Conveyor',
  smelter: 'Smelter',
  steel_smelter: 'Steel Furnace',
  assembler: 'Assembler',
};

// ==================== UI TYPES ====================

export type Panel = 'build_menu' | 'inventory' | 'save_load' | 'help' | 'objectives';

export interface TooltipData {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

// ==================== POWER SUMMARY ====================

export interface PowerSummary {
  produced: number;
  consumed: number;
  surplus: number;
  enough: boolean;
  generatorCount: number;
  fueledGenerators: number;
  consumerCount: number;
}

// ==================== CONVEYOR CONNECTION ====================

export type ConnectionKind = 'straight' | 'turn' | 'blocked' | 'machine' | 'none' | 'headon';

export interface ConveyorConnection {
  kind: ConnectionKind;
  label: string;
  /** Direction the neighbor belt points (for turns). */
  toDir?: DirectionValue;
  /** Building type of the neighbor machine (for machine connections). */
  machineType?: BuildingTypeValue;
}

// ==================== BUILDING INSPECTION ====================

export interface BuildingInspection {
  x: number;
  y: number;
  type: BuildingTypeValue;
  name: string;
  direction: DirectionValue;
  directionLabel: string;
  active: boolean;
  status: string;
  statusColor: 'ok' | 'warn' | 'bad';
  blocked: boolean;
  inventory: Item[];
  usedSlots: number;
  maxInventory: number;
  progress: number;
  maxProgress: number;
  progressPct: number;
  powerConsumed: number;
  powerProduced: number;
  producesItem?: string;
  consumesItems?: { type: ItemType; amount: number }[];
  /** Miner only: resource deposit on the tile. */
  resourceOnTile?: { type: string; amount: number };
  /** Generator only: coal left + fuel bar percentage (ticks until current coal runs out). */
  fuelCoal?: number;
  fuelPct?: number;
  fuelBurned?: number;
  /** Conveyor only. */
  connection?: {
    incoming: ConveyorConnection | null;
    outgoing: ConveyorConnection | null;
  };
  beltItem?: string | null;
  isPlayerStanding: boolean;
  /** Assembler only: the currently selected recipe. */
  selectedRecipe?: AsmRecipe;
}
