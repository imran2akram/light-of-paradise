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

// ── MUTE, SOUND EFFECTS AND MUSIC ──────────────────────────
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

