# Outpost — Design Handoff Brief

This package documents **Outpost's current visual presentation** so a visual design agent can
restyle it without changing gameplay. It is strictly a read-only snapshot of *what the game looks
like today*: the colour palette, terrain, resources, buildings, machine states, conveyor routing,
HUD and build UI.

> **Important:** This is a documentation / presentation snapshot. **No gameplay logic, balancing,
> or win conditions were changed** to produce it. The only code addition is a render-time option
> (`showMinimap: false`) used by the showcase page, and a new dev-only entry point
> (`/showcase.html`). Production behaviour is unchanged.

---

## 1. What the game is

`Outpost` is a tile-based **factory / automation sandbox** rendered on a single HTML5 Canvas2D
surface. The player walks a 120×120 world grid, gathers resources (wood, stone, iron, copper,
coal, gold), and builds an automated production line:

```
Miner → Conveyor Belt → Smelter → Assembler → (craft Engine) → win
```

Core loops: **collect → build → power → automate → craft → win**.

---

## 2. Rendering architecture

- **Renderer** (`src/rendering/Renderer.ts`): all world drawing on one `<canvas>`. Draws:
  terrain, shoreline, resources, buildings, conveyor belts + items, power grid, minimap,
  selection/hover, build preview, inspection highlight, player sprite.
- **UI components** (`src/ui/*.tsx`): DOM overlays — HUD, Build Menu, Inventory, Help,
  Objectives, Tutorial, Inspection panel.
- **Engine** (`src/engine/GameEngine.ts`): tick simulation, production, power, movement.
- The **world** is a canonical 120×120 `Tile[][]`; the renderer only *reads* it. Nothing about
  the world model or simulation was altered.

---

## 3. The palette & visual language (current)

The look is **dark industrial, muted earth tones** with saturated accents for resources and
building status. Ground truth values live in `src/types/index.ts` and `src/ui/App.css` /
`src/ui/index.css`.

### Backgrounds & chrome
| Surface | Hex |
|---|---|
| Page/backdrop | `#0f1020` |
| Panel bg (HUD/build menu) | `#1a1a2e` |
| Text (primary) | `#e6e9f2` |
| Text (muted) | `#7f8aa6` / `#cfd6e6` |
| Panel border | `rgba(255,255,255,0.12)` |

### Terrain
| Terrain | Character |
|---|---|
| Grass | base green tile, default ground |
| Forest | darker green, trees (choppable → wood) |
| Water | blue, animated shoreline |
| Rock | grey, hard surface (ore spawns) |
| Sand | pale ground patch |

### Resources
| Resource | Colour |
|---|---|
| Wood | `#8a5a2a` |
| Stone | `#8a8a8a` |
| Iron Ore | `#a0522d` |
| Copper Ore | `#b87333` |
| Coal | `#2a2a2a` |
| Gold Ore | `#ffd700` |

### Buildings (fill colours)
| Building | Shape | Colour |
|---|---|---|
| Storage Container | rect | `#5b7a4f` |
| Small Chest | rect | `#7a9a5f` |
| Coal Generator | circle | `#cc4400` |
| Miner | diamond | `#6666aa` |
| Conveyor Belt | arrow | `#444444` |
| Smelter | rect | `#ff4400` |
| Steel Furnace | rect | `#4444cc` |
| Assembler | diamond | `#00aa44` |

### Machine state badges (driven by engine status)
- **Working** — normal fill; progress bars advance.
- **Idle / no work** — dimmed fill.
- **No power** — darkened or grey with warning.
- **No fuel** (generator) — `fuelPct` bar empty, warning icon.
- **Blocked** — amber/red, status reason, red gate on blocked belts.
- **Progress** — arc / fill bar showing partial production, colored by status
  (`ok` green, `warn` amber, `bad` red).

### Power grid
A shared overlay (pipes/links) connecting generators to consumers. Surplus power shows positive,
shortage shows red / negative surplus via the **Power Summary** (produced / consumed / surplus /
enough).

---

## 4. Layout & scale

- Tile size: **48 px** (`TILE_SIZE`), world **120×120** (`MAP_SIZE`).
- Camera: focused on a rectangular viewport of the grid; zoom ranges from far (whole-board)
  to close (single-tile).
- Player is a small sprite with a facing direction; player inventory shown top-left.
- **Minimap** bottom-right (toggled off on showcase canvases via `showMinimap: false`).
- **HUD** top bar: time controls (pause / speed), power readout, build / inventory / help /
  objectives buttons, save-load.
- **Build Menu** left panel: grid of buildable buildings with names + costs + inventory counts.

---

## 5. Screenshots in this package

See `screenshots/` — 10 deterministic captures produced from the dev showcase page:

| # | File | Shows |
|---|---|---|
| 01 | `01-visual-atlas.png` | Visual atlas: every resource swatch + building swatch on one page |
| 02 | `02-world-and-terrain.png` | All terrain types on boards + swatches |
| 03 | `03-resources.png` | Each resource swatch + deposit boards |
| 04 | `04-buildings-and-machine-states.png` | All 8 building types + every machine state |
| 05 | `05-conveyors-and-routing.png` | 4 directions, straight runs, 90° elbows, corners, blocked belt |
| 06 | `06-normal-gameplay.png` | Populated base + HUD + objectives overlay |
| 07 | `07-construction-mode.png` | Build tool armed: valid (green) vs invalid (red) placement previews + Build Menu |
| 08 | `08-hud-and-build-ui.png` | HUD, power readout, inventory panel |
| 09 | `09-inspection-and-power.png` | Building inspection panel + power grid overlay |
| 10 | `10-tutorial-objectives-help.png` | Tutorial, objectives, and help panels |

---

## 6. Notes for the restyling agent

- **Work from the compiled docs first**: `ASSET_INVENTORY.md` (every tile/building/UI element +
  its exact source colour), then `source-map.md` (which file/line draws each thing).
- **Change visuals, not rules.** Keep the same building shapes/costs/power numbers and win
  conditions. A restyle should touch `Renderer.ts` draw code, `App.css`/`index.css`, and UI
  component props — it should **not** change `GameEngine.ts` behavior.
- **Verify in a browser**, not just by typecheck/lint. Open `/showcase.html` (and the normal
  game at `/`) after any change and confirm the visuals render as intended.
- Screenshots are deterministic (fixed seeds, fixed water time) so before/after comparisons are
  meaningful.
