// ── BLOCKS (Minecraft-style building & mining, in every room) ──
const CELL = 24;   // one block is 24×24
const BLOCKS = {
    grass:      { name: 'Grass',       hits: 2, drop: 'dirt'    },
    dirt:       { name: 'Dirt',        hits: 2, drop: 'dirt'    },
    stone:      { name: 'Stone',       hits: 4, drop: 'stone'   },
    log:        { name: 'Wood Log',    hits: 3, drop: 'log'     },
    leaves:     { name: 'Leaves',      hits: 1, drop: 'leaves'  },
    planks:     { name: 'Planks',      hits: 3, drop: 'planks'  },
    brick:      { name: 'Bricks',      hits: 4, drop: 'brick'   },
    mazeStone:  { name: 'Maze Wall',   hits: 1, drop: null, unbreakable: true },   // only the maze uses it: never craftable, placeable or dropped
    glass:      { name: 'Glass',       hits: 1, drop: 'glass'   },
    gold:       { name: 'Gold Block',  hits: 4, drop: 'gold'    },
    cloud:      { name: 'Cloud',       hits: 1, drop: 'cloud'   },
    tnt:        { name: 'TNT',         hits: 1, drop: 'tnt'     },
    netherrack: { name: 'Netherrack',  hits: 2, drop: 'stone'   },
    ironOre:    { name: 'Iron Ore',    hits: 5, drop: 'iron'    },
    goldOre:    { name: 'Gold Ore',    hits: 5, drop: 'gold'    },
    diamondOre: { name: 'Diamond Ore', hits: 6, drop: 'diamond' },
};
const HARD_MSG_FRAMES = 60;   // "Too hard!" shows at most this often while you bash an unbreakable block
let lastHardMsg = -999;
function isUnbreakable(b) { return !!(b && BLOCKS[b.type] && BLOCKS[b.type].unbreakable); }
const HOTBAR = ['dirt', 'grass', 'stone', 'log', 'planks', 'brick', 'glass', 'leaves', 'gold', 'cloud', 'tnt'];   // blocks you can place
const MATERIALS = { iron: '⛓ Iron', diamond: '💎 Diamond' };
const BUILD_REACH   = 170;    // how far away you can click to build
const TNT_FUSE      = 90;
const SAVED_WORLDS  = ['void', 'hell', 'paradise', 'heaven', 'house'];   // rooms whose blocks are remembered

let worldBlocks = {};   // room → { "cx,cy": { type, hits } }
let litTnt = [];        // { room, cx, cy, t }
try { worldBlocks = JSON.parse(localStorage.getItem('lop_world')) || {}; } catch (e) {}
let worldDirty = false;

function saveWorld() {
    const keep = {};
    for (const r of SAVED_WORLDS) if (worldBlocks[r]) keep[r] = worldBlocks[r];
    try { localStorage.setItem('lop_world', JSON.stringify(keep)); } catch (e) {}
    worldDirty = false;
}

function cellKey(cx, cy) { return cx + ',' + cy; }
function roomBlocks(room = state.room) {
    if (!worldBlocks[room]) worldBlocks[room] = makeWorldBlocks(room);
    return worldBlocks[room];
}
function blockAtCell(cx, cy) { return roomBlocks()[cellKey(cx, cy)]; }
function blockAtCellIn(room, x, y) { return roomBlocks(room)[cellKey(Math.floor(x / CELL), Math.floor(y / CELL))]; }
function solidAt(x, y) { return !!blockAtCell(Math.floor(x / CELL), Math.floor(y / CELL)); }

// Your body touches a block? (feet-and-body box, a bit smaller than you look)
function playerHitsBlock(px, py) {
    for (const [ox, oy] of [[-8, -6], [8, -6], [-8, 16], [8, 16], [0, 5]]) if (solidAt(px + ox, py + oy)) return true;
    return false;
}

// ── REACHABLE PICKUPS (coins, hearts, eggs… must never land inside a wall or a sealed pocket) ──
const PICKUP_BOUNDS   = { x0: 30, x1: 770, y0: 70, y1: 570 };   // the play area a pickup may sit in
const PICKUP_SEARCH   = 60;    // random tries around the wanted spot, moving further away each time
const PICKUP_STEP     = 4;     // px further out per try (so the search reaches about 240 px)
let reachCache = { key: '', cells: null };

// Cells the player can walk to from where they stand. Walls you can mine away don't
// count as walls (you can always get through those); unbreakable ones do. Null = the room has none.
function reachableCells() {
    const blocks = roomBlocks();
    if (!Object.values(blocks).some(isUnbreakable)) return null;
    const sx = Math.floor(player.x / CELL), sy = Math.floor(player.y / CELL);
    const key = `${frameNo}|${state.room}|${sx},${sy}|${Object.keys(blocks).length}`;
    if (reachCache.key === key) return reachCache.cells;
    const maxX = Math.ceil(800 / CELL), maxY = Math.ceil(600 / CELL), seen = new Set([cellKey(sx, sy)]), todo = [[sx, sy]];
    while (todo.length) {
        const [cx, cy] = todo.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy, k = cellKey(nx, ny);
            if (nx < 0 || ny < 0 || nx > maxX || ny > maxY || seen.has(k) || isUnbreakable(blocks[k])) continue;
            seen.add(k); todo.push([nx, ny]);
        }
    }
    reachCache = { key, cells: seen };
    return seen;
}

// A spot near (x, y) where the player can really walk up and pick something up:
// inside the room, not in a block or a rock, and (in the maze) connected to the player.
// Falls back to opts.fallback, then to the player's own spot.
function reachablePoint(x, y, opts = {}) {
    const B = PICKUP_BOUNDS, reach = reachableCells();
    const ok = (px, py) => px >= B.x0 && px <= B.x1 && py >= B.y0 && py <= B.y1
        && !playerHitsBlock(px, py) && !sceneryAt(px, py)
        && (!reach || reach.has(cellKey(Math.floor(px / CELL), Math.floor(py / CELL))));
    const cx = Math.max(B.x0, Math.min(B.x1, x)), cy = Math.max(B.y0, Math.min(B.y1, y));
    if (ok(cx, cy)) return { x: cx, y: cy };
    for (let i = 1; i <= PICKUP_SEARCH; i++) {
        const a = Math.random() * Math.PI * 2, r = 6 + i * PICKUP_STEP;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (ok(px, py)) return { x: px, y: py };
    }
    if (opts.fallback && ok(opts.fallback.x, opts.fallback.y)) return { x: opts.fallback.x, y: opts.fallback.y };
    return { x: player.x, y: player.y };
}

// The starting blocks in each room: trees in Paradise, ores in Hell and the Underground
function makeWorldBlocks(room) {
    const b = {};
    const put = (cx, cy, type) => { b[cellKey(cx, cy)] = { type, hits: 0 }; };
    const R = Math.random;
    const clear = (x, y) => (PORTALS[room] || []).every(p => Math.hypot(p.x - x, p.y - y) > PORTAL_R + 30)
        && Math.hypot(x - 100, y - 300) > 70 && Math.hypot(x - 400, y - 300) > 70;
    if (room === 'maze') return makeMazeBlocks();
    if (room === 'paradise') {
        for (const [tx, ty] of [[13, 15], [29, 16]]) {   // block trees: a log with leaves all around
            for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) put(tx + dx, ty + dy, dx || dy ? 'leaves' : 'log');
            put(tx, ty + 2, 'log');                      // the trunk you can reach
        }
        put(22, 19, 'stone'); put(23, 19, 'stone'); put(22, 20, 'stone');
    } else if (room === 'hell') {
        let n = 0;
        while (n < 26) {
            const cx = Math.floor(R() * 33), cy = 3 + Math.floor(R() * 22), x = cx * CELL + 12, y = cy * CELL + 12;
            if (!clear(x, y) || inAnyCave(x, y, 10) || b[cellKey(cx, cy)]) continue;
            put(cx, cy, n < 4 ? 'goldOre' : 'netherrack'); n++;
        }
    } else if (room === 'underground') {
        let n = 0;
        while (n < 44) {
            const cx = Math.floor(R() * 33), cy = 3 + Math.floor(R() * 22), x = cx * CELL + 12, y = cy * CELL + 12;
            if (!clear(x, y) || b[cellKey(cx, cy)] || Math.abs(x - 640) < 70) continue;   // leave the dragon room open
            if ([[180, 130], [620, 140], [560, 470]].some(([gx, gy]) => Math.hypot(gx - x, gy - y) < 44)) continue;   // not on the gems
            put(cx, cy, n < 8 ? 'ironOre' : n < 12 ? 'diamondOre' : 'stone'); n++;
        }
    }
    return b;
}

function isCreative() { return settings.creative || state.room === ROOM.HEAVEN; }   // unlimited blocks in Heaven (or Creative Mode)
function invCount(type) { return state.inv[type] || 0; }

// Is it OK to put a block here? (not on you, portals, people, doors, chests or dig spots)
// ── KEEP CLEAR: things you walk up to or into must never be buried under blocks ──
// A lazy list (the constants live in sections further down the file). Doors, stairs and boats also
// get a ring, because their trigger is "stand near it". Portals, NPCs, dig spots etc. are checked in canPlaceAt().
const KEEP_CLEAR_R = 36;   // a block whose middle is closer than this to a spot is refused
function keepClearSpots(room = state.room) {
    const list = [], at = (rooms, o) => { if ([].concat(rooms).includes(room)) list.push(o); };
    at(ROOM.VOID, ROCKET);  at(ROOM.SPACE, ROCKET);
    at(ROOM.VOID, RACE_MASTER);  at(ROOM.VOID, CHART_SIGN);  at(ROOM.VOID, ARENA_GATE);  at(ROOM.ARENA, ARENA_EXIT);
    at(ROOM.VOID, SHOP_BTN);  at(ROOM.VOID, AWARDS_BTN);   // the shop and awards spots (on-screen buttons: rectangles)
    at(ROOM.VOID, MALL_DOOR);  at(ROOM.MALL, MALL_EXIT);  at(ROOM.TOY, TOY_EXIT);
    at(ROOM.HOUSE, HOUSE_DOOR);
    at(ROOM.HEAVEN, SKY_STAIRS);  at(ROOM.HEAVEN, BALLOON);  at(ROOM.CLOUDCITY, BALLOON);  at(ROOM.HEAVEN, ENDING_DOOR);  at(ROOM.HEAVEN, HEAVEN_OLYMPUS);
    at(ROOM.SKY, { x: 400, y: 575 });
    at(ROOM.GREECE, MAZE_DOOR);  at(ROOM.GREECE, GORGON_DOOR);  at(ROOM.GREECE, CHARON);
    at([ROOM.GORGON, ROOM.UNDERWORLD, ROOM.CHESS, ROOM.LIBRARY], SCHOOL_EXIT);
    at(ROOM.CAMP, CAMP_EXIT);  at(ROOM.CAMP, OLYMPUS_STAIRS);  at(ROOM.OLYMPUS, OLYMPUS_EXIT);
    at([ROOM.STADIUM, ROOM.SNOWFORT], SUBPLACE_EXIT);
    if (PLACES[room] && PLACES[room].island) list.push(DOCK);
    for (const [id, sp] of Object.entries(SUBPLACES)) {   // every mini-world's door, and the way back out of it
        if (sp.parent === room) list.push(sp.door);
        if (id === room) list.push(SUBPLACE_EXIT);
    }
    return list;
}
function onKeepClearSpot(x, y) {
    return keepClearSpots().some(o => o.w ? inRect(x, y, { x: o.x - CELL / 2, y: o.y - CELL / 2, w: o.w + CELL, h: o.h + CELL })
                                          : Math.hypot(o.x - x, o.y - y) < KEEP_CLEAR_R);
}

function canPlaceAt(cx, cy) {
    const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
    if (x < 0 || x > 800 || y < 56 || y > 600) return false;
    if (sceneryAt(x, y)) return false;
    if (Math.abs(x - player.x) < CELL / 2 + 8 && y + CELL / 2 > player.y - 6 && y - CELL / 2 < player.y + 16) return false;   // not on top of you
    for (const p of PORTALS[state.room] || []) if (Math.hypot(p.x - x, p.y - y) < PORTAL_R + 16) return false;
    if (goldenPortal && Math.hypot(goldenPortal.x - x, goldenPortal.y - y) < PORTAL_R + 16) return false;
    if (state.room === ROOM.PARADISE) {
        for (const n of townNpcs()) if (Math.hypot(n.x - x, n.y - y) < 28) return false;
        for (const c of paradise.chests) if (Math.hypot(c.x - x, c.y - y) < 30) return false;
        if (Math.hypot(CRAFTING_TABLE.x - x, CRAFTING_TABLE.y - y) < 30) return false;
    }
    if (state.room === ROOM.HELL) for (const d of hell.digSpots) if (Math.hypot(d.x - x, d.y - y) < 30) return false;
    if (state.room === ROOM.HEAVEN && Math.hypot(WISH_ANGEL.x - x, WISH_ANGEL.y - y) < 34) return false;
    if (onKeepClearSpot(x, y)) return false;
    return true;
}

// The block you're aiming at: one step in front of you
function buildTargetCell() {
    return { cx: Math.floor((player.x + state.faceX * 30) / CELL), cy: Math.floor((player.y + 5 + state.faceY * 30) / CELL) };
}

// Hit the block there (mine it), or place your block if it's empty
function buildAt(cx, cy, aimX, aimY) {
    const blocks = roomBlocks(), key = cellKey(cx, cy), b = blocks[key];
    const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
    state.digAnim = 14;
    if (!b && mineScenery(aimX !== undefined ? aimX : x, aimY !== undefined ? aimY : y)) return;   // chop trees, mine rocks
    if (b && isUnbreakable(b)) {   // maze walls: a clink and a short message, nothing breaks
        sfx('clink');
        spawnParticles(x, y, '#9A9AB0', 3);
        if (frameNo - lastHardMsg >= HARD_MSG_FRAMES) { lastHardMsg = frameNo; spawnFloatText(x, y - 10, 'Too hard!', '#FFFFFF', 50); }
        return;
    }
    if (b) {
        b.hits++;
        const need = state.diamondPickaxe || isCreative() ? 1 : BLOCKS[b.type].hits;
        spawnParticles(x, y, blockColor(b.type), 4);
        sfx('dig');
        if (b.hits < need) return;
        delete blocks[key];
        worldDirty = true;
        const drop = BLOCKS[b.type].drop;
        if (!isCreative() && drop) {
            state.inv[drop] = invCount(drop) + 1;
            spawnFloatText(x, y - 10, `+1 ${drop === 'iron' || drop === 'diamond' ? MATERIALS[drop] : BLOCKS[drop].name}`, '#FFFFFF', 50);
            if (drop === 'diamond') { sfx('found'); giveAward('diamond'); }
        }
        if (b.type === 'leaves' && Math.random() < 0.2 && state.playerHp < fullHearts()) {   // an apple fell out!
            state.playerHp++;
            spawnFloatText(x, y - 24, '🍎 +1 ❤', '#FF6666', 60);
        }
        litTnt = litTnt.filter(t => !(t.room === state.room && t.cx === cx && t.cy === cy));
        return;
    }
    const type = HOTBAR[state.hotbar];
    if (!canPlaceAt(cx, cy)) { spawnFloatText(x, y, '✖', '#FF8888', 30); return; }
    if (!isCreative()) {
        if (invCount(type) <= 0) { showToast(`You don't have any ${BLOCKS[type].name} — mine or craft some!`, '#FF9988', 120); return; }
        state.inv[type]--;
    }
    blocks[key] = { type, hits: 0 };
    worldDirty = true;
    sfx('place');
    if (type === 'tnt') { litTnt.push({ room: state.room, cx, cy, t: TNT_FUSE }); sfx('hiss'); }
    giveAward('builder');
}

// ── SCENERY you can mine: the big trees, boulders and rocks ──
const TREE_SPOTS    = [[30, 205, 26], [775, 330, 28], [520, 272, 18], [280, 300, 18], [760, 440, 26], [30, 395, 22], [260, 90, 18], [540, 95, 18]];
const TREE_REGROW_MS = 60000;   // chopped trees grow back after a minute
let scenery = {
    paradise: TREE_SPOTS.map(([x, y, r]) => ({ kind: 'tree', x, y, r, hits: 0, gone: 0, shake: 0 })),
    hell: [], underground: [],
};

function makeRocks(n, kind, avoid) {
    const list = [];
    let tries = 0;
    while (list.length < n && tries++ < 500) {
        const x = 60 + Math.random() * 680, y = 90 + Math.random() * 460, r = 12 + Math.random() * 12;
        if (avoid(x, y)) continue;
        list.push({ kind, x, y, r, hits: 0, gone: 0, shake: 0 });
    }
    return list;
}

function sceneryAt(px, py) {
    return (scenery[state.room] || []).find(o => !o.gone && Math.hypot(o.x - px, (o.kind === 'tree' ? o.y - o.r * 0.2 : o.y) - py) < o.r + 12);
}

// Chop a tree / mine a rock. Returns true if there was something there.
function mineScenery(px, py) {
    const o = sceneryAt(px, py);
    if (!o) return false;
    const need = state.diamondPickaxe || isCreative() ? 1 : o.kind === 'tree' ? 5 : 4;
    o.hits++; o.shake = 10;
    spawnParticles(o.x, o.y - (o.kind === 'tree' ? o.r * 0.4 : 0), o.kind === 'tree' ? '#4CAF50' : '#777', 5);
    sfx('dig');
    if (o.hits < need) return true;
    o.hits = 0;
    o.gone = Date.now();
    const give = (k, n) => { state.inv[k] = invCount(k) + n; };
    let text;
    if (o.kind === 'tree') {
        give('log', 3); give('leaves', 2);
        text = '🪵 +3 Wood Log  🍃 +2 Leaves';
        if (Math.random() < 0.3 && state.playerHp < fullHearts()) { state.playerHp++; text += '  🍎 +1 ❤'; }
        sfx('whoosh');
    } else {
        give('stone', 2);
        text = '🪨 +2 Stone';
        if (o.kind === 'lavaRock' && Math.random() < 0.3) { give('gold', 1); text += '  ✨ +1 Gold Block'; }
        if (o.kind === 'boulder' && Math.random() < 0.25) { give('iron', 1); text += '  ⛓ +1 Iron'; }
    }
    spawnFloatText(o.x, o.y - o.r - 10, text, '#FFFFFF', 80);
    spawnParticles(o.x, o.y, o.kind === 'tree' ? '#7A5230' : '#888', 14);
    return true;
}

function updateScenery() {
    for (const o of scenery.paradise) {
        if (o.shake > 0) o.shake--;
        if (o.gone && Date.now() - o.gone > TREE_REGROW_MS) { o.gone = 0; o.hits = 0; }   // it grew back!
    }
    for (const o of [...scenery.hell, ...scenery.underground]) if (o.shake > 0) o.shake--;
}

function drawTree(o) {
    const { x, y, r } = o;
    if (o.gone) {   // just a stump (growing back)
        ctx.fillStyle = '#6B4A2A'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#A07A4A'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, 3.5, 2, 0, 0, Math.PI * 2); ctx.stroke();
        const grow = Math.min(1, (Date.now() - o.gone) / TREE_REGROW_MS);
        if (grow > 0.3) { ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.arc(x, y + r * 0.55, 3 + grow * 5, 0, Math.PI * 2); ctx.fill(); }   // little sapling
        return;
    }
    const wob = o.shake > 0 ? Math.sin(o.shake * 2) * 3 : 0;
    drawGroundShadow(x + 8, y + r * 0.9, r * 0.9, r * 0.35, 0.25);
    ctx.fillStyle = '#5A3A1E'; ctx.fillRect(x - 4, y, 8, r * 0.8);
    for (const [ox, oy, rr] of [[-r * 0.45, -r * 0.1, r * 0.7], [r * 0.45, -r * 0.1, r * 0.7], [0, -r * 0.55, r * 0.75]]) {
        const gr = ctx.createRadialGradient(x + ox + wob - rr * 0.3, y + oy - rr * 0.3, rr * 0.1, x + ox + wob, y + oy, rr);
        gr.addColorStop(0, '#6FCB55'); gr.addColorStop(1, '#1F5E1C');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + ox + wob, y + oy, rr, 0, Math.PI * 2); ctx.fill();
    }
    if (o.hits > 0) { ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4, y + r * 0.4); ctx.lineTo(x + o.hits, y + r * 0.35); ctx.stroke(); }   // axe notch
}

function drawRock(o) {
    if (o.gone) return;
    const wob = o.shake > 0 ? Math.sin(o.shake * 2) * 2 : 0, x = o.x + wob, { y, r } = o;
    drawGroundShadow(x + 4, y + r * 0.6, r, r * 0.3, 0.3);
    const st = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 2, x, y, r);
    if (o.kind === 'lavaRock') { st.addColorStop(0, '#5A4A48'); st.addColorStop(1, '#1A0E0C'); }
    else                       { st.addColorStop(0, '#7A6656'); st.addColorStop(1, '#2A1C12'); }
    ctx.fillStyle = st; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    if (o.kind === 'lavaRock') {   // glowing cracks
        ctx.strokeStyle = 'rgba(255,110,20,0.85)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x - r * 0.1, y - r * 0.2); ctx.lineTo(x + r * 0.3, y + r * 0.1); ctx.stroke();
    }
    if (o.hits > 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 0.4); ctx.lineTo(x, y); ctx.lineTo(x - r * 0.1, y + r * 0.4); ctx.stroke();
    }
}

function drawScenery() {
    for (const o of scenery[state.room] || []) (o.kind === 'tree' ? drawTree : drawRock)(o);
}

// Like Minecraft: walk up to a tree, rock or block and press the button to chop / mine it
// (only when no monster is close — then the button shoots)
function nearbyMineable() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return null;
    if (targetableEnemies().some(e => Math.hypot(e.x - player.x, e.y - player.y) < 180)) return null;
    if (state.room === ROOM.HELL && hell.devil.alive && state.power !== POWER.NONE
        && Math.hypot(hell.devil.x - player.x, hell.devil.y - player.y) < 300) return null;   // fight the Devil first!
    const ax = player.x + state.faceX * 30, ay = player.y + 5 + state.faceY * 30;
    const near = (scenery[state.room] || []).filter(o => !o.gone)
        .find(o => Math.hypot(o.x - player.x, (o.kind === 'tree' ? o.y : o.y) - player.y) < o.r + 26);
    const sc = sceneryAt(ax, ay) || near;
    if (sc) return { scenery: sc };
    const { cx, cy } = buildTargetCell();
    if (blockAtCell(cx, cy)) return { cx, cy };
    return null;
}

function tryMineNearby() {
    const m = nearbyMineable();
    if (!m) return false;
    state.digAnim = 14;
    if (m.scenery) mineScenery(m.scenery.x, m.scenery.kind === 'tree' ? m.scenery.y - m.scenery.r * 0.2 : m.scenery.y);
    else buildAt(m.cx, m.cy);
    return true;
}

// ── DIGGING THE GROUND (anywhere, like Minecraft) ──
// What you get from the ground in each place
const GROUND = { paradise: 'dirt', void: 'stone', hell: 'netherrack', underground: 'stone', heaven: 'cloud', candy: 'dirt',
                 ice: 'cloud', haunted: 'planks', sky: 'stone', space: 'stone' };
const GROUND_HITS = 3;
let groundDig = null;      // { x, y, hits } — the spot you're digging
let groundHoles = [];      // little holes you've dug (they fill back in)

// Dig the ground when there's nothing to fight (or you don't have a weapon)
function wouldDigGround() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete || !GROUND[state.room]) return false;
    // With the stick only close bad guys count (it only reaches a little); shots reach everywhere
    const near = e => state.power !== POWER.NONE || Math.hypot(e.x - player.x, e.y - player.y) - e.r < STICK_ENGAGE;
    const enemies = targetableEnemies().some(near) || (state.room === ROOM.HELL && hell.devil.alive && near(hell.devil));
    return !enemies;
}

function tryDigGround() {
    if (!wouldDigGround()) return false;
    const x = player.x + state.faceX * 22, y = player.y + 14 + state.faceY * 16;
    if (!groundDig || Math.hypot(groundDig.x - x, groundDig.y - y) > 14) groundDig = { x, y, hits: 0 };
    groundDig.hits++;
    state.digAnim = 14;
    const type = GROUND[state.room];
    spawnParticles(x, y, blockColor(type), 5);
    sfx('dig');
    if (groundDig.hits >= (state.diamondPickaxe ? 1 : GROUND_HITS)) {
        const drop = BLOCKS[type].drop;
        state.inv[drop] = invCount(drop) + 1;
        spawnFloatText(x, y - 16, `+1 ${BLOCKS[drop].name}`, '#FFFFFF', 50);
        groundHoles.push({ x, y, room: state.room, t: 600 });
        if (groundHoles.length > 30) groundHoles.shift();
        groundDig = null;
        giveAward('miner');
    }
    return true;
}

function drawGroundHoles() {
    for (const h of groundHoles) {
        if (h.room !== state.room) continue;
        h.t--;
        ctx.fillStyle = `rgba(40,25,10,${Math.min(0.6, h.t / 300)})`;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    groundHoles = groundHoles.filter(h => h.t > 0);
    if (groundDig && groundDig.hits > 0) {   // cracks where you're digging
        ctx.strokeStyle = 'rgba(40,25,10,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(groundDig.x - 6, groundDig.y); ctx.lineTo(groundDig.x + 6, groundDig.y + 1);
        if (groundDig.hits > 1) { ctx.moveTo(groundDig.x, groundDig.y - 3); ctx.lineTo(groundDig.x + 2, groundDig.y + 4); }
        ctx.stroke();
    }
}

// TNT and creepers blow up nearby blocks
function blastBlocks(x, y, radius) {
    const blocks = roomBlocks(), ccx = Math.floor(x / CELL), ccy = Math.floor(y / CELL);
    for (let dx = -radius; dx <= radius; dx++) for (let dy = -radius; dy <= radius; dy++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const k = cellKey(ccx + dx, ccy + dy), b = blocks[k];
        if (!b) continue;
        if (b.type === 'tnt' && !litTnt.some(t => t.cx === ccx + dx && t.cy === ccy + dy)) {
            litTnt.push({ room: state.room, cx: ccx + dx, cy: ccy + dy, t: 12 });   // chain reaction!
            continue;
        }
        if (b.type !== 'tnt' && !isUnbreakable(b)) delete blocks[k];
    }
    worldDirty = true;
}

function updateBlocks() {
    for (let i = litTnt.length - 1; i >= 0; i--) {
        const t = litTnt[i];
        if (t.room !== state.room) continue;
        if (--t.t > 0) continue;
        litTnt.splice(i, 1);
        const blocks = roomBlocks();
        if (!isUnbreakable(blocks[cellKey(t.cx, t.cy)])) delete blocks[cellKey(t.cx, t.cy)];
        const x = t.cx * CELL + CELL / 2, y = t.cy * CELL + CELL / 2;
        blastBlocks(x, y, 2);
        for (const e of targetableEnemies()) if (Math.hypot(e.x - x, e.y - y) < 85) damageEnemy(e, POWER.NONE, false, 2);
        for (let k = 0; k < 3; k++) spawnParticles(x, y, ['#FFEE66', '#FF7700', '#555555'][k], 18);
        triggerShake(20);
        sfx('boom');
    }
}

// ── Block pictures (tiny pixel-art, made once and reused) ──
const blockArt = {};
function blockColor(type) {
    return { grass: '#5DA84A', dirt: '#8A5A34', stone: '#8A8A8A', log: '#7A5230', leaves: '#3F8F2F', planks: '#B88A50', brick: '#A0442E',
             glass: '#BFE8FF', gold: '#F2C82E', cloud: '#FFFFFF', tnt: '#D23A2A', netherrack: '#7A2A26', mazeStone: '#3B3B4A', ironOre: '#8A8A8A',
             goldOre: '#7A2A26', diamondOre: '#8A8A8A' }[type];
}
function blockCanvas(type) {
    if (blockArt[type]) return blockArt[type];
    const c = document.createElement('canvas');
    c.width = CELL; c.height = CELL;
    const g = c.getContext('2d');
    const R = seededRandom(type.length * 131 + type.charCodeAt(0));
    const px = 3;   // chunky Minecraft pixels
    const shade = (hex, amt) => {
        const n = parseInt(hex.slice(1), 16);
        const f = v => Math.max(0, Math.min(255, Math.round(v + amt)));
        return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
    };
    const base = blockColor(type);
    for (let yy = 0; yy < CELL; yy += px) for (let xx = 0; xx < CELL; xx += px) {
        g.fillStyle = shade(base, (R() - 0.5) * 40);
        g.fillRect(xx, yy, px, px);
    }
    const spots = (col, n) => { for (let i = 0; i < n; i++) { g.fillStyle = col; g.fillRect(Math.floor(R() * 7) * px, Math.floor(R() * 7) * px, px * 2, px); } };
    if (type === 'grass') { g.fillStyle = '#4A8F3A'; for (let i = 0; i < 10; i++) g.fillRect(Math.floor(R() * 8) * px, Math.floor(R() * 8) * px, px, px * 2); }
    if (type === 'log')   { g.fillStyle = '#5A3A1E'; for (let xx = 2; xx < CELL; xx += 6) g.fillRect(xx, 0, 2, CELL); g.fillStyle = '#C8A070'; g.fillRect(8, 8, 8, 8); g.fillStyle = '#9A7040'; g.fillRect(10, 10, 4, 4); }
    if (type === 'planks'){ g.fillStyle = '#8A6030'; for (let yy = 5; yy < CELL; yy += 6) g.fillRect(0, yy, CELL, 1); g.fillRect(11, 0, 1, 6); g.fillRect(4, 6, 1, 6); g.fillRect(16, 12, 1, 6); }
    if (type === 'brick') { g.fillStyle = '#D8D0C0'; for (let yy = 5; yy < CELL; yy += 6) g.fillRect(0, yy, CELL, 1); for (let yy = 0; yy < CELL; yy += 6) for (let xx = (yy / 6) % 2 ? 6 : 0; xx < CELL; xx += 12) g.fillRect(xx, yy, 1, 6); }
    if (type === 'glass') { g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, 0, CELL, 2); g.fillRect(0, 0, 2, CELL); g.fillRect(5, 5, 2, 7); g.fillRect(8, 5, 2, 3); }
    if (type === 'gold')  { g.fillStyle = '#FFF0A0'; g.fillRect(3, 3, 6, 3); g.fillStyle = '#C89A10'; g.fillRect(0, CELL - 3, CELL, 3); }
    if (type === 'cloud') { g.fillStyle = '#E8F4FF'; g.fillRect(0, CELL - 4, CELL, 4); }
    if (type === 'leaves'){ g.fillStyle = 'rgba(0,40,0,0.5)'; for (let i = 0; i < 8; i++) g.fillRect(Math.floor(R() * 8) * px, Math.floor(R() * 8) * px, px, px); }
    if (type === 'mazeStone') {   // dark, heavy stone slabs with a pale edge and cracks: clearly not brick
        g.fillStyle = '#23232E'; g.fillRect(0, 0, CELL, 3); g.fillRect(0, 11, CELL, 2); g.fillRect(0, 21, CELL, 3);
        g.fillRect(8, 3, 2, 8); g.fillRect(16, 13, 2, 8);
        g.fillStyle = '#5A5A70'; g.fillRect(1, 3, 6, 1); g.fillRect(11, 13, 5, 1); g.fillRect(1, 13, 6, 1);
        g.strokeStyle = '#14141C'; g.lineWidth = 1; g.beginPath(); g.moveTo(14, 4); g.lineTo(12, 9); g.lineTo(15, 10); g.stroke();
    }
    if (type === 'tnt')   { g.fillStyle = '#F2F2F2'; g.fillRect(0, 8, CELL, 8); g.fillStyle = '#222'; g.font = 'bold 8px Arial'; g.textAlign = 'center'; g.fillText('TNT', CELL / 2, 15); }
    if (type === 'ironOre')    spots('#D8B890', 6);
    if (type === 'goldOre')    spots('#FFD84A', 6);
    if (type === 'diamondOre') spots('#5AF0F0', 6);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, CELL - 1, CELL - 1);
    blockArt[type] = c;
    return c;
}

function drawBlocks() {
    const blocks = roomBlocks();
    for (const key in blocks) {
        const [cx, cy] = key.split(',').map(Number), b = blocks[key];
        const x = cx * CELL, y = cy * CELL;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + 3, CELL, CELL);   // little shadow
        ctx.drawImage(blockCanvas(b.type), x, y);
        if (b.hits > 0 && !isUnbreakable(b)) {   // cracks as you mine it
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x + 4, y + 5); ctx.lineTo(x + 11, y + 12); ctx.lineTo(x + 9, y + 19);
            if (b.hits > 1) { ctx.moveTo(x + 11, y + 12); ctx.lineTo(x + 19, y + 9); }
            if (b.hits > 2) { ctx.moveTo(x + 11, y + 12); ctx.lineTo(x + 18, y + 20); }
            ctx.stroke();
        }
    }
    for (const t of litTnt) {   // lit TNT flashes white
        if (t.room !== state.room || Math.floor(t.t / 6) % 2) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(t.cx * CELL, t.cy * CELL, CELL, CELL);
    }
    if (!state.buildMode && !menu) {   // walked up to something you can chop or mine
        const m = nearbyMineable();
        if (m && !(m.cx !== undefined && isUnbreakable(blockAtCell(m.cx, m.cy)))) {   // (no invitation to mine maze walls)
            const verb = mainBtn();
            const o = m.scenery, x = o ? o.x : m.cx * CELL + CELL / 2, y = o ? o.y - o.r - 14 : m.cy * CELL - 6;
            const what = o ? (o.kind === 'tree' ? '🪓 Chop the tree' : '⛏ Mine the rock') : `⛏ Mine the ${BLOCKS[blockAtCell(m.cx, m.cy).type].name}`;
            ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
            ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
            ctx.fillText(`${verb}: ${what}`, x, y);
            ctx.shadowBlur = 0;
        }
    }
    if (state.buildMode && state.gamePhase === 'playing') {   // which block you're aiming at
        const { cx, cy } = buildTargetCell();
        const sc = !blockAtCell(cx, cy) && sceneryAt(player.x + state.faceX * 30, player.y + 5 + state.faceY * 30);
        ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        if (sc) {   // aiming at a tree or rock
            ctx.strokeStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(sc.x, sc.kind === 'tree' ? sc.y - sc.r * 0.2 : sc.y, sc.r + 6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
            ctx.fillText(sc.kind === 'tree' ? '🪓 Chop!' : '⛏ Mine!', sc.x, sc.y - sc.r - 14);
        } else {
            ctx.strokeStyle = blockAtCell(cx, cy) ? '#FFFFFF' : canPlaceAt(cx, cy) ? '#FFE066' : '#FF6666';
            ctx.strokeRect(cx * CELL + 1, cy * CELL + 1, CELL - 2, CELL - 2);
        }
        ctx.setLineDash([]);
    }
    if (buildFlash && state.buildMode) {   // the spot a finger just tapped
        if (--buildFlash.t <= 0) buildFlash = null;
        else {
            ctx.globalAlpha = Math.min(1, buildFlash.t / 10);
            ctx.strokeStyle = buildFlash.ok ? '#FFFFFF' : '#FF6666'; ctx.lineWidth = 3;
            ctx.strokeRect(buildFlash.cx * CELL + 1, buildFlash.cy * CELL + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
        }
    }
}

// Minecraft-style hotbar along the bottom while building
// Bigger slots on a phone (a finger taps them); they shrink to fit between the joystick and the buttons
const HOTBAR_W_MIN = 34, HOTBAR_W_MAX = 52;
function hotbarGeom() {
    const n = HOTBAR.length;
    let left = 0, right = GAME_W;
    if (usesTouchLayout()) {   // keep clear of the stick (left) and the punch / block buttons (right) when they sit over the picture
        if (layoutDirty) layoutTouch();
        left  = Math.max(0, VJOY.x + joyGrabR());
        right = Math.min(GAME_W, VBLOCK.x - VBLOCK.r - TOUCH_GAP);
    }
    const W = usesTouchLayout() ? Math.max(HOTBAR_W_MIN, Math.min(HOTBAR_W_MAX, Math.floor((right - left - 12) / n))) : HOTBAR_W_MIN;
    const mid = usesTouchLayout() ? (left + right) / 2 : GAME_W / 2;
    return { n, W, x0: Math.round(mid - (n * W) / 2), y0: 580 - W };
}
function hotbarPanel() { const { n, W, x0, y0 } = hotbarGeom(); return { x: x0 - 6, y: y0 - 26, w: n * W + 12, h: W + 32 }; }
function hotbarSlotAt(x, y) {
    const { n, W, x0, y0 } = hotbarGeom();
    if (y < y0 || y > y0 + W || x < x0 || x >= x0 + n * W) return -1;
    return Math.floor((x - x0) / W);
}
function drawHotbar() {
    if (!state.buildMode) return;
    const { n, W, x0, y0 } = hotbarGeom(), panel = hotbarPanel();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    const hint = lastInput === 'touch'
        ? `🧱 BUILD MODE${isCreative() ? ' — ∞ BLOCKS!' : ''}   Tap the ground: mine / place   🔄 next block   ⚔ fight`
        : `🧱 BUILD MODE${isCreative() ? ' — ∞ UNLIMITED BLOCKS!' : ''}   ${keyName('SPACE / click', 'A')}: place / mine / chop trees   ${keyName('Q or 1-9', 'B')}: pick block`;
    ctx.fillText(hint, panel.x + panel.w / 2, y0 - 10);
    HOTBAR.forEach((type, i) => {
        const x = x0 + i * W, count = invCount(type);
        ctx.fillStyle = i === state.hotbar ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, y0, W - 2, W - 2);
        ctx.globalAlpha = isCreative() || count > 0 ? 1 : 0.3;
        ctx.drawImage(blockCanvas(type), x + 4, y0 + 4, W - 10, W - 10);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = i === state.hotbar ? '#FFFFFF' : '#555'; ctx.lineWidth = i === state.hotbar ? 2.5 : 1;
        ctx.strokeRect(x, y0, W - 2, W - 2);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
        ctx.fillText(isCreative() ? '∞' : String(count), x + W - 5, y0 + W - 5);
    });
    const mats = Object.keys(MATERIALS).filter(m => invCount(m) > 0).map(m => `${MATERIALS[m]} ${invCount(m)}`).join('   ');
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '12px Arial';
    ctx.fillText(`${BLOCKS[HOTBAR[state.hotbar]].name}${mats ? '   ·   ' + mats : ''}${state.diamondPickaxe ? '   ·   ⛏ Diamond Pickaxe' : ''}`, panel.x + panel.w / 2, y0 + W + 4);
    ctx.restore();
}

function toggleBuild() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return;
    state.buildMode = !state.buildMode;
    showToast(state.buildMode ? '🧱 Build mode ON — mine and place blocks!' : '⚔ Build mode OFF — back to fighting!', '#FFE066', 110);
}
function nextBlock(step = 1) { state.hotbar = (state.hotbar + step + HOTBAR.length) % HOTBAR.length; }

// ── HELPERS ───────────────────────────────────────────────────
// Your most hearts: the level's hearts plus any armor you've crafted
function fullHearts() {
    const extra = settings.difficulty === 'easy' ? 2 : settings.difficulty === 'hard' ? -1 : 0;
    return Math.max(1, LEVEL_CONFIGS[state.level - 1].playerMaxHp + (state.armor || 0) + extra);
}

function triggerShake(amount = 12) { state.screenShake = amount; }

function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        particles.push({
            x, y,
            dx: Math.cos(a) * (2 + Math.random() * 3),
            dy: Math.sin(a) * (2 + Math.random() * 3),
            life: 35, maxLife: 35,
            color, r: 4 + Math.random() * 4,
        });
    }
}

function spawnFloatText(x, y, text, color, life = 45) {
    floatTexts.push({ x, y, text, color, life });
}

function spawnConfettiAt(x, y) {
    const colors = ['#FF4444', '#FFFF00', '#44FF44', '#4488FF', '#FF44CC'];
    for (let i = 0; i < 30; i++) {
        particles.push({ x, y, dx: (Math.random() - 0.5) * 8, dy: -Math.random() * 7, life: 70, maxLife: 70,
            color: colors[i % colors.length], r: 0, confetti: true, rotation: Math.random() * 6,
            rotSpeed: (Math.random() - 0.5) * 0.2, cw: 6, ch: 4 });
    }
}

function spawnConfetti() {
    const colors = ['#FF4444','#FF8800','#FFFF00','#44FF44','#4488FF','#CC44FF','#FF44CC','#FFFFFF','#FF88AA'];
    for (let i = 0; i < 130; i++) {
        const a   = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 9;
        particles.push({
            x: 400, y: 300,
            dx: Math.cos(a) * spd,
            dy: Math.sin(a) * spd - 2,
            life: 90 + Math.random() * 70, maxLife: 160,
            color: colors[Math.floor(Math.random() * colors.length)],
            r: 0,
            confetti: true,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.18,
            cw: 7 + Math.random() * 6,
            ch: 4 + Math.random() * 4,
        });
    }
}

function isPlayerInCave() {
    if (state.room !== ROOM.HELL) return false;
    if (state.caveProtectionExpired) return false;
    return HELL_CAVES.some(c =>
        player.x >= c.x && player.x <= c.x + c.w &&
        player.y >= c.y && player.y <= c.y + c.h
    );
}

function isPlayerPhysicallyInCave() {
    if (state.room !== ROOM.HELL) return false;
    return HELL_CAVES.some(c =>
        player.x >= c.x && player.x <= c.x + c.w &&
        player.y >= c.y && player.y <= c.y + c.h
    );
}

function allMonstersDefeated() {
    return paradise.enemies.every(e => !e.alive);
}

function getPlayerColor() {
    if (state.playerFlash > 0) return '#FFFF00';
    if (state.power === POWER.RAINBOW || mod('rainbow')) return `hsl(${(Date.now() / 5) % 360}, 100%, 60%)`;
    if (state.power !== POWER.NONE)      return WEAPON_INFO[state.power].color;
    return AVATAR_COLORS[state.activeSkin];
}

function damagePlayer() {
    if (settings.creative) return;   // nothing can hurt you in Creative Mode
    if (fight.jump > 0) return;      // …or while you're up in the air
    if (state.playerInvincible > 0) return;
    if (state.invisible > 0) return;   // 👻 they can't see you!
    if (state.bubble) {
        // Shield Bubble pops instead of losing a heart
        state.bubble = false;
        state.playerInvincible = 60;
        spawnParticles(player.x, player.y, '#AEE8FF', 12);
        spawnFloatText(player.x, player.y - 30, 'POP!', '#AEE8FF');
        sfx('pop');
        return;
    }
    sfx('hurt');
    state.playerHp--;
    state.playerInvincible = state.lessons.shield ? 150 : 90;
    triggerShake(14);
    spawnParticles(player.x, player.y, '#FF4444', 8);
    if (state.playerHp <= 0) respawnPlayer();
}

// Losing your last heart sends you back to the Void. The room change itself
// waits until the end of the frame: damagePlayer() can be called from inside
// loops over the room's projectiles and enemies, and changeRoom() replaces
// those arrays, so switching rooms mid-loop crashed the game (a frozen screen).
let pendingRespawn = false;
const RESPAWN_SAFE_FRAMES = 120;   // a little longer than a room entry: you also lost your weapons
function respawnPlayer() {
    const maxHp = fullHearts();
    state.power           = POWER.NONE;
    state.powerTier       = 1;
    state.playerHp        = maxHp;
    state.playerInvincible = RESPAWN_SAFE_FRAMES;
    pendingRespawn = true;
}

function resetGame() {
    const cfg = LEVEL_CONFIGS[0];
    pendingRespawn = false;
    Object.assign(state, {
        room: ROOM.VOID, lightCrystals: 0, power: POWER.NONE, powerTier: 1,
        won: false, levelComplete: false, screenShake: 0, playerFlash: 0,
        gamePhase: 'intro', playerHp: cfg.playerMaxHp, playerInvincible: 0,
        confettiSpawned: false, paradiseClearCount: 0, voidHealTimer: 0,
        level: 1,
        ammo: cfg.ammoMax, ammoMax: cfg.ammoMax, ammoReloading: false, ammoReloadTimer: 0,
        caveTimer: 0, caveProtectionExpired: false,
        coins: 0, shopOpen: false,
        unlockedSkins: [true, ...Array(AVATAR_COLORS.length - 1).fill(false)], activeSkin: 0,
        bubble: false, score: 0, newBest: false, coinsBackup: undefined,
        job: null, housesOwned: {}, ammoBonus: 0,
        ownedPets: PETS.map(() => false), activePet: -1, petXp: PETS.map(() => 0),
        ownedGadgets: {}, gadget: null, gadgetCooldown: 0, melee: null, ownedMelee: {}, arrowKind: 0, hasDash: false, dashTimer: 0, dashCooldown: 0, weaponLevel: 1,
        buildMode: false, hotbar: 0, inv: { dirt: 10, planks: 10, stone: 5, glass: 5 }, armor: 0, diamondPickaxe: false,
        furniture: { bed: true }, garden: [0, 0, 0, 0], lessons: {}, hats: {}, hat: null, houseFrom: null, placesSeen: {}, treasure: null,
        spells: {}, spell: null, spellCooldown: 0, mounts: {}, mount: null, lastMount: null,
        hogwarts: false, demigod: undefined, godCooldown: 0, godTurn: 0, house: null, invisible: 0, giant: 0, tiny: 0, quest: null, questsDone: 0, wand: 'oak', wands: {}, creature: null, creatureFood: 0, trials: {}, fleece: false, fullGod: false, stoned: 0, gloop: 0, petCostume: null, petCostumes: {}, yard: {}, magicGarden: [0, 0, 0], farmAt: 0, mirrorShield: false, saberColor: 0, heroSuit: null,
    });
    player.x = 400; player.y = 300;
    hell             = makeHell();
    paradise         = makeParadise();
    voidRoom         = makeVoidRoom();
    projectiles      = [];
    enemyProjectiles = [];
    particles        = [];
    floatTexts       = [];
    heartPickups     = [];
    bolts            = [];
}

function advanceLevel() {
    if (state.level >= MAX_LEVELS) {
        giveAward('hero');
        clearSave();
        // True final win — game complete
        state.won = true;
        state.levelComplete = false;
        if (!state.confettiSpawned) { state.confettiSpawned = true; spawnConfetti(); }
        return;
    }
    state.level++;
    const cfg = LEVEL_CONFIGS[state.level - 1];
    Object.assign(state, {
        room: ROOM.VOID, lightCrystals: 0, power: POWER.NONE, powerTier: 1,
        won: false, levelComplete: false, screenShake: 0, playerFlash: 0,
        gamePhase: 'playing', playerHp: cfg.playerMaxHp + state.armor, playerInvincible: 0,
        confettiSpawned: false, paradiseClearCount: 0, voidHealTimer: 0,
        ammo: cfg.ammoMax + state.ammoBonus, ammoMax: cfg.ammoMax + state.ammoBonus, ammoReloading: false, ammoReloadTimer: 0,
        caveTimer: 0, caveProtectionExpired: false,
        shopOpen: false, job: null,
    });
    player.x = 400; player.y = 300;
    hell             = makeHell();
    paradise         = makeParadise();
    voidRoom         = makeVoidRoom();
    projectiles      = [];
    enemyProjectiles = [];
    particles        = [];
    floatTexts       = [];
    heartPickups     = [];
    bolts            = [];
}

