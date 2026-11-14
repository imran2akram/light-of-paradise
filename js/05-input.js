// ── INPUT ────────────────────────────────────────────────────
// Keyboard, mouse, touch and game controllers all end up calling the same few actions.
const keys = {};

// ── MAIN BUTTON, TAPS AND KEYS ─────────────────────────────
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
    if (state.awardsOpen) {
        if (inRect(x, y, tapRect(awardsPrevRect()))) awardsTurn(-1);
        else if (inRect(x, y, tapRect(awardsNextRect()))) awardsTurn(1);
        else state.awardsOpen = false;   // a tap anywhere else closes it, as before
        return true;
    }
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
    if (!state.shopOpen && canOpenShop() && inRect(x, y, tapRect(AWARDS_BTN))) { setAwardsOpen(true); return true; }
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
    } else if (state.awardsOpen) {   // the awards board: arrows (or A / D, W / S) turn the pages, SPACE goes on to the next
        const nav = KEY_NAV[e.code];
        if (nav) { e.preventDefault(); awardsTurn(nav[0] + nav[1]); }
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) awardsTurn(1); }
    } else {
        if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) pressAction(); }   // hold for a charge shot
        if (e.code === 'Enter' && !p2.active) pressStart();
        if (e.code === 'Enter' && p2.active && (state.won || state.levelComplete)) pressStart();
    }
    if (e.code === 'KeyE' || (e.code === 'Escape' && state.shopOpen)) toggleShop();
    if (e.code === 'KeyH' && canOpenShop() && !state.shopOpen) setAwardsOpen(!state.awardsOpen);
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
    { btn: PAD.Y,  label: 'Awards',    run: () => { if (canOpenShop()) setAwardsOpen(!state.awardsOpen); } },
    { btn: PAD.RB, label: 'Burp',      run: () => burp() },
    { btn: PAD.LT, label: 'Sneeze',    run: () => sneeze() },
    { btn: PAD.LB, label: 'Hide help', run: () => toggleControlsPanel() },
];

// ── GAME CONTROLLER POLLING ────────────────────────────────
function pollGamepad() {
    padMove.x = padMove.y = 0;
    if (paused) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const connected = Array.from(pads).filter(p => p && p.connected);
    for (const f of FRIENDS) {   // a friend's controller was unplugged: they leave
        if (f.pad >= 0 && !connected.some(p => p.index === f.pad)) { f.leaveHold = 0; if (f.active) toggleFriend(f); else f.pad = -1; }
    }
    const friendPad = pd => FRIENDS.find(f => f.active && f.pad === pd.index);
    const free = connected.filter(pd => !friendPad(pd));
    const gp = free[0];   // Player 1 uses the first controller that isn't a friend's
    for (const pd of connected) {
        const anyHeld = pd.buttons.some(b => b && b.pressed);
        const f = friendPad(pd);
        if (f) {   // hold Start to leave
            const start = !!(pd.buttons[PAD.START] && pd.buttons[PAD.START].pressed);
            f.leaveHold = start ? (f.leaveHold || 0) + 1 : 0;
            if (f.leaveHold === LEAVE_HOLD_FRAMES) { joinHold[pd.index] = -1; toggleFriend(f); }   // -1: let go before joining again
            continue;
        }
        if (pd === gp || !anyHeld || state.gamePhase !== 'playing') { joinHold[pd.index] = 0; continue; }
        const slot = FRIENDS.find(fr => !fr.active);
        if (!slot || joinHold[pd.index] < 0) continue;
        joinHold[pd.index] = (joinHold[pd.index] || 0) + 1;
        if (joinHold[pd.index] >= JOIN_HOLD_FRAMES) {
            joinHold[pd.index] = 0;
            slot.pad = pd.index; slot.leaveHold = 0;
            toggleFriend(slot);
            sfx('coin');
        }
    }
    if (introVideo.isUp()) introVideo.setHint(!!gp);
    if (!gp) { padPrev = []; return; }
    const held = gp.buttons.map(b => b.pressed);
    const was  = padResync ? held : padPrev;   // (right after a pause nothing counts as a new press)
    padResync = false;
    padPrev = held;
    const pressed = i => held[i] && !was[i];
    if (held.some(Boolean) || Math.abs(gp.axes[0] || 0) > 0.5 || Math.abs(gp.axes[1] || 0) > 0.5) {
        lastInput = 'pad';
        initAudio();
    }
    // The opening video: any button skips it, and that press is not also a game button
    if (introVideo.isUp()) { if (held.some(Boolean)) introVideo.dismiss(); padPrev = held; return; }
    const nav = stickNavStep(gp);   // (tracked all the time, so a stick already held when a menu opens doesn't fire at once)

    // View (⧉) is the combo button: hold it and press another button. A quick tap on its own = sound on/off.
    if (held[PAD.BACK] && !menu && state.gamePhase === 'playing') {
        const combo = PAD_COMBOS.find(c => pressed(c.btn));
        if (combo) { combo.run(); padComboUsed = true; }
        if (was[PAD.RB] && !held[PAD.RB]) meleeRelease();   // still let go of a held hit / shield
        if (was[PAD.LB] && !held[PAD.LB]) stopBlock();
        readPadStick(gp, held);
        return;
    }
    if (was[PAD.BACK] && !held[PAD.BACK]) { if (!padComboUsed) toggleMute(); padComboUsed = false; }
    if (menu) {
        if (pressed(PAD.START)) { menu = null; return; }
        if (pressed(PAD.LEFT))  moveMenuCursor(-1, 0);
        if (pressed(PAD.RIGHT)) moveMenuCursor(1, 0);
        if (pressed(PAD.UP))    moveMenuCursor(0, -1);
        if (pressed(PAD.DOWN))  moveMenuCursor(0, 1);
        if (nav)                moveMenuCursor(nav[0], nav[1]);
        if (pressed(PAD.A))     menuSelect(menu.cursor);
        if (pressed(PAD.B) || pressed(PAD.Y)) menu = null;
        return;
    }
    if (pressed(PAD.B) && !state.shopOpen && !state.awardsOpen) { if (state.buildMode) nextBlock(); else useGadget(); }
    if (pressed(PAD.L3)) toggleBuild();
    if (pressed(PAD.LT)) dash();
    if (pressed(PAD.X) && state.room !== ROOM.VOID) castSpell();
    if (pressed(PAD.R3)) toggleMount();
    if (pressed(PAD.RB)) meleePress();
    if (was[PAD.RB] && !held[PAD.RB]) meleeRelease();
    if (pressed(PAD.LB)) startBlock();
    if (was[PAD.LB] && !held[PAD.LB]) stopBlock();
    if (pressed(PAD.X) && state.gamePhase === 'intro') askNewGame();
    if (pressed(PAD.X) && canOpenShop() && !state.shopOpen) setAwardsOpen(!state.awardsOpen);
    if (state.awardsOpen && pressed(PAD.B)) state.awardsOpen = false;
    if (state.awardsOpen) {   // D-pad / stick left-right (or up-down) and A turn the pages; nothing else happens behind the board
        if (pressed(PAD.LEFT) || pressed(PAD.UP))    awardsTurn(-1);
        if (pressed(PAD.RIGHT) || pressed(PAD.DOWN) || pressed(PAD.A)) awardsTurn(1);
        if (nav) awardsTurn(nav[0] + nav[1]);
        return;
    }
    if (pressed(PAD.START)) pressStart();
    if (pressed(PAD.Y) || (state.shopOpen && pressed(PAD.B))) toggleShop();

    if (state.shopOpen) {
        // D-pad / stick flicks move the shop cursor; A buys
        if (pressed(PAD.LEFT))  moveShopCursor(-1, 0);
        if (pressed(PAD.RIGHT)) moveShopCursor(1, 0);
        if (pressed(PAD.UP))    moveShopCursor(0, -1);
        if (pressed(PAD.DOWN))  moveShopCursor(0, 1);
        if (nav)                moveShopCursor(nav[0], nav[1]);
        if (pressed(PAD.A))     shopSelect(state.shopCursor);
        return;
    }

    if (pressed(PAD.A) || pressed(PAD.RT)) pressAction();   // hold A for a charge shot
    if (pressed(PAD.Y) && state.room !== ROOM.VOID) superJump();

    readPadStick(gp, held);
}

function readPadStick(gp, held) {
    let { x, y } = stickVector(gp.axes[0] || 0, gp.axes[1] || 0);
    if (held[PAD.LEFT])  x = -1;
    if (held[PAD.RIGHT]) x = 1;
    if (held[PAD.UP])    y = -1;
    if (held[PAD.DOWN])  y = 1;
    padMove.x = x; padMove.y = y;
}

window.addEventListener('gamepadconnected', () => {   // (hints switch to the controller when a button is really pressed, not on plugging in)
    const many = navigator.getGamepads && Array.from(navigator.getGamepads()).filter(p => p && p.connected).length > 1;
    spawnFloatText(400, 300, many ? '🎮 New controller! Hold any button to join' : '🎮 Controller connected!', '#FFFFFF', 180);
});

// ── VIRTUAL TOUCH CONTROLS ────────────────────────────────────
// Rules for the layout: every button is at least TOUCH_MIN_CSS wide on the real screen (a child's thumb),
// the tap area is exactly the drawn circle, and no two buttons overlap. layoutTouch() places them again
// whenever the window changes, so a small phone gets bigger buttons (in game pixels) than a tablet.
// Sideways phones have spare room left and right of the picture (view.offX): the buttons go there, off the game.
const TOUCH_MIN_CSS  = 48;           // the smallest a button may be on the real screen (about 9 mm)
const TOUCH_R_MIN    = 30;           // …but never smaller than this many game pixels
const TOUCH_R_MAX    = 44;           // …or bigger than this (a tablet would get giant buttons)
const TOUCH_GAP      = 6;            // space between two buttons
const TOUCH_PAD      = 10;           // space between a button and the screen edge
const SHOOT_SIZE     = 1.4;          // the big action button is this many times a normal one
const JOY_SIZE       = 1.4;          // the joystick base, in normal button radii
const JOY_GRAB       = 1.5;          // you can start the stick this far (× its radius) from its middle
const JOYSTICK_DEADZONE_RATIO = 0.2; // fraction of maxDist before movement starts
const VJOY   = { x: 100, y: 490, baseR: 55, maxDist: 40 };
const VSHOOT = { x: 700, y: 490, r: 45 };
const vTouch = { joyId: null, joyDX: 0, joyDY: 0, joyOriX: 0, joyOriY: 0, shootId: null, meleeId: null, blockId: null };
const VMELEE = { x: 620, y: 350, r: 22 };
const VBLOCK = { x: 760, y: 350, r: 20 };
const VJUMP  = { x: 560, y: 405, r: 20 };
let buildFlash = null;   // the block a finger just tapped in build mode: { cx, cy, t, ok }
const BUILD_FLASH_FRAMES = 24;

function touchR() { return Math.max(TOUCH_R_MIN, Math.min(TOUCH_R_MAX, TOUCH_MIN_CSS / 2 / view.fit)); }
function inBtn(x, y, b) { return Math.hypot(x - b.x, y - b.y) <= b.r; }
function joyGrabR() { return VJOY.baseR * JOY_GRAB; }
// A flat on-screen button (SHOP, AWARDS, NEW GAME…) gets a taller tap area on a phone, so a thumb can hit it
function tapRect(r) {
    if (!usesTouchLayout()) return r;
    const need = TOUCH_MIN_CSS / view.fit, padX = Math.max(0, (need - r.w) / 2), padY = Math.max(0, (need - r.h) / 2);
    return { x: r.x - padX, y: r.y - padY, w: r.w + 2 * padX, h: r.h + 2 * padY };
}

// Thumb-friendly places. Right thumb: the big button with PUNCH beside it, JUMP above it and BLOCK
// between them; then two columns of extras going up. Left thumb: the joystick, with the silly buttons above it.
function layoutTouch() {
    layoutDirty = false;
    const tr = touchR(), step = 2 * tr + TOUCH_GAP;
    const xL = -view.offX + TOUCH_PAD, xR = GAME_W + view.offX - TOUCH_PAD, yB = GAME_H - TOUCH_PAD;
    VJOY.baseR = Math.round(tr * JOY_SIZE); VJOY.maxDist = Math.round(tr);
    VJOY.x = xL + VJOY.baseR; VJOY.y = yB - VJOY.baseR;
    const sr = VSHOOT.r = Math.round(tr * SHOOT_SIZE);
    VSHOOT.x = xR - sr; VSHOOT.y = yB - sr;
    for (const b of [VMELEE, VBLOCK, VJUMP, VSILLY, VDANCE, VFART, VBUILD, VSPELL, VMOUNT, VGOD, VDASH, VGADGET, MUTE_BTN, SETTINGS_BTN]) b.r = tr;
    VMELEE.x = VSHOOT.x - sr - tr - TOUCH_GAP;   VMELEE.y = yB - tr;
    VJUMP.x  = xR - tr;                          VJUMP.y  = VSHOOT.y - sr - tr - TOUCH_GAP;
    VBLOCK.x = VMELEE.x;                         VBLOCK.y = VJUMP.y;
    const col1 = VJUMP.x, col2 = VMELEE.x, up = k => VJUMP.y - k * step;
    [[VDASH, 1], [VGADGET, 2], [VSPELL, 3], [VGOD, 4]].forEach(([b, k]) => { b.x = col1; b.y = up(k); });
    [[VBUILD, 1], [VMOUNT, 2]].forEach(([b, k]) => { b.x = col2; b.y = up(k); });
    const first = VJOY.y - joyGrabR() - tr - TOUCH_GAP;
    [VDANCE, VFART, VSILLY, SETTINGS_BTN, MUTE_BTN].forEach((b, k) => { b.x = xL + tr; b.y = first - k * step; });
}

// Everything round on screen right now: [button, icon, held?]. Drawing and the tests both use this.
function touchButtonList() {
    const list = [[VSHOOT, '', vTouch.shootId !== null],
                  [VMELEE, '👊', vTouch.meleeId !== null], [VBLOCK, '🛡', vTouch.blockId !== null], [VJUMP, '🦘', false],
                  [VDANCE, '💃', false], [VFART, '💨', false], [VSILLY, sillyTurn % 2 ? '🤧' : '🫢', false],
                  [SETTINGS_BTN, '⚙', false], [MUTE_BTN, muted ? '🔇' : '🔊', false],
                  [VBUILD, state.buildMode ? '⚔' : '🧱', state.buildMode]];
    if (state.spell) list.push([VSPELL, SPELLS.find(x => x.id === state.spell).icon, false]);
    if (godParent()) list.push([VGOD, nextGodPower().icon, false]);
    if (state.lastMount) list.push([VMOUNT, state.mount ? '🚶' : MOUNTS.find(m => m.id === state.lastMount).icon, !!state.mount]);
    if (state.buildMode) list.push([VGADGET, '🔄', false]);
    else if (state.gadget) list.push([VGADGET, GADGETS.find(g => g.id === state.gadget).icon, false]);
    if (state.hasDash) list.push([VDASH, '⚡', false]);
    return list;
}

// The touch buttons are only there while you are playing and nothing is covering them
function touchUiShown() {
    return isTouchDevice && state.gamePhase === 'playing' && !state.won && !state.levelComplete
        && !menu && !state.shopOpen && !state.awardsOpen && !race && !petBattle && !tvShow && !credits && !danceBattle;
}

function canvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let x = (clientX - rect.left) * (view.w  / rect.width);
    let y = (clientY - rect.top)  * (GAME_H / rect.height);
    if (mod('upsideDown') !== mod('mirror')) x = view.w - x;   // the picture may be turned or mirrored
    if (mod('upsideDown')) y = GAME_H - y;
    return { x: x - view.offX, y };
}

// Build mode, finger on the world: mine the block under it, or place the chosen block on an empty spot
// (the same rules as a mouse click). Returns true if the tap was used.
function touchBuildTap(p) {
    if (!state.buildMode || state.gamePhase !== 'playing' || menu || state.shopOpen || state.won || state.levelComplete) return false;
    if (p.x < 0 || p.x > GAME_W || p.y < 0 || p.y > GAME_H) return false;
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (Math.hypot(p.x - player.x, p.y - player.y) > BUILD_REACH) {
        buildFlash = { cx, cy, t: BUILD_FLASH_FRAMES, ok: false };
        spawnFloatText(p.x, p.y, 'Come closer!', '#FFFFFF', 40);
        return true;
    }
    buildFlash = { cx, cy, t: BUILD_FLASH_FRAMES, ok: true };
    buildAt(cx, cy, p.x, p.y);
    return true;
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!isTouchDevice) { isTouchDevice = true; fitCanvas(); }   // (the first touch: the side margins appear)
    if (layoutDirty) layoutTouch();
    initAudio();
    lastInput = 'touch';
    for (const t of e.changedTouches) {
        const p = canvasPos(t.clientX, t.clientY);
        if (state.gamePhase === 'playing' && !menu && !state.shopOpen) {   // the fighting buttons can be held
            if (inBtn(p.x, p.y, VMELEE)) { vTouch.meleeId = t.identifier; meleePress(); continue; }
            if (inBtn(p.x, p.y, VBLOCK)) { vTouch.blockId = t.identifier; startBlock(); continue; }
            if (inBtn(p.x, p.y, VJUMP))  { superJump(); continue; }
        }
        if (handleTap(p.x, p.y)) continue;
        const onJoy = Math.hypot(p.x - VJOY.x, p.y - VJOY.y) < joyGrabR(), onShoot = inBtn(p.x, p.y, VSHOOT);
        if (vTouch.joyId === null && onJoy) {
            vTouch.joyId = t.identifier; vTouch.joyOriX = p.x; vTouch.joyOriY = p.y;
            vTouch.joyDX = 0; vTouch.joyDY = 0;
        } else if (vTouch.shootId === null && onShoot) {
            vTouch.shootId = t.identifier;
            pressAction();
        } else if (!onJoy && !onShoot) {
            touchBuildTap(p);   // a tap on the world itself (never on a button or the stick)
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier !== vTouch.joyId) continue;
        const p = canvasPos(t.clientX, t.clientY);
        const rawDX = p.x - vTouch.joyOriX, rawDY = p.y - vTouch.joyOriY;
        const dist = Math.hypot(rawDX, rawDY);
        const clamped = Math.min(dist, VJOY.maxDist);
        vTouch.joyDX = dist > 0 ? (rawDX / dist) * clamped : 0;
        vTouch.joyDY = dist > 0 ? (rawDY / dist) * clamped : 0;
    }
}, { passive: false });

function clearTouchId(id) {
    if (id === vTouch.joyId)   { vTouch.joyId = null; vTouch.joyDX = 0; vTouch.joyDY = 0; }
    if (id === vTouch.shootId) { vTouch.shootId = null; }
    if (id === vTouch.meleeId) { vTouch.meleeId = null; meleeRelease(); }
    if (id === vTouch.blockId) { vTouch.blockId = null; stopBlock(); }
}
// (iOS counts the finger LIFTING as the tap that allows sound: so the audio is unlocked here too)
canvas.addEventListener('touchend',    e => { e.preventDefault(); initAudio(); for (const t of e.changedTouches) clearTouchId(t.identifier); }, { passive: false });
canvas.addEventListener('touchcancel', e => { e.preventDefault(); for (const t of e.changedTouches) clearTouchId(t.identifier); }, { passive: false });
document.addEventListener('pointerup', () => initAudio());

// ── DRAW: TOUCH CONTROLS ───────────────────────────────────
function drawVirtualControls() {
    if (!touchUiShown() || paused) return;
    if (layoutDirty) layoutTouch();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Joystick: drawn where the finger really is (the stick starts wherever you first touch)
    const held = vTouch.joyId !== null;
    const jx = held ? vTouch.joyOriX : VJOY.x, jy = held ? vTouch.joyOriY : VJOY.y;
    ctx.beginPath(); ctx.arc(jx, jy, VJOY.baseR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(jx + vTouch.joyDX, jy + vTouch.joyDY, VJOY.baseR * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke();

    // Round buttons: lit up while a finger holds them
    for (const [b, icon, on] of touchButtonList()) {
        const big = b === VSHOOT;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = big ? (on ? 'rgba(255,220,50,0.45)' : 'rgba(255,220,50,0.18)') : (on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)'); ctx.fill();
        ctx.strokeStyle = big ? 'rgba(255,220,50,0.8)' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
        if (!icon) continue;
        ctx.fillStyle = '#FFF'; ctx.font = `${Math.round(b.r * 0.95)}px Arial`; ctx.fillText(icon, b.x, b.y + 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = `bold ${Math.round(VSHOOT.r * 0.3)}px Arial`;
    ctx.fillText(state.buildMode ? 'PLACE' : (nearbyDigSpot() && canDig()) || nearbyGem() ? 'DIG' : nearbyNpc() ? 'TALK' : nearbyMineable() ? 'MINE'
                 : nearbyCrop() ? 'WATER' : atFishingSpot() ? 'FISH' : wouldDigGround() ? 'DIG' : state.power === POWER.NONE ? 'SWING' : 'SHOOT', VSHOOT.x, VSHOOT.y);

    ctx.restore();
}

