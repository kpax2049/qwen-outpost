import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { Dir, MAP_SIZE, BUILDING_DEFS } from '../types';
import type { ItemType } from '../types';

function makeBuilding(type: string, overrides: Partial<import('../types').Building> = {}) {
  const def = BUILDING_DEFS[type as keyof typeof BUILDING_DEFS];
  return {
    type: type as import('../types').BuildingTypeValue,
    direction: Dir.Down,
    active: false,
    powerConsumed: def.powerConsumed,
    powerProduced: def.powerProduced,
    inventory: [],
    maxInventory: def.maxInventory,
    progress: 0,
    maxProgress: def.maxProgress,
    producesItem: def.producesItem,
    consumesItems: def.consumesItems,
    outputDirection: def.outputDirection,
    ...overrides,
  };
}

describe('Bug fix: conveyor-to-Coal-Generator fuel transfer', () => {
  function setupGeneratorWithBelt(_below: boolean = true) {
    const engine = new GameEngine(42);
    const { map, player } = engine;
    const cx = Math.floor(MAP_SIZE / 2);
    const cy = Math.floor(MAP_SIZE / 2);

    map[cy][cx].building = undefined;
    map[cy][cx].terrain = 'grass';
    map[cy + 1][cx].building = undefined;
    map[cy + 1][cx].terrain = 'grass';
    player.x = cx;
    player.y = cy;

    // Generator at (cx, cy), facing Down
    const gen = makeBuilding('generator', { direction: Dir.Down });
    map[cy][cx].building = gen;

    // Belt below generator, facing UP → outputs to generator at (cx, cy)
    const belt = makeBuilding('conveyor', {
      direction: Dir.Up,
      maxProgress: 12,
    });
    map[cy + 1][cx].building = belt;

    return { engine, map, gen, belt, cx, cy };
  }

  it('should transfer coal from conveyor into generator and activate it', () => {
    const { engine, gen, belt } = setupGeneratorWithBelt();
    belt.inventory = [{ type: 'coal' as ItemType, amount: 1 }];

    // Belt takes 12 ticks to reach maxProgress and transfer coal
    for (let i = 0; i < 12; i++) {
      engine.tick();
    }

    // After 12 ticks: coal delivered to generator, but updateGenerators already ran
    // so generator is still inactive from before the transfer
    expect(gen.inventory.find(i => i.type === 'coal')?.amount).toBe(1);
    expect(gen.active).toBe(false);

    // After 13 ticks: updateGenerators sees coal → activates
    engine.tick();
    expect(gen.active).toBe(true);
    expect(gen.fuelBurned ?? 0).toBe(0); // hasn't burned yet
  });

  it('should continuously transfer coal from belt chain and keep generator active', () => {
    const { engine, gen, belt } = setupGeneratorWithBelt();
    // Belt starts with 3 coal (will deliver one at tick 12, 24, 36)
    belt.inventory = [{ type: 'coal' as ItemType, amount: 3 }];

    // Generator activates at tick 13 (coal delivered at tick 12)
    // Burns at tick 13+50=63 (50 ticks of having coal)
    for (let i = 0; i < 65; i++) {
      engine.tick();
    }

    // Generator should be active (coal available from belt)
    expect(gen.active).toBe(true);
    // Should have burned at least 1 coal
    expect(gen.fuelBurned ?? 0).toBeGreaterThanOrEqual(1);
    // Should still have coal in inventory
    const coalInGen = gen.inventory.find(i => i.type === 'coal');
    expect(coalInGen).toBeDefined();
    expect(coalInGen!.amount).toBeGreaterThan(0);
  });

  it('should shut down generator when coal inventory is empty', () => {
    const { engine, gen } = setupGeneratorWithBelt();

    // Add exactly 1 coal
    gen.inventory = [{ type: 'coal' as ItemType, amount: 1 }];

    // Run 50 ticks — at tick 50 the generator burns the last coal
    for (let i = 0; i < 50; i++) {
      engine.tick();
    }

    expect(gen.fuelBurned).toBe(1);
    const coal = gen.inventory.find(i => i.type === 'coal');
    expect(coal).toBeUndefined();

    // Next tick: no coal → generator shuts down
    engine.tick();
    expect(gen.active).toBe(false);
  });

  it('should report power production when generator is fueled', () => {
    const { engine, gen } = setupGeneratorWithBelt();

    // Manually fuel the generator
    gen.inventory = [{ type: 'coal' as ItemType, amount: 5 }];

    // Run 1 tick to activate the generator
    engine.tick();

    expect(gen.active).toBe(true);

    // Power grid should reflect the generator's production
    const power = engine.getPowerSummary();
    expect(power.produced).toBe(50);
    expect(power.fueledGenerators).toBe(1);
  });
});
