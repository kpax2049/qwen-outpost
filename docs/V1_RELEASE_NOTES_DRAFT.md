# Outpost v1.0.0 — Release Notes (Draft)

**Relay Seven**

_A top-down browser factory / automation game._

---

## Release Summary

Outpost v1.0.0 (Relay Seven) is a complete, feature-frozen factory automation game. The game has been manually completed from start to finish, with all core systems verified through human testing.

---

## Gameplay Highlights

- **Procedural 120x120 world** with finite resource deposits (Wood, Stone, Coal, Iron, Copper, Gold)
- **WASD movement** with RMB pathfinding for precise navigation
- **RMB contextual harvesting** — right-click to pathfind to and collect resources
- **Miners with 5x5 local extraction fields** — automated finite-resource mining
- **Conveyor belt click-drag routing** — lay multi-tile belt routes with auto-corners and topology-aware direction
- **Full production chain**: Miner → Conveyor → Generator / Smelter / Steel Furnace → Assembler (Copper Wire → Gear → Engine)
- **Victory condition**: Craft 5 Engines, then Continue Playing indefinitely

---

## UX Improvements

- **Progressive tutorial** — auto-advancing guided steps that never require manual progression (except one manual step)
- **Building inspection panel** — view status, power, inventory, belt connections, and fuel for any building
- **Remote R/Q** — rotate and remove buildings without standing on them (when inspected)
- **Conveyor drag preview** — visual path preview while building a belt route
- **Build placement validation** — green/red preview tiles for valid/invalid placement
- **Save/Load status notifications** — clear success/error feedback
- **Power Grid detail panel** — production, consumption, surplus, generator count, and status readout

---

## Visual Direction

**Relay Seven** is the unified visual identity for v1:

- Deep space blacks and navys with muted greens, warm accents, desaturated industrial tones
- 48x48px pixel art tiles with nearest-neighbor scaling for pixel-crisp rendering
- Directional conveyor tiles with topology-aware elbow geometry
- Dark UI panels with Chakra Petch headings, IBM Plex Sans body, IBM Plex Mono data
- Color-coded building states (active / blocked / no power / depleted)
- Animated belt items, pulsing blocked-belt indicators

---

## Survey Lander

A permanent 2x2 tile Survey Lander landmark appears at spawn on every new game. It serves as the player's arrival point and a lasting visual anchor. The lander is rendered with a ground decal and cannot be removed or rotated.

---

## Technical Status

- **297 tests** passing across 8 test files (Vitest unit tests)
- **Clean production build** (Vite 8, React 19, TypeScript 6)
- **No gameplay code changes** since feature freeze
- All save/load, victory, and core mechanics verified
- Known limitations documented below

---

## Known Limitations / Post-v1 Direction

- No conveyor splitters or mergers
- No belt crossings
- No item filtering or priority routing
- Single endgame objective (5 Engines)
- No building upgrade tiers
- No multiplayer or cloud save
- No mobile input support
- No additional production chains beyond current recipes

---

## Requirements

- Any modern browser (Chrome, Firefox, Edge, Safari)
- No server required — runs entirely client-side
- Save data stored in browser localStorage
