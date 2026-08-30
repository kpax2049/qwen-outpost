# Outpost — Presentation Source Map

Maps every visual element to the exact file and line that draws it, so a design agent can find
and change any single thing. Follow these references together with `ASSET_INVENTORY.md`.

Line numbers reflect the current state of the codebase.

---

## 1. World rendering — `src/rendering/Renderer.ts`

The single renderer. `render(...)` (L224) is the entry point. Sub-renderers:

| Concern | Method | Line |
|---|---|---|
| Render pass entry point | `render()` | 224 |
| Terrain canvas cache (generated once) | `generateTerrainTiles()` | 73 |
| Terrain tile blit (grass/forest/rock/sand) | inline in `render()` | 247–249 |
| Water animation (time-based shoreline) | `drawWaterAnimation()` | 208 (called 252) |
| Resource deposit draw | `drawResource()` | 517 (called 262) |
| Building draw (shape + status + progress + inventory) | `drawBuilding()` | 597 (called 299) |
| Conveyor belt draw (band, chevrons, items, gate) | `drawConveyor()` | 819 (called 306) |
| Conveyor routing helpers | `incomingConnectionKind()` / `beltPath()` / `beltPoint()`/`beltTangent()` / `drawBeltChevron()` / `drawBeltItem()` | 960 / 983 / 1008 / 1019 / 1034 / 1051 |
| Player sprite | `drawPlayer()` | 1103 (called 309) |
| Selected-tile highlight | inline | 333–349 |
| Inspected-building highlight | inline | 351–369 |
| Build-preview ghost (green valid / red invalid) | inline | 419+ |
| Power grid links / cables | `drawPowerLinks()` / `powerCable()` / `tracePowerCable()` | 732 / 786 / 798 |
| Minimap (hidden via `showMinimap: false`) | `drawMinimap()` | 1161 (gated 510–512) |
| Arrow helper (facing) | `drawArrow()` | 1072 |
| Animation/particles state | fields | 61–65 |

### RenderOptions (L… ) — optional overlay flags
`showMinimap?: boolean` (defaults true; production unchanged), plus `selectedTile`,
`buildPreview`, `buildColor`, `buildValid`, `buildPath`, `buildPathValid`, `buildDirection`,
`inspectedTile`, `interactiveTile`, `interactiveLabel`, `facing`.

> The only production-code change for this package is the **optional** `showMinimap` flag and its
> gate at L510. `GameEngine` behavior, build/craft logic, and win conditions are untouched.

---

## 2. Data / constants — `src/types/index.ts`

| Data | Line(s) |
|---|---|
| `TILE_SIZE` (48), `MAP_SIZE` (120) | 3–4 |
| Terrain + `TerrainMap` | 7–18 |
| Resource types + `RESOURCE_COLORS` / `RESOURCE_NAMES` | 20–49 |
| Item types + `ITEM_DISPLAY_NAMES` / `ITEM_COLORS` | 51–103 |
| Directions `Dir` + `DIR_ARROWS` / `DIR_NAMES` / `DELTA` | 111–146 |
| `Tile` / `Building` / `PlayerState` types | 153–222 |
| `BUILDING_DEFS` (colour + shape + cost + power) | 263–387 |
| `BUILDING_COLORS` / `BUILDING_NAMES` | 389–409 |
| `PowerSummary` | 424–432 |
| `ConveyorConnection` / `BuildingInspection` | 436–483 |

---

## 3. Engine (read-only for visuals; NOT changed) — `src/engine/GameEngine.ts`

Provides the data the renderer draws: `getPowerSummary()`, `inspectBuilding()`,
`getNearbyBuildings()`, `player.stats`, `player.x/y/facing`. Status colours (`ok`/`warn`/`bad`)
and `statusReason` originate here. **Do not change this file for a restyle.**

---

## 4. UI overlays — `src/ui/`

| Component | File | Renders |
|---|---|---|
| HUD | `src/ui/HUD.tsx` | top bar: speed/pause, power, buttons, build ribbon |
| Build Menu | `src/ui/BuildMenu.tsx` | building list + cost + owned |
| Inventory Panel | `src/ui/InventoryPanel.tsx` | player items |
| Help Panel | `src/ui/HelpPanel.tsx` | controls help |
| Objectives Panel | `src/ui/ObjectivesPanel.tsx` | goal progress |
| Tutorial | `src/ui/Tutorial.tsx` | onboarding steps |
| Inspection Panel | `src/ui/InspectionPanel.tsx` | inspected building detail |

Stlying: `src/ui/App.css` and `src/ui/index.css`.

---

## 5. App wiring

| Concern | File |
|---|---|
| Main app / canvas mount | `src/App.tsx`, `src/main.tsx` |
| Vite config (adds the `showcase` build entry) | `vite.config.ts` |
| Dev showcase entry (never linked from App) | `showcase.html` + `src/showcase/showcase.tsx` + `src/showcase/scenes.ts` |
| Screenshot capture script | `scripts/capture-showcase.mjs` |

---

## 6. How to find & restyle a specific element — quick recipes

- **Change a building's colour** → edit `BUILDING_DEFS['<type>'].color` in `src/types/index.ts`.
- **Change a building's shape** → edit `.shape` there and the matching branch in
  `Renderer.drawBuilding` (L597).
- **Change terrain look** → `Renderer.generateTerrainTiles` (L73) + the blit at L247.
- **Change the HUD/power readout** → `src/ui/HUD.tsx` + `App.css`.
- **Change conveyor belt visuals** → `Renderer.drawConveyor` (L819) and its helpers.
- **Re-run screenshots after a restyle** → `npm run build`, start a preview, then
  `node scripts/capture-showcase.mjs`.
