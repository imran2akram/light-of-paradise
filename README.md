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
| Shoot, dig, talk, mine (hold for a charge shot) | Space | A or RT | the big button (SHOOT / DIG / TALK) |
| Punch (hold to swing) / block | J / X | RB / LB | 👊 / 🛡 |
| Jump | C | Y | 🦘 |
| Build mode | B or the BUILD button | Left stick click | 🧱 (⚔ to leave) |
| Mine / place a block | Left click / right click, or Space | A | tap the ground |
| Pick a block | 1-9 or Q (in build mode) | B | tap the block bar, or 🔄 |
| Gadget | Q | B | the gadget button |
| Spell / god power / ride | R / T / V | X / View + A / right stick click | the spell, god and ride buttons |
| Dash | Shift | LT | ⚡ |
| Dance / fart | G / F | View + X / View + B | 💃 / 💨 |
| Burp / sneeze | U / I | View + RB / View + LT | 🫢 / 🤧 (one button, takes turns) |
| Shop / awards (in the Void) | E / H | Y / X | tap the SHOP and AWARDS buttons |
| Weapon chart (in the Void) | walk up to the sign, then Space | A | the big button |
| Close a menu | E, O or Escape | B | ✕ |
| Settings | O | Start | ⚙ |
| Sound | M | tap View | 🔊 |
| Player 2 | P to join (P2 uses arrows + Enter; P1 keeps WASD) | hold any button on a new controller for 1 s; hold Start for 2 s to leave | — |

View is the small button left of Start. Hold it and press another button for the extra moves above.

The game saves by itself every few seconds and when you close the tab. The title screen offers **Continue** or **New Game** (which asks first). On a phone, hold it sideways; there is a full-screen button on the title screen.

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

- **Weapons** come from digging: Ice ❄, Fire 🔥, Lightning ⚡, Water 💧, then **Super** (3 shots) and rarely **Rainbow** 🌈. Every weapon hurts every monster a little, and its matching monsters a lot (the Weapon chart sign in the Void shows which). Ice freezes, Lightning jumps between monsters.
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
├── index.html                    # The entire game (HTML + CSS + JS, ~13,000 lines)
├── Light of paradise opening.mp4 # Intro cinematic
├── test/                         # Headless tests: regress.js, fuzz.js, reporter.js, worker.js (+ headless.js, a fake browser)
├── worker/                       # Cloudflare Worker that collects error reports from players' screens
├── .github/workflows/test.yml    # Runs the tests on every pull request and push to main
├── README.md
└── AGENTS.md                     # Notes for AI coding assistants
```

All code is in one `<script>` block, split into sections with `// ── SECTION ─` banner comments. `AGENTS.md` describes the main systems.

## Deployment

GitHub Pages is set to **Deploy from a branch: `main`**, so every push to `main` updates the live site. There is no deploy workflow. `test.yml` only checks the game: run the same checks yourself with `node test/regress.js` and `node test/fuzz.js --seed 1`.
