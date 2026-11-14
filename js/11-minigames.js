// ── MINI-GAMES (at the Race Master): hide & seek, fishing, treasure, football, snowballs, dancing, cooking, maze race, tag, quiz ──
let miniGame = null;   // the in-world mini-game that's running: { kind, timer, ... }
function winMiniGame(text, coins) { state.coins += coins; addScore(coins * 2); giveAward('miniGame'); sfx('win'); spawnConfettiAt(player.x, player.y); showToast(`🏆 ${text} +🪙${coins}`, '#FFD700', 240); }
function miniGameItems() {
    const go = (icon, name, desc, start) => ({ icon, name, desc, cost: 0, status: 'PLAY!', action: () => { menu = null; start(); } });
    return [
        go('🙈', 'Hide & Seek',      'Find 3 kids hiding in Paradise!',      startHideSeek),
        go('🎣', 'Fishing Contest',  'Catch more fish than Old Tom',         startFishingContest),
        go('🗺', 'Mega Treasure Hunt', 'Follow 5 clues to big treasure',       () => { if (state.treasure) showToast('🗺 Finish your treasure map first!', '#FFE8A0', 150); else startTreasureMap(5); }),
        go('⚽', 'Football',         'Score goals with your team!',          startFootball),
        go('☃', 'Snowball Fight',   'Hit all the snowball kids!',           () => { changeRoom(ROOM.SNOWFORT); miniGame = { kind: 'snow' }; showToast('☃ SNOWBALL FIGHT! Hit every kid!', '#AADDFF', 200); }),
        go('💃', 'Dance Battle',     'Press the arrows in time!',            startDanceBattle),
        go('👨‍🍳', 'Cooking Contest', 'Cook a dish for the judges',          startCooking),
        go('🌀', 'Maze Race',        'Get through the maze in 60 seconds',   () => { delete worldBlocks.maze; changeRoom(ROOM.MAZE); place().enemies = []; place().raceTimer = 3600; showToast('🌀 MAZE RACE! Reach the 💰 in 60 seconds!', '#FFE066', 200); }),
        go('🏃', 'Tag',              activeFriends().length ? 'Don\'t be IT when time runs out!' : 'Catch 4 kids before time runs out', startTag),
        go('❓', 'Quiz Show',        '5 questions — how many can you get?',  startQuiz),
        go('🎂', 'Birthday Party',   'Cake, balloons, presents and hats!',   startParty),
        go('🎆', 'Fireworks Show',   'Ooooh! Aaaah!',                         () => { fireworks = 1200; showToast('🎆 FIREWORKS SHOW! Ooooh! Aaaah!', '#FFE066', 200); }),
    ];
}

// 🙈 Hide & Seek: 3 kids hide around Paradise; get close to find them
const HIDE_SPOTS = [[90, 140], [700, 150], [255, 250], [520, 250], [160, 520], [600, 380], [720, 440], [330, 130], [470, 470], [90, 330]];
function startHideSeek() {
    changeRoom(ROOM.PARADISE);
    const spots = [...HIDE_SPOTS].sort(() => Math.random() - 0.5).slice(0, 3);
    miniGame = { kind: 'hide', timer: 3600, kids: spots.map(([x, y], i) => ({ x, y, found: false, icon: ['🧒', '👧', '👦'][i] })) };
    showToast('🙈 Ready or not, here I come! Find 3 hiding kids in 60 s!', '#FFE066', 220);
}
// 🎣 Fishing contest
function startFishingContest() {
    changeRoom(ROOM.PARADISE); player.x = FISH_SPOT.x; player.y = FISH_SPOT.y - 30;
    miniGame = { kind: 'fish', timer: 3600, start: awards.fish || 0, tom: 2 + Math.floor(Math.random() * 3) };
    showToast(`🎣 FISHING CONTEST! Old Tom will catch ${miniGame.tom}. Catch more in 60 s!`, '#88CCFF', 240);
}
// ⚽ Football: you and a helper (blue) against two defenders (red) and a goalie (yellow). Score in the goal on the right
const FB_PITCH        = { x0: 34, x1: 766, y0: 108, y1: 568 };   // where the computer players may stand: inside the white lines, under the score bar
const FB_GOAL         = { x: 780, y0: 260, y1: 400 };             // the goal mouth
const FB_KICK_SPEED   = 8;      // how hard walking into the ball kicks it (this was always so)
const FB_OPP_SPEED    = 2.3;    // red defenders walk slower than you (4), so a child can always outrun them
const FB_MATE_SPEED   = 3;      // your blue helper is a bit quicker than the defenders, but still slower than you
const FB_REACT        = 15;     // defenders only look where the ball is 4 times a second, so a quick dribble fools them
const FB_RECOVER      = 80;     // after a tackle or a kick a defender stands still for this long: time to win the ball back
const FB_MATE_RECOVER = 45;     // the helper rests a little after passing or shooting
const FB_AIM_PAUSE    = 24;     // the helper holds the ball for a moment before kicking, so you can see what is coming
const FB_TOUCH        = 22;     // how close a computer player must be to reach the ball
const FB_TACKLE       = 26;     // how close to you a defender must be to take a ball you are dribbling
const FB_DRIBBLE      = 36;     // the ball is "yours" when it is this close to you
const FB_APART        = 28;     // computer players push each other apart when closer than this
const FB_STUCK_FRAMES = 120;    // a still ball with 2 players on it for 2 s gets popped loose
const FB_PASS_CONE    = 0.45;   // kick roughly at your helper (within about 26 degrees) and the pass flies straight to them
const FB_SHOOT_X      = 520;    // the helper shoots when the ball reaches them this close to goal, and passes back otherwise
const FB_MATE_CHASE   = 90;     // the helper only runs for a loose ball this close, so you get the kick-off
const FB_KEEPER_REACH = 26;    // the goalie stops a ball this close to the middle of the goal line (and says SAVED! once per save)
const FB_SHOT_SPEED   = 11;     // the hardest kick in the game (the helper's shot)
const FB_BALL_R       = 8;      // the ball's size for bumping into blocks you placed
const FB_BOUNCE       = 0.8;    // a ball keeps this much of its speed when it hits a block
const FB_BALL_STEP    = 6;      // the ball moves at most this far at a time, so even a hard shot cannot jump over a block (a block is 24)
const FB_KIT          = { you: '#3A7BFF', them: '#E8392F', keeper: '#FFD23A' };   // team colours
const FB_KICKOFF      = { ball: [400, 330], mate: [520, 330], opps: [[580, 250], [580, 410]] };
function footballActor(x, y) { return { x, y, walk: 0, recover: 0, react: 0, tx: x, ty: y }; }
function footballKickoff(G) {
    Object.assign(G.ball, { x: FB_KICKOFF.ball[0], y: FB_KICKOFF.ball[1], vx: 0, vy: 0 });
    G.held = false; G.stuck = 0;
    footballFreeBall(G.ball);   // (a block may stand on the kick-off spot)
    Object.assign(G.mate, footballActor(...FB_KICKOFF.mate), { hold: 0 });
    G.opps.forEach((o, i) => Object.assign(o, footballActor(...FB_KICKOFF.opps[i])));
}
function startFootball() {
    changeRoom(ROOM.STADIUM);
    miniGame = { kind: 'ball', timer: 3600, goals: 0, ball: { x: 400, y: 330, vx: 0, vy: 0 }, keeper: 330, mate: {}, opps: [{}, {}], presser: 0, held: false, stuck: 0, said: 0, saving: false };
    footballKickoff(miniGame);
    showToast('⚽ FOOTBALL! Kick it to your 🔵 friend!', '#FFFFFF', 240);
}
// Move a computer player, never through blocks or off the pitch
function footballMove(a, dx, dy) {
    const nx = Math.max(FB_PITCH.x0, Math.min(FB_PITCH.x1, a.x + dx)), ny = Math.max(FB_PITCH.y0, Math.min(FB_PITCH.y1, a.y + dy));
    if (!playerHitsBlock(nx, a.y)) a.x = nx;
    if (!playerHitsBlock(a.x, ny)) a.y = ny;
}
// Blocks you placed are solid for the ball too: it bounces off them
function footballBallHits(x, y) {
    return solidAt(x - FB_BALL_R, y) || solidAt(x + FB_BALL_R, y) || solidAt(x, y - FB_BALL_R) || solidAt(x, y + FB_BALL_R) || solidAt(x, y);
}
function footballBallMove(b) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) / FB_BALL_STEP));
    for (let i = 0; i < steps; i++) {
        const sx = b.vx / steps, sy = b.vy / steps;   // (worked out again each step: a bounce turns the rest of the move round)
        if (footballBallHits(b.x + sx, b.y)) b.vx *= -FB_BOUNCE; else b.x += sx;
        if (footballBallHits(b.x, b.y + sy)) b.vy *= -FB_BOUNCE; else b.y += sy;
    }
}
// If a block is placed on the ball (or the kick-off spot), move it to the nearest free spot on the pitch
function footballFreeBall(b) {
    if (!footballBallHits(b.x, b.y)) return;
    for (let r = 4; r <= 400; r += 4) for (let k = 0; k < 24; k++) {
        const a = k * Math.PI / 12, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
        if (x >= 40 && x <= 760 && y >= 100 && y <= 560 && !footballBallHits(x, y)) { b.x = x; b.y = y; b.vx = b.vy = 0; return; }
    }
}
function footballSeek(a, tx, ty, speed) {
    const d = Math.hypot(tx - a.x, ty - a.y);
    if (d < 4) return;
    const step = Math.min(speed, d);
    footballMove(a, (tx - a.x) / d * step, (ty - a.y) / d * step);
    a.walk += 0.3;
}
function footballSay(G, x, y, text, color) { if (G.said <= 0) { spawnFloatText(x, y - 28, text, color, 50); G.said = 40; } }   // one shout at a time, so words don't pile up
function footballKick(G, vx, vy) { G.ball.vx = vx; G.ball.vy = vy; G.held = false; sfx('boing'); }
function footballScored(G, byMate) {
    G.goals++; giveAward('goal'); sfx('win'); spawnConfettiAt(760, G.ball.y); showToast(byMate ? '⚽ GOAL! Great pass!' : '⚽ GOOOOOAL!!!', '#FFE066', 120);
    footballKickoff(G);
}
function updateFootball(G) {
    const b = G.ball, m = G.mate, opps = G.opps;
    const humans = [{ x: player.x, y: player.y }, ...activeFriends().filter(f => !f.down)];
    const actors = [m, ...opps];
    if (G.said > 0) G.said--;
    // You kick by walking into the ball. A kick toward your helper becomes a neat pass.
    for (const k of humans) {
        const d = Math.hypot(b.x - k.x, b.y - k.y);
        if (d >= 26 || d === 0) continue;
        let ux = (b.x - k.x) / d, uy = (b.y - k.y) / d, speed = FB_KICK_SPEED;
        const md = Math.hypot(m.x - b.x, m.y - b.y);
        if (md > 60 && md < 450 && ux * (m.x - b.x) / md + uy * (m.y - b.y) / md > Math.cos(FB_PASS_CONE)) {
            ux = (m.x - b.x) / md; uy = (m.y - b.y) / md; speed = Math.max(4, Math.min(9, md * 0.032 + 2.5));
            footballSay(G, b.x, b.y, 'Pass!', FB_KIT.you);
        }
        footballKick(G, ux * speed, uy * speed);
    }
    // Red defenders: the nearer one presses the ball, the other covers the space in front of the goal
    const near0 = Math.hypot(opps[0].x - b.x, opps[0].y - b.y), near1 = Math.hypot(opps[1].x - b.x, opps[1].y - b.y);
    if (G.presser === 0 && near1 < near0 - 40) G.presser = 1; else if (G.presser === 1 && near0 < near1 - 40) G.presser = 0;
    opps.forEach((o, i) => {
        if (o.recover > 0) { o.recover--; return; }
        if (--o.react <= 0) {
            o.react = FB_REACT;
            if (i === G.presser) { o.tx = b.x; o.ty = b.y; }
            else { o.tx = Math.max(380, Math.min(700, b.x + 110)); o.ty = (b.y + 330) / 2; }
        }
        footballSeek(o, o.tx, o.ty, FB_OPP_SPEED);
        const dribbler = humans.find(h => Math.hypot(h.x - o.x, h.y - o.y) < FB_TACKLE && Math.hypot(b.x - h.x, b.y - h.y) < FB_DRIBBLE);
        if (dribbler || Math.hypot(b.x - o.x, b.y - o.y) < FB_TOUCH) {
            // take the ball and boot it away from their goal (to the left), then rest. Nobody gets hurt.
            const a = Math.PI + (Math.random() - 0.5) * 1.2;
            footballKick(G, Math.cos(a) * 7, Math.sin(a) * 7);
            o.recover = FB_RECOVER;
            if (dribbler) footballSay(G, o.x, o.y, 'Tackled!', FB_KIT.them);
        }
    });
    // Blue helper: finds open space near the goal; when the ball reaches them they shoot, or pass back to you
    if (m.recover > 0) m.recover--;
    if (G.held) {
        if (--m.hold > 0) { b.x = m.x + 12; b.y = m.y; b.vx = b.vy = 0; }
        else if (m.x > FB_SHOOT_X) {
            const ty = (G.keeper > 330 ? 292 : 368) + (Math.random() - 0.5) * 20, d = Math.hypot(FB_GOAL.x - m.x, ty - m.y);   // aim away from the goalie
            footballKick(G, (FB_GOAL.x - m.x) / d * FB_SHOT_SPEED, (ty - m.y) / d * FB_SHOT_SPEED); m.recover = FB_MATE_RECOVER; G.mateShot = 90;
            footballSay(G, m.x, m.y, 'Shoot!', FB_KIT.you);
        } else {
            const d = Math.hypot(player.x - m.x, player.y - m.y) || 1, v = Math.max(4, Math.min(9, d * 0.032 + 2.5));
            footballKick(G, (player.x - m.x) / d * v, (player.y - m.y) / d * v); m.recover = FB_MATE_RECOVER;
            footballSay(G, m.x, m.y, 'Pass!', FB_KIT.you);
        }
    } else {
        const speed = Math.hypot(b.vx, b.vy), md = Math.hypot(b.x - m.x, b.y - m.y);
        if (m.recover === 0 && md < FB_TOUCH) { G.held = true; m.hold = FB_AIM_PAUSE; b.vx = b.vy = 0; }
        else {
            const hd = Math.min(...humans.map(h => Math.hypot(b.x - h.x, b.y - h.y)));
            if (speed < 3 && md < FB_MATE_CHASE && md < hd) footballSeek(m, b.x, b.y, FB_MATE_SPEED);   // a loose ball close to them: go and get it
            else {
                if (--m.react <= 0) {   // otherwise pick the most open spot near the goal
                    m.react = 45; let best = -1e9;
                    for (const sx of [560, 620, 680]) for (const sy of [220, 330, 440]) {
                        const open = Math.min(...opps.map(o => Math.hypot(o.x - sx, o.y - sy))) + Math.hypot(b.x - sx, b.y - sy) * 0.2 - Math.abs(sy - 330) * 0.2;
                        if (open > best) { best = open; m.tx = sx; m.ty = sy; }
                    }
                }
                footballSeek(m, m.tx, m.ty, FB_MATE_SPEED);
            }
        }
    }
    if (G.mateShot > 0) G.mateShot--;
    // Ball physics (as before)
    if (!G.held) { footballFreeBall(b); footballBallMove(b); b.vx *= 0.97; b.vy *= 0.97; }
    if (b.y < 90 || b.y > 570) { b.vy *= -1; b.y = Math.max(90, Math.min(570, b.y)); }
    if (b.x < 30) { b.vx *= -1; b.x = 30; }
    G.keeper += Math.sign(b.y - G.keeper) * Math.min(2.2, Math.abs(b.y - G.keeper));   // the goalie follows the ball
    G.keeper = Math.max(270, Math.min(390, G.keeper));
    const inReach = b.x > 740 && Math.abs(b.y - G.keeper) < FB_KEEPER_REACH;
    if (inReach) {
        b.vx = -Math.abs(b.vx) - 3;
        if (!G.saving) spawnFloatText(740, G.keeper - 30, 'SAVED!', '#FFFFFF', 40);   // (a slow ball can stay in reach for many frames: say it once)
    }
    G.saving = inReach;
    if (b.x > 770) {
        if (b.y > FB_GOAL.y0 && b.y < FB_GOAL.y1) footballScored(G, G.mateShot > 0); else footballKickoff(G);
        return;
    }
    // Nobody gets shoved through walls: only the computer players move, and only where it is free
    for (let i = 0; i < actors.length; i++) {
        for (let j = i + 1; j < actors.length; j++) footballApart(actors[i], actors[j], 0.5);
        for (const h of humans) footballApart(actors[i], h, 1);
    }
    // If the ball sits still with a pile of players on it, pop it loose
    const crowd = actors.concat(humans).filter(a => Math.hypot(a.x - b.x, a.y - b.y) < 30).length;
    G.stuck = (Math.hypot(b.vx, b.vy) < 0.3 && crowd >= 2) ? G.stuck + 1 : 0;
    if (G.stuck >= FB_STUCK_FRAMES) {
        const a = Math.random() * Math.PI * 2;
        footballKick(G, Math.cos(a) * 6, Math.sin(a) * 6); G.stuck = 0; m.hold = 0;
        for (const o of opps) if (Math.hypot(o.x - b.x, o.y - b.y) < 40) o.recover = Math.max(o.recover, 40);
    }
}
// Push computer player a away from c (all of the overlap if c is a person, half each if c is a computer player too)
function footballApart(a, c, share) {
    const d = Math.hypot(a.x - c.x, a.y - c.y);
    if (d >= FB_APART) return;
    const ux = d > 0.01 ? (a.x - c.x) / d : 1, uy = d > 0.01 ? (a.y - c.y) / d : 0, push = (FB_APART - d) * share;
    footballMove(a, ux * push, uy * push);
    if (share < 1) footballMove(c, -ux * push, -uy * push);
}
function drawFootball(G, emoji) {
    const t = Date.now() / 1000;
    ctx.fillStyle = '#FFF'; ctx.fillRect(776, 260, 6, 140); ctx.fillRect(740, 260, 40, 4); ctx.fillRect(740, 396, 40, 4);
    const ring = (x, y, color) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 19, 17, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
    const kit = (a, color) => {
        drawGroundShadow(a.x + 3, a.y + 19, 16, 5);
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 8; drawAvatar(a.x, a.y, player.w, color, 'plain', a.walk); ctx.restore();
        ring(a.x, a.y, color);
    };
    kit({ x: 752, y: G.keeper, walk: 0 }, FB_KIT.keeper);
    emoji('🧤', 752, G.keeper, 22);
    for (const o of G.opps) { kit(o, FB_KIT.them); if (o.recover > 0) emoji('💫', o.x, o.y - 30, 14); }
    kit(G.mate, FB_KIT.you);
    ring(player.x, player.y, FB_KIT.you);
    for (const f of activeFriends()) if (!f.down) ring(f.x, f.y, FB_KIT.you);
    // the helper waves a little "!" while you have the ball and they are free
    const mine = Math.hypot(G.ball.x - player.x, G.ball.y - player.y) < 70;
    if (mine && !G.held) { ctx.save(); ctx.fillStyle = FB_KIT.you; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', G.mate.x, G.mate.y - 32 + Math.sin(t * 10) * 2); ctx.restore(); }
    emoji('⚽', G.ball.x, G.ball.y, 22);
}
// 🏃 Tag
function startTag() {
    if (activeFriends().length) {
        const all = [1, ...activeFriends().map(f => f.n)];
        miniGame = { kind: 'tag', timer: 2700, it: all[Math.floor(Math.random() * all.length)], cool: 60, friends: true };
        showToast(`🏃 TAG! Player ${miniGame.it} is IT! Don't be IT at the end!`, '#FFE066', 220);
    } else {
        changeRoom(ROOM.PARADISE);
        miniGame = { kind: 'tag', timer: 2700, runners: [0, 1, 2, 3].map(i => ({ x: 150 + i * 170, y: 150 + (i % 2) * 300, caught: false, icon: ['🧒', '👧', '👦', '🧑'][i] })) };
        showToast('🏃 TAG! You\'re IT! Catch all 4 kids in 45 s!', '#FFE066', 220);
    }
}
function updateMiniGame() {
    const G = miniGame;
    if (!G || !playing()) return;
    if (G.timer !== undefined && --G.timer <= 0) {
        miniGame = null;
        if (G.kind === 'hide')  { const n = G.kids.filter(k => k.found).length; if (n) winMiniGame(`Time's up! You found ${n} kids!`, n * 10); else showToast('🙈 Time\'s up! They hid too well!', '#FFAA88', 200); }
        if (G.kind === 'fish')  { const n = (awards.fish || 0) - G.start; if (n > G.tom) winMiniGame(`You caught ${n} fish! Old Tom caught ${G.tom}!`, 40); else showToast(`🎣 You caught ${n}, Old Tom caught ${G.tom}. Try again!`, '#FFAA88', 220); }
        if (G.kind === 'ball')  { if (G.goals) winMiniGame(`Final whistle! You scored ${G.goals} goal${G.goals > 1 ? 's' : ''}!`, G.goals * 15); else showToast('⚽ Final whistle! No goals… try again!', '#FFAA88', 200); }
        if (G.kind === 'tag')   { if (G.friends) showToast(`🏃 TIME! Player ${G.it} was IT — everyone else WINS!`, '#FFD700', 240); else showToast('🏃 Time\'s up! The kids got away!', '#FFAA88', 200); }
        return;
    }
    if (G.kind === 'hide') {
        for (const k of G.kids) if (!k.found && Math.hypot(k.x - player.x, k.y - player.y) < 45) { k.found = true; sfx('found'); spawnFloatText(k.x, k.y - 20, 'You found me!', '#FFE066', 70); }
        if (G.kids.every(k => k.found)) { miniGame = null; winMiniGame('You found everyone!', 40); }
    }
    if (G.kind === 'ball') {
        if (state.room !== ROOM.STADIUM) { miniGame = null; return; }   // you left the pitch some other way
        updateFootball(G);
    }
    if (G.kind === 'snow' && state.room === ROOM.SNOWFORT && place().enemies.every(e => !e.alive)) { miniGame = null; winMiniGame('You won the SNOWBALL FIGHT!', 40); }
    if (G.kind === 'tag') {
        if (G.friends) {
            if (G.cool > 0) { G.cool--; return; }
            const players = [{ n: 1, x: player.x, y: player.y }, ...activeFriends()];
            const it = players.find(p => p.n === G.it);
            const caught = it && players.find(p => p.n !== G.it && Math.hypot(p.x - it.x, p.y - it.y) < 30);
            if (caught) { G.it = caught.n; G.cool = 60; sfx('boing'); showToast(`🏃 TAG! Player ${G.it} is IT!`, '#FFE066', 90); }
        } else {
            for (const r of G.runners) {
                if (r.caught) continue;
                const d = Math.hypot(r.x - player.x, r.y - player.y) || 1;
                if (d < 26) { r.caught = true; sfx('found'); spawnFloatText(r.x, r.y - 20, 'Tagged!', '#FFE066', 60); continue; }
                if (d < 160) { r.x += (r.x - player.x) / d * 2.3; r.y += (r.y - player.y) / d * 2.3; }   // run away!
                r.x += Math.sin(Date.now() / 400 + r.y) * 0.6;
                r.x = Math.max(30, Math.min(770, r.x)); r.y = Math.max(70, Math.min(570, r.y));
            }
            if (G.runners.every(r => r.caught)) { miniGame = null; winMiniGame('You tagged everyone!', 40); }
        }
    }
}
function drawMiniGame() {
    if (state.room === ROOM.STADIUM || state.room === ROOM.SNOWFORT) {
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(SUBPLACE_EXIT.x - 24, 560, 48, 40);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('🚪 Back to the Void', SUBPLACE_EXIT.x, 556);
    }
    const G = miniGame;
    if (!G) return;
    const t = Date.now() / 1000;
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    if (G.kind === 'hide') for (const k of G.kids) {
        if (k.found) emoji(k.icon, k.x, k.y, 26);
        else if (Math.sin(t * 2 + k.x) > 0.95) emoji('👀', k.x, k.y, 12);   // a tiny peek…
    }
    if (G.kind === 'ball' && state.room === ROOM.STADIUM) drawFootball(G, emoji);
    if (G.kind === 'tag' && !G.friends) for (const r of G.runners) if (!r.caught) emoji(r.icon, r.x, r.y + Math.sin(t * 10 + r.x) * 2, 24);
    if (G.kind === 'tag' && G.friends) {
        const it = G.it === 1 ? player : activeFriends().find(f => f.n === G.it);
        if (it) { ctx.fillStyle = '#FF4444'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('IT!', it.x, it.y - 40); }
    }
    const info = { hide: () => `🙈 Found ${G.kids.filter(k => k.found).length}/3`, fish: () => `🎣 You: ${(awards.fish || 0) - G.start}  ·  Old Tom: ${G.tom}`,
                   ball: () => `⚽ Goals: ${G.goals}`, snow: () => `☃ Kids left: ${place() ? place().enemies.filter(e => e.alive).length : 0}`,
                   tag: () => G.friends ? `🏃 Player ${G.it} is IT!` : `🏃 Tagged ${G.runners.filter(r => r.caught).length}/4` }[G.kind];
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(290, 76, 220, 22);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(info() + (G.timer !== undefined ? `  ·  ⏰ ${Math.ceil(G.timer / 60)}s` : ''), 400, 92); ctx.restore();
}
function paintStadium(g, R) {
    for (let x = 0; x < 800; x += 50) { g.fillStyle = (x / 50) % 2 ? '#4AA04A' : '#56B056'; g.fillRect(x, 46, 50, 554); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3;
    g.strokeRect(20, 80, 760, 500); g.beginPath(); g.moveTo(400, 80); g.lineTo(400, 580); g.stroke();
    g.beginPath(); g.arc(400, 330, 60, 0, Math.PI * 2); g.stroke(); g.strokeRect(660, 230, 120, 200);
    g.fillStyle = '#8A7A6A'; g.fillRect(0, 46, 800, 30);
    for (let x = 6; x < 800; x += 12) { g.fillStyle = `hsl(${R() * 360}, 60%, 55%)`; g.beginPath(); g.arc(x, 60, 5, 0, Math.PI * 2); g.fill(); }
}
function paintSnowfort(g, R) {
    g.fillStyle = '#EEF6FF'; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${200 + R() * 55},${220 + R() * 35},255,0.7)`; g.fillRect(R() * 800, R() * 600, 3, 3); }
    for (const [x, y] of [[200, 190], [400, 160], [600, 190], [300, 290]]) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x, y, 70, 18, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#C8DDEE'; g.lineWidth = 2; g.stroke(); }
}

// 🌀 Maze race timer
function updateMazeRace() {
    if (state.room !== ROOM.MAZE || !place() || !(place().raceTimer > 0) || !playing()) return;
    if (--place().raceTimer === 0) showToast('🌀 Time\'s up! Try the Maze Race again!', '#FFAA88', 200);
}
function drawMazeRace() {
    if (state.room !== ROOM.MAZE || !place() || !(place().raceTimer > 0)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(330, 50, 140, 22);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillText(`🌀 ⏰ ${Math.ceil(place().raceTimer / 60)}s`, 400, 66);
}

// 💃 Dance Battle: arrows come up — press that way in time!
const DANCE_DIRS = [['⬅', -1, 0], ['➡', 1, 0], ['⬆', 0, -1], ['⬇', 0, 1]];
let danceBattle = null;
function startDanceBattle() {
    danceBattle = { moves: Array.from({ length: 12 }, () => Math.floor(Math.random() * 4)), i: 0, t: 0, score: 0, dj: 7 + Math.floor(Math.random() * 4), result: 0, last: null, msg: 'GET READY!', wait: 90 };
    sfx('bite');
}
function danceInputDir() {
    let x = padMove.x, y = padMove.y;
    if (keys['ArrowLeft'] || keys['KeyA']) x = -1; if (keys['ArrowRight'] || keys['KeyD']) x = 1;
    if (keys['ArrowUp'] || keys['KeyW']) y = -1;   if (keys['ArrowDown'] || keys['KeyS']) y = 1;
    if (vTouch.joyId !== null) { x = vTouch.joyDX; y = vTouch.joyDY; }
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return -1;
    return Math.abs(x) > Math.abs(y) ? (x < 0 ? 0 : 1) : (y < 0 ? 2 : 3);
}
function danceJudge(dir) {
    const D = danceBattle;
    if (!D || D.result || D.wait > 0 || D.i >= D.moves.length) return;
    if (dir === D.moves[D.i]) { D.score++; D.msg = D.t < 25 ? 'PERFECT! ⭐' : 'GOOD!'; sfx('coin'); }
    else { D.msg = 'OOPS!'; sfx('hurt'); }
    D.i++; D.t = 0;
}
function danceTap(x, y) {   // on a phone: tap left/right/top/bottom of the screen
    const dx = x - 400, dy = y - 300;
    danceJudge(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 1) : (dy < 0 ? 2 : 3));
}
function updateDanceBattle() {
    const D = danceBattle;
    if (D.result) { if (--D.result === 0) danceBattle = null; return; }
    if (D.wait > 0) { D.wait--; if (D.wait === 0) D.msg = 'GO!'; return; }
    const dir = danceInputDir();
    if (dir >= 0 && D.last < 0) danceJudge(dir);
    D.last = dir;
    if (D.i < D.moves.length && ++D.t > 70) { D.msg = 'TOO SLOW!'; D.i++; D.t = 0; }   // missed it
    if (D.i >= D.moves.length) {
        D.result = 200;
        if (D.score > D.dj) { D.msg = `🏆 YOU WIN! ${D.score} vs DJ Dancey's ${D.dj}! +🪙40`; state.coins += 40; giveAward('miniGame'); sfx('win'); }
        else D.msg = `DJ Dancey wins ${D.dj} to ${D.score}… dance again!`;
    }
}
function drawDanceBattle() {
    const D = danceBattle;
    if (!D) return;
    const t = Date.now() / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(20,0,40,0.85)'; ctx.fillRect(0, 0, 800, 600);
    for (let k = 0; k < 12; k++) { ctx.fillStyle = `hsla(${(k * 30 + t * 120) % 360}, 90%, 60%, 0.25)`; ctx.beginPath(); ctx.arc(70 + k * 60, 520, 26, 0, Math.PI * 2); ctx.fill(); }   // disco floor
    ctx.fillStyle = '#FF66FF'; ctx.font = 'bold 26px Arial'; ctx.textAlign = 'center'; ctx.fillText('💃 DANCE BATTLE 🕺', 400, 120);
    ctx.font = '16px Arial'; ctx.fillStyle = '#FFF'; ctx.fillText(`You: ${D.score}   ·   DJ Dancey: ${D.dj}   ·   Move ${Math.min(D.i + 1, D.moves.length)}/${D.moves.length}`, 400, 150);
    if (D.i < D.moves.length && !D.result) {
        const ring = 1 - D.t / 70;
        ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(400, 300, 40 + ring * 60, 0, Math.PI * 2); ctx.stroke();
        ctx.font = '70px Arial'; ctx.textBaseline = 'middle'; ctx.fillText(D.wait > 0 ? '🎵' : DANCE_DIRS[D.moves[D.i]][0], 400, 300);
        ctx.font = '30px Arial'; for (let k = 1; k <= 3 && D.i + k < D.moves.length; k++) ctx.fillText(DANCE_DIRS[D.moves[D.i + k]][0], 400 + k * 80, 300);
    }
    ctx.textBaseline = 'alphabetic'; ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#FFE066'; ctx.fillText(D.msg, 400, 410);
    ctx.font = '12px Arial'; ctx.fillStyle = '#DDD';
    ctx.fillText(byInput('Press the arrow keys (or WASD)!', 'Tap that side of the screen!', 'Push the stick or D-pad that way!'), 400, 445);
    const bounce = Math.abs(Math.sin(t * 6)) * 12;
    ctx.font = '50px Arial'; ctx.fillText('🕺', 160, 330 - bounce); ctx.fillText('💃', 640, 330 - (12 - bounce));
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#FFF'; ctx.fillText('YOU', 160, 370); ctx.fillText('DJ Dancey', 640, 370);
    ctx.restore();
}

// 👨‍🍳 Cooking Contest: pick a dish and two toppings; three judges give marks
const DISHES   = [['🍕', 'Pizza'], ['🍰', 'Cake'], ['🍜', 'Soup'], ['🥪', 'Sandwich']];
const TOPPINGS = [['🍓', 'Strawberries'], ['🧀', 'Cheese'], ['🍫', 'Chocolate'], ['🌶', 'Chilli'], ['🍌', 'Banana'], ['🥦', 'Broccoli'], ['🐟', 'Fish'], ['🍬', 'Sweets']];
const YUMMY = { Pizza: ['Cheese', 'Chilli', 'Fish'], Cake: ['Strawberries', 'Chocolate', 'Banana', 'Sweets'], Soup: ['Broccoli', 'Fish', 'Chilli', 'Cheese'], Sandwich: ['Cheese', 'Banana', 'Strawberries'] };
let cooking = null;
function startCooking() { cooking = { dish: null, tops: [] }; openMenu('👨‍🍳 PICK YOUR DISH', cookingItems); }
function cookingItems() {
    if (!cooking.dish) return DISHES.map(([icon, name]) => ({ icon, name, desc: 'Cook this!', cost: 0, status: null, action: () => { cooking.dish = name; openMenu(`👨‍🍳 ${name.toUpperCase()}: PICK 2 TOPPINGS`, cookingItems); } }));
    return TOPPINGS.map(([icon, name]) => ({ icon, name, desc: cooking.tops.includes(name) ? 'Added!' : 'Add it!', cost: 0, status: cooking.tops.includes(name) ? '✅' : null,
        action: () => {
            if (cooking.tops.includes(name)) return;
            cooking.tops.push(name);
            if (cooking.tops.length < 2) return;
            menu = null;
            const good = cooking.tops.filter(tp => YUMMY[cooking.dish].includes(tp)).length;
            const judges = ['Chef Pierre', 'Granny Rose', 'Little Sam'].map(j => [j, Math.min(10, 3 + good * 3 + Math.floor(Math.random() * 3))]);
            const total = judges.reduce((a, [, n]) => a + n, 0);
            const icon = DISHES.find(d => d[1] === cooking.dish)[0];
            const words = good === 2 ? 'DELICIOUS!' : good === 1 ? 'Not bad!' : 'Ewww… 🤢';
            if (total >= 21) winMiniGame(`${icon} ${words} ${judges.map(([j, n]) => `${j}: ${n}`).join(' · ')}`, 30);
            else showToast(`${icon} ${words} ${judges.map(([j, n]) => `${j}: ${n}`).join(' · ')} — need 21 to win!`, '#FFAA88', 300);
        } }));
}

// ❓ Quiz Show
const QUIZ = [
    ['How many legs does a spider have?', '8', ['6', '10']],
    ['What colour do you get mixing blue and yellow?', 'Green', ['Purple', 'Orange']],
    ['What is the biggest planet?', 'Jupiter', ['Earth', 'Mars']],
    ['How many days are in a week?', '7', ['5', '10']],
    ['What do bees make?', 'Honey', ['Milk', 'Jam']],
    ['Which animal says "moo"?', 'A cow', ['A dog', 'A duck']],
    ['What is frozen water called?', 'Ice', ['Steam', 'Sand']],
    ['How many sides does a triangle have?', '3', ['4', '5']],
    ['What is 5 + 5?', '10', ['9', '55']],
    ['Which is the fastest land animal?', 'Cheetah', ['Snail', 'Elephant']],
    ['What do caterpillars turn into?', 'Butterflies', ['Frogs', 'Birds']],
    ['In this game, what beats Fire Monsters?', 'Ice', ['Fire', 'Lightning']],
    ['Who is the Teacher in Paradise?', 'The school teacher', ['A dragon', 'The Devil']],
    ['What is 3 × 4?', '12', ['7', '34']],
    ['Which ocean animal has 8 arms?', 'Octopus', ['Shark', 'Whale']],
];
let quiz = null;
function startQuiz() { quiz = { qs: [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 5), i: 0, right: 0 }; openMenu(quizTitle(), quizItems); }
function quizTitle() { return `❓ Q${quiz.i + 1}/5: ${quiz.qs[quiz.i][0]}`; }
function quizItems() {
    const [, right, wrong] = quiz.qs[quiz.i];
    if (!quiz.shuffled || quiz.shuffled.q !== quiz.i) quiz.shuffled = { q: quiz.i, a: [right, ...wrong].sort(() => Math.random() - 0.5) };
    return quiz.shuffled.a.map(a => ({ icon: '❓', name: a, desc: 'Is it this?', cost: 0, status: null,
        action: () => {
            if (a === right) { quiz.right++; sfx('coin'); spawnFloatText(player.x, player.y - 40, '✅ Right!', '#88FF88', 50); }
            else { sfx('hurt'); spawnFloatText(player.x, player.y - 40, `❌ It was ${right}`, '#FF8888', 70); }
            quiz.i++;
            if (quiz.i < 5) { openMenu(quizTitle(), quizItems); return; }
            menu = null;
            if (quiz.right >= 3) winMiniGame(`QUIZ CHAMPION! ${quiz.right}/5 right!`, quiz.right * 10);
            else showToast(`❓ You got ${quiz.right}/5. Get 3 to win — try again!`, '#FFAA88', 220);
        } }));
}

// ── FUN EXTRAS: Ring Race, Chicken Rain, potion effects ─────
const RING_RACE_FRAMES = 2400;   // 40 seconds
const RING_COUNT       = 8;
let ringRace = null;             // { rings, timer, scores, result }
function startRingRace() {
    ringRace = { timer: RING_RACE_FRAMES, result: 0, scores: {},
                 rings: Array.from({ length: RING_COUNT }, () => { const p = reachablePoint(60 + Math.random() * 680, 110 + Math.random() * 440); return { x: p.x, y: p.y, got: false }; }) };
    showToast(`⭕ RING RACE! Grab all ${RING_COUNT} rings in 40 seconds!`, '#FFE066', 200); sfx('bite');
}
function updateRingRace() {
    const R = ringRace;
    if (!R) return;
    if (R.result > 0) { if (--R.result === 0) ringRace = null; return; }
    R.timer--;
    const racers = [{ n: 1, x: player.x, y: player.y }, ...activeFriends().filter(f => f.down <= 0)];
    for (const ring of R.rings) {
        if (ring.got) continue;
        const who = racers.find(r => Math.hypot(r.x - ring.x, r.y - ring.y) < 30);
        if (!who) continue;
        ring.got = who.n; R.scores[who.n] = (R.scores[who.n] || 0) + 1;
        spawnParticles(ring.x, ring.y, '#FFE066', 10); sfx('coin');
    }
    const allGot = R.rings.every(r => r.got);
    if (!allGot && R.timer > 0) return;
    R.result = 240;
    const best = Object.entries(R.scores).sort((a, b) => b[1] - a[1])[0];
    if (!allGot && racers.length === 1) { showToast('⏰ Out of time! Try again!', '#FFAA88', 200); return; }
    const winner = best ? Number(best[0]) : 1;
    state.coins += 40; addScore(100); giveAward('ringRace'); sfx('win'); spawnConfettiAt(400, 300);
    if (winner === 1) questProgress(['race']);
    showToast(racers.length > 1 ? `🏆 PLAYER ${winner} WINS with ${best[1]} rings! +🪙40` : '🏆 You got every ring! +🪙40', '#FFD700', 240);
}
function drawRingRace() {
    const R = ringRace;
    if (!R) return;
    const t = Date.now() / 200;
    for (const ring of R.rings) {
        if (ring.got) continue;
        ctx.save(); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 5; ctx.shadowColor = '#FFE066'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(ring.x, ring.y, 12 + Math.sin(t + ring.x) * 2, 20, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const left = R.rings.filter(r => !r.got).length;
    const scores = Object.entries(R.scores).map(([n, c]) => `P${n}: ${c}`).join('  ');
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(300, 76, 200, 34);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`⭕ ${left} rings left · ⏰ ${Math.ceil(Math.max(0, R.timer) / 60)}s`, 400, 92);
    ctx.font = '10px Arial'; ctx.fillStyle = '#FFF'; ctx.fillText(scores || 'GO GO GO!', 400, 105); ctx.restore();
}

// 🐔 Chicken Rain: every few minutes chickens fall from the sky for 10 seconds
const CHICKEN_RAIN_FRAMES = 600;
let chickenRain = 0, chickenRainNext = 7200 + Math.random() * 7200, chickens = [];
function updateChickenRain() {
    if (!playing() || state.room === ROOM.HOUSE) return;
    if (chickenRain <= 0 && --chickenRainNext <= 0) {
        chickenRain = CHICKEN_RAIN_FRAMES; chickenRainNext = 7200 + Math.random() * 10800;
        showToast('🐔🐔🐔 IT\'S RAINING CHICKENS! 🐔🐔🐔', '#FFE066', 200); sfx('laugh');
    }
    if (chickenRain > 0 && --chickenRain % 8 === 0) {
        chickens.push({ x: 30 + Math.random() * 740, y: 40, vy: 2 + Math.random() * 3, land: 120 + Math.random() * 440, sit: 0 });
    }
    for (const c of chickens) {
        if (c.sit > 0) { c.sit--; continue; }
        c.y += c.vy;
        if (c.y < c.land) continue;
        c.sit = 60;
        for (const e of targetableEnemies()) if (Math.hypot(e.x - c.x, e.y - c.y) < e.r + 16) { damageEnemy(e, POWER.NONE); spawnFloatText(e.x, e.y - 20, 'BONK!', '#FFE066', 40); }
    }
    for (const c of chickens) {   // catch one for a coin!
        if (c.done || Math.hypot(c.x - player.x, c.y - player.y) > 26) continue;
        c.done = true; state.coins++; giveAward('chickenRain');
        spawnFloatText(c.x, c.y - 20, 'CLUCK! +🪙1', '#FFE066', 50); tone(900, 0.08, 'square', 0.1, 600);
    }
    chickens = chickens.filter(c => !c.done && !(c.y >= c.land && c.sit <= 0));
}
function drawChickenRain() {
    for (const c of chickens) { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.8, 0.8); drawChicken(0, 0); ctx.restore(); }
}

function updatePotions() {
    if (state.invisible > 0) state.invisible--;
    if (state.tiny > 0) state.tiny--;
    if (state.giant > 0) {   // 🦍 big feet stomp monsters
        state.giant--;
        if (state.giant % 20 === 0) for (const e of targetableEnemies()) if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + 34) { damageEnemy(e, POWER.NONE, false, 1); triggerShake(3); }
    }
}

function updateFunExtras() { updateRingRace(); updateChickenRain(); updatePotions(); updateBattle(); updateMagicExtras(); updateGloop(); updateSubplace(); updateRides(); updateYard(); updateMiniGame(); updateMazeRace(); updateFightExtras(); updateStorm(); updateSeason(); updateParty(); updateFireworks(); }
function drawFunExtras()   { drawRingRace(); drawChickenRain(); drawBattle(); drawCreature(); drawSnitch(); drawMagicMap(); drawHeroAura(); drawGloop(); drawMiniBossLabels(); drawSubplaces(); drawRides(); drawYard(); drawSecretRoom2(); drawMiniGame(); drawMazeRace(); drawFightExtras(); drawFireworksSky(); drawSeason(); drawParty(); drawTimeMachineAndHints(); drawHeroCape(); }
function drawHeroCape() {   // 🦸 a red cape flapping behind you
    if (state.heroSuit !== 'on' || state.gamePhase !== 'playing') return;
    const f = state.faceX < 0 ? 1 : -1, flap = Math.sin(Date.now() / 100) * 4;
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#E02020';
    ctx.beginPath(); ctx.moveTo(player.x - 8, player.y - 8); ctx.lineTo(player.x + 8, player.y - 8); ctx.lineTo(player.x + f * 22 + 6, player.y + 18 + flap); ctx.lineTo(player.x + f * 22 - 10, player.y + 14 - flap); ctx.closePath(); ctx.fill();
    ctx.restore();
}

