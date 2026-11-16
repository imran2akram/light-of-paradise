// ── DRAW: VOID ────────────────────────────────────────────────
function drawRaceMaster() {
    const { x, y } = RACE_MASTER;
    drawGroundShadow(x, y + 16, 11, 4);
    drawHuman(x, y, 1, { shirt: '#222', pants: '#DDD', hair: '#AA3322', hairStyle: 'short' });
    ctx.fillStyle = '#6B3E1E'; ctx.fillRect(x + 11, y - 26, 2, 32);                      // flag pole
    for (let k = 0; k < 4; k++) for (let m = 0; m < 3; m++) {                             // checkered flag
        ctx.fillStyle = (k + m) % 2 ? '#FFF' : '#111';
        ctx.fillRect(x + 13 + k * 4, y - 26 + m * 4 + Math.sin(Date.now() / 150 + k) * 1.5, 4, 4);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🏁 Race Master', x, y + 30);
    if (nearRaceMaster()) {
        const verb = mainBtn();
        drawSpeech({ x, y }, `${verb}: Start a race! 🏁`);
    }
}

// ── THE WEAPON CHART (a sign in the Void): which weapon beats which bad guy ──
function nearChartSign() {
    return state.room === ROOM.VOID && !state.shopOpen && !state.buildMode && Math.hypot(player.x - CHART_SIGN.x, player.y - CHART_SIGN.y) < 44;
}

// "Fire Monster" → "Fire Monsters", "Mummy" → "Mummies", "The Kraken" → "Krakens"
function monsterPlural(name) {
    const n = name.replace(/^The /, '');
    if (n === 'Shadow You') return n;
    if (/man$/.test(n)) return n.slice(0, -3) + 'men';
    if (/Mouse$/.test(n)) return n.slice(0, -5) + 'Mice';
    if (/[^aeiou]y$/.test(n)) return n.slice(0, -1) + 'ies';
    if (/(s|sh|ch|x)$/.test(n)) return n + 'es';
    return n + 's';
}

function weaponChartItems() {
    const rows = [POWER.ICE, POWER.BRIMSTONE, POWER.LIGHTNING, POWER.WATER].map(w => {
        const beats = new Set(Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].weakTo === w).map(k => monsterPlural(ENEMY_TYPES[k].name)));
        return { icon: WEAPON_INFO[w].icon, name: `${WEAPON_INFO[w].label} beats`, desc: [...beats].join(', '), cost: 0, status: null, action: () => { menu = null; } };
    });
    rows.push({ icon: '🌈', name: 'RAINBOW POWER', desc: 'Beats everything!', cost: 0, status: null, action: () => { menu = null; } });
    return rows;
}

function openWeaponChart() {
    openMenu('📖 WHAT BEATS WHAT', weaponChartItems,
             { hint: `Every weapon still does a little damage to everything  ·  ${byInput('E to close', '✕ to close', 'B to close')}`, h: WEAPON_CHART_H, wide: true });
}

function drawChartSign() {
    const { x, y } = CHART_SIGN;
    drawGroundShadow(x, y + 16, 14, 4);
    ctx.fillStyle = '#6B3E1E'; ctx.fillRect(x - 3, y - 6, 6, 24);   // post
    ctx.fillStyle = '#C8964F'; ctx.fillRect(x - 24, y - 30, 48, 28);
    ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 2; ctx.strokeRect(x - 24, y - 30, 48, 28);
    ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    ctx.fillText('📖', x, y - 15);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.font = 'bold 12px Arial';
    ctx.fillText('Weapon chart', x, y + 32);
    if (nearChartSign()) drawSpeech({ x, y: y - 20 }, `${mainBtn()}: What beats what?`);
}

function drawArenaGate() {
    const { x, y } = ARENA_GATE, t = Date.now() / 1000;
    ctx.save();
    ctx.fillStyle = '#6A5A4A'; ctx.fillRect(x - 26, y - 34, 52, 44);
    ctx.fillStyle = '#2A1A0A'; ctx.beginPath(); ctx.arc(x, y - 6, 18, Math.PI, 0); ctx.lineTo(x + 18, y + 10); ctx.lineTo(x - 18, y + 10); ctx.fill();
    ctx.fillStyle = `rgba(255,${80 + Math.sin(t * 4) * 40},40,0.6)`; ctx.beginPath(); ctx.arc(x, y - 6, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⚔ BOSS RUSH', x, y + 24);
    ctx.restore();
}

function drawVoid() {
    drawRaceMaster();
    drawArenaGate();
    drawMallDoor();
    drawRocket(ROCKET.x, ROCKET.y, 'To SPACE!');
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font      = 'bold 26px Arial'; ctx.textAlign = 'center';
    ctx.fillText('~ THE VOID ~', 400, 295);
    ctx.font      = '14px Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('Every portal is a mystery — where will it take you?', 400, 328);

    // Shield hint (one short line: the full list of monsters is on the weapon chart sign)
    if (state.power !== POWER.NONE) {
        const w = WEAPON_INFO[state.power];
        ctx.fillStyle = w.color;
        ctx.font = 'bold 12px Arial';
        ctx.fillText(state.power === POWER.RAINBOW ? '🛡 RAINBOW SHIELD — protects you from every monster (not the Devil!)'
                                                   : `🛡 ${w.label} SHIELD — protects you from the monsters ${w.label.toLowerCase()} beats`, 400, 360);
    }

    drawChartSign();

    // Void enemies
    const t = Date.now() / 400;
    for (const e of voidRoom.enemies) {
        ctx.save();
        if (e.type === 'fire') {
            ctx.fillStyle = '#FF6600'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFAA00';
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + t;
                ctx.beginPath();
                ctx.arc(e.x + Math.cos(a) * e.r * 0.85, e.y + Math.sin(a) * e.r * 0.85, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#CC88FF'; ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, Math.PI, 0);
            ctx.lineTo(e.x + e.r,       e.y + e.r * 0.7);
            ctx.lineTo(e.x + e.r * 0.5, e.y + e.r * 0.25);
            ctx.lineTo(e.x,             e.y + e.r * 0.7);
            ctx.lineTo(e.x - e.r * 0.5, e.y + e.r * 0.25);
            ctx.lineTo(e.x - e.r,       e.y + e.r * 0.7);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#330055';
            ctx.beginPath();
            ctx.arc(e.x - 4, e.y - 2, 3, 0, Math.PI * 2);
            ctx.arc(e.x + 4, e.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Coins
    drawCoins(voidRoom.coins);

    // SHOP button (tap / click it, or press E / Y)
    if (!state.shopOpen) {
        const b = SHOP_BTN, pulse = state.coins > 0 ? 0.5 + 0.5 * Math.sin(Date.now() / 300) : 0;
        ctx.save();
        ctx.fillStyle = 'rgba(40,20,70,0.85)';
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6 + pulse * 10;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const key = byInput('E', '', 'Y');
        ctx.fillText(`🛒 SHOP${key ? '  (' + key + ')' : ''}`, b.x + b.w / 2, b.y + b.h / 2 + 1);
        // AWARDS button
        const a = AWARDS_BTN, akey = byInput('H', '', 'X');
        ctx.fillStyle = 'rgba(40,20,70,0.85)'; ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.strokeStyle = '#FFD700'; ctx.strokeRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = '#FFD700';
        const got = awardsEarned();
        ctx.fillText(`🏅 ${got}/${AWARDS.length}${akey ? '  (' + akey + ')' : ''}`, a.x + a.w / 2, a.y + a.h / 2 + 1);
        ctx.restore();
    }
}

// ── PET RACES (talk to the Race Master in the Void) ──────────
const RACE_MASTER  = { x: 700, y: 470 };
const RACE_FINISH  = 700;
let race = null;   // { lanes: [{ pet, x, you }], countdown, winner, doneTimer }

function nearRaceMaster() {
    return state.room === ROOM.VOID && !state.shopOpen && Math.hypot(player.x - RACE_MASTER.x, player.y - RACE_MASTER.y) < 44;
}

function raceItems() {
    return [
        { icon: '🐾', name: 'Pet Race',  desc: 'Tap fast to make your pet run', cost: 0, status: 'GO!', action: () => { menu = null; startRace(); } },
        { icon: '⭕', name: 'Ring Race', desc: 'Grab the rings! Friends can race too', cost: 0, status: 'GO!', action: () => { menu = null; startRingRace(); } },
        { icon: '🐾', name: 'Pet Battle', desc: 'Your pet vs a wild pet! Tap to cheer', cost: 0, status: 'GO!', action: () => { menu = null; startPetBattle(); } },
        { icon: '🎪', name: 'Mini-Games', desc: 'Football, tag, quiz, dancing and more!', cost: 0, status: 'LOOK →', action: () => openMenu('🎪 MINI-GAMES', miniGameItems) },
        { icon: '⚔', name: 'Friend Battle', desc: 'Bonk your friends! Last one standing wins', cost: 0, status: activeFriends().length ? 'FIGHT!' : 'NEEDS 2', action: () => { menu = null; startBattle(); } },
    ];
}

function startRace() {
    if (state.activePet < 0) { showToast('🏁 You need a pet to race! Buy one in the Shop.', '#FFCC88', 150); return; }
    const others = PETS.map((p, i) => i).filter(i => i !== state.activePet).sort(() => Math.random() - 0.5).slice(0, 3);
    race = { lanes: [{ pet: state.activePet, x: 90, you: true }, ...others.map(i => ({ pet: i, x: 90, speed: 1.2 + Math.random() * 0.6 }))],
             countdown: 180, winner: null, doneTimer: 0, boost: 0 };
    sfx('bite');
}

// Pressing the button during a race makes your pet run faster
function raceTap() {
    if (!race) return;
    if (race.countdown > 0 || race.winner) return;
    race.boost = Math.min(4, race.boost + 0.9);
    spawnParticles(race.lanes[0].x - 10, 170, '#FFE066', 2);
}

function updateRace() {
    if (race.countdown > 0) {
        if (race.countdown % 60 === 0) tone(race.countdown === 60 ? 880 : 440, 0.15, 'square', 0.15);
        race.countdown--;
        return;
    }
    if (race.winner) {
        if (++race.doneTimer > 200) race = null;
        return;
    }
    race.boost *= 0.95;
    for (const l of race.lanes) {
        l.x += l.you ? 0.9 + race.boost : l.speed + Math.sin(Date.now() / 300 + l.pet) * 0.3;
        if (l.x >= RACE_FINISH && !race.winner) race.winner = l;
    }
    if (race.winner) {
        const won = race.winner.you;
        if (won) { petGainXp(50); addScore(100); giveAward('race'); showToast(`🏆 Your ${PETS[state.activePet].name} WON the race!`, '#FFD700', 220); sfx('win'); }
        else     { petGainXp(10); showToast(`The ${PETS[race.winner.pet].name} won… try again!`, '#FFCC88', 180); }
    }
}

function drawRace() {
    if (!race) return;
    ctx.save();
    ctx.fillStyle = 'rgba(10,30,10,0.96)'; ctx.fillRect(40, 90, 720, 420);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.strokeRect(40, 90, 720, 420);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🏁 PET RACE 🏁', 400, 122);
    race.lanes.forEach((l, i) => {
        const y = 170 + i * 80;
        ctx.fillStyle = i % 2 ? '#3A7A2A' : '#4A8A3A'; ctx.fillRect(60, y - 30, 680, 64);   // grass lanes
        for (let k = 0; k < 8; k++) {                                                            // checkered finish line
            ctx.fillStyle = k % 2 ? '#FFF' : '#111';
            ctx.fillRect(RACE_FINISH + 10, y - 30 + k * 8, 8, 8); ctx.fillStyle = k % 2 ? '#111' : '#FFF'; ctx.fillRect(RACE_FINISH + 18, y - 30 + k * 8, 8, 8);
        }
        const bounce = race.countdown > 0 ? 0 : Math.abs(Math.sin(Date.now() / 90 + i)) * 6;
        drawPetShape(PETS[l.pet].id, l.x, y - bounce, 1.6, -1);
        ctx.fillStyle = l.you ? '#FFE066' : '#FFFFFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
        ctx.fillText(l.you ? `⭐ YOUR ${PETS[l.pet].name.toUpperCase()}` : PETS[l.pet].name, 66, y + 28);
    });
    ctx.textAlign = 'center';
    if (race.countdown > 0) {
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 60px Arial';
        ctx.fillText(String(Math.ceil(race.countdown / 60)), 400, 330);
    } else if (!race.winner) {
        ctx.fillStyle = Math.floor(Date.now() / 200) % 2 ? '#FFE066' : '#FFFFFF'; ctx.font = 'bold 18px Arial';
        ctx.fillText(`${byInput('Press SPACE', 'Tap', 'Press A')} as fast as you can to cheer your pet on!`, 400, 496);
    } else {
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 26px Arial';
        ctx.fillText(race.winner.you ? '🏆 YOU WIN! +50 pet XP' : `${PETS[race.winner.pet].name} wins!`, 400, 496);
    }
    ctx.restore();
}

// ── UPDATE: VOID HEALING ──────────────────────────────────────
function updateVoidHealing() {
    const maxHp = fullHearts();
    if ((state.room !== ROOM.VOID && state.room !== ROOM.HEAVEN) || state.playerHp >= maxHp) {
        state.voidHealTimer = 0;
        return;
    }
    state.voidHealTimer++;
    if (state.voidHealTimer >= (state.room === ROOM.HEAVEN ? 120 : 300)) {   // Void: 5 s, Heaven: 2 s
        state.playerHp = Math.min(maxHp, state.playerHp + 1);
        state.voidHealTimer = 0;
        state.playerFlash = 25;
        spawnParticles(player.x, player.y, '#FFD700', 8);
    }
}

// ── SHOP AND AWARDS BOARD (rectangles, buttons, paging) ────
// Shop layout (shared by drawing and by tap / click hit-testing)
const SHOP       = { X: 110, Y: 150, W: 580, H: 300 };
const SHOP_SLOTS = 16;                                       // 0-7 skins, 8 Shield Bubble, 9-15 pets
const SHOP_CLOSE = { x: SHOP.X + SHOP.W - 20, y: SHOP.Y + 20, r: 13 };
const SHOP_BTN   = { x: 270, y: 392, w: 120, h: 32 };        // on-screen SHOP button in the Void
const AWARDS_BTN = { x: 410, y: 392, w: 120, h: 32 };        // …and the AWARDS button next to it
// The awards board shows a few big cells at a time (every word 12 px or more); arrows turn the pages
const AWARDS_BOARD = { X: 90, Y: 48, W: 620, H: 540, COLS: 2, ROWS: 6, GRID_Y: 62, ROW_H: 66, ARROW_W: 72, ARROW_H: 40, ARROW_Y: 470 };
const AWARDS_PER_PAGE = AWARDS_BOARD.COLS * AWARDS_BOARD.ROWS;
let   awardsPage = 0;
function awardsPageCount() { return Math.max(1, Math.ceil(AWARDS.length / AWARDS_PER_PAGE)); }
function awardsTurn(d) { awardsPage = (awardsPage + d + awardsPageCount()) % awardsPageCount(); sfx('clink'); }   // (wraps round, so any arrow always does something)
function awardsPrevRect() { const B = AWARDS_BOARD; return { x: B.X + 90, y: B.Y + B.ARROW_Y, w: B.ARROW_W, h: B.ARROW_H }; }
function awardsNextRect() { const B = AWARDS_BOARD; return { x: B.X + B.W - 90 - B.ARROW_W, y: B.Y + B.ARROW_Y, w: B.ARROW_W, h: B.ARROW_H }; }
function setAwardsOpen(on) { if (on && !state.awardsOpen) awardsPage = 0; state.awardsOpen = on; }
const NEW_GAME_BTN = { x: 420, y: 488, w: 170, h: 38 };      // title screen, when there's a saved game
const CONTINUE_BTN = { x: 210, y: 488, w: 170, h: 38 };
const END_BTN    = { x: 300, y: 420, w: 200, h: 55 };        // Next Level / Play Again button

function shopSlotRect(i) {
    if (i < 8) {
        const cx = SHOP.X + 46 + i * 70, cy = SHOP.Y + 118;
        return { x: cx - 26, y: cy - 26, w: 52, h: 70, cx, cy };
    }
    const j = i - 8, x = SHOP.X + 14 + j * 70;
    return { x, y: SHOP.Y + 180, w: 66, h: 106, cx: x + 33, cy: SHOP.Y + 212 };
}

// Arrow keys / D-pad in the shop: left-right along a row, up-down between rows
function moveShopCursor(dx, dy) {
    let c = state.shopCursor;
    const top = c < 8;
    if (dx) c = top ? (c + dx + 8) % 8 : 8 + ((c - 8 + dx + 8) % 8);   // both rows have 8 things
    if (dy > 0 && top)  c += 8;
    if (dy < 0 && !top) c -= 8;
    state.shopCursor = c;
}

function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

function canOpenShop() {
    return state.gamePhase === 'playing' && state.room === ROOM.VOID && !state.won && !state.levelComplete;
}
function toggleShop() {
    if (state.shopOpen) state.shopOpen = false;
    else if (canOpenShop()) state.shopOpen = true;
}

// Buy or wear a shop item: 0-7 skins, 8 Shield Bubble, 9-12 pets
function shopSelect(i) {
    state.shopCursor = i;
    if (i >= 9) {
        const j = i - 9;
        if (state.ownedPets[j]) {
            state.activePet = j;
        } else if (state.coins >= PETS[j].cost) {
            state.coins -= PETS[j].cost;
            state.ownedPets[j] = true;
            state.activePet = j;
            giveAward('pet');
            if (state.ownedPets.every(Boolean)) giveAward('allPets');
            placePetBesidePlayer();
            spawnParticles(player.x, player.y, '#FFD700', 10);
            sfx('win');
        }
        return;
    }
    if (i === 8) {
        if (!state.bubble && state.coins >= BUBBLE_COST) {
            state.coins -= BUBBLE_COST;
            state.bubble = true;
            sfx('buy');
        }
        return;
    }
    if (state.unlockedSkins[i]) {
        state.activeSkin = i;
    } else if (state.coins >= AVATAR_UNLOCK_COST[i]) {
        state.coins -= AVATAR_UNLOCK_COST[i];
        state.unlockedSkins[i] = true;
        state.activeSkin = i;
        spawnParticles(player.x, player.y, AVATAR_COLORS[i], 8);
        sfx('buy');
    }
}

// ── DRAW: SHOP ────────────────────────────────────────────────
function drawShop() {
    if (!state.shopOpen) return;

    const W = SHOP.W, H = SHOP.H, SX = SHOP.X, SY = SHOP.Y;
    ctx.save();
    ctx.fillStyle   = 'rgba(10,5,25,0.98)';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth   = 2;
    ctx.fillRect(SX, SY, W, H);
    ctx.strokeRect(SX, SY, W, H);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('✦ SHOP ✦', 400, SY + 30);

    ctx.fillStyle = 'rgba(255,215,0,0.8)';
    ctx.font = '14px Arial';
    ctx.fillText(`Your coins: 🪙 ${state.coins}`, 400, SY + 52);

    ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(byInput('Arrows to choose, SPACE to buy / wear (or click)  |  1-8 skins, 9 bubble  |  E to close',
                         'Tap an item to buy or wear it  |  ✕ to close',
                         'D-pad to choose  |  A to buy / wear  |  B to close'), 400, SY + 68);

    // Close button
    ctx.beginPath(); ctx.arc(SHOP_CLOSE.x, SHOP_CLOSE.y, SHOP_CLOSE.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial'; ctx.textBaseline = 'middle';
    ctx.fillText('✕', SHOP_CLOSE.x, SHOP_CLOSE.y + 1);
    ctx.textBaseline = 'alphabetic';

    // Controller cursor
    if (lastInput !== 'touch') {
        const r = shopSlotRect(state.shopCursor);
        ctx.save();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
        ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
        ctx.restore();
    }

    for (let i = 0; i < SHOP_SKINS; i++) {
        const col = AVATAR_COLORS[i];
        const name = AVATAR_NAMES[i];
        const cost = AVATAR_UNLOCK_COST[i];
        const unlocked = state.unlockedSkins[i];
        const active   = state.activeSkin === i;

        const { cx: ix, cy: iy } = shopSlotRect(i);

        // Slot background
        ctx.fillStyle = active ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = active ? '#FFD700' : (unlocked ? '#666' : '#333');
        ctx.lineWidth = active ? 2 : 1;
        ctx.fillRect(ix - 26, iy - 26, 52, 70);
        ctx.strokeRect(ix - 26, iy - 26, 52, 70);

        // Avatar preview (locked skins still show their shape, greyed out)
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.35;
        drawAvatar(ix, iy - 2, 18, col, AVATAR_STYLES[i]);
        ctx.restore();

        // Key hint
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        if (lastInput === 'keyboard') ctx.fillText(`[${i + 1}]`, ix, iy + 15);

        // Name
        ctx.fillStyle = unlocked ? (col === '#2A2A2A' ? '#BBB' : col) : '#555';
        ctx.font = '12px Arial';
        ctx.fillText(name, ix, iy + 28, 66);

        // Cost or ✓
        if (!unlocked) {
            ctx.fillStyle = state.coins >= cost ? '#FFD700' : '#886';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`🪙${cost}`, ix, iy + 41);
        } else if (active) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('✓', ix, iy + 41);
        }
    }

    // Bottom row: Shield Bubble, then pets
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
    ctx.fillText('ITEMS & PETS — pets follow you, fight with their own powers and LEVEL UP!', SX + 14, SY + 174, SHOP.W - 28);
    for (let i = 8; i < SHOP_SLOTS; i++) {
        const r = shopSlotRect(i);
        const isPet = i >= 9, j = i - 9;
        const owned  = isPet ? state.ownedPets[j] : state.bubble;
        const active = isPet && state.activePet === j;
        ctx.fillStyle = active ? 'rgba(255,215,0,0.22)' : owned ? 'rgba(170,230,255,0.14)' : 'rgba(255,255,255,0.06)';
        ctx.strokeStyle = active ? '#FFD700' : owned ? '#AEE8FF' : '#555'; ctx.lineWidth = active ? 2 : 1;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (isPet) {
            drawPetShape(PETS[j].id, r.cx, r.cy, 1.3, 1);
            if (owned) { ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right'; ctx.fillText(`Lv${petLevel(j)}`, r.x + r.w - 3, r.y + 11); }
        } else {
            ctx.beginPath(); ctx.arc(r.cx, r.cy, 16, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(170,230,255,0.25)'; ctx.fill();
            ctx.strokeStyle = '#CCF0FF'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = isPet ? '#FFE8B0' : '#AEE8FF';
        fitText(isPet ? PETS[j].name : 'Bubble', r.cx, r.y + 65, r.w - 2, 12, true);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
        ctx.fillText(isPet ? PETS[j].power : (lastInput === 'keyboard' ? 'Block 1 hit (9)' : 'Block 1 hit'), r.cx, r.y + 81, r.w - 2);
        const cost = isPet ? PETS[j].cost : BUBBLE_COST;
        ctx.fillStyle = active ? '#FFD700' : owned ? '#AEE8FF' : state.coins >= cost ? '#FFD700' : '#886';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(active ? '✓ WITH YOU' : owned ? (isPet ? 'OWNED' : '✓ HAVE') : `🪙${cost}`, r.cx, r.y + 99, r.w - 2);
    }
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
    { id: 'yardBuilder', icon: '🔨', name: 'Backyard Builder',  desc: 'Build something in your backyard' },
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
    { id: 'wizardBoss',  icon: '🧙', name: 'Wizard Beater',    desc: 'Beat the Evil Wizard' },
    { id: 'mummyking',   icon: '🏺', name: 'Pharaoh Beater',   desc: 'Beat the Mummy King' },
    { id: 'candymonster',icon: '🍬', name: 'Sugar Rush',       desc: 'Beat the Candy Monster' },
    { id: 'bigBrother',  icon: '😈', name: 'REAL Hero',        desc: "Beat the Devil's Big Brother" },
    { id: 'pyramidSecret', icon: '🏺', name: 'Tomb Raider',    desc: 'Find a secret pyramid room' },
    { id: 'eggs',        icon: '🐣', name: 'Egg Finder',       desc: "Return Mama Bird's eggs" },
    { id: 'comboKid',    icon: '👊', name: 'Combo Kid',        desc: 'Do a punch-punch-KICK combo' },
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

// How many awards are won. Ids saved by older versions that are no longer in AWARDS are not counted.
function awardsEarned() { return AWARDS.filter(a => awards.got[a.id]).length; }

function giveAward(id) {
    const a = AWARDS.find(a => a.id === id);
    if (!a || awards.got[id]) return;   // an unknown id does nothing (a test keeps them out of the code)
    awards.got[id] = true;
    saveAwards();
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

// ── DRAW: AWARDS ──────────────────────────────────────────────
function drawAwards() {
    if (!state.awardsOpen) return;
    const B = AWARDS_BOARD, X = B.X, Y = B.Y, W = B.W, H = B.H;
    awardsPage = Math.min(awardsPage, awardsPageCount() - 1);
    ctx.save();
    ctx.fillStyle = 'rgba(10,5,25,0.97)'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.strokeRect(X, Y, W, H);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    const got = awardsEarned();
    ctx.fillText(`🏅 AWARDS  ${got}/${AWARDS.length}`, 400, Y + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px Arial';
    ctx.fillText(`Monsters beaten: ${awards.kills}   ·   Fish caught: ${awards.fish}`, 400, Y + 50);
    // A page of big cells: icon, name, and the description (wrapped, never squeezed)
    const gap = 8, cellW = (W - 28 - gap) / B.COLS, cellH = B.ROW_H - gap;
    const first = awardsPage * AWARDS_PER_PAGE;
    for (let i = 0; i < AWARDS_PER_PAGE && first + i < AWARDS.length; i++) {
        const a = AWARDS[first + i], has = awards.got[a.id];
        const x = X + 14 + (i % B.COLS) * (cellW + gap), y = Y + B.GRID_Y + Math.floor(i / B.COLS) * B.ROW_H;
        ctx.fillStyle = has ? 'rgba(255,215,0,0.22)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, cellW, cellH);
        ctx.strokeStyle = has ? '#FFD700' : '#555'; ctx.lineWidth = has ? 2 : 1; ctx.strokeRect(x, y, cellW, cellH);
        ctx.globalAlpha = has ? 1 : 0.35;   // locked ones are dim, earned ones glow gold
        ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFF';
        ctx.fillText(a.icon, x + 24, y + cellH / 2 + 9);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.fillStyle = has ? '#FFE680' : '#AAA'; ctx.font = 'bold 14px Arial';
        ctx.fillText((has ? '✓ ' : '🔒 ') + a.name, x + 46, y + 20);
        ctx.fillStyle = has ? '#FFFFFF' : '#BBB'; ctx.font = '12px Arial';
        wrapText(a.desc, cellW - 56, 2).forEach((line, k) => ctx.fillText(line, x + 46, y + 38 + k * 14));
    }
    // Page arrows and "2 / 9"
    const prev = awardsPrevRect(), next = awardsNextRect();
    for (const [r, label] of [[prev, '◀'], [next, '▶']]) {
        ctx.fillStyle = 'rgba(255,215,0,0.2)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
        ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 7);
    }
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`${awardsPage + 1} / ${awardsPageCount()}`, 400, prev.y + prev.h / 2 + 6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px Arial';
    ctx.fillText(byInput('◀ ▶ keys turn the page  ·  H or Esc closes', 'Tap ◀ ▶ to turn the page  ·  tap here to close', '◀ ▶ turn the page  ·  B closes'), 400, Y + H - 14);
    ctx.restore();
}

