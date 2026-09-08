# Outpost — Roadmap

## v1 Complete / Included

Stable systems present in the v1.0.0 release:

- **Core gameplay**
  - WASD / RMB movement with pathfinding
  - RMB contextual harvesting (Wood, Stone, Coal, Iron, Copper, Gold)
  - Step-over collection for Wood / Stone
  - Finite resource deposits with depletion

- **Buildings**
  - Storage Container (100-slot)
  - Small Chest (20-slot)
  - Coal Generator (50 power, 20 capacity)
  - Miner (5x5 local extraction field)
  - Conveyor Belt (click-drag multi-tile routing, auto-corners)
  - Smelter (Iron Ore + Coal → Iron Ingot)
  - Steel Furnace (Iron Ore + Coal → Steel Plate)
  - Assembler (selectable recipes: Copper Wire, Gear, Engine)
  - Survey Lander (permanent landmark)

- **Logistics**
  - Belt topology-aware direction computation
  - Blocked belt detection (red gate)
  - Machine input/output belt connections

- **Power**
  - Global shared electrical grid
  - Real-time power summary (production, consumption, surplus)
  - Visual power status (green/red indicator)

- **UI**
  - HUD with build, inventory, objectives, help buttons
  - Build menu with building costs and selection
  - Building inspection panel (status, power, inventory, connections)
  - Tutorial with progressive steps
  - Objectives panel
  - Help / Controls reference panel
  - Power Grid detail panel
  - Save/Load status notifications

- **Controls**
  - Full keyboard and mouse support
  - Remote building rotation (R)
  - Remote building removal (Q)
  - Pause / Speed controls

- **Persistence**
  - Save/Load via localStorage (F5 / F9 / Ctrl+S / Ctrl+L)
  - New Game with confirmation
  - Victory state with Continue Playing

- **Testing**
  - 297 unit tests across 8 test files
  - Test coverage: engine, conveyors, mining, save/load, tutorial, survey lander

## Post-v1 Candidates

Features consistent with the current project direction:

- **Conveyor splitters** — route items to multiple destinations
- **Conveyor mergers** — combine multiple belt lines into one
- **Belt crossing / intersection** — belts that cross without interfering
- **Filtering / priority routing** — send specific item types down specific paths
- **Additional production chains** — e.g. electronics, weapons, construction materials
- **Expanded world / progression** — additional biomes, resource types, endgame content
- **Building upgrade tiers** — enhanced Miners, faster Smelters, etc.
- **Achievement system** — persistent progress markers beyond tutorial
- **Multiple endgame objectives** — beyond the 5-Engine victory condition
