# AGENTS — AI Context for Light of Paradise

This file gives AI coding agents the orientation they need to work on this codebase without re-deriving everything.

---

## What this project is

A browser action-adventure game written in **vanilla JavaScript** using the **HTML5 Canvas 2D API**. No framework, no bundler, no package manager. The entire game ships as one file: `index.html` (~7,500 lines).

It is being designed by a 7-year-old (Goldwinner), so features are frequent, playful and kid-friendly. Keep text on screen short and simple.

Live site: `https://imran2akram.github.io/light-of-paradise/`. GitHub Pages deploys from the `main` branch directly; `.github/workflows/deploy.yml` targets `master` and never runs.

---

## How to run & test

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no test framework. Validate changes by:
1. Syntax check: extract the `<script>` block and run `node --check` on it.
2. Headless simulation: load the script in Node with a stub DOM (a `Proxy` canvas context, a fake `AudioContext`, `localStorage`, `navigator.getGamepads`) and call `update()` / `draw()` in a loop. `node-canvas` (`npm i canvas`) gives real screenshots. Chromium/Playwright may not launch under WSL (missing `libnspr4`).
3. Play it in a browser (desktop, touch and a game controller).

---

## Big picture

`state` holds almost all saved/progress state; `resetGame()` and `advanceLevel()` reset it. Each room has its own data object:

| Room (`ROOM.*`) | Data | Notes |
|---|---|---|
| `void` | `voidRoom` | hub: shop, awards, race master, rocket, Boss Rush gate |
| `hell` | `hell` | Devil, caves, dig spots, `hell.enemies` |
| `paradise` | `paradise` | town (NPCs, jobs, houses), day/dusk/night cycle, `paradise.enemies` + `ambushers` |
| `underground` | `underground` | dark caves, rebuilt every visit |
| `secret` | `secretRoom` | golden treasure room |
| `heaven` | `heaven` | wishes, creative building |
| `house` | — | your home interior (`state.furniture`, `state.garden`) |
| `ship`, `candy`, `ice`, `haunted`, `sky`, `space`, `arena` | `placeState[room]` via `place()` | defined in the `PLACES` table; `make()` builds a fresh state on every entry |

`MAIN_ROOMS` are the rooms mystery portals can lead to. `changeRoom(dest)` is the one place that sets up a room on entry.

### Shared systems (search for the banner comments)

- **Enemies** — `ENEMY_TYPES` (name, hp, `weakTo`). `roomEnemies()` lists the current room's bad guys, `spawnList()` returns the real array to push new ones into, `moveEnemy()` / `drawEnemy()` switch on `type`, and `damageEnemy()` handles damage, freezing, chain lightning and loot.
- **Weapons** — `POWER`, `WEAPON_INFO`, `state.powerTier`; `shoot()` auto-aims.
- **Input** — keyboard, mouse (left-click mines, right-click places), touch (`vTouch`, `handleTap()`) and gamepads (`pollGamepad()`, `PAD`) all go through `pressAction()` / `pressStart()`. The main button tries, in order: treasure → dig spot → talk → town action → home action → mine nearby → dig ground → shoot.
- **Menus** — `openMenu(title, itemsFn)` for pop-up stores (Forge, crafting, school, hats, sailing, wishes). The Void shop is `drawShop()` / `shopSelect()`.
- **Blocks** — `BLOCKS`, `worldBlocks[room]`, `buildAt()`, `playerHitsBlock()`; mineable scenery (trees, rocks) in `scenery[room]`.
- **Pets** — `PETS`, `pet`, `updatePet()`, `petLevel()`.
- **Player 2** — `p2`, `updateP2()`, `drawP2()`.
- **Audio** — Web Audio synth: `SFX` table, `sfx(name)`, and per-room `SONGS`.
- **Saving** — `SAVE_FIELDS` (the list of `state` keys saved to `localStorage`), plus `lop_world` (blocks), `lop_awards`, `lop_highscore`, `lop_muted`. Old saves are patched in `startFromIntro()`.
- **Awards** — `AWARDS` list, `giveAward(id)`, `countStat()`.

### Main loop

`loop()` → `pollGamepad()`, `update()`, `draw()`. `update()` pauses for the intro and for pet races. `draw()` paints the background (`drawRoomBackground()`, cached per room in `bgCache`), then blocks, portals, the room, the player, effects, the HUD, and finally overlays (shop, awards, menus, races, end screens).

---

## Adding a new feature — checklist

1. **State** — add fields to `state`, reset them in `resetGame()`, and add them to `SAVE_FIELDS` if they should survive a reload.
2. **Update / draw** — add an `update*()` call in `update()` and a `draw*()` call in `draw()` (before `drawHUD()` so the HUD stays on top).
3. **Input** — go through `pressAction()` / `handleTap()` / the keydown and gamepad handlers so every input method works. Show the right key for `lastInput` (`'keyboard' | 'touch' | 'pad'`).
4. **New room** — prefer a `PLACES` entry (plus `PORTALS[room]`, a painter in `roomBackground()`, a song and an exit).
5. **Constants** — name magic numbers with `const` near the related section.
6. **Validate** — `node --check`, a simulation run, and screenshots.

---

## Style conventions

- Sections are separated by `// ── SECTION NAME ─────────────` banners.
- Aligned object literals with spaces, 4-space indent, no tabs.
- No external libraries, no `import`/`export`, no TypeScript.
- All coordinates are logical canvas pixels (800×600).
- Comments explain *why* in plain words (the owner is a kid and a parent).
