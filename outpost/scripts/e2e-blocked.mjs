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

await page.addInitScript(() => {
  try { localStorage.setItem('outpost-tutorial-done', '1'); } catch {}
});
await page.goto(url, { waitUntil: 'networkidle' });

await page.evaluate(() => {
  const eng = window.__outpost.engine;

  // Deterministic open area.
  const cx = 60, cy = 60;
  for (let dy = -2; dy <= 4; dy++) {
    for (let dx = -1; dx <= 3; dx++) {
      const t = eng.map[cy + dy][cx + dx];
      t.terrain = 'grass';
      t.resource = undefined;
      t.building = undefined;
    }
  }
  eng.player.inventory = [
    { type: 'stone', amount: 50 }, { type: 'iron', amount: 50 },
    { type: 'copper', amount: 50 }, { type: 'coal', amount: 50 },
    { type: 'gold', amount: 50 },
  ];

  // Head-on pair: belt A (60,60) faces Down into belt B (60,61) which faces Up.
  eng.placeBuildingAt('generator', 61, 61);
  eng.player.inventory.find(i => i.type === 'coal').amount = 50;
  eng.player.x = 61; eng.player.y = 60;
  eng.depositItemToBuilding(61, 61, 'coal');

  const placeBelt = (x, y, direction) => {
    eng.map[y][x].terrain = 'grass';
    eng.map[y][x].building = {
      type: 'conveyor', direction, active: false, powerConsumed: 1,
      powerProduced: undefined, inventory: [], maxInventory: 1,
      progress: 0, maxProgress: 12, producesItem: undefined, consumesItems: undefined, outputDirection: undefined,
    };
  };
  placeBelt(60, 60, 2); // Down
  placeBelt(60, 61, 0); // Up — head-on into belt A
  eng.map[60][60].building.inventory = [{ type: 'stone', amount: 1 }];

  return true;
});

const setupState = await page.evaluate(() => {
  const eng = window.__outpost.engine;
  const b60 = eng.map[60][60].building;
  const b61 = eng.map[50] ? null : null;
  return {
    b60: b60 ? { type: b60.type, dir: b60.direction, inv: b60.inventory.map(i => ({ ...i })) } : null,
    b6061: eng.map[61][60].building ? { type: eng.map[61][60].building.type, dir: eng.map[61][60].building.direction } : null,
    player: { x: eng.player.x, y: eng.player.y },
    gen: eng.map[61][61].building ? eng.map[61][61].building.type : null,
  };
});
console.log('SETUP_STATE', JSON.stringify(setupState));

await page.waitForTimeout(1200);

const snapshot = await page.evaluate(() => {
  const eng = window.__outpost.engine;
  const a = eng.map[60][60].building;   // world (60,60)
  const b = eng.map[61][60].building;   // world (60,61)
  const status = eng.inspectBuilding(60, 60);
  return {
    aBlocked: a.blocked ?? false,
    aInventory: a.inventory.map(i => ({ ...i })),
    bInventory: b.inventory.map(i => ({ ...i })),
    aActive: a.active,
    status: status.status,
    statusColor: status.statusColor,
  };
});

console.log('SNAPSHOT', JSON.stringify(snapshot, null, 2));

const assert = (cond, msg, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
  if (!cond) process.exitCode = 1;
};

assert(snapshot.aBlocked === true, 'head-on belt reports blocked', { aBlocked: snapshot.aBlocked });
assert(snapshot.aInventory.some(i => i.type === 'stone' && i.amount >= 1), 'blocked item is NOT pushed into the opposing belt', snapshot.aInventory);
assert(snapshot.bInventory.length === 0, 'opposing belt stays empty', snapshot.bInventory);
assert(snapshot.status.includes('head-on') || snapshot.status.includes('Blocked'), 'inspection status explains the block', snapshot.status);
assert(snapshot.statusColor === 'bad', 'blocked status is flagged bad', snapshot.statusColor);

// Pixel probe: the red gate + red chevrons must actually be drawn on the blocked belt.
const probe = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const eng = window.__outpost.engine;
  const px = eng.player.x, py = eng.player.y;
  // Belt A sits at (60,60): sample the row just above its bottom edge (exit facing Down).
  const tx = 60, ty = 60;
  const sx = W / 2 + (tx - px) * 48;
  const sy = H / 2 + (ty - py) * 48;

  // Top-left corner of the belt tile — expect the dark plate, NOT bright grass.
  const plate = ctx.getImageData(Math.round(sx + 6), Math.round(sy + 6), 1, 1).data;

  let redish = 0;
  const scan = ctx.getImageData(Math.round(sx), Math.round(sy), 48, 48).data;
  for (let i = 0; i < scan.length; i += 4) {
    const r = scan[i], g = scan[i + 1], b = scan[i + 2];
    if (r > 150 && g < 130 && b < 130 && r - g > 40) redish++;
  }
  return { plate: Array.from(plate), redishPixels: redish };
});
assert(probe.redishPixels > 30, 'red blocked-gate pixels drawn on the belt', probe);
assert(!(probe.plate[1] > 90 && probe.plate[1] > probe.plate[0] + 40), 'belt renders, not bright grass', probe.plate);

console.log('CONSOLE_ERRORS', JSON.stringify(errors));
await page.screenshot({ path: outdir + '/e2e-blocked.png' });
await browser.close();