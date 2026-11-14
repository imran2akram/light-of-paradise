// ── DRAW: RAINBOW BACKGROUND ──────────────────────────────────
function drawRainbowBg() {
    const t    = Date.now() / 2200;
    const grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0,    `hsl(${(t * 60)       % 360}, 85%, 12%)`);
    grad.addColorStop(0.25, `hsl(${(t * 60 + 90)  % 360}, 85%, 12%)`);
    grad.addColorStop(0.5,  `hsl(${(t * 60 + 180) % 360}, 85%, 12%)`);
    grad.addColorStop(0.75, `hsl(${(t * 60 + 270) % 360}, 85%, 12%)`);
    grad.addColorStop(1,    `hsl(${(t * 60 + 360) % 360}, 85%, 12%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);
}

function drawEndHint() {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(byInput('or press ENTER', 'tap the button', 'or press START'), 400, 494);
}

function drawScoreLine(y) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial';
    ctx.fillText(`Score: ${state.score}    Best: ${highScore}`, 400, y);
    if (state.newBest && Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12;
        ctx.font = 'bold 15px Arial';
        ctx.fillText('🏆 NEW HIGH SCORE! 🏆', 400, y + 20);
    }
    ctx.restore();
}

// ── DRAW: LEVEL COMPLETE ──────────────────────────────────────
function drawLevelComplete() {
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(0, 0, 800, 600);

    const cfg = LEVEL_CONFIGS[state.level - 1];
    ctx.save();
    ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 50;
    ctx.fillStyle   = '#4FC3F7';
    ctx.font = 'bold 52px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.level} COMPLETE!`, 400, 195);
    ctx.restore();
    drawScoreLine(228);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px Arial'; ctx.textAlign = 'center';
    const nextCfg = LEVEL_CONFIGS[state.level];   // next level config
    const bossMsg  = nextCfg && nextCfg.isBoss ? '  ⚠ BOSS LEVEL NEXT!' : '';
    ctx.fillText(`Get ready for Level ${state.level + 1}…${bossMsg}`, 400, 282);
    ctx.restore();

    // Difficulty preview
    if (nextCfg) {
        ctx.fillStyle = 'rgba(255,200,100,0.8)';
        ctx.font = '15px Arial'; ctx.textAlign = 'center';
        const hints = [];
        if (nextCfg.ammoMax < cfg.ammoMax)           hints.push(`Ammo: ${nextCfg.ammoMax} bullets`);
        if (nextCfg.reloadFrames > cfg.reloadFrames) hints.push(`Reload: ${(nextCfg.reloadFrames/60).toFixed(0)}s`);
        if (nextCfg.devilHp > cfg.devilHp)           hints.push(`Boss HP: ${nextCfg.devilHp}`);
        if (nextCfg.playerMaxHp < cfg.playerMaxHp)   hints.push(`Lives: ${nextCfg.playerMaxHp}`);
        if (hints.length) ctx.fillText('Next level: ' + hints.join('  |  '), 400, 312);
    }

    // Orbiting stars
    const t = Date.now() / 300;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        drawStar(400 + Math.cos(a) * 110, 370 + Math.sin(a) * 42,
            14 + Math.sin(t + i) * 4, '#4FC3F7');
    }

    // Next Level button
    ctx.save();
    ctx.shadowColor = '#4FC3F7'; ctx.shadowBlur = 20;
    ctx.fillStyle   = '#0a2840';
    ctx.fillRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.strokeStyle = '#4FC3F7'; ctx.lineWidth = 2;
    ctx.strokeRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Next Level  ▶', 400, 454);
    ctx.restore();
    drawEndHint();
}

// ── DRAW: WIN SCREEN ──────────────────────────────────────────
function drawWin() {
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, 800, 600);

    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 55;
    ctx.fillStyle   = '#FFD700';
    ctx.font = 'bold 54px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PARADISE IS SAVED!', 400, 185);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 22;
    ctx.fillStyle   = '#FFFFFF';
    ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
    ctx.fillText('YOU ARE A HERO!', 400, 240);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,215,0,0.75)';
    ctx.font = '18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`Coins collected: 🪙 ${state.coins}`, 400, 272);
    drawScoreLine(298);

    // Orbiting stars
    const t = Date.now() / 300;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t;
        drawStar(400 + Math.cos(a) * 110, 360 + Math.sin(a) * 42,
            14 + Math.sin(t + i) * 4, '#FFD700');
    }

    // Play Again button
    ctx.save();
    ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 20;
    ctx.fillStyle   = '#1a3488';
    ctx.fillRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.strokeStyle = '#6699FF'; ctx.lineWidth = 2;
    ctx.strokeRect(END_BTN.x, END_BTN.y, END_BTN.w, END_BTN.h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Play Again', 400, 454);
    ctx.restore();
    drawEndHint();
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
    const got = AWARDS.filter(a => awards.got[a.id]).length;
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

// ── DRAW: CONTROLS ────────────────────────────────────────────
function drawControls() {
    if (!settings.hints) return;
    if (lastInput === 'touch') {   // a short line a child can read, in the gap between the stick and the buttons
        if (state.buildMode || state.gamePhase !== 'playing' || !touchUiShown()) return;
        ctx.save();
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        const text = 'Left: walk  ·  Big button: shoot or dig', w = ctx.measureText(text).width + 20;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(400 - w / 2, 576, w, 20);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(text, 400, 590);
        ctx.restore();
        return;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '11px Arial'; ctx.textAlign = 'right';
    const hint = lastInput === 'pad'   ? 'Move: stick / D-pad  |  Shoot / Dig: A  |  Shop: Y  |  Sound: Back'
               : p2.active ? 'P1: WASD + Space   ·   P2: Arrows + Enter   ·   P: Player 2 leaves'
               : 'Move: WASD  |  Shoot: Space (hold = charge)  |  Punch: J  |  Block: X  |  Jump: C  |  Build: B  |  Settings: O';
    ctx.fillText(hint, 792, 592);
}

function drawVirtualControls() {
    if (!touchUiShown() || paused) return;
    if (layoutDirty) layoutTouch();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Joystick: drawn where the finger really is (the stick starts wherever you first touch)
    const held = vTouch.joyId !== null;
    const jx = held ? vTouch.joyOriX : VJOY.x, jy = held ? vTouch.joyOriY : VJOY.y;
    ctx.beginPath(); ctx.arc(jx, jy, VJOY.baseR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(jx + vTouch.joyDX, jy + vTouch.joyDY, VJOY.baseR * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.stroke();

    // Round buttons: lit up while a finger holds them
    for (const [b, icon, on] of touchButtonList()) {
        const big = b === VSHOOT;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = big ? (on ? 'rgba(255,220,50,0.45)' : 'rgba(255,220,50,0.18)') : (on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)'); ctx.fill();
        ctx.strokeStyle = big ? 'rgba(255,220,50,0.8)' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.stroke();
        if (!icon) continue;
        ctx.fillStyle = '#FFF'; ctx.font = `${Math.round(b.r * 0.95)}px Arial`; ctx.fillText(icon, b.x, b.y + 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = `bold ${Math.round(VSHOOT.r * 0.3)}px Arial`;
    ctx.fillText(state.buildMode ? 'PLACE' : (nearbyDigSpot() && canDig()) || nearbyGem() ? 'DIG' : nearbyNpc() ? 'TALK' : nearbyMineable() ? 'MINE'
                 : nearbyCrop() ? 'WATER' : atFishingSpot() ? 'FISH' : wouldDigGround() ? 'DIG' : state.power === POWER.NONE ? 'SWING' : 'SHOOT', VSHOOT.x, VSHOOT.y);

    ctx.restore();
}

// ── MAIN LOOP ─────────────────────────────────────────────────
function update() {
    if (paused || state.gamePhase === 'intro') return;
    if (race) { updateRace(); updateParticles(); return; }   // everything waits while you race
    if (petBattle) { updatePetBattle(); updateParticles(); return; }
    if (tvShow) { if (++tvShow.t > 900) tvShow = null; return; }
    if (credits) { updateCredits(); updateParticles(); return; }
    if (danceBattle) { updateDanceBattle(); updateParticles(); return; }

    if (settings.creative) {   // Creative Mode: coins never run out (your real coins are kept safe)
        if (state.coinsBackup === undefined) state.coinsBackup = state.coins;
        state.coins = 99999;
    }
    endScreenFrames = state.won || state.levelComplete ? endScreenFrames + 1 : 0;
    // A menu, the shop or the awards board is open: the world waits for you (monsters must not hurt you while you read)
    if (menu || state.shopOpen || state.awardsOpen) { fight.charge = 0; updateParticles(); return; }
    updatePlayer();
    if (!state.won && !state.levelComplete) {
        updateEnemies();
        updateRoomEnemies();
        updateDevilMinions();
        updateProjectiles();
        updateEnemyProjectiles();
        checkPickups();
        updateDigging();
        updateTown();
        updatePet();
        updateLessons();
        updateDanceAndFart();
        updateP2();
        updateSpells();
        updateFunExtras();
        updateFighting();
        updateGadgets();
        updateBlocks();
        updateScenery();
        updateHeaven();
        updatePlace();
        updateVoidHealing();
        updateAmmo();
    }
    updateParticles();
    if (pendingRespawn) { pendingRespawn = false; changeRoom(ROOM.VOID); }
    if (state.screenShake > 0) state.screenShake--;

    // Fire confetti once on win or level complete
    if ((state.won || state.levelComplete) && !state.confettiSpawned) {
        state.confettiSpawned = true;
        spawnConfetti();
        sfx('win');
        if (state.won) { giveAward('hero'); clearSave(); }
    }
    // Save now and then
    if (state.gamePhase === 'playing' && !state.won && Date.now() - lastSave > 5000) { lastSave = Date.now(); saveGame(); if (worldDirty) saveWorld(); }
}
let lastSave = 0;

// The game paints its 800×600 picture in the middle of the canvas; on a wide phone the margins are
// black and only the touch buttons are drawn there.
function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (view.margin) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.setTransform(renderScale, 0, 0, renderScale, view.offX * renderScale, 0);   // 800×600 drawing onto however many real pixels we have
    ctx.save();
    if (view.margin) { ctx.beginPath(); ctx.rect(0, 0, GAME_W, GAME_H); ctx.clip(); }
    drawGame();
    ctx.restore();
    drawVirtualControls();
}

function drawGame() {
    ctx.save();
    if (state.screenShake > 0) {
        const s = state.screenShake * 0.8;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    if (state.gamePhase === 'intro') {
        drawIntro();
        drawMenu();
        drawPaused();
        ctx.restore();
        return;
    }

    // Background
    if (state.won || state.levelComplete) {
        drawRainbowBg();
    } else {
        drawRoomBackground();
    }

    if (state.room === ROOM.PARADISE && !state.won && !state.levelComplete) drawParadiseSky();
    if (!state.won && !state.levelComplete && state.room === ROOM.HEAVEN) drawHeavenBack();
    if (!state.won && !state.levelComplete) { drawGroundHoles(); drawTreasureX(); drawScenery(); drawBlocks(); }
    if (!state.won && !state.levelComplete) drawPortals();
    if (state.room === ROOM.VOID)     drawVoid();
    if (state.room === ROOM.HELL)     drawHell();
    if (state.room === ROOM.PARADISE) drawParadise();
    if (state.room === ROOM.SECRET)   drawSecretRoom();
    if (state.room === ROOM.UNDERGROUND) drawUnderground();
    if (state.room === ROOM.HEAVEN)   { drawHeaven(); drawOlympusStairs(HEAVEN_OLYMPUS, '🏛 Stairs to Mount Olympus'); drawEndingDoor(); }
    if (state.room === ROOM.HOUSE)    drawHouse();
    if (PLACES[state.room])           drawPlace();
    drawPlayer();
    drawP2();
    drawHeartPickups();
    drawGadgets();
    drawSpells();
    drawFunExtras();
    drawFighting();
    drawPet();
    drawProjectiles();
    drawBolts();
    drawEnemyProjectiles();
    drawParticles();
    if (state.room === ROOM.PARADISE && !state.won && !state.levelComplete) drawWeather();
    if (state.room === ROOM.UNDERGROUND) drawCaveDarkness();
    else if (state.room === ROOM.HELL && isPlayerPhysicallyInCave() && !state.won && !state.levelComplete) drawInsideCave();
    else if (!state.won && !state.levelComplete) drawVignette();
    drawFloatTexts();
    drawJoinProgress();
    drawControlsPanel();
    drawHUD();
    drawControls();
    drawHotbar();
    drawShop();
    drawAwards();
    drawMenu();
    drawToast();
    drawRace();
    drawPetBattle();
    drawDanceBattle();
    drawTvShow();
    drawCredits();
    if (state.levelComplete) drawLevelComplete();
    if (state.won)           drawWin();
    drawPaused();

    ctx.restore();
}

// ── ERROR REPORTS ─────────────────────────────────────────────
// A bug on a player's screen is sent to a small Cloudflare Worker (see worker/README.md)
// so it can be fixed later. Empty URL = reports are only logged to the console.
const ERROR_LOG_URL      = 'https://lop-errors.imran2akram.workers.dev/report';   // empty = console only
const MAX_ERROR_REPORTS  = 5;    // per page load: the same bug every frame is reported once, not 3600 times a minute
const reportedErrors     = new Set();
function reportError(where, e) {
    console.error(where + ' error', e);
    if (!ERROR_LOG_URL) return;
    const message = String(e && e.message || e || 'unknown').slice(0, 500);
    const key = where + '|' + message;
    if (reportedErrors.has(key) || reportedErrors.size >= MAX_ERROR_REPORTS) return;
    reportedErrors.add(key);
    const body = JSON.stringify({
        where, message, stack: String(e && e.stack || '').slice(0, 4000),
        room: state.room, phase: state.gamePhase, level: state.level, input: lastInput,
        build: document.lastModified,   // GitHub Pages sets this to the deploy time: which version of the game
        ua: navigator.userAgent,
    });
    // text/plain keeps this a "simple" request, so the browser sends it without a CORS preflight
    try { fetch(ERROR_LOG_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {}); }
    catch (err) { /* reporting must never cause another error */ }
}
// Errors outside the frame loop (key presses, taps, audio callbacks) are reported too
window.addEventListener('error', ev => reportError('window', ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => reportError('promise', ev.reason));

// The game counts in frames, so it must always run at 60 steps a second, whatever the screen's refresh rate:
// a 144 Hz monitor would run it 2.4x fast and a 30 Hz tablet at half speed. Real time is collected in
// stepAccum and spent in fixed 1/60 s update() steps; draw() runs once per screen frame.
const STEP_MS         = 1000 / 60;   // one game step
const MAX_STEPS_FRAME = 4;           // never catch up more than this in one frame: a hitch must not fast-forward the game
const STEP_SNAP_MS    = 2;           // a frame this close to one step counts as exactly one (60 Hz timers wobble by a ms or so)
const MAX_FRAME_GAP   = 250;         // a longer gap (hidden tab, slow device) just restarts the clock
let lastFrameTime = null, stepAccum = 0;
function resetFrameClock() { lastFrameTime = null; stepAccum = 0; }

// How many update steps this frame is owed. Called without a timestamp (tests, the first call) = exactly one.
function stepsOwed(now) {
    if (now === undefined) { resetFrameClock(); return 1; }
    const dt = lastFrameTime === null ? NaN : now - lastFrameTime;
    lastFrameTime = now;
    if (!(dt >= 0) || dt > MAX_FRAME_GAP) { stepAccum = 0; return 1; }
    stepAccum += Math.abs(dt - STEP_MS) < STEP_SNAP_MS ? STEP_MS : dt;
    let n = Math.floor(stepAccum / STEP_MS);
    stepAccum -= n * STEP_MS;
    if (n > MAX_STEPS_FRAME) { n = MAX_STEPS_FRAME; stepAccum = 0; }
    return n;
}

// If one frame throws, log it and carry on: an uncaught error here would stop
// requestAnimationFrame from being re-armed and freeze the game until a reload.
function loop(now) {
    // pollGamepad() runs once per step so a button press is seen exactly once, never lost or doubled
    for (let n = stepsOwed(now); n > 0; n--) {
        try { pollGamepad(); update(); }
        catch (e) { reportError('update', e); }
    }
    try { draw(); }
    catch (e) { reportError('draw', e); fitCanvas(); }   // resizing the canvas also resets any half-finished ctx.save()/clip
    requestAnimationFrame(loop);
}

gameReady = true;
if (needTurn) pauseGame();   // (a phone opened upright)
loop();
