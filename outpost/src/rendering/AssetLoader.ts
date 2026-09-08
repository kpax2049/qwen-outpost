/**
 * Relay Seven asset loader.
 *
 * Loads sprite PNGs from the public assets directory and pre-renders them at a
 * target scale onto offscreen canvases so the main render loop only does fast
 * blits.  Nearest-neighbor scaling guarantees pixel-crisp output — no blur.
 */

import { TILE_SIZE } from '../types';

const BASE_URL = '/assets/relay-seven';

/** A single pre-rendered tile ready for blitting. */
export interface TileSprite {
  /** The pre-rendered canvas scaled to the target size. */
  canvas: HTMLCanvasElement;
  /** The raw Image element (available for other uses). */
  image: HTMLImageElement;
  /** Original pixel dimensions of the source sprite. */
  origW: number;
  origH: number;
}

export class AssetLoader {
  private sprites: Map<string, TileSprite> = new Map();
  private loaded = false;
  private resolve!: () => void;
  private reject!: (err: Error) => void;
  private ready = new Promise<void>((res, rej) => {
    this.resolve = res;
    this.reject = rej;
  });

  /** All sprite keys that are available after load. */
  keys(): string[] {
    return [...this.sprites.keys()];
  }

  /** Get a pre-rendered tile sprite by key. Returns undefined if still loading or not found. */
  get(key: string): TileSprite | undefined {
    return this.sprites.get(key);
  }

  /**
   * Load all sprites.
   * @param keys – sprite filename prefix list (without .png extension).
   * @param size – target pixel size for each sprite's canvas. Defaults to TILE_SIZE (48).
   */
  async load(keys: string[], size?: number): Promise<void> {
    if (this.loaded) return;
    const targetSize = size ?? TILE_SIZE;

    const loadOne = (key: string): Promise<TileSprite> =>
      new Promise<TileSprite>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = targetSize;
          c.height = targetSize;
          const ctx = c.getContext('2d')!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, targetSize, targetSize);
          res({
            canvas: c,
            image: img,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
          });
        };
        img.onerror = () => rej(new Error(`Failed to load sprite: ${key}`));
        img.src = `${BASE_URL}/${key}.png`;
      });

    try {
      const results = await Promise.all(keys.map(loadOne));
      for (const s of results) {
        const stem = s.image.src.split('/').pop()!.replace('.png', '');
        this.sprites.set(stem, s);
      }
      this.loaded = true;
      this.resolve();
    } catch (err) {
      this.reject(err as Error);
      throw err;
    }
  }

  /**
   * Load sprites at a custom size (not TILE_SIZE).
   * Useful for assets with non-standard dimensions (e.g., multi-tile structures).
   * @param keys – sprite filename prefix list (without .png extension).
   * @param size – target pixel size for each sprite's canvas.
   */
  async loadCustom(keys: { name: string; size: number }[]): Promise<void> {
    const loadOne = (key: { name: string; size: number }): Promise<TileSprite> =>
      new Promise<TileSprite>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = key.size;
          c.height = key.size;
          const ctx = c.getContext('2d')!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, key.size, key.size);
          res({
            canvas: c,
            image: img,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
          });
        };
        img.onerror = () => rej(new Error(`Failed to load sprite: ${key.name}`));
        img.src = `${BASE_URL}/${key.name}.png`;
      });

    const results = await Promise.all(keys.map(loadOne));
    for (const s of results) {
      const stem = s.image.src.split('/').pop()!.replace('.png', '');
      this.sprites.set(stem, s);
    }
  }

  /** Block until all assets are loaded. */
  whenReady(): Promise<void> {
    return this.ready;
  }
}
