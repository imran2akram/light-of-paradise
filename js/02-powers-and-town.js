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

// ── RIDES (Rita's Stable in the Mall; get on / off with V / the 🐴 button) ──
const MOUNTS = [
    { id: 'horse',  icon: '🐴', name: 'Horse',             cost: 25, speed: 1.7, desc: 'Gallop super fast' },
    { id: 'dragon', icon: '🐉', name: 'Flying Dragon',     cost: 60, speed: 1.5, desc: 'Fly right over walls and blocks!' },
    { id: 'kart',   icon: '🏎', name: 'Go-Kart',           cost: 35, speed: 2.2, desc: 'Zoom zoom! (a bit slidey)' },
    { id: 'duck',   icon: '🦆', name: 'Giant Rubber Duck', cost: 15, speed: 0.9, desc: 'Silly and squeaky. Quack!' },
    { id: 'car',    icon: '🚗', name: 'Flying Car',        cost: 80, speed: 2.0, desc: 'Fly over walls, water and lava!' },
    { id: 'unicorn', icon: '🦄', name: 'Unicorn',          cost: 70, speed: 1.8, desc: 'Leaves a rainbow behind you!' },
    { id: 'snail',  icon: '🐌', name: 'Giant Snail',       cost: 5,  speed: 0.5, desc: 'Super slow. Super funny.' },
    { id: 'jetpack', icon: '🎒', name: 'Jetpack',          cost: 120, speed: 2.2, desc: 'WHOOSH! Fly over everything!' },
    { id: 'skates', icon: '🛼', name: 'Rocket Skates',     cost: 50, speed: 2.4, desc: 'Super fast and slidey!' },
    { id: 'hamster', icon: '🐹', name: 'Giant Hamster Ball', cost: 45, speed: 1.8, desc: 'Roll over monsters!' },
    { id: 'dino',   icon: '🦕', name: 'Triceratops',       cost: 0,  speed: 1.6, desc: 'Tame one on Dinosaur Island!', hidden: true },
    { id: 'broom',  icon: '🧹', name: 'Broomstick',        cost: 0,  speed: 1.9, desc: 'Wizards only — fly over everything!', hidden: true },
    { id: 'surf',   icon: '🏄', name: 'Lava Surfboard',    cost: 0,  speed: 1.5, desc: 'Find it at the Volcano — surf the lava!', hidden: true },
    { id: 'trex',   icon: '🦖', name: 'T-Rex',             cost: 0,  speed: 1.5, desc: 'Tame it on Dinosaur Island — STOMP!', hidden: true },
    { id: 'pegasus', icon: '🪽', name: 'Pegasus',          cost: 0,  speed: 2.0, desc: 'The flying horse of the Greek Island!', hidden: true },
];

function mountItems(special = false) {
    const items = MOUNTS.filter(m => special ? m.hidden && state.mounts[m.id] : !m.hidden).map(m => ({
        icon: m.icon, name: m.name, desc: m.desc, cost: m.cost,
        status: state.mount === m.id ? 'RIDING' : state.mounts[m.id] ? 'OWNED — ride' : null,
        action: () => {
            if (state.mounts[m.id]) { state.mount = m.id; state.lastMount = m.id; return; }
            if (spend(m.cost)) { state.mounts[m.id] = true; state.mount = m.id; state.lastMount = m.id; showToast(`${m.icon} Hop on your ${m.name}! (V to get off)`); giveAward('rider'); }
        },
    }));
    if (!special && MOUNTS.some(m => m.hidden && state.mounts[m.id]))   // rides you found on adventures
        items.push({ icon: '⭐', name: 'My special rides', desc: 'Rides you found on adventures', cost: 0, status: 'LOOK →', action: () => openMenu('⭐ MY SPECIAL RIDES', () => mountItems(true)) });
    if (state.mount) items.push({ icon: '🚶', name: 'Get off', desc: 'Walk on your own feet', cost: 0, status: 'OK', action: () => { state.mount = null; } });
    return items;
}

function toggleMount() {
    if (!playing()) return;
    if (state.mount) { state.mount = null; return; }
    if (state.lastMount && state.mounts[state.lastMount]) { state.mount = state.lastMount; sfx('whoosh'); }
    else showToast('🐴 Buy a ride at the Stable in the Mall!', '#FFCC88', 120);
}

function mountSpeed() { const m = MOUNTS.find(m => m.id === state.mount); return m ? m.speed : 1; }

// Drawn under the player
function drawMount() {
    if (!state.mount) return;
    if (state.mount === 'hamster') return;   // the ball is drawn over you (drawRides)
    const emojiMount = { broom: '🧹', surf: '🏄', trex: '🦖', car: '🚗', pegasus: '🐎', unicorn: '🦄', snail: '🐌', jetpack: '🔥', skates: '🛼' }[state.mount];
    if (emojiMount) {   // newer rides are drawn with a big emoji under you
        ctx.save(); ctx.font = state.mount === 'trex' ? '52px Arial' : '34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(player.x, player.y + (state.mount === 'trex' ? 4 : 14)); if (state.faceX > 0) ctx.scale(-1, 1);
        ctx.fillText(emojiMount, 0, 0);
        if (state.mount === 'pegasus') { ctx.font = '22px Arial'; ctx.fillText('🪽', 4, -14 + Math.sin(Date.now() / 90) * 3); }
        ctx.restore();
        return;
    }
    const t = Date.now(), x = player.x, y = player.y + 12, f = state.faceX < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(f, 1);
    if (state.mount === 'horse') {
        const g = Math.sin(state.walkPhase * 1.5) * 4;
        ctx.fillStyle = '#8A5A2A';
        for (const lx of [-14, -8, 8, 14]) ctx.fillRect(lx, 4, 4, 12 + (lx > 0 ? g : -g));
        ctx.beginPath(); ctx.ellipse(0, 2, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(22, -8, 6, 9, 0.5, 0, Math.PI * 2); ctx.fill();          // head
        ctx.fillStyle = '#3A2410'; ctx.fillRect(14, -16, 4, 12); ctx.fillRect(-24, -2, 6, 10);   // mane + tail
        ctx.fillStyle = '#000'; ctx.fillRect(24, -11, 2, 2);
    } else if (state.mount === 'dragon') {
        const flap = Math.sin(t / 90) * 10;
        ctx.fillStyle = '#2E8B3E';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-10, -26 * s - flap * s); ctx.lineTo(12, -6); ctx.fill(); }
        ctx.fillStyle = '#44BB55'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(24, -6, 8, 6, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22'; ctx.beginPath(); ctx.moveTo(22, -12); ctx.lineTo(26, -20); ctx.lineTo(28, -11); ctx.fill();
        ctx.strokeStyle = '#44BB55'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-32, 6, -34, -6); ctx.stroke();
    } else if (state.mount === 'kart') {
        ctx.fillStyle = '#222'; for (const wx of [-14, 12]) { ctx.beginPath(); ctx.arc(wx, 10, 5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#E02A2A'; pathRoundRect(-20, -4, 40, 14, 5); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('1', 0, 7);
        if (Math.hypot(state.vx || 0, state.vy || 0) > 1) { ctx.fillStyle = 'rgba(200,200,200,0.6)'; ctx.beginPath(); ctx.arc(-26 - Math.random() * 6, 4, 4, 0, Math.PI * 2); ctx.fill(); }
    } else if (state.mount === 'dino') {
        const g = Math.sin(state.walkPhase * 1.2) * 3;
        ctx.fillStyle = '#5A7ABA'; for (const lx of [-16, -8, 8, 16]) ctx.fillRect(lx, 6, 6, 10 + (lx > 0 ? g : -g));
        ctx.fillStyle = '#6A8ACA'; ctx.beginPath(); ctx.ellipse(0, 2, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8AAAE0'; ctx.beginPath(); ctx.arc(26, -6, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6A8ACA'; ctx.beginPath(); ctx.ellipse(32, 0, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F4EED8'; ctx.beginPath(); ctx.moveTo(36, -6); ctx.lineTo(46, -12); ctx.lineTo(38, -1); ctx.fill();
    } else if (state.mount === 'duck') {
        const bob = Math.sin(t / 250) * 2;
        ctx.fillStyle = '#FFD83A'; ctx.beginPath(); ctx.ellipse(0, 2 + bob, 24, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(18, -12 + bob, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF8A1A'; ctx.beginPath(); ctx.ellipse(29, -10 + bob, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(21, -15 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

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

// ── HELL CAVES (player can hide here; devil switches to WANDER) ──
const HELL_CAVES = [
    { x: 55,  y: 55,  w: 175, h: 115 },
    { x: 570, y: 400, w: 175, h: 130 },
];

// ── DIG SPOTS (weapons are buried underground inside the caves) ──
const DIG_SPOTS = [
    { x: 105, y: 125 }, { x: 180, y: 125 },   // top-left cave
    { x: 620, y: 480 }, { x: 695, y: 480 },   // bottom-right cave
];
const DIG_MAX_DEPTH       = 3;                 // layers in each dig spot
const DIG_HITS_PER_LAYER  = [3, 4, 8];         // Space / DIG presses per layer (deeper = harder)
const DIG_MOLE_CHANCE     = [0.3, 0.6, 1.0];   // chance a mole monster pops out of each layer
const DIG_RANGE           = 24;                // how close the player must stand to a dig spot
const MOLE_MIN_DIST       = 140;               // a mole always comes up at least this far from the PLAYER
const MOLE_WARN_FRAMES    = 90;                // shaking mound with a "!" before the mole climbs out
const MOLE_EMERGE_FRAMES  = 45;                // then it climbs out (harmless while emerging)
const MOLE_SLOW_FRAMES    = 60;                // gentle start: half speed for the first second out
const MOLE_SLOW_FACTOR    = 0.5;
// Layer 1: Ice / Fire / Lightning / Water · Layer 2: SUPER (3 shots at once) · Layer 3: RAINBOW (strong vs everything)

// ── SETTINGS (⚙ button / O / Start) ───────────────────────────
// Creative Mode is like Minecraft creative: nothing attacks you, everything is free,
// unlimited blocks everywhere, one-hit mining and you can walk through blocks.
let settings = { creative: false, difficulty: 'normal', music: true, sfx: true, upsideDown: false,
                 playerSpeed: 'normal', monsterSpeed: 'normal', dayLength: 'normal', caveTime: 'normal',
                 damageNumbers: true, hints: true, mods: {} };
try { settings = Object.assign(settings, JSON.parse(localStorage.getItem('lop_settings')) || {}); } catch (e) {}
settings.mods = settings.mods || {};
if (settings.upsideDown) settings.mods.upsideDown = true;   // (upside-down moved into the Mods list)
const mod = name => !!settings.mods[name];

// 🧩 MODS: fun switches that change how the game works
const MODS = [
    { id: 'bigHead',      icon: '🗿', name: 'Big Heads',        desc: 'Everyone has a HUGE head' },
    { id: 'tinyMonsters', icon: '🐜', name: 'Tiny Monsters',    desc: 'All the monsters are teeny' },
    { id: 'superSpeed',   icon: '⚡', name: 'Super Speed',      desc: 'You run twice as fast' },
    { id: 'chickens',     icon: '🐔', name: 'Chicken Monsters', desc: 'Every monster is a chicken!' },
    { id: 'doubleCoins',  icon: '🪙', name: 'Double Coins',     desc: 'Monsters drop twice the coins' },
    { id: 'disco',        icon: '🪩', name: 'Disco Party',      desc: 'Flashing party lights everywhere' },
    { id: 'rainbow',      icon: '🌈', name: 'Rainbow Mode',     desc: 'Everything goes rainbow' },
    { id: 'oneHit',       icon: '💥', name: 'One-Hit Wonder',   desc: 'Monsters fall in 1 hit (not bosses)' },
    { id: 'lowGravity',   icon: '🎈', name: 'Low Gravity',      desc: 'Floaty, slidey moving everywhere' },
    { id: 'mirror',       icon: '🪞', name: 'Mirror World',     desc: 'Left and right swap sides' },
    { id: 'upsideDown',   icon: '🙃', name: 'Upside Down',      desc: 'The whole game flips over' },
    { id: 'cheese',       icon: '🧀', name: 'Cheese World',     desc: 'Every monster and coin is CHEESE' },
    { id: 'monsterHats',  icon: '🎩', name: 'Monster Hats',     desc: 'Monsters wear funny hats' },
    { id: 'pirateTalk',   icon: '🏴‍☠️', name: 'Pirate Town',      desc: 'Everyone in town talks like a pirate, arr!' },
    { id: 'halloween',    icon: '🎃', name: 'Halloween',        desc: 'Pumpkins and spooky fun (on by itself in October)' },
    { id: 'christmas',    icon: '🎄', name: 'Christmas',        desc: 'Snow, a tree and presents (on by itself in December)' },
];

function modItems(page = 0) {
    const items = MODS.slice(page * 10, page * 10 + 10).map(m => ({ icon: m.icon, name: m.name, desc: m.desc, cost: 0, status: mod(m.id) ? 'ON ✓' : 'OFF',
        action: () => { settings.mods[m.id] = !mod(m.id); applyUpsideDown(); saveSettings(); if (mod(m.id)) giveAward('modder'); } }));
    if (MODS.length > page * 10 + 10) items.push({ icon: '➡', name: 'More mods', desc: 'Even sillier!', cost: 0, status: 'NEXT', action: () => openMenu('🧩 MORE MODS', () => modItems(page + 1)) });
    return items;
}

// Speeds and times picked in Settings
function dayFrames()  { return { short: 900, normal: 1800, long: 3600 }[settings.dayLength] || 1800; }
function caveMax()    { return { short: 1800, normal: 3600, long: 7200 }[settings.caveTime] || 3600; }
function playerSpeedFactor() { return ({ slow: 0.75, normal: 1, fast: 1.35 }[settings.playerSpeed] || 1) * (mod('superSpeed') ? 2 : 1); }
const SETTINGS_BTN = { x: 26, y: 534, r: 16 };

// ── PARADISE ISLAND TOWN ─────────────────────────────────────
// Daytime is peaceful: talk to the townspeople, do jobs, buy houses.
// Then MONSTER NIGHT comes — beat the Paradise-only monsters to win a Light Crystal.
const DUSK_FRAMES       = 180;            // 3 s "Monster Night is coming!" warning
const HEAL_COST         = 3;              // Doctor
const AMMO_UPGRADE_COST = [10, 15, 20];   // Blacksmith: +1 ammo each
const TALK_RANGE        = 36;
const BUILDINGS = [
    { id: 'clinic',   x: 190, y: 172, w: 84,  name: 'CLINIC',     roof: '#D04848', wall: '#F4EEE0' },
    { id: 'bakery',   x: 320, y: 172, w: 84,  name: 'BAKERY',     roof: '#E09A3A', wall: '#FFF1DC' },
    { id: 'forge',    x: 450, y: 172, w: 84,  name: 'BLACKSMITH', roof: '#4A4A4A', wall: '#A87850' },
    { id: 'hall',     x: 580, y: 172, w: 84,  name: 'TOWN HALL',  roof: '#3366AA', wall: '#E8E0C8' },
    { id: 'mansion',  x: 712, y: 212, w: 108, name: 'MANSION',    roof: '#2A6A4A', wall: '#FFFFFF', cost: 100, door: '#1A3A2A' },
    { id: 'cottage',  x: 170, y: 350, w: 80,  name: 'COTTAGE',    roof: '#AA6633', wall: '#F0D8A8', cost: 30,  door: '#3A7A3A' },
    { id: 'bighouse', x: 610, y: 350, w: 100, name: 'BIG HOUSE',  roof: '#7A3A8A', wall: '#F3E6F5', cost: 60,  door: '#7A3A8A' },
];
// People with jobs (the ones with a job to give you are marked giver: true)
const WORKERS = [
    { id: 'doctor', name: 'Doctor',     x: 190, y: 226, coat: '#FFFFFF', hat: 'doctor' },
    { id: 'baker',  name: 'Baker',      x: 320, y: 226, coat: '#FFFFFF', hat: 'baker',  giver: true },
    { id: 'smith',  name: 'Blacksmith', x: 450, y: 226, coat: '#6B4A2B', hat: 'smith'  },
    { id: 'mayor',  name: 'Mayor',      x: 580, y: 226, coat: '#2A4A88', hat: 'mayor',  giver: true },
    { id: 'farmer', name: 'Farmer',     x: 278, y: 455, coat: '#4A7A2A', hat: 'farmer', giver: true },
    { id: 'fisher', name: 'Fisher',     x: 592, y: 548, coat: '#2A6A8A', hat: 'fisher', giver: true },
    { id: 'teacher', name: 'Teacher (School)', x: 254, y: 250, coat: '#AA4444', hat: 'teacher' },
    { id: 'hattie',  name: 'Hattie the Hat Seller', x: 700, y: 292, coat: '#E080C0', hat: 'hattie' },
    { id: 'captain', name: 'Captain Salty', x: 705, y: 545, coat: '#1A2A5A', hat: 'captain' },
];
// Villagers stroll around the town square
const VILLAGERS = [
    { id: 'rose', name: 'Grandma Rose', coat: '#C080C0', hair: '#DDDDDD', x: 300, y: 300 },
    { id: 'sam',  name: 'Little Sam',   coat: '#FF8844', hair: '#442200', x: 480, y: 290, small: true },
    { id: 'lily', name: 'Lily',         coat: '#44AADD', hair: '#AA6622', x: 360, y: 410 },
    { id: 'tom',  name: 'Old Tom',      coat: '#777755', hair: '#EEEEEE', x: 500, y: 410 },
];
const VILLAGER_CHAT = [
    'What a lovely day!', 'Watch out for Monster Night!', 'Have you been to the Underground Caves?',
    'I heard there\'s a SECRET golden room…', 'The Doctor can heal you for 3 coins.', 'Pets are the best!',
    'The King Slime is SO big!', 'Ask the Baker, Farmer, Fisher or Mayor for a job!', 'Ice beats Fire Monsters!',
];
const FARM       = { x: 40, y: 440, w: 200, h: 92 };
const FARM_CROPS = [70, 118, 166, 214].flatMap(x => [{ x, y: 468 }, { x, y: 508 }]);
const FISH_SPOT  = { x: 640, y: 574 };   // the end of the pier
const CRAFTING_TABLE = { id: 'crafting', name: 'Crafting Table', x: 520, y: 432, table: true };
const LESSONS = [
    { id: 'running', icon: '🏃', name: 'Running Class',  cost: 10, desc: 'Run 20% faster everywhere' },
    { id: 'magnet',  icon: '🧲', name: 'Magnet Class',   cost: 12, desc: 'Coins fly to you from far away' },
    { id: 'shield',  icon: '🛡', name: 'Dodging Class',  cost: 15, desc: 'Longer safe time after a hit' },
    { id: 'healing', icon: '💖', name: 'Healing Class',  cost: 20, desc: 'Heal 1 heart every 30 s anywhere' },
    { id: 'double',  icon: '✌', name: 'Double Shot',    cost: 25, desc: 'Normal weapons fire 2 shots' },
    { id: 'reload',  icon: '⏩', name: 'Quick Hands',    cost: 18, desc: 'Reload twice as fast' },
];
const HATS = [
    { id: 'crown',   icon: '👑', name: 'Crown',        cost: 30 },
    { id: 'cowboy',  icon: '🤠', name: 'Cowboy Hat',   cost: 12 },
    { id: 'wizard',  icon: '🧙', name: 'Wizard Hat',   cost: 15 },
    { id: 'tophat',  icon: '🎩', name: 'Top Hat',      cost: 10 },
    { id: 'party',   icon: '🥳', name: 'Party Hat',    cost: 5  },
    { id: 'pirate',  icon: '🏴‍☠️', name: 'Pirate Hat',   cost: 15 },
    { id: 'cap',     icon: '🧢', name: 'Baseball Cap', cost: 6  },
    { id: 'flowers', icon: '🌸', name: 'Flower Crown', cost: 8  },
];
const NIGHT_MONSTER_CHANCE = 0.7;         // some nights are quiet… (but never two quiet nights in a row)
const QUIET_NIGHT_FRAMES   = 600;         // a quiet night lasts 10 s
const AMBUSH_FRAMES        = [700, 1500]; // daytime: monsters sometimes pop up every 12–25 s
const AMBUSH_TYPES         = ['fire', 'ghost', 'bat', 'slime'];

// ── WEATHER (Paradise Island daytime) ────────────────────────
const WEATHER_FRAMES  = 1200;   // weather changes every 20 s
const RAINBOW_FRAMES  = 600;    // a rainbow shows for 10 s after rain

