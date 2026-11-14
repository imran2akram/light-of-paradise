// ── WORLD 2: Demigod Camp, quests, Mount Olympus, Pirate Island, lava surf, T-Rex ──
const CAMP_EXIT       = { x: 400, y: 578 };
const QUEST_BOARD     = { x: 230, y: 250 };
const OLYMPUS_STAIRS  = { x: 620, y: 150 };   // in camp
const HEAVEN_OLYMPUS  = { x: 620, y: 470 };   // in Heaven
const OLYMPUS_EXIT    = { x: 400, y: 578 };
const SURFBOARD       = { x: 200, y: 400 };   // in the Volcano
const TREX            = { x: 200, y: 250 };   // on Dinosaur Island
// 📜 Quests from the camp board (demigods only)
const QUESTS = [
    { kind: 'kills', need: 10, icon: '👾', text: 'Beat 10 monsters',   reward: 80 },
    { kind: 'kills', need: 25, icon: '👹', text: 'Beat 25 monsters',   reward: 200 },
    { kind: 'boss',  need: 1,  icon: '🐉', text: 'Beat any boss',      reward: 250 },
    { kind: 'race',  need: 1,  icon: '⭕', text: 'Win a Ring Race',     reward: 100 },
];
function questItems() {
    const q = state.quest, god = godParent();
    if (q) return [
        { icon: q.icon, name: q.text, desc: `Done ${q.got} of ${q.need}. Reward: 🪙${q.reward}`, cost: 0, status: 'ON QUEST', action: () => {} },
        { icon: '❌', name: 'Give up', desc: 'Pick a different quest', cost: 0, status: null, action: () => { state.quest = null; } },
    ];
    return QUESTS.map(qt => ({ icon: qt.icon, name: qt.text, desc: `${god ? god.name : 'Your god'} will give you 🪙${qt.reward}`, cost: 0, status: 'START',
        action: () => { state.quest = { ...qt, got: 0 }; menu = null; showToast(`📜 QUEST: ${qt.text}! Go, hero!`, '#FFE066', 200); } }));
}
function questProgress(kinds) {
    const q = state.quest;
    if (!q || !kinds.includes(q.kind)) return;
    q.got++;
    if (q.got < q.need) return;
    const god = godParent();
    state.coins += q.reward; addScore(q.reward); state.questsDone++; state.quest = null;
    giveAward('quest'); sfx('win'); spawnConfettiAt(player.x, player.y);
    showToast(`📜 QUEST DONE! ${god ? god.icon + ' ' + god.name + ' is SO proud of you!' : ''} +🪙${q.reward}`, '#FFD700', 260);
}

// 🏛 Gods on Olympus: talk to them for a blessing (once a visit). Your own god parent gives the best one.
const OLYMPUS_STARS = ['zeus', 'hera', 'poseidon', 'athena', 'apollo', 'artemis'];
function olympusGods() {
    const ids = [...OLYMPUS_STARS];
    if (state.demigod && !ids.includes(state.demigod)) ids[ids.length - 1] = state.demigod;   // your parent is always there
    return ids.map((id, i) => ({ ...GOD_PARENTS.find(g => g.id === id), x: 140 + i * 104, y: i % 2 ? 230 : 200 }));
}
function talkToGod(g) {
    if (g.id === 'zeus') { openMenu('⚡ ZEUS: THE HERO TRIALS', trialItems); return; }
    const P = place();
    if (P.blessed[g.id]) { showToast(`${g.icon} ${g.name}: "Come back another time, little hero!"`, '#FFE8A0', 150); return; }
    P.blessed[g.id] = true;
    if (g.id === state.demigod) {
        state.coins += 50; state.playerHp = fullHearts(); state.bubble = true;
        showToast(`${g.icon} ${g.name}: "My child! I'm so proud of you!" (+🪙50, hearts, bubble)`, '#FFD700', 260); sfx('win');
        spawnParticles(player.x, player.y, '#FFD700', 30);
        return;
    }
    const gifts = [
        ['+🪙15', () => { state.coins += 15; }],
        ['full hearts', () => { state.playerHp = fullHearts(); }],
        ['a Shield Bubble', () => { state.bubble = true; }],
        ['super speed', () => { godSpeedTimer = 600; }],
    ];
    const [what, give] = gifts[Math.floor(Math.random() * gifts.length)];
    give(); sfx('magic'); spawnParticles(player.x, player.y, '#FFF4B0', 16);
    showToast(`${g.icon} ${g.name} blesses you with ${what}!`, '#FFE8A0', 180);
}

function drawOlympusStairs(o, text) {
    ctx.save();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#F4E8C0' : '#FFFFFF'; ctx.fillRect(o.x - 30 + k * 3, o.y + 14 - k * 8, 60 - k * 6, 8); }
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(o.x, o.y - 30, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, o.x, o.y + 36);
    ctx.restore();
}

function paintCamp(g, R) {
    g.fillStyle = '#6AAA4A'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 800; i++) { g.fillStyle = `hsla(${90 + R() * 30}, 45%, ${32 + R() * 14}%, 0.6)`; g.fillRect(R() * 800, R() * 600, 3, 3); }
    for (let k = 0; k < 6; k++) {   // cabins, one colour per god
        const x = 70 + k * 130, col = ['#E0C040', '#3A8AE0', '#555566', '#E05A3A', '#AAAAAA', '#E07AB0'][k];
        g.fillStyle = col; g.fillRect(x - 40, 60, 80, 56); g.fillStyle = '#6A3A1A'; g.beginPath(); g.moveTo(x - 46, 62); g.lineTo(x, 36); g.lineTo(x + 46, 62); g.fill();
        g.fillStyle = '#3A2410'; g.fillRect(x - 9, 86, 18, 30);
    }
    g.fillStyle = '#8A6A4A'; g.beginPath(); g.arc(400, 330, 40, 0, Math.PI * 2); g.fill();   // campfire ring
}
function paintOlympus(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 600); sky.addColorStop(0, '#FFE9A8'); sky.addColorStop(1, '#FFFFFF');
    g.fillStyle = sky; g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#F2EEE4'; g.fillRect(0, 300, 800, 300);                                     // marble floor
    g.strokeStyle = 'rgba(180,170,150,0.4)'; for (let x = 0; x < 800; x += 60) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 600); g.stroke(); }
    for (let k = 0; k < 9; k++) { const x = 40 + k * 90; g.fillStyle = '#FFFFFF'; g.fillRect(x - 12, 70, 24, 220); g.fillStyle = '#E8E0D0'; g.fillRect(x - 18, 60, 36, 14); g.fillRect(x - 18, 284, 36, 14); }   // columns
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 46, 800, 18);
    for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(R() * 800, 560 + R() * 40, 60, 18, 0, 0, Math.PI * 2); g.fill(); }   // clouds below
}
function paintPirateCove(g, R) {
    g.fillStyle = '#E8D090'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${200 + R() * 40},${170 + R() * 30},${100 + R() * 30},0.6)`; g.fillRect(R() * 800, R() * 600, 2, 2); }
    const sea = g.createLinearGradient(0, 46, 0, 140); sea.addColorStop(0, '#1A4A7A'); sea.addColorStop(1, '#3A8ACA');
    g.fillStyle = sea; g.fillRect(0, 46, 800, 94);
    for (const [x, y] of [[90, 200], [730, 330], [150, 520], [700, 540]]) {   // palm trees
        g.fillStyle = '#8A5A2A'; g.fillRect(x - 4, y - 50, 8, 56);
        g.fillStyle = '#2E8A2E'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * 1.26) * 18, y - 54 + Math.sin(k * 1.26) * 8, 20, 6, k * 1.26, 0, Math.PI * 2); g.fill(); }
    }
}

function drawWorld2(t, P, label, verb) {
    const nearIt = (o, r = 50) => Math.hypot(player.x - o.x, player.y - o.y) < r;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    if (state.room === ROOM.CAMP) {
        emoji('🔥', 400, 322 + Math.sin(t * 8) * 2, 34);
        ctx.fillStyle = '#8A5A2A'; ctx.fillRect(QUEST_BOARD.x - 34, QUEST_BOARD.y - 30, 68, 46); ctx.fillRect(QUEST_BOARD.x - 3, QUEST_BOARD.y + 16, 6, 24);
        ctx.fillStyle = '#F4E8C0'; for (let k = 0; k < 3; k++) ctx.fillRect(QUEST_BOARD.x - 28 + k * 20, QUEST_BOARD.y - 24 + (k % 2) * 6, 16, 22);
        label('📜 QUEST BOARD', QUEST_BOARD.x, QUEST_BOARD.y + 54, '#FFF');
        if (state.quest) label(`Quest: ${state.quest.text} (${state.quest.got}/${state.quest.need})`, 400, 140, '#FFE066');
        drawOlympusStairs(OLYMPUS_STAIRS, '🏛 Stairs to Mount Olympus');
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(CAMP_EXIT.x - 24, 560, 48, 40); label('🚪 Back to the Mall', CAMP_EXIT.x, 556, '#FFF');
        if (nearIt(QUEST_BOARD) && !menu) drawSpeech({ x: QUEST_BOARD.x, y: QUEST_BOARD.y - 20 }, `${verb}: Pick a quest!`);
    }
    if (state.room === ROOM.OLYMPUS) {
        for (const g of olympusGods()) {
            ctx.save(); ctx.fillStyle = g.id === state.demigod ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(g.x, g.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            emoji(g.icon, g.x, g.y + Math.sin(t * 2 + g.x) * 3, 34);
            label(g.name, g.x, g.y + 46, g.id === state.demigod ? '#B8860B' : '#665');
            if (g.id === state.demigod) label('👑 YOUR PARENT', g.x, g.y - 38, '#B8860B');
            if (nearIt(g, 40) && !menu) drawSpeech({ x: g.x, y: g.y - 20 }, P.blessed[g.id] ? 'Hello again!' : `${verb}: Talk to ${g.name}`);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(OLYMPUS_EXIT.x, 582, 50, 14, 0, 0, Math.PI * 2); ctx.fill();
        label('☁ Down to Heaven', OLYMPUS_EXIT.x, 566, '#665');
    }
    if (state.room === ROOM.PIRATECOVE) {
        ctx.save(); ctx.globalAlpha = 0.45 + Math.sin(t) * 0.1;   // 👻 the ghost ship floating out at sea
        const sx = 400 + Math.sin(t * 0.3) * 250;
        ctx.fillStyle = '#AACCDD'; ctx.beginPath(); ctx.moveTo(sx - 60, 100); ctx.lineTo(sx + 60, 100); ctx.lineTo(sx + 40, 124); ctx.lineTo(sx - 40, 124); ctx.fill();
        ctx.fillRect(sx - 2, 52, 4, 50); ctx.fillStyle = '#DDEEFF'; ctx.fillRect(sx - 26, 56, 24, 34); ctx.fillRect(sx + 2, 60, 22, 30);
        ctx.restore(); label('👻 THE GHOST SHIP', sx, 140, '#DDEEFF');
        for (const x of P.xs) {
            if (x.dug) { ctx.fillStyle = 'rgba(90,60,30,0.6)'; ctx.beginPath(); ctx.ellipse(x.x, x.y, 16, 8, 0, 0, Math.PI * 2); ctx.fill(); continue; }
            ctx.strokeStyle = '#C02020'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x.x - 12, x.y - 12); ctx.lineTo(x.x + 12, x.y + 12); ctx.moveTo(x.x + 12, x.y - 12); ctx.lineTo(x.x - 12, x.y + 12); ctx.stroke();
            if (nearIt(x, 30) && !menu) drawSpeech({ x: x.x, y: x.y - 14 }, `${verb}: Dig! (${x.hits}/4)`);
        }
    }
    if (state.room === ROOM.VOLCANO && !state.mounts.surf) {
        emoji('🏄', SURFBOARD.x, SURFBOARD.y + Math.sin(t * 3) * 3, 30); label('Lava Surfboard!', SURFBOARD.x, SURFBOARD.y + 30, '#FFCC88');
        if (nearIt(SURFBOARD) && !menu) drawSpeech({ x: SURFBOARD.x, y: SURFBOARD.y - 14 }, `${verb}: Grab the surfboard!`);
    }
    if (state.room === ROOM.DINO && !state.mounts.trex) {
        ctx.save(); ctx.translate(TREX.x, TREX.y); ctx.scale(-1, 1); emoji('🦖', 0, Math.sin(t * 2) * 2, 64); ctx.restore();
        label('A wild T-Rex!', TREX.x, TREX.y + 44, '#FFFFFF');
        if (nearIt(TREX, 60) && !menu) drawSpeech({ x: TREX.x, y: TREX.y - 30 }, `${verb}: Tame the T-Rex!`);
    }
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

// ── HEROES: Greek Island, the maze, Medusa, the Underworld, Vikings, the Sphinx, Hero Trials ──
const FLEECE      = { x: 680, y: 140 };   // on the Greek Island, guarded by the Hydra
const PEGASUS     = { x: 400, y: 150 };
const MAZE_DOOR   = { x: 250, y: 230 };
const GORGON_DOOR = { x: 700, y: 430 };
const CHARON      = { x: 460, y: 530 };   // the boat to the Underworld
const MAZE_GOAL   = { x: 768, y: 96 };    // treasure in the far corner of the maze
const MAZE_START  = { x: 48, y: 528 };    // where you come in (and can give up)
const VIKING_CHEST = { x: 680, y: 480 };
const SPHINX      = { x: 400, y: 500 };   // in the Desert Pyramid
const HERO_TRIALS = [
    { type: 'hydra',    text: 'Beat the Hydra (Greek Island)' },
    { type: 'minotaur', text: 'Beat the Minotaur (the maze)' },
    { type: 'medusa',   text: 'Beat Medusa (her temple)' },
    { type: 'cerberus', text: 'Beat Cerberus (the Underworld)' },
];
const RIDDLES = [
    ['What has hands but can\'t clap?',              'A clock',  ['A monkey', 'A glove']],
    ['What gets wetter the more it dries?',          'A towel',  ['Water', 'A fish']],
    ['What goes up but never comes down?',           'Your age', ['A balloon', 'A bird']],
    ['What has legs but can\'t walk?',               'A table',  ['A snake', 'A dog']],
    ['What can you catch but not throw?',            'A cold',   ['A ball', 'A fish']],
    ['What has one eye but can\'t see?',             'A needle', ['A pirate', 'A cyclops']],
    ['What has a neck but no head?',                 'A bottle', ['A giraffe', 'A snake']],
    ['What is full of holes but still holds water?', 'A sponge', ['A bucket', 'A net']],
];

// The maze is rebuilt every visit: 11 × 7 rooms, walls of Maze Stone (can't be mined) between them
function makeMazeBlocks() {
    const b = {}, W = 11, H = 7, seen = new Set(), put = (cx, cy) => { b[cellKey(cx, cy)] = { type: 'mazeStone', hits: 0 }; };
    const walls = new Set();
    for (let cx = 0; cx <= 3 * W; cx++) for (let cy = 2; cy <= 3 + 3 * H; cy++) walls.add(cellKey(cx, cy));
    const open = (i, j) => { for (let dx = 1; dx <= 2; dx++) for (let dy = 1; dy <= 2; dy++) walls.delete(cellKey(3 * i + dx, 2 + 3 * j + dy)); };
    const stack = [[0, H - 1]]; seen.add('0,' + (H - 1)); open(0, H - 1);
    while (stack.length) {
        const [i, j] = stack[stack.length - 1];
        const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [i + di, j + dj, di, dj])
            .filter(([a, c]) => a >= 0 && a < W && c >= 0 && c < H && !seen.has(a + ',' + c));
        if (!next.length) { stack.pop(); continue; }
        const [a, c, di, dj] = next[Math.floor(Math.random() * next.length)];
        seen.add(a + ',' + c); open(a, c);
        for (let k = 1; k <= 2; k++) {   // knock down the wall between the two rooms
            if (di) walls.delete(cellKey(3 * Math.max(i, a), 2 + 3 * j + k));
            else    walls.delete(cellKey(3 * i + k, 2 + 3 * Math.max(j, c)));
        }
        stack.push([a, c]);
    }
    for (const k of walls) { const [cx, cy] = k.split(',').map(Number); put(cx, cy); }
    return b;
}

function tryHeroAction(nearIt) {
    const P = place();
    if (state.room === ROOM.GREECE) {
        if (nearIt(FLEECE, 44) && !state.fleece) {
            if (P.enemies.some(e => e.alive && e.type === 'hydra')) { showToast('🐲 The Hydra guards the Golden Fleece! Beat it first!', '#FFAA88', 180); return true; }
            state.fleece = true; state.armor = (state.armor || 0) + 1; state.playerHp = fullHearts(); giveAward('fleece'); sfx('win'); spawnConfettiAt(FLEECE.x, FLEECE.y);
            showToast('🐑✨ THE GOLDEN FLEECE! You get an extra heart forever!', '#FFD700', 260);
            return true;
        }
        if (nearIt(PEGASUS, 50) && !state.mounts.pegasus) {
            if (!state.fleece) { showToast('🪽 Pegasus only lets heroes with the Golden Fleece ride!', '#FFFFFF', 200); return true; }
            state.mounts.pegasus = true; state.mount = 'pegasus'; state.lastMount = 'pegasus'; giveAward('pegasus'); sfx('win');
            showToast('🪽 PEGASUS likes you! Fly, hero, FLY!', '#FFFFFF', 220);
            return true;
        }
        if (nearIt(CHARON, 44)) {
            changeRoom(ROOM.UNDERWORLD); showToast('💀 Charon rows you across the dark river to the UNDERWORLD…', '#CCAAFF', 220); sfx('groan');
            return true;
        }
    }
    if (state.room === ROOM.MAZE && !P.won && nearIt(MAZE_GOAL, 36) && P.raceTimer > 0) {
        P.won = true; const secs = Math.ceil(P.raceTimer / 60), prize = 20 + secs; state.coins += prize; giveAward('mazeRace'); sfx('win'); spawnConfettiAt(MAZE_GOAL.x, MAZE_GOAL.y);
        showToast(`🌀 MAZE RACE DONE with ${secs}s left! +🪙${prize}`, '#FFD700', 240); P.raceTimer = 0;
        return true;
    }
    if (state.room === ROOM.MAZE && !P.won && nearIt(MAZE_GOAL, 36)) {
        P.won = true; state.coins += 100; addScore(200); giveAward('maze'); sfx('win'); spawnConfettiAt(MAZE_GOAL.x, MAZE_GOAL.y);
        showToast('🐂 You found the maze treasure! +🪙100 — the door home is open!', '#FFD700', 240);
        return true;
    }
    if (state.room === ROOM.MAZE && ((P.won && nearIt(MAZE_GOAL, 36)) || nearIt(MAZE_START, 22))) { changeRoom(ROOM.GREECE); player.x = MAZE_DOOR.x; player.y = MAZE_DOOR.y + 50; return true; }
    if (state.room === ROOM.VIKING && !P.chestOpen && nearIt(VIKING_CHEST, 40)) {
        P.chestOpen = true; const loot = 60 + Math.floor(Math.random() * 60); state.coins += loot; state.inv.iron = invCount('iron') + 3;
        giveAward('viking'); sfx('found'); spawnParticles(VIKING_CHEST.x, VIKING_CHEST.y, '#FFD700', 30);
        showToast(`🛶 VIKING TREASURE! +🪙${loot} and 3 iron!`, '#FFD700', 220);
        return true;
    }
    if (state.room === ROOM.PYRAMID && nearIt(SPHINX, 50)) {
        if (P.riddled) { showToast('🦁 Sphinx: "One riddle a visit, little one!"', '#FFE8A0', 160); return true; }
        const [q, right, wrong] = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
        const answers = [right, ...wrong].sort(() => Math.random() - 0.5);
        P.riddled = true;
        openMenu(`🦁 ${q}`, () => answers.map(a => ({ icon: '❓', name: a, desc: 'Is it this?', cost: 0, status: null,
            action: () => {
                menu = null;
                if (a === right) { state.coins += 50; addScore(100); giveAward('riddle'); sfx('win'); showToast(`🦁 "CORRECT! It's ${right.toLowerCase()}!" +🪙50`, '#FFD700', 220); }
                else { sfx('hurt'); showToast(`🦁 "WRONG! It was ${right.toLowerCase()}!" Come back and try again!`, '#FFAA88', 220); }
            } })));
        return true;
    }
    return false;
}

function trialItems() {
    const done = HERO_TRIALS.filter(tr => state.trials[tr.type]).length;
    const items = HERO_TRIALS.map(tr => ({ icon: state.trials[tr.type] ? '✅' : '⚔', name: tr.text, desc: state.trials[tr.type] ? 'Done! Great job!' : 'Not yet…', cost: 0,
                                          status: state.trials[tr.type] ? 'DONE' : null, action: () => {} }));
    items.push({ icon: '🌟', name: state.fullGod ? 'You are a GOD!' : 'Become a GOD', desc: state.fullGod ? 'Zeus is proud of you!' : `Finish all 4 trials (${done}/4)`, cost: 0,
        status: state.fullGod ? 'GOD' : done === 4 ? 'NOW!' : null,
        action: () => {
            if (state.fullGod || done < 4) return;
            state.fullGod = true; state.armor = (state.armor || 0) + 2; state.playerHp = fullHearts(); menu = null;
            giveAward('fullGod'); sfx('win'); spawnConfettiAt(player.x, player.y); triggerShake(20);
            showToast('🌟⚡ ZEUS: "You passed every trial. You are now a GOD!" (+2 hearts forever) ⚡🌟', '#FFD700', 320);
        } });
    items.push({ icon: '🙏', name: 'Ask for a blessing', desc: 'Zeus gives you a little gift', cost: 0, status: null,
        action: () => { menu = null; const P = place(); if (P.blessed.zeus) { showToast('⚡ ZEUS: "Come back another time!"', '#FFE8A0', 150); return; } P.blessed.zeus = true; state.coins += 15; godSpeedTimer = 600; showToast('⚡ Zeus blesses you: +🪙15 and super speed!', '#FFE8A0', 180); } });
    return items;
}

function paintGreece(g, R) {
    g.fillStyle = '#C8D890'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 700; i++) { g.fillStyle = `hsla(${70 + R() * 30}, 40%, ${55 + R() * 15}%, 0.5)`; g.fillRect(R() * 800, R() * 600, 3, 3); }
    const sea = g.createLinearGradient(0, 520, 0, 600); sea.addColorStop(0, '#4AA0E0'); sea.addColorStop(1, '#2A70B0');
    g.fillStyle = sea; g.fillRect(380, 555, 420, 45);
    for (const [x, y] of [[90, 120], [740, 300], [150, 330]]) {   // olive trees
        g.fillStyle = '#7A5A3A'; g.fillRect(x - 4, y, 8, 26); g.fillStyle = '#6A8A4A'; g.beginPath(); g.arc(x, y - 4, 22, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#8A6A3A'; g.fillRect(FLEECE.x - 5, FLEECE.y, 10, 60);                      // the fleece tree
    g.fillStyle = '#4A7A3A'; g.beginPath(); g.arc(FLEECE.x, FLEECE.y - 6, 36, 0, Math.PI * 2); g.fill();
}
function paintMaze(g, R) {
    g.fillStyle = '#B8A888'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${120 + R() * 40},${100 + R() * 30},70,0.4)`; g.fillRect(R() * 800, R() * 600, 4, 3); }
}
function paintGorgon(g, R) {
    g.fillStyle = '#4A5A4A'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${60 + R() * 30},${80 + R() * 30},60,0.5)`; g.fillRect(R() * 800, R() * 600, 6, 4); }
    for (const [x, y] of [[100, 150], [700, 150], [120, 420], [680, 420], [250, 480], [560, 480]]) {   // people Medusa turned to stone!
        g.fillStyle = '#9A9A9A'; g.beginPath(); g.arc(x, y - 18, 8, 0, Math.PI * 2); g.fill(); g.fillRect(x - 8, y - 10, 16, 24); g.fillRect(x - 12, y + 14, 24, 6);
    }
}
function paintUnderworld(g, R) {
    g.fillStyle = '#1A1020'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${40 + R() * 40},${20 + R() * 20},${50 + R() * 40},0.6)`; g.fillRect(R() * 800, R() * 600, 5, 4); }
    g.fillStyle = 'rgba(80,200,120,0.25)'; g.fillRect(0, 545, 800, 55);   // the glowing river
}
function paintViking(g, R) {
    g.fillStyle = '#DDE8EE'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${200 + R() * 55},${210 + R() * 45},255,0.6)`; g.fillRect(R() * 800, R() * 600, 3, 3); }
    for (const [x, y] of [[90, 140], [720, 160], [140, 330], [740, 380]]) {   // pine trees
        g.fillStyle = '#5A3A2A'; g.fillRect(x - 3, y + 10, 6, 14); g.fillStyle = '#2E5A3A'; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x - 18, y + 12); g.lineTo(x + 18, y + 12); g.fill();
    }
    g.fillStyle = '#7A4A2A'; g.fillRect(330, 60, 140, 60); g.fillStyle = '#4A2A1A'; g.beginPath(); g.moveTo(320, 62); g.lineTo(400, 30); g.lineTo(480, 62); g.fill();   // mead hall
}

function drawHeroPlaces(t, label, verb) {
    const P = place();
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    const door = (o, text) => { ctx.fillStyle = '#3A2A1A'; ctx.fillRect(o.x - 18, o.y - 26, 36, 46); ctx.fillStyle = '#1A1008'; ctx.fillRect(o.x - 12, o.y - 18, 24, 38); label(text, o.x, o.y + 32, '#222'); };
    const near = (o, r) => Math.hypot(player.x - o.x, player.y - o.y) < r && !menu;
    if (state.room === ROOM.GREECE) {
        if (!state.fleece) { ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18; emoji('🐑', FLEECE.x, FLEECE.y + 10 + Math.sin(t * 2) * 2, 26); ctx.restore(); label('✨ Golden Fleece', FLEECE.x, FLEECE.y + 42, '#8A6A00'); }
        if (!state.mounts.pegasus) { emoji('🐎', PEGASUS.x, PEGASUS.y + Math.sin(t * 2) * 3, 40); emoji('🪽', PEGASUS.x + 6, PEGASUS.y - 18 + Math.sin(t * 6) * 3, 22); label('Pegasus', PEGASUS.x, PEGASUS.y + 32, '#444'); }
        door(MAZE_DOOR, '🐂 The Maze');
        ctx.fillStyle = '#EEE8DA'; ctx.fillRect(GORGON_DOOR.x - 30, GORGON_DOOR.y - 40, 60, 10); for (const dx of [-24, 18]) ctx.fillRect(GORGON_DOOR.x + dx, GORGON_DOOR.y - 30, 6, 46);
        door(GORGON_DOOR, '🐍 Medusa\'s Temple');
        emoji('🛶', CHARON.x, CHARON.y + Math.sin(t * 2) * 2, 34); emoji('💀', CHARON.x + 4, CHARON.y - 18, 18); label('Charon\'s boat to the Underworld', CHARON.x, CHARON.y + 26, '#223');
        if (near(FLEECE, 44) && !state.fleece) drawSpeech({ x: FLEECE.x, y: FLEECE.y }, `${verb}: Take the Fleece!`);
        if (near(PEGASUS, 50) && !state.mounts.pegasus) drawSpeech({ x: PEGASUS.x, y: PEGASUS.y - 20 }, `${verb}: Ride Pegasus!`);
        if (near(CHARON, 44)) drawSpeech({ x: CHARON.x, y: CHARON.y - 20 }, `${verb}: Cross the river`);
    }
    if (state.room === ROOM.MAZE) {
        ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16; emoji(P.won ? '🚪' : '💰', MAZE_GOAL.x, MAZE_GOAL.y, 28); ctx.restore();
        if (near(MAZE_GOAL, 36)) drawSpeech({ x: MAZE_GOAL.x, y: MAZE_GOAL.y - 10 }, P.won ? `${verb}: Go home` : `${verb}: Grab the treasure!`);
        emoji('🚪', MAZE_START.x, MAZE_START.y + 10, 18);
        if (near(MAZE_START, 22)) drawSpeech({ x: MAZE_START.x + 30, y: MAZE_START.y - 10 }, `${verb}: Leave the maze`);
    }
    if (state.room === ROOM.GORGON || state.room === ROOM.UNDERWORLD) {
        ctx.fillStyle = '#3A2A1A'; ctx.fillRect(SCHOOL_EXIT.x - 24, 560, 48, 40); label(state.room === ROOM.GORGON ? '🚪 Back outside' : '🛶 Row back', SCHOOL_EXIT.x, 556, '#FFF');
    }
    if (state.room === ROOM.VIKING && !P.chestOpen) {
        emoji('🧰', VIKING_CHEST.x, VIKING_CHEST.y, 30); label('Viking treasure!', VIKING_CHEST.x, VIKING_CHEST.y + 26, '#223');
        if (near(VIKING_CHEST, 40)) drawSpeech({ x: VIKING_CHEST.x, y: VIKING_CHEST.y - 14 }, `${verb}: Open it!`);
    }
    if (state.room === ROOM.PYRAMID) {
        emoji('🦁', SPHINX.x, SPHINX.y, 40); label('The Sphinx', SPHINX.x, SPHINX.y + 30, '#FFE8A0');
        if (near(SPHINX, 50)) drawSpeech({ x: SPHINX.x, y: SPHINX.y - 20 }, P.riddled ? 'One riddle a visit!' : `${verb}: Answer a riddle!`);
    }
}
function drawHeroAura() {
    if (state.stoned > 0) { ctx.save(); ctx.fillStyle = 'rgba(150,150,150,0.7)'; ctx.beginPath(); ctx.arc(player.x, player.y, 20, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (state.fullGod && state.gamePhase === 'playing') {   // 🌟 gods glow
        ctx.save(); ctx.strokeStyle = `rgba(255,215,0,${0.4 + Math.sin(Date.now() / 200) * 0.2})`; ctx.lineWidth = 3; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(player.x, player.y, 26, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
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

// ── SPECIAL STUFF: storms, seasons, party, fireworks, time machine, TV, the secret ending ──
let stormFlash = 0;
function updateStorm() {
    if (state.room !== ROOM.PARADISE || paradise.weather !== 'storm' || paradise.phase !== 'day') return;
    if (stormFlash > 0) stormFlash--;
    if (Math.random() < 0.006) {   // ⚡ KRAKA-BOOM — lightning sometimes zaps a monster for you
        stormFlash = 12; triggerShake(6); tone(60, 0.6, 'sawtooth', 0.2, 30);
        const foes = targetableEnemies();
        if (foes.length) { const e = foes[Math.floor(Math.random() * foes.length)]; bolts.push({ x1: e.x, y1: 40, x2: e.x, y2: e.y, life: 14 }); damageEnemy(e, POWER.LIGHTNING); }
    }
}

// 🎃🎄 Seasons: Halloween in October, Christmas in December (or switch them on in Mods)
function season() {
    const m = new Date().getMonth();
    return mod('christmas') || m === 11 ? 'christmas' : mod('halloween') || m === 9 ? 'halloween' : null;
}
let seasonItems = null, seasonRoom = null;
function updateSeason() {
    const sz = season();
    if (!sz || state.room !== ROOM.PARADISE || !playing()) { seasonItems = null; return; }
    if (!seasonItems || seasonRoom !== state.room) {
        seasonRoom = state.room;
        seasonItems = [[150, 360], [650, 250], [300, 520], [560, 520], [700, 420]].map(([x, y]) => ({ x, y, got: false }));
    }
    for (const it of seasonItems) {
        if (it.got || Math.hypot(it.x - player.x, it.y - player.y) > 26) continue;
        it.got = true; state.coins += 5; giveAward('season'); sfx('found'); spawnParticles(it.x, it.y, sz === 'christmas' ? '#FF4444' : '#FF9922', 14);
        spawnFloatText(it.x, it.y - 20, sz === 'christmas' ? '🎁 A present! +🪙5' : '🎃 Trick or treat! 🍬 +🪙5', '#FFE066', 70);
    }
}
function drawSeason() {
    const sz = season();
    if (!sz || state.room !== ROOM.PARADISE || state.gamePhase !== 'playing') return;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    if (sz === 'christmas') {
        emoji('🎄', 470, 300, 54);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; const t = Date.now() / 1000;
        for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc((i * 71.3 + Math.sin(t + i) * 20) % 800, (i * 53.1 + t * 30) % 600, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else for (const [x, y] of [[360, 290], [440, 290]]) emoji('🎃', x, y, 22);   // pumpkins by the fountain
    for (const it of seasonItems || []) if (!it.got) emoji(sz === 'christmas' ? '🎁' : '🎃', it.x, it.y, 24);
}

// 🎂 Birthday party (anywhere!)
let party = null;
function startParty() {
    party = { t: 1800, gifts: [0, 1, 2].map(k => ({ x: player.x - 80 + k * 80, y: player.y + 70, got: false })) };
    state.hats.party = true; state.hat = 'party';
    [523, 523, 587, 523, 698, 659].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.3));   // happy birthday!
    showToast('🎂 IT\'S A PARTY! 🎈 Open the presents! 🎁', '#FF88CC', 220);
}
function updateParty() {
    if (!party) return;
    if (--party.t <= 0) { party = null; return; }
    if (party.t % 25 === 0) spawnParticles(Math.random() * 800, 60 + Math.random() * 200, `hsl(${Math.random() * 360}, 90%, 60%)`, 8);
    for (const g of party.gifts) if (!g.got && Math.hypot(g.x - player.x, g.y - player.y) < 26) {
        g.got = true; const n = 10 + Math.floor(Math.random() * 20); state.coins += n; sfx('found');
        spawnFloatText(g.x, g.y - 20, `🎁 +🪙${n}!`, '#FFE066', 70);
    }
}
function drawParty() {
    if (!party) return;
    const t = Date.now() / 1000;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    for (let k = 0; k < 8; k++) emoji('🎈', 60 + k * 100 + Math.sin(t + k) * 10, 560 - ((t * 40 + k * 70) % 520), 26);
    emoji('🎂', player.x + 40, player.y - 10, 28);
    for (const g of party.gifts) if (!g.got) emoji('🎁', g.x, g.y, 24);
}

// 🎆 Fireworks
let fireworks = 0;
function updateFireworks() {
    if (fireworks <= 0) return;
    fireworks--;
    if (fireworks % 20 === 0) {
        const x = 80 + Math.random() * 640, y = 80 + Math.random() * 200, col = `hsl(${Math.random() * 360}, 100%, 65%)`;
        for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, sp = 2 + Math.random() * 2; particles.push({ x, y, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp, life: 50, maxLife: 50, color: col, r: 3 }); }
        tone(90 + Math.random() * 60, 0.3, 'sawtooth', 0.12, 40);
    }
}
function drawFireworksSky() { if (fireworks > 0) { ctx.fillStyle = 'rgba(0,0,30,0.35)'; ctx.fillRect(0, 0, 800, 600); } }

// ⏰ The Time Machine (in your secret room)
const TIME_MACHINE = { x: 650, y: 400 };
function timeMachineItems() {
    const go = (icon, name, desc, room, msg) => ({ icon, name, desc, cost: 0, status: 'GO!', action: () => { menu = null; giveAward('timeTravel'); sfx('portal'); changeRoom(room); showToast(msg, '#CCAAFF', 240); } });
    return [
        go('🏰', 'Knights & Castles', 'Long, long ago… a Dragon King!',  ROOM.MEDIEVAL,   '⏰ WHOOSH! Back to the days of knights and castles!'),
        go('🦖', 'Dinosaur Times',    'When dinosaurs ruled the Earth',  ROOM.DINO,       '⏰ WHOOSH! 65 million years ago!'),
        go('🏛', 'Ancient Greece',    'Heroes, monsters and gods',       ROOM.GREECE,     '⏰ WHOOSH! Ancient Greece!'),
        go('🚀', 'The Future',        'A base on the Moon!',             ROOM.MOONBASE,   '⏰ WHOOSH! The far, far future!'),
    ];
}

// 📺 Your own TV channel (walk up to your TV at home)
let tvShow = null;
const TV_CHANNELS = ['📰 NEWS', '🎨 CARTOONS', '🎵 MUSIC'];
function nextTvChannel() { tvShow.ch++; tvShow.t = 0; if (tvShow.ch >= TV_CHANNELS.length) tvShow = null; else sfx('pop'); }
function drawTvShow() {
    if (!tvShow) return;
    const t = Date.now() / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#222'; ctx.fillRect(170, 130, 460, 320); ctx.fillStyle = '#4A8AC0'; ctx.fillRect(190, 150, 420, 260);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText(`📺 YOUR TV CHANNEL — ${TV_CHANNELS[tvShow.ch]}`, 400, 122);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 15px Arial';
    if (tvShow.ch === 0) {
        ctx.fillText('📰 TODAY\'S NEWS', 400, 185); ctx.font = '13px Arial';
        [`A brave hero has ${state.coins} coins!`, `${awards.kills || 0} monsters beaten so far!`, `${Object.keys(awards.got).length} awards won!`,
         godParent() ? `They say the hero is the child of ${godParent().name}!` : 'Is the hero secretly a demigod? Nobody knows!',
         state.hogwarts ? 'And they go to Hogwarts!' : 'Weather: sunny with a chance of monsters.'].forEach((line, i) => ctx.fillText(line, 400, 220 + i * 30));
    } else if (tvShow.ch === 1) {
        const x = 220 + ((t * 80) % 360);
        ctx.font = '40px Arial'; ctx.fillText('👾', x, 300 + Math.sin(t * 8) * 10); ctx.fillText('🐶', x - 70, 300 + Math.abs(Math.sin(t * 8)) * -14);
        ctx.font = 'bold 15px Arial'; ctx.fillText('The Adventures of Gloop and Puppy!', 400, 185);
    } else {
        ctx.fillText('🎵 DANCE PARTY! 🎵', 400, 185); ctx.font = '36px Arial';
        for (let k = 0; k < 6; k++) ctx.fillText(['🎵', '🎶', '💃', '🕺', '🎸', '🥁'][k], 230 + k * 68, 300 + Math.sin(t * 6 + k) * 20);
        if (tvShow.t % 20 === 0) tone([523, 659, 784, 659][Math.floor(tvShow.t / 20) % 4], 0.15, 'triangle', 0.1);
    }
    ctx.fillStyle = '#AAA'; ctx.font = '11px Arial'; ctx.fillText(`${mainBtn()}: change channel`, 400, 470);
    ctx.restore();
}

// 🌟 THE SECRET ENDING: a golden door in Heaven that only opens for the very best players
const ENDING_DOOR = { x: 250, y: 160 }, ENDING_AWARDS = 60;
function endingUnlocked() { return Object.keys(awards.got).length >= ENDING_AWARDS && awards.got.bossRush; }
function drawEndingDoor() {
    const { x, y } = ENDING_DOOR, open = endingUnlocked(), t = Date.now() / 1000;
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = open ? 20 + Math.sin(t * 3) * 8 : 6;
    ctx.fillStyle = open ? '#FFD700' : '#C8B060'; ctx.fillRect(x - 18, y - 30, 36, 50); ctx.beginPath(); ctx.arc(x, y - 30, 18, Math.PI, 0); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = open ? '#FFF8D0' : '#8A7030'; ctx.fillRect(x - 12, y - 24, 24, 44);
    ctx.fillStyle = '#665'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(open ? '🌟 THE SECRET ENDING' : '🔒 ???', x, y + 34);
    ctx.restore();
}
let credits = null;
const CREDIT_LINES = ['🌟 YOU FOUND THE SECRET ENDING! 🌟', '', 'THE LIGHT OF PARADISE', '', 'You beat the Devil, the bosses and the Mega Boss.',
    'You found secret rooms and hidden treasure.', 'You made friends with pets, monsters and gods.', '', 'You are a TRUE HERO.', '',
    'Game ideas by: the best game designer ever', 'Starring: YOU!', '', 'Thank you for playing! ❤', '', '+🪙500'];
function startCredits() {
    credits = { y: 640 }; giveAward('secretEnding'); state.coins += 500; addScore(1000);
    for (let k = 0; k < 4; k++) spawnConfettiAt(200 + k * 130, 200);
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, null, i * 0.35));
}
function updateCredits() {
    credits.y -= 0.8;
    if (Math.random() < 0.05) spawnParticles(Math.random() * 800, Math.random() * 600, '#FFE066', 4);
    if (credits.y < -CREDIT_LINES.length * 34 - 40) credits = null;
}
function drawCredits() {
    if (!credits) return;
    ctx.save(); ctx.fillStyle = 'rgba(10,5,30,0.92)'; ctx.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 60; i++) drawStar((i * 137) % 800, (i * 89 + Date.now() / 50) % 600, 2 + (i % 3), '#FFE066');
    ctx.textAlign = 'center';
    CREDIT_LINES.forEach((line, i) => { ctx.fillStyle = i === 0 ? '#FFD700' : '#FFFFFF'; ctx.font = i === 0 || i === 2 ? 'bold 26px Arial' : '18px Arial'; ctx.fillText(line, 400, credits.y + i * 34); });
    ctx.restore();
}
function drawTimeMachineAndHints() {
    if (state.room !== ROOM.SECRETROOM) return;
    const { x, y } = TIME_MACHINE, t = Date.now() / 1000;
    ctx.save(); ctx.fillStyle = '#5A5A7A'; ctx.fillRect(x - 30, y - 40, 60, 70); ctx.fillStyle = `hsl(${(t * 100) % 360}, 80%, 60%)`; ctx.beginPath(); ctx.arc(x, y - 6, 18, 0, Math.PI * 2); ctx.fill();
    ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⏰', x, y - 6);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 10px Arial'; ctx.textBaseline = 'alphabetic'; ctx.fillText('THE TIME MACHINE', x, y + 46);
    ctx.fillStyle = '#CCAAFF'; ctx.fillText(`🌟 Psst… the secret ending is behind a golden door in Heaven. It needs ${ENDING_AWARDS} awards and the Boss Rush crown!`, 400, 560);
    ctx.restore();
    if (Math.hypot(player.x - x, player.y - y) < 44 && !menu) drawSpeech({ x, y: y - 30 }, `${mainBtn()}: Travel in time!`);
}

