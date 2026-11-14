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

// ── DRAW: INTRO SCREEN ────────────────────────────────────────
function drawIntro() {
    ctx.fillStyle = '#080018';
    ctx.fillRect(0, 0, 800, 600);

    // Twinkling stars
    const t = Date.now() / 3000;
    for (let i = 0; i < 35; i++) {
        const sx = ((i * 137 + 50) % 760) + 20;
        const sy = ((i * 97  + 30) % 520) + 40;
        const al = 0.25 + 0.4 * Math.sin(t * 2.5 + i);
        ctx.fillStyle = `rgba(255,255,255,${al})`;
        ctx.fillRect(sx, sy, 2, 2);
    }

    // Title
    ctx.save();
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.fillStyle   = '#FFD700';
    ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center';
    ctx.fillText('The Light of Paradise', 400, 78);
    ctx.restore();

    // Story text
    const lines = [
        'The Devil stole the Golden Light',
        'and hid it on Paradise Island!',
        '',
        'Dig in the caves of Hell for Magic Power.',
        'Use it to survive Monster Night',
        'on Paradise Island and win 3 Light Crystals.',
        '',
        'Collect them all to defeat the Devil',
        'and save the world!',
        'by Goldwinner games',
    ];
    ctx.font = '18px Arial'; ctx.textAlign = 'center';
    lines.forEach((line, i) => {
        ctx.fillStyle = line === '' ? 'transparent' : 'rgba(210,210,255,0.92)';
        ctx.fillText(line, 400, 138 + i * 34);
    });

    // Hint: Caves
    ctx.fillStyle = 'rgba(180,120,60,0.7)';
    ctx.font = '13px Arial';
    ctx.fillText('Tip: Hide in Hell\'s caves for 1 minute — dig deep for rare weapons, but watch out for moles!', 400, 460);

    // Pulsing Press Space
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 400);
    ctx.save();
    ctx.fillStyle   = `rgba(255,255,80,${pulse})`;
    ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 16 * pulse;
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    if (!savedGame) {
        ctx.fillText('Tap, click, press SPACE or press A to Begin!', 400, 508);
        ctx.restore();
    } else {
        ctx.restore();
        // Saved game: Continue or start again
        for (const [b, label, sub] of [[CONTINUE_BTN, '▶ CONTINUE', `Level ${savedGame.level} · 🪙${savedGame.coins}  (SPACE / A)`],
                                       [NEW_GAME_BTN, '✦ NEW GAME', '(N / X)']]) {
            ctx.fillStyle = 'rgba(30,20,70,0.9)'; ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = `rgba(255,255,80,${pulse})`; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = '#FFFF80'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
            ctx.fillText(label, b.x + b.w / 2, b.y + 24);
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
            ctx.fillText(sub, b.x + b.w / 2, b.y + b.h + 15);
        }
    }

    if (fullscreenOK() && usesTouchLayout()) {   // ⛶ full screen, for phones
        const b = FULLSCREEN_BTN;
        ctx.fillStyle = 'rgba(30,20,70,0.9)'; ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(inFullscreen() ? '⛶ Exit full screen' : '⛶ Full screen', b.x + b.w / 2, b.y + b.h / 2 + 1);
        ctx.textBaseline = 'alphabetic';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Arial';
    ctx.fillText(usesTouchLayout() ? 'Move: left stick  |  Shoot: big button  |  Mystery portals go anywhere!'
                                   : 'Move: WASD / Arrows  |  Shoot: Space  |  Dance: G  |  Fart: F  |  Mystery portals go anywhere!', 400, 562);
}

// ── DRAW: PORTALS ─────────────────────────────────────────────
function portalPath(shape, x, y, r, spin) {
    ctx.beginPath();
    if (shape === 'circle') { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
    // Pointy shapes: [number of points, inner radius ratio]
    const [n, inner] = { diamond: [4, 1], triangle: [3, 1], hexagon: [6, 1], star: [5, 0.5] }[shape];
    const pts = inner < 1 ? n * 2 : n;
    for (let i = 0; i < pts; i++) {
        const a  = spin - Math.PI / 2 + (i / pts) * Math.PI * 2;
        const rr = inner < 1 && i % 2 ? r * inner : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
}

// The super-rare golden portal to the Secret Golden Room
function drawGoldenPortal() {
    if (!goldenPortal) return;
    const t = Date.now() / 1000, { x, y } = goldenPortal, r = PORTAL_R + 4 + Math.sin(t * 4) * 2;
    const d = Math.hypot(player.x - x, player.y - y);
    const seen = Math.max(0.06, Math.min(1, (SECRET_REVEAL_DIST + 60 - d) / 60));   // a faint shimmer from far away
    ctx.save();
    ctx.globalAlpha = seen;
    portalPath('star', x, y, r, t * 1.2);
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(0.4, '#FFE066'); grad.addColorStop(1, '#B8860B');
    ctx.fillStyle = grad; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 35;
    ctx.fill();
    ctx.strokeStyle = '#FFF4B0'; ctx.lineWidth = 3; ctx.stroke();
    for (let k = 0; k < 5; k++) {
        const a = t * 3 + k * (Math.PI * 2 / 5);
        drawStar(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10), 3.5, '#FFFFFF');
    }
    ctx.restore();
    if (d < SECRET_REVEAL_DIST) {
        ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('✨ SECRET! ✨', x, y + PORTAL_R + 18);
    }
}

function drawPortals() {
    drawGoldenPortal();
    const t = Date.now() / 1000;
    for (const p of PORTALS[state.room]) {
        // Colour keeps shifting — you never know where it goes!
        const hue  = (t * 60 + p.x + p.y) % 360;
        const spin = t * 0.9 + p.x;   // the whole shape slowly turns
        const r    = PORTAL_R + Math.sin(t * 3 + p.x) * 2;
        ctx.save();

        // Dark swirling middle
        portalPath(p.shape, p.x, p.y, r, spin);
        const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.35, `hsl(${hue}, 90%, 45%)`);
        grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 90%, 15%)`);
        ctx.fillStyle = grad;
        ctx.shadowColor = `hsl(${hue}, 100%, 60%)`; ctx.shadowBlur = 25;
        ctx.fill();

        // Spiral arms spinning into the centre
        ctx.save();
        portalPath(p.shape, p.x, p.y, r, spin);
        ctx.clip();
        ctx.shadowBlur = 0;
        for (let arm = 0; arm < 5; arm++) {
            ctx.strokeStyle = `hsla(${(hue + 40 + arm * 30) % 360}, 100%, ${70 + (arm % 2) * 15}%, 0.75)`;
            ctx.lineWidth = 3 - (arm % 2);
            ctx.beginPath();
            for (let k = 0; k <= 34; k++) {
                const a  = -t * 5 + arm * (Math.PI * 2 / 5) + k * 0.28;
                const rr = (k / 34) * r * 1.1;
                ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
            }
            ctx.stroke();
        }
        // Rings pulsing into the middle, like a whirlpool
        for (let k = 0; k < 3; k++) {
            const rr = r * (1 - ((t * 0.8 + k / 3) % 1));
            ctx.strokeStyle = `rgba(255,255,255,${0.35 * rr / r})`; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();

        // Bits of light getting sucked in from outside
        for (let k = 0; k < 8; k++) {
            const ph = (t * 0.7 + k / 8) % 1;
            const a  = k * 0.785 + t * 1.5 + ph * 3;
            const rr = r * (1.6 - ph);
            ctx.fillStyle = `hsla(${(hue + k * 40) % 360}, 100%, 75%, ${ph})`;
            ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, 2, 0, Math.PI * 2); ctx.fill();
        }

        // Glowing outline
        portalPath(p.shape, p.x, p.y, r, spin);
        ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Sparkles orbiting the edge
        for (let k = 0; k < 3; k++) {
            const a = t * 2 + k * (Math.PI * 2 / 3) + p.y;
            drawStar(p.x + Math.cos(a) * (r + 7), p.y + Math.sin(a) * (r + 7), 2.5, '#FFFFFF');
        }
        ctx.restore();

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, p.y);
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('MYSTERY', p.x, p.y + PORTAL_R + 14);
    }
}

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
        const got = AWARDS.filter(w => awards.got[w.id]).length;
        ctx.fillText(`🏅 ${got}/${AWARDS.length}${akey ? '  (' + akey + ')' : ''}`, a.x + a.w / 2, a.y + a.h / 2 + 1);
        ctx.restore();
    }
}

// ── DRAW: HELL ────────────────────────────────────────────────
function drawHell() {
    const t = Date.now() / 500;

    // Caves (the rocks are painted into the background)
    for (const c of HELL_CAVES) {
        ctx.fillStyle   = 'rgba(200,140,90,0.6)';
        ctx.font        = 'bold 11px Arial'; ctx.textAlign = 'center';
        ctx.fillText('CAVE  (hide & dig here!)', c.x + c.w / 2, c.y + 22);
    }

    // Dig spots — dirt piles with weapons buried in layers
    for (const s of hell.digSpots) {
        ctx.save();
        if (s.depth > 0) {
            // Hole gets bigger and darker the deeper you dig
            const holeR = 8 + s.depth * 4;
            ctx.fillStyle = `rgba(0,0,0,${0.45 + s.depth * 0.18})`;
            ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, holeR, holeR * 0.45, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(200,150,90,0.8)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
            ctx.fillText(s.depth < DIG_MAX_DEPTH ? `DEPTH ${s.depth}/${DIG_MAX_DEPTH}` : s.tunnel ? 'TUNNEL ⬇ jump in!' : 'BOTTOM', s.x, s.y + 24);
            if (s.depth >= DIG_MAX_DEPTH && s.tunnel) {
                // Swirling tunnel down to the Underground Caves
                ctx.strokeStyle = 'rgba(200,150,255,0.7)'; ctx.lineWidth = 2;
                ctx.beginPath();
                for (let k = 0; k <= 16; k++) {
                    const a = -Date.now() / 250 + k * 0.5, rr = (k / 16) * 18;
                    ctx.lineTo(s.x + Math.cos(a) * rr, s.y + 6 + Math.sin(a) * rr * 0.45);
                }
                ctx.stroke();
            }
        }
        if (s.depth < DIG_MAX_DEPTH) {
            // Dirt pile beside the hole shrinks a little with each dig
            const size = 1 - (s.hits / DIG_HITS_PER_LAYER[s.depth]) * 0.45;
            const px = s.depth > 0 ? s.x + 16 : s.x;
            ctx.fillStyle = '#6B3E1E';
            ctx.beginPath(); ctx.ellipse(px, s.y + 4, 18 * size, 10 * size, 0, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#8B5A2B';
            ctx.beginPath(); ctx.ellipse(px - 3, s.y + 1, 9 * size, 5 * size, 0, Math.PI, 0); ctx.fill();
            // Twinkle so kids can spot the treasure — rainbow sparkle on the last layer
            const sparkle = s.depth === 2 ? `hsl(${(Date.now() / 5) % 360}, 100%, 70%)` : '#FFFFAA';
            if (Math.sin(t * 2 + s.x) > 0.7) drawStar(px + 8 * size, s.y - 6 * size, 3, sparkle);
        }
        ctx.restore();
    }

    // "Dig here!" prompt when standing on a pile
    const digSpot = nearbyDigSpot();
    if (digSpot) drawDigView(digSpot);
    if (digSpot) {
        const verb = byInput('Press SPACE', 'Tap DIG', 'Press A');
        ctx.fillStyle = canDig() ? '#FFE08A' : '#FF8888';
        ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(!canDig() ? 'Beat the mole monster first!'
                   : digSpot.depth === 0 ? `${verb} to dig!` : `${verb} to dig deeper!`,
                   digSpot.x, digSpot.y - 22);
    }

    // Bad guys (mole monsters, …)
    for (const e of hell.enemies) {
        drawEnemy(e, t);
        if (!(e.emerge > 0) && !e.hidden) drawEnemyHp(e);
    }

    // "You found …!" message floating up
    if (hell.foundMsg) {
        const m = hell.foundMsg;
        const x = 400, y = 250 - (120 - m.timer) * 0.3;   // big, in the middle of the screen
        ctx.save();
        ctx.globalAlpha = Math.min(1, m.timer / 30);
        ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 12;
        ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center';
        ctx.fillText(m.text, x, y);
        if (m.sub) {
            ctx.fillStyle = m.sub.startsWith('Look out') ? '#FF6666' : '#FFE08A';
            ctx.shadowBlur = 6; ctx.font = 'bold 15px Arial';
            ctx.fillText(m.sub, x, y + 24);
        }
        ctx.restore();
    }

    // Devil
    const d = hell.devil;
    if (d.alive) {
        drawGroundShadow(d.x + 4, d.y + d.r + 4, d.r * 1.1, d.r * 0.3, 0.4);
        const telegraphing = d.telegraphTimer > 0;
        const flashOn      = telegraphing && Math.floor(Date.now() / 80) % 2 === 0;

        if (mod('chickens')) { ctx.save(); ctx.translate(d.x, d.y); ctx.scale(3, 3); drawChicken(0, 0); ctx.restore(); }
        else drawDevil(d, telegraphing, flashOn);
        if (d.frozen > 0) drawIceBlock(d.x, d.y, d.r * 0.85, d.frozen);

        // State label
        ctx.fillStyle = 'rgba(255,120,120,0.65)';
        ctx.font = '10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(d.aiState, d.x, d.y + d.r + 14);

        // HP bar (only shown when player has 3 crystals and can damage devil)
        if (state.lightCrystals >= 3) {
            const bw = 70, bh = 9;
            const bx = d.x - bw / 2, by = d.y - d.r - 30;
            ctx.fillStyle = '#400';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = `hsl(${(d.hp / d.maxHp) * 120}, 100%, 45%)`;
            ctx.fillRect(bx, by, bw * (d.hp / d.maxHp), bh);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`${d.hp}/${d.maxHp}`, d.x, by + bh - 1);
        }

        // Crystal warning
        if (state.lightCrystals < 3 && d.shieldFlash > 0) {
            ctx.fillStyle = '#FFFF00';
            ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
            ctx.fillText('NEED ALL LIGHT CRYSTALS!', d.x, d.y - d.r - 14);
        }
    }

    // Coins
    drawCoins(hell.coins);

    // Cave timer warning
    if (isPlayerPhysicallyInCave() && state.caveTimer > 0) {
        const frac = state.caveTimer / caveMax();
        const secsLeft = Math.max(0, Math.ceil((caveMax() - state.caveTimer) / 60));
        if (frac >= 0.5) {
            const flash = state.caveProtectionExpired ? (Math.floor(Date.now() / 200) % 2 === 0) : true;
            ctx.fillStyle = state.caveProtectionExpired
                ? `rgba(255,80,0,${flash ? 0.9 : 0.5})`
                : `rgba(255,220,50,${0.5 + frac * 0.5})`;
            ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
            ctx.fillText(
                state.caveProtectionExpired ? '⚠ CAVE EXPIRED — LEAVE NOW!' : `Cave protection: ${secsLeft}s left`,
                400, 535
            );
        }
    }
}

// ── DRAW: BAD GUYS ────────────────────────────────────────────
function drawFrog(e) {
    const hop = Math.hypot(e.dx, e.dy) > 0.5 ? 4 : 0;
    ctx.save();
    ctx.translate(e.x, e.y - hop);
    ctx.fillStyle = '#3FB43F';
    ctx.beginPath(); ctx.ellipse(0, 3, 11, 8, 0, 0, Math.PI * 2); ctx.fill();          // body
    ctx.fillStyle = '#2E8F2E';
    ctx.beginPath(); ctx.ellipse(-9, 8, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(9, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill();   // legs
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.arc(5, -5, 4, 0, Math.PI * 2); ctx.fill();   // big eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, -5, 2, 0, Math.PI * 2); ctx.arc(5, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1A5A1A'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 3, 5, 0.2, Math.PI - 0.2); ctx.stroke();               // smile
    ctx.restore();
}

function drawEnemy(e, t) {
    if (e.dancing > 0) {   // 🕺 monsters dancing along with you
        ctx.save(); ctx.translate(e.x, e.y + e.r); ctx.rotate(Math.sin(Date.now() / 90) * 0.35); ctx.translate(-e.x, -e.y - e.r - Math.abs(Math.sin(Date.now() / 120)) * 6);
        drawEnemyMods(e, t); ctx.restore();
    } else drawEnemyMods(e, t);
    if (mod('monsterHats') && e.alive && !e.hidden) {
        const hat = ['🎩', '🎉', '👒', '🧢', '🎓', '👑', '🪖'][Math.abs(Math.floor((e.home ? e.home.x * 7 + e.home.y : e.x)) ) % 7];
        ctx.save(); ctx.font = `${Math.max(14, e.r * 0.9)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hat, e.x, e.y - e.r * 0.95); ctx.restore();
    }
}
function drawEnemyMods(e, t) {
    if (mod('cheese') && !e.hidden) {   // 🧀 Cheese World mod
        ctx.save(); ctx.font = `${Math.max(20, e.r * 2)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🧀', e.x, e.y); ctx.restore();
        return;
    }
    if (mod('chickens') && !e.hidden) {   // 🐔 Chicken Monsters mod
        const k = Math.max(0.8, e.r / 14) * (mod('tinyMonsters') ? 0.5 : 1);
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(k, k); drawChicken(0, 0); ctx.restore();
        return;
    }
    if (mod('tinyMonsters')) {   // 🐜 Tiny Monsters mod
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(0.5, 0.5); ctx.translate(-e.x, -e.y); drawEnemyAir(e, t); ctx.restore();
        return;
    }
    drawEnemyAir(e, t);
}

function drawEnemyAir(e, t) {
    if (e.air > 0) {   // flying up from an uppercut
        ctx.save(); ctx.translate(0, -Math.sin((e.air / 45) * Math.PI) * 40); drawEnemyInner(e, t); ctx.restore();
        return;
    }
    if (e.slip > 0) {   // 🍌 whoops — spinning round and falling over
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate((30 - e.slip) / 30 * Math.PI * 2); ctx.translate(-e.x, -e.y); drawEnemyInner(e, t); ctx.restore();
    } else drawEnemyInner(e, t);
    if (e.painted > 0 && e.alive) {   // 🎨 paint splats over their eyes
        ctx.save(); ctx.fillStyle = `hsla(${e.paintHue},90%,55%,0.85)`;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(e.x + Math.cos(k * 1.7) * e.r * 0.5, e.y - e.r * 0.2 + Math.sin(k * 2.3) * e.r * 0.35, e.r * 0.3, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.fillText('?', e.x, e.y - e.r - 6);
        ctx.restore();
    }
    if (e.stun > 0 && e.stun < 900 && e.alive) {   // dizzy stars
        for (let k = 0; k < 3; k++) { const a = Date.now() / 150 + k * 2.1; drawStar(e.x + Math.cos(a) * 12, e.y - e.r - 10 + Math.sin(a) * 4, 3, '#FFE066'); }
    }
}

function drawEnemyInner(e, t) {
    if (e.shrunk > 0) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.scale(0.5, 0.5); ctx.translate(-e.x, -e.y);
        drawEnemyBody(e, t);
        ctx.restore();
        return;
    }
    drawEnemyBody(e, t);
}

function drawEmojiEnemy(e, t) {
    const info = ENEMY_TYPES[e.type], size = e.r * 2.2;
    const bob = e.type === 'book' ? Math.sin(t * 8 + e.home.x) * 4 : 0;
    drawGroundShadow(e.x + 2, e.y + e.r + (e.type === 'book' ? 12 : 2), e.r * 0.8, e.r * 0.3, 0.25);
    ctx.save();
    if (e.emerge > 0) ctx.globalAlpha = Math.max(0.1, 1 - e.emerge / 60);
    if (info.emoji.length === 1 && e.type !== 'yeti') {   // chess pieces are plain text: give them a white glow so they show up
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 1.05, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = e.hitFlash > 0 ? '#FF3333' : '#222';
    if (info.filter) ctx.filter = info.filter;
    ctx.translate(e.x, e.y + bob);
    if (e.type === 'book') ctx.scale(1, 0.7 + Math.abs(Math.sin(t * 10)) * 0.3);   // flap flap
    if (e.type === 'yeti') {   // big white furry yeti
        ctx.fillStyle = e.hitFlash > 0 ? '#FFAAAA' : '#F4F8FF';
        ctx.beginPath(); ctx.ellipse(0, 4, e.r * 0.9, e.r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-e.r * 0.9, 0, e.r * 0.35, 0, Math.PI * 2); ctx.arc(e.r * 0.9, 0, e.r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7AA8D8'; ctx.beginPath(); ctx.ellipse(0, -e.r * 0.25, e.r * 0.45, e.r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-6, -e.r * 0.3, 3, 0, Math.PI * 2); ctx.arc(6, -e.r * 0.3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.fillRect(-6, -e.r * 0.12, 4, 5); ctx.fillRect(2, -e.r * 0.12, 4, 5);
    } else if (e.type === 'megaboss') {   // all the bosses stuck together!
        ctx.font = `${e.r * 1.1}px Arial`;
        [['🐲', -0.55, -0.45], ['🐍', 0.55, -0.45], ['🐂', -0.6, 0.45], ['🤖', 0.6, 0.45], ['👹', 0, 0]].forEach(([em, ox, oy]) => ctx.fillText(em, ox * e.r, oy * e.r + Math.sin(t * 4 + ox * 3) * 2));
    } else if (e.type === 'cerberus') { ctx.font = `${size * 0.7}px Arial`; ctx.fillText('🐕', -e.r * 0.7, 4); ctx.fillText('🐕', e.r * 0.7, 4); ctx.fillText('🐕', 0, -e.r * 0.5); }   // three heads!
    else ctx.fillText(info.emoji, 0, 0);
    if (info.crown) { ctx.font = `${e.r * 0.8}px Arial`; ctx.fillText('👑', 0, -e.r * 1.05); }
    ctx.restore();
}

// A mole is coming! Shaking dirt mound with a big "!" (warning), then a mound it climbs out of
function drawMoleMound(e) {
    const warning = e.warn > 0;
    const shake = warning ? Math.sin(frameNo * 1.7) * 3 : Math.sin(frameNo * 1.2) * 1.5;
    const grow = warning ? 0.6 + 0.4 * (1 - e.warn / MOLE_WARN_FRAMES) : 1;
    ctx.save();
    if (warning) {   // pulsing red ring so it still shows up in the dark caves
        const pulse = 0.5 + 0.5 * Math.sin(frameNo * 0.3);
        ctx.strokeStyle = `rgba(255,70,40,${0.55 + 0.4 * pulse})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, 30 + 8 * pulse, 15 + 4 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(e.x + shake, e.y + 6, 26 * grow, 11 * grow, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7A4C26';
    ctx.beginPath(); ctx.ellipse(e.x + shake, e.y + 6, 24 * grow, 14 * grow, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#A8723C';
    ctx.beginPath(); ctx.ellipse(e.x + shake - 5, e.y + 2, 11 * grow, 7 * grow, 0, Math.PI, 0); ctx.fill();
    if (warning) {
        const blink = Math.floor(frameNo / 8) % 2 === 0;
        ctx.fillStyle = blink ? '#FFEE33' : '#FF6633';
        ctx.strokeStyle = '#3A1400'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
        ctx.font = 'bold 38px Arial'; ctx.textAlign = 'center';
        ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 10;
        ctx.strokeText('!', e.x + shake, e.y - 14); ctx.fillText('!', e.x + shake, e.y - 14);
    }
    ctx.restore();
}

// ── MEDUSA: a scaly green monster with a head full of writhing snakes ──
const MEDUSA_WARN_FRAMES = 90;   // matches the "DON'T LOOK AT ME!" wind-up in moveEnemy
const MEDUSA_SNAKES      = 9;

function drawMedusa(e) {
    const u = e.r / 30;   // everything is drawn for r = 30 and scaled
    const w = frameNo * 0.12;
    const k = e.gazeTimer > 0 && e.gazeTimer <= MEDUSA_WARN_FRAMES ? 1 - e.gazeTimer / MEDUSA_WARN_FRAMES : 0;   // 0 → 1 during the stare wind-up
    const pulse = 0.5 + 0.5 * Math.sin(frameNo * 0.5);
    const thrash = 1 + k * 1.8;   // the snakes go wild before she stares
    ctx.save();
    ctx.translate(e.x, e.y); ctx.scale(u, u);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Snakes for hair (behind the head)
    for (let i = 0; i < MEDUSA_SNAKES; i++) {
        const f = i / (MEDUSA_SNAKES - 1), a = -Math.PI * (0.98 - 0.96 * f);   // fanned out over the top and down the sides
        const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
        const len = 26 + (i % 3) * 7, sx = dx * 17, sy = -3 + dy * 19;
        const pts = [];
        for (let j = 0; j <= 8; j++) {
            const q = j / 8, sway = Math.sin(w * thrash * 1.6 + i * 1.9 + q * 5) * (2 + 10 * q) * (0.7 + 0.3 * thrash);
            pts.push([sx + dx * q * len + px * sway, sy + dy * q * len + py * sway + q * q * 8]);   // droops a little
        }
        for (const [col, wid] of [['#17401C', 7], ['#4FA23A', 5], ['#8BD05A', 1.6]]) {
            for (let j = 0; j < 8; j++) {
                const q = j / 8, fat = 1 - q * 0.55;
                ctx.strokeStyle = col; ctx.lineWidth = wid * fat;
                ctx.beginPath(); ctx.moveTo(pts[j][0], pts[j][1] - (col === '#8BD05A' ? 1 : 0)); ctx.lineTo(pts[j + 1][0], pts[j + 1][1] - (col === '#8BD05A' ? 1 : 0)); ctx.stroke();
            }
        }
        const [hx, hy] = pts[8], [bx, by] = pts[7], ha = Math.atan2(hy - by, hx - bx);   // snake head
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha);
        ctx.fillStyle = '#3F8F2F'; ctx.beginPath(); ctx.ellipse(1, 0, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = k > 0.3 ? '#FF3322' : '#FFE600'; ctx.beginPath(); ctx.arc(2, -1.3, 1.1, 0, Math.PI * 2); ctx.arc(2, 1.3, 1.1, 0, Math.PI * 2); ctx.fill();
        if (Math.sin(w * 2.2 + i * 2.3) > 0.2) {   // flicking tongue
            ctx.strokeStyle = '#E02040'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(5.5, 0); ctx.lineTo(9, 0); ctx.moveTo(9, 0); ctx.lineTo(11, -1.5); ctx.moveTo(9, 0); ctx.lineTo(11, 1.5); ctx.stroke();
        }
        ctx.restore();
    }

    // Shoulders in a dark scaly robe
    ctx.fillStyle = '#244F2C'; ctx.beginPath(); ctx.ellipse(0, 27, 19, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3F8A47'; ctx.lineWidth = 1;
    for (let row = 0; row < 3; row++) for (let col = -3; col <= 3; col++) {
        const sx = col * 5 + (row % 2) * 2.5, sy = 22 + row * 4;
        if ((sx * sx) / 330 + ((sy - 27) * (sy - 27)) / 100 < 0.9) { ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); }
    }

    // Head: scaly green skin
    const skin = ctx.createRadialGradient(-5, -10, 3, 0, -2, 26);
    skin.addColorStop(0, '#A4DB72'); skin.addColorStop(0.6, '#5BAA45'); skin.addColorStop(1, '#2F6F33');
    ctx.fillStyle = skin; ctx.strokeStyle = '#1C4A22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -2, 21, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(30,90,35,0.55)'; ctx.lineWidth = 0.9;   // little scales
    for (let row = 0; row < 9; row++) for (let col = -4; col <= 4; col++) {
        const sx = col * 5 + (row % 2) * 2.5, sy = -20 + row * 5;
        if ((sx * sx) / 400 + ((sy + 2) * (sy + 2)) / 480 < 0.82 && !(Math.abs(sx) < 14 && sy > -13 && sy < -1)) { ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0.3, Math.PI - 0.3); ctx.stroke(); }
    }

    // Glowing eyes: yellow, then hot red while she winds up her stare
    const eyeCol = `rgb(255, ${Math.round(232 - 200 * k)}, ${Math.round(20 * (1 - k))})`;
    for (const side of [-1, 1]) {
        const ex = side * 9, ey = -7;
        if (k > 0) {   // red glow around the eye
            const aura = ctx.createRadialGradient(ex, ey, 2, ex, ey, 16 + 10 * pulse);
            aura.addColorStop(0, `rgba(255,40,0,${0.55 * k})`); aura.addColorStop(1, 'rgba(255,40,0,0)');
            ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(ex, ey, 26, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#10200F'; ctx.beginPath(); ctx.ellipse(ex, ey, 7.6, 5.4, side * -0.38, 0, Math.PI * 2); ctx.fill();   // dark socket
        ctx.save();
        ctx.shadowColor = eyeCol; ctx.shadowBlur = 7 + 20 * k * (0.7 + 0.3 * pulse);
        ctx.fillStyle = eyeCol; ctx.beginPath(); ctx.ellipse(ex, ey, 6.2, 4.2, side * -0.38, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey, 1.5 - 0.5 * k, 4, 0, 0, Math.PI * 2); ctx.fill();   // slit pupil
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ex - 2, ey - 2, 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#143A1A'; ctx.lineWidth = 3.4;   // angry brow slanting down to the middle
        ctx.beginPath(); ctx.moveTo(side * 17, -17 + k * 2); ctx.lineTo(side * 3, -9 + k * 2); ctx.stroke();
    }

    // Nose holes
    ctx.fillStyle = '#1C4A22'; ctx.beginPath(); ctx.ellipse(-2.2, 3, 1, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(2.2, 3, 1, 1.6, 0, 0, Math.PI * 2); ctx.fill();

    // Wide mouth with fangs and a forked tongue
    const open = 4 + Math.sin(w * 1.3) * 1 + 4 * k;
    const tongue = 8 + Math.sin(w * 3.1) * 4 + 4 * k;
    ctx.fillStyle = '#2A0608';
    ctx.beginPath(); ctx.moveTo(-13, 9); ctx.quadraticCurveTo(0, 9 + open * 2.2, 13, 9); ctx.quadraticCurveTo(0, 6, -13, 9); ctx.fill();
    ctx.strokeStyle = '#E02040'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 12 + tongue); ctx.moveTo(0, 12 + tongue); ctx.lineTo(-3.5, 14 + tongue); ctx.moveTo(0, 12 + tongue); ctx.lineTo(3.5, 14 + tongue); ctx.stroke();
    ctx.fillStyle = '#FFFFF0';
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * 4, 8.2); ctx.lineTo(side * 8, 8.6); ctx.lineTo(side * 6, 8.4 + 6 + open * 0.3); ctx.fill();   // long fangs
        ctx.beginPath(); ctx.moveTo(side * 10, 9); ctx.lineTo(side * 12.4, 9.2); ctx.lineTo(side * 11.2, 13); ctx.fill();               // small teeth
    }
    ctx.restore();
}

function drawEnemyBody(e, t) {
    if (e.type === 'mole' && e.warn > 0) { drawMoleMound(e); return; }
    if (e.type === 'mole' && e.emerge > 0) drawMoleMound(e);   // the mole rises out of its mound
    if (e.frog) { drawGroundShadow(e.x, e.y + 12, 10, 3); drawFrog(e); return; }
    if (ENEMY_TYPES[e.type].emoji) { drawEmojiEnemy(e, t); return; }
    if (!e.hidden && !(e.emerge > 45)) {
        const flying = e.type === 'ghost' || e.type === 'bat' || e.type === 'imp' || e.type === 'ghostking' || e.dropping
                    || e.type === 'thunderbird' || e.type === 'mothership' || state.room === ROOM.SPACE;
        drawGroundShadow(e.x + 2, e.y + e.r + (flying ? 12 : 2), e.r * (flying ? 0.7 : 1), e.r * 0.3, flying ? 0.15 : 0.3);
    }
    ctx.save();
    // Climbing out of the ground: a dirt mound, and the monster fades in
    if (e.emerge > 0 && e.type !== 'mole' && e.type !== 'imp') {
        ctx.fillStyle = '#5C3A1E';
        ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.6, e.r * 1.2, e.r * 0.45, 0, Math.PI, 0); ctx.fill();
        ctx.globalAlpha = Math.max(0.1, 1 - e.emerge / 60);
    }
    if (e.type === 'medusa') {
        drawMedusa(e);
    } else if (e.type === 'fire') {
        ctx.fillStyle = '#FF6600'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA00';
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + t;
            ctx.beginPath();
            ctx.arc(e.x + Math.cos(a) * e.r * 0.9, e.y + Math.sin(a) * e.r * 0.9, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (e.type === 'ghost') {
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = '#CC88FF'; ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 18;
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
        ctx.arc(e.x - 5, e.y - 3, 3.5, 0, Math.PI * 2);
        ctx.arc(e.x + 5, e.y - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === 'bat') {
        // Flapping wings
        const flap = Math.sin(Date.now() / 60 + e.home.x) * 8;
        ctx.fillStyle = '#5A3A7A'; ctx.shadowColor = '#9966CC'; ctx.shadowBlur = 10;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(e.x + side * 5, e.y - 2);
            ctx.lineTo(e.x + side * 24, e.y - 6 - flap);
            ctx.lineTo(e.x + side * 18, e.y + 4);
            ctx.lineTo(e.x + side * 11, e.y + 1);
            ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#7A4A9A';
        ctx.beginPath(); ctx.arc(e.x, e.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();   // ears
        ctx.moveTo(e.x - 7, e.y - 5); ctx.lineTo(e.x - 5, e.y - 14); ctx.lineTo(e.x - 1, e.y - 7);
        ctx.moveTo(e.x + 7, e.y - 5); ctx.lineTo(e.x + 5, e.y - 14); ctx.lineTo(e.x + 1, e.y - 7);
        ctx.fill();
        ctx.fillStyle = '#FFEE00';
        ctx.beginPath();
        ctx.arc(e.x - 3.5, e.y - 1, 2.2, 0, Math.PI * 2);
        ctx.arc(e.x + 3.5, e.y - 1, 2.2, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === 'windup') {
        ctx.fillStyle = '#AAAAAA'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 14, 9, Math.atan2(e.dy, e.dx), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFB0C0'; ctx.beginPath(); ctx.arc(e.x - 6, e.y - 8, 4, 0, Math.PI * 2); ctx.arc(e.x + 6, e.y - 8, 4, 0, Math.PI * 2); ctx.fill();   // ears
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x - 3, e.y - 2, 1.5, 0, Math.PI * 2); ctx.arc(e.x + 3, e.y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(e.x, e.y + 2); ctx.rotate(Date.now() / (e.windTimer > 50 ? 30 : 200));   // wind-up key
        ctx.strokeStyle = '#C8A040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore();
    } else if (e.type === 'toysoldier') {
        drawHuman(e.x, e.y, 1, { shirt: '#CC2222', sleeves: '#CC2222', pants: '#223388', shoes: '#111', skin: '#F2C8A0', hair: '#111', hairStyle: 'short', walk: e.walk });
        ctx.fillStyle = '#111'; ctx.fillRect(e.x - 6, e.y - 36, 12, 14);                 // tall hat
        ctx.fillStyle = '#FFD700'; ctx.fillRect(e.x - 6, e.y - 26, 12, 2); ctx.fillRect(e.x - 1, e.y - 6, 2, 10);   // gold trim & buttons
        ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x + 10, e.y + 6); ctx.lineTo(e.x + 14, e.y - 16); ctx.stroke();   // toy rifle
    } else if (e.type === 'wizard') {
        drawHuman(e.x, e.y, 1.2, { shirt: '#4A1A8A', sleeves: '#4A1A8A', pants: '#2A0A5A', shoes: '#111', hair: '#DDD', hairStyle: 'long', beard: '#EEE' });
        drawHatOn(e.x, e.y - 28, 'wizard');
        ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x + 14, e.y + 14); ctx.lineTo(e.x + 18, e.y - 22); ctx.stroke();   // staff
        ctx.fillStyle = `hsl(${(Date.now() / 5) % 360}, 100%, 60%)`; ctx.shadowColor = '#AA66FF'; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(e.x + 18, e.y - 24, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF3344'; ctx.beginPath(); ctx.arc(e.x - 3, e.y - 19, 1.4, 0, Math.PI * 2); ctx.arc(e.x + 3, e.y - 19, 1.4, 0, Math.PI * 2); ctx.fill();   // evil red eyes
    } else if (e.type === 'mummy' || e.type === 'mummyking') {
        const k = e.type === 'mummyking' ? 1.5 : 1;
        drawHuman(e.x, e.y, k, { shirt: '#E8DCC0', sleeves: '#E8DCC0', pants: '#D8CCB0', shoes: '#C8BCA0', skin: '#E8DCC0', hands: '#E8DCC0', walk: e.walk, noFace: true });
        ctx.strokeStyle = 'rgba(140,120,90,0.6)'; ctx.lineWidth = 1;   // bandage lines
        for (let b = 0; b < 7; b++) { ctx.beginPath(); ctx.moveTo(e.x - 8 * k, e.y - (26 - b * 6) * k); ctx.lineTo(e.x + 8 * k, e.y - (23 - b * 6) * k); ctx.stroke(); }
        ctx.fillStyle = e.type === 'mummyking' ? '#44FF88' : '#FF2222'; ctx.beginPath(); ctx.arc(e.x - 2.6 * k, e.y - 16 * k, 1.8 * k, 0, Math.PI * 2); ctx.arc(e.x + 2.6 * k, e.y - 16 * k, 1.8 * k, 0, Math.PI * 2); ctx.fill();
        if (e.type === 'mummyking') {   // golden pharaoh headdress
            ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(e.x - 13, e.y - 20); ctx.lineTo(e.x, e.y - 40); ctx.lineTo(e.x + 13, e.y - 20); ctx.lineTo(e.x + 15, e.y - 4); ctx.lineTo(e.x - 15, e.y - 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#2A4AAA'; for (let b = 0; b < 3; b++) ctx.fillRect(e.x - 13, e.y - 16 + b * 5, 26, 2);
            ctx.fillStyle = '#E8DCC0'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 22, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#44FF88'; ctx.beginPath(); ctx.arc(e.x - 3, e.y - 23, 1.8, 0, Math.PI * 2); ctx.arc(e.x + 3, e.y - 23, 1.8, 0, Math.PI * 2); ctx.fill();
        }
    } else if (e.type === 'scarab') {
        ctx.fillStyle = '#1A4A4A'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3AAAAA'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.x, e.y - 11); ctx.lineTo(e.x, e.y + 11); ctx.stroke();
        ctx.strokeStyle = '#1A2A2A'; ctx.lineWidth = 1.5; for (const s of [-1, 1]) for (let k2 = 0; k2 < 3; k2++) { ctx.beginPath(); ctx.moveTo(e.x + s * 8, e.y - 5 + k2 * 5); ctx.lineTo(e.x + s * 14, e.y - 7 + k2 * 6 + Math.sin(Date.now() / 50 + k2) * 2); ctx.stroke(); }
    } else if (e.type === 'candymonster' || e.type === 'jellybean') {
        const r = e.type === 'jellybean' ? 7 : e.r, hue = e.hue || 330;
        const g2 = ctx.createRadialGradient(e.x - r * 0.3, e.y - r * 0.3, 2, e.x, e.y, r);
        g2.addColorStop(0, `hsl(${hue}, 100%, 85%)`); g2.addColorStop(1, `hsl(${hue}, 90%, 50%)`);
        ctx.fillStyle = g2; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 1.2, r, 0, 0, Math.PI * 2); ctx.fill();
        if (e.type === 'candymonster') {
            for (let k2 = 0; k2 < 8; k2++) { ctx.fillStyle = ['#FF4466', '#FFDD33', '#44DDFF', '#88FF66'][k2 % 4]; ctx.fillRect(e.x - r + (k2 * 13) % (r * 2), e.y - r * 0.4 + (k2 * 7) % r, 5, 2); }   // sprinkles
            ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(e.x - 12, e.y - 8, 7, 0, Math.PI * 2); ctx.arc(e.x + 12, e.y - 8, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x - 12, e.y - 7, 3.5, 0, Math.PI * 2); ctx.arc(e.x + 12, e.y - 7, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6A1030'; ctx.beginPath(); ctx.arc(e.x, e.y + 8, 10, 0, Math.PI); ctx.fill();
        }
    } else if (e.type === 'bigdevil') {
        drawDevil({ ...e, shieldFlash: e.hitFlash > 0 ? 5 : 0, skinA: '#8A3ACC', skinB: '#2A0A4A' }, false, false);
    } else if (e.type === 'shark') {
        const f = e.dx < 0 ? -1 : 1;
        ctx.translate(e.x, e.y); ctx.scale(f, 1);
        ctx.fillStyle = '#7A8A9A'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(4, -22); ctx.lineTo(10, -8); ctx.fill();                          // fin
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-34, -10); ctx.lineTo(-32, 10); ctx.fill();                       // tail
        ctx.fillStyle = '#EEE'; ctx.beginPath(); ctx.ellipse(4, 4, 16, 5, 0, 0, Math.PI); ctx.fill();                     // white tummy
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(14, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(10 + k * 3, 3); ctx.lineTo(11.5 + k * 3, 7); ctx.lineTo(13 + k * 3, 3); ctx.fill(); }
    } else if (e.type === 'jellyfish') {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#FF99DD'; ctx.shadowColor = '#FF66CC'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(e.x, e.y, 12, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#FFBBEE'; ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(e.x + k * 4, e.y); ctx.quadraticCurveTo(e.x + k * 4 + Math.sin(Date.now() / 200 + k) * 4, e.y + 10, e.x + k * 4, e.y + 20); ctx.stroke(); }
    } else if (e.type === 'octopus') {
        const r = e.r, t2 = Date.now() / 300;
        ctx.strokeStyle = '#AA4488'; ctx.lineCap = 'round';
        for (let k = 0; k < 8; k++) {   // 8 wiggly arms
            const a = (k / 8) * Math.PI + 0.1;
            ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r * 0.5, e.y + Math.sin(a) * r * 0.3);
            ctx.quadraticCurveTo(e.x + Math.cos(a) * r * 1.2 + Math.sin(t2 + k) * 10, e.y + r * 0.8, e.x + Math.cos(a) * r * 1.6, e.y + r * 1.3 + Math.sin(t2 * 1.3 + k) * 8); ctx.stroke();
        }
        const head = ctx.createRadialGradient(e.x - r * 0.3, e.y - r * 0.4, 4, e.x, e.y, r);
        head.addColorStop(0, '#DD77BB'); head.addColorStop(1, '#772255');
        ctx.fillStyle = head; ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.2, r * 0.8, r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(e.x - r * 0.3, e.y, r * 0.18, 0, Math.PI * 2); ctx.arc(e.x + r * 0.3, e.y, r * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x - r * 0.3, e.y + 2, r * 0.09, 0, Math.PI * 2); ctx.arc(e.x + r * 0.3, e.y + 2, r * 0.09, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'raptor') {
        const step = Math.sin((e.walk || 0) * 2) * 4, f = player.x < e.x ? -1 : 1;
        ctx.translate(e.x, e.y); ctx.scale(f, 1);
        ctx.fillStyle = '#6A8A3A'; ctx.fillRect(-6, 4, 4, 12 + step); ctx.fillRect(2, 4, 4, 12 - step);                // legs
        ctx.fillStyle = '#8AA04A'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-30, 2); ctx.lineTo(-12, 4); ctx.fill();                       // tail
        ctx.beginPath(); ctx.ellipse(14, -10, 9, 6, -0.3, 0, Math.PI * 2); ctx.fill();                                   // head
        ctx.fillStyle = '#FFEE33'; ctx.beginPath(); ctx.arc(16, -12, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(17 + k * 2.5, -7); ctx.lineTo(18 + k * 2.5, -4); ctx.lineTo(19 + k * 2.5, -7); ctx.fill(); }
    } else if (e.type === 'lavablob') {
        const sq = 1 + Math.min(0.3, Math.hypot(e.dx, e.dy) / 12);
        const g2 = ctx.createRadialGradient(e.x - 4, e.y - 4, 2, e.x, e.y, 14);
        g2.addColorStop(0, '#FFE070'); g2.addColorStop(1, '#D03000');
        ctx.fillStyle = g2; ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 14 / sq, 12 * sq, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#300';
        ctx.beginPath(); ctx.arc(e.x - 4, e.y - 2, 2, 0, Math.PI * 2); ctx.arc(e.x + 4, e.y - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'firedragon') {
        const r = e.r, flap = Math.sin(Date.now() / 110) * 12;
        ctx.fillStyle = '#8A1A08';
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x, e.y - 4); ctx.lineTo(e.x + side * r * 1.9, e.y - r * 0.6 - flap); ctx.lineTo(e.x + side * r * 1.2, e.y + r * 0.4); ctx.closePath(); ctx.fill(); }
        const body = ctx.createRadialGradient(e.x - 8, e.y - 8, 4, e.x, e.y, r);
        body.addColorStop(0, '#FF7A3A'); body.addColorStop(1, '#9A1A08');
        ctx.fillStyle = body; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.7, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.55, r * 0.35, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();          // head (facing you)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFEE33'; ctx.beginPath(); ctx.arc(e.x - 7, e.y + r * 0.5, 3, 0, Math.PI * 2); ctx.arc(e.x + 7, e.y + r * 0.5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F4E8C8'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x + s * 8, e.y + r * 0.35); ctx.lineTo(e.x + s * 16, e.y + r * 0.05); ctx.lineTo(e.x + s * 12, e.y + r * 0.4); ctx.fill(); }   // horns
    } else if (e.type === 'monkey') {
        drawHuman(e.x, e.y, 0.8, { shirt: '#8A5A2A', sleeves: '#8A5A2A', pants: '#7A4A1A', shoes: '#6A3A1A', skin: '#D8A878', hands: '#D8A878', hair: '#6A3A1A', hairStyle: 'short', walk: e.walk });
        ctx.strokeStyle = '#7A4A1A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x + 6, e.y + 8); ctx.quadraticCurveTo(e.x + 20, e.y + 4, e.x + 16, e.y - 8); ctx.stroke();   // curly tail
        if (e.stolen) { ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(e.x + 10, e.y + 2, 4, 0, Math.PI * 2); ctx.fill(); }   // holding your coin!
    } else if (e.type === 'pirate') {
        drawHuman(e.x, e.y, 1, { shirt: '#EEEEEE', sleeves: '#C03030', pants: '#3A2A1A', shoes: '#111', hair: '#2A1A0A', hairStyle: 'short', walk: e.walk, beard: '#2A1A0A' });
        ctx.fillStyle = '#C03030'; ctx.fillRect(e.x - 7, e.y - 24, 14, 4);                  // bandana
        ctx.fillStyle = '#111'; ctx.fillRect(e.x - 4.5, e.y - 18, 4, 3);                     // eye patch
        for (let k = 0; k < 3; k++) { ctx.fillStyle = '#C03030'; ctx.fillRect(e.x - 8, e.y - 6 + k * 4, 16, 2); }   // stripes
        ctx.strokeStyle = '#CCC'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x + 9, e.y + 3); ctx.quadraticCurveTo(e.x + 20, e.y - 6, e.x + 16, e.y - 16); ctx.stroke();   // cutlass
    } else if (e.type === 'gummy') {
        const c = `hsla(${e.hue || 0}, 90%, 60%, 0.8)`;
        const squash = 1 + Math.min(0.3, Math.hypot(e.dx, e.dy) / 12);
        ctx.translate(e.x, e.y); ctx.scale(1 / squash, squash);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse(0, 4, 11, 10, 0, 0, Math.PI * 2); ctx.fill();             // body
        ctx.beginPath(); ctx.arc(0, -9, 8, 0, Math.PI * 2); ctx.fill();                          // head
        ctx.beginPath(); ctx.arc(-6, -15, 3.5, 0, Math.PI * 2); ctx.arc(6, -15, 3.5, 0, Math.PI * 2); ctx.fill();   // ears
        ctx.beginPath(); ctx.ellipse(-10, 2, 3, 5, 0.4, 0, Math.PI * 2); ctx.ellipse(10, 2, 3, 5, -0.4, 0, Math.PI * 2); ctx.fill();   // arms
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-3, -12, 2, 0, Math.PI * 2); ctx.fill();   // shiny
        ctx.fillStyle = '#300'; ctx.beginPath(); ctx.arc(-3, -9, 1.3, 0, Math.PI * 2); ctx.arc(3, -9, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'snowman') {
        for (const [oy, r] of [[8, 12], [-6, 9], [-18, 7]]) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(e.x, e.y + oy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#CDE'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = '#FF8822'; ctx.beginPath(); ctx.moveTo(e.x, e.y - 18); ctx.lineTo(e.x + 8, e.y - 17); ctx.lineTo(e.x, e.y - 15); ctx.fill();   // carrot nose
        ctx.fillStyle = '#111'; ctx.fillRect(e.x - 3, e.y - 21, 2, 2); ctx.fillRect(e.x + 2, e.y - 21, 2, 2);
        ctx.fillRect(e.x - 6, e.y - 28, 12, 3); ctx.fillRect(e.x - 4, e.y - 36, 8, 8);            // top hat
        ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x - 9, e.y - 6); ctx.lineTo(e.x - 18, e.y - 14); ctx.moveTo(e.x + 9, e.y - 6); ctx.lineTo(e.x + 18, e.y - 14); ctx.stroke();
    } else if (e.type === 'frostgiant') {
        const r = e.r;
        ctx.fillStyle = '#7ABCE8'; ctx.fillRect(e.x - r * 0.5, e.y + r * 0.3, r * 0.35, r * 0.6); ctx.fillRect(e.x + r * 0.15, e.y + r * 0.3, r * 0.35, r * 0.6);   // legs
        const body = ctx.createLinearGradient(e.x - r, e.y - r, e.x + r, e.y + r);
        body.addColorStop(0, '#DFF4FF'); body.addColorStop(1, '#6AAEDC');
        ctx.fillStyle = body; pathRoundRect(e.x - r * 0.7, e.y - r * 0.6, r * 1.4, r * 1.0, 10); ctx.fill();
        ctx.fillRect(e.x - r * 1.0, e.y - r * 0.5, r * 0.3, r * 0.9); ctx.fillRect(e.x + r * 0.7, e.y - r * 0.5, r * 0.3, r * 0.9);   // big arms
        ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.85, r * 0.38, 0, Math.PI * 2); ctx.fill();   // head
        ctx.fillStyle = '#FFFFFF'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(e.x + k * 7 - 4, e.y - r * 1.15); ctx.lineTo(e.x + k * 7, e.y - r * 1.5); ctx.lineTo(e.x + k * 7 + 4, e.y - r * 1.15); ctx.fill(); }   // icy crown
        ctx.fillStyle = '#0A3A8A'; ctx.beginPath(); ctx.arc(e.x - 6, e.y - r * 0.9, 3, 0, Math.PI * 2); ctx.arc(e.x + 6, e.y - r * 0.9, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#EAF6FF'; ctx.beginPath(); ctx.moveTo(e.x - 10, e.y - r * 0.7); ctx.lineTo(e.x, e.y - r * 0.35); ctx.lineTo(e.x + 10, e.y - r * 0.7); ctx.fill();   // icicle beard
    } else if (e.type === 'skeleton') {
        const step = Math.sin(e.walk || 0) * 3;
        ctx.strokeStyle = '#EEEEDD'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(e.x - 3, e.y + 4); ctx.lineTo(e.x - 5, e.y + 16 - step); ctx.moveTo(e.x + 3, e.y + 4); ctx.lineTo(e.x + 5, e.y + 16 + step); ctx.stroke();   // legs
        ctx.beginPath(); ctx.moveTo(e.x, e.y - 9); ctx.lineTo(e.x, e.y + 4); ctx.stroke();                                     // spine
        ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(e.x - 6, e.y - 7 + k * 4); ctx.lineTo(e.x + 6, e.y - 7 + k * 4); ctx.stroke(); }   // ribs
        ctx.beginPath(); ctx.moveTo(e.x - 6, e.y - 8); ctx.lineTo(e.x - 11, e.y + 2 + step); ctx.moveTo(e.x + 6, e.y - 8); ctx.lineTo(e.x + 11, e.y + 2 - step); ctx.stroke();   // arms
        ctx.fillStyle = '#EEEEDD'; ctx.beginPath(); ctx.arc(e.x, e.y - 16, 7, 0, Math.PI * 2); ctx.fill();                   // skull
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(e.x - 2.5, e.y - 17, 2, 0, Math.PI * 2); ctx.arc(e.x + 2.5, e.y - 17, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(e.x - 3, e.y - 12, 6, 1.5);
    } else if (e.type === 'thunderbird') {
        const r = e.r, flap = Math.sin(Date.now() / 90) * 14;
        ctx.fillStyle = '#E8B800'; ctx.shadowColor = '#FFE033'; ctx.shadowBlur = 20;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + side * r * 1.8, e.y - r * 0.4 - flap); ctx.lineTo(e.x + side * r * 1.4, e.y + r * 0.3); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#FFE033'; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.5, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.7, r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF8800'; ctx.beginPath(); ctx.moveTo(e.x - 4, e.y - r * 0.65); ctx.lineTo(e.x + 4, e.y - r * 0.65); ctx.lineTo(e.x, e.y - r * 0.4); ctx.fill();   // beak
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(e.x - 5, e.y - r * 0.78, 2.5, 0, Math.PI * 2); ctx.arc(e.x + 5, e.y - r * 0.78, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;   // crackling lightning around it
        if (Math.random() < 0.5) { ctx.beginPath(); ctx.moveTo(e.x - r, e.y - r); ctx.lineTo(e.x - r * 0.6, e.y - r * 0.5); ctx.lineTo(e.x - r * 0.9, e.y - r * 0.3); ctx.stroke(); }
    } else if (e.type === 'alien') {
        ctx.fillStyle = '#44CC44'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x, e.y - 10, 10, 8, 0, 0, Math.PI * 2); ctx.fill();    // big head
        ctx.strokeStyle = '#44CC44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x - 4, e.y - 17); ctx.lineTo(e.x - 7, e.y - 25); ctx.moveTo(e.x + 4, e.y - 17); ctx.lineTo(e.x + 7, e.y - 25); ctx.stroke();
        ctx.fillStyle = '#FFEE44'; ctx.beginPath(); ctx.arc(e.x - 7, e.y - 25, 2, 0, Math.PI * 2); ctx.arc(e.x + 7, e.y - 25, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(e.x - 4, e.y - 10, 3, 4.5, -0.3, 0, Math.PI * 2); ctx.ellipse(e.x + 4, e.y - 10, 3, 4.5, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'mothership') {
        const r = e.r;
        ctx.fillStyle = 'rgba(255,100,255,0.15)'; ctx.beginPath(); ctx.moveTo(e.x - 20, e.y + 10); ctx.lineTo(e.x - 50, e.y + 140); ctx.lineTo(e.x + 50, e.y + 140); ctx.lineTo(e.x + 20, e.y + 10); ctx.fill();   // tractor beam
        const hull = ctx.createLinearGradient(e.x, e.y - 10, e.x, e.y + 20);
        hull.addColorStop(0, '#DDE4EE'); hull.addColorStop(1, '#6A7488');
        ctx.fillStyle = hull; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 1.6, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(150,255,200,0.7)'; ctx.beginPath(); ctx.arc(e.x, e.y - 8, r * 0.55, Math.PI, 0); ctx.fill();   // glass dome
        ctx.fillStyle = '#44CC44'; ctx.beginPath(); ctx.arc(e.x, e.y - 14, 8, 0, Math.PI * 2); ctx.fill();                   // alien pilot
        for (let k = 0; k < 7; k++) { ctx.fillStyle = Math.floor(Date.now() / 150 + k) % 2 ? '#FFEE44' : '#FF44FF'; ctx.beginPath(); ctx.arc(e.x - r * 1.3 + k * r * 0.43, e.y + 4, 3.5, 0, Math.PI * 2); ctx.fill(); }   // blinking lights
    } else if (e.type === 'zombie') {
        drawHuman(e.x, e.y, 1, { shirt: '#2E9A9A', sleeves: '#2E9A9A', pants: '#3A3A8A', shoes: '#333', skin: '#6A9A5A', hands: '#6A9A5A',
                                 hair: '#2A3A1A', hairStyle: 'short', walk: e.walk, noFace: true });
        ctx.fillStyle = '#111';   // blank zombie eyes and mouth
        ctx.fillRect(e.x - 4, e.y - 17, 3, 2); ctx.fillRect(e.x + 1, e.y - 17, 3, 2); ctx.fillRect(e.x - 2, e.y - 12, 4, 1.5);
        ctx.fillStyle = '#6A9A5A';   // arms stuck out in front
        ctx.fillRect(e.x - 11, e.y - 5, 5, 3); ctx.fillRect(e.x + 6, e.y - 5, 5, 3);
    } else if (e.type === 'creeper') {
        const flash = e.fuse > 0 && Math.floor(e.fuse / 5) % 2 === 0;
        const swell = e.fuse > 0 ? 1 + (1 - e.fuse / CREEPER_FUSE) * 0.25 : 1;
        ctx.translate(e.x, e.y); ctx.scale(swell, swell);
        const step = Math.sin(e.walk || 0) * 2;
        ctx.fillStyle = flash ? '#FFFFFF' : '#2E7D32';                       // little feet
        ctx.fillRect(-9, 10 + step, 7, 6); ctx.fillRect(2, 10 - step, 7, 6);
        ctx.fillStyle = flash ? '#FFFFFF' : '#4CAF50';                       // tall body
        ctx.fillRect(-8, -8, 16, 20);
        ctx.fillRect(-9, -24, 18, 17);                                       // square head
        if (!flash) {
            for (let k = 0; k < 14; k++) {                                   // blocky camouflage texture
                ctx.fillStyle = k % 2 ? 'rgba(20,80,20,0.35)' : 'rgba(180,255,180,0.25)';
                ctx.fillRect(-9 + ((k * 7) % 16), -24 + ((k * 11) % 34), 3, 3);
            }
        }
        ctx.fillStyle = '#111';                                              // the famous sad face
        ctx.fillRect(-6, -20, 4, 4); ctx.fillRect(2, -20, 4, 4);
        ctx.fillRect(-2, -16, 4, 4); ctx.fillRect(-4, -13, 8, 4); ctx.fillRect(-4, -10, 2, 2); ctx.fillRect(2, -10, 2, 2);
    } else if (e.type === 'spider') {
        if (e.hidden) { ctx.restore(); return; }
        if (e.dropping || e.y - 50 < 400) {   // silk thread from the ceiling
            ctx.strokeStyle = 'rgba(230,230,230,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(e.x, 50); ctx.lineTo(e.x, e.y - 6); ctx.stroke();
        }
        ctx.strokeStyle = '#1A0A1A'; ctx.lineWidth = 2;   // 8 wiggly legs
        for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
            const wig = Math.sin(Date.now() / 80 + k) * 2;
            ctx.beginPath(); ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + side * 10, e.y - 6 + k * 4 + wig); ctx.lineTo(e.x + side * 16, e.y - 2 + k * 5); ctx.stroke();
        }
        ctx.fillStyle = '#2A0A2A';
        ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x, e.y - 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF2222';
        for (const [ox, oy] of [[-3, -8], [3, -8], [-1.5, -5], [1.5, -5]]) { ctx.beginPath(); ctx.arc(e.x + ox, e.y + oy, 1.4, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#AA2222'; ctx.fillRect(e.x - 2, e.y + 2, 4, 5);   // red mark on its back
    } else if (e.type === 'robot') {
        const step = Math.sin(e.walk || 0) * 3;
        ctx.fillStyle = '#556';                                        // legs marching
        ctx.fillRect(e.x - 7, e.y + 8, 5, 8 + step); ctx.fillRect(e.x + 2, e.y + 8, 5, 8 - step);
        const metal = ctx.createLinearGradient(e.x - 12, e.y - 14, e.x + 12, e.y + 10);
        metal.addColorStop(0, '#DDE4EA'); metal.addColorStop(1, '#6A7480');
        ctx.fillStyle = metal; pathRoundRect(e.x - 12, e.y - 6, 24, 16, 3); ctx.fill();          // body
        ctx.fillStyle = '#FFCC00'; ctx.fillRect(e.x - 4, e.y - 2, 8, 6);                        // warning panel
        ctx.fillStyle = metal; pathRoundRect(e.x - 9, e.y - 20, 18, 14, 3); ctx.fill();          // head
        ctx.fillStyle = '#111'; ctx.fillRect(e.x - 7, e.y - 16, 14, 5);
        ctx.fillStyle = '#FF2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
        ctx.fillRect(e.x - 5 + Math.sin(Date.now() / 200) * 3, e.y - 15, 4, 3);                // scanning red eye
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(e.x, e.y - 20); ctx.lineTo(e.x, e.y - 26); ctx.stroke();
    } else if (e.type === 'ghostking') {
        ctx.globalAlpha = e.hidden ? 0.07 + Math.sin(Date.now() / 150) * 0.04 : 0.85;          // nearly invisible!
        const r = e.r, wob = Math.sin(Date.now() / 300) * 3;
        ctx.fillStyle = '#E8D0FF'; ctx.shadowColor = '#AA66FF'; ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(e.x, e.y + wob, r, Math.PI, 0);
        for (let k = 0; k <= 6; k++) ctx.lineTo(e.x + r - (k * 2 * r) / 6, e.y + wob + r * (k % 2 ? 0.55 : 0.95));
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2A0040';
        ctx.beginPath(); ctx.ellipse(e.x - r * 0.35, e.y + wob - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2);
        ctx.ellipse(e.x + r * 0.35, e.y + wob - r * 0.15, r * 0.15, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x, e.y + wob + r * 0.3, r * 0.22, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();   // "Ooooo!" mouth
        ctx.fillStyle = '#FFD700';                                                                         // crown
        ctx.beginPath(); ctx.moveTo(e.x - r * 0.5, e.y + wob - r * 0.85);
        for (let k = 0; k <= 4; k++) ctx.lineTo(e.x - r * 0.5 + (r / 4) * k, e.y + wob - r * (k % 2 ? 1.0 : 1.3));
        ctx.lineTo(e.x + r * 0.5, e.y + wob - r * 0.85); ctx.closePath(); ctx.fill();
    } else if (e.type === 'dragon') {
        const r = e.r, flap = Math.sin(Date.now() / 200) * 8, charging = e.breath < 40;
        ctx.fillStyle = '#5A1A3A';                                                         // wings
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(e.x + side * r * 0.3, e.y - r * 0.3);
            ctx.lineTo(e.x + side * r * 1.6, e.y - r * 1.2 - flap); ctx.lineTo(e.x + side * r * 1.4, e.y + r * 0.3); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#8A2A4A'; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round';        // tail
        ctx.beginPath(); ctx.moveTo(e.x + r * 0.5, e.y + r * 0.4); ctx.quadraticCurveTo(e.x + r * 1.6, e.y + r * 0.9, e.x + r * 1.5, e.y - r * 0.1); ctx.stroke();
        const body = ctx.createRadialGradient(e.x - r * 0.3, e.y - r * 0.2, 4, e.x, e.y, r);
        body.addColorStop(0, '#C04060'); body.addColorStop(1, '#5A1030');
        ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.8, r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E8B070'; ctx.beginPath(); ctx.ellipse(e.x - r * 0.1, e.y + r * 0.2, r * 0.45, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();   // belly
        ctx.strokeStyle = '#8A2A4A'; ctx.lineWidth = r * 0.28;                              // neck
        ctx.beginPath(); ctx.moveTo(e.x - r * 0.4, e.y - r * 0.3); ctx.quadraticCurveTo(e.x - r * 0.9, e.y - r * 0.8, e.x - r * 0.9, e.y - r * 0.4); ctx.stroke();
        ctx.fillStyle = '#9A2A4A'; ctx.beginPath(); ctx.ellipse(e.x - r * 1.0, e.y - r * 0.35, r * 0.35, r * 0.25, 0.2, 0, Math.PI * 2); ctx.fill();   // head
        ctx.fillStyle = '#E8D8B0';
        for (const ox of [-0.9, -1.1]) { ctx.beginPath(); ctx.moveTo(e.x + r * ox, e.y - r * 0.55); ctx.lineTo(e.x + r * (ox + 0.1), e.y - r * 0.9); ctx.lineTo(e.x + r * (ox + 0.15), e.y - r * 0.5); ctx.fill(); }   // horns
        ctx.fillStyle = '#FFEE00'; ctx.shadowColor = '#FFEE00'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(e.x - r * 1.05, e.y - r * 0.42, r * 0.07, 0, Math.PI * 2); ctx.fill();
        if (charging) {   // fire building up in its mouth
            ctx.fillStyle = `rgba(255,${120 + Math.random() * 100},0,0.9)`; ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(e.x - r * 1.3, e.y - r * 0.3, r * (0.1 + (40 - e.breath) / 200), 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    } else if (e.type === 'shadow') {
        ctx.globalAlpha = e.emerge > 0 ? 1 - e.emerge / 60 : 0.85;
        ctx.shadowColor = '#8844FF'; ctx.shadowBlur = 16;
        drawHuman(e.x, e.y, 1, { shirt: '#1A1026', sleeves: '#140C1E', pants: '#0E0816', shoes: '#000', skin: '#2A1A3A', hands: '#2A1A3A',
                                 hair: '#000', hairStyle: 'spiky', walk: e.walk, noFace: true });
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#CC88FF';   // glowing eyes
        ctx.beginPath(); ctx.arc(e.x - 2.6, e.y - 16.5, 1.4, 0, Math.PI * 2); ctx.arc(e.x + 2.6, e.y - 16.5, 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'worm') {
        if (e.hidden) {
            // Moving dirt bump — it shakes and glows just before popping up
            const shake = e.wState === 'rising' ? (Math.random() - 0.5) * 4 : 0;
            ctx.fillStyle = '#5C3A1E';
            ctx.beginPath(); ctx.ellipse(e.x + shake, e.y + 6, 16, 7, 0, Math.PI, 0); ctx.fill();
            if (e.wState === 'rising') {
                ctx.strokeStyle = '#FF7700'; ctx.lineWidth = 2; ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.moveTo(e.x - 8, e.y + 4); ctx.lineTo(e.x - 2, e.y); ctx.lineTo(e.x + 3, e.y + 4); ctx.lineTo(e.x + 9, e.y); ctx.stroke();
            }
        } else {
            // Lava worm sticking out of its hole
            const sway = Math.sin(Date.now() / 150 + e.x) * 3;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + 10, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 14;
            [[0, 8, 11], [sway * 0.5, -4, 10], [sway, -16, 9]].forEach(([ox, oy, r], i) => {
                ctx.fillStyle = i % 2 ? '#FF7722' : '#CC3300';
                ctx.beginPath(); ctx.arc(e.x + ox, e.y + oy, r, 0, Math.PI * 2); ctx.fill();
            });
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFEE00';   // glowing eyes
            ctx.beginPath(); ctx.arc(e.x + sway - 4, e.y - 18, 2.5, 0, Math.PI * 2); ctx.arc(e.x + sway + 4, e.y - 18, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#330000';   // mouth
            ctx.beginPath(); ctx.arc(e.x + sway, e.y - 12, 3, 0, Math.PI); ctx.fill();
        }
    } else if (e.type === 'imp') {
        ctx.globalAlpha = e.emerge > 0 ? 1 - e.emerge / 30 : 1;
        const flap = Math.sin(Date.now() / 70 + e.x) * 4;
        ctx.fillStyle = '#AA1111';   // little bat wings
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(e.x + side * 6, e.y - 2);
            ctx.lineTo(e.x + side * 18, e.y - 8 - flap); ctx.lineTo(e.x + side * 13, e.y + 4); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#DD2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#660000';   // horns
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(e.x + side * 4, e.y - e.r + 2); ctx.lineTo(e.x + side * 7, e.y - e.r - 7); ctx.lineTo(e.x + side * 9, e.y - e.r + 3); ctx.fill();
        }
        ctx.strokeStyle = '#660000'; ctx.lineWidth = 2;   // pointy tail
        ctx.beginPath(); ctx.moveTo(e.x, e.y + e.r); ctx.quadraticCurveTo(e.x + 10, e.y + e.r + 8, e.x + 14, e.y + e.r + 2); ctx.stroke();
        ctx.fillStyle = '#FFEE00';
        ctx.beginPath(); ctx.arc(e.x - 4, e.y - 2, 2.5, 0, Math.PI * 2); ctx.arc(e.x + 4, e.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'mole') {
        const rise = Math.max(0, 1 - (e.emerge || 0) / 45);   // 0 → 1 while climbing out
        const r = e.r * (0.4 + 0.6 * rise);
        ctx.globalAlpha = e.emerge > 45 ? 0 : 0.4 + 0.6 * rise;   // still deep underground: invisible
        ctx.fillStyle = '#5C3A1E';
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E8A0A0';   // pink nose
        ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF2222';   // angry red eyes
        ctx.beginPath();
        ctx.arc(e.x - r * 0.35, e.y - r * 0.25, r * 0.15, 0, Math.PI * 2);
        ctx.arc(e.x + r * 0.35, e.y - r * 0.25, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D8C8A8'; ctx.lineWidth = 2;   // claws
        for (const side of [-1, 1]) {
            for (let k = -1; k <= 1; k++) {
                ctx.beginPath();
                ctx.moveTo(e.x + side * r * 0.8, e.y + r * 0.4 + k * 3);
                ctx.lineTo(e.x + side * r * 1.25, e.y + r * 0.55 + k * 4);
                ctx.stroke();
            }
        }
    } else if (e.type === 'slime' || e.type === 'king') {
        // Squishes flat while resting, stretches tall mid-hop
        const speed   = Math.hypot(e.dx, e.dy);
        const stretch = Math.min(1, speed / 4);
        const w = e.r * (1.2 - stretch * 0.3), h = e.r * (0.8 + stretch * 0.4);
        ctx.fillStyle = 'rgba(100,220,70,0.85)'; ctx.shadowColor = '#66DD44'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r - h, w, h, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200,255,180,0.7)';   // shine
        ctx.beginPath(); ctx.ellipse(e.x - w * 0.4, e.y + e.r - h * 1.5, w * 0.2, h * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#113311';
        ctx.beginPath();
        const eyeGap = e.r * 0.32, eyeR = Math.max(2, e.r * 0.18);
        ctx.arc(e.x - eyeGap, e.y + e.r - h * 1.1, eyeR, 0, Math.PI * 2);
        ctx.arc(e.x + eyeGap, e.y + e.r - h * 1.1, eyeR, 0, Math.PI * 2);
        ctx.fill();
        if (e.type === 'king') {
            // Golden crown
            const top = e.y + e.r - h * 2, cw = e.r * 0.9;
            ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(e.x - cw / 2, top + 4);
            for (let k = 0; k <= 4; k++) ctx.lineTo(e.x - cw / 2 + (cw / 4) * k, k % 2 ? top - 4 : top - 16);
            ctx.lineTo(e.x + cw / 2, top + 4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FF3355';
            ctx.beginPath(); ctx.arc(e.x, top - 2, 3, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
    if (e.frozen > 0 && !e.hidden) drawIceBlock(e.x, e.y, e.r, e.frozen);
    // White flash when hit
    if (e.hitFlash > 0 && !(e.emerge > 0) && !e.hidden) {
        ctx.save();
        ctx.globalAlpha = e.hitFlash / 12;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// Shows exactly where (and how deep) you're digging:
// a glowing ring on the pile, a progress bar, and a little underground window
function drawDigView(s) {
    const t = Date.now() / 1000;
    ctx.save();
    // Pulsing ring around the spot you're digging
    ctx.strokeStyle = `rgba(255,224,138,${0.5 + Math.sin(t * 6) * 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, DIG_RANGE, DIG_RANGE * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Progress through this layer
    const need = DIG_HITS_PER_LAYER[s.depth], frac = s.hits / need;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(s.x - 20, s.y - 16, 40, 6);
    ctx.fillStyle = '#FFB347'; ctx.fillRect(s.x - 20, s.y - 16, 40 * frac, 6);
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.strokeRect(s.x - 20, s.y - 16, 40, 6);

    // Underground window: the 3 soil layers, and your hole going down
    const W = 58, H = 84, px = Math.min(800 - W - 6, s.x + 28), py = s.y < 220 ? s.y + 26 : s.y - H - 36;
    ctx.fillStyle = 'rgba(10,6,2,0.85)'; ctx.fillRect(px - 3, py - 16, W + 6, H + 20);
    ctx.strokeStyle = '#C8A070'; ctx.lineWidth = 2; ctx.strokeRect(px - 3, py - 16, W + 6, H + 20);
    ctx.fillStyle = '#FFE08A'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`LAYER ${s.depth + 1}/${DIG_MAX_DEPTH}`, px + W / 2, py - 5);
    const layerH = H / DIG_MAX_DEPTH, soils = ['#9A6A3A', '#6E4526', '#46291A'];
    for (let L = 0; L < DIG_MAX_DEPTH; L++) {
        ctx.fillStyle = soils[L]; ctx.fillRect(px, py + L * layerH, W, layerH);
        for (let k = 0; k < 6; k++) {                                   // pebbles
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(px + ((k * 17 + L * 11) % (W - 4)), py + L * layerH + ((k * 7) % (layerH - 3)), 3, 2);
        }
        if (L >= s.depth) {                                             // what's still buried?
            ctx.fillStyle = L === 2 ? `hsl(${(t * 120) % 360}, 90%, 70%)` : '#FFE08A';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('?', px + W - 10, py + L * layerH + layerH / 2 + 4);
        }
    }
    // The hole so far
    const holeBottom = (s.depth + frac) * layerH;
    ctx.fillStyle = '#050201'; ctx.fillRect(px + W / 2 - 7, py, 14, holeBottom);
    // A tiny you, digging at the bottom of the hole
    ctx.fillStyle = getPlayerColor(); ctx.fillRect(px + W / 2 - 4, py + Math.max(0, holeBottom - 9), 8, 8);
    ctx.restore();
}

// Frozen solid: a see-through ice block (flickers just before melting)
function drawIceBlock(x, y, r, framesLeft) {
    if (framesLeft < 30 && Math.floor(Date.now() / 80) % 2) return;
    ctx.save();
    ctx.fillStyle = 'rgba(160,220,255,0.45)';
    ctx.strokeStyle = 'rgba(230,250,255,0.9)'; ctx.lineWidth = 2;
    const s = r * 1.35;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.strokeRect(x - s, y - s, s * 2, s * 2);
    ctx.beginPath();   // shine
    ctx.moveTo(x - s * 0.7, y - s * 0.2); ctx.lineTo(x - s * 0.2, y - s * 0.7);
    ctx.moveTo(x - s * 0.7, y + s * 0.2); ctx.lineTo(x + s * 0.2, y - s * 0.7);
    ctx.stroke();
    ctx.restore();
}

// Little health bar, only once a bad guy has been hurt
function drawEnemyHp(e) {
    if (e.hp >= e.maxHp) return;
    const bw = 30, bh = 4, bx = e.x - bw / 2, by = e.y - e.r - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = `hsl(${(e.hp / e.maxHp) * 120}, 100%, 45%)`;
    ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), bh);
}

// ── DRAW: THE DEVIL ───────────────────────────────────────────
// Bat wings, curly horns, glowing eyes, fangs, a goatee, a pointy tail and a pitchfork
function drawDevil(d, telegraphing, flashOn) {
    const r = d.r, t = Date.now() / 1000, x = d.x, y = d.y;
    const flash = d.shieldFlash > 0;
    const skinA = telegraphing ? (flashOn ? '#FFFF66' : '#FFFFFF') : flash ? '#FFFFFF' : d.skinA || '#D42A1A';
    const skinB = telegraphing ? '#FF9900' : flash ? '#CCCCCC' : d.skinB || '#6A0A05';
    ctx.save();
    ctx.shadowColor = telegraphing ? '#FFFF00' : flash ? '#FFFFFF' : '#FF2200';
    ctx.shadowBlur  = telegraphing ? 45 : flash ? 35 : 18;

    // Bat wings (flap slowly)
    const flap = Math.sin(t * 3) * 0.25;
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(x + side * r * 0.45, y - r * 0.2);
        ctx.rotate(side * flap);
        ctx.fillStyle = '#4A0808';
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(side * r * 1.3, -r * 1.0); ctx.lineTo(side * r * 2.0, -r * 0.4);
        ctx.quadraticCurveTo(side * r * 1.7, 0, side * r * 1.8, r * 0.5);
        ctx.quadraticCurveTo(side * r * 1.3, r * 0.2, side * r * 1.2, r * 0.7);
        ctx.quadraticCurveTo(side * r * 0.8, r * 0.3, side * r * 0.5, r * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#2A0404'; ctx.lineWidth = Math.max(1.5, r * 0.06);   // wing bones
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(side * r * 1.3, -r * 1.0);
        ctx.moveTo(side * r * 1.3, -r * 1.0); ctx.lineTo(side * r * 1.8, r * 0.5);
        ctx.moveTo(side * r * 1.3, -r * 1.0); ctx.lineTo(side * r * 1.2, r * 0.7);
        ctx.stroke();
        ctx.restore();
    }

    // Pointy tail
    ctx.strokeStyle = skinB; ctx.lineWidth = Math.max(2, r * 0.12); ctx.lineCap = 'round';
    const tx = x - r * 1.1, ty = y + r * 0.5 + Math.sin(t * 2) * r * 0.15;
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 0.7); ctx.quadraticCurveTo(x - r * 1.2, y + r * 1.2, tx, ty); ctx.stroke();
    ctx.fillStyle = skinB;
    ctx.beginPath(); ctx.moveTo(tx - r * 0.2, ty + r * 0.05); ctx.lineTo(tx, ty - r * 0.3); ctx.lineTo(tx + r * 0.2, ty + r * 0.05); ctx.lineTo(tx, ty - r * 0.05); ctx.fill();

    // Pitchfork held in the right hand
    ctx.strokeStyle = '#3A2A1A'; ctx.lineWidth = Math.max(2, r * 0.09);
    const px = x + r * 0.95;
    ctx.beginPath(); ctx.moveTo(px, y + r * 1.0); ctx.lineTo(px, y - r * 1.3); ctx.stroke();
    ctx.strokeStyle = '#B0B0B0'; ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(px - r * 0.3, y - r * 1.3); ctx.lineTo(px + r * 0.3, y - r * 1.3);
    for (const ox of [-0.3, 0, 0.3]) { ctx.moveTo(px + ox * r, y - r * 1.3); ctx.lineTo(px + ox * r, y - r * 1.65); }
    ctx.stroke();

    // Muscly body
    const body = ctx.createRadialGradient(x - r * 0.3, y, r * 0.1, x, y + r * 0.3, r);
    body.addColorStop(0, skinA); body.addColorStop(1, skinB);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 0.72, r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(60,0,0,0.5)'; ctx.lineWidth = Math.max(1, r * 0.05);   // chest muscles
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.05); ctx.lineTo(x, y + r * 0.7);
    ctx.arc(x - r * 0.25, y + r * 0.25, r * 0.22, 0.2, Math.PI - 0.2); ctx.moveTo(x + r * 0.47, y + r * 0.3); ctx.arc(x + r * 0.25, y + r * 0.25, r * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Arms
    ctx.fillStyle = skinB;
    ctx.beginPath(); ctx.ellipse(x - r * 0.75, y + r * 0.35, r * 0.18, r * 0.42, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.8, y + r * 0.2, r * 0.18, r * 0.4, -0.5, 0, Math.PI * 2); ctx.fill();

    // Head
    const hy = y - r * 0.55;
    // Curved horns
    for (const side of [-1, 1]) {
        const hg = ctx.createLinearGradient(x + side * r * 0.3, hy, x + side * r * 0.8, hy - r * 0.9);
        hg.addColorStop(0, '#2A1A10'); hg.addColorStop(1, '#D8C8A8');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(x + side * r * 0.2, hy - r * 0.3);
        ctx.quadraticCurveTo(x + side * r * 0.9, hy - r * 0.3, x + side * r * 0.75, hy - r * 1.05);
        ctx.quadraticCurveTo(x + side * r * 0.65, hy - r * 0.55, x + side * r * 0.42, hy - r * 0.12);
        ctx.closePath(); ctx.fill();
    }
    // Pointy ears
    ctx.fillStyle = skinB;
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * r * 0.4, hy - r * 0.05); ctx.lineTo(x + side * r * 0.72, hy - r * 0.3); ctx.lineTo(x + side * r * 0.42, hy + r * 0.18); ctx.fill();
    }
    const head = ctx.createRadialGradient(x - r * 0.12, hy - r * 0.15, r * 0.05, x, hy, r * 0.5);
    head.addColorStop(0, skinA); head.addColorStop(1, skinB);
    ctx.fillStyle = head;
    ctx.beginPath(); ctx.ellipse(x, hy, r * 0.44, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // Goatee
    ctx.fillStyle = '#1A0000';
    ctx.beginPath(); ctx.moveTo(x - r * 0.12, hy + r * 0.38); ctx.lineTo(x, hy + r * 0.78); ctx.lineTo(x + r * 0.12, hy + r * 0.38); ctx.fill();
    // Angry eyebrows
    ctx.strokeStyle = '#1A0000'; ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.beginPath(); ctx.moveTo(x - r * 0.32, hy - r * 0.22); ctx.lineTo(x - r * 0.06, hy - r * 0.1);
    ctx.moveTo(x + r * 0.32, hy - r * 0.22); ctx.lineTo(x + r * 0.06, hy - r * 0.1); ctx.stroke();
    // Glowing eyes with slit pupils
    ctx.fillStyle = '#FFEE22'; ctx.shadowColor = '#FFEE22'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(x - r * 0.18, hy, r * 0.11, r * 0.08, 0.2, 0, Math.PI * 2); ctx.ellipse(x + r * 0.18, hy, r * 0.11, r * 0.08, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#000';
    ctx.fillRect(x - r * 0.19, hy - r * 0.07, r * 0.035, r * 0.14); ctx.fillRect(x + r * 0.165, hy - r * 0.07, r * 0.035, r * 0.14);
    // Evil grin with fangs
    ctx.fillStyle = '#2A0000';
    ctx.beginPath(); ctx.moveTo(x - r * 0.25, hy + r * 0.2); ctx.quadraticCurveTo(x, hy + r * 0.42, x + r * 0.25, hy + r * 0.2); ctx.quadraticCurveTo(x, hy + r * 0.3, x - r * 0.25, hy + r * 0.2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x + side * r * 0.14, hy + r * 0.25); ctx.lineTo(x + side * r * 0.1, hy + r * 0.36); ctx.lineTo(x + side * r * 0.06, hy + r * 0.26); ctx.fill();
    }
    ctx.restore();
}

