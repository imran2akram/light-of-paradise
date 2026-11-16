// ── FIGHTING MOVES ────────────────────────────────────────────
// J / RB / 👊 : tap = punch, punch, KICK! combo · hold = SPIN ATTACK · while moving up = UPPERCUT
//               while dashing = SLIDING KICK · in the air = GROUND POUND · next to a stunned monster = GRAB, again = THROW
// X / LB / 🛡 : hold to BLOCK (block right as you get hit = PARRY / COUNTER)
// C / 🦘      : SUPER JUMP (you can't be hurt in the air)
// Hold SPACE / A / SHOOT : CHARGE SHOT (a giant shot that goes through monsters)
const COMBO_WINDOW   = 26;    // frames to press again to keep the combo going
const SPIN_HOLD      = 30;    // hold the punch button this long for a spin attack
const PARRY_WINDOW   = 12;    // frames after you start blocking when a hit gets parried
const CHARGE_FRAMES  = 45;    // hold the shoot button this long for a charge shot
const JUMP_FRAMES    = 40;
let fight = { combo: 0, since: 99, cooldown: 0, hold: 0, holding: false, blocking: false, blockFrames: 0,
              jump: 0, pound: false, slide: 0, slideHits: null, charge: 0, fx: [] };
let grabbed  = null;   // a monster you're carrying
let slowMo   = 0;      // perfect-dodge slow motion
let frameNo  = 0;

function canFight() { return playing() && !state.buildMode && !(state.chicken > 0); }

// Hit every monster in reach. arc = only in front of you
function meleeHit(radius, dmg, knock, stun, arc = true, air = 0) {
    let hits = 0;
    for (const e of targetableEnemies()) {
        const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d > radius + e.r) continue;
        if (arc && d > 12 && (dx * state.faceX + dy * state.faceY) / d < 0.1) continue;
        damageEnemy(e, POWER.NONE, false, dmg - 1 + state.weaponLevel - 1);
        hits++;
        if (!e.alive) continue;
        if (knock && d > 0 && !BOSS_TYPES.includes(e.type)) { e.x += dx / d * knock; e.y += dy / d * knock; }
        if (stun) e.stun = Math.max(e.stun || 0, BOSS_TYPES.includes(e.type) ? stun / 3 : stun);
        if (air && !BOSS_TYPES.includes(e.type)) e.air = air;
    }
    // The Devil can be punched too (once you have the crystals)
    const d = hell.devil;
    if (state.room === ROOM.HELL && d.alive && Math.hypot(d.x - player.x, d.y - player.y) < radius + d.r) {
        if (state.lightCrystals >= 3) { d.hp = Math.max(1, d.hp - 1); d.shieldFlash = 15; hits++; } else d.shieldFlash = 20;
    }
    if (hits) { triggerShake(4 + dmg); addComboHits(hits); }
    return hits;
}

function meleeFx(kind, r) { fight.fx.push({ kind, x: player.x, y: player.y, a: Math.atan2(state.faceY, state.faceX), r, life: 12 }); }

// ── SMITING STICK (swung when you have no element yet, or while your element reloads) ──
const STICK_REACH    = 48;   // px past the edge of you — short, so every element feels better
const STICK_COOLDOWN = 20;   // frames between swings
const STICK_DAMAGE   = 1;    // weak on purpose (Weapon Level still adds to it)
const STICK_KNOCK    = 6;
const STICK_ENGAGE   = 110;  // a bad guy this close means the button swings instead of digging the ground

function stickSwing() {
    if (!canFight() || fight.cooldown > 0 || fight.blocking) return;
    // Auto-aim like shoot(): turn to the nearest bad guy that is in reach
    const foes = targetableEnemies().slice();
    if (state.room === ROOM.HELL && hell.devil.alive) foes.push(hell.devil);
    let target = null, best = Infinity;
    for (const e of foes) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d - e.r < STICK_REACH && d < best) { best = d; target = e; }
    }
    if (target && best > 0) { state.faceX = (target.x - player.x) / best; state.faceY = (target.y - player.y) / best; }
    meleeFx('stick', STICK_REACH + 12);
    meleeHit(STICK_REACH, STICK_DAMAGE, STICK_KNOCK, 0);
    sfx('stick');
    fight.cooldown = STICK_COOLDOWN;
}

function meleePress() {
    if (!canFight() || fight.cooldown > 0) return;
    fight.holding = true; fight.hold = 0;
    // Carrying a monster? THROW it!
    if (grabbed) {
        const g = grabbed; grabbed = null;
        g.x = player.x + state.faceX * 20; g.y = player.y + state.faceY * 20;   // throw from in front of you
        g.thrown = { vx: state.faceX * 9, vy: state.faceY * 9, t: 40, hits: new Set() };
        sfx('whoosh'); fight.cooldown = 12; return;
    }
    // Next to a stunned / frozen / tiny monster? GRAB it!
    const grab = targetableEnemies().find(e => !BOSS_TYPES.includes(e.type) && (e.stun > 0 || e.frozen > 0 || e.shrunk > 0 || e.air > 0)
                                          && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 22);
    if (grab) { grabbed = grab; grab.stun = 999; spawnFloatText(grab.x, grab.y - 24, 'GRABBED!', '#FFE066', 40); sfx('bite'); return; }
    if (fight.jump > 0) { fight.pound = true; fight.jump = Math.min(fight.jump, 8); return; }           // ground pound on landing
    if (state.dashTimer > 0) { fight.slide = state.dashTimer + 4; fight.slideHits = new Set(); meleeFx('slide', 30); sfx('whoosh'); return; }   // sliding kick
    const movingUp = keys['KeyW'] || (!p2.active && keys['ArrowUp']) || padMove.y < -0.6 || vTouch.joyDY < -VJOY.maxDist * 0.5;
    if (movingUp) {   // UPPERCUT!
        meleeFx('upper', 44);
        if (meleeHit(44, 3, 20, 45, true, 45)) spawnFloatText(player.x, player.y - 40, 'UPPERCUT!', '#FF8844', 45);
        fight.cooldown = 22; sfx('superHit'); return;
    }
    if (state.melee) { weaponSwing(); return; }   // holding a sword, hammer…
    // Punch, punch, KICK!
    fight.combo = fight.since < COMBO_WINDOW ? fight.combo % 3 + 1 : 1;
    fight.since = 0;
    const kick = fight.combo === 3;
    meleeFx(kick ? 'kick' : 'punch', kick ? 46 : 38);
    meleeHit(kick ? 46 : 38, kick ? 3 : 2, kick ? 60 : 12, kick ? 40 : 0);
    if (kick) { spawnFloatText(player.x, player.y - 40, 'KICK!', '#FFE066', 40); giveAward('comboKid'); }
    sfx(kick ? 'superHit' : 'hit');
    fight.cooldown = kick ? 16 : 8;
}

// ── FIGHTING WEAPONS (the Blacksmith sells them; they change what your punch button does) ──
const MELEE_WEAPONS = [
    { id: 'sword',     name: 'Sword',     icon: '🗡', cost: 20, desc: 'Long slashes — 3rd slash is HUGE' },
    { id: 'hammer',    name: 'Hammer',    icon: '🔨', cost: 30, desc: 'Slow but SMASHES all around you' },
    { id: 'nunchucks', name: 'Nunchucks', icon: '🥢', cost: 25, desc: 'Super fast hits — keep bashing!' },
    { id: 'spear',     name: 'Spear',     icon: '🔱', cost: 25, desc: 'Pokes far, through a whole line' },
    { id: 'whip',      name: 'Whip',      icon: '〰', cost: 20, desc: 'Reaches really far and pulls them in' },
    { id: 'lightsaber', name: 'Lightsaber', icon: '🔦', cost: 90, desc: 'VWOOM! Fast, glowing and super strong' },
    { id: 'gianthammer', name: 'Giant Hammer', icon: '🔨', cost: 70, desc: 'HUGE smash that shakes the whole room' },
    { id: 'superfist', name: 'Super Fist', icon: '👊', cost: 40, desc: 'Punches send monsters FLYING' },
    { id: 'rubberchicken', name: 'Rubber Chicken', icon: '🐔', cost: 15, desc: 'SQUAWK! Silly but it works' },
];
const SABER_COLORS = ['#44AAFF', '#44FF66', '#FF4444', '#CC66FF'];

// Hit every monster along a straight line in front of you (knock < 0 pulls them in)
function lineHit(len, width, dmg, knock, stun) {
    let hits = 0;
    for (const e of targetableEnemies()) {
        const dx = e.x - player.x, dy = e.y - player.y;
        const along = dx * state.faceX + dy * state.faceY, side = Math.abs(dx * state.faceY - dy * state.faceX);
        if (along < -e.r || along > len + e.r || side > width + e.r) continue;
        damageEnemy(e, POWER.NONE, false, dmg - 1 + state.weaponLevel - 1);
        hits++;
        if (!e.alive) continue;
        if (knock && !BOSS_TYPES.includes(e.type)) {
            const move = knock > 0 ? knock : Math.max(knock, -(along - 30));   // don't pull them right on top of you
            e.x += state.faceX * move; e.y += state.faceY * move;
        }
        if (stun) e.stun = Math.max(e.stun || 0, BOSS_TYPES.includes(e.type) ? stun / 3 : stun);
    }
    if (hits) { triggerShake(3 + dmg); addComboHits(hits); }
    return hits;
}

function weaponSwing() {
    const w = state.melee;
    fight.combo = fight.since < COMBO_WINDOW ? fight.combo + 1 : 1;
    fight.since = 0;
    if (w === 'sword') {
        const big = fight.combo % 3 === 0;
        meleeFx('sword', big ? 64 : 54);
        meleeHit(big ? 64 : 54, big ? 4 : 3, big ? 60 : 18, big ? 30 : 0);
        if (big) spawnFloatText(player.x, player.y - 40, 'MEGA SLASH!', '#DDEEFF', 45);
        sfx(big ? 'superHit' : 'whoosh'); fight.cooldown = big ? 16 : 10;
    } else if (w === 'hammer') {
        meleeFx('hammer', 78);
        if (meleeHit(78, 4, 70, 50, false)) spawnFloatText(player.x, player.y - 40, 'SMASH!', '#C8A070', 45);
        spawnParticles(player.x + state.faceX * 24, player.y + state.faceY * 24 + 10, '#8A6A4A', 14);
        triggerShake(12); sfx('boom'); fight.cooldown = 32;
    } else if (w === 'nunchucks') {
        const flurry = fight.combo % 6 === 0;   // every 6th hit spins all the way round
        meleeFx(flurry ? 'spin' : 'nunchuck', flurry ? 56 : 40);
        meleeHit(flurry ? 56 : 40, flurry ? 2 : 1, flurry ? 30 : 6, flurry ? 25 : 6, !flurry);
        if (flurry) spawnFloatText(player.x, player.y - 40, 'WHA-POW!', '#FFCC44', 40);
        sfx('hit'); fight.cooldown = flurry ? 12 : 5;
    } else if (w === 'spear') {
        meleeFx('spear', 100);
        if (lineHit(100, 10, 3, 30, 10) >= 2) spawnFloatText(player.x, player.y - 40, 'SHISH KEBAB!', '#FFE066', 45);
        sfx('whoosh'); fight.cooldown = 16;
    } else if (w === 'lightsaber') {   // VWOOM
        meleeFx('sword', 62);
        const big = fight.combo % 4 === 0;
        meleeHit(62, big ? 6 : 4, big ? 70 : 25, big ? 40 : 10);
        if (big) spawnFloatText(player.x, player.y - 40, 'VWOOOM!', SABER_COLORS[state.saberColor || 0], 45);
        sfx('zap'); fight.cooldown = 8;
    } else if (w === 'gianthammer') {   // the ground SHAKES
        meleeFx('hammer', 120);
        if (meleeHit(120, 6, 110, 90, false)) spawnFloatText(player.x, player.y - 40, 'MEGA SMASH!!', '#FFAA44', 50);
        for (let k = 0; k < 3; k++) spawnParticles(player.x + state.faceX * 30, player.y + 14, '#8A6A4A', 14);
        triggerShake(22); sfx('boom'); fight.cooldown = 45;
    } else if (w === 'superfist') {
        const big = fight.combo % 3 === 0;
        meleeFx(big ? 'kick' : 'punch', big ? 50 : 42);
        meleeHit(big ? 50 : 42, big ? 6 : 3, big ? 220 : 120, big ? 60 : 20);
        if (big) spawnFloatText(player.x, player.y - 40, 'SUPER PUNCH!', '#FF6644', 50);
        triggerShake(big ? 12 : 4); sfx(big ? 'superHit' : 'hit'); fight.cooldown = big ? 18 : 12;
    } else if (w === 'rubberchicken') {   // SQUAWK!
        meleeFx('sword', 50);
        if (meleeHit(50, 2, 80, 40)) spawnFloatText(player.x, player.y - 40, ['SQUAWK!', 'BAWK BAWK!', 'SQUEAK!', 'BONK!'][fight.combo % 4], '#FFE066', 45);
        tone(1400, 0.1, 'square', 0.12, 700); fight.cooldown = 12;
    } else if (w === 'whip') {
        meleeFx('whip', 140);
        if (lineHit(140, 8, 2, -45, 25)) spawnFloatText(player.x, player.y - 40, 'CRACK!', '#FFAA66', 40);
        sfx('zap'); fight.cooldown = 20;
    }
}

function meleeRelease() {
    if (fight.holding && fight.hold >= SPIN_HOLD && canFight()) {   // SPIN ATTACK!
        meleeFx('spin', 70);
        meleeHit(70, 2, 50, 30, false);
        spawnFloatText(player.x, player.y - 40, 'SPIN ATTACK!', '#88DDFF', 50);
        sfx('whoosh'); fight.cooldown = 30;
    }
    fight.holding = false; fight.hold = 0;
}

function superJump() {
    if (!canFight() || fight.jump > 0) return;
    fight.jump = JUMP_FRAMES; fight.pound = false;
    sfx('boing');
}

function startBlock() { if (canFight() && !fight.blocking) { fight.blocking = true; fight.blockFrames = 0; } }
function stopBlock()  { fight.blocking = false; }

// Charge shots (hold the shoot button)
function chargeRelease() {
    if (fight.charge >= CHARGE_FRAMES && canFight() && state.power !== POWER.NONE) {
        const aim = aimPoint(500), a = Math.atan2(aim.y - player.y, aim.x - player.x);
        const w = WEAPON_INFO[state.power];
        projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a) * 7, dy: Math.sin(a) * 7, color: w.color, power: state.power,
                           life: 110, r: 16, pierce: true, hitSet: new Set(), bonus: 4 });
        triggerShake(8); sfx('boom');
        spawnFloatText(player.x, player.y - 36, 'CHARGE SHOT!', w.color, 50);
    }
    fight.charge = 0;
}

function updateFighting() {
    frameNo++;
    if (slowMo > 0) slowMo--;
    if (fight.cooldown > 0) fight.cooldown--;
    fight.since++;
    if (fight.holding) fight.hold++;
    if (fight.blocking) fight.blockFrames++;
    // Charging a shot while the shoot button is held
    const shootHeld = (keys['Space'] && !menu) || (padPrev[PAD.A]) || vTouch.shootId !== null;
    if (shootHeld && state.power !== POWER.NONE && canFight()) fight.charge++;
    else if (fight.charge > 0) chargeRelease();
    // Super jump: can't be hurt in the air
    if (fight.jump > 0) {
        state.playerInvincible = Math.max(state.playerInvincible, 2);
        if (--fight.jump === 0) {
            if (fight.pound) {   // GROUND POUND!
                fight.pound = false;
                meleeFx('pound', 100);
                meleeHit(100, 3, 70, 40, false);
                triggerShake(16); sfx('boom'); giveAward('groundPound');
                spawnParticles(player.x, player.y + 16, '#8A6A4A', 20);
            } else spawnParticles(player.x, player.y + 16, '#CCCCCC', 6);
        }
    }
    // Sliding kick hits everything you slide through
    if (fight.slide > 0) {
        fight.slide--;
        for (const e of targetableEnemies()) {
            if (fight.slideHits.has(e) || Math.hypot(e.x - player.x, e.y - player.y) > e.r + 24) continue;
            fight.slideHits.add(e); damageEnemy(e, POWER.NONE, false, 1 + state.weaponLevel - 1); if (e.alive) e.stun = 30;
        }
    }
    // A grabbed monster is carried over your head
    if (grabbed) {
        if (!grabbed.alive) grabbed = null;
        else { grabbed.x = player.x; grabbed.y = player.y - 34; grabbed.stun = 999; }
    }
    // Thrown monsters fly and smash into others
    for (const e of targetableEnemies()) {
        if (!e.thrown) continue;
        const th = e.thrown;
        e.x += th.vx; e.y += th.vy; e.stun = 20;
        for (const o of targetableEnemies()) {
            if (o === e || th.hits.has(o) || Math.hypot(o.x - e.x, o.y - e.y) > o.r + e.r) continue;
            th.hits.add(o); damageEnemy(o, POWER.NONE, false, 2); triggerShake(8);
        }
        if (--th.t <= 0 || e.x < 20 || e.x > 780 || e.y < 60 || e.y > 590) {
            e.thrown = null; e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(580, e.y));
            damageEnemy(e, POWER.NONE, false, 1); spawnParticles(e.x, e.y, '#FFFFFF', 10);
        }
    }
    for (let i = fight.fx.length - 1; i >= 0; i--) if (--fight.fx[i].life <= 0) fight.fx.splice(i, 1);
}

function drawFighting() {
    for (const f of fight.fx) {
        ctx.save();
        ctx.globalAlpha = f.life / 12;
        ctx.strokeStyle = f.kind === 'spin' ? '#88DDFF' : f.kind === 'pound' ? '#C8A070' : f.kind === 'upper' ? '#FF8844' : '#FFFFFF';
        ctx.lineWidth = f.kind === 'kick' || f.kind === 'upper' ? 6 : 4; ctx.lineCap = 'round';
        ctx.beginPath();
        if (f.kind === 'sword') { ctx.strokeStyle = '#DDEEFF'; ctx.lineWidth = 7; ctx.shadowColor = '#AACCFF'; ctx.shadowBlur = 10; }
        if (f.kind === 'hammer') { ctx.strokeStyle = '#C8A070'; ctx.lineWidth = 8; }
        if (f.kind === 'stick') {   // a brown branch swinging round in front of you
            ctx.globalAlpha = 1;
            const swing = f.a + 1.1 - (1 - f.life / 12) * 2.2, len = f.r;
            const x1 = f.x + Math.cos(swing) * 14, y1 = f.y + Math.sin(swing) * 14, x2 = f.x + Math.cos(swing) * len, y2 = f.y + Math.sin(swing) * len;
            ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = '#A8773F'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            const bx = x1 + (x2 - x1) * 0.6, by = y1 + (y2 - y1) * 0.6;   // a little twig and leaf
            ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(swing - 0.8) * 9, by + Math.sin(swing - 0.8) * 9); ctx.stroke();
            ctx.fillStyle = '#5DBB4A'; ctx.beginPath(); ctx.arc(x2, y2, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = f.life / 12 * 0.6; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;   // whoosh trail
            ctx.beginPath(); ctx.arc(f.x, f.y, len * 0.9, swing - 0.5, swing); ctx.stroke();
            ctx.restore(); continue;
        }
        if (f.kind === 'nunchuck') { ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 3; }
        if (f.kind === 'spear' || f.kind === 'whip') {   // a straight poke / a wiggly whip crack
            const reach = f.r * Math.min(1, (13 - f.life) / 4);
            ctx.strokeStyle = f.kind === 'spear' ? '#D8D8E0' : '#8A5A2A'; ctx.lineWidth = f.kind === 'spear' ? 5 : 3;
            ctx.moveTo(f.x, f.y);
            for (let k = 1; k <= 10; k++) {
                const d = reach * k / 10, wig = f.kind === 'whip' ? Math.sin(k * 1.3 + f.life) * 6 * (k / 10) : 0;
                ctx.lineTo(f.x + Math.cos(f.a) * d - Math.sin(f.a) * wig, f.y + Math.sin(f.a) * d + Math.cos(f.a) * wig);
            }
        }
        else if (f.kind === 'spin' || f.kind === 'pound' || f.kind === 'hammer') ctx.arc(f.x, f.y, f.r * (1.2 - f.life / 24), 0, Math.PI * 2);
        else ctx.arc(f.x, f.y, f.r, f.a - 0.9, f.a + 0.9);
        ctx.stroke();
        ctx.restore();
    }
    if (state.melee && canFight()) {   // the weapon you're holding
        const w = MELEE_WEAPONS.find(m => m.id === state.melee);
        ctx.save();
        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(player.x + (state.faceX >= 0 ? 16 : -16), player.y + 4);
        if (state.faceX < 0) ctx.scale(-1, 1);
        if (state.melee === 'lightsaber') {   // a glowing beam
            const col = SABER_COLORS[state.saberColor || 0];
            ctx.fillStyle = '#888'; ctx.fillRect(-2, -2, 8, 5);
            ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(30, -16); ctx.stroke();
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(30, -16); ctx.stroke();
        } else ctx.fillText(w.icon, 0, 0);
        ctx.restore();
    }
    if (fight.blocking) {   // shield in front of you
        const a = Math.atan2(state.faceY, state.faceX);
        ctx.save();
        ctx.strokeStyle = fight.blockFrames <= PARRY_WINDOW ? '#FFFFFF' : '#66AAFF'; ctx.lineWidth = 6; ctx.shadowColor = '#66AAFF'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(player.x, player.y, 26, a - 1.1, a + 1.1); ctx.stroke();
        ctx.restore();
    }
    if (fight.charge > 10 && state.power !== POWER.NONE) {   // a glowing ball charging up
        const k = Math.min(1, fight.charge / CHARGE_FRAMES), c = WEAPON_INFO[state.power].color;
        ctx.save(); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 20 * k; ctx.globalAlpha = 0.5 + k * 0.5;
        ctx.beginPath(); ctx.arc(player.x + state.faceX * 20, player.y + state.faceY * 20, 4 + k * 12, 0, Math.PI * 2); ctx.fill();
        if (k >= 1) { ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(player.x + state.faceX * 20, player.y + state.faceY * 20, 18 + Math.sin(Date.now() / 60) * 3, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
    }
    if (mod('disco')) {   // 🪩 party lights
        const t = Date.now() / 1000;
        for (let k = 0; k < 6; k++) {
            const x = 400 + Math.cos(t * (0.7 + k * 0.2) + k) * 320, y = 320 + Math.sin(t * (0.9 + k * 0.15) + k * 2) * 220;
            const g = ctx.createRadialGradient(x, y, 5, x, y, 120);
            g.addColorStop(0, `hsla(${(k * 60 + t * 90) % 360}, 100%, 60%, 0.35)`); g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 240, 240);
        }
    }
    if (mod('rainbow')) { ctx.fillStyle = `hsla(${(Date.now() / 10) % 360}, 100%, 60%, 0.1)`; ctx.fillRect(0, 0, 800, 600); }
    if (slowMo > 0) {
        ctx.fillStyle = 'rgba(200,200,255,0.12)'; ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('⏳ PERFECT DODGE — SLOW MOTION!', 400, 110);
    }
}

// A little counter so the combo counter (and later skills) can hear about hits
function addComboHits(n) { state.lastHits = (state.lastHits || 0) + n; }

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

// ── DRAW: PROJECTILES ─────────────────────────────────────────
// Each power looks like the real thing: ice shards, fireballs, crackling lightning, water drops
function drawProjectiles() {
    const t = Date.now();
    for (const p of projectiles) {
        const a = Math.atan2(p.dy, p.dx);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(a);
        if (p.pierce) ctx.scale(2.2, 2.2);   // charge shots are HUGE
        if (p.power === POWER.ICE) {
            // Pointy ice crystal
            ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 12;
            const g = ctx.createLinearGradient(-10, -4, 8, 4);
            g.addColorStop(0, '#E8F8FF'); g.addColorStop(1, '#4A9AE8');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-2, -5); ctx.lineTo(-10, 0); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, 0); ctx.stroke();
        } else if (p.power === POWER.BRIMSTONE) {
            // Flickering fireball
            const flick = 1 + Math.sin(t / 30 + p.x) * 0.15;
            const g = ctx.createRadialGradient(2, 0, 1, 0, 0, 10 * flick);
            g.addColorStop(0, '#FFFBD0'); g.addColorStop(0.35, '#FFB020'); g.addColorStop(0.75, '#FF4A00'); g.addColorStop(1, 'rgba(180,20,0,0)');
            ctx.fillStyle = g; ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.ellipse(-2, 0, 11 * flick, 8 * flick, 0, 0, Math.PI * 2); ctx.fill();
        } else if (p.power === POWER.LIGHTNING) {
            // Crackling spark bolt
            ctx.strokeStyle = '#FFFFFF'; ctx.shadowColor = '#FFE033'; ctx.shadowBlur = 16; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-14, 0);
            for (let k = 1; k <= 4; k++) ctx.lineTo(-14 + k * 7, (Math.random() - 0.5) * 8);
            ctx.stroke();
            ctx.fillStyle = '#FFF7B0'; ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI * 2); ctx.fill();
        } else if (p.power === POWER.WATER) {
            // Water droplet with a shine
            const g = ctx.createRadialGradient(2, -2, 1, 0, 0, 10);
            g.addColorStop(0, '#E6FBFF'); g.addColorStop(0.5, '#4AC8E8'); g.addColorStop(1, '#1A7AB0');
            ctx.fillStyle = g; ctx.shadowColor = '#66DDFF'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-2, -8, 6, -6); ctx.arc(4, 0, 6, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-2, 8, -12, 0); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(5, -2.5, 1.8, 0, Math.PI * 2); ctx.fill();
        } else {
            // Rainbow orb
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
            g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.shadowColor = p.color; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// Little trail left behind each shot
function spawnShotTrail(p) {
    const trail = {
        [POWER.ICE]:       { color: '#DDF4FF', r: 1.5, dy: 0 },
        [POWER.BRIMSTONE]: { color: Math.random() < 0.5 ? '#FF8A20' : 'rgba(90,90,90,0.8)', r: 3, dy: -0.6 },   // flames + smoke
        [POWER.LIGHTNING]: { color: '#FFF3A0', r: 1.5, dy: 0 },
        [POWER.WATER]:     { color: '#9EE6FF', r: 2, dy: 0.5 },
    }[p.power] || { color: p.color, r: 2.5, dy: 0 };
    particles.push({ x: p.x - p.dx * 0.5, y: p.y - p.dy * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: trail.dy + (Math.random() - 0.5) * 0.8,
                     life: 14, maxLife: 14, color: trail.color, r: trail.r + Math.random() * 1.5 });
}

// Zig-zag chain-lightning bolts
function drawBolts() {
    for (const b of bolts) {
        ctx.save();
        ctx.globalAlpha = b.life / 12;
        ctx.strokeStyle = Math.random() < 0.5 ? '#FFFFFF' : (b.color || '#FFE033');
        ctx.shadowColor = '#FFE033'; ctx.shadowBlur = 14; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
        const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) || 1;
        const nx = -(b.y2 - b.y1) / len, ny = (b.x2 - b.x1) / len;
        for (let k = 1; k < 6; k++) {
            const j = (Math.random() - 0.5) * 18;
            ctx.lineTo(b.x1 + (b.x2 - b.x1) * k / 6 + nx * j, b.y1 + (b.y2 - b.y1) * k / 6 + ny * j);
        }
        ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
    }
}

function drawHeartPickups() {
    for (const h of heartPickups) {
        if (h.life < 120 && Math.floor(Date.now() / 120) % 2) continue;   // blinks before vanishing
        ctx.save();
        ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FF3355'; ctx.shadowColor = '#FF3355'; ctx.shadowBlur = 10;
        ctx.fillText('❤', h.x, h.y + Math.sin(Date.now() / 200 + h.x) * 3);
        ctx.restore();
    }
}

function drawEnemyProjectiles() {
    for (const p of enemyProjectiles) {
        ctx.save();
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

