// ── STATE ────────────────────────────────────────────────────
let state = {
    room:               ROOM.VOID,
    lightCrystals:      0,
    power:              POWER.NONE,
    powerTier:          1,         // 1 normal · 2 super · 3 rainbow (deeper digs = higher tier)
    won:                false,
    levelComplete:      false,     // true when current level beaten (but more levels remain)
    screenShake:        0,
    playerFlash:        0,
    gamePhase:          'intro',   // 'intro' | 'playing'
    playerHp:           3,
    playerInvincible:   0,
    confettiSpawned:    false,
    paradiseClearCount: 0,         // how many crystals collected (0–3)
    voidHealTimer:      0,         // counts frames toward next +1 HP heal in Void
    // Level / progression
    level:              1,
    // Ammo
    ammo:               5,
    ammoMax:            5,
    ammoReloading:      false,
    ammoReloadTimer:    0,
    // Cave timer
    caveTimer:          0,
    caveProtectionExpired: false,
    // Coins & shop
    coins:              0,
    shopOpen:           false,
    shopCursor:         0,         // highlighted shop item (for controllers)
    awardsOpen:         false,
    danceTimer:         0,
    fartCooldown:       0,
    digAnim:            0,         // frames left of the shovel swing
    unlockedSkins:      [true, ...Array(AVATAR_COLORS.length - 1).fill(false)],
    activeSkin:         0,
    bubble:             false,     // Shield Bubble from the shop — blocks one hit
    // Paradise Island town
    job:                null,      // current job from a job giver (see makeJob)
    housesOwned:        {},        // e.g. { cottage: true }
    ammoBonus:          0,         // extra ammo from the Blacksmith
    // Pets
    ownedPets:          PETS.map(() => false),
    activePet:          -1,        // index into PETS, -1 = no pet
    petXp:              PETS.map(() => 0),   // pets get stronger as they fight
    // Forge
    ownedGadgets:       {},        // e.g. { bomb: true }
    gadget:             null,      // id of the gadget you're holding
    melee:              null,      // fighting weapon in your hand (null = fists)
    ownedMelee:         {},
    arrowKind:          0,
    gadgetCooldown:     0,
    hasDash:            false,
    dashTimer:          0,
    dashCooldown:       0,
    weaponLevel:        1,
    faceX:              1,         // last direction you moved (for dashing / throwing)
    walkPhase:          0,         // swings your arms and legs while you walk
    // Minecraft-style building
    buildMode:          false,
    hotbar:             0,         // which block you're holding
    inv:                { dirt: 10, planks: 10, stone: 5, glass: 5 },   // blocks and materials you've collected (you start with a few)
    armor:              0,         // +hearts from crafted armor
    diamondPickaxe:     false,
    heavenWishes:       3,
    placesSeen:         {},
    treasure:           null,      // { spots, step, hits } while you follow a treasure map
    spells:             {},        // magic powers bought at the Magic Shop
    spell:              null,      // the one you're holding
    spellCooldown:      0,
    mounts:             {},        // rides bought at the Stable
    mount:              null,      // what you're riding right now
    lastMount:          null,
    gotStarterBlocks:   true,
    // Island life
    furniture:          { bed: true },   // what's in your house
    chicken:            0,               // frames left as a chicken 🐔
    lessonHealTimer:    0,
    garden:             [0, 0, 0, 0],    // when each pot was planted (Date.now()), 0 = empty
    lessons:            {},              // School lessons you've learned
    hogwarts:           false,           // got your Hogwarts letter 🦉
    demigod:            undefined,       // god parent id, null = a normal kid, undefined = not rolled yet
    godCooldown:        0,
    godTurn:            0,               // which of your two god powers is next
    house:              null,            // Hogwarts house from the Sorting Hat
    quest:              null,            // { kind, need, got } from the Demigod Camp quest board
    wand:               'oak',           // 🪄 from the Hogwarts Wand Shop
    wands:              {},
    creature:           null,            // 🐣 magic creature you look after
    creatureFood:       0,               // 0-100, goes down slowly
    trials:             {},              // ⚡ hero trials beaten (hydra, minotaur, medusa, cerberus)
    fleece:             false,           // 🐑 the Golden Fleece
    fullGod:            false,           // finished every hero trial!
    stoned:             0,               // 🗿 frames left as a statue
    gloop:              0,               // 👾 cookies given to Gloop (3 = best friends)
    petCostume:         null,            // 🐾 what your pet is wearing
    yard:               {},              // 🏡 things you've built in the backyard
    magicGarden:        [0, 0, 0],       // when each magic plant was planted (Date.now()), 0 = empty
    farmAt:             0,               // when you last collected from the farm
    mirrorShield:       false,           // 🪞 blocking bounces bullets back
    heroSuit:           null,            // 🦸 null = not bought, 'on' / 'off'
    saberColor:         0,
    petCostumes:        {},
    questsDone:         0,
    invisible:          0,               // 🧪 potion timers
    giant:              0,
    tiny:               0,
    hats:               {},              // hats you own
    hat:                null,            // hat you're wearing
    houseFrom:          null,            // which house door you went in by
    faceY:              0,
    // Score
    score:              0,
    newBest:            false,     // beat the high score this game
};

// ── PLAYER ───────────────────────────────────────────────────
const player = { x: 400, y: 300, w: 32, h: 32 };

// ── INPUT ────────────────────────────────────────────────────
// Keyboard, mouse, touch and game controllers all end up calling the same few actions.
const keys = {};

// Shop layout (shared by drawing and by tap / click hit-testing)
const SHOP       = { X: 110, Y: 150, W: 580, H: 300 };
const SHOP_SLOTS = 16;                                       // 0-7 skins, 8 Shield Bubble, 9-15 pets
const SHOP_CLOSE = { x: SHOP.X + SHOP.W - 20, y: SHOP.Y + 20, r: 13 };
const SHOP_BTN   = { x: 270, y: 392, w: 120, h: 32 };        // on-screen SHOP button in the Void
const AWARDS_BTN = { x: 410, y: 392, w: 120, h: 32 };        // …and the AWARDS button next to it
const NEW_GAME_BTN = { x: 420, y: 488, w: 170, h: 38 };      // title screen, when there's a saved game
const CONTINUE_BTN = { x: 210, y: 488, w: 170, h: 38 };
const END_BTN    = { x: 300, y: 420, w: 200, h: 55 };        // Next Level / Play Again button

function shopSlotRect(i) {
    if (i < 8) {
        const cx = SHOP.X + 46 + i * 70, cy = SHOP.Y + 118;
        return { x: cx - 26, y: cy - 26, w: 52, h: 70, cx, cy };
    }
    const j = i - 8, x = SHOP.X + 14 + j * 70;
    return { x, y: SHOP.Y + 180, w: 66, h: 106, cx: x + 33, cy: SHOP.Y + 212 };
}

// Arrow keys / D-pad in the shop: left-right along a row, up-down between rows
function moveShopCursor(dx, dy) {
    let c = state.shopCursor;
    const top = c < 8;
    if (dx) c = top ? (c + dx + 8) % 8 : 8 + ((c - 8 + dx + 8) % 8);   // both rows have 8 things
    if (dy > 0 && top)  c += 8;
    if (dy < 0 && !top) c -= 8;
    state.shopCursor = c;
}

function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

function canOpenShop() {
    return state.gamePhase === 'playing' && state.room === ROOM.VOID && !state.won && !state.levelComplete;
}
function toggleShop() {
    if (state.shopOpen) state.shopOpen = false;
    else if (canOpenShop()) state.shopOpen = true;
}

// Buy or wear a shop item: 0-7 skins, 8 Shield Bubble, 9-12 pets
function shopSelect(i) {
    state.shopCursor = i;
    if (i >= 9) {
        const j = i - 9;
        if (state.ownedPets[j]) {
            state.activePet = j;
        } else if (state.coins >= PETS[j].cost) {
            state.coins -= PETS[j].cost;
            state.ownedPets[j] = true;
            state.activePet = j;
            giveAward('pet');
            if (state.ownedPets.every(Boolean)) giveAward('allPets');
            placePetBesidePlayer();
            spawnParticles(player.x, player.y, '#FFD700', 10);
            sfx('win');
        }
        return;
    }
    if (i === 8) {
        if (!state.bubble && state.coins >= BUBBLE_COST) {
            state.coins -= BUBBLE_COST;
            state.bubble = true;
            sfx('buy');
        }
        return;
    }
    if (state.unlockedSkins[i]) {
        state.activeSkin = i;
    } else if (state.coins >= AVATAR_UNLOCK_COST[i]) {
        state.coins -= AVATAR_UNLOCK_COST[i];
        state.unlockedSkins[i] = true;
        state.activeSkin = i;
        spawnParticles(player.x, player.y, AVATAR_COLORS[i], 8);
        sfx('buy');
    }
}

// ── READABLE TEXT ────────────────────────────────────────────
// Anything a child has to read is at least MIN_READ_FONT px. fitText() shrinks text to fit a space, but never below that
// (past it the letters are squeezed instead of getting tiny).
const MIN_READ_FONT = 12;
function fitText(text, x, y, maxW, px = 14, bold = false) {
    let size = px;
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`;
    while (size > MIN_READ_FONT && ctx.measureText(text).width > maxW) { size--; ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`; }
    ctx.fillText(text, x, y, maxW);   // (maxW squeezes it only if even the smallest size is too wide)
}
// Split text into at most maxLines lines that fit maxW (the last line is squeezed if it still does not)
function wrapText(text, maxW, maxLines) {
    const words = String(text).split(' '), lines = [];
    let line = '';
    for (const w of words) {
        const tryLine = line ? line + ' ' + w : w;
        if (line && ctx.measureText(tryLine).width > maxW && lines.length < maxLines - 1) { lines.push(line); line = w; }
        else line = tryLine;
    }
    lines.push(line);
    return lines;
}

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

// The main button: Space, A on a controller, or the on-screen SHOOT / DIG button
function pressAction() {
    if (menu) return;
    if (battle && !battle.result && state.gamePhase === 'playing') { battleHit(1, player); return; }   // ⚔ Battle Mode
    if (state.chicken > 0 && state.gamePhase === 'playing') {   // chickens can only cluck
        tone(900, 0.08, 'square', 0.12, 700); tone(800, 0.1, 'square', 0.1, 600, 0.1);
        spawnFloatText(player.x, player.y - 30, 'BAWK!', '#FFFFFF', 40);
        return;
    }
    if (race) { raceTap(); return; }
    if (petBattle) { cheerPetBattle(); return; }
    if (tvShow) { nextTvChannel(); return; }
    if (credits) return;
    if (nearRaceMaster() && state.gamePhase === 'playing') { openMenu('🏁 PICK A RACE!', raceItems); return; }
    if (nearChartSign() && state.gamePhase === 'playing') { openWeaponChart(); return; }
    if (state.buildMode && state.gamePhase === 'playing' && !state.won && !state.levelComplete) {
        const { cx, cy } = buildTargetCell();
        buildAt(cx, cy, player.x + state.faceX * 30, player.y + 5 + state.faceY * 30);
        return;
    }
    if (state.gamePhase === 'intro') startFromIntro();
    else if (state.levelComplete)   { if (endScreenReady()) advanceLevel(); }
    else if (state.won)             { if (endScreenReady()) resetGame(); }   // Play Again: Space and A work too
    else if (!tryTreasureDig() && !tryPlaceAction() && !tryDig() && !tryTalk() && !tryTownAction() && !tryHomeAction() && !tryMineNearby() && !tryDigGround()) shoot();
}

// Enter / Start: begin, next level, or play again
function pressStart() {
    if (state.gamePhase === 'intro') startFromIntro();
    else if (state.levelComplete)   { if (endScreenReady()) advanceLevel(); }
    else if (state.won)             { if (endScreenReady()) resetGame(); }
    else if (lastInput === 'pad')   openSettings();
}

// A tap or click at canvas position (x, y). Returns true if it hit a button.
function handleTap(x, y) {
    if (layoutDirty && usesTouchLayout()) layoutTouch();
    // (on a phone these two are big round touch buttons, drawn with the others and only while they are on screen)
    const touchSys = usesTouchLayout();
    if ((!touchSys || touchUiShown()) && Math.hypot(x - MUTE_BTN.x, y - MUTE_BTN.y) < (touchSys ? MUTE_BTN.r : MUTE_BTN.r * 1.5)) { toggleMute(); return true; }
    if (state.gamePhase === 'playing' && (!touchSys || touchUiShown()) && Math.hypot(x - SETTINGS_BTN.x, y - SETTINGS_BTN.y) < (touchSys ? SETTINGS_BTN.r : SETTINGS_BTN.r * 1.4)) { openSettings(); return true; }
    if (state.gamePhase === 'intro' && !menu) {   // (the New Game question is a menu: it gets the taps)
        if (fullscreenOK() && inRect(x, y, tapRect(FULLSCREEN_BTN))) toggleFullscreen();
        else if (savedGame && inRect(x, y, tapRect(NEW_GAME_BTN))) askNewGame();
        else startFromIntro();
        return true;
    }
    if (race) { raceTap(); return true; }
    if (petBattle) { cheerPetBattle(); return true; }
    if (tvShow) { nextTvChannel(); return true; }
    if (danceBattle) { danceTap(x, y); return true; }
    if (lastInput !== 'touch' && state.gamePhase === 'playing' && !menu && !state.shopOpen && inRect(x, y, BUILD_BTN)) { toggleBuild(); return true; }
    if (state.awardsOpen) { state.awardsOpen = false; return true; }
    if (menu) {
        if (Math.hypot(x - MENU_CLOSE.x, y - MENU_CLOSE.y) < MENU_CLOSE.hitR) { menu = null; return true; }   // the ✕
        const list = menu.items();
        for (let i = 0; i < list.length; i++) if (inRect(x, y, menuItemRect(i))) { menuSelect(i); return true; }
        if (!inRect(x, y, { x: MENU.X, y: MENU.Y, w: MENU.W, h: menu.h }) || y < MENU.Y + 40) menu = null;   // tap outside / title bar closes
        return true;
    }
    if (state.buildMode && state.gamePhase === 'playing' && !state.shopOpen && !state.won && !state.levelComplete) {
        const slot = hotbarSlotAt(x, y);   // the block row along the bottom: tap a block to pick it
        if (slot >= 0) { state.hotbar = slot; sfx('clink'); return true; }
        if (inRect(x, y, hotbarPanel())) return true;   // (the gaps in it are not the world)
    }
    if (state.gamePhase === 'playing' && lastInput === 'touch' && !state.won && !state.levelComplete) {
        if (inBtn(x, y, VBUILD)) { toggleBuild(); return true; }
        if (state.spell && inBtn(x, y, VSPELL)) { castSpell(); return true; }
        if (godParent() && inBtn(x, y, VGOD)) { useGodPower(); return true; }
        if (state.lastMount && inBtn(x, y, VMOUNT)) { toggleMount(); return true; }
        if (state.buildMode && inBtn(x, y, VGADGET)) { nextBlock(); return true; }
        if (inBtn(x, y, VGADGET)) { useGadget(); return true; }
        if (inBtn(x, y, VDASH))   { dash();      return true; }
    }
    if (!state.shopOpen && canOpenShop() && inRect(x, y, tapRect(AWARDS_BTN))) { state.awardsOpen = true; return true; }
    if (state.gamePhase === 'playing' && lastInput === 'touch' && !state.won && !state.levelComplete) {
        if (inBtn(x, y, VDANCE)) { dance(); return true; }
        if (inBtn(x, y, VFART))  { fart();  return true; }
        if (inBtn(x, y, VSILLY)) { (sillyTurn++ % 2 ? sneeze : burp)(); return true; }
    }
    if ((state.won || state.levelComplete) && inRect(x, y, END_BTN)) { pressStart(); return true; }
    if (state.shopOpen) {
        if (Math.hypot(x - SHOP_CLOSE.x, y - SHOP_CLOSE.y) < Math.max(SHOP_CLOSE.r * 1.6, usesTouchLayout() ? touchR() : 0)) { state.shopOpen = false; return true; }
        for (let i = 0; i < SHOP_SLOTS; i++) {
            if (inRect(x, y, shopSlotRect(i))) { shopSelect(i); return true; }
        }
        return inRect(x, y, { x: SHOP.X, y: SHOP.Y, w: SHOP.W, h: SHOP.H });   // taps on the panel do nothing else
    }
    if (canOpenShop() && inRect(x, y, tapRect(SHOP_BTN))) { state.shopOpen = true; return true; }
    return false;
}

// Menus and the shop both move their cursor with these keys.
const KEY_NAV = { ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
                  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1] };
function digitKey(code) { const m = /^Digit([1-9])$/.exec(code); return m ? Number(m[1]) - 1 : -1; }   // 1-9 key → 0-8, or -1

document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // browser shortcuts (Ctrl+R, Cmd+W...) are not game buttons
    initAudio();
    keys[e.code] = true;
    lastInput = 'keyboard';
    if (e.code === 'KeyM') toggleMute();
    if (menu) {
        const nav = KEY_NAV[e.code];
        if (nav) { e.preventDefault(); moveMenuCursor(nav[0], nav[1]); }
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); menuSelect(menu.cursor); }
        if (digitKey(e.code) >= 0) menuSelect(digitKey(e.code));
        if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyO') menu = null;
        return;
    }
    if (e.code === 'KeyB') toggleBuild();
    if (e.code === 'KeyP') toggleP2();
    if (e.code === 'KeyJ' && !e.repeat) meleePress();
    if (e.code === 'KeyX' && !e.repeat) startBlock();
    if (e.code === 'KeyC' && !e.repeat) superJump();
    if (e.code === 'KeyO') openSettings();
    if (e.code === 'KeyR') castSpell();
    if (e.code === 'KeyV') toggleMount();
    if (e.code === 'KeyQ') { if (state.buildMode) nextBlock(); else useGadget(); }
    if (digitKey(e.code) >= 0 && state.buildMode && !state.shopOpen) state.hotbar = Math.min(HOTBAR.length - 1, digitKey(e.code));
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') dash();
    if (state.shopOpen) {
        const nav = KEY_NAV[e.code];
        if (nav) { e.preventDefault(); moveShopCursor(nav[0], nav[1]); }
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); shopSelect(state.shopCursor); }
    } else {
        if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressAction(); }   // hold for a charge shot
        if (e.code === 'Enter' && !p2.active) pressStart();
        if (e.code === 'Enter' && p2.active && (state.won || state.levelComplete)) pressStart();
    }
    if (e.code === 'KeyE' || (e.code === 'Escape' && state.shopOpen)) toggleShop();
    if (e.code === 'KeyH' && canOpenShop() && !state.shopOpen) state.awardsOpen = !state.awardsOpen;
    if (e.code === 'Escape') state.awardsOpen = false;
    if (e.code === 'KeyN' && state.gamePhase === 'intro') askNewGame();
    if (e.code === 'KeyG') dance();
    if (e.code === 'KeyT') useGodPower();
    if (e.code === 'KeyK') toggleControlsPanel();
    if (e.code === 'KeyF') fart();
    if (e.code === 'KeyU') burp();
    if (e.code === 'KeyI') sneeze();
    // Number keys in the shop: 1-8 skins, 9 Shield Bubble
    if (digitKey(e.code) >= 0 && state.shopOpen) shopSelect(digitKey(e.code));
});
document.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'KeyJ') meleeRelease();
    if (e.code === 'KeyX') stopBlock();
});

canvas.addEventListener('click', e => {
    initAudio();
    lastInput = 'keyboard';   // the mouse counts as the keyboard side
    const p = canvasPos(e.clientX, e.clientY);
    if (handleTap(p.x, p.y)) return;
    if (state.gamePhase !== 'playing' || menu || state.shopOpen || state.won || state.levelComplete) return;
    if (Math.hypot(p.x - player.x, p.y - player.y) > BUILD_REACH) return;
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (state.buildMode) { buildAt(cx, cy, p.x, p.y); return; }            // build mode: click to mine or place
    if (blockAtCell(cx, cy) || sceneryAt(p.x, p.y)) buildAt(cx, cy, p.x, p.y);   // otherwise left-click mines, like Minecraft
});
// Right-click places a block, like Minecraft
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    lastInput = 'keyboard';
    const p = canvasPos(e.clientX, e.clientY);
    if (state.gamePhase !== 'playing' || menu || state.shopOpen || state.won || state.levelComplete) return;
    if (Math.hypot(p.x - player.x, p.y - player.y) > BUILD_REACH) return;
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (!blockAtCell(cx, cy)) buildAt(cx, cy, -9999, -9999);   // (far-away aim so it never chops a tree by accident)
});

// ── PAUSE (the kid switched tab or window: nothing keeps running or stays held down) ──
let paused = false;
let padResync = false;   // after a pause: held buttons count as already held, so they don't fire again

function pauseGame() {
    if (paused) return;
    paused = true;
    for (const k of Object.keys(keys)) keys[k] = false;
    vTouch.joyId = vTouch.shootId = vTouch.meleeId = vTouch.blockId = null;
    vTouch.joyDX = vTouch.joyDY = 0;
    padMove.x = padMove.y = 0; padPrev = [];
    buildFlash = null;
    // Let go without hitting: stopping a held punch must not fire a spin attack
    fight.holding = false; fight.hold = 0; fight.charge = 0; fight.blocking = false;
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();   // the music timer keeps ticking in a hidden tab
}
function resumeGame() {
    if (!paused || document.hidden || needTurn) return;   // (a phone still held upright stays paused)
    paused = false; padResync = true;
    resetFrameClock();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
// Closing a tab, switching apps or locking a phone can happen between the 5-second saves
function saveEverything() { saveGame(); if (state.gamePhase === 'playing' && !state.won) saveWorld(); lastSave = Date.now(); }
window.addEventListener('pagehide', saveEverything);
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveEverything(); pauseGame(); } else resumeGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('focus', resumeGame);

// Shown when the window is visible but not in front (a hidden tab needs no picture)
function drawPaused() {
    if (!paused || needTurn) return;   // (the turn-your-phone page covers everything)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.font = 'bold 44px Arial'; ctx.fillText('⏸ PAUSED', 400, 290);
    ctx.font = '20px Arial'; ctx.fillText('Click here to play!', 400, 330);
    ctx.restore();
}

// ── FRIENDS: Players 2, 3 and 4 on the same screen ──────────
// P2 can press P (arrow keys + Enter). Anyone can plug in a new controller and HOLD ANY BUTTON to join;
// they get the next free player number. Holding Start for 2 s leaves again.
const FRIENDS = [2, 3, 4].map((n, i) => ({ n, pad: -1, color: ['#FF8844', '#44CC66', '#AA66FF'][i],
                                           active: false, x: 0, y: 0, hp: 3, inv: 0, down: 0, cooldown: 0, walk: 0, faceX: 1, faceY: 0 }));
const p2 = FRIENDS[0];
const P2_DOWN_FRAMES = 600;   // if a friend runs out of hearts they rest for 10 s, then pop back up
function activeFriends() { return FRIENDS.filter(f => f.active); }
const JOIN_HOLD_FRAMES  = 60;    // hold any button for 1 s to join (so a bump doesn't add a player)
const LEAVE_HOLD_FRAMES = 120;   // hold Start for 2 s to leave
const joinHold = {};             // gamepad.index → frames a not-yet-playing controller has been held

function toggleFriend(f) {
    if (state.gamePhase !== 'playing') return;
    f.active = !f.active;
    if (f.active) {
        Object.assign(f, { x: player.x + 30 * (f.n - 1), y: player.y, hp: 3, inv: 60, down: 0 });
        showToast(f.n === 2 && f.pad < 0 ? '👫 PLAYER 2 JOINED! Arrow keys to move, ENTER to shoot' : `🎮 PLAYER ${f.n} JOINED!`, f.color, 240);
        if (activeFriends().length === 3) giveAward('party4');
    } else { f.pad = -1; showToast(`Player ${f.n} left the game. Bye!`, f.color, 120); }
}
function toggleP2() { toggleFriend(p2); }

function hurtFriend(f) {
    if (!f.active || f.down > 0 || f.inv > 0 || settings.creative) return;
    f.hp--; f.inv = 90;
    spawnParticles(f.x, f.y, '#FF4444', 8); sfx('hurt');
    if (f.hp <= 0) { f.down = P2_DOWN_FRAMES; showToast(`Player ${f.n} needs a rest… back in 10 s!`, '#FFAA88', 150); }
}

function friendShoot(f) {
    if (battle && !battle.result) { battleHit(f.n, f); return; }   // ⚔ Battle Mode: bonk each other
    if (!f.active || f.down > 0 || f.cooldown > 0 || state.power === POWER.NONE) return;
    f.lastShot = Date.now(); tryTeamUp();
    let target = null, best = 500;
    for (const e of targetableEnemies()) { const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < best) { best = d; target = e; } }
    if (!target && state.room === ROOM.HELL && hell.devil.alive) target = hell.devil;
    if (!target) return;
    f.cooldown = 16;
    const a = Math.atan2(target.y - f.y, target.x - f.x), w = WEAPON_INFO[state.power];
    const color = state.power === POWER.RAINBOW ? `hsl(${Math.random() * 360}, 100%, 60%)` : w.color;
    for (const off of (state.powerTier >= 2 ? [-0.2, 0, 0.2] : [0])) {
        projectiles.push({ x: f.x, y: f.y, dx: Math.cos(a + off) * w.speed, dy: Math.sin(a + off) * w.speed, color, power: state.power, life: 90, r: w.size });
    }
    sfx('shoot');
}

function updateFriend(f, pads) {
    if (!f.active) return;
    if (f.cooldown > 0) f.cooldown--;
    if (f.inv > 0) f.inv--;
    if (f.down > 0) {
        if (--f.down === 0) { f.hp = 3; f.inv = 120; f.x = player.x + 30; f.y = player.y; showToast(`Player ${f.n} is back! 💪`, f.color, 120); }
        return;
    }
    let dx = 0, dy = 0;
    if (f.n === 2) {   // Player 2 can use the keyboard
        if (keys['ArrowLeft'])  dx -= 1;
        if (keys['ArrowRight']) dx += 1;
        if (keys['ArrowUp'])    dy -= 1;
        if (keys['ArrowDown'])  dy += 1;
        if (keys['Enter'] || keys['NumpadEnter'] || keys['Numpad0']) friendShoot(f);
    }
    const gp = pads.find(p => p.index === f.pad);   // their own game controller
    if (gp) {
        const st = stickVector(gp.axes[0] || 0, gp.axes[1] || 0);
        dx += st.x; dy += st.y;
        const b = i => gp.buttons[i] && gp.buttons[i].pressed;
        if (b(PAD.LEFT)) dx -= 1; if (b(PAD.RIGHT)) dx += 1; if (b(PAD.UP)) dy -= 1; if (b(PAD.DOWN)) dy += 1;
        if (b(PAD.A) || b(PAD.RT)) friendShoot(f);
    }
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    if (len > 0.2) { f.faceX = dx; f.faceY = dy; f.walk += 0.32; }
    const spd = BASE_SPEED * (state.room === ROOM.PARADISE ? 1.2 : 1) * playerSpeedFactor();
    const nx = Math.max(18, Math.min(782, f.x + dx * spd)), ny = Math.max(52, Math.min(582, f.y + dy * spd));
    if (settings.creative || !playerHitsBlock(nx, f.y)) f.x = nx;
    if (settings.creative || !playerHitsBlock(f.x, ny)) f.y = ny;
    // Bad guys hurt friends too
    for (const e of targetableEnemies()) {
        if (e.frog || e.type === 'creeper' || isShieldedAgainst(e.type)) continue;
        if (Math.hypot(e.x - f.x, e.y - f.y) < e.r + 16) hurtFriend(f);
    }
    if (state.room === ROOM.HELL && hell.devil.alive && Math.hypot(hell.devil.x - f.x, hell.devil.y - f.y) < hell.devil.r + 16) hurtFriend(f);
}

function updateP2() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(p => p && p.connected) : [];
    for (const f of FRIENDS) updateFriend(f, pads);
}

function drawP2() {
    for (const f of activeFriends()) {
        if (f.down > 0) {   // resting
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`💤 P${f.n} back in ${Math.ceil(f.down / 60)}s`, f.x, f.y);
            continue;
        }
        if (f.inv > 0 && Math.floor(Date.now() / 80) % 2 === 0) continue;
        drawGroundShadow(f.x + 3, f.y + 19, 16, 5);
        const color = state.power === POWER.NONE ? f.color : getPlayerColor();
        ctx.save(); ctx.shadowColor = f.color; ctx.shadowBlur = 10;
        drawAvatar(f.x, f.y, player.w, color, 'plain', f.walk);
        ctx.restore();
        ctx.fillStyle = f.color; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`P${f.n}`, f.x, f.y - 30);
    }
}

// A filling bar while a new controller holds a button to join
function drawJoinProgress() {
    const slot = FRIENDS.find(f => !f.active);
    if (!slot) return;
    const most = Math.max(0, ...Object.values(joinHold));
    if (most <= 0) return;
    const t = Math.min(1, most / JOIN_HOLD_FRAMES);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(280, 90, 240, 46);
    ctx.fillStyle = slot.color; ctx.fillRect(290, 118, 220 * t, 10);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(290, 118, 220, 10);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🎮 Keep holding to join as P${slot.n}!`, 400, 110);
    ctx.restore();
}

// ── GAME CONTROLLER (Xbox, PlayStation, Switch Pro… anything the browser maps as "standard") ──
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_DEADZONE    = 0.3;   // ignore tiny stick wobbles
// Radial deadzone: the stick is a circle, not two separate axes. Inside the dead circle = 0; past it the push
// ramps up from 0 to 1, so walking starts gently instead of jumping to a third of full speed.
function stickVector(x, y) {
    const m = Math.hypot(x, y);
    if (m < PAD_DEADZONE) return { x: 0, y: 0 };
    const k = (Math.min(m, 1) - PAD_DEADZONE) / (1 - PAD_DEADZONE) / m;
    return { x: x * k, y: y * k };
}
// Flicking the stick in a menu: one step when it crosses the line, then repeats while it is held
const STICK_NAV_THRESHOLD    = 0.6;
const STICK_NAV_REPEAT_FIRST = 24;   // steps (1/60 s) before a held stick starts repeating
const STICK_NAV_REPEAT_EVERY = 8;
const stickNav = { key: '', held: 0 };
function stickNavStep(gp) {
    const x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    let dx = 0, dy = 0;
    if (Math.hypot(x, y) >= STICK_NAV_THRESHOLD) { if (Math.abs(x) > Math.abs(y)) dx = Math.sign(x); else dy = Math.sign(y); }
    const key = dx + ',' + dy;
    if (!dx && !dy) { stickNav.key = ''; stickNav.held = 0; return null; }
    if (key !== stickNav.key) { stickNav.key = key; stickNav.held = 0; return [dx, dy]; }
    stickNav.held++;
    return stickNav.held >= STICK_NAV_REPEAT_FIRST && (stickNav.held - STICK_NAV_REPEAT_FIRST) % STICK_NAV_REPEAT_EVERY === 0 ? [dx, dy] : null;
}
let   lastInput       = 'keyboard';   // 'keyboard' | 'touch' | 'pad' — picks which hints to show
// Pick the hint text for the device in use. Every on-screen prompt goes through these two.
function byInput(keyboard, touch, pad) { return lastInput === 'pad' ? pad : lastInput === 'touch' ? touch : keyboard; }
function keyName(keyboard, pad) { return lastInput === 'pad' ? pad : keyboard; }   // for keys that only differ on a controller
function mainBtn() { return byInput('SPACE', 'Tap', 'A'); }   // the name of the main button
let   padPrev         = [];
const padMove         = { x: 0, y: 0 };
let   padComboUsed    = false;
// Not enough buttons, so: hold View (⧉) + another button
const PAD_COMBOS = [
    { btn: PAD.A,  label: 'God power', run: () => { if (godParent()) useGodPower(); else showToast('⚡ Only demigods have god powers!', '#FFE680', 100); } },
    { btn: PAD.X,  label: 'Dance',     run: () => dance() },
    { btn: PAD.B,  label: 'Fart',      run: () => fart() },
    { btn: PAD.Y,  label: 'Awards',    run: () => { if (canOpenShop()) state.awardsOpen = !state.awardsOpen; } },
    { btn: PAD.RB, label: 'Burp',      run: () => burp() },
    { btn: PAD.LT, label: 'Sneeze',    run: () => sneeze() },
    { btn: PAD.LB, label: 'Hide help', run: () => toggleControlsPanel() },
];

