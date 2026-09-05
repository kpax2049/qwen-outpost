import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { Dir } from '../types';
import type { DirectionValue } from '../types';

function fundPlayer(engine: GameEngine) {
  engine.player.inventory = [
    { type: 'stone', amount: 50 },
    { type: 'iron', amount: 50 },
    { type: 'copper', amount: 50 },
    { type: 'coal', amount: 50 },
    { type: 'gold', amount: 50 },
  ];
}

function makeBelt(direction: DirectionValue) {
  return {
    type: 'conveyor' as const, direction, active: true, powerConsumed: 0,
    powerProduced: undefined, inventory: [], maxInventory: 1,
    progress: 0, maxProgress: 12, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
}

describe('GameEngine - Take/Withdraw from Buildings', () => {
  it('can withdraw an item from a storage container', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'iron');
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 5 });

    engine.movePlayer(0, 1);

    const result = engine.withdrawItemFromBuilding(61, 60, 'iron');
    expect(result).toBe(true);

    const inStorage = storage.inventory.find(i => i.type === 'iron');
    expect(inStorage).toBeDefined();
    if (inStorage) expect(inStorage.amount).toBe(4);

    const inPlayer = engine.player.inventory.find(i => i.type === 'iron');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('can withdraw from a chest', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'gold');
    engine.movePlayer(1, 0);
    engine.placeBuilding('chest');

    const chest = engine.getTile(61, 60)!.building!;
    engine.addToInventory(chest, { type: 'gold' as const, amount: 3 });

    engine.movePlayer(0, 1);
    const result = engine.withdrawItemFromBuilding(61, 60, 'gold');
    expect(result).toBe(true);

    const inChest = chest.inventory.find(i => i.type === 'gold');
    expect(inChest).toBeDefined();
    if (inChest) expect(inChest.amount).toBe(2);

    const inPlayer = engine.player.inventory.find(i => i.type === 'gold');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('can withdraw from a miner with mined items', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'iron');

    // Manually place a miner at (60, 61)
    engine.map[61][60].building = {
      type: 'miner' as const, direction: Dir.Down, active: true, powerConsumed: 5,
      powerProduced: undefined, maxInventory: 10, progress: 30, maxProgress: 30,
      producesItem: undefined, consumesItems: undefined, outputDirection: Dir.Down,
      inventory: [{ type: 'iron' as const, amount: 2 }],
    };
    engine.player.x = 60; engine.player.y = 60;

    const result = engine.withdrawItemFromBuilding(60, 61, 'iron');
    expect(result).toBe(true);

    const miner = engine.map[61][60]!.building!;
    expect(miner.inventory[0].amount).toBe(1);
    const inPlayer = engine.player.inventory.find(i => i.type === 'iron');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('can withdraw from a generator with coal', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'coal');
    engine.movePlayer(1, 0);
    engine.placeBuilding('generator');

    const gen = engine.getTile(61, 60)!.building!;
    engine.addToInventory(gen, { type: 'coal' as const, amount: 8 });

    engine.movePlayer(0, 1);
    const result = engine.withdrawItemFromBuilding(61, 60, 'coal');
    expect(result).toBe(true);

    expect(gen.inventory.find(i => i.type === 'coal')!.amount).toBe(7);
    const inPlayer = engine.player.inventory.find(i => i.type === 'coal');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('can withdraw from a smelter with processed items', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'iron_ingot');
    engine.movePlayer(1, 0);
    engine.placeBuilding('smelter');

    const smelter = engine.getTile(61, 60)!.building!;
    engine.addToInventory(smelter, { type: 'iron_ingot' as const, amount: 3 });
    engine.addToInventory(smelter, { type: 'coal' as const, amount: 2 });

    engine.movePlayer(0, 1);
    const result = engine.withdrawItemFromBuilding(61, 60, 'iron_ingot');
    expect(result).toBe(true);

    const inSmelter = smelter.inventory.find(i => i.type === 'iron_ingot');
    expect(inSmelter).toBeDefined();
    if (inSmelter) expect(inSmelter.amount).toBe(2);

    const inPlayer = engine.player.inventory.find(i => i.type === 'iron_ingot');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('can withdraw from an assembler with crafted items', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'gear');
    engine.movePlayer(1, 0);
    engine.placeBuilding('assembler');

    const assembler = engine.getTile(61, 60)!.building!;
    engine.addToInventory(assembler, { type: 'gear' as const, amount: 5 });
    engine.addToInventory(assembler, { type: 'iron_ingot' as const, amount: 2 });

    engine.movePlayer(0, 1);
    const result = engine.withdrawItemFromBuilding(61, 60, 'gear');
    expect(result).toBe(true);

    expect(assembler.inventory.find(i => i.type === 'gear')!.amount).toBe(4);
    const inPlayer = engine.player.inventory.find(i => i.type === 'gear');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('cannot withdraw from a conveyor', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    engine.map[61][60] = {
      terrain: 'grass',
      building: { ...makeBelt(Dir.Down), inventory: [{ type: 'stone' as const, amount: 1 }] },
    };
    engine.player.x = 60; engine.player.y = 60;

    const result = engine.withdrawItemFromBuilding(60, 61, 'stone');
    expect(result).toBe(false);

    // Building items unchanged
    expect(engine.map[61][60]!.building!.inventory[0].amount).toBe(1);
  });

  it('returns false when item does not exist in building', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'iron');
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'stone' as const, amount: 5 });

    engine.movePlayer(0, 1);
    const result = engine.withdrawItemFromBuilding(61, 60, 'iron');
    expect(result).toBe(false);

    // No change - stone should still be there (we added 5 stones, no starter stone)
    const inStorage = storage.inventory.find(i => i.type === 'stone');
    expect(inStorage).toBeDefined();
    if (inStorage) expect(inStorage.amount).toBe(5);

    const inPlayer = engine.player.inventory.find(i => i.type === 'iron');
    expect(inPlayer).toBeUndefined();
  });

  it('returns false when player is not nearby', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 5 });

    // Player moves far away
    engine.movePlayer(10, 10);

    const result = engine.withdrawItemFromBuilding(61, 60, 'iron');
    expect(result).toBe(false);

    // No change
    expect(storage.inventory.find(i => i.type === 'iron')!.amount).toBe(5);
  });

  it('returns false when building does not exist', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    const result = engine.withdrawItemFromBuilding(100, 100, 'iron');
    expect(result).toBe(false);
  });

  it('never duplicates items on withdraw', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'iron');
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 3 });

    engine.movePlayer(0, 1);

    // Withdraw all 3 items one by one
    for (let i = 0; i < 3; i++) {
      expect(engine.withdrawItemFromBuilding(61, 60, 'iron')).toBe(true);
    }

    // Building should have no more iron
    const inStorage = storage.inventory.find(i => i.type === 'iron');
    expect(inStorage).toBeUndefined();

    // Player should have exactly 3 iron (not more)
    const inPlayer = engine.player.inventory.find(i => i.type === 'iron');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(3);
  });

  it('can take the first item with keyboard shortcut (takeInspectedItem)', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(i => i.type !== 'copper');
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    // Clear the initial stone item that createBuilding adds
    storage.inventory = [];
    engine.addToInventory(storage, { type: 'copper' as const, amount: 7 });

    engine.movePlayer(0, 1);
    const result = engine.takeInspectedItem(61, 60);
    expect(result).toBe(true);

    expect(storage.inventory.find(i => i.type === 'copper')!.amount).toBe(6);
    const inPlayer = engine.player.inventory.find(i => i.type === 'copper');
    expect(inPlayer).toBeDefined();
    if (inPlayer) expect(inPlayer.amount).toBe(1);
  });

  it('takeInspectedItem returns false on conveyor', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);

    engine.map[61][60] = {
      terrain: 'grass',
      building: { ...makeBelt(Dir.Down), inventory: [{ type: 'stone' as const, amount: 1 }] },
    };
    engine.player.x = 60; engine.player.y = 60;

    const result = engine.takeInspectedItem(60, 61);
    expect(result).toBe(false);
  });

  it('buildingCanWithdrawItem reports correctly for valid item', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 5 });

    engine.movePlayer(0, 1);
    expect(engine.buildingCanWithdrawItem(61, 60, 'iron')).toBe(true);
  });

  it('buildingCanWithdrawItem reports false for nonexistent item', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'stone' as const, amount: 5 });

    engine.movePlayer(0, 1);
    expect(engine.buildingCanWithdrawItem(61, 60, 'iron')).toBe(false);
  });

  it('buildingCanWithdrawItem reports false for conveyor', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    engine.player.x = 60; engine.player.y = 60;

    expect(engine.buildingCanWithdrawItem(60, 61, 'stone')).toBe(false);
  });

  it('preserves automatic conveyor output behavior after withdrawal', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    const setG = (x: number, y: number) => { engine.map[y][x].terrain = 'grass'; };

    // Set up: storage at (60, 60), belt at (60, 61), chest at (60, 62)
    // Belt points down from storage to chest
    engine.map[61][60] = { terrain: 'grass', building: makeBelt(Dir.Down) };
    setG(60, 60); setG(60, 62);

    // Place storage at (60, 60)
    engine.player.x = 60; engine.player.y = 60;
    engine.placeBuilding('storage');
    const storage = engine.getTile(60, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 5 });

    // Player moves to (60, 61) (on the belt tile) then to (60, 62)
    engine.movePlayer(0, 1);  // now at (60, 61) - belt tile
    engine.movePlayer(0, 1);  // now at (60, 62)
    engine.placeBuilding('chest');
    const chest = engine.getTile(60, 62)!.building!;

    // Player moves back to be adjacent to storage at (60, 60)
    engine.movePlayer(0, -1); engine.movePlayer(0, -1);  // back to (60, 60)

    // Withdraw 2 iron from storage
    engine.withdrawItemFromBuilding(60, 60, 'iron');
    engine.withdrawItemFromBuilding(60, 60, 'iron');

    expect(storage.inventory.find(i => i.type === 'iron')?.amount).toBe(3);

    // Let the chain run - belts should still transport remaining items
    for (let i = 0; i < 80; i++) engine.tick();

    // Chest should have received some iron from the remaining items
    const chestIron = chest.inventory.find(i => i.type === 'iron');
    expect(chestIron).toBeDefined();
    if (chestIron) expect(chestIron.amount).toBeGreaterThan(0);
  });

  it('withdraws from building with multiple item types', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.player.inventory = engine.player.inventory.filter(
      i => !['iron', 'copper', 'gold'].includes(i.type),
    );
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;
    engine.addToInventory(storage, { type: 'iron' as const, amount: 4 });
    engine.addToInventory(storage, { type: 'copper' as const, amount: 3 });
    engine.addToInventory(storage, { type: 'gold' as const, amount: 1 });

    engine.movePlayer(0, 1);

    // Take one of each type
    expect(engine.withdrawItemFromBuilding(61, 60, 'iron')).toBe(true);
    expect(engine.withdrawItemFromBuilding(61, 60, 'copper')).toBe(true);
    expect(engine.withdrawItemFromBuilding(61, 60, 'gold')).toBe(true);

    expect(storage.inventory.find(i => i.type === 'iron')?.amount).toBe(3);
    expect(storage.inventory.find(i => i.type === 'copper')?.amount).toBe(2);
    // Gold slot should be removed entirely when amount reaches 0
    expect(storage.inventory.some(i => i.type === 'gold')).toBe(false);

    expect(engine.player.inventory.find(i => i.type === 'iron')?.amount).toBe(1);
    expect(engine.player.inventory.find(i => i.type === 'copper')?.amount).toBe(1);
    expect(engine.player.inventory.find(i => i.type === 'gold')?.amount).toBe(1);
  });

  it('player inventory slots respected after taking multiple different items', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    engine.movePlayer(1, 0);
    engine.placeBuilding('storage');

    const storage = engine.getTile(61, 60)!.building!;

    // Fill player with existing items to test stacking
    engine.player.inventory = [
      { type: 'iron' as const, amount: 3 },
      { type: 'stone' as const, amount: 10 },
      { type: 'coal' as const, amount: 5 },
    ];

    engine.addToInventory(storage, { type: 'iron' as const, amount: 2 });
    engine.addToInventory(storage, { type: 'copper' as const, amount: 5 });

    engine.movePlayer(0, 1);

    // Take 1 iron (should stack with existing)
    engine.withdrawItemFromBuilding(61, 60, 'iron');
    expect(engine.player.inventory.find(i => i.type === 'iron')?.amount).toBe(4);

    // Take 1 copper (new slot)
    engine.withdrawItemFromBuilding(61, 60, 'copper');
    expect(engine.player.inventory.find(i => i.type === 'copper')?.amount).toBe(1);

    // Player now has 4 slots (stone, coal, iron, copper)
    expect(engine.player.inventory.length).toBe(4);
  });
});
