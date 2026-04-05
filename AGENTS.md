# AGENTS — AI Context for Light of Paradise

This file gives AI coding agents (GitHub Copilot, Claude, etc.) the orientation they need to work on this codebase without having to re-derive everything from scratch.

---

## What this project is

A single-player browser action game written in **vanilla JavaScript** (ES2017) using the **HTML5 Canvas 2D API**. No framework, no bundler, no package manager. The entire game ships as one file: `index.html`.

The deployed game is at: `https://imran2akram.github.io/light-of-paradise/`

---

## File map

```
index.html                    ← everything (HTML + CSS + JS, ~1 300 lines)
Light of paradise opening.mp4 ← intro cinematic (referenced in index.html)
.github/workflows/deploy.yml  ← auto-deploy to GitHub Pages on push to master
README.md                     ← player/developer documentation
AGENTS.md                     ← this file
```

---

## How to run & test

```bash
# No build required — open directly or serve locally:
python3 -m http.server 8000   # then open http://localhost:8000
```

There is **no test framework**. Validate changes by:
1. Checking JS syntax: `node --check /tmp/extracted.js` (extract the `<script>` block first)
2. Opening the page in a browser and playing through each room
3. On mobile: open in Chrome DevTools device simulation or a real Android device

---

## Code structure inside `index.html`

All game logic is inside the single `<script>` block. Sections are delimited by banner comments like `// ── SECTION ─`.

### Key globals

| Symbol | Type | Purpose |
|--------|------|---------|
| `canvas` / `ctx` | DOM / CanvasRenderingContext2D | 800×600 canvas |
| `state` | object | All mutable game state (room, HP, phase, etc.) |
| `player` | `{x, y, w, h}` | Player position |
| `keys` | `{}` | Keyboard state map (keyed by `e.code`) |
| `vTouch` | object | Virtual touch state (joystick + shoot button) |
| `isTouchDevice` | boolean | Set `true` on first `touchstart`; gates virtual control rendering |
| `projectiles` | array | Player bullets |
| `enemyProjectiles` | array | Enemy bullets |
| `particles` | array | Visual effects (sparks, confetti) |
| `hell` / `paradise` / `void_` | objects | Per-room entity state |

### Key constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `ROOM` | `{VOID, HELL, PARADISE}` | Room identifiers |
| `POWER` | `{NONE, ICE, BRIMSTONE}` | Player power states |
| `BASE_SPEED` | `4` | Player movement px/frame (×1.2 in Paradise) |
| `VJOY` | `{x:100, y:490, baseR:55, maxDist:40}` | Virtual joystick geometry |
| `VSHOOT` | `{x:700, y:490, r:45}` | Virtual shoot button geometry |
| `TOUCH_AREA_MULTIPLIER` | `1.5` | Touch hit area expansion factor |
| `JOYSTICK_DEADZONE_RATIO` | `0.2` | Deadzone fraction of `maxDist` |

### Main loop

```
loop()
 ├── update()
 │    ├── updatePlayer()       ← reads keys[] and vTouch
 │    ├── updateEnemies()
 │    ├── updateProjectiles()
 │    ├── updateEnemyProjectiles()
 │    ├── checkPickups()
 │    └── updateParticles()
 └── draw()
      ├── drawBackground()
      ├── drawPortals()
      ├── drawVoid/Hell/Paradise()
      ├── drawPlayer()
      ├── drawProjectiles() / drawEnemyProjectiles()
      ├── drawParticles()
      ├── drawHUD()
      ├── drawControls()
      ├── drawVirtualControls()  ← only renders when isTouchDevice is true
      └── drawWin()              ← only renders when state.won is true
```

---

## Input system

### Keyboard
A `keys` dictionary is maintained via `keydown`/`keyup` listeners on `document`. `updatePlayer()` reads it each frame:
```js
if (keys['ArrowLeft'] || keys['KeyA']) dx -= spd;
```

### Virtual touch controls (added for Android)
- `touchstart` on canvas: detects intro skip, Play Again, joystick activation, and shoot button press.
- `touchmove` on canvas: updates `vTouch.joyDX` / `vTouch.joyDY` (clamped to `VJOY.maxDist`).
- `touchend` / `touchcancel`: calls `clearTouchId()` to release the respective touch.
- `updatePlayer()` reads `vTouch.joyDX/joyDY` with a deadzone, producing the same `dx/dy` as keyboard.
- Both inputs are additive — desktop keyboard and touch work simultaneously.

All canvas touch listeners use `{ passive: false }` so `e.preventDefault()` can suppress browser scroll/zoom.

### `canvasPos(clientX, clientY)`
Converts browser client coordinates to 800×600 logical canvas coordinates, accounting for CSS scaling:
```js
x = (clientX - rect.left) * (800 / rect.width)
y = (clientY - rect.top)  * (600 / rect.height)
```

---

## Game state machine

`state.gamePhase` drives the top-level flow:

```
'intro'   →  (Space / click / tap)  →  'playing'
'playing' →  (all 3 crystals + devil dead)  →  state.won = true  →  drawWin()
```

`resetGame()` resets everything back to `gamePhase: 'intro'`.

---

## Collision conventions

- **Pickups / projectile–enemy**: distance check with `Math.hypot(a.x-b.x, a.y-b.y) < threshold`
- **Portal entry**: AABB rectangle overlap (`player.x > p.x && player.x < p.x + p.w …`)
- **Player bounds**: clamped in `updatePlayer()` to `[18, canvas.width-18]` × `[52, canvas.height-18]`

---

## Devil AI states

| State | Trigger | Behaviour |
|-------|---------|-----------|
| `CHASE` | Player outside `HELL_CAVES` | Moves toward player at 0.9 px/frame |
| `WANDER` | Player inside a cave | Picks random destination; telegraphs 30 frames before shooting |

---

## Adding a new feature — checklist

1. **State changes** — add fields to `state` (or a per-room object) and initialise them in `resetGame()` / the relevant factory (`makeHell`, `makeParadise`, `makeVoid`).
2. **Update logic** — add to the relevant `update*()` function.
3. **Rendering** — add a `draw*()` call inside `draw()`, after `drawBackground` but before `drawHUD` so HUD renders on top.
4. **Input** — if touch-triggered, extend the `touchstart` handler; if keyboard-triggered, extend the `keydown` handler or `updatePlayer()`.
5. **Constants** — add new magic numbers as named `const` at the top of the script.
6. **Validate** — extract the `<script>` block and run `node --check` to catch syntax errors before testing in browser.

---

## Style conventions

- Sections are separated by `// ── SECTION NAME ─────────────────────────────────────────` banners.
- Positional alignment with spaces (not tabs) is used throughout (e.g. aligning object values).
- No external libraries. No `import`/`export`. No TypeScript.
- `const` for everything that does not need rebinding; `let` for mutable state.
- All coordinates are in logical canvas pixels (800×600 space).
