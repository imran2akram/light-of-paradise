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
const shot = () => ({ x: player.x, y: player.y, dx: 0, dy: 0, r: 6, life: 50, color: '#f00', enemyType: 'devil' });

startFromIntro(true);
loop();   // one normal frame to settle

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

const failed = results.filter(([, p]) => p).length;
console.log(failed ? failed + ' scenario(s) failed' : 'all ' + results.length + ' scenarios passed');
process.exitCode = failed ? 1 : 0;
`;
loadGame({ driver, ...opts });
