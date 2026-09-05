import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { BUILDING_DEFS } from '../types';
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

describe('Regression: newly constructed buildings have empty inventories (no phantom items)', () => {
  for (const [type, def] of Object.entries(BUILDING_DEFS)) {
    it(`newly built ${def.name} (${type}) has empty inventory`, () => {
      const engine = new GameEngine(42);
      fundPlayer(engine);
      engine.player._buildDirection = 0;
      const result = engine.placeBuilding(type as BuildingTypeValue);
      expect(result).toBe(true);
      const tile = engine.getTile(engine.player.x, engine.player.y);
      expect(tile?.building?.type).toBe(type);
      expect(tile?.building?.inventory).toEqual([]);
    });
  }
});

describe('Regression: construction still deducts the proper recipe materials from the player', () => {
  function testCostDeduction(buildingType: BuildingTypeValue) {
    const def = BUILDING_DEFS[buildingType];
    const costCopy = [...def.cost]; // deep copy so we can compare after

    const engine = new GameEngine(42);
    fundPlayer(engine);

    const before: Record<string, number> = {};
    for (const item of engine.player.inventory) {
      before[item.type] = item.amount;
    }

    engine.player._buildDirection = 0;
    const result = engine.placeBuilding(buildingType);
    expect(result).toBe(true);

    for (const item of costCopy) {
      const afterAmount = engine.player.inventory.find(i => i.type === item.resource)?.amount ?? 0;
      expect(before[item.resource]! - afterAmount).toBe(item.amount);
      expect(afterAmount).toBe(before[item.resource]! - item.amount);
    }
  }

  for (const [type, def] of Object.entries(BUILDING_DEFS)) {
    it(`construction of ${def.name} (${type}) deducts correct cost`, () => {
      testCostDeduction(type as BuildingTypeValue);
    });
  }
});
