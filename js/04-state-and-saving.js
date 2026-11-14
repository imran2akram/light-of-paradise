// ── STATE ────────────────────────────────────────────────────
let state = {
    room:               ROOM.VOID,
    lightCrystals:      0,
    power:              POWER.NONE,
    powerTier:          1,         // 1 normal · 2 super · 3 rainbow (deeper digs = higher tier)
    won:                false,
    levelComplete:      false,     // true when current level beaten (but more levels remain)
    screenShake:        0,
    playerFlash:        0,
    gamePhase:          'intro',   // 'intro' | 'playing'
    playerHp:           3,
    playerInvincible:   0,
    confettiSpawned:    false,
    paradiseClearCount: 0,         // how many crystals collected (0–3)
    voidHealTimer:      0,         // counts frames toward next +1 HP heal in Void
    // Level / progression
    level:              1,
    // Ammo
    ammo:               5,
    ammoMax:            5,
    ammoReloading:      false,
    ammoReloadTimer:    0,
    // Cave timer
    caveTimer:          0,
    caveProtectionExpired: false,
    // Coins & shop
    coins:              0,
    shopOpen:           false,
    shopCursor:         0,         // highlighted shop item (for controllers)
    awardsOpen:         false,
    danceTimer:         0,
    fartCooldown:       0,
    digAnim:            0,         // frames left of the shovel swing
    unlockedSkins:      [true, ...Array(AVATAR_COLORS.length - 1).fill(false)],
    activeSkin:         0,
    bubble:             false,     // Shield Bubble from the shop — blocks one hit
    // Paradise Island town
    job:                null,      // current job from a job giver (see makeJob)
    housesOwned:        {},        // e.g. { cottage: true }
    ammoBonus:          0,         // extra ammo from the Blacksmith
    // Pets
    ownedPets:          PETS.map(() => false),
    activePet:          -1,        // index into PETS, -1 = no pet
    petXp:              PETS.map(() => 0),   // pets get stronger as they fight
    // Forge
    ownedGadgets:       {},        // e.g. { bomb: true }
    gadget:             null,      // id of the gadget you're holding
    melee:              null,      // fighting weapon in your hand (null = fists)
    ownedMelee:         {},
    arrowKind:          0,
    gadgetCooldown:     0,
    hasDash:            false,
    dashTimer:          0,
    dashCooldown:       0,
    weaponLevel:        1,
    faceX:              1,         // last direction you moved (for dashing / throwing)
    walkPhase:          0,         // swings your arms and legs while you walk
    // Minecraft-style building
    buildMode:          false,
    hotbar:             0,         // which block you're holding
    inv:                { dirt: 10, planks: 10, stone: 5, glass: 5 },   // blocks and materials you've collected (you start with a few)
    armor:              0,         // +hearts from crafted armor
    diamondPickaxe:     false,
    heavenWishes:       3,
    placesSeen:         {},
    treasure:           null,      // { spots, step, hits } while you follow a treasure map
    spells:             {},        // magic powers bought at the Magic Shop
    spell:              null,      // the one you're holding
    spellCooldown:      0,
    mounts:             {},        // rides bought at the Stable
    mount:              null,      // what you're riding right now
    lastMount:          null,
    gotStarterBlocks:   true,
    // Island life
    furniture:          { bed: true },   // what's in your house
    chicken:            0,               // frames left as a chicken 🐔
    lessonHealTimer:    0,
    garden:             [0, 0, 0, 0],    // when each pot was planted (Date.now()), 0 = empty
    lessons:            {},              // School lessons you've learned
    hogwarts:           false,           // got your Hogwarts letter 🦉
    demigod:            undefined,       // god parent id, null = a normal kid, undefined = not rolled yet
    godCooldown:        0,
    godTurn:            0,               // which of your two god powers is next
    house:              null,            // Hogwarts house from the Sorting Hat
    quest:              null,            // { kind, need, got } from the Demigod Camp quest board
    wand:               'oak',           // 🪄 from the Hogwarts Wand Shop
    wands:              {},
    creature:           null,            // 🐣 magic creature you look after
    creatureFood:       0,               // 0-100, goes down slowly
    trials:             {},              // ⚡ hero trials beaten (hydra, minotaur, medusa, cerberus)
    fleece:             false,           // 🐑 the Golden Fleece
    fullGod:            false,           // finished every hero trial!
    stoned:             0,               // 🗿 frames left as a statue
    gloop:              0,               // 👾 cookies given to Gloop (3 = best friends)
    petCostume:         null,            // 🐾 what your pet is wearing
    yard:               {},              // 🏡 things you've built in the backyard
    magicGarden:        [0, 0, 0],       // when each magic plant was planted (Date.now()), 0 = empty
    farmAt:             0,               // when you last collected from the farm
    mirrorShield:       false,           // 🪞 blocking bounces bullets back
    heroSuit:           null,            // 🦸 null = not bought, 'on' / 'off'
    saberColor:         0,
    petCostumes:        {},
    questsDone:         0,
    invisible:          0,               // 🧪 potion timers
    giant:              0,
    tiny:               0,
    hats:               {},              // hats you own
    hat:                null,            // hat you're wearing
    houseFrom:          null,            // which house door you went in by
    faceY:              0,
    // Score
    score:              0,
    newBest:            false,     // beat the high score this game
};

// ── PLAYER ───────────────────────────────────────────────────
const player = { x: 400, y: 300, w: 32, h: 32 };

// ── DYNAMIC LISTS ─────────────────────────────────────────────
let projectiles      = [];
let enemyProjectiles = [];
let particles        = [];
let floatTexts       = [];   // "-3 SUPER HIT!" numbers that float up
let lastDevilLaugh   = 0;    // Date.now() of the Devil's last laugh
let heartPickups     = [];   // hearts dropped by defeated bad guys
let bolts            = [];   // chain-lightning zaps between bad guys

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

// ── NEW GAME AND STARTING ──────────────────────────────────
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

// ── RESET AND NEXT LEVEL ───────────────────────────────────
function resetGame() {
    const cfg = LEVEL_CONFIGS[0];
    pendingRespawn = false;
    Object.assign(state, {
        room: ROOM.VOID, lightCrystals: 0, power: POWER.NONE, powerTier: 1,
        won: false, levelComplete: false, screenShake: 0, playerFlash: 0,
        gamePhase: 'intro', playerHp: cfg.playerMaxHp, playerInvincible: 0,
        confettiSpawned: false, paradiseClearCount: 0, voidHealTimer: 0,
        level: 1,
        ammo: cfg.ammoMax, ammoMax: cfg.ammoMax, ammoReloading: false, ammoReloadTimer: 0,
        caveTimer: 0, caveProtectionExpired: false,
        coins: 0, shopOpen: false,
        unlockedSkins: [true, ...Array(AVATAR_COLORS.length - 1).fill(false)], activeSkin: 0,
        bubble: false, score: 0, newBest: false, coinsBackup: undefined,
        job: null, housesOwned: {}, ammoBonus: 0,
        ownedPets: PETS.map(() => false), activePet: -1, petXp: PETS.map(() => 0),
        ownedGadgets: {}, gadget: null, gadgetCooldown: 0, melee: null, ownedMelee: {}, arrowKind: 0, hasDash: false, dashTimer: 0, dashCooldown: 0, weaponLevel: 1,
        buildMode: false, hotbar: 0, inv: { dirt: 10, planks: 10, stone: 5, glass: 5 }, armor: 0, diamondPickaxe: false,
        furniture: { bed: true }, garden: [0, 0, 0, 0], lessons: {}, hats: {}, hat: null, houseFrom: null, placesSeen: {}, treasure: null,
        spells: {}, spell: null, spellCooldown: 0, mounts: {}, mount: null, lastMount: null,
        hogwarts: false, demigod: undefined, godCooldown: 0, godTurn: 0, house: null, invisible: 0, giant: 0, tiny: 0, quest: null, questsDone: 0, wand: 'oak', wands: {}, creature: null, creatureFood: 0, trials: {}, fleece: false, fullGod: false, stoned: 0, gloop: 0, petCostume: null, petCostumes: {}, yard: {}, magicGarden: [0, 0, 0], farmAt: 0, mirrorShield: false, saberColor: 0, heroSuit: null,
    });
    player.x = 400; player.y = 300;
    hell             = makeHell();
    paradise         = makeParadise();
    voidRoom         = makeVoidRoom();
    projectiles      = [];
    enemyProjectiles = [];
    particles        = [];
    floatTexts       = [];
    heartPickups     = [];
    bolts            = [];
}

function advanceLevel() {
    if (state.level >= MAX_LEVELS) {
        giveAward('hero');
        clearSave();
        // True final win — game complete
        state.won = true;
        state.levelComplete = false;
        if (!state.confettiSpawned) { state.confettiSpawned = true; spawnConfetti(); }
        return;
    }
    state.level++;
    const cfg = LEVEL_CONFIGS[state.level - 1];
    Object.assign(state, {
        room: ROOM.VOID, lightCrystals: 0, power: POWER.NONE, powerTier: 1,
        won: false, levelComplete: false, screenShake: 0, playerFlash: 0,
        gamePhase: 'playing', playerHp: cfg.playerMaxHp + state.armor, playerInvincible: 0,
        confettiSpawned: false, paradiseClearCount: 0, voidHealTimer: 0,
        ammo: cfg.ammoMax + state.ammoBonus, ammoMax: cfg.ammoMax + state.ammoBonus, ammoReloading: false, ammoReloadTimer: 0,
        caveTimer: 0, caveProtectionExpired: false,
        shopOpen: false, job: null,
    });
    player.x = 400; player.y = 300;
    hell             = makeHell();
    paradise         = makeParadise();
    voidRoom         = makeVoidRoom();
    projectiles      = [];
    enemyProjectiles = [];
    particles        = [];
    floatTexts       = [];
    heartPickups     = [];
    bolts            = [];
}

