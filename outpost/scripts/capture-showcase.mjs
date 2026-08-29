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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

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
  for (const { key, file } of SCENES) {
    await page.evaluate((k) => window.__showcase.show(k), key);
    await page.waitForTimeout(250);
    const out = path.join(OUT_DIR, file);
    await page.screenshot({ path: out, fullPage: true });
    const stat = fs.statSync(out);
    const buf = fs.readFileSync(out);
    const validPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    results.push({ file, bytes: stat.size, validPng });
  }

  await browser.close();

  let ok = true;
  for (const r of results) {
    const status = r.validPng && r.bytes > 0 ? 'OK' : 'FAIL';
    if (status === 'FAIL') ok = false;
    console.log(`${status.padEnd(4)} ${r.file} (${r.bytes} bytes)`);
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
