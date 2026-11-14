// ── UPDATE: PROJECTILES & HITS ────────────────────────────────
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.dx; p.y += p.dy;
        p.life--;
        spawnShotTrail(p);
        if (state.bouncy && !p.fromPet && (p.bounces || 0) < 2) {   // 🎾 bounce off the edges
            if (p.x < 0 || p.x > 800) { p.dx *= -1; p.bounces = (p.bounces || 0) + 1; p.x = Math.max(0, Math.min(800, p.x)); p.life += 20; }
            if (p.y < 50 || p.y > 600) { p.dy *= -1; p.bounces = (p.bounces || 0) + 1; p.y = Math.max(50, Math.min(600, p.y)); p.life += 20; }
        }
        if (p.life <= 0 || p.x < 0 || p.x > 800 || p.y < 0 || p.y > 600) {
            projectiles.splice(i, 1); continue;
        }

        let hit = false;

        for (const e of targetableEnemies()) {
            if (Math.hypot(p.x - e.x, p.y - e.y) >= e.r + p.r) continue;
            if (p.pierce) {   // charge shots go right through, hitting each monster once
                if (p.hitSet.has(e)) continue;
                p.hitSet.add(e); damageEnemy(e, p.power, false, state.weaponLevel - 1 + (p.bonus || 0)); addComboHits(1);
                continue;
            }
            if (p.fromPet) petHit(e, p.power);
            else { damageEnemy(e, p.power, false, state.weaponLevel - 1); addComboHits(1); }
            hit = true; break;
        }

        if (!hit && state.room === ROOM.HELL) {
            const d = hell.devil;
            if (d.alive && Math.hypot(p.x - d.x, p.y - d.y) < d.r + p.r) {
                if (p.power === POWER.ICE) d.frozen = DEVIL_FREEZE_FRAMES;
                if (state.lightCrystals >= 3) {
                    d.hp--;
                    sfx('hit');
                    addScore(5);
                    d.shieldFlash = 15;
                    spawnParticles(d.x, d.y, '#FF4400', 8);
                    triggerShake(8);
                    if (d.hp <= 0) {
                        d.alive = false;
                        giveAward('devil');
                        sfx('defeat');
                        addScore(100);
                        spawnParticles(d.x, d.y, '#880000', 20);
                        triggerShake(20);
                        if (state.level < MAX_LEVELS) {
                            state.levelComplete = true;
                        } else {
                            // 😈😈 SURPRISE: his big brother shows up for the real final battle!
                            hell.enemies.push(e0('bigdevil', 400, 150, { r: 56, emerge: 90, coinDrop: 40 }));
                            showToast("😈😈 WAIT… THE DEVIL'S BIG BROTHER IS HERE! This is the REAL final battle!", '#CC88FF', 320);
                            triggerShake(30); sfx('laugh');
                        }
                    }
                } else {
                    d.shieldFlash = 25;
                    sfx('hit');
                    spawnParticles(d.x, d.y, '#FFFFFF', 6);
                    triggerShake(6);
                }
                hit = true;
            }
        }

        if (hit) projectiles.splice(i, 1);
    }
}

// ── UPDATE: DIGGING ───────────────────────────────────────────
// Returns the dig spot the player is standing on (if it still has layers left)
function nearbyDigSpot() {
    if (state.room !== ROOM.HELL) return null;
    return hell.digSpots.find(s =>
        s.depth < DIG_MAX_DEPTH && Math.hypot(player.x - s.x, player.y - s.y) < DIG_RANGE
    ) || null;
}

// You can't dig while a mole monster is out — Space / the button shoots it instead
function canDig() {
    return !hell.enemies.some(e => e.alive && e.type === 'mole');
}

function powerName(power = state.power, tier = state.powerTier) {
    if (power === POWER.NONE)    return 'Smiting Stick';
    if (power === POWER.RAINBOW) return 'Rainbow';
    return tier >= 2 ? `Super ${power}` : power;
}

// Finds a place for the mole to come up: far from the player, in the room, and
// preferably in (or at the edge of) the player's cave so they can see it (you only
// see inside the cave while hiding), then in the other cave, then anywhere
const MOLE_EDGE_PAD = 45;   // px around a cave still counts as "at the edge"
function moleSpawnPoint(s) {
    const farEnough = (x, y) => Math.hypot(x - player.x, y - player.y) >= MOLE_MIN_DIST;
    const ownCave = HELL_CAVES.find(c => s.x >= c.x && s.x <= c.x + c.w && s.y >= c.y && s.y <= c.y + c.h);
    const around = c => {
        const out = [];
        for (let i = 0; i < 40; i++) {
            const x = c.x - MOLE_EDGE_PAD + Math.random() * (c.w + 2 * MOLE_EDGE_PAD), y = c.y - MOLE_EDGE_PAD + Math.random() * (c.h + 2 * MOLE_EDGE_PAD);
            if (x >= 40 && x <= 760 && y >= 80 && y <= 560 && farEnough(x, y)) out.push({ x, y });
        }
        return out;
    };
    const own = ownCave ? around(ownCave) : [];
    const other = HELL_CAVES.filter(c => c !== ownCave).flatMap(around);
    const anywhere = [];
    for (let i = 0; i < 40; i++) {
        const x = 40 + Math.random() * 720, y = 80 + Math.random() * 480;
        if (farEnough(x, y)) anywhere.push({ x, y });
    }
    const list = own.length ? own : other.length ? other : anywhere;
    if (list.length) return list[Math.floor(Math.random() * list.length)];
    // Nothing found (very unlikely): the far side of the room from the player
    return { x: player.x < 400 ? 700 : 100, y: player.y < 300 ? 500 : 100 };
}

function spawnMole(s) {
    const p = moleSpawnPoint(s);
    hell.enemies.push({
        type: 'mole', x: p.x, y: p.y, alive: true,
        r: 13 + s.depth * 2, hp: s.depth * 2 + 1, maxHp: s.depth * 2 + 1, hitFlash: 0, frozen: 0,
        speed: 0.8 + s.depth * 0.25,
        warn: MOLE_WARN_FRAMES,        // shaking mound first (can't hurt or be hurt)
        emerge: MOLE_EMERGE_FRAMES,    // then climbs out (still harmless)
        slowStart: MOLE_SLOW_FRAMES,   // then walks slowly for a moment
    });
    sfx('rumble');
}

function nearbyGem() {
    if (state.room !== ROOM.UNDERGROUND) return null;
    return underground.gems.find(g => !g.mined && Math.hypot(player.x - g.x, player.y - g.y) < 30) || null;
}

// Mining a gem in the Underground Caves: a few hits, then +1 heart and points
function tryMine() {
    const gem = nearbyGem();
    if (!gem) return false;
    gem.hits++;
    sfx('dig');
    spawnParticles(gem.x, gem.y, gem.color, 5);
    if (gem.hits >= GEM_HITS) {
        gem.mined = true;
        const maxHp = fullHearts();
        if (state.playerHp < maxHp) state.playerHp++;
        addScore(50);
        spawnFloatText(gem.x, gem.y - 26, '💎 +50  +1 ❤', gem.color, 90);
        spawnParticles(gem.x, gem.y, gem.color, 16);
        sfx('found');
    }
    return true;
}

// Returns true if the player dug (so Space / the button doesn't also shoot)
function tryDig() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    if (tryMine()) return true;
    const s = nearbyDigSpot();
    if (!s || !canDig()) return false;
    s.hits++;
    state.digAnim = 14;
    sfx('dig');
    spawnParticles(s.x, s.y, '#8B5A2B', 6);
    triggerShake(3);
    if (s.hits < DIG_HITS_PER_LAYER[s.depth]) return true;

    // Broke through a layer!
    s.hits = 0;
    s.depth++;
    // The bottom layer only SOMETIMES has Rainbow Power — otherwise it's another Super weapon
    const rainbow = s.depth === 3 && Math.random() < RAINBOW_CHANCE;
    const tier   = rainbow ? 3 : Math.min(s.depth, 2);
    const weapon = rainbow ? POWER.RAINBOW : s.weapon;
    const color  = WEAPON_INFO[weapon].color;
    const name   = (tier === 2 ? 'SUPER ' : '') + WEAPON_INFO[weapon].label;
    let text;
    if (state.power !== POWER.NONE && tier < state.powerTier) {
        text = `Found ${name} — yours is better!`;
    } else {
        state.power     = weapon;
        state.powerTier = tier;
        state.playerFlash = 25;
        if (weapon === POWER.RAINBOW) giveAward('rainbow');
        text = tier === 3 ? `LEGENDARY! ${name}!` : tier === 2 ? `RARE! ${name}!` : `You found ${name}!`;
    }
    spawnParticles(s.x, s.y, color, 10 + tier * 6);
    triggerShake(6 + tier * 2);
    sfx('found');
    addScore(5 * tier);

    let sub = s.depth < DIG_MAX_DEPTH ? 'Keep digging for something rarer…'
            : rainbow ? '' : 'No Rainbow down here this time…';
    if (s.depth === DIG_MAX_DEPTH && s.tunnel) sub = 'What\'s that? A secret TUNNEL!';
    if (Math.random() < DIG_MOLE_CHANCE[s.depth - 1]) {
        spawnMole(s);
        sub = 'Look out — a MOLE MONSTER!';
    }
    hell.foundMsg = { text, sub, color, timer: 120 };
    return true;
}

function updateDigging() {
    if (hell.foundMsg && --hell.foundMsg.timer <= 0) hell.foundMsg = null;
}

// ── UPDATE: PET ───────────────────────────────────────────────
const pet = { x: 370, y: 320, cooldown: 0, healTimer: 0, face: 1 };

function petLevel(j = state.activePet) {
    const xp = (state.petXp || [])[j] || 0;
    let lv = 1;
    PET_XP_LEVELS.forEach((need, i) => { if (xp >= need) lv = i + 1; });
    return lv;
}

// Your pet learns from every fight
function petGainXp(n) {
    if (state.activePet < 0) return;
    const before = petLevel();
    state.petXp[state.activePet] = (state.petXp[state.activePet] || 0) + n;
    const after = petLevel();
    if (after > before) {
        showToast(PETS[state.activePet].id === 'dragon' ? `🐉 Your dragon GREW UP! It's level ${after} and bigger now!` : `⭐ Your ${PETS[state.activePet].name} reached LEVEL ${after}!`, '#FFE066', 180);
        spawnParticles(pet.x, pet.y, '#FFE066', 16);
        sfx('found');
        if (after >= 5) giveAward('petMaster');
    }
}

// A pet hit a bad guy (and learns something)
function petHit(e, power) {
    const lv = petLevel();
    damageEnemy(e, power, false, lv >= 5 ? 2 : lv >= 3 ? 1 : 0);
    petGainXp(e.alive ? 2 : 10);
}

function placePetBesidePlayer() {
    pet.x = player.x - 28; pet.y = player.y + 16; pet.cooldown = 30;
}

// School lessons that work all the time
function updateLessons() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return;
    if (state.lessons.magnet) {   // coins fly to you
        for (const c of roomCoins()) {
            if (c.picked) continue;
            const d = Math.hypot(player.x - c.x, player.y - c.y);
            if (d < 260 && d > 1) { c.x += (player.x - c.x) / d * 4; c.y += (player.y - c.y) / d * 4; }
        }
    }
    if (state.lessons.healing && state.playerHp < fullHearts() && ++state.lessonHealTimer >= 1800) {
        state.lessonHealTimer = 0; state.playerHp++;
        spawnFloatText(player.x, player.y - 30, '💖 +1', '#FF88AA', 60);
    }
    if (state.lessons.reload && state.ammoReloading) state.ammoReloadTimer--;   // counts down twice as fast
}

function updatePet() {
    if (state.activePet < 0 || state.gamePhase !== 'playing' || state.won || state.levelComplete) return;
    const info = PETS[state.activePet];
    if (pet.cooldown > 0) pet.cooldown--;

    // Nearest bad guy close to YOU (pets don't wander off across the map)
    let target = null, best = info.range;
    for (const e of targetableEnemies()) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < best) { best = d; target = e; }
    }

    // Where the pet wants to be: next to you, or chasing something
    let goal = { x: player.x - 28 * pet.face, y: player.y + 16 };
    if (info.id === 'puppy') {
        // Fetch! Runs to coins near you and picks them up
        const coin = roomCoins().find(c => !c.picked && Math.hypot(c.x - player.x, c.y - player.y) < 220);
        if (coin) {
            goal = coin;
            if (Math.hypot(coin.x - pet.x, coin.y - pet.y) < 16) { coin.picked = true; collectCoin(); }
        } else if (target) goal = target;
    } else if ((info.id === 'kitten' || info.id === 'trex') && target) {
        goal = target;
    }

    const dx = goal.x - pet.x, dy = goal.y - pet.y, dist = Math.hypot(dx, dy);
    if (dist > 4) {
        const spd = Math.min(info.speed * (dist > 150 ? 2 : 1), dist);   // hurries to catch up
        pet.x += dx / dist * spd; pet.y += dy / dist * spd;
        if (Math.abs(dx) > 1) pet.face = dx > 0 ? -1 : 1;
    }
    pet.x = Math.max(12, Math.min(788, pet.x));
    pet.y = Math.max(56, Math.min(588, pet.y));

    // Attacks — every pet does a little damage (1), except its own element's strong hits.
    // Higher-level pets attack faster and harder.
    const cooldown = Math.round(info.cooldown * (1 - (petLevel() - 1) * 0.1));
    if (target && pet.cooldown === 0) {
        if (info.id === 'puppy' || info.id === 'kitten') {
            if (Math.hypot(target.x - pet.x, target.y - pet.y) < target.r + 12) {
                pet.cooldown = cooldown;
                spawnParticles(target.x, target.y, '#FFFFFF', 4);
                sfx(info.id === 'puppy' ? 'bark' : 'meow');
                petHit(target, POWER.NONE);
            }
        } else if (info.id === 'trex') {
            // Runs over and STOMPS — hurts everything nearby
            if (Math.hypot(target.x - pet.x, target.y - pet.y) < 60) {
                pet.cooldown = cooldown;
                for (const e of targetableEnemies()) if (Math.hypot(e.x - pet.x, e.y - pet.y) < 75) petHit(e, POWER.NONE);
                spawnParticles(pet.x, pet.y + 8, '#8A6A4A', 16);
                triggerShake(10);
                sfx('boom');
                pet.stomp = 15;
            }
        } else {
            // Owl: lightning feathers · Dragon: fireballs · Penguin: snowballs · Unicorn: rainbows
            pet.cooldown = cooldown;
            const power = { owl: POWER.LIGHTNING, dragon: POWER.BRIMSTONE, penguin: POWER.ICE, unicorn: POWER.RAINBOW, robodog: POWER.LIGHTNING, goose: POWER.WATER }[info.id];
            const a = Math.atan2(target.y - pet.y, target.x - pet.x);
            const color = info.id === 'penguin' ? '#FFFFFF' : info.id === 'unicorn' ? `hsl(${Math.random() * 360}, 100%, 65%)`
                        : info.id === 'robodog' ? '#FF3333' : info.id === 'goose' ? '#FFD700' : WEAPON_INFO[power].color;
            projectiles.push({ x: pet.x, y: pet.y, dx: Math.cos(a) * 8, dy: Math.sin(a) * 8,
                               color, power, life: 60, r: 5, fromPet: true });
            sfx(info.id === 'owl' ? 'hoot' : info.id === 'penguin' ? 'whoosh' : info.id === 'unicorn' ? 'magic' : 'shoot');
        }
    }
    if (pet.stomp > 0) pet.stomp--;

    // The Owl and the Unicorn heal you now and then (faster at higher levels)
    if (info.id === 'owl' || info.id === 'unicorn') {
        const every = (info.id === 'owl' ? OWL_HEAL_FRAMES : UNICORN_HEAL_FRAMES) * (1 - (petLevel() - 1) * 0.12);
        if (state.playerHp < fullHearts() && ++pet.healTimer >= every) {
            pet.healTimer = 0;
            state.playerHp++;
            spawnFloatText(player.x, player.y - 30, `+1 ❤ from your ${info.name}!`, '#FF88AA', 70);
            spawnParticles(player.x, player.y, info.id === 'unicorn' ? '#FFAAFF' : '#FF88AA', 12);
            sfx('buy');
        }
    }
}

// ── DANCE & FART ──────────────────────────────────────────────
const VDANCE = { x: 640, y: 415, r: 20 };   // touch buttons above SHOOT
const VFART  = { x: 760, y: 415, r: 20 };

function playing() { return state.gamePhase === 'playing' && !state.won && !state.levelComplete && !state.shopOpen && !menu; }

// People nearby react
function nearbyTownsfolk(range) {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day') return [];
    return [...WORKERS, ...paradise.villagers].filter(n => Math.hypot(n.x - player.x, n.y - player.y) < range);
}

function dance() {
    if (!playing() || state.danceTimer > 0) return;
    state.danceTimer = 100;
    giveAward('dance');
    [523, 659, 784, 659, 880, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, null, i * 0.12));
    const fan = nearbyTownsfolk(110)[0];
    if (fan) say(fan, ['Nice moves!', 'Wow, you can dance!', 'Woohoo! 🎉'][Math.floor(Math.random() * 3)]);
    let dancers = 0;
    for (const e of targetableEnemies()) {   // 🕺 monsters nearby can't help dancing too!
        if (BOSS_TYPES.includes(e.type) || Math.hypot(e.x - player.x, e.y - player.y) > 220) continue;
        e.dancing = 150; e.frozen = Math.max(e.frozen || 0, 150); dancers++;
    }
    if (dancers) spawnFloatText(player.x, player.y - 44, `${dancers} monster${dancers > 1 ? 's' : ''} dancing! 🕺`, '#FF88FF', 70);
}

// A stinky cloud that hurts monsters right next to you 😂
const SUPER_FART_CHANCE = 0.25;   // 1 in 4 farts knocks every monster over
function fart() {
    if (!playing() || state.fartCooldown > 0) return;
    state.fartCooldown = 60;
    countStat('farts');
    sfx('fart');
    for (let i = 0; i < 14; i++) {
        particles.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y + 12, dx: (Math.random() - 0.5) * 2, dy: -Math.random() * 1.2,
                         life: 60, maxLife: 60, color: ['#9ACD32', '#7FA830', '#C8E070'][i % 3], r: 6 + Math.random() * 6 });
    }
    for (const e of targetableEnemies()) {
        if (Math.hypot(e.x - player.x, e.y - player.y) < 70) damageEnemy(e, POWER.NONE);
    }
    pushAll(50, 120);   // the smell pushes monsters back
    if (Math.random() < SUPER_FART_CHANCE) {   // 💨💨💨 SUPER FART!
        pushAll(220, 260); hitAll(1, POWER.NONE, 260); freezeAll(90, 260);
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
            particles.push({ x: player.x, y: player.y + 10, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp, life: 70, maxLife: 70, color: ['#9ACD32', '#7FA830', '#C8E070'][i % 3], r: 8 + Math.random() * 10 });
        }
        triggerShake(18); tone(70, 0.6, 'sawtooth', 0.25, 40);
        showToast('💨💨💨 SUPER FART!!! 💨💨💨', '#9ACD32', 150); giveAward('superFart');
    }
    const n = nearbyTownsfolk(100)[0];
    if (n) say(n, ['EWWW! 🤢', 'What is that SMELL?!', 'Pee-yew!'][Math.floor(Math.random() * 3)]);
}

function updateDanceAndFart() {
    if (state.fartCooldown > 0) state.fartCooldown--;
    if (state.danceTimer > 0) {
        state.danceTimer--;
        if (state.danceTimer % 14 === 0) {
            spawnFloatText(player.x + (Math.random() - 0.5) * 40, player.y - 20, Math.random() < 0.5 ? '♪' : '♫',
                           `hsl(${Math.random() * 360}, 100%, 70%)`, 50);
        }
    }
}

// ── GADGETS & DASH ────────────────────────────────────────────
const VGADGET = { x: 600, y: 540, r: 22 };   // touch buttons
const VBUILD  = { x: 530, y: 560, r: 20 };
const VSPELL  = { x: 580, y: 470, r: 20 };
const VMOUNT  = { x: 470, y: 560, r: 20 };
const VGOD    = { x: 520, y: 500, r: 20 };
const VDASH   = { x: 700, y: 385, r: 20 };
let gadgetObjs = [];   // boomerangs, bombs and tornadoes flying about

function nearestTarget(range = 400) {
    let best = null, bestD = range;
    for (const e of targetableEnemies()) {
        if (e.frog) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < bestD) { best = e; bestD = d; }
    }
    return best;
}

// Where to aim: the nearest monster, or straight ahead
function aimPoint(dist = 140) {
    const t = nearestTarget();
    return t ? { x: t.x, y: t.y } : { x: player.x + state.faceX * dist, y: player.y + state.faceY * dist };
}

function useGadget() {
    if (!playing() || !state.gadget || state.gadgetCooldown > 0 || state.room === ROOM.VOID) return;
    const g = GADGETS.find(g => g.id === state.gadget);
    const aim = aimPoint();
    const a = Math.atan2(aim.y - player.y, aim.x - player.x);
    if (useFightGadget(g.id, a)) {
        // handled in the FIGHTING EXTRAS section
    } else if (g.id === 'mjolnir') {
        gadgetObjs.push({ kind: 'boomerang', hammer: true, x: player.x, y: player.y, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, t: 0, hits: new Set() });
        sfx('whoosh');
    } else if (g.id === 'cloak') {
        state.invisible = 600; spawnParticles(player.x, player.y, '#AACCFF', 20); sfx('magic');
        showToast('🧥 You vanished! Nothing can hurt you!', '#AACCFF', 150);
    } else if (g.id === 'map') {
        magicMapTimer = 600; sfx('magic');
        showToast('🗺 "I solemnly swear…" The map shows every monster!', '#F4E8C0', 150);
    } else if (g.id === 'boomerang') {
        gadgetObjs.push({ kind: 'boomerang', x: player.x, y: player.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, t: 0, hits: new Set() });
        sfx('whoosh');
    } else if (g.id === 'bomb') {
        gadgetObjs.push({ kind: 'bomb', x: player.x, y: player.y, sx: player.x, sy: player.y, tx: aim.x, ty: aim.y, t: 0, dur: 36 });
        sfx('whoosh');
    } else if (g.id === 'wand') {
        const e = nearestTarget(320);
        if (!e) { showToast('🪄 No monster close enough to zap!', '#CC99FF', 90); return; }
        bolts.push({ x1: player.x, y1: player.y, x2: e.x, y2: e.y, life: 14 });
        if (e.type === 'king') {
            spawnFloatText(e.x, e.y - e.r - 10, 'Too big to be a frog!', '#CC99FF', 70);
        } else {
            Object.assign(e, { frog: true, hp: 1, maxHp: 1, frozen: 0, hopTimer: 20, dx: 0, dy: 0, r: 12 });
            spawnParticles(e.x, e.y, '#CC99FF', 16);
            spawnFloatText(e.x, e.y - 24, 'RIBBIT! 🐸', '#88FF88', 70);
        }
        sfx('magic');
    } else if (g.id === 'tornado') {
        gadgetObjs.push({ kind: 'tornado', x: aim.x, y: aim.y, t: 0, dur: 180 });
        sfx('whoosh');
    } else if (g.id === 'bow') {
        const ar = ARROWS[state.arrowKind = ((state.arrowKind || 0) + 1) % ARROWS.length];
        gadgetObjs.push({ kind: 'arrow', arrow: ar, x: player.x, y: player.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, t: 0 });
        spawnFloatText(player.x, player.y - 30, ar.label, ar.color, 30); sfx('whoosh');
    } else if (g.id === 'watergun') {
        const wob = (Math.random() - 0.5) * 0.15;
        gadgetObjs.push({ kind: 'squirt', x: player.x, y: player.y, vx: Math.cos(a + wob) * 10, vy: Math.sin(a + wob) * 10, t: 0 });
        if (Math.random() < 0.3) sfx('splash');
    } else if (g.id === 'snowball') {
        gadgetObjs.push({ kind: 'snowball', x: player.x, y: player.y, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, t: 0 });
        sfx('whoosh');
    } else if (g.id === 'paint') {
        gadgetObjs.push({ kind: 'paint', x: player.x, y: player.y, vx: Math.cos(a) * 9, vy: Math.sin(a) * 9, t: 0, hue: Math.floor(Math.random() * 360) });
        sfx('whoosh');
    } else if (g.id === 'banana') {
        const peels = gadgetObjs.filter(o => o.kind === 'peel');
        if (peels.length >= MAX_PEELS) gadgetObjs.splice(gadgetObjs.indexOf(peels[0]), 1);   // the oldest one goes
        gadgetObjs.push({ kind: 'peel', x: player.x - state.faceX * 16, y: player.y + 12, t: 0, spin: Math.random() * 6 });
        spawnFloatText(player.x, player.y - 30, '🍌 peel dropped!', '#FFE066', 40); sfx('pop');
    }
    state.gadgetCooldown = g.cooldown;
    checkMagicCombo('gadget');   // last, so the combo message shows on top
}

function dash() {
    if (!playing() || !state.hasDash || state.dashCooldown > 0) return;
    // Dodged at the very last moment? PERFECT DODGE → slow motion!
    const close = enemyProjectiles.some(q => Math.hypot(q.x - player.x, q.y - player.y) < 60)
               || targetableEnemies().some(e => Math.hypot(e.x - player.x, e.y - player.y) < e.r + 30);
    if (close) { slowMo = 120; sfx('magic'); giveAward('perfectDodge'); }
    state.dashTimer = 8;
    state.dashCooldown = DASH_COOLDOWN;
    sfx('whoosh');
}

function updateGadgets() {
    if (state.gadgetCooldown > 0) state.gadgetCooldown--;
    if (state.dashCooldown > 0)   state.dashCooldown--;
    for (let i = gadgetObjs.length - 1; i >= 0; i--) {
        const o = gadgetObjs[i];
        o.t++;
        if (o.kind === 'boomerang') {
            if (o.t > 28) {   // curve back to you
                const a = Math.atan2(player.y - o.y, player.x - o.x);
                o.vx += Math.cos(a) * 1.1; o.vy += Math.sin(a) * 1.1;
                const sp = Math.hypot(o.vx, o.vy); if (sp > 11) { o.vx *= 11 / sp; o.vy *= 11 / sp; }
                if (Math.hypot(player.x - o.x, player.y - o.y) < 18) { gadgetObjs.splice(i, 1); continue; }
            }
            o.x += o.vx; o.y += o.vy;
            for (const e of targetableEnemies()) {
                if (o.hits.has(e) || Math.hypot(e.x - o.x, e.y - o.y) > e.r + 12) continue;
                o.hits.add(e);
                if (o.hammer) { bolts.push({ x1: e.x + 10, y1: 50, x2: e.x, y2: e.y, life: 12 }); damageEnemy(e, POWER.LIGHTNING, false, 2 + state.weaponLevel - 1); sfx('zap'); }
                else damageEnemy(e, POWER.NONE, false, 1 + state.weaponLevel - 1);
            }
            if (o.t > 150) gadgetObjs.splice(i, 1);
        } else if (o.kind === 'bomb') {
            const k = o.t / o.dur;
            o.x = o.sx + (o.tx - o.sx) * k; o.y = o.sy + (o.ty - o.sy) * k - Math.sin(k * Math.PI) * 60;   // arcs through the air
            if (o.t >= o.dur) {
                for (const e of targetableEnemies()) {
                    if (Math.hypot(e.x - o.tx, e.y - o.ty) < 95) damageEnemy(e, POWER.NONE, false, 2 + state.weaponLevel - 1);
                }
                for (let k2 = 0; k2 < 3; k2++) spawnParticles(o.tx, o.ty, ['#FFEE66', '#FF8800', '#555555'][k2], 16);
                triggerShake(18);
                sfx('boom');
                gadgetObjs.splice(i, 1);
            }
        } else if (o.kind === 'arrow' || o.kind === 'squirt' || o.kind === 'snowball' || o.kind === 'paint') {
            o.x += o.vx; o.y += o.vy;
            if (o.kind === 'snowball' || o.kind === 'paint') o.vy += 0.05;   // a little bit of an arc
            const e = targetableEnemies().find(e => Math.hypot(e.x - o.x, e.y - o.y) < e.r + 6);
            if (e) { gadgetHit(o, e); gadgetObjs.splice(i, 1); continue; }
            if (o.t > 80 || o.x < 0 || o.x > 800 || o.y < 50 || o.y > 600) {
                if (o.kind === 'arrow' && o.arrow.kind === 'bomb') arrowBoom(o.x, o.y);
                if (o.kind === 'paint') spawnParticles(o.x, o.y, `hsl(${o.hue},90%,55%)`, 6);
                gadgetObjs.splice(i, 1);
            }
        } else if (o.kind === 'peel') {
            const e = targetableEnemies().find(e => !(e.stun > 0) && !(e.air > 0) && Math.hypot(e.x - o.x, e.y - o.y) < e.r + 8);
            if (e && BOSS_TYPES.includes(e.type)) {   // far too big to slip — they just squash it
                spawnFloatText(o.x, o.y - 20, 'squish!', '#FFE066', 40); gadgetObjs.splice(i, 1); continue;
            }
            if (e) {
                e.stun = 90; e.slip = 30;
                damageEnemy(e, POWER.NONE, false, state.weaponLevel - 1);
                spawnFloatText(e.x, e.y - e.r - 14, 'WHOOPS! SLIP!', '#FFE066', 60); sfx('boing'); giveAward('banana');
                gadgetObjs.splice(i, 1); continue;
            }
            if (o.t > 1800) gadgetObjs.splice(i, 1);   // peels rot away after 30 s
        } else if (o.kind === 'tornado') {
            const tgt = nearestTarget(600);
            if (tgt) { o.x += Math.sign(tgt.x - o.x) * 1.2; o.y += Math.sign(tgt.y - o.y) * 1.2; }
            for (const e of targetableEnemies()) {
                const d = Math.hypot(e.x - o.x, e.y - o.y);
                if (d < 140 && d > 4) {   // pulled in and spun around
                    const a = Math.atan2(e.y - o.y, e.x - o.x) + 0.12;
                    const nd = Math.max(8, d - 1.6);
                    e.x = o.x + Math.cos(a) * nd; e.y = o.y + Math.sin(a) * nd;
                }
                if (d < 40 && o.t % 30 === 0) damageEnemy(e, POWER.NONE, false, state.weaponLevel - 1);
            }
            if (o.t >= o.dur) gadgetObjs.splice(i, 1);
        }
    }
}

function arrowBoom(x, y) {
    for (const e of targetableEnemies()) if (Math.hypot(e.x - x, e.y - y) < 70) damageEnemy(e, POWER.NONE, false, 2 + state.weaponLevel - 1);
    for (let k = 0; k < 3; k++) spawnParticles(x, y, ['#FFEE66', '#FF8800', '#555555'][k], 12);
    triggerShake(12); sfx('boom');
}

// One of the new gadget shots hit a monster
function gadgetHit(o, e) {
    const boss = BOSS_TYPES.includes(e.type), bonus = state.weaponLevel - 1;
    if (o.kind === 'arrow') {
        if (o.arrow.kind === 'bomb') arrowBoom(o.x, o.y);
        else damageEnemy(e, o.arrow.power, false, 1 + bonus);
    } else if (o.kind === 'squirt') {   // hardly hurts, but pushes them WAY back
        if (Math.random() < 0.25) damageEnemy(e, POWER.WATER, false, -1 + bonus);
        if (!boss) { e.x = Math.max(30, Math.min(770, e.x + o.vx * 3.5)); e.y = Math.max(70, Math.min(580, e.y + o.vy * 3.5)); e.stun = Math.max(e.stun || 0, 6); }
        spawnParticles(o.x, o.y, '#66CCFF', 4);
    } else if (o.kind === 'snowball') {
        damageEnemy(e, POWER.NONE, false, bonus);
        if (e.alive && !e.frog) { e.frozen = Math.max(e.frozen || 0, boss ? 30 : 80); sfx('freeze'); }
        spawnParticles(o.x, o.y, '#FFFFFF', 10);
    } else if (o.kind === 'paint') {
        e.painted = boss ? PAINT_FRAMES / 3 : PAINT_FRAMES; e.paintHue = o.hue;
        spawnParticles(o.x, o.y, `hsl(${o.hue},90%,55%)`, 14);
        spawnFloatText(e.x, e.y - e.r - 14, "SPLAT! I can't see!", `hsl(${o.hue},90%,65%)`, 60); sfx('pop');
    }
}

// Painted monsters can't see — they stumble about and can't find you
function moveConfused(e) {
    if (--e.hopTimer <= 0 || e.hopTimer === undefined) {
        e.hopTimer = 30 + Math.random() * 30;
        const a = Math.random() * Math.PI * 2;
        e.dx = Math.cos(a) * 1.4; e.dy = Math.sin(a) * 1.4;
    }
    e.x = Math.max(40, Math.min(760, e.x + e.dx)); e.y = Math.max(70, Math.min(560, e.y + e.dy));
}

function drawGadgets() {
    const t = Date.now() / 1000;
    for (const o of gadgetObjs) {
        ctx.save();
        if (o.kind === 'boomerang' && o.hammer) {
            ctx.translate(o.x, o.y); ctx.rotate(o.t * 0.5); ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = '#AADDFF'; ctx.shadowBlur = 16; ctx.fillText('🔨', 0, 0);
        } else if (o.kind === 'boomerang') {
            ctx.translate(o.x, o.y); ctx.rotate(o.t * 0.5);
            ctx.strokeStyle = '#C8843A'; ctx.lineWidth = 5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(0, -6); ctx.lineTo(10, 6); ctx.stroke();
        } else if (o.kind === 'bomb') {
            drawGroundShadow(o.x, o.ty + 8, 8, 3);
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(o.x - 3, o.y - 3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = Math.random() < 0.5 ? '#FFEE66' : '#FF6600';   // fizzing fuse
            ctx.beginPath(); ctx.arc(o.x + 6, o.y - 9, 3, 0, Math.PI * 2); ctx.fill();
        } else if (o.kind === 'arrow') {
            ctx.translate(o.x, o.y); ctx.rotate(Math.atan2(o.vy, o.vx));
            ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(6, 0); ctx.stroke();
            ctx.fillStyle = o.arrow.color; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#EEE'; ctx.fillRect(-15, -3, 4, 2); ctx.fillRect(-15, 1, 4, 2);   // feathers
            if (o.arrow.kind === 'fire') { ctx.fillStyle = Math.random() < 0.5 ? '#FFAA00' : '#FF4400'; ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI * 2); ctx.fill(); }
        } else if (o.kind === 'squirt') {
            ctx.fillStyle = 'rgba(120,200,255,0.85)'; ctx.beginPath(); ctx.arc(o.x, o.y, 4, 0, Math.PI * 2); ctx.fill();
        } else if (o.kind === 'snowball') {
            drawGroundShadow(o.x, o.y + 14, 6, 2);
            ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#BBD4E8'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (o.kind === 'paint') {
            ctx.fillStyle = `hsl(${o.hue},90%,55%)`; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(o.x - 2, o.y - 2, 2, 0, Math.PI * 2); ctx.fill();
        } else if (o.kind === 'peel') {
            ctx.translate(o.x, o.y); ctx.rotate(o.spin);
            ctx.fillStyle = '#FFE135'; ctx.strokeStyle = '#8A7A20'; ctx.lineWidth = 1;
            for (let k = 0; k < 3; k++) {   // three floppy bits of peel
                ctx.save(); ctx.rotate(k * 2.1); ctx.beginPath(); ctx.ellipse(0, -7, 3.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
            }
            ctx.fillStyle = '#6A5A10'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (o.kind === 'tornado') {
            ctx.globalAlpha = Math.min(1, (o.dur - o.t) / 30);
            for (let k = 0; k < 9; k++) {
                const y = o.y + 20 - k * 7, w = 8 + k * 4;
                ctx.strokeStyle = `rgba(200,210,220,${0.7 - k * 0.05})`; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.ellipse(o.x + Math.sin(t * 8 + k) * 4, y, w, w * 0.3, 0, t * 10 + k, t * 10 + k + Math.PI * 1.5); ctx.stroke();
            }
        }
        ctx.restore();
    }
}

// A clickable BUILD button that also shows which block you're holding
const BUILD_BTN = { x: 248, y: 5, w: 118, h: 22 };   // in the top bar
function drawBuildButton() {
    if (lastInput === 'touch' || state.gamePhase !== 'playing' || state.won || state.levelComplete) return;
    const b = BUILD_BTN, type = HOTBAR[state.hotbar];
    ctx.save();
    ctx.fillStyle = state.buildMode ? 'rgba(255,224,102,0.9)' : 'rgba(0,0,0,0.6)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.drawImage(blockCanvas(type), b.x + 3, b.y + 3, 16, 16);
    ctx.fillStyle = state.buildMode ? '#222' : '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`BUILD (${keyName('B', 'L3')}) ${isCreative() ? '∞' : '×' + invCount(type)}`, b.x + 22, b.y + b.h / 2 + 1);
    ctx.restore();
}

// Little gadget + dash icons in the bottom-left corner (keyboard and controller: on a phone the real buttons are in the side margins)
const GADGET_SLOT_STEP = 52;   // room for a 12 px key name beside each round slot
function drawGadgetHud() {
    if (lastInput === 'touch') return;
    const slots = [];
    if (state.gadget) {
        const g = GADGETS.find(g => g.id === state.gadget);
        slots.push({ icon: g.icon, key: keyName('Q', 'B'), cd: state.gadgetCooldown / g.cooldown });
    }
    if (state.hasDash) slots.push({ icon: '💨', key: keyName('⇧', 'LT'), cd: state.dashCooldown / DASH_COOLDOWN });
    if (state.spell) {
        const sp = SPELLS.find(x => x.id === state.spell);
        slots.push({ icon: sp.icon, key: keyName('R', 'X'), cd: state.spellCooldown / sp.cooldown });
    }
    const gp = nextGodPower();
    if (gp) slots.push({ icon: gp.icon, key: keyName('T', 'BACK'), cd: state.godCooldown / gp.cd });
    slots.forEach((sl, i) => {
        const x = 70 + i * GADGET_SLOT_STEP, y = 574;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
        if (sl.cd > 0) {   // cooldown sweep
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sl.cd); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = sl.cd > 0 ? '#777' : '#FFD700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFF';
        ctx.fillText(sl.icon, x, y + 1);
        ctx.font = 'bold 12px Arial';   // the key name sits on a dark tag so 12 px reads over anything
        const tw = ctx.measureText(sl.key).width + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x + 14 - tw / 2, y - 21, tw, 15);
        ctx.fillStyle = '#FFE680'; ctx.fillText(sl.key, x + 14, y - 13);
        ctx.restore();
    });
}

// ── PET RACES (talk to the Race Master in the Void) ──────────
const RACE_MASTER  = { x: 700, y: 470 };
const RACE_FINISH  = 700;
let race = null;   // { lanes: [{ pet, x, you }], countdown, winner, doneTimer }

function nearRaceMaster() {
    return state.room === ROOM.VOID && !state.shopOpen && Math.hypot(player.x - RACE_MASTER.x, player.y - RACE_MASTER.y) < 44;
}

function raceItems() {
    return [
        { icon: '🐾', name: 'Pet Race',  desc: 'Tap fast to make your pet run', cost: 0, status: 'GO!', action: () => { menu = null; startRace(); } },
        { icon: '⭕', name: 'Ring Race', desc: 'Grab the rings! Friends can race too', cost: 0, status: 'GO!', action: () => { menu = null; startRingRace(); } },
        { icon: '🐾', name: 'Pet Battle', desc: 'Your pet vs a wild pet! Tap to cheer', cost: 0, status: 'GO!', action: () => { menu = null; startPetBattle(); } },
        { icon: '🎪', name: 'Mini-Games', desc: 'Football, tag, quiz, dancing and more!', cost: 0, status: 'LOOK →', action: () => openMenu('🎪 MINI-GAMES', miniGameItems) },
        { icon: '⚔', name: 'Friend Battle', desc: 'Bonk your friends! Last one standing wins', cost: 0, status: activeFriends().length ? 'FIGHT!' : 'NEEDS 2', action: () => { menu = null; startBattle(); } },
    ];
}

function startRace() {
    if (state.activePet < 0) { showToast('🏁 You need a pet to race! Buy one in the Shop.', '#FFCC88', 150); return; }
    const others = PETS.map((p, i) => i).filter(i => i !== state.activePet).sort(() => Math.random() - 0.5).slice(0, 3);
    race = { lanes: [{ pet: state.activePet, x: 90, you: true }, ...others.map(i => ({ pet: i, x: 90, speed: 1.2 + Math.random() * 0.6 }))],
             countdown: 180, winner: null, doneTimer: 0, boost: 0 };
    sfx('bite');
}

// Pressing the button during a race makes your pet run faster
function raceTap() {
    if (!race) return;
    if (race.countdown > 0 || race.winner) return;
    race.boost = Math.min(4, race.boost + 0.9);
    spawnParticles(race.lanes[0].x - 10, 170, '#FFE066', 2);
}

function updateRace() {
    if (race.countdown > 0) {
        if (race.countdown % 60 === 0) tone(race.countdown === 60 ? 880 : 440, 0.15, 'square', 0.15);
        race.countdown--;
        return;
    }
    if (race.winner) {
        if (++race.doneTimer > 200) race = null;
        return;
    }
    race.boost *= 0.95;
    for (const l of race.lanes) {
        l.x += l.you ? 0.9 + race.boost : l.speed + Math.sin(Date.now() / 300 + l.pet) * 0.3;
        if (l.x >= RACE_FINISH && !race.winner) race.winner = l;
    }
    if (race.winner) {
        const won = race.winner.you;
        if (won) { petGainXp(50); addScore(100); giveAward('race'); showToast(`🏆 Your ${PETS[state.activePet].name} WON the race!`, '#FFD700', 220); sfx('win'); }
        else     { petGainXp(10); showToast(`The ${PETS[race.winner.pet].name} won… try again!`, '#FFCC88', 180); }
    }
}

function drawRace() {
    if (!race) return;
    ctx.save();
    ctx.fillStyle = 'rgba(10,30,10,0.96)'; ctx.fillRect(40, 90, 720, 420);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.strokeRect(40, 90, 720, 420);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🏁 PET RACE 🏁', 400, 122);
    race.lanes.forEach((l, i) => {
        const y = 170 + i * 80;
        ctx.fillStyle = i % 2 ? '#3A7A2A' : '#4A8A3A'; ctx.fillRect(60, y - 30, 680, 64);   // grass lanes
        for (let k = 0; k < 8; k++) {                                                            // checkered finish line
            ctx.fillStyle = k % 2 ? '#FFF' : '#111';
            ctx.fillRect(RACE_FINISH + 10, y - 30 + k * 8, 8, 8); ctx.fillStyle = k % 2 ? '#111' : '#FFF'; ctx.fillRect(RACE_FINISH + 18, y - 30 + k * 8, 8, 8);
        }
        const bounce = race.countdown > 0 ? 0 : Math.abs(Math.sin(Date.now() / 90 + i)) * 6;
        drawPetShape(PETS[l.pet].id, l.x, y - bounce, 1.6, -1);
        ctx.fillStyle = l.you ? '#FFE066' : '#FFFFFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
        ctx.fillText(l.you ? `⭐ YOUR ${PETS[l.pet].name.toUpperCase()}` : PETS[l.pet].name, 66, y + 28);
    });
    ctx.textAlign = 'center';
    if (race.countdown > 0) {
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 60px Arial';
        ctx.fillText(String(Math.ceil(race.countdown / 60)), 400, 330);
    } else if (!race.winner) {
        ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#FFE066' : '#FFFFFF'; ctx.font = 'bold 18px Arial';
        ctx.fillText(`${byInput('Press SPACE', 'Tap', 'Press A')} as fast as you can to cheer your pet on!`, 400, 496);
    } else {
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px Arial';
        ctx.fillText(race.winner.you ? '🏆 YOU WIN! +50 pet XP' : `${PETS[race.winner.pet].name} wins!`, 400, 496);
    }
    ctx.restore();
}

// ── UPDATE: WEATHER ───────────────────────────────────────────
function updateWeather() {
    const P = paradise;
    if (P.rainbowTimer > 0) P.rainbowTimer--;
    if (--P.weatherTimer <= 0) {
        P.weatherTimer = WEATHER_FRAMES;
        const was = P.weather, r = Math.random();
        P.weather = r < 0.45 ? 'sun' : r < 0.7 ? 'rain' : r < 0.85 ? 'snow' : 'storm';
        if (P.weather === 'storm' && state.room === ROOM.PARADISE) showToast('⛈ A THUNDERSTORM is coming!', '#AABBFF', 160);
        if ((was === 'rain' || was === 'storm') && P.weather !== 'rain' && P.weather !== 'storm') P.rainbowTimer = RAINBOW_FRAMES;   // 🌈 after the rain!
    }
    // Rain waters the thirsty crops for you
    if (P.weather === 'rain' && P.weatherTimer % 150 === 0) {
        const crop = P.crops.find(c => c.thirsty);
        if (crop) {
            crop.thirsty = false;
            if (state.job && state.job.kind === 'water') state.job.got++;
            spawnFloatText(crop.x, crop.y - 26, '🌧 The rain watered a crop!', '#88DDFF', 70);
        }
    }
}

// Rain / snow falling, and a rainbow in the sky (drawn over the town, under the HUD)
function drawWeather() {
    const P = paradise, t = Date.now() / 1000;
    if (P.phase !== 'day') return;
    if (P.weather === 'storm' && stormFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${stormFlash / 12})`; ctx.fillRect(0, 0, 800, 600); }
    if (P.weather === 'rain' || P.weather === 'storm') {
        ctx.fillStyle = 'rgba(40,50,80,0.18)'; ctx.fillRect(0, 0, 800, 600);
        ctx.strokeStyle = 'rgba(180,210,255,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 140; i++) {
            const x = (i * 57.3 + t * 90) % 820 - 10, y = (i * 91.7 + t * 620) % 620 - 10;
            ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12);
        }
        ctx.stroke();
    } else if (P.weather === 'snow') {
        ctx.fillStyle = 'rgba(220,230,255,0.12)'; ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 110; i++) {
            const x = (i * 71.3 + Math.sin(t + i) * 20 + t * 15) % 800, y = (i * 53.1 + t * 45) % 600;
            ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawRainbowArc() {
    const P = paradise;
    if (P.phase !== 'day' || P.rainbowTimer <= 0) return;
    const fade = Math.min(1, P.rainbowTimer / 120, (RAINBOW_FRAMES - P.rainbowTimer) / 60);
    ctx.save();
    ctx.globalAlpha = 0.45 * fade; ctx.lineWidth = 7;
    ['#FF3B3B', '#FF9A2E', '#FFE83B', '#4CD964', '#3BA7FF', '#6A5BFF', '#B45BFF'].forEach((c, i) => {
        ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(400, 420, 330 - i * 7, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    });
    ctx.restore();
}

