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
        keepMonstersAwayFromArrival(placeState[dest].enemies);
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
    if (state.gamePhase === 'playing') maybeMiniBoss();
    state.playerInvincible = Math.max(state.playerInvincible, ENTRY_SAFE_FRAMES);
}

// Slide any monster that starts too close to the arrival point straight away from it (inside the room)
function keepMonstersAwayFromArrival(list) {
    for (const e of list || []) {
        let dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d >= ENTRY_SAFE_DISTANCE) continue;
        if (d < 1) { dx = 0; dy = -1; d = 1; }   // exactly on top of you: up
        const nx = Math.max(40, Math.min(760, player.x + dx / d * ENTRY_SAFE_DISTANCE)), ny = Math.max(80, Math.min(560, player.y + dy / d * ENTRY_SAFE_DISTANCE));
        if (e.home) { e.home.x += nx - e.x; e.home.y += ny - e.y; }   // its patrol spot moves with it
        e.x = nx; e.y = ny;
    }
}

// ── UPDATE: PLAYER ────────────────────────────────────────────
function updatePlayer() {
    if (state.won || state.levelComplete || state.gamePhase !== 'playing') return;
    if (updateYardRide()) return;   // 🎢 on a ride in the backyard

    const spd = (state.room === ROOM.PARADISE ? BASE_SPEED * 1.2 : BASE_SPEED) * (state.lessons.running ? 1.2 : 1) * mountSpeed() * playerSpeedFactor()
              * (godPassive('fast') ? 1.3 : 1) * (godSpeedTimer > 0 ? 1.7 : 1) * (state.house === 'slytherin' ? 1.15 : 1) * (state.heroSuit === 'on' ? 1.25 : 1)
              * (state.tiny > 0 ? 1.4 : state.giant > 0 ? 0.9 : 1);
    let dx = 0, dy = 0;
    if (!state.shopOpen && !state.awardsOpen && !menu) {
        const arrows = !p2.active;   // with 2 players, the arrow keys belong to Player 2
        if ((arrows && keys['ArrowLeft'])  || keys['KeyA']) dx -= 1;
        if ((arrows && keys['ArrowRight']) || keys['KeyD']) dx += 1;
        if ((arrows && keys['ArrowUp'])    || keys['KeyW']) dy -= 1;
        if ((arrows && keys['ArrowDown'])  || keys['KeyS']) dy += 1;
        // Virtual joystick
        const deadzone = VJOY.maxDist * JOYSTICK_DEADZONE_RATIO;
        if (vTouch.joyDX < -deadzone) dx -= 1;
        if (vTouch.joyDX >  deadzone) dx += 1;
        if (vTouch.joyDY < -deadzone) dy -= 1;
        if (vTouch.joyDY >  deadzone) dy += 1;
        // Controller stick (analog — push a little to walk slowly)
        dx += padMove.x; dy += padMove.y;
    }
    if (state.stoned > 0) { state.stoned--; dx = dy = 0; }   // 🗿 turned to stone by Medusa
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }   // diagonals aren't faster
    if (len > 0.2) { const l = Math.hypot(dx, dy); state.faceX = dx / l; state.faceY = dy / l; state.walkPhase += 0.32; }   // remember which way you're going
    dx *= spd; dy *= spd;
    if (fight.blocking) { dx *= 0.4; dy *= 0.4; }   // slow while holding your shield up
    if (state.room === ROOM.ICE || state.room === ROOM.SPACE || state.room === ROOM.UNDERWATER || state.room === ROOM.MOONBASE || state.room === ROOM.ICECAVE || state.mount === 'kart' || state.mount === 'skates' || mod('lowGravity')) {
        // Slippery ice / floaty space: you speed up and slow down gently
        const grip = state.mount === 'kart' ? 0.12 : state.mount === 'skates' ? 0.07 : state.room === ROOM.ICE ? 0.05 : 0.035;
        state.vx = (state.vx || 0) + (dx - (state.vx || 0)) * grip;
        state.vy = (state.vy || 0) + (dy - (state.vy || 0)) * grip;
        dx = state.vx; dy = state.vy;
    }
    if (state.dashTimer > 0) {   // ZOOM!
        state.dashTimer--;
        dx = state.faceX * 15; dy = state.faceY * 15;
        particles.push({ x: player.x, y: player.y, dx: 0, dy: 0, life: 12, maxLife: 12, color: 'rgba(255,255,255,0.6)', r: 12 });
    }

    // Move, but blocks are solid (try each direction separately so you slide along walls)
    const nx = Math.max(18, Math.min(GAME_W - 18, player.x + dx));
    const ny = Math.max(52, Math.min(GAME_H - 18, player.y + dy));
    const flying = ['dragon', 'broom', 'car', 'pegasus', 'jetpack'].includes(state.mount) || state.heroSuit === 'on' || settings.creative || godPassive('fly');   // dragons, Zeus's kids (and Creative Mode) fly over blocks
    if (flying || !playerHitsBlock(nx, player.y)) player.x = nx;
    if (flying || !playerHitsBlock(player.x, ny)) player.y = ny;
    if (state.mount === 'duck' && (dx || dy) && Math.random() < 0.01) { tone(700, 0.12, 'square', 0.12, 500); spawnFloatText(player.x, player.y - 30, 'QUACK!', '#FFE066', 40); }

    for (const p of PORTALS[state.room]) {
        if (Math.hypot(player.x - p.x, player.y - p.y) < PORTAL_R * 0.75) {
            changeRoom(randomDoorDestination());
            return;
        }
    }
    if (updatePlaceExits()) return;
    // Out through your front door, back to the house you came in by
    if (state.room === ROOM.HOUSE && player.y > 560 && Math.abs(player.x - HOUSE_DOOR.x) < 24) {
        const door = houseDoors().find(d => d.id === state.houseFrom) || houseDoors()[0];
        changeRoom(ROOM.PARADISE);
        player.x = door.x; player.y = door.y + 22;
        return;
    }
    if (goldenPortal && Math.hypot(player.x - goldenPortal.x, player.y - goldenPortal.y) < PORTAL_R * 0.75) {
        sfx('win');
        changeRoom(ROOM.SECRET);
        return;
    }
    // A dig spot dug to the bottom becomes a tunnel (step off it first, then jump in)
    if (state.room === ROOM.HELL) {
        for (const s of hell.digSpots) {
            if (s.depth < DIG_MAX_DEPTH || !s.tunnel) continue;
            const d = Math.hypot(player.x - s.x, player.y - s.y);
            if (d > 30) s.tunnelReady = true;
            else if (s.tunnelReady && d < 14) { changeRoom(ROOM.UNDERGROUND); return; }
        }
    }

    if (state.playerFlash     > 0) state.playerFlash--;
    if (state.playerInvincible > 0) state.playerInvincible--;
    if (state.digAnim > 0) state.digAnim--;

    // ── CAVE TIMER ─────────────────────────────────────────────
    if (isPlayerPhysicallyInCave()) {
        state.caveTimer++;
        if (state.caveTimer >= caveMax()) {
            state.caveProtectionExpired = true;
        }
    } else {
        // Reset when player leaves the cave
        if (state.caveTimer > 0) {
            state.caveTimer = 0;
            state.caveProtectionExpired = false;
        }
    }

    // Brimstone spark trail
    if (state.power === POWER.BRIMSTONE && Math.random() < 0.5) {
        particles.push({
            x: player.x + (Math.random() - 0.5) * 14,
            y: player.y + (Math.random() - 0.5) * 14,
            dx: (Math.random() - 0.5) * 1.5,
            dy: (Math.random() - 0.5) * 1.5,
            life: 14, maxLife: 14,
            color: Math.random() < 0.5 ? '#FF4422' : '#FF8800',
            r: 2 + Math.random() * 2,
        });
    }
}

// ── UPDATE: ENEMIES ───────────────────────────────────────────
function weaponDamage(power, enemyType) {
    if (power === POWER.RAINBOW || ENEMY_TYPES[enemyType].weakTo === power) return DAMAGE_STRONG;
    return DAMAGE_WEAK;
}

// Your weapon shields you from the bad guys it's strong against (never the Devil)
function isShieldedAgainst(enemyType) {
    if (state.dashTimer > 0) return true;   // dashing through things
    if (state.power === POWER.NONE || !ENEMY_TYPES[enemyType]) return false;
    return weaponDamage(state.power, enemyType) === DAMAGE_STRONG;
}

// Hurts a bad guy; returns true if it was defeated
function hitEnemy(e, power, bonus = 0) {
    let dmg = weaponDamage(power, e.type) + bonus;
    if (mod('oneHit') && !BOSS_TYPES.includes(e.type)) dmg = Math.max(dmg, e.hp);   // 💥 One-Hit Wonder
    e.hp -= dmg;
    e.hitFlash = 8;
    const strong = dmg >= DAMAGE_STRONG;
    if (settings.damageNumbers) spawnFloatText(e.x, e.y - e.r - 8, strong ? `-${dmg} SUPER HIT!` : `-${dmg}`, strong ? '#FFEE44' : '#FFFFFF');
    spawnParticles(e.x, e.y, ENEMY_TYPES[e.type].color, strong ? 10 : 4);
    if (e.hp > 0) { sfx(strong ? 'superHit' : 'hit'); return false; }
    spawnParticles(e.x, e.y, ENEMY_TYPES[e.type].color, 16);
    triggerShake();
    sfx('defeat');
    addScore(e.type === 'mole' ? 15 : 10);
    return true;
}

// The bad guys in the room you're in
function roomEnemies() {
    if (state.room === ROOM.PARADISE) {
        const P = paradise;
        return P.phase === 'night' && !P.quiet && state.lightCrystals < 3 ? [...P.enemies, ...P.ambushers] : P.ambushers;
    }
    if (state.room === ROOM.HELL)        return hell.enemies;
    if (state.room === ROOM.UNDERGROUND) return underground.enemies;
    if (PLACES[state.room] && place())   return place().enemies;
    return [];
}

// The real list new bad guys should be added to in this room
function spawnList() {
    if (state.room === ROOM.PARADISE)    return paradise.enemies;
    if (state.room === ROOM.HELL)        return hell.enemies;
    if (state.room === ROOM.UNDERGROUND) return underground.enemies;
    if (PLACES[state.room] && place())   return place().enemies;
    return [];
}

// Bad guys you can shoot right now (not defeated, not still climbing out of the ground)
function targetableEnemies() {
    return roomEnemies().filter(e => e.alive && !(e.emerge > 0) && !e.hidden);
}

function roomCoins() {
    if (state.room === ROOM.PARADISE) return paradise.coins;
    if (state.room === ROOM.HELL)        return hell.coins;
    if (state.room === ROOM.UNDERGROUND) return underground.coins;
    if (PLACES[state.room] && place())   return place().coins;
    return voidRoom.coins;
}

// Reward for beating a bad guy: a coin, and sometimes a heart
function dropLoot(e) {
    const count = (e.coinDrop || COINS_PER_KILL) * (mod('doubleCoins') ? 2 : 1);
    for (let i = 0; i < count; i++) {
        const p = reachablePoint(e.x + (Math.random() - 0.5) * 16 * count, e.y + (Math.random() - 0.5) * 16 * count, { fallback: e });
        roomCoins().push({ x: p.x, y: p.y, picked: false });
    }
    if (Math.random() < HEART_DROP_CHANCE) {
        const p = reachablePoint(e.x + 12, e.y, { fallback: e });
        heartPickups.push({ x: p.x, y: p.y, life: 600 });
    }
}

// Some mornings it's somebody's birthday!
function maybeBirthday() {
    paradise.birthday = null;
    if (Math.random() > 0.4) return;
    const who = [...WORKERS, ...VILLAGERS][Math.floor(Math.random() * (WORKERS.length + VILLAGERS.length))];
    paradise.birthday = { id: who.id, wished: false };
    setTimeout(() => showToast(`🎂 It's ${who.name}'s BIRTHDAY! Go and say Happy Birthday!`, '#FF88CC', 260), 1500);
}

// Every hit knocks little slimes off the King Slime
function kingSplit(k, count) {
    for (let i = 0; i < count; i++) {
        if (paradise.enemies.filter(e => e.temp && e.alive).length >= KING_MAX_MINIS) return;
        const a = Math.random() * Math.PI * 2;
        const m = makeEnemy('slime', k.x + Math.cos(a) * k.r, k.y + Math.sin(a) * k.r, Math.cos(a) * 4, Math.sin(a) * 4);
        Object.assign(m, { r: 10, hp: 1, maxHp: 1, temp: true, hopTimer: 40, coinDrop: 1 });
        spawnList().push(m);
    }
}

// Hit a bad guy with a weapon: damage, freeze (ICE), chain (LIGHTNING), loot when defeated
function damageEnemy(e, power, chained = false, bonus = 0) {
    // Pick the lightning jump targets before anything dies
    const jumps = power === POWER.LIGHTNING && !chained
        ? targetableEnemies()
            .filter(o => o !== e && Math.hypot(o.x - e.x, o.y - e.y) < CHAIN_RANGE)
            .sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))
            .slice(0, CHAIN_JUMPS)
        : [];

    if (hitEnemy(e, power, bonus)) {
        e.alive = false;
        dropLoot(e);
        countStat('kills');
        questProgress(BOSS_TYPES.includes(e.type) ? ['kills', 'boss'] : ['kills']);
        if (HERO_TRIALS.some(tr => tr.type === e.type) && !state.trials[e.type]) { state.trials[e.type] = true; showToast(`⚡ HERO TRIAL DONE: you beat ${ENEMY_TYPES[e.type].name.toUpperCase()}! (tell Zeus on Olympus)`, '#FFD700', 240); }
        if (e.type === 'king') giveAward('king');
        if (e.type === 'ghostking' || e.type === 'dragon' || e.type === 'shadow') giveAward(e.type);
        if (e.type === 'monkey' && e.stolen) showToast(`🐒 You got your coins back — and more! (+${e.coinDrop})`, '#FFE066', 150);
        if (['wizard', 'mummyking', 'candymonster'].includes(e.type)) { giveAward(e.type); showToast(`🏆 You beat the ${ENEMY_TYPES[e.type].name.toUpperCase()}!`, '#FFD700', 220); }
        if (e.type === 'wizard' && state.chicken) state.chicken = 0;
        if (e.type === 'bigdevil') { giveAward('bigBrother'); state.won = true; showToast("🏆 YOU BEAT THE DEVIL'S BIG BROTHER!!!", '#FFD700', 300); }
        if (e.type === 'octopus' || e.type === 'firedragon') { giveAward(e.type); showToast(`🏆 You beat the ${ENEMY_TYPES[e.type].name.toUpperCase()}!`, '#FFD700', 220); }
        if (e.type === 'frostgiant' || e.type === 'thunderbird' || e.type === 'mothership') { giveAward(e.type); showToast(`🏆 You beat the ${ENEMY_TYPES[e.type].name.toUpperCase()}!`, '#FFD700', 220); }
        if (e.type === 'dragon') showToast('🐉 You beat the CAVE DRAGON!', '#FFD700', 200);
    } else if (power === POWER.ICE && !e.frog) {
        if (!e.frozen) sfx('freeze');
        e.frozen = FREEZE_FRAMES;
    }

    if (e.type === 'king') kingSplit(e, e.alive ? 1 : 3);
    if (e.type === 'candymonster' && spawnList().filter(x => x.type === 'jellybean' && x.alive).length < 8) {
        for (let k = 0; k < (e.alive ? 1 : 4); k++) spawnList().push(e0('jellybean', e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 40, { r: 7, emerge: 5, hue: Math.random() * 360, coinDrop: 1 }));
    }

    let from = e;
    for (const o of jumps) {
        bolts.push({ x1: from.x, y1: from.y, x2: o.x, y2: o.y, life: 12 });
        from = o;
        damageEnemy(o, power, true, bonus);
    }
    if (jumps.length) sfx('zap');
}

// The Devil calls in Mini-Devils to help him
function updateDevilMinions() {
    const d = hell.devil;
    if (state.room !== ROOM.HELL || !d.alive || d.frozen > 0 || settings.creative) return;
    if (--hell.summonTimer > 0) return;
    hell.summonTimer = IMP_SUMMON_FRAMES;
    const imps = hell.enemies.filter(e => e.type === 'imp' && e.alive).length;
    if (imps >= LEVEL_CONFIGS[state.level - 1].maxImps) return;
    hell.enemies.push({ type: 'imp', x: d.x + (Math.random() - 0.5) * 60, y: d.y + d.r + 10, r: 11, hp: 3, maxHp: 3,
                        alive: true, hitFlash: 0, frozen: 0, emerge: 30, dx: 0, dy: 0 });
    spawnParticles(d.x, d.y + d.r, '#FF2200', 12);
    spawnFloatText(d.x, d.y - d.r - 20, 'COME, MY MINIONS!', '#FF4444', 80);
    if (Date.now() - lastDevilLaugh > 3000) { lastDevilLaugh = Date.now(); sfx('laugh'); }
}

// A creeper explodes: hurts you if you're close and blows up blocks
function creeperBoom(e) {
    e.alive = false;
    for (let k = 0; k < 3; k++) spawnParticles(e.x, e.y, ['#FFFFFF', '#888888', '#4CAF50'][k], 16);
    triggerShake(20);
    sfx('boom');
    blastBlocks(e.x, e.y, 2);
    if (Math.hypot(player.x - e.x, player.y - e.y) < 75) damagePlayer();
}

// Moves every bad guy in the room and hurts the player on touch
function updateRoomEnemies() {
    if (timeFreeze > 0) return;   // ⏸ everything stops except you
    let shrinkTick = (updateRoomEnemies.tick = (updateRoomEnemies.tick || 0) + 1);
    if (slowMo > 0 && frameNo % 2) return;   // ⏳ slow motion
    for (const e of roomEnemies()) {
        if (e.shrunk > 0 && shrinkTick % 2) continue;   // tiny monsters are slow…
        if (e.air > 0) { e.air--; continue; }           // launched into the air by an uppercut!
        if (e.slip > 0) e.slip--;
        if (e.stun > 0) { e.stun--; if (e.hitFlash > 0) e.hitFlash--; continue; }   // seeing stars
        if (!e.alive) continue;
        if (e.warn > 0) {   // a mole's warning: rumbling mound
            e.warn--;
            if (e.warn % 30 === 0 && e.warn > 0) sfx('rumble');
            if (Math.random() < 0.5) spawnParticles(e.x, e.y + 6, '#6B3E1E', 1);
            continue;
        }
        if (e.emerge > 0) {
            e.emerge--;
            if (Math.random() < 0.4) spawnParticles(e.x, e.y + 8, '#6B3E1E', 1);
            continue;
        }
        if (e.hitFlash > 0) e.hitFlash--;
        if (e.frozen > 0) { e.frozen--; continue; }   // frozen solid: can't move or hurt you
        if (e.frog) { moveFrog(e); continue; }   // frogs are harmless
        if (e.painted > 0) { e.painted--; moveConfused(e); continue; }   // 🎨 can't see you!
        if (settings.creative) { moveFrog(e); continue; }   // Creative Mode: monsters just potter about
        // Monster speed setting: slow skips some steps, fast takes extra ones
        if (!(settings.monsterSpeed === 'slow' && frameNo % 3 === 0)) moveEnemy(e);
        if (settings.monsterSpeed === 'fast' && frameNo % 2 === 0) moveEnemy(e);
        if (e.type === 'monkey' && !(e.flee > 0) && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 16) {
            if (state.coins > 0) {   // 🐒 SNATCH!
                state.coins--; e.stolen = (e.stolen || 0) + 1; e.coinDrop = (e.stolen * 2);
                spawnFloatText(player.x, player.y - 30, '🐒 A monkey stole a coin!', '#FFCC66', 60); sfx('ribbit');
            }
            e.flee = 120;
            continue;
        }
        const touching = (!e.hidden || e.type === 'ghostking') && e.type !== 'creeper' && !(e.shrunk > 0) && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 16;
        if (touching && fight.blocking) {   // your shield stops them
            const d = Math.hypot(e.x - player.x, e.y - player.y) || 1;
            if (fight.blockFrames <= PARRY_WINDOW) {   // COUNTER ATTACK!
                damageEnemy(e, POWER.NONE, false, 2); e.stun = 40;
                spawnFloatText(player.x, player.y - 36, 'COUNTER!', '#FFE066', 45); sfx('superHit'); giveAward('parry');
            }
            if (!BOSS_TYPES.includes(e.type)) { e.x += (e.x - player.x) / d * 24; e.y += (e.y - player.y) / d * 24; }
        } else if (touching && state.playerInvincible === 0 && !isShieldedAgainst(e.type)) {
            damagePlayer();
        }
    }
    // Defeated bad guys in Hell and the Underground don't come back
    hell.enemies        = hell.enemies.filter(e => e.alive);
    underground.enemies = underground.enemies.filter(e => e.alive);
    paradise.ambushers  = paradise.ambushers.filter(e => e.alive);
    if (PLACES[state.room] && place()) place().enemies = place().enemies.filter(e => e.alive);
}

function moveFrog(e) {
    if (--e.hopTimer <= 0) {
        e.hopTimer = 50 + Math.random() * 40;
        const a = Math.random() * Math.PI * 2;
        e.dx = Math.cos(a) * 3; e.dy = Math.sin(a) * 3;
        if (Math.random() < 0.3) sfx('ribbit');
    }
    e.x = Math.max(40, Math.min(760, e.x + e.dx)); e.y = Math.max(70, Math.min(560, e.y + e.dy));
    e.dx *= 0.9; e.dy *= 0.9;
}

function enemyShoot(e, speed, color, spread = [0]) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    for (const off of spread) {
        enemyProjectiles.push({ x: e.x, y: e.y, dx: Math.cos(a + off) * speed, dy: Math.sin(a + off) * speed, color, life: 140, r: 6, enemyType: e.type });
    }
}

function moveEnemy(e) {
    const chase = (spd) => { const a = Math.atan2(player.y - e.y, player.x - e.x); e.x += Math.cos(a) * spd; e.y += Math.sin(a) * spd; e.walk = (e.walk || 0) + spd * 0.15; };
    if (e.type === 'book')   { chase(1.5); e.x += Math.sin(Date.now() / 160 + e.home.x) * 1.8; e.y += Math.cos(Date.now() / 200 + e.home.y) * 1.2; return; }
    if (e.type === 'pawn')   { chase(0.6); return; }
    if (e.type === 'rook')   { if (Math.abs(player.x - e.x) > Math.abs(player.y - e.y)) e.x += Math.sign(player.x - e.x) * 1.2; else e.y += Math.sign(player.y - e.y) * 1.2; return; }   // only straight lines
    if (e.type === 'knight') {   // hops in an L shape
        if (--e.hopTimer <= 0) { e.hopTimer = 70; e.x += Math.sign(player.x - e.x) * 60; e.y += Math.sign(player.y - e.y) * 30; e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(570, e.y)); sfx('boing'); }
        return;
    }
    if (e.type === 'queen')  { chase(1.0); if (Math.random() < 0.012) enemyShoot(e, 4.5, '#AA66FF', [-0.3, 0, 0.3]); return; }
    if (e.type === 'hydrahead') { chase(1.4); return; }
    if (e.type === 'troll')  { chase(0.7); return; }
    if (e.type === 'hydra') {   // every few hits, two new heads pop out
        chase(0.4);
        if (e.hp <= e.nextSplit) {
            e.nextSplit -= 6;
            spawnList().push(e0('hydrahead', e.x - 40, e.y + 20, { emerge: 0, r: 13 }), e0('hydrahead', e.x + 40, e.y + 20, { emerge: 0, r: 13 }));
            spawnFloatText(e.x, e.y - e.r - 14, 'TWO HEADS GREW BACK!', '#88FF88', 80); sfx('hiss');
        }
        if (Math.random() < 0.01) enemyShoot(e, 4, '#66DD44', [-0.2, 0.2]);
        return;
    }
    if (e.type === 'minotaur') {   // charges at you!
        if (--e.chargeTimer <= 0) { e.chargeTimer = 200; e.charge = 30; const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 6; e.dy = Math.sin(a) * 6; spawnFloatText(e.x, e.y - e.r - 10, 'SNORT!', '#FFAA66', 50); }
        if (e.charge > 0) { e.charge--; e.x += e.dx; e.y += e.dy; e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(570, e.y)); }
        else chase(1.0);
        return;
    }
    if (e.type === 'medusa') {   // 👁 her stare turns you to stone — unless you look away!
        chase(0.5);
        if (--e.gazeTimer === 90) { spawnFloatText(e.x, e.y - e.r - 14, '👁 DON\'T LOOK AT ME!', '#88FF88', 90); sfx('hiss'); }
        if (e.gazeTimer <= 0) {
            e.gazeTimer = 260;
            const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy) || 1;
            if ((state.faceX * dx + state.faceY * dy) / d > 0.3 && d < 450 && !state.invisible) { state.stoned = 120; showToast('🗿 You looked at Medusa! You\'re STONE for 2 seconds!', '#AAAAAA', 150); sfx('freeze'); }
            else spawnFloatText(player.x, player.y - 34, 'Phew! You looked away!', '#AAFFAA', 60);
        }
        return;
    }
    if (moveNewBoss(e, chase)) return;
    if (e.type === 'cerberus') { chase(0.8); if (--e.fireTimer <= 0) { e.fireTimer = 150; enemyShoot(e, 4, '#FF5522', [-0.3, 0, 0.3]); sfx('bark'); } return; }
    if (e.type === 'pirate')   { chase(1.3); return; }
    if (e.type === 'windup') {   // zooms in a straight line, then stops to wind up again
        if (--e.windTimer <= 0) { e.windTimer = 110; const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 4.5; e.dy = Math.sin(a) * 4.5; }
        if (e.windTimer > 50) { e.x += e.dx; e.y += e.dy; }
        e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(570, e.y));
        return;
    }
    if (e.type === 'toysoldier') { chase(0.8); if (Math.random() < 0.008) enemyShoot(e, 4.5, '#DDAA66'); return; }
    if (e.type === 'mummy')      { chase(0.6); return; }
    if (e.type === 'scarab')     { chase(2.1); e.x += Math.sin(Date.now() / 70 + e.home.x) * 1.2; return; }
    if (e.type === 'jellybean')  { chase(2.0); return; }
    if (e.type === 'wizard') {   // teleports about, throws magic orbs — and sometimes turns you into a CHICKEN!
        if (--e.teleTimer <= 0) { e.teleTimer = 160; spawnParticles(e.x, e.y, '#AA66FF', 14); const s2 = randomSpawnSpot(160); e.x = s2.x; e.y = s2.y; spawnParticles(e.x, e.y, '#AA66FF', 14); sfx('magic'); }
        if (--e.spellTimer <= 0) {
            e.spellTimer = 110;
            if (Math.random() < 0.25 && !state.chicken) { turnIntoChicken(); bolts.push({ x1: e.x, y1: e.y, x2: player.x, y2: player.y, life: 14 }); }
            else enemyShoot(e, 4.5, '#CC66FF', [-0.25, 0, 0.25]);
        }
        return;
    }
    if (e.type === 'mummyking') {
        chase(0.5);
        if (--e.wrapTimer <= 0) { e.wrapTimer = 120; enemyShoot(e, 4, '#F0E6CC', [-0.3, 0, 0.3]); }
        if (--e.summonTimer <= 0) { e.summonTimer = 360; spawnList().push(e0('mummy', e.x + 40, e.y, { emerge: 30 }), e0('scarab', e.x - 40, e.y, { emerge: 30 })); showToast('🏺 The Mummy King calls his servants!', '#FFE8A0', 120); }
        return;
    }
    if (e.type === 'candymonster') {   // big bouncy blob of candy
        if (--e.hopTimer <= 0) { e.hopTimer = 90; const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 3; e.dy = Math.sin(a) * 3; sfx('bigBoing'); }
        e.x += e.dx; e.y += e.dy; e.dx *= 0.93; e.dy *= 0.93;
        return;
    }
    if (e.type === 'bigdevil') {   // the Devil's BIG BROTHER
        chase(1.1);
        e.fireTimer = (e.fireTimer || 90) - 1;
        if (e.fireTimer <= 0) { e.fireTimer = 90; enemyShoot(e, 5.5, '#AA33FF', [-0.4, -0.2, 0, 0.2, 0.4]); if (Date.now() - lastDevilLaugh > 3000) { lastDevilLaugh = Date.now(); sfx('laugh'); } }
        e.summon = (e.summon || 400) - 1;
        if (e.summon <= 0) { e.summon = 400; spawnList().push({ type: 'imp', x: e.x + 30, y: e.y + 40, r: 11, hp: 3, maxHp: 3, alive: true, hitFlash: 0, frozen: 0, emerge: 30, dx: 0, dy: 0 }); }
        return;
    }
    if (e.type === 'shark')    { e.x += e.dx; e.y += Math.sin(Date.now() / 400 + e.home.y) * 0.8; if (e.x < 60 || e.x > 740) e.dx *= -1;
                                 if (Math.hypot(player.x - e.x, player.y - e.y) < 160) chase(1.6); return; }
    if (e.type === 'jellyfish'){ e.y += Math.sin(Date.now() / 600 + e.home.x) * 0.9; e.x += Math.cos(Date.now() / 900 + e.home.y) * 0.5; return; }
    if (e.type === 'raptor')   { chase(1.9); return; }
    if (e.type === 'lavablob') {
        if (--e.hopTimer <= 0) { e.hopTimer = 60; const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 4; e.dy = Math.sin(a) * 4; }
        e.x += e.dx; e.y += e.dy; e.dx *= 0.92; e.dy *= 0.92; return;
    }
    if (e.type === 'monkey') {
        if (e.flee > 0) { e.flee--; const a = Math.atan2(e.y - player.y, e.x - player.x); e.x += Math.cos(a) * 2.6; e.y += Math.sin(a) * 2.6; }
        else chase(1.6);
        e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(570, e.y));
        e.walk = (e.walk || 0) + 0.3;
        return;
    }
    if (e.type === 'octopus') {   // squirts ink all around
        e.x = 520 + Math.sin(Date.now() / 1600) * 160; e.y = 300 + Math.cos(Date.now() / 1300) * 90;
        if (--e.inkTimer <= 0) {
            e.inkTimer = 110;
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.random() * 0.2; enemyProjectiles.push({ x: e.x, y: e.y, dx: Math.cos(a) * 3.5, dy: Math.sin(a) * 3.5, color: '#221133', life: 140, r: 8, enemyType: e.type }); }
            sfx('splash');
        }
        return;
    }
    if (e.type === 'firedragon') {   // circles the crater and breathes fire
        e.t = (e.t || 0) + 0.01;
        e.x = 400 + Math.cos(e.t) * 280; e.y = 190 + Math.sin(e.t * 2) * 70;
        if (--e.breath <= 0) { e.breath = 120; enemyShoot(e, 5, '#FF6A00', [-0.3, -0.15, 0, 0.15, 0.3]); sfx('dragonRoar'); }
        return;
    }
    if (e.type === 'skeleton') { chase(0.9); if (Math.random() < 0.008) enemyShoot(e, 4, '#EEEEDD'); return; }
    if (e.type === 'snowman')  { chase(0.4); if (Math.random() < 0.01) enemyShoot(e, 4.5, '#FFFFFF'); return; }
    if (e.type === 'alien')    { e.x += Math.sin(Date.now() / 500 + e.y) * 1.2; e.y += Math.cos(Date.now() / 700 + e.x) * 0.8; if (Math.random() < 0.01) enemyShoot(e, 5, '#66FF66'); return; }
    if (e.type === 'gummy') {   // bouncy!
        if (--e.hopTimer <= 0) { e.hopTimer = 55; const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 4.5; e.dy = Math.sin(a) * 4.5; sfx('boing'); }
        e.x += e.dx; e.y += e.dy; e.dx *= 0.92; e.dy *= 0.92;
        return;
    }
    if (e.type === 'frostgiant') {
        chase(0.55);
        if (--e.stompTimer <= 0) {   // STOMP: a ring of ice shards
            e.stompTimer = 170;
            for (let k = 0; k < 12; k++) {
                const a = k * Math.PI / 6;
                enemyProjectiles.push({ x: e.x, y: e.y, dx: Math.cos(a) * 4, dy: Math.sin(a) * 4, color: '#BFE8FF', life: 120, r: 7, enemyType: e.type });
            }
            triggerShake(14); sfx('boom');
        }
        return;
    }
    if (e.type === 'thunderbird') {   // swoops in a figure-8 and zaps
        e.t = (e.t || 0) + 0.012;
        e.x = 400 + Math.sin(e.t * 2) * 260; e.y = 230 + Math.sin(e.t * 4) * 90;
        if (--e.zapTimer <= 0) { e.zapTimer = 110; enemyShoot(e, 6, '#FFE033', [-0.2, 0, 0.2]); sfx('zap'); }
        return;
    }
    if (e.type === 'mothership') {   // hovers, fires beams and drops aliens
        e.x = 400 + Math.sin(Date.now() / 1400) * 280;
        if (--e.beamTimer <= 0) { e.beamTimer = 140; enemyShoot(e, 5, '#FF44FF', [-0.4, -0.2, 0, 0.2, 0.4]); sfx('zap'); }
        if (--e.dropTimer <= 0) { e.dropTimer = 320; place().enemies.push(e0('alien', e.x, e.y + 40, { emerge: 20 })); }
        return;
    }
    if (e.type === 'zombie') {   // shuffles slowly toward you… "Uuurgh…"
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 0.75; e.y += Math.sin(a) * 0.75;
        e.walk = (e.walk || 0) + 0.12;
        if (Math.random() < 0.003) sfx('groan');
        return;
    }
    if (e.type === 'creeper') {
        const d = Math.hypot(player.x - e.x, player.y - e.y);
        if (e.fuse > 0) {   // hissing!
            if (d > 110) { e.fuse = 0; return; }   // you got away
            if (--e.fuse <= 0) creeperBoom(e);
            return;
        }
        if (d < 42) { e.fuse = CREEPER_FUSE; sfx('hiss'); return; }
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 1.1; e.y += Math.sin(a) * 1.1;
        e.walk = (e.walk || 0) + 0.2;
        return;
    }
    if (e.type === 'spider') {
        if (e.hidden) {   // waiting on the ceiling…
            if (--e.dropTimer <= 0) { e.hidden = false; e.dropping = true; e.x = Math.max(60, Math.min(740, player.x + (Math.random() - 0.5) * 120)); sfx('whoosh'); }
            return;
        }
        if (e.dropping) { e.y += 5; if (e.y >= e.ty) { e.y = e.ty; e.dropping = false; } return; }
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 1.5 + Math.sin(Date.now() / 90 + e.ty) * 0.6; e.y += Math.sin(a) * 1.5;
        return;
    }
    if (e.type === 'robot') {
        // March, march, march — reach the edge, step down a row, turn around
        e.x += e.dx;
        if (e.x < 60 || e.x > 740) { e.dx *= -1; e.y += 36; if (e.y > 520) e.y = 140; }
        e.walk = (e.walk || 0) + 0.25;
        return;
    }
    if (e.type === 'ghostking') {
        // Floats after you; every few seconds he vanishes and calls in little ghosts
        e.phase++;
        if (!e.hidden && e.phase > 240) {
            e.hidden = true; e.phase = 0;
            for (let i = 0; i < 2; i++) {
                const g = makeEnemy('ghost', e.x + (i ? 40 : -40), e.y, 0, 0);
                Object.assign(g, { temp: true, emerge: 20, coinDrop: 1 });
                spawnList().push(g);
            }
            spawnParticles(e.x, e.y, '#DDAAFF', 16);
            sfx('magic');
        } else if (e.hidden && e.phase > 120) {
            e.hidden = false; e.phase = 0;
            spawnParticles(e.x, e.y, '#DDAAFF', 16);
        }
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 0.7; e.y += Math.sin(a) * 0.7;
        return;
    }
    if (e.type === 'dragon') {
        // Hovers up and down, then breathes a big spray of fire
        e.y += e.dy; if (e.y < 140 || e.y > 460) e.dy *= -1;
        e.breath--;
        if (e.breath === 40) sfx('dragonRoar');
        if (e.breath <= 0) {
            e.breath = 170;
            const a = Math.atan2(player.y - e.y, player.x - (e.x - 30));
            for (let k = -3; k <= 3; k++) {
                enemyProjectiles.push({ x: e.x - 30, y: e.y - 10, dx: Math.cos(a + k * 0.14) * 5, dy: Math.sin(a + k * 0.14) * 5,
                                        color: '#FF6A00', life: 150, r: 8, enemyType: 'dragon' });
            }
            triggerShake(8);
        }
        return;
    }
    if (e.type === 'shadow') {
        // Copies you like a mirror (flipped left ↔ right)
        const tx = 800 - player.x, ty = player.y;
        e.x += (tx - e.x) * 0.12; e.y += (ty - e.y) * 0.12;
        e.walk = state.walkPhase;
        return;
    }
    if (e.type === 'worm') {
        if (--e.wTimer <= 0) {
            if (e.wState === 'under')      { e.wState = 'rising'; e.wTimer = WORM_RISE_FRAMES; }
            else if (e.wState === 'rising') { e.wState = 'up'; e.wTimer = WORM_UP_FRAMES; e.hidden = false; e.spit = 30;
                                              spawnParticles(e.x, e.y, '#FF6600', 12); sfx('worm'); }
            else                            { e.wState = 'under'; e.wTimer = WORM_UNDER_FRAMES; e.hidden = true;
                                              spawnParticles(e.x, e.y, '#6B3E1E', 8); }
        }
        if (e.wState === 'under') {
            // Tunnels toward the player — but never into the caves
            const a = Math.atan2(player.y - e.y, player.x - e.x);
            const nx = e.x + Math.cos(a) * 1.2, ny = e.y + Math.sin(a) * 1.2;
            if (state.room !== ROOM.HELL || !inAnyCave(nx, ny, 20)) { e.x = nx; e.y = ny; }
            if (Math.random() < 0.3) spawnParticles(e.x, e.y + 6, '#6B3E1E', 1);
        } else if (e.wState === 'up' && --e.spit <= 0) {
            e.spit = WORM_SPIT_FRAMES;
            if (!isPlayerInCave()) {
                const a = Math.atan2(player.y - e.y, player.x - e.x);
                enemyProjectiles.push({ x: e.x, y: e.y - 14, dx: Math.cos(a) * 4, dy: Math.sin(a) * 4,
                                        color: '#FF5500', life: 120, r: 6, enemyType: 'worm' });
            }
        }
        return;   // worms don't bounce around
    }
    if (e.type === 'imp') {
        if (isPlayerInCave()) {
            // Can't see you in the cave — flutters about
            e.x += e.dx; e.y += e.dy;
            if (Math.random() < 0.02) { const a = Math.random() * Math.PI * 2; e.dx = Math.cos(a) * 1.2; e.dy = Math.sin(a) * 1.2; }
        } else {
            const a = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(a) * 1.8; e.y += Math.sin(a) * 1.8;
        }
    } else if (e.type === 'mole') {
        // Chases the player — even inside caves (they live underground!)
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        const sp = e.speed * (e.slowStart > 0 ? MOLE_SLOW_FACTOR : 1);
        if (e.slowStart > 0) e.slowStart--;
        e.x += Math.cos(a) * sp;
        e.y += Math.sin(a) * sp;
    } else if (e.type === 'fire') {
        e.x += e.dx; e.y += e.dy;
    } else if (e.type === 'ghost') {
        // Drifts slowly toward the player
        const a = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(a) * 0.5 + e.dx * 0.25;
        e.y += Math.sin(a) * 0.5 + e.dy * 0.25;
    } else if (e.type === 'bat') {
        // Fast and flappy — zig-zags up and down
        e.x += e.dx;
        e.y += e.dy + Math.sin(Date.now() / 120 + e.home.x) * 1.8;
    } else if (e.type === 'slime' || e.type === 'king') {
        // Sits still, then hops toward the player (the King is slower and heavier)
        if (--e.hopTimer <= 0) {
            const king = e.type === 'king';
            e.hopTimer = king ? 100 : 70;
            sfx(king ? 'bigBoing' : 'boing');
            const a = Math.atan2(player.y - e.y, player.x - e.x);
            e.dx = Math.cos(a) * (king ? 3 : 4); e.dy = Math.sin(a) * (king ? 3 : 4);
        }
        e.x += e.dx; e.y += e.dy;
        e.dx *= 0.92; e.dy *= 0.92;
    }
    if (e.x < 60 || e.x > 740) e.dx *= -1;
    if (e.y < 60 || e.y > 540) e.dy *= -1;
    e.x = Math.max(40, Math.min(760, e.x));
    e.y = Math.max(60, Math.min(560, e.y));
}

function updateEnemies() {
    if (state.won || state.levelComplete) return;

    // ── VOID enemies ──────────────────────────────────────────
    if (state.room === ROOM.VOID) {
        for (const e of voidRoom.enemies) {
            e.x += e.dx; e.y += e.dy;
            if (e.x < 60 || e.x > 740) e.dx *= -1;
            if (e.y < 60 || e.y > 540) e.dy *= -1;
            // Contact damage (shielded by matching power)
            if (state.playerInvincible === 0 && !isShieldedAgainst(e.type) &&
                Math.hypot(e.x - player.x, e.y - player.y) < e.r + 16) {
                damagePlayer();
            }
            // Shoot at player periodically
            e.shootTimer--;
            if (e.shootTimer <= 0) {
                e.shootTimer = 100 + Math.floor(Math.random() * 60);
                const a = Math.atan2(player.y - e.y, player.x - e.x);
                enemyProjectiles.push({
                    x: e.x, y: e.y,
                    dx: Math.cos(a) * 3.5, dy: Math.sin(a) * 3.5,
                    color: e.type === 'fire' ? '#FF6600' : '#CC88FF',
                    life: 140, r: 6,
                    enemyType: e.type,
                });
            }
        }
    }

    if (state.room === ROOM.PARADISE) {
        // After all 3 crystals are collected paradise is peaceful — no more enemies
        if (state.lightCrystals >= 3) return;

        // Show only the current night's chest once all the monsters are beaten
        if (paradise.phase === 'night' && !paradise.quiet && allMonstersDefeated() && state.paradiseClearCount < 3) {
            paradise.chests[state.paradiseClearCount].visible = true;
        }
    }

    if (state.room === ROOM.HELL) {
        const d = hell.devil;
        if (!d.alive) return;
        if (d.shieldFlash > 0) d.shieldFlash--;
        if (settings.creative) return;   // the Devil leaves you alone in Creative Mode
        if (slowMo > 0 && frameNo % 2) return;
        if (d.frozen > 0) { d.frozen--; return; }   // frozen by ICE
        if (timeFreeze > 0) return;

        const cfg = LEVEL_CONFIGS[state.level - 1];

        if (d.telegraphTimer > 0) {
            // Frozen while telegraphing
            d.telegraphTimer--;
            if (d.telegraphTimer === 0 && d.isAboutToShoot) {
                // Only fire if the player is still visible (not hiding in a cave)
                if (!isPlayerInCave()) {
                    const a = Math.atan2(player.y - d.y, player.x - d.x);
                    const shotsPerFire = cfg.devilShotsPerFire;
                    const spreadAngle = shotsPerFire > 1 ? 0.25 : 0;
                    for (let s = 0; s < shotsPerFire; s++) {
                        const offset = shotsPerFire > 1 ? (s - (shotsPerFire - 1) / 2) * spreadAngle : 0;
                        enemyProjectiles.push({
                            x: d.x, y: d.y,
                            dx: Math.cos(a + offset) * DEVIL_BULLET_SPEED, dy: Math.sin(a + offset) * DEVIL_BULLET_SPEED,
                            color: '#FF6600', life: 130, r: cfg.isBoss ? 9 : 7,
                        });
                    }
                    // Scary laugh — not every shot, or it gets annoying
                    if (Date.now() - lastDevilLaugh > 6000) { lastDevilLaugh = Date.now(); sfx('laugh'); }
                }
                d.isAboutToShoot = false;
            }
        } else {
            const inCave = isPlayerInCave();

            if (inCave) {
                d.aiState = 'WANDER';
                if (d.wanderWaitTimer > 0) {
                    d.wanderWaitTimer--;
                } else {
                    const dist = Math.hypot(d.wanderTarget.x - d.x, d.wanderTarget.y - d.y);
                    if (dist < 14) {
                        // Arrived — telegraph, then pick new spot after wait
                        d.telegraphTimer  = 30;
                        d.wanderWaitTimer = 120; // 2 s
                        d.wanderTarget = {
                            x: 80 + Math.random() * 640,
                            y: 80 + Math.random() * 440,
                        };
                    } else {
                        const a = Math.atan2(d.wanderTarget.y - d.y, d.wanderTarget.x - d.x);
                        d.x = Math.max(50, Math.min(750, d.x + Math.cos(a) * 1.6));
                        d.y = Math.max(50, Math.min(550, d.y + Math.sin(a) * 1.6));
                    }
                }
            } else {
                d.aiState = 'CHASE';
                const a = Math.atan2(player.y - d.y, player.x - d.x);
                d.x = Math.max(60, Math.min(740, d.x + Math.cos(a) * cfg.devilSpeed));
                d.y = Math.max(60, Math.min(540, d.y + Math.sin(a) * cfg.devilSpeed));
                if (state.playerInvincible === 0 &&
                    Math.hypot(d.x - player.x, d.y - player.y) < d.r + 16) {
                    damagePlayer();
                }

                // Periodic shooting — only while player is visible (CHASE mode)
                d.shootTimer--;
                if (d.shootTimer <= 0) {
                    d.shootTimer     = cfg.devilShootRate;
                    d.telegraphTimer = 30;
                    d.isAboutToShoot = true;
                }
            }
        }
    }
}

// ── UPDATE: ENEMY PROJECTILES ─────────────────────────────────
function updateEnemyProjectiles() {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const p = enemyProjectiles[i];
        if (timeFreeze > 0) continue;   // shots hang in the air
        if (slowMo > 0 && frameNo % 2) continue;   // slow motion
        p.x += p.dx; p.y += p.dy;
        p.life--;
        if (p.life <= 0 || p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
            enemyProjectiles.splice(i, 1); continue;
        }
        const friendHit = activeFriends().find(f => f.down === 0 && Math.hypot(p.x - f.x, p.y - f.y) < p.r + 16);
        if (friendHit) {
            if (!isShieldedAgainst(p.enemyType)) hurtFriend(friendHit);
            spawnParticles(p.x, p.y, p.color, 4);
            enemyProjectiles.splice(i, 1);
            continue;
        }
        if (Math.hypot(p.x - player.x, p.y - player.y) < p.r + 16 && fight.blocking) {
            if (fight.blockFrames <= PARRY_WINDOW || state.mirrorShield) {   // PARRY! (or the Mirror Shield) bats it back
                const pw = state.power === POWER.NONE ? POWER.ICE : state.power;
                projectiles.push({ x: p.x, y: p.y, dx: -p.dx * 1.6, dy: -p.dy * 1.6, color: '#FFE066', power: pw, life: 90, r: p.r });
                spawnFloatText(player.x, player.y - 36, 'PARRY!', '#FFE066', 45); sfx('superHit'); giveAward('parry');
            } else { spawnParticles(p.x, p.y, '#66AAFF', 6); sfx('hit'); }   // blocked by your shield
            enemyProjectiles.splice(i, 1);
            continue;
        }
        if (Math.hypot(p.x - player.x, p.y - player.y) < p.r + 16) {
            if (!isShieldedAgainst(p.enemyType)) {
                if (state.playerInvincible === 0) damagePlayer();
            }
            // Blocked projectiles vanish with a small spark
            spawnParticles(p.x, p.y, p.color, 4);
            enemyProjectiles.splice(i, 1);
        }
    }
}

// ── UPDATE: SHOOTING ──────────────────────────────────────────
function shoot() {
    if (state.won || state.levelComplete || state.room === ROOM.VOID) return;
    if (state.power === POWER.NONE) { stickSwing(); return; }   // no element yet: swing the stick
    lastP1Shot = Date.now(); tryTeamUp();
    if (fight.blocking) return;
    if (state.ammoReloading || state.ammo <= 0) { stickSwing(); return; }   // reloading: the stick is better than nothing

    const enemies = [];
    enemies.push(...targetableEnemies());
    if (state.room === ROOM.HELL && hell.devil.alive) enemies.push(hell.devil);
    if (!enemies.length) return;

    const target = enemies.reduce((best, e) => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        return d < best.dist ? { en: e, dist: d } : best;
    }, { en: null, dist: Infinity }).en;

    if (!target) return;
    const a = Math.atan2(target.y - player.y, target.x - player.x);
    const w     = WEAPON_INFO[state.power];
    const color = state.power === POWER.RAINBOW ? `hsl(${Math.random() * 360}, 100%, 60%)` : w.color;
    // SUPER and RAINBOW weapons fire 3 shots in a spread for the same ammo
    const spread = state.powerTier >= 2 ? [-0.2, 0, 0.2] : state.lessons.double ? [-0.08, 0.08] : [0];
    for (const off of spread) {
        projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a + off) * w.speed, dy: Math.sin(a + off) * w.speed,
            color, power: state.power, life: 90, r: w.size });
    }

    sfx('shoot');
    // Shadow You copies that too!
    for (const sh of targetableEnemies().filter(e => e.type === 'shadow')) {
        const sa = Math.atan2(player.y - sh.y, player.x - sh.x);
        enemyProjectiles.push({ x: sh.x, y: sh.y, dx: Math.cos(sa) * 6, dy: Math.sin(sa) * 6, color: '#8844CC', life: 100, r: 6, enemyType: 'shadow' });
    }
    state.ammo--;
    if (state.ammo <= 0) {
        state.ammoReloading = true;
        state.ammoReloadTimer = LEVEL_CONFIGS[state.level - 1].reloadFrames;
    }
}

// ── UPDATE: AMMO RELOAD ───────────────────────────────────────
function updateAmmo() {
    if (!state.ammoReloading) return;
    state.ammoReloadTimer--;
    if (state.ammoReloadTimer <= 0) {
        state.ammoReloading  = false;
        state.ammo           = state.ammoMax;
    }
}

