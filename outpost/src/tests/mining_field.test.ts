import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { Dir } from '../types';
import type { Building, DirectionValue } from '../types';

function fundPlayer(engine: GameEngine) {
  engine.player.inventory = [
    { type: 'stone', amount: 50 },
    { type: 'iron', amount: 50 },
    { type: 'copper', amount: 50 },
    { type: 'coal', amount: 50 },
    { type: 'gold', amount: 50 },
  ];
}

function createStorage(): Building {
  return {
    type: 'storage', direction: Dir.Down, active: true, powerConsumed: 0,
    powerProduced: undefined, inventory: [], maxInventory: 100,
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

// ==================== MINING FIELD v1 MECHANIC ====================

describe('Mining Field � Miner picks up second matching deposit after first exhausted', () => {
  it('miner switches to a second coal deposit within the 5x5 field when the under-tile is depleted', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59); setG(60, 60);

    // Coal under the miner (small, depletes quickly)
    engine.map[59][60].resource = { type: 'coal', amount: 2 };
    // Second coal deposit at (62, 61) � within 2-tile radius of (60, 59)
    engine.map[61][62].resource = { type: 'coal', amount: 50 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60]!.building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Phase 1: mine the under-tile deposit to depletion
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.map[59][60].resource!.amount).toBe(0);

    // Phase 2: let the miner switch to the second deposit and mine from it
    for (let i = 0; i < 100; i++) engine.tick();

    // The second deposit should have been reduced
    expect(engine.map[61][62].resource!.amount).toBeLessThan(50);
    // The miner should NOT be exhausted (exhausted field is absent/undefined)
    const miner = engine.map[59][60]!.building!;
    expect(miner.exhausted).not.toBe(true);
    // Storage should have received coal from both deposits
    const storageInv = engine.map[59][62]!.building!.inventory;
    const totalCoal = storageInv.reduce((s, i) => (i.type === 'coal' ? s + i.amount : s), 0);
    expect(totalCoal).toBeGreaterThan(1);
  });
});

describe('Mining Field � Miner ignores other resource types', () => {
  it('miner placed on coal does NOT mine iron deposits inside its field', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59); setG(60, 60);

    // Coal under the miner
    engine.map[59][60].resource = { type: 'coal', amount: 50 };
    // Iron deposits at various positions inside the 5x5 field
    engine.map[59][61].resource = { type: 'iron', amount: 50 };
    engine.map[61][61].resource = { type: 'iron', amount: 50 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60]!.building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    for (let i = 0; i < 100; i++) engine.tick();

    // Coal should be mined
    expect(engine.map[59][60].resource!.amount).toBeLessThan(50);
    // Iron deposits should be untouched
    expect(engine.map[59][61].resource!.amount).toBe(50);
    expect(engine.map[61][61].resource!.amount).toBe(50);
    // The miner should be producing coal
    const miner = engine.map[59][60]!.building!;
    expect(miner.minerResourceType).toBe('coal');
  });
});

describe('Mining Field � Miner does not mine outside 2-tile radius', () => {
  it('a coal deposit at distance 3 tiles from the miner is not mined', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59); setG(60, 60);

    // Coal under the miner
    engine.map[59][60].resource = { type: 'coal', amount: 3 };
    // Coal at (57, 57) � 3 tiles away in both x and y, outside the 5x5 field
    engine.map[57][57].resource = { type: 'coal', amount: 50 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60]!.building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Mine the under-tile to depletion
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.map[59][60].resource!.amount).toBe(0);

    // Keep ticking � the distant coal should NOT be mined
    for (let i = 0; i < 200; i++) engine.tick();

    // The distant deposit should be untouched
    expect(engine.map[57][57].resource!.amount).toBe(50);
    // The miner should be exhausted (no more matching deposits in field)
    const miner = engine.map[59][60]!.building!;
    expect(miner.exhausted).toBe(true);
  });
});

describe('Mining Field � Two miners deplete the same local deposit field', () => {
  it('two coal miners sharing deposits in overlapping fields coordinate correctly', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Two miners close enough that their fields overlap
    // Miner A at (59, 59) on coal at (60, 60)
    // Miner B at (61, 61) on coal at (61, 61)
    setG(59, 59); setG(60, 59); setG(61, 59); setG(62, 59);
    setG(59, 60); setG(60, 60); setG(61, 60); setG(62, 60);
    setG(59, 61); setG(60, 61); setG(61, 61); setG(62, 61);
    setG(59, 62); setG(60, 62); setG(61, 62); setG(62, 62);
    setG(60, 63); setG(61, 63);

    // Coal deposits: one under each miner plus one shared
    engine.map[60][60].resource = { type: 'coal', amount: 10 };
    engine.map[61][61].resource = { type: 'coal', amount: 10 };

    // Miners (on the coal deposits)
    engine.map[59][59] = { terrain: 'grass', building: makeMiner(Dir.Right) };
    // Actually the miner needs to be ON the resource tile. Let me fix:
    engine.map[60][59] = { terrain: 'grass', building: makeMiner(Dir.Down) }; // on coal at (60,60)
    engine.map[61][60] = { terrain: 'grass', building: makeMiner(Dir.Up) };   // on coal at (61,61)

    // Re-assign properly
    engine.map[60][60].building = makeMiner(Dir.Down);  // miner A on coal
    engine.map[61][61].building = makeMiner(Dir.Up);    // miner B on coal

    // Output conveyors
    engine.map[60][61]!.building = makeBelt(Dir.Down);
    engine.map[61][62]!.building = makeBelt(Dir.Right);

    // Storage
    engine.map[60][62]!.building = createStorage();
    engine.map[61][63]!.building = createStorage();

    // Generators
    engine.map[59][60]!.building = makeGenerator();
    engine.map[60][63]!.building = makeGenerator();
    engine.map[59][60]!.building!.inventory = [{ type: 'coal', amount: 10 }];
    engine.map[60][63]!.building!.inventory = [{ type: 'coal', amount: 10 }];

    // Run for many ticks
    for (let i = 0; i < 300; i++) engine.tick();

    // Both miners should have set their resource type to coal
    const minerA = engine.map[60][60]!.building!;
    const minerB = engine.map[61][61]!.building!;
    expect(minerA.minerResourceType).toBe('coal');
    expect(minerB.minerResourceType).toBe('coal');

    // The deposits should have been partially or fully depleted
    const totalCoalLeft =
      (engine.map[60][60].resource?.amount ?? 0) +
      (engine.map[61][61]?.resource?.amount ?? 0);
    // At least some coal should have been mined by the two miners
    expect(totalCoalLeft).toBeLessThan(20);
  });
});

describe('Mining Field � Exhausted Miner continues outputting stored items', () => {
  it('an exhausted miner drains its inventory onto a conveyor belt chain', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59); setG(60, 60);

    // Very small coal deposit that will deplete
    engine.map[59][60].resource = { type: 'coal', amount: 2 };

    engine.map[59][60].building = makeMiner(Dir.Right);
    engine.map[59][61].building = makeBelt(Dir.Right);
    engine.map[59][62].building = createStorage();
    engine.map[60][60]!.building = makeGenerator();
    engine.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Mine the deposit to depletion
    for (let i = 0; i < 100; i++) engine.tick();
    expect(engine.map[59][60].resource!.amount).toBe(0);

    // Preload the miner with stored items
    const miner = engine.map[59][60]!.building!;
    miner.inventory = [{ type: 'coal', amount: 5 }];

    // Run more ticks � the exhausted miner should drain its inventory
    for (let i = 0; i < 100; i++) engine.tick();

    // Miner should be exhausted
    expect(miner.exhausted).toBe(true);
    // Miner's stored coal should be depleted
    const minerCoal = miner.inventory.find(i => i.type === 'coal');
    if (minerCoal) { expect(minerCoal.amount).toBe(0); }
    // Storage should have received the items
    const storageInv = engine.map[59][62]!.building!.inventory;
    const storedCoal = storageInv.find(i => i.type === 'coal');
    expect(storedCoal).toBeDefined();
    expect(storedCoal!.amount).toBeGreaterThan(0);
  });
});

describe('Mining Field � Save/Load preserves mining field behavior', () => {
  it('save/load preserves miner resource type, target, and exhausted state', () => {
    const engine1 = new GameEngine(42);
    fundPlayer(engine1);
    const setG = (x: number, y: number) => { engine1.map[y][x].terrain = 'grass'; };
    setG(60, 59); setG(61, 59); setG(62, 59); setG(60, 60);

    // Two coal deposits: one under the miner, one at offset
    engine1.map[59][60].resource = { type: 'coal', amount: 2 };
    engine1.map[61][62].resource = { type: 'coal', amount: 50 };

    engine1.map[59][60].building = makeMiner(Dir.Right);
    engine1.map[59][61].building = makeBelt(Dir.Right);
    engine1.map[59][62].building = createStorage();
    engine1.map[60][60]!.building = makeGenerator();
    engine1.map[60][60]!.building!.inventory = [{ type: 'coal', amount: 5 }];

    // Mine the under-tile deposit to depletion, triggering switch to second deposit
    for (let i = 0; i < 100; i++) engine1.tick();
    expect(engine1.map[59][60].resource!.amount).toBe(0);

    // Let the miner switch to the second deposit and mine one item
    engine1.tick();

    const miner1 = engine1.map[59][60]!.building!;
    expect(miner1.minerResourceType).toBe('coal');
    expect(miner1.miningFieldTargetX).toBe(62);
    expect(miner1.miningFieldTargetY).toBe(61);
    expect(miner1.exhausted).not.toBe(true);

    // Save and load into a new engine
    const saved = engine1.save();
    const engine2 = new GameEngine(999);
    engine2.load(saved);

    const miner2 = engine2.map[59][60]!.building!;
    expect(miner2.minerResourceType).toBe('coal');
    expect(miner2.miningFieldTargetX).toBe(62);
    expect(miner2.miningFieldTargetY).toBe(61);
    expect(miner2.exhausted).not.toBe(true);

    // Continue mining � the second deposit should still be mined
    const depositBefore = engine2.map[61][62].resource!.amount;
    for (let i = 0; i < 100; i++) engine2.tick();
    const depositAfter = engine2.map[61][62].resource!.amount;
    expect(depositAfter).toBeLessThan(depositBefore);
  });
});
