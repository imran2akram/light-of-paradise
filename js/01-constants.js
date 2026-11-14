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

// ── SECRET ROOMS ─────────────────────────────────────────────
// A super-rare golden portal sometimes appears → the Secret Golden Room.
// Dig all the way to the bottom of a dig spot → a tunnel to the Underground Caves.
const SECRET_PORTAL_CHANCE = 0.06;   // super rare — and almost invisible until you're close
const SECRET_REVEAL_DIST   = 110;    // how close you must be to see the golden portal clearly
const RAINBOW_CHANCE       = 0.03;   // chance the bottom of a dig spot (or the Secret Room) has Rainbow Power — very rare!
const RAINBOW_WISH_CHANCE  = 0.1;    // even a Heaven wish only works 1 time in 10
const GOLDEN_PORTAL_SPOTS  = { void: { x: 400, y: 205 }, hell: { x: 250, y: 450 }, paradise: { x: 250, y: 275 }, heaven: { x: 620, y: 470 } };
const GEM_HITS             = 3;    // presses to mine a gem in the Underground Caves
const POWER = { NONE: 'None', ICE: 'Ice', BRIMSTONE: 'Brimstone', LIGHTNING: 'Lightning', WATER: 'Water', RAINBOW: 'Rainbow' };

// ── WEAPONS ──────────────────────────────────────────────────
const WEAPON_INFO = {
    None:      { label: 'SMITING STICK', icon: '🪵', color: '#C8964F', speed: 0, size: 0 },   // before you find an element: a swung branch
    Ice:       { label: 'ICE',           icon: '❄', color: '#4488FF', speed: 9,  size: 6 },
    Brimstone: { label: 'FIRE',          icon: '🔥', color: '#FF4422', speed: 9,  size: 6 },
    Lightning: { label: 'LIGHTNING',     icon: '⚡', color: '#FFE033', speed: 13, size: 5 },   // fastest shots
    Water:     { label: 'WATER',         icon: '💧', color: '#33CCDD', speed: 8,  size: 8 },   // biggest shots
    Rainbow:   { label: 'RAINBOW POWER', icon: '🌈', color: '#FF66FF', speed: 10, size: 7 },
};

// ── BAD GUYS ─────────────────────────────────────────────────
// Every weapon hurts every bad guy a little; the weapon it's weak to hurts a LOT.
// Your weapon also shields you from the bad guys it's strong against.
const ENEMY_TYPES = {
    fire:  { name: 'Fire Monster', hp: 3, weakTo: POWER.ICE,       color: '#FF6600' },
    ghost: { name: 'Ghost',        hp: 3, weakTo: POWER.BRIMSTONE, color: '#CC88FF' },
    bat:   { name: 'Bat',          hp: 3, weakTo: POWER.LIGHTNING, color: '#9966CC' },
    slime: { name: 'Slime',        hp: 3, weakTo: POWER.WATER,     color: '#66DD44' },
    mole:  { name: 'Mole Monster', hp: 3, weakTo: POWER.WATER,     color: '#C08040' },
    king:  { name: 'King Slime',   hp: 15, weakTo: POWER.WATER,    color: '#44CC22' },   // Monster Night 3 boss
    worm:  { name: 'Lava Worm',    hp: 3, weakTo: POWER.ICE,       color: '#FF5500' },   // Hell: burrows and pops up
    imp:   { name: 'Mini-Devil',   hp: 3, weakTo: POWER.LIGHTNING, color: '#DD2222' },   // Hell: summoned by the Devil
    spider:    { name: 'Spider',     hp: 3,  weakTo: POWER.BRIMSTONE, color: '#442244' },  // Underground: drops from the ceiling
    robot:     { name: 'Robot',      hp: 4,  weakTo: POWER.WATER,     color: '#8899AA' },  // Paradise nights: marches in lines
    ghostking: { name: 'Ghost King', hp: 14, weakTo: POWER.BRIMSTONE, color: '#DDAAFF' },  // Monster Night 2 boss: turns invisible
    dragon:    { name: 'Cave Dragon',hp: 22, weakTo: POWER.ICE,       color: '#AA3355' },  // Underground boss: breathes fire
    shadow:    { name: 'Shadow You', hp: 6,  weakTo: POWER.LIGHTNING, color: '#442266' },  // Hell: copies your every move
    zombie:    { name: 'Zombie',     hp: 4,  weakTo: POWER.BRIMSTONE, color: '#6A9A5A' },  // Paradise nights & Underground
    creeper:   { name: 'Creeper',    hp: 3,  weakTo: POWER.ICE,       color: '#4CAF50' },  // hisss… BOOM!
    pirate:    { name: 'Pirate',     hp: 4,  weakTo: POWER.LIGHTNING, color: '#8A4A2A' },  // Pirate Ship
    gummy:     { name: 'Gummy Bear', hp: 3,  weakTo: POWER.BRIMSTONE, color: '#FF4466' },  // Candy Land
    snowman:   { name: 'Snowman',    hp: 4,  weakTo: POWER.BRIMSTONE, color: '#FFFFFF' },  // Ice Kingdom
    frostgiant:{ name: 'Frost Giant',hp: 30, weakTo: POWER.BRIMSTONE, color: '#9AD8FF' },  // Ice Kingdom boss
    skeleton:  { name: 'Skeleton',   hp: 4,  weakTo: POWER.LIGHTNING, color: '#EEEEDD' },  // Haunted House
    thunderbird:{ name: 'Thunder Bird', hp: 30, weakTo: POWER.ICE,    color: '#FFE033' },  // Sky Castle boss
    alien:     { name: 'Alien',      hp: 3,  weakTo: POWER.ICE,       color: '#66FF66' },  // Space
    mothership:{ name: 'Alien Mothership', hp: 30, weakTo: POWER.LIGHTNING, color: '#AABBCC' },  // Space boss
    shark:     { name: 'Shark',      hp: 4,  weakTo: POWER.LIGHTNING, color: '#7A8A9A' },  // Underwater
    jellyfish: { name: 'Jellyfish',  hp: 2,  weakTo: POWER.ICE,       color: '#FF99DD' },  // Underwater (zappy!)
    octopus:   { name: 'Giant Octopus', hp: 35, weakTo: POWER.LIGHTNING, color: '#AA4488' },  // Underwater boss
    raptor:    { name: 'Raptor',     hp: 4,  weakTo: POWER.ICE,       color: '#8AA04A' },  // Dinosaur Island
    lavablob:  { name: 'Lava Blob',  hp: 3,  weakTo: POWER.WATER,     color: '#FF5522' },  // Volcano
    firedragon:{ name: 'Fire Dragon',hp: 35, weakTo: POWER.WATER,     color: '#DD3311' },  // Volcano boss
    monkey:    { name: 'Monkey',     hp: 3,  weakTo: POWER.LIGHTNING, color: '#8A5A2A' },  // Jungle: steals coins!
    windup:    { name: 'Wind-up Mouse', hp: 3, weakTo: POWER.WATER,   color: '#AAAAAA' },  // Toy Land: zooms, then winds up
    toysoldier:{ name: 'Toy Soldier', hp: 4, weakTo: POWER.BRIMSTONE, color: '#CC2222' },  // Toy Land: marches and pops corks
    wizard:    { name: 'Evil Wizard', hp: 35, weakTo: POWER.LIGHTNING, color: '#7A3ACC' }, // Toy Land boss: teleports, chicken spell!
    mummy:     { name: 'Mummy',      hp: 5,  weakTo: POWER.BRIMSTONE, color: '#E8DCC0' },  // Pyramid
    scarab:    { name: 'Scarab Beetle', hp: 2, weakTo: POWER.ICE,     color: '#2A6A6A' },  // Pyramid: fast little beetles
    mummyking: { name: 'Mummy King', hp: 35, weakTo: POWER.BRIMSTONE, color: '#FFD700' },  // Pyramid boss
    candymonster:{ name: 'Candy Monster', hp: 30, weakTo: POWER.BRIMSTONE, color: '#FF66AA' }, // Candy Land boss: splits into jelly beans
    jellybean: { name: 'Jelly Bean', hp: 1,  weakTo: POWER.BRIMSTONE, color: '#FF3388' },
    bigdevil:  { name: "The Devil's Big Brother", hp: 45, weakTo: POWER.LIGHTNING, color: '#442266' },  // the secret final boss
    // Drawn with a big emoji (see drawEmojiEnemy)
    book:      { name: 'Flying Book',  hp: 2,  weakTo: POWER.BRIMSTONE, color: '#AA7744', emoji: '📖' },  // Haunted Library
    pawn:      { name: 'Chess Pawn',   hp: 2,  weakTo: POWER.LIGHTNING, color: '#333333', emoji: '♟' },   // Wizard Chess
    knight:    { name: 'Chess Knight', hp: 4,  weakTo: POWER.ICE,       color: '#333333', emoji: '♞' },
    rook:      { name: 'Chess Castle', hp: 5,  weakTo: POWER.WATER,     color: '#333333', emoji: '♜' },
    queen:     { name: 'Chess Queen',  hp: 25, weakTo: POWER.LIGHTNING, color: '#333333', emoji: '♛' },   // Wizard Chess boss
    hydra:     { name: 'The Hydra',    hp: 30, weakTo: POWER.BRIMSTONE, color: '#3A8A4A', emoji: '🐲' },   // Greek Island boss: cut a head, two grow back!
    hydrahead: { name: 'Hydra Head',   hp: 2,  weakTo: POWER.BRIMSTONE, color: '#3A8A4A', emoji: '🐍' },
    medusa:    { name: 'Medusa',       hp: 28, weakTo: POWER.LIGHTNING, color: '#6A9A5A' },   // her stare turns you to stone! (drawn by drawMedusa)
    minotaur:  { name: 'The Minotaur', hp: 30, weakTo: POWER.ICE,       color: '#8A5A3A', emoji: '🐂' },   // lives in the maze
    cerberus:  { name: 'Cerberus',     hp: 32, weakTo: POWER.WATER,     color: '#442222', emoji: '🐕' },   // three-headed guard dog of the Underworld
    troll:     { name: 'Troll',        hp: 6,  weakTo: POWER.BRIMSTONE, color: '#6A7A5A', emoji: '🧌' },   // Viking Island
    megarobot: { name: 'Giant Robot',  hp: 35, weakTo: POWER.WATER,     color: '#8899AA', emoji: '🤖' },   // Toy Land boss
    kraken:    { name: 'The Kraken',   hp: 35, weakTo: POWER.LIGHTNING, color: '#AA3366', emoji: '🦑' },   // attacks the ship sometimes!
    yeti:      { name: 'The Yeti',     hp: 30, weakTo: POWER.BRIMSTONE, color: '#FFFFFF', emoji: '❄' },    // Ice Kingdom (drawn by hand)
    zombieking:{ name: 'Zombie King',  hp: 30, weakTo: POWER.BRIMSTONE, color: '#6A9A5A', emoji: '🧟', crown: true },   // Haunted House
    alienqueen:{ name: 'Alien Queen',  hp: 32, weakTo: POWER.ICE,       color: '#66FF66', emoji: '👽', crown: true },   // Space
    lasershark:{ name: 'Laser Shark',  hp: 20, weakTo: POWER.LIGHTNING, color: '#7A8A9A', emoji: '🦈' },   // Underwater: LASER EYES
    spiderqueen:{ name: 'Spider Queen', hp: 30, weakTo: POWER.BRIMSTONE, color: '#442244', emoji: '🕷', crown: true },  // Jungle Temple
    megaboss:  { name: 'Mega Boss',     hp: 80, weakTo: POWER.RAINBOW,  color: '#AA00AA', emoji: '👹' },   // every boss glued together!
    minizombie:{ name: 'Zombie',       hp: 3,  weakTo: POWER.BRIMSTONE, color: '#6A9A5A', emoji: '🧟' },
    babyalien: { name: 'Baby Alien',   hp: 2,  weakTo: POWER.ICE,       color: '#66FF66', emoji: '👾' },
    babyspider:{ name: 'Baby Spider',  hp: 1,  weakTo: POWER.BRIMSTONE, color: '#442244', emoji: '🕷' },
    chocoblob: { name: 'Choco Blob',   hp: 3,  weakTo: POWER.ICE,       color: '#6A3A1A', emoji: '🍫' },   // Candy Volcano
    giant:     { name: 'Cloud Giant',  hp: 14, weakTo: POWER.LIGHTNING, color: '#C8A080', emoji: '🧔' },   // Cloud Castle
    minibot:   { name: 'Mini Bot',     hp: 3,  weakTo: POWER.WATER,     color: '#8899AA', emoji: '🤖' },   // Robot Factory
    snake:     { name: 'Snake',        hp: 2,  weakTo: POWER.ICE,       color: '#4A8A3A', emoji: '🐍' },   // Treehouse Village
    dustbunny: { name: 'Dust Bunny',   hp: 2,  weakTo: POWER.WATER,     color: '#AAAAAA', emoji: '🐰', filter: 'grayscale(1) brightness(0.8)' },   // under your bed
    bedmonster:{ name: 'Monster Under the Bed', hp: 24, weakTo: POWER.LIGHTNING, color: '#6A3A8A', emoji: '👹' },
    bonesaur:  { name: 'Skeleton Raptor', hp: 4, weakTo: POWER.BRIMSTONE, color: '#EEEEDD', emoji: '🦖', filter: 'grayscale(1) brightness(1.5)' },   // Museum at night
    bonerex:   { name: 'Skeleton T-Rex', hp: 30, weakTo: POWER.BRIMSTONE, color: '#EEEEDD', emoji: '🦖', filter: 'grayscale(1) brightness(1.6)' },
    knight:    { name: 'Knight',       hp: 4,  weakTo: POWER.LIGHTNING, color: '#AAAAAA', emoji: '🤺' },   // Time Machine: Knights & Castles
    dragonking:{ name: 'Dragon King',  hp: 32, weakTo: POWER.ICE,       color: '#AA2222', emoji: '🐉', crown: true },
    ant:       { name: 'Giant Ant',    hp: 2,  weakTo: POWER.WATER,     color: '#442222', emoji: '🐜' },   // Micro World
    snowkid:   { name: 'Snowball Kid', hp: 3,  weakTo: POWER.BRIMSTONE, color: '#AADDFF', emoji: '🧒' },   // Snowball Fight
    penguinpal:{ name: 'Ice Penguin',  hp: 3,  weakTo: POWER.BRIMSTONE, color: '#222233', emoji: '🐧', filter: 'hue-rotate(180deg)' },   // grumpy penguins
};
const CREEPER_FUSE = 50;   // frames of hissing before it explodes
const SHADOW_CHANCE = 0.3;   // chance Shadow You is waiting in Hell
const WORM_UNDER_FRAMES  = 150;   // tunnelling toward you (can't be hit)
const WORM_RISE_FRAMES   = 40;    // rumbling — it's about to pop up!
const WORM_UP_FRAMES     = 170;   // out of the ground: spits lava, can be hit
const WORM_SPIT_FRAMES   = 60;
const IMP_SUMMON_FRAMES  = 420;   // the Devil calls a Mini-Devil every 7 s
const KING_MAX_MINIS = 6;   // little slimes the King Slime can have out at once
const DAMAGE_STRONG = 3;   // right weapon for this bad guy
const DAMAGE_WEAK   = 1;   // any other weapon still does a little
const FREEZE_FRAMES       = 120;   // ICE freezes bad guys solid for 2 s
const DEVIL_FREEZE_FRAMES = 30;    // …and the Devil for half a second
const CHAIN_JUMPS         = 2;     // LIGHTNING jumps to this many more bad guys
const CHAIN_RANGE         = 160;   // …if they're this close
const HEART_DROP_CHANCE   = 0.2;   // defeated bad guys sometimes drop a heart
const COINS_PER_KILL      = 2;     // beating bad guys is the only way to find coins
const BASE_SPEED = 4;

// ── LEVEL CONFIGURATIONS ─────────────────────────────────────
const LEVEL_CONFIGS = [
    { // Level 1 – Standard
        ammoMax: 5, reloadFrames: 180,
        devilHp: 5, devilR: 28, devilSpeed: 0.9, devilShootRate: 110, devilShotsPerFire: 1,
        extraFireMonsters: 0, extraGhosts: 0, worms: 2, maxImps: 1,
        playerMaxHp: 3,
        isBoss: false,
    },
    { // Level 2 – Hard
        ammoMax: 4, reloadFrames: 240,
        devilHp: 10, devilR: 28, devilSpeed: 1.2, devilShootRate: 80,  devilShotsPerFire: 1,
        extraFireMonsters: 1, extraGhosts: 1, worms: 3, maxImps: 2,
        playerMaxHp: 3,
        isBoss: false,
    },
    { // Level 3 – BOSS
        ammoMax: 4, reloadFrames: 270,
        devilHp: 20, devilR: 52, devilSpeed: 1.4, devilShootRate: 55,  devilShotsPerFire: 3,
        extraFireMonsters: 2, extraGhosts: 2, worms: 4, maxImps: 3,
        playerMaxHp: 2,
        isBoss: true,
    },
];
const MAX_LEVELS       = 3;
const DEVIL_BULLET_SPEED = 7.5;   // px/frame (player moves 4)

// ── AVATAR SKINS ─────────────────────────────────────────────
const AVATAR_COLORS      = ['#FFFFFF', '#4488FF', '#44FF66', '#FF4422', '#FFD700', '#2A2A2A', '#B8C4CC', '#44BB55', '#3AB0C0'];
const AVATAR_NAMES       = ['White', 'Blue', 'Green', 'Red', 'Gold', 'Ninja', 'Robot', 'Dragon', 'Blocky'];
const AVATAR_STYLES      = ['plain', 'plain', 'plain', 'plain', 'plain', 'ninja', 'robot', 'dragon', 'blocky'];
const AVATAR_UNLOCK_COST = [0, 5, 10, 15, 20, 25, 30, 40, 0];  // coins needed to unlock each skin (Blocky is crafted)
const SHOP_SKINS         = 8;                                 // skins sold in the shop
const BUBBLE_COST        = 5;                               // Shield Bubble (shop key 9)

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

// ── FIGHTING MOVES ────────────────────────────────────────────
// J / RB / 👊 : tap = punch, punch, KICK! combo · hold = SPIN ATTACK · while moving up = UPPERCUT
//               while dashing = SLIDING KICK · in the air = GROUND POUND · next to a stunned monster = GRAB, again = THROW
// X / LB / 🛡 : hold to BLOCK (block right as you get hit = PARRY / COUNTER)
// C / 🦘      : SUPER JUMP (you can't be hurt in the air)
// Hold SPACE / A / SHOOT : CHARGE SHOT (a giant shot that goes through monsters)
const COMBO_WINDOW   = 26;    // frames to press again to keep the combo going
const SPIN_HOLD      = 30;    // hold the punch button this long for a spin attack
const PARRY_WINDOW   = 12;    // frames after you start blocking when a hit gets parried
const CHARGE_FRAMES  = 45;    // hold the shoot button this long for a charge shot
const JUMP_FRAMES    = 40;
let fight = { combo: 0, since: 99, cooldown: 0, hold: 0, holding: false, blocking: false, blockFrames: 0,
              jump: 0, pound: false, slide: 0, slideHits: null, charge: 0, fx: [] };
let grabbed  = null;   // a monster you're carrying
let slowMo   = 0;      // perfect-dodge slow motion
let frameNo  = 0;

function canFight() { return playing() && !state.buildMode && !(state.chicken > 0); }

// Hit every monster in reach. arc = only in front of you
function meleeHit(radius, dmg, knock, stun, arc = true, air = 0) {
    let hits = 0;
    for (const e of targetableEnemies()) {
        const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
        if (d > radius + e.r) continue;
        if (arc && d > 12 && (dx * state.faceX + dy * state.faceY) / d < 0.1) continue;
        damageEnemy(e, POWER.NONE, false, dmg - 1 + state.weaponLevel - 1);
        hits++;
        if (!e.alive) continue;
        if (knock && d > 0 && !BOSS_TYPES.includes(e.type)) { e.x += dx / d * knock; e.y += dy / d * knock; }
        if (stun) e.stun = Math.max(e.stun || 0, BOSS_TYPES.includes(e.type) ? stun / 3 : stun);
        if (air && !BOSS_TYPES.includes(e.type)) e.air = air;
    }
    // The Devil can be punched too (once you have the crystals)
    const d = hell.devil;
    if (state.room === ROOM.HELL && d.alive && Math.hypot(d.x - player.x, d.y - player.y) < radius + d.r) {
        if (state.lightCrystals >= 3) { d.hp = Math.max(1, d.hp - 1); d.shieldFlash = 15; hits++; } else d.shieldFlash = 20;
    }
    if (hits) { triggerShake(4 + dmg); addComboHits(hits); }
    return hits;
}

function meleeFx(kind, r) { fight.fx.push({ kind, x: player.x, y: player.y, a: Math.atan2(state.faceY, state.faceX), r, life: 12 }); }

// ── SMITING STICK (swung when you have no element yet, or while your element reloads) ──
const STICK_REACH    = 48;   // px past the edge of you — short, so every element feels better
const STICK_COOLDOWN = 20;   // frames between swings
const STICK_DAMAGE   = 1;    // weak on purpose (Weapon Level still adds to it)
const STICK_KNOCK    = 6;
const STICK_ENGAGE   = 110;  // a bad guy this close means the button swings instead of digging the ground

function stickSwing() {
    if (!canFight() || fight.cooldown > 0 || fight.blocking) return;
    // Auto-aim like shoot(): turn to the nearest bad guy that is in reach
    const foes = targetableEnemies().slice();
    if (state.room === ROOM.HELL && hell.devil.alive) foes.push(hell.devil);
    let target = null, best = Infinity;
    for (const e of foes) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d - e.r < STICK_REACH && d < best) { best = d; target = e; }
    }
    if (target && best > 0) { state.faceX = (target.x - player.x) / best; state.faceY = (target.y - player.y) / best; }
    meleeFx('stick', STICK_REACH + 12);
    meleeHit(STICK_REACH, STICK_DAMAGE, STICK_KNOCK, 0);
    sfx('stick');
    fight.cooldown = STICK_COOLDOWN;
}

function meleePress() {
    if (!canFight() || fight.cooldown > 0) return;
    fight.holding = true; fight.hold = 0;
    // Carrying a monster? THROW it!
    if (grabbed) {
        const g = grabbed; grabbed = null;
        g.x = player.x + state.faceX * 20; g.y = player.y + state.faceY * 20;   // throw from in front of you
        g.thrown = { vx: state.faceX * 9, vy: state.faceY * 9, t: 40, hits: new Set() };
        sfx('whoosh'); fight.cooldown = 12; return;
    }
    // Next to a stunned / frozen / tiny monster? GRAB it!
    const grab = targetableEnemies().find(e => !BOSS_TYPES.includes(e.type) && (e.stun > 0 || e.frozen > 0 || e.shrunk > 0 || e.air > 0)
                                          && Math.hypot(e.x - player.x, e.y - player.y) < e.r + 22);
    if (grab) { grabbed = grab; grab.stun = 999; spawnFloatText(grab.x, grab.y - 24, 'GRABBED!', '#FFE066', 40); sfx('bite'); return; }
    if (fight.jump > 0) { fight.pound = true; fight.jump = Math.min(fight.jump, 8); return; }           // ground pound on landing
    if (state.dashTimer > 0) { fight.slide = state.dashTimer + 4; fight.slideHits = new Set(); meleeFx('slide', 30); sfx('whoosh'); return; }   // sliding kick
    const movingUp = keys['KeyW'] || (!p2.active && keys['ArrowUp']) || padMove.y < -0.6 || vTouch.joyDY < -VJOY.maxDist * 0.5;
    if (movingUp) {   // UPPERCUT!
        meleeFx('upper', 44);
        if (meleeHit(44, 3, 20, 45, true, 45)) spawnFloatText(player.x, player.y - 40, 'UPPERCUT!', '#FF8844', 45);
        fight.cooldown = 22; sfx('superHit'); return;
    }
    if (state.melee) { weaponSwing(); return; }   // holding a sword, hammer…
    // Punch, punch, KICK!
    fight.combo = fight.since < COMBO_WINDOW ? fight.combo % 3 + 1 : 1;
    fight.since = 0;
    const kick = fight.combo === 3;
    meleeFx(kick ? 'kick' : 'punch', kick ? 46 : 38);
    meleeHit(kick ? 46 : 38, kick ? 3 : 2, kick ? 60 : 12, kick ? 40 : 0);
    if (kick) { spawnFloatText(player.x, player.y - 40, 'KICK!', '#FFE066', 40); giveAward('combo'); }
    sfx(kick ? 'superHit' : 'hit');
    fight.cooldown = kick ? 16 : 8;
}

// ── FIGHTING WEAPONS (the Blacksmith sells them; they change what your punch button does) ──
const MELEE_WEAPONS = [
    { id: 'sword',     name: 'Sword',     icon: '🗡', cost: 20, desc: 'Long slashes — 3rd slash is HUGE' },
    { id: 'hammer',    name: 'Hammer',    icon: '🔨', cost: 30, desc: 'Slow but SMASHES all around you' },
    { id: 'nunchucks', name: 'Nunchucks', icon: '🥢', cost: 25, desc: 'Super fast hits — keep bashing!' },
    { id: 'spear',     name: 'Spear',     icon: '🔱', cost: 25, desc: 'Pokes far, through a whole line' },
    { id: 'whip',      name: 'Whip',      icon: '〰', cost: 20, desc: 'Reaches really far and pulls them in' },
    { id: 'lightsaber', name: 'Lightsaber', icon: '🔦', cost: 90, desc: 'VWOOM! Fast, glowing and super strong' },
    { id: 'gianthammer', name: 'Giant Hammer', icon: '🔨', cost: 70, desc: 'HUGE smash that shakes the whole room' },
    { id: 'superfist', name: 'Super Fist', icon: '👊', cost: 40, desc: 'Punches send monsters FLYING' },
    { id: 'rubberchicken', name: 'Rubber Chicken', icon: '🐔', cost: 15, desc: 'SQUAWK! Silly but it works' },
];
const SABER_COLORS = ['#44AAFF', '#44FF66', '#FF4444', '#CC66FF'];

// Hit every monster along a straight line in front of you (knock < 0 pulls them in)
function lineHit(len, width, dmg, knock, stun) {
    let hits = 0;
    for (const e of targetableEnemies()) {
        const dx = e.x - player.x, dy = e.y - player.y;
        const along = dx * state.faceX + dy * state.faceY, side = Math.abs(dx * state.faceY - dy * state.faceX);
        if (along < -e.r || along > len + e.r || side > width + e.r) continue;
        damageEnemy(e, POWER.NONE, false, dmg - 1 + state.weaponLevel - 1);
        hits++;
        if (!e.alive) continue;
        if (knock && !BOSS_TYPES.includes(e.type)) {
            const move = knock > 0 ? knock : Math.max(knock, -(along - 30));   // don't pull them right on top of you
            e.x += state.faceX * move; e.y += state.faceY * move;
        }
        if (stun) e.stun = Math.max(e.stun || 0, BOSS_TYPES.includes(e.type) ? stun / 3 : stun);
    }
    if (hits) { triggerShake(3 + dmg); addComboHits(hits); }
    return hits;
}

function weaponSwing() {
    const w = state.melee;
    fight.combo = fight.since < COMBO_WINDOW ? fight.combo + 1 : 1;
    fight.since = 0;
    if (w === 'sword') {
        const big = fight.combo % 3 === 0;
        meleeFx('sword', big ? 64 : 54);
        meleeHit(big ? 64 : 54, big ? 4 : 3, big ? 60 : 18, big ? 30 : 0);
        if (big) spawnFloatText(player.x, player.y - 40, 'MEGA SLASH!', '#DDEEFF', 45);
        sfx(big ? 'superHit' : 'whoosh'); fight.cooldown = big ? 16 : 10;
    } else if (w === 'hammer') {
        meleeFx('hammer', 78);
        if (meleeHit(78, 4, 70, 50, false)) spawnFloatText(player.x, player.y - 40, 'SMASH!', '#C8A070', 45);
        spawnParticles(player.x + state.faceX * 24, player.y + state.faceY * 24 + 10, '#8A6A4A', 14);
        triggerShake(12); sfx('boom'); fight.cooldown = 32;
    } else if (w === 'nunchucks') {
        const flurry = fight.combo % 6 === 0;   // every 6th hit spins all the way round
        meleeFx(flurry ? 'spin' : 'nunchuck', flurry ? 56 : 40);
        meleeHit(flurry ? 56 : 40, flurry ? 2 : 1, flurry ? 30 : 6, flurry ? 25 : 6, !flurry);
        if (flurry) spawnFloatText(player.x, player.y - 40, 'WHA-POW!', '#FFCC44', 40);
        sfx('hit'); fight.cooldown = flurry ? 12 : 5;
    } else if (w === 'spear') {
        meleeFx('spear', 100);
        if (lineHit(100, 10, 3, 30, 10) >= 2) spawnFloatText(player.x, player.y - 40, 'SHISH KEBAB!', '#FFE066', 45);
        sfx('whoosh'); fight.cooldown = 16;
    } else if (w === 'lightsaber') {   // VWOOM
        meleeFx('sword', 62);
        const big = fight.combo % 4 === 0;
        meleeHit(62, big ? 6 : 4, big ? 70 : 25, big ? 40 : 10);
        if (big) spawnFloatText(player.x, player.y - 40, 'VWOOOM!', SABER_COLORS[state.saberColor || 0], 45);
        sfx('zap'); fight.cooldown = 8;
    } else if (w === 'gianthammer') {   // the ground SHAKES
        meleeFx('hammer', 120);
        if (meleeHit(120, 6, 110, 90, false)) spawnFloatText(player.x, player.y - 40, 'MEGA SMASH!!', '#FFAA44', 50);
        for (let k = 0; k < 3; k++) spawnParticles(player.x + state.faceX * 30, player.y + 14, '#8A6A4A', 14);
        triggerShake(22); sfx('boom'); fight.cooldown = 45;
    } else if (w === 'superfist') {
        const big = fight.combo % 3 === 0;
        meleeFx(big ? 'kick' : 'punch', big ? 50 : 42);
        meleeHit(big ? 50 : 42, big ? 6 : 3, big ? 220 : 120, big ? 60 : 20);
        if (big) spawnFloatText(player.x, player.y - 40, 'SUPER PUNCH!', '#FF6644', 50);
        triggerShake(big ? 12 : 4); sfx(big ? 'superHit' : 'hit'); fight.cooldown = big ? 18 : 12;
    } else if (w === 'rubberchicken') {   // SQUAWK!
        meleeFx('sword', 50);
        if (meleeHit(50, 2, 80, 40)) spawnFloatText(player.x, player.y - 40, ['SQUAWK!', 'BAWK BAWK!', 'SQUEAK!', 'BONK!'][fight.combo % 4], '#FFE066', 45);
        tone(1400, 0.1, 'square', 0.12, 700); fight.cooldown = 12;
    } else if (w === 'whip') {
        meleeFx('whip', 140);
        if (lineHit(140, 8, 2, -45, 25)) spawnFloatText(player.x, player.y - 40, 'CRACK!', '#FFAA66', 40);
        sfx('zap'); fight.cooldown = 20;
    }
}

function meleeRelease() {
    if (fight.holding && fight.hold >= SPIN_HOLD && canFight()) {   // SPIN ATTACK!
        meleeFx('spin', 70);
        meleeHit(70, 2, 50, 30, false);
        spawnFloatText(player.x, player.y - 40, 'SPIN ATTACK!', '#88DDFF', 50);
        sfx('whoosh'); fight.cooldown = 30;
    }
    fight.holding = false; fight.hold = 0;
}

function superJump() {
    if (!canFight() || fight.jump > 0) return;
    fight.jump = JUMP_FRAMES; fight.pound = false;
    sfx('boing');
}

function startBlock() { if (canFight() && !fight.blocking) { fight.blocking = true; fight.blockFrames = 0; } }
function stopBlock()  { fight.blocking = false; }

// Charge shots (hold the shoot button)
function chargeRelease() {
    if (fight.charge >= CHARGE_FRAMES && canFight() && state.power !== POWER.NONE) {
        const aim = aimPoint(500), a = Math.atan2(aim.y - player.y, aim.x - player.x);
        const w = WEAPON_INFO[state.power];
        projectiles.push({ x: player.x, y: player.y, dx: Math.cos(a) * 7, dy: Math.sin(a) * 7, color: w.color, power: state.power,
                           life: 110, r: 16, pierce: true, hitSet: new Set(), bonus: 4 });
        triggerShake(8); sfx('boom');
        spawnFloatText(player.x, player.y - 36, 'CHARGE SHOT!', w.color, 50);
    }
    fight.charge = 0;
}

function updateFighting() {
    frameNo++;
    if (slowMo > 0) slowMo--;
    if (fight.cooldown > 0) fight.cooldown--;
    fight.since++;
    if (fight.holding) fight.hold++;
    if (fight.blocking) fight.blockFrames++;
    // Charging a shot while the shoot button is held
    const shootHeld = (keys['Space'] && !menu) || (padPrev[PAD.A]) || vTouch.shootId !== null;
    if (shootHeld && state.power !== POWER.NONE && canFight()) fight.charge++;
    else if (fight.charge > 0) chargeRelease();
    // Super jump: can't be hurt in the air
    if (fight.jump > 0) {
        state.playerInvincible = Math.max(state.playerInvincible, 2);
        if (--fight.jump === 0) {
            if (fight.pound) {   // GROUND POUND!
                fight.pound = false;
                meleeFx('pound', 100);
                meleeHit(100, 3, 70, 40, false);
                triggerShake(16); sfx('boom'); giveAward('groundPound');
                spawnParticles(player.x, player.y + 16, '#8A6A4A', 20);
            } else spawnParticles(player.x, player.y + 16, '#CCCCCC', 6);
        }
    }
    // Sliding kick hits everything you slide through
    if (fight.slide > 0) {
        fight.slide--;
        for (const e of targetableEnemies()) {
            if (fight.slideHits.has(e) || Math.hypot(e.x - player.x, e.y - player.y) > e.r + 24) continue;
            fight.slideHits.add(e); damageEnemy(e, POWER.NONE, false, 1 + state.weaponLevel - 1); if (e.alive) e.stun = 30;
        }
    }
    // A grabbed monster is carried over your head
    if (grabbed) {
        if (!grabbed.alive) grabbed = null;
        else { grabbed.x = player.x; grabbed.y = player.y - 34; grabbed.stun = 999; }
    }
    // Thrown monsters fly and smash into others
    for (const e of targetableEnemies()) {
        if (!e.thrown) continue;
        const th = e.thrown;
        e.x += th.vx; e.y += th.vy; e.stun = 20;
        for (const o of targetableEnemies()) {
            if (o === e || th.hits.has(o) || Math.hypot(o.x - e.x, o.y - e.y) > o.r + e.r) continue;
            th.hits.add(o); damageEnemy(o, POWER.NONE, false, 2); triggerShake(8);
        }
        if (--th.t <= 0 || e.x < 20 || e.x > 780 || e.y < 60 || e.y > 590) {
            e.thrown = null; e.x = Math.max(30, Math.min(770, e.x)); e.y = Math.max(70, Math.min(580, e.y));
            damageEnemy(e, POWER.NONE, false, 1); spawnParticles(e.x, e.y, '#FFFFFF', 10);
        }
    }
    for (let i = fight.fx.length - 1; i >= 0; i--) if (--fight.fx[i].life <= 0) fight.fx.splice(i, 1);
}

function drawFighting() {
    for (const f of fight.fx) {
        ctx.save();
        ctx.globalAlpha = f.life / 12;
        ctx.strokeStyle = f.kind === 'spin' ? '#88DDFF' : f.kind === 'pound' ? '#C8A070' : f.kind === 'upper' ? '#FF8844' : '#FFFFFF';
        ctx.lineWidth = f.kind === 'kick' || f.kind === 'upper' ? 6 : 4; ctx.lineCap = 'round';
        ctx.beginPath();
        if (f.kind === 'sword') { ctx.strokeStyle = '#DDEEFF'; ctx.lineWidth = 7; ctx.shadowColor = '#AACCFF'; ctx.shadowBlur = 10; }
        if (f.kind === 'hammer') { ctx.strokeStyle = '#C8A070'; ctx.lineWidth = 8; }
        if (f.kind === 'stick') {   // a brown branch swinging round in front of you
            ctx.globalAlpha = 1;
            const swing = f.a + 1.1 - (1 - f.life / 12) * 2.2, len = f.r;
            const x1 = f.x + Math.cos(swing) * 14, y1 = f.y + Math.sin(swing) * 14, x2 = f.x + Math.cos(swing) * len, y2 = f.y + Math.sin(swing) * len;
            ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = '#A8773F'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            const bx = x1 + (x2 - x1) * 0.6, by = y1 + (y2 - y1) * 0.6;   // a little twig and leaf
            ctx.strokeStyle = '#6B4423'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(swing - 0.8) * 9, by + Math.sin(swing - 0.8) * 9); ctx.stroke();
            ctx.fillStyle = '#5DBB4A'; ctx.beginPath(); ctx.arc(x2, y2, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = f.life / 12 * 0.6; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;   // whoosh trail
            ctx.beginPath(); ctx.arc(f.x, f.y, len * 0.9, swing - 0.5, swing); ctx.stroke();
            ctx.restore(); continue;
        }
        if (f.kind === 'nunchuck') { ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 3; }
        if (f.kind === 'spear' || f.kind === 'whip') {   // a straight poke / a wiggly whip crack
            const reach = f.r * Math.min(1, (13 - f.life) / 4);
            ctx.strokeStyle = f.kind === 'spear' ? '#D8D8E0' : '#8A5A2A'; ctx.lineWidth = f.kind === 'spear' ? 5 : 3;
            ctx.moveTo(f.x, f.y);
            for (let k = 1; k <= 10; k++) {
                const d = reach * k / 10, wig = f.kind === 'whip' ? Math.sin(k * 1.3 + f.life) * 6 * (k / 10) : 0;
                ctx.lineTo(f.x + Math.cos(f.a) * d - Math.sin(f.a) * wig, f.y + Math.sin(f.a) * d + Math.cos(f.a) * wig);
            }
        }
        else if (f.kind === 'spin' || f.kind === 'pound' || f.kind === 'hammer') ctx.arc(f.x, f.y, f.r * (1.2 - f.life / 24), 0, Math.PI * 2);
        else ctx.arc(f.x, f.y, f.r, f.a - 0.9, f.a + 0.9);
        ctx.stroke();
        ctx.restore();
    }
    if (state.melee && canFight()) {   // the weapon you're holding
        const w = MELEE_WEAPONS.find(m => m.id === state.melee);
        ctx.save();
        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(player.x + (state.faceX >= 0 ? 16 : -16), player.y + 4);
        if (state.faceX < 0) ctx.scale(-1, 1);
        if (state.melee === 'lightsaber') {   // a glowing beam
            const col = SABER_COLORS[state.saberColor || 0];
            ctx.fillStyle = '#888'; ctx.fillRect(-2, -2, 8, 5);
            ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(30, -16); ctx.stroke();
            ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(30, -16); ctx.stroke();
        } else ctx.fillText(w.icon, 0, 0);
        ctx.restore();
    }
    if (fight.blocking) {   // shield in front of you
        const a = Math.atan2(state.faceY, state.faceX);
        ctx.save();
        ctx.strokeStyle = fight.blockFrames <= PARRY_WINDOW ? '#FFFFFF' : '#66AAFF'; ctx.lineWidth = 6; ctx.shadowColor = '#66AAFF'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(player.x, player.y, 26, a - 1.1, a + 1.1); ctx.stroke();
        ctx.restore();
    }
    if (fight.charge > 10 && state.power !== POWER.NONE) {   // a glowing ball charging up
        const k = Math.min(1, fight.charge / CHARGE_FRAMES), c = WEAPON_INFO[state.power].color;
        ctx.save(); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 20 * k; ctx.globalAlpha = 0.5 + k * 0.5;
        ctx.beginPath(); ctx.arc(player.x + state.faceX * 20, player.y + state.faceY * 20, 4 + k * 12, 0, Math.PI * 2); ctx.fill();
        if (k >= 1) { ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(player.x + state.faceX * 20, player.y + state.faceY * 20, 18 + Math.sin(Date.now() / 60) * 3, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
    }
    if (mod('disco')) {   // 🪩 party lights
        const t = Date.now() / 1000;
        for (let k = 0; k < 6; k++) {
            const x = 400 + Math.cos(t * (0.7 + k * 0.2) + k) * 320, y = 320 + Math.sin(t * (0.9 + k * 0.15) + k * 2) * 220;
            const g = ctx.createRadialGradient(x, y, 5, x, y, 120);
            g.addColorStop(0, `hsla(${(k * 60 + t * 90) % 360}, 100%, 60%, 0.35)`); g.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
            ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 240, 240);
        }
    }
    if (mod('rainbow')) { ctx.fillStyle = `hsla(${(Date.now() / 10) % 360}, 100%, 60%, 0.1)`; ctx.fillRect(0, 0, 800, 600); }
    if (slowMo > 0) {
        ctx.fillStyle = 'rgba(200,200,255,0.12)'; ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('⏳ PERFECT DODGE — SLOW MOTION!', 400, 110);
    }
}

// A little counter so the combo counter (and later skills) can hear about hits
function addComboHits(n) { state.lastHits = (state.lastHits || 0) + n; }

