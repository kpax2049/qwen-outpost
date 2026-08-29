import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.OUTPOST_URL || 'http://localhost:5173';
const outdir = 'C:/Users/kpax2049/AppData/Local/Temp/opencode/shots';
fs.mkdirSync(outdir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(url, { waitUntil: 'networkidle' });

const res = await page.evaluate(() => {
  const eng = window.__outpost.engine;

  // deterministic open area + full scenario injected in-engine (bypasses click/placement randomness)
  const map = eng.map;
  const cx = 30, cy = 30;
  for (let dy = -4; dy <= 8; dy++) {
    for (let dx = -4; dx <= 8; dx++) {
      const t = map[cy + dy][cx + dx];
      t.terrain = 'grass';
      t.resource = undefined;
      t.building = undefined;
    }
  }
  map[cy][cx].resource = { type: 'coal', amount: 200 };
  const miner = {
    type: 'miner', direction: 1, active: false, powerConsumed: 5,
    powerProduced: undefined, inventory: [], maxInventory: 10,
    progress: 0, maxProgress: 30, producesItem: 'coal', consumesItems: undefined, outputDirection: undefined,
  };
  const belt = (direction) => ({
    type: 'conveyor', direction, active: false, powerConsumed: 1,
    powerProduced: undefined, inventory: [], maxInventory: 1,
    progress: 0, maxProgress: 20, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  });
  map[cy][cx].building = miner;
  map[cy][cx + 1].building = belt(1); // east
  map[cy][cx + 2].building = belt(2); // south (turn)
  map[cy + 1][cx + 2].building = belt(2); // south
  map[cy + 2][cx + 2].building = {
    type: 'generator', direction: 0, active: false, powerConsumed: 0,
    powerProduced: 50, inventory: [], maxInventory: 20,
    progress: 0, maxProgress: 1, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
  };
  eng.player.x = cx;
  eng.player.y = cy + 4;

  for (let i = 0; i < 300; i++) eng.tick();

  const t = (x, y) => map[y][x].building;
  const inv = (b) => (b ? JSON.stringify(b.inventory) : 'none');
  return {
    miner: inv(t(cx, cy)),
    beltA: inv(t(cx + 1, cy)),
    beltB: inv(t(cx + 2, cy)),
    beltC: inv(t(cx + 2, cy + 1)),
    generator: inv(t(cx + 2, cy + 2)),
    generatorActive: t(cx + 2, cy + 2) ? t(cx + 2, cy + 2).active : null,
    resourceAmount: map[cy][cx].resource ? map[cy][cx].resource.amount : -1,
  };
});

console.log('SNAPSHOT', JSON.stringify(res, null, 2));
console.log('CONSOLE_ERRORS', JSON.stringify(errors));
await page.screenshot({ path: outdir + '/baseline.png' });
await browser.close();