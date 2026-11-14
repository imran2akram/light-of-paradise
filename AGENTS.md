# AGENTS — AI Context for Light of Paradise

This file gives AI coding agents the orientation they need to work on this codebase without re-deriving everything.

---

## What this project is

A browser action-adventure game written in **vanilla JavaScript** using the **HTML5 Canvas 2D API**. No framework, no bundler, no package manager, no modules. `index.html` holds the page and CSS; the game is 14 plain scripts in `js/` (~13,000 lines in all), loaded in order by `<script src="js/NN-name.js">` tags. There is no build step: the repo root is served as it is.

Features are requested by a young player, so they come often and should be playful and kid-friendly. Keep text on screen short and simple.

Live site: `https://imran2akram.github.io/light-of-paradise/`. GitHub Pages deploys from the `main` branch directly (there is no deploy workflow). `.github/workflows/test.yml` runs the headless checks below on every pull request and push to `main`.

---

## How to run & test

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no test framework, but `test/` has a headless harness (no dependencies). Validate changes by:
1. `node test/scripts.js` — every `js/*.js` is loaded by `index.html` exactly once, every loaded file exists, and each file (and all of them joined, as the page runs them) passes `node --check`.
2. `node test/regress.js` — deterministic scenarios (exit code 1 on failure). Add one whenever you fix a crash or a bug a child could notice. It covers: every room draws; death and respawn; the fixed-timestep loop and pausing (menus, hidden tab, upright phone); the three input methods (hints per device, menu/shop stick navigation, deadzone, Ctrl-keys); New Game asking first and saves (`hotbar`, `job`, old saves); safe arrivals; blocks (portal/door keep-clear spots, unbreakable maze walls, build mode taps, hotbar taps); touch layout (48 px buttons, no overlaps, safe areas); menu close button; football; moles; the Smiting Stick; the Void weapon chart and the coins hint. Write a scenario with `check(name, fn)` (returns `''` when fine, or a description of the problem) or `scenario(name, setup, check)` (runs 3 frames first). Helpers: `padWith(button, ax, ay)` fakes a controller, `fire('keydown', keyEv('Escape'))` a key, `handleTap(x, y)` a tap, `recordText(fn)` returns every line drawn by `fn` with a believable width (the stub canvas says 10 px for everything). In headless runs the opening video is still up: `introVideo.dismiss()` removes it (the first scenario checks that a controller button does).
3. `node test/fuzz.js --seed 1 --frames 30000` — plays the game with random keys, taps, controller input, menus, room changes and deaths, and fails if any frame throws or the loop stops. Run a few seeds; bigger `--frames` finds rarer bugs. `--canvas` draws for real through `node-canvas` (`npm i canvas`, keep `node_modules` out of git), so drawing calls that throw in a browser throw here too.
4. Play it in a browser (desktop, touch and a game controller).

`.gitignore` keeps `.claude/worktrees/` out. `test/headless.js` is the fake browser underneath both scripts (stub DOM, Web Audio, `localStorage`, gamepads). It reads the `<script src>` tags from `index.html` and joins those files in the page's order, so the tests load exactly what the page loads. Because the game scripts use top-level `let`/`const`, test code is run as a "driver" string in the same scope rather than imported.

`loop()` catches errors from `update()` / `draw()` and passes them to `reportError()`, which logs to the console and, when `ERROR_LOG_URL` is set, sends a small report to the Cloudflare Worker in `worker/` (see `worker/README.md`) so bugs on players' screens can be read later. `node test/worker.js` tests the Worker with a fake database and `node test/reporter.js` the game side. Never call `changeRoom()` from inside an index loop over an array it resets (`projectiles`, `enemyProjectiles`, `heartPickups`, `bolts`, `gadgetObjs`, ...); respawning defers its room change to the end of `update()` for this reason.

---

## Pull requests

Standing instruction from the owner (the parent): when the work is finished and the `test.yml` checks are green, **merge your own pull request into `main` without asking**. A child is usually the one in the session and cannot review code.

Merging to `main` publishes to the live site straight away. So never merge with failing checks or a feature you know is broken — fix it first, or stop and say what is blocking.

---

## Files

The scripts are classic scripts sharing one global scope, so a top-level `let`/`const`/`function` in one file is visible in all later ones. Load order matters only at load time: a file can use at load time (top-level code, `const X = f()`) only what earlier files defined; inside functions anything can be called, because everything exists by the time the game runs. The split follows the original order of the code, so a topic can span two files; search for the banner comment.

| File | Holds |
|---|---|
| `01-constants.js` | canvas and screen size, intro video, constants, secret rooms, weapons, bad-guy types, levels, skins, pets, fighting moves and fighting weapons |
| `02-powers-and-town.js` | magic powers, rides, gadgets, hell caves and dig spots, settings, Paradise town data, weather |
| `03-state-and-input.js` | `state`, player, input (keyboard, mouse), readable text, pop-up menus, pause, friends (players 2–4), game controller |
| `04-world-extras.js` | World 2 (Demigod Camp, Olympus, pirates), magic extras, heroes, monsters and bosses, fighting extras, special stuff |
| `05-minigames-and-home.js` | mini-games, home and building, pets and rides, more places, fun extras, controls panel, virtual touch controls |
| `06-places.js` | entity factories, your home, the adventure places (`PLACES`) |
| `07-portals-audio-saving.js` | Heaven, portals, dynamic lists, sound and music, full screen, toasts, awards, saving, born lucky, score |
| `08-blocks-and-helpers.js` | blocks, reachable pickups, keep-clear spots, scenery, digging, block pictures, helpers |
| `09-room-change-player-enemies.js` | `changeRoom()`, player update, enemy update, enemy projectiles, shooting, ammo reload |
| `10-combat-pet-gadgets.js` | projectiles and hits, digging, pet, dance and fart, gadgets and dash, pet races, weather update |
| `11-schools-town-pickups.js` | schools, Paradise town update, pickups, void healing, particles |
| `12-draw-rooms-and-monsters.js` | draw helpers, intro screen, portals, Void, weapon chart, Hell, bad guys, Medusa, the Devil |
| `13-draw-town-and-player.js` | Paradise, room backgrounds, secret rooms, player, projectiles, particles, HUD |
| `14-screens-and-main-loop.js` | rainbow background, level complete, win, awards, shop and controls screens, `loop()`, error reports |

**Adding a file** = create `js/NN-name.js` starting with a `// ── NAME ───` banner and add its `<script>` tag to `index.html` at the right place in the order. `node test/scripts.js` fails if a `js/` file is not loaded or a loaded file is missing. No cache-busting strings or version stamps (there is no build step).

---

## Big picture

`state` holds almost all saved/progress state; `resetGame()` and `advanceLevel()` reset it. There are 48 `ROOM.*` values in three groups:

| Group | Data | Notes |
|---|---|---|
| `void`, `hell`, `paradise`, `underground`, `secret`, `heaven`, `house` | one object each: `voidRoom`, `hell`, `paradise`, `underground`, `secretRoom`, `heaven` (`house` has none: `state.furniture`, `state.garden`) | the original rooms. Void is the hub (shop, awards, race master, weapon chart sign, rocket, Boss Rush gate); Hell has the Devil and dig spots; Paradise has the town, jobs and the day/dusk/night cycle |
| 27 rooms in the `PLACES` table (`ship`, `candy`, `ice`, `haunted`, `sky`, `space`, `arena`, `mall`, `greece`, `maze`, `camp`, `stadium` ...) | `placeState[room]` via `place()` | `make()` builds a fresh state on every entry. Island rooms have `island: true` and a dock back to Paradise. Some are added later with `PLACES.x = ...` |
| 14 rooms in the `SUBPLACES` table (`toyshop`, `museum`, `treehouse`, `moonbase` ...) | `placeState[room]` | small "find N things" rooms entered through a door in a parent room |

`MAIN_ROOMS` are the rooms mystery portals can lead to. `changeRoom(dest)` is the one place that sets up a room on entry.

### Shared systems (search for the banner comments)

- **Enemies** — `ENEMY_TYPES` (name, hp, `weakTo`). `roomEnemies()` lists the current room's bad guys, `spawnList()` returns the real array to push new ones into, `moveEnemy()` / `drawEnemy()` switch on `type`, and `damageEnemy()` handles damage, freezing, chain lightning and loot.
- **Weapons** — `POWER`, `WEAPON_INFO`, `state.powerTier`; `shoot()` auto-aims.
- **Input** — keyboard, mouse (left-click mines, right-click places), touch (`vTouch`, `handleTap()`) and gamepads (`pollGamepad()`, `PAD`) all go through `pressAction()` / `pressStart()`. The main button tries, in order: treasure → dig spot → talk → town action → home action → mine nearby → dig ground → shoot. `shoot()` ends in the Smiting Stick (`WEAPON_INFO.None`) when you have no element or it is reloading. Weapons are still lost on death (`respawnPlayer()`) — this is deliberate, so don't "fix" it; you restart with the stick and dig for a new element. Menus and the shop move with the keyboard (`KEY_NAV`, `digitKey()`), the D-pad and the stick (`stickNavStep()`).
- **Prompts** — never write a key name into text that shows on every device. Use `byInput(keyboard, touch, pad)`, `keyName(keyboard, pad)` or `mainBtn()`; they follow `lastInput`.
- **Touch and screen** — `layoutTouch()` places the buttons again whenever the window changes (48 CSS px minimum, in the side margins on phones). On phones the canvas is wider than 800 and the picture is offset by `view.offX`; `canvasPos()` undoes that, so taps are in logical pixels. `draw()` sets up the transform and calls `drawGame()` (the picture), then `drawVirtualControls()`. Build-mode taps mine/place at the tapped cell, the hotbar can be tapped, menus have a ✕, there is a full-screen button, and an upright phone shows "turn your phone" (`needTurn`).
- **Menus** — `openMenu(title, itemsFn)` for pop-up stores (Forge, crafting, school, hats, sailing, wishes). The Void shop is `drawShop()` / `shopSelect()`.
- **Blocks** — `BLOCKS`, `worldBlocks[room]`, `buildAt()`, `playerHitsBlock()`; mineable scenery (trees, rocks) in `scenery[room]`. `mazeStone` is `unbreakable` (test with `isUnbreakable()`): only the Minotaur maze uses it. `keepClearSpots()` lists doors, stairs, exits, the rocket and so on that blocks may never cover: add a new walk-up spot there. For any randomly placed pickup use `reachablePoint(x, y)`, so it is never inside a block or walled off in the maze.
- **Football** — `startFootball()`: a blue helper, two red defenders and a goalie; the numbers are the `FB_*` constants. Hell moles warn first (a shaking mound), come up far from you and start slowly (`MOLE_*`). Medusa is drawn on the canvas by `drawMedusa()`, not an emoji.
- **Pets** — `PETS`, `pet`, `updatePet()`, `petLevel()`.
- **Player 2** — `p2`, `updateP2()`, `drawP2()`.
- **Audio** — Web Audio synth: `SFX` table, `sfx(name)`, and per-room `SONGS`.
- **Saving** — `SAVE_FIELDS` (the list of `state` keys saved to `localStorage`; it includes `hotbar` and `job`), saved every few seconds and on `pagehide` / when the tab is hidden. New Game asks first (`askNewGame()`). Also `lop_world` (blocks), `lop_awards`, `lop_highscore`, `lop_muted`. Old saves are patched in `startFromIntro()`.
- **Awards** — `AWARDS` list, `giveAward(id)`, `countStat()`. The board (`drawAwards()`) shows `AWARDS_PER_PAGE` big cells at a time; `awardsTurn(±1)` pages it (keys, D-pad/stick, `awardsPrevRect()` / `awardsNextRect()` taps), `setAwardsOpen()` opens it on page 1.

### Main loop

`loop(now)` is a fixed-timestep loop: `stepsOwed(now)` says how many steps are due, so the game runs 60 updates a second whatever the screen rate. Each step is `pollGamepad()` then `update()` (so a button press is seen exactly once); then `draw()` once. `loop()` with no timestamp is exactly one step, which the tests rely on. `update()` freezes while a menu, the shop or the awards are open, while the tab is hidden or unfocused (`paused`), and while a phone is upright; it also waits for the intro and pet races. `drawGame()` paints the background (`drawRoomBackground()`, cached per room in `bgCache`), then blocks, portals, the room, the player, effects, the HUD, and finally overlays (shop, awards, menus, races, end screens).

---

## Adding a new feature — checklist

0. **Where** — put new code in the `js/` file that holds the closest related code (see Files), after the existing code of its section, with its own banner. Don't move code between files just to tidy.
1. **State** — add fields to `state`, reset them in `resetGame()`, and add them to `SAVE_FIELDS` if they should survive a reload.
2. **Update / draw** — add an `update*()` call in `update()` and a `draw*()` call in `draw()` (before `drawHUD()` so the HUD stays on top).
3. **Input** — go through `pressAction()` / `handleTap()` / the keydown and gamepad handlers so every input method works. Show the right key for `lastInput` (`'keyboard' | 'touch' | 'pad'`) with `byInput()` / `mainBtn()`.
4. **New room** — prefer a `PLACES` entry (plus `PORTALS[room]`, a painter in `roomBackground()`, a song and an exit).
5. **Constants** — name magic numbers with `const` near the related section.
6. **Fair to a child** — no enemy within ~120 px of an arrival point (`ENTRY_SAFE_DISTANCE`, `keepMonstersAwayFromArrival()`); warn before anything that hurts; time things in frames (the game runs 60 updates a second only through `stepsOwed()`, never `Date.now()` for gameplay); touch targets at least 48 CSS px; text at least 12 px.
7. **Validate** — `node test/scripts.js`, `node test/regress.js` (add a scenario), a fuzz run, and screenshots on a desktop and a phone-sized window.

---

## Style conventions

- Sections are separated by `// ── SECTION NAME ─────────────` banners.
- Aligned object literals with spaces, 4-space indent, no tabs.
- No external libraries, no `import`/`export`, no TypeScript.
- All coordinates are logical canvas pixels (800×600).
- Comments explain *why* in plain words.
