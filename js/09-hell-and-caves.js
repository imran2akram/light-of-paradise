// ── HELL CAVES (player can hide here; devil switches to WANDER) ──
const HELL_CAVES = [
    { x: 55,  y: 55,  w: 175, h: 115 },
    { x: 570, y: 400, w: 175, h: 130 },
];

// ── DIG SPOTS (weapons are buried underground inside the caves) ──
const DIG_SPOTS = [
    { x: 105, y: 125 }, { x: 180, y: 125 },   // top-left cave
    { x: 620, y: 480 }, { x: 695, y: 480 },   // bottom-right cave
];
const DIG_MAX_DEPTH       = 3;                 // layers in each dig spot
const DIG_HITS_PER_LAYER  = [3, 4, 8];         // Space / DIG presses per layer (deeper = harder)
const DIG_MOLE_CHANCE     = [0.3, 0.6, 1.0];   // chance a mole monster pops out of each layer
const DIG_RANGE           = 24;                // how close the player must stand to a dig spot
const MOLE_MIN_DIST       = 140;               // a mole always comes up at least this far from the PLAYER
const MOLE_WARN_FRAMES    = 90;                // shaking mound with a "!" before the mole climbs out
const MOLE_EMERGE_FRAMES  = 45;                // then it climbs out (harmless while emerging)
const MOLE_SLOW_FRAMES    = 60;                // gentle start: half speed for the first second out
const MOLE_SLOW_FACTOR    = 0.5;
// Layer 1: Ice / Fire / Lightning / Water · Layer 2: SUPER (3 shots at once) · Layer 3: RAINBOW (strong vs everything)

// ── UPDATE: DIGGING ───────────────────────────────────────────
// Returns the dig spot the player is standing on (if it still has layers left)
function nearbyDigSpot() {
    if (state.room !== ROOM.HELL) return null;
    return hell.digSpots.find(s =>
        s.depth < DIG_MAX_DEPTH && Math.hypot(player.x - s.x, player.y - s.y) < DIG_RANGE
    ) || null;
}

// You can't dig while a mole monster is out — Space / the button shoots it instead
function canDig() {
    return !hell.enemies.some(e => e.alive && e.type === 'mole');
}

function powerName(power = state.power, tier = state.powerTier) {
    if (power === POWER.NONE)    return 'Smiting Stick';
    if (power === POWER.RAINBOW) return 'Rainbow';
    return tier >= 2 ? `Super ${power}` : power;
}

// Finds a place for the mole to come up: far from the player, in the room, and
// preferably in (or at the edge of) the player's cave so they can see it (you only
// see inside the cave while hiding), then in the other cave, then anywhere
const MOLE_EDGE_PAD = 45;   // px around a cave still counts as "at the edge"
function moleSpawnPoint(s) {
    const farEnough = (x, y) => Math.hypot(x - player.x, y - player.y) >= MOLE_MIN_DIST;
    const ownCave = HELL_CAVES.find(c => s.x >= c.x && s.x <= c.x + c.w && s.y >= c.y && s.y <= c.y + c.h);
    const around = c => {
        const out = [];
        for (let i = 0; i < 40; i++) {
            const x = c.x - MOLE_EDGE_PAD + Math.random() * (c.w + 2 * MOLE_EDGE_PAD), y = c.y - MOLE_EDGE_PAD + Math.random() * (c.h + 2 * MOLE_EDGE_PAD);
            if (x >= 40 && x <= 760 && y >= 80 && y <= 560 && farEnough(x, y)) out.push({ x, y });
        }
        return out;
    };
    const own = ownCave ? around(ownCave) : [];
    const other = HELL_CAVES.filter(c => c !== ownCave).flatMap(around);
    const anywhere = [];
    for (let i = 0; i < 40; i++) {
        const x = 40 + Math.random() * 720, y = 80 + Math.random() * 480;
        if (farEnough(x, y)) anywhere.push({ x, y });
    }
    const list = own.length ? own : other.length ? other : anywhere;
    if (list.length) return list[Math.floor(Math.random() * list.length)];
    // Nothing found (very unlikely): the far side of the room from the player
    return { x: player.x < 400 ? 700 : 100, y: player.y < 300 ? 500 : 100 };
}

function spawnMole(s) {
    const p = moleSpawnPoint(s);
    hell.enemies.push({
        type: 'mole', x: p.x, y: p.y, alive: true,
        r: 13 + s.depth * 2, hp: s.depth * 2 + 1, maxHp: s.depth * 2 + 1, hitFlash: 0, frozen: 0,
        speed: 0.8 + s.depth * 0.25,
        warn: MOLE_WARN_FRAMES,        // shaking mound first (can't hurt or be hurt)
        emerge: MOLE_EMERGE_FRAMES,    // then climbs out (still harmless)
        slowStart: MOLE_SLOW_FRAMES,   // then walks slowly for a moment
    });
    sfx('rumble');
}

function nearbyGem() {
    if (state.room !== ROOM.UNDERGROUND) return null;
    return underground.gems.find(g => !g.mined && Math.hypot(player.x - g.x, player.y - g.y) < 30) || null;
}

// Mining a gem in the Underground Caves: a few hits, then +1 heart and points
function tryMine() {
    const gem = nearbyGem();
    if (!gem) return false;
    gem.hits++;
    sfx('dig');
    spawnParticles(gem.x, gem.y, gem.color, 5);
    if (gem.hits >= GEM_HITS) {
        gem.mined = true;
        const maxHp = fullHearts();
        if (state.playerHp < maxHp) state.playerHp++;
        addScore(50);
        spawnFloatText(gem.x, gem.y - 26, '💎 +50  +1 ❤', gem.color, 90);
        spawnParticles(gem.x, gem.y, gem.color, 16);
        sfx('found');
    }
    return true;
}

// Returns true if the player dug (so Space / the button doesn't also shoot)
function tryDig() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    if (tryMine()) return true;
    const s = nearbyDigSpot();
    if (!s || !canDig()) return false;
    s.hits++;
    state.digAnim = 14;
    sfx('dig');
    spawnParticles(s.x, s.y, '#8B5A2B', 6);
    triggerShake(3);
    if (s.hits < DIG_HITS_PER_LAYER[s.depth]) return true;

    // Broke through a layer!
    s.hits = 0;
    s.depth++;
    // The bottom layer only SOMETIMES has Rainbow Power — otherwise it's another Super weapon
    const rainbow = s.depth === 3 && Math.random() < RAINBOW_CHANCE;
    const tier   = rainbow ? 3 : Math.min(s.depth, 2);
    const weapon = rainbow ? POWER.RAINBOW : s.weapon;
    const color  = WEAPON_INFO[weapon].color;
    const name   = (tier === 2 ? 'SUPER ' : '') + WEAPON_INFO[weapon].label;
    let text;
    if (state.power !== POWER.NONE && tier < state.powerTier) {
        text = `Found ${name} — yours is better!`;
    } else {
        state.power     = weapon;
        state.powerTier = tier;
        state.playerFlash = 25;
        if (weapon === POWER.RAINBOW) giveAward('rainbow');
        text = tier === 3 ? `LEGENDARY! ${name}!` : tier === 2 ? `RARE! ${name}!` : `You found ${name}!`;
    }
    spawnParticles(s.x, s.y, color, 10 + tier * 6);
    triggerShake(6 + tier * 2);
    sfx('found');
    addScore(5 * tier);

    let sub = s.depth < DIG_MAX_DEPTH ? 'Keep digging for something rarer…'
            : rainbow ? '' : 'No Rainbow down here this time…';
    if (s.depth === DIG_MAX_DEPTH && s.tunnel) sub = 'What\'s that? A secret TUNNEL!';
    if (Math.random() < DIG_MOLE_CHANCE[s.depth - 1]) {
        spawnMole(s);
        sub = 'Look out — a MOLE MONSTER!';
    }
    hell.foundMsg = { text, sub, color, timer: 120 };
    return true;
}

function updateDigging() {
    if (hell.foundMsg && --hell.foundMsg.timer <= 0) hell.foundMsg = null;
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

// ── DRAW: HELL AND UNDERGROUND BACKGROUNDS ─────────────────
function paintHell(g, R) {
    const base = g.createRadialGradient(400, 320, 60, 400, 320, 520);
    base.addColorStop(0, '#3C0E06'); base.addColorStop(1, '#120302');
    g.fillStyle = base; g.fillRect(0, 0, 800, 600);
    // Cracked volcanic rock
    for (let i = 0; i < 700; i++) {
        g.fillStyle = `hsla(${8 + R() * 14}, ${35 + R() * 25}%, ${6 + R() * 14}%, 0.6)`;
        g.beginPath(); g.ellipse(R() * 800, R() * 600, 6 + R() * 22, 4 + R() * 12, R() * 3, 0, Math.PI * 2); g.fill();
    }
    // Glowing lava cracks
    for (let i = 0; i < 18; i++) {
        let x = R() * 800, y = 70 + R() * 530, a = R() * Math.PI * 2;
        const pts = [[x, y]];
        for (let k = 0; k < 5 + R() * 6; k++) {   // wanders a little, like a real crack
            a += (R() - 0.5) * 1.1;
            const step = 12 + R() * 14;
            x += Math.cos(a) * step; y += Math.sin(a) * step; pts.push([x, y]);
        }
        for (const [w, col, blur] of [[2.2, 'rgba(255,70,0,0.75)', 7], [0.8, 'rgba(255,215,130,0.8)', 0]]) {
            g.strokeStyle = col; g.lineWidth = w; g.shadowColor = '#FF3300'; g.shadowBlur = blur; g.lineJoin = 'round';
            g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
        }
    }
    g.shadowBlur = 0;
    // Lava pools
    for (const [x, y, rx, ry] of [[70, 555, 70, 34], [770, 190, 42, 60]]) {
        g.fillStyle = '#2A0A04'; g.beginPath(); g.ellipse(x, y, rx + 8, ry + 6, 0, 0, Math.PI * 2); g.fill();
        const lava = g.createRadialGradient(x - rx * 0.2, y - ry * 0.2, 4, x, y, Math.max(rx, ry));
        lava.addColorStop(0, '#FFF0A0'); lava.addColorStop(0.35, '#FFA020'); lava.addColorStop(1, '#B01E00');
        g.fillStyle = lava; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
    // Rocky cave entrances (the dark caves you can hide in)
    HELL_CAVES.forEach((c, ci) => {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const inside = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(c.w, c.h) * 0.7);
        inside.addColorStop(0, '#050201'); inside.addColorStop(1, '#1E0E06');
        g.fillStyle = inside;
        g.beginPath(); g.ellipse(cx, cy, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); g.fill();
        g.fillRect(c.x + 14, c.y + 8, c.w - 28, c.h - 16);
        // Boulders around the edge
        for (let k = 0; k < 46; k++) {
            const a = (k / 46) * Math.PI * 2, rr = 6 + R() * 9;
            const bx = cx + Math.cos(a) * (c.w / 2 + 2), by = cy + Math.sin(a) * (c.h / 2 + 2);
            const stone = g.createRadialGradient(bx - rr * 0.4, by - rr * 0.4, 1, bx, by, rr);
            stone.addColorStop(0, '#7A5A48'); stone.addColorStop(1, '#2E1E16');
            g.fillStyle = stone; g.beginPath(); g.arc(bx, by, rr, 0, Math.PI * 2); g.fill();
        }
    });
}

function paintUnderground(g, R) {
    g.fillStyle = '#1C130C'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 900; i++) {   // dirt and stone floor
        g.fillStyle = `hsla(${25 + R() * 15}, ${20 + R() * 20}%, ${8 + R() * 12}%, 0.7)`;
        g.beginPath(); g.ellipse(R() * 800, R() * 600, 3 + R() * 16, 2 + R() * 9, R() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 7; i++) {    // shiny puddles
        const x = R() * 800, y = 90 + R() * 480;
        g.fillStyle = 'rgba(60,90,120,0.35)'; g.beginPath(); g.ellipse(x, y, 20 + R() * 20, 6 + R() * 5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(200,230,255,0.2)'; g.beginPath(); g.ellipse(x - 6, y - 2, 8, 2, 0, 0, Math.PI * 2); g.fill();
    }
    // Stalactites (top) and stalagmites (bottom)
    for (let x = 0; x < 800; x += 18 + R() * 26) {
        const h = 14 + R() * 30;
        g.fillStyle = '#3A2A1C';
        g.beginPath(); g.moveTo(x, 46); g.lineTo(x + 8, 46 + h); g.lineTo(x + 16, 46); g.fill();
        const h2 = 10 + R() * 22;
        g.beginPath(); g.moveTo(x + 4, 600); g.lineTo(x + 12, 600 - h2); g.lineTo(x + 20, 600); g.fill();
    }
}

// ── DRAW: SECRET ROOMS ────────────────────────────────────────
function drawSecretRoom() {
    const t = Date.now() / 1000;
    // Golden glow and treasure piles
    const glow = ctx.createRadialGradient(400, 300, 30, 400, 300, 420);
    glow.addColorStop(0, 'rgba(255,215,0,0.35)'); glow.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 12; i++) {
        const x = 60 + i * 62, y = 560 - (i % 3) * 8;
        ctx.fillStyle = i % 2 ? '#E8B830' : '#FFD700';
        ctx.beginPath(); ctx.ellipse(x, y, 34, 14, 0, Math.PI, 0); ctx.fill();
    }
    for (let i = 0; i < 20; i++) {
        if (Math.sin(t * 2 + i * 1.7) > 0.6) drawStar((i * 173) % 800, 70 + (i * 97) % 460, 3, '#FFF8C0');
    }
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText('You found the SECRET GOLDEN ROOM!', 400, 130);
    ctx.fillStyle = 'rgba(255,240,180,0.8)'; ctx.font = '13px Arial';
    ctx.fillText('Grab the treasures! The star portal takes you back out.', 400, 154);

    for (const tr of secretRoom.treasures) {
        if (tr.picked) continue;
        const bob = Math.sin(t * 3 + tr.x) * 4;
        // Pedestal
        ctx.fillStyle = '#C8A040'; ctx.fillRect(tr.x - 22, tr.y + 14, 44, 12);
        ctx.fillStyle = '#A08030'; ctx.fillRect(tr.x - 16, tr.y + 26, 32, 14);
        ctx.save();
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 20;
        if (tr.kind === 'rainbow')    drawStar(tr.x, tr.y + bob, 16, `hsl(${(t * 200) % 360}, 100%, 60%)`);
        else if (tr.kind === 'gem') { ctx.fillStyle = '#66EEFF'; ctx.beginPath(); ctx.moveTo(tr.x, tr.y + bob - 18); ctx.lineTo(tr.x + 13, tr.y + bob);
                                      ctx.lineTo(tr.x, tr.y + bob + 12); ctx.lineTo(tr.x - 13, tr.y + bob); ctx.closePath(); ctx.fill(); }
        else if (tr.kind === 'heart') { ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                                        ctx.fillStyle = '#FF3355'; ctx.fillText('❤', tr.x, tr.y + bob); }
        else                          drawStar(tr.x, tr.y + bob, 16, '#FFD700');
        ctx.restore();
        ctx.fillStyle = '#FFF4C0'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText({ rainbow: 'RAINBOW POWER', gem: 'GIANT GEM', heart: 'SUPER HEART', star: 'GOLDEN STAR' }[tr.kind], tr.x, tr.y + 54);
    }
}

function drawUnderground() {
    const t = Date.now() / 1000;
    // Glowing mushrooms
    for (const m of underground.shrooms) {
        const c = `hsl(${m.h}, 90%, 60%)`;
        ctx.save();
        ctx.shadowColor = c; ctx.shadowBlur = 12;
        ctx.fillStyle = '#DDD'; ctx.fillRect(m.x - 1.5, m.y - 6, 3, 8);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(m.x, m.y - 6, 6, Math.PI, 0); ctx.fill();
        ctx.restore();
    }
    // Gems to mine
    for (const g of underground.gems) {
        if (g.mined) continue;
        ctx.save();
        ctx.shadowColor = g.color; ctx.shadowBlur = 18 + Math.sin(t * 3 + g.x) * 6;
        ctx.fillStyle = g.color;
        const sz = 14 - g.hits * 2;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y - sz * 1.4); ctx.lineTo(g.x + sz, g.y); ctx.lineTo(g.x, g.y + sz); ctx.lineTo(g.x - sz, g.y); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.moveTo(g.x, g.y - sz * 1.4); ctx.lineTo(g.x + sz * 0.3, g.y - sz * 0.2); ctx.lineTo(g.x - sz * 0.5, g.y); ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    for (const e of underground.enemies) {
        drawEnemy(e, t);
        if (!(e.emerge > 0) && !e.hidden) drawEnemyHp(e);
    }
    drawCoins(underground.coins);
}

// Hiding in a Hell cave: you only see inside the cave — everything outside goes dark
function drawInsideCave() {
    const c = HELL_CAVES.find(c => player.x >= c.x && player.x <= c.x + c.w && player.y >= c.y && player.y <= c.y + c.h);
    if (!c) return;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 800, 600);
    ctx.ellipse(cx, cy, c.w / 2 + 14, c.h / 2 + 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.94)';
    ctx.fill('evenodd');
    // A warm glow inside the cave
    const glow = ctx.createRadialGradient(player.x, player.y, 10, player.x, player.y, 120);
    glow.addColorStop(0, 'rgba(255,170,90,0.12)'); glow.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = glow; ctx.fillRect(c.x - 20, c.y - 20, c.w + 40, c.h + 40);
    // How long you can stay hidden
    const secs = Math.max(0, Math.ceil((caveMax() - state.caveTimer) / 60));
    ctx.fillStyle = state.caveProtectionExpired ? '#FF7744' : '#FFD08A'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(state.caveProtectionExpired ? '⚠ The Devil found you — get out of the cave!' : `🕳 Hiding in the cave… the Devil can't see you (${secs}s)`,
                 400, c.y > 300 ? c.y - 24 : c.y + c.h + 34);
    // A mole's warning mound shows through the dark so you always see where it will come up
    for (const e of hell.enemies) if (e.alive && e.type === 'mole' && e.warn > 0) drawMoleMound(e);
    // …and so does a mole that is out: you can see it coming even from inside the cave
    for (const e of hell.enemies) if (e.alive && e.type === 'mole' && !(e.warn > 0) && !(e.emerge > 45)) drawMoleThroughDark(e);
    ctx.restore();
}

// A glowing brown mole with angry red eyes, drawn on top of the dark so it can be seen
function drawMoleThroughDark(e) {
    const r = e.r || 15;
    if (e.emerge > 0) drawMoleMound(e);   // still climbing out: the mound too
    ctx.save();
    const glow = ctx.createRadialGradient(e.x, e.y, r * 0.5, e.x, e.y, r * 2.4);
    glow.addColorStop(0, 'rgba(255,140,70,0.5)'); glow.addColorStop(1, 'rgba(255,140,70,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(e.x, e.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A8723C'; ctx.strokeStyle = '#FFE0A8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E8A0A0'; ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF3030'; ctx.beginPath();
    ctx.arc(e.x - r * 0.35, e.y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.arc(e.x + r * 0.35, e.y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// Dark caves: you can only see near your lantern (drawn on top of the room, under the HUD)
function drawCaveDarkness() {
    const flicker = Math.sin(Date.now() / 90) * 4;
    const lit = lumosTimer > 0 || godPassive('dark') ? 200 : 0;   // 💡 Lumos (or being Hades's kid) makes the light much bigger
    const dark = ctx.createRadialGradient(player.x, player.y, 50 + lit, player.x, player.y, 210 + lit * 1.5 + flicker);
    dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = dark; ctx.fillRect(0, 0, 800, 600);
    // Glowing eyes in the dark…
    for (const e of underground.enemies) {
        if (!e.alive || e.hidden) continue;
        const eye = e.type === 'dragon' ? '#FFEE00' : e.type === 'spider' || e.type === 'mole' ? '#FF3333' : null;
        if (!eye) continue;
        const ex = e.type === 'dragon' ? e.x - e.r * 1.05 : e.x, ey = e.type === 'dragon' ? e.y - e.r * 0.42 : e.y - 6;
        ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(ex - 2, ey, 1.6, 0, Math.PI * 2); ctx.arc(ex + 2, ey, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // Gems and portals still twinkle through the dark so you can find them
    for (const g of underground.gems) {
        if (!g.mined && Math.sin(Date.now() / 300 + g.x) > 0.3) drawStar(g.x, g.y - 4, 4, g.color);
    }
    for (const p of PORTALS.underground) {
        ctx.fillStyle = 'rgba(200,180,255,0.35)';
        ctx.beginPath(); ctx.arc(p.x, p.y, PORTAL_R, 0, Math.PI * 2); ctx.fill();
    }
    const gem = nearbyGem();
    if (gem) {
        ctx.fillStyle = '#FFE08A'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        const verb = byInput('Press SPACE', 'Tap DIG', 'Press A');
        ctx.fillText(`${verb} to mine the gem!`, gem.x, gem.y - 26);
    }
    ctx.fillStyle = 'rgba(255,220,150,0.6)'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⛏ Mine the glowing gems — watch out for moles, spiders and the CAVE DRAGON in the dark!', 400, 580);
}

// ── DRAW: THE DIG VIEW ─────────────────────────────────────
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

