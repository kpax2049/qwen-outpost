# Outpost

**A top-down browser factory / automation game — Relay Seven.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Tests](https://img.shields.io/badge/tests-297_passing-brightgreen)

---

## Screenshots

> _Final release screenshots will be added here. See [RELEASE_MEDIA_PLAN.md](docs/RELEASE_MEDIA_PLAN.md) for capture guidance._

---

## What is Outpost?

Outpost is a top-down factory automation game set on a remote world. You arrive aboard a Survey Lander, gather finite resources from the terrain, and build an automated industrial outpost — from raw mining through smelting and assembly — to craft Engines and establish your foothold.

The game is designed around a single core loop: **extract → transport → refine → assemble**. Everything chains together through conveyor logistics and a shared electrical grid.

### The story

Outpost was developed primarily as an experiment in using a **local coding model** — Qwen3.6-35B-A3B-NVFP4, served through FreeToken on an NVIDIA RTX 3080 10 GB system — with OpenCode as the coding-agent harness. Human product direction, testing, and visual QA were critical throughout. Some limited stronger/remote-model assistance occurred during development, including a difficult conveyor-system rescue. Claude Design was used for the Relay Seven visual direction and asset-design iterations, including the Survey Lander.

This project explores **how far a local coding model can go when paired with strong human direction, testing, and selective escalation.**

---

## Features

- **WASD movement** with RMB tile pathfinding for precise navigation
- **RMB contextual actions** — right-click terrain to pathfind/move; right-click Wood/Stone to move onto tile and collect; right-click Coal/Iron/Copper/Gold to move adjacent and continuously harvest
- **Finite resource deposits** — Wood, Stone, Coal, Iron, Copper, and Gold
- **Step-over collection** — walk across Wood / Stone tiles to collect them
- **Miners with 5x5 local extraction fields** — automated resource extraction
- **Conveyor belt logistics** — click-drag multi-tile routes with auto-corners
- **Building inspection** — view status, power, inventory, and belt connections
- **Item deposit / withdrawal** — manage building inventories manually
- **Selectable Assembler recipes** — Copper Wire, Gear, or Engine
- **Shared global power grid** — one generator powers the entire outpost
- **Save / Load** via `localStorage` (F5 / Ctrl+S / F9 / Ctrl+L)
- **Pause / Speed controls** — 0–3 presets, +/- fine control
- **Tutorial / Objectives** — progressive guided onboarding
- **Help panel** — full controls reference
- **Permanent Survey Lander** arrival landmark (2x2 tile)
- **Post-victory Continue Playing** — the game never ends

---

## Controls

| Input | Action |
|-------|--------|
| **WASD / Arrow Keys** | Manual movement |
| **Right-Click** terrain (grass / sand / forest / rock) | Pathfind and walk to tile |
| **Right-Click** Wood or Stone tile | Move onto tile and collect |
| **Right-Click** Coal / Iron / Copper / Gold | Move to adjacent tile and continuously harvest |
| **E** | Manual harvest / interact fallback |
| **B** | Toggle build menu |
| **I** | Toggle inventory panel |
| **O** | Toggle objectives panel |
| **H** | Toggle help panel |
| **Esc** | Deselect build tool, then close panels (one layer) |
| **Click building** | Inspect (status, power, inventory, connections) |
| **R** | Rotate building (remote if inspected, current tile otherwise) |
| **Q** | Remove building (half refund) |
| **T** | Take inspected item |
| **Space** | Pause / Resume |
| **+/-** | Adjust simulation speed |
| **0–3** | Quick speed presets (x1, x5, x10, x20) |
| **Scroll wheel** | Zoom |
| **Alt+Click** | Pan camera |
| **Conveyor drag** | Click-drag to lay multi-tile belt route |

---

## Production / Progression

The production chain progresses from raw resources through increasing levels of complexity:

### Step 1 — Raw Materials
Mine **Coal**, **Iron Ore**, **Copper Ore**, and **Stone** from finite surface deposits using RMB harvesting. Walk over Wood and Stone tiles for free collection.

### Step 2 — Automate Extraction
Place **Miners** on resource deposits. Each miner extracts from a 5x5 field around it. Feed the output through **Conveyor Belts** (click-drag to lay multi-tile routes that auto-corner).

### Step 3 — Power the Grid
Build a **Coal Generator** (5 Iron, 3 Copper, 5 Stone) and feed it Coal. One generator produces 50 power — enough for a small factory. All machines connect to the same global grid. No cables needed.

### Step 4 — Smelting
- **Smelter** (5 Iron, 3 Coal, 5 Stone, 10 power): Iron Ore + Coal → Iron Ingots
- **Steel Furnace** (10 Iron, 5 Copper, 10 Stone, 20 power): Iron Ore + Coal → Steel Plates

### Step 5 — Assembly
**Assembler** (8 Iron, 8 Copper, 5 Stone, 15 power) — selectable recipes:
- **Copper Wire**: 1 Copper → 1 Copper Wire
- **Gear**: 2 Iron Ingots + 2 Copper Wires → 1 Gear
- **Engine**: 1 Steel Plate + 1 Gear + 2 Copper Wires → 1 Engine

### Victory — Craft 5 Engines
Build 5 Engines to trigger the **Outpost Established** victory screen. You may Continue Playing indefinitely after.

---

## Run Locally

```bash
cd outpost
npm install
npm run dev
```

Open the dev server URL in a browser.

---

## Build / Test

```bash
cd outpost

# Run the full test suite (297 tests)
npm test

# Production build (main + showcase entry points)
npm run build

# Lint
npm run lint
```

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 (TypeScript) |
| Build | Vite 8 |
| Testing | Vitest 4 (unit), Playwright (e2e) |
| Linting | Oxlint |
| Rendering | HTML5 Canvas (2D, nearest-neighbor pixel art) |
| State | Custom Game Engine (ECS-like, tick-based simulation) |
| Persistence | `localStorage` (base64 JSON) |
| Fonts | Chakra Petch (UI headings), IBM Plex Sans (body), IBM Plex Mono (data) |

### Architecture Overview

- **GameEngine** (`src/engine/GameEngine.ts`) — tick-based simulation: map generation, building updates, conveyor routing, item flow, power grid, save/load, win condition.
- **Renderer** (`src/rendering/Renderer.ts`) — canvas 2D rendering with pre-scaled sprite cache, belt flow visualization, building status colors, path preview.
- **AssetLoader** (`src/rendering/AssetLoader.ts`) — loads Relay Seven sprite PNGs from `public/assets/relay-seven`, pre-renders at target tile size with nearest-neighbor scaling.
- **UI** (`src/ui/`) — HUD, build menu, inventory, inspection panel, tutorial, objectives, help — all React components with inline styles.
- **Showcase** (`src/showcase/`) — developer-only Visual Showcase page (`showcase.html`) for asset atlas and scene verification.

---

## Development Story

Outpost was built entirely in this repository through **iterative AI-assisted development**:

1. A minimal React + Vite + TypeScript scaffold was initialized.
2. Core game engine (map generation, player, buildings, conveyors) was developed through successive agent-human iterations.
3. The conveyor system required a complex rescue — topology-aware belt routing with neighbor-feeding direction computation.
4. **Relay Seven** visual redesign was designed in Claude Design, with production sprites iterated and hand-tested.
5. The Survey Lander landing landmark was designed and integrated.
6. Tutorial, objectives, save/load, and inspection panels were built progressively.
7. Comprehensive test suite with 297 unit tests across 8 test files.
8. The game was manually completed from start to finish to verify the full experience.

---

## Relay Seven Visual Direction

Relay Seven is the visual identity of Outpost v1. All sprites follow a unified design language:

- **Palette**: Deep space blacks and navys with muted greens, warm accents, and desaturated industrial tones
- **Typography**: Chakra Petch for UI headings, IBM Plex Sans for body text, IBM Plex Mono for data displays
- **Sprite format**: 48x48px pixel art tiles (48px terrain, 16px items at 32px display, 64px Survey Lander)
- **Belt rendering**: Directional tiles (up/down/left/right) with topology-aware elbow geometry for angled connections
- **UI**: Dark panels with subtle borders, colored status indicators, monospace data readouts

Production sprites are in `design-final/relay-seven/sprites/` and deployed to `public/assets/relay-seven/`.

---

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for planned post-v1 feature candidates.

---

## Project Status

**Outpost v1.0.0 (Relay Seven) is a feature-frozen release candidate.**

- 297 passing tests across 8 test files
- Clean production build (main + showcase)
- Game manually completed from start to finish
- Save/load, victory Continue Playing, all core systems verified
- No gameplay changes since feature freeze

---

## License

Outpost is released under the [MIT License](LICENSE).

---

*Outpost — Relay Seven. Establish your outpost. Build your factory. Never leave.*
