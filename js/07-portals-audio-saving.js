// ── HEAVEN: the opposite of Hell. No monsters, it heals you, 3 wishes, unlimited blocks ──
const WISH_ANGEL = { id: 'angel', name: 'Angel of Wishes', x: 400, y: 232 };
function makeHeaven() {
    state.heavenWishes = 3;
    return { angels: [0, 1, 2].map(i => ({ x: 150 + i * 250, y: 380 + (i % 2) * 60, t: i * 2 })) };
}
let heaven = makeHeaven();

function updateHeaven() {
    if (state.room !== ROOM.HEAVEN) return;
    for (const a of heaven.angels) { a.t += 0.01; a.x = 400 + Math.sin(a.t + a.y) * 300; a.y += Math.sin(a.t * 3) * 0.3; }
}

function nearWishAngel() {
    return state.room === ROOM.HEAVEN && Math.hypot(player.x - WISH_ANGEL.x, player.y - WISH_ANGEL.y) < 44;
}

function wishItems() {
    const wish = (icon, name, desc, give) => ({
        icon, name, desc, cost: 0, status: state.heavenWishes > 0 ? `${state.heavenWishes} wish${state.heavenWishes > 1 ? 'es' : ''} left` : null,
        action: () => {
            if (state.heavenWishes <= 0) { showToast('No wishes left — come back to Heaven another time!', '#AACCFF', 140); return; }
            state.heavenWishes--; give(); sfx('magic'); spawnParticles(player.x, player.y, '#FFF4B0', 20);
        },
    });
    const petWish = () => {
        const free = PETS.map((p, i) => i).filter(i => !state.ownedPets[i]);
        if (!free.length) { showToast('You already have every pet!'); state.heavenWishes++; return; }
        const j = free[Math.floor(Math.random() * free.length)];
        state.ownedPets[j] = true; state.activePet = j; placePetBesidePlayer();
        showToast(`🐾 A ${PETS[j].name} flew down from the clouds for you!`); giveAward('pet');
        if (state.ownedPets.every(Boolean)) giveAward('allPets');
    };
    const weapon = (pw) => () => { state.power = pw; state.powerTier = 2; showToast(`✨ SUPER ${WEAPON_INFO[pw].label}!`); };
    return [
        wish('❤', 'Full hearts + Bubble', 'All your hearts and a Shield Bubble', () => { state.playerHp = fullHearts(); state.bubble = true; showToast('❤ All better — and a Shield Bubble!'); }),
        wish('🌈', 'Rainbow Power', 'Super rare — might not work!', () => {
            if (Math.random() >= RAINBOW_WISH_CHANCE) { showToast('🌈 The rainbow faded away… try again!', '#AACCFF', 160); return; }
            state.power = POWER.RAINBOW; state.powerTier = 3; giveAward('rainbow'); showToast('🌈 RAINBOW POWER!');
        }),
        wish('❄', 'Super Ice', 'Beats Fire Monsters, freezes things', weapon(POWER.ICE)),
        wish('🔥', 'Super Fire', 'Beats Ghosts, Spiders & Zombies', weapon(POWER.BRIMSTONE)),
        wish('⚡', 'Super Lightning', 'Beats Bats and jumps between monsters', weapon(POWER.LIGHTNING)),
        wish('💧', 'Super Water', 'Beats Slimes, Moles & Robots', weapon(POWER.WATER)),
        wish('🐾', 'A New Pet', 'A pet you don\'t have yet', petWish),
        wish('🧱', 'Stack of Blocks', '+16 of every block to build with', () => { for (const b of HOTBAR) state.inv[b] = invCount(b) + 16; showToast('🧱 +16 of every block!'); }),
    ];
}

// Sky, light rays and the pearly gates (under everything else)
function drawHeavenBack() {
    const t = Date.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let k = 0; k < 7; k++) {   // soft rays of light from the gates
        const a = Math.PI / 2 + (k - 3) * 0.28 + Math.sin(t / 3 + k) * 0.03;
        ctx.fillStyle = '#FFF6C8';
        ctx.beginPath(); ctx.moveTo(400, 150); ctx.lineTo(400 + Math.cos(a - 0.06) * 700, 150 + Math.sin(a - 0.06) * 700); ctx.lineTo(400 + Math.cos(a + 0.06) * 700, 150 + Math.sin(a + 0.06) * 700); ctx.fill();
    }
    ctx.restore();
    // Pearly gates
    ctx.save();
    ctx.shadowColor = '#FFE680'; ctx.shadowBlur = 25;
    ctx.strokeStyle = '#E8C04A'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(400, 170, 70, Math.PI, 0); ctx.stroke();                              // arch
    ctx.fillStyle = '#F4F0E8'; ctx.fillRect(322, 160, 14, 60); ctx.fillRect(464, 160, 14, 60);   // pillars
    ctx.shadowBlur = 0; ctx.lineWidth = 3;
    for (let k = 0; k < 6; k++) {                                                                 // golden bars
        const gx = 345 + k * 22;
        ctx.beginPath(); ctx.moveTo(gx, 128 + Math.abs(k - 2.5) * 6); ctx.lineTo(gx, 215); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(338, 170); ctx.lineTo(462, 170); ctx.stroke();
    ctx.fillStyle = '#E8C04A'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('✨ HEAVEN ✨', 400, 92);
    ctx.restore();
}

function drawAngel(x, y, big = false) {
    const t = Date.now() / 1000, k = big ? 1.2 : 1, flap = Math.sin(t * 6 + x) * 5;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';                                            // wings
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * 5 * k, y - 6 * k);
        ctx.quadraticCurveTo(x + side * 26 * k, y - 22 * k - flap, x + side * 22 * k, y + 4 * k);
        ctx.quadraticCurveTo(x + side * 14 * k, y, x + side * 5 * k, y + 2 * k); ctx.fill();
    }
    drawHuman(x, y, k, { shirt: '#FFFFFF', sleeves: '#F4F4FF', pants: '#FFFFFF', shoes: '#F4E8C8', hair: '#F2D060', hairStyle: 'long' });
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;   // halo
    ctx.beginPath(); ctx.ellipse(x, y - 27 * k, 7 * k, 2.5 * k, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

function drawHeaven() {
    drawBalloon(BALLOON.x, BALLOON.y, 'To CLOUD CITY');
    // Cloud stairs up to the Sky Castle
    for (let k = 0; k < 5; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.95 - k * 0.1})`;
        ctx.beginPath(); ctx.ellipse(SKY_STAIRS.x + k * 14, SKY_STAIRS.y - k * 16, 26 - k * 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#446'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('☁ Stairs to the SKY CASTLE', SKY_STAIRS.x + 20, SKY_STAIRS.y + 26);
    for (const a of heaven.angels) { drawGroundShadow(a.x, a.y + 30, 10, 3, 0.12); drawAngel(a.x, a.y - 10 + Math.sin(Date.now() / 400 + a.x) * 5); }
    drawGroundShadow(WISH_ANGEL.x, WISH_ANGEL.y + 20, 12, 4, 0.2);
    drawAngel(WISH_ANGEL.x, WISH_ANGEL.y, true);
    ctx.fillStyle = '#7A5A10'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Angel of Wishes — ${state.heavenWishes} wish${state.heavenWishes === 1 ? '' : 'es'} left`, WISH_ANGEL.x, WISH_ANGEL.y + 34);
    if (nearWishAngel() && !menu) {
        const verb = mainBtn();
        drawSpeech(WISH_ANGEL, `${verb}: Make a wish! ✨`);
    }
    if (!state.buildMode) {
        ctx.fillStyle = 'rgba(90,70,20,0.75)'; ctx.font = 'bold 12px Arial';
        ctx.fillText(`No monsters up here — it heals you! ${byInput('Press B', 'Tap 🧱', 'Click the left stick')} to build anything with UNLIMITED blocks.`, 400, 590);
    }
}

let secretRoom   = makeSecretRoom();
let underground  = makeUnderground();
let goldenPortal = null;    // { x, y } when the rare golden portal is showing
let hell      = makeHell();
let paradise  = makeParadise();
let voidRoom  = makeVoidRoom();

// ── PORTALS ───────────────────────────────────────────────────
// Every portal is a mystery: it takes you to a random room (never the one you're in)
// Kept clear of the caves, chests, spawn points and touch controls.
const PORTAL_R = 34;
const PORTALS = {
    void: [
        { x: 60,  y: 300, shape: 'circle'   },
        { x: 740, y: 300, shape: 'diamond'  },
        { x: 400, y: 112, shape: 'star'     },
        { x: 740, y: 112, shape: 'hexagon'  },
    ],
    secret: [
        { x: 700, y: 440, shape: 'star'     },
    ],
    underground: [
        { x: 740, y: 300, shape: 'circle'   },
        { x: 400, y: 545, shape: 'hexagon'  },
    ],
    house: [],   // you leave by the front door, not a portal
    ship:    [],                                         // you're at sea!
    candy:   [{ x: 740, y: 300, shape: 'circle'  }],
    ice:     [{ x: 740, y: 300, shape: 'hexagon' }],
    haunted: [{ x: 740, y: 520, shape: 'star'    }],
    sky:     [{ x: 740, y: 470, shape: 'diamond' }],
    space:   [{ x: 740, y: 470, shape: 'star'    }],
    arena:   [],
    mall:    [],
    camp:    [],
    olympus: [],
    piratecove: [],
    chess:   [],
    library: [],
    greece:  [],
    maze:    [],
    gorgon:  [],
    underworld: [],
    viking:  [],
    candyvolcano: [],
    seacity: [],
    moonbase: [],
    cloudcastle: [],
    icecave: [],
    treehouse: [],
    factory: [],
    toyshop: [],
    museum: [],
    underbed: [],
    backyard: [],
    secretroom: [],
    stadium: [],
    snowfort: [],
    medieval: [],
    microworld: [],
    underwater: [{ x: 740, y: 120, shape: 'circle' }],
    toy:     [{ x: 740, y: 120, shape: 'star'    }],
    pyramid: [{ x: 740, y: 120, shape: 'diamond' }],
    cloudcity: [{ x: 740, y: 470, shape: 'circle' }],
    dino:    [{ x: 740, y: 120, shape: 'star'    }],
    volcano: [{ x: 740, y: 470, shape: 'diamond' }],
    jungle:  [{ x: 740, y: 520, shape: 'hexagon' }],
    heaven: [
        { x: 60,  y: 330, shape: 'circle'   },
        { x: 740, y: 330, shape: 'star'     },
        { x: 400, y: 545, shape: 'diamond'  },
    ],
    hell: [
        { x: 740, y: 300, shape: 'star'     },
        { x: 420, y: 108, shape: 'triangle' },
        { x: 300, y: 545, shape: 'circle'   },
    ],
    paradise: [
        { x: 60,  y: 300, shape: 'hexagon'  },
        { x: 62,  y: 110, shape: 'diamond'  },
        { x: 752, y: 110, shape: 'triangle' },
    ],
};

function randomDoorDestination() {
    const rooms = MAIN_ROOMS.filter(r => r !== state.room);
    return rooms[Math.floor(Math.random() * rooms.length)];
}

// ── DYNAMIC LISTS ─────────────────────────────────────────────
let projectiles      = [];
let enemyProjectiles = [];
let particles        = [];
let floatTexts       = [];   // "-3 SUPER HIT!" numbers that float up
let lastDevilLaugh   = 0;    // Date.now() of the Devil's last laugh
let heartPickups     = [];   // hearts dropped by defeated bad guys
let bolts            = [];   // chain-lightning zaps between bad guys

// ── SOUND & MUSIC ─────────────────────────────────────────────
// Everything is made with the Web Audio API — no sound files needed.
// Browsers only allow sound after a key press / tap, so initAudio() runs on input.
let audioCtx = null, masterGain = null, musicGain = null, sfxGain = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('lop_muted') === '1'; } catch (e) {}
const MUTE_BTN = { x: 26, y: 574, r: 16 };

function initAudio() {
    resumeGame();   // any real key press, click or tap means the kid is back (resumeGame ignores a hidden tab)
    if (audioCtx) { if (audioCtx.state === 'suspended' && !paused) audioCtx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx   = new AC();
    masterGain = audioCtx.createGain(); masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
    musicGain  = audioCtx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(masterGain);
    sfxGain    = audioCtx.createGain(); sfxGain.gain.value   = 0.6;  sfxGain.connect(masterGain);
    noiseBuf   = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    if (audioCtx.state === 'suspended' && !paused) audioCtx.resume();   // (iOS makes a new context start asleep)
}

// ── FULL SCREEN ───────────────────────────────────────────────
// Hides the browser bars on a phone. Not every browser can (iPhone Safari can't): then there is no button.
const FULLSCREEN_BTN = { x: 616, y: 12, w: 172, h: 40 };   // on the title screen
function fullscreenRoot() { return document.documentElement; }
function fullscreenOK() {
    const el = fullscreenRoot();
    return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen));
}
function inFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
    try {
        if (inFullscreen()) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            const el = fullscreenRoot(), go = el.requestFullscreen || el.webkitRequestFullscreen;
            const done = go.call(el);
            // Android can also keep the phone sideways while the game is full screen
            if (done && done.then) done.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
        }
    } catch (e) { /* a browser that says no: nothing happens */ }
}

function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('lop_muted', muted ? '1' : '0'); } catch (e) {}
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
}

// One beep: frequency (Hz), length (s), wave shape, volume, optional slide to another pitch
function tone(freq, dur, type = 'square', vol = 0.2, slideTo = null, delay = 0, dest = sfxGain) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + Math.max(0, delay);
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
}

// A burst of static (for crunches and explosions)
function noise(dur, vol = 0.2, filterFreq = 1200) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
    src.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = filterFreq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + dur);
}

const SFX = {
    shoot:    () => tone(900, 0.09, 'square', 0.1, 300),
    hit:      () => tone(220, 0.07, 'triangle', 0.25, 110),
    superHit: () => { tone(600, 0.1, 'square', 0.12, 1200); tone(900, 0.12, 'triangle', 0.15, 1800, 0.05); },
    defeat:   () => { noise(0.25, 0.3); tone(400, 0.25, 'sawtooth', 0.1, 60); },
    dig:      () => { noise(0.1, 0.35, 500); tone(90, 0.12, 'sine', 0.35, 50); },
    rumble:   () => { noise(0.4, 0.3, 200); tone(60, 0.4, 'sawtooth', 0.2, 40); },
    found:    () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'square', 0.1, null, i * 0.08)),
    coin:     () => { tone(988, 0.06, 'square', 0.08); tone(1319, 0.2, 'square', 0.08, null, 0.06); },
    hurt:     () => tone(300, 0.3, 'sawtooth', 0.18, 80),
    boing:    () => tone(160, 0.2, 'sine', 0.18, 520),
    portal:   () => { tone(200, 0.5, 'sine', 0.2, 1200); tone(300, 0.5, 'triangle', 0.08, 1800); },
    pop:      () => { tone(1400, 0.1, 'sine', 0.25, 300); noise(0.05, 0.15, 3000); },
    buy:      () => [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', 0.15, null, i * 0.07)),
    freeze:   () => { tone(2000, 0.25, 'sine', 0.12, 800); tone(2600, 0.2, 'triangle', 0.08, 1200, 0.05); },
    zap:      () => { noise(0.15, 0.25, 6000); tone(1500, 0.12, 'sawtooth', 0.1, 300); },
    bigBoing: () => tone(80, 0.35, 'sine', 0.3, 260),
    worm:     () => { noise(0.3, 0.3, 700); tone(120, 0.3, 'sawtooth', 0.12, 300); },
    bark:     () => { tone(520, 0.06, 'square', 0.12, 380); tone(480, 0.08, 'square', 0.12, 330, 0.1); },
    meow:     () => tone(700, 0.25, 'sine', 0.14, 1100),
    hoot:     () => { tone(420, 0.15, 'sine', 0.15, 380); tone(380, 0.25, 'sine', 0.15, 340, 0.2); },
    nightfall:() => [392, 370, 349, 330, 311].forEach((f, i) => tone(f, 0.4, 'triangle', 0.15, null, i * 0.3)),
    splash:   () => { noise(0.25, 0.2, 1800); tone(900, 0.15, 'sine', 0.08, 400); },
    bite:     () => { tone(1200, 0.08, 'square', 0.15); tone(1500, 0.1, 'square', 0.15, null, 0.1); },
    dragonRoar: () => { noise(0.8, 0.35, 400); tone(110, 0.8, 'sawtooth', 0.25, 60); },
    place:    () => { tone(200, 0.06, 'square', 0.15, 120); noise(0.05, 0.2, 800); },
    groan:    () => { tone(140, 0.6, 'sawtooth', 0.08, 90); },
    hiss:     () => noise(0.8, 0.25, 5000),
    clink:    () => { tone(1500, 0.05, 'square', 0.1, 900); tone(700, 0.08, 'triangle', 0.12, 500, 0.03); },
    stick:    () => { noise(0.08, 0.2, 1800); tone(260, 0.1, 'triangle', 0.18, 120); },
    whoosh:   () => { noise(0.2, 0.2, 2500); tone(300, 0.2, 'sine', 0.08, 900); },
    boom:     () => { noise(0.6, 0.5, 600); tone(80, 0.5, 'sawtooth', 0.3, 30); },
    magic:    () => [880, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'sine', 0.12, null, i * 0.05)),
    ribbit:   () => { tone(180, 0.08, 'square', 0.1, 260); tone(170, 0.1, 'square', 0.1, 240, 0.12); },
    fart:     () => { tone(90, 0.5, 'sawtooth', 0.25, 55); tone(70, 0.45, 'square', 0.12, 45, 0.05); noise(0.4, 0.15, 300); },
    // "HA HA HA HA" — the Devil's scary laugh
    laugh:    () => { for (let i = 0; i < 4; i++) { tone(240 - i * 20, 0.14, 'sawtooth', 0.16, 150 - i * 15, i * 0.18);
                                                   tone(120 - i * 10, 0.14, 'square',   0.08, 80,            i * 0.18); } },
    win:      () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.12, null, i * 0.15)),
};
function sfx(name) { if (audioCtx && !muted && settings.sfx) SFX[name](); }

// Background music — one little looping song per room (MIDI note numbers, 0 = rest, 8th notes)
const SONGS = {
    void: { bpm: 84, lead: 'triangle',
        melody: [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 76, 0, 72, 0,  72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 0, 0],
        bass:   [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0,  48, 0, 0, 0, 55, 0, 0, 0, 52, 0, 0, 0, 55, 0, 0, 0] },
    hell: { bpm: 132, lead: 'square',   // spooky minor key with a creepy tritone
        melody: [69, 0, 72, 69, 75, 0, 74, 72, 69, 0, 72, 0, 68, 0, 0, 0,  69, 0, 72, 69, 75, 0, 77, 75, 74, 72, 71, 0, 68, 0, 0, 0],
        bass:   [45, 45, 0, 45, 44, 0, 45, 0, 45, 45, 0, 45, 41, 0, 40, 0,  45, 45, 0, 45, 44, 0, 45, 0, 41, 41, 0, 41, 40, 0, 40, 0] },
    night: { bpm: 140, lead: 'sawtooth',   // Monster Night in Paradise — fast and spooky
        melody: [62, 0, 65, 62, 69, 0, 68, 0, 62, 0, 65, 0, 61, 0, 0, 0,  62, 0, 65, 62, 70, 69, 68, 0, 65, 64, 61, 0, 62, 0, 0, 0],
        bass:   [38, 38, 0, 38, 37, 0, 38, 0, 38, 38, 0, 38, 34, 0, 33, 0,  38, 38, 0, 38, 37, 0, 38, 0, 34, 34, 0, 34, 33, 0, 37, 0] },
    secret: { bpm: 100, lead: 'triangle',   // sparkly treasure music
        melody: [84, 88, 91, 88, 96, 0, 91, 0, 86, 89, 93, 89, 98, 0, 93, 0,  84, 88, 91, 96, 95, 91, 88, 0, 86, 91, 95, 98, 96, 0, 0, 0],
        bass:   [48, 0, 55, 0, 52, 0, 55, 0, 50, 0, 57, 0, 53, 0, 57, 0,  48, 0, 55, 0, 52, 0, 55, 0, 55, 0, 50, 0, 48, 0, 0, 0] },
    toy: { bpm: 132, lead: 'square',   // music-box march
        melody: [72, 72, 79, 79, 81, 81, 79, 0, 77, 77, 76, 76, 74, 74, 72, 0,  79, 79, 77, 77, 76, 76, 74, 0, 79, 79, 77, 77, 76, 76, 74, 0],
        bass:   [48, 0, 55, 0, 53, 0, 55, 0, 53, 0, 52, 0, 50, 0, 48, 0,  55, 0, 53, 0, 52, 0, 50, 0, 55, 0, 53, 0, 52, 0, 50, 0] },
    pyramid: { bpm: 108, lead: 'sawtooth',   // mysterious desert
        melody: [62, 63, 66, 67, 69, 0, 67, 66, 63, 0, 62, 0, 0, 0, 0, 0,  62, 63, 66, 67, 70, 69, 67, 66, 67, 0, 63, 62, 0, 0, 0, 0],
        bass:   [38, 0, 0, 38, 0, 0, 38, 0, 38, 0, 0, 38, 0, 0, 37, 0,  38, 0, 0, 38, 0, 0, 38, 0, 38, 0, 0, 38, 0, 0, 37, 0] },
    cloudcity: { bpm: 96, lead: 'triangle',   // light and floaty
        melody: [79, 0, 83, 0, 86, 0, 84, 83, 81, 0, 79, 0, 76, 0, 0, 0,  79, 0, 83, 0, 88, 0, 86, 84, 83, 0, 81, 0, 79, 0, 0, 0],
        bass:   [55, 0, 0, 0, 59, 0, 0, 0, 57, 0, 0, 0, 55, 0, 0, 0,  55, 0, 0, 0, 60, 0, 0, 0, 62, 0, 0, 0, 55, 0, 0, 0] },
    underwater: { bpm: 70, lead: 'sine',   // bubbly and dreamy
        melody: [67, 0, 71, 0, 74, 0, 72, 71, 69, 0, 0, 0, 67, 0, 64, 0,  67, 0, 71, 0, 76, 0, 74, 72, 71, 0, 0, 0, 0, 0, 0, 0],
        bass:   [43, 0, 0, 0, 50, 0, 0, 0, 45, 0, 0, 0, 48, 0, 0, 0,  43, 0, 0, 0, 52, 0, 0, 0, 50, 0, 0, 0, 43, 0, 0, 0] },
    dino: { bpm: 112, lead: 'square',   // stompy
        melody: [60, 0, 60, 63, 0, 65, 0, 63, 60, 0, 58, 0, 60, 0, 0, 0,  60, 0, 60, 63, 0, 67, 0, 65, 63, 0, 60, 0, 58, 0, 0, 0],
        bass:   [36, 36, 0, 36, 0, 36, 0, 0, 34, 34, 0, 34, 0, 34, 0, 0,  36, 36, 0, 36, 0, 36, 0, 0, 39, 39, 0, 39, 34, 0, 0, 0] },
    volcano: { bpm: 150, lead: 'sawtooth',   // hot and fast
        melody: [64, 0, 67, 64, 70, 0, 69, 67, 64, 0, 62, 0, 63, 0, 64, 0,  64, 0, 67, 64, 71, 70, 69, 67, 66, 0, 64, 0, 63, 0, 0, 0],
        bass:   [40, 40, 0, 40, 40, 0, 40, 40, 38, 38, 0, 38, 39, 0, 40, 0,  40, 40, 0, 40, 40, 0, 40, 40, 38, 38, 0, 38, 35, 0, 0, 0] },
    jungle: { bpm: 124, lead: 'triangle',   // bongo-bouncy
        melody: [69, 0, 72, 0, 76, 74, 72, 0, 69, 0, 67, 69, 72, 0, 0, 0,  69, 0, 72, 0, 77, 76, 74, 72, 71, 0, 69, 0, 67, 0, 0, 0],
        bass:   [45, 0, 45, 52, 0, 45, 0, 52, 43, 0, 43, 50, 0, 43, 0, 50,  45, 0, 45, 52, 0, 45, 0, 52, 40, 0, 40, 47, 0, 45, 0, 0] },
    ship: { bpm: 126, lead: 'square',   // sea shanty
        melody: [69, 0, 69, 71, 72, 0, 69, 0, 67, 0, 64, 0, 67, 69, 0, 0,  69, 0, 69, 71, 72, 0, 74, 0, 76, 74, 72, 71, 69, 0, 0, 0],
        bass:   [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 45, 0, 52, 0,  45, 0, 52, 0, 45, 0, 52, 0, 40, 0, 47, 0, 45, 0, 0, 0] },
    candy: { bpm: 140, lead: 'triangle',   // bouncy and sweet
        melody: [72, 76, 79, 76, 81, 79, 76, 72, 74, 77, 81, 77, 84, 81, 77, 74,  72, 76, 79, 84, 83, 79, 76, 74, 72, 0, 79, 0, 84, 0, 0, 0],
        bass:   [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 50, 0, 57, 0,  48, 0, 55, 0, 52, 0, 55, 0, 48, 0, 43, 0, 48, 0, 0, 0] },
    ice: { bpm: 96, lead: 'sine',   // twinkly and cold
        melody: [88, 0, 84, 0, 91, 0, 88, 0, 86, 0, 83, 0, 88, 0, 0, 0,  88, 0, 84, 0, 93, 0, 91, 0, 89, 0, 86, 0, 84, 0, 0, 0],
        bass:   [45, 0, 0, 0, 52, 0, 0, 0, 50, 0, 0, 0, 52, 0, 0, 0,  45, 0, 0, 0, 53, 0, 0, 0, 50, 0, 0, 0, 45, 0, 0, 0] },
    haunted: { bpm: 80, lead: 'sawtooth',   // spooky organ
        melody: [62, 0, 65, 0, 68, 0, 67, 66, 65, 0, 62, 0, 61, 0, 0, 0,  62, 0, 65, 0, 69, 0, 68, 67, 66, 0, 65, 0, 62, 0, 0, 0],
        bass:   [38, 0, 0, 0, 37, 0, 0, 0, 36, 0, 0, 0, 37, 0, 0, 0,  38, 0, 0, 0, 37, 0, 0, 0, 36, 0, 0, 0, 38, 0, 0, 0] },
    sky: { bpm: 118, lead: 'square',   // brave and heroic
        melody: [67, 0, 72, 0, 76, 0, 79, 0, 77, 76, 74, 0, 72, 0, 0, 0,  67, 0, 72, 0, 76, 0, 81, 0, 79, 77, 76, 74, 72, 0, 0, 0],
        bass:   [48, 0, 48, 0, 53, 0, 53, 0, 50, 0, 50, 0, 55, 0, 55, 0,  48, 0, 48, 0, 53, 0, 53, 0, 55, 0, 55, 0, 48, 0, 0, 0] },
    space: { bpm: 100, lead: 'square',   // bleepy synth
        melody: [76, 0, 83, 0, 81, 0, 76, 0, 74, 0, 81, 0, 79, 0, 74, 0,  76, 0, 83, 0, 88, 0, 86, 0, 83, 0, 81, 0, 79, 0, 76, 0],
        bass:   [40, 40, 0, 40, 40, 0, 40, 0, 38, 38, 0, 38, 38, 0, 38, 0,  40, 40, 0, 40, 40, 0, 40, 0, 43, 43, 0, 43, 38, 0, 38, 0] },
    house: { bpm: 90, lead: 'triangle',   // cosy music box
        melody: [76, 0, 79, 0, 84, 0, 83, 79, 81, 0, 77, 0, 79, 0, 0, 0,  76, 0, 79, 0, 84, 0, 86, 84, 83, 0, 79, 0, 81, 0, 0, 0],
        bass:   [48, 0, 0, 0, 52, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0,  48, 0, 0, 0, 52, 0, 0, 0, 50, 0, 0, 0, 53, 0, 0, 0] },
    mall: { bpm: 104, lead: 'triangle',   // shopping music
        melody: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 69, 72, 0, 74, 76, 0,  77, 0, 76, 74, 0, 72, 74, 0, 76, 0, 72, 0, 67, 0, 72, 0],
        bass:   [48, 0, 55, 0, 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0,  41, 0, 48, 0, 45, 0, 52, 0, 43, 0, 50, 0, 48, 0, 0, 0] },
    heaven: { bpm: 72, lead: 'triangle',   // gentle harp
        melody: [72, 76, 79, 84, 79, 76, 72, 0, 74, 77, 81, 86, 81, 77, 74, 0,  76, 79, 84, 88, 84, 79, 76, 0, 77, 81, 84, 89, 84, 81, 77, 0],
        bass:   [48, 0, 0, 0, 55, 0, 0, 0, 50, 0, 0, 0, 57, 0, 0, 0,  52, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 57, 0, 0, 0] },
    underground: { bpm: 76, lead: 'sine',   // slow, drippy and echoey
        melody: [64, 0, 0, 67, 0, 0, 71, 0, 69, 0, 0, 0, 67, 0, 64, 0,  62, 0, 0, 64, 0, 0, 67, 0, 66, 0, 0, 0, 0, 0, 0, 0],
        bass:   [40, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0,  38, 0, 0, 0, 0, 0, 0, 0, 35, 0, 0, 0, 0, 0, 0, 0] },
    paradise: { bpm: 120, lead: 'square', // happy major key
        melody: [67, 71, 74, 71, 76, 74, 71, 74, 72, 76, 79, 76, 74, 71, 67, 0,  67, 71, 74, 79, 78, 76, 74, 71, 72, 74, 76, 74, 71, 0, 67, 0],
        bass:   [43, 0, 50, 0, 48, 0, 50, 0, 45, 0, 52, 0, 50, 0, 43, 0,  43, 0, 50, 0, 47, 0, 50, 0, 48, 0, 50, 0, 50, 0, 43, 0] },
};
let musicStep = 0, nextNoteTime = 0, musicRoom = null;

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Schedules the next few notes a little ahead of time so the music never stutters
function musicTick() {
    if (!audioCtx || muted || !settings.music || paused) return;
    const playing = state.gamePhase === 'playing' && !state.won && !state.levelComplete;
    const songKey = state.room === ROOM.PARADISE && paradise.phase !== 'day' ? 'night' : state.room === ROOM.ARENA ? 'hell'
                  : ({ camp: 'mall', olympus: 'heaven', piratecove: 'ship', chess: 'mall', library: 'underground',
                       greece: 'heaven', maze: 'underground', gorgon: 'underground', underworld: 'hell', viking: 'ship',
                       ...Object.fromEntries(Object.entries(SUBPLACES).map(([id, sp]) => [id, sp.song])), stadium: 'paradise', snowfort: 'ice' })[state.room] || state.room;
    const song = playing ? SONGS[songKey] : null;
    if (!song) { musicRoom = null; return; }
    const now = audioCtx.currentTime;
    if (songKey !== musicRoom || nextNoteTime < now - 0.1) {
        musicRoom = songKey; musicStep = 0; nextNoteTime = now + 0.05;
    }
    const stepDur = 60 / song.bpm / 2;
    while (nextNoteTime < now + 0.2) {
        const i = musicStep % song.melody.length, delay = nextNoteTime - now;
        if (song.melody[i]) tone(midiToFreq(song.melody[i]), stepDur * 0.9, song.lead, 0.07, null, delay, musicGain);
        if (song.bass[i])   tone(midiToFreq(song.bass[i]),   stepDur * 1.8, 'triangle', 0.16, null, delay, musicGain);
        nextNoteTime += stepDur; musicStep++;
    }
}
setInterval(musicTick, 50);

function saveSettings() { try { localStorage.setItem('lop_settings', JSON.stringify(settings)); } catch (e) {} }

function setCreative(on) {
    if (on === settings.creative) return;
    settings.creative = on;
    if (on) { state.coinsBackup = state.coins; }                                   // put your real coins safely aside
    else    { state.coins = state.coinsBackup || 0; state.coinsBackup = undefined; }   // …and give them back
    saveSettings();
    showToast(on ? '🎮 CREATIVE MODE — nothing attacks you and everything is free!' : '⚔ SURVIVAL MODE — watch out, monsters are back!', '#FFE066', 220);
}

function applyUpsideDown() {
    canvas.style.transform = [mod('upsideDown') ? 'rotate(180deg)' : '', mod('mirror') ? 'scaleX(-1)' : ''].join(' ').trim();
}
applyUpsideDown();

function settingsItems() {
    const cycle = (key, order) => () => { settings[key] = order[(order.indexOf(settings[key]) + 1) % order.length]; saveSettings(); };
    const onOff = key => () => { settings[key] = !settings[key]; saveSettings(); };
    const speedName = { slow: 'SLOW', normal: 'NORMAL', fast: 'FAST' };
    return [
        { icon: '🎮', name: 'Game Mode', desc: 'Creative: free stuff, no monsters attack', cost: 0, status: settings.creative ? 'CREATIVE' : 'SURVIVAL',
          action: () => setCreative(!settings.creative) },
        { icon: '😊', name: 'Difficulty', desc: 'Easy +2 hearts · Hard 1 less', cost: 0, status: settings.difficulty.toUpperCase(),
          action: () => { cycle('difficulty', ['easy', 'normal', 'hard'])(); state.playerHp = Math.min(state.playerHp, fullHearts()); } },
        { icon: '🏃', name: 'Your Speed', desc: 'How fast you move', cost: 0, status: speedName[settings.playerSpeed], action: cycle('playerSpeed', ['slow', 'normal', 'fast']) },
        { icon: '👾', name: 'Monster Speed', desc: 'How fast monsters move', cost: 0, status: speedName[settings.monsterSpeed], action: cycle('monsterSpeed', ['slow', 'normal', 'fast']) },
        { icon: '☀', name: 'Day Length', desc: 'Paradise day before night falls', cost: 0, status: { short: '15 s', normal: '30 s', long: '1 min' }[settings.dayLength],
          action: cycle('dayLength', ['short', 'normal', 'long']) },
        { icon: '🕳', name: 'Cave Hiding Time', desc: 'How long caves keep you safe', cost: 0, status: { short: '30 s', normal: '1 min', long: '2 min' }[settings.caveTime],
          action: cycle('caveTime', ['short', 'normal', 'long']) },
        { icon: '🎵', name: 'Music', desc: 'The songs in every place', cost: 0, status: settings.music ? 'ON' : 'OFF', action: onOff('music') },
        { icon: '🔊', name: 'Sound Effects', desc: 'Pew pew, boing, quack…', cost: 0, status: settings.sfx ? 'ON' : 'OFF', action: onOff('sfx') },
        { icon: '🔢', name: 'Damage Numbers', desc: 'Show "-3 SUPER HIT!" numbers', cost: 0, status: settings.damageNumbers ? 'ON' : 'OFF', action: onOff('damageNumbers') },
        { icon: '💬', name: 'Control Hints', desc: 'The help text at the bottom', cost: 0, status: settings.hints ? 'ON' : 'OFF', action: onOff('hints') },
        { icon: '🧩', name: 'MODS', desc: 'Big heads, chickens, disco…', cost: 0, status: `${MODS.filter(m => mod(m.id)).length} ON`,
          action: () => openMenu('🧩 MODS — change how the game works!', modItems) },
        { icon: '💾', name: 'Save Now', desc: 'The game also saves by itself', cost: 0, status: 'SAVE',
          action: () => { saveGame(); saveWorld(); showToast('💾 Saved!', '#88EEFF', 90); } },
        ...(fullscreenOK() ? [{ icon: '⛶', name: 'Full Screen', desc: 'Hide the browser bars', cost: 0, status: inFullscreen() ? 'ON' : 'OFF', action: toggleFullscreen }] : []),
    ];
}

const SETTINGS_MENU_H = 470;   // taller than a normal menu: 13 items, in rows of two
function openSettings() {
    if (state.gamePhase !== 'playing') return;
    if (menu) { menu = null; return; }
    openMenu('⚙ SETTINGS', settingsItems, { h: SETTINGS_MENU_H });
}

// ── TOASTS (big messages at the top of the screen) ───────────
let toast = null;   // { text, color, timer }
function showToast(text, color = '#FFE066', frames = 180) { toast = { text, color, timer: frames }; }
function drawToast() {
    if (!toast) return;
    if (--toast.timer <= 0) { toast = null; return; }
    ctx.save();
    ctx.globalAlpha = Math.min(1, toast.timer / 30);
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
    const w = ctx.measureText(toast.text).width + 30;
    ctx.fillStyle = 'rgba(15,10,30,0.88)'; ctx.fillRect(400 - w / 2, 76, w, 32);
    ctx.strokeStyle = toast.color; ctx.lineWidth = 2; ctx.strokeRect(400 - w / 2, 76, w, 32);
    ctx.fillStyle = toast.color; ctx.fillText(toast.text, 400, 98);
    ctx.restore();
}

// ── AWARDS (achievements — remembered forever, even after a new game) ──
const AWARDS = [
    { id: 'firstKill',   icon: '⚔',  name: 'First Victory',    desc: 'Beat a monster' },
    { id: 'kills100',    icon: '💯', name: 'Monster Master',   desc: 'Beat 100 monsters' },
    { id: 'fish10',      icon: '🐟', name: 'Fishing Pro',      desc: 'Catch 10 fish' },
    { id: 'house',       icon: '🏠', name: 'Home Sweet Home',  desc: 'Buy a house' },
    { id: 'allHouses',   icon: '🏰', name: 'Property King',    desc: 'Own all 3 houses' },
    { id: 'secret',      icon: '✨', name: 'Secret Finder',    desc: 'Find the Secret Golden Room' },
    { id: 'underground', icon: '⛏',  name: 'Deep Digger',      desc: 'Find the Underground Caves' },
    { id: 'rainbow',     icon: '🌈', name: 'Over the Rainbow', desc: 'Get Rainbow Power' },
    { id: 'king',        icon: '👑', name: 'Slime Slayer',     desc: 'Beat the King Slime' },
    { id: 'devil',       icon: '😈', name: 'Devil Beater',     desc: 'Beat the Devil' },
    { id: 'hero',        icon: '🏆', name: 'Hero of Paradise', desc: 'Finish all 3 levels' },
    { id: 'pet',         icon: '🐶', name: 'Best Friends',     desc: 'Get a pet' },
    { id: 'allPets',     icon: '🦁', name: 'Zoo Keeper',       desc: 'Own every pet' },
    { id: 'dance',       icon: '💃', name: 'Dance Party',      desc: 'Do a dance' },
    { id: 'fart10',      icon: '💨', name: 'Stinky!',          desc: 'Fart 10 times' },
    { id: 'ghostking',   icon: '👻', name: 'Ghostbuster',      desc: 'Beat the Ghost King' },
    { id: 'dragon',      icon: '🐉', name: 'Dragon Slayer',    desc: 'Beat the Cave Dragon' },
    { id: 'shadow',      icon: '👤', name: 'Beat Yourself',    desc: 'Beat Shadow You' },
    { id: 'heaven',      icon: '😇', name: 'Heavenly',         desc: 'Visit Heaven' },
    { id: 'builder',     icon: '🧱', name: 'Builder',          desc: 'Place a block' },
    { id: 'crafter',     icon: '⚒',  name: 'Crafter',          desc: 'Craft something' },
    { id: 'diamond',     icon: '💎', name: 'DIAMONDS!',        desc: 'Mine a diamond' },
    { id: 'decorator',   icon: '🛋', name: 'Decorator',        desc: 'Buy every piece of furniture' },
    { id: 'gardener',    icon: '🥕', name: 'Green Fingers',    desc: 'Pick something from your garden' },
    { id: 'student',     icon: '🎓', name: 'Top of the Class', desc: 'Learn a lesson at School' },
    { id: 'hogwarts',    icon: '🦉', name: 'You\'re a Wizard!', desc: 'Get your Hogwarts letter' },
    { id: 'demigod',     icon: '⚡', name: 'Half God',          desc: 'Be born a demigod' },
    { id: 'sorted',      icon: '🎩', name: 'Sorted!',           desc: 'Try on the Sorting Hat' },
    { id: 'potion',      icon: '🧪', name: 'Potion Maker',      desc: 'Mix a potion' },
    { id: 'ringRace',    icon: '⭕', name: 'Ring Racer',        desc: 'Win a Ring Race' },
    { id: 'superFart',   icon: '💨', name: 'SUPER FART',        desc: 'Do a Super Fart' },
    { id: 'chickenRain', icon: '🐔', name: 'Chicken Rain',      desc: 'Catch a falling chicken' },
    { id: 'quest',       icon: '📜', name: 'Hero Quest',        desc: 'Finish a quest at Demigod Camp' },
    { id: 'olympus',     icon: '🏛', name: 'Up on Olympus',     desc: 'Visit Mount Olympus' },
    { id: 'teamUp',      icon: '🤝', name: 'Team-Up!',          desc: 'Do a team-up blast with a friend' },
    { id: 'battle',      icon: '⚔', name: 'Battle Winner',     desc: 'Win a Friend Battle' },
    { id: 'pirateGold',  icon: '🏴‍☠️', name: 'Pirate Gold',     desc: 'Dig up all the treasure on Pirate Island' },
    { id: 'snitch',      icon: '🟡', name: 'Seeker',            desc: 'Catch the Snitch' },
    { id: 'chess',       icon: '♟', name: 'Checkmate!',        desc: 'Win Wizard Chess' },
    { id: 'combo',       icon: '✨', name: 'Magic Combo',       desc: 'Do a magic combo' },
    { id: 'creature',    icon: '🐣', name: 'Creature Keeper',   desc: 'Adopt a magic creature' },
    { id: 'spellbook',   icon: '📕', name: 'Secret Spell Book', desc: 'Find the book in the Haunted Library' },
    { id: 'fleece',      icon: '🐑', name: 'Golden Fleece',     desc: 'Take the Golden Fleece from the Hydra' },
    { id: 'pegasus',     icon: '🪽', name: 'Pegasus Rider',     desc: 'Ride Pegasus' },
    { id: 'maze',        icon: '🐂', name: 'Maze Master',       desc: 'Find the treasure in the Minotaur Maze' },
    { id: 'riddle',      icon: '🦁', name: 'Riddle Solver',     desc: 'Answer the Sphinx\'s riddle' },
    { id: 'viking',      icon: '🛶', name: 'Viking Gold',       desc: 'Open the Viking treasure chest' },
    { id: 'fullGod',     icon: '🌟', name: 'YOU ARE A GOD!',    desc: 'Finish all the Hero Trials' },
    { id: 'gloop',       icon: '👾', name: 'Monster Friend',    desc: 'Make friends with Gloop' },
    { id: 'collector',   icon: '🧺', name: 'Collector',         desc: 'Find all the things in a secret place' },
    { id: 'petCostume',  icon: '🎀', name: 'Fashion Pet',       desc: 'Dress up your pet' },
    { id: 'petBattle',   icon: '🐾', name: 'Pet Champion',      desc: 'Win a Pet Battle' },
    { id: 'builder',     icon: '🔨', name: 'Backyard Builder',  desc: 'Build something in your backyard' },
    { id: 'royal',       icon: '🏰', name: 'King of the Castle', desc: 'Sit on your castle throne' },
    { id: 'rollercoaster', icon: '🎢', name: 'Wheee!',          desc: 'Ride your rollercoaster' },
    { id: 'secretRoom',  icon: '🕵', name: 'Secret Agent',      desc: 'Find the secret room in your house' },
    { id: 'miniGame',    icon: '🎪', name: 'Game Champ',        desc: 'Win a mini-game' },
    { id: 'mazeRace',    icon: '🌀', name: 'Maze Racer',        desc: 'Finish a Maze Race in time' },
    { id: 'goal',        icon: '⚽', name: 'GOOOAL!',           desc: 'Score a goal' },
    { id: 'burp',        icon: '🫢', name: 'Excuse Me!',        desc: 'Do a big burp (U)' },
    { id: 'sneeze',      icon: '🤧', name: 'Bless You!',        desc: 'Sneeze everyone away (I)' },
    { id: 'superhero',   icon: '🦸', name: 'Super Hero',        desc: 'Wear the Super Hero Suit' },
    { id: 'timeTravel',  icon: '⏰', name: 'Time Traveller',    desc: 'Use the Time Machine' },
    { id: 'season',      icon: '🎃', name: 'Happy Holidays',    desc: 'Find a Halloween pumpkin or Christmas present' },
    { id: 'secretEnding', icon: '🌟', name: 'THE SECRET ENDING', desc: 'Only the very best players find it…' },
    { id: 'hat',         icon: '🎩', name: 'Hat Fan',          desc: 'Buy a hat' },
    { id: 'party',       icon: '🎂', name: 'Party Time',       desc: 'Wish someone Happy Birthday' },
    { id: 'petMaster',   icon: '⭐', name: 'Pet Trainer',      desc: 'Get a pet to Level 5' },
    { id: 'race',        icon: '🏁', name: 'Champion!',        desc: 'Win a pet race' },
    { id: 'sailor',      icon: '⛵', name: 'Sailor',           desc: 'Sail the Pirate Ship' },
    { id: 'explorer',    icon: '🗺', name: 'Explorer',         desc: 'Visit all 5 adventure places' },
    { id: 'secretDoor',  icon: '🚪', name: 'Secret Door',      desc: 'Find the Haunted House secret' },
    { id: 'frostgiant',  icon: '❄', name: 'Giant Slayer',     desc: 'Beat the Frost Giant' },
    { id: 'thunderbird', icon: '⚡', name: 'Storm Chaser',     desc: 'Beat the Thunder Bird' },
    { id: 'mothership',  icon: '🛸', name: 'Space Hero',       desc: 'Beat the Alien Mothership' },
    { id: 'miner',       icon: '⛏', name: 'Miner',            desc: 'Dig up the ground' },
    { id: 'bossRush',    icon: '⚔', name: 'Boss Rush Champ',  desc: 'Beat every boss in a row (and the MEGA BOSS!)' },
    { id: 'treasure',    icon: '💰', name: 'Treasure Hunter',  desc: 'Follow a treasure map to the end' },
    { id: 'wizard',      icon: '🪄', name: 'Little Wizard',    desc: 'Buy a magic power' },
    { id: 'rider',       icon: '🐴', name: 'Giddy Up!',        desc: 'Buy a ride' },
    { id: 'diver',       icon: '🟡', name: 'Deep Diver',       desc: 'Dive in the submarine' },
    { id: 'octopus',     icon: '🐙', name: 'Octopus Boss',     desc: 'Beat the Giant Octopus' },
    { id: 'dinoRider',   icon: '🦕', name: 'Dino Rider',       desc: 'Tame a Triceratops' },
    { id: 'firedragon',  icon: '🔥', name: 'Dragon Tamer',     desc: 'Beat the Fire Dragon' },
    { id: 'idol',        icon: '🗿', name: 'Idol Hunter',      desc: 'Grab the Golden Idol' },
    { id: 'wizard',      icon: '🧙', name: 'Wizard Beater',    desc: 'Beat the Evil Wizard' },
    { id: 'mummyking',   icon: '🏺', name: 'Pharaoh Beater',   desc: 'Beat the Mummy King' },
    { id: 'candymonster',icon: '🍬', name: 'Sugar Rush',       desc: 'Beat the Candy Monster' },
    { id: 'bigBrother',  icon: '😈', name: 'REAL Hero',        desc: "Beat the Devil's Big Brother" },
    { id: 'pyramidSecret', icon: '🏺', name: 'Tomb Raider',    desc: 'Find a secret pyramid room' },
    { id: 'eggs',        icon: '🐣', name: 'Egg Finder',       desc: "Return Mama Bird's eggs" },
    { id: 'combo',       icon: '👊', name: 'Combo Kid',        desc: 'Do a punch-punch-KICK combo' },
    { id: 'parry',       icon: '🛡', name: 'Perfect Parry',    desc: 'Parry or counter an attack' },
    { id: 'perfectDodge',icon: '⏳', name: 'Matrix Mode',      desc: 'Do a perfect dodge' },
    { id: 'modder',      icon: '🧩', name: 'Game Modder',      desc: 'Turn on a mod' },
    { id: 'party4',      icon: '👨‍👩‍👧‍👦', name: 'Party of 4',       desc: 'Play with 4 players' },
    { id: 'groundPound', icon: '💥', name: 'Ground Pounder',   desc: 'Jump and ground pound' },
    { id: 'weaponMaster',icon: '🗡', name: 'Weapon Master',    desc: 'Buy a fighting weapon' },
    { id: 'banana',      icon: '🍌', name: 'Slippery!',        desc: 'Make a monster slip on a peel' },
];
let awards = { got: {}, kills: 0, fish: 0, farts: 0 };
try { awards = Object.assign(awards, JSON.parse(localStorage.getItem('lop_awards')) || {}); } catch (e) {}

function saveAwards() { try { localStorage.setItem('lop_awards', JSON.stringify(awards)); } catch (e) {} }

function giveAward(id) {
    if (awards.got[id]) return;
    awards.got[id] = true;
    saveAwards();
    const a = AWARDS.find(a => a.id === id);
    showToast(`🏅 AWARD: ${a.icon} ${a.name}!`, '#FFD700', 220);
    addScore(50);
    sfx('found');
}

// Counts things like monsters beaten, and hands out the awards for them
function countStat(stat) {
    awards[stat]++;
    saveAwards();
    if (stat === 'kills') { giveAward('firstKill'); if (awards.kills >= 100) giveAward('kills100'); }
    if (stat === 'fish' && awards.fish >= 10)  giveAward('fish10');
    if (stat === 'farts' && awards.farts >= 10) giveAward('fart10');
}

// ── SAVING ────────────────────────────────────────────────────
const SAVE_KEY    = 'lop_save';
const SAVE_FIELDS = ['level', 'lightCrystals', 'paradiseClearCount', 'power', 'powerTier', 'playerHp', 'coins',
                     'unlockedSkins', 'activeSkin', 'bubble', 'score', 'housesOwned', 'ammoBonus', 'ownedPets', 'activePet',
                     'ownedGadgets', 'gadget', 'hasDash', 'weaponLevel', 'inv', 'armor', 'diamondPickaxe',
                     'furniture', 'garden', 'lessons', 'hats', 'hat', 'petXp', 'placesSeen', 'gotStarterBlocks', 'treasure',
                     'spells', 'spell', 'mounts', 'mount', 'lastMount', 'bouncy', 'melee', 'ownedMelee', 'hogwarts', 'demigod', 'house', 'quest', 'questsDone', 'wand', 'wands', 'creature', 'creatureFood', 'trials', 'fleece', 'fullGod', 'gloop', 'petCostume', 'petCostumes', 'yard', 'magicGarden', 'farmAt', 'mirrorShield', 'saberColor', 'heroSuit', 'hotbar', 'job'];
let savedGame = null;
try { savedGame = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}

function saveGame() {
    if (state.gamePhase !== 'playing' || state.won) return;
    savedGame = Object.fromEntries(SAVE_FIELDS.map(k => [k, state[k]]));
    if (settings.creative) savedGame.coins = state.coinsBackup || 0;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(savedGame)); } catch (e) {}
}

function clearSave() {
    savedGame = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// Leaving the title screen: carry on from the save if there is one
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

// "New Game" would erase the save, so ask first (a plain two-choice menu works with keys, taps and a controller)
function askNewGame() {
    if (!savedGame) { startFromIntro(true); return; }
    openMenu('Start over? Your game will be erased.', () => [
        { icon: '💾', name: 'Keep my game', desc: 'Go back', cost: 0, status: null, action: () => { menu = null; } },
        { icon: '✦',  name: 'Start over',   desc: 'Erase it and begin again', cost: 0, status: null, action: () => { menu = null; startFromIntro(true); } },
    ], { hint: byInput('Arrows + SPACE to choose', 'Tap to choose', 'A to choose, B to go back'), h: 190 });
}

function startFromIntro(fresh = false) {
    if (fresh || !savedGame) {
        if (fresh) { clearSave(); worldBlocks = {}; saveWorld(); }
        state.gamePhase = 'playing';
        showToast(byInput('⛏ Like Minecraft: SPACE or left-click mines, B builds, right-click places blocks!',
                          '⛏ Like Minecraft: tap 🧱, then tap the ground to mine and place blocks!',
                          '⛏ Like Minecraft: A mines, click the left stick to build and place blocks!'), '#FFE066', 300);
        rollBirthLuck();
        return;
    }
    const data = savedGame;
    resetGame();
    Object.assign(state, JSON.parse(JSON.stringify(data)));
    state.gamePhase = 'playing';
    while (state.ownedPets.length < PETS.length) state.ownedPets.push(false);   // pets added since you saved
    state.petXp = state.petXp || [];
    if (!state.gotStarterBlocks) {
        state.gotStarterBlocks = true;
        state.inv = state.inv || {};
        for (const [k, v] of Object.entries({ dirt: 10, planks: 10, stone: 5, glass: 5 })) state.inv[k] = (state.inv[k] || 0) + v;
    }
    while (state.petXp.length < PETS.length) state.petXp.push(0);
    state.hotbar = Math.max(0, Math.min(HOTBAR.length - 1, Math.floor(Number(state.hotbar)) || 0));   // old saves have none; a bad one must not crash the build code
    const cfg = LEVEL_CONFIGS[state.level - 1];
    state.ammoMax = cfg.ammoMax + state.ammoBonus;
    state.ammo    = state.ammoMax;
    hell = makeHell(); paradise = makeParadise(); voidRoom = makeVoidRoom();
    paradise.chests.forEach((c, i) => { if (i < state.paradiseClearCount) { c.visible = true; c.opened = true; } });
    restoreJob();
    changeRoom(ROOM.VOID);
    showToast(`💾 Welcome back! Level ${state.level}, 🪙${state.coins}`, '#88EEFF');
    if (state.demigod === undefined) rollBirthLuck();   // saves from before this get one roll too
}

// ── SCORE ─────────────────────────────────────────────────────
let highScore = 0;
try { highScore = parseInt(localStorage.getItem('lop_highscore'), 10) || 0; } catch (e) {}

function addScore(points) {
    state.score += points;
    if (state.score > highScore) {
        highScore = state.score;
        state.newBest = true;
        try { localStorage.setItem('lop_highscore', String(highScore)); } catch (e) {}
    }
}

