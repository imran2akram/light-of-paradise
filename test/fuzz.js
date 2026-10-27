// Random-play fuzz test: plays the game headlessly with random keys, taps,
// controller input, menu picks and room changes, and fails if any frame throws
// or the main loop stops. Exits 1 when something went wrong.
//
//   node test/fuzz.js                       one seed, 30k frames (~8 min of play)
//   node test/fuzz.js --seed 7 --frames 100000
//   node test/fuzz.js --canvas              real drawing via node-canvas (npm i canvas)
//
// Run several seeds: for s in 1 2 3 4; do node test/fuzz.js --seed $s; done
'use strict';
const { loadGame, parseArgs } = require('./headless');
const opts = parseArgs(process.argv.slice(2), { seed: 1, frames: 30000, realCanvas: false });

// Runs inside the game's own scope (see headless.js)
const driver = String.raw`
const CODES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'Enter', 'KeyB', 'KeyP', 'KeyJ', 'KeyX', 'KeyC',
               'KeyO', 'KeyR', 'KeyV', 'KeyQ', 'ShiftLeft', 'KeyE', 'KeyH', 'Escape', 'KeyG', 'KeyT', 'KeyK', 'KeyF', 'KeyU', 'KeyI', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit9'];
const ROOMS = Object.values(ROOM);
const ev = extra => ({ preventDefault() {}, stopPropagation() {}, repeat: false, ...extra });
const fire  = (name, e) => { for (const f of (__h.listeners[name] || [])) f(e); };
const cfire = (name, e) => { for (const f of (canvasListeners[name] || [])) f(e); };
const errors = {};
let frame = 0, errCount = 0;
function report(where, e) {
    const key = where + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
    if (!errors[key]) { errors[key] = 0; console.log('\n[frame ' + frame + '] room=' + state.room + ' phase=' + state.gamePhase + ' ' + where + '\n' + (e && e.stack || e)); }
    errors[key]++; errCount++;
}
function act(where, f) { try { f(); } catch (e) { report(where, e); } }
console.error = (msg, e) => report('console.error ' + msg, e);   // loop() logs instead of crashing: still a failure here

startFromIntro(true);
state.coins = 5000;
const held = new Set();
let early = 0n, late = 0n;
for (frame = 0; frame < __h.frames; frame++) {
    const r = Math.random();
    if (r < 0.05) { const c = CODES[Math.floor(Math.random() * CODES.length)]; held.add(c); act('keydown ' + c, () => fire('keydown', ev({ code: c }))); }
    if (r > 0.95 && held.size) { const c = [...held][0]; held.delete(c); act('keyup ' + c, () => fire('keyup', ev({ code: c }))); }
    if (Math.random() < 0.01)  act('pressAction', pressAction);
    if (Math.random() < 0.004) act('pressStart', pressStart);
    if (Math.random() < 0.01)  { const x = Math.random() * 800, y = Math.random() * 600; act('click', () => cfire('click', ev({ clientX: x, clientY: y }))); }
    if (Math.random() < 0.004) { const x = Math.random() * 800, y = Math.random() * 600; act('contextmenu', () => cfire('contextmenu', ev({ clientX: x, clientY: y, button: 2 }))); }
    if (Math.random() < 0.004) { const x = Math.random() * 800, y = Math.random() * 600, t = id => ({ identifier: id, clientX: x, clientY: y });
        act('touch', () => { cfire('touchstart', ev({ changedTouches: [t(7)], touches: [] })); cfire('touchmove', ev({ changedTouches: [{ ...t(7), clientX: x + 20 }], touches: [] })); cfire('touchend', ev({ changedTouches: [t(7)], touches: [] })); }); }
    if (menu && Math.random() < 0.05) act('menuSelect', () => menuSelect(Math.floor(Math.random() * 12)));
    if (menu && Math.random() < 0.02) menu = null;
    if (state.shopOpen && Math.random() < 0.05) act('shopSelect', () => shopSelect(Math.floor(Math.random() * 12)));
    if (Math.random() < 0.002)  { const d = ROOMS[Math.floor(Math.random() * ROOMS.length)]; act('changeRoom ' + d, () => changeRoom(d)); }
    if (Math.random() < 0.0005) act('advanceLevel', advanceLevel);
    if (Math.random() < 0.001)  { player.x = Math.random() * 800; player.y = Math.random() * 600; }
    if (Math.random() < 0.002)  state.playerHp = 1;   // die often: respawning is where room state gets swapped out
    if (Math.random() < 0.003) {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: Math.random() < 0.15, value: 0 }));
        __h.pads = [{ connected: true, index: 0, buttons, axes: [Math.random() * 2 - 1, Math.random() * 2 - 1, 0, 0], id: 'pad' }];
    } else if (Math.random() < 0.003) __h.pads = [];
    __h.audioTime += 1 / 60;
    if (frame % 3 === 0) for (const f of __h.intervals) act('interval', f);   // musicTick runs every 50ms
    const cb = __h.rafCb;
    if (!cb) { report('loop', new Error('LOOP DIED: requestAnimationFrame was not re-armed')); break; }
    __h.rafCb = null;
    const t0 = process.hrtime.bigint();
    try { cb(); } catch (e) { report('loop', e); }
    const dt = process.hrtime.bigint() - t0;
    if (frame < 5000) early += dt; else if (frame >= __h.frames - 5000) late += dt;
}
const sizes = { particles, floatTexts, projectiles, enemyProjectiles, heartPickups, bolts, gadgetObjs, clones, chickens, fightFx: fight.fx,
                roomEnemies: roomEnemies(), bgCache: Object.keys(bgCache), saveBytes: JSON.stringify(Object.fromEntries(SAVE_FIELDS.map(k => [k, state[k]]))) };
console.log('sizes at end: ' + JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, v.length]))));
console.log('frame time: first 5000 avg ' + (Number(early) / 5000 / 1000 | 0) + 'us, last 5000 avg ' + (Number(late) / 5000 / 1000 | 0) + 'us');
console.log('seed ' + __h.seed + (__h.realCanvas ? ' (real canvas)' : '') + ': ' + frame + ' frames, ' + errCount + ' errors, ' + Object.keys(errors).length + ' distinct');
for (const [k, n] of Object.entries(errors)) console.log('  x' + n + '  ' + k.slice(0, 220));
process.exitCode = errCount ? 1 : 0;
`;
loadGame({ driver, ...opts });
