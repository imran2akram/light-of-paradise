// ── PETS ─────────────────────────────────────────────────────
// Buy pets in the shop. Your pet follows you everywhere and fights with its own special power.
const PETS = [
    { id: 'puppy',   name: 'Puppy',       cost: 15, power: 'Fetch + bite', range: 170, speed: 3.5, cooldown: 45  },
    { id: 'kitten',  name: 'Kitten',      cost: 20, power: 'Fast claws',   range: 170, speed: 4.5, cooldown: 18  },
    { id: 'owl',     name: 'Owl',         cost: 25, power: 'Heal + zap',   range: 260, speed: 3,   cooldown: 110 },
    { id: 'dragon',  name: 'Baby Dragon', cost: 35, power: 'Fireballs',    range: 260, speed: 3,   cooldown: 80  },
    { id: 'penguin', name: 'Penguin',     cost: 30, power: 'Snowballs',    range: 240, speed: 2.8, cooldown: 70  },
    { id: 'unicorn', name: 'Unicorn',     cost: 40, power: 'Big heals',    range: 260, speed: 3.8, cooldown: 140 },
    { id: 'trex',    name: 'T-Rex',       cost: 45, power: 'STOMP!',       range: 180, speed: 3.2, cooldown: 100 },
    { id: 'robodog', name: 'Robot Dog',   cost: 50, power: 'Laser bark',   range: 280, speed: 3.6, cooldown: 60  },
    { id: 'goose',   name: 'Golden Goose',cost: 60, power: 'Lays golden eggs', range: 220, speed: 2.8, cooldown: 90 },
];
const PET_EMOJI = { robodog: ['🐕', 'grayscale(1) brightness(1.35)'], goose: ['🪿', 'sepia(1) saturate(5) brightness(1.1)'] };
const PET_XP_LEVELS  = [0, 20, 60, 120, 200];   // XP needed for levels 1-5
const UNICORN_HEAL_FRAMES = 720;                // the Unicorn heals 1 heart every 12 s
const OWL_HEAL_FRAMES = 1200;   // the Owl heals 1 heart every 20 s

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

// ── DRAW: PETS ─────────────────────────────────────────────
// Draws a pet (also used for the shop previews). s = size scale, face = 1 left / -1 right
function drawPetShape(id, x, y, s = 1, face = 1) {
    const t = Date.now();
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * face, s);
    if (PET_EMOJI[id]) {   // newer pets are big emoji
        const [em, filter] = PET_EMOJI[id];
        ctx.filter = filter; ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.scale(-1, 1); ctx.fillText(em, 0, -2);
        ctx.filter = 'none'; if (id === 'robodog') { ctx.font = '10px Arial'; ctx.fillText('📡', 4, -14); }
        ctx.restore();
        return;
    }
    if (id === 'puppy') {
        ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 3;   // wagging tail
        ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(15, -7 + Math.sin(t / 60) * 4); ctx.stroke();
        ctx.fillStyle = '#C8904A';
        ctx.beginPath(); ctx.ellipse(2, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.fillRect(-6, 4, 3, 5); ctx.fillRect(6, 4, 3, 5);                       // legs
        ctx.beginPath(); ctx.arc(-9, -6, 7, 0, Math.PI * 2); ctx.fill();            // head
        ctx.fillStyle = '#6B3E1E';
        ctx.beginPath(); ctx.ellipse(-12, -8, 3, 6, 0.4, 0, Math.PI * 2); ctx.ellipse(-5, -9, 3, 6, -0.4, 0, Math.PI * 2); ctx.fill();   // floppy ears
        ctx.fillStyle = '#000';
        ctx.fillRect(-11, -8, 2, 2); ctx.beginPath(); ctx.arc(-15, -5, 1.8, 0, Math.PI * 2); ctx.fill();   // eye + nose
    } else if (id === 'kitten') {
        ctx.strokeStyle = '#E07A1A'; ctx.lineWidth = 3;   // curly tail
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(18, -4, 14, -12 + Math.sin(t / 150) * 2); ctx.stroke();
        ctx.fillStyle = '#FF9933';
        ctx.beginPath(); ctx.ellipse(2, 1, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-5, 4, 3, 5); ctx.fillRect(5, 4, 3, 5);
        ctx.beginPath(); ctx.arc(-8, -5, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-13, -15); ctx.lineTo(-9, -10); ctx.moveTo(-7, -10); ctx.lineTo(-3, -15); ctx.lineTo(-2, -8); ctx.fill();   // ears
        ctx.fillStyle = '#000'; ctx.fillRect(-11, -7, 2, 2); ctx.fillRect(-6, -7, 2, 2);
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 0.8;   // whiskers
        ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(-17, -4); ctx.moveTo(-10, -2); ctx.lineTo(-17, -1); ctx.stroke();
    } else if (id === 'owl') {
        const flap = Math.sin(t / 90) * 5;
        ctx.translate(0, Math.sin(t / 300) * 2 - 6);   // hovers
        ctx.fillStyle = '#7A5A3A';
        ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-16, -6 - flap); ctx.lineTo(-8, 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(7, -2); ctx.lineTo(16, -6 - flap); ctx.lineTo(8, 6); ctx.fill();
        ctx.fillStyle = '#9A7A5A';
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-7, -14); ctx.lineTo(-3, -10); ctx.moveTo(8, -8); ctx.lineTo(7, -14); ctx.lineTo(3, -10); ctx.fill();   // ear tufts
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.arc(4, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-4, -4, 2, 0, Math.PI * 2); ctx.arc(4, -4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22';
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(0, 4); ctx.fill();   // beak
    } else if (id === 'penguin') {
        const waddle = Math.sin(t / 120) * 0.15;
        ctx.rotate(waddle);
        ctx.fillStyle = '#FF9922'; ctx.fillRect(-6, 8, 5, 3); ctx.fillRect(1, 8, 5, 3);                        // feet
        ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2); ctx.fill();    // tummy
        ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.ellipse(-9, 1, 3, 7, 0.3, 0, Math.PI * 2); ctx.ellipse(9, 1, 3, 7, -0.3, 0, Math.PI * 2); ctx.fill();   // flippers
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-3, -6, 2, 0, Math.PI * 2); ctx.arc(3, -6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3, -6, 1, 0, Math.PI * 2); ctx.arc(3, -6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF9922'; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(2, -3); ctx.lineTo(0, 0); ctx.fill();   // beak
    } else if (id === 'unicorn') {
        const gallop = Math.sin(t / 80) * 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7, 3, 3, 8 + gallop); ctx.fillRect(5, 3, 3, 8 - gallop);                              // legs
        ctx.beginPath(); ctx.ellipse(1, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();                          // body
        ctx.beginPath(); ctx.ellipse(-11, -7, 5, 6, -0.4, 0, Math.PI * 2); ctx.fill();                     // head
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(-17, -22); ctx.lineTo(-10, -13); ctx.fill();   // golden horn
        ['#FF4466', '#FFAA22', '#FFEE33', '#44DD66', '#44AAFF', '#AA66FF'].forEach((c, i) => {           // rainbow mane + tail
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-7 + i * 1.2, -10 + i * 2, 2.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12 + i * 0.8, -2 + i * 1.6 + Math.sin(t / 150 + i) * 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-12, -8, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'trex') {
        const stomp = Math.sin(t / 100) * 2;
        ctx.strokeStyle = '#4A8A3A'; ctx.lineWidth = 6; ctx.lineCap = 'round';                              // tail
        ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(18, 4, 22, -4); ctx.stroke();
        ctx.fillStyle = '#3A7A2A'; ctx.fillRect(-4, 6, 4, 7 + stomp); ctx.fillRect(4, 6, 4, 7 - stomp);    // big legs
        ctx.fillStyle = '#5AAA4A'; ctx.beginPath(); ctx.ellipse(2, 0, 10, 9, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.beginPath(); ctx.ellipse(-9, -10, 9, 7, -0.2, 0, Math.PI * 2); ctx.fill();                     // huge head
        ctx.fillStyle = '#3A7A2A'; ctx.fillRect(-6, 0, 4, 2); ctx.fillRect(-6, 3, 3, 2);                     // tiny arms!
        ctx.fillStyle = '#FFF'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-16 + k * 3, -6); ctx.lineTo(-15 + k * 3, -3); ctx.lineTo(-14 + k * 3, -6); ctx.fill(); }   // teeth
        ctx.fillStyle = '#FFEE33'; ctx.beginPath(); ctx.arc(-9, -13, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(-9.5, -14, 1, 2.5);
    } else if (id === 'dragon') {
        const flap = Math.sin(t / 100) * 4;
        ctx.fillStyle = '#2E8B3E';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(8, -16 - flap); ctx.lineTo(12, -3); ctx.fill();   // wing
        ctx.strokeStyle = '#44BB55'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(9, 2); ctx.quadraticCurveTo(16, 4, 18, -2); ctx.stroke();           // tail
        ctx.fillStyle = '#44BB55';
        ctx.beginPath(); ctx.ellipse(2, 1, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFCC66';
        ctx.beginPath(); ctx.ellipse(1, 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();                        // belly
        ctx.fillStyle = '#44BB55';
        ctx.beginPath(); ctx.arc(-9, -5, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22';
        ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-8, -16); ctx.lineTo(-6, -11); ctx.fill();    // horn
        ctx.fillStyle = '#FFEE33'; ctx.fillRect(-12, -7, 3, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(-11, -7, 1, 3);
    }
    ctx.restore();
}

function drawPet() {
    if (state.activePet < 0 || state.gamePhase !== 'playing') return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 10, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const hop = state.danceTimer > 0 ? Math.abs(Math.sin(state.danceTimer / 4)) * 8 : pet.stomp > 0 ? Math.sin(pet.stomp / 15 * Math.PI) * 12 : 0;
    const lv = petLevel(), petId = PETS[state.activePet].id;
    const grow = petId === 'dragon' ? 1 + (lv - 1) * 0.2 : 1;   // 🐉 your dragon grows up as it levels up!
    drawPetShape(petId, pet.x, pet.y - hop, grow, pet.face);
    const costume = PET_COSTUMES.find(c => c.id === state.petCostume);
    if (costume) { ctx.save(); ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(costume.icon, pet.x, pet.y - hop - 13 * grow); ctx.restore(); }
    if (lv > 1) { ctx.fillStyle = '#FFE066'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('★'.repeat(lv - 1), pet.x, pet.y - 22 - hop); }
}

// ── PETS & RIDES: pet battles, golden eggs, ride trails, the hamster ball ──
const WILD_PET_NAMES = ['Sir Fluffington', 'Mr Snuggles', 'Captain Whiskers', 'Princess Pickle', 'Big Bob', 'Tiny Tim'];
let petBattle = null;   // { foe, you, them, turn, timer, cheer, result }
function startPetBattle() {
    if (state.activePet < 0) { showToast('🐾 You need a pet to battle! Buy one in the Shop.', '#FFCC88', 150); return; }
    const others = PETS.map((p, i) => i).filter(i => i !== state.activePet);
    const lv = petLevel();
    petBattle = { foe: others[Math.floor(Math.random() * others.length)], foeName: WILD_PET_NAMES[Math.floor(Math.random() * WILD_PET_NAMES.length)],
                  foeLv: Math.max(1, lv + Math.floor(Math.random() * 3) - 1), you: 10 + lv * 2, them: 10 + lv * 2, max: 10 + lv * 2,
                  turn: 0, timer: 90, cheer: 0, result: 0, msg: 'FIGHT!' };
    sfx('bite');
}
function cheerPetBattle() {
    if (!petBattle || petBattle.result) return;
    petBattle.cheer = Math.min(3, petBattle.cheer + 0.5);
    spawnParticles(250, 330, '#FFE066', 3);
}
function updatePetBattle() {
    const B = petBattle;
    if (B.result) { if (--B.result === 0) petBattle = null; return; }
    if (--B.timer > 0) return;
    B.timer = 50;
    if (B.turn++ % 2 === 0) {   // your pet's turn (cheering helps!)
        const dmg = 1 + Math.floor(Math.random() * 3) + Math.floor(B.cheer) + (petLevel() > 2 ? 1 : 0);
        B.them -= dmg; B.cheer = 0; B.msg = `Your ${PETS[state.activePet].name} hits for ${dmg}!`; sfx('hit');
    } else {
        const dmg = 1 + Math.floor(Math.random() * 3) + (B.foeLv > 2 ? 1 : 0);
        B.you -= dmg; B.msg = `${B.foeName} hits back for ${dmg}!`; sfx('hurt');
    }
    if (B.them <= 0 || B.you <= 0) {
        B.result = 180;
        if (B.them <= 0) { petGainXp(40); state.coins += 30; giveAward('petBattle'); sfx('win'); B.msg = '🏆 YOUR PET WON! +🪙30'; }
        else { petGainXp(10); B.msg = `${B.foeName} won… train and try again!`; }
    }
}
function drawPetBattle() {
    const B = petBattle;
    if (!B) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#5A8A3A'; ctx.fillRect(150, 200, 500, 220); ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; ctx.strokeRect(150, 200, 500, 220);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('🐾 PET BATTLE! 🐾', 400, 190);
    const shake = k => (B.timer > 40 && (B.turn % 2) === k) ? Math.sin(Date.now() / 20) * 4 : 0;
    drawPetShape(PETS[state.activePet].id, 260 + shake(0), 320, 2.4, -1);
    drawPetShape(PETS[B.foe].id, 540 + shake(1), 320, 2.4, 1);
    const bar = (x, hp, name) => {
        ctx.fillStyle = '#222'; ctx.fillRect(x - 70, 230, 140, 12);
        ctx.fillStyle = hp / B.max > 0.3 ? '#44DD44' : '#FF4444'; ctx.fillRect(x - 70, 230, 140 * Math.max(0, hp) / B.max, 12);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Arial'; ctx.fillText(name, x, 224);
    };
    bar(260, B.you, `Your ${PETS[state.activePet].name}`); bar(540, B.them, `${B.foeName} the ${PETS[B.foe].name}`);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.fillText(B.msg, 400, 400);
    ctx.fillStyle = '#FFE066'; ctx.font = '11px Arial';
    ctx.fillText(`${byInput('Press SPACE', 'Tap', 'Press A')} to CHEER! (cheering makes your pet hit harder)`, 400, 445);
    ctx.restore();
}

let goldenEggTimer = 0;
function updateRides() {
    if (!playing()) return;
    if (state.activePet >= 0 && PETS[state.activePet].id === 'goose' && ++goldenEggTimer % 2700 === 0) {   // 🥚 every 45 seconds
        state.coins += 10; spawnFloatText(pet.x, pet.y - 20, '🥚 GOLDEN EGG! +🪙10', '#FFD700', 90); sfx('found');
    }
    const moving = Math.hypot(state.vx || 0, state.vy || 0) > 0.5 || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || padMove.x || padMove.y || vTouch.joyId !== null;
    if (!moving || Math.random() > 0.6) return;
    const trail = { unicorn: `hsl(${(Date.now() / 5) % 360}, 100%, 65%)`, snail: 'rgba(160,220,120,0.7)', jetpack: Math.random() < 0.5 ? '#FF8822' : '#FFDD44' }[state.mount];
    if (trail) particles.push({ x: player.x + (Math.random() - 0.5) * 10, y: player.y + 18, dx: (Math.random() - 0.5) * 0.6, dy: state.mount === 'jetpack' ? 2 : 0.2,
                                life: state.mount === 'snail' ? 120 : 40, maxLife: state.mount === 'snail' ? 120 : 40, color: trail, r: state.mount === 'snail' ? 6 : 4 });
}
function drawRides() {
    if (state.mount !== 'hamster' || state.gamePhase !== 'playing') return;
    ctx.save(); ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, player.y + 2, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(player.x, player.y + 2, 30, state.walkPhase, state.walkPhase + 1.2); ctx.stroke();
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

