# Outpost — Visual Asset Inventory

A precise inventory of every visual asset in **Outpost's current build**, with its source colour
and the file that draws it. Use this with `source-map.md` to locate and restyle any element.

Exact colour constants are the single source of truth — see `src/types/index.ts` and the CSS in
`src/ui/`.

---

## 1. Terrain

Drawn by the Renderer (`src/rendering/Renderer.ts`).

| Asset | Type string | Notes |
|---|---|---|
| Grass | `grass` | Default ground. Light green base tile. |
| Forest | `forest` | Darker green tile, rendered trees. Chopping yields **Wood**. |
| Water | `water` | Blue tile with **animated shoreline** (time-based draw). |
| Rock | `rock` | Grey hard-surface tile. Ore deposits (`iron`, `copper`, `gold`) generate here. |
| Sand | `sand` | Pale ground patch. |

---

## 2. Resources

| Resource | Colour (`RESOURCE_COLORS`) | Mined from | Item type |
|---|---|---|---|
| Wood | `#8a5a2a` | Forest | `wood` |
| Stone | `#8a8a8a` | Rocks / ground | `stone` |
| Iron Ore | `#a0522d` | Rock deposits | `iron` |
| Copper Ore | `#b87333` | Rock deposits | `copper` |
| Coal | `#2a2a2a` | Deposits | `coal` |
| Gold Ore | `#ffd700` | Rock deposits | `gold` |

Each resource renders as a deposit sprite on its tile with a tile-position, and as small item
stack sprites when on a conveyor belt / inside machines.

---

## 3. Buildings

Drawn by the Renderer using `BUILDING_DEFS[type].color` + `.shape`.

| Building | Key | Shape | Colour | Cost | Power |
|---|---|---|---|---|---|
| Storage Container | `storage` | `rect` | `#5b7a4f` | 5 stone | 0 |
| Small Chest | `chest` | `rect` | `#7a9a5f` | 3 stone | 0 |
| Coal Generator | `generator` | `circle` | `#cc4400` | 5 iron, 3 copper, 5 stone | produces **50** |
| Miner | `miner` | `diamond` | `#6666aa` | 3 iron, 2 stone | consumes 5 |
| Conveyor Belt | `conveyor` | `arrow` | `#444444` | 2 stone | consumes 1 |
| Smelter | `smelter` | `rect` | `#ff4400` | 5 iron, 3 coal, 5 stone | consumes 10 |
| Steel Furnace | `steel_smelter` | `rect` | `#4444cc` | 10 iron, 5 copper, 10 stone | consumes 20 |
| Assembler | `assembler` | `diamond` | `#00aa44` | 8 iron, 8 copper, 5 stone | consumes 15 |

### Building visual sub-assets
- **Base tile fill** (rect/circle/diamond by `shape`).
- **Facing direction indicator** (arrow portal, per `direction` / `outputDirection`).
- **Progress indicator** — fill/arc showing `progress / maxProgress`.
- **Inventory** — stored item stack drawn on/inside the building.
- **Power link** — connection drawn when part of the powered grid.
- **Status colour** from inspection: `ok` (green) / `warn` (amber) / `bad` (red).

---

## 4. Machine states

These are **visual states of the same building sprites**, differentiated by engine status
(`statusReason`) and rendered badges:

| State | Visual cue |
|---|---|
| Working | Normal fill, advancing progress bar |
| Idle (no work) | Dimmed fill |
| No power | Darkened / grey, warning styling |
| No fuel (generator) | Fuel bar empty, warning icon |
| Waiting (input missing) | Empty input indicator |
| Blocked | Amber/red, `blocked` flag, red gate on belt end |
| Progress | Partial fill arc, status-coloured |

---

## 5. Conveyor routing

Rendered per-tile as an **arrow/band** whose orientation is derived from its `direction` and its
neighbour:

| Connection kind | Visual |
|---|---|
| `straight` | Long band straight through (H or V run) |
| `turn` | Curved elbow connecting two perpendicular belts |
| `machine` | Band terminating at an adjacent machine input |
| `blocked` | Belt holding an item it can't push — red gate |
| `headon` | Two belts facing each other |
| `none` | Belt at an open end |

---

## 6. Player

- Small sprite with `facing` (Up/Right/Down/Left).
- Standing highlight on current tile.
- Inventory readout top-left.

---

## 7. HUD & UI components

Rendered as DOM overlays (CSS-backed). Colours live in `src/ui/App.css` / `src/ui/index.css`.

| Component | File | Contents |
|---|---|---|
| HUD | `src/ui/HUD.tsx` | Top bar: pause/speed controls, power readout (produced/consumed/surplus/enough), build/inventory/help/objectives buttons, save/load/new-game, build-mode ribbon |
| Build Menu | `src/ui/BuildMenu.tsx` | Left panel: buildable buildings (name, cost, owned count) |
| Inventory Panel | `src/ui/InventoryPanel.tsx` | Player inventory list |
| Help Panel | `src/ui/HelpPanel.tsx` | Controls / how-to help |
| Objectives Panel | `src/ui/ObjectivesPanel.tsx` | Crafting goal progress (engines crafted, stones mined) |
| Tutorial | `src/ui/Tutorial.tsx` | Onboarding step cards |
| Inspection Panel | `src/ui/InspectionPanel.tsx` | Inspected building details: status, inventory, progress, power, inputs/outputs, conveyor routing, fuel |

---

## 8. On-canvas overlays (Renderer)

| Overlay | Purpose |
|---|---|
| Selected tile | Highlight for the currently selected / hovered tile |
| Build preview | Ghost of building at placement tile, green (`valid`) or red (`invalid`) |
| Inspection highlight | Outline around an inspected building |
| Minimap | Whole-world overview, bottom-right (`showMinimap: true`) |
| Power grid | Links/pipes between generators and consumers |

---

## 9. Quick reference of restore points

| Concern | Create/replace |
|---|---|
| A new colour palette | `src/types/index.ts` constants + `src/ui/*.css` |
| Different building look | `Renderer.ts` shape draws using `BUILDING_DEFS[type]` |
| Different terrain | `Renderer.ts` terrain draw |
| HUD / panel restyle | `src/ui/*.tsx` + CSS |
| New screenshots to document a restyle | re-run `scripts/capture-showcase.mjs` |
