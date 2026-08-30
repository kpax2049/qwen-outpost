# Outpost — Design Handoff Package

A self-contained, read-only snapshot of **Outpost's current visual presentation**, built for a
visual design agent. It documents exactly how the game looks today with deterministic screenshots
so you can restyle it without guessing — and without touching gameplay.

## Contents

| File | Purpose |
|---|---|
| `DESIGN_BRIEF.md` | Overview of the game, the palette, visual language, and what can/can't change |
| `ASSET_INVENTORY.md` | Every terrain, resource, building, machine-state, conveyor, and UI asset with its source colour |
| `source-map.md` | Exact file + line for where each element is drawn |
| `screenshots/` | 10 deterministic full-page captures of the current presentation |

## Regenerating the screenshots

The package is reproducible. The screenshots are built from the dev-only **Visual Showcase**
page (`/showcase.html`) — a separate Vite entry that is **never linked** from the normal game.

Requirements: Node + npm, `playwright` installed (already a dependency), Chromium browsers
installed.

```powershell
# 1. Build the app (compiles showcase + main entries)
npm run build

# 2. Serve the production build
npx vite preview --port 5199 --strictPort

# 3. Capture the .png files into design-handoff/screenshots/ (in a second shell)
node scripts/capture-showcase.mjs
```

The script validates that every PNG is non-empty and that there are **no console/page errors**,
and uses a `window.__showcase.show(key)` control surface to isolate each of the 10 scenarios.

## Showcase scenario keys

`atlas`, `terrain`, `resources`, `machines`, `conveyors`, `gameplay`, `construction`, `hud`,
`inspection`, `help` → mapped to `01-…` through `10-…`.

## Browser verification

Functionality is verified in a real browser (Playwright), not just by typecheck/lint/tests.
- Normal game at `/`: loads with 1 canvas, no console errors.
- Showcase at `/showcase.html`: all 10 sections render, no console/page errors.

## Rules for the restyling agent

1. **Change visuals, not rules.** Keep building costs, power numbers, craft recipes, and win
   conditions identical.
2. Prefer editing `src/types/index.ts` constants and `Renderer.ts` draw code + UI CSS over
   touching simulation/engine logic.
3. Re-verify in-browser (open `/showcase.html` and `/`) after every change — a passing build/lint
   is not sufficient.
4. Regenerate screenshots and commit them together with the restyle so reviewers can see the
   before/after.
