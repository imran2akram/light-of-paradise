# The Light of Paradise

A single-player (or two-player!) browser action-adventure game by **Goldwinner Games**, built with vanilla JavaScript and the HTML5 Canvas API. Dig for weapons in Hell, survive Monster Nights on Paradise Island, mine and build like Minecraft, sail to far-away islands and fly to space — then beat the Devil to bring the Golden Light back.

**[▶ Play on GitHub Pages](https://imran2akram.github.io/light-of-paradise/)**

---

## How to win

1. **Hell** — hide in the caves (you're safe for 1 minute) and **dig** the dirt piles for weapons.
2. **Paradise Island** — when **Monster Night** comes, beat every monster to open a chest with a **Light Crystal**. Night 2 brings the **Ghost King**, night 3 the **King Slime**.
3. With all **3 Light Crystals**, go back to **Hell** and beat the **Devil**.
4. There are 3 levels; level 3 is the boss level.

Mystery portals take you to a random place: the **Void**, **Hell**, **Paradise Island** or **Heaven**.

## Controls

| | Keyboard / mouse | Controller | Touch |
|---|---|---|---|
| Move | WASD / arrows | Stick / D-pad | Joystick |
| Shoot, dig, talk, mine | Space | A (hold for autofire) | SHOOT / DIG / TALK button |
| Build mode | B or the BUILD button | Left stick click | 🧱 |
| Mine / place a block | Left click / right click | A | Tap BUILD |
| Pick a block | 1-9 or Q (in build mode) | B | 🔄 |
| Gadget | Q | B | ⚙ |
| Dash | Shift | LT | ⚡ |
| Dance / fart | G / F | LB / RB | 💃 / 💨 |
| Shop / awards | E / H (in the Void) | Y / X | tap the buttons |
| Player 2 | P to join; P2 uses arrows + Enter | Start on a 2nd controller | — |
| Sound | M | Back | 🔊 |

The game saves by itself every few seconds. The title screen offers **Continue** or **New Game**.

## Places

| Place | How to get there | What's there |
|---|---|---|
| The Void | start here / portals | heals you, Shop, Awards, pet races, Boss Rush gate, rocket |
| Hell | portals | the Devil, caves, dig spots, lava worms, mini-devils, Shadow You |
| Underground Caves | the secret tunnel at the bottom of one dig spot | dark caves, gems, ores, moles, spiders, the Cave Dragon |
| Paradise Island | portals | town, jobs, houses, crafting table, farm, fishing, Monster Nights |
| Your Home | buy a house in Paradise | furniture, garden, sleeping pets |
| Heaven | portals | angels, 3 wishes, unlimited blocks, stairs to the Sky Castle |
| Secret Golden Room | a rare, almost invisible golden portal | treasure |
| Pirate Ship → Candy Land / Ice Kingdom / Haunted House | Captain Salty at the Paradise pier | pirates, gummy bears, the Frost Giant, a secret door |
| Sky Castle | cloud stairs in Heaven | the Thunder Bird |
| Space | the rocket in the Void | aliens, the Alien Mothership |
| Boss Rush Arena | the gate in the Void | all 6 bosses in a row |

## Weapons, gadgets and pets

- **Weapons** come from digging: Ice ❄, Fire 🔥, Lightning ⚡, Water 💧, then **Super** (3 shots) and rarely **Rainbow** 🌈. Every weapon hurts every monster a little, and its matching monsters a lot (the chart in the Void shows which). Ice freezes, Lightning jumps between monsters.
- **The Blacksmith's Forge**: bigger ammo bag, weapon levels, Super Dash, and gadgets (Boomerang, Bombs, Frog Wand, Tornado).
- **Pets** (Shop): Puppy, Kitten, Owl, Baby Dragon, Penguin, Unicorn and T-Rex. Each has its own power, and they level up to 5.
- **Minecraft-style building**: mine trees, rocks, blocks and the ground; place blocks anywhere; craft planks, bricks, glass, TNT, a diamond pickaxe, a diamond sword and armor at the Crafting Table.
- Coins only come from beating monsters (and from jobs in town).

---

## Running locally

No build step. The whole game is one HTML file.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project structure

```
light-of-paradise/
├── index.html                    # The entire game (HTML + CSS + JS, ~7,500 lines)
├── Light of paradise opening.mp4 # Intro cinematic
├── .github/workflows/deploy.yml  # Unused (see Deployment)
├── README.md
└── AGENTS.md                     # Notes for AI coding assistants
```

All code is in one `<script>` block, split into sections with `// ── SECTION ─` banner comments. `AGENTS.md` describes the main systems.

## Deployment

GitHub Pages is set to **Deploy from a branch: `main`**, so every push to `main` updates the live site. The `deploy.yml` workflow triggers on `master`, which doesn't exist, so it never runs.
