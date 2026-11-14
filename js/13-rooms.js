// ── ROOM CHANGE ───────────────────────────────────────────────
// A random spot on the map, not too close to the player
function randomSpawnSpot(minDist = 150) {
    for (let tries = 0; tries < 50; tries++) {
        const x = 80 + Math.random() * 640, y = 100 + Math.random() * 420;
        if (Math.hypot(x - player.x, y - player.y) >= minDist) return { x, y };
    }
    return { x: 80, y: 100 };
}

function respawnParadiseWave() {
    const night = state.paradiseClearCount + 1;
    paradise.enemies = paradise.enemies.filter(e => !e.temp);   // King Slime's little slimes
    for (const e of paradise.enemies) {
        // Monsters climb out of the ground in random places
        // (bosses and the robot army keep their places — robots march in a line)
        const spot = e.type === 'king' || e.type === 'ghostking' || e.march ? { x: e.home.x, y: e.home.y } : randomSpawnSpot();
        const alive = (e.minNight || 1) <= night && (!e.onlyNight || e.onlyNight === night);
        Object.assign(e, { alive, hp: e.maxHp, hitFlash: 0, hopTimer: 0, frozen: 0, hidden: false, phase: 0,
                           x: spot.x, y: spot.y, dx: e.home.dx, dy: e.home.dy, emerge: 30 + Math.random() * 60 });
    }
    // A boss's home may be next to you if you stand in the square: it comes up a safe distance away
    if (state.room === ROOM.PARADISE) keepMonstersAwayFromArrival(paradise.enemies);
}

// Daytime surprise: a few monsters pop out of the ground somewhere
function spawnAmbush() {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
        const type = AMBUSH_TYPES[Math.floor(Math.random() * AMBUSH_TYPES.length)];
        const spot = randomSpawnSpot(180);
        const e = makeEnemy(type, spot.x, spot.y, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4);
        e.emerge = 45 + i * 15;
        paradise.ambushers.push(e);
    }
    showToast('⚠ Monsters popped up out of the ground!', '#FF8866');
    sfx('worm');
}

const ENTRY_SAFE_FRAMES   = 90;    // 1.5 s nobody can hurt you after walking into a room (a monster may be standing at the door)
const ENTRY_SAFE_DISTANCE = 120;   // monsters in a fresh mini-world start at least this far from where you arrive
function changeRoom(dest) {
    if (state.gamePhase === 'playing') sfx('portal');
    state.room = dest;
    state.shopOpen = false;   // close shop when changing rooms
    state.awardsOpen = false;
    menu = null;
    gadgetObjs = [];
    clones = []; state.cloneTimer = 0; laserBeam = null; timeFreeze = 0; magnetTimer = 0;
    grabbed = null; slowMo = 0; fight.blocking = false; fight.jump = 0; fight.charge = 0; fight.fx = []; state.fieldTimer = 0;
    if (dest === ROOM.UNDERGROUND) {   // a fresh cave every time
        worldBlocks.underground = makeWorldBlocks('underground');
        scenery.underground = makeRocks(14, 'boulder', (x, y) => Math.hypot(x - 100, y - 300) < 80 || Math.abs(x - 640) < 70
            || !!blockAtCellIn('underground', x, y));
    }
    if (dest === ROOM.HELL) {
        scenery.hell = makeRocks(8, 'lavaRock', (x, y) => inAnyCave(x, y, 20) || Math.hypot(x - 100, y - 300) < 80
            || (PORTALS.hell).some(p => Math.hypot(p.x - x, p.y - y) < PORTAL_R + 30) || !!blockAtCellIn('hell', x, y));
    }
    if (dest === ROOM.SECRET)      worldBlocks.secret = {};
    if (worldDirty) saveWorld();
    projectiles      = [];
    enemyProjectiles = [];
    heartPickups     = [];
    bolts            = [];
    if (dest === ROOM.VOID)     { player.x = 400; player.y = 300; }
    if (dest === ROOM.HELL)     {
        player.x = 100; player.y = 300;
        // Weapons are buried again (in new places) each visit
        hell.digSpots = makeDigSpots();
        hell.foundMsg = null;
        hell.enemies  = makeWorms();
        if (Math.random() < SHADOW_CHANCE) {
            hell.enemies.push({ type: 'shadow', x: 700, y: 300, r: 15, hp: 6, maxHp: 6, alive: true, hitFlash: 0, frozen: 0,
                                coinDrop: 8, emerge: 60, dx: 0, dy: 0 });
        }
        hell.summonTimer = IMP_SUMMON_FRAMES;
    }
    if (dest === ROOM.PARADISE) {
        player.x = 400; player.y = 290;   // the town square
        paradise.fishing.stage = 'idle';
    }
    if (dest === ROOM.SECRET)      { player.x = 400; player.y = 420; secretRoom = makeSecretRoom(); giveAward('secret'); }
    if (dest === ROOM.UNDERGROUND) { player.x = 100; player.y = 300; underground = makeUnderground(); giveAward('underground'); }
    if (dest === ROOM.HEAVEN)      { player.x = 400; player.y = 330; heaven = makeHeaven(); giveAward('heaven'); }
    if (dest === ROOM.HOUSE)       { player.x = HOUSE_DOOR.x; player.y = 520; }
    if (PLACES[dest]) {
        placeState[dest] = PLACES[dest].make();
        [player.x, player.y] = PLACES[dest].spawn;
        if (dest !== ROOM.SHIP) {
            state.placesSeen = state.placesSeen || {};
            state.placesSeen[dest] = true;
            if (['candy', 'ice', 'haunted', 'sky', 'space'].every(r => state.placesSeen[r])) giveAward('explorer');
        }
    }
    if (state.gamePhase === 'playing') saveGame();
    goldenPortal = MAIN_ROOMS.includes(dest) && Math.random() < SECRET_PORTAL_CHANCE
        ? { ...GOLDEN_PORTAL_SPOTS[dest] } : null;
    placePetBesidePlayer();
    for (const f of activeFriends()) { f.x = player.x + 30 * (f.n - 1); f.y = player.y; }   // friends come along through portals
    keepAllMonstersAwayFromArrival();
    if (state.gamePhase === 'playing') maybeMiniBoss();
    state.playerInvincible = Math.max(state.playerInvincible, ENTRY_SAFE_FRAMES);
}

// Slide any monster that is too close to the player straight away from them (inside the room).
// If that spot is outside the room (you stand by a wall) it tries other directions, so the gap is always real.
function keepMonstersAwayFromArrival(list) {
    for (const e of list || []) {
        let dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d >= ENTRY_SAFE_DISTANCE) continue;
        if (d < 1) { dx = 0; dy = -1; d = 1; }   // exactly on top of you: up
        const base = Math.atan2(dy, dx);
        let nx = e.x, ny = e.y;
        for (let k = 0; k < 24; k++) {   // 0, +15, -15, +30 ... degrees from the straight-away direction
            const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 12;
            const tx = player.x + Math.cos(a) * ENTRY_SAFE_DISTANCE, ty = player.y + Math.sin(a) * ENTRY_SAFE_DISTANCE;
            if (tx >= 40 && tx <= 760 && ty >= 80 && ty <= 560) { nx = tx; ny = ty; break; }
        }
        if (e.home) { e.home.x += nx - e.x; e.home.y += ny - e.y; }   // its patrol spot moves with it
        e.x = nx; e.y = ny;
    }
}

// Every monster of the room you are in, standing or waiting to climb out: bosses, wave monsters, ambushers, the Devil
function keepAllMonstersAwayFromArrival() {
    if (state.room === ROOM.PARADISE)    keepMonstersAwayFromArrival([...paradise.enemies, ...paradise.ambushers]);
    if (state.room === ROOM.HELL)        keepMonstersAwayFromArrival([...hell.enemies, hell.devil]);
    if (state.room === ROOM.UNDERGROUND) keepMonstersAwayFromArrival(underground.enemies);
    if (PLACES[state.room] && place())   keepMonstersAwayFromArrival(place().enemies);
}

// ── ENTITY FACTORIES ─────────────────────────────────────────
function makeDigSpots() {
    // One of each weapon, shuffled so every visit is a surprise
    const loot = [POWER.ICE, POWER.BRIMSTONE, POWER.LIGHTNING, POWER.WATER];
    for (let i = loot.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [loot[i], loot[j]] = [loot[j], loot[i]];
    }
    // Only ONE dig spot hides the tunnel to the Underground Caves — nobody knows which
    const tunnel = Math.floor(Math.random() * DIG_SPOTS.length);
    return DIG_SPOTS.map((s, i) => ({ x: s.x, y: s.y, hits: 0, depth: 0, weapon: loot[i], tunnel: i === tunnel }));
}

function inAnyCave(x, y, pad = 0) {
    return HELL_CAVES.some(c => x >= c.x - pad && x <= c.x + c.w + pad && y >= c.y - pad && y <= c.y + c.h + pad);
}

function makeWorms() {
    const list = [];
    const n = LEVEL_CONFIGS[state.level - 1].worms;
    while (list.length < n) {
        const x = 80 + Math.random() * 640, y = 90 + Math.random() * 460;
        if (inAnyCave(x, y, 20) || Math.hypot(x - 100, y - 300) < 180) continue;   // not in caves, not on the entrance
        list.push({ type: 'worm', x, y, r: 15, hp: 3, maxHp: 3, alive: true, hitFlash: 0, frozen: 0,
                    hidden: true, wState: 'under', wTimer: WORM_UNDER_FRAMES * (0.5 + Math.random()), spit: WORM_SPIT_FRAMES });
    }
    return list;
}

function makeHell() {
    const cfg = LEVEL_CONFIGS[state.level - 1];
    return {
        digSpots: makeDigSpots(),
        foundMsg: null,   // { text, sub, color, timer } — floats up in the middle after digging
        enemies:  [],     // bad guys in Hell (mole monsters, lava worms, mini-devils)
        summonTimer: IMP_SUMMON_FRAMES,
        devil: {
            x: 660, y: 300, r: cfg.devilR, alive: true, shieldFlash: 0, frozen: 0,
            hp: cfg.devilHp, maxHp: cfg.devilHp,
            aiState: 'CHASE',
            wanderTarget: { x: 400, y: 300 },
            wanderWaitTimer: 0,
            shootTimer: cfg.devilShootRate,
            telegraphTimer: 0,
            isAboutToShoot: false,
        },
        coins: [],   // coins only come from beating bad guys
    };
}

function makeEnemy(type, x, y, dx, dy) {
    const hp = ENEMY_TYPES[type].hp;
    return { type, x, y, dx, dy, r: 16, hp, maxHp: hp, alive: true, hitFlash: 0, hopTimer: 0, frozen: 0,
             home: { x, y, dx, dy } };   // where to respawn for the next wave
}

function makeParadise() {
    const cfg = LEVEL_CONFIGS[state.level - 1];
    const enemies = [
        makeEnemy('fire',  200, 150,  1.2,  0.8),
        makeEnemy('fire',  550, 200, -0.9,  1.1),
        makeEnemy('fire',  350, 400,  1.0, -1.0),
        makeEnemy('ghost', 300, 250, -0.7,  0.9),
        makeEnemy('ghost', 600, 350,  0.8, -0.8),
        makeEnemy('bat',   150, 350,  2.0,  1.4),
        makeEnemy('slime', 450, 150,  0,    0),
    ];
    // Extra enemies for harder levels
    for (let i = 0; i < cfg.extraFireMonsters; i++) {
        enemies.push(makeEnemy('fire', 150 + i * 200, 100 + i * 80, 1.1 + i * 0.2, -0.9 - i * 0.15));
        enemies.push(makeEnemy('bat',  250 + i * 150, 450 - i * 60, -1.8 - i * 0.2, 1.2));
    }
    for (let i = 0; i < cfg.extraGhosts; i++) {
        enemies.push(makeEnemy('ghost', 450 + i * 150, 150 + i * 100, -0.8 - i * 0.2, 1.0 + i * 0.2));
        enemies.push(makeEnemy('slime', 200 + i * 250, 300 + i * 50, 0, 0));
    }
    // The King Slime only comes on Monster Night 3
    const king = makeEnemy('king', 580, 430, 0, 0);
    Object.assign(king, { r: 40, minNight: 3, coinDrop: 15 });
    enemies.push(king);
    // The Ghost King haunts Monster Night 2
    const ghostKing = makeEnemy('ghostking', 220, 180, 0, 0);
    Object.assign(ghostKing, { r: 34, minNight: 2, onlyNight: 2, coinDrop: 12, phase: 0 });
    enemies.push(ghostKing);
    // Minecraft monsters come out every Monster Night
    enemies.push(makeEnemy('zombie', 200, 400, 0, 0), makeEnemy('zombie', 600, 200, 0, 0), makeEnemy('creeper', 500, 450, 0, 0));
    // A robot army marches in on nights 2 and 3
    for (let i = 0; i < 4; i++) {
        const bot = makeEnemy('robot', 90 + i * 42, 140, 1.3, 0);
        Object.assign(bot, { r: 14, minNight: 2, march: true });
        enemies.push(bot);
    }
    return {
        enemies,
        chests: [
            { x: 330, y: 478, w: 30, h: 24, opened: false },
            { x: 400, y: 478, w: 30, h: 24, opened: false },
            { x: 470, y: 478, w: 30, h: 24, opened: false },
        ],
        villagers: VILLAGERS.map(v => ({ ...v, tx: v.x, ty: v.y, walk: 0, face: 1 })),
        crops:     FARM_CROPS.map(c => ({ ...c, thirsty: false })),
        birthday:  Math.random() < 0.4 ? { id: VILLAGERS[Math.floor(Math.random() * VILLAGERS.length)].id, wished: false } : null,
        fishing:   { stage: 'idle', timer: 0 },   // 'idle' → 'waiting' → 'bite'
        quiet:     false,     // tonight is a quiet night (no monsters)
        lastQuiet: false,
        ambushers: [],        // monsters that popped up in the daytime
        ambushTimer: AMBUSH_FRAMES[0],
        weather:   'sun',     // 'sun' | 'rain' | 'snow'
        weatherTimer: WEATHER_FRAMES,
        rainbowTimer: 0,
        coins:  [],           // coins only come from beating monsters
        phase:  'day',        // 'day' → 'dusk' → 'night' → (chest opened) → 'day'
        timer:  dayFrames(),
        apples: [],           // for the Mayor's apple-picking job
        speech: null,         // { npc, text, timer } — speech bubble over a townsperson
    };
}

function makeVoidRoom() {
    return {
        enemies: [],
        coins:   [],
    };
}

function makeSecretRoom() {
    return {
        treasures: [
            // Rainbow Power is only here sometimes — otherwise a big pile of points
            { kind: Math.random() < RAINBOW_CHANCE ? 'rainbow' : 'gem', x: 250, y: 300, picked: false },
            { kind: 'heart',   x: 400, y: 250, picked: false },   // full hearts + Shield Bubble
            { kind: 'star',    x: 550, y: 300, picked: false },   // Gold skin (or lots of points)
        ],
    };
}

function makeUnderground() {
    const enemies = [];
    for (let i = 0; i < 4; i++) {
        const x = 200 + Math.random() * 480, y = 100 + Math.random() * 400;
        enemies.push({ type: 'mole', x, y, alive: true, r: 15, hp: 5, maxHp: 5, hitFlash: 0, frozen: 0,
                       speed: 1.1, emerge: 45 + i * 60 });
    }
    enemies.push(...makeWorms().slice(0, 2));
    enemies.push(makeEnemy('zombie', 300, 450, 0, 0), makeEnemy('zombie', 500, 150, 0, 0), makeEnemy('creeper', 450, 420, 0, 0));
    // Spiders wait on the ceiling, then drop down on a thread
    for (let i = 0; i < 3; i++) {
        enemies.push({ type: 'spider', x: 200 + i * 180, y: 50, ty: 180 + Math.random() * 260, r: 12, hp: 3, maxHp: 3,
                       alive: true, hitFlash: 0, frozen: 0, hidden: true, dropTimer: 90 + Math.random() * 300, dx: 0, dy: 0 });
    }
    // The Cave Dragon guards the deepest cave
    enemies.push({ type: 'dragon', x: 640, y: 300, r: 40, hp: 22, maxHp: 22, alive: true, hitFlash: 0, frozen: 0,
                   coinDrop: 20, breath: 150, dx: 0, dy: 0.6 });
    return {
        enemies,
        coins: [],
        gems: [
            { x: 180, y: 130, hits: 0, color: '#CC66FF', mined: false },
            { x: 620, y: 140, hits: 0, color: '#33EEFF', mined: false },
            { x: 560, y: 470, hits: 0, color: '#FF66AA', mined: false },
        ],
        // Glowing mushrooms (just for looks)
        shrooms: Array.from({ length: 14 }, (_, i) => ({ x: 40 + (i * 97) % 720, y: 80 + (i * 211) % 480, h: (i * 53) % 360 })),
    };
}

// ── HEAVEN: the opposite of Hell. No monsters, it heals you, 3 wishes, unlimited blocks ──
const WISH_ANGEL = { id: 'angel', name: 'Angel of Wishes', x: 400, y: 232 };
function makeHeaven() {
    state.heavenWishes = 3;
    return { angels: [0, 1, 2].map(i => ({ x: 150 + i * 250, y: 380 + (i % 2) * 60, t: i * 2 })) };
}
let heaven = makeHeaven();

function updateHeaven() {
    if (state.room !== ROOM.HEAVEN) return;
    for (const a of heaven.angels) { a.t += 0.01; a.x = 400 + Math.sin(a.t + a.y) * 300; a.y += Math.sin(a.t * 3) * 0.3; }
}

function nearWishAngel() {
    return state.room === ROOM.HEAVEN && Math.hypot(player.x - WISH_ANGEL.x, player.y - WISH_ANGEL.y) < 44;
}

function wishItems() {
    const wish = (icon, name, desc, give) => ({
        icon, name, desc, cost: 0, status: state.heavenWishes > 0 ? `${state.heavenWishes} wish${state.heavenWishes > 1 ? 'es' : ''} left` : null,
        action: () => {
            if (state.heavenWishes <= 0) { showToast('No wishes left — come back to Heaven another time!', '#AACCFF', 140); return; }
            state.heavenWishes--; give(); sfx('magic'); spawnParticles(player.x, player.y, '#FFF4B0', 20);
        },
    });
    const petWish = () => {
        const free = PETS.map((p, i) => i).filter(i => !state.ownedPets[i]);
        if (!free.length) { showToast('You already have every pet!'); state.heavenWishes++; return; }
        const j = free[Math.floor(Math.random() * free.length)];
        state.ownedPets[j] = true; state.activePet = j; placePetBesidePlayer();
        showToast(`🐾 A ${PETS[j].name} flew down from the clouds for you!`); giveAward('pet');
        if (state.ownedPets.every(Boolean)) giveAward('allPets');
    };
    const weapon = (pw) => () => { state.power = pw; state.powerTier = 2; showToast(`✨ SUPER ${WEAPON_INFO[pw].label}!`); };
    return [
        wish('❤', 'Full hearts + Bubble', 'All your hearts and a Shield Bubble', () => { state.playerHp = fullHearts(); state.bubble = true; showToast('❤ All better — and a Shield Bubble!'); }),
        wish('🌈', 'Rainbow Power', 'Super rare — might not work!', () => {
            if (Math.random() >= RAINBOW_WISH_CHANCE) { showToast('🌈 The rainbow faded away… try again!', '#AACCFF', 160); return; }
            state.power = POWER.RAINBOW; state.powerTier = 3; giveAward('rainbow'); showToast('🌈 RAINBOW POWER!');
        }),
        wish('❄', 'Super Ice', 'Beats Fire Monsters, freezes things', weapon(POWER.ICE)),
        wish('🔥', 'Super Fire', 'Beats Ghosts, Spiders & Zombies', weapon(POWER.BRIMSTONE)),
        wish('⚡', 'Super Lightning', 'Beats Bats and jumps between monsters', weapon(POWER.LIGHTNING)),
        wish('💧', 'Super Water', 'Beats Slimes, Moles & Robots', weapon(POWER.WATER)),
        wish('🐾', 'A New Pet', 'A pet you don\'t have yet', petWish),
        wish('🧱', 'Stack of Blocks', '+16 of every block to build with', () => { for (const b of HOTBAR) state.inv[b] = invCount(b) + 16; showToast('🧱 +16 of every block!'); }),
    ];
}

// Sky, light rays and the pearly gates (under everything else)
function drawHeavenBack() {
    const t = Date.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let k = 0; k < 7; k++) {   // soft rays of light from the gates
        const a = Math.PI / 2 + (k - 3) * 0.28 + Math.sin(t / 3 + k) * 0.03;
        ctx.fillStyle = '#FFF6C8';
        ctx.beginPath(); ctx.moveTo(400, 150); ctx.lineTo(400 + Math.cos(a - 0.06) * 700, 150 + Math.sin(a - 0.06) * 700); ctx.lineTo(400 + Math.cos(a + 0.06) * 700, 150 + Math.sin(a + 0.06) * 700); ctx.fill();
    }
    ctx.restore();
    // Pearly gates
    ctx.save();
    ctx.shadowColor = '#FFE680'; ctx.shadowBlur = 25;
    ctx.strokeStyle = '#E8C04A'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(400, 170, 70, Math.PI, 0); ctx.stroke();                              // arch
    ctx.fillStyle = '#F4F0E8'; ctx.fillRect(322, 160, 14, 60); ctx.fillRect(464, 160, 14, 60);   // pillars
    ctx.shadowBlur = 0; ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) {                                                                 // golden bars
        const gx = 345 + k * 22;
        ctx.beginPath(); ctx.moveTo(gx, 128 + Math.abs(k - 2.5) * 6); ctx.lineTo(gx, 215); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(338, 170); ctx.lineTo(462, 170); ctx.stroke();
    ctx.fillStyle = '#E8C04A'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('✨ HEAVEN ✨', 400, 92);
    ctx.restore();
}

function drawAngel(x, y, big = false) {
    const t = Date.now() / 1000, k = big ? 1.2 : 1, flap = Math.sin(t * 6 + x) * 5;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';                                            // wings
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * 5 * k, y - 6 * k);
        ctx.quadraticCurveTo(x + side * 26 * k, y - 22 * k - flap, x + side * 22 * k, y + 4 * k);
        ctx.quadraticCurveTo(x + side * 14 * k, y, x + side * 5 * k, y + 2 * k); ctx.fill();
    }
    drawHuman(x, y, k, { shirt: '#FFFFFF', sleeves: '#F4F4FF', pants: '#FFFFFF', shoes: '#F4E8C8', hair: '#F2D060', hairStyle: 'long' });
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;   // halo
    ctx.beginPath(); ctx.ellipse(x, y - 27 * k, 7 * k, 2.5 * k, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

function drawHeaven() {
    drawBalloon(BALLOON.x, BALLOON.y, 'To CLOUD CITY');
    // Cloud stairs up to the Sky Castle
    for (let k = 0; k < 5; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.95 - k * 0.1})`;
        ctx.beginPath(); ctx.ellipse(SKY_STAIRS.x + k * 14, SKY_STAIRS.y - k * 16, 26 - k * 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#446'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('☁ Stairs to the SKY CASTLE', SKY_STAIRS.x + 20, SKY_STAIRS.y + 26);
    for (const a of heaven.angels) { drawGroundShadow(a.x, a.y + 30, 10, 3, 0.12); drawAngel(a.x, a.y - 10 + Math.sin(Date.now() / 400 + a.x) * 5); }
    drawGroundShadow(WISH_ANGEL.x, WISH_ANGEL.y + 20, 12, 4, 0.2);
    drawAngel(WISH_ANGEL.x, WISH_ANGEL.y, true);
    ctx.fillStyle = '#7A5A10'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Angel of Wishes — ${state.heavenWishes} wish${state.heavenWishes === 1 ? '' : 'es'} left`, WISH_ANGEL.x, WISH_ANGEL.y + 34);
    if (nearWishAngel() && !menu) {
        const verb = mainBtn();
        drawSpeech(WISH_ANGEL, `${verb}: Make a wish! ✨`);
    }
    if (!state.buildMode) {
        ctx.fillStyle = 'rgba(90,70,20,0.75)'; ctx.font = 'bold 12px Arial';
        ctx.fillText(`No monsters up here — it heals you! ${byInput('Press B', 'Tap 🧱', 'Click the left stick')} to build anything with UNLIMITED blocks.`, 400, 590);
    }
}

let secretRoom   = makeSecretRoom();
let underground  = makeUnderground();
let goldenPortal = null;    // { x, y } when the rare golden portal is showing
let hell      = makeHell();
let paradise  = makeParadise();
let voidRoom  = makeVoidRoom();

// ── PORTALS ───────────────────────────────────────────────────
// Every portal is a mystery: it takes you to a random room (never the one you're in)
// Kept clear of the caves, chests, spawn points and touch controls.
const PORTAL_R = 34;
const PORTALS = {
    void: [
        { x: 60,  y: 300, shape: 'circle'   },
        { x: 740, y: 300, shape: 'diamond'  },
        { x: 400, y: 112, shape: 'star'     },
        { x: 740, y: 112, shape: 'hexagon'  },
    ],
    secret: [
        { x: 700, y: 440, shape: 'star'     },
    ],
    underground: [
        { x: 740, y: 300, shape: 'circle'   },
        { x: 400, y: 545, shape: 'hexagon'  },
    ],
    house: [],   // you leave by the front door, not a portal
    ship:    [],                                         // you're at sea!
    candy:   [{ x: 740, y: 300, shape: 'circle'  }],
    ice:     [{ x: 740, y: 300, shape: 'hexagon' }],
    haunted: [{ x: 740, y: 520, shape: 'star'    }],
    sky:     [{ x: 740, y: 470, shape: 'diamond' }],
    space:   [{ x: 740, y: 470, shape: 'star'    }],
    arena:   [],
    mall:    [],
    camp:    [],
    olympus: [],
    piratecove: [],
    chess:   [],
    library: [],
    greece:  [],
    maze:    [],
    gorgon:  [],
    underworld: [],
    viking:  [],
    candyvolcano: [],
    seacity: [],
    moonbase: [],
    cloudcastle: [],
    icecave: [],
    treehouse: [],
    factory: [],
    toyshop: [],
    museum: [],
    underbed: [],
    backyard: [],
    secretroom: [],
    stadium: [],
    snowfort: [],
    medieval: [],
    microworld: [],
    underwater: [{ x: 740, y: 120, shape: 'circle' }],
    toy:     [{ x: 740, y: 120, shape: 'star'    }],
    pyramid: [{ x: 740, y: 120, shape: 'diamond' }],
    cloudcity: [{ x: 740, y: 470, shape: 'circle' }],
    dino:    [{ x: 740, y: 120, shape: 'star'    }],
    volcano: [{ x: 740, y: 470, shape: 'diamond' }],
    jungle:  [{ x: 740, y: 520, shape: 'hexagon' }],
    heaven: [
        { x: 60,  y: 330, shape: 'circle'   },
        { x: 740, y: 330, shape: 'star'     },
        { x: 400, y: 545, shape: 'diamond'  },
    ],
    hell: [
        { x: 740, y: 300, shape: 'star'     },
        { x: 420, y: 108, shape: 'triangle' },
        { x: 300, y: 545, shape: 'circle'   },
    ],
    paradise: [
        { x: 60,  y: 300, shape: 'hexagon'  },
        { x: 62,  y: 110, shape: 'diamond'  },
        { x: 752, y: 110, shape: 'triangle' },
    ],
};

function randomDoorDestination() {
    const rooms = MAIN_ROOMS.filter(r => r !== state.room);
    return rooms[Math.floor(Math.random() * rooms.length)];
}

// ── DRAW: PORTALS ─────────────────────────────────────────────
function portalPath(shape, x, y, r, spin) {
    ctx.beginPath();
    if (shape === 'circle') { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
    // Pointy shapes: [number of points, inner radius ratio]
    const [n, inner] = { diamond: [4, 1], triangle: [3, 1], hexagon: [6, 1], star: [5, 0.5] }[shape];
    const pts = inner < 1 ? n * 2 : n;
    for (let i = 0; i < pts; i++) {
        const a  = spin - Math.PI / 2 + (i / pts) * Math.PI * 2;
        const rr = inner < 1 && i % 2 ? r * inner : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
}

// The super-rare golden portal to the Secret Golden Room
function drawGoldenPortal() {
    if (!goldenPortal) return;
    const t = Date.now() / 1000, { x, y } = goldenPortal, r = PORTAL_R + 4 + Math.sin(t * 4) * 2;
    const d = Math.hypot(player.x - x, player.y - y);
    const seen = Math.max(0.06, Math.min(1, (SECRET_REVEAL_DIST + 60 - d) / 60));   // a faint shimmer from far away
    ctx.save();
    ctx.globalAlpha = seen;
    portalPath('star', x, y, r, t * 1.2);
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.4, '#FFE066'); grad.addColorStop(1, '#B8860B');
    ctx.fillStyle = grad; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 35;
    ctx.fill();
    ctx.strokeStyle = '#FFF4B0'; ctx.lineWidth = 3; ctx.stroke();
    for (let k = 0; k < 5; k++) {
        const a = t * 3 + k * (Math.PI * 2 / 5);
        drawStar(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10), 3.5, '#FFFFFF');
    }
    ctx.restore();
    if (d < SECRET_REVEAL_DIST) {
        ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('✨ SECRET! ✨', x, y + PORTAL_R + 18);
    }
}

function drawPortals() {
    drawGoldenPortal();
    const t = Date.now() / 1000;
    for (const p of PORTALS[state.room]) {
        // Colour keeps shifting — you never know where it goes!
        const hue  = (t * 60 + p.x + p.y) % 360;
        const spin = t * 0.9 + p.x;   // the whole shape slowly turns
        const r    = PORTAL_R + Math.sin(t * 3 + p.x) * 2;
        ctx.save();

        // Dark swirling middle
        portalPath(p.shape, p.x, p.y, r, spin);
        const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, `hsl(${hue}, 90%, 45%)`);
        grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 90%, 15%)`);
        ctx.fillStyle = grad;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`; ctx.shadowBlur = 25;
        ctx.fill();

        // Spiral arms spinning into the centre
        ctx.save();
        portalPath(p.shape, p.x, p.y, r, spin);
        ctx.clip();
        ctx.shadowBlur = 0;
        for (let arm = 0; arm < 5; arm++) {
            ctx.strokeStyle = `hsla(${(hue + 40 + arm * 30) % 360}, 100%, ${70 + (arm % 2) * 15}%, 0.75)`;
            ctx.lineWidth = 3 - (arm % 2);
            ctx.beginPath();
            for (let k = 0; k <= 34; k++) {
                const a  = -t * 5 + arm * (Math.PI * 2 / 5) + k * 0.28;
                const rr = (k / 34) * r * 1.1;
                ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
            }
            ctx.stroke();
        }
        // Rings pulsing into the middle, like a whirlpool
        for (let k = 0; k < 3; k++) {
            const rr = r * (1 - ((t * 0.8 + k / 3) % 1));
            ctx.strokeStyle = `rgba(255,255,255,${0.35 * rr / r})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        // Bits of light getting sucked in from outside
        for (let k = 0; k < 8; k++) {
            const ph = (t * 0.7 + k / 8) % 1;
            const a  = k * 0.785 + t * 1.5 + ph * 3;
            const rr = r * (1.6 - ph);
            ctx.fillStyle = `hsla(${(hue + k * 40) % 360}, 100%, 75%, ${ph})`;
            ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Glowing outline
        portalPath(p.shape, p.x, p.y, r, spin);
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Sparkles orbiting the edge
        for (let k = 0; k < 3; k++) {
            const a = t * 2 + k * (Math.PI * 2 / 3) + p.y;
            drawStar(p.x + Math.cos(a) * (r + 7), p.y + Math.sin(a) * (r + 7), 2.5, '#FFFFFF');
        }
        ctx.restore();

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, p.y);
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('MYSTERY', p.x, p.y + PORTAL_R + 14);
    }
}

// ── DRAW: BACKGROUNDS ─────────────────────────────────────────
// Each room's ground is painted once onto its own hidden canvas, then copied every frame.
// A seeded random number generator makes the scenery look the same every time.
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function paintHeaven(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#8FD0FF'); sky.addColorStop(0.55, '#DDF1FF'); sky.addColorStop(1, '#FFFFFF');
    g.fillStyle = sky; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 70; i++) {   // fluffy cloud floor
        const x = R() * 800, y = 250 + R() * 360, r = 30 + R() * 60;
        const c = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        c.addColorStop(0, 'rgba(255,255,255,0.95)'); c.addColorStop(1, 'rgba(230,240,255,0)');
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
}

const bgCache = {};
function roomBackground(room) {
    if (!bgCache[room]) {
        const c = document.createElement('canvas');
        c.width = 800; c.height = 600;
        if (room === 'void') { c.width = 900; c.height = 700; }   // fog is bigger than the screen so it can drift
        const painters = { hell: paintHell, paradise: paintParadise, underground: paintUnderground, void: paintVoidFog, heaven: paintHeaven, house: paintHouse,
                           ship: paintShip, candy: paintCandy, ice: paintIce, haunted: paintHaunted, sky: paintSky, space: paintSpace, arena: paintArena, mall: paintMall,
                           underwater: paintUnderwater, dino: paintDino, volcano: paintVolcano, jungle: paintJungle,
                           toy: paintToy, pyramid: paintPyramid, cloudcity: paintCloudCity, camp: paintCamp, olympus: paintOlympus, piratecove: paintPirateCove, chess: paintChess, library: paintLibrary,
                           greece: paintGreece, maze: paintMaze, gorgon: paintGorgon, underworld: paintUnderworld, viking: paintViking,
                           ...Object.fromEntries(Object.entries(SUBPLACES).map(([id, sp]) => [id, sp.paint])), stadium: paintStadium, snowfort: paintSnowfort };
        painters[room](c.getContext('2d'), seededRandom(room.length * 7919 + 13));
        bgCache[room] = c;
    }
    return bgCache[room];
}

// ── DRAW: VOID FOG, VIGNETTE AND GROUND SHADOWS ────────────
// Soft fog clouds for the Void (drawn over its colour, drifting slowly)
function paintVoidFog(g, R) {
    for (let i = 0; i < 30; i++) {
        const x = R() * 900, y = R() * 700, r = 60 + R() * 140;
        const fog = g.createRadialGradient(x, y, 0, x, y, r);
        fog.addColorStop(0, `rgba(255,255,255,${0.08 + R() * 0.1})`); fog.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = fog; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
}

// Darker edges make everything feel more real
let vignetteCanvas = null;
function drawVignette() {
    if (!vignetteCanvas) {
        vignetteCanvas = document.createElement('canvas');
        vignetteCanvas.width = 800; vignetteCanvas.height = 600;
        const g = vignetteCanvas.getContext('2d');
        const v = g.createRadialGradient(400, 320, 240, 400, 320, 560);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = v; g.fillRect(0, 0, 800, 600);
    }
    ctx.drawImage(vignetteCanvas, 0, 0);
}

function drawRoomBackground() {
    const t = Date.now() / 1000;
    if (state.room === ROOM.VOID) {
        ctx.fillStyle = VOID_BG_COLOR; ctx.fillRect(0, 0, 800, 600);
        ctx.drawImage(roomBackground('void'), -50 + Math.sin(t / 6) * 30, -50 + Math.cos(t / 8) * 15);
    } else if (state.room === ROOM.SECRET) {
        const gold = ctx.createRadialGradient(400, 300, 50, 400, 300, 500);
        gold.addColorStop(0, '#5A4210'); gold.addColorStop(1, '#1E1400');
        ctx.fillStyle = gold; ctx.fillRect(0, 0, 800, 600);
    } else {
        ctx.drawImage(roomBackground(state.room), 0, 0);
    }
    if (state.room === ROOM.HELL) {
        // Lava pools pulse, embers float up
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.15;
        ctx.fillStyle = '#FFE070'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.ellipse(70, 555, 40, 18, 0, 0, Math.PI * 2); ctx.ellipse(770, 190, 22, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        for (let i = 0; i < 24; i++) {
            const x = (i * 97 + Math.sin(t + i) * 20) % 800, y = 600 - ((t * 30 + i * 53) % 560);
            ctx.fillStyle = `rgba(255,${120 + (i % 5) * 25},40,${0.5 + 0.4 * Math.sin(t * 3 + i)})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    if (state.room === ROOM.PARADISE) {
        // Waves washing up the beach
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= 800; x += 10) ctx.lineTo(x, 587 + Math.sin(x / 30 + t * 2) * 2);
        ctx.stroke();
    }
}

// Soft shadow on the ground under something
function drawGroundShadow(x, y, rx, ry = rx * 0.35, alpha = 0.3) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

