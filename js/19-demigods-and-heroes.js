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

// ── BORN LUCKY: a new game might make you a demigod (half god!) or a wizard. Both are very rare ──
const DEMIGOD_CHANCE = 0.01;   // 1 in 100 new games — super lucky!
const BORN_WIZARD_CHANCE = 0.01;   // 1 in 100 new games you're born a wizard and go straight to Hogwarts
// Gods from old myths (Greek, Roman, Norse, Egyptian, Babylonian, Aztec, Maya, Inca, Celtic).
// Each god gives a gift, maybe a passive ('fly' over blocks · 'dark' see in caves · 'fast' run faster)
// and two powers you take turns using with T / View+A / the god button.
const setPower = pw => () => { state.power = pw; state.powerTier = 2; };
const GOD_GIFTS = {
    lightning: ['Super Lightning',  setPower(POWER.LIGHTNING)],
    water:     ['Super Water',      setPower(POWER.WATER)],
    fire:      ['Super Fire',       setPower(POWER.BRIMSTONE)],
    ice:       ['Super Ice',        setPower(POWER.ICE)],
    coins:     ['100 coins',        () => { state.coins += 100; }],
    dash:      ['Dash',             () => { state.hasDash = true; }],
    healing:   ['Healing',          () => { state.lessons.healing = true; }],
    bubble:    ['A Shield Bubble',  () => { state.bubble = true; }],
    strong:    ['Stronger weapons', () => { state.weaponLevel++; }],
};
const GOD_POWERS = {
    storm:    { icon: '⛈', name: 'Lightning Storm',  cd: 600,  use: () => { godStorm = 240; } },
    obey:     { icon: '👑', name: 'Everyone Obeys!',  cd: 720,  use: () => { freezeAll(300, 350); if (state.room === ROOM.PARADISE) { state.coins += 20; spawnFloatText(player.x, player.y - 56, 'The town brings you gifts! +🪙20', '#FFD700', 100); } } },
    wave:     { icon: '🌊', name: 'Tidal Wave',       cd: 480,  use: () => { pushAll(200, 9999); hitAll(1, POWER.WATER); } },
    trident:  { icon: '🔱', name: 'Trident Throw',    cd: 360,  use: () => shootRing(8, '#33CCFF', POWER.WATER) },
    rain:     { icon: '🌧', name: 'Magic Rain',       cd: 480,  use: () => { hitAll(1, POWER.WATER); freezeAll(120); } },
    skeleton: { icon: '💀', name: 'Skeleton Army',    cd: 900,  use: () => summonHelpers(600) },
    treasure: { icon: '💎', name: 'Treasure',         cd: 1200, use: () => { state.coins += 30; spawnParticles(player.x, player.y + 10, '#66FFFF', 24); } },
    fireRing: { icon: '🔥', name: 'Ring of Fire',     cd: 360,  use: () => { fireRing = 40; hitAll(2, POWER.BRIMSTONE, 170); } },
    robots:   { icon: '🤖', name: 'Robot Helpers',    cd: 900,  use: () => summonHelpers(600) },
    blizzard: { icon: '🌨', name: 'Blizzard',         cd: 600,  use: () => { freezeAll(300); hitAll(0, POWER.ICE); } },
    iceArmor: { icon: '🧊', name: 'Ice Armour',       cd: 900,  use: () => { state.bubble = true; } },
    shield:   { icon: '🛡', name: 'God Shield',       cd: 600,  use: () => { state.fieldTimer = 360; } },
    timeStop: { icon: '⏳', name: 'Stop Time',        cd: 900,  use: () => { timeFreeze = 180; } },
    speed:    { icon: '💨', name: 'Speed Burst',      cd: 480,  use: () => { godSpeedTimer = 300; } },
    thief:    { icon: '💰', name: 'Sneaky Thief',     cd: 900,  use: () => { const n = 5 + targetableEnemies().length * 3; state.coins += n; spawnFloatText(player.x, player.y - 56, `+🪙${n}`, '#FFD700', 80); } },
    sun:      { icon: '☀', name: 'Sun Flash',        cd: 600,  use: () => { freezeAll(180); hitAll(1); spawnParticles(player.x, player.y, '#FFEE66', 40); } },
    arrows:   { icon: '🏹', name: 'Golden Arrows',    cd: 300,  use: () => shootRing(12, '#FFD700') },
    arrowRain:{ icon: '🏹', name: 'Arrow Rain',       cd: 300,  use: () => shootRing(16, '#DDEEFF') },
    charm:    { icon: '💘', name: 'Charm',            cd: 600,  use: () => { freezeAll(420, 300); for (const e of targetableEnemies()) if (e.frozen > 0) spawnFloatText(e.x, e.y - 24, '💕', '#FF88CC', 60); } },
    heal:     { icon: '💗', name: 'Heal',             cd: 1800, use: () => { state.playerHp = fullHearts(); } },
    warCry:   { icon: '📣', name: 'War Cry',          cd: 420,  use: () => { hitAll(2, POWER.NONE, 250); pushAll(120, 250); triggerShake(14); } },
    bubble:   { icon: '🫧', name: 'Bubble Shield',    cd: 900,  use: () => { state.bubble = true; } },
    wolves:   { icon: '🐺', name: 'Wolf Pack',        cd: 900,  use: () => summonHelpers(600) },
    ravens:   { icon: '🐦‍⬛', name: 'Raven Friends',  cd: 900,  use: () => summonHelpers(600) },
    vines:    { icon: '🌿', name: 'Vine Trap',        cd: 480,  use: () => { freezeAll(360, 280); spawnParticles(player.x, player.y, '#44CC44', 30); } },
    frogs:    { icon: '🐸', name: 'Trick: Frogs!',    cd: 600,  use: () => { targetableEnemies().filter(e => !e.frog).slice(0, 3).forEach(frogify); } },
    wind:     { icon: '🌪', name: 'Whirlwind',        cd: 480,  use: () => { pushAll(250, 300); hitAll(1, POWER.NONE, 300); } },
    party:    { icon: '🎉', name: 'Party Time',       cd: 600,  use: () => { freezeAll(240); dance(); } },
    moon:     { icon: '🌙', name: 'Moon Sleep',       cd: 600,  use: () => { freezeAll(360); for (const e of targetableEnemies()) spawnFloatText(e.x, e.y - 24, 'zzz', '#CCCCFF', 60); } },
};
const GOD_LIST = [
    // id, icon, mum/dad, NAME, what they're the god of, gift, passive, power 1, power 2
    // ── Greek ──
    ['zeus',       '⚡', 'dad', 'ZEUS',        'god of the sky',            'lightning', 'fly',  'storm',    'obey'],
    ['poseidon',   '🌊', 'dad', 'POSEIDON',    'god of the sea',            'water',     null,   'wave',     'trident'],
    ['hades',      '💀', 'dad', 'HADES',       'king of the underworld',    'coins',     'dark', 'skeleton', 'treasure'],
    ['hephaestus', '🔨', 'dad', 'HEPHAESTUS',  'god of fire',               'fire',      null,   'fireRing', 'robots'],
    ['khione',     '❄',  'mum', 'KHIONE',      'goddess of snow',           'ice',       null,   'blizzard', 'iceArmor'],
    ['athena',     '🦉', 'mum', 'ATHENA',      'goddess of wisdom',         'coins',     null,   'shield',   'timeStop'],
    ['hermes',     '👟', 'dad', 'HERMES',      'the speedy messenger',      'dash',      'fast', 'speed',    'thief'],
    ['apollo',     '☀',  'dad', 'APOLLO',      'god of the sun',            'healing',   null,   'sun',      'arrows'],
    ['aphrodite',  '💖', 'mum', 'APHRODITE',   'goddess of love',           'bubble',    null,   'charm',    'heal'],
    ['ares',       '⚔',  'dad', 'ARES',        'god of war',                'strong',    null,   'warCry',   'bubble'],
    ['artemis',    '🏹', 'mum', 'ARTEMIS',     'goddess of the hunt',       'dash',      'fast', 'arrowRain','wolves'],
    ['demeter',    '🌾', 'mum', 'DEMETER',     'goddess of plants',         'healing',   null,   'vines',    'heal'],
    ['hera',       '👑', 'mum', 'HERA',        'queen of the gods',         'bubble',    null,   'obey',     'shield'],
    ['dionysus',   '🍇', 'dad', 'DIONYSUS',    'god of parties',            'coins',     null,   'party',    'charm'],
    ['nyx',        '🌌', 'mum', 'NYX',         'goddess of the night',      'bubble',    'dark', 'moon',     'timeStop'],
    ['helios',     '🌞', 'dad', 'HELIOS',      'the sun in the sky',        'fire',      'fly',  'sun',      'fireRing'],
    ['selene',     '🌙', 'mum', 'SELENE',      'goddess of the moon',       'ice',       'dark', 'moon',     'arrows'],
    ['nike',       '🏆', 'mum', 'NIKE',        'goddess of winning',        'strong',    'fast', 'warCry',   'speed'],
    ['hecate',     '🔮', 'mum', 'HECATE',      'goddess of magic',          'coins',     'dark', 'frogs',    'timeStop'],
    ['persephone', '🌸', 'mum', 'PERSEPHONE',  'queen of spring',           'healing',   null,   'vines',    'skeleton'],
    ['pan',        '🐐', 'dad', 'PAN',         'god of the wild',           'dash',      'fast', 'wolves',   'party'],
    ['eros',       '💘', 'dad', 'EROS',        'god of love arrows',        'bubble',    'fly',  'charm',    'arrows'],
    // ── Roman ──
    ['jupiter',    '⚡', 'dad', 'JUPITER',     'Roman king of the gods',    'lightning', 'fly',  'storm',    'obey'],
    ['neptune',    '🔱', 'dad', 'NEPTUNE',     'Roman god of the sea',      'water',     null,   'trident',  'wave'],
    ['mars',       '🛡', 'dad', 'MARS',        'Roman god of war',          'strong',    null,   'warCry',   'shield'],
    ['venus',      '🌹', 'mum', 'VENUS',       'Roman goddess of love',     'bubble',    null,   'charm',    'heal'],
    ['minerva',    '📚', 'mum', 'MINERVA',     'Roman goddess of wisdom',   'coins',     null,   'timeStop', 'shield'],
    ['mercury',    '🪽', 'dad', 'MERCURY',     'Roman messenger god',       'dash',      'fast', 'speed',    'thief'],
    ['vulcan',     '🌋', 'dad', 'VULCAN',      'Roman god of volcanoes',    'fire',      null,   'fireRing', 'robots'],
    ['diana',      '🦌', 'mum', 'DIANA',       'Roman goddess of the hunt', 'dash',      'fast', 'arrowRain','wolves'],
    ['pluto',      '🪦', 'dad', 'PLUTO',       'Roman god of the underworld','coins',    'dark', 'skeleton', 'treasure'],
    // ── Norse (Vikings) ──
    ['odin',       '👁', 'dad', 'ODIN',        'Viking king of the gods',   'strong',    null,   'ravens',   'timeStop'],
    ['thor',       '🔨', 'dad', 'THOR',        'Viking god of thunder',     'lightning', null,   'storm',    'warCry'],
    ['loki',       '🐍', 'dad', 'LOKI',        'the Viking trickster',      'coins',     'fast', 'frogs',    'thief'],
    ['freya',      '🐈', 'mum', 'FREYA',       'Viking goddess of love',    'bubble',    'fly',  'charm',    'heal'],
    ['frigg',      '🧶', 'mum', 'FRIGG',       'Viking queen of the gods',  'healing',   null,   'shield',   'obey'],
    ['tyr',        '🗡', 'dad', 'TYR',         'Viking god of bravery',     'strong',    null,   'warCry',   'bubble'],
    ['heimdall',   '📯', 'dad', 'HEIMDALL',    'guard of the rainbow bridge','bubble',   'dark', 'shield',   'arrows'],
    ['skadi',      '⛷', 'mum', 'SKADI',       'Viking goddess of winter',  'ice',       'fast', 'blizzard', 'arrowRain'],
    ['baldur',     '✨', 'dad', 'BALDUR',      'Viking god of light',       'healing',   null,   'sun',      'heal'],
    ['njord',      '⛵', 'dad', 'NJORD',       'Viking god of the sea',     'water',     null,   'wave',     'treasure'],
    // ── Egyptian ──
    ['ra',         '🌅', 'dad', 'RA',          'Egyptian god of the sun',   'fire',      'fly',  'sun',      'fireRing'],
    ['horus',      '🦅', 'dad', 'HORUS',       'Egyptian god of the sky',   'lightning', 'fly',  'arrows',   'obey'],
    ['anubis',     '🐺', 'dad', 'ANUBIS',      'Egyptian guard of the dead','coins',     'dark', 'skeleton', 'wolves'],
    ['isis',       '🪶', 'mum', 'ISIS',        'Egyptian goddess of magic', 'healing',   'fly',  'heal',     'frogs'],
    ['osiris',     '🌿', 'dad', 'OSIRIS',      'Egyptian king of the afterlife','healing','dark','vines',    'skeleton'],
    ['thoth',      '📜', 'dad', 'THOTH',       'Egyptian god of writing',   'coins',     null,   'timeStop', 'shield'],
    ['sekhmet',    '🦁', 'mum', 'SEKHMET',     'Egyptian lion goddess',     'fire',      null,   'warCry',   'fireRing'],
    ['bastet',     '🐱', 'mum', 'BASTET',      'Egyptian cat goddess',      'dash',      'fast', 'charm',    'speed'],
    ['set',        '🏜', 'dad', 'SET',         'Egyptian god of storms',    'lightning', null,   'wind',     'storm'],
    ['sobek',      '🐊', 'dad', 'SOBEK',       'Egyptian crocodile god',    'water',     null,   'wave',     'warCry'],
    // ── Babylon (old Iraq) ──
    ['ishtar',     '⭐', 'mum', 'ISHTAR',      'Babylonian goddess of love and war','strong',null,'charm', 'warCry'],
    ['enki',       '💧', 'dad', 'ENKI',        'Babylonian god of water',   'water',     null,   'rain',     'treasure'],
    ['marduk',     '🐉', 'dad', 'MARDUK',      'Babylonian dragon fighter', 'lightning', null,   'storm',    'wind'],
    ['shamash',    '🌞', 'dad', 'SHAMASH',     'Babylonian god of the sun', 'fire',      null,   'sun',      'obey'],
    // ── Aztec, Maya & Inca ──
    ['quetzalcoatl','🐲','dad', 'QUETZALCOATL','the Aztec feathered snake', 'coins',     'fly',  'wind',     'treasure'],
    ['tlaloc',     '🌧', 'dad', 'TLALOC',      'Aztec god of rain',         'water',     null,   'rain',     'storm'],
    ['huitzilopochtli','🐦','dad','HUITZILOPOCHTLI','Aztec sun warrior',    'fire',      null,   'sun',      'warCry'],
    ['chaac',      '⛈', 'dad', 'CHAAC',       'Maya god of rain',          'lightning', null,   'rain',     'storm'],
    ['kukulkan',   '🪶', 'dad', 'KUKULKAN',    'Maya feathered snake',      'dash',      'fly',  'wind',     'speed'],
    ['inti',       '☀',  'dad', 'INTI',        'Inca god of the sun',       'fire',      null,   'sun',      'treasure'],
    ['mamaquilla', '🌕', 'mum', 'MAMA QUILLA', 'Inca goddess of the moon',  'ice',       'dark', 'moon',     'heal'],
    // ── Celtic ──
    ['lugh',       '🎯', 'dad', 'LUGH',        'Celtic god of every skill', 'strong',    null,   'arrows',   'warCry'],
    ['brigid',     '🔥', 'mum', 'BRIGID',      'Celtic goddess of fire',    'fire',      null,   'fireRing', 'heal'],
    ['morrigan',   '🐦‍⬛', 'mum', 'THE MORRIGAN', 'Celtic queen of ravens','strong',    'fly',  'ravens',   'warCry'],
    ['manannan',   '🌫', 'dad', 'MANANNAN',    'Celtic god of the sea',     'water',     null,   'wave',     'timeStop'],
];
const PASSIVE_TEXT = { fly: 'you can FLY', fast: 'super speed', dark: 'see in the dark' };
const GOD_PARENTS = GOD_LIST.map(([id, icon, parent, name, title, gift, passive, p1, p2]) => ({
    id, icon, passive, name,
    who:    `Your ${parent} is ${name}, ${title}!`,
    gift:   GOD_GIFTS[gift][0] + (passive ? ` + ${PASSIVE_TEXT[passive]}` : ''),
    give:   GOD_GIFTS[gift][1],
    powers: [GOD_POWERS[p1], GOD_POWERS[p2]],
}));
function godParent() { return GOD_PARENTS.find(g => g.id === state.demigod); }
function godPassive(kind) { const g = godParent(); return !!(g && g.passive === kind); }
// The god button takes turns between your two powers
function nextGodPower() { const g = godParent(); return g ? g.powers[(state.godTurn || 0) % g.powers.length] : null; }
function useGodPower() {
    const pw = nextGodPower();
    if (!pw || !playing() || state.godCooldown > 0) return;
    pw.use();
    checkMagicCombo('god');
    state.godCooldown = pw.cd;
    state.godTurn = (state.godTurn || 0) + 1;
    spawnFloatText(player.x, player.y - 40, `${pw.icon} ${pw.name.toUpperCase()}!`, '#FFE680', 90);
    sfx('magic');
}
function rollBirthLuck() {
    state.demigod = null;
    if (Math.random() < DEMIGOD_CHANCE) {
        const g = GOD_PARENTS[Math.floor(Math.random() * GOD_PARENTS.length)];
        state.demigod = g.id; g.give(); giveAward('demigod'); sfx('found');
        showToast(`${g.icon} You are a DEMIGOD! ${g.who}`, '#FFD700', 420);
        spawnFloatText(400, 200, `🎁 Gift: ${g.gift}`, '#FFE680', 360);
        spawnFloatText(400, 222, `${g.powers.map(p => p.icon + ' ' + p.name).join('  ·  ')}  (${byInput('press T', 'tap the button', 'hold ⧉ + A')})`, '#FFE680', 360);
    }
    if (!state.hogwarts && Math.random() < BORN_WIZARD_CHANCE) {
        state.hogwarts = true; giveAward('hogwarts'); sfx('found');
        spawnFloatText(400, 250, '🧙 You were born a WIZARD!', '#CCAAFF', 360);
        spawnFloatText(400, 275, 'Ask the Teacher about Hogwarts', '#CCAAFF', 360);
    }
}

