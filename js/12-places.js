// ── ADVENTURE PLACES ──────────────────────────────────────────
// ⛵ Sail from Paradise (talk to Captain Salty) to Candy Land, the Ice Kingdom or the Haunted House.
// ☁ Climb the cloud stairs in Heaven to the Sky Castle.  🚀 Take the rocket in the Void to Space.
const VOYAGE_FRAMES = 1200;   // 20 s at sea
const CAPTAIN = { id: 'captain', name: 'Captain Salty', x: 705, y: 545, coat: '#1A2A5A', hat: 'captain' };
const DOCK    = { x: 70, y: 540 };    // on each island: sail back to Paradise
const SKY_STAIRS = { x: 650, y: 170 };   // in Heaven
const ROCKET  = { x: 70, y: 470 };    // in the Void

const e0 = (type, x, y, extra = {}) => ({ type, x, y, r: 15, hp: ENEMY_TYPES[type].hp, maxHp: ENEMY_TYPES[type].hp, alive: true,
                                           hitFlash: 0, frozen: 0, dx: 0, dy: 0, emerge: 40, hopTimer: 0,
                                           home: { x, y, dx: extra.dx || 0, dy: extra.dy || 0 }, ...extra });
const PLACES = {
    ship:    { name: '⛵ THE PIRATE SHIP', spawn: [400, 420],
               make: () => ({ enemies: [], coins: [], voyage: VOYAGE_FRAMES, waveTimer: 120 }) },
    candy:   { name: '🍭 CANDY LAND', spawn: [120, 470], island: true,
               make: () => ({ coins: [],
                   enemies: [...[0, 1, 2, 3, 4, 5].map(i => e0('gummy', 200 + (i % 3) * 200, 150 + Math.floor(i / 3) * 220, { hue: i * 60, hopTimer: i * 12 })),
                             e0('candymonster', 620, 420, { r: 38, coinDrop: 25, hopTimer: 60 })],
                   lollipops: [0, 1, 2, 3, 4].map(i => ({ x: 150 + i * 130, y: 120 + (i % 2) * 330, picked: false })) }) },
    ice:     { name: '❄ THE ICE KINGDOM', spawn: [120, 470], island: true,
               make: () => ({ coins: [],
                   enemies: [e0('snowman', 250, 200), e0('snowman', 550, 180), e0('snowman', 450, 430),
                             e0('frostgiant', 620, 300, { r: 40, coinDrop: 20, stompTimer: 160 })] }) },
    haunted: { name: '👻 THE HAUNTED HOUSE', spawn: [120, 470], island: true,
               make: () => ({ coins: [],
                   enemies: [e0('ghost', 300, 200), e0('ghost', 600, 300), e0('skeleton', 450, 250), e0('skeleton', 350, 420), e0('skeleton', 650, 450)],
                   secret: Math.floor(Math.random() * 3), secretOpen: false, treasureTaken: false }) },
    sky:     { name: '☁ THE SKY CASTLE', spawn: [400, 520],
               make: () => ({ coins: [],
                   enemies: [e0('bat', 200, 200, { dx: 2, dy: 1 }), e0('bat', 600, 250, { dx: -2, dy: 1.2 }),
                             e0('thunderbird', 400, 170, { r: 34, coinDrop: 20, zapTimer: 120, t: 0 })] }) },
    space:   { name: '🚀 OUTER SPACE', spawn: [190, 470],
               make: () => ({ coins: [],
                   enemies: [e0('alien', 300, 380), e0('alien', 500, 420), e0('alien', 650, 360),
                             e0('mothership', 400, 130, { r: 44, coinDrop: 20, beamTimer: 140, dropTimer: 300 })] }) },
};
// ⚔ BOSS RUSH: every boss, one after another (the gate is in the Void)
const ARENA_GATE  = { x: 270, y: 545 };
const ARENA_EXIT  = { x: 400, y: 578 };
const BOSS_TYPES  = ['king', 'ghostking', 'frostgiant', 'thunderbird', 'dragon', 'mothership', 'octopus', 'firedragon',
                     'wizard', 'mummyking', 'candymonster', 'bigdevil', 'queen', 'hydra', 'medusa', 'minotaur', 'cerberus',
                     'megarobot', 'kraken', 'yeti', 'zombieking', 'alienqueen', 'lasershark', 'spiderqueen', 'megaboss', 'bedmonster', 'bonerex', 'dragonking'];
const BOSS_RUSH   = [
    () => e0('king',        400, 250, { r: 40, coinDrop: 5 }),
    () => e0('ghostking',   400, 220, { r: 34, coinDrop: 5, phase: 0 }),
    () => e0('frostgiant',  400, 250, { r: 40, coinDrop: 5, stompTimer: 160 }),
    () => e0('thunderbird', 400, 200, { r: 34, coinDrop: 5, zapTimer: 120, t: 0 }),
    () => e0('dragon',      600, 300, { r: 40, coinDrop: 5, breath: 150, dy: 0.6 }),
    () => e0('mothership',  400, 130, { r: 44, coinDrop: 5, beamTimer: 140, dropTimer: 300 }),
];
BOSS_RUSH.push(() => e0('megaboss', 400, 220, { r: 46, coinDrop: 50, moveTimer: 120, move: 0, gazeTimer: 9999 }));   // 👹 the final boss
PLACES.arena = { name: '⚔ BOSS RUSH ARENA', spawn: [400, 470],
                 make: () => ({ enemies: [], coins: [], wave: 0, rest: 150, done: false }) };

function updateArena() {
    const A = place();
    if (A.done) return;
    const bossAlive = A.enemies.some(e => e.alive && BOSS_TYPES.includes(e.type));
    if (bossAlive) return;
    if (A.wave >= BOSS_RUSH.length) {   // beat them all!
        A.done = true;
        A.enemies.forEach(e => { e.alive = false; });
        addScore(500); giveAward('bossRush');
        showToast('🏆 YOU BEAT THE BOSS RUSH! You are a CHAMPION! 🏆', '#FFD700', 300);
        sfx('win'); spawnConfettiAt(400, 300);
        return;
    }
    if (--A.rest > 0) return;
    const boss = BOSS_RUSH[A.wave++]();
    A.enemies.push(boss);
    A.rest = 150;
    if (state.playerHp < fullHearts()) state.playerHp++;   // a little heal between bosses
    showToast(`⚔ BOSS ${A.wave}/${BOSS_RUSH.length}: THE ${ENEMY_TYPES[boss.type].name.toUpperCase()}!`, '#FF8866', 180);
    sfx('laugh');
}

function paintArena(g, R) {
    g.fillStyle = '#C8A870'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${140 + R() * 60},${110 + R() * 40},70,0.5)`; g.fillRect(R() * 800, R() * 600, 3, 2); }   // sand
    g.strokeStyle = 'rgba(120,80,40,0.5)'; g.lineWidth = 4; g.beginPath(); g.ellipse(400, 330, 330, 230, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8A7A6A'; g.fillRect(0, 46, 800, 40);                       // stands full of cheering crowd
    for (let x = 6; x < 800; x += 12) { g.fillStyle = `hsl(${R() * 360}, 60%, 55%)`; g.beginPath(); g.arc(x, 60 + (x % 24 ? 0 : 8), 5, 0, Math.PI * 2); g.fill(); }
    for (const px of [20, 780]) { g.fillStyle = '#9A8A7A'; g.fillRect(px - 16, 86, 32, 514); }   // pillars
}

// 🏬 THE MALL (a door in the Void): shops in a row, each opens a pop-up store
const MALL_DOOR  = { x: 140, y: 128 };   // in the Void
const MALL_EXIT  = { x: 400, y: 578 };
const CHART_SIGN = { x: 480, y: 505 };   // in the Void: a sign you walk up to for the weapon chart
const MALL_SHOPS = [
    { id: 'magic',  name: '✨ MAGIC SHOP', keeper: 'Merlin', x: 140, awning: '#6A3AAA', coat: '#3A2A9A', hat: 'wizard', items: () => spellItems(), title: "✨ MERLIN'S MAGIC SHOP" },
    { id: 'stable', name: '🐴 STABLE',     keeper: 'Rita',   x: 300, awning: '#8A5A2A', coat: '#6A8A3A', hat: 'cowboy', items: () => mountItems(), title: "🐴 RITA'S STABLE — pick a ride!" },
    { id: 'toys',   name: '🧸 TOY SHOP',   keeper: 'Tilly',  x: 460, awning: '#E04A8A', coat: '#FF88CC', hat: 'party',  title: '🧸 TILLY\'S TOY SHOP',
      items: () => [{ icon: '🚪', name: 'Step into TOY LAND', desc: 'Toys come alive… and an Evil Wizard!', cost: 0, status: 'GO!',
                      action: () => { menu = null; changeRoom(ROOM.TOY); showToast('🧸 Whoa! You shrank down into TOY LAND!', '#FFE066', 200); } },
                    ...['robodog', 'goose'].map(id => {   // pets that don't fit in the Void shop
                        const j = PETS.findIndex(pt => pt.id === id), pt = PETS[j];
                        return { icon: PET_EMOJI[id][0], name: pt.name, desc: pt.power, cost: pt.cost,
                                 status: state.activePet === j ? 'WITH YOU' : state.ownedPets[j] ? 'OWNED — pick' : null,
                                 action: () => {
                                     if (state.ownedPets[j]) { state.activePet = j; placePetBesidePlayer(); return; }
                                     if (spend(pt.cost)) { state.ownedPets[j] = true; state.activePet = j; placePetBesidePlayer(); giveAward('pet'); showToast(`🐾 Your new ${pt.name}!`, '#FFE066', 160); }
                                 } };
                    })] },
    { id: 'camp',   name: '⛺ DEMIGOD CAMP', keeper: 'Coach', x: 620, awning: '#E0A030', coat: '#C06020', hat: 'cowboy', title: '⛺ DEMIGOD CAMP',
      items: () => [{ icon: '⛺', name: 'Go to Demigod Camp', desc: godParent() ? 'Quests, training and the stairs to Olympus!' : 'Only demigods can go in…', cost: 0,
                      status: godParent() ? 'GO!' : 'LOCKED',
                      action: () => {
                          if (!godParent()) { showToast('⛺ Only demigods can go in! (1 in 100 new games are born one)', '#FFAA88', 200); return; }
                          menu = null; changeRoom(ROOM.CAMP); showToast('⛺ Welcome to Demigod Camp, hero!', '#FFE066', 200);
                      } }] },
];
PLACES.mall = { name: '🏬 THE MALL', spawn: [400, 500], make: () => ({ enemies: [], coins: [] }) };
// Demigod Camp, Mount Olympus and Pirate Island (their code is in the WORLD 2 section)
// ⚡ Greek Island and its secret places (code in the HEROES section)
PLACES.greece = { name: '🏛 THE GREEK ISLAND', spawn: [120, 470], island: true,
    make: () => ({ coins: [], enemies: [e0('hydra', 600, 230, { r: 36, coinDrop: 30, nextSplit: 24 }), e0('hydrahead', 420, 300, { r: 13 })] }) };
PLACES.maze = { name: '🐂 THE MINOTAUR MAZE', spawn: [48, 528],
    make: () => ({ coins: [], won: false, enemies: [e0('minotaur', 600, 200, { r: 26, coinDrop: 30, chargeTimer: 200, charge: 0, emerge: 0 })] }) };
PLACES.gorgon = { name: '🐍 MEDUSA\'S TEMPLE', spawn: [400, 520],
    make: () => ({ coins: [], enemies: [e0('medusa', 400, 200, { r: 30, coinDrop: 30, gazeTimer: 260 }), e0('hydrahead', 250, 300, { r: 13 }), e0('hydrahead', 550, 300, { r: 13 })] }) };
PLACES.underworld = { name: '💀 THE UNDERWORLD', spawn: [400, 520],
    make: () => ({ coins: [], enemies: [e0('skeleton', 200, 250), e0('skeleton', 600, 250), e0('skeleton', 400, 350), e0('cerberus', 400, 170, { r: 34, coinDrop: 30, fireTimer: 150 })] }) };
PLACES.viking = { name: '🛶 VIKING ISLAND', spawn: [120, 470], island: true,
    make: () => ({ coins: [], chestOpen: false,
                   enemies: [e0('troll', 300, 250), e0('troll', 550, 400), e0('troll', 650, 200), e0('frostgiant', 450, 170, { r: 40, coinDrop: 25, stompTimer: 160 })] }) };
PLACES.chess = { name: '♟ WIZARD CHESS', spawn: [400, 540],
    make: () => ({ coins: [], won: false,
                   enemies: [...[0, 1, 2, 3, 4, 5].map(i => e0('pawn', 150 + i * 100, 220, { r: 16 })),
                             e0('knight', 150, 130, { r: 18 }), e0('knight', 650, 130, { r: 18 }), e0('rook', 80, 130, { r: 18 }), e0('rook', 720, 130, { r: 18 }),
                             e0('queen', 400, 120, { r: 26, coinDrop: 30 })] }) };
PLACES.library = { name: '📚 THE HAUNTED LIBRARY', spawn: [400, 540],
    make: () => ({ coins: [], bookTaken: false,
                   enemies: [...[0, 1, 2, 3, 4, 5].map(i => e0('book', 120 + i * 110, 160 + (i % 2) * 160, { r: 14 })), e0('ghost', 300, 300), e0('ghost', 550, 420)] }) };
PLACES.camp    = { name: '⛺ DEMIGOD CAMP', spawn: [400, 500], make: () => ({ enemies: [], coins: [] }) };
PLACES.olympus = { name: '🏛 MOUNT OLYMPUS', spawn: [400, 520], make: () => { giveAward('olympus'); return { enemies: [], coins: [], blessed: {} }; } };
PLACES.piratecove = { name: '🏴‍☠️ PIRATE ISLAND', spawn: [120, 470], island: true,
    make: () => ({ coins: [],
                   xs: [[260, 330], [520, 420], [650, 250], [380, 520]].map(([x, y]) => ({ x, y, hits: 0, dug: false })),
                   enemies: [e0('pirate', 300, 250), e0('pirate', 600, 380), e0('pirate', 450, 300), e0('skeleton', 650, 480), e0('skeleton', 200, 380),
                             e0('ghostking', 500, 170, { r: 34, coinDrop: 30, phase: 0 })] }) };


function nearMallShop() {
    if (state.room !== ROOM.MALL) return null;
    return MALL_SHOPS.find(sh => Math.hypot(player.x - sh.x, player.y - 250) < 44) || null;
}

function paintMall(g, R) {
    for (let y = 60; y < 600; y += 40) for (let x = 0; x < 800; x += 40) {   // shiny tiles
        g.fillStyle = (x + y) % 80 ? '#EDE6DA' : '#D8CFC0'; g.fillRect(x, y, 40, 40);
    }
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 30; i++) g.fillRect(R() * 800, 60 + R() * 540, 30, 2);
    g.fillStyle = '#B8A890'; g.fillRect(0, 46, 800, 50);                      // back wall
    for (const [x, y] of [[80, 420], [720, 420], [400, 380]]) {                // potted plants
        g.fillStyle = '#A0522D'; g.fillRect(x - 12, y, 24, 20);
        g.fillStyle = '#3A9A3A'; g.beginPath(); g.arc(x, y - 6, 18, 0, Math.PI * 2); g.fill();
    }
}

function drawMall() {
    const t = Date.now() / 1000;
    for (const sh of MALL_SHOPS) {
        const x = sh.x, w = 120;
        ctx.fillStyle = '#F8F4EC'; ctx.fillRect(x - w / 2, 96, w, 110);                                   // shop front
        for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#FFFFFF' : sh.awning; ctx.fillRect(x - w / 2 + k * w / 6, 96, w / 6, 20); }   // striped awning
        ctx.fillStyle = '#222'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillText(sh.name, x, 134);
        drawHuman(x, 176, 1, { shirt: sh.coat, hair: '#AAA', hairStyle: 'short', beard: sh.id === 'magic' ? '#EEE' : null });
        drawHatOn(x, 153, sh.hat);
        ctx.fillStyle = '#8A5A34'; ctx.fillRect(x - w / 2 + 6, 196, w - 12, 14);                            // counter
        if (sh.id === 'magic') for (let k = 0; k < 3; k++) drawStar(x - 40 + k * 40, 120 + Math.sin(t * 3 + k) * 3, 3, '#FFE066');
    }
    ctx.fillStyle = '#6B3E1E'; ctx.fillRect(MALL_EXIT.x - 24, 560, 48, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('🚪 Back to the Void', MALL_EXIT.x, 556);
    const sh = nearMallShop();
    if (sh && !menu) drawSpeech({ x: sh.x, y: 230 }, `${mainBtn()}: Shop at ${sh.name.replace(/^\S+ /, '')}`);
}

function drawMallDoor() {
    const { x, y } = MALL_DOOR;
    ctx.fillStyle = '#E8D8B8'; ctx.fillRect(x - 30, y - 28, 60, 44);
    ctx.fillStyle = '#C03A3A'; ctx.fillRect(x - 32, y - 34, 64, 10);
    ctx.fillStyle = '#6AB0E0'; ctx.fillRect(x - 12, y - 16, 24, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('🏬 THE MALL', x, y + 30);
}

// 🌊🦕🌋🐒 More islands (Captain Salty sails there; the submarine dives Underwater)
const LAVA_RIVERS   = [{ x: 0, y: 250, w: 330, h: 34 }, { x: 470, y: 250, w: 330, h: 34 }, { x: 380, y: 380, w: 40, h: 220 }];
const JUNGLE_PIT    = { x: 300, y: 56, w: 200, h: 544 };   // right across the jungle — swing over it!
const VINES         = [{ x: 270, y: 305 }, { x: 530, y: 305 }];   // swing from one side of the pit to the other
const SPIKES        = [{ x: 150, y: 200 }, { x: 180, y: 430 }, { x: 640, y: 180 }, { x: 620, y: 460 }, { x: 110, y: 330 }];
const TRICERATOPS   = { x: 600, y: 420 };
const JUNGLE_IDOL   = { x: 690, y: 305 };
PLACES.underwater = { name: '🌊 UNDERWATER WORLD', spawn: [120, 470], island: true,
    make: () => ({ coins: [], enemies: [e0('shark', 500, 200, { dx: 2 }), e0('shark', 300, 420, { dx: -2 }), e0('jellyfish', 250, 250), e0('jellyfish', 600, 380),
                                         e0('jellyfish', 450, 480), e0('octopus', 520, 300, { r: 42, coinDrop: 25, inkTimer: 120 })] }) };
PLACES.dino = { name: '🦕 DINOSAUR ISLAND', spawn: [120, 470], island: true,
    make: () => ({ coins: [], tamed: !!state.mounts.dino,
                   enemies: [e0('raptor', 400, 180), e0('raptor', 650, 250), e0('raptor', 300, 380), e0('raptor', 700, 480)] }) };
PLACES.volcano = { name: '🌋 THE VOLCANO', spawn: [120, 470], island: true,
    make: () => ({ coins: [], enemies: [e0('lavablob', 200, 150, { hopTimer: 10 }), e0('lavablob', 600, 150, { hopTimer: 30 }), e0('lavablob', 250, 450, { hopTimer: 50 }),
                                         e0('firedragon', 400, 150, { r: 40, coinDrop: 25, breath: 140, t: 0 })], lavaTick: 0 }) };
PLACES.jungle = { name: '🐒 THE JUNGLE TEMPLE', spawn: [120, 470], island: true,
    make: () => ({ coins: [], swing: null, trapTimer: 90, spikeTimer: 0, idolTaken: false,
                   enemies: [e0('monkey', 200, 150), e0('monkey', 650, 200), e0('monkey', 600, 480), e0('monkey', 150, 380)] }) };

// 🧸 Toy Land (through the Toy Shop in the Mall), 🏜 Desert Pyramid (Captain Salty), ☁ Cloud City (hot air balloon in Heaven)
const BALLOON      = { x: 180, y: 470 };   // in Heaven
const TOY_EXIT     = { x: 400, y: 578 };
const PYRAMID_WALLS = [{ x: 60, y: 200 }, { x: 740, y: 420 }];   // walk into the glowing hieroglyphs… secret rooms!
const MAMA_BIRD    = { x: 400, y: 240 };
PLACES.toy = { name: '🧸 TOY LAND', spawn: [400, 500],
    make: () => ({ coins: [], enemies: [e0('windup', 200, 200, { dx: 3, dy: 0, windTimer: 90 }), e0('windup', 600, 380, { dx: -3, dy: 0, windTimer: 40 }),
                                         e0('toysoldier', 180, 420), e0('toysoldier', 620, 180), e0('wizard', 400, 200, { r: 26, coinDrop: 25, teleTimer: 150, spellTimer: 100 })] }) };
PLACES.pyramid = { name: '🏜 THE DESERT PYRAMID', spawn: [120, 470], island: true,
    make: () => ({ coins: [], found: [false, false],
                   enemies: [e0('mummy', 300, 200), e0('mummy', 550, 420), e0('scarab', 450, 150), e0('scarab', 650, 300), e0('scarab', 250, 400),
                             e0('mummyking', 520, 250, { r: 32, coinDrop: 25, summonTimer: 360, wrapTimer: 120 })] }) };
PLACES.cloudcity = { name: '☁ CLOUD CITY', spawn: [270, 470],
    make: () => ({ coins: [], enemies: [], eggs: [0, 1, 2].map(() => { const p = reachablePoint(100 + Math.random() * 600, 120 + Math.random() * 380); return { x: p.x, y: p.y, got: false }; }), returned: false,
                   birds: [0, 1, 2, 3, 4].map(i => ({ x: 150 + i * 130, y: 200 + (i % 2) * 180, t: i })) }) };
const BIRD_CHAT = ['Tweet tweet! Welcome to Cloud City!', 'Have you seen Mama Bird\'s eggs?', 'I love flying! 🐦', 'The clouds are so soft today!', 'Chirp! You can\'t fly? Poor thing!'];

// 👹 New bosses move into old places
function addToPlace(room, chance, makeFoe) {
    const old = PLACES[room].make;
    PLACES[room].make = () => { const P = old(); if (Math.random() < chance) P.enemies.push(makeFoe()); return P; };
}
addToPlace('toy',        1,   () => e0('megarobot',   600, 200, { r: 36, coinDrop: 30, laserTimer: 140 }));
addToPlace('ship',       0.4, () => e0('kraken',      400, 150, { r: 40, coinDrop: 35, inkTimer: 120, emerge: 0 }));
addToPlace('ice',        1,   () => e0('yeti',        250, 420, { r: 32, coinDrop: 30, throwTimer: 150 }));
addToPlace('haunted',    1,   () => e0('zombieking',  560, 420, { r: 30, coinDrop: 30, summonTimer: 240 }));
addToPlace('space',      1,   () => e0('alienqueen',  620, 250, { r: 32, coinDrop: 30, summonTimer: 240 }));
addToPlace('underwater', 1,   () => e0('lasershark',  250, 150, { r: 28, coinDrop: 25, laserTimer: 100 }));
addToPlace('jungle',     1,   () => e0('spiderqueen', 680, 450, { r: 30, coinDrop: 30, summonTimer: 200 }));

// 🌍 Ten more places, each behind a door in a place you know. Collect all the things for a prize!
const fill = (g, col) => { g.fillStyle = col; g.fillRect(0, 0, 800, 600); };
const speckle = (g, R, n, colFn, w = 4, h = 3) => { for (let i = 0; i < n; i++) { g.fillStyle = colFn(R()); g.fillRect(R() * 800, 46 + R() * 554, w, h); } };
const SUBPLACES = {
    candyvolcano: { parent: 'candy', door: { x: 400, y: 545 }, name: '🌋 THE CANDY VOLCANO', doorLabel: '🌋 Candy Volcano', song: 'candy', item: '🍬', count: 5,
        enemies: () => [e0('chocoblob', 250, 250), e0('chocoblob', 550, 250), e0('chocoblob', 400, 400), e0('jellybean', 200, 450), e0('jellybean', 600, 450)],
        paint: (g, R) => { fill(g, '#F8C8E0'); speckle(g, R, 600, r => `hsl(${r * 360}, 80%, 70%)`, 5, 3); g.fillStyle = '#8A4A2A'; g.beginPath(); g.moveTo(250, 200); g.lineTo(360, 60); g.lineTo(440, 60); g.lineTo(550, 200); g.fill(); g.fillStyle = '#FF66AA'; g.fillRect(360, 56, 80, 12); } },
    seacity:      { parent: 'underwater', door: { x: 400, y: 545 }, name: '🧜 THE UNDERWATER CITY', doorLabel: '🏰 Underwater City', song: 'underwater', item: '🐚', count: 4,
        enemies: () => [e0('shark', 300, 250, { dx: 2 }), e0('shark', 550, 420, { dx: -2 }), e0('jellyfish', 200, 400), e0('jellyfish', 600, 200)],
        paint: (g, R) => { const sea = g.createLinearGradient(0, 0, 0, 600); sea.addColorStop(0, '#2A8AC0'); sea.addColorStop(1, '#0A3A6A'); g.fillStyle = sea; g.fillRect(0, 0, 800, 600);
                           for (let k = 0; k < 6; k++) { const x = 80 + k * 130; g.fillStyle = `hsl(${170 + k * 15}, 50%, 60%)`; g.fillRect(x - 25, 120, 50, 120); g.beginPath(); g.arc(x, 120, 25, Math.PI, 0); g.fill(); } } },
    moonbase:     { parent: 'space', door: { x: 400, y: 545 }, name: '🌙 THE MOON BASE', doorLabel: '🌙 Land on the Moon', song: 'space', item: '🌑', count: 4,
        enemies: () => [e0('alien', 250, 250), e0('alien', 550, 300), e0('babyalien', 400, 200), e0('babyalien', 600, 450)],
        paint: (g, R) => { fill(g, '#C8C8CC'); for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,120,130,0.5)'; g.beginPath(); g.arc(R() * 800, 46 + R() * 554, 6 + R() * 22, 0, Math.PI * 2); g.fill(); }
                           g.fillStyle = '#E8E8F0'; g.beginPath(); g.arc(400, 130, 60, Math.PI, 0); g.fill(); g.fillStyle = '#88AACC'; g.fillRect(380, 100, 40, 30); } },
    cloudcastle:  { parent: 'cloudcity', door: { x: 560, y: 545 }, name: '🏰 THE GIANTS\' CLOUD CASTLE', doorLabel: '🌱 Beanstalk to the Castle', song: 'heaven', item: '🥚', count: 3,
        enemies: () => [e0('giant', 250, 250, { r: 30 }), e0('giant', 560, 300, { r: 30 })],
        paint: (g, R) => { fill(g, '#EEF4FF'); for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.ellipse(R() * 800, 46 + R() * 554, 50, 20, 0, 0, Math.PI * 2); g.fill(); }
                           g.fillStyle = '#B8B0C8'; g.fillRect(250, 50, 300, 90); for (let k = 0; k < 7; k++) g.fillRect(250 + k * 46, 36, 24, 16); } },
    icecave:      { parent: 'ice', door: { x: 400, y: 545 }, name: '🐧 THE PENGUIN ICE CAVE', doorLabel: '🧊 Ice Cave', song: 'ice', item: '🐟', count: 5,
        enemies: () => [e0('penguinpal', 250, 250), e0('penguinpal', 550, 250), e0('snowman', 400, 420)],
        paint: (g, R) => { fill(g, '#BFE4F8'); speckle(g, R, 500, r => `rgba(255,255,255,${0.3 + r * 0.5})`, 6, 3);
                           for (let x = 0; x < 800; x += 40) { g.fillStyle = '#E8F6FF'; g.beginPath(); g.moveTo(x, 46); g.lineTo(x + 20, 46); g.lineTo(x + 10, 90 + (x % 80)); g.fill(); } } },
    treehouse:    { parent: 'jungle', door: { x: 220, y: 120 }, name: '🌴 THE TREEHOUSE VILLAGE', doorLabel: '🪜 Treehouse Village', song: 'jungle', item: '🍌', count: 5,
        enemies: () => [e0('snake', 250, 350), e0('snake', 550, 300), e0('monkey', 400, 450)],
        paint: (g, R) => { fill(g, '#5A8A3A'); speckle(g, R, 700, r => `hsla(${100 + r * 40}, 50%, ${25 + r * 15}%, 0.7)`, 8, 5);
                           for (const x of [120, 400, 680]) { g.fillStyle = '#7A4A2A'; g.fillRect(x - 10, 80, 20, 120); g.fillStyle = '#A0703A'; g.fillRect(x - 50, 60, 100, 40); g.fillStyle = '#5A3A1A'; g.beginPath(); g.moveTo(x - 58, 62); g.lineTo(x, 30); g.lineTo(x + 58, 62); g.fill(); }
                           g.strokeStyle = '#8A6A3A'; g.lineWidth = 3; g.beginPath(); g.moveTo(170, 80); g.lineTo(350, 80); g.moveTo(450, 80); g.lineTo(630, 80); g.stroke(); } },
    factory:      { parent: 'toy', door: { x: 650, y: 545 }, name: '🏭 THE ROBOT FACTORY', doorLabel: '🏭 Robot Factory', song: 'space', item: '⚙', count: 4,
        enemies: () => [e0('minibot', 250, 200), e0('minibot', 550, 200), e0('minibot', 300, 450), e0('minibot', 600, 450), e0('robot', 400, 300)],
        paint: (g, R) => { fill(g, '#6A7078'); speckle(g, R, 300, r => `rgba(${90 + r * 40},${95 + r * 40},${100 + r * 40},0.6)`, 10, 2);
                           for (const y of FACTORY_BELTS) { g.fillStyle = '#2A2A30'; g.fillRect(0, y - 16, 800, 32); g.fillStyle = '#4A4A50'; for (let x = 0; x < 800; x += 20) g.fillRect(x, y - 2, 10, 4); } } },
    toyshop:      { parent: 'mall', door: { x: 780, y: 300 }, name: '🧸 THE GIANT TOY SHOP', doorLabel: '🧸 Giant Toy Shop', song: 'toy', item: '🔮', count: 5,
        enemies: () => [e0('windup', 200, 200, { dx: 3, dy: 0, windTimer: 90 }), e0('windup', 600, 400, { dx: -3, dy: 0, windTimer: 40 }), e0('toysoldier', 300, 450), e0('toysoldier', 550, 200)],
        paint: (g, R) => { fill(g, '#F4E0C0'); for (let y = 46; y < 600; y += 60) for (let x = 0; x < 800; x += 60) { g.fillStyle = (x + y) % 120 ? '#EED8B4' : '#E4CCA4'; g.fillRect(x, y, 60, 60); }
                           for (const [x, y, c] of [[100, 120, '#E04040'], [700, 120, '#4060E0'], [100, 480, '#40B040'], [700, 480, '#E0C040']]) { g.fillStyle = c; g.fillRect(x - 40, y - 40, 80, 80); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(x - 40, y - 40, 80, 12); } } },
    museum:       { parent: 'dino', door: { x: 400, y: 545 }, name: '🦴 THE DINOSAUR MUSEUM', doorLabel: '🏛 Dino Museum', song: 'house', item: '🦴', count: 3,
        enemies: () => [],
        paint: (g, R) => { fill(g, '#E8DCC8'); for (let x = 0; x < 800; x += 50) { g.fillStyle = 'rgba(160,140,110,0.2)'; g.fillRect(x, 46, 2, 554); }
                           for (const [x, y] of [[180, 160], [620, 160], [180, 440], [620, 440]]) { g.fillStyle = '#B8A888'; g.fillRect(x - 60, y + 30, 120, 16); } } },
    underbed:     { parent: 'house', door: { x: 130, y: 275 }, name: '🛏 THE WORLD UNDER YOUR BED', doorLabel: '🛏 Under the bed…', song: 'underground', item: '🧸', count: 5,
        enemies: () => [e0('dustbunny', 250, 250), e0('dustbunny', 550, 250), e0('dustbunny', 400, 450), e0('bedmonster', 600, 400, { r: 30, coinDrop: 30 })],
        paint: (g, R) => { fill(g, '#2A2438'); speckle(g, R, 500, r => `rgba(${120 + r * 60},${110 + r * 60},${130 + r * 60},0.35)`, 6, 6);
                           g.fillStyle = '#4A3A2A'; g.fillRect(0, 46, 800, 40); for (const x of [20, 760]) g.fillRect(x, 46, 20, 554); } },
    medieval:     { parent: 'secretroom', door: { x: -999, y: -999 }, back: { x: 650, y: 330 }, name: '🏰 KNIGHTS & CASTLES (long ago!)', doorLabel: '', song: 'mall', item: '🛡', count: 3,
        enemies: () => [e0('knight', 250, 250), e0('knight', 550, 250), e0('knight', 400, 380), e0('dragonking', 600, 160, { r: 34, coinDrop: 30 })],
        paint: (g, R) => { fill(g, '#8AA85A'); speckle(g, R, 700, r => `hsla(${80 + r * 30}, 40%, ${35 + r * 12}%, 0.6)`, 4, 3);
                           g.fillStyle = '#A8A098'; g.fillRect(250, 50, 300, 90); for (let k = 0; k < 7; k++) g.fillRect(250 + k * 46, 36, 24, 16);
                           g.fillStyle = '#5A3A1A'; g.fillRect(380, 90, 40, 50); g.fillStyle = '#E04040'; g.fillRect(398, 10, 4, 30); g.beginPath(); g.moveTo(402, 12); g.lineTo(426, 20); g.lineTo(402, 28); g.fill(); } },
    microworld:   { parent: 'paradise', door: { x: -999, y: -999 }, back: { x: 400, y: 290 }, name: '🐜 THE MICRO WORLD (you are TINY!)', doorLabel: '', song: 'jungle', item: '🍪', count: 5,
        enemies: () => [e0('ant', 200, 200), e0('ant', 600, 200), e0('ant', 300, 450), e0('ant', 550, 420), e0('ant', 400, 300)],
        paint: (g, R) => { fill(g, '#6A9A4A'); for (let i = 0; i < 80; i++) { g.strokeStyle = `hsla(${90 + R() * 30}, 50%, ${30 + R() * 20}%, 0.9)`; g.lineWidth = 6; const x = R() * 800; g.beginPath(); g.moveTo(x, 600); g.lineTo(x + (R() - 0.5) * 60, 46 + R() * 300); g.stroke(); }   // grass taller than you!
                           g.fillStyle = '#4A8A2A'; g.beginPath(); g.ellipse(600, 470, 120, 50, 0.3, 0, Math.PI * 2); g.fill(); } },
    backyard:     { parent: 'house', door: { x: 40, y: 320 }, name: '🏡 YOUR BACKYARD', doorLabel: '🚪 Backyard', song: 'house', item: '', count: 0,
        enemies: () => [],
        paint: (g, R) => { fill(g, '#7AC05A'); speckle(g, R, 900, r => `hsla(${95 + r * 25}, 50%, ${38 + r * 14}%, 0.6)`, 3, 3);
                           g.strokeStyle = '#C8A070'; g.lineWidth = 4; g.strokeRect(10, 56, 780, 534);   // fence
                           for (let x = 10; x < 790; x += 20) { g.fillStyle = '#D8B080'; g.fillRect(x, 50, 6, 14); g.fillRect(x, 584, 6, 14); } } },
    secretroom:   { parent: 'house', door: { x: 762, y: 250 }, name: '🕵 YOUR SECRET ROOM', doorLabel: '✨', song: 'secret', item: '💎', count: 3,
        enemies: () => [],
        paint: (g, R) => { fill(g, '#3A2A4A'); speckle(g, R, 300, r => `rgba(${150 + r * 80},${120 + r * 60},${200 + r * 50},0.25)`, 4, 4);
                           g.fillStyle = '#5A3A2A'; g.fillRect(150, 70, 500, 30); g.fillStyle = '#C8A040'; for (let k = 0; k < 10; k++) g.fillRect(170 + k * 48, 60, 24, 12); } },
};
const FACTORY_BELTS = [160, 330, 500];   // conveyor belts push you sideways
const LOST_TOYS = ['🧸', '🚗', '🧦', '🎲', '🪀'];
// Mini-game places (their code is in the MINI-GAMES section)
PLACES.stadium  = { name: '⚽ THE STADIUM',      spawn: [200, 330], make: () => ({ enemies: [], coins: [] }) };
PLACES.snowfort = { name: '☃ SNOWBALL FIGHT!',  spawn: [400, 520],
    make: () => ({ coins: [], enemies: [[200, 160], [400, 130], [600, 160], [300, 260]].map(([x, y]) => e0('snowkid', x, y, { coinDrop: 3, emerge: 0 })) }) };
for (const [id, sp] of Object.entries(SUBPLACES)) {
    PLACES[id] = { name: sp.name, spawn: [400, 520],
        make: () => ({ coins: [], prize: false, night: id === 'museum' ? 1200 : 0, enemies: sp.enemies(),
                       items: Array.from({ length: sp.count }, (_, k) => { const p = reachablePoint(80 + Math.random() * 640, 110 + Math.random() * 380);
                                                                           return { x: p.x, y: p.y, got: false, icon: id === 'underbed' ? LOST_TOYS[k] : sp.item }; }) }) };
}

function inRectXY(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function spikesUp() { return place().spikeTimer % 120 < 50; }

function nearVine() {
    if (state.room !== ROOM.JUNGLE || place().swing) return null;
    return VINES.findIndex(v => Math.hypot(player.x - v.x, player.y - v.y) < 30);
}

// The main button in the new places: tame the dinosaur, swing on a vine
function tryPlaceAction() {
    const nearIt = (o, r = 50) => Math.hypot(player.x - o.x, player.y - o.y) < r;
    if (state.room === ROOM.VOLCANO && !state.mounts.surf && nearIt(SURFBOARD)) {
        state.mounts.surf = true; state.mount = 'surf'; state.lastMount = 'surf';
        showToast('🏄 You found a LAVA SURFBOARD! Surf the lava rivers!', '#FF9944', 240); sfx('win');
        return true;
    }
    if (state.room === ROOM.DINO && !state.mounts.trex && nearIt(TREX, 60)) {
        if (place().enemies.some(e => e.alive && e.type === 'raptor')) { showToast('🦖 ROAR! The T-Rex only lets heroes ride who beat ALL the raptors!', '#FFAA88', 220); sfx('laugh'); return true; }
        state.mounts.trex = true; state.mount = 'trex'; state.lastMount = 'trex';
        showToast('🦖 The T-Rex likes you! RIDE IT and STOMP monsters!', '#AAFF88', 240); sfx('boom'); triggerShake(14);
        return true;
    }
    if (state.room === ROOM.CAMP && nearIt(QUEST_BOARD)) { openMenu('📜 QUEST BOARD', questItems); return true; }
    if (tryHeroAction(nearIt)) return true;
    if (state.room === ROOM.PARADISE && nearIt(GLOOP, 40)) { befriendGloop(); return true; }
    if (state.room === ROOM.BACKYARD && tryYardAction(nearIt)) return true;
    if (state.room === ROOM.SECRETROOM && nearIt(TIME_MACHINE, 44)) { openMenu('⏰ THE TIME MACHINE — when to?', timeMachineItems); return true; }
    if (state.room === ROOM.SECRETROOM && !place().chest && nearIt(SECRET_CHEST, 40)) {
        place().chest = true; const n = 20 + Math.floor(Math.random() * 30); state.coins += n; sfx('found'); spawnParticles(SECRET_CHEST.x, SECRET_CHEST.y, '#FFD700', 24);
        showToast(`🕵 Your secret treasure chest: +🪙${n}!`, '#FFD700', 200); giveAward('secretRoom');
        return true;
    }
    if (state.room === ROOM.LIBRARY && !place().bookTaken && nearIt(GOLDEN_BOOK, 36)) {
        place().bookTaken = true; giveAward('spellbook'); sfx('found'); spawnParticles(GOLDEN_BOOK.x, GOLDEN_BOOK.y, '#FFD700', 30);
        const unknown = SPELLS.filter(sp => sp.school && !state.spells[sp.id]);
        if (unknown.length) {
            const sp = unknown[Math.floor(Math.random() * unknown.length)];
            state.spells[sp.id] = true; state.spell = sp.id;
            showToast(`📕 The secret spell book taught you ${sp.icon} ${sp.name}! FREE!`, '#FFD700', 260);
        } else { state.coins += 60; showToast('📕 You know every spell already! The book gives you +🪙60', '#FFD700', 220); }
        return true;
    }
    if (state.room === ROOM.OLYMPUS) {
        const g = olympusGods().find(o => nearIt(o, 40));
        if (g) { talkToGod(g); return true; }
    }
    if (state.room === ROOM.PIRATECOVE) {
        const x = place().xs.find(x => !x.dug && nearIt(x, 30));
        if (x) {
            x.hits++; sfx('dig'); spawnParticles(x.x, x.y, '#C8A060', 6); triggerShake(2);
            if (x.hits >= 4) {
                x.dug = true;
                const loot = 20 + Math.floor(Math.random() * 40);
                state.coins += loot; addScore(loot);
                if (Math.random() < 0.3) state.inv.diamond = invCount('diamond') + 1;
                spawnParticles(x.x, x.y, '#FFD700', 24); sfx('found');
                showToast(`🏴‍☠️ BURIED TREASURE! +🪙${loot}${Math.random() < 0.3 ? '' : ''}`, '#FFD700', 200);
                if (place().xs.every(x => x.dug)) giveAward('pirateGold');
            }
            return true;
        }
    }
    if (state.room === ROOM.DINO && !place().tamed && Math.hypot(player.x - TRICERATOPS.x, player.y - TRICERATOPS.y) < 50) {
        place().tamed = true;
        state.mounts.dino = true; state.mount = 'dino'; state.lastMount = 'dino';
        showToast('🦕 You tamed the Triceratops! RIDE IT! (it stomps monsters)', '#AAFF88', 240);
        sfx('win'); giveAward('dinoRider');
        return true;
    }
    if (state.room === ROOM.CLOUDCITY) {
        const P = place();
        if (Math.hypot(player.x - MAMA_BIRD.x, player.y - MAMA_BIRD.y) < 40) {
            const got = P.eggs.filter(e => e.got).length;
            if (got === 3 && !P.returned) {
                P.returned = true; state.inv.diamond = invCount('diamond') + 3; addScore(200);
                showToast('🐣 Mama Bird: "My eggs! THANK YOU!" (+3 diamonds, +200)', '#FFE066', 240); sfx('win'); giveAward('eggs');
            } else showToast(P.returned ? '🐦 Mama Bird: "My babies are hatching! Thank you!"' : `🐦 Mama Bird: "I lost 3 eggs in the clouds! You found ${got}."`, '#FFFFFF', 200);
            return true;
        }
        const bird = P.birds.find(b => Math.hypot(player.x - b.x, player.y - b.y) < 40);
        if (bird) { showToast(`🐦 ${BIRD_CHAT[Math.floor(Math.random() * BIRD_CHAT.length)]}`, '#FFFFFF', 150); sfx('hoot'); return true; }
    }
    const v = nearVine();
    if (v !== null && v >= 0) {
        place().swing = { from: VINES[v], to: VINES[1 - v], t: 0 };
        sfx('whoosh');
        return true;
    }
    return false;
}

function updateNewPlaces() {
    const P = place();
    if (state.room === ROOM.PYRAMID) {
        PYRAMID_WALLS.forEach((w, i) => {
            if (P.found[i] || Math.hypot(player.x - w.x, player.y - w.y) > 34) return;
            P.found[i] = true;
            const prize = i === 0 ? () => { state.inv.diamond = invCount('diamond') + 2; return '💎 2 diamonds'; } : () => { state.playerHp = fullHearts(); state.bubble = true; addScore(150); return '❤ full hearts, a Shield Bubble and 150 points'; };
            showToast(`🏺 A SECRET TREASURE ROOM! You found ${prize()}!`, '#FFE066', 240);
            spawnParticles(w.x, w.y, '#FFD700', 20); sfx('win'); giveAward('pyramidSecret');
        });
    }
    if (state.room === ROOM.CLOUDCITY) {
        for (const b of P.birds) { b.t += 0.01; b.x += Math.sin(b.t * 2) * 0.8; b.y += Math.cos(b.t * 3) * 0.4; }
        for (const e of P.eggs) {
            if (e.got || Math.hypot(player.x - e.x, player.y - e.y) > 22) continue;
            e.got = true; sfx('coin');
            spawnFloatText(e.x, e.y - 20, `🥚 Found an egg! (${P.eggs.filter(x => x.got).length}/3)`, '#FFFFFF', 80);
        }
    }
    if (state.room === ROOM.VOLCANO) {
        // Hot lava hurts (unless you fly over it on your dragon)
        if (!['dragon', 'broom', 'surf', 'car', 'pegasus', 'jetpack'].includes(state.mount) && LAVA_RIVERS.some(r => inRectXY(player.x, player.y + 12, r)) && state.playerInvincible === 0) {
            damagePlayer();
            spawnFloatText(player.x, player.y - 30, 'HOT! 🔥', '#FF6633', 50);
        }
    }
    if (state.room === ROOM.JUNGLE) {
        P.spikeTimer++;
        if (P.swing) {   // swinging across the pit
            P.swing.t += 0.025;
            const k = Math.min(1, P.swing.t);
            player.x = P.swing.from.x + (P.swing.to.x - P.swing.from.x) * k;
            player.y = P.swing.from.y + (P.swing.to.y - P.swing.from.y) * k - Math.sin(k * Math.PI) * 60;
            if (k >= 1) P.swing = null;
            return;
        }
        if (inRectXY(player.x, player.y + 10, JUNGLE_PIT) && state.mount !== 'dragon') {   // fell in!
            damagePlayer();
            [player.x, player.y] = PLACES.jungle.spawn;
            showToast('😵 You fell in the pit! Use the VINE to swing across.', '#FFAA66', 160);
        }
        if (spikesUp() && state.playerInvincible === 0 && SPIKES.some(sp => Math.hypot(player.x - sp.x, player.y + 12 - sp.y) < 16)) damagePlayer();
        if (--P.trapTimer <= 0) {   // arrow traps in the walls
            P.trapTimer = 110;
            for (const y of [150, 460]) {
                enemyProjectiles.push({ x: 10, y, dx: 6, dy: 0, color: '#8A6A3A', life: 140, r: 5, enemyType: 'trap' });
                enemyProjectiles.push({ x: 790, y: y + 40, dx: -6, dy: 0, color: '#8A6A3A', life: 140, r: 5, enemyType: 'trap' });
            }
            sfx('whoosh');
        }
        if (!P.idolTaken && Math.hypot(player.x - JUNGLE_IDOL.x, player.y - JUNGLE_IDOL.y) < 28) {
            P.idolTaken = true;
            state.inv.diamond = invCount('diamond') + 2; addScore(150);
            showToast('🗿 THE GOLDEN IDOL! +2 diamonds and 150 points!', '#FFD700', 240);
            spawnParticles(JUNGLE_IDOL.x, JUNGLE_IDOL.y, '#FFD700', 20); sfx('win'); giveAward('idol');
        }
    }
    // The tamed dinosaur stomps monsters it runs into
    if (['dino', 'trex', 'hamster'].includes(state.mount) && (updateNewPlaces.stomp = (updateNewPlaces.stomp || 0) + 1) % 30 === 0) {
        const big = state.mount === 'trex';   // 🦖 bigger feet, bigger stomp
        for (const e of targetableEnemies()) if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + (big ? 44 : 26)) { damageEnemy(e, POWER.NONE, false, big ? 2 : 1); triggerShake(big ? 7 : 4); }
    }
}

function paintToy(g, R) {
    for (let y = 46; y < 600; y += 50) for (let x = 0; x < 800; x += 50) {   // play-mat squares
        g.fillStyle = ['#FFD84A', '#4AC8FF', '#FF6A8A', '#7AE07A'][(x / 50 + (y - 46) / 50) % 4]; g.fillRect(x, y, 50, 50);
    }
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 40; i++) g.fillRect(R() * 800, 46 + R() * 554, 20, 3);
    g.strokeStyle = '#8A5A2A'; g.lineWidth = 6; g.beginPath(); g.ellipse(400, 330, 330, 230, 0, 0, Math.PI * 2); g.stroke();   // train track
    g.strokeStyle = '#555'; g.lineWidth = 2; for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2; g.beginPath(); g.moveTo(400 + Math.cos(a) * 322, 330 + Math.sin(a) * 222); g.lineTo(400 + Math.cos(a) * 338, 330 + Math.sin(a) * 238); g.stroke(); }
    for (const [x, y, c, l] of [[80, 120, '#E03030', 'A'], [720, 140, '#3060E0', 'B'], [90, 520, '#30A040', 'C'], [700, 520, '#FFAA22', 'D']]) {   // big toy blocks
        g.fillStyle = c; g.fillRect(x - 22, y - 22, 44, 44); g.fillStyle = '#FFF'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText(l, x, y + 9);
    }
}
function paintPyramid(g, R) {
    g.fillStyle = '#C8A060'; g.fillRect(0, 0, 800, 600);
    for (let y = 46; y < 600; y += 24) for (let x = (y / 24) % 2 ? -30 : 0; x < 800; x += 60) { g.fillStyle = `hsl(38, ${40 + R() * 10}%, ${50 + R() * 10}%)`; g.fillRect(x + 1, y + 1, 58, 22); }   // sandstone blocks
    g.fillStyle = 'rgba(80,50,20,0.35)';
    for (let i = 0; i < 40; i++) { const sym = ['𓀀', '𓁐', '𓃾', '𓆉', '𓇳', '𓋹'][Math.floor(R() * 6)]; g.font = '16px Arial'; g.fillText(sym, R() * 780, 60 + R() * 530); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 46, 800, 30);
}
function paintCloudCity(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#6AB8FF'); sky.addColorStop(1, '#E8F4FF');
    g.fillStyle = sky; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(R() * 800, 300 + R() * 320, 30 + R() * 50, 0, Math.PI * 2); g.fill(); }   // cloud ground
    for (const [x, y, c] of [[120, 160, '#FFB0C8'], [640, 150, '#B0D8FF'], [680, 400, '#C8FFB0'], [300, 420, '#FFE8A0']]) {   // round cloud houses
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(x, y - 30, 20, Math.PI, 0); g.fill();
        g.fillStyle = '#8AB8E0'; g.beginPath(); g.arc(x, y + 14, 9, Math.PI, 0); g.fill(); g.fillRect(x - 9, y + 14, 18, 14);
    }
    ['#FF4466', '#FFAA22', '#FFEE33', '#44DD66', '#44AAFF', '#AA66FF'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.arc(400, 560, 260 - i * 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });   // rainbow bridge
}

function drawBalloon(x, y, text) {
    const bob = Math.sin(Date.now() / 600) * 4;
    ctx.save();
    ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 26 + bob); ctx.lineTo(x - 9, y - 4 + bob); ctx.moveTo(x + 14, y - 26 + bob); ctx.lineTo(x + 9, y - 4 + bob); ctx.stroke();
    ['#FF4466', '#FFDD33', '#44AAFF', '#FF4466'].forEach((c, i) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x - 18 + i * 12, y - 52 + bob, 8, 28, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#A0703A'; ctx.fillRect(x - 10, y - 6 + bob, 20, 14);   // basket
    ctx.fillStyle = '#446'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(`🎈 ${text}`, x, y + 24);
    ctx.restore();
}

function paintUnderwater(g, R) {
    const sea = g.createLinearGradient(0, 0, 0, 600);
    sea.addColorStop(0, '#2A8AC8'); sea.addColorStop(1, '#0A2A5A');
    g.fillStyle = sea; g.fillRect(0, 0, 800, 600);
    g.fillStyle = '#D8C080'; g.beginPath(); g.moveTo(0, 540); for (let x = 0; x <= 800; x += 40) g.lineTo(x, 530 + Math.sin(x / 50) * 10); g.lineTo(800, 600); g.lineTo(0, 600); g.fill();   // sandy floor
    for (let i = 0; i < 12; i++) {   // coral
        const x = 40 + i * 66, y = 545;
        g.fillStyle = ['#FF6A8A', '#FFAA44', '#AA66FF', '#44DDCC'][i % 4];
        for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (k - 1.5) * 7, y - 12 - k * 5, 5, 14, (k - 1.5) * 0.3, 0, Math.PI * 2); g.fill(); }
    }
    for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(R() * 800, R() * 520, 2 + R() * 4, 0, Math.PI * 2); g.fill(); }
}
function paintDino(g, R) {
    g.fillStyle = '#7AAA4A'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 900; i++) { g.fillStyle = `hsla(${80 + R() * 30}, 45%, ${28 + R() * 14}%, 0.6)`; g.beginPath(); g.ellipse(R() * 800, R() * 600, 5 + R() * 10, 3 + R() * 6, R() * 3, 0, Math.PI * 2); g.fill(); }
    for (const [x, y] of [[70, 140], [740, 140], [60, 360], [760, 380], [300, 120], [520, 540]]) {   // giant ferns
        g.strokeStyle = '#2E6A1E'; g.lineWidth = 3;
        for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.35; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 25, y + Math.sin(a) * 25 - 10, x + Math.cos(a) * 45, y + Math.sin(a) * 45); g.stroke(); }
    }
    g.fillStyle = '#EEE8D0'; g.fillRect(430, 300, 40, 6); g.beginPath(); g.arc(430, 303, 6, 0, Math.PI * 2); g.arc(470, 303, 6, 0, Math.PI * 2); g.fill();   // an old bone
}
function paintVolcano(g, R) {
    g.fillStyle = '#2A1A18'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 700; i++) { g.fillStyle = `hsla(10, 20%, ${8 + R() * 14}%, 0.7)`; g.beginPath(); g.ellipse(R() * 800, R() * 600, 6 + R() * 16, 4 + R() * 9, R() * 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4A2A20'; g.beginPath(); g.moveTo(250, 120); g.lineTo(360, 50); g.lineTo(440, 50); g.lineTo(550, 120); g.fill();   // the crater rim
}
function paintJungle(g, R) {
    g.fillStyle = '#2E6A2A'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 1200; i++) { g.fillStyle = `hsla(${100 + R() * 40}, 50%, ${18 + R() * 16}%, 0.6)`; g.beginPath(); g.ellipse(R() * 800, R() * 600, 6 + R() * 14, 4 + R() * 8, R() * 3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#8A8A70'; g.fillRect(620, 250, 140, 110);                                          // temple steps
    for (let k = 0; k < 4; k++) { g.fillStyle = `rgb(${130 - k * 10},${130 - k * 10},${105 - k * 10})`; g.fillRect(620 + k * 12, 250 + k * 10, 140 - k * 24, 110 - k * 20); }
    const pit = g.createLinearGradient(0, JUNGLE_PIT.y, 0, JUNGLE_PIT.y + JUNGLE_PIT.h);
    pit.addColorStop(0, '#0A0A05'); pit.addColorStop(1, '#1A1A0A');
    g.fillStyle = pit; g.fillRect(JUNGLE_PIT.x, JUNGLE_PIT.y, JUNGLE_PIT.w, JUNGLE_PIT.h);          // the deep pit
    g.strokeStyle = '#4A3A1A'; g.lineWidth = 4; g.strokeRect(JUNGLE_PIT.x, JUNGLE_PIT.y, JUNGLE_PIT.w, JUNGLE_PIT.h);
}

function drawNewPlaces() {
    const t = Date.now() / 1000, P = place();
    const label = (text, x, y, col = 'rgba(255,255,255,0.9)') => { ctx.fillStyle = col; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); };
    const verb = mainBtn();
    drawWorld2(t, P, label, verb);
    drawMagicPlaces(t, label, verb);
    drawHeroPlaces(t, label, verb);
    if (state.room === ROOM.TOY) {
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(TOY_EXIT.x - 24, 560, 48, 40);
        label('🚪 Back to the Mall', TOY_EXIT.x, 556, '#223');
        for (let k = 0; k < 3; k++) {   // a toy train going round and round
            const a = t * 0.6 + k * 0.25, tx = 400 + Math.cos(a) * 330, ty = 330 + Math.sin(a) * 230;
            ctx.fillStyle = ['#E03030', '#3060E0', '#30A040'][k]; ctx.fillRect(tx - 12, ty - 8, 24, 16);
            ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(tx - 7, ty + 9, 4, 0, Math.PI * 2); ctx.arc(tx + 7, ty + 9, 4, 0, Math.PI * 2); ctx.fill();
        }
    }
    if (state.room === ROOM.PYRAMID) {
        PYRAMID_WALLS.forEach((w, i) => {
            if (P.found[i]) { ctx.fillStyle = '#0A0602'; ctx.fillRect(w.x - 26, w.y - 30, 52, 60); label('🏺 empty now', w.x, w.y + 44, '#FFE8A0'); return; }
            const glow = Math.hypot(player.x - w.x, player.y - w.y) < 150 ? 0.5 + Math.sin(t * 4) * 0.3 : 0.15;
            ctx.fillStyle = `rgba(255,220,120,${glow})`; ctx.font = '18px Arial'; ctx.textAlign = 'center';
            ctx.fillText('𓂀', w.x, w.y); ctx.fillText('𓆣', w.x, w.y + 22);
        });
        for (const [x, y] of [[40, 110], [760, 110], [40, 560], [760, 300]]) {   // flickering torches
            ctx.fillStyle = '#6B3E1E'; ctx.fillRect(x - 2, y, 4, 16);
            ctx.fillStyle = `rgba(255,${160 + Math.random() * 80},40,0.9)`; ctx.beginPath(); ctx.ellipse(x, y - 4, 4, 8 + Math.random() * 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        label('Psst… some glowing hieroglyphs hide SECRET ROOMS. Walk into them!', 400, 588, '#FFE8A0');
    }
    if (state.room === ROOM.CLOUDCITY) {
        for (const b of P.birds) {   // friendly birds flapping about
            const flap = Math.sin(t * 10 + b.t) * 5;
            ctx.fillStyle = ['#FF6A4A', '#4AAAFF', '#FFD24A', '#6AD86A', '#CC88FF'][P.birds.indexOf(b)];
            ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(b.x - 4, b.y); ctx.lineTo(b.x - 16, b.y - 8 - flap); ctx.lineTo(b.x + 2, b.y - 2); ctx.fill();
            ctx.fillStyle = '#FFAA22'; ctx.beginPath(); ctx.moveTo(b.x + 11, b.y - 2); ctx.lineTo(b.x + 18, b.y); ctx.lineTo(b.x + 11, b.y + 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x + 6, b.y - 3, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        // Mama Bird on her nest
        ctx.fillStyle = '#8A5A2A'; ctx.beginPath(); ctx.ellipse(MAMA_BIRD.x, MAMA_BIRD.y + 14, 30, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF88AA'; ctx.beginPath(); ctx.ellipse(MAMA_BIRD.x, MAMA_BIRD.y, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22'; ctx.beginPath(); ctx.moveTo(MAMA_BIRD.x + 16, MAMA_BIRD.y - 4); ctx.lineTo(MAMA_BIRD.x + 26, MAMA_BIRD.y); ctx.lineTo(MAMA_BIRD.x + 16, MAMA_BIRD.y + 3); ctx.fill();
        label('🐦 Mama Bird', MAMA_BIRD.x, MAMA_BIRD.y + 38, '#446');
        if (P.returned) for (let k = 0; k < 3; k++) { ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(MAMA_BIRD.x - 14 + k * 14, MAMA_BIRD.y + 6, 5, 0, Math.PI * 2); ctx.fill(); }   // baby chicks!
        for (const e of P.eggs) {
            if (e.got) continue;
            ctx.fillStyle = '#FFF8E8'; ctx.strokeStyle = '#C8B898'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(e.x, e.y + Math.sin(t * 3 + e.x) * 2, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        if (Math.hypot(player.x - MAMA_BIRD.x, player.y - MAMA_BIRD.y) < 40) drawSpeech(MAMA_BIRD, `${verb}: Talk to Mama Bird`);
        drawBalloon(BALLOON.x, BALLOON.y, 'Balloon back to Heaven');
    }
    if (state.room === ROOM.UNDERWATER) {
        for (let k = 0; k < 14; k++) {   // bubbles rising and swaying seaweed
            const bx = (k * 61) % 800, by = 560 - ((t * 40 + k * 43) % 520);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx + Math.sin(t * 2 + k) * 4, by, 3 + (k % 3), 0, Math.PI * 2); ctx.stroke();
        }
        for (let k = 0; k < 10; k++) {
            ctx.strokeStyle = '#2A8A3A'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30 + k * 82, 560);
            ctx.quadraticCurveTo(30 + k * 82 + Math.sin(t + k) * 14, 510, 30 + k * 82 + Math.sin(t * 1.3 + k) * 10, 470); ctx.stroke();
        }
    }
    if (state.room === ROOM.DINO && !P.tamed) {   // the friendly Triceratops, waiting for a friend
        const { x, y } = TRICERATOPS;
        drawGroundShadow(x, y + 16, 30, 7);
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = '#6A8ACA'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
        for (const lx of [-18, -8, 8, 18]) ctx.fillRect(lx, 8, 6, 12);
        ctx.fillStyle = '#8AAAE0'; ctx.beginPath(); ctx.arc(-32, -6, 14, 0, Math.PI * 2); ctx.fill();          // frill
        ctx.fillStyle = '#6A8ACA'; ctx.beginPath(); ctx.ellipse(-38, 0, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F4EED8'; for (const [hx, hy] of [[-44, -10], [-36, -14], [-50, 0]]) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 8, hy - 6); ctx.lineTo(hx - 2, hy + 3); ctx.fill(); }
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-40, -3, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        label('Friendly Triceratops 💙', x, y + 36, '#224');
        if (Math.hypot(player.x - x, player.y - y) < 50) drawSpeech({ x, y: y - 10 }, `${verb}: Tame & ride it! 🦕`);
    }
    if (state.room === ROOM.VOLCANO) {
        for (const r of LAVA_RIVERS) {
            const lava = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
            lava.addColorStop(0, '#FF7A10'); lava.addColorStop(0.5 + Math.sin(t * 2) * 0.2, '#FFD040'); lava.addColorStop(1, '#E03A00');
            ctx.fillStyle = lava; ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 16; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.shadowBlur = 0;
            for (let k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(255,255,200,0.7)'; ctx.beginPath(); ctx.arc(r.x + ((t * 30 + k * 97) % r.w), r.y + r.h / 2 + Math.sin(t * 4 + k) * (r.h / 3), 3, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.fillStyle = `rgba(255,80,0,${0.4 + Math.sin(t * 3) * 0.2})`; ctx.beginPath(); ctx.ellipse(400, 70, 50, 14, 0, 0, Math.PI * 2); ctx.fill();   // glowing crater
        label("⚠ Don't touch the lava! (a Flying Dragon can fly over it)", 400, 588, '#FFCC88');
    }
    if (state.room === ROOM.JUNGLE) {
        for (const sp of SPIKES) {   // spike traps pop up and down
            ctx.fillStyle = '#5A4A3A'; ctx.fillRect(sp.x - 12, sp.y - 4, 24, 8);
            if (spikesUp()) { ctx.fillStyle = '#CCCCCC'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sp.x + k * 7 - 4, sp.y); ctx.lineTo(sp.x + k * 7, sp.y - 14); ctx.lineTo(sp.x + k * 7 + 4, sp.y); ctx.fill(); } }
        }
        ctx.strokeStyle = '#3A7A1A'; ctx.lineWidth = 4;   // vines hanging over the pit
        ctx.beginPath(); ctx.moveTo(400, 150); ctx.quadraticCurveTo(400, 240, P.swing ? player.x : 400 + Math.sin(t) * 10, P.swing ? player.y - 10 : 250); ctx.stroke();
        for (const v of VINES) { ctx.fillStyle = '#6A9A2A'; ctx.beginPath(); ctx.arc(v.x, v.y, 8, 0, Math.PI * 2); ctx.fill(); }
        const vi = nearVine();
        if (vi !== null && vi >= 0) drawSpeech(VINES[vi], `${verb}: Swing on the vine! 🐒`);
        label('DEEP PIT', JUNGLE_PIT.x + JUNGLE_PIT.w / 2, JUNGLE_PIT.y + JUNGLE_PIT.h / 2, 'rgba(255,255,255,0.3)');
        if (!P.idolTaken) { ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(JUNGLE_IDOL.x, JUNGLE_IDOL.y - 6, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(JUNGLE_IDOL.x - 6, JUNGLE_IDOL.y, 12, 14); ctx.shadowBlur = 0; label('🗿 Golden Idol', JUNGLE_IDOL.x, JUNGLE_IDOL.y + 28, '#FFE066'); }
        label('Watch out for arrow traps, spikes and sneaky monkeys that steal coins!', 400, 588, '#DDFFAA');
    }
}

const HAUNTED_SHELVES = [{ x: 180, y: 118 }, { x: 400, y: 118 }, { x: 620, y: 118 }];   // one is a secret door!
let placeState = {};
function place(room = state.room) { return placeState[room]; }

// Walking into the special exits
function updatePlaceExits() {
    const near = (o, r = 30) => Math.hypot(player.x - o.x, player.y - o.y) < r;
    if ((state.room === ROOM.STADIUM || state.room === ROOM.SNOWFORT) && near(SUBPLACE_EXIT, 26)) { miniGame = null; changeRoom(ROOM.VOID); player.x = RACE_MASTER.x - 60; player.y = RACE_MASTER.y; return true; }
    for (const [id, sp] of Object.entries(SUBPLACES)) {
        if (state.room === sp.parent && near(sp.door, 26)) { changeRoom(id); showToast(`${sp.name} — find all ${sp.count} ${sp.item}!`, '#FFE066', 220); return true; }
        if (state.room === id && near(SUBPLACE_EXIT, 26)) { const b = sp.back || { x: sp.door.x, y: sp.door.y - 50 }; changeRoom(sp.parent); player.x = b.x; player.y = b.y; return true; }
    }
    if (state.room === ROOM.VOID && near(ROCKET, 28))        { showToast('🚀 3… 2… 1… BLAST OFF!', '#FFE066'); sfx('boom'); changeRoom(ROOM.SPACE); return true; }
    if (state.room === ROOM.SPACE && near(ROCKET, 28))       { showToast('🚀 Back home to the Void!', '#FFE066'); changeRoom(ROOM.VOID); player.x = ROCKET.x + 60; return true; }
    if (state.room === ROOM.HEAVEN && near(SKY_STAIRS, 30))  { changeRoom(ROOM.SKY); return true; }
    if (state.room === ROOM.HEAVEN && near(BALLOON, 30))     { showToast('🎈 Up, up and away to Cloud City!', '#AADDFF', 160); changeRoom(ROOM.CLOUDCITY); return true; }
    if (state.room === ROOM.CLOUDCITY && near(BALLOON, 30))  { changeRoom(ROOM.HEAVEN); player.x = BALLOON.x + 60; player.y = BALLOON.y - 20; return true; }
    if (state.room === ROOM.TOY && near(TOY_EXIT, 26))       { changeRoom(ROOM.MALL); player.x = 460; player.y = 300; return true; }
    if (state.room === ROOM.VOID && near(MALL_DOOR, 24))     { changeRoom(ROOM.MALL); showToast('🏬 Welcome to the Mall! Walk up to a shop.', '#FFE066', 160); return true; }
    if (state.room === ROOM.MALL && near(MALL_EXIT, 26))     { changeRoom(ROOM.VOID); player.x = MALL_DOOR.x + 40; player.y = MALL_DOOR.y + 50; return true; }
    if (state.room === ROOM.GREECE && near(MAZE_DOOR, 26))    { delete worldBlocks.maze; changeRoom(ROOM.MAZE); showToast('🐂 THE MAZE! Find the treasure… and watch out for the MINOTAUR!', '#FFAA66', 220); return true; }
    if (state.room === ROOM.GREECE && near(GORGON_DOOR, 26))  { changeRoom(ROOM.GORGON); showToast('🐍 Medusa\'s temple! When she says DON\'T LOOK — turn away!', '#88FF88', 240); return true; }
    if ([ROOM.GORGON, ROOM.UNDERWORLD].includes(state.room) && near(SCHOOL_EXIT, 26)) { const back = state.room === ROOM.GORGON ? GORGON_DOOR : CHARON; changeRoom(ROOM.GREECE); player.x = back.x; player.y = back.y - 50; return true; }
    if ((state.room === ROOM.CHESS || state.room === ROOM.LIBRARY) && near(SCHOOL_EXIT, 26)) { changeRoom(ROOM.PARADISE); player.x = 254; player.y = 290; return true; }
    if (state.room === ROOM.CAMP && near(CAMP_EXIT, 26))      { changeRoom(ROOM.MALL); player.x = 620; player.y = 300; return true; }
    if (state.room === ROOM.CAMP && near(OLYMPUS_STAIRS, 30)) { changeRoom(ROOM.OLYMPUS); showToast('🏛 You climbed all the way up to MOUNT OLYMPUS!', '#FFE066', 200); return true; }
    if (state.room === ROOM.HEAVEN && near(ENDING_DOOR, 26)) {
        if (endingUnlocked()) { startCredits(); player.y += 50; }
        else { showToast(`🔒 The SECRET ENDING needs ${ENDING_AWARDS} awards (you have ${awardsEarned()}) and the Boss Rush crown!`, '#FFE8A0', 240); player.y += 50; }
        return true;
    }
    if (state.room === ROOM.HEAVEN && near(HEAVEN_OLYMPUS, 30)) { changeRoom(ROOM.OLYMPUS); showToast('🏛 You climbed all the way up to MOUNT OLYMPUS!', '#FFE066', 200); return true; }
    if (state.room === ROOM.OLYMPUS && near(OLYMPUS_EXIT, 30)) { changeRoom(ROOM.HEAVEN); player.x = HEAVEN_OLYMPUS.x - 50; player.y = HEAVEN_OLYMPUS.y - 30; return true; }
    if (state.room === ROOM.VOID && near(ARENA_GATE, 26))    { changeRoom(ROOM.ARENA); showToast(`⚔ BOSS RUSH! Beat all ${BOSS_RUSH.length} bosses in a row!`, '#FF8866', 200); return true; }
    if (state.room === ROOM.ARENA && near(ARENA_EXIT, 26))   { changeRoom(ROOM.VOID); player.x = ARENA_GATE.x + 50; player.y = ARENA_GATE.y - 30; return true; }
    if (state.room === ROOM.SKY && near({ x: 400, y: 575 }, 30)) { changeRoom(ROOM.HEAVEN); player.x = SKY_STAIRS.x - 50; player.y = SKY_STAIRS.y + 40; return true; }
    if (PLACES[state.room] && PLACES[state.room].island && near(DOCK, 32)) {
        showToast('⛵ Sailing back to Paradise Island…', '#88CCFF');
        changeRoom(ROOM.PARADISE); player.x = CAPTAIN.x - 40; player.y = CAPTAIN.y - 10;
        return true;
    }
    return false;
}

// 🗺 A treasure map from Captain Salty: follow 3 clues, dig at each spot
const TREASURE_SPOTS = [
    { room: 'paradise', x: 400, y: 400, clue: 'Dig just below the fountain in Paradise' },
    { room: 'paradise', x: 140, y: 420, clue: 'Dig by the gate of the farm in Paradise' },
    { room: 'paradise', x: 480, y: 575, clue: 'Dig on the sandy beach in Paradise' },
    { room: 'void',     x: 180, y: 470, clue: 'Dig next to the rocket in the Void' },
    { room: 'hell',     x: 140, y: 520, clue: 'Dig beside the lava pool in Hell' },
    { room: 'heaven',   x: 330, y: 250, clue: 'Dig by the pearly gates in Heaven' },
    { room: 'candy',    x: 400, y: 370, clue: 'Dig by the chocolate river in Candy Land' },
];
const TREASURE_HITS = 3;

function startTreasureMap(clues = 3) {
    const spots = [...TREASURE_SPOTS].sort(() => Math.random() - 0.5).slice(0, Math.min(clues, TREASURE_SPOTS.length));
    state.treasure = { spots, step: 0, hits: 0 };
    showToast(`🗺 CLUE 1: ${spots[0].clue}!`, '#FFE8A0', 300);
}

function treasureSpotHere() {
    const T = state.treasure;
    if (!T || T.step >= T.spots.length) return null;
    const sp = T.spots[T.step];
    return sp.room === state.room ? sp : null;
}

function tryTreasureDig() {
    const sp = treasureSpotHere();
    if (!sp || Math.hypot(player.x - sp.x, player.y - sp.y) > 30) return false;
    const T = state.treasure;
    T.hits++;
    state.digAnim = 14;
    spawnParticles(sp.x, sp.y, '#8B5A2B', 6); sfx('dig');
    if (T.hits < TREASURE_HITS) return true;
    T.hits = 0; T.step++;
    if (T.step < T.spots.length) {
        showToast(`📜 Another clue! CLUE ${T.step + 1}: ${T.spots[T.step].clue}!`, '#FFE8A0', 320);
        sfx('found');
    } else {
        state.inv.diamond = invCount('diamond') + 5;
        state.hats.crown = true;
        addScore(300);
        showToast('💰 YOU FOUND THE TREASURE! 5 diamonds, a golden crown and 300 points!', '#FFD700', 320);
        spawnConfettiAt(sp.x, sp.y); sfx('win'); giveAward('treasure');
        state.treasure = null;
    }
    return true;
}

// A sparkly X when you're close to the spot (the clue tells you roughly where)
function drawTreasureX() {
    const sp = treasureSpotHere();
    if (!sp) return;
    const d = Math.hypot(player.x - sp.x, player.y - sp.y);
    if (d > 130) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (130 - d) / 70);
    ctx.strokeStyle = '#C0302A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sp.x - 9, sp.y - 9); ctx.lineTo(sp.x + 9, sp.y + 9); ctx.moveTo(sp.x + 9, sp.y - 9); ctx.lineTo(sp.x - 9, sp.y + 9); ctx.stroke();
    if (d < 30) {
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`${mainBtn()}: Dig for treasure!`, sp.x, sp.y - 18);
    }
    ctx.restore();
}

function sailItems() {
    const trip = (room, icon, desc) => ({ icon, name: PLACES[room].name.replace(/^\S+ /, ''), desc, cost: 0, status: 'SAIL!',
        action: () => { state.voyageTo = room; menu = null; changeRoom(ROOM.SHIP); showToast('⚓ Anchors up! Watch out for PIRATES!', '#88CCFF', 180); } });
    return [
        { icon: '🗺', name: 'Treasure Map', desc: state.treasure ? 'You already have one — follow the clues!' : 'Follow 3 clues to hidden treasure', cost: 0,
          status: state.treasure ? `CLUE ${state.treasure.step + 1}/3` : 'FREE!',
          action: () => { if (!state.treasure) { menu = null; startTreasureMap(); } } },
        trip(ROOM.CANDY,   '🍭', 'Gummy bears and lollipops'),
        trip(ROOM.ICE,     '❄', 'Snowmen and the Frost Giant'),
        trip(ROOM.HAUNTED, '👻', 'Skeletons, ghosts and a secret door'),
        trip(ROOM.DINO,    '🦕', 'Raptors — and a dinosaur you can ride!'),
        trip(ROOM.VOLCANO, '🌋', 'Lava rivers and the Fire Dragon'),
        trip(ROOM.JUNGLE,  '🐒', 'Vines, traps and a golden idol'),
        trip(ROOM.PYRAMID, '🏜', 'Mummies, scarabs and secret rooms'),
        trip(ROOM.PIRATECOVE, '🏴‍☠️', 'Buried treasure and a GHOST SHIP'),
        trip(ROOM.GREECE,  '🏛', 'The Hydra, Pegasus, Medusa and a maze!'),
        { icon: '🛶', name: 'Viking Longship', desc: 'Row to Viking Island — trolls and treasure', cost: 0, status: 'ROW!',
          action: () => { menu = null; changeRoom(ROOM.VIKING); showToast('🛶 HEAVE! HO! You rowed the Viking longship to Viking Island!', '#AADDFF', 220); } },
        { icon: '🟡', name: 'Submarine Dive', desc: 'Sharks, jellyfish and a Giant Octopus', cost: 0, status: 'DIVE!',
          action: () => { menu = null; changeRoom(ROOM.UNDERWATER); showToast('🟡 Diving down in the yellow submarine! 🌊', '#88DDFF', 180); giveAward('diver'); } },
    ];
}

function updatePlace() {
    const P = place();
    if (!P) return;
    if (state.room === ROOM.ARENA) updateArena();
    updateNewPlaces();
    if (state.room === ROOM.SHIP) {
        // Pirates climb aboard in waves until you reach the island
        if (--P.waveTimer <= 0 && P.voyage > 200) {
            P.waveTimer = 260;
            for (const side of [0, 1]) P.enemies.push(e0('pirate', side ? 700 : 100, 200 + Math.random() * 250));
            showToast('🏴‍☠️ PIRATES are climbing aboard!', '#FF8866', 100);
        }
        if (--P.voyage <= 0) {
            showToast('🏝 LAND HO! We made it!', '#FFE066', 180);
            giveAward('sailor');
            changeRoom(state.voyageTo || ROOM.CANDY);
            return;   // we're on the island now — don't keep running the ship's code
        }
    }
    if (state.room === ROOM.CANDY) {
        for (const l of P.lollipops) {
            if (l.picked || Math.hypot(player.x - l.x, player.y - l.y) > 22) continue;
            l.picked = true;
            if (state.playerHp < fullHearts()) state.playerHp++;
            addScore(15);
            spawnFloatText(l.x, l.y - 20, '🍭 Yum! +1 ❤', '#FF88CC', 70);
            sfx('coin');
        }
    }
    if (state.room === ROOM.HAUNTED) {
        const sh = HAUNTED_SHELVES[P.secret];
        if (!P.secretOpen && Math.hypot(player.x - sh.x, player.y - (sh.y + 30)) < 30) {
            P.secretOpen = true;
            showToast('🚪 A SECRET DOOR! The bookcase swung open!', '#CC99FF', 200);
            sfx('magic'); giveAward('secretDoor');
        }
        if (P.secretOpen && !P.treasureTaken && Math.hypot(player.x - sh.x, player.y - (sh.y + 30)) < 26) {
            P.treasureTaken = true;
            state.playerHp = fullHearts(); state.bubble = true; addScore(200);
            showToast('💎 SECRET TREASURE: full hearts, a Shield Bubble and 200 points!', '#FFE066', 220);
            spawnParticles(sh.x, sh.y + 20, '#FFD700', 20); sfx('win');
        }
    }
}

// Paintings for the new places
function paintShip(g, R) {
    const sea = g.createLinearGradient(0, 0, 0, 600);
    sea.addColorStop(0, '#2A7AB8'); sea.addColorStop(1, '#0E3A6A');
    g.fillStyle = sea; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 120; i++) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.5; const x = R() * 800, y = R() * 600; g.beginPath(); g.arc(x, y, 8 + R() * 10, 0.2, Math.PI - 0.2); g.stroke(); }
    // The ship's deck
    g.fillStyle = '#5A3A1E'; g.beginPath(); g.moveTo(90, 90); g.lineTo(710, 90); g.lineTo(740, 330); g.lineTo(710, 580); g.lineTo(90, 580); g.lineTo(60, 330); g.closePath(); g.fill();
    for (let x = 100; x < 700; x += 26) { g.fillStyle = `hsl(28, 45%, ${30 + R() * 10}%)`; g.fillRect(x, 96, 24, 480); }
    g.strokeStyle = '#3A2410'; g.lineWidth = 10; g.beginPath(); g.moveTo(90, 90); g.lineTo(710, 90); g.lineTo(740, 330); g.lineTo(710, 580); g.lineTo(90, 580); g.lineTo(60, 330); g.closePath(); g.stroke();
    for (const [cx, cy] of [[110, 200], [110, 440], [690, 200], [690, 440]]) { g.fillStyle = '#222'; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill(); }   // cannons
}
function paintCandy(g, R) {
    g.fillStyle = '#FFD6EC'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 300; i++) { g.fillStyle = ['#FF88C8', '#FFFFFF', '#AEE8FF', '#FFF2A0', '#C8A0FF'][Math.floor(R() * 5)]; g.fillRect(R() * 800, R() * 600, 4, 2); }   // sprinkles
    g.fillStyle = '#6B3A1E'; g.beginPath(); g.moveTo(0, 300); for (let x = 0; x <= 800; x += 20) g.lineTo(x, 300 + Math.sin(x / 60) * 14); g.lineTo(800, 340); g.lineTo(0, 340); g.fill();   // chocolate river
    for (let i = 0; i < 9; i++) {   // gumdrop hills
        const x = 60 + i * 90, y = 560;
        g.fillStyle = ['#FF5577', '#55CC77', '#FFCC33', '#AA66FF', '#33BBFF'][i % 5];
        g.beginPath(); g.arc(x, y, 30, Math.PI, 0); g.fill();
    }
    for (const [x, y] of [[80, 120], [720, 110], [60, 400], [740, 420]]) {   // candy cane trees
        g.strokeStyle = '#FFFFFF'; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y + 60); g.lineTo(x, y); g.arc(x + 12, y, 12, Math.PI, 0); g.stroke();
        g.strokeStyle = '#E03030'; g.lineWidth = 8; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x, y + 60); g.lineTo(x, y); g.arc(x + 12, y, 12, Math.PI, 0); g.stroke(); g.setLineDash([]);
    }
}
function paintIce(g, R) {
    g.fillStyle = '#EAF6FF'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 40; i++) {   // slippery ice patches
        const x = R() * 800, y = 80 + R() * 520;
        g.fillStyle = 'rgba(150,210,255,0.5)'; g.beginPath(); g.ellipse(x, y, 30 + R() * 50, 12 + R() * 16, R() * 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 10, y - 3); g.lineTo(x + 8, y - 6); g.stroke();
    }
    g.fillStyle = '#BFE6FF'; g.fillRect(250, 50, 300, 50);   // ice palace across the top
    for (const tx of [250, 330, 470, 550]) { g.fillStyle = '#A8DCFF'; g.fillRect(tx - 12, 36, 24, 64); g.beginPath(); g.moveTo(tx - 16, 36); g.lineTo(tx, 12); g.lineTo(tx + 16, 36); g.fill(); }
    for (const [x, y] of [[60, 150], [740, 160], [50, 380], [760, 400], [200, 540], [620, 560]]) {   // snowy pine trees
        g.fillStyle = '#2E6A4A'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 20 + k * 4, y + k * -14); g.lineTo(x, y - 30 - k * 14); g.lineTo(x + 20 - k * 4, y + k * -14); g.fill(); }
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x - 8, y - 44); g.lineTo(x, y - 58); g.lineTo(x + 8, y - 44); g.fill();
    }
}
function paintHaunted(g, R) {
    for (let y = 130; y < 600; y += 20) for (let x = (y / 20) % 2 ? -40 : 0; x < 800; x += 80) { g.fillStyle = `hsl(280, 15%, ${12 + R() * 6}%)`; g.fillRect(x, y, 79, 19); }
    g.fillStyle = '#2A1A3A'; g.fillRect(0, 46, 800, 90);
    g.fillStyle = 'rgba(120,60,140,0.3)'; for (let x = 0; x < 800; x += 30) g.fillRect(x, 46, 14, 90);
    for (const [x, y] of [[40, 60], [760, 60]]) {   // cobwebs
        g.strokeStyle = 'rgba(220,220,220,0.5)'; g.lineWidth = 1;
        for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(k * 0.4 + (x > 400 ? 1.6 : 0)) * 60, y + Math.sin(k * 0.4 + (x > 400 ? 1.6 : 0)) * 60); g.stroke(); }
    }
    for (const px of [290, 510]) {   // creepy portraits
        g.fillStyle = '#6A4A1A'; g.fillRect(px - 22, 62, 44, 54); g.fillStyle = '#3A2A3A'; g.fillRect(px - 17, 67, 34, 44);
        g.fillStyle = '#E8D8C8'; g.beginPath(); g.arc(px, 84, 9, 0, Math.PI * 2); g.fill();
    }
}
function paintSky(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#5AA8F0'); sky.addColorStop(1, '#CFE9FF');
    g.fillStyle = sky; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 50; i++) { const x = R() * 800, y = 380 + R() * 240, r = 40 + R() * 50; g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#B8B0A8'; g.fillRect(130, 250, 540, 280);                 // castle courtyard
    for (let x = 130; x < 670; x += 30) for (let y = 250; y < 530; y += 20) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.strokeRect(x + ((y / 20) % 2) * 15, y, 30, 20); }
    for (const tx of [130, 670]) {                                          // towers
        g.fillStyle = '#A8A098'; g.fillRect(tx - 30, 140, 60, 390);
        g.fillStyle = '#7A3A8A'; g.beginPath(); g.moveTo(tx - 38, 140); g.lineTo(tx, 70); g.lineTo(tx + 38, 140); g.fill();
    }
    g.fillStyle = '#7A3A8A'; for (const bx of [260, 540]) { g.fillRect(bx, 150, 30, 60); g.fillStyle = '#FFD700'; g.fillRect(bx + 11, 165, 8, 8); g.fillStyle = '#7A3A8A'; }   // banners
}
function paintSpace(g, R) {
    g.fillStyle = '#05050F'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 250; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; g.fillRect(R() * 800, R() * 600, R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); }
    const pl = g.createRadialGradient(660, 120, 10, 680, 140, 80);   // a ringed planet
    pl.addColorStop(0, '#FFB070'); pl.addColorStop(1, '#8A3A20');
    g.fillStyle = pl; g.beginPath(); g.arc(680, 140, 70, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,220,160,0.7)'; g.lineWidth = 6; g.beginPath(); g.ellipse(680, 140, 110, 22, -0.3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8A8A92'; g.beginPath(); g.moveTo(0, 330); for (let x = 0; x <= 800; x += 40) g.lineTo(x, 330 + Math.sin(x / 70) * 12); g.lineTo(800, 600); g.lineTo(0, 600); g.fill();   // moon surface
    for (let i = 0; i < 18; i++) { const x = R() * 800, y = 360 + R() * 230, r = 8 + R() * 22; g.fillStyle = 'rgba(60,60,70,0.5)'; g.beginPath(); g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); g.fill(); }   // craters
}

// Moving decorations drawn every frame
function drawPlace() {
    const t = Date.now() / 1000, P = place();
    if (!P) return;
    const label = (text, x, y, col = 'rgba(255,255,255,0.9)') => { ctx.fillStyle = col; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); };
    drawNewPlaces();
    if (PLACES[state.room].island) {   // the boat home
        ctx.fillStyle = '#6B3E1E'; ctx.beginPath(); ctx.moveTo(DOCK.x - 30, DOCK.y); ctx.lineTo(DOCK.x + 30, DOCK.y); ctx.lineTo(DOCK.x + 20, DOCK.y + 16); ctx.lineTo(DOCK.x - 20, DOCK.y + 16); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.moveTo(DOCK.x, DOCK.y - 40); ctx.lineTo(DOCK.x + 22, DOCK.y - 6); ctx.lineTo(DOCK.x, DOCK.y - 6); ctx.fill();
        ctx.fillStyle = '#555'; ctx.fillRect(DOCK.x - 1, DOCK.y - 42, 2, 42);
        label('⛵ Sail home', DOCK.x, DOCK.y + 30, state.room === ROOM.ICE ? '#335' : '#FFF');
    }
    if (state.room === ROOM.SHIP) {
        // Mast and a flapping sail, the sea rushing past
        ctx.fillStyle = '#4A2E18'; ctx.fillRect(396, 110, 8, 200);
        ctx.fillStyle = '#F4EEDC'; ctx.beginPath(); ctx.moveTo(404, 120); ctx.quadraticCurveTo(480 + Math.sin(t * 2) * 10, 180, 404, 260); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(404, 112); ctx.lineTo(440, 118); ctx.lineTo(404, 126); ctx.fill();   // pirate flag
        ctx.fillStyle = '#FFF'; ctx.font = '8px Arial'; ctx.fillText('☠', 418, 122);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        for (let k = 0; k < 10; k++) { const y = (k * 67 + t * 120) % 620 - 10; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(40, y + 8); ctx.moveTo(760, y); ctx.lineTo(780, y + 8); ctx.stroke(); }
        const secs = Math.ceil(P.voyage / 60);
        label(`🏝 Land in ${secs}s — fight off the pirates!`, 400, 586, '#FFE066');
    }
    if (state.room === ROOM.CANDY) {
        for (const l of P.lollipops) {
            if (l.picked) continue;
            ctx.fillStyle = '#FFF'; ctx.fillRect(l.x - 1, l.y, 2, 16);
            ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(t * 2);
            for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#FF4488' : '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, 9 - k * 2, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
    }
    // The bad guys here
    for (const e of P.enemies) {
        if (!e.alive) continue;
        drawEnemy(e, t);
        if (!(e.emerge > 0)) drawEnemyHp(e);
    }
    drawCoins(P.coins);
    if (state.room === ROOM.HAUNTED) {
        HAUNTED_SHELVES.forEach((sh, i) => {
            const open = P.secretOpen && i === P.secret;
            ctx.fillStyle = '#3A2410'; ctx.fillRect(sh.x - 30, sh.y - 50, 60, 72);
            if (open) {   // the secret room behind!
                ctx.fillStyle = '#0A0510'; ctx.fillRect(sh.x - 26, sh.y - 46, 52, 64);
                if (!P.treasureTaken) { ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 15; ctx.fillRect(sh.x - 10, sh.y - 4, 20, 14); ctx.shadowBlur = 0; }
                label(P.treasureTaken ? 'empty…' : '💎 TREASURE!', sh.x, sh.y + 36, '#FFE066');
            } else {
                for (let r = 0; r < 3; r++) for (let b = 0; b < 6; b++) { ctx.fillStyle = ['#5A1A1A', '#1A3A5A', '#2A4A1A', '#5A4A1A'][(b + r + i) % 4]; ctx.fillRect(sh.x - 26 + b * 9, sh.y - 44 + r * 22, 7, 18); }
            }
        });
        // Flickering candles and spooky darkness
        const dark = ctx.createRadialGradient(player.x, player.y, 60, player.x, player.y, 330);
        dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(0,0,10,0.75)');
        ctx.fillStyle = dark; ctx.fillRect(0, 0, 800, 600);
        for (const [cx, cy] of [[100, 200], [700, 200], [100, 450], [700, 450]]) {
            ctx.fillStyle = '#EEE'; ctx.fillRect(cx - 3, cy, 6, 14);
            ctx.fillStyle = `rgba(255,${180 + Math.random() * 60},80,0.9)`; ctx.beginPath(); ctx.ellipse(cx, cy - 4, 3, 6 + Math.random() * 2, 0, 0, Math.PI * 2); ctx.fill();
        }
        label('Psst… one of these bookcases is a SECRET DOOR. Walk into it!', 400, 588, '#CC99FF');
    }
    if (state.room === ROOM.SKY) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(400, 580, 50, 16, 0, 0, Math.PI * 2); ctx.fill();
        label('☁ Stairs down to Heaven', 400, 566, '#446');
    }
    if (state.room === ROOM.MALL) drawMall();
    if (state.room === ROOM.ARENA) {
        ctx.fillStyle = '#5A3A1E'; ctx.fillRect(ARENA_EXIT.x - 24, 560, 48, 40);
        label('🚪 Leave the arena', ARENA_EXIT.x, 556, '#FFF');
        const A = place();
        label(A.done ? '🏆 CHAMPION! 🏆' : A.rest > 0 && !A.enemies.some(e => e.alive) ? `Next boss coming… (${A.wave}/${BOSS_RUSH.length} beaten)` : `BOSS ${A.wave}/${BOSS_RUSH.length}`, 400, 104, '#FFE066');
    }
    if (state.room === ROOM.SPACE) {
        drawRocket(ROCKET.x, ROCKET.y, 'Rocket home');
        label('You feel floaty… no gravity in space!', 400, 588, '#AACCFF');
    }
}

function drawRocket(x, y, text) {
    ctx.save();
    ctx.fillStyle = '#EEE'; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.quadraticCurveTo(x + 14, y - 20, x + 12, y + 10); ctx.lineTo(x - 12, y + 10); ctx.quadraticCurveTo(x - 14, y - 20, x, y - 40); ctx.fill();
    ctx.fillStyle = '#E03030'; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x - 22, y + 16); ctx.lineTo(x - 10, y + 10); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 22, y + 16); ctx.lineTo(x + 10, y + 10); ctx.fill();
    ctx.fillStyle = '#5AB0F0'; ctx.beginPath(); ctx.arc(x, y - 16, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},0,0.9)`; ctx.beginPath(); ctx.moveTo(x - 7, y + 10); ctx.lineTo(x, y + 22 + Math.random() * 8); ctx.lineTo(x + 7, y + 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(`🚀 ${text}`, x, y + 40);
    ctx.restore();
}

// ── MORE PLACES: doors, things to collect, belts and the museum at night ──
const SUBPLACE_EXIT = { x: 400, y: 578 };
function updateSubplace() {
    const sp = SUBPLACES[state.room];
    if (!sp || !playing()) return;
    const P = place();
    for (const it of P.items) {
        if (it.got || Math.hypot(it.x - player.x, it.y - player.y) > 24) continue;
        it.got = true; sfx('coin'); spawnParticles(it.x, it.y, '#FFE066', 10);
        const left = P.items.filter(i => !i.got).length;
        spawnFloatText(it.x, it.y - 20, left ? `${left} to go!` : 'GOT THEM ALL!', '#FFE066', 60);
    }
    if (!P.prize && P.items.length && P.items.every(i => i.got)) {
        P.prize = true; state.coins += 60; addScore(150); giveAward('collector'); sfx('win'); spawnConfettiAt(player.x, player.y);
        showToast(`🏆 You found all ${sp.count} ${sp.item}! +🪙60`, '#FFD700', 220);
    }
    if (state.room === ROOM.FACTORY) {   // conveyor belts!
        FACTORY_BELTS.forEach((y, i) => { if (Math.abs(player.y - y) < 18) player.x = Math.max(18, Math.min(782, player.x + (i % 2 ? -1.6 : 1.6))); });
    }
    if (state.room === ROOM.CANDYVOLCANO && Math.random() < 0.01) {   // 🌋 the volcano ERUPTS sweets (and coins!)
        for (let k = 0; k < 4; k++) { const c = reachablePoint(300 + Math.random() * 200, 120 + Math.random() * 300); P.coins.push({ x: c.x, y: c.y, picked: false }); }
        spawnParticles(400, 70, '#FF66AA', 20); triggerShake(4);
    }
    if (state.room === ROOM.MUSEUM && P.night > 0 && --P.night === 0) {   // 🌙 the museum comes alive!
        P.enemies.push(e0('bonesaur', 180, 160), e0('bonesaur', 620, 160), e0('bonesaur', 180, 440), e0('bonerex', 620, 440, { r: 36, coinDrop: 30 }));
        showToast('🌙 NIGHT AT THE MUSEUM! The dinosaurs came ALIVE!', '#CCCCFF', 240); sfx('dragonRoar'); triggerShake(14);
    }
}
function drawSubplaces() {
    const verb = mainBtn();
    const t = Date.now() / 1000;
    for (const [id, sp] of Object.entries(SUBPLACES)) {   // doors in the places you know
        if (state.room !== sp.parent || sp.door.x < 0) continue;   // some places have no door (time machine, shrink ray)
        const { x, y } = sp.door;
        if (id === 'secretroom') { if (Math.sin(t * 3) > 0.6) drawStar(x, y, 4, '#FFE066'); continue; }   // 🕵 shhh — just a little twinkle
        ctx.save(); ctx.fillStyle = 'rgba(40,20,10,0.85)'; ctx.fillRect(x - 16, y - 22, 32, 40);
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(x + 9, y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.fillText(sp.doorLabel, Math.max(60, Math.min(740, x)), y - 28); ctx.restore();
    }
    const sp = SUBPLACES[state.room];
    if (!sp) return;
    const P = place();
    for (const it of P.items) {
        if (it.got) continue;
        ctx.save(); ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#FFE066'; ctx.shadowBlur = 10;
        ctx.fillText(it.icon, it.x, it.y + Math.sin(t * 3 + it.x) * 3); ctx.restore();
    }
    ctx.fillStyle = '#6B3E1E'; ctx.fillRect(SUBPLACE_EXIT.x - 24, 560, 48, 40);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('🚪 Go back', SUBPLACE_EXIT.x, 556);
    const left = P.items.filter(i => !i.got).length;
    if (!P.items.length) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(320, 76, 160, 20);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 11px Arial'; ctx.fillText(left ? `Find ${left} more ${sp.item}` : `✅ All ${sp.item} found!`, 400, 90);
    if (state.room === ROOM.MUSEUM && P.night > 0) { ctx.fillStyle = '#665'; ctx.fillText(`The museum closes in ${Math.ceil(P.night / 60)}s… 🌙`, 400, 112); }
    if (state.room === ROOM.MUSEUM && P.night === 0) { ctx.fillStyle = 'rgba(10,10,40,0.35)'; ctx.fillRect(0, 46, 800, 554); }
    if (state.room === ROOM.MUSEUM && P.night > 0) for (const [x, y] of [[180, 160], [620, 160], [180, 440], [620, 440]]) {
        ctx.save(); ctx.filter = 'grayscale(1) brightness(1.5)'; ctx.font = '50px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦖', x, y); ctx.restore();
    }
}

