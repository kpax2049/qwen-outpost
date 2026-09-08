# Release Media Plan — Outpost v1.0.0 (Relay Seven)

## Capture Notes

- Use full-screen or near full-screen (1920x1080 recommended)
- Browser should be in fullscreen or maximized (no address bar visible if possible)
- Use Chrome or Edge for consistency
- Do NOT zoom the browser — 100% zoom only
- If capturing a GIF, use OBS, ShareX, or similar — target ~5–10 seconds

---

## 1. HERO — Factory Panorama

**Filename:** `hero-factory.png`

**Composition:**
- Camera positioned to show a mid-game factory with multiple machines
- Must show: conveyor belts carrying items between machines, at least one active production line, resource deposits, and the player character visible
- The HUD top bar should be visible but not dominate the frame
- The bottom control hint bar should be visible

**UI panels:**
- No side panels open
- Optional: Power Panel briefly visible in a separate shot

**What should be visible:**
- Multiple building types (at least Miner, Conveyor, Generator, Smelter/Assembler)
- Items on belts (animated/visible)
- Terrain diversity (grass, forest, resources)

**Suggested crop:** 16:9 or 16:10 aspect ratio. Crop to remove excessive sky — the factory should fill ~70% of the frame.

---

## 2. ARRIVAL — Survey Lander

**Filename:** `arrival-lander.png`

**Composition:**
- Player standing beside the Survey Lander near spawn
- The Survey Lander (2x2 tile) should be prominently visible
- Include some surrounding terrain (grass, forest) to show context

**UI panels:**
- Tutorial step still visible if possible (first step, "Move Around")
- Or HUD with no side panels

**What should be visible:**
- The Survey Lander sprite and ground decal
- The player character
- Clean terrain

**Suggested crop:** 16:9. The lander should be centered or on the rule-of-thirds line.

---

## 3. FACTORY — Automated Production

**Filename:** `factory-automation.png`

**Composition:**
- A complete production line from Miner → Conveyor → processing machine
- Show the flow of items clearly

**UI panels:**
- No side panels
- Power Panel optionally open to show surplus

**What should be visible:**
- Miner extracting resources
- Conveyors carrying items
- A processing machine (Smelter or Generator) receiving items

**Suggested crop:** 16:9. Show the full belt route if possible.

---

## 4. ASSEMBLER / PRODUCTION — Recipe Selection

**Filename:** `assembler-recipe.png`

**Composition:**
- Close-up on an Assembler with its inspection panel open
- The recipe selector should be visible showing the three options (Copper Wire, Gear, Engine)

**UI panels:**
- Inspection panel MUST be open
- The recipe selection buttons should be clearly visible

**What should be visible:**
- The Assembler building (diamond shape, green)
- Inspection panel showing: status, inventory, connections, and recipe selector
- Recipe buttons with current selection highlighted

**Suggested crop:** Can be tighter — the inspection panel is the focus. 16:9 with the panel filling ~40% of the frame.

---

## 5. VICTORY — Outpost Established

**Filename:** `victory.png`

**Composition:**
- The "Outpost Established" victory overlay
- Dark background with golden title text

**UI panels:**
- Victory overlay active
- "Continue Playing" button visible

**What should be visible:**
- The "Outpost Established!" title in gold
- The subtitle about crafting 5 engines
- The "Continue Playing" button

**Suggested crop:** 16:9. The overlay should be centered and fill the frame.

---

## 6. OPTIONAL GIF — Full Production Sequence

**Filename:** `production-sequence.gif`

**Sequence (5–10 seconds):**

1. **RMB harvesting** (1s): Right-click a coal deposit → player moves to it and begins harvesting
2. **Miner placement** (1s): Open build menu → select Miner → place on resource → close menu
3. **Conveyor placement** (1s): Select Conveyor → click-drag a route from Miner to a building
4. **Generator activation** (1s): Show the power indicator turning green as the grid goes positive
5. **Item flow** (1s): Show items moving along conveyors between machines

**What should be visible throughout:**
- Smooth movement
- Belt animations
- UI changes (build menu, power status)

**Suggested specs:**
- Width: 1280px or 1920px
- FPS: 30
- Loopable if possible

---

## Quick Checklist

For each image, verify:
- [ ] No browser UI (tabs, address bar) visible
- [ ] No DevTools panels open
- [ ] Text is legible at 100% zoom
- [ ] No cursor artifacts (unless demonstrating interaction)
- [ ] Good contrast — not too dark or washed out
- [ ] Saved as PNG (for static) or GIF (for animation)
