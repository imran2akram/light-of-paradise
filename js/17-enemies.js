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

// ── MONSTERS & BOSSES: new bosses, mini-bosses, the Mega Boss and Gloop the friendly monster ──
function moveNewBoss(e, chase) {
    const minion = (type, n) => { for (let k = 0; k < n; k++) spawnList().push(e0(type, e.x + (k ? 40 : -40), e.y + 30, { emerge: 20, r: 13 })); };
    if (e.type === 'minizombie') { chase(0.8); return true; }
    if (['chocoblob', 'snake', 'dustbunny', 'penguinpal'].includes(e.type)) { chase(1.2); return true; }
    if (e.type === 'minibot' || e.type === 'bonesaur' || e.type === 'knight') { chase(1.1); return true; }
    if (e.type === 'ant') { chase(1.5); e.x += Math.sin(Date.now() / 90 + e.home.x) * 0.8; return true; }
    if (e.type === 'dragonking') { chase(0.6); if (Math.random() < 0.012) { enemyShoot(e, 4.5, '#FF5522', [-0.3, 0, 0.3]); sfx('dragonRoar'); } return true; }
    if (e.type === 'snowkid') {   // pops up behind its snow fort and throws snowballs
        e.x = e.home.x + Math.sin(Date.now() / 700 + e.home.y) * 60;
        if (Math.random() < 0.012) { enemyShoot(e, 4.5, '#FFFFFF'); spawnFloatText(e.x, e.y - 24, 'Take that!', '#FFFFFF', 40); }
        return true;
    }
    if (e.type === 'giant')   { chase(0.6); if (Math.random() < 0.006) { triggerShake(8); spawnFloatText(e.x, e.y - e.r - 10, 'FEE FI FO FUM!', '#FFCC88', 60); } return true; }
    if (e.type === 'bonerex') { chase(0.9); if (Math.random() < 0.008) { spawnFloatText(e.x, e.y - e.r - 10, 'ROOOAR!', '#FFFFFF', 50); sfx('dragonRoar'); triggerShake(6); } return true; }
    if (e.type === 'bedmonster') { chase(0.7); if (Math.random() < 0.01) enemyShoot(e, 4, '#AA66FF', [-0.3, 0, 0.3]); return true; }
    if (e.type === 'babyalien')  { chase(1.5); return true; }
    if (e.type === 'babyspider') { chase(1.9); return true; }
    if (e.type === 'megarobot') {
        chase(0.6);
        if (--e.laserTimer <= 0) { e.laserTimer = 140; enemyShoot(e, 6, '#FF2222', [-0.4, -0.2, 0, 0.2, 0.4]); triggerShake(4); sfx('zap'); }
        return true;
    }
    if (e.type === 'kraken') {   // stays put, sprays ink and pulls you in with its tentacles
        e.x = e.home.x + Math.sin(Date.now() / 600) * 40;
        const d = Math.hypot(player.x - e.x, player.y - e.y) || 1;
        if (d < 300) { player.x -= (player.x - e.x) / d * 0.6; player.y -= (player.y - e.y) / d * 0.6; }
        if (--e.inkTimer <= 0) { e.inkTimer = 120; enemyShoot(e, 3.5, '#331133', [-1.2, -0.6, 0, 0.6, 1.2]); sfx('splash'); }
        return true;
    }
    if (e.type === 'yeti') {
        chase(1.1);
        if (--e.throwTimer <= 0) { e.throwTimer = 150; enemyShoot(e, 5, '#FFFFFF', [-0.15, 0.15]); spawnFloatText(e.x, e.y - e.r - 10, 'RAAAWR!', '#AADDFF', 50); sfx('dragonRoar'); }
        return true;
    }
    if (e.type === 'zombieking')  { chase(0.6); if (--e.summonTimer <= 0) { e.summonTimer = 300; minion('minizombie', 2); spawnFloatText(e.x, e.y - e.r - 10, 'RISE, MY ZOMBIES!', '#88CC88', 70); sfx('groan'); } return true; }
    if (e.type === 'alienqueen')  { chase(0.7); if (--e.summonTimer <= 0) { e.summonTimer = 260; minion('babyalien', 2); spawnFloatText(e.x, e.y - e.r - 10, 'BLEEP BLOOP!', '#88FF88', 60); } return true; }
    if (e.type === 'spiderqueen') { chase(0.6); if (--e.summonTimer <= 0) { e.summonTimer = 220; minion('babyspider', 2); sfx('hiss'); } return true; }
    if (e.type === 'lasershark') {
        chase(1.2);
        if (--e.laserTimer <= 0) { e.laserTimer = 100; enemyShoot(e, 8, '#FF0000'); spawnFloatText(e.x, e.y - e.r - 10, 'PEW PEW!', '#FF6666', 40); sfx('zap'); }
        return true;
    }
    if (e.type === 'megaboss') {   // takes turns doing every boss's best move
        if (--e.moveTimer <= 0) {
            e.moveTimer = 120; e.move = (e.move + 1) % 4;
            const name = ['🔥 FIRE BREATH!', '🐍 HEADS!', '🐂 CHARGE!', '👁 DON\'T LOOK!'][e.move];
            spawnFloatText(e.x, e.y - e.r - 14, name, '#FF88FF', 70);
            if (e.move === 0) enemyShoot(e, 4.5, '#FF5522', [-0.6, -0.3, 0, 0.3, 0.6]);
            if (e.move === 1) minion('hydrahead', 2);
            if (e.move === 2) { const a = Math.atan2(player.y - e.y, player.x - e.x); e.dx = Math.cos(a) * 6; e.dy = Math.sin(a) * 6; e.charge = 30; }
            if (e.move === 3) e.gazeTimer = 80;
        }
        if (e.charge > 0) { e.charge--; e.x += e.dx; e.y += e.dy; e.x = Math.max(50, Math.min(750, e.x)); e.y = Math.max(90, Math.min(560, e.y)); }
        else chase(0.5);
        if (--e.gazeTimer === 0) {
            const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy) || 1;
            if ((state.faceX * dx + state.faceY * dy) / d > 0.3 && !state.invisible) { state.stoned = 90; showToast('🗿 You looked! STONE!', '#AAAAAA', 120); }
        }
        return true;
    }
    return false;
}

// ⚠ Mini-bosses: sometimes one of the monsters in a room is BIG and tough
const MINI_BOSS_CHANCE = 0.35;
function maybeMiniBoss() {
    if (Math.random() >= MINI_BOSS_CHANCE || [ROOM.ARENA, ROOM.CHESS, ROOM.MAZE].includes(state.room)) return;
    const list = spawnList();
    const normal = list.filter(e => e.alive && !BOSS_TYPES.includes(e.type) && !e.mini && e.type !== 'worm' && e.type !== 'shadow');
    if (!normal.length) return;
    const base = normal[Math.floor(Math.random() * normal.length)];
    const spot = randomSpawnSpot(220), hp = ENEMY_TYPES[base.type].hp * 4;
    list.push({ ...base, x: spot.x, y: spot.y, home: { ...(base.home || {}), x: spot.x, y: spot.y }, r: base.r * 1.7, hp, maxHp: hp, coinDrop: 15, mini: true, emerge: 40 });
    showToast(`⚠ A MINI-BOSS ${ENEMY_TYPES[base.type].name.toUpperCase()} is here!`, '#FFAA44', 180);
}
function drawMiniBossLabels() {
    for (const e of roomEnemies()) if (e.mini && e.alive && !e.hidden) {
        ctx.fillStyle = '#FFAA44'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚠ MINI-BOSS', e.x, e.y - e.r - 16);
    }
}

// 👾 Gloop: a lonely monster in Paradise. Give it 3 cookies and it becomes your friend!
const GLOOP = { x: 640, y: 400 };
const GLOOP_COOKIE = 5;
let gloopTimer = 0;
function befriendGloop() {
    if (state.gloop >= 3) { spawnFloatText(GLOOP.x, GLOOP.y - 30, '👾 Gloop loves you!', '#AAFFAA', 60); return; }
    if (!spend(GLOOP_COOKIE)) return;
    state.gloop = (state.gloop || 0) + 1;
    spawnFloatText(GLOOP.x, GLOOP.y - 30, `🍪 Nom nom! ${'💚'.repeat(state.gloop)}`, '#AAFFAA', 80);
    if (state.gloop >= 3) { giveAward('gloop'); sfx('win'); showToast('👾 Gloop is your FRIEND now! It will follow you and help fight!', '#AAFFAA', 240); }
}
function updateGloop() {
    if (state.gloop < 3 || !playing() || ++gloopTimer < 100) return;
    gloopTimer = 0;
    const gx = player.x + 34, gy = player.y - 26, e = nearestTarget(320);
    if (!e) return;
    const a = Math.atan2(e.y - gy, e.x - gx);
    projectiles.push({ x: gx, y: gy, dx: Math.cos(a) * 7, dy: Math.sin(a) * 7, color: '#66FF66', power: POWER.WATER, life: 60, r: 6, fromPet: true });
}
function drawGloop() {
    const t = Date.now() / 1000;
    const draw = (x, y, sad) => {
        ctx.save(); ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👾', x, y + Math.sin(t * 4) * 2); if (sad) { ctx.font = '12px Arial'; ctx.fillText('💧', x + 12, y - 8); } ctx.restore();
    };
    if (state.gloop >= 3) { if (state.gamePhase === 'playing') draw(player.x + 34, player.y - 26, false); return; }
    if (state.room !== ROOM.PARADISE) return;
    draw(GLOOP.x, GLOOP.y, true);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('Gloop (lonely)', GLOOP.x, GLOOP.y + 24);
    if (Math.hypot(player.x - GLOOP.x, player.y - GLOOP.y) < 40 && !menu) {
        const verb = mainBtn();
        drawSpeech({ x: GLOOP.x, y: GLOOP.y - 14 }, `${verb}: Give a cookie (🪙${GLOOP_COOKIE}) ${state.gloop || 0}/3`);
    }
}

