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
const FB_KIT          = { you: '#3A7BFF', them: '#E8392F', keeper: '#FFD23A' };   // team colours
const FB_KICKOFF      = { ball: [400, 330], mate: [520, 330], opps: [[580, 250], [580, 410]] };
function footballActor(x, y) { return { x, y, walk: 0, recover: 0, react: 0, tx: x, ty: y }; }
function footballKickoff(G) {
    Object.assign(G.ball, { x: FB_KICKOFF.ball[0], y: FB_KICKOFF.ball[1], vx: 0, vy: 0 });
    G.held = false; G.stuck = 0;
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
            footballKick(G, (FB_GOAL.x - m.x) / d * 11, (ty - m.y) / d * 11); m.recover = FB_MATE_RECOVER; G.mateShot = 90;
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
    if (!G.held) { b.x += b.vx; b.y += b.vy; b.vx *= 0.97; b.vy *= 0.97; }
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

// ── HOME & BUILDING: the backyard builder and the secret room ──
const SECRET_CHEST = { x: 400, y: 200 };
const YARD_SIGN    = { x: 220, y: 300 };
const YARD = [
    { id: 'treehouse',  icon: '🌳', name: 'Treehouse',        cost: 40,  x: 150, y: 150, desc: 'Climb up for a cosy rest (heals you)' },
    { id: 'pethouse',   icon: '🏠', name: 'Pet House',        cost: 30,  x: 330, y: 140, desc: 'Your pets play here and bring you coins' },
    { id: 'castle',     icon: '🏰', name: 'Your Own Castle',  cost: 150, x: 560, y: 140, desc: 'Sit on the throne — get a crown!' },
    { id: 'garden',     icon: '🌱', name: 'Magic Garden',     cost: 35,  x: 130, y: 390, desc: 'Grow coin flowers, heart fruit and star plants' },
    { id: 'farm',       icon: '🐄', name: 'Farm',             cost: 50,  x: 370, y: 470, desc: 'Cows, pigs, chickens and sheep!' },
    { id: 'trampoline', icon: '🤸', name: 'Trampoline',       cost: 20,  x: 330, y: 300, desc: 'BOING BOING BOING!' },
    { id: 'coaster',    icon: '🎢', name: 'Rollercoaster',    cost: 120, x: 700, y: 300, desc: 'Loop the loop!' },
    { id: 'slide',      icon: '🛝', name: 'Water Slide',      cost: 60,  x: 530, y: 330, desc: 'Whoosh into the pool!' },
    { id: 'pool',       icon: '🏊', name: 'Swimming Pool',    cost: 50,  x: 600, y: 480, desc: 'Swim to cool off (heals slowly)' },
];
const POOL_RECT   = { x: 520, y: 430, w: 170, h: 110 };
const MAGIC_GROW_MS = 30000;
const MAGIC_PLOTS = [0, 1, 2].map(i => ({ x: 80 + i * 50, y: 390 }));   // above the controls panel
const FARM_ANIMALS = ['🐄', '🐖', '🐔', '🐑'];
let yardRide = null;   // { kind, t, len }
let yardTimers = {};

function yardItems() {
    return YARD.map(b => ({ icon: b.icon, name: b.name, desc: b.desc, cost: b.cost, status: state.yard[b.id] ? 'BUILT!' : null,
        action: () => {
            if (state.yard[b.id]) return;
            if (!spend(b.cost)) return;
            state.yard[b.id] = true; giveAward('builder'); sfx('place'); menu = null;
            spawnParticles(b.x, b.y, '#FFE066', 30); triggerShake(6);
            showToast(`🔨 You built a ${b.name}!`, '#FFE066', 180);
        } }));
}
function magicStage(i) { const at = state.magicGarden[i]; if (!at) return 0; const k = (Date.now() - at) / MAGIC_GROW_MS; return k >= 1 ? 3 : k >= 0.5 ? 2 : 1; }
function tryYardAction(nearIt) {
    const built = id => state.yard[id];
    const b = id => YARD.find(y => y.id === id);
    if (nearIt(YARD_SIGN, 40)) { openMenu('🔨 BACKYARD BUILDER', yardItems); return true; }
    if (built('garden')) {
        const i = MAGIC_PLOTS.findIndex(p => nearIt(p, 22));
        if (i >= 0) {
            const st = magicStage(i);
            if (st === 0) { state.magicGarden[i] = Date.now(); spawnFloatText(MAGIC_PLOTS[i].x, MAGIC_PLOTS[i].y - 20, '🌱 Planted!', '#AAFFAA', 60); sfx('place'); }
            else if (st < 3) spawnFloatText(MAGIC_PLOTS[i].x, MAGIC_PLOTS[i].y - 20, 'Still growing…', '#FFFFFF', 50);
            else {
                state.magicGarden[i] = 0; sfx('found');
                const gift = [['🌼 Coin Flower! +🪙20', () => { state.coins += 20; }], ['🍎 Heart Fruit! Full hearts!', () => { state.playerHp = fullHearts(); }],
                              ['⭐ Star Plant! Super speed!', () => { godSpeedTimer = 900; }], ['🫧 Bubble Berry! Shield Bubble!', () => { state.bubble = true; }]][Math.floor(Math.random() * 4)];
                gift[1](); showToast(gift[0], '#AAFFAA', 180);
            }
            return true;
        }
    }
    if (built('treehouse') && nearIt(b('treehouse'), 44)) {
        if (Date.now() - (yardTimers.tree || 0) < 30000) { spawnFloatText(player.x, player.y - 30, 'You just rested!', '#FFF', 50); return true; }
        yardTimers.tree = Date.now(); state.playerHp = fullHearts(); sfx('magic');
        showToast('🌳 A cosy rest in your treehouse! Full hearts!', '#AAFFAA', 180); return true;
    }
    if (built('pethouse') && nearIt(b('pethouse'), 44)) {
        const P = place(), n = state.ownedPets.filter(Boolean).length;
        if (P.petGift || !n) { spawnFloatText(player.x, player.y - 30, n ? 'Your pets are napping 💤' : 'Get a pet first!', '#FFF', 60); return true; }
        P.petGift = true; state.coins += n * 3; sfx('coin');
        showToast(`🏠 Your ${n} pet${n > 1 ? 's' : ''} found coins for you! +🪙${n * 3}`, '#FFE066', 180); return true;
    }
    if (built('castle') && nearIt(b('castle'), 50)) {
        state.hats.crown = true; state.hat = 'crown'; giveAward('royal'); sfx('win'); spawnConfettiAt(player.x, player.y);
        showToast('🏰 You sit on your throne. ALL HAIL THE KING/QUEEN! 👑', '#FFD700', 220); return true;
    }
    if (built('farm') && nearIt(b('farm'), 70)) {
        if (Date.now() - state.farmAt < 60000) { spawnFloatText(player.x, player.y - 30, 'The animals need a rest!', '#FFF', 60); return true; }
        state.farmAt = Date.now(); state.coins += 15; sfx('coin');
        showToast('🐄 Moo! 🥛 milk, 🥚 eggs and 🧶 wool! +🪙15', '#FFE066', 180); return true;
    }
    if (built('trampoline') && nearIt(b('trampoline'), 40)) { yardRide = { kind: 'bounce', t: 0, len: 150 }; sfx('boing'); return true; }
    if (built('coaster') && nearIt(b('coaster'), 50)) { yardRide = { kind: 'coaster', t: 0, len: 300 }; giveAward('rollercoaster'); sfx('whoosh'); showToast('🎢 WHEEEEEE!', '#FFE066', 150); return true; }
    if (built('slide') && nearIt(b('slide'), 40)) { yardRide = { kind: 'slide', t: 0, len: 90 }; sfx('whoosh'); return true; }
    return false;
}
function updateYardRide() {
    if (!yardRide) return false;
    const R = yardRide, k = ++R.t / R.len;
    state.playerInvincible = Math.max(state.playerInvincible, 2);
    if (R.kind === 'bounce') {   // up and down on the trampoline
        const c = YARD.find(y => y.id === 'trampoline');
        player.x = c.x; player.y = c.y - Math.abs(Math.sin(k * Math.PI * 5)) * 90;
        if (R.t % 30 === 15) { sfx('boing'); spawnFloatText(player.x, player.y - 30, 'BOING!', '#FFE066', 30); }
    } else if (R.kind === 'coaster') {   // round the loop twice
        const c = YARD.find(y => y.id === 'coaster'), a = k * Math.PI * 4;
        player.x = c.x + Math.cos(a) * 70; player.y = c.y + Math.sin(a) * 110;
        if (R.t % 8 === 0) spawnParticles(player.x, player.y, '#FFE066', 1);
    } else if (R.kind === 'slide') {   // down the slide into the pool
        const c = YARD.find(y => y.id === 'slide');
        player.x = c.x + k * 70; player.y = c.y - 20 + k * 150;
        if (R.t === R.len - 1) { for (let n = 0; n < 4; n++) spawnParticles(player.x, player.y, '#66BBFF', 8); sfx('splash'); spawnFloatText(player.x, player.y - 30, 'SPLASH!', '#66BBFF', 50); }
    }
    if (R.t >= R.len) yardRide = null;
    return true;
}
function updateYard() {
    if (state.room !== ROOM.BACKYARD || !playing()) return;
    if (state.yard.pool && inRectXY(player.x, player.y, POOL_RECT)) {   // 🏊 swimming!
        if (Math.random() < 0.15) particles.push({ x: player.x + (Math.random() - 0.5) * 30, y: player.y + 10, dx: 0, dy: -0.5, life: 30, maxLife: 30, color: 'rgba(200,240,255,0.8)', r: 4 });
        if (++yardTimers.swim % 300 === 0 && state.playerHp < fullHearts()) { state.playerHp++; spawnFloatText(player.x, player.y - 30, '🏊 +1 ❤', '#66BBFF', 50); }
    }
}
yardTimers.swim = 0;
function drawYard() {
    if (state.room !== ROOM.BACKYARD) return;
    const t = Date.now() / 1000, verb = mainBtn();
    const emoji = (e, x, y, size) => { ctx.save(); ctx.font = `${size}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); ctx.restore(); };
    const near = (o, r) => Math.hypot(player.x - o.x, player.y - o.y) < r && !menu && !yardRide;
    const label = (text, x, y) => { ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); };
    ctx.fillStyle = '#8A5A2A'; ctx.fillRect(YARD_SIGN.x - 3, YARD_SIGN.y, 6, 26); ctx.fillStyle = '#D8B080'; ctx.fillRect(YARD_SIGN.x - 34, YARD_SIGN.y - 22, 68, 26);
    ctx.fillStyle = '#4A2A10'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('🔨 BUILDER', YARD_SIGN.x, YARD_SIGN.y - 6);
    if (near(YARD_SIGN, 40)) drawSpeech({ x: YARD_SIGN.x, y: YARD_SIGN.y - 24 }, `${verb}: Build things!`);
    for (const b of YARD) {
        if (!state.yard[b.id]) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([5, 5]); ctx.strokeRect(b.x - 30, b.y - 30, 60, 60); ctx.setLineDash([]); label(`${b.icon}?`, b.x, b.y + 4); continue; }
        if (b.id === 'pool') {
            ctx.fillStyle = '#E8E0D0'; ctx.fillRect(POOL_RECT.x - 6, POOL_RECT.y - 6, POOL_RECT.w + 12, POOL_RECT.h + 12);
            ctx.fillStyle = '#44AAEE'; ctx.fillRect(POOL_RECT.x, POOL_RECT.y, POOL_RECT.w, POOL_RECT.h);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(POOL_RECT.x + 10, POOL_RECT.y + 20 + k * 25 + Math.sin(t * 2 + k) * 3); ctx.lineTo(POOL_RECT.x + POOL_RECT.w - 10, POOL_RECT.y + 20 + k * 25 + Math.sin(t * 2 + k + 1) * 3); ctx.stroke(); }
            continue;
        }
        if (b.id === 'garden') {
            MAGIC_PLOTS.forEach((p, i) => {
                const st = magicStage(i);
                ctx.fillStyle = '#6A4A2A'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
                if (st) emoji(st === 3 ? ['🌼', '🍎', '⭐'][i] : st === 2 ? '🌿' : '🌱', p.x, p.y - 6 + (st === 3 ? Math.sin(t * 3 + i) * 2 : 0), st === 3 ? 22 : 16);
                if (near(p, 22)) drawSpeech({ x: p.x, y: p.y - 18 }, `${verb}: ${st === 0 ? 'Plant a magic seed' : st < 3 ? 'Growing…' : 'Pick it!'}`);
            });
            label('🌱 Magic Garden', b.x, b.y + 36);
            continue;
        }
        if (b.id === 'farm') {
            ctx.strokeStyle = '#C8A070'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 80, b.y - 50, 160, 100);
            FARM_ANIMALS.forEach((a, i) => emoji(a, b.x - 50 + i * 33 + Math.sin(t * 0.7 + i * 2) * 8, b.y + Math.cos(t * 0.5 + i) * 18, 22));
            label('🐄 Your Farm', b.x, b.y + 64);
            if (near(b, 70)) drawSpeech({ x: b.x, y: b.y - 50 }, `${verb}: Collect milk, eggs and wool`);
            continue;
        }
        if (b.id === 'coaster') {
            ctx.strokeStyle = '#E04040'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(b.x, b.y, 70, 110, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#888'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(b.x + Math.cos(k * 0.8) * 70, b.y + Math.sin(k * 0.8) * 110); ctx.lineTo(b.x + Math.cos(k * 0.8) * 70, 560); ctx.stroke(); }
        }
        if (b.id === 'slide') {
            ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y - 20); ctx.quadraticCurveTo(b.x + 60, b.y + 40, b.x + 70, b.y + 130); ctx.stroke(); ctx.lineCap = 'butt';
        }
        if (b.id === 'trampoline') { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 34, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3A8AE0'; ctx.lineWidth = 4; ctx.stroke(); }
        else emoji(b.icon, b.x, b.y, b.id === 'castle' ? 70 : b.id === 'treehouse' ? 60 : 40);
        if (b.id === 'pethouse') state.ownedPets.forEach((own, j) => { if (own && j !== state.activePet && j < 6) drawPetShape(PETS[j].id, b.x - 50 + (j % 3) * 50, b.y + 40 + Math.floor(j / 3) * 22, 0.8, 1); });
        label(b.name, b.x, b.y + (b.id === 'castle' ? 50 : b.id === 'coaster' ? 125 : 40));
        if (near(b, b.id === 'castle' ? 50 : 44)) drawSpeech({ x: b.x, y: b.y - 30 },
            `${verb}: ${{ treehouse: 'Climb up', pethouse: 'Visit your pets', castle: 'Sit on the throne', trampoline: 'Bounce!', coaster: 'Ride!', slide: 'Slide!' }[b.id] || ''}`);
    }
}
function drawSecretRoom2() {
    if (state.room !== ROOM.SECRETROOM) return;
    const P = place();
    ctx.save(); ctx.font = '40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(P.chest ? '📭' : '🧰', SECRET_CHEST.x, SECRET_CHEST.y); ctx.restore();
    const n = Object.keys(awards.got || {}).length;
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`🏆 Your trophy shelf: ${n} awards!`, 400, 118);
    ctx.fillText('🕵 Nobody knows about this room… except you!', 400, 300);
    if (!P.chest && Math.hypot(player.x - SECRET_CHEST.x, player.y - SECRET_CHEST.y) < 40 && !menu) drawSpeech({ x: SECRET_CHEST.x, y: SECRET_CHEST.y - 20 }, `${mainBtn()}: Open your secret chest`);
}

// ── PETS & RIDES: pet battles, golden eggs, ride trails, the hamster ball ──
const WILD_PET_NAMES = ['Sir Fluffington', 'Mr Snuggles', 'Captain Whiskers', 'Princess Pickle', 'Big Bob', 'Tiny Tim'];
let petBattle = null;   // { foe, you, them, turn, timer, cheer, result }
function startPetBattle() {
    if (state.activePet < 0) { showToast('🐾 You need a pet to battle! Buy one in the Shop.', '#FFCC88', 150); return; }
    const others = PETS.map((p, i) => i).filter(i => i !== state.activePet);
    const lv = petLevel();
    petBattle = { foe: others[Math.floor(Math.random() * others.length)], foeName: WILD_PET_NAMES[Math.floor(Math.random() * WILD_PET_NAMES.length)],
                  foeLv: Math.max(1, lv + Math.floor(Math.random() * 3) - 1), you: 10 + lv * 2, them: 10 + lv * 2, max: 10 + lv * 2,
                  turn: 0, timer: 90, cheer: 0, result: 0, msg: 'FIGHT!' };
    sfx('bite');
}
function cheerPetBattle() {
    if (!petBattle || petBattle.result) return;
    petBattle.cheer = Math.min(3, petBattle.cheer + 0.5);
    spawnParticles(250, 330, '#FFE066', 3);
}
function updatePetBattle() {
    const B = petBattle;
    if (B.result) { if (--B.result === 0) petBattle = null; return; }
    if (--B.timer > 0) return;
    B.timer = 50;
    if (B.turn++ % 2 === 0) {   // your pet's turn (cheering helps!)
        const dmg = 1 + Math.floor(Math.random() * 3) + Math.floor(B.cheer) + (petLevel() > 2 ? 1 : 0);
        B.them -= dmg; B.cheer = 0; B.msg = `Your ${PETS[state.activePet].name} hits for ${dmg}!`; sfx('hit');
    } else {
        const dmg = 1 + Math.floor(Math.random() * 3) + (B.foeLv > 2 ? 1 : 0);
        B.you -= dmg; B.msg = `${B.foeName} hits back for ${dmg}!`; sfx('hurt');
    }
    if (B.them <= 0 || B.you <= 0) {
        B.result = 180;
        if (B.them <= 0) { petGainXp(40); state.coins += 30; giveAward('petBattle'); sfx('win'); B.msg = '🏆 YOUR PET WON! +🪙30'; }
        else { petGainXp(10); B.msg = `${B.foeName} won… train and try again!`; }
    }
}
function drawPetBattle() {
    const B = petBattle;
    if (!B) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#5A8A3A'; ctx.fillRect(150, 200, 500, 220); ctx.strokeStyle = '#FFE066'; ctx.lineWidth = 4; ctx.strokeRect(150, 200, 500, 220);
    ctx.fillStyle = '#FFE066'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('🐾 PET BATTLE! 🐾', 400, 190);
    const shake = k => (B.timer > 40 && (B.turn % 2) === k) ? Math.sin(Date.now() / 20) * 4 : 0;
    drawPetShape(PETS[state.activePet].id, 260 + shake(0), 320, 2.4, -1);
    drawPetShape(PETS[B.foe].id, 540 + shake(1), 320, 2.4, 1);
    const bar = (x, hp, name) => {
        ctx.fillStyle = '#222'; ctx.fillRect(x - 70, 230, 140, 12);
        ctx.fillStyle = hp / B.max > 0.3 ? '#44DD44' : '#FF4444'; ctx.fillRect(x - 70, 230, 140 * Math.max(0, hp) / B.max, 12);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Arial'; ctx.fillText(name, x, 224);
    };
    bar(260, B.you, `Your ${PETS[state.activePet].name}`); bar(540, B.them, `${B.foeName} the ${PETS[B.foe].name}`);
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 14px Arial'; ctx.fillText(B.msg, 400, 400);
    ctx.fillStyle = '#FFE066'; ctx.font = '11px Arial';
    ctx.fillText(`${byInput('Press SPACE', 'Tap', 'Press A')} to CHEER! (cheering makes your pet hit harder)`, 400, 445);
    ctx.restore();
}

let goldenEggTimer = 0;
function updateRides() {
    if (!playing()) return;
    if (state.activePet >= 0 && PETS[state.activePet].id === 'goose' && ++goldenEggTimer % 2700 === 0) {   // 🥚 every 45 seconds
        state.coins += 10; spawnFloatText(pet.x, pet.y - 20, '🥚 GOLDEN EGG! +🪙10', '#FFD700', 90); sfx('found');
    }
    const moving = Math.hypot(state.vx || 0, state.vy || 0) > 0.5 || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'] || padMove.x || padMove.y || vTouch.joyId !== null;
    if (!moving || Math.random() > 0.6) return;
    const trail = { unicorn: `hsl(${(Date.now() / 5) % 360}, 100%, 65%)`, snail: 'rgba(160,220,120,0.7)', jetpack: Math.random() < 0.5 ? '#FF8822' : '#FFDD44' }[state.mount];
    if (trail) particles.push({ x: player.x + (Math.random() - 0.5) * 10, y: player.y + 18, dx: (Math.random() - 0.5) * 0.6, dy: state.mount === 'jetpack' ? 2 : 0.2,
                                life: state.mount === 'snail' ? 120 : 40, maxLife: state.mount === 'snail' ? 120 : 40, color: trail, r: state.mount === 'snail' ? 6 : 4 });
}
function drawRides() {
    if (state.mount !== 'hamster' || state.gamePhase !== 'playing') return;
    ctx.save(); ctx.fillStyle = 'rgba(200,230,255,0.25)'; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(player.x, player.y + 2, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(player.x, player.y + 2, 30, state.walkPhase, state.walkPhase + 1.2); ctx.stroke();
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

// ── CONTROLS PANEL (bottom-left: which button does what) ─────
let showControls = true;
try { showControls = localStorage.getItem('lop_controls') !== 'off'; } catch (e) {}
function toggleControlsPanel() {
    showControls = !showControls;
    try { localStorage.setItem('lop_controls', showControls ? 'on' : 'off'); } catch (e) {}
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
        ['Dance', 'G'], ['Fart', 'F'], ['Burp', 'U'], ['Sneeze', 'I'], ['Sound', 'M'], ['Settings', 'O'], ['Player 2', 'P'], ['Hide help', 'K'],
    ];
    if (!pad && god) rows.splice(7, 0, ['God power', 'T']);
    return rows;
}
function drawControlsPanel() {
    if (state.gamePhase !== 'playing' || lastInput === 'touch' || menu || state.shopOpen || state.awardsOpen) return;
    const x = 48, w = 236, rowH = 11;
    if (!showControls) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, 540, 92, 16);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
        ctx.fillText(keyName('⌨ Help: K', '🎮 Help: ⧉+LB'), x + 6, 551); ctx.restore();
        return;
    }
    const rows = controlsList(), half = Math.ceil(rows.length / 2);
    const h = 18 + half * rowH, y = 554 - h;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillText(keyName('⌨ CONTROLS', '🎮 CONTROLS  (⧉ = View button)'), x + 6, y + 11);
    ctx.font = '9px Arial';
    rows.forEach(([what, key], i) => {
        const cx = x + 6 + Math.floor(i / half) * (w / 2), cy = y + 22 + (i % half) * rowH;
        ctx.fillStyle = '#FFFFFF'; ctx.fillText(what, cx, cy);
        ctx.fillStyle = '#88DDFF'; ctx.textAlign = 'right'; ctx.fillText(key, cx + w / 2 - 12, cy); ctx.textAlign = 'left';
    });
    ctx.restore();
}

function pollGamepad() {
    padMove.x = padMove.y = 0;
    if (paused) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const connected = Array.from(pads).filter(p => p && p.connected);
    for (const f of FRIENDS) {   // a friend's controller was unplugged: they leave
        if (f.pad >= 0 && !connected.some(p => p.index === f.pad)) { f.leaveHold = 0; if (f.active) toggleFriend(f); else f.pad = -1; }
    }
    const friendPad = pd => FRIENDS.find(f => f.active && f.pad === pd.index);
    const free = connected.filter(pd => !friendPad(pd));
    const gp = free[0];   // Player 1 uses the first controller that isn't a friend's
    for (const pd of connected) {
        const anyHeld = pd.buttons.some(b => b && b.pressed);
        const f = friendPad(pd);
        if (f) {   // hold Start to leave
            const start = !!(pd.buttons[PAD.START] && pd.buttons[PAD.START].pressed);
            f.leaveHold = start ? (f.leaveHold || 0) + 1 : 0;
            if (f.leaveHold === LEAVE_HOLD_FRAMES) { joinHold[pd.index] = -1; toggleFriend(f); }   // -1: let go before joining again
            continue;
        }
        if (pd === gp || !anyHeld || state.gamePhase !== 'playing') { joinHold[pd.index] = 0; continue; }
        const slot = FRIENDS.find(fr => !fr.active);
        if (!slot || joinHold[pd.index] < 0) continue;
        joinHold[pd.index] = (joinHold[pd.index] || 0) + 1;
        if (joinHold[pd.index] >= JOIN_HOLD_FRAMES) {
            joinHold[pd.index] = 0;
            slot.pad = pd.index; slot.leaveHold = 0;
            toggleFriend(slot);
            sfx('coin');
        }
    }
    if (introVideo.isUp()) introVideo.setHint(!!gp);
    if (!gp) { padPrev = []; return; }
    const held = gp.buttons.map(b => b.pressed);
    const was  = padResync ? held : padPrev;   // (right after a pause nothing counts as a new press)
    padResync = false;
    padPrev = held;
    const pressed = i => held[i] && !was[i];
    if (held.some(Boolean) || Math.abs(gp.axes[0] || 0) > 0.5 || Math.abs(gp.axes[1] || 0) > 0.5) {
        lastInput = 'pad';
        initAudio();
    }
    // The opening video: any button skips it, and that press is not also a game button
    if (introVideo.isUp()) { if (held.some(Boolean)) introVideo.dismiss(); padPrev = held; return; }
    const nav = stickNavStep(gp);   // (tracked all the time, so a stick already held when a menu opens doesn't fire at once)

    // View (⧉) is the combo button: hold it and press another button. A quick tap on its own = sound on/off.
    if (held[PAD.BACK] && !menu && state.gamePhase === 'playing') {
        const combo = PAD_COMBOS.find(c => pressed(c.btn));
        if (combo) { combo.run(); padComboUsed = true; }
        if (was[PAD.RB] && !held[PAD.RB]) meleeRelease();   // still let go of a held hit / shield
        if (was[PAD.LB] && !held[PAD.LB]) stopBlock();
        readPadStick(gp, held);
        return;
    }
    if (was[PAD.BACK] && !held[PAD.BACK]) { if (!padComboUsed) toggleMute(); padComboUsed = false; }
    if (menu) {
        if (pressed(PAD.START)) { menu = null; return; }
        if (pressed(PAD.LEFT))  moveMenuCursor(-1, 0);
        if (pressed(PAD.RIGHT)) moveMenuCursor(1, 0);
        if (pressed(PAD.UP))    moveMenuCursor(0, -1);
        if (pressed(PAD.DOWN))  moveMenuCursor(0, 1);
        if (nav)                moveMenuCursor(nav[0], nav[1]);
        if (pressed(PAD.A))     menuSelect(menu.cursor);
        if (pressed(PAD.B) || pressed(PAD.Y)) menu = null;
        return;
    }
    if (pressed(PAD.B) && !state.shopOpen && !state.awardsOpen) { if (state.buildMode) nextBlock(); else useGadget(); }
    if (pressed(PAD.L3)) toggleBuild();
    if (pressed(PAD.LT)) dash();
    if (pressed(PAD.X) && state.room !== ROOM.VOID) castSpell();
    if (pressed(PAD.R3)) toggleMount();
    if (pressed(PAD.RB)) meleePress();
    if (was[PAD.RB] && !held[PAD.RB]) meleeRelease();
    if (pressed(PAD.LB)) startBlock();
    if (was[PAD.LB] && !held[PAD.LB]) stopBlock();
    if (pressed(PAD.X) && state.gamePhase === 'intro') askNewGame();
    if (pressed(PAD.X) && canOpenShop() && !state.shopOpen) setAwardsOpen(!state.awardsOpen);
    if (state.awardsOpen && pressed(PAD.B)) state.awardsOpen = false;
    if (state.awardsOpen) {   // D-pad / stick left-right (or up-down) and A turn the pages; nothing else happens behind the board
        if (pressed(PAD.LEFT) || pressed(PAD.UP))    awardsTurn(-1);
        if (pressed(PAD.RIGHT) || pressed(PAD.DOWN) || pressed(PAD.A)) awardsTurn(1);
        if (nav) awardsTurn(nav[0] + nav[1]);
        return;
    }
    if (pressed(PAD.START)) pressStart();
    if (pressed(PAD.Y) || (state.shopOpen && pressed(PAD.B))) toggleShop();

    if (state.shopOpen) {
        // D-pad / stick flicks move the shop cursor; A buys
        if (pressed(PAD.LEFT))  moveShopCursor(-1, 0);
        if (pressed(PAD.RIGHT)) moveShopCursor(1, 0);
        if (pressed(PAD.UP))    moveShopCursor(0, -1);
        if (pressed(PAD.DOWN))  moveShopCursor(0, 1);
        if (nav)                moveShopCursor(nav[0], nav[1]);
        if (pressed(PAD.A))     shopSelect(state.shopCursor);
        return;
    }

    if (pressed(PAD.A) || pressed(PAD.RT)) pressAction();   // hold A for a charge shot
    if (pressed(PAD.Y) && state.room !== ROOM.VOID) superJump();

    readPadStick(gp, held);
}

function readPadStick(gp, held) {
    let { x, y } = stickVector(gp.axes[0] || 0, gp.axes[1] || 0);
    if (held[PAD.LEFT])  x = -1;
    if (held[PAD.RIGHT]) x = 1;
    if (held[PAD.UP])    y = -1;
    if (held[PAD.DOWN])  y = 1;
    padMove.x = x; padMove.y = y;
}

window.addEventListener('gamepadconnected', () => {   // (hints switch to the controller when a button is really pressed, not on plugging in)
    const many = navigator.getGamepads && Array.from(navigator.getGamepads()).filter(p => p && p.connected).length > 1;
    spawnFloatText(400, 300, many ? '🎮 New controller! Hold any button to join' : '🎮 Controller connected!', '#FFFFFF', 180);
});

// ── VIRTUAL TOUCH CONTROLS ────────────────────────────────────
// Rules for the layout: every button is at least TOUCH_MIN_CSS wide on the real screen (a child's thumb),
// the tap area is exactly the drawn circle, and no two buttons overlap. layoutTouch() places them again
// whenever the window changes, so a small phone gets bigger buttons (in game pixels) than a tablet.
// Sideways phones have spare room left and right of the picture (view.offX): the buttons go there, off the game.
const TOUCH_MIN_CSS  = 48;           // the smallest a button may be on the real screen (about 9 mm)
const TOUCH_R_MIN    = 30;           // …but never smaller than this many game pixels
const TOUCH_R_MAX    = 44;           // …or bigger than this (a tablet would get giant buttons)
const TOUCH_GAP      = 6;            // space between two buttons
const TOUCH_PAD      = 10;           // space between a button and the screen edge
const SHOOT_SIZE     = 1.4;          // the big action button is this many times a normal one
const JOY_SIZE       = 1.4;          // the joystick base, in normal button radii
const JOY_GRAB       = 1.5;          // you can start the stick this far (× its radius) from its middle
const JOYSTICK_DEADZONE_RATIO = 0.2; // fraction of maxDist before movement starts
const VJOY   = { x: 100, y: 490, baseR: 55, maxDist: 40 };
const VSHOOT = { x: 700, y: 490, r: 45 };
const vTouch = { joyId: null, joyDX: 0, joyDY: 0, joyOriX: 0, joyOriY: 0, shootId: null, meleeId: null, blockId: null };
const VMELEE = { x: 620, y: 350, r: 22 };
const VBLOCK = { x: 760, y: 350, r: 20 };
const VJUMP  = { x: 560, y: 405, r: 20 };
let buildFlash = null;   // the block a finger just tapped in build mode: { cx, cy, t, ok }
const BUILD_FLASH_FRAMES = 24;

function touchR() { return Math.max(TOUCH_R_MIN, Math.min(TOUCH_R_MAX, TOUCH_MIN_CSS / 2 / view.fit)); }
function inBtn(x, y, b) { return Math.hypot(x - b.x, y - b.y) <= b.r; }
function joyGrabR() { return VJOY.baseR * JOY_GRAB; }
// A flat on-screen button (SHOP, AWARDS, NEW GAME…) gets a taller tap area on a phone, so a thumb can hit it
function tapRect(r) {
    if (!usesTouchLayout()) return r;
    const need = TOUCH_MIN_CSS / view.fit, padX = Math.max(0, (need - r.w) / 2), padY = Math.max(0, (need - r.h) / 2);
    return { x: r.x - padX, y: r.y - padY, w: r.w + 2 * padX, h: r.h + 2 * padY };
}

// Thumb-friendly places. Right thumb: the big button with PUNCH beside it, JUMP above it and BLOCK
// between them; then two columns of extras going up. Left thumb: the joystick, with the silly buttons above it.
function layoutTouch() {
    layoutDirty = false;
    const tr = touchR(), step = 2 * tr + TOUCH_GAP;
    const xL = -view.offX + TOUCH_PAD, xR = GAME_W + view.offX - TOUCH_PAD, yB = GAME_H - TOUCH_PAD;
    VJOY.baseR = Math.round(tr * JOY_SIZE); VJOY.maxDist = Math.round(tr);
    VJOY.x = xL + VJOY.baseR; VJOY.y = yB - VJOY.baseR;
    const sr = VSHOOT.r = Math.round(tr * SHOOT_SIZE);
    VSHOOT.x = xR - sr; VSHOOT.y = yB - sr;
    for (const b of [VMELEE, VBLOCK, VJUMP, VSILLY, VDANCE, VFART, VBUILD, VSPELL, VMOUNT, VGOD, VDASH, VGADGET, MUTE_BTN, SETTINGS_BTN]) b.r = tr;
    VMELEE.x = VSHOOT.x - sr - tr - TOUCH_GAP;   VMELEE.y = yB - tr;
    VJUMP.x  = xR - tr;                          VJUMP.y  = VSHOOT.y - sr - tr - TOUCH_GAP;
    VBLOCK.x = VMELEE.x;                         VBLOCK.y = VJUMP.y;
    const col1 = VJUMP.x, col2 = VMELEE.x, up = k => VJUMP.y - k * step;
    [[VDASH, 1], [VGADGET, 2], [VSPELL, 3], [VGOD, 4]].forEach(([b, k]) => { b.x = col1; b.y = up(k); });
    [[VBUILD, 1], [VMOUNT, 2]].forEach(([b, k]) => { b.x = col2; b.y = up(k); });
    const first = VJOY.y - joyGrabR() - tr - TOUCH_GAP;
    [VDANCE, VFART, VSILLY, SETTINGS_BTN, MUTE_BTN].forEach((b, k) => { b.x = xL + tr; b.y = first - k * step; });
}

// Everything round on screen right now: [button, icon, held?]. Drawing and the tests both use this.
function touchButtonList() {
    const list = [[VSHOOT, '', vTouch.shootId !== null],
                  [VMELEE, '👊', vTouch.meleeId !== null], [VBLOCK, '🛡', vTouch.blockId !== null], [VJUMP, '🦘', false],
                  [VDANCE, '💃', false], [VFART, '💨', false], [VSILLY, sillyTurn % 2 ? '🤧' : '🫢', false],
                  [SETTINGS_BTN, '⚙', false], [MUTE_BTN, muted ? '🔇' : '🔊', false],
                  [VBUILD, state.buildMode ? '⚔' : '🧱', state.buildMode]];
    if (state.spell) list.push([VSPELL, SPELLS.find(x => x.id === state.spell).icon, false]);
    if (godParent()) list.push([VGOD, nextGodPower().icon, false]);
    if (state.lastMount) list.push([VMOUNT, state.mount ? '🚶' : MOUNTS.find(m => m.id === state.lastMount).icon, !!state.mount]);
    if (state.buildMode) list.push([VGADGET, '🔄', false]);
    else if (state.gadget) list.push([VGADGET, GADGETS.find(g => g.id === state.gadget).icon, false]);
    if (state.hasDash) list.push([VDASH, '⚡', false]);
    return list;
}

// The touch buttons are only there while you are playing and nothing is covering them
function touchUiShown() {
    return isTouchDevice && state.gamePhase === 'playing' && !state.won && !state.levelComplete
        && !menu && !state.shopOpen && !state.awardsOpen && !race && !petBattle && !tvShow && !credits && !danceBattle;
}

function canvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    let x = (clientX - rect.left) * (view.w  / rect.width);
    let y = (clientY - rect.top)  * (GAME_H / rect.height);
    if (mod('upsideDown') !== mod('mirror')) x = view.w - x;   // the picture may be turned or mirrored
    if (mod('upsideDown')) y = GAME_H - y;
    return { x: x - view.offX, y };
}

// Build mode, finger on the world: mine the block under it, or place the chosen block on an empty spot
// (the same rules as a mouse click). Returns true if the tap was used.
function touchBuildTap(p) {
    if (!state.buildMode || state.gamePhase !== 'playing' || menu || state.shopOpen || state.won || state.levelComplete) return false;
    if (p.x < 0 || p.x > GAME_W || p.y < 0 || p.y > GAME_H) return false;
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    if (Math.hypot(p.x - player.x, p.y - player.y) > BUILD_REACH) {
        buildFlash = { cx, cy, t: BUILD_FLASH_FRAMES, ok: false };
        spawnFloatText(p.x, p.y, 'Come closer!', '#FFFFFF', 40);
        return true;
    }
    buildFlash = { cx, cy, t: BUILD_FLASH_FRAMES, ok: true };
    buildAt(cx, cy, p.x, p.y);
    return true;
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!isTouchDevice) { isTouchDevice = true; fitCanvas(); }   // (the first touch: the side margins appear)
    if (layoutDirty) layoutTouch();
    initAudio();
    lastInput = 'touch';
    for (const t of e.changedTouches) {
        const p = canvasPos(t.clientX, t.clientY);
        if (state.gamePhase === 'playing' && !menu && !state.shopOpen) {   // the fighting buttons can be held
            if (inBtn(p.x, p.y, VMELEE)) { vTouch.meleeId = t.identifier; meleePress(); continue; }
            if (inBtn(p.x, p.y, VBLOCK)) { vTouch.blockId = t.identifier; startBlock(); continue; }
            if (inBtn(p.x, p.y, VJUMP))  { superJump(); continue; }
        }
        if (handleTap(p.x, p.y)) continue;
        const onJoy = Math.hypot(p.x - VJOY.x, p.y - VJOY.y) < joyGrabR(), onShoot = inBtn(p.x, p.y, VSHOOT);
        if (vTouch.joyId === null && onJoy) {
            vTouch.joyId = t.identifier; vTouch.joyOriX = p.x; vTouch.joyOriY = p.y;
            vTouch.joyDX = 0; vTouch.joyDY = 0;
        } else if (vTouch.shootId === null && onShoot) {
            vTouch.shootId = t.identifier;
            pressAction();
        } else if (!onJoy && !onShoot) {
            touchBuildTap(p);   // a tap on the world itself (never on a button or the stick)
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
        if (t.identifier !== vTouch.joyId) continue;
        const p = canvasPos(t.clientX, t.clientY);
        const rawDX = p.x - vTouch.joyOriX, rawDY = p.y - vTouch.joyOriY;
        const dist = Math.hypot(rawDX, rawDY);
        const clamped = Math.min(dist, VJOY.maxDist);
        vTouch.joyDX = dist > 0 ? (rawDX / dist) * clamped : 0;
        vTouch.joyDY = dist > 0 ? (rawDY / dist) * clamped : 0;
    }
}, { passive: false });

function clearTouchId(id) {
    if (id === vTouch.joyId)   { vTouch.joyId = null; vTouch.joyDX = 0; vTouch.joyDY = 0; }
    if (id === vTouch.shootId) { vTouch.shootId = null; }
    if (id === vTouch.meleeId) { vTouch.meleeId = null; meleeRelease(); }
    if (id === vTouch.blockId) { vTouch.blockId = null; stopBlock(); }
}
// (iOS counts the finger LIFTING as the tap that allows sound: so the audio is unlocked here too)
canvas.addEventListener('touchend',    e => { e.preventDefault(); initAudio(); for (const t of e.changedTouches) clearTouchId(t.identifier); }, { passive: false });
canvas.addEventListener('touchcancel', e => { e.preventDefault(); for (const t of e.changedTouches) clearTouchId(t.identifier); }, { passive: false });
document.addEventListener('pointerup', () => initAudio());

