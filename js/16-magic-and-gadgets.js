// ── MAGIC POWERS (Merlin's Magic Shop in the Mall; cast with R / X / the ✨ button) ──
const SPELLS = [
    { id: 'laser',  icon: '🔴', name: 'Mega Laser',       cost: 30, cooldown: 180, desc: 'A laser right across the screen' },
    { id: 'shrink', icon: '🐜', name: 'Shrink Ray',       cost: 20, cooldown: 240, desc: 'Makes a monster tiny and weak' },
    { id: 'clone',  icon: '👥', name: 'Clone Power',      cost: 40, cooldown: 600, desc: '3 copies of you help fight' },
    { id: 'freeze', icon: '⏸', name: 'Time Freeze',      cost: 45, cooldown: 900, desc: 'Everything stops except you!' },
    { id: 'magnet', icon: '🧲', name: 'Magnet Hand',      cost: 20, cooldown: 300, desc: 'Pulls monsters and coins to you' },
    { id: 'quake',  icon: '💥', name: 'Earthquake Stomp', cost: 35, cooldown: 480, desc: 'Shakes and stuns everything' },
    { id: 'field',  icon: '🔵', name: 'Force Field',      cost: 30, cooldown: 600, desc: 'Pushes monsters and bullets away' },
    // Only taught at Hogwarts (school: true keeps them out of Merlin's shop)
    { id: 'expelliarmus', icon: '🪄', name: 'Expelliarmus',        cost: 25, cooldown: 150,  desc: 'Blasts a monster far away', school: true },
    { id: 'leviosa',      icon: '🪶', name: 'Wingardium Leviosa',  cost: 30, cooldown: 600,  desc: 'Monsters float and can\'t move', school: true },
    { id: 'lumos',        icon: '💡', name: 'Lumos',               cost: 15, cooldown: 900,  desc: 'Your wand lights up dark caves', school: true },
    { id: 'vada',         icon: '💚', name: 'Vada Cadabra',        cost: 60, cooldown: 1500, desc: 'POOF! Every monster on screen', school: true },
    { id: 'incendio',     icon: '🔥', name: 'Incendio',            cost: 25, cooldown: 300,  desc: 'A ring of fire all around you', school: true },
    { id: 'protego',      icon: '🛡', name: 'Protego',             cost: 25, cooldown: 600,  desc: 'A magic shield blocks bullets', school: true },
    { id: 'patronum',     icon: '🦌', name: 'Expecto Patronum',    cost: 45, cooldown: 720,  desc: 'A glowing deer charges at monsters', school: true },
    { id: 'riddikulus',   icon: '🐸', name: 'Riddikulus',          cost: 30, cooldown: 480,  desc: 'Turns 3 monsters into frogs!', school: true },
    { id: 'accio',        icon: '🧲', name: 'Accio',               cost: 15, cooldown: 300,  desc: 'All the coins fly to you', school: true },
    { id: 'petrificus',   icon: '🗿', name: 'Petrificus Totalus',  cost: 20, cooldown: 360,  desc: 'Turns a monster to stone', school: true },
    { id: 'alohomora',    icon: '🔓', name: 'Alohomora',           cost: 20, cooldown: 1800, desc: 'Unlocks a secret coin stash', school: true },
];
let timeFreeze = 0, magnetTimer = 0, clones = [], laserBeam = null, lumosTimer = 0, vadaFlash = 0;
let patronus = null, fireRing = 0, godStorm = 0, godSpeedTimer = 0;

// Turn a monster into a frog (big bosses are too big)
function frogify(e) {
    if (e.type === 'king' || BOSS_TYPES.includes(e.type)) { spawnFloatText(e.x, e.y - e.r - 10, 'Too big to be a frog!', '#CC99FF', 70); return; }
    Object.assign(e, { frog: true, hp: 1, maxHp: 1, frozen: 0, hopTimer: 20, dx: 0, dy: 0, r: 12 });
    spawnParticles(e.x, e.y, '#CC99FF', 16);
    spawnFloatText(e.x, e.y - 24, 'RIBBIT! 🐸', '#88FF88', 70);
}
// Shoot magic arrows out in a circle
function shootRing(n, color, power = POWER.NONE) {
    for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a) * 9, dy: Math.sin(a) * 9, color, power, life: 70, r: 6 });
    }
    sfx('shoot');
}
// Hit every monster within range (the whole screen if no range)
function hitAll(bonus, power = POWER.NONE, range = 9999) {
    for (const e of targetableEnemies()) if (Math.hypot(e.x - player.x, e.y - player.y) < range) damageEnemy(e, power, false, bonus);
}
function freezeAll(frames, range = 9999) {
    let n = 0;
    for (const e of targetableEnemies()) {
        if (Math.hypot(e.x - player.x, e.y - player.y) > range) continue;
        e.frozen = Math.max(e.frozen || 0, BOSS_TYPES.includes(e.type) ? Math.min(frames, 90) : frames); n++;
    }
    return n;
}
function pushAll(force, range) {
    for (const e of targetableEnemies()) {
        const d = Math.hypot(e.x - player.x, e.y - player.y) || 1;
        if (d > range) continue;
        const f = BOSS_TYPES.includes(e.type) ? force / 4 : force;
        e.x = Math.max(20, Math.min(780, e.x + (e.x - player.x) / d * f));
        e.y = Math.max(60, Math.min(580, e.y + (e.y - player.y) / d * f));
    }
}
// Little helpers that circle you and shoot (they look like you)
function summonHelpers(frames) {
    clones = [0, 1, 2].map(i => ({ a: i * 2.1, cd: 10 + i * 10 }));
    state.cloneTimer = frames;
    spawnParticles(player.x, player.y, '#FFFFFF', 16);
}

function spellItems() {
    return SPELLS.filter(sp => !sp.school).map(sp => ({
        icon: sp.icon, name: sp.name, desc: sp.desc, cost: sp.cost,
        status: state.spell === sp.id ? 'HOLDING' : state.spells[sp.id] ? 'OWNED — pick' : null,
        action: () => {
            if (state.spells[sp.id]) { state.spell = sp.id; return; }
            if (spend(sp.cost)) { state.spells[sp.id] = true; state.spell = sp.id; showToast(`${sp.icon} ${sp.name}! Cast it with ${byInput('R', '✨', 'X')}`); giveAward('wizard'); }
        },
    }));
}

function castSpell() {
    if (!playing() || !state.spell || state.spellCooldown > 0) return;
    const sp = SPELLS.find(x => x.id === state.spell);
    const foes = targetableEnemies();
    const bonus = state.weaponLevel - 1 + wandInfo().bonus;
    checkMagicCombo('spell');
    if (wandInfo().id === 'unicorn' && Math.random() < 0.2 && state.playerHp < fullHearts()) { state.playerHp++; spawnFloatText(player.x, player.y - 50, '🦄 +1 ❤', '#FF88CC', 60); }
    if (sp.id === 'laser') {
        const aim = aimPoint(800), a = Math.atan2(aim.y - player.y, aim.x - player.x);
        const x2 = player.x + Math.cos(a) * 900, y2 = player.y + Math.sin(a) * 900;
        laserBeam = { x1: player.x, y1: player.y, x2, y2, life: 24 };
        for (const e of foes) {   // everything along the beam gets zapped
            const t = Math.max(0, ((e.x - player.x) * Math.cos(a) + (e.y - player.y) * Math.sin(a)));
            const px = player.x + Math.cos(a) * t, py = player.y + Math.sin(a) * t;
            if (Math.hypot(e.x - px, e.y - py) < e.r + 12) damageEnemy(e, POWER.NONE, false, 2 + bonus);
        }
        const d = hell.devil;
        if (state.room === ROOM.HELL && d.alive && state.lightCrystals >= 3) { d.hp = Math.max(1, d.hp - 2); d.shieldFlash = 15; }
        triggerShake(8); sfx('zap');
    } else if (sp.id === 'shrink') {
        const e = nearestTarget(420);
        if (!e) { showToast('🐜 No monster close enough!', '#CCFFCC', 90); return; }
        e.shrunk = 600; e.hp = Math.max(1, Math.ceil(e.hp / 2));
        bolts.push({ x1: player.x, y1: player.y, x2: e.x, y2: e.y, life: 12 });
        spawnFloatText(e.x, e.y - 20, 'tiny!', '#AAFFAA', 60); sfx('magic');
    } else if (sp.id === 'clone') {
        clones = [0, 1, 2].map(i => ({ a: i * 2.1, cd: 10 + i * 10 }));
        state.cloneTimer = 480;
        spawnParticles(player.x, player.y, '#FFFFFF', 16); sfx('magic');
    } else if (sp.id === 'freeze') {
        timeFreeze = 300;
        showToast('⏸ TIME FREEZE!', '#AACCFF', 120); sfx('freeze');
    } else if (sp.id === 'magnet') {
        magnetTimer = 150; sfx('magic');
    } else if (sp.id === 'field') {
        state.fieldTimer = 300; sfx('magic');
    } else if (sp.id === 'quake') {
        for (const e of foes) { damageEnemy(e, POWER.NONE, false, 1 + bonus); if (e.alive) e.frozen = Math.max(e.frozen || 0, 60); }
        triggerShake(30); sfx('boom');
        for (let k = 0; k < 20; k++) spawnParticles(Math.random() * 800, 80 + Math.random() * 500, '#8A6A4A', 2);
    } else if (sp.id === 'expelliarmus') {
        const e = nearestTarget(450);
        if (!e) { showToast('🪄 No monster close enough!', '#FFCCAA', 90); return; }
        bolts.push({ x1: player.x, y1: player.y, x2: e.x, y2: e.y, life: 14, color: '#FF5533' });
        damageEnemy(e, POWER.NONE, false, 2 + bonus);
        const d = Math.hypot(e.x - player.x, e.y - player.y) || 1, push = BOSS_TYPES.includes(e.type) ? 40 : 140;
        e.x = Math.max(20, Math.min(780, e.x + (e.x - player.x) / d * push));
        e.y = Math.max(60, Math.min(580, e.y + (e.y - player.y) / d * push));
        if (e.alive) e.frozen = Math.max(e.frozen || 0, 90);
        spawnFloatText(e.x, e.y - 24, 'EXPELLIARMUS!', '#FF7755', 70); triggerShake(6); sfx('zap');
    } else if (sp.id === 'leviosa') {
        let n = 0;
        for (const e of foes) {
            if (Math.hypot(e.x - player.x, e.y - player.y) > 320) continue;
            e.frozen = Math.max(e.frozen || 0, BOSS_TYPES.includes(e.type) ? 90 : 240); n++;
            spawnParticles(e.x, e.y, '#CCEEFF', 6);
        }
        spawnFloatText(player.x, player.y - 34, n ? 'Wingardium Leviosa! 🪶' : 'Nothing to float…', '#CCEEFF', 80); sfx('magic');
    } else if (sp.id === 'lumos') {
        lumosTimer = 1200;
        spawnFloatText(player.x, player.y - 34, 'LUMOS! 💡', '#FFFFAA', 80); sfx('magic');
    } else if (sp.id === 'incendio') {
        fireRing = 40;
        hitAll(2 + bonus, POWER.BRIMSTONE, 170);
        spawnFloatText(player.x, player.y - 34, 'INCENDIO! 🔥', '#FF8833', 80); triggerShake(8); sfx('boom');
    } else if (sp.id === 'protego') {
        state.fieldTimer = 300;
        spawnFloatText(player.x, player.y - 34, 'PROTEGO! 🛡', '#88CCFF', 80); sfx('magic');
    } else if (sp.id === 'patronum') {
        const dir = state.faceX < 0 ? -1 : 1;
        patronus = { x: player.x, y: player.y, dx: dir * 8, hit: new Set() };
        spawnFloatText(player.x, player.y - 34, 'EXPECTO PATRONUM!', '#CCEEFF', 90); sfx('magic');
    } else if (sp.id === 'riddikulus') {
        const near = foes.filter(e => !e.frog).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, 3);
        if (!near.length) { showToast('🐸 No monsters to turn into frogs!', '#88FF88', 90); return; }
        near.forEach(frogify);
        spawnFloatText(player.x, player.y - 34, 'RIDDIKULUS!', '#88FF88', 80); sfx('magic');
    } else if (sp.id === 'accio') {
        magnetTimer = 240;
        spawnFloatText(player.x, player.y - 34, 'ACCIO COINS! 🧲', '#FFD700', 80); sfx('magic');
    } else if (sp.id === 'petrificus') {
        const e = nearestTarget(450);
        if (!e) { showToast('🗿 No monster close enough!', '#CCCCCC', 90); return; }
        e.frozen = Math.max(e.frozen || 0, BOSS_TYPES.includes(e.type) ? 120 : 900);
        bolts.push({ x1: player.x, y1: player.y, x2: e.x, y2: e.y, life: 14, color: '#AAAAAA' });
        spawnParticles(e.x, e.y, '#999999', 14);
        spawnFloatText(e.x, e.y - 24, 'STONE! 🗿', '#CCCCCC', 70); sfx('freeze');
    } else if (sp.id === 'alohomora') {
        const got = 15 + Math.floor(Math.random() * 26);
        state.coins += got; addScore(got);
        spawnParticles(player.x, player.y, '#FFD700', 24);
        spawnFloatText(player.x, player.y - 34, `ALOHOMORA! 🔓 +🪙${got}`, '#FFD700', 90); sfx('found');
    } else if (sp.id === 'vada') {
        vadaFlash = 30;
        for (const e of foes) damageEnemy(e, POWER.NONE, false, BOSS_TYPES.includes(e.type) ? 6 : 99);   // bosses are too strong to poof
        spawnFloatText(player.x, player.y - 34, 'VADA CADABRA!', '#66FF88', 90); triggerShake(20); sfx('boom');
    }
    state.spellCooldown = Math.round(sp.cooldown * (state.house === 'ravenclaw' ? 0.6 : 1) * wandInfo().cd);
}

function updateSpells() {
    if (state.spellCooldown > 0) state.spellCooldown--;
    if (timeFreeze > 0) timeFreeze--;
    if (laserBeam && --laserBeam.life <= 0) laserBeam = null;
    if (lumosTimer > 0) lumosTimer--;
    if (vadaFlash > 0) vadaFlash--;
    if (fireRing > 0) fireRing--;
    if (godSpeedTimer > 0) godSpeedTimer--;
    if (state.godCooldown > 0) state.godCooldown--;
    if (patronus) {   // 🦌 runs across the screen and bumps every monster once
        patronus.x += patronus.dx;
        for (const e of targetableEnemies()) {
            if (patronus.hit.has(e) || Math.hypot(e.x - patronus.x, e.y - patronus.y) > 50 + e.r) continue;
            patronus.hit.add(e); damageEnemy(e, POWER.NONE, false, 3);
        }
        if (Math.random() < 0.5) particles.push({ x: patronus.x, y: patronus.y, dx: 0, dy: 0, life: 20, maxLife: 20, color: 'rgba(200,235,255,0.7)', r: 8 });
        if (patronus.x < -60 || patronus.x > 860) patronus = null;
    }
    if (godStorm > 0) {   // ⛈ lightning keeps striking monsters
        godStorm--;
        const foes = targetableEnemies();
        if (godStorm % 20 === 0 && foes.length) {
            const e = foes[Math.floor(Math.random() * foes.length)];
            bolts.push({ x1: e.x + (Math.random() - 0.5) * 60, y1: 40, x2: e.x, y2: e.y, life: 12 });
            damageEnemy(e, POWER.LIGHTNING, false, 1); triggerShake(4); sfx('zap');
        }
    }
    if (magnetTimer > 0) {
        magnetTimer--;
        for (const e of targetableEnemies()) {
            const d = Math.hypot(player.x - e.x, player.y - e.y);
            const pull = BOSS_TYPES.includes(e.type) ? 0.8 : 2.6;
            if (d < 340 && d > 40) { e.x += (player.x - e.x) / d * pull; e.y += (player.y - e.y) / d * pull; }
        }
        for (const c of roomCoins()) { if (!c.picked) { const d = Math.hypot(player.x - c.x, player.y - c.y) || 1; c.x += (player.x - c.x) / d * 6; c.y += (player.y - c.y) / d * 6; } }
    }
    if (state.chicken > 0 && --state.chicken === 0) showToast('🧑 Phew, you are a person again!', '#FFFFFF', 120);
    if (state.fieldTimer > 0) {   // 🔵 force field pushes monsters out and pops bullets
        state.fieldTimer--;
        for (const e of targetableEnemies()) {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < 80 && d > 0) { e.x += (e.x - player.x) / d * 4; e.y += (e.y - player.y) / d * 4; }
        }
        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            const q = enemyProjectiles[i];
            if (Math.hypot(q.x - player.x, q.y - player.y) < 80) { spawnParticles(q.x, q.y, '#66AAFF', 4); enemyProjectiles.splice(i, 1); }
        }
    }
    if (state.cloneTimer > 0) {
        state.cloneTimer--;
        for (const c of clones) {
            c.a += 0.04;
            c.x = player.x + Math.cos(c.a) * 44; c.y = player.y + Math.sin(c.a) * 30;
            if (--c.cd <= 0) {
                c.cd = 34;
                let target = null, best = 420;
                for (const e of targetableEnemies()) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < best) { best = d; target = e; } }
                if (target) {
                    const a = Math.atan2(target.y - c.y, target.x - c.x), pw = state.power === POWER.NONE ? POWER.ICE : state.power, w = WEAPON_INFO[pw];
                    projectiles.push({ x: c.x, y: c.y, dx: Math.cos(a) * w.speed, dy: Math.sin(a) * w.speed, color: w.color, power: pw, life: 70, r: w.size });
                }
            }
        }
        if (state.cloneTimer === 0) clones = [];
    }
    for (const e of targetableEnemies()) if (e.shrunk > 0) e.shrunk--;
}

function drawSpells() {
    if (laserBeam) {
        ctx.save();
        ctx.globalAlpha = laserBeam.life / 24;
        for (const [w, c] of [[14, 'rgba(255,40,40,0.5)'], [6, '#FF4444'], [2, '#FFFFFF']]) {
            ctx.strokeStyle = c; ctx.lineWidth = w; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.moveTo(laserBeam.x1, laserBeam.y1); ctx.lineTo(laserBeam.x2, laserBeam.y2); ctx.stroke();
        }
        ctx.restore();
    }
    for (const c of clones) {   // your helper copies
        ctx.save(); ctx.globalAlpha = 0.6;
        drawAvatar(c.x, c.y, player.w, getPlayerColor(), AVATAR_STYLES[state.activeSkin], state.walkPhase);
        ctx.restore();
    }
    if (state.fieldTimer > 0) {
        ctx.save(); ctx.strokeStyle = `rgba(100,170,255,${0.4 + Math.sin(Date.now() / 100) * 0.2})`; ctx.fillStyle = 'rgba(100,170,255,0.12)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(player.x, player.y, 80, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (magnetTimer > 0) {
        ctx.strokeStyle = `rgba(255,80,80,${magnetTimer / 150})`; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(player.x, player.y, 40 + ((Date.now() / 5 + k * 40) % 120), 0, Math.PI * 2); ctx.stroke(); }
    }
    if (vadaFlash > 0) { ctx.fillStyle = `rgba(80,255,120,${vadaFlash / 60})`; ctx.fillRect(0, 0, 800, 600); }
    if (godStorm > 0) { ctx.fillStyle = 'rgba(30,30,70,0.25)'; ctx.fillRect(0, 0, 800, 600); }
    if (fireRing > 0) {
        ctx.save(); ctx.globalAlpha = fireRing / 40;
        ctx.strokeStyle = '#FF7722'; ctx.lineWidth = 14; ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.arc(player.x, player.y, 170 - fireRing * 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (patronus) {
        ctx.save(); ctx.shadowColor = '#AADDFF'; ctx.shadowBlur = 30; ctx.font = '44px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(patronus.x, patronus.y); if (patronus.dx > 0) ctx.scale(-1, 1);   // the emoji faces left
        ctx.globalAlpha = 0.85; ctx.fillText('🦌', 0, 0); ctx.restore();
    }
    if (lumosTimer > 0) {   // a soft glow from your wand
        const glow = ctx.createRadialGradient(player.x, player.y - 10, 4, player.x, player.y - 10, 60);
        glow.addColorStop(0, 'rgba(255,255,200,0.5)'); glow.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = glow; ctx.fillRect(player.x - 60, player.y - 70, 120, 120);
    }
    if (timeFreeze > 0) {
        ctx.fillStyle = 'rgba(140,170,255,0.18)'; ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`⏸ TIME FROZEN ${Math.ceil(timeFreeze / 60)}s`, 400, 90);
    }
}

// 🐔 The Evil Wizard's chicken spell: cluck cluck for 8 seconds (you can't shoot!)
function turnIntoChicken() {
    state.chicken = 480;
    showToast('🐔 BAWK! The Evil Wizard turned you into a CHICKEN!', '#FFE066', 200);
    sfx('magic');
}
function drawChicken(x, y) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 9, y - 12, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E02A2A'; ctx.beginPath(); ctx.arc(x + 9, y - 20, 3, 0, Math.PI * 2); ctx.arc(x + 12, y - 19, 3, 0, Math.PI * 2); ctx.fill();   // comb
    ctx.fillStyle = '#FFAA22'; ctx.beginPath(); ctx.moveTo(x + 15, y - 13); ctx.lineTo(x + 21, y - 11); ctx.lineTo(x + 15, y - 9); ctx.fill();
    ctx.fillRect(x - 5, y + 11, 2, 7); ctx.fillRect(x + 3, y + 11, 2, 7);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x + 11, y - 13, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// ── MAGIC EXTRAS: wands, creatures, the Snitch, chess, library, magic map, combos ──
const SCHOOL_EXIT = { x: 400, y: 578 };   // in Wizard Chess and the Haunted Library
const GOLDEN_BOOK = { x: 700, y: 120 };   // in the Haunted Library
const WANDS = [
    { id: 'oak',     icon: '🪵', name: 'Oak Wand',      cost: 0,   bonus: 0, cd: 1,   desc: 'A good first wand' },
    { id: 'phoenix', icon: '🔥', name: 'Phoenix Wand',  cost: 80,  bonus: 0, cd: 0.7, desc: 'Spells recharge faster' },
    { id: 'dragon',  icon: '🐉', name: 'Dragon Wand',   cost: 100, bonus: 1, cd: 1,   desc: 'Spells hit harder' },
    { id: 'unicorn', icon: '🦄', name: 'Unicorn Wand',  cost: 90,  bonus: 0, cd: 0.9, desc: 'Spells sometimes heal you' },
    { id: 'elder',   icon: '✨', name: 'The Elder Wand', cost: 400, bonus: 2, cd: 0.6, desc: 'The most powerful wand EVER' },
];
function wandInfo() { return WANDS.find(w => w.id === state.wand) || WANDS[0]; }
function wandItems() {
    return WANDS.map(w => ({ icon: w.icon, name: w.name, desc: w.desc, cost: w.cost,
        status: state.wand === w.id ? 'HOLDING' : (state.wands[w.id] || !w.cost) ? 'OWNED — pick' : null,
        action: () => {
            if (state.wands[w.id] || !w.cost) { state.wand = w.id; return; }
            if (spend(w.cost)) { state.wands[w.id] = true; state.wand = w.id; showToast(`${w.icon} The ${w.name} chose YOU!`, '#FFD700', 200); sfx('magic'); }
        } }));
}

// ✨ Magic combo: a spell, then a gadget or god power (or the other way round) within 2 seconds
const MAGIC_COMBO_WINDOW = 2000, MAGIC_COMBO_COOLDOWN = 6000;
let lastMagicUse = { kind: null, at: 0 }, lastCombo = 0;
function checkMagicCombo(kind) {
    const now = Date.now(), prev = lastMagicUse;
    lastMagicUse = { kind, at: now };
    if (!prev.kind || prev.kind === kind || now - prev.at > MAGIC_COMBO_WINDOW || now - lastCombo < MAGIC_COMBO_COOLDOWN) return;
    if (prev.kind !== 'spell' && kind !== 'spell') return;   // one of them has to be a spell
    lastCombo = now;
    hitAll(3); freezeAll(90);
    for (let k = 0; k < 6; k++) spawnParticles(player.x, player.y, `hsl(${k * 60}, 100%, 60%)`, 8);
    triggerShake(14); sfx('boom'); giveAward('combo');
    showToast('✨🌈 MAGIC COMBO! MEGA SPELL! 🌈✨', '#FFE066', 180);
}

// 🐣 Magic creatures: feed them and they help you
const CREATURES = [
    { id: 'babydragon', icon: '🐲', name: 'Baby Dragon', cost: 50, desc: 'Breathes fire at monsters' },
    { id: 'phoenix',    icon: '🐦‍🔥', name: 'Phoenix',     cost: 60, desc: 'Heals you sometimes' },
    { id: 'griffin',    icon: '🦅', name: 'Griffin',     cost: 50, desc: 'Swoops and pecks monsters' },
    { id: 'goldfinder', icon: '🦡', name: 'Gold Finder', cost: 40, desc: 'Digs up coins for you' },
];
const CREATURE_FOOD_COST = 3;
let creatureTimer = 0;
function creatureInfo() { return CREATURES.find(c => c.id === state.creature); }
function creatureItems() {
    const c = creatureInfo();
    const items = [];
    if (c) items.push({ icon: '🍖', name: `Feed your ${c.name}`, desc: `Food: ${Math.round(state.creatureFood)}% — hungry creatures don't help!`, cost: CREATURE_FOOD_COST, status: 'FEED',
                        action: () => { if (spend(CREATURE_FOOD_COST)) { state.creatureFood = Math.min(100, state.creatureFood + 40); spawnFloatText(player.x, player.y - 40, `${c.icon} Yum! 💕`, '#FF88CC', 60); } } });
    for (const cr of CREATURES) items.push({ icon: cr.icon, name: cr.name, desc: cr.desc, cost: cr.cost, status: state.creature === cr.id ? 'YOURS' : null,
        action: () => {
            if (state.creature === cr.id) return;
            if (spend(cr.cost)) { state.creature = cr.id; state.creatureFood = 100; giveAward('creature'); showToast(`${cr.icon} You adopted a ${cr.name}! Remember to feed it!`, '#FFE066', 220); }
        } });
    return items;
}
function updateCreature() {
    const c = creatureInfo();
    if (!c || !playing()) return;
    state.creatureFood = Math.max(0, state.creatureFood - 100 / (60 * 60 * 3));   // empty after 3 minutes
    if (state.creatureFood < 25 || ++creatureTimer < 150) return;
    creatureTimer = 0;
    const cx = player.x - 30, cy = player.y - 34;
    if (c.id === 'goldfinder') { if (Math.random() < 0.5) { state.coins++; spawnFloatText(cx, cy - 10, '+🪙1', '#FFD700', 50); } return; }
    if (c.id === 'phoenix')    { if (state.playerHp < fullHearts() && Math.random() < 0.3) { state.playerHp++; spawnFloatText(cx, cy - 10, '🔥 +1 ❤', '#FF8844', 60); } return; }
    const e = nearestTarget(300);
    if (!e) return;
    if (c.id === 'babydragon') projectiles.push({ x: cx, y: cy, dx: (e.x - cx) / Math.hypot(e.x - cx, e.y - cy) * 7, dy: (e.y - cy) / Math.hypot(e.x - cx, e.y - cy) * 7, color: '#FF6622', power: POWER.BRIMSTONE, life: 60, r: 6, fromPet: true });
    else { damageEnemy(e, POWER.NONE); bolts.push({ x1: cx, y1: cy, x2: e.x, y2: e.y, life: 10, color: '#CCAA66' }); }
}
function drawCreature() {
    const c = creatureInfo();
    if (!c || state.gamePhase !== 'playing') return;
    const x = player.x - 30, y = player.y - 34 + Math.sin(Date.now() / 250) * 3;
    ctx.save(); ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.icon, x, y);
    if (state.creatureFood < 25) { ctx.font = '12px Arial'; ctx.fillText('😢', x + 12, y - 12); }
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 12, y + 14, 24, 4);
    ctx.fillStyle = state.creatureFood < 25 ? '#FF5544' : '#66DD66'; ctx.fillRect(x - 12, y + 14, 24 * state.creatureFood / 100, 4);
    ctx.restore();
}

// 🟡 Catch the Snitch
const SNITCH_FRAMES = 1800;
let snitch = null;
function startSnitch() {
    snitch = { x: 400, y: 300, vx: 4, vy: 2, timer: SNITCH_FRAMES };
    showToast('🟡 Catch the Golden Snitch! Quick, it\'s FAST!', '#FFE066', 200); sfx('whoosh');
}
function updateSnitch() {
    if (!snitch) return;
    const S = snitch;
    if (--S.timer <= 0) { snitch = null; showToast('🟡 The Snitch got away! Try again!', '#FFAA88', 180); return; }
    const hunters = [{ n: 1, x: player.x, y: player.y }, ...activeFriends().filter(f => f.down <= 0)];
    for (const h of hunters) {
        const d = Math.hypot(S.x - h.x, S.y - h.y);
        if (d < 20) {
            snitch = null; state.coins += 50; addScore(150); giveAward('snitch'); sfx('win'); spawnConfettiAt(S.x, S.y);
            showToast(h.n === 1 ? '🟡 YOU CAUGHT THE SNITCH! +🪙50' : `🟡 PLAYER ${h.n} CAUGHT THE SNITCH! +🪙50`, '#FFD700', 240);
            return;
        }
        if (d < 110) { S.vx += (S.x - h.x) / d * 0.6; S.vy += (S.y - h.y) / d * 0.6; }   // zooms away from you
    }
    if (Math.random() < 0.04) { S.vx += (Math.random() - 0.5) * 6; S.vy += (Math.random() - 0.5) * 6; }
    const sp = Math.hypot(S.vx, S.vy), max = 5.5;
    if (sp > max) { S.vx *= max / sp; S.vy *= max / sp; }
    S.x += S.vx; S.y += S.vy;
    if (S.x < 30 || S.x > 770) S.vx *= -1;
    if (S.y < 70 || S.y > 570) S.vy *= -1;
    S.x = Math.max(30, Math.min(770, S.x)); S.y = Math.max(70, Math.min(570, S.y));
}
function drawSnitch() {
    if (!snitch) return;
    const { x, y } = snitch, f = Math.sin(Date.now() / 30) * 6;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(x - 10, y - 2, 10, 3 + Math.abs(f) * 0.4, -0.4, 0, Math.PI * 2); ctx.ellipse(x + 10, y - 2, 10, 3 + Math.abs(f) * 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🟡 Snitch: ${Math.ceil(snitch.timer / 60)}s`, 400, 92);
}

// 🗺 Magic Map: a little map in the corner showing every monster
let magicMapTimer = 0;
function drawMagicMap() {
    if (magicMapTimer <= 0 || state.gamePhase !== 'playing') return;
    const x0 = 620, y0 = 80, w = 160, h = 120, sx = w / 800, sy = h / 600;
    ctx.save();
    ctx.fillStyle = 'rgba(244,232,192,0.92)'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = '#8A6A3A'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, w, h);
    for (const e of targetableEnemies()) { ctx.fillStyle = BOSS_TYPES.includes(e.type) ? '#AA0000' : '#E04040'; ctx.beginPath(); ctx.arc(x0 + e.x * sx, y0 + e.y * sy, BOSS_TYPES.includes(e.type) ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#2050E0'; ctx.beginPath(); ctx.arc(x0 + player.x * sx, y0 + player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5A3A1A'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🗺 ${targetableEnemies().length} monsters`, x0 + w / 2, y0 + h - 4);
    ctx.restore();
}

function paintChess(g, R) {
    for (let y = 46; y < 600; y += 50) for (let x = 0; x < 800; x += 50) { g.fillStyle = ((x + y - 46) / 50) % 2 ? '#3A3A44' : '#E8E0D0'; g.fillRect(x, y, 50, 50); }
}
function paintLibrary(g, R) {
    g.fillStyle = '#3A2A1E'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${80 + R() * 30},${50 + R() * 20},30,0.5)`; g.fillRect(R() * 800, 46 + R() * 554, 40, 2); }   // floorboards
    for (const sx of [0, 740]) for (let y = 60; y < 540; y += 40) {   // bookshelves down both sides
        g.fillStyle = '#5A3A1E'; g.fillRect(sx, y, 60, 40);
        for (let k = 0; k < 6; k++) { g.fillStyle = `hsl(${R() * 360}, 50%, 40%)`; g.fillRect(sx + 4 + k * 9, y + 6, 7, 30); }
    }
}
function drawMagicPlaces(t, label, verb) {
    const P = place();
    if (state.room === ROOM.CHESS || state.room === ROOM.LIBRARY) {
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(SCHOOL_EXIT.x - 24, 560, 48, 40); label('🚪 Back to town', SCHOOL_EXIT.x, 556, '#FFF');
    }
    if (state.room === ROOM.CHESS && P.won) label('♛ CHECKMATE! You won! ♛', 400, 104, '#FFD700');
    if (state.room === ROOM.LIBRARY && !P.bookTaken) {
        ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20 + Math.sin(t * 4) * 8; ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('📕', GOLDEN_BOOK.x, GOLDEN_BOOK.y); ctx.restore();
        label('✨ Secret spell book', GOLDEN_BOOK.x, GOLDEN_BOOK.y + 30, '#FFE066');
        if (Math.hypot(player.x - GOLDEN_BOOK.x, player.y - GOLDEN_BOOK.y) < 36 && !menu) drawSpeech({ x: GOLDEN_BOOK.x, y: GOLDEN_BOOK.y - 14 }, `${verb}: Open the book!`);
    }
}
function updateMagicExtras() {
    if (magicMapTimer > 0) magicMapTimer--;
    updateCreature(); updateSnitch();
    // owl pets fly off and bring you coins
    if (state.activePet >= 0 && PETS[state.activePet].id === 'owl' && playing() && ++updateMagicExtras.owl % 1800 === 0) {
        state.coins += 5; spawnFloatText(pet.x, pet.y - 20, '🦉 Delivery! +🪙5', '#FFE066', 80); sfx('hoot');
    }
    if (state.room === ROOM.CHESS && !place().won && place().enemies.every(e => !e.alive)) {
        place().won = true; state.coins += 80; addScore(200); giveAward('chess'); sfx('win'); spawnConfettiAt(400, 300);
        showToast('♛ CHECKMATE! You beat Wizard Chess! +🪙80', '#FFD700', 240);
    }
}
updateMagicExtras.owl = 0;

// ── GADGETS (bought at the Blacksmith's Forge, used with Q / B / the ⚙ button) ──
const GADGETS = [
    { id: 'boomerang', name: 'Boomerang', icon: '🪃', cost: 12, cooldown: 40,  desc: 'Flies out and comes back' },
    { id: 'bomb',      name: 'Bombs',     icon: '💣', cost: 18, cooldown: 90,  desc: 'BOOM! Hits everything nearby' },
    { id: 'wand',      name: 'Frog Wand', icon: '🪄', cost: 25, cooldown: 150, desc: 'Turns a monster into a frog' },
    { id: 'tornado',   name: 'Tornado',   icon: '🌪', cost: 30, cooldown: 240, desc: 'Sucks monsters in and spins them' },
    { id: 'bow',       name: 'Bow & Arrows',      icon: '🏹', cost: 20, cooldown: 30,  desc: 'Fire, ice and bomb arrows in turn' },
    { id: 'watergun',  name: 'Water Gun',         icon: '🔫', cost: 15, cooldown: 6,   desc: 'Squirts monsters far away' },
    { id: 'snowball',  name: 'Snowball Launcher', icon: '☃', cost: 20, cooldown: 25,  desc: 'Snowballs freeze monsters' },
    { id: 'paint',     name: 'Paint Gun',         icon: '🎨', cost: 20, cooldown: 45,  desc: "Splat! Painted monsters can't see you" },
    { id: 'banana',    name: 'Banana Peels',      icon: '🍌', cost: 10, cooldown: 40,  desc: 'Drop a peel — monsters slip over!' },
    { id: 'cloak',     name: 'Invisibility Cloak', icon: '🧥', cost: 60, cooldown: 900, desc: 'Vanish! Nothing can hurt you for 10 s' },
    { id: 'map',       name: 'Magic Map',         icon: '🗺', cost: 30, cooldown: 600, desc: 'Shows where every monster is' },
    { id: 'mjolnir',   name: "Thor's Hammer",     icon: '🔨', cost: 80, cooldown: 50,  desc: 'Throw it — lightning! — it comes back' },
    { id: 'shuriken',  name: 'Ninja Stars',       icon: '✴', cost: 25, cooldown: 25,  desc: 'Throw 3 spinning stars' },
    { id: 'lasergun',  name: 'Laser Gun',         icon: '🔫', cost: 45, cooldown: 35,  desc: 'PEW! A laser through everything' },
    { id: 'megarang',  name: 'Mega Boomerang',    icon: '🪃', cost: 40, cooldown: 60,  desc: 'THREE boomerangs at once!' },
    { id: 'hook',      name: 'Grappling Hook',    icon: '🪝', cost: 35, cooldown: 45,  desc: 'Zip across the room or pull monsters in' },
    { id: 'firebow',   name: 'Fire Bow',          icon: '🏹', cost: 50, cooldown: 30,  desc: 'Three flaming arrows!' },
    { id: 'bubblegun', name: 'Bubble Gun',        icon: '🫧', cost: 30, cooldown: 40,  desc: 'Traps monsters in floating bubbles' },
    { id: 'shrinkray', name: 'Shrink Ray',        icon: '🔬', cost: 40, cooldown: 120, desc: 'Shrink yourself into the Micro World!' },
    { id: 'whoopee',   name: 'Whoopee Cushion',   icon: '🎈', cost: 12, cooldown: 40,  desc: 'Monsters sit on it… PFFFT! 😂' },
];
const ARROWS = [
    { kind: 'fire', power: POWER.BRIMSTONE, color: '#FF5522', label: '🔥 Fire arrow' },
    { kind: 'ice',  power: POWER.ICE,       color: '#66AAFF', label: '❄ Ice arrow'  },
    { kind: 'bomb', power: POWER.NONE,      color: '#333333', label: '💣 Bomb arrow' },
];
const MAX_PEELS    = 3;     // banana peels on the ground at once
const PAINT_FRAMES = 300;   // painted monsters wander about blind for 5 s
const DASH_COST          = 10;
const DASH_COOLDOWN      = 70;
const WEAPON_LEVEL_COST  = [0, 15, 30];   // Weapon Level 2 and 3: every shot does +1 / +2 damage

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
const GADGET_SLOT = { x0: 70, y: 574, r: 16, tagReach: 34 };   // first slot's centre, row, radius; how far a key tag sticks out to the right
function gadgetSlots() {
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
    return slots;
}
// How far right the slots (and their key tags) reach: the bottom hint line must stay clear of this
function gadgetHudRight() {
    const n = lastInput === 'touch' ? 0 : gadgetSlots().length;
    return n ? GADGET_SLOT.x0 + (n - 1) * GADGET_SLOT_STEP + GADGET_SLOT.tagReach : GADGET_SLOT.x0 - GADGET_SLOT.r - 10;   // (just past the sound button)
}
function drawGadgetHud() {
    if (lastInput === 'touch') return;
    gadgetSlots().forEach((sl, i) => {
        const x = GADGET_SLOT.x0 + i * GADGET_SLOT_STEP, y = GADGET_SLOT.y;
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

// ── FIGHTING EXTRAS: ninja stars, laser gun, mega boomerang, grappling hook, fire bow, bubble gun ──
let ninjaStars = [], bubbles = [], hook = null, cushions = [];
// 🫢 Burp: a sound wave in front of you · 🤧 Sneeze: ah… ah… ACHOO blows everyone away
const VSILLY = { x: 510, y: 445, r: 18 };
let sillyTurn = 0, sneezeTimer = 0, burpCooldown = 0;
function burp() {
    if (!playing() || burpCooldown > Date.now()) return;
    burpCooldown = Date.now() + 1200;
    lineHit(150, 40, 1, 90, 40);
    for (let k = 0; k < 3; k++) fight.fx.push({ kind: 'whip', x: player.x, y: player.y, a: Math.atan2(state.faceY, state.faceX), r: 60 + k * 40, life: 12 + k * 4 });
    tone(110, 0.45, 'sawtooth', 0.25, 70); spawnFloatText(player.x, player.y - 40, 'BUUUUURP!', '#9ACD32', 60); giveAward('burp');
    const n = nearbyTownsfolk(120)[0]; if (n) say(n, 'Say excuse me!');
}
function sneeze() {
    if (!playing() || sneezeTimer > 0) return;
    sneezeTimer = 60; spawnFloatText(player.x, player.y - 40, 'Ah… ah…', '#AADDFF', 55);
}

function useFightGadget(id, a) {
    if (id === 'shuriken') {
        for (const off of [-0.2, 0, 0.2]) ninjaStars.push({ x: player.x, y: player.y, vx: Math.cos(a + off) * 10, vy: Math.sin(a + off) * 10, life: 60, spin: 0 });
        sfx('whoosh'); return true;
    }
    if (id === 'lasergun') {
        const x2 = player.x + Math.cos(a) * 900, y2 = player.y + Math.sin(a) * 900;
        laserBeam = { x1: player.x, y1: player.y, x2, y2, life: 16 };
        for (const e of targetableEnemies()) {
            const t = Math.max(0, (e.x - player.x) * Math.cos(a) + (e.y - player.y) * Math.sin(a));
            if (Math.hypot(e.x - (player.x + Math.cos(a) * t), e.y - (player.y + Math.sin(a) * t)) < e.r + 10) damageEnemy(e, POWER.NONE, false, 1 + state.weaponLevel - 1);
        }
        sfx('zap'); return true;
    }
    if (id === 'megarang') {
        for (const off of [-0.5, 0, 0.5]) gadgetObjs.push({ kind: 'boomerang', x: player.x, y: player.y, vx: Math.cos(a + off) * 9, vy: Math.sin(a + off) * 9, t: 0, hits: new Set() });
        sfx('whoosh'); return true;
    }
    if (id === 'hook') {
        const e = targetableEnemies().filter(e => !BOSS_TYPES.includes(e.type)).find(e => {
            const t = (e.x - player.x) * Math.cos(a) + (e.y - player.y) * Math.sin(a);
            return t > 0 && t < 320 && Math.hypot(e.x - (player.x + Math.cos(a) * t), e.y - (player.y + Math.sin(a) * t)) < e.r + 14;
        });
        if (e) { hook = { kind: 'pull', e, life: 30 }; spawnFloatText(e.x, e.y - 24, 'GOTCHA!', '#FFE066', 40); }
        else hook = { kind: 'zip', tx: Math.max(30, Math.min(770, player.x + Math.cos(a) * 260)), ty: Math.max(70, Math.min(570, player.y + Math.sin(a) * 260)), life: 30 };
        sfx('whoosh'); return true;
    }
    if (id === 'firebow') {
        for (const off of [-0.15, 0, 0.15]) projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a + off) * 9, dy: Math.sin(a + off) * 9, color: '#FF5522', power: POWER.BRIMSTONE, life: 80, r: 6 });
        sfx('shoot'); return true;
    }
    if (id === 'shrinkray') {
        if (state.room === ROOM.MICROWORLD) { showToast('🔬 You\'re already tiny! Walk out the door to grow big.', '#AAFFAA', 160); return true; }
        spawnParticles(player.x, player.y, '#AAFFAA', 30); sfx('magic');
        changeRoom(ROOM.MICROWORLD); showToast('🔬 ZAP! You shrank into the MICRO WORLD! Find 5 🍪 crumbs!', '#AAFFAA', 240);
        return true;
    }
    if (id === 'whoopee') {
        cushions.push({ x: player.x - state.faceX * 20, y: player.y + 12 }); if (cushions.length > 3) cushions.shift();
        spawnFloatText(player.x, player.y - 30, '🎈 cushion down!', '#FF88CC', 40); sfx('pop'); return true;
    }
    if (id === 'bubblegun') {
        bubbles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, life: 90 });
        sfx('pop'); return true;
    }
    return false;
}
function updateFightExtras() {
    for (const s of ninjaStars) {
        s.x += s.vx; s.y += s.vy; s.life--; s.spin += 0.5;
        const e = targetableEnemies().find(e => Math.hypot(e.x - s.x, e.y - s.y) < e.r + 8);
        if (e) { damageEnemy(e, POWER.NONE, false, state.weaponLevel - 1); s.life = 0; spawnParticles(s.x, s.y, '#CCCCCC', 4); }
    }
    ninjaStars = ninjaStars.filter(s => s.life > 0);
    for (const b of bubbles) {
        b.x += b.vx; b.y += b.vy; b.life--;
        const e = targetableEnemies().find(e => !e.bubbled && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 12);
        if (e) {
            b.life = 0;
            e.frozen = Math.max(e.frozen || 0, BOSS_TYPES.includes(e.type) ? 60 : 240); e.bubbled = BOSS_TYPES.includes(e.type) ? 60 : 240;
            spawnFloatText(e.x, e.y - 30, 'BLOOP!', '#AADDFF', 40); sfx('pop');
        }
    }
    bubbles = bubbles.filter(b => b.life > 0);
    for (let i = cushions.length - 1; i >= 0; i--) {   // 🎈 PFFFT!
        const c = cushions[i], e = targetableEnemies().find(e => Math.hypot(e.x - c.x, e.y - c.y) < e.r + 12);
        if (!e) continue;
        cushions.splice(i, 1); e.stun = Math.max(e.stun || 0, 150); damageEnemy(e, POWER.NONE);
        sfx('fart'); spawnFloatText(e.x, e.y - 30, 'PFFFFT! 😳', '#FF88CC', 70);
        for (const o of targetableEnemies()) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 160) { o.stun = Math.max(o.stun || 0, 90); spawnFloatText(o.x, o.y - 24, 'HA HA!', '#FFE066', 40); }
    }
    for (const e of roomEnemies()) if (e.dancing > 0) e.dancing--;
    if (sneezeTimer > 0 && --sneezeTimer === 0) {   // ACHOOOO!
        pushAll(320, 400); hitAll(1, POWER.NONE, 400);
        for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y - 10, dx: Math.cos(a) * 5, dy: Math.sin(a) * 5, life: 40, maxLife: 40, color: 'rgba(220,240,255,0.8)', r: 4 }); }
        triggerShake(20); tone(300, 0.35, 'sawtooth', 0.2, 900); spawnFloatText(player.x, player.y - 44, 'ACHOOOO!!!', '#AADDFF', 70); giveAward('sneeze');
    }
    for (const e of roomEnemies()) if (e.bubbled > 0) { e.bubbled--; if (!BOSS_TYPES.includes(e.type)) e.y = Math.max(70, e.y - 0.3); if (e.bubbled === 0) spawnParticles(e.x, e.y, '#AADDFF', 6); }
    if (hook) {
        hook.life--;
        if (hook.kind === 'pull' && hook.e.alive) {
            const d = Math.hypot(player.x - hook.e.x, player.y - hook.e.y) || 1;
            if (d > 34) { hook.e.x += (player.x - hook.e.x) / d * 12; hook.e.y += (player.y - hook.e.y) / d * 12; } else { hook.e.stun = Math.max(hook.e.stun || 0, 60); hook.life = 0; }
        }
        if (hook.kind === 'zip') {
            const d = Math.hypot(hook.tx - player.x, hook.ty - player.y);
            if (d > 12) { player.x += (hook.tx - player.x) / d * 12; player.y += (hook.ty - player.y) / d * 12; } else hook.life = 0;
        }
        if (hook.life <= 0) hook = null;
    }
}
function drawFightExtras() {
    for (const s of ninjaStars) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin); ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#CCCCDD'; ctx.fillText('✴', 0, 0); ctx.restore(); }
    for (const b of bubbles) { ctx.save(); ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    for (const e of roomEnemies()) if (e.bubbled > 0 && e.alive) {
        ctx.save(); ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.fillStyle = 'rgba(200,240,255,0.2)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    for (const c of cushions) { ctx.save(); ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎈', c.x, c.y); ctx.restore(); }
    if (hook) {
        const tx = hook.kind === 'pull' ? hook.e.x : hook.tx, ty = hook.kind === 'pull' ? hook.e.y : hook.ty;
        ctx.save(); ctx.strokeStyle = '#8A6A3A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪝', tx, ty); ctx.restore();
    }
}

