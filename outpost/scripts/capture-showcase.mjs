import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO_ROOT, 'design-handoff', 'screenshots');
const BASE_URL = process.env.SHOWCASE_BASE ?? 'http://localhost:5199';

const SCENES = [
  { key: 'atlas', file: '01-visual-atlas.png' },
  { key: 'terrain', file: '02-world-and-terrain.png' },
  { key: 'resources', file: '03-resources.png' },
  { key: 'machines', file: '04-buildings-and-machine-states.png' },
  { key: 'conveyors', file: '05-conveyors-and-routing.png' },
  { key: 'gameplay', file: '06-normal-gameplay.png' },
  { key: 'construction', file: '07-construction-mode.png' },
  { key: 'hud', file: '08-hud-and-build-ui.png' },
  { key: 'inspection', file: '09-inspection-and-power.png' },
  { key: 'help', file: '10-tutorial-objectives-help.png' },
];

// Which scenarios must keep the player sprite OFF (isolated asset boards)?
const ISOLATED_SCENES = new Set(['atlas', 'terrain', 'resources', 'machines', 'conveyors']);
// Which scenarios must keep the player sprite ON (gameplay-style scenes)?
const PLAYER_SCENES = new Set(['gameplay', 'construction', 'hud', 'inspection']);

// Verifies (deterministically, from canvas config) that isolated asset boards
// were actually rendered WITHOUT the player, and gameplay scenes WITH it.
async function verifyPlayerIsolation(page, key) {
  const report = await page.evaluate((scenario) => {
    const section = document.querySelector(`[data-scenario="${scenario}"]`);
    if (!section) return { found: false };
    const canvases = [...section.querySelectorAll('canvas')];
    const players = canvases.map((c) => c.dataset.showPlayer);
    const playerExampleCanvas = section.querySelector('[data-player-example] canvas');
    const playerExample = playerExampleCanvas?.dataset.showPlayer ?? null;
    const playerExampleIndex = playerExampleCanvas ? canvases.indexOf(playerExampleCanvas) : -1;
    return { found: true, players, playerExample, playerExampleIndex };
  }, key);
  return report;
}

// All isolated canvases must be player-free, excluding any labeled player-example
// canvas (only the atlas scenario has one).
function allIsolatedHidden(report) {
  const bad = [];
  for (let i = 0; i < report.players.length; i++) {
    const p = report.players[i];
    if (p === undefined) continue; // not a WorldCanvas (e.g. HUD internals)
    if (i === report.playerExampleIndex) continue; // deliberately rendered
    if (p !== 'false') bad.push(`${i}:${p}`);
  }
  return bad;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Optional filter: CAPTURE="atlas,terrain,resources,machines"
  const only = new Set(
    (process.env.CAPTURE || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const scenes = only.size ? SCENES.filter((s) => only.has(s.key)) : SCENES;
  const skipped = SCENES.filter((s) => !scenes.some((x) => x.key === s.key)).map((s) => s.file);

  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 1 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(`${BASE_URL}/showcase.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const hasHook = await page.evaluate(() => typeof window.__showcase?.show === 'function');
  if (!hasHook) {
    throw new Error('window.__showcase.show is not available on the showcase page.');
  }

  const results = [];
  const isolationFails = [];
  for (const { key, file } of scenes) {
    await page.evaluate((k) => window.__showcase.show(k), key);
    await page.waitForTimeout(250);

    // ---- Deterministic isolation verification (not just pixel checks) ----
    const rep = await verifyPlayerIsolation(page, key);
    if (!rep.found) {
      isolationFails.push(`[${key}] scenario section not found in DOM`);
    } else if (ISOLATED_SCENES.has(key)) {
      const offenders = allIsolatedHidden(rep);
      if (offenders.length) {
        isolationFails.push(`[${key}] isolated canvases rendered the player: ${JSON.stringify(offenders)}`);
      }
      if (key === 'atlas') {
        if (rep.playerExample === null) {
          isolationFails.push(`[atlas] labeled player example missing ([data-player-example] canvas not found)`);
        } else if (rep.playerExample !== 'true') {
          isolationFails.push(`[atlas] player example did not render the player (data-show-player=${rep.playerExample})`);
        }
      } else if (rep.playerExample !== null) {
        isolationFails.push(`[${key}] unexpected player-example marker in an isolated section`);
      }
    } else if (PLAYER_SCENES.has(key)) {
      const allShown = rep.players.filter((p) => p !== undefined).every((p) => p === 'true');
      if (!allShown) {
        isolationFails.push(`[${key}] gameplay canvases did not render the player: ${JSON.stringify(rep.players)}`);
      }
    }

    const out = path.join(OUT_DIR, file);
    await page.screenshot({ path: out, fullPage: true });
    const buf = fs.readFileSync(out);
    const validPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    results.push({ file, bytes: buf.length, validPng });
  }

  await browser.close();

  let ok = true;
  for (const r of results) {
    const status = r.validPng && r.bytes > 0 ? 'OK' : 'FAIL';
    if (status === 'FAIL') ok = false;
    console.log(`${status.padEnd(4)} ${r.file} (${r.bytes} bytes)`);
  }
  if (skipped.length) {
    console.log(`SKIP ${skipped.join(', ')} (preserved — not regenerated this run)`);
  }

  if (isolationFails.length) {
    ok = false;
    console.log('\nPlayer-isolation verification failures:');
    for (const f of isolationFails) console.log('  - ' + f);
  } else {
    console.log('\nPlayer-isolation verification OK (isolated boards player-free, gameplay keeps player).');
  }

  if (errors.length) {
    ok = false;
    console.log('\nBrowser errors captured:');
    for (const e of errors) console.log('  - ' + e);
  } else {
    console.log('\nNo console errors.');
  }

  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});