// ── CORE: CANVAS, SCREEN FIT, INTRO VIDEO, SMALL HELPERS ───
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── SCREEN SIZE ───────────────────────────────────────────────
// The game always thinks in 800×600. The canvas is stretched to fill the
// window (keeping its shape), and drawn with more real pixels on big or
// sharp screens so it stays crisp instead of blurry.
// On a phone the window is much wider than 4:3, so the canvas grows sideways into the spare room:
// the game stays in the middle (0..800) and the touch buttons sit out in the side margins, off the picture.
// Everything is fitted inside the safe area, so a notch or home bar never covers a button.
const GAME_W = 800, GAME_H = 600;
const MAX_RENDER_SCALE = 3;   // more than this gets slow on big 4K screens
const MAX_VIEW_W = 1500;      // the widest picture (very wide phones): more margin than this is just black bars
const PHONE_MAX_SIDE = 600;   // a touch screen whose short side is under this is a phone: held upright it asks to be turned
let renderScale = 1;
let isTouchDevice = false;    // set by the first touch
let gameReady = false;        // false while this script is still loading (pausing needs the rest of it)
// view: how wide the canvas is in game pixels (w), how far the game is pushed in from the left (offX),
// and CSS pixels per game pixel (fit). Desktop: w = 800, offX = 0.
const view = { w: GAME_W, offX: 0, fit: 1, margin: false };
let layoutDirty = true;       // the touch buttons are placed again before they are next drawn or tapped
let needTurn = false;         // a phone is held upright

function usesTouchLayout() {
    return isTouchDevice || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
}
function safeInsets() {   // the body padding is env(safe-area-inset-*): read back as real pixels
    const out = { l: 0, r: 0, t: 0, b: 0 };
    try {
        const cs = window.getComputedStyle(document.body);
        out.l = parseFloat(cs.paddingLeft) || 0;  out.r = parseFloat(cs.paddingRight) || 0;
        out.t = parseFloat(cs.paddingTop) || 0;   out.b = parseFloat(cs.paddingBottom) || 0;
    } catch (e) { /* no styles (tests): no insets */ }
    return out;
}

function fitCanvas() {
    const sa = safeInsets();
    const availW = Math.max(1, window.innerWidth - sa.l - sa.r), availH = Math.max(1, window.innerHeight - sa.t - sa.b);
    const fit = Math.min(availW / GAME_W, availH / GAME_H);
    view.fit = fit;
    view.w = usesTouchLayout() ? Math.max(GAME_W, Math.min(MAX_VIEW_W, availW / fit)) : GAME_W;
    view.offX = (view.w - GAME_W) / 2;
    view.margin = view.offX > 0;
    canvas.style.width  = Math.floor(view.w * fit) + 'px';
    canvas.style.height = Math.floor(GAME_H * fit) + 'px';
    renderScale = Math.max(1, Math.min(MAX_RENDER_SCALE, fit * (window.devicePixelRatio || 1)));
    canvas.width  = Math.round(view.w * renderScale);
    canvas.height = Math.round(GAME_H * renderScale);
    layoutDirty = true;
    // A phone held upright is too small to play on: the game waits behind a "turn me" message
    const turn = usesTouchLayout() && window.innerHeight > window.innerWidth && Math.min(window.innerWidth, window.innerHeight) < PHONE_MAX_SIDE;
    if (turn !== needTurn) {
        needTurn = turn;
        const el = document.getElementById('turnPhone');
        if (el) el.style.display = turn ? 'flex' : 'none';
        if (gameReady) { if (turn) pauseGame(); else resumeGame(); }
    }
}
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', fitCanvas);
fitCanvas();

// ── VIDEO INTRO ───────────────────────────────────────────────
const VOID_BG_COLOR = '#a0a0a0';   // light grey, darker than the white player

const introVideo = (function setupVideoIntro() {
    const overlay = document.getElementById('videoOverlay');
    const video   = document.getElementById('introVideo');
    const hint    = document.getElementById('skipHint');
    let dismissed = false;

    function dismiss() {
        initAudio();   // a tap or key press: the moment browsers allow sound (does nothing twice)
        if (dismissed) return;
        dismissed = true;
        document.removeEventListener('keydown', onKey);
        overlay.style.opacity = '0';
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }

    video.addEventListener('ended',   dismiss);
    overlay.addEventListener('click',      dismiss);
    overlay.addEventListener('touchstart', e => { e.preventDefault(); dismiss(); }, { passive: false });
    overlay.addEventListener('touchend',   e => { e.preventDefault(); initAudio(); }, { passive: false });   // (iOS counts the lift as the tap)
    function onKey(e) {
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        e.preventDefault(); e.stopImmediatePropagation();   // (that press only skips the video: it must not also start the game)
        dismiss();
    }
    document.addEventListener('keydown', onKey);

    // Fallback: if video fails to load/play, still dismiss after a short wait
    video.addEventListener('error', () => setTimeout(dismiss, 100));

    // The game's controller code uses this: any button skips, and the hint names the controller
    return {
        isUp: () => !dismissed,
        dismiss,
        setHint(controller) { hint.textContent = controller ? 'Press any button to skip' : 'Tap, click, or press SPACE, ENTER or any button to skip'; },
    };
})();

// ── CONSTANTS ────────────────────────────────────────────────
const ROOM  = { VOID: 'void', HELL: 'hell', PARADISE: 'paradise', SECRET: 'secret', UNDERGROUND: 'underground', HEAVEN: 'heaven', HOUSE: 'house',
                SHIP: 'ship', CANDY: 'candy', ICE: 'ice', HAUNTED: 'haunted', SKY: 'sky', SPACE: 'space', ARENA: 'arena', MALL: 'mall',
                UNDERWATER: 'underwater', DINO: 'dino', VOLCANO: 'volcano', JUNGLE: 'jungle',
                TOY: 'toy', PYRAMID: 'pyramid', CLOUDCITY: 'cloudcity', CAMP: 'camp', OLYMPUS: 'olympus', PIRATECOVE: 'piratecove', CHESS: 'chess', LIBRARY: 'library',
                GREECE: 'greece', MAZE: 'maze', GORGON: 'gorgon', UNDERWORLD: 'underworld', VIKING: 'viking',
                CANDYVOLCANO: 'candyvolcano', SEACITY: 'seacity', MOONBASE: 'moonbase', CLOUDCASTLE: 'cloudcastle', ICECAVE: 'icecave',
                TREEHOUSE: 'treehouse', FACTORY: 'factory', TOYSHOP: 'toyshop', MUSEUM: 'museum', UNDERBED: 'underbed',
                BACKYARD: 'backyard', SECRETROOM: 'secretroom', STADIUM: 'stadium', SNOWFORT: 'snowfort', MEDIEVAL: 'medieval', MICROWORLD: 'microworld' };
const MAIN_ROOMS = [ROOM.VOID, ROOM.HELL, ROOM.PARADISE, ROOM.HEAVEN];   // where mystery portals can take you

// ── READABLE TEXT ────────────────────────────────────────────
// Anything a child has to read is at least MIN_READ_FONT px. fitText() shrinks text to fit a space, but never below that
// (past it the letters are squeezed instead of getting tiny).
const MIN_READ_FONT = 12;
function fitText(text, x, y, maxW, px = 14, bold = false) {
    let size = px;
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`;
    while (size > MIN_READ_FONT && ctx.measureText(text).width > maxW) { size--; ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`; }
    ctx.fillText(text, x, y, maxW);   // (maxW squeezes it only if even the smallest size is too wide)
}
// Split text into at most maxLines lines that fit maxW (the last line is squeezed if it still does not)
function wrapText(text, maxW, maxLines) {
    const words = String(text).split(' '), lines = [];
    let line = '';
    for (const w of words) {
        const tryLine = line ? line + ' ' + w : w;
        if (line && ctx.measureText(tryLine).width > maxW && lines.length < maxLines - 1) { lines.push(line); line = w; }
        else line = tryLine;
    }
    lines.push(line);
    return lines;
}

// ── DRAW HELPERS ──────────────────────────────────────────────
function drawStar(x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const b = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * r,          y + Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(b) * (r * 0.4),  y + Math.sin(b) * (r * 0.4));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawCoins(coinList) {
    const t = Date.now() / 300;
    for (const c of coinList) {
        if (c.picked) continue;
        if (mod('cheese')) { ctx.save(); ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧀', c.x, c.y + Math.sin(t + c.x * 0.1) * 3); ctx.restore(); continue; }
        ctx.save();
        ctx.fillStyle   = '#FFD700';
        ctx.shadowColor = '#FFAA00';
        ctx.shadowBlur  = 8 + Math.sin(t + c.x) * 4;
        ctx.beginPath();
        ctx.arc(c.x, c.y + Math.sin(t + c.x * 0.1) * 3, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF8';
        ctx.beginPath();
        ctx.arc(c.x - 2, c.y - 2 + Math.sin(t + c.x * 0.1) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

