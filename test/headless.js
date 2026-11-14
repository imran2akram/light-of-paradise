// Headless browser stand-in for Light of Paradise.
//
// The game is the <script src> files that index.html loads, in order (js/*.js),
// sharing one global scope with top-level let/const, so test code can't import
// it: loadGame() runs those files the way a browser does (one script at a time,
// in order, so a function declared in a later file is not hoisted into an earlier
// one), then a "driver" script in the same scope, with just enough of a fake
// browser underneath.
//
// If the optional `canvas` npm package (node-canvas) is installed and
// options.realCanvas is set, real 2D contexts are used, so drawing calls that
// throw in a browser (a negative arc radius, a bad gradient) throw here too.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');

// The scripts a page loads, in the page's order: [{ src, file, text }] where src
// is null for an inline <script>. Missing files are listed with text === null.
function pageScripts(htmlFile) {
    const html = fs.readFileSync(htmlFile, 'utf8'), dir = path.dirname(htmlFile), out = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(html))) {
        const src = /\bsrc\s*=\s*["']([^"']+)["']/.exec(m[1]);
        if (!src) { out.push({ src: null, file: htmlFile, text: m[2] }); continue; }
        const file = path.join(dir, src[1]);
        out.push({ src: src[1], file, text: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null });
    }
    return out;
}

// What the page loads is exactly the js/ folder: no missing file, no file loaded
// twice, no js/*.js left out. Returns a list of problems ('' list when fine).
function checkScripts(htmlFile) {
    const problems = [], seen = new Set();
    for (const s of pageScripts(htmlFile)) {
        if (s.src === null) continue;
        if (s.text === null) problems.push('index.html loads a missing file: ' + s.src);
        if (seen.has(s.src)) problems.push('index.html loads ' + s.src + ' more than once');
        seen.add(s.src);
    }
    const jsDir = path.join(path.dirname(htmlFile), 'js');
    if (fs.existsSync(jsDir)) for (const f of fs.readdirSync(jsDir)) {
        if (f.endsWith('.js') && !seen.has('js/' + f)) problems.push('js/' + f + ' exists but index.html does not load it');
    }
    return problems;
}

// patch(source, file) may rewrite each script's source before it runs (e.g. to set a constant)
function loadGame({ driver, seed = 1, realCanvas = false, frames = 0, gameFile = path.join(ROOT, 'index.html'), patch = null }) {
    const scripts = pageScripts(gameFile);
    const missing = scripts.filter(s => s.text === null);
    if (missing.length) throw new Error('index.html loads a missing file: ' + missing.map(s => s.src).join(', '));
    const texts = scripts.map(s => { const t = s.text.endsWith('\n') ? s.text : s.text + '\n'; return patch ? patch(t, s.src) : t; });

    // Seeded Math.random so every run can be replayed
    let s = (seed >>> 0) || 1;
    Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };

    let nodeCanvas = null;
    if (realCanvas) nodeCanvas = require('canvas');

    const gradient = { addColorStop() {} };
    function fakeCtx() {
        const t = { fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', globalAlpha: 1, textAlign: '', textBaseline: '',
                    shadowBlur: 0, shadowColor: '', lineCap: '', lineJoin: '', filter: '', imageSmoothingEnabled: true, globalCompositeOperation: '' };
        return new Proxy(t, {
            get(o, p) {
                if (p in o) return o[p];
                if (p === 'measureText') return () => ({ width: 10 });
                if (p === 'createRadialGradient' || p === 'createLinearGradient' || p === 'createConicGradient') return () => gradient;
                if (p === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
                if (p === 'createPattern') return () => ({});
                return () => {};
            },
            set(o, p, v) { o[p] = v; return true; },
        });
    }
    function makeCanvas() {
        const c = nodeCanvas ? nodeCanvas.createCanvas(800, 600) : { width: 800, height: 600, getContext: fakeCtx };
        c.style = {}; c.listeners = {};
        c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 });
        c.addEventListener = function (n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); };
        c.removeEventListener = () => {}; c.requestFullscreen = () => {}; c.remove = () => {};
        return c;
    }

    const h = { listeners: {}, pads: [], audioTime: 0, rafCb: null, intervals: [], store: {}, seed, frames, realCanvas };
    const gameCanvas = makeCanvas();
    const videoEl = { addEventListener() {}, videoWidth: 640, videoHeight: 360, pause() {}, play() { return Promise.resolve(); } };
    const g = globalThis;
    g.document = {
        getElementById: id => id === 'gameCanvas' ? gameCanvas : id === 'introVideo' ? videoEl : { addEventListener() {}, style: {}, remove() {} },
        createElement: tag => tag === 'canvas' ? makeCanvas() : { style: {}, addEventListener() {} },
        addEventListener(n, f) { (h.listeners[n] = h.listeners[n] || []).push(f); },
        removeEventListener(n, f) { h.listeners[n] = (h.listeners[n] || []).filter(x => x !== f); },
        body: { style: {}, appendChild() {} }, documentElement: { requestFullscreen() {} }, fullscreenElement: null, exitFullscreen() {},
    };
    g.window = g;
    g.innerWidth = 1280; g.innerHeight = 800; g.devicePixelRatio = 1;
    g.addEventListener = (n, f) => { (h.listeners[n] = h.listeners[n] || []).push(f); };
    g.removeEventListener = () => {};
    g.localStorage = { getItem: k => (k in h.store ? h.store[k] : null), setItem: (k, v) => { h.store[k] = String(v); }, removeItem: k => { delete h.store[k]; } };
    Object.defineProperty(g, 'navigator', { value: { getGamepads: () => h.pads, userAgent: 'node', maxTouchPoints: 0 }, configurable: true });   // Node has a read-only navigator
    g.requestAnimationFrame = cb => { h.rafCb = cb; };
    g.setInterval = f => { h.intervals.push(f); return h.intervals.length; };
    g.clearInterval = () => {};
    g.alert = () => {};
    h.fetches = [];
    g.fetch = (url, opts) => { h.fetches.push({ url, opts }); return Promise.resolve({ ok: true }); };   // no network from tests

    // Web Audio: checks the same argument rules a browser enforces
    const chk = (v, t) => { if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError(`non-finite audio param ${v} @ ${t}`); if (t < 0) throw new RangeError('negative audio time'); };
    class Param { constructor() { this.value = 0; } setValueAtTime(v, t) { chk(v, t); } exponentialRampToValueAtTime(v, t) { chk(v, t); if (v <= 0) throw new RangeError('exponential ramp to 0 or negative'); } linearRampToValueAtTime(v, t) { chk(v, t); } setTargetAtTime() {} cancelScheduledValues() {} }
    const node = () => ({ connect() {}, disconnect() {}, start(t) { if (t !== undefined && !Number.isFinite(t)) throw new TypeError('bad start time'); }, stop(t) { if (!Number.isFinite(t)) throw new TypeError('bad stop time'); },
                          frequency: new Param(), gain: new Param(), detune: new Param(), Q: new Param(), playbackRate: new Param(), type: '', buffer: null });
    g.AudioContext = class { constructor() { this.state = 'running'; this.sampleRate = 44100; this.destination = {}; } get currentTime() { return h.audioTime; } resume() { this.state = 'running'; } suspend() { this.state = 'suspended'; }
                             createGain() { return node(); } createOscillator() { return node(); } createBufferSource() { return node(); } createBiquadFilter() { return node(); }
                             createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; } };
    g.__h = h;
    g.canvasListeners = gameCanvas.listeners;

    // each script on its own, like <script> tags: top-level let/const are shared, function hoisting is not
    texts.forEach((t, i) => vm.runInThisContext(t, { filename: scripts[i].src || 'inline-' + i + '.js' }));
    vm.runInThisContext(driver, { filename: 'driver.js' });
    return h;
}

// Parse "--seed 3 --frames 50000 --canvas" style arguments
function parseArgs(argv, defaults) {
    const out = { ...defaults };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--canvas') out.realCanvas = true;
        else if (a === '--game') out.gameFile = argv[++i];   // test another copy of index.html
        else if (a.startsWith('--')) out[a.slice(2)] = Number(argv[++i]);
    }
    return out;
}

module.exports = { loadGame, parseArgs, pageScripts, checkScripts };
