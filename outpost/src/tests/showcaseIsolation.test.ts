import { describe, it, expect } from 'vitest';
import { makeEngine, isolatedOptions, gameplayOptions, showcaseOptions } from '../showcase/scenes';
import { Dir } from '../types';

/**
 * Regression guard for the "player covers isolated asset swatches" defect.
 *
 * Swatches (terrain / resource / building / machine-state boards) must never
 * render the player, while gameplay-style scenes (populated base, construction,
 * inspection, HUD) keep the player exactly as normal play does.
 */
describe('showcase isolation options', () => {
  it('isolated asset boards disable the player sprite', () => {
    const opts = isolatedOptions();
    expect(opts.showPlayer).toBe(false);
  });

  it('gameplay-style scenes enable the player sprite', () => {
    const opts = gameplayOptions();
    expect(opts.showPlayer).toBe(true);
  });

  it('isolated boards keep the minimap hidden', () => {
    const opts = isolatedOptions();
    expect(opts.showMinimap).toBe(false);
  });

  it('gameplay scenes keep the minimap hidden (showcase)', () => {
    const opts = gameplayOptions();
    expect(opts.showMinimap).toBe(false);
  });

  it('isolatedOptions can be overridden to explicitly show the player (labeled example)', () => {
    const opts = isolatedOptions({ showPlayer: true });
    expect(opts.showPlayer).toBe(true);
  });

  it('the neutral showcase fallback does not disable the player', () => {
    // WorldCanvas falls back to showcaseOptions() when a scene omits options;
    // it must NOT hide the player, or gameplay scenes would lose it.
    expect(showcaseOptions().showPlayer).toBeUndefined();
  });

  it('makeEngine places the player on the asset board centre (why isolation is required)', () => {
    // Documents the root cause: asset swatches are built around tile (60,60),
    // which is exactly where makeEngine spawns the player — so isolation is
    // mandatory or the player covers the swatch.
    const e = makeEngine();
    expect(e.player.x).toBe(60);
    expect(e.player.y).toBe(60);
    expect(e.player.facing).toBe(Dir.Down);
  });
});
