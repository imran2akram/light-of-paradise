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

// ── UPDATE: PARADISE TOWN ─────────────────────────────────────
function houseDoors() {
    return BUILDINGS.filter(b => b.cost).map(b => ({ id: b.id, door: true, name: b.name, x: b.x, y: b.y + 40, cost: b.cost }));
}

function townNpcs() {
    return [...WORKERS, ...paradise.villagers, ...houseDoors(), CRAFTING_TABLE];
}

function personName(id) {
    const p = [...WORKERS, ...VILLAGERS].find(n => n.id === id);
    return p ? p.name : id;
}

// The townsperson you're standing next to (only in the daytime — at night they hide indoors)
function nearbyNpc() {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day') return null;
    let best = null, bestD = TALK_RANGE;
    for (const n of townNpcs()) {
        const d = Math.hypot(player.x - n.x, player.y - n.y);
        if (d < bestD) { best = n; bestD = d; }
    }
    return best;
}

function jobDone(job = state.job) {
    return job && job.count !== undefined && job.got >= job.count;
}

// What the job line at the bottom of the screen says
function jobText() {
    const j = state.job;
    if (!j) return '';
    if (j.kind === 'deliver') return `Deliver ${j.item} to ${personName(j.stops[0])}${j.stops.length > 1 ? ` (+${j.stops.length - 1} more)` : ''}`;
    if (jobDone(j))           return `Done! Go back to the ${personName(j.giver)} to get paid`;
    return `${j.text} (${j.got}/${j.count})`;
}

// Each job giver has their own kind of job — the harder ones pay more
function makeJob(giver) {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const people = [...WORKERS.map(w => w.id), ...VILLAGERS.map(v => v.id)].filter(id => id !== giver)
        .sort(() => Math.random() - 0.5);
    if (giver === 'baker')  return { giver, kind: 'deliver', stops: people.slice(0, 3), item: '🎂', text: 'Deliver 3 cakes', pay: 15 };
    if (giver === 'farmer') return { giver, kind: 'water', count: 6, got: 0, item: '💧', text: 'Water 6 thirsty crops', pay: 12 };
    if (giver === 'fisher') return { giver, kind: 'fish',  count: 3, got: 0, item: '🎣', text: 'Catch 3 fish at the pier', pay: 15 };
    if (Math.random() < 0.5) {
        return { giver, kind: 'deliver', stops: [people[0]], item: pick(['💌', '📦', '🌷']), text: `Take this to ${personName(people[0])}`, pay: 6 };
    }
    return { giver, kind: 'apples', count: 5, got: 0, item: '🍎', text: 'Pick 5 apples', pay: 10 };
}

function startJob(job) {
    state.job = job;
    if (job.kind === 'apples') {
        paradise.apples = [];
        for (let i = 0; i < job.count; i++) {
            paradise.apples.push(reachablePoint(60 + Math.random() * 680, 260 + Math.random() * 170));
        }
    }
    if (job.kind === 'water') {
        const crops = [...paradise.crops].sort(() => Math.random() - 0.5);
        crops.forEach((c, i) => { c.thirsty = i < job.count; });
    }
}

// A saved job comes back only if it is whole; startJob() puts the apples and thirsty crops back in the town
const JOB_KINDS = ['deliver', 'water', 'fish', 'apples'];
function restoreJob() {
    const j = state.job;
    const ok = j && typeof j === 'object' && JOB_KINDS.includes(j.kind) && typeof j.giver === 'string' && Number.isFinite(j.pay)
               && (j.kind === 'deliver' ? Array.isArray(j.stops) && j.stops.length > 0 : Number.isFinite(j.count) && Number.isFinite(j.got));
    if (!ok) { state.job = null; return; }
    startJob(j);
}

// What pressing the button will do, shown above the townsperson
function talkLabel(n) {
    const job = state.job, maxHp = fullHearts();
    if (job && job.kind === 'deliver' && job.stops[0] === n.id) return `Deliver ${job.item}`;
    if (n.door)            return state.housesOwned[n.id] ? 'Go inside 🏠' : `Buy ${n.name} (🪙${n.cost})`;
    if (n.table)           return 'Craft things ⚒';
    if (n.id === 'teacher') return 'Pick a School 🏫';
    if (n.id === 'hattie')  return 'Buy a hat 🎩';
    if (n.id === 'captain') return 'Set sail! ⛵';
    if (paradise.birthday && paradise.birthday.id === n.id && !paradise.birthday.wished) return 'Say Happy Birthday! 🎂';
    if (n.id === 'doctor') return state.playerHp < maxHp ? `Heal (🪙${HEAL_COST})` : 'Talk';
    if (n.id === 'smith')  return 'Open the Forge 🔨';
    if (WORKERS.some(w => w.id === n.id && w.giver)) {
        if (!job) return 'Get a job';
        if (job.giver === n.id && jobDone(job)) return 'Get paid!';
        return 'Talk';
    }
    return 'Chat';
}

function pirateSpeak(text) {   // 🏴‍☠️ Pirate Town mod
    return 'Arr! ' + text.replace(/\byou\b/gi, 'ye').replace(/\byour\b/gi, 'yer').replace(/\bmy\b/gi, 'me').replace(/\bhello\b|\bhi\b/gi, 'Ahoy')
                             .replace(/\bis\b/gi, 'be').replace(/\bcoins\b/gi, 'doubloons').replace(/!$/, ', matey!');
}
function say(n, text) {
    if (mod('pirateTalk')) text = pirateSpeak(text);
    paradise.speech = { npc: n, text, timer: 170 };
}

function payJob(n) {
    const job = state.job;
    state.coins += job.pay;
    addScore(job.pay * 2);
    spawnFloatText(player.x, player.y - 30, `+🪙${job.pay}`, '#FFD700', 70);
    say(n, `Thank you! Here's 🪙${job.pay}!`);
    state.job = null;
    sfx('buy');
}

function talkTo(n) {
    const job = state.job, maxHp = fullHearts();
    if (job && job.kind === 'deliver' && job.stops[0] === n.id) {
        job.stops.shift();
        if (job.stops.length === 0) { payJob(n); return; }
        addScore(5);
        say(n, `Yum, thank you! ${job.stops.length} more to go!`);
        sfx('coin');
        return;
    }
    const giver = WORKERS.find(w => w.id === n.id && w.giver);

    if (n.table) { openMenu('⚒ CRAFTING TABLE', craftItems); return; }
    if (n.id === 'teacher') { openMenu('🏫 PICK A SCHOOL!', schoolItems); return; }
    if (n.id === 'hattie')  { openMenu("🎩 HATTIE'S HATS", hatItems); return; }
    if (n.id === 'captain') { openMenu('⚓ WHERE SHALL WE SAIL, MATEY?', sailItems); return; }
    if (paradise.birthday && paradise.birthday.id === n.id && !paradise.birthday.wished) {
        paradise.birthday.wished = true;
        if (state.playerHp < fullHearts()) state.playerHp++;
        addScore(50);
        spawnConfettiAt(n.x, n.y - 20);
        say(n, 'Thank you!! Have some cake! 🎂 (+1 ❤)');
        [523, 523, 587, 523, 698, 659].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, null, i * 0.28));   // Happy Birthday tune
        giveAward('party');
        return;
    }
    if (n.door) {
        const b = BUILDINGS.find(b => b.id === n.id);
        if (state.housesOwned[n.id]) {
            state.houseFrom = n.id;
            changeRoom(ROOM.HOUSE);
        } else if (state.coins < n.cost) {
            say(n, `This ${n.name.toLowerCase()} costs 🪙${n.cost}. Keep saving!`);
        } else {
            state.coins -= n.cost;
            state.housesOwned[n.id] = true;
            giveAward('house');
            if (BUILDINGS.filter(b => b.cost).every(b => state.housesOwned[b.id])) giveAward('allHouses');
            addScore(n.cost * 2);
            spawnConfettiAt(b.x, b.y);
            say(n, `The ${n.name.toLowerCase()} is YOURS! 🏠 Rest here any time.`);
            sfx('win');
        }
    } else if (n.id === 'doctor') {
        if (state.playerHp >= maxHp)       say(n, 'You look healthy to me!');
        else if (state.coins < HEAL_COST)  say(n, `Healing costs 🪙${HEAL_COST}. Come back soon!`);
        else {
            state.coins -= HEAL_COST;
            state.playerHp = maxHp;
            spawnParticles(player.x, player.y, '#FF6688', 12);
            say(n, 'All better! ❤');
            sfx('buy');
        }
    } else if (n.id === 'smith') {
        openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems);
    } else if (giver) {
        if (!job) {
            startJob(makeJob(n.id));
            say(n, `${state.job.kind === 'deliver' ? jobText() : state.job.text}! I'll pay 🪙${state.job.pay}.`);
            sfx('coin');
        } else if (job.giver === n.id && jobDone(job)) {
            payJob(n);
        } else if (job.giver === n.id) {
            say(n, `Keep going: ${jobText()}!`);
        } else {
            say(n, 'Finish your other job first, then come back!');
        }
    } else {
        say(n, VILLAGER_CHAT[Math.floor(Math.random() * VILLAGER_CHAT.length)]);
    }
}

// Returns true if the player talked to someone (so the button doesn't also shoot)
function tryTalk() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    const shop = nearMallShop();
    if (shop) { openMenu(shop.title, shop.items); return true; }
    if (nearWishAngel()) { openMenu(`✨ MAKE A WISH — ${state.heavenWishes} left`, wishItems); return true; }
    const n = nearbyNpc();
    if (!n) return false;
    talkTo(n);
    return true;
}

function nearbyCrop() {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day' || !state.job || state.job.kind !== 'water') return null;
    return paradise.crops.find(c => c.thirsty && Math.hypot(player.x - c.x, player.y - c.y) < 22) || null;
}

function atFishingSpot() {
    return state.room === ROOM.PARADISE && paradise.phase === 'day' && state.job && state.job.kind === 'fish'
        && !jobDone() && Math.hypot(player.x - FISH_SPOT.x, player.y - FISH_SPOT.y) < 26;
}

// Watering crops and fishing
function tryTownAction() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    const crop = nearbyCrop();
    if (crop) {
        crop.thirsty = false;
        state.job.got++;
        spawnParticles(crop.x, crop.y - 6, '#66CCFF', 10);
        spawnFloatText(crop.x, crop.y - 26, `💧 ${state.job.got}/${state.job.count}`, '#88DDFF');
        sfx('splash');
        return true;
    }
    if (atFishingSpot()) {
        const f = paradise.fishing;
        if (f.stage === 'idle') {
            f.stage = 'waiting'; f.timer = 60 + Math.random() * 150;
            spawnParticles(FISH_SPOT.x, FISH_SPOT.y + 16, '#AADDFF', 5);
            sfx('splash');
        } else if (f.stage === 'waiting') {
            f.stage = 'idle';
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, 'Too early! It swam away…', '#FFFFFF', 70);
        } else {
            f.stage = 'idle';
            state.job.got++;
            countStat('fish');
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, `🐟 CAUGHT ONE! ${state.job.got}/${state.job.count}`, '#FFE066', 80);
            spawnParticles(FISH_SPOT.x, FISH_SPOT.y + 10, '#88CCFF', 14);
            sfx('found');
        }
        return true;
    }
    return false;
}

function updateTown() {
    const P = paradise;
    if (P.speech && --P.speech.timer <= 0) P.speech = null;
    if (state.room !== ROOM.PARADISE) return;

    if (P.phase === 'day') {
        // Surprise monsters!
        if (state.lightCrystals < 3 && --P.ambushTimer <= 0) {
            P.ambushTimer = AMBUSH_FRAMES[0] + Math.random() * (AMBUSH_FRAMES[1] - AMBUSH_FRAMES[0]);
            if (P.ambushers.length === 0) spawnAmbush();
        }
        updateWeather();
        // Villagers stroll about the town square
        for (const v of P.villagers) {
            const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
            if (d < 3) {
                if (Math.random() < 0.01) { v.tx = 250 + Math.random() * 310; v.ty = 260 + Math.random() * 170; }
            } else if (!(P.speech && P.speech.npc === v)) {   // stands still while talking to you
                const spd = v.small ? 0.8 : 0.5;
                v.x += dx / d * spd; v.y += dy / d * spd;
                v.walk += 0.2; v.face = dx > 0 ? -1 : 1;
            }
        }
        // Apple picking
        if (state.job && state.job.kind === 'apples') {
            for (let i = P.apples.length - 1; i >= 0; i--) {
                const a = P.apples[i];
                if (Math.hypot(player.x - a.x, player.y - a.y) > 22) continue;
                P.apples.splice(i, 1);
                state.job.got++;
                spawnFloatText(a.x, a.y - 16, `🍎 ${state.job.got}/${state.job.count}`, '#FF6666');
                sfx('coin');
            }
        }
        // Fishing: wait for a bite, then be quick!
        const f = P.fishing;
        if (f.stage !== 'idle' && !atFishingSpot()) f.stage = 'idle';
        if (f.stage === 'waiting' && --f.timer <= 0) { f.stage = 'bite'; f.timer = 50; sfx('bite'); }
        else if (f.stage === 'bite' && --f.timer <= 0) {
            f.stage = 'idle';
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, 'Too slow! It got away…', '#FFFFFF', 70);
        }
    }

    // Day → dusk → Monster Night (after all 3 crystals, Paradise stays peaceful)
    if (state.lightCrystals >= 3) return;
    if (P.phase === 'day' && --P.timer <= 0) {
        P.phase = 'dusk'; P.timer = DUSK_FRAMES; P.weather = 'sun';
        P.speech = null;
        sfx('nightfall');
    } else if (P.phase === 'dusk' && --P.timer <= 0) {
        P.phase = 'night';
        // Not every night brings monsters — but never two quiet nights in a row
        P.quiet = !P.lastQuiet && Math.random() > NIGHT_MONSTER_CHANCE;
        P.lastQuiet = P.quiet;
        if (P.quiet) { P.timer = QUIET_NIGHT_FRAMES; showToast('🌙 A quiet night… no monsters tonight!', '#AABBFF'); }
        else         { respawnParadiseWave(); sfx('laugh'); }
    } else if (P.phase === 'night' && P.quiet && --P.timer <= 0) {
        P.phase = 'day'; P.timer = dayFrames(); P.quiet = false;
        showToast('☀ Good morning, Paradise Island!', '#FFE066');
        maybeBirthday();
    }
}

// ── DRAW: PARADISE BACKGROUND ──────────────────────────────
function paintParadise(g, R) {
    g.fillStyle = '#3E8C38'; g.fillRect(0, 0, 800, 600);
    // Patchy grass colours
    for (let i = 0; i < 1400; i++) {
        g.fillStyle = `hsla(${95 + R() * 30}, ${40 + R() * 25}%, ${26 + R() * 16}%, 0.55)`;
        g.beginPath(); g.ellipse(R() * 800, R() * 600, 4 + R() * 12, 3 + R() * 7, R() * 3, 0, Math.PI * 2); g.fill();
    }
    // Grass blades
    g.lineWidth = 1;
    for (let i = 0; i < 3000; i++) {
        const x = R() * 800, y = R() * 600, h = 3 + R() * 5;
        g.strokeStyle = R() < 0.5 ? 'rgba(20,70,20,0.6)' : 'rgba(140,200,90,0.5)';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - h); g.stroke();
    }
    // Dirt paths from every door and portal to the town square
    const plaza = { x: 400, y: 330 };
    const ends = [...BUILDINGS.map(b => ({ x: b.x, y: b.y + 30 })), ...PORTALS.paradise, { x: 400, y: 478 }, { x: 255, y: 470 }, { x: 640, y: 548 }];
    for (const [w, col] of [[30, '#9C8456'], [22, '#C9B07A']]) {
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
        for (const e of ends) { g.beginPath(); g.moveTo(plaza.x, plaza.y); g.quadraticCurveTo((plaza.x + e.x) / 2 + 30, (plaza.y + e.y) / 2, e.x, e.y); g.stroke(); }
        g.fillStyle = col; g.beginPath(); g.arc(plaza.x, plaza.y, w * 2.2, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 400; i++) {   // pebbles on the paths
        const e = ends[Math.floor(R() * ends.length)], k = R();
        g.fillStyle = R() < 0.5 ? 'rgba(120,100,70,0.7)' : 'rgba(230,215,180,0.7)';
        g.beginPath(); g.arc(plaza.x + (e.x - plaza.x) * k + (R() - 0.5) * 14, plaza.y + (e.y - plaza.y) * k + (R() - 0.5) * 14, 1 + R() * 1.5, 0, Math.PI * 2); g.fill();
    }
    // Flowers
    const petals = ['#FFFFFF', '#FFE44D', '#FF7FB0', '#B98CFF', '#FF6A4D'];
    for (let i = 0; i < 140; i++) {
        const x = R() * 800, y = 70 + R() * 490, col = petals[Math.floor(R() * petals.length)];
        g.fillStyle = col;
        for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#FFB300'; g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
    }
    // Trees (kept away from buildings, portals and paths)
    // (the trees are drawn every frame now, so you can chop them down — see SCENERY)
    // Farm field with a fence
    g.fillStyle = '#6B4A2A'; g.fillRect(FARM.x, FARM.y, FARM.w, FARM.h);
    g.strokeStyle = '#4E3418'; g.lineWidth = 3;
    for (let fy = FARM.y + 14; fy < FARM.y + FARM.h; fy += 20) { g.beginPath(); g.moveTo(FARM.x + 6, fy); g.lineTo(FARM.x + FARM.w - 6, fy); g.stroke(); }
    g.strokeStyle = '#C8A070'; g.lineWidth = 2;
    g.strokeRect(FARM.x - 4, FARM.y - 4, FARM.w + 8, FARM.h + 8);
    for (let fx = FARM.x - 4; fx <= FARM.x + FARM.w + 4; fx += 20) {
        g.fillStyle = '#B08858'; g.fillRect(fx - 2, FARM.y - 9, 4, 10); g.fillRect(fx - 2, FARM.y + FARM.h - 1, 4, 10);
    }
    // Beach and sea along the bottom — it's an island!
    const sand = g.createLinearGradient(0, 566, 0, 588);
    sand.addColorStop(0, 'rgba(230,210,150,0)'); sand.addColorStop(0.4, '#E6D296'); sand.addColorStop(1, '#D8C080');
    g.fillStyle = sand; g.fillRect(0, 566, 800, 22);
    const sea = g.createLinearGradient(0, 586, 0, 600);
    sea.addColorStop(0, '#4FB3D9'); sea.addColorStop(1, '#1F6FA8');
    g.fillStyle = sea; g.fillRect(0, 586, 800, 14);
    // Wooden fishing pier
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(628, 552, 30, 50);
    for (let py = 548; py < 600; py += 7) {
        g.fillStyle = py % 14 ? '#9A6A3A' : '#8A5A2A'; g.fillRect(624, py, 32, 6);
    }
    g.fillStyle = '#5A3A1A'; g.fillRect(622, 548, 3, 52); g.fillRect(655, 548, 3, 52);
}

// ── DRAW: PARADISE ────────────────────────────────────────────
// Sky tint for Paradise: darkens at dusk, deep blue at Monster Night (drawn before everything else)
function drawParadiseSky() {
    const P = paradise;
    const dark = P.phase === 'night' ? 1 : P.phase === 'dusk' ? 1 - P.timer / DUSK_FRAMES : 0;
    if (dark === 0) {
        ctx.fillStyle = 'rgba(255,240,190,0.06)';   // warm sunshine
        ctx.fillRect(0, 0, 800, 600);
        drawRainbowArc();
        return;
    }
    ctx.fillStyle = `rgba(5,5,40,${0.6 * dark})`;
    ctx.fillRect(0, 0, 800, 600);
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.fillStyle = '#FFFBE0'; ctx.shadowColor = '#FFFBE0'; ctx.shadowBlur = 30;   // moon
    ctx.beginPath(); ctx.arc(660, 95, 20, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(5,5,40,1)';
    ctx.beginPath(); ctx.arc(669, 89, 16, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 25; i++) {   // twinkling stars
        const sx = (i * 137) % 800, sy = 75 + (i * 71) % 90;
        if (Math.sin(Date.now() / 400 + i) > -0.3) drawStar(sx, sy, 2, '#FFFFFF');
    }
    ctx.restore();
}

function drawBuilding(b, night) {
    const w = b.w, h = b.id === 'mansion' ? 62 : 55, x = b.x - w / 2, y = b.y - h / 2;
    drawGroundShadow(b.x + 10, y + h + 2, w * 0.6, 8, 0.3);
    ctx.save();
    ctx.fillStyle = b.wall;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;          // brick lines
    for (let row = 1; row < Math.floor(h / 9); row++) {
        ctx.beginPath(); ctx.moveTo(x, y + row * 9); ctx.lineTo(x + w, y + row * 9); ctx.stroke();
        for (let bx = x + (row % 2) * 9; bx < x + w; bx += 18) { ctx.beginPath(); ctx.moveTo(bx, y + row * 9 - 9); ctx.lineTo(bx, y + row * 9); ctx.stroke(); }
    }
    if (b.id === 'mansion') {                                         // white columns
        ctx.fillStyle = '#E8E8E8';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 10 + k * 28, y + 6, 7, h - 6);
    }
    const shade = ctx.createLinearGradient(x, 0, x + w, 0);           // light from the left
    shade.addColorStop(0, 'rgba(255,255,255,0.12)'); shade.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = shade; ctx.fillRect(x, y, w, h);
    const peak = b.id === 'mansion' ? 38 : 32;
    ctx.fillStyle = b.roof;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(b.x, y - peak); ctx.lineTo(x + w + 8, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';                                // shady side of the roof
    ctx.beginPath(); ctx.moveTo(b.x, y - peak); ctx.lineTo(x + w + 8, y); ctx.lineTo(b.x, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';                              // roof tiles
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 8 + k * 8, y - k * 8); ctx.lineTo(x + w + 8 - k * 8, y - k * 8); ctx.stroke(); }
    if (b.id === 'bakery' || b.id === 'forge') {                       // chimney with smoke
        ctx.fillStyle = '#7A4A3A'; ctx.fillRect(x + w - 24, y - 26, 10, 18);
        for (let k = 0; k < 3; k++) {
            const t = (Date.now() / 1500 + k / 3) % 1;
            ctx.fillStyle = `rgba(220,220,220,${0.5 * (1 - t)})`;
            ctx.beginPath(); ctx.arc(x + w - 19 + Math.sin(t * 6) * 4, y - 30 - t * 30, 4 + t * 6, 0, Math.PI * 2); ctx.fill();
        }
    }
    drawBuildingStyle(b, x, y, w, h, peak, night);
    ctx.fillStyle = b.door || '#6B3E1E';                        // door
    ctx.fillRect(b.x - 9, y + h - 26, 18, 26);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(b.x + 4, y + h - 14, 2, 2);   // door knob
    ctx.fillStyle = night ? '#FFE070' : '#AADDFF';              // windows glow at night
    if (night) { ctx.shadowColor = '#FFE070'; ctx.shadowBlur = 12; }
    ctx.fillRect(x + 10, y + 12, 16, 14);
    ctx.fillRect(x + w - 26, y + 12, 16, 14);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5;              // window frames
    ctx.strokeRect(x + 10, y + 12, 16, 14); ctx.strokeRect(x + w - 26, y + 12, 16, 14);
    ctx.fillStyle = '#222'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    const owned = b.cost && state.housesOwned[b.id];
    ctx.fillText(b.cost ? (owned ? `YOUR ${b.name} ❤` : b.name) : b.name, b.x, y + 9);
    if (b.cost && !owned) {                                     // FOR SALE sign on a post
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(x - 20, y + 22, 3, 34);
        ctx.fillStyle = '#FFF'; ctx.fillRect(x - 42, y + 8, 46, 22);
        ctx.fillStyle = '#C00'; ctx.font = 'bold 8px Arial';
        ctx.fillText('FOR SALE', x - 19, y + 17);
        ctx.fillText(`🪙${b.cost}`, x - 19, y + 27);
    }
    if (owned) {                                                // a little flag on your house
        ctx.fillStyle = '#555'; ctx.fillRect(b.x - 1, y - peak - 16, 2, 16);
        ctx.fillStyle = '#FF3355';
        ctx.beginPath(); ctx.moveTo(b.x + 1, y - peak - 16); ctx.lineTo(b.x + 14, y - peak - 12 + Math.sin(Date.now() / 200) * 2); ctx.lineTo(b.x + 1, y - peak - 8); ctx.fill();
    }
    ctx.restore();
}

// Hair, skin and clothes for each townsperson
const TOWN_LOOKS = {
    doctor: { hair: '#2A1A10', hairStyle: 'short', pants: '#DDD' },
    teacher:{ hair: '#6A3A1A', hairStyle: 'bun', pants: '#333' },
    hattie: { hair: '#FFCC33', hairStyle: 'long', pants: '#884488' },
    captain:{ hair: '#DDD', hairStyle: 'short', pants: '#EEE', beard: '#DDD' },
    baker:  { hair: '#8A5A2A', hairStyle: 'short', pants: '#6A4A2A', skin: '#E8B48A' },
    smith:  { hair: '#1A1A1A', hairStyle: 'bald', pants: '#3A2A1A', beard: '#1A1A1A', skin: '#C88A5A' },
    mayor:  { hair: '#777', hairStyle: 'short', pants: '#1A2A55', beard: '#999' },
    farmer: { hair: '#AA7A3A', hairStyle: 'short', pants: '#3A5A9A', skin: '#E0A878' },
    fisher: { hair: '#3A2A1A', hairStyle: 'short', pants: '#2A3A4A', beard: '#5A4A3A' },
    rose:   { hairStyle: 'bun',   pants: '#6A3A6A' },
    sam:    { hairStyle: 'spiky', pants: '#2A4A8A' },
    lily:   { hairStyle: 'long',  pants: '#AA4488', skin: '#C08060' },
    tom:    { hairStyle: 'bald',  pants: '#4A4A3A', beard: '#EEEEEE' },
};

// Each building has its own look
function drawBuildingStyle(b, x, y, w, h, peak, night) {
    const t = Date.now() / 1000;
    if (b.id === 'cottage') {
        ctx.fillStyle = '#D8B858';                                       // straw roof
        ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.quadraticCurveTo(b.x, y - peak - 12, x + w + 10, y + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,30,0.5)'; ctx.lineWidth = 1;
        for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(x - 6 + k * (w + 12) / 10, y); ctx.lineTo(b.x + (k - 5) * 3, y - peak + 6); ctx.stroke(); }
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF';                   // round window
        ctx.beginPath(); ctx.arc(b.x, y - peak * 0.35, 5, 0, Math.PI * 2); ctx.fill();
        for (const wx of [x + 10, x + w - 26]) {                         // flower boxes
            ctx.fillStyle = '#6B3E1E'; ctx.fillRect(wx - 1, y + 27, 18, 4);
            for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#FF5577', '#FFDD33', '#FF88CC', '#FFFFFF'][k]; ctx.beginPath(); ctx.arc(wx + 2 + k * 4.5, y + 26, 2, 0, Math.PI * 2); ctx.fill(); }
        }
    } else if (b.id === 'bighouse') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;         // two floors
        ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x + w, y + 28); ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(b.x - 22, y + 24, 44, 3);   // balcony
        for (let k = 0; k <= 6; k++) ctx.fillRect(b.x - 22 + k * 7, y + 18, 2, 7);
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF';
        ctx.fillRect(b.x - 7, y + 6, 14, 12);                            // balcony door
    } else if (b.id === 'mansion') {
        ctx.fillStyle = b.roof;                                          // tower with a pointy top
        ctx.fillRect(x + w - 22, y - 22, 18, 30);
        ctx.beginPath(); ctx.moveTo(x + w - 25, y - 22); ctx.lineTo(x + w - 13, y - 48); ctx.lineTo(x + w - 1, y - 22); ctx.fill();
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF'; ctx.fillRect(x + w - 16, y - 16, 6, 8);
        ctx.fillStyle = '#FFD700'; ctx.fillRect(x - 8, y - 2, w + 16, 3);   // gold trim
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;                   // fancy iron fence
        for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.moveTo(x - 4 + k * 10, y + h + 12); ctx.lineTo(x - 4 + k * 10, y + h + 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - 4, y + h + 6); ctx.lineTo(b.x - 14, y + h + 6); ctx.moveTo(b.x + 14, y + h + 6); ctx.lineTo(x + w + 4, y + h + 6); ctx.stroke();
    } else if (b.id === 'clinic') {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, y - 12, 9, 0, Math.PI * 2); ctx.fill();   // red cross sign
        ctx.fillStyle = '#E02020'; ctx.fillRect(b.x - 2, y - 18, 4, 12); ctx.fillRect(b.x - 6, y - 14, 12, 4);
    } else if (b.id === 'bakery') {
        for (let k = 0; k < 8; k++) {                                    // striped awning
            ctx.fillStyle = k % 2 ? '#FFFFFF' : '#E05050';
            ctx.beginPath(); ctx.moveTo(x + k * w / 8, y + 30); ctx.lineTo(x + (k + 1) * w / 8, y + 30);
            ctx.lineTo(x + (k + 1) * w / 8, y + 36); ctx.arc(x + (k + 0.5) * w / 8, y + 36, w / 16, 0, Math.PI); ctx.fill();
        }
        ctx.fillStyle = '#E0A050'; ctx.beginPath(); ctx.ellipse(x + 14, y + 44, 9, 5, 0, 0, Math.PI * 2); ctx.fill();   // bread sign
        ctx.strokeStyle = '#A06020'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + 14 + k * 4, y + 41); ctx.lineTo(x + 12 + k * 4, y + 47); ctx.stroke(); }
    } else if (b.id === 'forge') {
        ctx.fillStyle = 'rgba(90,90,90,0.55)';                           // stone walls
        for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(x + 6 + (k * 23) % (w - 8), y + 8 + Math.floor(k / 4) * 12, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
        const glow = 0.6 + Math.sin(t * 8) * 0.2;                       // fire glowing inside
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 60},20,${glow})`; ctx.fillRect(x + w - 26, y + 12, 16, 14);
        ctx.fillStyle = '#333';                                          // anvil outside
        ctx.fillRect(x + w + 2, y + h - 10, 16, 5); ctx.fillRect(x + w + 6, y + h - 5, 8, 5);
    } else if (b.id === 'hall') {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, y - 12, 8, 0, Math.PI * 2); ctx.fill();   // clock
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(b.x, y - 12, 8, 0, Math.PI * 2); ctx.moveTo(b.x, y - 12); ctx.lineTo(b.x + Math.cos(t) * 5, y - 12 + Math.sin(t) * 5);
        ctx.moveTo(b.x, y - 12); ctx.lineTo(b.x, y - 17); ctx.stroke();
        ctx.fillStyle = '#555'; ctx.fillRect(x + w + 4, y - 30, 2, 40);  // flag pole + flag
        ctx.fillStyle = '#3366AA';
        ctx.beginPath(); ctx.moveTo(x + w + 6, y - 30); ctx.lineTo(x + w + 22, y - 26 + Math.sin(t * 4) * 2); ctx.lineTo(x + w + 6, y - 20); ctx.fill();
    }
}

// Draws a hat so its brim sits at (x, y) — the top of a head
function drawHatOn(x, y, id) {
    ctx.save();
    if (id === 'crown')   { ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(x - 8, y + 2);
                            for (let k = 0; k <= 4; k++) ctx.lineTo(x - 8 + k * 4, k % 2 ? y - 3 : y - 10); ctx.lineTo(x + 8, y + 2); ctx.closePath(); ctx.fill();
                            ctx.fillStyle = '#FF3355'; ctx.beginPath(); ctx.arc(x, y - 1, 1.8, 0, Math.PI * 2); ctx.fill(); }
    if (id === 'cowboy')  { ctx.fillStyle = '#8A5A2A'; ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill(); pathRoundRect(x - 7, y - 9, 14, 10, 3); ctx.fill();
                            ctx.fillStyle = '#5A3A1A'; ctx.fillRect(x - 7, y - 3, 14, 2); }
    if (id === 'wizard')  { ctx.fillStyle = '#3A2A9A'; ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x + 3, y - 22); ctx.lineTo(x + 10, y + 2); ctx.fill();
                            ctx.fillStyle = '#FFE066'; drawStar(x, y - 7, 3, '#FFE066'); }
    if (id === 'tophat')  { ctx.fillStyle = '#111'; ctx.fillRect(x - 10, y - 1, 20, 3); ctx.fillRect(x - 6, y - 14, 12, 14); ctx.fillStyle = '#C03030'; ctx.fillRect(x - 6, y - 4, 12, 2); }
    if (id === 'party')   { ctx.fillStyle = '#FF55AA'; ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.lineTo(x, y - 16); ctx.lineTo(x + 6, y + 1); ctx.fill();
                            ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(x, y - 16, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, y - 6, 8, 2); }
    if (id === 'pirate')  { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x - 13, y + 1); ctx.quadraticCurveTo(x, y - 18, x + 13, y + 1); ctx.fill();
                            ctx.fillStyle = '#FFF'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('☠', x, y - 3); }
    if (id === 'cap')     { ctx.fillStyle = '#2A5ACC'; ctx.beginPath(); ctx.arc(x, y + 1, 7.5, Math.PI, 0); ctx.fill(); ctx.fillRect(x, y - 1, 13, 3); }
    if (id === 'flowers') { for (let k = 0; k < 5; k++) { ctx.fillStyle = ['#FF6699', '#FFFFFF', '#FFDD33', '#CC88FF', '#FF9944'][k]; ctx.beginPath(); ctx.arc(x - 8 + k * 4, y - 1 + (k % 2), 2.5, 0, Math.PI * 2); ctx.fill(); } }
    if (id === 'teacher') { ctx.fillStyle = '#111'; ctx.fillRect(x - 9, y - 4, 18, 3); ctx.fillRect(x - 5, y - 1, 10, 3);                // graduation cap
                            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y - 3); ctx.lineTo(x + 9, y + 6); ctx.stroke(); }
    ctx.restore();
}

// A townsperson or villager, with little walking legs
function drawCraftingTable() {
    const { x, y } = CRAFTING_TABLE;
    drawGroundShadow(x + 3, y + 14, 16, 5);
    ctx.drawImage(blockCanvas('planks'), x - 12, y - 12);
    ctx.fillStyle = '#6A4424'; ctx.fillRect(x - 12, y - 12, 24, 5);
    ctx.fillStyle = '#AAAAAA'; ctx.fillRect(x - 8, y - 4, 7, 2); ctx.fillRect(x - 5, y - 7, 2, 8);   // hammer
    ctx.fillStyle = '#C8A070'; ctx.fillRect(x + 3, y - 6, 2, 10); ctx.fillStyle = '#888'; ctx.fillRect(x + 1, y - 7, 6, 3);   // saw
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Crafting Table', x, y + 24);
}

function drawPerson(n) {
    if (n.door || n.table) return;
    const small = n.small ? 0.8 : 1;
    const walking = n.walk !== undefined && Math.hypot(n.tx - n.x, n.ty - n.y) > 3;
    const bob = walking ? Math.abs(Math.sin(n.walk)) * 2 : Math.sin(Date.now() / 350 + n.x) * 1.2;
    const x = n.x, y = n.y - bob;
    drawGroundShadow(x, n.y + 14, 11 * small, 4);
    ctx.save();
    ctx.translate(x, y); ctx.scale(small, small);
    const look = TOWN_LOOKS[n.id] || {};
    drawHuman(0, 0, 1, { shirt: n.coat, pants: look.pants, hair: n.hair || look.hair, hairStyle: look.hairStyle || (n.hair ? 'short' : 'short'),
                         beard: look.beard, skin: look.skin, walk: walking ? n.walk * 2 : 0 });
    if (n.hat === 'teacher') drawHatOn(0, -23, 'teacher');
    if (n.hat === 'captain') drawHatOn(0, -23, 'pirate');
    if (n.hat === 'hattie')  drawHatOn(0, -23, ['crown', 'cowboy', 'wizard', 'tophat', 'party', 'pirate', 'cap', 'flowers'][Math.floor(Date.now() / 1500) % 8]);   // she keeps trying hats on!
    if (paradise.birthday && paradise.birthday.id === n.id) drawHatOn(0, -23, 'party');
    if (n.hat === 'doctor') {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-7, -25, 14, 5);
        ctx.fillStyle = '#E03030'; ctx.fillRect(-1, -25, 2, 5); ctx.fillRect(-3, -23, 6, 2);
        ctx.fillRect(-1, -2, 2, 8); ctx.fillRect(-4, 1, 8, 2);   // red cross
    } else if (n.hat === 'baker') {
        ctx.fillStyle = '#FFFFFF';                               // tall chef hat
        ctx.fillRect(-6, -30, 12, 9);
        ctx.beginPath(); ctx.arc(-3, -30, 4, 0, Math.PI * 2); ctx.arc(3, -30, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F2D2A0'; ctx.fillRect(-5, 0, 10, 6);   // apron pocket
    } else if (n.hat === 'smith') {
        ctx.fillStyle = '#333'; ctx.fillRect(-8, -23, 16, 4);    // bandana
        ctx.fillStyle = '#888'; ctx.fillRect(10, -4, 8, 5);      // hammer head
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(13, 1, 2, 9);    // hammer handle
    } else if (n.hat === 'mayor') {
        ctx.fillStyle = '#111'; ctx.fillRect(-6, -32, 12, 11); ctx.fillRect(-9, -22, 18, 2);   // top hat
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 4, 2.5, 0, Math.PI * 2); ctx.fill();   // medal
    } else if (n.hat === 'farmer') {
        ctx.fillStyle = '#E8C860';                               // straw hat
        ctx.beginPath(); ctx.ellipse(0, -21, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-6, -27, 12, 6);
        ctx.fillStyle = '#3A5A9A'; ctx.fillRect(-7, 0, 14, 12);  // dungarees
    } else if (n.hat === 'fisher') {
        ctx.fillStyle = '#FFCC33'; ctx.fillRect(-8, -24, 16, 5);  // yellow rain hat
        ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 1.5;          // fishing rod
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(22, -22); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(22, -22); ctx.lineTo(24, 6); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + 28);
}

function drawSpeech(n, text) {
    ctx.save();
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 18;
    const bx = Math.max(8, Math.min(792 - w, n.x - w / 2)), by = n.y - 62;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.fillRect(bx, by, w, 24); ctx.strokeRect(bx, by, w, 24);
    ctx.beginPath(); ctx.moveTo(n.x - 6, by + 24); ctx.lineTo(n.x, by + 32); ctx.lineTo(n.x + 6, by + 24); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillText(text, bx + w / 2, by + 16);
    ctx.restore();
}

// Town square fountain, lamp posts, crops, butterflies
function drawTownDetails(night) {
    const t = Date.now() / 1000;
    // Fountain
    const fx = 400, fy = 345;
    drawGroundShadow(fx + 4, fy + 14, 36, 8, 0.3);
    ctx.fillStyle = '#9A9A9A'; ctx.beginPath(); ctx.ellipse(fx, fy, 34, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3A8FCF'; ctx.beginPath(); ctx.ellipse(fx, fy - 2, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {                                   // ripples
        const r = ((t * 12 + k * 14) % 26);
        ctx.beginPath(); ctx.ellipse(fx, fy - 2, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#B0B0B0'; ctx.fillRect(fx - 3, fy - 22, 6, 20);
    for (let k = 0; k < 10; k++) {                                  // water spray
        const a = (k / 10) * Math.PI * 2, ph = (t * 1.5 + k / 10) % 1;
        ctx.fillStyle = `rgba(180,225,255,${0.8 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * ph * 20, fy - 24 - Math.sin(ph * Math.PI) * 14 + ph * 16, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // Lamp posts — glow at night
    for (const [lx, ly] of [[330, 290], [470, 290], [330, 400], [470, 400]]) {
        ctx.fillStyle = '#333'; ctx.fillRect(lx - 1.5, ly - 30, 3, 30);
        ctx.fillStyle = night ? '#FFE890' : '#DDD';
        ctx.beginPath(); ctx.arc(lx, ly - 32, 4, 0, Math.PI * 2); ctx.fill();
        if (night) {
            const glow = ctx.createRadialGradient(lx, ly - 32, 2, lx, ly - 32, 60);
            glow.addColorStop(0, 'rgba(255,230,140,0.45)'); glow.addColorStop(1, 'rgba(255,230,140,0)');
            ctx.fillStyle = glow; ctx.fillRect(lx - 60, ly - 92, 120, 120);
        }
    }
    // Crops on the farm (thirsty ones droop and go brown)
    for (const c of paradise.crops) {
        const droop = c.thirsty ? 4 : 0;
        ctx.strokeStyle = c.thirsty ? '#8A7030' : '#2F8F2F'; ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(c.x, c.y);
            ctx.quadraticCurveTo(c.x + side * 6, c.y - 10 + droop, c.x + side * 9, c.y - 4 + droop * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 14 + droop); ctx.stroke();
        if (!c.thirsty) { ctx.fillStyle = '#E03A2A'; ctx.beginPath(); ctx.arc(c.x + 3, c.y - 9, 3, 0, Math.PI * 2); ctx.fill(); }
        else if (!night) { ctx.fillStyle = '#88CCFF'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('💧?', c.x, c.y - 20); }
    }
    // Butterflies (daytime)
    if (!night) {
        for (let k = 0; k < 5; k++) {
            const bx = 400 + Math.sin(t * 0.4 + k * 2) * 300, by = 300 + Math.cos(t * 0.55 + k * 3) * 180;
            const flap = Math.abs(Math.sin(t * 12 + k)) * 4 + 1;
            ctx.fillStyle = ['#FFDD55', '#FF88CC', '#88CCFF', '#FFFFFF', '#FFAA44'][k];
            ctx.beginPath(); ctx.ellipse(bx - 3, by, flap, 3, 0, 0, Math.PI * 2); ctx.ellipse(bx + 3, by, flap, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawParadise() {
    const t = Date.now() / 400;
    const P = paradise, night = P.phase !== 'day';

    for (const b of BUILDINGS) drawBuilding(b, night);
    drawTownDetails(night);

    if (!night) {
        // Townspeople, apples, speech and prompts (everyone hides indoors at night)
        const people = [...WORKERS, ...P.villagers].sort((a, b) => a.y - b.y);
        for (const n of people) drawPerson(n);
        drawCraftingTable();
        // School chalkboard next to the Teacher
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(214, 232, 26, 20); ctx.fillStyle = '#2A4A2A'; ctx.fillRect(216, 234, 22, 16);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.fillText('ABC', 227, 244);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.fillText('🏫 SCHOOL', 227, 228);
        // Birthday balloons around the birthday person
        if (P.birthday) {
            const who = [...WORKERS, ...P.villagers].find(n => n.id === P.birthday.id);
            if (who) for (let k = 0; k < 3; k++) {
                const bx = who.x - 20 + k * 20, by = who.y - 48 + Math.sin(Date.now() / 400 + k) * 3;
                ctx.strokeStyle = '#EEE'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(who.x, who.y - 22); ctx.stroke();
                ctx.fillStyle = ['#FF4466', '#44AAFF', '#FFDD33'][k]; ctx.beginPath(); ctx.ellipse(bx, by, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
            }
        }
        for (const a of P.apples) {
            drawGroundShadow(a.x, a.y + 7, 6, 2);
            ctx.fillStyle = '#E02020';
            ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(a.x - 2.5, a.y - 2.5, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#33AA33'; ctx.fillRect(a.x - 1, a.y - 11, 4, 5);
        }
        const verb = mainBtn();
        const n = state.buildMode ? null : nearbyNpc();   // in build mode the button builds instead
        if (n && !(P.speech && P.speech.npc === n)) drawSpeech(n, `${verb}: ${talkLabel(n)}`);
        else if (nearbyCrop()) drawSpeech(nearbyCrop(), `${verb}: Water the crop`);
        else if (atFishingSpot()) {
            const f = P.fishing;
            const spot = { x: FISH_SPOT.x, y: FISH_SPOT.y };
            drawSpeech(spot, f.stage === 'idle' ? `${verb}: Cast your line` : f.stage === 'waiting' ? 'Wait for it…' : `!!! ${verb} NOW !!!`);
        }
        if (P.fishing.stage !== 'idle') {                          // bobber in the water
            const bob = P.fishing.stage === 'bite' ? Math.sin(Date.now() / 40) * 3 : Math.sin(Date.now() / 300) * 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(player.x + 10, player.y - 10); ctx.lineTo(FISH_SPOT.x + 18, 592 + bob); ctx.stroke();
            ctx.fillStyle = '#FF3333'; ctx.beginPath(); ctx.arc(FISH_SPOT.x + 18, 592 + bob, 3, 0, Math.PI * 2); ctx.fill();
        }
        if (P.speech) drawSpeech(P.speech.npc, P.speech.text);
    }

    for (const e of roomEnemies()) {
        if (!e.alive) continue;
        drawEnemy(e, t);
        drawEnemyHp(e);
    }

    for (const c of P.chests) {
        if (!c.visible) continue;
        ctx.save();
        if (!c.opened) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16; }
        ctx.fillStyle = c.opened ? '#5a3010' : '#8B4513';
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
        ctx.fillStyle = c.opened ? '#3a200a' : '#6B3410';
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h / 2);
        if (!c.opened) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(c.x - 3, c.y - 4, 7, 7);
        } else {
            drawStar(c.x, c.y - 22, 11, '#FFD700');
        }
        ctx.restore();
    }

    // Status line: time of day / what to do
    const nightNum = state.paradiseClearCount + 1;
    let status, color = 'rgba(255,255,255,0.85)';
    if (state.lightCrystals >= 3)       status = '☀ Paradise Island is safe! Now go and beat the Devil!';
    else if (P.phase === 'day')         status = `${{ sun: '☀', rain: '🌧', snow: '❄' }[P.weather]} Daytime — night falls in ${Math.ceil(P.timer / 60)}s (monsters might come!)`;
    else if (P.phase === 'dusk')      { status = '🌙 MONSTER NIGHT IS COMING! Get ready!'; color = Math.floor(Date.now() / 200) % 2 ? '#FF6666' : '#FFFFFF'; }
    else if (P.quiet)                 { status = `🌙 A quiet night… sleep tight! Morning comes in ${Math.ceil(P.timer / 60)}s`; color = '#AABBFF'; }
    else if (allMonstersDefeated())   { status = '⭐ You did it! Open the chest to win a Light Crystal!'; color = '#FFD700'; }
    else { status = `🌙 MONSTER NIGHT ${nightNum}/3${nightNum === 3 ? ' — THE KING SLIME IS HERE!' : nightNum === 2 ? ' — THE GHOST KING IS HERE!' : ''} — beat every monster!`; color = '#AABBFF'; }
    ctx.save();
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillStyle = color; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    if (state.buildMode) ctx.globalAlpha = 0;   // the hotbar is showing instead
    ctx.fillText(status, 400, 544);
    if (state.job) {
        ctx.fillStyle = 'rgba(255,235,160,0.95)'; ctx.font = 'bold 12px Arial';
        ctx.fillText(`📋 Job: ${jobText()} — pays 🪙${state.job.pay}`, 400, 562);
    }
    ctx.restore();

    // Coins
    drawCoins(P.coins);
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

// ── YOUR HOME (inside whichever house you own) ────────────────
const FURNITURE = [
    { id: 'tv',        icon: '📺', name: 'Big TV',       cost: 15, x: 400, y: 128 },
    { id: 'sofa',      icon: '🛋', name: 'Comfy Sofa',   cost: 10, x: 400, y: 220 },
    { id: 'rug',       icon: '🟥', name: 'Fluffy Rug',   cost: 5,  x: 400, y: 330 },
    { id: 'picture',   icon: '🖼', name: 'Picture',      cost: 5,  x: 250, y: 100 },
    { id: 'lamp',      icon: '💡', name: 'Lamp',         cost: 6,  x: 690, y: 170 },
    { id: 'bookshelf', icon: '📚', name: 'Bookshelf',    cost: 8,  x: 560, y: 118 },
    { id: 'fishtank',  icon: '🐠', name: 'Fish Tank',    cost: 12, x: 130, y: 430 },
];
const HOUSE_BED    = { x: 130, y: 200 };
const HOUSE_DOOR   = { x: 400, y: 578 };
const CATALOGUE    = { id: 'catalogue', name: 'Furniture Catalogue', x: 290, y: 470 };
const GARDEN_POTS  = [0, 1, 2, 3].map(i => ({ x: 560 + i * 50, y: 470 }));
const GROW_MS      = 45000;   // a seed takes 45 s to grow (even while you're away!)
const PET_BEDS     = [{ x: 560, y: 320 }, { x: 610, y: 320 }, { x: 660, y: 320 }, { x: 710, y: 320 }];

function gardenStage(i) {
    const t = state.garden[i];
    if (!t) return 0;                                    // empty
    return Math.min(3, 1 + Math.floor((Date.now() - t) / (GROW_MS / 2)));   // 1 seed, 2 sprout, 3 ready!
}

function nearHome(obj, r = 34) { return state.room === ROOM.HOUSE && Math.hypot(player.x - obj.x, player.y - obj.y) < r; }
function nearPot() { return state.room === ROOM.HOUSE ? GARDEN_POTS.findIndex(p => Math.hypot(player.x - p.x, player.y - p.y) < 26) : -1; }

// Things you can do at home with the main button
function tryHomeAction() {
    if (state.room !== ROOM.HOUSE) return false;
    if (state.furniture.tv && nearHome({ x: 400, y: 150 }, 44)) { tvShow = { ch: 0, t: 0 }; return true; }
    if (nearHome(CATALOGUE)) { openMenu('📖 FURNITURE CATALOGUE', furnitureItems); return true; }
    if (nearHome(HOUSE_BED, 40)) {
        state.playerHp = fullHearts();
        spawnParticles(player.x, player.y, '#FF88AA', 12);
        showToast('Zzz… you had a lovely nap. All hearts back! ❤', '#FFB0C8');
        sfx('buy');
        return true;
    }
    const i = nearPot();
    if (i >= 0) {
        const stage = gardenStage(i), p = GARDEN_POTS[i];
        if (stage === 0) { state.garden[i] = Date.now(); spawnFloatText(p.x, p.y - 30, '🌱 Planted! Come back soon', '#88FF88', 70); sfx('dig'); }
        else if (stage < 3) spawnFloatText(p.x, p.y - 30, 'Still growing…', '#CCFFCC', 50);
        else {
            state.garden[i] = 0;
            const veg = ['🥕 Carrot', '🍓 Strawberry', '🍅 Tomato', '🌽 Corn'][i];
            if (state.playerHp < fullHearts()) { state.playerHp++; spawnFloatText(p.x, p.y - 30, `${veg}! +1 ❤`, '#FFAA66', 80); }
            else { addScore(20); spawnFloatText(p.x, p.y - 30, `${veg}! +20`, '#FFAA66', 80); }
            sfx('found'); giveAward('gardener');
        }
        return true;
    }
    return false;
}

function furnitureItems() {
    return FURNITURE.map(f => ({
        icon: f.icon, name: f.name, desc: 'Makes your home look amazing', cost: f.cost,
        status: state.furniture[f.id] ? 'IN YOUR HOME' : null,
        action: () => {
            if (state.furniture[f.id]) return;
            if (spend(f.cost)) {
                state.furniture[f.id] = true;
                showToast(`${f.icon} ${f.name} added to your home!`);
                if (FURNITURE.every(x => state.furniture[x.id])) giveAward('decorator');
            }
        },
    }));
}

function paintHouse(g, R) {
    // Wooden floor
    for (let y = 130; y < 600; y += 20) {
        for (let x = (y / 20) % 2 ? -40 : 0; x < 800; x += 80) {
            g.fillStyle = `hsl(30, ${35 + R() * 10}%, ${38 + R() * 8}%)`;
            g.fillRect(x, y, 79, 19);
        }
    }
    // Wallpaper wall with a skirting board
    g.fillStyle = '#F4E4C8'; g.fillRect(0, 46, 800, 90);
    g.fillStyle = 'rgba(220,160,120,0.35)';
    for (let x = 0; x < 800; x += 24) g.fillRect(x, 46, 10, 90);
    g.fillStyle = '#8A5A34'; g.fillRect(0, 130, 800, 8);
    // Windows
    for (const wx of [90, 690]) {
        const sky = g.createLinearGradient(0, 62, 0, 118);
        sky.addColorStop(0, '#7FC8FF'); sky.addColorStop(1, '#D8F0FF');
        g.fillStyle = sky; g.fillRect(wx - 28, 62, 56, 56);
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 4; g.strokeRect(wx - 28, 62, 56, 56);
        g.beginPath(); g.moveTo(wx, 62); g.lineTo(wx, 118); g.moveTo(wx - 28, 90); g.lineTo(wx + 28, 90); g.stroke();
    }
    // Garden corner (soil)
    g.fillStyle = '#6B8A3A'; g.fillRect(520, 430, 270, 80);
    // Front door mat
    g.fillStyle = '#8A3A2A'; g.fillRect(360, 560, 80, 30);
}

function drawHouse() {
    const t = Date.now() / 1000, F = state.furniture;
    const label = (text, x, y) => { ctx.fillStyle = 'rgba(60,30,10,0.8)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); };
    // Front door (walk into it to go outside)
    ctx.fillStyle = '#6B3E1E'; ctx.fillRect(HOUSE_DOOR.x - 22, 560, 44, 40);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(HOUSE_DOOR.x + 12, 578, 4, 4);
    label('⬇ WAY OUT', HOUSE_DOOR.x, 556);
    if (F.rug)     { ctx.fillStyle = '#C0304A'; ctx.beginPath(); ctx.ellipse(400, 330, 110, 45, 0, 0, Math.PI * 2); ctx.fill();
                     ctx.strokeStyle = '#FFD0A0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(400, 330, 95, 36, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (F.picture) { ctx.fillStyle = '#C8A040'; ctx.fillRect(222, 70, 56, 44); ctx.fillStyle = '#7FC8FF'; ctx.fillRect(228, 76, 44, 32);
                     ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.moveTo(228, 108); ctx.lineTo(245, 88); ctx.lineTo(262, 108); ctx.fill();
                     ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(262, 84, 4, 0, Math.PI * 2); ctx.fill(); }
    if (F.bookshelf) { ctx.fillStyle = '#6B3E1E'; ctx.fillRect(530, 70, 60, 64);
                     for (let r = 0; r < 3; r++) for (let b = 0; b < 6; b++) { ctx.fillStyle = ['#C03030', '#3060C0', '#30A050', '#E0A020', '#8040A0', '#20A0A0'][(b + r) % 6]; ctx.fillRect(534 + b * 9, 74 + r * 20, 7, 16); } }
    if (F.tv)      { ctx.fillStyle = '#222'; ctx.fillRect(350, 84, 100, 60); ctx.fillStyle = `hsl(${(t * 40) % 360}, 60%, 55%)`; ctx.fillRect(356, 90, 88, 48);
                     ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('📺 CARTOONS!', 400, 118);
                     ctx.fillStyle = '#444'; ctx.fillRect(390, 144, 20, 6); }
    if (F.sofa)    { ctx.fillStyle = '#3A6AB0'; pathRoundRect(340, 200, 120, 40, 10); ctx.fill(); ctx.fillStyle = '#4A7AC8'; pathRoundRect(345, 214, 110, 22, 8); ctx.fill(); }
    if (F.lamp)    { ctx.fillStyle = '#555'; ctx.fillRect(688, 150, 4, 50); ctx.fillStyle = '#FFE8A0'; ctx.beginPath(); ctx.moveTo(676, 152); ctx.lineTo(704, 152); ctx.lineTo(698, 134); ctx.lineTo(682, 134); ctx.fill();
                     const gl = ctx.createRadialGradient(690, 150, 4, 690, 150, 70); gl.addColorStop(0, 'rgba(255,230,150,0.35)'); gl.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = gl; ctx.fillRect(620, 80, 140, 140); }
    if (F.fishtank){ ctx.fillStyle = 'rgba(80,170,230,0.7)'; ctx.fillRect(95, 405, 70, 45); ctx.strokeStyle = '#DDD'; ctx.lineWidth = 2; ctx.strokeRect(95, 405, 70, 45);
                     for (let k = 0; k < 3; k++) { const fx = 105 + ((t * 20 + k * 22) % 50); ctx.fillStyle = ['#FF8800', '#FFDD00', '#FF4488'][k]; ctx.beginPath(); ctx.ellipse(fx, 418 + k * 10, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); } }
    // Bed (always)
    ctx.fillStyle = '#8A5A34'; ctx.fillRect(90, 165, 80, 75);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(96, 170, 68, 18);
    ctx.fillStyle = '#E05080'; ctx.fillRect(96, 190, 68, 45);
    label('Bed — rest here', HOUSE_BED.x, 252);
    // Catalogue
    ctx.fillStyle = '#3A6A3A'; ctx.fillRect(CATALOGUE.x - 12, CATALOGUE.y - 9, 24, 18); ctx.fillStyle = '#FFE066'; ctx.fillRect(CATALOGUE.x - 1, CATALOGUE.y - 9, 2, 18);
    label('📖 Furniture Catalogue', CATALOGUE.x, CATALOGUE.y + 22);
    // Garden pots
    GARDEN_POTS.forEach((p, i) => {
        const st = gardenStage(i);
        ctx.fillStyle = '#B0603A'; ctx.beginPath(); ctx.moveTo(p.x - 14, p.y - 4); ctx.lineTo(p.x + 14, p.y - 4); ctx.lineTo(p.x + 10, p.y + 14); ctx.lineTo(p.x - 10, p.y + 14); ctx.fill();
        ctx.fillStyle = '#4A2E1A'; ctx.fillRect(p.x - 13, p.y - 6, 26, 4);
        if (st >= 1) { ctx.strokeStyle = '#3A9A3A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x, p.y - 6 - st * 7); ctx.stroke(); }
        if (st >= 2) { ctx.fillStyle = '#4CBF4C'; ctx.beginPath(); ctx.ellipse(p.x - 5, p.y - 14, 5, 3, -0.5, 0, Math.PI * 2); ctx.ellipse(p.x + 5, p.y - 17, 5, 3, 0.5, 0, Math.PI * 2); ctx.fill(); }
        if (st === 3) { ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.fillText(['🥕', '🍓', '🍅', '🌽'][i], p.x, p.y - 26 + Math.sin(t * 3 + i) * 2); }
    });
    label('🌻 YOUR GARDEN — plant, wait, pick!', 655, 506);
    // Pets asleep in their beds
    let bed = 0;
    PETS.forEach((pInfo, j) => {
        if (!state.ownedPets[j] || j === state.activePet) return;
        const b = PET_BEDS[bed++];
        if (!b) return;   // only 4 beds
        ctx.fillStyle = '#A06AC8'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
        drawPetShape(pInfo.id, b.x, b.y, 1, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
        ctx.fillText('z'.repeat(1 + Math.floor(t * 2 + j) % 3), b.x + 14, b.y - 16 - ((t * 10) % 8));
    });
    if (bed) label('💤 your pets are sleeping', 635, 346);
    // What the button does here
    const verb = mainBtn();
    const i = nearPot();
    if (nearHome(CATALOGUE)) drawSpeech(CATALOGUE, `${verb}: Buy furniture`);
    else if (nearHome(HOUSE_BED, 40)) drawSpeech(HOUSE_BED, `${verb}: Take a nap (free heal)`);
    else if (i >= 0) { const st = gardenStage(i); drawSpeech(GARDEN_POTS[i], `${verb}: ${st === 0 ? 'Plant a seed' : st < 3 ? 'Growing…' : 'Pick it!'}`); }
}

// ── HOME & BUILDING: the backyard builder and the secret room ──
const SECRET_CHEST = { x: 400, y: 200 };
const YARD_SIGN    = { x: 220, y: 300 };
const YARD = [
    { id: 'treehouse',  icon: '🌳', name: 'Treehouse',        cost: 40,  x: 150, y: 150, desc: 'Climb up for a cosy rest (heals you)' },
    { id: 'pethouse',   icon: '🏠', name: 'Pet House',        cost: 30,  x: 330, y: 140, desc: 'Your pets play here and bring you coins' },
    { id: 'castle',     icon: '🏰', name: 'Your Own Castle',  cost: 150, x: 560, y: 140, desc: 'Sit on the throne — get a crown!' },
    { id: 'garden',     icon: '🌱', name: 'Magic Garden',     cost: 35,  x: 130, y: 390, desc: 'Grow coin flowers, heart fruit and star plants' },
    { id: 'farm',       icon: '🐄', name: 'Farm',             cost: 50,  x: 370, y: 470, desc: 'Cows, pigs, chickens and sheep!' },
    { id: 'trampoline', icon: '🤸', name: 'Trampoline',       cost: 20,  x: 330, y: 300, desc: 'BOING BOING BOING!' },
    { id: 'coaster',    icon: '🎢', name: 'Rollercoaster',    cost: 120, x: 700, y: 300, desc: 'Loop the loop!' },
    { id: 'slide',      icon: '🛝', name: 'Water Slide',      cost: 60,  x: 530, y: 330, desc: 'Whoosh into the pool!' },
    { id: 'pool',       icon: '🏊', name: 'Swimming Pool',    cost: 50,  x: 600, y: 480, desc: 'Swim to cool off (heals slowly)' },
];
const POOL_RECT   = { x: 520, y: 430, w: 170, h: 110 };
const MAGIC_GROW_MS = 30000;
const MAGIC_PLOTS = [0, 1, 2].map(i => ({ x: 80 + i * 50, y: 390 }));   // above the controls panel
const FARM_ANIMALS = ['🐄', '🐖', '🐔', '🐑'];
let yardRide = null;   // { kind, t, len }
let yardTimers = {};

function yardItems() {
    return YARD.map(b => ({ icon: b.icon, name: b.name, desc: b.desc, cost: b.cost, status: state.yard[b.id] ? 'BUILT!' : null,
        action: () => {
            if (state.yard[b.id]) return;
            if (!spend(b.cost)) return;
            state.yard[b.id] = true; giveAward('yardBuilder'); sfx('place'); menu = null;
            spawnParticles(b.x, b.y, '#FFE066', 30); triggerShake(6);
            showToast(`🔨 You built a ${b.name}!`, '#FFE066', 180);
        } }));
}
function magicStage(i) { const at = state.magicGarden[i]; if (!at) return 0; const k = (Date.now() - at) / MAGIC_GROW_MS; return k >= 1 ? 3 : k >= 0.5 ? 2 : 1; }
function tryYardAction(nearIt) {
    const built = id => state.yard[id];
    const b = id => YARD.find(y => y.id === id);
    if (nearIt(YARD_SIGN, 40)) { openMenu('🔨 BACKYARD BUILDER', yardItems); return true; }
    if (built('garden')) {
        const i = MAGIC_PLOTS.findIndex(p => nearIt(p, 22));
        if (i >= 0) {
            const st = magicStage(i);
            if (st === 0) { state.magicGarden[i] = Date.now(); spawnFloatText(MAGIC_PLOTS[i].x, MAGIC_PLOTS[i].y - 20, '🌱 Planted!', '#AAFFAA', 60); sfx('place'); }
            else if (st < 3) spawnFloatText(MAGIC_PLOTS[i].x, MAGIC_PLOTS[i].y - 20, 'Still growing…', '#FFFFFF', 50);
            else {
                state.magicGarden[i] = 0; sfx('found');
                const gift = [['🌼 Coin Flower! +🪙20', () => { state.coins += 20; }], ['🍎 Heart Fruit! Full hearts!', () => { state.playerHp = fullHearts(); }],
                              ['⭐ Star Plant! Super speed!', () => { godSpeedTimer = 900; }], ['🫧 Bubble Berry! Shield Bubble!', () => { state.bubble = true; }]][Math.floor(Math.random() * 4)];
                gift[1](); showToast(gift[0], '#AAFFAA', 180);
            }
            return true;
        }
    }
    if (built('treehouse') && nearIt(b('treehouse'), 44)) {
        if (Date.now() - (yardTimers.tree || 0) < 30000) { spawnFloatText(player.x, player.y - 30, 'You just rested!', '#FFF', 50); return true; }
        yardTimers.tree = Date.now(); state.playerHp = fullHearts(); sfx('magic');
        showToast('🌳 A cosy rest in your treehouse! Full hearts!', '#AAFFAA', 180); return true;
    }
    if (built('pethouse') && nearIt(b('pethouse'), 44)) {
        const P = place(), n = state.ownedPets.filter(Boolean).length;
        if (P.petGift || !n) { spawnFloatText(player.x, player.y - 30, n ? 'Your pets are napping 💤' : 'Get a pet first!', '#FFF', 60); return true; }
        P.petGift = true; state.coins += n * 3; sfx('coin');
        showToast(`🏠 Your ${n} pet${n > 1 ? 's' : ''} found coins for you! +🪙${n * 3}`, '#FFE066', 180); return true;
    }
    if (built('castle') && nearIt(b('castle'), 50)) {
        state.hats.crown = true; state.hat = 'crown'; giveAward('royal'); sfx('win'); spawnConfettiAt(player.x, player.y);
        showToast('🏰 You sit on your throne. ALL HAIL THE KING/QUEEN! 👑', '#FFD700', 220); return true;
    }
    if (built('farm') && nearIt(b('farm'), 70)) {
        if (Date.now() - state.farmAt < 60000) { spawnFloatText(player.x, player.y - 30, 'The animals need a rest!', '#FFF', 60); return true; }
        state.farmAt = Date.now(); state.coins += 15; sfx('coin');
        showToast('🐄 Moo! 🥛 milk, 🥚 eggs and 🧶 wool! +🪙15', '#FFE066', 180); return true;
    }
    if (built('trampoline') && nearIt(b('trampoline'), 40)) { yardRide = { kind: 'bounce', t: 0, len: 150 }; sfx('boing'); return true; }
    if (built('coaster') && nearIt(b('coaster'), 50)) { yardRide = { kind: 'coaster', t: 0, len: 300 }; giveAward('rollercoaster'); sfx('whoosh'); showToast('🎢 WHEEEEEE!', '#FFE066', 150); return true; }
    if (built('slide') && nearIt(b('slide'), 40)) { yardRide = { kind: 'slide', t: 0, len: 90 }; sfx('whoosh'); return true; }
    return false;
}
function updateYardRide() {
    if (!yardRide) return false;
    const R = yardRide, k = ++R.t / R.len;
    state.playerInvincible = Math.max(state.playerInvincible, 2);
    if (R.kind === 'bounce') {   // up and down on the trampoline
        const c = YARD.find(y => y.id === 'trampoline');
        player.x = c.x; player.y = c.y - Math.abs(Math.sin(k * Math.PI * 5)) * 90;
        if (R.t % 30 === 15) { sfx('boing'); spawnFloatText(player.x, player.y - 30, 'BOING!', '#FFE066', 30); }
    } else if (R.kind === 'coaster') {   // round the loop twice
        const c = YARD.find(y => y.id === 'coaster'), a = k * Math.PI * 4;
        player.x = c.x + Math.cos(a) * 70; player.y = c.y + Math.sin(a) * 110;
        if (R.t % 8 === 0) spawnParticles(player.x, player.y, '#FFE066', 1);
    } else if (R.kind === 'slide') {   // down the slide into the pool
        const c = YARD.find(y => y.id === 'slide');
        player.x = c.x + k * 70; player.y = c.y - 20 + k * 150;
        if (R.t === R.len - 1) { for (let n = 0; n < 4; n++) spawnParticles(player.x, player.y, '#66BBFF', 8); sfx('splash'); spawnFloatText(player.x, player.y - 30, 'SPLASH!', '#66BBFF', 50); }
    }
    if (R.t >= R.len) yardRide = null;
    return true;
}
function updateYard() {
    if (state.room !== ROOM.BACKYARD || !playing()) return;
    if (state.yard.pool && inRectXY(player.x, player.y, POOL_RECT)) {   // 🏊 swimming!
        if (Math.random() < 0.15) particles.push({ x: player.x + (Math.random() - 0.5) * 30, y: player.y + 10, dx: 0, dy: -0.5, life: 30, maxLife: 30, color: 'rgba(200,240,255,0.8)', r: 4 });
        if (++yardTimers.swim % 300 === 0 && state.playerHp < fullHearts()) { state.playerHp++; spawnFloatText(player.x, player.y - 30, '🏊 +1 ❤', '#66BBFF', 50); }
    }
}
yardTimers.swim = 0;
function drawYard() {
    if (state.room !== ROOM.BACKYARD) return;
    const t = Date.now() / 1000, verb = mainBtn();
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    const near = (o, r) => Math.hypot(player.x - o.x, player.y - o.y) < r && !menu && !yardRide;
    const label = (text, x, y) => { ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); };
    ctx.fillStyle = '#8A5A2A'; ctx.fillRect(YARD_SIGN.x - 3, YARD_SIGN.y, 6, 26); ctx.fillStyle = '#D8B080'; ctx.fillRect(YARD_SIGN.x - 34, YARD_SIGN.y - 22, 68, 26);
    ctx.fillStyle = '#4A2A10'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('🔨 BUILDER', YARD_SIGN.x, YARD_SIGN.y - 6);
    if (near(YARD_SIGN, 40)) drawSpeech({ x: YARD_SIGN.x, y: YARD_SIGN.y - 24 }, `${verb}: Build things!`);
    for (const b of YARD) {
        if (!state.yard[b.id]) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([5, 5]); ctx.strokeRect(b.x - 30, b.y - 30, 60, 60); ctx.setLineDash([]); label(`${b.icon}?`, b.x, b.y + 4); continue; }
        if (b.id === 'pool') {
            ctx.fillStyle = '#E8E0D0'; ctx.fillRect(POOL_RECT.x - 6, POOL_RECT.y - 6, POOL_RECT.w + 12, POOL_RECT.h + 12);
            ctx.fillStyle = '#44AAEE'; ctx.fillRect(POOL_RECT.x, POOL_RECT.y, POOL_RECT.w, POOL_RECT.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(POOL_RECT.x + 10, POOL_RECT.y + 20 + k * 25 + Math.sin(t * 2 + k) * 3); ctx.lineTo(POOL_RECT.x + POOL_RECT.w - 10, POOL_RECT.y + 20 + k * 25 + Math.sin(t * 2 + k + 1) * 3); ctx.stroke(); }
            continue;
        }
        if (b.id === 'garden') {
            MAGIC_PLOTS.forEach((p, i) => {
                const st = magicStage(i);
                ctx.fillStyle = '#6A4A2A'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
                if (st) emoji(st === 3 ? ['🌼', '🍎', '⭐'][i] : st === 2 ? '🌿' : '🌱', p.x, p.y - 6 + (st === 3 ? Math.sin(t * 3 + i) * 2 : 0), st === 3 ? 22 : 16);
                if (near(p, 22)) drawSpeech({ x: p.x, y: p.y - 18 }, `${verb}: ${st === 0 ? 'Plant a magic seed' : st < 3 ? 'Growing…' : 'Pick it!'}`);
            });
            label('🌱 Magic Garden', b.x, b.y + 36);
            continue;
        }
        if (b.id === 'farm') {
            ctx.strokeStyle = '#C8A070'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 80, b.y - 50, 160, 100);
            FARM_ANIMALS.forEach((a, i) => emoji(a, b.x - 50 + i * 33 + Math.sin(t * 0.7 + i * 2) * 8, b.y + Math.cos(t * 0.5 + i) * 18, 22));
            label('🐄 Your Farm', b.x, b.y + 64);
            if (near(b, 70)) drawSpeech({ x: b.x, y: b.y - 50 }, `${verb}: Collect milk, eggs and wool`);
            continue;
        }
        if (b.id === 'coaster') {
            ctx.strokeStyle = '#E04040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(b.x, b.y, 70, 110, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(b.x + Math.cos(k * 0.8) * 70, b.y + Math.sin(k * 0.8) * 110); ctx.lineTo(b.x + Math.cos(k * 0.8) * 70, 560); ctx.stroke(); }
        }
        if (b.id === 'slide') {
            ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y - 20); ctx.quadraticCurveTo(b.x + 60, b.y + 40, b.x + 70, b.y + 130); ctx.stroke(); ctx.lineCap = 'butt';
        }
        if (b.id === 'trampoline') { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 34, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3A8AE0'; ctx.lineWidth = 4; ctx.stroke(); }
        else emoji(b.icon, b.x, b.y, b.id === 'castle' ? 70 : b.id === 'treehouse' ? 60 : 40);
        if (b.id === 'pethouse') state.ownedPets.forEach((own, j) => { if (own && j !== state.activePet && j < 6) drawPetShape(PETS[j].id, b.x - 50 + (j % 3) * 50, b.y + 40 + Math.floor(j / 3) * 22, 0.8, 1); });
        label(b.name, b.x, b.y + (b.id === 'castle' ? 50 : b.id === 'coaster' ? 125 : 40));
        if (near(b, b.id === 'castle' ? 50 : 44)) drawSpeech({ x: b.x, y: b.y - 30 },
            `${verb}: ${{ treehouse: 'Climb up', pethouse: 'Visit your pets', castle: 'Sit on the throne', trampoline: 'Bounce!', coaster: 'Ride!', slide: 'Slide!' }[b.id] || ''}`);
    }
}
function drawSecretRoom2() {
    if (state.room !== ROOM.SECRETROOM) return;
    const P = place();
    ctx.save(); ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P.chest ? '📭' : '🧰', SECRET_CHEST.x, SECRET_CHEST.y); ctx.restore();
    const n = awardsEarned();
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🏆 Your trophy shelf: ${n} awards!`, 400, 118);
    ctx.fillText('🕵 Nobody knows about this room… except you!', 400, 300);
    if (!P.chest && Math.hypot(player.x - SECRET_CHEST.x, player.y - SECRET_CHEST.y) < 40 && !menu) drawSpeech({ x: SECRET_CHEST.x, y: SECRET_CHEST.y - 20 }, `${mainBtn()}: Open your secret chest`);
}

