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

const failed = results.filter(([, p]) => p).length;
console.log(failed ? failed + ' scenario(s) failed' : 'all ' + results.length + ' scenarios passed');
process.exitCode = failed ? 1 : 0;
`;
loadGame({ driver, ...opts });
