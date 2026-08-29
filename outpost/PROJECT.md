# Outpost - Architecture Document

## Overview

Outpost is a top-down automation/base-building browser game built with React 19, TypeScript, Vite, and Canvas2D. Players gather resources, build automated factories, and work toward crafting 5 engines to establish their outpost.

## Tech Stack

- **React 19** - UI components (HUD, menus, panels)
- **TypeScript 6** - Strict typing with `verbatimModuleSyntax`
- **Vite 8** - Build tool and dev server
- **Canvas2D** - Main game rendering engine
- **Vitest** - Unit testing framework
- **Node.js** - Runtime

## Architecture

The codebase follows a strict separation of concerns:

```
src/
├── engine/        # Game simulation logic
│   └── GameEngine.ts    # Core simulation, map gen, building updates
├── rendering/     # Canvas2D rendering
│   └── Renderer.ts      # All visual output, particles, minimap
├── ui/            # React UI components
│   ├── HUD.tsx           # Top bar controls
│   ├── BuildMenu.tsx     # Building selection
│   ├── InventoryPanel.tsx # Resources & stats
│   ├── HelpPanel.tsx     # Controls reference
│   └── ObjectivesPanel.tsx # Quest tracker
├── types/         # Shared type definitions
│   └── index.ts          # All interfaces, maps, constants
├── tests/         # Unit tests
│   └── GameEngine.test.ts
└── App.tsx        # React entry, game loop, input handling
```

### Core Loop

1. **App.tsx** runs the main game loop via `requestAnimationFrame`
2. **GameEngine** accumulates delta time and calls `tick()` at the configured tick rate
3. Each tick updates all buildings (miners, smelters, conveyors, assemblers, generators)
4. **Renderer** draws the current game state to the canvas each frame
5. React components re-render when their state changes (UI panels, menus)

### Engine (src/engine/GameEngine.ts)

The simulation engine handles all game logic:

- **Map Generation** - Seeded PRNG creates deterministic 120x120 grids with terrain, resources, and ore deposits
- **Building System** - 8 building types with inventory, progress, and power management
- **Power System** - Generators produce power, consumers draw from it within a 30-tile range
- **Conveyor Logic** - Items move between buildings based on direction
- **Player Actions** - Movement, mining, building placement/removal, inventory management
- **Win Condition** - Craft 5 engines through the full production chain
- **Save/Load** - Full state serialization to/from localStorage

### Renderer (src/rendering/Renderer.ts)

Canvas2D rendering with visual polish:

- **Terrain Tiles** - Pre-rendered cached tiles for each terrain type
- **Resource Rendering** - Shapes sized by deposit amount with glow effects
- **Building Rendering** - Shapes per type, progress bars, power indicators
- **Particle System** - Smoke from generators, activation sparks
- **Conveyor Animation** - Moving lines showing item flow direction
- **Water Animation** - Sinusoidal wave overlay
- **Minimap** - 160x160 overview with terrain, resources, buildings, player
- **Player Sprite** - Radial gradient with pulsing ring effect

### Types (src/types/index.ts)

All game data types defined with string literal unions (no enums) to satisfy `verbatimModuleSyntax`:

- **TerrainValue** - 'grass' | 'forest' | 'water' | 'rock' | 'sand'
- **ResourceTypeValue** - 'stone' | 'iron' | 'copper' | 'coal' | 'gold'
- **ItemType** - Resource types + processed items (ingots, wires, plates, gears, engines)
- **BuildingTypeValue** - 'storage' | 'chest' | 'generator' | 'miner' | 'conveyor' | 'smelter' | 'steel_smelter' | 'assembler'
- **DirectionValue** - 0 (Up) | 1 (Right) | 2 (Down) | 3 (Left)

Each type has companion `*_Map` const objects and display/color/name record objects.

## Game Systems

### Buildings

| Type | Cost | Power | Function |
|------|------|-------|----------|
| Storage | 5 stone | 0 | 100-slot passive inventory |
| Chest | 3 stone | 0 | 20-slot passive inventory |
| Generator | 5 iron, 3 copper, 5 stone | +50 | Produces power, consumes coal |
| Miner | 3 iron, 2 stone | -5 | Auto-mins resource tile |
| Conveyor | 2 stone | -1 | Transports items in direction |
| Smelter | 5 iron, 3 coal, 5 stone | -10 | Iron ore + coal → iron ingots |
| Steel Furnace | 10 iron, 5 copper, 10 stone | -20 | Iron ore + coal → steel plates |
| Assembler | 8 iron, 8 copper, 5 stone | -15 | Crafts wires, gears, engines |

### Production Chains

```
Mining: resource tile → miner → conveyor → storage
Smelting: iron ore + coal → smelter → iron ingot
Steel: iron ore + coal → steel furnace → steel plate
Wires: copper ore → assembler → copper wire
Gears: iron ingot + copper wire → assembler → gear
Engines: steel plate + gear + copper wire → assembler → engine
```

### Win Condition

Craft 5 engines through the full production chain. The engine counter tracks progress in `player.stats.enginesCrafted`.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move player |
| E | Mine resource on current tile |
| R | Rotate building on current tile |
| Q | Remove building (50% refund) |
| Space | Pause/Resume |
| +/-, 0-3 | Adjust simulation speed |
| B | Toggle build menu |
| I | Toggle inventory panel |
| O | Toggle objectives |
| H | Toggle help |
| Ctrl+S / F5 | Save game |
| Ctrl+L / F9 | Load game |
| Alt+Click | Pan camera |
| Scroll | Zoom |
| Escape | Deselect build mode |

## Save/Load

- Uses `localStorage` with key `'outpost-save'`
- Full state serialization via `engine.save()` / `engine.load()`
- Save/Load via keyboard shortcuts (Ctrl+S / Ctrl+L) or HUD buttons
- New Game creates fresh random seed
- Confirmation dialog before starting new game

## Testing

49 unit tests cover:
- Map generation (deterministic, terrain variety, resources)
- Player movement and mining
- Building placement and rotation
- Power system (generators, active buildings)
- Conveyor belt item transfer
- Smelter and assembler crafting
- Save/Load state preservation
- Simulation speed and pause
- Win condition tracking
- Inventory management
- Map boundaries

## Performance

- Terrain tiles pre-rendered and cached in `terrainCache`
- Only visible tiles rendered (culling via camera bounds)
- Particle system with automatic cleanup
- Minimal React re-renders (state only for UI, not game loop)
- Canvas rendering decoupled from React render cycle
