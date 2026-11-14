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

