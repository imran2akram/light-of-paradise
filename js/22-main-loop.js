// ── PAUSE (the kid switched tab or window: nothing keeps running or stays held down) ──
let paused = false;
let padResync = false;   // after a pause: held buttons count as already held, so they don't fire again

function pauseGame() {
    if (paused) return;
    paused = true;
    for (const k of Object.keys(keys)) keys[k] = false;
    vTouch.joyId = vTouch.shootId = vTouch.meleeId = vTouch.blockId = null;
    vTouch.joyDX = vTouch.joyDY = 0;
    padMove.x = padMove.y = 0; padPrev = [];
    buildFlash = null;
    // Let go without hitting: stopping a held punch must not fire a spin attack
    fight.holding = false; fight.hold = 0; fight.charge = 0; fight.blocking = false;
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();   // the music timer keeps ticking in a hidden tab
}
function resumeGame() {
    if (!paused || document.hidden || needTurn) return;   // (a phone still held upright stays paused)
    paused = false; padResync = true;
    resetFrameClock();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
// Closing a tab, switching apps or locking a phone can happen between the 5-second saves
function saveEverything() { saveGame(); if (state.gamePhase === 'playing' && !state.won) saveWorld(); lastSave = Date.now(); }
window.addEventListener('pagehide', saveEverything);
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveEverything(); pauseGame(); } else resumeGame(); });
window.addEventListener('blur', pauseGame);
window.addEventListener('focus', resumeGame);

// Shown when the window is visible but not in front (a hidden tab needs no picture)
function drawPaused() {
    if (!paused || needTurn) return;   // (the turn-your-phone page covers everything)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    ctx.font = 'bold 44px Arial'; ctx.fillText('⏸ PAUSED', 400, 290);
    ctx.font = '20px Arial'; ctx.fillText('Click here to play!', 400, 330);
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
