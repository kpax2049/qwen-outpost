import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { BUILDING_DEFS, MAP_SIZE, ITEM_DISPLAY_NAMES, Dir } from '../types';
import type { BuildingTypeValue } from '../types';

// Helper: give player resources to build anything
function fundPlayer(engine: GameEngine) {
  engine.player.inventory = [
    { type: 'stone', amount: 50 },
    { type: 'iron', amount: 50 },
    { type: 'copper', amount: 50 },
    { type: 'coal', amount: 50 },
    { type: 'gold', amount: 50 },
  ];
}

describe('GameEngine - Map Generation', () => {
  it('creates a map of correct size', () => {
    const engine = new GameEngine(42);
    expect(engine.map.length).toBe(MAP_SIZE);
    for (let y = 0; y < MAP_SIZE; y++) {
      expect(engine.map[y].length).toBe(MAP_SIZE);
    }
  });

  it('places the player in the center', () => {
    const engine = new GameEngine(42);
    const pos = engine.getPlayerPosition();
    expect(pos.x).toBe(60);
    expect(pos.y).toBe(60);
  });

  it('has resource deposits on the map', () => {
    const engine = new GameEngine(42);
    let hasResource = false;
    for (let y = 0; y < MAP_SIZE && !hasResource; y++) {
      for (let x = 0; x < MAP_SIZE && !hasResource; x++) {
        hasResource = !!engine.map[y][x].resource;
      }
    }
    expect(hasResource).toBe(true);
  });

  it('has different terrain types', () => {
    const engine = new GameEngine(42);
    const terrains = new Set<string>();
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        terrains.add(engine.map[y][x].terrain);
      }
    }
    expect(terrains.has('grass')).toBe(true);
    expect(terrains.has('water')).toBe(true);
    expect(terrains.has('sand')).toBe(true);
    expect(terrains.has('rock')).toBe(true);
  });

  it('seed produces consistent maps', () => {
    // Create engines without modifying them
    const map1 = new GameEngine(12345).map;
    const map2 = new GameEngine(12345).map;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        expect(map1[y][x].terrain).toBe(map2[y][x].terrain);
        if (map1[y][x].resource) {
          expect(map2[y][x].resource).toBeDefined();
          expect(map1[y][x].resource!.type).toBe(map2[y][x].resource!.type);
          expect(map1[y][x].resource!.amount).toBe(map2[y][x].resource!.amount);
        }
      }
    }
  });

  it('different seeds produce different maps', () => {
    const map1 = new GameEngine(1).map;
    const map2 = new GameEngine(2).map;

    let different = false;
    for (let y = 0; y < MAP_SIZE && !different; y++) {
      for (let x = 0; x < MAP_SIZE && !different; x++) {
        if (map1[y][x].terrain !== map2[y][x].terrain) different = true;
      }
    }
    expect(different).toBe(true);
  });
});

describe('GameEngine - Player Movement', () => {
  it('moves player in all directions', () => {
    const engine = new GameEngine(42);
    expect(engine.movePlayer(0, -1)).toBe(true);
    expect(engine.player.y).toBe(59);

    expect(engine.movePlayer(1, 0)).toBe(true);
    expect(engine.player.x).toBe(61);

    expect(engine.movePlayer(0, 1)).toBe(true);
    expect(engine.player.y).toBe(60);

    expect(engine.movePlayer(-1, 0)).toBe(true);
    expect(engine.player.x).toBe(60);
  });

  it('prevents movement off the map', () => {
    const engine = new GameEngine(42);
    for (let i = 0; i < 60; i++) engine.movePlayer(-1, 0);
    expect(engine.player.x).toBe(0);
    expect(engine.movePlayer(-1, 0)).toBe(false);
  });

  it('can mine resources on current tile', () => {
    const engine = new GameEngine(42);
    // Walk to a resource tile
    let found = false;
    for (let dy = -5; dy <= 5 && !found; dy++) {
      for (let dx = -5; dx <= 5 && !found; dx++) {
        const r = engine.map[60 + dy]?.[60 + dx];
        if (r?.resource) {
          while (engine.player.x !== 60 + dx || engine.player.y !== 60 + dy) {
            if (engine.player.x < 60 + dx) engine.movePlayer(1, 0);
            else if (engine.player.x > 60 + dx) engine.movePlayer(-1, 0);
            else if (engine.player.y < 60 + dy) engine.movePlayer(0, 1);
            else engine.movePlayer(0, -1);
          }
          found = true;
        }
      }
    }
    if (found) {
      const initial = engine.player.inventory.filter(i => i.type === engine.map[60][60].resource!.type).length;
      engine.mineResource();
      const after = engine.player.inventory.filter(i => i.type === engine.map[60][60].resource!.type).length;
      expect(after).toBe(initial + 1);
    }
  });

  it('tracks mining stats', () => {
    const engine = new GameEngine(42);
    expect(engine.player.stats.stonesMined).toBe(0);
  });
});

describe('GameEngine - Building Placement', () => {
  it('can place storage with starting resources', () => {
    const engine = new GameEngine(42);
    const result = engine.placeBuilding('storage');
    expect(result).toBe(true);
    const tile = engine.getTile(60, 60);
    expect(tile?.building).toBeDefined();
    expect(tile?.building?.type).toBe('storage');
  });

  it('can place buildings after funding player', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.placeBuilding('miner')).toBe(true);
    engine.movePlayer(1, 0);
    expect(engine.placeBuilding('conveyor')).toBe(true);
  });

  it('cannot place two buildings on same tile', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('storage');
    expect(engine.placeBuilding('miner')).toBe(false);
  });

  it('respects build costs', () => {
    const engine = new GameEngine(42);
    engine.player.inventory = [];
    expect(engine.placeBuilding('storage')).toBe(false);
  });

  it('removes building and returns partial refund', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('storage');
    const before = engine.player.inventory.filter(i => i.type === 'stone').length;

    engine.removeBuilding();
    const after = engine.player.inventory.filter(i => i.type === 'stone').length;
    // Should get back some stone (partial refund)
    expect(after).toBeGreaterThan(before);
    expect(engine.getTile(60, 60)?.building).toBeUndefined();
  });

  it('can rotate buildings', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('conveyor');
    const tile = engine.getTile(60, 60)!;
    const initialDir = tile.building!.direction;

    engine.rotateBuilding();
    expect(tile.building!.direction).toBe((initialDir + 1) % 4);
  });
});

describe('GameEngine - Power System', () => {
  it('generators have powerProduced value', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('generator');

    const tile = engine.getTile(60, 60);
    expect(tile?.building?.powerProduced).toBe(50);
  });

  it('miners have powerConsumed value', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('miner');

    const tile = engine.getTile(60, 60);
    expect(tile?.building?.powerConsumed).toBe(5);
  });

  it('generators are active when placed (produce power)', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('generator');

    // Add coal so generator can run
    const genTile = engine.getTile(60, 60)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 5 });

    engine.tick();
    expect(genTile.building!.active).toBe(true);
  });
});

describe('GameEngine - Conveyor Belts', () => {
  it('conveyors have correct maxProgress', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('conveyor');
    expect(engine.getTile(60, 60)!.building!.maxProgress).toBe(20);
  });

  it('conveyor transfers item when active', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1);
    engine.placeBuilding('storage');
    engine.movePlayer(0, -1);

    const conveyor = engine.getTile(60, 60)!.building!;
    conveyor.inventory = [{ type: 'stone', amount: 3 }];
    conveyor.active = true;

    for (let i = 0; i < 25; i++) engine.tick();

    const remaining = conveyor.inventory.find(i => i.type === 'stone');
    // Item should have moved (either 0 or fewer than 3)
    if (remaining) expect(remaining.amount).toBeLessThan(3);
  });
});

describe('GameEngine - Smelter', () => {
  it('smelter has correct configuration', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('smelter');

    const smelter = engine.getTile(60, 60)!.building!;
    expect(smelter.maxProgress).toBe(60);
    expect(smelter.consumesItems!.length).toBe(2);
  });

  it('smelter produces ingots given ore + coal', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Place generator first (for power)
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('smelter');

    // Add coal to generator so it runs
    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const smelter = engine.getTile(60, 62)!.building!;
    smelter.inventory = [
      { type: 'iron' as const, amount: 5 },
      { type: 'coal' as const, amount: 5 },
    ];

    for (let i = 0; i < 65; i++) engine.tick();

    const ingot = smelter.inventory.find(i => i.type === 'iron_ingot');
    expect(ingot).toBeDefined();
    if (ingot) expect(ingot.amount).toBeGreaterThan(0);
  });
});

describe('GameEngine - Assembler', () => {
  it('assembler has correct configuration', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('assembler');

    expect(engine.getTile(60, 60)!.building!.maxProgress).toBe(80);
  });

  it('assembler crafts gears given ingots + wires', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Place generator for power
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    // Add coal to generator
    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const assembler = engine.getTile(60, 62)!.building!;
    assembler.inventory = [
      { type: 'iron_ingot', amount: 4 },
      { type: 'copper_wire', amount: 4 },
    ];

    for (let i = 0; i < 85; i++) engine.tick();

    const gear = assembler.inventory.find(i => i.type === 'gear');
    expect(gear).toBeDefined();
    if (gear) expect(gear.amount).toBeGreaterThan(0);
  });
});

describe('GameEngine - Save/Load', () => {
  it('can save and load game state', () => {
    const engine1 = new GameEngine(42);
    fundPlayer(engine1);
    engine1.movePlayer(1, 0);
    engine1.placeBuilding('storage');

    const saved = engine1.save();
    const engine2 = new GameEngine(1);
    engine2.load(saved);

    expect(engine2.player.x).toBe(engine1.player.x);
    expect(engine2.player.y).toBe(engine1.player.y);
  });

  it('preserves tick count on load', () => {
    const engine = new GameEngine(42);
    for (let i = 0; i < 100; i++) engine.tick();
    const saved = engine.save();

    const engine2 = new GameEngine(999);
    engine2.load(saved);
    expect(engine2.tickCount).toBe(100);
  });

  it('preserves map state on load', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(1, 0);

    const saved = engine.save();
    const engine2 = new GameEngine(0);
    engine2.load(saved);

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        expect(engine2.map[y][x].terrain).toBe(engine.map[y][x].terrain);
      }
    }
  });
});

describe('GameEngine - Simulation Speed', () => {
  it('starts at default tick rate', () => {
    expect(new GameEngine(42).getConfig().tickRate).toBe(10);
  });

  it('can adjust tick rate', () => {
    const engine = new GameEngine(42);
    engine.setTickRate(5);
    expect(engine.getConfig().tickRate).toBe(5);
    engine.setTickRate(20);
    expect(engine.getConfig().tickRate).toBe(20);
  });

  it('tick rate has bounds (1-20)', () => {
    const engine = new GameEngine(42);
    engine.setTickRate(0);
    expect(engine.getConfig().tickRate).toBe(1);
    engine.setTickRate(100);
    expect(engine.getConfig().tickRate).toBe(20);
  });

  it('pause prevents ticking', () => {
    const engine = new GameEngine(42);
    engine.setPaused(true);
    const initial = engine.tickCount;
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.tickCount).toBe(initial);
  });

  it('unpause resumes ticking', () => {
    const engine = new GameEngine(42);
    engine.setPaused(true);
    engine.tick();
    engine.setPaused(false);
    engine.tick();
    expect(engine.tickCount).toBe(1);
  });
});

describe('GameEngine - Win Condition', () => {
  it('tracks engine crafting progress', () => {
    const engine = new GameEngine(42);
    expect(engine.player.stats.enginesCrafted).toBe(0);
    expect(engine.getWinState()).toBe(false);
  });

  it('wins after crafting 5 engines', () => {
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    for (let i = 0; i < 10; i++) engine.tick();
    expect(engine.getWinState()).toBe(true);
  });

  it('resetWinState clears the won state', () => {
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    for (let i = 0; i < 10; i++) engine.tick();
    expect(engine.getWinState()).toBe(true);

    engine.resetWinState();
    expect(engine.getWinState()).toBe(false);
  });
});

describe('GameEngine - Inventory Management', () => {
  it('player starts with initial resources', () => {
    const engine = new GameEngine(42);
    const stone = engine.player.inventory.find(i => i.type === 'stone');
    expect(stone).toBeDefined();
    expect(stone!.amount).toBe(5);
  });

  it('inventory has max slot limit', () => {
    expect(new GameEngine(42).player.maxInventorySlots).toBe(20);
  });

  it('can pick up items from nearby buildings', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('storage');
    const storage = engine.getTile(60, 60)!.building!;
    storage.inventory = [{ type: 'iron' as const, amount: 5 }];

    engine.pickUpItem();
    expect(engine.player.inventory.find(i => i.type === 'iron')?.amount).toBe(1);
  });

  it('can add items to building inventory', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('storage');
    const storage = engine.getTile(60, 60)!.building!;

    engine.addToInventory(storage, { type: 'copper' as const, amount: 10 });
    expect(storage.inventory.find(i => i.type === 'copper')?.amount).toBe(10);
  });

  it('can remove items from building inventory', () => {
    const engine = new GameEngine(42);
    engine.placeBuilding('storage');
    const storage = engine.getTile(60, 60)!.building!;
    storage.inventory = [{ type: 'iron' as const, amount: 10 }];

    engine['removeItemFromInventory'](storage, 'iron', 3);
    expect(storage.inventory.find(i => i.type === 'iron')?.amount).toBe(7);
  });

  it('can check if player can afford a building', () => {
    const engine = new GameEngine(42);
    expect(engine.canAfford([{ resource: 'stone', amount: 5 }])).toBe(true);
    expect(engine.canAfford([{ resource: 'stone', amount: 100 }])).toBe(false);
  });
});

describe('Building Definitions', () => {
  it('all building types have valid definitions', () => {
    const types = Object.keys(BUILDING_DEFS) as BuildingTypeValue[];
    for (const type of types) {
      const def = BUILDING_DEFS[type];
      expect(def.name).toBeTruthy();
      expect(def.cost.length).toBeGreaterThan(0);
      expect(def.color).toBeTruthy();
    }
  });

  it('all item types have display names', () => {
    const items = ['stone', 'iron', 'copper', 'coal', 'gold', 'iron_ingot', 'copper_wire', 'steel_plate', 'gear', 'engine'];
    for (const item of items) {
      expect(ITEM_DISPLAY_NAMES[item as keyof typeof ITEM_DISPLAY_NAMES]).toBeTruthy();
    }
  });

  it('generator produces power', () => {
    expect(BUILDING_DEFS.generator.powerProduced).toBe(50);
  });

  it('smelter has consumption recipe', () => {
    expect(BUILDING_DEFS.smelter.consumesItems!.length).toBe(2);
    expect(BUILDING_DEFS.smelter.consumesItems!.some(c => c.type === 'iron')).toBe(true);
    expect(BUILDING_DEFS.smelter.consumesItems!.some(c => c.type === 'coal')).toBe(true);
    expect(BUILDING_DEFS.smelter.producesItem).toBe('iron_ingot');
  });
});

describe('Map Boundaries', () => {
  it('getTile returns undefined for out-of-bounds', () => {
    const engine = new GameEngine(42);
    expect(engine.getTile(-1, 0)).toBeUndefined();
    expect(engine.getTile(MAP_SIZE, 0)).toBeUndefined();
    expect(engine.getTile(0, -1)).toBeUndefined();
    expect(engine.getTile(0, MAP_SIZE)).toBeUndefined();
  });

  it('getTile returns valid tile for edges', () => {
    const engine = new GameEngine(42);
    expect(engine.getTile(0, 0)).toBeDefined();
    expect(engine.getTile(MAP_SIZE - 1, MAP_SIZE - 1)).toBeDefined();
  });

  it('getNearbyBuildings returns buildings within range', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('storage');
    engine.movePlayer(0, 1);
    engine.placeBuilding('miner');

    const nearby = engine.getNearbyBuildings(60, 60, 2);
    expect(nearby.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GameEngine - Harvesting Model', () => {
  it('player facing updates to the direction of movement', () => {
    const engine = new GameEngine(42);
    engine.movePlayer(0, 1);
    expect(engine.getFacing()).toBe(Dir.Down);
    engine.movePlayer(-1, 0);
    expect(engine.getFacing()).toBe(Dir.Left);
    engine.movePlayer(0, -1);
    expect(engine.getFacing()).toBe(Dir.Up);
    engine.movePlayer(1, 0);
    expect(engine.getFacing()).toBe(Dir.Right);
  });

  it('chops wood from a facing tree', () => {
    const engine = new GameEngine(42);
    // Put a tree directly above the player
    engine.map[59][60].terrain = 'forest';
    engine.map[59][60].resource = undefined;
    engine.movePlayer(0, -1); // face up (but blocked -> facing still Up)
    const before = engine.player.inventory.find(i => i.type === 'wood')?.amount ?? 0;
    const result = engine.interact();
    expect(result).toBeTruthy();
    if (result) expect(result.type).toBe('wood');
    const after = engine.player.inventory.find(i => i.type === 'wood')?.amount ?? 0;
    expect(after).toBe(before + 1);
    expect(engine.map[59][60].terrain).toBe('grass');
    expect(engine.player.stats.woodChopped).toBe(1);
  });

  it('mines stone from a facing rock', () => {
    const engine = new GameEngine(42);
    // Put rock to the right of the player
    engine.map[60][61].terrain = 'rock';
    engine.map[60][61].resource = undefined;
    engine.movePlayer(1, 0); // face right (blocked -> facing Right)
    const before = engine.player.inventory.find(i => i.type === 'stone')?.amount ?? 0;
    const result = engine.interact();
    expect(result).toBeTruthy();
    if (result) expect(result.type).toBe('stone');
    const after = engine.player.inventory.find(i => i.type === 'stone')?.amount ?? 0;
    expect(after).toBe(before + 1);
    expect(engine.map[60][61].terrain).toBe('grass');
  });

  it('mines a facing resource deposit', () => {
    const engine = new GameEngine(42);
    // Put a gold deposit above the player
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].resource = { type: 'gold', amount: 10 };
    engine.movePlayer(0, -1);
    const result = engine.interact();
    expect(result).toBeTruthy();
    if (result) expect(result.type).toBe('gold');
    expect(engine.player.inventory.find(i => i.type === 'gold')?.amount).toBe(1);
    expect(engine.map[59][60].resource!.amount).toBe(9);
  });

  it('harvests deposit under the player when not facing a harvestable tile', () => {
    const engine = new GameEngine(42);
    // Gold deposit under the player; facing an empty tile
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].resource = { type: 'gold', amount: 10 };
    const result = engine.interact();
    expect(result).toBeTruthy();
    if (result) expect(result.type).toBe('gold');
    expect(engine.player.inventory.find(i => i.type === 'gold')?.amount).toBe(1);
  });

  it('returns null when nothing harvestable', () => {
    const engine = new GameEngine(42);
    engine.movePlayer(0, -1);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].resource = undefined;
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].resource = undefined;
    expect(engine.interact()).toBeNull();
  });

  it('tracks the tile E will interact with', () => {
    const engine = new GameEngine(42);
    // Facing tree
    engine.map[59][60].terrain = 'forest';
    engine.movePlayer(0, -1);
    const target = engine.getInteractiveTile();
    expect(target).toEqual({ x: 60, y: 59 });
    expect(engine.getInteractiveLabel()).toBe('Wood');
  });

  it('prevents walking onto trees', () => {
    const engine = new GameEngine(42);
    engine.map[59][60].terrain = 'forest';
    expect(engine.movePlayer(0, -1)).toBe(false);
    expect(engine.player.y).toBe(60);
  });

  it('counts buildings of a specific type', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('conveyor');
    expect(engine.countBuildings('conveyor')).toBe(1);
    expect(engine.countBuildings('miner')).toBe(0);
  });
});
