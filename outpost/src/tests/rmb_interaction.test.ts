import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine';

// Note: map coordinates are map[y][x]. So engine.map[62][60] means y=62, x=60.
// startMoveTo(tx, ty) takes x first, y second. So startMoveTo(62, 60) means x=62, y=60,
// which is map[60][62].

describe('RMB Wood/Stone: movement + step-over collection', () => {
  it('direct movePlayer on adjacent forest tile auto-collects', () => {
    const engine = new GameEngine(42);
    // map[y][x], y=61, x=60 → tile south of player
    engine.map[61][60].terrain = 'forest';

    const result = engine.movePlayer(0, 1);
    expect(result).toBe(true);
    expect(engine.player.y).toBe(61);
    expect(engine.map[61][60].terrain).toBe('grass');
    const wood = engine.player.inventory.find(i => i.type === 'wood');
    expect(wood?.amount).toBe(6);
  });

  it('direct movePlayer on adjacent rock tile auto-collects', () => {
    const engine = new GameEngine(42);
    engine.map[61][60].terrain = 'rock';

    const result = engine.movePlayer(0, 1);
    expect(result).toBe(true);
    expect(engine.player.y).toBe(61);
    expect(engine.map[61][60].terrain).toBe('grass');
    const stone = engine.player.inventory.find(i => i.type === 'stone');
    expect(stone?.amount).toBe(6);
  });

  it('startMoveTo to forest tile routes player onto it and collects', () => {
    const engine = new GameEngine(42);
    // startMoveTo(x=62, y=60) → map[60][62]
    engine.map[60][62].terrain = 'forest';

    const result = engine.startMoveTo(62, 60);
    expect(result).toBe(true);
    expect(engine.hasAutoPath()).toBe(true);

    for (let i = 0; i < 10; i++) engine.tick();

    expect(engine.player.x).toBe(62);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][62].terrain).toBe('grass');
    const wood = engine.player.inventory.find(i => i.type === 'wood');
    expect(wood?.amount).toBe(6);
  });

  it('startMoveTo to rock tile routes player onto it and collects', () => {
    const engine = new GameEngine(42);
    engine.map[60][63].terrain = 'rock';

    const result = engine.startMoveTo(63, 60);
    expect(result).toBe(true);
    expect(engine.hasAutoPath()).toBe(true);

    for (let i = 0; i < 12; i++) engine.tick();

    expect(engine.player.x).toBe(63);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][63].terrain).toBe('grass');
    const stone = engine.player.inventory.find(i => i.type === 'stone');
    expect(stone?.amount).toBe(6);
  });

  it('startMoveTo to forest several tiles away follows path and collects', () => {
    const engine = new GameEngine(42);
    engine.map[60][66].terrain = 'forest';

    engine.startMoveTo(66, 60);
    expect(engine.hasAutoPath()).toBe(true);

    for (let i = 0; i < 20; i++) engine.tick();

    expect(engine.player.x).toBe(66);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][66].terrain).toBe('grass');
    const wood = engine.player.inventory.find(i => i.type === 'wood');
    expect(wood?.amount).toBe(6);
  });

  it('forest target remains if collection blocked (inventory full)', () => {
    const engine = new GameEngine(42);
    engine.map[60][63].terrain = 'forest';

    // Fill inventory to max (20 slots) with non-wood types so canAddToPlayerInventory('wood') fails
    engine.player.inventory = [];
    const otherTypes = ['iron', 'copper', 'coal', 'gold', 'iron_ingot', 'copper_wire', 'steel_plate', 'gear', 'engine', 'stone'];
    for (let i = 0; i < 20; i++) {
      engine.player.inventory.push({ type: otherTypes[i % otherTypes.length] as any, amount: 1 });
    }

    engine.startMoveTo(63, 60);
    for (let i = 0; i < 12; i++) engine.tick();

    expect(engine.player.x).toBe(63);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][63].terrain).toBe('forest');
    const wood = engine.player.inventory.find(i => i.type === 'wood');
    expect(wood).toBeUndefined();
  });

  it('rock target remains if collection blocked (inventory full)', () => {
    const engine = new GameEngine(42);
    engine.map[60][63].terrain = 'rock';

    // Fill inventory to max (20 slots) with non-stone types
    engine.player.inventory = [];
    const otherTypes = ['wood', 'iron', 'copper', 'coal', 'gold', 'iron_ingot', 'copper_wire', 'steel_plate', 'gear', 'engine'];
    for (let i = 0; i < 20; i++) {
      engine.player.inventory.push({ type: otherTypes[i % otherTypes.length] as any, amount: 1 });
    }

    engine.startMoveTo(63, 60);
    for (let i = 0; i < 12; i++) engine.tick();

    expect(engine.player.x).toBe(63);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][63].terrain).toBe('rock');
    const stone = engine.player.inventory.find(i => i.type === 'stone');
    expect(stone).toBeUndefined();
  });

  it('startHarvestAt to Coal stops adjacent (contextual harvesting)', () => {
    const engine = new GameEngine(42);
    // y=60, x=64 → resource on tile player will approach from the south
    engine.map[60][64].resource = { type: 'coal' as any, amount: 50 };

    const result = engine.startHarvestAt(64, 60);
    expect(result).toBe(true);
    expect(engine.hasAutoPath()).toBe(true);
    expect(engine.isHarvesting()).toBe(true);

    for (let i = 0; i < 15; i++) engine.tick();

    // Player should be adjacent, NOT on the coal tile
    const isAdjacent = Math.max(Math.abs(engine.player.x - 64), Math.abs(engine.player.y - 60)) <= 1;
    expect(isAdjacent).toBe(true);
    const onTile = engine.player.x === 64 && engine.player.y === 60;
    expect(onTile).toBe(false);

    // Coal should have been harvested
    const coal = engine.player.inventory.find(i => i.type === 'coal');
    expect(coal).toBeDefined();
  });

  it('startHarvestAt to Iron stops adjacent', () => {
    const engine = new GameEngine(42);
    engine.map[60][64].resource = { type: 'iron' as any, amount: 50 };

    engine.startHarvestAt(64, 60);
    expect(engine.isHarvesting()).toBe(true);

    for (let i = 0; i < 15; i++) engine.tick();

    const isAdjacent = Math.max(Math.abs(engine.player.x - 64), Math.abs(engine.player.y - 60)) <= 1;
    expect(isAdjacent).toBe(true);
  });

  it('startHarvestAt to Copper stops adjacent', () => {
    const engine = new GameEngine(42);
    engine.map[60][64].resource = { type: 'copper' as any, amount: 50 };

    engine.startHarvestAt(64, 60);
    expect(engine.isHarvesting()).toBe(true);

    for (let i = 0; i < 15; i++) engine.tick();

    const isAdjacent = Math.max(Math.abs(engine.player.x - 64), Math.abs(engine.player.y - 60)) <= 1;
    expect(isAdjacent).toBe(true);
  });

  it('startHarvestAt to Gold stops adjacent', () => {
    const engine = new GameEngine(42);
    engine.map[60][64].resource = { type: 'gold' as any, amount: 50 };

    engine.startHarvestAt(64, 60);
    expect(engine.isHarvesting()).toBe(true);

    for (let i = 0; i < 15; i++) engine.tick();

    const isAdjacent = Math.max(Math.abs(engine.player.x - 64), Math.abs(engine.player.y - 60)) <= 1;
    expect(isAdjacent).toBe(true);
  });

  it('startMoveTo to grass remains unchanged', () => {
    const engine = new GameEngine(42);
    engine.map[60][64].terrain = 'grass';

    engine.startMoveTo(64, 60);
    for (let i = 0; i < 16; i++) engine.tick();

    expect(engine.player.x).toBe(64);
    expect(engine.player.y).toBe(60);
  });

  it('startMoveTo to sand remains unchanged', () => {
    const engine = new GameEngine(42);
    engine.map[60][64].terrain = 'sand';

    engine.startMoveTo(64, 60);
    for (let i = 0; i < 16; i++) engine.tick();

    expect(engine.player.x).toBe(64);
    expect(engine.player.y).toBe(60);
  });

  it('startMoveTo to adjacent forest tile (distance 1) works', () => {
    const engine = new GameEngine(42);
    engine.map[60][61].terrain = 'forest';

    engine.startMoveTo(61, 60);
    for (let i = 0; i < 6; i++) engine.tick();

    expect(engine.player.x).toBe(61);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][61].terrain).toBe('grass');
  });

  it('startMoveTo to adjacent rock tile (distance 1) works', () => {
    const engine = new GameEngine(42);
    engine.map[60][61].terrain = 'rock';

    engine.startMoveTo(61, 60);
    for (let i = 0; i < 6; i++) engine.tick();

    expect(engine.player.x).toBe(61);
    expect(engine.player.y).toBe(60);
    expect(engine.map[60][61].terrain).toBe('grass');
  });
});
