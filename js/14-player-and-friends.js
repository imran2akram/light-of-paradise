// ── UPDATE: PLAYER ────────────────────────────────────────────
function updatePlayer() {
    if (state.won || state.levelComplete || state.gamePhase !== 'playing') return;
    if (updateYardRide()) return;   // 🎢 on a ride in the backyard

    const spd = (state.room === ROOM.PARADISE ? BASE_SPEED * 1.2 : BASE_SPEED) * (state.lessons.running ? 1.2 : 1) * mountSpeed() * playerSpeedFactor()
              * (godPassive('fast') ? 1.3 : 1) * (godSpeedTimer > 0 ? 1.7 : 1) * (state.house === 'slytherin' ? 1.15 : 1) * (state.heroSuit === 'on' ? 1.25 : 1)
              * (state.tiny > 0 ? 1.4 : state.giant > 0 ? 0.9 : 1);
    let dx = 0, dy = 0;
    if (!state.shopOpen && !state.awardsOpen && !menu) {
        const arrows = !p2.active;   // with 2 players, the arrow keys belong to Player 2
        if ((arrows && keys['ArrowLeft'])  || keys['KeyA']) dx -= 1;
        if ((arrows && keys['ArrowRight']) || keys['KeyD']) dx += 1;
        if ((arrows && keys['ArrowUp'])    || keys['KeyW']) dy -= 1;
        if ((arrows && keys['ArrowDown'])  || keys['KeyS']) dy += 1;
        // Virtual joystick
        const deadzone = VJOY.maxDist * JOYSTICK_DEADZONE_RATIO;
        if (vTouch.joyDX < -deadzone) dx -= 1;
        if (vTouch.joyDX >  deadzone) dx += 1;
        if (vTouch.joyDY < -deadzone) dy -= 1;
        if (vTouch.joyDY >  deadzone) dy += 1;
        // Controller stick (analog — push a little to walk slowly)
        dx += padMove.x; dy += padMove.y;
    }
    if (state.stoned > 0) { state.stoned--; dx = dy = 0; }   // 🗿 turned to stone by Medusa
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }   // diagonals aren't faster
    if (len > 0.2) { const l = Math.hypot(dx, dy); state.faceX = dx / l; state.faceY = dy / l; state.walkPhase += 0.32; }   // remember which way you're going
    dx *= spd; dy *= spd;
    if (fight.blocking) { dx *= 0.4; dy *= 0.4; }   // slow while holding your shield up
    if (state.room === ROOM.ICE || state.room === ROOM.SPACE || state.room === ROOM.UNDERWATER || state.room === ROOM.MOONBASE || state.room === ROOM.ICECAVE || state.mount === 'kart' || state.mount === 'skates' || mod('lowGravity')) {
        // Slippery ice / floaty space: you speed up and slow down gently
        const grip = state.mount === 'kart' ? 0.12 : state.mount === 'skates' ? 0.07 : state.room === ROOM.ICE ? 0.05 : 0.035;
        state.vx = (state.vx || 0) + (dx - (state.vx || 0)) * grip;
        state.vy = (state.vy || 0) + (dy - (state.vy || 0)) * grip;
        dx = state.vx; dy = state.vy;
    }
    if (state.dashTimer > 0) {   // ZOOM!
        state.dashTimer--;
        dx = state.faceX * 15; dy = state.faceY * 15;
        particles.push({ x: player.x, y: player.y, dx: 0, dy: 0, life: 12, maxLife: 12, color: 'rgba(255,255,255,0.6)', r: 12 });
    }

    // Move, but blocks are solid (try each direction separately so you slide along walls)
    const nx = Math.max(18, Math.min(GAME_W - 18, player.x + dx));
    const ny = Math.max(52, Math.min(GAME_H - 18, player.y + dy));
    const flying = ['dragon', 'broom', 'car', 'pegasus', 'jetpack'].includes(state.mount) || state.heroSuit === 'on' || settings.creative || godPassive('fly');   // dragons, Zeus's kids (and Creative Mode) fly over blocks
    if (flying || !playerHitsBlock(nx, player.y)) player.x = nx;
    if (flying || !playerHitsBlock(player.x, ny)) player.y = ny;
    if (state.mount === 'duck' && (dx || dy) && Math.random() < 0.01) { tone(700, 0.12, 'square', 0.12, 500); spawnFloatText(player.x, player.y - 30, 'QUACK!', '#FFE066', 40); }

    for (const p of PORTALS[state.room]) {
        if (Math.hypot(player.x - p.x, player.y - p.y) < PORTAL_R * 0.75) {
            changeRoom(randomDoorDestination());
            return;
        }
    }
    if (updatePlaceExits()) return;
    // Out through your front door, back to the house you came in by
    if (state.room === ROOM.HOUSE && player.y > 560 && Math.abs(player.x - HOUSE_DOOR.x) < 24) {
        const door = houseDoors().find(d => d.id === state.houseFrom) || houseDoors()[0];
        changeRoom(ROOM.PARADISE);
        player.x = door.x; player.y = door.y + 22;
        return;
    }
    if (goldenPortal && Math.hypot(player.x - goldenPortal.x, player.y - goldenPortal.y) < PORTAL_R * 0.75) {
        sfx('win');
        changeRoom(ROOM.SECRET);
        return;
    }
    // A dig spot dug to the bottom becomes a tunnel (step off it first, then jump in)
    if (state.room === ROOM.HELL) {
        for (const s of hell.digSpots) {
            if (s.depth < DIG_MAX_DEPTH || !s.tunnel) continue;
            const d = Math.hypot(player.x - s.x, player.y - s.y);
            if (d > 30) s.tunnelReady = true;
            else if (s.tunnelReady && d < 14) { changeRoom(ROOM.UNDERGROUND); return; }
        }
    }

    if (state.playerFlash     > 0) state.playerFlash--;
    if (state.playerInvincible > 0) state.playerInvincible--;
    if (state.digAnim > 0) state.digAnim--;

    // ── CAVE TIMER ─────────────────────────────────────────────
    if (isPlayerPhysicallyInCave()) {
        state.caveTimer++;
        if (state.caveTimer >= caveMax()) {
            state.caveProtectionExpired = true;
        }
    } else {
        // Reset when player leaves the cave
        if (state.caveTimer > 0) {
            state.caveTimer = 0;
            state.caveProtectionExpired = false;
        }
    }

    // Brimstone spark trail
    if (state.power === POWER.BRIMSTONE && Math.random() < 0.5) {
        particles.push({
            x: player.x + (Math.random() - 0.5) * 14,
            y: player.y + (Math.random() - 0.5) * 14,
            dx: (Math.random() - 0.5) * 1.5,
            dy: (Math.random() - 0.5) * 1.5,
            life: 14, maxLife: 14,
            color: Math.random() < 0.5 ? '#FF4422' : '#FF8800',
            r: 2 + Math.random() * 2,
        });
    }
}

// ── PLAYER HURT, CAVES AND RESPAWN ─────────────────────────
function isPlayerInCave() {
    if (state.room !== ROOM.HELL) return false;
    if (state.caveProtectionExpired) return false;
    return HELL_CAVES.some(c =>
        player.x >= c.x && player.x <= c.x + c.w &&
        player.y >= c.y && player.y <= c.y + c.h
    );
}

function isPlayerPhysicallyInCave() {
    if (state.room !== ROOM.HELL) return false;
    return HELL_CAVES.some(c =>
        player.x >= c.x && player.x <= c.x + c.w &&
        player.y >= c.y && player.y <= c.y + c.h
    );
}

function allMonstersDefeated() {
    return paradise.enemies.every(e => !e.alive);
}

function getPlayerColor() {
    if (state.playerFlash > 0) return '#FFFF00';
    if (state.power === POWER.RAINBOW || mod('rainbow')) return `hsl(${(Date.now() / 5) % 360}, 100%, 60%)`;
    if (state.power !== POWER.NONE)      return WEAPON_INFO[state.power].color;
    return AVATAR_COLORS[state.activeSkin];
}

function damagePlayer() {
    if (settings.creative) return;   // nothing can hurt you in Creative Mode
    if (fight.jump > 0) return;      // …or while you're up in the air
    if (state.playerInvincible > 0) return;
    if (state.invisible > 0) return;   // 👻 they can't see you!
    if (state.bubble) {
        // Shield Bubble pops instead of losing a heart
        state.bubble = false;
        state.playerInvincible = 60;
        spawnParticles(player.x, player.y, '#AEE8FF', 12);
        spawnFloatText(player.x, player.y - 30, 'POP!', '#AEE8FF');
        sfx('pop');
        return;
    }
    sfx('hurt');
    state.playerHp--;
    state.playerInvincible = state.lessons.shield ? 150 : 90;
    triggerShake(14);
    spawnParticles(player.x, player.y, '#FF4444', 8);
    if (state.playerHp <= 0) respawnPlayer();
}

// Losing your last heart sends you back to the Void. The room change itself
// waits until the end of the frame: damagePlayer() can be called from inside
// loops over the room's projectiles and enemies, and changeRoom() replaces
// those arrays, so switching rooms mid-loop crashed the game (a frozen screen).
let pendingRespawn = false;
const RESPAWN_SAFE_FRAMES = 120;   // a little longer than a room entry: you also lost your weapons
function respawnPlayer() {
    const maxHp = fullHearts();
    state.power           = POWER.NONE;
    state.powerTier       = 1;
    state.playerHp        = maxHp;
    state.playerInvincible = RESPAWN_SAFE_FRAMES;
    pendingRespawn = true;
}

// ── UPDATE: PICKUPS ───────────────────────────────────────────
function checkPickups() {
    if (state.won || state.levelComplete) return;

    // Secret Golden Room treasures
    if (state.room === ROOM.SECRET) {
        for (const tr of secretRoom.treasures) {
            if (tr.picked || Math.hypot(player.x - tr.x, player.y - tr.y) > 26) continue;
            tr.picked = true;
            const maxHp = fullHearts();
            let text;
            if (tr.kind === 'rainbow') {
                state.power = POWER.RAINBOW; state.powerTier = 3;
                giveAward('rainbow');
                text = '🌈 RAINBOW POWER!';
            } else if (tr.kind === 'gem') {
                addScore(200);
                text = '💎 +200 points!';
            } else if (tr.kind === 'heart') {
                state.playerHp = maxHp; state.bubble = true;
                text = '❤ Full hearts + a Shield Bubble!';
            } else if (!state.unlockedSkins[4]) {
                state.unlockedSkins[4] = true; state.activeSkin = 4;
                text = '⭐ You unlocked the GOLD skin!';
            } else {
                addScore(300);
                text = '⭐ +300 points!';
            }
            spawnFloatText(tr.x, tr.y - 30, text, '#FFE066', 120);
            spawnParticles(tr.x, tr.y, '#FFD700', 18);
            triggerShake(6);
            sfx('found');
        }
    }

    // Hearts dropped by bad guys
    for (let i = heartPickups.length - 1; i >= 0; i--) {
        const h = heartPickups[i];
        if (Math.hypot(player.x - h.x, player.y - h.y) > 22) continue;
        heartPickups.splice(i, 1);
        const maxHp = fullHearts();
        if (state.playerHp < maxHp) { state.playerHp++; spawnFloatText(player.x, player.y - 28, '+1 ❤', '#FF6688'); }
        else                        { addScore(10);     spawnFloatText(player.x, player.y - 28, '+10',   '#FFFFFF'); }
        spawnParticles(h.x, h.y, '#FF6688', 8);
        sfx('buy');
    }

    if (state.room === ROOM.HELL) {
        // Coins in Hell
        for (const coin of hell.coins) {
            if (!coin.picked && Math.hypot(player.x - coin.x, player.y - coin.y) < 22) {
                coin.picked = true;
                collectCoin();
            }
        }
    }

    if (state.room === ROOM.PARADISE) {
        const idx = state.paradiseClearCount;
        if (idx < 3) {
            const c = paradise.chests[idx];
            if (!c.opened && c.visible &&
                Math.abs(player.x - c.x) < 28 && Math.abs(player.y - c.y) < 28) {
                c.opened = true;
                sfx('found');
                addScore(50);
                state.lightCrystals++;
                state.paradiseClearCount++;
                state.playerFlash = 35;
                triggerShake(14);
                spawnParticles(c.x, c.y, '#FFD700', 14);
                // Morning comes!
                paradise.phase = 'day';
                paradise.timer = dayFrames();
                maybeBirthday();
            }
        }
        // Coins in Paradise
        for (const coin of paradise.coins) {
            if (!coin.picked && Math.hypot(player.x - coin.x, player.y - coin.y) < 22) {
                coin.picked = true;
                collectCoin();
            }
        }
    }

    if (state.room === ROOM.VOID) {
        // Coins in Void
        for (const coin of voidRoom.coins) {
            if (!coin.picked && Math.hypot(player.x - coin.x, player.y - coin.y) < 22) {
                coin.picked = true;
                collectCoin();
            }
        }
    }

    // Coins everywhere else (Underground, adventure places…)
    if (![ROOM.VOID, ROOM.HELL, ROOM.PARADISE].includes(state.room)) {
        for (const coin of roomCoins()) {
            if (!coin.picked && Math.hypot(player.x - coin.x, player.y - coin.y) < 22) {
                coin.picked = true;
                collectCoin();
            }
        }
    }
}

function collectCoin() {
    state.coins++;
    sfx('coin');
    addScore(1);
    spawnParticles(player.x, player.y, '#FFD700', 5);
}

// ── DANCE & FART ──────────────────────────────────────────────
const VDANCE = { x: 640, y: 415, r: 20 };   // touch buttons above SHOOT
const VFART  = { x: 760, y: 415, r: 20 };

function playing() { return state.gamePhase === 'playing' && !state.won && !state.levelComplete && !state.shopOpen && !menu; }

// People nearby react
function nearbyTownsfolk(range) {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day') return [];
    return [...WORKERS, ...paradise.villagers].filter(n => Math.hypot(n.x - player.x, n.y - player.y) < range);
}

function dance() {
    if (!playing() || state.danceTimer > 0) return;
    state.danceTimer = 100;
    giveAward('dance');
    [523, 659, 784, 659, 880, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, null, i * 0.12));
    const fan = nearbyTownsfolk(110)[0];
    if (fan) say(fan, ['Nice moves!', 'Wow, you can dance!', 'Woohoo! 🎉'][Math.floor(Math.random() * 3)]);
    let dancers = 0;
    for (const e of targetableEnemies()) {   // 🕺 monsters nearby can't help dancing too!
        if (BOSS_TYPES.includes(e.type) || Math.hypot(e.x - player.x, e.y - player.y) > 220) continue;
        e.dancing = 150; e.frozen = Math.max(e.frozen || 0, 150); dancers++;
    }
    if (dancers) spawnFloatText(player.x, player.y - 44, `${dancers} monster${dancers > 1 ? 's' : ''} dancing! 🕺`, '#FF88FF', 70);
}

// A stinky cloud that hurts monsters right next to you 😂
const SUPER_FART_CHANCE = 0.25;   // 1 in 4 farts knocks every monster over
function fart() {
    if (!playing() || state.fartCooldown > 0) return;
    state.fartCooldown = 60;
    countStat('farts');
    sfx('fart');
    for (let i = 0; i < 14; i++) {
        particles.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y + 12, dx: (Math.random() - 0.5) * 2, dy: -Math.random() * 1.2,
                         life: 60, maxLife: 60, color: ['#9ACD32', '#7FA830', '#C8E070'][i % 3], r: 6 + Math.random() * 6 });
    }
    for (const e of targetableEnemies()) {
        if (Math.hypot(e.x - player.x, e.y - player.y) < 70) damageEnemy(e, POWER.NONE);
    }
    pushAll(50, 120);   // the smell pushes monsters back
    if (Math.random() < SUPER_FART_CHANCE) {   // 💨💨💨 SUPER FART!
        pushAll(220, 260); hitAll(1, POWER.NONE, 260); freezeAll(90, 260);
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4;
            particles.push({ x: player.x, y: player.y + 10, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp, life: 70, maxLife: 70, color: ['#9ACD32', '#7FA830', '#C8E070'][i % 3], r: 8 + Math.random() * 10 });
        }
        triggerShake(18); tone(70, 0.6, 'sawtooth', 0.25, 40);
        showToast('💨💨💨 SUPER FART!!! 💨💨💨', '#9ACD32', 150); giveAward('superFart');
    }
    const n = nearbyTownsfolk(100)[0];
    if (n) say(n, ['EWWW! 🤢', 'What is that SMELL?!', 'Pee-yew!'][Math.floor(Math.random() * 3)]);
}

function updateDanceAndFart() {
    if (state.fartCooldown > 0) state.fartCooldown--;
    if (state.danceTimer > 0) {
        state.danceTimer--;
        if (state.danceTimer % 14 === 0) {
            spawnFloatText(player.x + (Math.random() - 0.5) * 40, player.y - 20, Math.random() < 0.5 ? '♪' : '♫',
                           `hsl(${Math.random() * 360}, 100%, 70%)`, 50);
        }
    }
}

// ── DRAW: PLAYER ──────────────────────────────────────────────
function drawPlayer() {
    const t = Date.now() / 400;

    // Ice aura
    if (state.power === POWER.ICE) {
        const pulse = 30 + Math.sin(t * 3) * 5;
        const alpha = 0.28 + 0.18 * Math.sin(t * 3);
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,180,255,${alpha})`;
        ctx.lineWidth   = 4;
        ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
    }

    // Void healing radiance (pulsing golden glow when HP is not full)
    if (state.room === ROOM.VOID && state.playerHp < 3) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
        const r = 28 + pulse * 10;
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,215,0,${0.35 + pulse * 0.45})`;
        ctx.lineWidth   = 3;
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
    }

    // Invincibility flicker
    if (state.playerInvincible > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;

    const color = getPlayerColor();
    drawGroundShadow(player.x + (state.mount === 'dragon' ? 12 : 3), player.y + (state.mount === 'dragon' ? 34 : 19), state.mount ? 24 : 16, 5);
    const jumpUp = fight.jump > 0 ? Math.sin((1 - fight.jump / JUMP_FRAMES) * Math.PI) * 60 : 0;
    ctx.save(); ctx.translate(0, -jumpUp);
    const size = state.giant > 0 ? 1.7 : state.tiny > 0 ? 0.55 : 1;   // 🧪 potions
    if (size !== 1) { ctx.translate(player.x, player.y); ctx.scale(size, size); ctx.translate(-player.x, -player.y); }
    if (state.invisible > 0) ctx.globalAlpha = 0.3;
    drawMount();
    if (state.room === ROOM.UNDERWATER) {   // you're in a yellow submarine!
        ctx.save();
        ctx.fillStyle = '#FFD02A'; ctx.beginPath(); ctx.ellipse(player.x, player.y + 2, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(player.x - 6, player.y - 26, 12, 12); ctx.fillStyle = '#888'; ctx.fillRect(player.x + 2, player.y - 34, 3, 10);   // tower + periscope
        ctx.fillStyle = 'rgba(160,220,255,0.6)'; ctx.beginPath(); ctx.arc(player.x, player.y - 4, 13, 0, Math.PI * 2); ctx.fill();   // window you look out of
        ctx.fillStyle = '#C8A020'; ctx.beginPath(); ctx.moveTo(player.x - 30, player.y); ctx.lineTo(player.x - 40, player.y - 8 + Math.sin(Date.now() / 60) * 3); ctx.lineTo(player.x - 40, player.y + 8); ctx.fill();   // propeller
        ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    if (state.chicken > 0) {
        drawChicken(player.x, player.y);
    } else if (state.danceTimer > 0) {
        // Dance! Bounce, wiggle and spin
        const d = state.danceTimer;
        ctx.translate(player.x, player.y - Math.abs(Math.sin(d / 5)) * 10);
        ctx.rotate(d > 40 ? Math.sin(d / 4) * 0.4 : (d / 40) * Math.PI * 2);
        drawAvatar(0, 0, player.w, color, AVATAR_STYLES[state.activeSkin], d * 0.5);
    } else {
        drawAvatar(player.x, player.y, player.w, color, AVATAR_STYLES[state.activeSkin], state.walkPhase);
    }
    ctx.restore();

    // Carrying something for a delivery job
    if (state.job && state.job.kind === 'deliver') {
        ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(state.job.item, player.x, player.y - 30 + Math.sin(Date.now() / 200) * 2);
        ctx.textBaseline = 'alphabetic';
    }

    // Your hat
    if (state.hat) drawHatOn(state.danceTimer > 0 ? player.x : player.x, player.y - 23, state.hat);
    ctx.restore();   // (end of the jump lift)

    // Shovel swing while digging
    if (state.digAnim > 0) {
        const swing = Math.sin((state.digAnim / 14) * Math.PI) * 1.2;
        ctx.save();
        ctx.translate(player.x + 14, player.y - 4); ctx.rotate(0.6 + swing);
        ctx.fillStyle = '#8B5A2B'; ctx.fillRect(-1.5, -2, 3, 22);            // handle
        ctx.fillStyle = '#B8C0C8';                                          // blade
        ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(4, 30); ctx.lineTo(0, 33); ctx.lineTo(-4, 30); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // Shield Bubble
    if (state.bubble) {
        const wob = Math.sin(Date.now() / 200) * 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(player.x, player.y, 27 + wob, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(170,230,255,0.15)'; ctx.fill();
        ctx.strokeStyle = 'rgba(200,240,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(player.x - 9, player.y - 11, 5, 0, Math.PI * 2);   // shine
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        ctx.restore();
    }
}

function pathRoundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);         ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Hair styles: 'short', 'spiky', 'long', 'bun', 'bald'
function drawHair(x, y, k, style, color) {
    if (!style) return;
    ctx.fillStyle = color;
    if (style === 'bald') {                                   // just a little on the sides
        ctx.beginPath(); ctx.ellipse(x - 5.8 * k, y - 1 * k, 1.8 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.ellipse(x + 5.8 * k, y - 1 * k, 1.8 * k, 3.5 * k, 0, 0, Math.PI * 2); ctx.fill();
        return;
    }
    if (style === 'long') {                                   // falls down past the shoulders
        pathRoundRect(x - 7.5 * k, y - 4 * k, 15 * k, 15 * k, 4 * k); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(x, y - 3 * k, 7 * k, 5.5 * k, 0, Math.PI, 0); ctx.fill();     // top of the head
    ctx.beginPath(); ctx.moveTo(x - 7 * k, y - 3 * k);                                         // fringe
    ctx.quadraticCurveTo(x - 2 * k, y + 0.5 * k, x + 7 * k, y - 3.5 * k); ctx.lineTo(x + 7 * k, y - 4 * k); ctx.lineTo(x - 7 * k, y - 4 * k); ctx.fill();
    if (style === 'spiky') {
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(x + i * 2.8 * k - 2 * k, y - 7 * k); ctx.lineTo(x + i * 2.8 * k, y - 11 * k); ctx.lineTo(x + i * 2.8 * k + 2 * k, y - 7 * k); ctx.fill();
        }
    }
    if (style === 'bun') { ctx.beginPath(); ctx.arc(x, y - 9.5 * k, 3.5 * k, 0, Math.PI * 2); ctx.fill(); }
}

// A person facing you. (x, y) is the middle of their body; k = size (1 = the player's size).
// o: { shirt, pants, shoes, skin, hair, hairStyle, walk, noFace, beard }
function drawHuman(x, y, k, o) {
    const walk = o.walk || 0, step = Math.sin(walk) * 3.5 * k, swing = Math.sin(walk) * 3 * k;
    const skin = o.skin || '#F2C49B';
    // Legs and shoes (one foot lifts while walking)
    ctx.fillStyle = o.pants || '#2E3A5A';
    ctx.fillRect(x - 6 * k, y + 4 * k, 5 * k, 12 * k - Math.max(0, step));
    ctx.fillRect(x + 1 * k, y + 4 * k, 5 * k, 12 * k - Math.max(0, -step));
    ctx.fillStyle = o.shoes || '#3A2616';
    pathRoundRect(x - 7 * k, y + 14.5 * k - Math.max(0, step), 6.5 * k, 3.5 * k, 1.5 * k); ctx.fill();
    pathRoundRect(x + 0.5 * k, y + 14.5 * k - Math.max(0, -step), 6.5 * k, 3.5 * k, 1.5 * k); ctx.fill();
    // Arms swing while walking
    ctx.fillStyle = o.sleeves || o.shirt;
    pathRoundRect(x - 11.5 * k, y - 7 * k + swing, 4.5 * k, 11 * k, 2 * k); ctx.fill();
    pathRoundRect(x + 7 * k,    y - 7 * k - swing, 4.5 * k, 11 * k, 2 * k); ctx.fill();
    ctx.fillStyle = o.hands || skin;
    ctx.beginPath(); ctx.arc(x - 9.2 * k, y + 5 * k + swing, 2.4 * k, 0, Math.PI * 2); ctx.arc(x + 9.2 * k, y + 5 * k - swing, 2.4 * k, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = o.shirt;
    pathRoundRect(x - 8 * k, y - 8.5 * k, 16 * k, 14 * k, 3.5 * k); ctx.fill();
    const shade = ctx.createLinearGradient(x - 8 * k, 0, x + 8 * k, 0);
    shade.addColorStop(0, 'rgba(255,255,255,0.18)'); shade.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = shade; pathRoundRect(x - 8 * k, y - 8.5 * k, 16 * k, 14 * k, 3.5 * k); ctx.fill();
    // Neck, head and ears
    const hk = k * (mod('bigHead') ? 1.8 : 1);   // 🗿 Big Heads mod
    const hy = y - 16 * k - (hk - k) * 6;
    ctx.fillStyle = skin;
    ctx.fillRect(x - 2 * k, y - 11 * k, 4 * k, 3 * k);
    ctx.beginPath(); ctx.arc(x - 6.4 * hk, hy + 0.5 * hk, 1.7 * hk, 0, Math.PI * 2); ctx.arc(x + 6.4 * hk, hy + 0.5 * hk, 1.7 * hk, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, hy, 6.4 * hk, 7.2 * hk, 0, 0, Math.PI * 2); ctx.fill();
    const face = ctx.createRadialGradient(x - 2 * hk, hy - 2 * hk, 1, x, hy, 7.5 * hk);
    face.addColorStop(0, 'rgba(255,255,255,0.15)'); face.addColorStop(1, 'rgba(120,60,30,0.18)');
    ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(x, hy, 6.4 * hk, 7.2 * hk, 0, 0, Math.PI * 2); ctx.fill();
    drawHair(x, hy, hk, o.hairStyle, o.hair || '#5A3A1E');
    if (o.noFace) return;
    // Face: eyes with whites, eyebrows, nose, smile, rosy cheeks
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(x - 2.6 * hk, hy - 0.5 * hk, 1.8 * hk, 1.4 * hk, 0, 0, Math.PI * 2); ctx.ellipse(x + 2.6 * hk, hy - 0.5 * hk, 1.8 * hk, 1.4 * hk, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.eyes || '#3A2A1A';
    ctx.beginPath(); ctx.arc(x - 2.4 * hk, hy - 0.4 * hk, 1 * hk, 0, Math.PI * 2); ctx.arc(x + 2.8 * hk, hy - 0.4 * hk, 1 * hk, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = o.hair || '#5A3A1E'; ctx.lineWidth = 0.9 * hk;
    ctx.beginPath(); ctx.moveTo(x - 4.2 * hk, hy - 2.6 * hk); ctx.lineTo(x - 1.2 * hk, hy - 2.9 * hk); ctx.moveTo(x + 1.2 * hk, hy - 2.9 * hk); ctx.lineTo(x + 4.2 * hk, hy - 2.6 * hk); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,80,50,0.6)'; ctx.lineWidth = 0.8 * hk;
    ctx.beginPath(); ctx.moveTo(x + 0.2 * hk, hy + 0.5 * hk); ctx.lineTo(x + 0.8 * hk, hy + 2.3 * hk); ctx.lineTo(x - 0.4 * hk, hy + 2.4 * hk); ctx.stroke();
    ctx.strokeStyle = '#8A3A2A'; ctx.lineWidth = 1 * hk;
    ctx.beginPath(); ctx.arc(x, hy + 3 * hk, 2 * hk, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,0.25)';
    ctx.beginPath(); ctx.arc(x - 4 * hk, hy + 2.2 * hk, 1.5 * hk, 0, Math.PI * 2); ctx.arc(x + 4 * hk, hy + 2.2 * hk, 1.5 * hk, 0, Math.PI * 2); ctx.fill();
    if (o.beard) {
        ctx.fillStyle = o.beard;
        ctx.beginPath(); ctx.moveTo(x - 5.5 * hk, hy + 1.5 * hk); ctx.quadraticCurveTo(x, hy + 11 * hk, x + 5.5 * hk, hy + 1.5 * hk);
        ctx.quadraticCurveTo(x, hy + 5.5 * hk, x - 5.5 * hk, hy + 1.5 * hk); ctx.fill();
    }
}

// The player (also used for the shop previews). color = shirt colour (or your power's colour), style = skin
function drawAvatar(x, y, size, color, style, walk = 0) {
    const k = size / 32;
    ctx.save();
    if (style === 'dragon') {
        // Dragon costume: wings and a tail behind you
        const flap = Math.sin(Date.now() / 150) * 4 * k;
        ctx.fillStyle = '#2E8B3E';
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(x + side * 6 * k, y - 6 * k);
            ctx.lineTo(x + side * 22 * k, y - 16 * k - flap); ctx.lineTo(x + side * 19 * k, y + 2 * k); ctx.lineTo(x + side * 11 * k, y + 4 * k);
            ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = '#3A9A45'; ctx.lineWidth = 4 * k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 5 * k, y + 5 * k); ctx.quadraticCurveTo(x + 18 * k, y + 14 * k, x + 20 * k, y + 4 * k); ctx.stroke();
    }
    ctx.shadowBlur = Math.min(ctx.shadowBlur, 10);
    if (style === 'robot') {
        drawHuman(x, y, k, { shirt: '#B8C4CC', sleeves: '#9AA4AC', pants: '#7A848C', shoes: '#444', skin: '#9AA4AC', hands: '#666', walk, noFace: true });
        ctx.shadowBlur = 0;
        const hy = y - 16 * k;
        const metal = ctx.createLinearGradient(x - 8 * k, hy - 8 * k, x + 8 * k, hy + 8 * k);
        metal.addColorStop(0, '#E8EEF2'); metal.addColorStop(1, '#8A949C');
        ctx.fillStyle = metal; pathRoundRect(x - 8 * k, hy - 8 * k, 16 * k, 15 * k, 3 * k); ctx.fill();   // metal head
        ctx.fillStyle = '#112';  pathRoundRect(x - 6 * k, hy - 4 * k, 12 * k, 5 * k, 2 * k); ctx.fill();   // visor
        ctx.fillStyle = '#33EEFF'; ctx.fillRect(x - 4.5 * k, hy - 3 * k, 3 * k, 3 * k); ctx.fillRect(x + 1.5 * k, hy - 3 * k, 3 * k, 3 * k);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5 * k;
        ctx.beginPath(); ctx.moveTo(x, hy - 8 * k); ctx.lineTo(x, hy - 13 * k); ctx.stroke();                // antenna
        ctx.fillStyle = Math.floor(Date.now() / 400) % 2 ? '#FF3333' : '#FFAAAA';
        ctx.beginPath(); ctx.arc(x, hy - 14 * k, 2 * k, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.fillRect(x - 3 * k, y - 5 * k, 6 * k, 4 * k);                           // chest light (glows your power colour)
        ctx.fillStyle = '#555'; for (let i = -1; i <= 1; i++) ctx.fillRect(x + i * 3 * k - 0.8 * k, hy + 3 * k, 1.6 * k, 2.5 * k);
    } else if (style === 'blocky') {
        // Minecraft-style: everything is square!
        ctx.shadowBlur = 0;
        const step = Math.sin(walk) * 3 * k;
        ctx.fillStyle = '#3A3AA0'; ctx.fillRect(x - 6 * k, y + 4 * k, 5 * k, 14 * k - Math.max(0, step)); ctx.fillRect(x + 1 * k, y + 4 * k, 5 * k, 14 * k - Math.max(0, -step));
        ctx.fillStyle = '#3AB0C0'; ctx.fillRect(x - 12 * k, y - 8 * k + step, 5 * k, 12 * k); ctx.fillRect(x + 7 * k, y - 8 * k - step, 5 * k, 12 * k);
        ctx.fillStyle = '#C8966A'; ctx.fillRect(x - 12 * k, y + 3 * k + step, 5 * k, 3 * k); ctx.fillRect(x + 7 * k, y + 3 * k - step, 5 * k, 3 * k);
        ctx.fillStyle = '#3AB0C0'; ctx.fillRect(x - 7 * k, y - 8 * k, 14 * k, 13 * k);          // shirt
        ctx.fillStyle = color; ctx.globalAlpha = 0.35; ctx.fillRect(x - 7 * k, y - 8 * k, 14 * k, 13 * k); ctx.globalAlpha = 1;
        ctx.fillStyle = '#C8966A'; ctx.fillRect(x - 7 * k, y - 23 * k, 14 * k, 14 * k);         // square head
        ctx.fillStyle = '#4A2E1A'; ctx.fillRect(x - 7 * k, y - 23 * k, 14 * k, 4 * k); ctx.fillRect(x - 7 * k, y - 19 * k, 2 * k, 3 * k); ctx.fillRect(x + 5 * k, y - 19 * k, 2 * k, 3 * k);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 5 * k, y - 17 * k, 4 * k, 2 * k); ctx.fillRect(x + 1 * k, y - 17 * k, 4 * k, 2 * k);
        ctx.fillStyle = '#3A3AA0'; ctx.fillRect(x - 3 * k, y - 17 * k, 2 * k, 2 * k); ctx.fillRect(x + 1 * k, y - 17 * k, 2 * k, 2 * k);
        ctx.fillStyle = '#8A5A3A'; ctx.fillRect(x - 2 * k, y - 14 * k, 4 * k, 2 * k);
        ctx.fillStyle = '#5A3A2A'; ctx.fillRect(x - 3 * k, y - 12 * k, 6 * k, 1.5 * k);
    } else if (style === 'ninja') {
        drawHuman(x, y, k, { shirt: '#222', sleeves: '#1A1A1A', pants: '#1A1A1A', shoes: '#111', walk, noFace: true });
        ctx.shadowBlur = 0;
        const hy = y - 16 * k;
        ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.ellipse(x, hy, 7 * k, 7.8 * k, 0, 0, Math.PI * 2); ctx.fill();   // hood
        ctx.fillStyle = '#F2C49B'; pathRoundRect(x - 5 * k, hy - 2.5 * k, 10 * k, 4 * k, 1.5 * k); ctx.fill();          // eye slit
        ctx.fillStyle = '#FFF'; ctx.fillRect(x - 3.8 * k, hy - 1.6 * k, 2.6 * k, 2 * k); ctx.fillRect(x + 1.2 * k, hy - 1.6 * k, 2.6 * k, 2 * k);
        ctx.fillStyle = '#000'; ctx.fillRect(x - 2.8 * k, hy - 1.4 * k, 1.2 * k, 1.6 * k); ctx.fillRect(x + 2.2 * k, hy - 1.4 * k, 1.2 * k, 1.6 * k);
        ctx.fillStyle = '#DD2222'; ctx.fillRect(x - 7 * k, hy - 5.5 * k, 14 * k, 2.5 * k);                               // headband…
        ctx.beginPath(); ctx.moveTo(x + 6 * k, hy - 5 * k); ctx.lineTo(x + 14 * k, hy - 9 * k + Math.sin(Date.now() / 120) * 2 * k); ctx.lineTo(x + 12 * k, hy - 2 * k); ctx.fill();   // …with tails
        ctx.fillStyle = color; ctx.fillRect(x - 8 * k, y - 1 * k, 16 * k, 2.5 * k);                                      // belt (your power colour)
    } else if (style === 'dragon') {
        drawHuman(x, y, k, { shirt: '#44BB55', sleeves: '#3A9A45', pants: '#3A9A45', shoes: '#2E6E30', walk, hairStyle: null });
        ctx.shadowBlur = 0;
        const hy = y - 16 * k;
        ctx.fillStyle = '#44BB55';                                                  // dragon hood around the face
        ctx.beginPath(); ctx.arc(x, hy, 8 * k, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(x + 7 * k, hy - 2 * k); ctx.quadraticCurveTo(x, hy - 6 * k, x - 7 * k, hy - 2 * k); ctx.fill();
        ctx.fillStyle = '#FFAA22';                                                  // spikes and horns
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4 * k - 2 * k, hy - 7 * k); ctx.lineTo(x + i * 4 * k, hy - 12 * k); ctx.lineTo(x + i * 4 * k + 2 * k, hy - 7 * k); ctx.fill(); }
        ctx.fillStyle = '#FFE0A0'; ctx.fillRect(x - 4 * k, y - 6 * k, 8 * k, 9 * k);   // tummy
        ctx.fillStyle = color; ctx.globalAlpha = 0.5; ctx.fillRect(x - 4 * k, y - 6 * k, 8 * k, 9 * k); ctx.globalAlpha = 1;
    } else {
        drawHuman(x, y, k, { shirt: color, pants: '#2E3A5A', hair: '#5A3A1E', hairStyle: 'spiky', walk });
    }
    ctx.restore();
}

// ── FRIENDS: Players 2, 3 and 4 on the same screen ──────────
// P2 can press P (arrow keys + Enter). Anyone can plug in a new controller and HOLD ANY BUTTON to join;
// they get the next free player number. Holding Start for 2 s leaves again.
const FRIENDS = [2, 3, 4].map((n, i) => ({ n, pad: -1, color: ['#FF8844', '#44CC66', '#AA66FF'][i],
                                           active: false, x: 0, y: 0, hp: 3, inv: 0, down: 0, cooldown: 0, walk: 0, faceX: 1, faceY: 0 }));
const p2 = FRIENDS[0];
const P2_DOWN_FRAMES = 600;   // if a friend runs out of hearts they rest for 10 s, then pop back up
function activeFriends() { return FRIENDS.filter(f => f.active); }
const JOIN_HOLD_FRAMES  = 60;    // hold any button for 1 s to join (so a bump doesn't add a player)
const LEAVE_HOLD_FRAMES = 120;   // hold Start for 2 s to leave
const joinHold = {};             // gamepad.index → frames a not-yet-playing controller has been held

function toggleFriend(f) {
    if (state.gamePhase !== 'playing') return;
    f.active = !f.active;
    if (f.active) {
        Object.assign(f, { x: player.x + 30 * (f.n - 1), y: player.y, hp: 3, inv: 60, down: 0 });
        showToast(f.n === 2 && f.pad < 0 ? '👫 PLAYER 2 JOINED! Arrow keys to move, ENTER to shoot' : `🎮 PLAYER ${f.n} JOINED!`, f.color, 240);
        if (activeFriends().length === 3) giveAward('party4');
    } else { f.pad = -1; showToast(`Player ${f.n} left the game. Bye!`, f.color, 120); }
}
function toggleP2() { toggleFriend(p2); }

function hurtFriend(f) {
    if (!f.active || f.down > 0 || f.inv > 0 || settings.creative) return;
    f.hp--; f.inv = 90;
    spawnParticles(f.x, f.y, '#FF4444', 8); sfx('hurt');
    if (f.hp <= 0) { f.down = P2_DOWN_FRAMES; showToast(`Player ${f.n} needs a rest… back in 10 s!`, '#FFAA88', 150); }
}

function friendShoot(f) {
    if (battle && !battle.result) { battleHit(f.n, f); return; }   // ⚔ Battle Mode: bonk each other
    if (!f.active || f.down > 0 || f.cooldown > 0 || state.power === POWER.NONE) return;
    f.lastShot = Date.now(); tryTeamUp();
    let target = null, best = 500;
    for (const e of targetableEnemies()) { const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < best) { best = d; target = e; } }
    if (!target && state.room === ROOM.HELL && hell.devil.alive) target = hell.devil;
    if (!target) return;
    f.cooldown = 16;
    const a = Math.atan2(target.y - f.y, target.x - f.x), w = WEAPON_INFO[state.power];
    const color = state.power === POWER.RAINBOW ? `hsl(${Math.random() * 360}, 100%, 60%)` : w.color;
    for (const off of (state.powerTier >= 2 ? [-0.2, 0, 0.2] : [0])) {
        projectiles.push({ x: f.x, y: f.y, dx: Math.cos(a + off) * w.speed, dy: Math.sin(a + off) * w.speed, color, power: state.power, life: 90, r: w.size });
    }
    sfx('shoot');
}

function updateFriend(f, pads) {
    if (!f.active) return;
    if (f.cooldown > 0) f.cooldown--;
    if (f.inv > 0) f.inv--;
    if (f.down > 0) {
        if (--f.down === 0) { f.hp = 3; f.inv = 120; f.x = player.x + 30; f.y = player.y; showToast(`Player ${f.n} is back! 💪`, f.color, 120); }
        return;
    }
    let dx = 0, dy = 0;
    if (f.n === 2) {   // Player 2 can use the keyboard
        if (keys['ArrowLeft'])  dx -= 1;
        if (keys['ArrowRight']) dx += 1;
        if (keys['ArrowUp'])    dy -= 1;
        if (keys['ArrowDown'])  dy += 1;
        if (keys['Enter'] || keys['NumpadEnter'] || keys['Numpad0']) friendShoot(f);
    }
    const gp = pads.find(p => p.index === f.pad);   // their own game controller
    if (gp) {
        const st = stickVector(gp.axes[0] || 0, gp.axes[1] || 0);
        dx += st.x; dy += st.y;
        const b = i => gp.buttons[i] && gp.buttons[i].pressed;
        if (b(PAD.LEFT)) dx -= 1; if (b(PAD.RIGHT)) dx += 1; if (b(PAD.UP)) dy -= 1; if (b(PAD.DOWN)) dy += 1;
        if (b(PAD.A) || b(PAD.RT)) friendShoot(f);
    }
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    if (len > 0.2) { f.faceX = dx; f.faceY = dy; f.walk += 0.32; }
    const spd = BASE_SPEED * (state.room === ROOM.PARADISE ? 1.2 : 1) * playerSpeedFactor();
    const nx = Math.max(18, Math.min(782, f.x + dx * spd)), ny = Math.max(52, Math.min(582, f.y + dy * spd));
    if (settings.creative || !playerHitsBlock(nx, f.y)) f.x = nx;
    if (settings.creative || !playerHitsBlock(f.x, ny)) f.y = ny;
    // Bad guys hurt friends too
    for (const e of targetableEnemies()) {
        if (e.frog || e.type === 'creeper' || isShieldedAgainst(e.type)) continue;
        if (Math.hypot(e.x - f.x, e.y - f.y) < e.r + 16) hurtFriend(f);
    }
    if (state.room === ROOM.HELL && hell.devil.alive && Math.hypot(hell.devil.x - f.x, hell.devil.y - f.y) < hell.devil.r + 16) hurtFriend(f);
}

function updateP2() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(p => p && p.connected) : [];
    for (const f of FRIENDS) updateFriend(f, pads);
}

function drawP2() {
    for (const f of activeFriends()) {
        if (f.down > 0) {   // resting
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`💤 P${f.n} back in ${Math.ceil(f.down / 60)}s`, f.x, f.y);
            continue;
        }
        if (f.inv > 0 && Math.floor(Date.now() / 80) % 2 === 0) continue;
        drawGroundShadow(f.x + 3, f.y + 19, 16, 5);
        const color = state.power === POWER.NONE ? f.color : getPlayerColor();
        ctx.save(); ctx.shadowColor = f.color; ctx.shadowBlur = 10;
        drawAvatar(f.x, f.y, player.w, color, 'plain', f.walk);
        ctx.restore();
        ctx.fillStyle = f.color; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`P${f.n}`, f.x, f.y - 30);
    }
}

// A filling bar while a new controller holds a button to join
function drawJoinProgress() {
    const slot = FRIENDS.find(f => !f.active);
    if (!slot) return;
    const most = Math.max(0, ...Object.values(joinHold));
    if (most <= 0) return;
    const t = Math.min(1, most / JOIN_HOLD_FRAMES);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(280, 90, 240, 46);
    ctx.fillStyle = slot.color; ctx.fillRect(290, 118, 220 * t, 10);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect(290, 118, 220, 10);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🎮 Keep holding to join as P${slot.n}!`, 400, 110);
    ctx.restore();
}

// ── TEAM-UP AND PLAYER BATTLES ─────────────────────────────
// 🤝 Team-up: two players shoot at nearly the same time, close together → MEGA BLAST
const TEAMUP_WINDOW = 300, TEAMUP_RANGE = 140, TEAMUP_COOLDOWN = 5000;
let lastP1Shot = 0, lastTeamUp = 0;
function tryTeamUp() {
    const now = Date.now();
    if (now - lastTeamUp < TEAMUP_COOLDOWN || now - lastP1Shot > TEAMUP_WINDOW) return;
    const buddy = activeFriends().find(f => f.down <= 0 && now - (f.lastShot || 0) < TEAMUP_WINDOW && Math.hypot(f.x - player.x, f.y - player.y) < TEAMUP_RANGE);
    if (!buddy || !targetableEnemies().length) return;
    lastTeamUp = now;
    for (const e of targetableEnemies()) {
        bolts.push({ x1: player.x, y1: player.y, x2: e.x, y2: e.y, life: 14, color: '#FF66FF' });
        bolts.push({ x1: buddy.x, y1: buddy.y, x2: e.x, y2: e.y, life: 14, color: buddy.color });
        damageEnemy(e, POWER.NONE, false, 3);
    }
    triggerShake(16); sfx('boom'); giveAward('teamUp');
    showToast(`🤝 TEAM-UP MEGA BLAST! P1 + P${buddy.n}!`, '#FF88FF', 180);
}

// ⚔ Friend Battle: everyone gets 3 battle hearts; the main button bonks anyone close by
const BATTLE_REACH = 70, BATTLE_HIT_COOLDOWN = 30;
let battle = null;   // { hp: {n: hearts}, cd: {n: frames}, result }
function battlers() { return [{ n: 1, x: player.x, y: player.y, ref: player }, ...activeFriends().map(f => ({ n: f.n, x: f.x, y: f.y, ref: f }))]; }
function startBattle() {
    if (!activeFriends().length) { showToast('⚔ You need a friend! Plug in a controller and hold a button.', '#FFAA88', 220); return; }
    battle = { hp: {}, cd: {}, result: 0 };
    for (const b of battlers()) { battle.hp[b.n] = 3; battle.cd[b.n] = 0; }
    showToast('⚔ FRIEND BATTLE! Bonk each other! Last one standing WINS!', '#FF8866', 220); sfx('laugh');
}
function battleHit(n, who) {
    if (!battle.hp[n] || battle.cd[n] > 0) return;
    battle.cd[n] = BATTLE_HIT_COOLDOWN;
    spawnParticles(who.x, who.y, '#FFFFFF', 6); sfx('whoosh');
    for (const b of battlers()) {
        if (b.n === n || !battle.hp[b.n] || Math.hypot(b.x - who.x, b.y - who.y) > BATTLE_REACH) continue;
        battle.hp[b.n]--;
        const d = Math.hypot(b.x - who.x, b.y - who.y) || 1;
        b.ref.x = Math.max(20, Math.min(780, b.x + (b.x - who.x) / d * 50)); b.ref.y = Math.max(60, Math.min(580, b.y + (b.y - who.y) / d * 50));
        spawnFloatText(b.x, b.y - 30, battle.hp[b.n] ? 'BONK!' : 'OUT!', '#FFE066', 50); triggerShake(6); sfx('hurt');
    }
    const left = Object.entries(battle.hp).filter(([, h]) => h > 0);
    if (left.length <= 1) {
        battle.result = 240;
        const w = left[0] ? Number(left[0][0]) : n;
        state.coins += 30; giveAward('battle'); sfx('win'); spawnConfettiAt(400, 300);
        showToast(`🏆 PLAYER ${w} WINS THE BATTLE! +🪙30`, '#FFD700', 240);
    }
}
function updateBattle() {
    if (!battle) return;
    if (battle.result > 0) { if (--battle.result === 0) battle = null; return; }
    for (const n in battle.cd) if (battle.cd[n] > 0) battle.cd[n]--;
    if (!activeFriends().length) battle = null;   // your friend left
}
function drawBattle() {
    if (!battle) return;
    for (const b of battlers()) {
        const h = battle.hp[b.n] || 0;
        ctx.fillStyle = h ? '#FF4466' : '#888'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(h ? '❤'.repeat(h) : '💀 OUT', b.x, b.y - 44);
    }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(310, 76, 180, 22);
    ctx.fillStyle = '#FF8866'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('⚔ FRIEND BATTLE ⚔', 400, 92); ctx.restore();
}

