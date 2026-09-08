import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';
import { BuildingTypeMap, MAP_SIZE } from '../types';

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

describe('Survey Lander - Permanent World Landmark', () => {
  it('lander exists in a new game', () => {
    const engine = new GameEngine(42);
    let foundLander = false;
    for (let y = 0; y < MAP_SIZE && !foundLander; y++) {
      for (let x = 0; x < MAP_SIZE && !foundLander; x++) {
        const b = engine.map[y][x].building;
        if (b && b.type === BuildingTypeMap.survey_lander) {
          foundLander = true;
        }
      }
    }
    expect(foundLander).toBe(true);
  });

  it('lander occupies a 2x2 footprint', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();
    const { x: lx, y: ly } = landerOrigin!;
    // All four tiles should have the survey_lander building
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const b = engine.map[ly + dy][lx + dx].building;
        expect(b).toBeDefined();
        expect(b!.type).toBe(BuildingTypeMap.survey_lander);
        expect(b!.isPermanent).toBe(true);
      }
    }
  });

  it('lander is near the starting position', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();
    // Lander should be within a small radius of the center (60, 60)
    const dist = Math.max(Math.abs(landerOrigin!.x - 60), Math.abs(landerOrigin!.y - 60));
    expect(dist).toBeLessThanOrEqual(10);
  });

  it('lander footprint blocks building placement', () => {
    const engine = new GameEngine(42);
    fundPlayer(engine);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();
    const { x: lx, y: ly } = landerOrigin!;

    // Should fail for every tile in the 2x2 footprint
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const result = engine.canPlaceAt('storage', lx + dx, ly + dy);
        expect(result.ok).toBe(false);
      }
    }
  });

  it('lander cannot be removed', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();

    // Try to remove from any tile in the 2x2 footprint
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const removed = engine.removeBuildingAt(landerOrigin!.x + dx, landerOrigin!.y + dy);
        expect(removed).toBe(false);
      }
    }

    // Verify the lander still exists
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const b = engine.map[landerOrigin!.y + dy][landerOrigin!.x + dx].building;
        expect(b).toBeDefined();
        expect(b!.type).toBe(BuildingTypeMap.survey_lander);
      }
    }
  });

  it('inspection identifies the lander as Survey Lander', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();

    const insp = engine.inspectBuilding(landerOrigin!.x, landerOrigin!.y);
    expect(insp).not.toBeNull();
    expect(insp!.type).toBe(BuildingTypeMap.survey_lander);
    expect(insp!.name).toBe('Survey Lander');
    expect(insp!.isLandmark).toBe(true);
    expect(insp!.status).toBe('DORMANT');
    expect(insp!.statusColor).toBe('warn');
    expect(insp!.landmarkDescription).toContain('surface deployment capsule');
  });

  it('lander survives save/load correctly', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();

    // Save and restore
    const data = engine.save();
    const engine2 = new GameEngine(1); // Different seed
    engine2.load(data);

    // Lander should still be at the same position
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const b = engine2.map[landerOrigin!.y + dy][landerOrigin!.x + dx].building;
        expect(b).toBeDefined();
        expect(b!.type).toBe(BuildingTypeMap.survey_lander);
        expect(b!.isPermanent).toBe(true);
      }
    }

    // Count lander tiles - should still be exactly 4
    let landerCount = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (engine2.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerCount++;
        }
      }
    }
    expect(landerCount).toBe(4);
  });

  it('lander is not duplicated after load', () => {
    const engine = new GameEngine(42);
    // Save/restore multiple times
    const data = engine.save();

    const engine2 = new GameEngine(1);
    engine2.load(data);

    let landerCount = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (engine2.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerCount++;
        }
      }
    }
    expect(landerCount).toBe(4); // Exactly one 2x2 lander = 4 tiles

    // Save again and load once more
    const data2 = engine2.save();
    const engine3 = new GameEngine(2);
    engine3.load(data2);

    let landerCount2 = 0;
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (engine3.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerCount2++;
        }
      }
    }
    expect(landerCount2).toBe(4);
  });

  it('findLanderOrigin returns top-left tile', () => {
    const engine = new GameEngine(42);
    let landerOrigin: { x: number; y: number } | null = null;
    for (let y = 0; y < MAP_SIZE && !landerOrigin; y++) {
      for (let x = 0; x < MAP_SIZE && !landerOrigin; x++) {
        if (engine.map[y][x].building?.type === BuildingTypeMap.survey_lander) {
          landerOrigin = { x, y };
        }
      }
    }
    expect(landerOrigin).not.toBeNull();
    const { x: lx, y: ly } = landerOrigin!;

    // Calling from top-left should return the same position
    expect(engine.findLanderOrigin(lx, ly)).toEqual({ x: lx, y: ly });
    // Calling from bottom-right should also return the top-left
    expect(engine.findLanderOrigin(lx + 1, ly + 1)).toEqual({ x: lx, y: ly });
    // Calling from a tile outside the footprint returns null
    expect(engine.findLanderOrigin(lx + 2, ly)).toBeNull();
    expect(engine.findLanderOrigin(lx, ly + 2)).toBeNull();
  });
});
