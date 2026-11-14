// Deterministic regression scenarios for bugs that froze the game.
// Each scenario sets up an exact situation and runs a frame or two.
//   node test/regress.js [--canvas] [--game path/to/old/index.html]
'use strict';
const { loadGame, parseArgs } = require('./headless');
const opts = parseArgs(process.argv.slice(2), { seed: 1, realCanvas: false });

const driver = String.raw`
const results = [];
let logged = [];
console.error = (msg, e) => logged.push(msg + ': ' + (e && e.message));
function scenario(name, setup, check) {
    logged = [];
    let threw = null;
    try { setup(); } catch (e) { threw = e; }
    for (let i = 0; i < 3 && !threw; i++) { try { loop(); } catch (e) { threw = e; } }
    const problem = threw ? 'threw: ' + threw.message : logged.length ? 'logged: ' + logged.join('; ') : check();
    results.push([name, problem]);
    console.log((problem ? 'FAIL ' : 'ok   ') + name + (problem ? '  (' + problem + ')' : ''));
}

// A plain check with no extra frames: fn() returns '' when fine, or a description of the problem
function check(name, fn) {
    logged = [];
    let problem;
    try { problem = fn() || ''; } catch (e) { problem = 'threw: ' + e.message; }
    if (!problem && logged.length) problem = 'logged: ' + logged.join('; ');
    results.push([name, problem]);
    console.log((problem ? 'FAIL ' : 'ok   ') + name + (problem ? '  (' + problem + ')' : ''));
}
// Counts update() steps while fn() feeds loop() timestamps
function countSteps(fn) {
    let n = 0; const real = update;
    update = () => { n++; real(); };
    try { fn(); } finally { update = real; }
    return n;
}
const cfire = (name, e) => { for (const f of (canvasListeners[name] || [])) f(e); };
const fire = (name, e) => { for (const f of (__h.listeners[name] || [])) f(e); };
const keyEv = (code, extra) => ({ code, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, repeat: false, ...extra });
const shot = () => ({ x: player.x, y: player.y, dx: 0, dy: 0, r: 6, life: 50, color: '#f00', enemyType: 'devil' });

startFromIntro(true);
loop();   // one normal frame to settle

// A fake controller: only button b is down (-1 = none), stick at (ax, ay)
const padWith = (b, ax = 0, ay = 0) => { __h.pads = [{ connected: true, index: 0, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === b, value: 0 })), axes: [ax, ay, 0, 0], id: 'pad' }]; pollGamepad(); };

// (first, while the opening video is still up: the later scenarios need it gone)
check('any controller button skips the opening video, and that press is not also a game button', () => {
    if (!introVideo.isUp()) return 'video overlay was not up';
    state.gamePhase = 'intro';
    padWith(-1); if (!introVideo.isUp()) return 'skipped without a press';
    padWith(PAD.A);
    const started = state.gamePhase !== 'intro';   // it was the title screen: A must not have started the game
    state.gamePhase = 'playing';
    __h.pads = []; pollGamepad();
    return introVideo.isUp() ? 'the button did not skip the video' : started ? 'the same press also started the game' : '';
});


scenario('die to a fireball with two more in flight', () => {
    changeRoom(ROOM.HELL);
    state.playerHp = 1; state.playerInvincible = 0; state.bubble = false;
    enemyProjectiles.push(shot(), shot(), shot());
}, () => state.room !== ROOM.VOID ? 'not sent back to the Void' : state.playerHp < fullHearts() ? 'hearts not refilled' : '');

scenario('die in the jungle pit', () => {
    changeRoom(ROOM.JUNGLE);
    state.playerHp = 1; state.playerInvincible = 0; state.bubble = false; state.mount = null;
    player.x = JUNGLE_PIT.x + JUNGLE_PIT.w / 2; player.y = JUNGLE_PIT.y + JUNGLE_PIT.h / 2 - 10;
}, () => state.room !== ROOM.VOID ? 'not sent back to the Void' : '');

scenario('every room draws', () => {
    for (const r of Object.values(ROOM)) { changeRoom(r); loop(); }
}, () => '');

scenario('dig-spot mole comes up far away and warns first', () => {
    changeRoom(ROOM.HELL);
    state.playerHp = 3; state.playerInvincible = 0; state.bubble = false;
    const spot = hell.digSpots[0];
    for (let i = 0; i < 30; i++) {
        player.x = spot.x; player.y = spot.y;
        hell.enemies = [];
        spawnMole(spot);
        const m = hell.enemies[0];
        if (Math.hypot(m.x - player.x, m.y - player.y) < MOLE_MIN_DIST) throw new Error('mole too close: ' + Math.round(Math.hypot(m.x - player.x, m.y - player.y)));
        if (m.x < 0 || m.x > 800 || m.y < 0 || m.y > 600) throw new Error('mole outside the room');
    }
    // Walk the mole onto the player during its warning: it must not hurt
    hell.enemies = []; spawnMole(spot);
    const m = hell.enemies[0];
    m.x = player.x; m.y = player.y;
    state.hp = state.playerHp;
}, () => {
    const m = hell.enemies[0], hp0 = state.playerHp;
    for (let i = 0; i < 40; i++) updateRoomEnemies();
    if (state.playerHp < hp0) return 'mole hurt the player during the warning';
    if (!(m.warn > 0)) return 'warning ended too early';
    if (targetableEnemies().includes(m)) return 'mole can be hit during the warning';
    return '';
});

scenario('smiting stick hurts a monster with no element', () => {
    changeRoom(ROOM.HELL);
    state.power = POWER.NONE; fight.cooldown = 0; state.buildMode = false; state.weaponLevel = 1;
    player.x = 400; player.y = 300; state.faceX = -1; state.faceY = 0;   // facing away: auto-aim must turn us
    const e = makeEnemy('slime', 430, 300, 0, 0); e.emerge = 0; e.hp = 3; e.maxHp = 3; e.hopTimer = 999;
    hell.enemies = [e]; hell.devil.alive = false;
    globalThis.__stickFoe = e;
    pressAction();
}, () => {
    const e = globalThis.__stickFoe;
    if (e.hp >= 3) return 'stick did no damage';
    if (state.ammo !== state.ammoMax) return 'stick used ammo';
    if (fight.cooldown <= 0 && !fight.fx.length) return 'no swing happened';
    return '';
});

// Is there a walkable path from the maze start to the treasure? (cells without a block)
const mazeConnected = b => {
    const c = p => [Math.floor(p.x / CELL), Math.floor(p.y / CELL)];
    const [sx, sy] = c(MAZE_START), [gx, gy] = c(MAZE_GOAL), seen = new Set([cellKey(sx, sy)]), todo = [[sx, sy]];
    while (todo.length) {
        const [x, y] = todo.pop();
        if (x === gx && y === gy) return true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = cellKey(x + dx, y + dy);
            if (x + dx < 0 || x + dx > 33 || y + dy < 0 || y + dy > 24 || b[k] || seen.has(k)) continue;
            seen.add(k); todo.push([x + dx, y + dy]);
        }
    }
    return false;
};

scenario('maze walls: start connects to the goal in 200 mazes', () => {
    globalThis.__bad = 0;
    for (let i = 0; i < 200; i++) if (!mazeConnected(makeMazeBlocks())) globalThis.__bad++;
}, () => globalThis.__bad ? globalThis.__bad + ' unsolvable mazes' : '');

scenario('maze walls cannot be mined, even with a diamond pickaxe or in Creative', () => {
    delete worldBlocks.maze; changeRoom(ROOM.MAZE); roomBlocks();
    const key = Object.keys(worldBlocks.maze).find(k => worldBlocks.maze[k].type === 'mazeStone');
    const [cx, cy] = key.split(',').map(Number);
    globalThis.__wall = [];
    for (const mode of ['normal', 'pickaxe', 'creative']) {
        state.diamondPickaxe = mode === 'pickaxe'; settings.creative = mode === 'creative';
        for (let i = 0; i < 12; i++) buildAt(cx, cy);
        globalThis.__wall.push(!!blockAtCell(cx, cy));
    }
    blastBlocks(cx * CELL + 12, cy * CELL + 12, 3);
    globalThis.__wall.push(!!blockAtCell(cx, cy));
    state.diamondPickaxe = false; settings.creative = false;
}, () => globalThis.__wall.every(Boolean) ? '' : 'a maze wall was removed: ' + globalThis.__wall);

scenario('minotaur coins land only where the player can walk', () => {
    globalThis.__coinProblem = '';
    for (let n = 0; n < 20 && !globalThis.__coinProblem; n++) {
        delete worldBlocks.maze; changeRoom(ROOM.MAZE); roomBlocks();
        player.x = MAZE_START.x; player.y = MAZE_START.y; frameNo += 1;
        const m = place().enemies[0];
        m.emerge = 0; m.hp = 1; m.x = 100 + Math.random() * 600; m.y = 100 + Math.random() * 400;   // anywhere, even inside a wall
        place().coins = [];
        damageEnemy(m, POWER.RAINBOW);
        const coins = place().coins;
        if (coins.length !== 30) { globalThis.__coinProblem = 'expected 30 coins, got ' + coins.length; break; }
        // Independent check: flood the maze (walls only) from the player's cell
        const b = worldBlocks.maze, seen = new Set([cellKey(Math.floor(player.x / CELL), Math.floor(player.y / CELL))]), todo = [...seen].map(k => k.split(',').map(Number));
        while (todo.length) {
            const [x, y] = todo.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = cellKey(x + dx, y + dy);
                if (x + dx < 0 || x + dx > 34 || y + dy < 0 || y + dy > 25 || b[k] || seen.has(k)) continue;
                seen.add(k); todo.push([x + dx, y + dy]);
            }
        }
        for (const c of coins) {
            if (solidAt(c.x, c.y)) { globalThis.__coinProblem = 'coin inside a wall'; break; }
            if (playerHitsBlock(c.x, c.y)) { globalThis.__coinProblem = 'player body cannot stand on a coin'; break; }
            if (!seen.has(cellKey(Math.floor(c.x / CELL), Math.floor(c.y / CELL)))) { globalThis.__coinProblem = 'coin in a sealed pocket'; break; }
        }
        if (new Set(coins.map(c => Math.round(c.x) + ',' + Math.round(c.y))).size < 25) globalThis.__coinProblem = 'coins stacked on a few pixels';
    }
}, () => globalThis.__coinProblem);


check('game speed is 60 steps a second on 144 Hz, 60 Hz and 30 Hz screens', () => {
    changeRoom(ROOM.VOID);
    const run = hz => countSteps(() => { resetFrameClock(); let t = 10000; loop(t); for (let i = 0; i < hz; i++) { t += 1000 / hz; loop(t); } });
    const out = [];
    for (const hz of [144, 120, 60, 30, 75]) { const n = run(hz); if (Math.abs(n - 60) > 2) out.push(hz + ' Hz ran ' + n + ' steps'); }
    return out.join('; ');
});

check('a long gap does not fast-forward the game', () => {
    changeRoom(ROOM.VOID);
    resetFrameClock(); loop(1000); loop(1016.7);
    const gap = countSteps(() => loop(1016.7 + 5000));     // tab was hidden for 5 s
    const slow = countSteps(() => loop(1016.7 + 5000 + 120));   // one slow frame: catches up, but only a little
    if (gap > 1) return 'a 5 s gap ran ' + gap + ' steps';
    if (slow > 4) return 'a slow frame ran ' + slow + ' steps';
    return '';
});

check('loop() with no timestamp is exactly one step', () => {
    const n = countSteps(() => { loop(); loop(); loop(); });
    return n === 3 ? '' : 'ran ' + n + ' steps for 3 frames';
});


check('the world stands still while a menu, the shop or awards are open, then carries on', () => {
    changeRoom(ROOM.HELL); hell.devil.alive = true;
    const advances = () => { const f = frameNo; for (let i = 0; i < 5; i++) loop(); return frameNo - f; };
    const out = [];
    openMenu('TEST', () => [{ icon: '?', name: 'x', desc: '', cost: 0, status: null, action() {} }]);
    if (advances()) out.push('world ran under a menu');
    menu = null;
    if (!advances()) out.push('world did not resume after the menu');
    state.shopOpen = true; if (advances()) out.push('world ran under the shop'); state.shopOpen = false;
    state.awardsOpen = true; if (advances()) out.push('world ran under awards'); state.awardsOpen = false;
    if (!advances()) out.push('world did not resume after the overlays');
    return out.join('; ');
});

check('hidden tab or lost focus: world stops, held input and audio are cleared, then resume', () => {
    changeRoom(ROOM.VOID); initAudio();
    const advances = () => { const f = frameNo; for (let i = 0; i < 5; i++) loop(); return frameNo - f; };
    const out = [];
    keys.KeyW = true; keys.Space = true; vTouch.joyId = 4; vTouch.joyDX = 20; vTouch.shootId = 5; fight.charge = 30; fight.blocking = true; fight.holding = true;
    document.hidden = true; fire('visibilitychange', {});
    if (Object.values(keys).some(Boolean)) out.push('keys stayed held');
    if (vTouch.joyId !== null || vTouch.joyDX || vTouch.shootId !== null) out.push('touch controls stayed held');
    if (fight.charge || fight.blocking || fight.holding) out.push('charge / block stayed on');
    if (audioCtx.state !== 'suspended') out.push('audio kept playing');
    if (advances()) out.push('world ran while hidden');
    document.hidden = false; fire('visibilitychange', {});
    if (!advances()) out.push('world did not resume');
    if (audioCtx.state !== 'running') out.push('audio did not resume');
    keys.KeyD = true; fight.charge = 12;
    fire('blur', {});
    if (keys.KeyD || fight.charge) out.push('blur did not clear input');
    if (advances()) out.push('world ran while blurred');
    fire('focus', {});
    if (!advances()) out.push('world did not resume after focus');
    return out.join('; ');
});

check('Ctrl / Cmd / Alt shortcuts are not game buttons', () => {
    state.buildMode = false; for (const k of Object.keys(keys)) keys[k] = false;
    for (const m of ['ctrlKey', 'metaKey', 'altKey']) { fire('keydown', keyEv('KeyB', { [m]: true })); fire('keydown', keyEv('KeyW', { [m]: true })); }
    const bad = state.buildMode || keys.KeyW;
    fire('keydown', keyEv('KeyB', {})); const worked = state.buildMode;
    fire('keydown', keyEv('KeyB', {})); fire('keyup', keyEv('KeyB', {}));
    return bad ? 'a shortcut pressed a game key' : worked ? '' : 'plain B no longer builds';
});


check('New Game asks first when there is a save (keyboard, tap, controller) and Keep leaves it intact', () => {
    const out = [];
    state.gamePhase = 'playing'; state.coins = 77; saveGame();
    const saved = JSON.stringify(savedGame), stored = localStorage.getItem('lop_save');
    if (!savedGame) return 'no save to test with';
    const toTitle = () => { menu = null; state.gamePhase = 'intro'; };
    // keyboard N
    toTitle(); fire('keydown', keyEv('KeyN'));
    if (!menu || state.gamePhase !== 'intro') out.push('N started over without asking');
    if (savedGame === null || localStorage.getItem('lop_save') !== stored) out.push('save touched before the answer');
    if (menu && menu.cursor !== 0) out.push('default is not Keep');
    fire('keydown', keyEv('Space'));   // the default: Keep my game
    if (menu || state.gamePhase !== 'intro' || JSON.stringify(savedGame) !== saved || localStorage.getItem('lop_save') !== stored) out.push('Keep changed something');
    // tap on the New Game button
    toTitle(); handleTap(NEW_GAME_BTN.x + 5, NEW_GAME_BTN.y + 5);
    if (!menu) out.push('tap started over without asking');
    else if (handleTap(menu ? menuItemRect(0).x + 5 : 0, menuItemRect(0).y + 5) !== true || menu || savedGame === null) out.push('tapping Keep failed');
    // controller X, then B backs out
    toTitle(); padWith(-1);   // (a neutral poll first: the first one after a pause only syncs)
    padWith(PAD.X);
    if (!menu) out.push('controller X started over without asking');
    padWith(-1); padWith(PAD.B); __h.pads = []; pollGamepad();
    if (menu || savedGame === null) out.push('controller B did not back out');
    // Start over really starts over
    toTitle(); fire('keydown', keyEv('KeyN')); fire('keydown', keyEv('ArrowRight')); fire('keydown', keyEv('ArrowDown')); menuSelect(1);
    if (savedGame !== null || localStorage.getItem('lop_save') !== null || state.gamePhase !== 'playing') out.push('Start over did not start over');
    // no save: no question
    toTitle(); fire('keydown', keyEv('KeyN'));
    if (menu || state.gamePhase !== 'playing') out.push('asked even with no save');
    return out.join('; ');
});

check('hotbar and job survive a reload; old or broken saves still load', () => {
    const out = [];
    changeRoom(ROOM.PARADISE); startJob(makeJob('farmer')); state.hotbar = 5; saveGame();
    const wantCount = state.job.count;
    state.gamePhase = 'intro'; startFromIntro();
    if (state.hotbar !== 5) out.push('hotbar lost');
    if (!state.job || state.job.kind !== 'water' || paradise.crops.filter(c => c.thirsty).length !== wantCount) out.push('job not restored with its thirsty crops');
    for (const bad of [undefined, { kind: 'nope' }, { kind: 'apples', giver: 'x', pay: 1 }, 'text']) {
        const d = JSON.parse(JSON.stringify(savedGame)); delete d.hotbar; if (bad === undefined) delete d.job; else d.job = bad; savedGame = d;
        state.gamePhase = 'intro'; startFromIntro();
        if (state.job || state.hotbar !== 0) out.push('broken save gave job ' + JSON.stringify(state.job) + ' hotbar ' + state.hotbar);
    }
    saveEverything(); document.hidden = true; fire('visibilitychange', {}); document.hidden = false; fire('visibilitychange', {});
    clearSave(); fire('pagehide', {});
    if (!savedGame) out.push('pagehide did not save');
    return out.join('; ');
});


check('walking into a room is safe for the first second (night boss at the Paradise arrival, Treehouse, Under the bed)', () => {
    const out = [];
    const hurtIn = (room, prep) => {
        changeRoom(room);
        if (prep) prep();
        state.playerHp = 3; state.bubble = false; state.invisible = 0; settings.creative = false;
        for (let i = 0; i < 60; i++) loop();
        return state.playerHp < 3 || state.room !== room;
    };
    if (hurtIn(ROOM.PARADISE, () => {
        paradise.phase = 'night';
        const king = makeEnemy('king', 400, 330, 0, 0); Object.assign(king, { r: 40, coinDrop: 15 });
        const ghost = makeEnemy('ghostking', 400, 290, 0, 0); Object.assign(ghost, { r: 34, phase: 0 });
        paradise.enemies = [king, ghost];
    })) out.push('hurt on arriving in Paradise at night');
    for (const room of [ROOM.TREEHOUSE, ROOM.UNDERBED]) {
        for (let n = 0; n < 10; n++) {
            changeRoom(room);
            for (const e of place().enemies) if (Math.hypot(e.x - player.x, e.y - player.y) < ENTRY_SAFE_DISTANCE - 1) { out.push(room + ': a monster starts ' + Math.round(Math.hypot(e.x - player.x, e.y - player.y)) + ' px away'); n = 99; break; }
        }
        if (hurtIn(room)) out.push('hurt on arriving in ' + room);
    }
    changeRoom(ROOM.VOID); state.playerHp = 1; state.playerInvincible = 0; state.bubble = false;
    damagePlayer(); loop();
    if (state.playerInvincible <= 0 || state.room !== ROOM.VOID) out.push('no protection after respawning');
    return out.join('; ');
});


check('stick flicks move the menu and shop cursors (once per flick, repeating when held)', () => {
    const out = [], item = () => ({ icon: '?', name: 'x', desc: '', cost: 0, status: null, action() {} });
    state.gamePhase = 'playing'; changeRoom(ROOM.VOID); menu = null; state.shopOpen = false;
    openMenu('TEST', () => [item(), item(), item(), item(), item(), item(), item(), item()]);
    padWith(-1);
    padWith(-1, 1, 0);   if (menu.cursor !== 1) out.push('right flick: cursor ' + menu.cursor);
    padWith(-1, 1, 0.1); if (menu.cursor !== 1) out.push('held stick moved at once: ' + menu.cursor);
    for (let i = 0; i < STICK_NAV_REPEAT_FIRST + STICK_NAV_REPEAT_EVERY; i++) padWith(-1, 1, 0);
    if (menu.cursor !== 3) out.push('held stick did not repeat twice: ' + menu.cursor);
    padWith(-1, 0, 0);   padWith(-1, 0, 1);   if (menu.cursor !== 5) out.push('down flick: cursor ' + menu.cursor);
    padWith(-1, 0, 0);   padWith(-1, 0.4, 0); if (menu.cursor !== 5) out.push('a small push moved the cursor');
    padWith(-1, 0, 0);   padWith(-1, -1, 0);  if (menu.cursor !== 4) out.push('left flick: cursor ' + menu.cursor);
    menu = null; padWith(-1, 0, 0);
    state.shopOpen = true; state.shopCursor = 0;
    padWith(-1, 1, 0);   if (state.shopCursor !== 1) out.push('shop right flick: cursor ' + state.shopCursor);
    padWith(-1, 0, 0);   padWith(-1, 0, 1); if (state.shopCursor !== 9) out.push('shop down flick: cursor ' + state.shopCursor);
    state.shopOpen = false; padWith(-1, 0, 0); __h.pads = []; pollGamepad();
    return out.join('; ');
});

check('radial deadzone: nothing inside the circle, then a smooth ramp from 0 to full', () => {
    const out = [], v = (x, y) => Math.hypot(stickVector(x, y).x, stickVector(x, y).y);
    if (v(0.2, 0.2) !== 0) out.push('diagonal wobble inside the circle moved');
    if (!(v(0.32, 0) > 0 && v(0.32, 0) < 0.1)) out.push('just past the edge is not near 0: ' + v(0.32, 0));
    if (!(v(0.65, 0) > 0.4 && v(0.65, 0) < 0.6)) out.push('halfway push is ' + v(0.65, 0));
    if (Math.abs(v(1, 0) - 1) > 0.001 || v(0.7, 0.7) > 1.001) out.push('full push is off: ' + v(1, 0) + ' / ' + v(0.7, 0.7));
    padWith(-1, 0, 0); padWith(-1, 0.4, 0);
    const slow = padMove.x;
    padWith(-1, 0, 0); __h.pads = []; pollGamepad();
    if (!(slow > 0 && slow < 0.2)) out.push('walking starts at ' + slow);
    return out.join('; ');
});

check('hints follow the device really used', () => {
    const out = [];
    lastInput = 'keyboard'; __h.pads = []; fire('gamepadconnected', {});
    if (lastInput !== 'keyboard') out.push('plugging in a controller changed the hints');
    padWith(-1); padWith(PAD.A); if (lastInput !== 'pad') out.push('a button press did not switch to pad');
    padWith(-1); __h.pads = []; pollGamepad();
    cfire('click', { clientX: 5, clientY: 5, preventDefault() {} }); if (lastInput !== 'keyboard') out.push('a mouse click did not switch to keyboard');
    lastInput = 'pad'; cfire('contextmenu', { clientX: 5, clientY: 5, preventDefault() {}, button: 2 }); if (lastInput !== 'keyboard') out.push('right-click did not switch to keyboard');
    return out.join('; ');
});

check('win and level-complete screens ignore buttons for 1 s, then Space / A / Enter work', () => {
    const out = [];
    const run = n => { for (let i = 0; i < n; i++) loop(); };
    state.gamePhase = 'playing'; changeRoom(ROOM.VOID);
    state.won = true; endScreenFrames = 0; run(5);
    pressAction(); pressStart(); padWith(-1); padWith(PAD.A); padWith(-1);
    if (!state.won) out.push('Play Again fired during the first second');
    run(END_SCREEN_DELAY);
    pressAction();
    if (state.won) out.push('Space / A did not play again after the delay');
    startFromIntro(true); loop();
    state.level = 1; state.levelComplete = true; endScreenFrames = 0; run(5);
    pressAction(); if (!state.levelComplete) out.push('level complete skipped during the first second');
    run(END_SCREEN_DELAY); pressAction();
    if (state.levelComplete) out.push('Space / A did not continue after the delay');
    if (state.gamePhase !== 'playing') startFromIntro(true);
    state.won = false; state.levelComplete = false; changeRoom(ROOM.VOID);
    return out.join('; ');
});


check('blocks cannot be placed on portals, exits, doors, the rocket, race master, Boss Rush gate or shop', () => {
    const out = [], cellOf = o => [Math.floor(o.x / CELL), Math.floor(o.y / CELL)];
    state.gamePhase = 'playing'; settings.creative = false;
    for (const room of Object.values(ROOM)) {
        changeRoom(room); player.x = -500; player.y = -500; goldenPortal = null;
        // 1. everything we know about must be refused
        const spots = [...(PORTALS[room] || []), ...keepClearSpots(room)];
        if (room === ROOM.PARADISE) spots.push(...townNpcs());
        for (const o of spots) {
            const [cx, cy] = o.w ? cellOf({ x: o.x + o.w / 2, y: o.y + o.h / 2 }) : cellOf(o);
            if (canPlaceAt(cx, cy)) out.push(room + ': can build on ' + Math.round(o.x) + ',' + Math.round(o.y));
        }
        // 2. independent: no cell you may build on is close enough to set off an exit
        let hits = 0;
        for (let cy = 2; cy < 25 && hits < 3; cy++) for (let cx = 0; cx < 34; cx++) {
            if (state.room !== room) changeRoom(room);
            if (!canPlaceAt(cx, cy)) continue;
            player.x = cx * CELL + CELL / 2; player.y = cy * CELL + CELL / 2;
            if (updatePlaceExits() || state.room !== room) { hits++; out.push(room + ': an exit can be reached through buildable cell ' + cx + ',' + cy); }
            player.x = -500; player.y = -500;
        }
        if (state.room !== room) changeRoom(room);
    }
    // the feedback for a refused block: a red cross, and nothing is used up
    changeRoom(ROOM.VOID); state.hotbar = 0; state.inv.dirt = 5; state.buildMode = true;
    player.x = ROCKET.x + 90; player.y = ROCKET.y; floatTexts.length = 0;
    const [rx, ry] = cellOf(ROCKET); buildAt(rx, ry);
    if (state.inv.dirt !== 5 || blockAtCell(rx, ry)) out.push('a block was placed on the rocket');
    if (!floatTexts.some(t => t.text === '✖')) out.push('no cross shown when a block is refused');
    state.buildMode = false;
    return out.join('; ');
});

// ── football: a helper and two defenders join the goalie ──
const footballInside = G => [G.mate, ...G.opps].every(a => a.x >= FB_PITCH.x0 && a.x <= FB_PITCH.x1 && a.y >= FB_PITCH.y0 && a.y <= FB_PITCH.y1)
    && G.ball.x >= 0 && G.ball.x <= 800 && G.ball.y >= 80 && G.ball.y <= 580;
function footballStart() { state.gamePhase = 'playing'; settings.creative = false; startFootball(); state.playerHp = fullHearts(); player.x = 200; player.y = 330; return miniGame; }

check('football: entering creates 1 teammate, 2 opponents and a goalie', () => {
    const G = footballStart();
    if (state.room !== ROOM.STADIUM) return 'not in the stadium';
    if (!G.mate || typeof G.mate.x !== 'number') return 'no teammate';
    if (G.opps.length !== 2 || G.opps.some(o => typeof o.x !== 'number')) return 'need exactly 2 opponents';
    if (typeof G.keeper !== 'number') return 'no goalie';
    return footballInside(G) ? '' : 'a player starts off the pitch';
});
check('football: idle and wandering for thousands of frames stays on the pitch and never costs hearts', () => {
    for (const wander of [false, true]) {
        const G = footballStart();
        let dx = 0, dy = 0;
        for (let i = 0; i < 3000; i++) {
            if (wander) {
                if (i % 40 === 0) { const a = Math.random() * 6.28; dx = Math.cos(a) * 4; dy = Math.sin(a) * 4; }
                player.x = Math.max(20, Math.min(780, player.x + dx)); player.y = Math.max(100, Math.min(570, player.y + dy));
            }
            loop();
            if (miniGame !== G) { if (i < 1500) return 'game ended early at ' + i; break; }
            if (!footballInside(G)) return 'someone left the pitch at frame ' + i + (wander ? ' (wandering)' : '');
            if (state.playerHp < fullHearts()) return 'hearts went down at frame ' + i;
            if (!isFinite(G.ball.x + G.ball.y)) return 'ball is NaN';
        }
    }
    return '';
});
check('football: a ball kicked into the goal scores', () => {
    const G = footballStart(); const before = G.goals;
    G.opps.forEach(o => { o.x = 300; o.y = 150; o.recover = 999; }); G.mate.x = 300; G.mate.y = 520; G.mate.recover = 999;
    Object.assign(G.ball, { x: 700, y: 330, vx: 0, vy: 0 }); player.x = 685; player.y = 330;
    G.keeper = 270;
    for (let i = 0; i < 40 && miniGame === G && G.goals === before; i++) loop();
    return G.goals === before + 1 ? '' : 'no goal (goals ' + G.goals + ')';
});
check('football: an opponent touching the loose ball clears it and then rests', () => {
    const G = footballStart(); const o = G.opps[0];
    G.mate.recover = 999; G.opps[1].recover = 999; player.x = 100; player.y = 500;
    Object.assign(G.ball, { x: 500, y: 330, vx: 0, vy: 0 }); Object.assign(o, { x: 510, y: 330, recover: 0, react: 99 });
    loop();
    if (G.ball.vx >= 0) return 'ball was not kicked away from their goal (vx ' + G.ball.vx + ')';
    if (o.recover <= 0) return 'no rest after the tackle';
    return '';
});
check('football: an opponent taking the ball off a dribbler does not hurt', () => {
    const G = footballStart(); const o = G.opps[0];
    G.mate.recover = 999; G.opps[1].recover = 999;
    player.x = 400; player.y = 330; Object.assign(G.ball, { x: 420, y: 330, vx: 0, vy: 0 }); Object.assign(o, { x: 430, y: 330, recover: 0, react: 99 });
    loop();
    if (state.playerHp < fullHearts()) return 'hearts lost';
    return o.recover > 0 ? '' : 'no tackle';
});
check('football: a still ball under a pile of players is popped loose', () => {
    const G = footballStart();
    Object.assign(G.ball, { x: 300, y: 300, vx: 0, vy: 0 });
    for (const a of [G.mate, ...G.opps]) { a.x = 300; a.y = 300; a.recover = 9999; }
    for (let i = 0; i < FB_STUCK_FRAMES + 60 && miniGame === G; i++) {
        player.x = 300; player.y = 360; loop();
        if (Math.hypot(G.ball.vx, G.ball.vy) > 0.5 || Math.hypot(G.ball.x - 300, G.ball.y - 300) > 40) return '';
    }
    return 'ball stayed stuck';
});
check('football: computer players never end up inside a block', () => {
    const G = footballStart(), key = cellKey(Math.floor(580 / CELL), Math.floor(330 / CELL));
    roomBlocks()[key] = { type: 'stone' };
    let bad = '';
    for (let i = 0; i < 1500 && miniGame === G && !bad; i++) { loop(); for (const a of [G.mate, ...G.opps]) if (playerHitsBlock(a.x, a.y)) bad = 'a player is in a block at frame ' + i; }
    delete roomBlocks()[key];
    return bad;
});

const failed = results.filter(([, p]) => p).length;
console.log(failed ? failed + ' scenario(s) failed' : 'all ' + results.length + ' scenarios passed');
process.exitCode = failed ? 1 : 0;
`;
loadGame({ driver, ...opts });
