/**
 * End-to-end browser verification of the QOL + power-explicitness milestone.
 *
 * Drives the real UI (mouse drag, keyboard, canvas clicks) and the exposed
 * `window.__outpost.engine` test hook for deterministic setup and assertions.
 *
 * Coverage:
 *   1) Fresh start: gather + build enough to establish working power
 *   2) A powered machine clearly says WHY it runs / stops (shared grid text)
 *   3) Removing generation -> visible LOSS-OF-POWER state
 *   4) Restoring power -> machines recover
 *   5) Multi-tile conveyor route with a turn in one drag (continuous workflow)
 *   6) Move + keep placing without reopening the Build menu
 *   7) Cancellation / rotation / removal / inspection / camera / movement don't conflict
 */
import { chromium } from 'playwright';
import fs from 'fs';

const url = process.env.OUTPOST_URL || 'http://localhost:5173';
const outdir = 'C:/Users/kpax2049/AppData/Local/Temp/opencode/shots';
fs.mkdirSync(outdir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem('outpost-save');
    localStorage.setItem('outpost-tutorial-done', '1');
  } catch {}
});

await page.goto(url, { waitUntil: 'networkidle' });

let pass = 0, fail = 0;
const assert = (cond, msg, extra) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);
  if (cond) pass++; else { fail++; process.exitCode = 1; }
};

const TILE = 48;
// Screen coordinate of a world tile's center using the live camera.
const tileScreen = (px, py) => page.evaluate(([x, y]) => {
  const c = window.__outpost.camera;
  const z = c.zoom;
  return {
    x: c.x + (x + 0.5) * 48 * z,
    y: c.y + (y + 0.5) * 48 * z,
  };
}, [px, py]);

const placePlayer = (x, y) => page.evaluate(([x, y]) => {
  const e = window.__outpost.engine;
  e.player.x = x; e.player.y = y;
}, [x, y]);

// Clear a rectangular area and make it buildable; fund player.
const setupArea = (ax, ay, bx, by) => page.evaluate(([ax, ay, bx, by]) => {
  const e = window.__outpost.engine;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    const t = e.map[y][x];
    t.terrain = 'grass'; t.resource = undefined; t.building = undefined;
  }
  e.player.inventory = [
    { type: 'stone', amount: 200 }, { type: 'iron', amount: 200 },
    { type: 'copper', amount: 200 }, { type: 'coal', amount: 200 },
    { type: 'gold', amount: 200 }, { type: 'wood', amount: 50 },
  ];
}, [ax, ay, bx, by]);

const buildingAt = (x, y) => page.evaluate(([x, y]) => {
  const b = window.__outpost.engine.map[y][x].building;
  return b ? { type: b.type, dir: b.direction, active: b.active, inv: b.inventory.map(i => ({ ...i })) } : null;
}, [x, y]);

const bodyText = () => page.evaluate(() => document.body.innerText || '');

// ---------------------------------------------------------------
// SCENARIO 1 + infrastructure for all scenarios
// ---------------------------------------------------------------
console.log('\n=== Fresh build flow: gather + establish working power ===');

// Deterministic open zone around (60,60); put coal under (60,64) area.
await setupArea(55, 55, 68, 69);
await placePlayer(60, 60);
await page.evaluate(() => {
  const e = window.__outpost.engine;
  e.map[64][60].terrain = 'grass';
  e.map[64][60].resource = { type: 'coal', amount: 40 };
  // put a wood tree near start to demonstrate gathering
  e.map[59][60].terrain = 'forest';
  e.map[58][61].terrain = 'rock';
});
await page.waitForTimeout(300);

// Gather via E to show fresh-start gathering works (facing down -> (60,61)? no).
// Face down toward the forest at (60,59): move up one so facing = down? facing tracks last move.
// Simpler: walk right then look at forest by facing up.
await page.keyboard.press('w');            // facing up -> (60,59) forest ahead
await page.waitForTimeout(100);
await page.keyboard.press('e');            // chop wood from facing tree
await page.waitForTimeout(100);
const woodAfter = await page.evaluate(() => window.__outpost.engine.player.inventory.find(i => i.type === 'wood')?.amount ?? 0);
assert(woodAfter > 50, 'gathered wood via E from a fresh map', { woodAfter });

// Move back to work area.
await placePlayer(60, 63);
await page.waitForTimeout(400);

// Use the REAL build menu + canvas click to place a generator on (60,64)? Coal is there.
// We'll place generator on a grass tile (60,66) and miner on the coal (60,64).
// Open the build menu, select generator via menu click.
await page.keyboard.press('b');
await page.waitForTimeout(200);
const menuText = await bodyText();
assert(menuText.includes('Build Menu'), 'B opens the Build Menu', { has: menuText.includes('Build Menu') });

// Select Generator by clicking its menu row.
const genPos = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter(d => d.textContent.includes('Coal Generator'));
  const row = rows.find(r => r.querySelector('div') && getComputedStyle(r).cursor === 'pointer');
  if (!row) return null;
  const box = row.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
});
assert(!!genPos, 'Coal Generator row found in build menu', genPos);
if (genPos) await page.mouse.click(genPos.x, genPos.y);

// Position the player near the generator build site, then click the tile to place.
await placePlayer(60, 65);
await page.waitForTimeout(500); // let camera follow
let s = await tileScreen(60, 66);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(300);
let placed = await buildingAt(60, 66);
assert(placed && placed.type === 'generator', 'placed a Coal Generator via canvas click', placed);

// While still armed (sticky), move and place a Miner on the coal deposit without reopening menu.
await placePlayer(60, 63);
await page.waitForTimeout(400);
// Switch tool via menu to Miner (menu still open).
const minerPos = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter(d => d.textContent.trim().startsWith('Miner'));
  const row = rows.find(r => getComputedStyle(r).cursor === 'pointer' && r.textContent.includes('Automatically mines'));
  if (!row) return null;
  const box = row.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
});
assert(!!minerPos, 'Miner row found in build menu', minerPos);
if (minerPos) await page.mouse.click(minerPos.x, minerPos.y);
await page.waitForTimeout(300);
s = await tileScreen(60, 64);
await page.mouse.click(s.x, s.y);   // place miner on coal
await page.waitForTimeout(300);
placed = await buildingAt(60, 64);
assert(placed && placed.type === 'miner', 'placed a Miner on the coal deposit via click', placed);

// Deselect the (sticky) build tool AND close the Build menu so later panels are clean.
await page.keyboard.press('Escape');
await page.waitForTimeout(120);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// Feed the generator coal (real deposit flow: inspect + Give coal button).
// Stand next to the generator and click it to inspect, then click a Give Coal +1 button.
await placePlayer(60, 65);
await page.waitForTimeout(400);
s = await tileScreen(60, 66);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(400);
let gaveCoal = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => x.textContent.trim() === 'Coal +1' && !x.disabled);
  if (b) { b.click(); return true; }
  return false;
});
assert(gaveCoal, 'inspected generator and deposited Coal via the Give button', { gaveCoal });
// Give a total of 5 coal so the generator stays fueled for the whole run.
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Coal +1' && !x.disabled);
    if (b) b.click();
  });
  await page.waitForTimeout(80);
}
await page.keyboard.press('Escape'); // close inspection

// Let the sim run; miner+generator power up.
await page.evaluate(() => { window.__outpost.engine.setTickRate(20); });
await page.waitForTimeout(1200);

let gen = await buildingAt(60, 66);
let miner = await buildingAt(60, 64);
let power = await page.evaluate(() => {
  const e = window.__outpost.engine;
  const p = e.getPowerSummary();
  return { enough: p.enough, produced: p.produced, consumed: p.consumed, fueled: p.fueledGenerators };
});
assert(power.fueled >= 1, 'generator is fueling (producing power)', power);
assert(gen && gen.active, 'generator is active/running', gen && gen.active);
assert(miner && miner.active, 'miner is powered and running', miner && miner.active);
assert(power.enough, 'power grid shows enough power', power);

// Screenshot showing power links + power panel.
await page.screenshot({ path: outdir + '/qol-power-on.png' });

// ---------------------------------------------------------------
// SCENARIO 2: a powered machine clearly explains WHY it runs
// ---------------------------------------------------------------
console.log('\n=== Scenario 2: powered machine explains why it runs ===');
// Inspect the miner (it should show "shared Outpost Grid" powered wording).
await placePlayer(60, 63);
await page.waitForTimeout(400);
s = await tileScreen(60, 64);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(400);
const minerText = await bodyText();
assert(/Powered/.test(minerText) && /shared Outpost Grid/.test(minerText),
  'inspection panel explains the machine is powered by the shared grid', { hasPowered: /Powered/.test(minerText), hasGrid: /shared Outpost Grid/.test(minerText) });
await page.keyboard.press('Escape'); // close inspection

// ---------------------------------------------------------------
// SCENARIO 3: remove/exhaust generation -> obvious LOSS-OF-POWER
// ---------------------------------------------------------------
console.log('\n=== Scenario 3: exhaust generation -> visible loss of power ===');
// Empty the generator's coal and confirm the miner stops + grid goes LOW.
await page.evaluate(() => {
  const e = window.__outpost.engine;
  const g = e.map[66][60].building; // generator at (60,66)
  g.inventory = [];
  g.active = false;
});
await page.waitForTimeout(1200);
power = await page.evaluate(() => {
  const p = window.__outpost.engine.getPowerSummary();
  return { enough: p.enough, produced: p.produced, consumed: p.consumed };
});
miner = await buildingAt(60, 64);
assert(power.enough === false, 'grid reports LOW (insufficient power) after fuel removed', power);
assert(miner && miner.active === false, 'miner stopped when power was lost', miner);

const lowPanel = await bodyText();
assert(lowPanel.includes('OUTPOST POWER GRID') && /LOW/.test(lowPanel),
  'HUD power panel visibly shows LOW state', { hasLOW: /LOW/.test(lowPanel) });

// Inspect the miner to confirm the "No Power — shared Outpost Grid" explanation.
s = await tileScreen(60, 64);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(400);
const noPowerText = await bodyText();
assert(/No Power/i.test(noPowerText) && /shared Outpost Grid/i.test(noPowerText),
  'stopped machine explains "No Power — shared Outpost Grid"', { hasNoPower: /No Power/i.test(noPowerText) });
await page.screenshot({ path: outdir + '/qol-power-low.png' });
await page.keyboard.press('Escape'); // close inspection

// ---------------------------------------------------------------
// SCENARIO 4: restore power -> machines recover
// ---------------------------------------------------------------
console.log('\n=== Scenario 4: restore power -> machines recover ===');
await placePlayer(60, 65);
await page.waitForTimeout(400);
s = await tileScreen(60, 66);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(300);
// give 5 coal
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Coal +1' && !x.disabled);
    if (b) b.click();
  });
  await page.waitForTimeout(80);
}
await page.waitForTimeout(1500);
miner = await buildingAt(60, 64);
gen = await buildingAt(60, 66);
power = await page.evaluate(() => ({ ...window.__outpost.engine.getPowerSummary() }));
assert(power.fueledGenerators >= 1 && power.enough === true, 'power restored (grid OK again)', power);
assert(gen && gen.active && miner && miner.active, 'generator and miner recovered after power restored',
  { genActive: gen && gen.active, minerActive: miner && miner.active });
await page.screenshot({ path: outdir + '/qol-power-recovered.png' });
await page.keyboard.press('Escape');

// ---------------------------------------------------------------
// SCENARIO 5+6: conveyor drag route with a turn + continuous build
// ---------------------------------------------------------------
console.log('\n=== Scenario 5+6: multi-tile conveyor route with a turn, in one drag ===');
// Build a belt route: from (62,62) -> (62,66) with a corner. Player stays put while dragging.
// Ensure the area is clear & fund remains.
await page.evaluate(() => {
  const e = window.__outpost.engine;
  for (let y = 62; y <= 68; y++) for (let x = 62; x <= 66; x++) {
    const t = e.map[y][x]; t.terrain = 'grass'; t.resource = undefined; t.building = undefined;
  }
  e.player.inventory.push({ type: 'stone', amount: 200 });
});
await placePlayer(64, 68);
await page.waitForTimeout(500);

// Open build menu + select Conveyor.
await page.keyboard.press('b');
await page.waitForTimeout(200);
const beltPos = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter(d => d.textContent.trim().startsWith('Conveyor'));
  const row = rows.find(r => getComputedStyle(r).cursor === 'pointer' && r.textContent.includes('Transports items'));
  if (!row) return null;
  const box = row.getBoundingClientRect();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
});
assert(!!beltPos, 'Conveyor row found in build menu', beltPos);
if (beltPos) await page.mouse.click(beltPos.x, beltPos.y);
await page.waitForTimeout(300);

// Drag from (62,66) up 4 tiles then left 1 -> an L route with a turn: (62,66)->(62,62)->(61,62)
const startS = await tileScreen(62, 66);
const turnS = await tileScreen(62, 62);
const endS = await tileScreen(61, 62);
await page.mouse.move(startS.x, startS.y);
await page.mouse.down();
await page.mouse.move(turnS.x, turnS.y, { steps: 10 });
await page.mouse.move(endS.x, endS.y, { steps: 8 });
await page.screenshot({ path: outdir + '/qol-belt-drag.png' });
await page.mouse.up();
await page.waitForTimeout(400);

// Inspect the laid belt orientations.
const beltState = await page.evaluate(() => {
  const M = window.__outpost.engine.map;
  const cells = [];
  for (const [x, y] of [[62,66],[62,65],[62,64],[62,63],[62,62],[61,62]]) {
    const b = M[y][x].building;
    cells.push({ x, y, type: b && b.type, dir: b && b.direction });
  }
  return cells;
});
const beltCount = beltState.filter(c => c.type === 'conveyor').length;
assert(beltCount === 6, 'dragged a 6-belt route in one stroke (all placed)', { beltCount, beltState });
// Dominant-axis-first path walks up the column then left: column belts point
// Up (0), the corner belt at (62,62) turns LEFT (3) into (61,62), and the final
// belt also points Left (3). Items flow (62,66)->(62,62)->(61,62).
const corner = beltState.find(c => c.x === 62 && c.y === 62);
const afterCorner = beltState.find(c => c.x === 61 && c.y === 62);
assert(corner && corner.dir === 3, 'corner belt laid pointing through the turn (Left)', corner);
assert(afterCorner && afterCorner.dir === 3, 'final belt points Left after the turn', afterCorner);

// Tool should still be armed (sticky) after placing the route.
const stillArmed = await page.evaluate(() => document.body.innerText.includes('Building: Conveyor'));
assert(stillArmed, 'conveyor tool stayed armed after placing a route (sticky)', { stillArmed });

// Move with WASD while the tool is armed — movement must NOT be hijacked.
const before = await page.evaluate(() => ({ x: window.__outpost.engine.player.x, y: window.__outpost.engine.player.y }));
await page.keyboard.press('s');
await page.waitForTimeout(120);
const afterMove = await page.evaluate(() => ({ x: window.__outpost.engine.player.x, y: window.__outpost.engine.player.y }));
assert(afterMove.y > before.y, 'WASD movement works while a build tool is armed (not hijacked)', { before, after: afterMove });

// Continue placing (sticky) without reopening menu: click one more belt.
const extraS = await tileScreen(60, 62);
await page.mouse.click(extraS.x, extraS.y);
await page.waitForTimeout(300);
const extra = await buildingAt(60, 62);
assert(extra && extra.type === 'conveyor', 'placed an extra conveyor without reopening the Build menu', extra);
await page.keyboard.press('Escape'); // first Esc: deselect tool, menu stays

const afterEsc1 = await bodyText();
assert(afterEsc1.includes('Build Menu') && !afterEsc1.includes('Building: Conveyor'),
  'Esc #1 deselects the tool but keeps the Build Menu open', { menuStill: afterEsc1.includes('Build Menu'), toolGone: !afterEsc1.includes('Building: Conveyor') });

await page.keyboard.press('Escape'); // second Esc: close menu
await page.waitForTimeout(200);
const afterEsc2 = await bodyText();
assert(!afterEsc2.includes('Build Menu'), 'Esc #2 closes the Build Menu (staged)', { menuClosed: !afterEsc2.includes('Build Menu') });

// ---------------------------------------------------------------
// SCENARIO 7: rotation / removal / inspection / camera don't conflict
// ---------------------------------------------------------------
console.log('\n=== Scenario 7: rotation, removal, inspection, camera all coexist ===');
// Stand on a belt, press R to rotate it.
await placePlayer(60, 62);
await page.waitForTimeout(400);
const beltDirBefore = await page.evaluate(() => window.__outpost.engine.map[62][60].building.direction);
await page.keyboard.press('r');
await page.waitForTimeout(150);
const beltDirAfter = await page.evaluate(() => window.__outpost.engine.map[62][60].building.direction);
assert(beltDirAfter === (beltDirBefore + 1) % 4, 'R rotates the belt underfoot (rotation works)', { before: beltDirBefore, after: beltDirAfter });

// Q removes it (50% refund).
await page.keyboard.press('q');
await page.waitForTimeout(200);
const removed = await buildingAt(60, 62);
assert(removed === null, 'Q removes the building underfoot (removal works)', { removed });

// Inspection: click a belt (not in build mode) opens inspector.
s = await tileScreen(62, 63);
await page.mouse.click(s.x, s.y);
await page.waitForTimeout(400);
const inspText = await bodyText();
assert(inspText.includes('Conveyor'), 'clicking a conveyor inspects it', { has: inspText.includes('Conveyor') });
await page.keyboard.press('Escape');

// Camera: zoom + pan still function.
const zoom0 = await page.evaluate(() => window.__outpost.camera.zoom);
await page.mouse.wheel(0, -240);
await page.waitForTimeout(200);
const zoom1 = await page.evaluate(() => window.__outpost.camera.zoom);
assert(zoom1 > zoom0, 'scroll wheel zooms the camera', { zoom0, zoom1 });

console.log('\n=== RESULT ===');
console.log(`PASS=${pass} FAIL=${fail}`);
console.log('CONSOLE_ERRORS', JSON.stringify(errors));
await browser.close();
