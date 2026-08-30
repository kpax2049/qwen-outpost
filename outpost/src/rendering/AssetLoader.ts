/**
 * Relay Seven asset loader.
 *
 * Loads 32x32 sprite PNGs from the public assets directory and pre-renders them
 * at 2x scale (64px) onto offscreen canvases so the main render loop only does
 * fast blits.  Nearest-neighbor scaling guarantees pixel-crisp output – no blur.
 */

const BASE_URL = '/assets/relay-seven';

/** A single pre-rendered tile ready for blitting. */
export interface TileSprite {
  /** The pre-rendered 64x64 canvas (2x the 32px source sprite). */
  canvas: HTMLCanvasElement;
  /** The raw Image element (available for other uses). */
  image: HTMLImageElement;
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
   * Load all Relay Seven sprites.
   * @param keys – sprite filename prefix list (without .png extension).
   */
  async load(keys: string[]): Promise<void> {
    if (this.loaded) return;

    const loadOne = (key: string): Promise<TileSprite> =>
      new Promise<TileSprite>((res, rej) => {
        const img = new Image();
        img.onload = () => {
          // Pre-render at 2x (64px) with nearest-neighbor for crisp pixel art.
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 64;
          const ctx = c.getContext('2d')!;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, 64, 64);
          res({ canvas: c, image: img });
        };
        img.onerror = () => rej(new Error(`Failed to load sprite: ${key}`));
        img.src = `${BASE_URL}/${key}.png`;
      });

    try {
      const results = await Promise.all(keys.map(loadOne));
      for (const s of results) {
        // Use the filename stem (without extension) as the key.
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

  /** Block until all assets are loaded. */
  whenReady(): Promise<void> {
    return this.ready;
  }
}
