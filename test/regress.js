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

const failed = results.filter(([, p]) => p).length;
console.log(failed ? failed + ' scenario(s) failed' : 'all ' + results.length + ' scenarios passed');
process.exitCode = failed ? 1 : 0;
`;
loadGame({ driver, ...opts });
