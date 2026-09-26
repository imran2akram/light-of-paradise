# The Light of Paradise

A single-player browser-based action game built with vanilla JavaScript and the HTML5 Canvas API. Fight through three mystical rooms, collect light crystals, and defeat the Devil boss to reach Paradise.

**[▶ Play on GitHub Pages](https://imran2akram.github.io/light-of-paradise/)**

---

## Gameplay

### Story
You are a wandering soul navigating the **Void**, **Hell**, and **Paradise**. Collect all three light crystals to unlock your power, then defeat the Devil to bring light back to the world.

### Rooms
| Room | Background | Goal |
|------|-----------|------|
| **Void** | Grey | Starting area; heals you, has the shop and a "what beats what" chart |
| **Hell** | Dark red | Hide in caves (1 minute) and dig up weapons from dirt piles — dig deeper for rarer ones, but beware mole monsters; fight the Devil |
| **Paradise** | Dark teal | Defeat Fire Monsters, Ghosts, Bats and Slimes to unlock Light Chests |

### Mystery portals
Every room has 3–4 swirling portals in different shapes (circle, diamond, star, hexagon, triangle). Each one takes you to a **random** other room, so you never know where you'll end up.

### Controls
| Platform | Move | Shoot / Dig |
|----------|------|-------|
| **Desktop** | `WASD` or Arrow keys | `Spacebar` |
| **Mobile / Android** | Virtual joystick (bottom-left) | SHOOT / DIG button (bottom-right) |

### Weapons & bad guys
Every weapon does a little damage (1) to every bad guy, and a lot (3, a **SUPER HIT**) to the bad guys it's strong against. Your weapon also shields you from touching those bad guys. Bad guys have 3 HP.

| Weapon | Strong against | Special |
|--------|----------------|---------|
| ❄ **Ice** | Fire Monsters | |
| 🔥 **Fire** (Brimstone) | Ghosts | Spark trail |
| ⚡ **Lightning** | Bats | Fastest shots |
| 💧 **Water** | Slimes, Mole Monsters | Biggest shots |
| 🌈 **Rainbow** | Everything | |

| Bad guy | Where | Moves |
|---------|-------|-------|
| Fire Monster | Paradise | Bounces around |
| Ghost | Paradise | Drifts toward you |
| Bat | Paradise | Fast zig-zag flying |
| Slime | Paradise | Hops toward you |
| Mole Monster | Hell (from dig spots) | Chases you, even in caves; drops a coin |

### Digging
Each dirt pile in Hell's caves has 3 layers (3, 4, then 5 presses of Shoot). Each visit, the four piles hide one each of Ice, Fire, Lightning and Water.
1. The pile's weapon
2. **Super** version: fires 3 shots at once
3. **Rainbow**: fires 3 shots, strong against everything

Each layer may release a **Mole Monster** (30% / 60% / 100%), with more HP the deeper it was. You can't dig while one is out. Digging up a weaker weapon than yours doesn't replace it.

You must hold 3 Light Crystals before your attacks damage the Devil (every weapon does 1 damage to it).

### Win Condition
Collect all 3 Light Crystals in Paradise, return to Hell, and reduce the Devil's HP (5 hearts) to zero.

---

## Running Locally

No build step is required. The entire game is a single HTML file.

```bash
# Option 1: open directly in your browser
open index.html

# Option 2: serve with Python (avoids video autoplay restrictions)
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Project Structure

```
light-of-paradise/
├── index.html                    # Entire game (HTML + CSS + JS, ~1 300 lines)
├── Light of paradise opening.mp4 # Intro cinematic
├── .github/
│   └── workflows/
│       └── deploy.yml            # Auto-deploy to GitHub Pages on push to master
└── README.md
```

### Inside `index.html`

All game code lives in one `<script>` block. Sections are separated by banner comments (`// ── SECTION ─`):

| Section | Lines (approx.) | Purpose |
|---------|----------------|---------|
| Video Intro | 48–97 | Fades out intro overlay on ended / click / tap / Space |
| Constants | 99–108 | `ROOM`, `POWER`, `BASE_SPEED`, `HELL_CAVES` |
| State | 110–123 | Single `state` object (room, HP, phase, etc.) |
| Player | 125–126 | `player` position object |
| Input | 128–207 | Keyboard (`keys` map) + virtual touch controls |
| Entity Factories | 209–290 | `makeHell()`, `makeParadise()`, `makeVoid()` |
| Reset | 294–335 | `resetGame()` — rebuilds entire game state |
| Update: Player | 337–374 | Movement, portal collision, particle trail |
| Update: Enemies | 376–505 | Devil AI (CHASE/WANDER), fire monsters, ghosts |
| Update: Projectiles | 506–525 | Move bullets, check bounds |
| Update: Enemy Proj | 506–525 | Enemy bullets, shield/HP logic |
| Shoot | 526–547 | Auto-aim to nearest enemy |
| Pickups | 608–643 | Power-up proximity detection |
| Change Room | 644–676 | Transition logic + entity respawn |
| Draw: Intro | 677–737 | Title card and story text |
| Draw: Portals | 738–752 | Animated glow portals |
| Draw: Void | 753–805 | Void room background and text |
| Draw: Hell | 806–912 | Caves, devil, power-up items |
| Draw: Paradise | 913–977 | Enemies, chests |
| Draw: Player | 978–1009 | Player sprite (colour changes with power) |
| Draw: Projectiles | 1010–1047 | Player and enemy bullets |
| Draw: HUD | 1048–1094 | Hearts, crystals, power indicator |
| Draw: Win | 1095–1132 | Victory screen + Play Again button |
| Draw: Controls | 1192–1239 | On-screen hint text + virtual gamepad overlay |
| Main Loop | 1241–1310 | `update()` → `draw()` via `requestAnimationFrame` |

---

## Architecture Notes

- **Single-file, no dependencies** — vanilla JS (ES2017), no bundler, no frameworks.
- **Canvas resolution** — fixed 800 × 600 logical pixels; CSS `max-width: 100%` scales it down on small screens.
- **Game loop** — `requestAnimationFrame` at ~60 fps; all timing is frame-based.
- **Collision** — distance-based (`Math.hypot`) for pickups/projectiles; AABB rectangle overlap for portals.
- **Input** — `keys` map for keyboard; `vTouch` object for virtual touch controls. Both are read in `updatePlayer()` each frame.
- **State** — a single `state` object holds all mutable game state; `resetGame()` rebuilds everything to initial values.
- **Deployment** — GitHub Actions workflow auto-deploys the repository root to GitHub Pages on every push to `master`.

---

## Touch / Mobile Support

Virtual controls appear automatically when the first `touchstart` event is detected (`isTouchDevice` flag). They are never rendered on desktop.

| Element | Canvas position | Visible radius |
|---------|----------------|----------------|
| Joystick base | (100, 490) | 55 px |
| SHOOT button | (700, 490) | 45 px |

Touch hit areas are expanded by `TOUCH_AREA_MULTIPLIER` (1.5×) so they are easy to tap.  
Movement uses a 20% deadzone (`JOYSTICK_DEADZONE_RATIO`) to filter thumb rest noise.

---

## Deployment

Pushes to the `master` branch trigger the `.github/workflows/deploy.yml` workflow which uploads the repository root as a GitHub Pages artifact and deploys it. No build step is executed.
