// ── POP-UP MENUS (the Blacksmith's Forge, and other town shops) ──
// A menu is a title plus a function that returns the items, so prices and ticks are always up to date.
// Each item: { icon, name, desc, cost?, status?, action() }
let menu = null;   // { title, items, cursor }
const MENU = { X: 130, Y: 70, W: 540, H: 430 };
// Item boxes: two columns; with more than MENU_TALL_AFTER items the rows are squeezed so they all fit
const MENU_ITEM = { PAD: 14, COL: 262, TOP: 56, W: 250, ROW: 68, H: 62, ROW_SQUEEZED: 58, H_SQUEEZED: 54 };
const MENU_TALL_AFTER = 10;
const WEAPON_CHART_H = 470;   // a tall panel: the long monster lists wrap onto 3-4 lines each
const MENU_CLOSE = { x: MENU.X + MENU.W - 26, y: MENU.Y + 20, r: 17, hitR: 36 };   // the ✕ (the tap area stays above the first row of items)

// A "wide" menu is a list of full-width rows whose descriptions wrap onto several lines (the weapon chart)
const MENU_WIDE = { PAD: 14, TOP: 56, GAP: 4, HEAD: 22, LINE: 14, BOTTOM: 8, TEXT_X: 54, MAX_LINES: 5 };
function wideDescLines(it) {
    ctx.save(); ctx.font = '12px Arial';
    const lines = wrapText(it.desc, MENU.W - 2 * MENU_WIDE.PAD - MENU_WIDE.TEXT_X - 14, MENU_WIDE.MAX_LINES);
    ctx.restore();
    return lines;
}

// opts (optional): hint = the small line under the title, h = a shorter panel for menus with only a few items,
// wide = full-width rows (see MENU_WIDE)
function openMenu(title, items, opts = {}) { menu = { title, items, cursor: 0, hint: opts.hint, h: opts.h || MENU.H, wide: !!opts.wide }; }
function menuItemRect(i) {
    if (menu && menu.wide) {
        const W = MENU_WIDE, list = menu.items();
        let y = MENU.Y + W.TOP;
        for (let k = 0; k < i; k++) y += W.HEAD + wideDescLines(list[k]).length * W.LINE + W.BOTTOM + W.GAP;
        return { x: MENU.X + W.PAD, y, w: MENU.W - 2 * W.PAD, h: W.HEAD + wideDescLines(list[i]).length * W.LINE + W.BOTTOM };
    }
    const col = i % 2, row = Math.floor(i / 2);
    const I = MENU_ITEM, tall = menu && menu.items().length > MENU_TALL_AFTER;   // squeeze rows when there's a lot to show
    return { x: MENU.X + I.PAD + col * I.COL, y: MENU.Y + I.TOP + row * (tall ? I.ROW_SQUEEZED : I.ROW), w: I.W, h: tall ? I.H_SQUEEZED : I.H };
}
function menuSelect(i) {
    const list = menu.items();
    if (!list[i]) return;
    menu.cursor = i;
    list[i].action();
}
function moveMenuCursor(dx, dy) {
    const n = menu.items().length;
    menu.cursor = Math.max(0, Math.min(n - 1, menu.cursor + dx + dy * 2));
}

// Buy something from a menu: returns true if you had enough coins
function spend(cost) {
    if (settings.creative) { sfx('buy'); return true; }   // everything is free in Creative Mode
    if (state.coins < cost) { showToast(`Not enough coins — you need 🪙${cost}`, '#FF8888', 120); sfx('hurt'); return false; }
    state.coins -= cost;
    sfx('buy');
    return true;
}

// The win / level-complete screens ignore buttons for their first second, so a kid mashing the attack
// button when the last monster falls doesn't skip straight past the screen (or restart the game)
const END_SCREEN_DELAY = 60;   // steps
let endScreenFrames = 0;
function endScreenReady() { return endScreenFrames >= END_SCREEN_DELAY; }

// ── SETTINGS (⚙ button / O / Start) ───────────────────────────
// Creative Mode is like Minecraft creative: nothing attacks you, everything is free,
// unlimited blocks everywhere, one-hit mining and you can walk through blocks.
let settings = { creative: false, difficulty: 'normal', music: true, sfx: true, upsideDown: false,
                 playerSpeed: 'normal', monsterSpeed: 'normal', dayLength: 'normal', caveTime: 'normal',
                 damageNumbers: true, hints: true, mods: {} };
try { settings = Object.assign(settings, JSON.parse(localStorage.getItem('lop_settings')) || {}); } catch (e) {}
settings.mods = settings.mods || {};
if (settings.upsideDown) settings.mods.upsideDown = true;   // (upside-down moved into the Mods list)
const mod = name => !!settings.mods[name];

// 🧩 MODS: fun switches that change how the game works
const MODS = [
    { id: 'bigHead',      icon: '🗿', name: 'Big Heads',        desc: 'Everyone has a HUGE head' },
    { id: 'tinyMonsters', icon: '🐜', name: 'Tiny Monsters',    desc: 'All the monsters are teeny' },
    { id: 'superSpeed',   icon: '⚡', name: 'Super Speed',      desc: 'You run twice as fast' },
    { id: 'chickens',     icon: '🐔', name: 'Chicken Monsters', desc: 'Every monster is a chicken!' },
    { id: 'doubleCoins',  icon: '🪙', name: 'Double Coins',     desc: 'Monsters drop twice the coins' },
    { id: 'disco',        icon: '🪩', name: 'Disco Party',      desc: 'Flashing party lights everywhere' },
    { id: 'rainbow',      icon: '🌈', name: 'Rainbow Mode',     desc: 'Everything goes rainbow' },
    { id: 'oneHit',       icon: '💥', name: 'One-Hit Wonder',   desc: 'Monsters fall in 1 hit (not bosses)' },
    { id: 'lowGravity',   icon: '🎈', name: 'Low Gravity',      desc: 'Floaty, slidey moving everywhere' },
    { id: 'mirror',       icon: '🪞', name: 'Mirror World',     desc: 'Left and right swap sides' },
    { id: 'upsideDown',   icon: '🙃', name: 'Upside Down',      desc: 'The whole game flips over' },
    { id: 'cheese',       icon: '🧀', name: 'Cheese World',     desc: 'Every monster and coin is CHEESE' },
    { id: 'monsterHats',  icon: '🎩', name: 'Monster Hats',     desc: 'Monsters wear funny hats' },
    { id: 'pirateTalk',   icon: '🏴‍☠️', name: 'Pirate Town',      desc: 'Everyone in town talks like a pirate, arr!' },
    { id: 'halloween',    icon: '🎃', name: 'Halloween',        desc: 'Pumpkins and spooky fun (on by itself in October)' },
    { id: 'christmas',    icon: '🎄', name: 'Christmas',        desc: 'Snow, a tree and presents (on by itself in December)' },
];

function modItems(page = 0) {
    const items = MODS.slice(page * 10, page * 10 + 10).map(m => ({ icon: m.icon, name: m.name, desc: m.desc, cost: 0, status: mod(m.id) ? 'ON ✓' : 'OFF',
        action: () => { settings.mods[m.id] = !mod(m.id); applyUpsideDown(); saveSettings(); if (mod(m.id)) giveAward('modder'); } }));
    if (MODS.length > page * 10 + 10) items.push({ icon: '➡', name: 'More mods', desc: 'Even sillier!', cost: 0, status: 'NEXT', action: () => openMenu('🧩 MORE MODS', () => modItems(page + 1)) });
    return items;
}

// Speeds and times picked in Settings
function dayFrames()  { return { short: 900, normal: 1800, long: 3600 }[settings.dayLength] || 1800; }
function caveMax()    { return { short: 1800, normal: 3600, long: 7200 }[settings.caveTime] || 3600; }
function playerSpeedFactor() { return ({ slow: 0.75, normal: 1, fast: 1.35 }[settings.playerSpeed] || 1) * (mod('superSpeed') ? 2 : 1); }
const SETTINGS_BTN = { x: 26, y: 534, r: 16 };

// ── FULL SCREEN ───────────────────────────────────────────────
// Hides the browser bars on a phone. Not every browser can (iPhone Safari can't): then there is no button.
const FULLSCREEN_BTN = { x: 616, y: 12, w: 172, h: 40 };   // on the title screen
function fullscreenRoot() { return document.documentElement; }
function fullscreenOK() {
    const el = fullscreenRoot();
    return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
}
function inFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
    try {
        if (inFullscreen()) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            const el = fullscreenRoot(), go = el.requestFullscreen || el.webkitRequestFullscreen;
            const done = go.call(el);
            // Android can also keep the phone sideways while the game is full screen
            if (done && done.then) done.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
        }
    } catch (e) { /* a browser that says no: nothing happens */ }
}

// ── SETTINGS MENU ──────────────────────────────────────────
function saveSettings() { try { localStorage.setItem('lop_settings', JSON.stringify(settings)); } catch (e) {} }

function setCreative(on) {
    if (on === settings.creative) return;
    settings.creative = on;
    if (on) { state.coinsBackup = state.coins; }                                   // put your real coins safely aside
    else    { state.coins = state.coinsBackup || 0; state.coinsBackup = undefined; }   // …and give them back
    saveSettings();
    showToast(on ? '🎮 CREATIVE MODE — nothing attacks you and everything is free!' : '⚔ SURVIVAL MODE — watch out, monsters are back!', '#FFE066', 220);
}

function applyUpsideDown() {
    canvas.style.transform = [mod('upsideDown') ? 'rotate(180deg)' : '', mod('mirror') ? 'scaleX(-1)' : ''].join(' ').trim();
}
applyUpsideDown();

function settingsItems() {
    const cycle = (key, order) => () => { settings[key] = order[(order.indexOf(settings[key]) + 1) % order.length]; saveSettings(); };
    const onOff = key => () => { settings[key] = !settings[key]; saveSettings(); };
    const speedName = { slow: 'SLOW', normal: 'NORMAL', fast: 'FAST' };
    return [
        { icon: '🎮', name: 'Game Mode', desc: 'Creative: free stuff, no monsters attack', cost: 0, status: settings.creative ? 'CREATIVE' : 'SURVIVAL',
          action: () => setCreative(!settings.creative) },
        { icon: '😊', name: 'Difficulty', desc: 'Easy +2 hearts · Hard 1 less', cost: 0, status: settings.difficulty.toUpperCase(),
          action: () => { cycle('difficulty', ['easy', 'normal', 'hard'])(); state.playerHp = Math.min(state.playerHp, fullHearts()); } },
        { icon: '🏃', name: 'Your Speed', desc: 'How fast you move', cost: 0, status: speedName[settings.playerSpeed], action: cycle('playerSpeed', ['slow', 'normal', 'fast']) },
        { icon: '👾', name: 'Monster Speed', desc: 'How fast monsters move', cost: 0, status: speedName[settings.monsterSpeed], action: cycle('monsterSpeed', ['slow', 'normal', 'fast']) },
        { icon: '☀', name: 'Day Length', desc: 'Paradise day before night falls', cost: 0, status: { short: '15 s', normal: '30 s', long: '1 min' }[settings.dayLength],
          action: cycle('dayLength', ['short', 'normal', 'long']) },
        { icon: '🕳', name: 'Cave Hiding Time', desc: 'How long caves keep you safe', cost: 0, status: { short: '30 s', normal: '1 min', long: '2 min' }[settings.caveTime],
          action: cycle('caveTime', ['short', 'normal', 'long']) },
        { icon: '🎵', name: 'Music', desc: 'The songs in every place', cost: 0, status: settings.music ? 'ON' : 'OFF', action: onOff('music') },
        { icon: '🔊', name: 'Sound Effects', desc: 'Pew pew, boing, quack…', cost: 0, status: settings.sfx ? 'ON' : 'OFF', action: onOff('sfx') },
        { icon: '🔢', name: 'Damage Numbers', desc: 'Show "-3 SUPER HIT!" numbers', cost: 0, status: settings.damageNumbers ? 'ON' : 'OFF', action: onOff('damageNumbers') },
        { icon: '💬', name: 'Control Hints', desc: 'The help text at the bottom', cost: 0, status: settings.hints ? 'ON' : 'OFF', action: onOff('hints') },
        { icon: '🧩', name: 'MODS', desc: 'Big heads, chickens, disco…', cost: 0, status: `${MODS.filter(m => mod(m.id)).length} ON`,
          action: () => openMenu('🧩 MODS — change how the game works!', modItems) },
        { icon: '💾', name: 'Save Now', desc: 'The game also saves by itself', cost: 0, status: 'SAVE',
          action: () => { saveGame(); saveWorld(); showToast('💾 Saved!', '#88EEFF', 90); } },
        ...(fullscreenOK() ? [{ icon: '⛶', name: 'Full Screen', desc: 'Hide the browser bars', cost: 0, status: inFullscreen() ? 'ON' : 'OFF', action: toggleFullscreen }] : []),
    ];
}

const SETTINGS_MENU_H = 470;   // taller than a normal menu: 13 items, in rows of two
function openSettings() {
    if (state.gamePhase !== 'playing') return;
    if (menu) { menu = null; return; }
    openMenu('⚙ SETTINGS', settingsItems, { h: SETTINGS_MENU_H });
}

// ── SCHOOLS: the Teacher lets you pick one. Hogwarts only lets you in if you're lucky! ──
const HOGWARTS_LETTER_COST   = 10;
const HOGWARTS_LETTER_CHANCE = 0.1;    // only 1 in 10 tries an owl brings your letter
function schoolItems() {
    return [
        { icon: '🏫', name: 'Town School', desc: 'Learn handy lessons', cost: 0, status: null,
          action: () => openMenu('🏫 SCHOOL — learn something new!', lessonItems) },
        { icon: '🏰', name: 'Hogwarts', desc: state.hogwarts ? 'Learn magic spells!' : 'Only if an owl brings your letter…',
          cost: state.hogwarts ? 0 : HOGWARTS_LETTER_COST, status: state.hogwarts ? 'YOU GO HERE' : null,
          action: () => {
              if (state.hogwarts) { openMenu('🏰 HOGWARTS', hogwartsItems); return; }
              if (!spend(HOGWARTS_LETTER_COST)) return;
              if (Math.random() >= HOGWARTS_LETTER_CHANCE) { showToast('🦉 No letter this time… the owl got lost! Try again!', '#CCBBFF', 180); return; }
              state.hogwarts = true; giveAward('hogwarts'); sfx('found');
              spawnParticles(player.x, player.y, '#FFD700', 30);
              showToast('🦉📜 A LETTER! You got into HOGWARTS! You are a WIZARD!', '#FFD700', 260);
              openMenu('🏰 HOGWARTS', hogwartsItems);
          } },
    ];
}
const HOUSES = [
    { id: 'gryffindor', icon: '🦁', name: 'Gryffindor', color: '#E0503A', bonus: 'Brave: stronger weapons', give: () => { state.weaponLevel++; } },
    { id: 'slytherin',  icon: '🐍', name: 'Slytherin',  color: '#3ABF6A', bonus: 'Sneaky: run faster',      give: () => {} },
    { id: 'ravenclaw',  icon: '🦅', name: 'Ravenclaw',  color: '#4A90E0', bonus: 'Clever: spells recharge faster', give: () => {} },
    { id: 'hufflepuff', icon: '🦡', name: 'Hufflepuff', color: '#F0C030', bonus: 'Kind: healing + a Shield Bubble', give: () => { state.lessons.healing = true; state.bubble = true; } },
];
function houseInfo() { return HOUSES.find(h => h.id === state.house); }
function sortingHat() {
    const h = HOUSES[Math.floor(Math.random() * HOUSES.length)];
    state.house = h.id; h.give(); giveAward('sorted'); sfx('found');
    spawnParticles(player.x, player.y, h.color, 30);
    showToast(`🎩 Hmm… let me see… ${h.icon} ${h.name.toUpperCase()}! (${h.bonus})`, h.color, 300);
}
function hogwartsItems() {
    const h = houseInfo();
    return [
        { icon: '🎩', name: 'The Sorting Hat', desc: h ? `${h.icon} ${h.name}: ${h.bonus}` : 'Which house will you be in?', cost: 0,
          status: h ? h.name.toUpperCase() : 'TRY IT ON!', action: () => { if (!h) sortingHat(); } },
        { icon: '🪄', name: 'Spell Class',   desc: 'Learn magic spells',        cost: 0, status: null, action: () => openMenu('🪄 SPELL CLASS', spellClassItems) },
        { icon: '🧪', name: 'Potion Class',  desc: 'Mix potions from blocks',   cost: 0, status: null, action: () => openMenu('🧪 POTION CLASS', potionItems) },
        { icon: '🧹', name: 'Broomstick',    desc: 'Fly over everything!',      cost: 40,
          status: state.mount === 'broom' ? 'RIDING' : state.mounts.broom ? 'OWNED — ride' : null,
          action: () => {
              if (!state.mounts.broom && !spend(40)) return;
              state.mounts.broom = true; state.mount = 'broom'; state.lastMount = 'broom'; menu = null;
              showToast('🧹 Up you go! Fly over walls and lava!', '#CCAAFF', 180);
          } },
        { icon: '🏁', name: 'Broomstick Race', desc: 'Fly through all the rings!', cost: 0, status: 'GO!',
          action: () => { menu = null; if (state.mounts.broom) { state.mount = 'broom'; state.lastMount = 'broom'; } startRingRace(); } },
        { icon: '⚔', name: 'Wizard Duel',   desc: 'Fight the Evil Wizard!',    cost: 0, status: 'DUEL!', action: () => { menu = null; startWizardDuel(); } },
        { icon: '🪄', name: 'Wand Shop',     desc: wandInfo().id === 'oak' ? 'Pick a magic wand' : `Your wand: ${wandInfo().name}`, cost: 0, status: null, action: () => openMenu('🪄 THE WAND SHOP', wandItems) },
        { icon: '🐣', name: 'Magic Creatures', desc: state.creature ? `Look after your ${creatureInfo().name}` : 'Adopt a magic creature', cost: 0, status: null, action: () => openMenu('🐣 MAGIC CREATURES', creatureItems) },
        { icon: '🟡', name: 'Catch the Snitch', desc: 'Catch the speedy golden ball!', cost: 0, status: 'GO!', action: () => { menu = null; startSnitch(); } },
        { icon: '♟', name: 'Wizard Chess',  desc: 'Giant chess pieces come alive!', cost: 0, status: 'PLAY!', action: () => { menu = null; changeRoom(ROOM.CHESS); showToast('♟ WIZARD CHESS! Beat every piece — the Queen is the boss!', '#FFE066', 220); } },
        { icon: '📚', name: 'Haunted Library', desc: 'Flying books… and a secret spell book', cost: 0, status: 'ENTER', action: () => { menu = null; changeRoom(ROOM.LIBRARY); showToast('📚 Shhh… the books are ALIVE!', '#CCAAFF', 200); } },
    ];
}
function startWizardDuel() {
    const list = state.room === ROOM.PARADISE ? paradise.ambushers : spawnList();
    const w = e0('wizard', Math.min(740, player.x + 220), Math.max(120, player.y - 80), { r: 26, coinDrop: 30, teleTimer: 150, spellTimer: 100, emerge: 0 });
    w.hp = w.maxHp = 20;
    list.push(w);
    showToast(`⚔ WIZARD DUEL! Use your spells! (${byInput('R', '✨', 'X')})`, '#CC99FF', 200); sfx('laugh');
}

// 🧪 Potions: mix blocks you've mined
const POTIONS = [
    { icon: '👻', name: 'Invisibility', need: { glass: 3, leaves: 2 }, desc: 'Monsters can\'t hurt you', drink: () => { state.invisible = 600; } },
    { icon: '🦍', name: 'Giant Potion', need: { stone: 4, log: 2 },    desc: 'Grow HUGE and stomp',     drink: () => { state.giant = 900; state.tiny = 0; } },
    { icon: '🐜', name: 'Tiny Potion',  need: { leaves: 3, dirt: 2 },  desc: 'Shrink and run super fast', drink: () => { state.tiny = 900; state.giant = 0; } },
    { icon: '❤', name: 'Healing',      need: { leaves: 2, glass: 1 }, desc: 'All your hearts back',    drink: () => { state.playerHp = fullHearts(); } },
    { icon: '⚡', name: 'Speed Potion', need: { planks: 2, dirt: 3 },  desc: 'Zoom for 10 seconds',     drink: () => { godSpeedTimer = 600; } },
];
function potionItems() {
    const has = need => settings.creative || Object.entries(need).every(([k, v]) => invCount(k) >= v);
    const needText = need => Object.entries(need).map(([k, v]) => `${v} ${BLOCKS[k].name}`).join(' + ');
    return POTIONS.map(p => ({
        icon: p.icon, name: p.name, desc: `${p.desc} · ${needText(p.need)}`, cost: 0, status: has(p.need) ? 'MIX IT!' : null,
        action: () => {
            if (!has(p.need)) { showToast(`🧪 You need ${needText(p.need)} (mine some!)`, '#FFAA88', 150); sfx('hurt'); return; }
            if (!settings.creative) for (const [k, v] of Object.entries(p.need)) state.inv[k] -= v;
            p.drink(); menu = null; giveAward('potion'); sfx('magic');
            spawnParticles(player.x, player.y, '#AA66FF', 20);
            showToast(`${p.icon} Gulp! ${p.name}!`, '#CC99FF', 150);
        },
    }));
}

function spellClassItems() {
    return SPELLS.filter(sp => sp.school).map(sp => ({
        icon: sp.icon, name: sp.name, desc: sp.desc, cost: sp.cost,
        status: state.spell === sp.id ? 'HOLDING' : state.spells[sp.id] ? 'LEARNED — pick' : null,
        action: () => {
            if (state.spells[sp.id]) { state.spell = sp.id; return; }
            if (spend(sp.cost)) { state.spells[sp.id] = true; state.spell = sp.id; showToast(`${sp.icon} You learned ${sp.name}! Cast it with ${byInput('R', '✨', 'X')}`); giveAward('wizard'); }
        },
    }));
}

function lessonItems() {
    return LESSONS.map(l => ({
        icon: l.icon, name: l.name, desc: l.desc, cost: l.cost, status: state.lessons[l.id] ? 'LEARNED' : null,
        action: () => {
            if (state.lessons[l.id]) return;
            if (spend(l.cost)) { state.lessons[l.id] = true; showToast(`🎓 You learned ${l.name}!`); giveAward('student'); }
        },
    }));
}

function hatItems() {
    return [
        ...HATS.map(h => ({
            icon: h.icon, name: h.name, desc: state.hat === h.id ? 'You are wearing it!' : 'Looks great on you', cost: h.cost,
            status: state.hat === h.id ? 'WEARING' : state.hats[h.id] ? 'OWNED — wear' : null,
            action: () => {
                if (state.hats[h.id]) { state.hat = state.hat === h.id ? null : h.id; return; }
                if (spend(h.cost)) { state.hats[h.id] = true; state.hat = h.id; showToast(`${h.icon} Looking good in your ${h.name}!`); giveAward('hat'); }
            },
        })),
        { icon: '🐾', name: 'Pet Costumes', desc: 'Dress up your pet!', cost: 0, status: 'LOOK →', action: () => openMenu('🐾 PET COSTUMES', petCostumeItems) },
        { icon: '🦸', name: 'Super Hero Suit', desc: 'A cape! Fly over walls and run faster', cost: 100,
          status: state.heroSuit === 'on' ? 'WEARING' : state.heroSuit ? 'OWNED — wear' : null,
          action: () => {
              if (state.heroSuit) { state.heroSuit = state.heroSuit === 'on' ? 'off' : 'on'; return; }
              if (spend(100)) { state.heroSuit = 'on'; giveAward('superhero'); showToast('🦸 SUPER HERO! You can fly over walls now!', '#FF4444', 200); }
          } },
    ];
}
const PET_COSTUMES = [
    { id: 'tophat',  icon: '🎩', name: 'Top Hat',     cost: 10 },
    { id: 'crown',   icon: '👑', name: 'Tiny Crown',  cost: 25 },
    { id: 'bow',     icon: '🎀', name: 'Pink Bow',    cost: 8  },
    { id: 'shades',  icon: '🕶', name: 'Cool Shades', cost: 12 },
    { id: 'party',   icon: '🥳', name: 'Party Face',  cost: 10 },
    { id: 'wizard',  icon: '🧙', name: 'Wizard Look', cost: 20 },
];
function petCostumeItems() {
    return [{ icon: '❌', name: 'No costume', desc: 'Just your pet', cost: 0, status: state.petCostume ? null : 'WEARING', action: () => { state.petCostume = null; } },
        ...PET_COSTUMES.map(c => ({ icon: c.icon, name: c.name, desc: 'Your pet will look AMAZING', cost: c.cost,
            status: state.petCostume === c.id ? 'WEARING' : state.petCostumes[c.id] ? 'OWNED — wear' : null,
            action: () => {
                if (state.petCostumes[c.id]) { state.petCostume = c.id; return; }
                if (spend(c.cost)) { state.petCostumes[c.id] = true; state.petCostume = c.id; giveAward('petCostume'); showToast(`${c.icon} Your pet looks so cute!`, '#FFE066', 150); }
            } }))];
}

// Crafting recipes: turn what you've mined into new things
function craftItems() {
    const has = (need) => settings.creative || Object.entries(need).every(([k, v]) => invCount(k) >= v);
    const take = (need) => { if (!settings.creative) for (const [k, v] of Object.entries(need)) state.inv[k] -= v; };
    const needText = (need) => Object.entries(need).map(([k, v]) => `${v} ${MATERIALS[k] || BLOCKS[k].name}`).join(' + ');
    const recipe = (icon, name, need, give, doneIf, extraDesc) => ({
        icon, name, desc: `${needText(need)}${extraDesc ? ' — ' + extraDesc : ''}`,
        cost: 0, status: doneIf && doneIf() ? 'DONE' : has(need) ? 'CRAFT!' : null,
        action: () => {
            if (doneIf && doneIf()) return;
            if (!has(need)) { showToast(`You need ${needText(need)}`, '#FF9988', 120); sfx('hurt'); return; }
            take(need); give(); sfx('found');
            giveAward('crafter');
        },
    });
    const add = (k, n) => () => { state.inv[k] = invCount(k) + n; showToast(`⚒ Crafted ${n} ${BLOCKS[k].name}!`); };
    return [
        recipe('🪵', '4 Planks', { log: 1 }, add('planks', 4)),
        recipe('🧱', '4 Bricks', { stone: 2 }, add('brick', 4)),
        recipe('🪟', '2 Glass', { stone: 1, leaves: 1 }, add('glass', 2)),
        recipe('💥', '2 TNT', { stone: 2, log: 1 }, add('tnt', 2)),
        recipe('⛏', 'Diamond Pickaxe', { diamond: 3, log: 2 }, () => { state.diamondPickaxe = true; showToast('⛏ DIAMOND PICKAXE — mine anything in one hit!'); },
               () => state.diamondPickaxe, 'mine in 1 hit'),
        recipe('🗡', 'Diamond Sword', { diamond: 2, log: 1 }, () => { state.weaponLevel = Math.min(3, state.weaponLevel + 1); showToast(`🗡 Weapon Level ${state.weaponLevel}!`); },
               () => state.weaponLevel >= 3, '+1 weapon level'),
        recipe('🛡', 'Iron Armor', { iron: 5 }, () => { state.armor = Math.max(state.armor, 1); state.playerHp++; showToast('🛡 IRON ARMOR — +1 heart!'); },
               () => state.armor >= 1, '+1 heart'),
        recipe('💠', 'Diamond Armor', { diamond: 5 }, () => { const was = state.armor; state.armor = 2; state.playerHp += 2 - was; showToast('💠 DIAMOND ARMOR — +2 hearts!'); },
               () => state.armor >= 2, '+2 hearts'),
        recipe('🟫', 'Blocky Outfit', { planks: 3, dirt: 2 }, () => { state.unlockedSkins[8] = true; state.activeSkin = 8; showToast('🟫 You look BLOCKY now!'); },
               () => state.unlockedSkins[8], 'a Minecraft look'),
    ];
}

// What the Blacksmith sells
function forgeItems() {
    const items = [];
    const ammoCost = AMMO_UPGRADE_COST[state.ammoBonus];
    items.push({ icon: '🎒', name: 'Bigger Ammo Bag', desc: `+1 ammo (you carry ${state.ammoMax})`, cost: ammoCost,
                 status: ammoCost === undefined ? 'MAXED' : null,
                 action: () => { if (ammoCost !== undefined && spend(ammoCost)) { state.ammoBonus++; state.ammoMax++; state.ammo = state.ammoMax; showToast(`CLANG! You carry ${state.ammoMax} ammo now!`); } } });
    const lvCost = WEAPON_LEVEL_COST[state.weaponLevel];
    items.push({ icon: '⚔', name: `Weapon Level ${Math.min(3, state.weaponLevel + 1)}`, desc: `Every shot hits harder (now Lv ${state.weaponLevel})`, cost: lvCost,
                 status: lvCost === undefined ? 'MAXED' : null,
                 action: () => { if (lvCost !== undefined && spend(lvCost)) { state.weaponLevel++; showToast(`⚔ WEAPON LEVEL ${state.weaponLevel}!`); } } });
    items.push({ icon: '🟨', name: 'Gold Armor', desc: '+1 heart', cost: 30, status: state.armor >= 1 ? 'OWNED' : null,
                 action: () => { if (state.armor < 1 && spend(30)) { state.armor = 1; state.playerHp++; showToast('🟨 GOLD ARMOR — +1 heart!'); } } });
    items.push({ icon: '🌈', name: 'Rainbow Armor', desc: '+4 hearts — the best armor!', cost: 150, status: state.armor >= 4 ? 'OWNED' : null,
                 action: () => { if (state.armor < 4 && spend(150)) { const was = state.armor; state.armor = 4; state.playerHp += 4 - was; showToast('🌈 RAINBOW ARMOR — +4 hearts!'); } } });
    items.push({ icon: '🎾', name: 'Bouncy Shots', desc: 'Your shots bounce off the walls', cost: 20, status: state.bouncy ? 'OWNED' : null,
                 action: () => { if (!state.bouncy && spend(20)) { state.bouncy = true; showToast('🎾 Boing! Your shots bounce now!'); } } });
    items.push({ icon: '💨', name: 'Super Dash', desc: 'Zoom super fast (Shift / LT)', cost: DASH_COST,
                 status: state.hasDash ? 'OWNED' : null,
                 action: () => { if (!state.hasDash && spend(DASH_COST)) { state.hasDash = true; showToast('💨 You can DASH now!'); } } });
    items.push({ icon: '🗡', name: 'Fighting Weapons →', desc: 'Sword, hammer, nunchucks, spear, whip', cost: 0,
                 status: state.melee ? MELEE_WEAPONS.find(m => m.id === state.melee).name.toUpperCase() : 'LOOK →',
                 action: () => openMenu("🗡 THE BLACKSMITH'S WEAPONS", meleeItems) });
    items.push({ icon: '🏹', name: 'Gadgets & Toys →', desc: 'Bombs, bows, water guns, banana peels…', cost: 0,
                 status: state.gadget ? GADGETS.find(g => g.id === state.gadget).name.toUpperCase() : 'LOOK →',
                 action: () => openMenu('🏹 GADGETS & TOYS', gadgetItems) });
    return items;
}

const GADGETS_PER_PAGE = 10;
function gadgetItems(page = 0) {
    const items = GADGETS.slice(page * GADGETS_PER_PAGE, (page + 1) * GADGETS_PER_PAGE).map(g => {
        const owned = state.ownedGadgets[g.id];
        return { icon: g.icon, name: g.name, desc: g.desc, cost: g.cost,
                 status: state.gadget === g.id ? 'HOLDING' : owned ? 'OWNED — pick' : null,
                 action: () => {
                     if (owned) { state.gadget = g.id; return; }
                     if (spend(g.cost)) { state.ownedGadgets[g.id] = true; state.gadget = g.id; showToast(`${g.icon} ${g.name}! Use it with ${byInput('Q', '⚙', 'B')}`); }
                 } };
    });
    if (GADGETS.length > (page + 1) * GADGETS_PER_PAGE)
        items.push({ icon: '➡', name: 'More gadgets', desc: 'Even more cool stuff!', cost: 0, status: 'NEXT', action: () => openMenu('🏹 MORE GADGETS', () => gadgetItems(page + 1)) });
    items.push({ icon: '⬅', name: 'Back', desc: 'Back to the Forge', cost: 0, status: 'BACK', action: () => openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems) });
    return items;
}

function meleeItems() {
    const items = [{ icon: '👊', name: 'Just Fists', desc: 'Punch, punch, KICK!', cost: 0, status: state.melee ? 'PICK' : 'HOLDING',
                     action: () => { state.melee = null; } }];
    for (const m of MELEE_WEAPONS) {
        const owned = state.ownedMelee[m.id];
        items.push({ icon: m.icon, name: m.name, desc: m.desc, cost: m.cost,
                     status: state.melee === m.id ? 'HOLDING' : owned ? 'OWNED — pick' : null,
                     action: () => {
                         if (owned) { state.melee = m.id; return; }
                         if (spend(m.cost)) {
                             state.ownedMelee[m.id] = true; state.melee = m.id; giveAward('weaponMaster');
                             if (m.id === 'lightsaber') state.saberColor = Math.floor(Math.random() * SABER_COLORS.length);
                             showToast(`${m.icon} ${m.name.toUpperCase()}! Swing it with ${byInput('J', '👊', 'RB')}`);
                         }
                     } });
    }
    items.push({ icon: '🪞', name: 'Mirror Shield', desc: 'Blocking bounces bullets back at monsters!', cost: 50, status: state.mirrorShield ? 'OWNED' : null,
                 action: () => { if (!state.mirrorShield && spend(50)) { state.mirrorShield = true; showToast(`🪞 MIRROR SHIELD! Block (${byInput('X', '🛡', 'LB')}) to bounce bullets back!`, '#AADDFF', 220); } } });
    items.push({ icon: '⬅', name: 'Back', desc: 'Back to the Forge', cost: 0, status: 'BACK', action: () => openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems) });
    return items;
}

function drawMenu() {
    if (!menu) return;
    const { X, Y, W } = MENU, H = menu.h;
    ctx.save();
    ctx.fillStyle = 'rgba(12,8,24,0.97)'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = '#FFB347'; ctx.lineWidth = 2; ctx.strokeRect(X, Y, W, H);
    ctx.fillStyle = '#FFB347'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(menu.title, 400, Y + 26);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px Arial';
    const costs = menu.items().some(it => it.cost > 0);   // the coin count only matters where something costs coins
    const keysHint = costs ? byInput('Arrows + SPACE (or click) to buy, E to close', 'Tap to buy, ✕ to close', 'A to buy, B to close')
                           : byInput('Arrows + SPACE (or click) to choose, E to close', 'Tap to choose, ✕ to close', 'A to choose, B to close');
    ctx.fillText(menu.hint || (costs ? `Your coins: 🪙${state.coins}   ·   ${keysHint}` : keysHint), 400, Y + 44);
    ctx.beginPath(); ctx.arc(MENU_CLOSE.x, MENU_CLOSE.y, MENU_CLOSE.r, 0, Math.PI * 2);   // ✕ close button
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill(); ctx.strokeStyle = '#FFB347'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    for (const dir of [-1, 1]) { ctx.moveTo(MENU_CLOSE.x - 6, MENU_CLOSE.y - 6 * dir); ctx.lineTo(MENU_CLOSE.x + 6, MENU_CLOSE.y + 6 * dir); }
    ctx.stroke();
    menu.items().forEach((it, i) => {
        const r = menuItemRect(i);
        const cursor = i === menu.cursor && lastInput !== 'touch';
        ctx.fillStyle = it.status ? 'rgba(255,215,0,0.14)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = cursor ? '#FFFFFF' : it.status ? '#C8A040' : '#444'; ctx.lineWidth = cursor ? 2.5 : 1;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (menu.wide) {   // icon, a bold name, then the wrapped text under it
            ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFF';
            ctx.fillText(it.icon, r.x + 28, r.y + r.h / 2 + 8);
            ctx.textAlign = 'left'; ctx.fillStyle = '#FFE8B0'; ctx.font = 'bold 14px Arial';
            ctx.fillText(it.name, r.x + MENU_WIDE.TEXT_X, r.y + 17);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '12px Arial';
            wideDescLines(it).forEach((line, k) => ctx.fillText(line, r.x + MENU_WIDE.TEXT_X, r.y + MENU_WIDE.HEAD + 11 + k * MENU_WIDE.LINE));
            return;
        }
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFF';
        ctx.fillText(it.icon, r.x + 28, r.y + r.h / 2 + 8);
        ctx.textAlign = 'left';
        const tx = r.x + 54, tw = r.w - 58, off = (r.h - 54) / 2;
        ctx.font = '12px Arial';
        const desc = wrapText(it.desc, tw, 2), two = desc.length > 1;   // a long description takes two lines
        ctx.fillStyle = '#FFE8B0'; fitText(it.name, tx, r.y + off + (two ? 13 : 19), tw, two ? 13 : 14, true);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
        desc.forEach((line, k) => ctx.fillText(line, tx, r.y + off + (two ? 26 : 34) + k * 12, tw));
        ctx.fillStyle = it.status ? '#FFD700' : state.coins >= (it.cost || 0) ? '#FFD700' : '#886';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(it.status ? '✓ ' + it.status : it.cost ? `🪙${it.cost}` : '', tx, r.y + off + (two ? 51 : 50), tw);
    });
    ctx.restore();
}

// ── DRAW: INTRO SCREEN ────────────────────────────────────────
function drawIntro() {
    ctx.fillStyle = '#080018';
    ctx.fillRect(0, 0, 800, 600);

    // Twinkling stars
    const t = Date.now() / 3000;
    for (let i = 0; i < 35; i++) {
        const sx = ((i * 137 + 50) % 760) + 20;
        const sy = ((i * 97  + 30) % 520) + 40;
        const al = 0.25 + 0.4 * Math.sin(t * 2.5 + i);
        ctx.fillStyle = `rgba(255,255,255,${al})`;
        ctx.fillRect(sx, sy, 2, 2);
    }

    // Title
    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.fillStyle   = '#FFD700';
    ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
    ctx.fillText('The Light of Paradise', 400, 78);
    ctx.restore();

    // Story text
    const lines = [
        'The Devil stole the Golden Light',
        'and hid it on Paradise Island!',
        '',
        'Dig in the caves of Hell for Magic Power.',
        'Use it to survive Monster Night',
        'on Paradise Island and win 3 Light Crystals.',
        '',
        'Collect them all to defeat the Devil',
        'and save the world!',
        'by Goldwinner games',
    ];
    ctx.font = '18px Arial'; ctx.textAlign = 'center';
    lines.forEach((line, i) => {
        ctx.fillStyle = line === '' ? 'transparent' : 'rgba(210,210,255,0.92)';
        ctx.fillText(line, 400, 138 + i * 34);
    });

    // Hint: Caves
    ctx.fillStyle = 'rgba(220,150,80,0.9)';
    ctx.font = '13px Arial';
    ctx.fillText('Tip: Hide in Hell\'s caves for 1 minute — dig deep for rare weapons, but watch out for moles!', 400, 472);

    // Pulsing Press Space
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.save();
    ctx.fillStyle   = `rgba(255,255,80,${pulse})`;
    ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 16 * pulse;
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    if (!savedGame) {
        ctx.fillText('Tap, click, press SPACE or press A to Begin!', 400, 508);
        ctx.restore();
    } else {
        ctx.restore();
        // Saved game: Continue or start again
        for (const [b, label, sub] of [[CONTINUE_BTN, '▶ CONTINUE', `Level ${savedGame.level} · 🪙${savedGame.coins}  (SPACE / A)`],
                                       [NEW_GAME_BTN, '✦ NEW GAME', '(N / X)']]) {
            ctx.fillStyle = 'rgba(30,20,70,0.9)'; ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = `rgba(255,255,80,${pulse})`; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = '#FFFF80'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
            ctx.fillText(label, b.x + b.w / 2, b.y + 24);
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
            ctx.fillText(sub, b.x + b.w / 2, b.y + b.h + 15);
        }
    }

    if (fullscreenOK() && usesTouchLayout()) {   // ⛶ full screen, for phones
        const b = FULLSCREEN_BTN;
        ctx.fillStyle = 'rgba(30,20,70,0.9)'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(inFullscreen() ? '⛶ Exit full screen' : '⛶ Full screen', b.x + b.w / 2, b.y + b.h / 2 + 1);
        ctx.textBaseline = 'alphabetic';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Arial';
    ctx.fillText(usesTouchLayout() ? 'Move: left stick  |  Shoot: big button  |  Mystery portals go anywhere!'
                                   : 'Move: WASD / Arrows  |  Shoot: Space  |  Dance: G  |  Fart: F  |  Mystery portals go anywhere!', 400, 562);
}

// ── DRAW: RAINBOW BACKGROUND ──────────────────────────────────
function drawRainbowBg() {
    const t    = Date.now() / 2200;
    const grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0,    `hsl(${(t * 60)       % 360}, 85%, 12%)`);
    grad.addColorStop(0.25, `hsl(${(t * 60 + 90)  % 360}, 85%, 12%)`);
    grad.addColorStop(0.5,  `hsl(${(t * 60 + 180) % 360}, 85%, 12%)`);
    grad.addColorStop(0.75, `hsl(${(t * 60 + 270) % 360}, 85%, 12%)`);
    grad.addColorStop(1,    `hsl(${(t * 60 + 360) % 360}, 85%, 12%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);
}

function drawEndHint() {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(byInput('or press ENTER', 'tap the button', 'or press START'), 400, 494);
}

function drawScoreLine(y) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial';
    ctx.fillText(`Score: ${state.score}    Best: ${highScore}`, 400, y);
    if (state.newBest && Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12;
        ctx.font = 'bold 15px Arial';
        ctx.fillText('🏆 NEW HIGH SCORE! 🏆', 400, y + 20);
    }
    ctx.restore();
}

// ── DRAW: LEVEL COMPLETE ──────────────────────────────────────
function drawLevelComplete() {
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, 0, 800, 600);

    const cfg = LEVEL_CONFIGS[state.level - 1];
    ctx.save();
    ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 50;
    ctx.fillStyle   = '#4FC3F7';
    ctx.font = 'bold 52px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.level} COMPLETE!`, 400, 195);
    ctx.restore();
    drawScoreLine(228);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px Arial'; ctx.textAlign = 'center';
    const nextCfg = LEVEL_CONFIGS[state.level];   // next level config
    const bossMsg  = nextCfg && nextCfg.isBoss ? '  ⚠ BOSS LEVEL NEXT!' : '';
    ctx.fillText(`Get ready for Level ${state.level + 1}…${bossMsg}`, 400, 282);
    ctx.restore();

    // Difficulty preview
    if (nextCfg) {
        ctx.fillStyle = 'rgba(255,200,100,0.8)';
        ctx.font = '15px Arial'; ctx.textAlign = 'center';
        const hints = [];
        if (nextCfg.ammoMax < cfg.ammoMax)           hints.push(`Ammo: ${nextCfg.ammoMax} bullets`);
        if (nextCfg.reloadFrames > cfg.reloadFrames) hints.push(`Reload: ${(nextCfg.reloadFrames/60).toFixed(0)}s`);
        if (nextCfg.devilHp > cfg.devilHp)           hints.push(`Boss HP: ${nextCfg.devilHp}`);
        if (nextCfg.playerMaxHp < cfg.playerMaxHp)   hints.push(`Lives: ${nextCfg.playerMaxHp}`);
        if (hints.length) ctx.fillText('Next level: ' + hints.join('  |  '), 400, 312);
    }

    // Orbiting stars
    const t = Date.now() / 300;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        drawStar(400 + Math.cos(a) * 110, 370 + Math.sin(a) * 42,
            14 + Math.sin(t + i) * 4, '#4FC3F7');
    }

    // Next Level button
    ctx.save();
    ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 20;
    ctx.fillStyle   = '#0a2840';
    ctx.fillRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.strokeStyle = '#4FC3F7'; ctx.lineWidth = 2;
    ctx.strokeRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Next Level  ▶', 400, 454);
    ctx.restore();
    drawEndHint();
}

// ── DRAW: WIN SCREEN ──────────────────────────────────────────
function drawWin() {
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, 800, 600);

    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 55;
    ctx.fillStyle   = '#FFD700';
    ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PARADISE IS SAVED!', 400, 185);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 22;
    ctx.fillStyle   = '#FFFFFF';
    ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
    ctx.fillText('YOU ARE A HERO!', 400, 240);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,215,0,0.75)';
    ctx.font = '18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Coins collected: 🪙 ${state.coins}`, 400, 272);
    drawScoreLine(298);

    // Orbiting stars
    const t = Date.now() / 300;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        drawStar(400 + Math.cos(a) * 110, 360 + Math.sin(a) * 42,
            14 + Math.sin(t + i) * 4, '#FFD700');
    }

    // Play Again button
    ctx.save();
    ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 20;
    ctx.fillStyle   = '#1a3488';
    ctx.fillRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.strokeStyle = '#6699FF'; ctx.lineWidth = 2;
    ctx.strokeRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Play Again', 400, 454);
    ctx.restore();
    drawEndHint();
}

// ── THE TIME MACHINE, TV, THE ENDING DOOR AND THE CREDITS ───
// ⏰ The Time Machine (in your secret room)
const TIME_MACHINE = { x: 650, y: 400 };
function timeMachineItems() {
    const go = (icon, name, desc, room, msg) => ({ icon, name, desc, cost: 0, status: 'GO!', action: () => { menu = null; giveAward('timeTravel'); sfx('portal'); changeRoom(room); showToast(msg, '#CCAAFF', 240); } });
    return [
        go('🏰', 'Knights & Castles', 'Long, long ago… a Dragon King!',  ROOM.MEDIEVAL,   '⏰ WHOOSH! Back to the days of knights and castles!'),
        go('🦖', 'Dinosaur Times',    'When dinosaurs ruled the Earth',  ROOM.DINO,       '⏰ WHOOSH! 65 million years ago!'),
        go('🏛', 'Ancient Greece',    'Heroes, monsters and gods',       ROOM.GREECE,     '⏰ WHOOSH! Ancient Greece!'),
        go('🚀', 'The Future',        'A base on the Moon!',             ROOM.MOONBASE,   '⏰ WHOOSH! The far, far future!'),
    ];
}

// 📺 Your own TV channel (walk up to your TV at home)
let tvShow = null;
const TV_CHANNELS = ['📰 NEWS', '🎨 CARTOONS', '🎵 MUSIC'];
function nextTvChannel() { tvShow.ch++; tvShow.t = 0; if (tvShow.ch >= TV_CHANNELS.length) tvShow = null; else sfx('pop'); }
function drawTvShow() {
    if (!tvShow) return;
    const t = Date.now() / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#222'; ctx.fillRect(170, 130, 460, 320); ctx.fillStyle = '#4A8AC0'; ctx.fillRect(190, 150, 420, 260);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText(`📺 YOUR TV CHANNEL — ${TV_CHANNELS[tvShow.ch]}`, 400, 122);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 15px Arial';
    if (tvShow.ch === 0) {
        ctx.fillText('📰 TODAY\'S NEWS', 400, 185); ctx.font = '13px Arial';
        [`A brave hero has ${state.coins} coins!`, `${awards.kills || 0} monsters beaten so far!`, `${Object.keys(awards.got).length} awards won!`,
         godParent() ? `They say the hero is the child of ${godParent().name}!` : 'Is the hero secretly a demigod? Nobody knows!',
         state.hogwarts ? 'And they go to Hogwarts!' : 'Weather: sunny with a chance of monsters.'].forEach((line, i) => ctx.fillText(line, 400, 220 + i * 30));
    } else if (tvShow.ch === 1) {
        const x = 220 + ((t * 80) % 360);
        ctx.font = '40px Arial'; ctx.fillText('👾', x, 300 + Math.sin(t * 8) * 10); ctx.fillText('🐶', x - 70, 300 + Math.abs(Math.sin(t * 8)) * -14);
        ctx.font = 'bold 15px Arial'; ctx.fillText('The Adventures of Gloop and Puppy!', 400, 185);
    } else {
        ctx.fillText('🎵 DANCE PARTY! 🎵', 400, 185); ctx.font = '36px Arial';
        for (let k = 0; k < 6; k++) ctx.fillText(['🎵', '🎶', '💃', '🕺', '🎸', '🥁'][k], 230 + k * 68, 300 + Math.sin(t * 6 + k) * 20);
        if (tvShow.t % 20 === 0) tone([523, 659, 784, 659][Math.floor(tvShow.t / 20) % 4], 0.15, 'triangle', 0.1);
    }
    ctx.fillStyle = '#AAA'; ctx.font = '11px Arial'; ctx.fillText(`${mainBtn()}: change channel`, 400, 470);
    ctx.restore();
}

// 🌟 THE SECRET ENDING: a golden door in Heaven that only opens for the very best players
const ENDING_DOOR = { x: 250, y: 160 }, ENDING_AWARDS = 60;
function endingUnlocked() { return Object.keys(awards.got).length >= ENDING_AWARDS && awards.got.bossRush; }
function drawEndingDoor() {
    const { x, y } = ENDING_DOOR, open = endingUnlocked(), t = Date.now() / 1000;
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = open ? 20 + Math.sin(t * 3) * 8 : 6;
    ctx.fillStyle = open ? '#FFD700' : '#C8B060'; ctx.fillRect(x - 18, y - 30, 36, 50); ctx.beginPath(); ctx.arc(x, y - 30, 18, Math.PI, 0); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = open ? '#FFF8D0' : '#8A7030'; ctx.fillRect(x - 12, y - 24, 24, 44);
    ctx.fillStyle = '#665'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(open ? '🌟 THE SECRET ENDING' : '🔒 ???', x, y + 34);
    ctx.restore();
}
let credits = null;
const CREDIT_LINES = ['🌟 YOU FOUND THE SECRET ENDING! 🌟', '', 'THE LIGHT OF PARADISE', '', 'You beat the Devil, the bosses and the Mega Boss.',
    'You found secret rooms and hidden treasure.', 'You made friends with pets, monsters and gods.', '', 'You are a TRUE HERO.', '',
    'Game ideas by: the best game designer ever', 'Starring: YOU!', '', 'Thank you for playing! ❤', '', '+🪙500'];
function startCredits() {
    credits = { y: 640 }; giveAward('secretEnding'); state.coins += 500; addScore(1000);
    for (let k = 0; k < 4; k++) spawnConfettiAt(200 + k * 130, 200);
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, null, i * 0.35));
}
function updateCredits() {
    credits.y -= 0.8;
    if (Math.random() < 0.05) spawnParticles(Math.random() * 800, Math.random() * 600, '#FFE066', 4);
    if (credits.y < -CREDIT_LINES.length * 34 - 40) credits = null;
}
function drawCredits() {
    if (!credits) return;
    ctx.save(); ctx.fillStyle = 'rgba(10,5,30,0.92)'; ctx.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 60; i++) drawStar((i * 137) % 800, (i * 89 + Date.now() / 50) % 600, 2 + (i % 3), '#FFE066');
    ctx.textAlign = 'center';
    CREDIT_LINES.forEach((line, i) => { ctx.fillStyle = i === 0 ? '#FFD700' : '#FFFFFF'; ctx.font = i === 0 || i === 2 ? 'bold 26px Arial' : '18px Arial'; ctx.fillText(line, 400, credits.y + i * 34); });
    ctx.restore();
}
function drawTimeMachineAndHints() {
    if (state.room !== ROOM.SECRETROOM) return;
    const { x, y } = TIME_MACHINE, t = Date.now() / 1000;
    ctx.save(); ctx.fillStyle = '#5A5A7A'; ctx.fillRect(x - 30, y - 40, 60, 70); ctx.fillStyle = `hsl(${(t * 100) % 360}, 80%, 60%)`; ctx.beginPath(); ctx.arc(x, y - 6, 18, 0, Math.PI * 2); ctx.fill();
    ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⏰', x, y - 6);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 10px Arial'; ctx.textBaseline = 'alphabetic'; ctx.fillText('THE TIME MACHINE', x, y + 46);
    ctx.fillStyle = '#CCAAFF'; ctx.fillText(`🌟 Psst… the secret ending is behind a golden door in Heaven. It needs ${ENDING_AWARDS} awards and the Boss Rush crown!`, 400, 560);
    ctx.restore();
    if (Math.hypot(player.x - x, player.y - y) < 44 && !menu) drawSpeech({ x, y: y - 30 }, `${mainBtn()}: Travel in time!`);
}

