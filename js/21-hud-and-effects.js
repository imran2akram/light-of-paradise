// ── DRAW: HUD ─────────────────────────────────────────────────
function drawHUD() {
    // Taller HUD when ammo bar is shown
    const hudH = (state.power !== POWER.NONE && state.room !== ROOM.VOID) ? 68 : 46;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, 800, hudH);

    // Light Crystals
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 17px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Crystals: ${state.lightCrystals}/3`, 14, 28);
    const god = godParent();
    let tagX = 110;
    if (god) {
        ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#FFE680';
        const tag = `${god.icon} Child of ${god.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}`;
        ctx.fillText(tag, tagX, 45); tagX += ctx.measureText(tag).width + 10;
    }
    const house = houseInfo();
    if (house) { ctx.font = 'bold 11px Arial'; ctx.fillStyle = house.color; ctx.fillText(`${house.icon} ${house.name}`, tagX, 45); }
    for (let i = 0; i < 3; i++) {
        drawStar(210 + i * 28, 23, i < state.lightCrystals ? 11 : 7,
            i < state.lightCrystals ? '#FFD700' : '#333');
    }

    // HP hearts
    ctx.font = '18px Arial'; ctx.textAlign = 'center';
    let hearts = '';
    const maxHp = fullHearts();
    for (let i = 0; i < maxHp; i++) hearts += i < state.playerHp ? '❤' : '♡';
    ctx.fillStyle = '#FF4444';
    ctx.fillText(hearts, 400, 20);
    activeFriends().forEach((f, i) => {   // friends' hearts
        ctx.fillStyle = f.color; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
        ctx.fillText(`P${f.n} ` + (f.down > 0 ? '💤' : '❤'.repeat(Math.max(0, f.hp)) + '♡'.repeat(Math.max(0, 3 - f.hp))), 446 + i * 66, 20);
        ctx.textAlign = 'center';
    });

    // Room name + Level
    const names = { void: 'THE VOID', hell: 'HELL', paradise: 'PARADISE ISLAND', secret: '✨ SECRET GOLDEN ROOM ✨', underground: 'UNDERGROUND CAVES', heaven: '☁ HEAVEN ☁', house: '🏠 YOUR HOME',
                    ...Object.fromEntries(Object.entries(PLACES).map(([k, v]) => [k, v.name])) };
    const cfg    = LEVEL_CONFIGS[state.level - 1];
    const lvlLabel = cfg.isBoss ? `LEVEL ${state.level} — BOSS!` : `LEVEL ${state.level}`;
    ctx.fillStyle = cfg.isBoss ? 'rgba(255,100,50,0.85)' : 'rgba(255,255,255,0.5)';
    ctx.font = cfg.isBoss ? 'bold 11px Arial' : '11px Arial';
    ctx.fillText(`${names[state.room]} · ${lvlLabel}`, 400, 38);

    // Power
    ctx.fillStyle = state.power === POWER.RAINBOW ? getPlayerColor() : WEAPON_INFO[state.power].color;
    ctx.font = 'bold 17px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`Power: ${WEAPON_INFO[state.power].icon} ${powerName()}`, 786, 28);

    // ── AMMO BAR ──────────────────────────────────────────────
    if (state.power !== POWER.NONE && state.room !== ROOM.VOID) {
        const bx = 14, by = 54, bh = 14, bw = 130;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);

        if (state.ammoReloading) {
            const pct = 1 - state.ammoReloadTimer / LEVEL_CONFIGS[state.level - 1].reloadFrames;
            ctx.fillStyle = '#FF8800';
            ctx.fillRect(bx, by, bw * pct, bh);
            ctx.fillStyle = '#FFA500';
            ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
            const secsLeft = Math.ceil(state.ammoReloadTimer / 60);
            ctx.fillText(`RELOADING… ${secsLeft}s`, bx + 2, by + bh - 1);
        } else {
            const bulletW = Math.floor(bw / state.ammoMax) - 2;
            for (let i = 0; i < state.ammoMax; i++) {
                ctx.fillStyle = i < state.ammo ? '#4FC3F7' : '#333';
                ctx.fillRect(bx + i * (bulletW + 2), by, bulletW, bh);
            }
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
            ctx.fillText(`AMMO ${state.ammo}/${state.ammoMax}`, bx + 2, by + bh - 1);
        }
    }

    // ── COINS ─────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 6;
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left';
    ctx.fillText(settings.creative ? '🪙 ∞' : `🪙 ${state.coins}`, 14, 46);
    ctx.restore();

    // ── SCORE ─────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`Score ${state.score}   ·   Best 🏆 ${highScore}`, 786, 46);

    drawGadgetHud();
    drawBuildButton();
    if (state.treasure && !state.buildMode) {
        ctx.save();
        const clue = `🗺 Clue ${state.treasure.step + 1}/3: ${state.treasure.spots[state.treasure.step].clue}`;
        ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        const cw = Math.max(300, ctx.measureText(clue).width + 20);
        ctx.fillStyle = 'rgba(60,40,10,0.8)'; ctx.fillRect(400 - cw / 2, 50, cw, 20);
        ctx.fillStyle = '#FFE8A0'; ctx.fillText(clue, 400, 65);
        ctx.restore();
    }

    // ── MUTE BUTTON (M) ───────────────────────────────────────
    if (!usesTouchLayout()) {   // (on a phone these are drawn with the other touch buttons)
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(MUTE_BTN.x, MUTE_BTN.y, MUTE_BTN.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF';
    ctx.fillText(muted ? '🔇' : '🔊', MUTE_BTN.x, MUTE_BTN.y + 1);
    ctx.beginPath(); ctx.arc(SETTINGS_BTN.x, SETTINGS_BTN.y, SETTINGS_BTN.r, 0, Math.PI * 2);   // ⚙ settings
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.fillText('⚙', SETTINGS_BTN.x, SETTINGS_BTN.y + 1);
    ctx.restore();
    }
    if (settings.creative) {   // a badge so you know you're in Creative Mode
        ctx.save();
        ctx.fillStyle = 'rgba(60,160,60,0.9)'; ctx.fillRect(352, 50, 96, 18);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('🎮 CREATIVE', 400, 63);
        ctx.restore();
    }
}

// ── TOASTS (big messages at the top of the screen) ───────────
let toast = null;   // { text, color, timer }
function showToast(text, color = '#FFE066', frames = 180) { toast = { text, color, timer: frames }; }
const TOAST_Y = 76, TOAST_H = 32;
// The pop-up (menu, shop or awards board) that is open now, or null: a toast must not hide its title and hint
function overlayRect() {
    if (menu)             return { x: MENU.X, y: MENU.Y, w: MENU.W, h: menu.h };
    if (state.shopOpen)   return { x: SHOP.X, y: SHOP.Y, w: SHOP.W, h: SHOP.H };
    if (state.awardsOpen) return { x: AWARDS_BOARD.X, y: AWARDS_BOARD.Y, w: AWARDS_BOARD.W, h: AWARDS_BOARD.H };
    return null;
}
// Where the toast sits: the usual spot, or just above an open pop-up (still on screen, so "Not enough coins" is seen)
function toastY() {
    const o = overlayRect();
    return o ? Math.max(4, o.y - TOAST_H - 4) : TOAST_Y;
}
function drawToast() {
    if (!toast) return;
    if (--toast.timer <= 0) { toast = null; return; }
    ctx.save();
    ctx.globalAlpha = Math.min(1, toast.timer / 30);
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
    const w = ctx.measureText(toast.text).width + 30, y = toastY();
    ctx.fillStyle = 'rgba(15,10,30,0.88)'; ctx.fillRect(400 - w / 2, y, w, TOAST_H);
    ctx.strokeStyle = toast.color; ctx.lineWidth = 2; ctx.strokeRect(400 - w / 2, y, w, TOAST_H);
    ctx.fillStyle = toast.color; ctx.fillText(toast.text, 400, y + 22);
    ctx.restore();
}

// ── CONTROLS HELP (a pop-up cheat-sheet: the "? Help" chip, K, or View + LB) ─────
// It is a menu with no items (so the world waits, and Esc, Space, Enter, K, A, B, Y, Start, a click or the ✕ all close it).
// Touch has its own hints and does not get it.
const HELP_SEEN_KEY = 'lop_help_seen';
const HELP_ROW_H = 22, HELP_TOP = 66, HELP_COL_W = 250;
const HELP_CHIP = { right: 792, y: 50, h: 20 };   // a tab hanging under the top bar's right end: the bar already covers that strip, so no walk-up spot or prompt is hidden
function helpChipRect() { const w = keyName(86, 122); return { x: HELP_CHIP.right - w, y: HELP_CHIP.y, w, h: HELP_CHIP.h }; }
function canOpenHelp() {
    return state.gamePhase === 'playing' && !state.won && !state.levelComplete && !menu && !state.shopOpen && !state.awardsOpen
        && !race && !petBattle && !tvShow && !credits && !danceBattle;
}
function helpChipShown() { return canOpenHelp() && !usesTouchLayout() && lastInput !== 'touch'; }
function helpOpen() { return !!(menu && menu.help); }
function openHelp() {
    if (!canOpenHelp()) return;
    const half = Math.ceil(controlsList().length / 2);
    openMenu(keyName('⌨ CONTROLS', '🎮 CONTROLS'), () => [], { h: HELP_TOP + half * HELP_ROW_H + 40,
        hint: keyName('Press K, Esc or SPACE (or click) to close', 'Press B or A to close   ·   ⧉ = the View button') });
    menu.help = true;
    try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch (e) {}
}
function toggleHelp() { if (helpOpen()) menu = null; else openHelp(); }
// A brand-new player on a keyboard or controller sees the controls once, by itself
function showHelpFirstTime() {
    let seen = false;
    try { seen = localStorage.getItem(HELP_SEEN_KEY) === '1'; } catch (e) {}
    if (!seen && !usesTouchLayout() && lastInput !== 'touch') openHelp();
}
function controlsList() {
    const pad = lastInput === 'pad', god = !!godParent();
    const rows = pad ? [
        ['Move', 'Stick'], ['Shoot / dig', 'A or RT'], ['Hit', 'RB'], ['Block', 'LB'], ['Jump', 'Y'], ['Dash', 'LT'],
        ['Spell', 'X'], ['Gadget', 'B'], ['Build', 'L3'], ['Ride', 'R3'], ['Settings', 'Start'], ['Sound', 'tap ⧉'],
        ...PAD_COMBOS.filter(c => c.btn !== PAD.A || god).map(c => [c.label, '⧉+' + Object.keys(PAD).find(k => PAD[k] === c.btn)]),
    ] : [
        ['Move', 'WASD'], ['Shoot / dig', 'Space'], ['Hit', 'J'], ['Block', 'X'], ['Jump', 'C'], ['Dash', 'Shift'],
        ['Spell', 'R'], ['Gadget', 'Q'], ['Build', 'B'], ['Ride', 'V'], ['Shop', 'E'], ['Awards', 'H'],
        ['Dance', 'G'], ['Fart', 'F'], ['Burp', 'U'], ['Sneeze', 'I'], ['Sound', 'M'], ['Settings', 'O'], ['Player 2', 'P'], ['Help', 'K'],
    ];
    if (!pad && god) rows.splice(7, 0, ['God power', 'T']);
    return rows;
}
// The rows, inside the open help menu (drawMenu has painted the panel, the title and the ✕)
function drawHelpRows() {
    const rows = controlsList(), half = Math.ceil(rows.length / 2);
    ctx.save();
    ctx.font = '14px Arial'; ctx.textBaseline = 'alphabetic';
    rows.forEach(([what, key], i) => {
        const cx = MENU.X + 24 + Math.floor(i / half) * (HELP_COL_W + 14), cy = MENU.Y + HELP_TOP + 12 + (i % half) * HELP_ROW_H;
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(cx - 6, cy - 15, HELP_COL_W - 6, HELP_ROW_H - 3);
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.fillText(what, cx, cy);
        ctx.fillStyle = '#88DDFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'right'; ctx.fillText(key, cx + HELP_COL_W - 20, cy); ctx.font = '14px Arial';
    });
    ctx.restore();
}
// The small "? Help" chip: always there while you play on a keyboard or controller, so the cheat-sheet is one press away
function drawHelpChip() {
    if (!helpChipShown()) return;
    const r = helpChipRect();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 1.5; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(keyName('? Help: K', '? Help: ⧉+LB'), r.x + r.w / 2, r.y + r.h / 2 + 1);
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
    if (state.buildMode) return;   // the block bar along the bottom has its own hint
    // The line sits to the right of the gadget slots, so it is the longest wording that fits there (or none)
    const hints = lastInput === 'pad' ? ['Move: stick / D-pad  |  Shoot / Dig: A  |  Shop: Y  |  Sound: Back', 'Move: stick  |  Shoot: A  |  Shop: Y']
                : p2.active ? ['P1: WASD + Space   ·   P2: Arrows + Enter   ·   P: Player 2 leaves', 'P1: WASD   ·   P2: Arrows   ·   P: P2 leaves']
                : ['Move: WASD  |  Shoot: Space (hold = charge)  |  Punch: J  |  Block: X  |  Jump: C  |  Build: B  |  Settings: O', 'Move: WASD  |  Shoot: Space  |  Punch: J  |  Jump: C'];
    const right = 792, left = gadgetHudRight() + 12;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px Arial'; ctx.textAlign = 'right';
    const hint = hints.find(h => ctx.measureText(h).width <= right - left);
    if (hint) ctx.fillText(hint, right, 590);
}

// ── HELPERS ───────────────────────────────────────────────────
// Your most hearts: the level's hearts plus any armor you've crafted
function fullHearts() {
    const extra = settings.difficulty === 'easy' ? 2 : settings.difficulty === 'hard' ? -1 : 0;
    return Math.max(1, LEVEL_CONFIGS[state.level - 1].playerMaxHp + (state.armor || 0) + extra);
}

function triggerShake(amount = 12) { state.screenShake = amount; }

function spawnParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        particles.push({
            x, y,
            dx: Math.cos(a) * (2 + Math.random() * 3),
            dy: Math.sin(a) * (2 + Math.random() * 3),
            life: 35, maxLife: 35,
            color, r: 4 + Math.random() * 4,
        });
    }
}

function spawnFloatText(x, y, text, color, life = 45) {
    floatTexts.push({ x, y, text, color, life });
}

function spawnConfettiAt(x, y) {
    const colors = ['#FF4444', '#FFFF00', '#44FF44', '#4488FF', '#FF44CC'];
    for (let i = 0; i < 30; i++) {
        particles.push({ x, y, dx: (Math.random() - 0.5) * 8, dy: -Math.random() * 7, life: 70, maxLife: 70,
            color: colors[i % colors.length], r: 0, confetti: true, rotation: Math.random() * 6,
            rotSpeed: (Math.random() - 0.5) * 0.2, cw: 6, ch: 4 });
    }
}

function spawnConfetti() {
    const colors = ['#FF4444','#FF8800','#FFFF00','#44FF44','#4488FF','#CC44FF','#FF44CC','#FFFFFF','#FF88AA'];
    for (let i = 0; i < 130; i++) {
        const a   = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 9;
        particles.push({
            x: 400, y: 300,
            dx: Math.cos(a) * spd,
            dy: Math.sin(a) * spd - 2,
            life: 90 + Math.random() * 70, maxLife: 160,
            color: colors[Math.floor(Math.random() * colors.length)],
            r: 0,
            confetti: true,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.18,
            cw: 7 + Math.random() * 6,
            ch: 4 + Math.random() * 4,
        });
    }
}

// ── UPDATE: PARTICLES ─────────────────────────────────────────
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.dx; p.y  += p.dy;
        p.dx *= 0.92; p.dy *= 0.92;
        if (p.confetti) {
            p.dy       += 0.09;
            p.rotation += p.rotSpeed;
        }
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
        if (--bolts[i].life <= 0) bolts.splice(i, 1);
    }
    for (let i = heartPickups.length - 1; i >= 0; i--) {
        if (--heartPickups[i].life <= 0) heartPickups.splice(i, 1);
    }
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        floatTexts[i].y -= 0.8;
        if (--floatTexts[i].life <= 0) floatTexts.splice(i, 1);
    }
}

// ── DRAW: PARTICLES ───────────────────────────────────────────
function drawParticles() {
    for (const p of particles) {
        const a = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = a;
        if (p.confetti) {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.cw / 2, -p.ch / 2, p.cw, p.ch);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.r * a), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

function drawFloatTexts() {
    for (const f of floatTexts) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.life / 20);
        ctx.fillStyle = f.color; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }
}

// ── SPECIAL STUFF: storms, seasons, party, fireworks, time machine, TV, the secret ending ──
let stormFlash = 0;
function updateStorm() {
    if (state.room !== ROOM.PARADISE || paradise.weather !== 'storm' || paradise.phase !== 'day') return;
    if (stormFlash > 0) stormFlash--;
    if (Math.random() < 0.006) {   // ⚡ KRAKA-BOOM — lightning sometimes zaps a monster for you
        stormFlash = 12; triggerShake(6); tone(60, 0.6, 'sawtooth', 0.2, 30);
        const foes = targetableEnemies();
        if (foes.length) { const e = foes[Math.floor(Math.random() * foes.length)]; bolts.push({ x1: e.x, y1: 40, x2: e.x, y2: e.y, life: 14 }); damageEnemy(e, POWER.LIGHTNING); }
    }
}

// 🎃🎄 Seasons: Halloween in October, Christmas in December (or switch them on in Mods)
function season() {
    const m = new Date().getMonth();
    return mod('christmas') || m === 11 ? 'christmas' : mod('halloween') || m === 9 ? 'halloween' : null;
}
let seasonItems = null, seasonRoom = null;
function updateSeason() {
    const sz = season();
    if (!sz || state.room !== ROOM.PARADISE || !playing()) { seasonItems = null; return; }
    if (!seasonItems || seasonRoom !== state.room) {
        seasonRoom = state.room;
        seasonItems = [[150, 360], [650, 250], [300, 520], [560, 520], [700, 420]].map(([x, y]) => ({ x, y, got: false }));
    }
    for (const it of seasonItems) {
        if (it.got || Math.hypot(it.x - player.x, it.y - player.y) > 26) continue;
        it.got = true; state.coins += 5; giveAward('season'); sfx('found'); spawnParticles(it.x, it.y, sz === 'christmas' ? '#FF4444' : '#FF9922', 14);
        spawnFloatText(it.x, it.y - 20, sz === 'christmas' ? '🎁 A present! +🪙5' : '🎃 Trick or treat! 🍬 +🪙5', '#FFE066', 70);
    }
}
function drawSeason() {
    const sz = season();
    if (!sz || state.room !== ROOM.PARADISE || state.gamePhase !== 'playing') return;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    if (sz === 'christmas') {
        emoji('🎄', 470, 300, 54);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; const t = Date.now() / 1000;
        for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc((i * 71.3 + Math.sin(t + i) * 20) % 800, (i * 53.1 + t * 30) % 600, 1.6, 0, Math.PI * 2); ctx.fill(); }
    } else for (const [x, y] of [[360, 290], [440, 290]]) emoji('🎃', x, y, 22);   // pumpkins by the fountain
    for (const it of seasonItems || []) if (!it.got) emoji(sz === 'christmas' ? '🎁' : '🎃', it.x, it.y, 24);
}

// 🎂 Birthday party (anywhere!)
let party = null;
function startParty() {
    party = { t: 1800, gifts: [0, 1, 2].map(k => ({ x: player.x - 80 + k * 80, y: player.y + 70, got: false })) };
    state.hats.party = true; state.hat = 'party';
    [523, 523, 587, 523, 698, 659].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.3));   // happy birthday!
    showToast('🎂 IT\'S A PARTY! 🎈 Open the presents! 🎁', '#FF88CC', 220);
}
function updateParty() {
    if (!party) return;
    if (--party.t <= 0) { party = null; return; }
    if (party.t % 25 === 0) spawnParticles(Math.random() * 800, 60 + Math.random() * 200, `hsl(${Math.random() * 360}, 90%, 60%)`, 8);
    for (const g of party.gifts) if (!g.got && Math.hypot(g.x - player.x, g.y - player.y) < 26) {
        g.got = true; const n = 10 + Math.floor(Math.random() * 20); state.coins += n; sfx('found');
        spawnFloatText(g.x, g.y - 20, `🎁 +🪙${n}!`, '#FFE066', 70);
    }
}
function drawParty() {
    if (!party) return;
    const t = Date.now() / 1000;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    for (let k = 0; k < 8; k++) emoji('🎈', 60 + k * 100 + Math.sin(t + k) * 10, 560 - ((t * 40 + k * 70) % 520), 26);
    emoji('🎂', player.x + 40, player.y - 10, 28);
    for (const g of party.gifts) if (!g.got) emoji('🎁', g.x, g.y, 24);
}

// 🎆 Fireworks
let fireworks = 0;
function updateFireworks() {
    if (fireworks <= 0) return;
    fireworks--;
    if (fireworks % 20 === 0) {
        const x = 80 + Math.random() * 640, y = 80 + Math.random() * 200, col = `hsl(${Math.random() * 360}, 100%, 65%)`;
        for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, sp = 2 + Math.random() * 2; particles.push({ x, y, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp, life: 50, maxLife: 50, color: col, r: 3 }); }
        tone(90 + Math.random() * 60, 0.3, 'sawtooth', 0.12, 40);
    }
}
function drawFireworksSky() { if (fireworks > 0) { ctx.fillStyle = 'rgba(0,0,30,0.35)'; ctx.fillRect(0, 0, 800, 600); } }

