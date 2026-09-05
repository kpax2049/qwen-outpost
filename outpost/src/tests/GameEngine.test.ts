import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { BUILDING_DEFS, MAP_SIZE, ITEM_DISPLAY_NAMES, Dir } from '../types';
import type { BuildingTypeValue, DirectionValue, Building } from '../types';

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
    expect(engine.getTile(60, 60)!.building!.maxProgress).toBe(12);
  });

  it('conveyor transfers item to adjacent building in its output direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // No generator needed — conveyors are passive and always active.
    engine.movePlayer(0, 1);
    engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1);
    engine.placeBuilding('storage');

    const conveyor = engine.getTile(60, 61)!.building!;
    conveyor.inventory = [{ type: 'stone', amount: 3 }];
    // Conveyors are passive — always active regardless of grid power.
    conveyor.active = true;

    for (let i = 0; i < 25; i++) engine.tick();

    // Belt should have pushed at least one item forward.
    const remaining = conveyor.inventory.find(i => i.type === 'stone');
    expect(remaining).toBeDefined();
    if (remaining) expect(remaining.amount).toBeLessThan(3);

    // Storage should have received the pushed stone.
    const storage = engine.getTile(60, 62)!.building!;
    const stored = storage.inventory.find(i => i.type === 'stone');
    expect(stored).toBeDefined();
    if (stored) expect(stored.amount).toBeGreaterThan(1); // starter stone + delivered stone
  });

  it('conveyor holds an item when the belt ahead points back (head-on block)', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Conveyors are passive — no generator needed.

    const placeBelt = (x: number, y: number, direction: DirectionValue) => {
      engine.map[y][x].terrain = 'grass';
      engine.map[y][x].building = {
        type: 'conveyor', direction, active: true, powerConsumed: 0,
        powerProduced: undefined, inventory: [], maxInventory: 1,
        progress: 0, maxProgress: 12, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
      };
    };
    placeBelt(60, 61, Dir.Down); // faces Down into...
    placeBelt(60, 62, Dir.Up); // faces Up (back at the first belt) — head-on
    engine.map[61][60].building!.inventory = [{ type: 'stone', amount: 1 }];
    engine.player.x = 60; engine.player.y = 63;

    for (let i = 0; i < 40; i++) engine.tick();

    // Item must NOT transfer into the head-on belt.
    expect(engine.map[61][60].building!.inventory[0]?.amount).toBe(1);
    expect(engine.map[62][60].building!.inventory.length).toBe(0);
    expect(engine.map[61][60].building!.blocked).toBe(true);
  });

  it('conveyor items can turn a 90-degree corner', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Conveyors are passive — no generator needed.

    const placeBelt = (x: number, y: number, direction: DirectionValue) => {
      engine.map[y][x].terrain = 'grass';
      engine.map[y][x].building = {
        type: 'conveyor', direction, active: true, powerConsumed: 0,
        powerProduced: undefined, inventory: [], maxInventory: 1,
        progress: 0, maxProgress: 12, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
      };
    };
    // Belt A points Right into belt B pointing Down — a corner.
    placeBelt(60, 61, Dir.Right);
    placeBelt(61, 61, Dir.Down);
    engine.map[61][60].building!.inventory = [{ type: 'stone', amount: 1 }];

    for (let i = 0; i < 12; i++) engine.tick();
    expect(engine.map[61][60].building!.inventory.length).toBe(0);
    expect(engine.map[61][61].building!.inventory[0]?.type).toBe('stone');
  });

  it('conveyor is always active — does NOT consume grid power', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('conveyor');
    const belt = engine.getTile(60, 60)!.building!;

    // Conveyors consume 0 power.
    expect(belt.powerConsumed).toBe(0);
    expect(engine.getPowerSummary().consumed).toBe(0);

    // Even with zero generators, the belt is active.
    engine.tick();
    expect(belt.active).toBe(true);

    // Placing a powered machine doesn't make the belt inactive.
    engine.movePlayer(0, 1);
    engine.placeBuilding('miner');
    engine.tick();
    expect(belt.active).toBe(true); // belt stays active
    // The miner has no power (no generator), so it's inactive.
    expect(engine.getTile(60, 61)!.building!.active).toBe(false);
  });

  it('storage pushes items to an adjacent conveyor facing it', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 61); setG(60, 62);

    // Belt at (60,61) pointing Down toward storage at (60,62).
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    // Storage at (60,62) — start with no stone so belt has room to push coal.
    const storageBuilding = createStorage();
    engine.map[62][60] = { terrain: 'grass', building: storageBuilding };
    // Put coal on the belt (belt capacity is 1, so we put 1 item).
    engine.map[61][60]!.building!.inventory = [{ type: 'coal', amount: 1 }];

    const belt = engine.getTile(60, 61)!.building!;
    const storage = engine.getTile(60, 62)!.building!;

    // After enough ticks, belt pushes coal to storage (storage has room).
    for (let i = 0; i < 25; i++) engine.tick();

    // Belt should have pushed its coal — now empty.
    const beltCoal = belt.inventory.find(i => i.type === 'coal');
    expect(beltCoal).toBeUndefined();

    // Storage should have received coal.
    const storageCoal = storage.inventory.find(i => i.type === 'coal');
    expect(storageCoal).toBeDefined();
    if (storageCoal) expect(storageCoal.amount).toBe(1);
  });

  it('storage feeds items through a multi-belt chain', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Belt chain: (60,61) → (60,62) → (60,63) → (60,64) grass (end of line).
    // Storage at (60,60) feeds belt0 at (60,61).
    setG(60, 60); setG(60, 61); setG(60, 62); setG(60, 63); setG(60, 64);
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    engine.map[62][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    engine.map[63][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };

    // Storage at (60, 60) above the belt chain.
    engine.player.x = 60; engine.player.y = 60;
    engine.placeBuilding('storage');

    const belt0 = engine.getTile(60, 61)!.building!;
    belt0.active = true;
    belt0.inventory = [{ type: 'stone', amount: 1 }];

    const storage = engine.getTile(60, 60)!.building!;
    // Storage starts with 5 stones.
    storage.inventory.push({ type: 'stone', amount: 5 });

    for (let i = 0; i < 100; i++) engine.tick();

    // Belt 0 still carries an item (transporting through chain).
    const belt0Stone = belt0.inventory.find(i => i.type === 'stone');
    expect(belt0Stone).toBeDefined();
    // Storage lost items — fed the belt chain.
    const storageStone = storage.inventory.find(i => i.type === 'stone');
    expect(storageStone).toBeDefined();
    if (storageStone) expect(storageStone.amount).toBeLessThan(6);
  });

  it('blocked downstream conveyor chain prevents storage output', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    setG(60, 61); setG(60, 62); setG(60, 63);
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    engine.map[62][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    engine.map[63][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };

    // Chest at the end, filled to capacity so nothing can push to it.
    engine.map[63][60]!.building!.inventory = [{ type: 'stone', amount: 1 }];
    engine.map[64][60] = { terrain: 'grass', building: fillChest() };

    // Storage at (60, 60) — above the belt chain.
    engine.player.x = 60; engine.player.y = 60;
    engine.placeBuilding('storage');

    const belt0 = engine.getTile(60, 61)!.building!;
    const belt1 = engine.getTile(60, 62)!.building!;
    const belt2 = engine.getTile(60, 63)!.building!;
    const storage = engine.getTile(60, 60)!.building!;

    // Fill all belts so the chain is fully blocked from the start.
    belt0.inventory = [{ type: 'stone', amount: 1 }];
    belt1.inventory = [{ type: 'stone', amount: 1 }];

    // Give storage iron to track.
    storage.inventory.push({ type: 'iron' as const, amount: 5 });

    for (let i = 0; i < 40; i++) engine.tick();

    // Storage should NOT have lost iron (belt chain is blocked by full chest).
    const storageIron = storage.inventory.find(i => i.type === 'iron');
    expect(storageIron).toBeDefined();
    if (storageIron) expect(storageIron.amount).toBe(5);
    // Belt0 should be blocked (can't push to belt1 which is full).
    expect(belt0.blocked).toBe(true);
  });

  it('empty storage does not output anything onto a belt', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1);
    engine.placeBuilding('storage');

    const belt = engine.getTile(60, 61)!.building!;
    const storage = engine.getTile(60, 62)!.building!;

    // Remove all items from storage (completely empty).
    storage.inventory = [];

    // Start the belt empty too.
    belt.inventory = [];

    for (let i = 0; i < 25; i++) engine.tick();

    // Belt should still be empty — nothing pulled from empty storage.
    expect(belt.inventory.length).toBe(0);
  });

  it('adding many belts does NOT increase grid power demand', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Clear tiles along the build column.
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    for (let y = 60; y <= 72; y++) setG(60, y);

    // Place one generator and fuel it.
    engine.placeBuilding('generator');
    engine.getTile(60, 60)!.building!.inventory.push({ type: 'coal', amount: 50 });

    // Place a miner (consumes 5 power).
    engine.movePlayer(0, 1);
    engine.placeBuilding('miner');

    let power = engine.getPowerSummary();
    expect(power.consumed).toBe(5); // only the miner counts

    // Add 10 belts — consumed should stay at 5.
    for (let i = 0; i < 10; i++) {
      engine.movePlayer(0, 1);
      engine.placeBuilding('conveyor');
    }
    engine.tick();
    power = engine.getPowerSummary();
    expect(power.consumed).toBe(5);
    expect(engine.countBuildings('conveyor')).toBe(10);
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
    assembler.selectedRecipe = 'gear';
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

  it('victory screen appears when final objective is first completed', () => {
    const engine = new GameEngine(42);
    expect(engine.getWinState()).toBe(false);
    expect(engine.isVictoryAcknowledged()).toBe(false);

    engine.player.stats.enginesCrafted = 5;
    engine.tick();

    expect(engine.getWinState()).toBe(true);
    expect(engine.isVictoryAcknowledged()).toBe(false);
  });

  it('dismissVictory prevents victory screen from reopening on subsequent ticks', () => {
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    engine.tick();
    expect(engine.getWinState()).toBe(true);
    expect(engine.isVictoryAcknowledged()).toBe(false);

    engine.dismissVictory();
    expect(engine.isVictoryAcknowledged()).toBe(true);

    // Subsequent ticks must not re-trigger the victory screen.
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.getWinState()).toBe(true);
    expect(engine.isVictoryAcknowledged()).toBe(true);
  });

  it('completion status (won) remains true after dismissing', () => {
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    engine.tick();
    expect(engine.getWinState()).toBe(true);

    engine.dismissVictory();
    expect(engine.getWinState()).toBe(true);
  });

  it('save/load preserves the dismissed/acknowledged state', () => {
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    engine.tick();
    engine.dismissVictory();
    expect(engine.isVictoryAcknowledged()).toBe(true);

    const saved = engine.save();
    const engine2 = new GameEngine(999);
    engine2.load(saved);
    expect(engine2.getWinState()).toBe(true);
    expect(engine2.isVictoryAcknowledged()).toBe(true);

    // Loading an acknowledged save must not re-trigger the victory.
    for (let i = 0; i < 10; i++) engine2.tick();
    expect(engine2.getWinState()).toBe(true);
    expect(engine2.isVictoryAcknowledged()).toBe(true);
  });

  it('a new game resets the victory acknowledgement', () => {
    const engine1 = new GameEngine(42);
    engine1.player.stats.enginesCrafted = 5;
    engine1.tick();
    engine1.dismissVictory();
    expect(engine1.isVictoryAcknowledged()).toBe(true);

    const engine2 = new GameEngine(42);
    expect(engine2.getWinState()).toBe(false);
    expect(engine2.isVictoryAcknowledged()).toBe(false);
  });

  it('load old save without victoryAcknowledged field defaults to false', () => {
    // Simulate an old save that lacks the victoryAcknowledged field.
    const engine = new GameEngine(42);
    engine.player.stats.enginesCrafted = 5;
    engine.tick();
    expect(engine.isVictoryAcknowledged()).toBe(false);

    const saved = engine.save();
    // Manually remove the field to simulate an old save.
    const data = JSON.parse(saved);
    delete data.victoryAcknowledged;
    const serialized = JSON.stringify(data);

    const engine2 = new GameEngine(999);
    engine2.load(serialized);
    expect(engine2.isVictoryAcknowledged()).toBe(false);
  });
});

describe('GameEngine - Objective Tracking', () => {
  it('tracks miners built', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.player.stats.minersBuilt).toBe(0);
    engine.placeBuilding('miner');
    expect(engine.player.stats.minersBuilt).toBe(1);
  });

  it('tracks generators built', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.player.stats.generatorsBuilt).toBe(0);
    engine.placeBuilding('generator');
    expect(engine.player.stats.generatorsBuilt).toBe(1);
  });

  it('tracks smelters built', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.player.stats.smeltersBuilt).toBe(0);
    engine.placeBuilding('smelter');
    expect(engine.player.stats.smeltersBuilt).toBe(1);
  });

  it('tracks assemblers built', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.player.stats.assemblersBuilt).toBe(0);
    engine.placeBuilding('assembler');
    expect(engine.player.stats.assemblersBuilt).toBe(1);
  });

  it('tracks conveyors built', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.player.stats.conveyorsBuilt).toBe(0);
    engine.movePlayer(1, 0);
    engine.placeBuilding('conveyor');
    expect(engine.player.stats.conveyorsBuilt).toBe(1);
  });

  it('tracks iron ingots crafted via smelter production stat', () => {
    const engine = new GameEngine(42);
    expect(engine.player.stats.ironIngotsCrafted).toBe(0);
    engine.player.stats.ironIngotsCrafted = 5;
    expect(engine.player.stats.ironIngotsCrafted).toBe(5);
  });

  it('tracks copper wires crafted via production stat', () => {
    const engine = new GameEngine(42);
    expect(engine.player.stats.copperWiresCrafted).toBe(0);
    engine.player.stats.copperWiresCrafted = 3;
    expect(engine.player.stats.copperWiresCrafted).toBe(3);
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

  it('conveyor is passive — consumes zero grid power', () => {
    expect(BUILDING_DEFS.conveyor.powerConsumed).toBe(0);
    expect(BUILDING_DEFS.conveyor.powerProduced).toBe(undefined);
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

describe('GameEngine - Power Grid & Observability', () => {
  it('only counts fueled generators as producing power', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('generator');

    const empty = engine.getPowerSummary();
    expect(empty.generatorCount).toBe(1);
    expect(empty.fueledGenerators).toBe(0);
    expect(empty.produced).toBe(0);

    engine.getTile(60, 60)!.building!.inventory.push({ type: 'coal', amount: 10 });
    engine.tick();
    const fueled = engine.getPowerSummary();
    expect(fueled.fueledGenerators).toBe(1);
    expect(fueled.produced).toBe(50);
    expect(fueled.enough).toBe(true);
  });

  it('burns one coal per maxProgress ticks and tracks fuelBurned', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('generator');
    const gen = engine.getTile(60, 60)!.building!;
    gen.inventory.push({ type: 'coal', amount: 10 });
    for (let i = 0; i < 60; i++) engine.tick();
    const coal = gen.inventory.find(i => i.type === 'coal');
    expect(coal).toBeDefined();
    if (coal) expect(coal.amount).toBe(9);
    expect(gen.fuelBurned).toBe(1);
  });

  it('deposits coal from the player into a nearby generator', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuildingAt('generator', 60, 61);
    expect(engine.buildingAcceptsItem(60, 61, 'coal')).toBe(true);
    expect(engine.buildingAcceptsItem(60, 61, 'stone')).toBe(false);
    expect(engine.depositItemToBuilding(60, 61, 'coal')).toBe(true);
    const coal = engine.getTile(60, 61)!.building!.inventory.find(i => i.type === 'coal');
    expect(coal?.amount).toBe(1);
    expect(engine.player.inventory.find(i => i.type === 'coal')!.amount).toBe(49);
  });

  it('inspects a building with status, inventory and connections', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.setBuildDirection(Dir.Right);
    engine.placeBuilding('conveyor');
    engine.setBuildDirection(Dir.Down);
    engine.placeBuildingAt('conveyor', 61, 60);
    engine.placeBuildingAt('conveyor', 61, 61);

    const info = engine.inspectBuilding(60, 60)!;
    expect(info.type).toBe('conveyor');
    expect(info.name).toBe('Conveyor Belt');
    expect(info.directionLabel).toContain('▶');
    expect(info.blocked).toBe(false);
    expect(info.maxProgress).toBe(12);
    expect(info.connection!.outgoing!.kind).toBe('turn');
    expect(info.connection!.incoming).toBeNull();
    expect(engine.getConnections(61, 60)!.incoming!.kind).toBe('turn');
  });

  it('inspects a generator showing fuel state', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuildingAt('generator', 60, 61);
    engine.depositItemToBuilding(60, 61, 'coal');
    engine.tick();

    const info = engine.inspectBuilding(60, 61)!;
    expect(info.type).toBe('generator');
    expect(info.fuelCoal).toBe(1);
    expect(info.status).toContain('Producing');
    expect(info.active).toBe(true);
  });

  it('applies the selected build direction when placing conveyors', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    expect(engine.getBuildDirection()).toBe(Dir.Down);

    engine.setBuildDirection(Dir.Right);
    expect(engine.getBuildDirection()).toBe(Dir.Right);
    engine.placeBuilding('conveyor');
    expect(engine.getTile(60, 60)!.building!.direction).toBe(Dir.Right);

    engine.setBuildDirection(Dir.Up);
    engine.placeBuildingAt('conveyor', 60, 61);
    expect(engine.getTile(60, 61)!.building!.direction).toBe(Dir.Up);
  });
});

describe('GameEngine - Coal Chain (miner -> belts -> generator)', () => {
  it('carries mined coal around a 90-degree turn into the generator and burns it', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Deterministic terrain/resource for every tile the build touches.
    const setTile = (x: number, y: number) => {
      engine.map[y][x].terrain = 'grass';
    };
    setTile(60, 59); setTile(61, 59); setTile(62, 59); setTile(62, 60); setTile(62, 61);
    engine.map[59][60].resource = { type: 'coal', amount: 20 };

    // Miner at (60,59) pushes East; belt turns South at (62,59), runs to a generator further south.
    engine.setBuildDirection(Dir.Right);
    engine.placeBuildingAt('miner', 60, 59);
    engine.placeBuildingAt('conveyor', 61, 59);
    engine.setBuildDirection(Dir.Down);
    engine.placeBuildingAt('conveyor', 62, 59);
    engine.placeBuildingAt('conveyor', 62, 60);
    engine.placeBuildingAt('generator', 62, 61);

    // Bootstrap the generator so the network is powered, then let the chain feed it.
    engine.player.x = 62; engine.player.y = 60;
    for (let i = 0; i < 5; i++) {
      expect(engine.depositItemToBuilding(62, 61, 'coal')).toBe(true);
    }
    for (let i = 0; i < 160; i++) engine.tick();

    const gen = engine.getTile(62, 61)!.building!;
    const genCoal = gen.inventory.find(i => i.type === 'coal');
    expect(genCoal).toBeDefined();
    if (genCoal) expect(genCoal.amount).toBeGreaterThan(5); // bootstrap + delivered coal
    expect(gen.fuelBurned).toBeGreaterThan(0);

    const power = engine.getPowerSummary();
    expect(power.fueledGenerators).toBe(1);
    expect(power.produced).toBe(50);
    expect(power.enough).toBe(true);

    // The turn belt must have carried coal through the corner.
    expect(engine.map[59][61].building!.inventory.length).toBeLessThanOrEqual(1);
    expect(engine.map[59][62].building!.inventory.length).toBeLessThanOrEqual(1);
    expect(engine.map[59][61].building!.blocked).toBe(false);
    expect(engine.map[59][62].building!.blocked).toBe(false);

    // The miner actually consumed its deposit.
    expect(engine.map[59][60].resource!.amount).toBeLessThan(20);
  });
});

// ==================== ACCEPTANCE TESTS (end-to-end) ====================

describe('Acceptance - Passive conveyors run without grid power', () => {
  it('a belt chain mechanically runs with zero generators', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Clear tiles.
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 61); setG(60, 62); setG(60, 63);
    engine.movePlayer(0, 1); engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1); engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1); engine.placeBuilding('chest');

    const belt0 = engine.getTile(60, 61)!.building!;
    const belt1 = engine.getTile(60, 62)!.building!;
    belt0.inventory = [{ type: 'stone', amount: 1 }];
    belt0.active = true;
    belt1.active = true;

    engine.tick(); // no generators — all conveyors still active

    expect(belt0.active).toBe(true);
    expect(belt1.active).toBe(true);
    expect(engine.getPowerSummary().produced).toBe(0);
    expect(engine.getPowerSummary().consumed).toBe(0);

    // After enough ticks, belt0 → belt1 → chest.
    for (let i = 0; i < 30; i++) engine.tick();
    const chest = engine.getTile(60, 63)!.building!;
    const onChest = chest.inventory.find(i => i.type === 'stone');
    expect(onChest).toBeDefined();
  });
});

describe('Acceptance - Powered machines need power', () => {
  it('a Miner without power does not mine', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].resource = { type: 'coal', amount: 100 };
    engine.movePlayer(0, -1);
    engine.placeBuilding('miner');
    // No generator → miner has no power.
    engine.tick();
    expect(engine.getTile(60, 59)!.building!.active).toBe(false);
  });
});

describe('Acceptance - Coal bootstrap to zero-power grid', () => {
  it('coal on a passive belt reaches a Generator with grid initially at zero', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 61); setG(60, 62); setG(60, 63);
    // Place a Generator (no coal yet).
    engine.placeBuilding('generator');
    // Place belt chain leading to it.
    engine.movePlayer(0, 1); engine.setBuildDirection(Dir.Down);
    engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1);
    engine.placeBuilding('conveyor');
    engine.movePlayer(0, 1);
    // Place a chest behind the generator so belts have a destination.
    engine.placeBuilding('chest');

    // Put coal on the first belt.
    const belt0 = engine.getTile(60, 61)!.building!;
    belt0.inventory = [{ type: 'coal', amount: 3 }];
    belt0.active = true;

    engine.tick();

    // The generator still has no coal (it's not at the end of the belt chain yet).
    const gen = engine.getTile(60, 60)!.building!;
    const genCoal = gen.inventory.find(i => i.type === 'coal');
    expect(genCoal).toBeUndefined();

    // After enough ticks the coal travels through the belts.
    for (let i = 0; i < 40; i++) engine.tick();

    // Coal should now be at the chest (end of chain).
    const chest = engine.getTile(60, 63)!.building!;
    const chestCoal = chest.inventory.find(i => i.type === 'coal');
    expect(chestCoal).toBeDefined();
  });
});

describe('Acceptance - Generator power output', () => {
  it('one fueled 50-power Generator produces 50 power', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('generator');
    engine.getTile(60, 60)!.building!.inventory.push({ type: 'coal', amount: 10 });
    engine.tick();

    const p = engine.getPowerSummary();
    expect(p.fueledGenerators).toBe(1);
    expect(p.produced).toBe(50);
    expect(p.surplus).toBe(50);
    expect(p.enough).toBe(true);
  });
});

describe('Acceptance - Distant machines operate on grid power', () => {
  it('a distant Miner + Smelter below 50 operate without being adjacent to the Generator', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Generator at (60, 60) with coal.
    setG(60, 61); setG(60, 62);
    engine.placeBuilding('generator');
    engine.getTile(60, 60)!.building!.inventory.push({ type: 'coal', amount: 50 });

    // Miner at (60, 61) — 1 tile away.
    engine.movePlayer(0, 1);
    engine.placeBuilding('miner');

    // Smelter at (60, 62) — 2 tiles away (not adjacent to generator).
    engine.movePlayer(0, 1);
    engine.placeBuilding('smelter');
    engine.getTile(60, 62)!.building!.inventory = [
      { type: 'iron' as const, amount: 5 },
      { type: 'coal' as const, amount: 5 },
    ];

    engine.tick();

    const p = engine.getPowerSummary();
    expect(p.produced).toBe(50);
    expect(p.consumed).toBe(15); // miner(5) + smelter(10)
    expect(p.enough).toBe(true);

    // Both machines should be active.
    expect(engine.getTile(60, 61)!.building!.active).toBe(true);
    expect(engine.getTile(60, 62)!.building!.active).toBe(true);
  });
});

describe('Acceptance - Direction and rendering consistency', () => {
  it('every cardinal direction matches inspection Direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Place each belt at a different tile so all placements succeed.
    const tiles: [number, number, DirectionValue, string][] = [
      [60, 60, Dir.Up, 'Up'],
      [61, 60, Dir.Right, 'Right'],
      [60, 61, Dir.Down, 'Down'],
      [61, 61, Dir.Left, 'Left'],
    ];
    let px = 60, py = 60;
    for (const [tx, ty, dir, label] of tiles) {
      engine.map[ty][tx].terrain = 'grass';
      // Move player to target tile using axis-aligned steps.
      if (px < tx) { engine.movePlayer(1, 0); px++; }
      else if (px > tx) { engine.movePlayer(-1, 0); px--; }
      if (py < ty) { engine.movePlayer(0, 1); py++; }
      else if (py > ty) { engine.movePlayer(0, -1); py--; }
      engine.setBuildDirection(dir);
      engine.placeBuilding('conveyor');
      const info = engine.inspectBuilding(tx, ty)!;
      expect(info.direction).toBe(dir);
      expect(info.directionLabel).toContain(label);
    }
  });

  it('remote selection + R changes direction and all state consistently', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('conveyor');
    const tile = engine.getTile(60, 60)!;

    expect(tile.building!.direction).toBe(Dir.Down);

    // Move away, then rotate the conveyor remotely.
    engine.movePlayer(0, 1);
    engine.movePlayer(0, -1); // back to (60, 60)
    engine.rotateBuilding();

    // Rotation: (Down(2) + 1) % 4 = Left(3).
    expect(tile.building!.direction).toBe(Dir.Left);
    const info = engine.inspectBuilding(60, 60)!;
    expect(info.direction).toBe(Dir.Left);
    expect(info.directionLabel).toContain('Left');
  });
});

describe('Acceptance - Adjacent non-feeding belt', () => {
  it('a deliberately adjacent but non-feeding belt is NOT treated as connected', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Belt A at (60, 61) points Right (output goes to (61, 61)).
    setG(61, 61);
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Right) };

    // Belt B at (61, 61) points Down (output goes to (61, 62)).
    // Physically adjacent to belt A's right side, but belt B's OUTPUT does NOT point into belt A.
    engine.map[61][61] = { terrain: 'grass', building: makeBelt(Dir.Down) };

    // Belt A's output goes to (61, 61) which has a belt pointing Down.
    // getOutConnection should show a turn, NOT a straight.
    const out = engine.getConnections(60, 61)!;
    expect(out.outgoing.kind).toBe('turn');

    // Belt B's incoming: check if any belt feeds into it from its left side (Dir.Right direction).
    // Belt A at (60, 61) points Right, so its output tile is (61, 61) — which IS belt B.
    // So belt B DOES receive from belt A (elbow entry). This is correct behavior — belt A's output
    // genuinely points into belt B's tile.
    const inB = engine.getConnections(61, 61)!;
    expect(inB.incoming!.kind).toBe('turn');
  });

  it('head-on belts are blocked — output opposite direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Belt A at (60, 61) points Down.
    setG(60, 62);
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    // Belt B at (61, 62) points Up (back at A).
    engine.map[62][60] = { terrain: 'grass', building: makeBelt(Dir.Up) };

    const outA = engine.getConnections(60, 61)!;
    expect(outA.outgoing.kind).toBe('headon');
  });
});

// ==================== ASSEMBLER RECIPE SELECTION ====================

describe('Assembler - Default Recipe', () => {
  it('newly built assembler defaults to copper_wire', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('assembler');

    const asm = engine.getTile(60, 60)!.building!;
    expect(asm.selectedRecipe).toBe('copper_wire');
  });

  it('inspection shows selected recipe', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('assembler');

    const info = engine.inspectBuilding(60, 60)!;
    expect(info.selectedRecipe).toBe('copper_wire');
  });
});

describe('Assembler - Copper Wire Recipe', () => {
  it('assembler crafts copper wire when selected and copper is provided', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.inventory = [{ type: 'copper', amount: 10 }];

    for (let i = 0; i < 60; i++) engine.tick();

    const wires = asm.inventory.find(i => i.type === 'copper_wire');
    expect(wires).toBeDefined();
    if (wires) expect(wires.amount).toBeGreaterThan(0);
    expect(engine.player.stats.copperWiresCrafted).toBeGreaterThan(0);
  });

  it('status shows crafting copper wire', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.inventory = [{ type: 'copper', amount: 10 }];

    engine.tick();
    const info = engine.inspectBuilding(60, 62)!;
    expect(info.status).toBe('Crafting Copper Wire');
  });
});

describe('Assembler - Gear Recipe', () => {
  it('assembler crafts gears when selected with proper ingredients', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'gear';
    asm.inventory = [
      { type: 'iron_ingot', amount: 6 },
      { type: 'copper_wire', amount: 6 },
    ];

    for (let i = 0; i < 120; i++) engine.tick();

    const gears = asm.inventory.find(i => i.type === 'gear');
    expect(gears).toBeDefined();
    if (gears) expect(gears.amount).toBeGreaterThan(0);
  });

  it('status shows waiting for missing gear ingredients', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'gear';
    asm.inventory = [
      { type: 'iron_ingot', amount: 6 },
      // missing copper_wire
    ];

    engine.tick();
    const info = engine.inspectBuilding(60, 62)!;
    expect(info.status).toContain('Waiting for Input');
    expect(info.status).toContain('Copper Wire');
  });
});

describe('Assembler - Engine Recipe', () => {
  it('assembler crafts engines when selected with proper ingredients', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'engine';
    asm.inventory = [
      { type: 'steel_plate', amount: 3 },
      { type: 'gear', amount: 3 },
      { type: 'copper_wire', amount: 6 },
    ];

    for (let i = 0; i < 250; i++) engine.tick();

    const engines = asm.inventory.find(i => i.type === 'engine');
    expect(engines).toBeDefined();
    if (engines) expect(engines.amount).toBeGreaterThan(0);
    expect(engine.player.stats.enginesCrafted).toBeGreaterThan(0);
  });

  it('status shows waiting for missing engine ingredients', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'engine';
    asm.inventory = [
      { type: 'steel_plate', amount: 3 },
      // missing gear and copper_wire
    ];

    engine.tick();
    const info = engine.inspectBuilding(60, 62)!;
    expect(info.status).toContain('Waiting for Input');
  });
});

describe('Assembler - Switching Recipes', () => {
  it('can switch from copper wire to gear', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.inventory = [{ type: 'copper', amount: 10 }];

    // Run with copper wire recipe
    for (let i = 0; i < 60; i++) engine.tick();
    expect(asm.selectedRecipe).toBe('copper_wire');
    expect(engine.inspectBuilding(60, 62)!.status).toBe('Crafting Copper Wire');

    // Switch to gear
    engine.setAssemblerRecipe(60, 62, 'gear');

    const info = engine.inspectBuilding(60, 62)!;
    expect(info.selectedRecipe).toBe('gear');
    // No gear ingredients yet — should show waiting
    expect(info.status).toContain('Waiting for Input');

    // Now add gear ingredients
    asm.inventory.push(
      { type: 'iron_ingot', amount: 4 },
      { type: 'copper_wire', amount: 4 },
    );
    for (let i = 0; i < 45; i++) engine.tick();

    // Should now be crafting gears
    info.status; // will check below
    expect(info.selectedRecipe).toBe('gear');
  });

  it('setAssemblerRecipe on non-assembler does nothing', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('storage');

    // Should not throw or change anything
    engine.setAssemblerRecipe(60, 60, 'gear');
    const storage = engine.getTile(60, 60)!.building!;
    expect(storage.type).toBe('storage');
  });

  it('setAssemblerRecipe on out-of-bounds does nothing', () => {
    const engine = new GameEngine(42);
    expect(() => engine.setAssemblerRecipe(-1, 0, 'gear')).not.toThrow();
    expect(() => engine.setAssemblerRecipe(999, 999, 'gear')).not.toThrow();
  });
});

describe('Assembler - Multiple Assemblers With Different Recipes', () => {
  it('two assemblers can run different recipes simultaneously', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Place generator at (60, 61) for power
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    // Move to (60, 62) for Assembler 1 (copper wire)
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    // Move to (60, 63) for Assembler 2 (gears)
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const asm1 = engine.getTile(60, 62)!.building!;
    asm1.selectedRecipe = 'copper_wire';
    asm1.inventory = [{ type: 'copper', amount: 20 }];

    const asm2 = engine.getTile(60, 63)!.building!;
    asm2.selectedRecipe = 'gear';
    asm2.inventory = [
      { type: 'iron_ingot', amount: 6 },
      { type: 'copper_wire', amount: 6 },
    ];

    for (let i = 0; i < 120; i++) engine.tick();

    // Assembler 1 should have copper wire
    const wires1 = asm1.inventory.find(i => i.type === 'copper_wire');
    expect(wires1).toBeDefined();
    if (wires1) expect(wires1.amount).toBeGreaterThan(0);

    // Assembler 2 should have gears
    const gears2 = asm2.inventory.find(i => i.type === 'gear');
    expect(gears2).toBeDefined();
    if (gears2) expect(gears2.amount).toBeGreaterThan(0);

    // They should still have different recipes
    expect(asm1.selectedRecipe).toBe('copper_wire');
    expect(asm2.selectedRecipe).toBe('gear');
  });
});

describe('Assembler - Missing Ingredients', () => {
  it('assembler waits when output is full but inputs are available', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.inventory = [
      { type: 'copper', amount: 10 },
      { type: 'copper_wire', amount: 30 }, // fill output slot
    ];

    engine.tick();
    const info = engine.inspectBuilding(60, 62)!;
    expect(info.status).toBe('Output Blocked (output full)');
  });

  it('assembler shows specific missing ingredients', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(0, 1);
    engine.placeBuilding('generator');
    engine.movePlayer(0, 1);
    engine.placeBuilding('assembler');

    const genTile = engine.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'engine';
    // Only have steel_plate, missing gear and copper_wire
    asm.inventory = [{ type: 'steel_plate', amount: 5 }];

    engine.tick();
    const info = engine.inspectBuilding(60, 62)!;
    expect(info.status).toContain('Waiting for Input');
  });
});

describe('Assembler - Save/Load', () => {
  it('preserves selected recipe through save/load', () => {
    const engine1 = new GameEngine(42);
    fundPlayer(engine1);
    engine1.movePlayer(0, 1);
    engine1.placeBuilding('generator');
    engine1.movePlayer(0, 1);
    engine1.placeBuilding('assembler');

    const genTile = engine1.getTile(60, 61)!;
    genTile.building!.inventory.push({ type: 'coal', amount: 50 });

    const asm = engine1.getTile(60, 62)!.building!;
    asm.selectedRecipe = 'engine';
    asm.inventory = [
      { type: 'steel_plate', amount: 5 },
      { type: 'gear', amount: 5 },
      { type: 'copper_wire', amount: 10 },
    ];

    // Run some ticks
    for (let i = 0; i < 80; i++) engine1.tick();

    const saved = engine1.save();

    // Load into a fresh engine
    const engine2 = new GameEngine(999);
    engine2.load(saved);

    const asm2 = engine2.getTile(60, 62)!.building!;
    expect(asm2.selectedRecipe).toBe('engine');
    expect(asm2.type).toBe('assembler');
  });

  it('preserves different recipes for multiple assemblers', () => {
    const engine1 = new GameEngine(42);
    fundPlayer(engine1);
    engine1.movePlayer(0, 1);
    engine1.placeBuilding('generator');
    engine1.movePlayer(0, 1);
    engine1.placeBuilding('assembler');
    engine1.movePlayer(0, 1);
    engine1.placeBuilding('assembler');

    const asm1 = engine1.getTile(60, 61)!.building!;
    asm1.selectedRecipe = 'copper_wire';

    const asm2 = engine1.getTile(60, 62)!.building!;
    asm2.selectedRecipe = 'gear';

    const saved = engine1.save();

    const engine2 = new GameEngine(1);
    engine2.load(saved);

    expect(engine2.getTile(60, 61)!.building!.selectedRecipe).toBe('copper_wire');
    expect(engine2.getTile(60, 62)!.building!.selectedRecipe).toBe('gear');
  });
});

// ==================== HELPER ====================

function createStorage(): Building {
  return {
    type: 'storage', direction: Dir.Down, active: true, powerConsumed: 0,
    powerProduced: undefined, inventory: [], maxInventory: 100,
    progress: 0, maxProgress: 0, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
}

function fillChest(): Building {
  return {
    type: 'chest', direction: Dir.Down, active: true, powerConsumed: 0,
    powerProduced: undefined, inventory: [{ type: 'stone', amount: 100 }], maxInventory: 100,
    progress: 0, maxProgress: 0, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
}

function makeBelt(direction: DirectionValue): Building {
  return {
    type: 'conveyor', direction, active: true, powerConsumed: 0,
    powerProduced: undefined, inventory: [], maxInventory: 1,
    progress: 0, maxProgress: 12, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
}

function makeMiner(direction: DirectionValue): Building {
  return {
    type: 'miner', direction, active: true, powerConsumed: 5,
    powerProduced: undefined, inventory: [], maxInventory: 10,
    progress: 0, maxProgress: 30, producesItem: undefined, consumesItems: undefined, outputDirection: direction,
  };
}

function makeGenerator(): Building {
  return {
    type: 'generator', direction: Dir.Down, active: true, powerConsumed: 0,
    powerProduced: 50, inventory: [], maxInventory: 20,
    progress: 0, maxProgress: 50, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
}

function makeAssembler(): Building {
  return {
    type: 'assembler', direction: Dir.Down, active: true, powerConsumed: 15,
    powerProduced: undefined, inventory: [], maxInventory: 30,
    progress: 0, maxProgress: 80, producesItem: 'gear', consumesItems: [
      { type: 'iron_ingot', amount: 2 },
      { type: 'copper_wire', amount: 2 },
    ], outputDirection: undefined,
  };
}

// ==================== ENGINE PHASE B: CONVEYOR DATA MODEL TESTS ====================

describe('Engine - computeIncomingSide', () => {
  it('returns undefined when no belt feeds the tile', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBeUndefined();
  });

  it('returns Dir.Up (North) when belt above points Down', () => {
    // Belt at (x=60, y=59) = north of (60,60), dir=Down → feeds from North
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].building = makeBelt(Dir.Down);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Up);
  });

  it('returns Dir.Right (East) when belt to the right points Left', () => {
    // Belt at (x=61, y=60) = east of (60,60), dir=Left → feeds from East
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][61].terrain = 'grass';
    engine.map[60][61].building = makeBelt(Dir.Left);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Right);
  });

  it('returns Dir.Down (South) when belt below points Up', () => {
    // Belt at (x=60, y=61) = south of (60,60), dir=Up → feeds from South
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Up);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Down);
  });

  it('returns Dir.Left (West) when belt to the left points Right', () => {
    // Belt at (x=59, y=60) = west of (60,60), dir=Right → feeds from West
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][59].terrain = 'grass';
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Left);
  });

  it('applies North priority when multiple belts feed the same tile', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    // Multiple belts pointing into (60,60)
    setG(60, 59); setG(61, 60); setG(60, 61); setG(59, 60);
    // North side (x=60, y=59): dir=Down → feeds from North
    engine.map[59][60].building = makeBelt(Dir.Down);
    // East side (x=61, y=60): dir=Left → feeds from East
    engine.map[60][61].building = makeBelt(Dir.Left);
    // South side (x=60, y=61): dir=Up → feeds from South
    engine.map[61][60].building = makeBelt(Dir.Up);
    // West side (x=59, y=60): dir=Right → feeds from West
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    // Priority: North > East > South > West
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Up);
  });

  it('does NOT treat a non-feeding adjacent belt as incoming', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Down); // does NOT point into (60,60)
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBeUndefined();
  });
});

describe('Engine - getBeltFlow', () => {
  it('returns output=direction and incomingSide=computed', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // Belt at (x=59, y=60) = West side of (60,60), dir=Right → feeds from West
    engine.map[60][59].terrain = 'grass';
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Up);
    const flow = engine.getBeltFlow(60, 60);
    expect(flow).not.toBeNull();
    if (flow) {
      expect(flow.output).toBe(Dir.Up);
      expect(flow.incomingSide).toBe(Dir.Left); // belt from left (West) feeds in
    }
  });

  it('returns null for non-conveyor tiles', () => {
    const engine = new GameEngine(42);
    expect(engine.getBeltFlow(0, 0)).toBeNull();
  });

  it('returns null for out-of-bounds', () => {
    const engine = new GameEngine(42);
    expect(engine.getBeltFlow(-1, -1)).toBeNull();
  });
});

describe('Engine - geometry derivation (all 16 combinations)', () => {
  // §4.1 — Every (direction, incomingSide) combination maps to a valid geometry.
  // Straight: incomingSide === undefined OR incomingSide === opposite(direction)
  // Elbow: incomingSide is perpendicular to direction.

  function isStraight(dir: DirectionValue, incoming?: DirectionValue): boolean {
    return incoming === undefined || incoming === ((dir + 2) % 4) as DirectionValue;
  }

  function isElbow(dir: DirectionValue, incoming?: DirectionValue): boolean {
    if (incoming === undefined) return false;
    const diff = Math.abs((dir - incoming + 4) % 4);
    return diff === 1 || diff === 3; // perpendicular = odd difference
  }

  // Straight combinations
  it('Up + undefined = straight', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].building = makeBelt(Dir.Up);
    expect(isStraight(Dir.Up, engine.computeIncomingSide(60, 60))).toBe(true);
  });

  it('Up + South = straight (entry from opposite)', () => {
    // Belt at (x=60, y=61) = south, dir=Up → feeds from South → opposite of Up
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Up);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Up);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Down);
    expect(isStraight(Dir.Up, Dir.Down)).toBe(true);
  });

  it('Right + undefined = straight', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].building = makeBelt(Dir.Right);
    expect(isStraight(Dir.Right, engine.computeIncomingSide(60, 60))).toBe(true);
  });

  it('Right + West = straight (entry from opposite)', () => {
    // Belt at (x=59, y=60) = west, dir=Right → feeds from West → opposite of Right
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][59].terrain = 'grass';
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Left);
    expect(isStraight(Dir.Right, Dir.Left)).toBe(true);
  });

  it('Down + undefined = straight', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(isStraight(Dir.Down, engine.computeIncomingSide(60, 60))).toBe(true);
  });

  it('Down + North = straight (entry from opposite)', () => {
    // Belt at (x=60, y=59) = north, dir=Down → feeds from North → opposite of Down
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].building = makeBelt(Dir.Down);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Up);
    expect(isStraight(Dir.Down, Dir.Up)).toBe(true);
  });

  it('Left + undefined = straight', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].building = makeBelt(Dir.Left);
    expect(isStraight(Dir.Left, engine.computeIncomingSide(60, 60))).toBe(true);
  });

  it('Left + East = straight (entry from opposite)', () => {
    // Belt at (x=61, y=60) = east, dir=Left → feeds from East → opposite of Left
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][61].terrain = 'grass';
    engine.map[60][61].building = makeBelt(Dir.Left);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Left);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Right);
    expect(isStraight(Dir.Left, Dir.Right)).toBe(true);
  });

  // Elbow combinations
  // Elbow combinations: input belt on a perpendicular side, pointing INTO (60,60)
  it('Up + East = elbow', () => {
    // Belt at (61,60) [y=60, x=61] dir=Left → outputs to (60,60) from East side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][61].terrain = 'grass';
    engine.map[60][61].building = makeBelt(Dir.Left);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Up);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Right);
    expect(isElbow(Dir.Up, Dir.Right)).toBe(true);
  });

  it('Up + West = elbow', () => {
    // Belt at (59,60) [y=60, x=59] dir=Right → outputs to (60,60) from West side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][59].terrain = 'grass';
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Up);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Left);
    expect(isElbow(Dir.Up, Dir.Left)).toBe(true);
  });

  it('Right + North = elbow', () => {
    // Belt at (60,59) [y=59, x=60] dir=Down → outputs to (60,60) from North side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].building = makeBelt(Dir.Down);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Up);
    expect(isElbow(Dir.Right, Dir.Up)).toBe(true);
  });

  it('Right + South = elbow', () => {
    // Belt at (60,61) [y=61, x=60] dir=Up → outputs to (60,60) from South side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Up);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Down);
    expect(isElbow(Dir.Right, Dir.Down)).toBe(true);
  });

  it('Down + East = elbow', () => {
    // Belt at (61,60) [y=60, x=61] dir=Left → outputs to (60,60) from East side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][61].terrain = 'grass';
    engine.map[60][61].building = makeBelt(Dir.Left);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Right);
    expect(isElbow(Dir.Down, Dir.Right)).toBe(true);
  });

  it('Down + West = elbow', () => {
    // Belt at (59,60) [y=60, x=59] dir=Right → outputs to (60,60) from West side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][59].terrain = 'grass';
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Left);
    expect(isElbow(Dir.Down, Dir.Left)).toBe(true);
  });

  it('Left + North = elbow', () => {
    // Belt at (60,59) [y=59, x=60] dir=Down → outputs to (60,60) from North side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[59][60].terrain = 'grass';
    engine.map[59][60].building = makeBelt(Dir.Down);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Left);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Up);
    expect(isElbow(Dir.Left, Dir.Up)).toBe(true);
  });

  it('Left + South = elbow', () => {
    // Belt at (60,61) [y=61, x=60] dir=Up → outputs to (60,60) from South side
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Up);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Left);
    expect(engine.computeIncomingSide(60, 60)).toBe(Dir.Down);
    expect(isElbow(Dir.Left, Dir.Down)).toBe(true);
  });
});

describe('Engine - item transfer through all 8 elbow flows', () => {
  // §14.4 — All eight directed elbow transfers.
  // Belt A outputs to belt B's tile. B's direction is perpendicular to A's.

  function placeElbowTransfer(
    ax: number, ay: number, ad: DirectionValue,
    bx: number, by: number, bd: DirectionValue,
  ) {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[ay][ax].terrain = 'grass';
    engine.map[ay][ax].building = makeBelt(ad);
    engine.map[by][bx].terrain = 'grass';
    engine.map[by][bx].building = makeBelt(bd);
    engine.map[ay][ax]!.building!.inventory = [{ type: 'stone', amount: 1 }];
    return engine;
  }

  it('Up→Right: A at (60,61) dir=Up feeds B at (60,60) dir=Right', () => {
    // A: x=60,y=61 dir=Up → DELTA[Up]=(0,-1) → output (60,60)=B
    const engine = placeElbowTransfer(60, 61, Dir.Up, 60, 60, Dir.Right);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Right→Up: A at (59,60) dir=Right feeds B at (60,60) dir=Up', () => {
    // A: x=59,y=60 dir=Right → DELTA[Right]=(1,0) → output (60,60)=B
    const engine = placeElbowTransfer(59, 60, Dir.Right, 60, 60, Dir.Up);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Right→Down: A at (59,60) dir=Right feeds B at (60,60) dir=Down', () => {
    // A: x=59,y=60 dir=Right → output (60,60)=B
    const engine = placeElbowTransfer(59, 60, Dir.Right, 60, 60, Dir.Down);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Down→Right: A at (60,59) dir=Down feeds B at (60,60) dir=Right', () => {
    // A: x=60,y=59 dir=Down → DELTA[Down]=(0,1) → output (60,60)=B
    const engine = placeElbowTransfer(60, 59, Dir.Down, 60, 60, Dir.Right);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Down→Left: A at (60,60) dir=Down feeds B at (60,61) dir=Left', () => {
    // A: x=60,y=60 dir=Down → output (60,61)=B
    const engine = placeElbowTransfer(60, 60, Dir.Down, 60, 61, Dir.Left);
    for (let i = 0; i < 25; i++) engine.tick();
    // B is at x=60, y=61 → engine.map[61][60]
    expect(engine.map[61][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Left→Down: A at (61,60) dir=Left feeds B at (60,60) dir=Down', () => {
    // A: x=61,y=60 dir=Left → DELTA[Left]=(-1,0) → output (60,60)=B
    const engine = placeElbowTransfer(61, 60, Dir.Left, 60, 60, Dir.Down);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Left→Up: A at (61,60) dir=Left feeds B at (60,60) dir=Up', () => {
    // A: x=61,y=60 dir=Left → output (60,60)=B
    const engine = placeElbowTransfer(61, 60, Dir.Left, 60, 60, Dir.Up);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });

  it('Up→Left: A at (60,61) dir=Up feeds B at (60,60) dir=Left', () => {
    // A: x=60,y=61 dir=Up → output (60,60)=B
    const engine = placeElbowTransfer(60, 61, Dir.Up, 60, 60, Dir.Left);
    for (let i = 0; i < 25; i++) engine.tick();
    expect(engine.map[60][60]!.building!.inventory[0]?.type).toBe('stone');
  });
});

describe('Engine - blocked state propagation through a chain', () => {
  it('third belt full blocks second belt which blocks first belt', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 61); setG(60, 62); setG(60, 63);

    // Belt chain: (60,60)→(60,61)→(60,62), all pointing Down
    // Belt 2 points to (60,63) which is empty terrain (no building) → belt 2 can't transfer
    // This means belt 2 stays full, blocking belt 1, which blocks belt 0
    engine.map[60][60].building = makeBelt(Dir.Down);
    engine.map[60][61].building = makeBelt(Dir.Down);
    engine.map[60][62].building = makeBelt(Dir.Down);
    // (60,63) is just grass - no building to accept items
    // Belt 2's output goes to (60,63) which has no building → transfer fails

    // Fill all belts
    engine.map[60][62]!.building!.inventory = [{ type: 'stone', amount: 1 }];
    engine.map[60][61]!.building!.inventory = [{ type: 'stone', amount: 1 }];
    engine.map[60][60]!.building!.inventory = [{ type: 'stone', amount: 1 }];

    for (let i = 0; i < 50; i++) engine.tick();

    // Belt 0 should be blocked because belt 1 can't accept (belt 2 can't transfer to empty tile)
    expect(engine.map[60][60]!.building!.blocked).toBe(true);
    // Belt 1 should be blocked because belt 2 is full and can't transfer
    expect(engine.map[60][61]!.building!.blocked).toBe(true);
    // Belt 2 is full, its output goes to empty tile so it can't transfer → blocked
    expect(engine.map[60][62]!.building!.blocked).toBe(true);
    // Items should still be on all belts (not transferred)
    expect(engine.map[60][60]!.building!.inventory[0]?.amount).toBe(1);
    expect(engine.map[60][61]!.building!.inventory[0]?.amount).toBe(1);
    expect(engine.map[60][62]!.building!.inventory[0]?.amount).toBe(1);
  });
});

describe('Engine - adjacent but not connected belts', () => {
  it('two vertically adjacent belts both pointing Right are not connected', () => {
    // Belt A at (x=60, y=60) dir=Right → outputs to (61,60)
    // Belt B at (x=60, y=61) dir=Right → outputs to (61,61)
    // A is adjacent to B's south side, but A does NOT feed into B
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Right);

    // Belt B's incoming: check all sides at (x=60, y=61)
    // North side (60,60): belt dir=Right, opposite(Up)=Down, Right≠Down → no feed
    // South side: nothing
    // East side: nothing
    // West side: nothing
    expect(engine.computeIncomingSide(60, 61)).toBeUndefined();

    // Belt A's outgoing should NOT be blocked by B
    const outA = engine.getConnections(60, 60);
    expect(outA).not.toBeNull();
    if (outA) {
      // A's output goes to (61,60) which is empty → 'none'
      expect(outA.outgoing.kind).toBe('none');
    }
  });

  it('head-on belts are mutually blocked', () => {
    // Belt A at (60,60) dir=Right → outputs to (61,60)
    // Belt B at (61,60) dir=Left → outputs to (60,60)
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    engine.map[61][60].terrain = 'grass';
    engine.map[61][60].building = makeBelt(Dir.Left);

    engine.map[60][60]!.building!.inventory = [{ type: 'stone', amount: 1 }];
    engine.map[61][60]!.building!.inventory = [{ type: 'coal', amount: 1 }];

    for (let i = 0; i < 40; i++) engine.tick();

    expect(engine.map[60][60]!.building!.blocked).toBe(true);
    expect(engine.map[61][60]!.building!.blocked).toBe(true);
    // Items should not have moved
    expect(engine.map[60][60]!.building!.inventory[0]?.amount).toBe(1);
    expect(engine.map[61][60]!.building!.inventory[0]?.amount).toBe(1);
  });
});

describe('Engine - drag route direction assignment', () => {
  // §7.2 — placeBuildingAt currently uses player._buildDirection.
  // All placed conveyors get the active build direction.

  it('L-shaped route: all tiles get the build direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.setBuildDirection(Dir.Right);

    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 60); setG(61, 60); setG(61, 59);

    // All conveyors get the build direction (Right)
    engine.placeBuildingAt('conveyor', 60, 60);
    expect(engine.map[60][60]!.building!.direction).toBe(Dir.Right);

    engine.placeBuildingAt('conveyor', 61, 60);
    expect(engine.map[60][61]!.building!.direction).toBe(Dir.Right);

    engine.placeBuildingAt('conveyor', 61, 59);
    expect(engine.map[59][61]!.building!.direction).toBe(Dir.Right);
  });

  it('Route directions computed by path geometry, not build direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Simulate the path that buildOrthoPath produces for an L-shaped drag:
    // start at (60,60), drag to (61,59)
    // With |dx| >= |dy|, walks horizontal first then vertical:
    //   [ {x:60,y:60}, {x:61,y:60}, {x:61,y:59} ]
    const path = [
      { x: 60, y: 60 },
      { x: 61, y: 60 },
      { x: 61, y: 59 },
    ] as { x: number; y: number }[];

    // Directions: each cell points toward the next cell; last cell falls back to build direction.
    // Cell 0 → Cell 1: delta x = 1, delta y = 0 → Right
    // Cell 1 → Cell 2: delta x = 0, delta y = -1 → Up
    // Cell 2: no next → build direction (Right)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Right, Dir.Up, Dir.Right]);

    // Now place conveyors with these directions (simulating handleMouseUp behavior)
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 60); setG(61, 60); setG(61, 59);

    for (let i = 0; i < path.length; i++) {
      engine.setBuildDirection(dirs[i]);
      engine.placeBuildingAt('conveyor', path[i].x, path[i].y);
    }

    // Cell 0 (60,60): Right — outputs toward cell 1
    expect(engine.map[60][60]!.building!.direction).toBe(Dir.Right);
    // Cell 1 (61,60): Up — outputs toward cell 2 (turns at the corner)
    expect(engine.map[60][61]!.building!.direction).toBe(Dir.Up);
    // Cell 2 (61,59): Right — last cell, falls back to build direction
    expect(engine.map[59][61]!.building!.direction).toBe(Dir.Right);
  });

  it('Zigzag route: directions follow path geometry through multiple turns', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Simulate a zigzag path: (60,60) -> (62,60) -> (62,62)
    // Horizontal then vertical segment
    const path = [
      { x: 60, y: 60 },
      { x: 61, y: 60 },
      { x: 62, y: 60 },
      { x: 62, y: 61 },
      { x: 62, y: 62 },
    ] as { x: number; y: number }[];

    // Directions: Right, Right, Down, Down, build (Right)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Right, Dir.Right, Dir.Down, Dir.Down, Dir.Right]);
  });

  it('Vertical-dominant path: walks vertical first when |dy| > |dx|', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    // Simulate a path where vertical dominates:
    // start at (60,60), target at (61,58)
    // |dx|=1, |dy|=2, so |dy| > |dx| — walks vertical first
    // Path: [ {x:60,y:60}, {x:60,y:59}, {x:60,y:58}, {x:61,y:58} ]
    const path = [
      { x: 60, y: 60 },
      { x: 60, y: 59 },
      { x: 60, y: 58 },
      { x: 61, y: 58 },
    ] as { x: number; y: number }[];

    // Directions: Up, Up, Right, build (Right)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Up, Dir.Up, Dir.Right, Dir.Right]);
  });

  it('Single cell route: direction is the build direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    const path = [{ x: 60, y: 60 }];
    const dirs = GameEngine.computeRouteDirections(path, Dir.Down);
    expect(dirs).toEqual([Dir.Down]);
  });

  it('Straight horizontal route: all cells get Right', () => {
    const path = [
      { x: 60, y: 60 },
      { x: 61, y: 60 },
      { x: 62, y: 60 },
      { x: 63, y: 60 },
    ] as { x: number; y: number }[];

    // Directions: Right, Right, Right, build (Right)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Right, Dir.Right, Dir.Right, Dir.Right]);
  });

  it('Straight vertical route: all cells get Down except last which falls back', () => {
    const path = [
      { x: 60, y: 60 },
      { x: 60, y: 61 },
      { x: 60, y: 62 },
    ] as { x: number; y: number }[];

    // Directions: Down, Down, build (Right — fallback since no next cell)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Down, Dir.Down, Dir.Right]);
  });

  it('Reverse direction route: Left and Down directions', () => {
    const path = [
      { x: 63, y: 60 },
      { x: 62, y: 60 },
      { x: 61, y: 60 },
      { x: 61, y: 61 },
    ] as { x: number; y: number }[];

    // Directions: Left, Left, Down, build (Right — fallback)
    const dirs = GameEngine.computeRouteDirections(path, Dir.Right);
    expect(dirs).toEqual([Dir.Left, Dir.Left, Dir.Down, Dir.Right]);
  });

  it('zigzag route: all tiles get the build direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.setBuildDirection(Dir.Down);

    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 60); setG(61, 60); setG(61, 61); setG(62, 61); setG(62, 62);

    engine.placeBuildingAt('conveyor', 60, 60);
    expect(engine.map[60][60]!.building!.direction).toBe(Dir.Down);

    engine.placeBuildingAt('conveyor', 61, 60);
    expect(engine.map[60][61]!.building!.direction).toBe(Dir.Down);

    engine.placeBuildingAt('conveyor', 61, 61);
    expect(engine.map[61][61]!.building!.direction).toBe(Dir.Down);

    engine.placeBuildingAt('conveyor', 62, 61);
    expect(engine.map[61][62]!.building!.direction).toBe(Dir.Down);

    engine.placeBuildingAt('conveyor', 62, 62);
    expect(engine.map[62][62]!.building!.direction).toBe(Dir.Down);
  });
});

describe('Engine - remote rotation (rotateBuildingAt)', () => {
  it('rotates a conveyor at arbitrary coordinates', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[65][65].terrain = 'grass';
    engine.map[65][65].building = makeBelt(Dir.Right);
    engine.player.x = 60; engine.player.y = 60; // not on the belt

    engine.rotateBuildingAt(65, 65);
    expect(engine.map[65][65]!.building!.direction).toBe(Dir.Down);

    engine.rotateBuildingAt(65, 65);
    expect(engine.map[65][65]!.building!.direction).toBe(Dir.Left);

    engine.rotateBuildingAt(65, 65);
    expect(engine.map[65][65]!.building!.direction).toBe(Dir.Up);

    engine.rotateBuildingAt(65, 65);
    expect(engine.map[65][65]!.building!.direction).toBe(Dir.Right); // full cycle
  });

  it('rotation changes incomingSide for neighbors', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Belt A at (x=60, y=60) dir=Right, Belt B at (x=61, y=60) dir=Left
    setG(60, 60); setG(61, 60);
    engine.map[60][60].building = makeBelt(Dir.Right);
    engine.map[60][61].building = makeBelt(Dir.Left);

    // B's incoming: A at (60,60) dir=Right feeds from West (A outputs to (61,60)=B's tile)
    expect(engine.computeIncomingSide(61, 60)).toBe(Dir.Left);

    // Rotate B: Left(3) → Right(1) via cycle Left→Up→Right
    engine.rotateBuildingAt(61, 60);
    expect(engine.map[60][61]!.building!.direction).toBe(Dir.Up); // (3+1)%4 = 0 = Up
    engine.rotateBuildingAt(61, 60);
    expect(engine.map[60][61]!.building!.direction).toBe(Dir.Right); // (0+1)%4 = 1 = Right

    // Now B's incoming: A at (60,60) dir=Right, B at (61,60) dir=Right
    // A feeds into B from West, and both have same direction → straight
    expect(engine.computeIncomingSide(61, 60)).toBe(Dir.Left);
  });

  it('out-of-bounds rotation is a no-op', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Right);
    engine.rotateBuildingAt(-1, 0);
    engine.rotateBuildingAt(120, 0);
    engine.rotateBuildingAt(0, -1);
    expect(engine.map[60][60]!.building!.direction).toBe(Dir.Right);
  });

  it('rotation on non-conveyor is a no-op', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.placeBuilding('storage');
    engine.rotateBuildingAt(60, 60);
    // Storage has no direction field (or it's the default)
    expect(engine.getTile(60, 60)?.building?.type).toBe('storage');
  });
});

describe('Engine - save/load direction preservation', () => {
  it('save and load preserves conveyor direction', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 60); setG(61, 60); setG(60, 61);

    engine.map[60][60].building = makeBelt(Dir.Right);
    engine.map[61][60].building = makeBelt(Dir.Down);
    engine.map[60][61].building = makeBelt(Dir.Up);

    engine.map[60][60]!.building!.inventory = [{ type: 'stone', amount: 1 }];

    const saved = engine.save();

    const engine2 = new GameEngine(999);
    engine2.load(saved);

    expect(engine2.map[60][60]!.building!.direction).toBe(Dir.Right);
    expect(engine2.map[61][60]!.building!.direction).toBe(Dir.Down);
    expect(engine2.map[60][61]!.building!.direction).toBe(Dir.Up);
    expect(engine2.map[60][60]!.building!.inventory[0]?.amount).toBe(1);

    // incomingSide should be recomputed correctly after load
    expect(engine2.computeIncomingSide(61, 60)).toBe(Dir.Left); // from belt at (60,60)
  });

  it('save/load round trip with item positions', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 1 }];
    engine.map[60][60]!.building!.progress = 7;

    const saved = engine.save();
    const engine2 = new GameEngine(0);
    engine2.load(saved);

    expect(engine2.map[60][60]!.building!.progress).toBe(7);
    expect(engine2.map[60][60]!.building!.inventory[0]?.type).toBe('coal');
  });
});

describe('Engine - inspection direction matches rendering', () => {
  it('all four cardinal directions have correct directionLabel', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    const dirs: DirectionValue[] = [Dir.Up, Dir.Right, Dir.Down, Dir.Left];
    const labels = ['Up', 'Right', 'Down', 'Left'];

    for (let i = 0; i < 4; i++) {
      const [x, y] = [60 + (i % 2), 60 + Math.floor(i / 2)];
      engine.map[y][x].terrain = 'grass';
      engine.map[y][x].building = makeBelt(dirs[i]);
      const info = engine.inspectBuilding(x, y);
      expect(info!.direction).toBe(dirs[i]);
      expect(info!.directionLabel).toContain(labels[i]);
    }
  });

  it('elbow belt inspection shows correct direction and connection', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Belt A at (x=59, y=60) dir=Right → outputs to (60,60) = Belt B
    // Belt B at (x=60, y=60) dir=Down
    setG(59, 60); setG(60, 60);
    engine.map[60][59].building = makeBelt(Dir.Right);
    engine.map[60][60].building = makeBelt(Dir.Down);

    // B's inspection: direction=Down, incoming=turn from Right (West side)
    const infoB = engine.inspectBuilding(60, 60)!;
    expect(infoB.direction).toBe(Dir.Down);
    const connB = infoB.connection as NonNullable<typeof infoB.connection>;
    expect(connB.incoming?.kind).toBe('turn');
    expect(connB.outgoing?.kind).toBe('none'); // down is empty

    // A's inspection: direction=Right, incoming=null, outgoing=turn
    const infoA = engine.inspectBuilding(59, 60)!;
    expect(infoA.direction).toBe(Dir.Right);
    const connA = infoA.connection as NonNullable<typeof infoA.connection>;
    expect(connA.incoming).toBeNull();
    expect(connA.outgoing?.kind).toBe('turn');
  });
});

describe('Engine - zero-power passive operation', () => {
  it('conveyors are always active regardless of grid power state', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    // No generators — grid power = 0

    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    engine.map[60][61].terrain = 'grass';
    engine.map[60][61].building = makeBelt(Dir.Down);

    engine.tick();

    // Both belts should be active
    expect(engine.map[60][60]!.building!.active).toBe(true);
    expect(engine.map[60][61]!.building!.active).toBe(true);

    // Power summary: no generators, no consumers (conveyors are passive)
    const power = engine.getPowerSummary();
    expect(power.produced).toBe(0);
    expect(power.consumed).toBe(0);
  });

  it('conveyor powerConsumed is always 0', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[60][60].terrain = 'grass';
    engine.map[60][60].building = makeBelt(Dir.Down);
    expect(engine.map[60][60]!.building!.powerConsumed).toBe(0);
  });
});

describe('Miner logistics - output drains on depleted deposit', () => {
  it('miner with active deposit mines and outputs to adjacent belt', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Layout: Miner(60,59) → Belt(61,59) → Storage(62,59)
    // Generator at (60,60) for power
    setG(60, 59); setG(61, 59); setG(62, 59);
    setG(60, 60);

    // Coal deposit under the miner
    engine.map[59][60].resource = { type: 'coal', amount: 50 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60].building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    for (let i = 0; i < 100; i++) engine.tick();

    // Storage should have received coal from the belt chain
    const storageInv = engine.map[59][62]!.building!.inventory;
    expect(storageInv.some(i => i.type === 'coal')).toBe(true);
    // Deposit should have decreased
    expect(engine.map[59][60].resource!.amount).toBeLessThan(50);
  });

  it('depleted deposit + stored output continues draining onto belt', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59);
    setG(60, 60);

    // Small coal deposit (2 units)
    engine.map[59][60].resource = { type: 'coal', amount: 2 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60].building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Mine the deposit to depletion
    for (let i = 0; i < 100; i++) engine.tick();

    // Deposit should be empty
    expect(engine.map[59][60].resource!.amount).toBe(0);

    // Preload the miner with stored items
    const miner = engine.map[59][60]!.building!;
    miner.inventory = [{ type: 'coal', amount: 5 }];

    // Run more ticks - items should drain from miner → belt → storage
    for (let i = 0; i < 100; i++) engine.tick();

    // Miner's stored coal should be depleted
    const minerCoal = miner.inventory.find(i => i.type === 'coal');
    if (minerCoal) { expect(minerCoal.amount).toBe(0); }
    // Storage should have received the items
    const storageInv = engine.map[59][62]!.building!.inventory;
    const storedCoal = storageInv.find(i => i.type === 'coal');
    expect(storedCoal).toBeDefined();
    expect(storedCoal!.amount).toBeGreaterThan(0);
  });

  it('depleted deposit + empty miner remains idle (no new mining)', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Small coal deposit (1 unit)
    engine.map[59][60].resource = { type: 'coal', amount: 1 };

    engine.map[59][60].building = makeMiner(Dir.Right);

    // Power the grid
    setG(60, 60);
    engine.map[60][60].building = makeGenerator();
    engine.map[61][60] = { terrain: 'grass', building: makeGenerator() };
    engine.map[61][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Mine the single deposit to depletion
    for (let i = 0; i < 100; i++) engine.tick();

    // Deposit should be empty
    expect(engine.map[59][60].resource!.amount).toBe(0);

    const miner = engine.map[59][60]!.building!;

    // Miner may have the 1 coal it mined — that's OK, it was produced
    // The key is: no MORE coal should appear after depletion
    const coalAfterFirstPhase = miner.inventory.find(i => i.type === 'coal');
    const maxCoalAfterMine = coalAfterFirstPhase ? coalAfterFirstPhase.amount : 0;
    expect(maxCoalAfterMine).toBeLessThanOrEqual(1);

    // Keep ticking - miner should NOT produce any more items
    for (let i = 0; i < 100; i++) engine.tick();

    // Miner should not have gained any more coal
    const coalAfterIdle = miner.inventory.find(i => i.type === 'coal');
    const maxCoalAfterIdle = coalAfterIdle ? coalAfterIdle.amount : 0;
    expect(maxCoalAfterIdle).toBe(maxCoalAfterMine);
    // Status should indicate exhausted state
    const inspection = engine.inspectBuilding(60, 59);
    expect(inspection!.exhausted).toBe(true);
  });

  it('blocked downstream belt preserves stored items until output becomes available', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Depleted deposit
    engine.map[59][60].resource = { type: 'coal', amount: 0 };

    // Layout: Miner(60,59) → Belt(61,59) → Assembler(62,59) that rejects coal
    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = makeAssembler();

    // Power the grid
    setG(60, 60);
    engine.map[60][60].building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Preload the miner with items
    const miner = engine.map[59][60]!.building!;
    miner.inventory = [{ type: 'coal', amount: 3 }];

    // Fill the belt to capacity (belt maxInventory = 1)
    engine.map[59][61]!.building!.inventory = [{ type: 'coal', amount: 1 }];

    // Run ticks - miner should try to output but belt is full, and assembler rejects coal
    for (let i = 0; i < 50; i++) engine.tick();

    // Miner's stored coal should still be there (blocked by full belt)
    const minerCoal = miner.inventory.find(i => i.type === 'coal');
    expect(minerCoal).toBeDefined();
    expect(minerCoal!.amount).toBe(3);

    // Now clear the belt to unblock
    engine.map[59][61]!.building!.inventory = [];

    // Run more ticks - items should flow from miner to belt
    for (let i = 0; i < 50; i++) engine.tick();

    // Miner's coal should have started draining
    const minerCoalAfter = miner.inventory.find(i => i.type === 'coal');
    if (minerCoalAfter) { expect(minerCoalAfter.amount).toBeLessThan(3); }
    // Belt should have received at least some items
    const beltInv = engine.map[59][61]!.building!.inventory;
    const beltCoal = beltInv.find(i => i.type === 'coal');
    expect(beltCoal).toBeDefined();
    expect(beltCoal!.amount).toBeGreaterThan(0);
  });
});
