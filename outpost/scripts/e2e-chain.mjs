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

// Dismiss the tutorial so it doesn't overlay the canvas clicks.
await page.addInitScript(() => {
  try { localStorage.setItem('outpost-tutorial-done', '1'); } catch {}
});
await page.goto(url, { waitUntil: 'networkidle' });

const setup = await page.evaluate(() => {
  const eng = window.__outpost.engine;

  // Deterministic open area around the player.
  const cx = 60, cy = 60;
  for (let dy = -2; dy <= 4; dy++) {
    for (let dx = -1; dx <= 3; dx++) {
      const t = eng.map[cy + dy][cx + dx];
      t.terrain = 'grass';
      t.resource = undefined;
      t.building = undefined;
    }
  }

  // Fund the player so the real placement/deposit APIs can be used.
  eng.player.inventory = [
    { type: 'stone', amount: 50 }, { type: 'iron', amount: 50 },
    { type: 'copper', amount: 50 }, { type: 'coal', amount: 50 },
    { type: 'gold', amount: 50 },
  ];

  const setDir = d => eng.setBuildDirection(d);
  // Miner at (60,59) on coal, belt east, belt turns south, belt south, generator south.
  eng.map[59][60].resource = { type: 'coal', amount: 20 };
  eng.map[59][60].terrain = 'grass';
  setDir(1);
  eng.placeBuildingAt('miner', 60, 59);
  eng.placeBuildingAt('conveyor', 61, 59);
  setDir(2);
  eng.placeBuildingAt('conveyor', 62, 59);
  eng.placeBuildingAt('conveyor', 62, 60);
  eng.placeBuildingAt('generator', 62, 61);

  // Bootstrap generator fuel (player near enough to deposit).
  eng.player.x = 62; eng.player.y = 62;
  for (let i = 0; i < 5; i++) eng.depositItemToBuilding(62, 61, 'coal');

  // Stand the player ON the generator tile for the whole run: by the time we click,
  // the camera has fully centered on it, so the canvas center IS the generator.
  eng.player.x = 62; eng.player.y = 61;

  // Run the sim fast so the delivery completes quickly.
  eng.setTickRate(20);

  return true;
});
if (!setup) throw new Error('setup failed');

// ~20 ticks/sec * 8s ≈ 160 ticks — miner produces + belts deliver into the generator.
await page.waitForTimeout(8000);

const snapshot = await page.evaluate(() => {
  const eng = window.__outpost.engine;
  const t = (x, y) => eng.map[y][x].building;
  const gen = t(62, 61);
  const belts = [t(61, 59), t(62, 59), t(62, 60)].map(b => ({
    dir: b.direction,
    blocked: b.blocked ?? false,
    progress: b.progress,
    inventory: b.inventory.map(i => ({ ...i })),
  }));
  const power = eng.getPowerSummary();
  const player = { x: eng.player.x, y: eng.player.y };
  return {
    genCoal: gen.inventory.filter(i => i.type === 'coal').reduce((s, i) => s + i.amount, 0),
    fuelBurned: gen.fuelBurned ?? 0,
    genActive: gen.active,
    belts,
    power,
    player,
    resourceAmount: eng.map[59][60].resource ? eng.map[59][60].resource.amount : -1,
    hasBeltSprites: belts.some(b => b.inventory.length > 0),
  };
});

console.log('SNAPSHOT', JSON.stringify(snapshot, null, 2));

// --- Assertions on the simulation ---
const assert = (cond, msg, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
  if (!cond) process.exitCode = 1;
};

assert(snapshot.genCoal > 5, 'generator received belt-delivered coal (bootstrap + delivered)', { genCoal: snapshot.genCoal });
assert(snapshot.fuelBurned > 0, 'generator burned coal from the delivered line', { fuelBurned: snapshot.fuelBurned });
assert(snapshot.genActive === true, 'generator is active (fueled)', { genActive: snapshot.genActive });
assert(snapshot.power.enough === true, 'power grid has enough power', { power: snapshot.power });
assert(snapshot.power.fueledGenerators >= 1 && snapshot.power.produced >= 50, 'power grid counts the fueled generator', snapshot.power);
assert(snapshot.resourceAmount < 20, 'miner consumed its deposit', { resourceAmount: snapshot.resourceAmount });
assert(snapshot.belts.every(b => b.blocked === false), 'no belt is blocked during healthy chain', { belts: snapshot.belts });

// --- UI-level checks ---
const ui = await page.evaluate(() => ({
  powerPanel: !![...document.querySelectorAll('*')].find(el => el.textContent === 'POWER GRID'),
}));
assert(ui.powerPanel, 'POWER GRID panel rendered in the HUD', ui);

// Click the generator tile: the camera is centered on the player who stands ON the
// generator. Click a few px off the exact center because at full convergence the
// center pixel sits exactly on a tile corner (float precision flips the tile).
const cx = page.viewportSize().width / 2 + 16;
const cy = page.viewportSize().height / 2 + 16;
await page.mouse.click(cx, cy);
await page.waitForTimeout(800);
const hitProbe = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return { tag: el ? el.tagName : 'none', cls: el ? el.className : '', id: el ? el.id : '' };
}, [cx, cy]);
console.log('HIT_PROBE', JSON.stringify(hitProbe));
const inspectText = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')];
  const txt = all.map(el => el.textContent).join(' | ');
  // The inspection panel is the fixed element carrying its own button row / empty-state text.
  const panel = all.find(el => {
    const s = getComputedStyle(el);
    return (el.textContent.includes('Give one from your inventory') || el.textContent.includes('Click any tile to inspect'))
      && s.position === 'absolute' && s.zIndex > 10;
  });
  return { full: txt, panel: panel ? panel.textContent : 'NO PANEL' };
});
assert(inspectText.full.includes('Coal Generator'), 'clicking generator opens its inspection panel', { full: inspectText.full.includes('Coal Generator') });
assert(inspectText.full.includes('Fuel (Coal)'), 'inspection panel shows generator fuel section', { panel: inspectText.panel });
assert(inspectText.full.includes('Power:'), 'inspection panel shows power', { panel: inspectText.panel });

console.log('CONSOLE_ERRORS', JSON.stringify(errors));
await page.screenshot({ path: outdir + '/e2e-chain.png' });
await browser.close();