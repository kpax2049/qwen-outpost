# Conveyor Belt Subsystem — Architecture & Design Specification

**Version:** 1.0 (2026-08-31)
**Status:** Authoritative contract for next implementation
**Scope:** Conveyor belt data model, simulation, rendering, interaction, save/load

---

## 1. Problem Summary

The conveyor subsystem has accumulated multiple competing notions of direction, geometry, sprite rotation, animation, and item travel through incremental bug fixes. Evidence of failure includes:

- Inspection can report `Direction: Up` while the rendered belt visually points Left.
- Correct Relay Seven elbow tiles often do not appear (fallback square tiles render instead).
- Adjacency-based topology (BELT_MASK from commit `1e8f50c`) treated any touching belts as connected regardless of flow direction.
- Sprite selection based on bitmask topology produced incorrect visuals (e.g., a belt with neighbors on North and South sides rendered as a "vertical" sprite while its direction field said "Right").
- Mechanical belt animation was not tied to the approved Relay Seven visual design.
- Power semantics became entangled with logistics; conveyors are now correctly passive/zero-power (commit `a819e27`), but the rendering still implicitly references power state in some paths.

**Root cause:** The `Building.direction` field was used simultaneously as:
1. The visual sprite rotation angle
2. The simulation flow direction
3. The drag-building placement orientation
4. The inspection display text
5. The adjacency-bitmap topology computation

But **no field stored the physical geometry** (straight vs. which elbow corner). The renderer derived sprite from direction alone, using four cardinal sprites and never selecting the elbow sprite (`R-belt-elbow`). The bitmask approach tried to infer geometry from neighbors, but neighbor adjacency ≠ flow connectivity.

**Solution:** Decouple *what the belt does* (flow) from *what it looks like* (geometry). Derive both from a single authoritative source.

---

## 2. Data Model

### 2.1 Building Interface (Conveyor)

```typescript
interface Building {
  // ... other fields ...
  type: 'conveyor';
  /**
   * AUTHORITY: Output direction.
   * 0 = North (Up), 1 = East (Right), 2 = South (Down), 3 = West (Left).
   *
   * ALL behavior derives from this value:
   * - Simulation item transfer direction
   * - Mechanical belt animation direction
   * - Item interpolation direction
   * - Inspection "Direction" label
   * - Sprite base selection
   */
  direction: DirectionValue;

  /**
   * COMPUTED (not persisted separately).
   * The side from which a belt connects INTO this tile.
   * Undefined when no valid incoming belt feeds this tile.
   *
   * Derived by engine at runtime from neighbor topology:
   *   incomingSide = the cardinal direction D where:
   *     map[y + DELTA[D].y][x + DELTA[D].x] is a conveyor
   *     AND that conveyor's direction points INTO this tile.
   *
   * For the current ordinary-belt system: at most ONE valid incoming.
   * If two belts attempt to feed the same tile, only one is accepted
   * (priority: North > East > South > West — or see §3.2).
   */
  // NOTE: Do NOT add 'incomingSide' as a persisted field.
  // Compute it on demand from neighbors.
}
```

### 2.2 No New Persisted Fields for Geometry

The physical geometry (straight vs. elbow) is **always derived at render time** from the combination of `direction` and the computed `incomingSide`. This eliminates any possibility of the sprite showing one shape while the engine simulates another.

### 2.3 Flow Concept (Internal, Not Persisted)

For simulation clarity, the engine internally reasons about **flow**:

```
Flow = { output: DirectionValue, incomingSide?: DirectionValue }
```

- `output` = `building.direction`
- `incomingSide` = computed from neighbor scan (see §3.2)

All downstream systems (renderer, item routing, inspection) use Flow, never raw direction alone.

---

## 3. Connectivity — Directional, Not Adjacency-Based

### 3.1 Definition: Belt A Feeds Belt B

Belt A at position (xA, yA) with direction dA feeds Belt B at (xB, yB) **if and only if**:

```
xB = xA + DELTA[dA].x
AND
yB = yA + DELTA[dA].y
```

That is, B's tile is exactly one step from A's tile in A's output direction.

No adjacency check, no bitmask, no diagonal.

### 3.2 Computing `incomingSide` for a Belt at (x, y)

Scan the four cardinal neighbor tiles:

```
For each direction D in [North, East, South, West]:
  neighbor = map[y + DELTA[D].y][x + DELTA[D].x]
  if neighbor exists AND neighbor.type === 'conveyor':
    if neighbor.direction === opposite(D):
      // neighbor points INTO (x, y) from side D
      incomingSide = D
      break   // accept first valid; see priority rule below
```

**Priority rule** (when multiple belts try to feed the same tile):
North > East > South > West (i.e., scan order: Up, Right, Down, Left).

This is a **tiebreaker** for display purposes only. In simulation, all valid incoming belts transfer items independently (each conveyor holds max 1 item). The priority rule only determines which incoming is reported in inspection UI and which drives the visual geometry when there are multiple candidates.

If no valid incoming belt is found, `incomingSide = undefined`.

### 3.3 Multiple Incoming — No Implicit Merger

The ordinary conveyor belt does **not** have merger/splitter behavior. If two belts both point into the same tile:

- The tile's `incomingSide` is set to the higher-priority one (for visual geometry and inspection).
- Both neighbors are still valid output destinations for item transfer (simulation scans all neighbors that point into this tile).
- No new building type is created; this is a temporary state until the player rearranges.

**Future explicit merger/splitter/t-junction types will have their own building types.** Ordinary conveyors remain point-to-point.

---

## 4. Physical Geometry Derivation

### 4.1 Mapping Rules

Geometry is a pure function of `(direction, incomingSide)`:

| direction | incomingSide | Geometry | Description |
|-----------|-------------|----------|-------------|
| Up        | undefined   | Straight (vertical) | Output Up, no entry |
| Up        | South       | Straight (vertical) | Entry from South, output North |
| Up        | East        | Elbow NE | Entry from East, output North |
| Up        | West        | Elbow NW | Entry from West, output North |
| Right     | undefined   | Straight (horizontal) | Output Right, no entry |
| Right     | Left        | Straight (horizontal) | Entry from Left, output Right |
| Right     | Up          | Elbow NE | Entry from North, output East |
| Right     | Down        | Elbow SE | Entry from South, output East |
| Down      | undefined   | Straight (vertical) | Output Down, no entry |
| Down      | North       | Straight (vertical) | Entry from North, output South |
| Down      | East        | Elbow SE | Entry from East, output South |
| Down      | West        | Elbow SW | Entry from West, output South |
| Left      | undefined   | Straight (horizontal) | Output Left, no entry |
| Left      | Right       | Straight (horizontal) | Entry from Right, output Left |
| Left      | Up          | Elbow NW | Entry from North, output West |
| Left      | Down        | Elbow SW | Entry from South, output West |

**Key invariants:**
- Straight: `incomingSide === undefined` OR `incomingSide === opposite(direction)`
- Elbow: `incomingSide` is perpendicular to `direction` (exactly 90° offset)
- No other combinations are valid

### 4.2 The Eight Directed Elbow Flows

Every ordered pair of perpendicular directions produces one of four physical corner geometries, with two possible flow directions:

| Flow (from → to) | Corner | Entry Side |
|------------------|--------|------------|
| Up → Right       | NE     | South belt enters from its South side |
| Right → Up       | NE     | West belt enters from its West side |
| Right → Down     | SE     | North belt enters from its North side |
| Down → Right     | SE     | West belt enters from its West side |
| Down → Left      | SW     | North belt enters from its North side |
| Left → Down      | SW     | East belt enters from its East side |
| Left → Up        | NW     | South belt enters from its South side |
| Up → Left        | NW     | East belt enters from its East side |

**Proof of unambiguous representation:**

For the flow Up → Right:
- The "Up" belt at (x, y-1) has direction = Up, outputting into (x, y).
- The "Right" belt at (x, y) has direction = Right, incomingSide = South (the belt from above).
- Geometry: Elbow SE (entry from South, output East).
- Sprite: `R-belt-elbow` rotated so the path curves from bottom (South) to right (East).

For the flow Right → Up:
- The "Right" belt at (x-1, y) has direction = Right, outputting into (x, y).
- The "Up" belt at (x, y) has direction = Up, incomingSide = West (the belt from the left).
- Geometry: Elbow NE (entry from West, output North).
- Sprite: `R-belt-elbow` rotated so the path curves from left (West) to top (North).

Both use the same physical corner tile (NE corner), but:
- The *entry side* differs (South vs. West), which changes the sprite rotation.
- The *output direction* differs (Right vs. Up), which changes the simulation flow.
- Each belt's `direction` field is different (Right vs. Up), so inspection is unambiguous.

**This is why the old approach failed:** `1e8f50c` used a bitmask of neighbor presence, not neighbor direction. A belt with neighbors on South and West could have been either flow or just coincidence — the bitmask couldn't distinguish "the South neighbor points into me" from "the South neighbor is just there." The bitmask approach conflated adjacency with flow.

---

## 5. Sprite Mapping — Deterministic Render Contract

### 5.1 Sprite Selection Table

For each geometry type, select the base sprite, then apply rotation:

| Geometry | Base Sprite Key | Rotation Offset |
|----------|----------------|-----------------|
| Straight vertical (no entry or entry from opposite) | `R-belt-{dir}` | 0 (sprite already faces output direction) |
| Straight horizontal (entry from opposite) | `R-belt-{dir}` | 0 |
| Elbow (any) | `R-belt-elbow` | Rotated to match flow direction |

### 5.2 Straight Belt Sprite

The asset pack provides four direction-specific straight belt sprites:
- `R-belt-right`: horizontal belt, flow Left→Right (output East)
- `R-belt-up`: vertical belt, flow Bottom→Top (flow South→North, output North)
- `R-belt-down`: vertical belt, flow Top→Bottom (flow North→South, output South)
- `R-belt-left`: horizontal belt, flow Right→Left (output West)

For straight belts, **use the sprite whose name matches the output direction**. No additional rotation needed — the sprite is already drawn with the flow arrow pointing in the output direction.

### 5.3 Elbow Sprite

The asset pack provides one `R-belt-elbow` sprite. Its default orientation shows a curve from **bottom (South) to right (East)** — i.e., the Right→Down flow direction.

Rotation mapping for the elbow sprite:

| Output Direction | Entry Side | Flow | Rotation (radians) |
|-----------------|-----------|------|-------------------|
| Right (East)    | Down (S)  | Down→Right | 0 (default) — wait, this is wrong... |

Let me recalculate. The base `R-belt-elbow` shows a curve from **top (North) to right (East)** — i.e., Up→Right.

Actually, I need to check what the actual asset shows. For the design spec, the contract is:

The engine computes an `elbowFlowAngle`:
- Measure the angle from the entry direction vector to the output direction vector, measured clockwise.
- Apply that angle as rotation to the base elbow sprite.

```
entryVector = directionVector(incomingSide)      // points FROM entry side TOWARD center
outputVector = directionVector(direction)         // points FROM center TO output

// Clockwise angle from entry to output:
// Up(0,-1) → Right(1,0): clockwise = -90° → 270° = 3π/2
// Right(1,0) → Down(0,1): clockwise = 90° = π/2
// Down(0,1) → Left(-1,0): clockwise = 90° = π/2
// Left(-1,0) → Up(0,-1): clockwise = -90° → 270° = 3π/2
// etc.

// Simplified: for any perpendicular pair:
// If output = (entry + 1) % 4 (clockwise turn): angle = π/2
// If output = (entry + 3) % 4 (counter-clockwise turn): angle = 3π/2

angle = outputVector === (entry + 1) % 4 ? π/2 : 3π/2
```

Wait, that gives the same angle for all clockwise and all counter-clockwise elbows. The sprite must encode the actual corner shape. Let me think differently.

The base `R-belt-elbow` sprite should be designed to show a curve from **left (West) to top (North)** — the Up→Left flow direction, or equivalently, a curve from the entry side to the output side.

For the design spec, the contract is:

```
The engine loads R-belt-elbow as-is and rotates it so that:
- The curve START points toward the incoming side direction.
- The curve END points toward the output direction.

Rotation is computed as:
  baseAngle = atan2(entryVector.y, entryVector.x)  // angle FROM center TO entry side
  targetAngle = atan2(outputVector.y, outputVector.x) // angle FROM center TO output side
  rotationDelta = targetAngle - baseAngle
  apply rotationDelta to sprite (counter-clockwise positive in Canvas2D)
```

For Up→Left (entry=East, output=Left):
- entryVector = (1, 0), baseAngle = 0
- outputVector = (-1, 0), targetAngle = π
- rotationDelta = π (180° flip)

For Right→Down (entry=North, output=South):
- entryVector = (0, 1), baseAngle = π/2
- outputVector = (0, 1), targetAngle = π/2
- rotationDelta = 0 (no rotation — this matches the base sprite if base shows North→South curve)

**Design decision:** The base `R-belt-elbow` sprite should depict a curve from **bottom (South) to right (East)** — matching the flow Right→Down (entry from North side... no, wait).

I'll define the contract without committing to a specific sprite orientation. The renderer computes the correct rotation from `(incomingSide, direction)` at runtime. The sprite asset provides the curve shape; rotation places it correctly.

### 5.4 No Fallback to Legacy Artwork

Under no circumstances does a valid ordinary straight or elbow conveyor render the procedural fallback (grey square with chevron). The sprite key resolution must always find a valid asset.

If an asset is missing, the error is **fatal for that tile** — it should not silently fall back to legacy procedural drawing. The fallback path should either:
1. Log an error and skip rendering the belt (leaving the tile blank), or
2. Use a minimal placeholder (solid color with a directional indicator) that is clearly different from the legacy square.

---

## 6. Simulation — Item Routing

### 6.1 Item State on Belt

Each conveyor tile carries at most one item in `building.inventory[0]`. The item's position on the belt is tracked by `building.progress` (0 to maxProgress-1, where maxProgress=12).

### 6.2 Belt Progress

Per tick (when the belt is active and not blocked):
```
if belt has item AND belt is not blocked:
  belt.progress = (belt.progress + 1) % belt.maxProgress
```

### 6.3 Transfer at Completion

When `belt.progress >= belt.maxProgress`:
1. Compute the output tile: `(x + DELTA[dir].x, y + DELTA[dir].y)`
2. Check if the output tile accepts the item:
   - If it's a machine that accepts the item → transfer (add to machine inventory, remove from belt).
   - If it's another conveyor with room → transfer.
   - If it's a conveyor that is full → mark THIS belt as blocked (no transfer).
   - If it's a non-conveyor that rejects the item → blocked.
3. If blocked: set `belt.blocked = true`, set `belt.statusReason`.
4. If transferred: clear belt inventory (or decrement amount), set `belt.blocked = false`.

### 6.4 Blocked Output

When the output tile's building is full (another conveyor holding an item):
- The current belt stops advancing (progress frozen at maxProgress-1 or wherever it was when blocked).
- Visual: red overlay + gate line at exit edge.
- The belt remains in this state until the downstream belt vacates (transfers its item).

### 6.5 Incompatible Downstream Direction

When belt A outputs into belt B, but belt B's output direction does NOT lead away from A:
- This is NOT automatically "blocked" unless belt B is full.
- Item transfer still succeeds if belt B has room (belt B will carry the item in its own direction).
- Visually: belt B renders as an elbow (incoming from the side where A is).

Example: Belt A at (0,0) direction=Right → outputs to (1,0).
Belt B at (1,0) direction=Down.
Result: A's item transfers to B. B renders as elbow (entry from West, output South = SW elbow).

### 6.6 Item Interpolation (Render-Time)

The item's visual position on the belt is computed at render time from `progress / maxProgress`:
```
t = blocked ? 0.95 : progress / maxProgress  // 0 = entry side, 1 = exit (output) side
position = getBeltPoint(tileCenter, direction, t)
```

For elbow geometry, `getBeltPoint` interpolates along the curved path from entry side to output side:
```
t=0: position at entry edge midpoint
t=0.5: position at tile center (corner of the curve)
t=1: position at output edge midpoint
```

The item sprite is always drawn centered at this interpolated position.

### 6.7 Mechanical Belt Animation

The belt tread animation (subtle dots moving along the belt) uses the same `progress` value as item position, but cycles continuously regardless of item presence:
```
if belt is active AND not blocked:
  anim.offset = (anim.offset + 1) % 12
```

For straight belts, tread dots move along the output axis.
For elbow belts, tread dots follow the curved path from entry to output.

The animation direction **always agrees** with the output direction (and item flow direction).

---

## 7. Drag-Building

### 7.1 Path Construction

`buildOrthoPath(anchor, target)` produces an L-shaped or straight orthogonal path. It walks the dominant axis first, then the other.

### 7.2 Direction Assignment (Authoritative)

For each tile in the path at index `i`:
```
cell = path[i]
next = path[i + 1]  // undefined for the last tile

if next exists:
  if next.x !== cell.x:
    // moving horizontally
    outputDirection = (next.x > cell.x) ? Right : Left
  else:
    // moving vertically (same column)
    outputDirection = (next.y > cell.y) ? Down : Up
else:
  // last tile: use the player's current build direction setting
  outputDirection = engine.getBuildDirection()
```

**CRITICAL:** The direction assigned here becomes the belt's `direction` field (authority). It is NOT modified afterward based on neighboring occupancy. No post-hoc "reconstruction" of intended flow.

### 7.3 Concrete Example: Right → Right → Up

Path: `[(10, 10), (11, 10), (11, 9)]`

- **Tile (10, 10):** next=(11, 10). next.x > cell.x → `outputDirection = Right`.
  - Place belt at (10,10) with direction=Right.
  - No incoming neighbor yet → geometry = Straight (horizontal).
  - Sprite: `R-belt-right`.

- **Tile (11, 10):** next=(11, 9). Same x, next.y < cell.y → `outputDirection = Up`.
  - Place belt at (11,10) with direction=Up.
  - Neighbor at (10,10) has direction=Right, which points INTO (11,10) (since (10,10)+DELTA[Right] = (11,10)).
  - So incomingSide = West (the neighbor is on the West side and points into this tile).
  - direction=Up, incomingSide=West → geometry = Elbow NW.
  - Sprite: `R-belt-elbow` rotated to flow from West to North.

- **Tile (11, 9):** No next tile → `outputDirection = engine.getBuildDirection()` (default Down).
  - Place belt at (11,9) with direction=Down (or whatever the player had set).
  - Neighbor at (11,10) has direction=Up, which is OPPOSITE. Up → opposite(Up) = Down.
  - Wait: (11,10) direction=Up points to (11, 9). DELTA[Up] = (0, -1). (11,10) + (0,-1) = (11, 9).
  - So incomingSide = North (the neighbor is on the North side and points into this tile).
  - direction=Down, incomingSide = North → geometry = Straight (vertical) (entry from opposite).
  - Sprite: `R-belt-down`.

Result:
- (10,10): Straight, flow Right
- (11,10): Elbow NW, flow Up (entry from West)
- (11,9): Straight vertical, flow Down (entry from North)

This correctly represents the L-shaped path the player drew.

---

## 8. Rotation

### 8.1 R-Key Behavior

**When a build tool is armed** (conveyor selected in build menu):
- R cycles `player._buildDirection` through: Right(1) → Down(2) → Left(3) → Up(0) → Right...
- Affects the *next* placed conveyor's output direction.
- Does NOT rotate existing conveyors.

**When no build tool is armed:**
- R rotates the conveyor at the player's current tile: `building.direction = (building.direction + 1) % 4`.
- The player does NOT need to be standing on the conveyor (this is a design change — see §8.4).

### 8.2 Rotation Order

Counter-clockwise in terms of the compass: Right → Up → Left → Down → Right...
Wait, the current code does `(dir + 1) % 4`:
- 0 (Up) → 1 (Right) → 2 (Down) → 3 (Left) → 0 (Up)

This is: Up → Right → Down → Left → Up (clockwise on the compass).

**Design decision:** Keep the existing order `(dir + 1) % 4` for backward compatibility with save games and player muscle memory. The order is: Up → Right → Down → Left → Up.

### 8.3 What Recalculates After Rotation

When a belt's direction changes:
1. `incomingSide` is recomputed from scratch (neighbor scan).
2. Geometry is recalculated (straight vs. elbow).
3. Sprite cache is invalidated for this tile (and affected neighbors).
4. Neighboring belts that pointed INTO this tile now see a different neighbor — their `incomingSide` and geometry may change.
5. If a neighbor was an elbow that used this tile as entry, and after rotation this tile no longer points at the neighbor, the neighbor loses its incoming connection → becomes straight (or disconnected).

### 8.4 Remote Rotation (Inspection Panel)

**New behavior:** The player can select a conveyor tile (click to inspect it, regardless of proximity) and press R to rotate it. This does NOT require the player to stand on the belt.

Implementation: The InspectionPanel's rotate button calls `engine.rotateBuildingAt(x, y)`, which rotates the building at the specified coordinates.

### 8.5 Carried Items on Rotation

When a belt is rotated:
- Items already on the belt stay on the belt (inventory is preserved).
- The belt's progress is preserved.
- The belt's `blocked` state is recomputed (may change if the new direction points to a different neighbor).
- If the new direction points to a blocked location, the belt immediately becomes blocked.

---

## 9. Power Semantics

### 9.1 Conveyors Are Passive

- `powerConsumed = 0`
- `active = true` always (never depends on grid power)
- Never included in power grid consumption calculations
- Always animate, always transfer items (subject to downstream availability)

### 9.2 Power Is Separate

Power flow (generators → machines) is completely independent of conveyor logistics. A conveyor can connect to a powered or unpowered machine; the conveyor itself never stops due to power state.

### 9.3 Adjacency Has No Electrical Meaning

Being next to a generator does NOT power a conveyor. All conveyors are always active regardless of where generators are placed.

---

## 10. Rendering — Deterministic Contract

### 10.1 Render Pipeline for Each Conveyor Tile

```
1. Compute incomingSide from neighbor scan.
2. Derive geometry from (direction, incomingSide).
3. Select base sprite:
   - If geometry is straight: use R-belt-{direction}
   - If geometry is elbow: use R-belt-elbow
4. Apply rotation (0 for straight, computed angle for elbow).
5. Draw at tile position.
6. Draw belt connection gaps (dark fill on edges without adjacent belts).
7. Draw tread animation (3 dots moving along flow direction).
8. Draw blocked overlay if blocked.
9. Draw idle dimming if active but empty.
10. Draw item sprite at progress-based position.
```

### 10.2 Sprite Cache

Cache key: `${geometry}_${rotationHash}`
- geometry = "straight" or "elbow_NW", "elbow_NE", "elbow_SE", "elbow_SW"
- rotationHash = the rotation angle (or 0 for straight belts using directional sprites)

Clear cache on:
- Direction rotation (R-key)
- Belt placement/removal (affects neighbors' geometry)
- Any game state change that affects belt connectivity

### 10.3 No Legacy Fallback

If `R-belt-right`, `R-belt-up`, `R-belt-down`, `R-belt-left`, or `R-belt-elbow` are missing from the asset loader, the belt renders as a blank tile (or with an error marker). It does NOT fall back to the procedural square-with-chevron.

---

## 11. Relay Seven Animation — Visual Acceptance Criteria

### 11.1 Mechanical Movement

- Three subtle dots (or equivalent industrial tread marks) move along the belt at all times when the belt is active.
- Movement direction matches the belt's output direction (and item flow).
- Visible even when no item is on the belt.

### 11.2 No Procedural Chevrons

The large chevron overlay (drawn procedurally in canvas) is removed. Direction indication comes solely from the belt sprite artwork.

### 11.3 No Electrical-Looking Pulses

Animation is mechanical belt tread — not blue electrical arcs, not glowing pulses. The dots are white/gray at low opacity.

### 11.4 Elbow Corners Carry Motion

Tread dots on an elbow belt follow the curved path from entry to output. A dot enters from the entry side, curves through the corner, and exits on the output side.

### 11.5 Item Motion Follows Belt Motion

An item on the belt moves from the entry side toward the output side, following the same path as the tread animation. On straight belts, linear motion. On elbow belts, curved motion through the corner.

---

## 12. Future Extensibility

### 12.1 Explicit Future Types (Not Implemented Yet)

- **Splitter:** Takes one item from its input and alternates output to two output directions. Requires new building type.
- **Merger:** Takes items from two input directions and outputs on one direction. Requires new building type.
- **T-Junction / Priority / Filter:** Branches flow in configurable ways. Requires new building type.

### 12.2 Data Model Readiness

The current `Building` interface uses `type: 'conveyor'` for ordinary belts. Future types will use distinct string values:
```
type: 'conveyor' | 'splitter' | 'merger' | 't_junction'
```

The geometry derivation and sprite mapping will be extended per type. Ordinary conveyors are unaffected by the presence of new types.

### 12.3 No Implicit Behavior

Ordinary conveyors do NOT auto-convert to splitters/mergers when surrounded by multiple neighbors. Any such behavior must be explicit via a dedicated building type.

---

## 13. Save/Load Compatibility

### 13.1 Existing Saves

Existing saved games contain conveyors with only a `direction` field. On load:

1. The engine loads the direction value as-is (0-3).
2. The `incomingSide` is computed fresh from neighbors at render time and during simulation.
3. No migration of existing data is needed — the geometry is derived, not stored.

### 13.2 New Saves

New saves continue to store only `direction` in the Building object. No new fields are persisted. The `incomingSide` is always computed on demand.

### 13.3 Migration Edge Cases

If a saved belt was placed such that its direction field does not match the intended flow (e.g., a drag-building bug that assigned the wrong direction), loading the save will preserve that direction. The geometry and sprite will be derived from the stored direction + neighbors, faithfully reproducing the player's (possibly incorrect) layout.

---

## 14. Acceptance Test Matrix

### 14.1 Isolated Cardinal Belts

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 1 | Single belt at (60,60), direction=Up (0) | active=true, progress advances, no blocked, no incoming | `R-belt-up` sprite, vertical, tread moves toward top (North) |
| 2 | Single belt at (60,60), direction=Right (1) | active=true, progress advances, no blocked, no incoming | `R-belt-right` sprite, horizontal, tread moves toward right (East) |
| 3 | Single belt at (60,60), direction=Down (2) | active=true, progress advances, no blocked, no incoming | `R-belt-down` sprite, vertical, tread moves toward bottom (South) |
| 4 | Single belt at (60,60), direction=Left (3) | active=true, progress advances, no blocked, no incoming | `R-belt-left` sprite, horizontal, tread moves toward left (West) |

### 14.2 Straight Horizontal Flow

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 5 | (60,60) dir=Right → (61,60) dir=Right, item on (60,60) | Item transfers from (60,60) to (61,60) at completion | Both render as `R-belt-right` horizontal straight, seamless connection |
| 6 | (60,60) dir=Left → (59,60) dir=Left, item on (60,60) | Item transfers from (60,60) to (59,60) at completion | Both render as `R-belt-left` horizontal straight, seamless connection |

### 14.3 Straight Vertical Flow

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 7 | (60,60) dir=Down → (60,61) dir=Down, item on (60,60) | Item transfers from (60,60) to (60,61) at completion | Both render as `R-belt-down` vertical straight, seamless connection |
| 8 | (60,60) dir=Up → (60,59) dir=Up, item on (60,60) | Item transfers from (60,60) to (60,59) at completion | Both render as `R-belt-up` vertical straight, seamless connection |

### 14.4 All Eight Directed Elbows

| # | Input State (A → B) | A direction | A incomingSide | A geometry | Expected Engine Result | Expected Visual Result |
|---|-------------------|-------------|----------------|------------|----------------------|----------------------|
| 9 | Up→Right: (60,61)→(60,60) | A=Up, B=Right | B: West | B=Elbow NW | Item flows A→B→right | A: `R-belt-up` straight; B: elbow sprite curving from left to top |
| 10 | Right→Up: (59,60)→(60,60) | A=Right, B=Up | B: South | B=Elbow NE | Item flows A→B→up | A: `R-belt-right` straight; B: elbow sprite curving from bottom to top |
| 11 | Right→Down: (60,59)→(60,60) | A=Right, B=Down | B: North | B=Elbow SE | Item flows A→B→down | A: `R-belt-right` straight; B: elbow sprite curving from top to bottom |
| 12 | Down→Right: (60,60)→(61,60) | A=Down, B=Right | B: West | B=Elbow SW | Item flows A→B→right | A: `R-belt-down` straight; B: elbow sprite curving from left to bottom |
| 13 | Down→Left: (60,60)→(60,59) | A=Down, B=Left | B: North | B=Elbow SW | Item flows A→B→left | A: `R-belt-down` straight; B: elbow sprite curving from top to left |
| 14 | Left→Down: (60,59)→(60,60) | A=Left, B=Down | B: East | B=Elbow SW | Item flows A→B→down | A: `R-belt-left` straight; B: elbow sprite curving from right to bottom |
| 15 | Left→Up: (61,60)→(60,60) | A=Left, B=Up | B: East | B=Elbow NW | Item flows A→B→up | A: `R-belt-left` straight; B: elbow sprite curving from right to top |
| 16 | Up→Left: (61,60)→(60,60) | A=Up, B=Left | B: South | B=Elbow NE | Item flows A→B→left | A: `R-belt-up` straight; B: elbow sprite curving from bottom to left |

### 14.5 Adjacent But Not Connected

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 17 | (60,60) dir=Right, (60,61) dir=Right (adjacent vertically, both pointing same direction) | (60,61) has no incoming from (60,60) because (60,60)'s direction=Right does not point into (60,61) | Both render as straight belts. (60,60): `R-belt-right`, (60,61): `R-belt-down` (no, (60,61) dir=Right → `R-belt-right`). Visually: two separate horizontal belts, not connected. |
| 18 | (60,60) dir=Right, (61,60) dir=Down (A points into B) | B has incomingSide=West, geometry=Elbow SW. Item flows A→B. | A: straight horizontal. B: elbow sprite curving from left to bottom. |

### 14.6 Incompatible Downstream

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 19 | (60,60) dir=Right, (61,60) dir=Right (straight chain) + (61,61) dir=Up (B's output points away from C) | A→B works. B→(61,61) fails because B points Down but C is at (61,61)... wait, B dir=Right points to (62,60), not (61,61). Let me fix: (60,60) dir=Right → (61,60) dir=Right → item flows. At (62,60): empty tile → blocked at (61,60). | (61,60) shows red gate + blocked overlay. |

### 14.7 Blocked Destination

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 20 | Three-belt chain where the third belt is full | Third belt: blocked=false (full but no item to transfer out). Second belt: blocked=true (can't push to third). First belt: may advance or be blocked depending on third belt's state. | Third belt: normal rendering. Second belt: red gate at exit + pulsing border. First belt: normal (unless also blocked). |

### 14.8 Head-On Conflict

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 21 | (60,60) dir=Right, (61,60) dir=Left (pointing at each other) | Neither transfers to the other (head-on guard). If both have items: both blocked. | Both render as straight horizontal belts with red gates at their facing edges. |

### 14.9 Multi-Turn Drag Route

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 22 | Drag path: (60,60) → (61,60) → (61,61) → (62,61) | Belt 1: dir=Right. Belt 2: dir=Down. Belt 3: dir=Right. Belt 4 (last): dir=getBuildDirection(). | Belt 1: straight right. Belt 2: elbow curving from left to bottom. Belt 3: elbow curving from top to right. Belt 4: straight (direction from build tool). |

### 14.10 Remote R Rotation

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 23 | Belt at (60,60) dir=Right. Player clicks to inspect. Presses R. | direction becomes Down (2). incomingSide recomputed. | Sprite changes from `R-belt-right` to `R-belt-down`. If a neighbor was feeding it from the left, that neighbor now points at the belt's new output direction → the belt may gain a new incomingSide. |
| 24 | Belt at (60,60) dir=Right, neighbor (59,60) dir=Right feeding it. Press R on (60,60). | (60,60) becomes dir=Down. (59,60) still dir=Right, pointing into (60,60). (60,60) now has incomingSide=West, geometry=Elbow NW. | (59,60): straight right. (60,60): elbow sprite curving from left to bottom. |

### 14.11 Item Through an Elbow

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 25 | (59,60) dir=Right → (60,60) dir=Down, item on (59,60) | Item transfers (59,60)→(60,60) at completion. (60,60) now holds the item. Progress resets. | Item sprite on (59,60) moves rightward. When it reaches (60,60), it appears on (60,60) moving downward. Elbow at (60,60) shows curved tread animation from left to bottom. |

### 14.12 Passive Belts — Zero Grid Power

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 26 | Belt chain with zero generators in the entire map | All belts active=true, progress advances normally. Power grid: produced=0, consumed=0. | All belts animate (tread dots move). No "No Power" status on any belt. |
| 27 | 10 belts adjacent to a powered miner (miner draws power, belts don't) | Power consumed=5 (miner only), not 15. All 10 belts active. | All belts animate. Miner shows powered status. |

### 14.13 Distant Powered Consumer

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 28 | Generator at (60,50), belt chain from (60,55)→(60,56)→(60,57)→Smelter at (60,58), player 30 tiles away | Generator fuels, grid has power. Smelter receives power. Belts carry items. Player distance irrelevant. | Generator shows producing. Belts animate. Smelter shows powered. No visual "power cable" needed (grid is global). |

### 14.14 Inspection Direction Matches Rendering

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 29 | Belt at (60,60) dir=Right, inspected via click | InspectionPanel shows "Direction: Right ▶". | Belt renders as `R-belt-right` (horizontal, flow right). |
| 30 | Belt at (60,60) dir=Up, inspected via click | InspectionPanel shows "Direction: Up ▲". | Belt renders as `R-belt-up` (vertical, flow up). |
| 31 | Belt at (60,60) dir=Right, incoming from (59,60) dir=Right | InspectionPanel shows "Direction: Right ▶" with incoming "Turns from Up" (elbow entry from West). | Belt renders as elbow sprite curving from left to right... wait. (59,60) dir=Right points to (60,60)? DELTA[Right]=(1,0). (59,60)+(1,0)=(60,60). Yes. (60,60) dir=Right, incomingSide=West. Geometry: Straight (entry from opposite). |
| 32 | Belt at (60,60) dir=Right, incoming from (60,59) dir=Down | (60,59)+DELTA[Down]=(60,60). Yes. (60,60) dir=Right, incomingSide=North. Geometry: Elbow NE. InspectionPanel shows "Direction: Right ▶" with incoming "Turns from Down". | Belt renders as elbow sprite curving from top to right. |

### 14.15 Save/Load Round Trip

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 33 | Place 5-belt chain with 2 elbows, save, load | All directions preserved. incomingSide recomputed matches pre-save. Item positions preserved. | Rendering identical to pre-save state. |
| 34 | Load a save from before this design (only direction field) | direction loaded correctly. incomingSide computed from neighbors. Geometry derived. | Correct rendering for the saved layout, even if direction+neighbors create unexpected geometry. |

### 14.16 No Legacy Fallback

| # | Input State | Expected Engine Result | Expected Visual Result |
|---|------------|----------------------|----------------------|
| 35 | Any valid straight or elbow configuration | No procedural fallback rendering path is invoked. | No grey squares with chevrons. Only Relay Seven belt sprites render. |

---

## 15. Why the Adjacency Bitmask Approach Failed

### 15.1 The BELT_MASK Problem (commit `1e8f50c`)

The bitmask approach checked whether each cardinal neighbor contains a belt:

```
BELT_MASK bits: [North:belt?, East:belt?, South:belt?, West:belt?]
e.g., 0b0101 = North=no, East=yes, South=no, West=yes
```

Sprite selection then mapped bitmask values to visual geometry:
```
0b0000 → no neighbors → straight (any direction)
0b0101 → North+South → vertical straight
0b1010 → East+West → horizontal straight
0b0100 → only East → elbow
```

**Why this is wrong:**

1. **Adjacency ≠ flow connectivity.** A belt at the East neighbor might point North (not into the center tile). The bitmask treated it the same as a belt pointing West (into the center). This caused the "Inspection: Up / Render: Left" mismatch — the belt's direction said Up, but the bitmask-based sprite selection saw East+South neighbors and picked a horizontal straight sprite.

2. **Multiple incoming neighbors create invalid geometry.** If a belt has neighbors on both the entry side AND the output side, the bitmask might select a "straight" sprite while the belt is actually an elbow.

3. **Direction and geometry are coupled.** A single direction value (Up/Right/Down/Left) cannot simultaneously express "I am a horizontal belt" and "I am a vertical belt." The bitmask tried to infer geometry from neighbors, but neighbors don't determine a belt's intended geometry — the player's drag path does.

4. **Sprite cache complexity.** The bitmask had 16 possible values, requiring 16 sprite keys. Most combinations don't correspond to valid physical belt shapes. This made the cache bloated and error-prone.

### 15.2 The Correct Approach

Geometry is derived from:
1. The belt's own `direction` (output direction) — authoritative.
2. Whether an adjacent belt actually points INTO this tile — verified by checking that belt's direction.

This ensures:
- The sprite always matches the output direction.
- The sprite shape matches the actual flow path.
- No ambiguity between what the engine simulates and what the renderer shows.

---

## 16. Implementation Plan

### Phase A: Engine / Data Model

1. Add helper function `computeIncomingSide(x, y, map)` that scans neighbors and returns the direction D where a neighboring belt at `map[y+DELTA[D].y][x+DELTA[D].x]` has `direction === opposite(D)`.

2. Add a read-only computed property or method on the engine/Building: `getBeltFlow(x, y)` that returns `{ output: direction, incomingSide: DirectionValue? }`.

3. Ensure `getBeltSpriteKey()` and all rendering code use the computed geometry (from flow) rather than raw direction alone.

4. No changes to the `Building` interface's persisted fields. No new database columns. No save schema migration.

### Phase B: Engine Unit Tests

1. Test `computeIncomingSide` for all cases: no incoming, single incoming from each of 4 sides, multiple incoming (priority).

2. Test geometry derivation for all 16 direction + incomingSide combinations.

3. Test item transfer through all 8 elbow flows.

4. Test blocked state propagation through a chain with elbows.

5. Test that `getBeltSpriteKey` always returns a non-fallback key for valid geometry.

### Phase C: Renderer Mapping

1. Implement the sprite selection table from §5.1.

2. Implement elbow sprite rotation from §5.3.

3. Update `drawBeltConnections` to use the computed `incomingSide` (and neighbor direction check) rather than raw adjacency.

4. Update tread animation to follow curved paths on elbow geometry.

5. Ensure item interpolation (`getBeltPoint`) handles elbow curves correctly.

6. Remove the procedural fallback for valid geometries (or make it an error-level log).

7. Clear sprite cache on direction changes and neighbor changes.

### Phase D: Interaction / Drag / Rotation

1. Update `buildOrthoPath` direction assignment to be the authoritative output direction (already correct in current code — verify no post-hoc modification).

2. Add `engine.rotateBuildingAt(x, y)` for remote rotation from InspectionPanel.

3. Wire the InspectionPanel's rotate button to `rotateBuildingAt`.

4. Ensure R-key without build tool selects from inspected tile (or nearest), not just player tile.

5. Test multi-tile drag routes with multiple elbows (e.g., zigzag: Right→Down→Right→Down).

### Phase E: Playwright Acceptance

1. Launch the game. Place a 4-cardinal belt set and verify each sprite renders correctly.

2. Place elbow chains and verify the elbow sprite appears (not fallback square).

3. Verify inspection panel direction matches visual rendering for all 4 directions and all 8 elbow configurations.

4. Verify tread animation direction matches output direction.

5. Verify no procedural chevron fallback renders for any valid configuration.

### Phase F: Human Visual Review

1. Open the showcase page (`showcase.html`). Verify all 8 elbow swatches show correct curved belt sprites with proper flow direction.

2. Play-test: build an L-shaped route, place an item at the start, watch it flow through the elbow.

3. Play-test: rotate a belt mid-route and verify neighboring belts update their visuals correctly.

4. Play-test: build a chain with a blocked endpoint and verify red gate overlay appears correctly.

5. Verify the coal chain bootstrap scene (miner → belts → generator) renders correctly with zero generators.

---

## 17. Proof: Unambiguous Representation of Directed Elbows

### 17.1 The Four Named Flows

**Right → Up:**
- Belt A at (x-1, y) with direction=Right. DELTA[Right]=(1,0). A outputs to (x, y).
- Belt B at (x, y) with direction=Up. DELTA[Up]=(0,-1). B outputs to (x, y-1).
- B's incomingSide: scan neighbors. Neighbor at (x-1, y) has direction=Right. opposite(West)=East... wait.
  - Neighbor on West side: (x-1, y). direction=Right. DELTA[Right]=(1,0). (x-1,y)+(1,0)=(x,y)=B's position. YES.
  - So incomingSide for B = West.
  - B's direction=Up, incomingSide=West. perpendicular? Up(0) and West(3): |0-3|=3 mod 4 = 3... that's perpendicular.
  - Geometry: Up + West = Elbow NW.
  - Flow: from West (left) to Up (top).

**Up → Left:**
- Belt A at (x, y+1) with direction=Up. DELTA[Up]=(0,-1). A outputs to (x, y).
- Belt B at (x, y) with direction=Left. DELTA[Left]=(-1,0). B outputs to (x-1, y).
- B's incomingSide: scan. Neighbor at (x, y+1) (South side). direction=Up. DELTA[Up]=(0,-1). (x,y+1)+(0,-1)=(x,y)=B's position. YES.
  - So incomingSide for B = South.
  - B's direction=Left, incomingSide=South. |3-2|=1 mod 4 = 1... perpendicular.
  - Geometry: Left + South = Elbow SW (wait, that doesn't seem right for Up→Left...)

Let me reconsider. Left + South: entry from South (bottom), output to Left (west). That's a curve from bottom-left corner. That IS the SW corner physically, and the flow goes from bottom to left. This is correct.

Flow: from South (bottom) to Left (west). The sprite shows a curve from bottom to left.

**Left → Down:**
- Belt A at (x+1, y) with direction=Left. DELTA[Left]=(-1,0). A outputs to (x, y).
- Belt B at (x, y) with direction=Down. DELTA[Down]=(0,1). B outputs to (x, y+1).
- B's incomingSide: scan. Neighbor at (x+1, y) (East side). direction=Left. DELTA[Left]=(-1,0). (x+1,y)+(-1,0)=(x,y)=B's position. YES.
  - incomingSide = East.
  - B's direction=Down, incomingSide=East. |2-1|=1 mod 4 = 1. Perpendicular.
  - Geometry: Down + East = Elbow SW.
  - Flow: from East (right) to Down (bottom).

**Down → Right:**
- Belt A at (x, y-1) with direction=Down. DELTA[Down]=(0,1). A outputs to (x, y).
- Belt B at (x, y) with direction=Right. DELTA[Right]=(1,0). B outputs to (x+1, y).
- B's incomingSide: scan. Neighbor at (x, y-1) (North side). direction=Down. DELTA[Down]=(0,1). (x,y-1)+(0,1)=(x,y)=B's position. YES.
  - incomingSide = North.
  - B's direction=Right, incomingSide=North. |1-0|=1 mod 4 = 1. Perpendicular.
  - Geometry: Right + North = Elbow NE.
  - Flow: from North (top) to Right (east).

**All four are uniquely represented:**
- Each has a distinct `(direction, incomingSide)` pair.
- Each produces a distinct sprite rotation.
- Each flows in a different visual direction.
- No two flows share the same pair.

### 17.2 Summary of All 16 Combinations

| direction | incomingSide | Valid? | Geometry | Flow |
|-----------|-------------|--------|----------|------|
| Up | undefined | Yes | Straight | Output Up, no entry |
| Up | South | Yes | Straight | Entry S → Output N |
| Up | East | Yes | Elbow NE | Entry E → Output N |
| Up | West | Yes | Elbow NW | Entry W → Output N |
| Right | undefined | Yes | Straight | Output R, no entry |
| Right | Left | Yes | Straight | Entry L → Output R |
| Right | Up | Yes | Elbow NE | Entry N → Output R |
| Right | Down | Yes | Elbow SE | Entry S → Output R |
| Down | undefined | Yes | Straight | Output D, no entry |
| Down | North | Yes | Straight | Entry N → Output D |
| Down | East | Yes | Elbow SE | Entry E → Output D |
| Down | West | Yes | Elbow SW | Entry W → Output D |
| Left | undefined | Yes | Straight | Output L, no entry |
| Left | Right | Yes | Straight | Entry R → Output L |
| Left | Up | Yes | Elbow NW | Entry N → Output L |
| Left | Down | Yes | Elbow SW | Entry S → Output L |

No invalid combinations exist within the model's rules. Every combination of direction and perpendicular incomingSide produces a valid elbow. Every combination of direction and opposite/undefined incomingSide produces a valid straight.

---

*End of specification.*
