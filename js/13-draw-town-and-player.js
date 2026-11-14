// ── DRAW: PARADISE ────────────────────────────────────────────
// Sky tint for Paradise: darkens at dusk, deep blue at Monster Night (drawn before everything else)
function drawParadiseSky() {
    const P = paradise;
    const dark = P.phase === 'night' ? 1 : P.phase === 'dusk' ? 1 - P.timer / DUSK_FRAMES : 0;
    if (dark === 0) {
        ctx.fillStyle = 'rgba(255,240,190,0.06)';   // warm sunshine
        ctx.fillRect(0, 0, 800, 600);
        drawRainbowArc();
        return;
    }
    ctx.fillStyle = `rgba(5,5,40,${0.6 * dark})`;
    ctx.fillRect(0, 0, 800, 600);
    ctx.save();
    ctx.globalAlpha = dark;
    ctx.fillStyle = '#FFFBE0'; ctx.shadowColor = '#FFFBE0'; ctx.shadowBlur = 30;   // moon
    ctx.beginPath(); ctx.arc(660, 95, 20, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(5,5,40,1)';
    ctx.beginPath(); ctx.arc(669, 89, 16, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 25; i++) {   // twinkling stars
        const sx = (i * 137) % 800, sy = 75 + (i * 71) % 90;
        if (Math.sin(Date.now() / 400 + i) > -0.3) drawStar(sx, sy, 2, '#FFFFFF');
    }
    ctx.restore();
}

function drawBuilding(b, night) {
    const w = b.w, h = b.id === 'mansion' ? 62 : 55, x = b.x - w / 2, y = b.y - h / 2;
    drawGroundShadow(b.x + 10, y + h + 2, w * 0.6, 8, 0.3);
    ctx.save();
    ctx.fillStyle = b.wall;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;          // brick lines
    for (let row = 1; row < Math.floor(h / 9); row++) {
        ctx.beginPath(); ctx.moveTo(x, y + row * 9); ctx.lineTo(x + w, y + row * 9); ctx.stroke();
        for (let bx = x + (row % 2) * 9; bx < x + w; bx += 18) { ctx.beginPath(); ctx.moveTo(bx, y + row * 9 - 9); ctx.lineTo(bx, y + row * 9); ctx.stroke(); }
    }
    if (b.id === 'mansion') {                                         // white columns
        ctx.fillStyle = '#E8E8E8';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 10 + k * 28, y + 6, 7, h - 6);
    }
    const shade = ctx.createLinearGradient(x, 0, x + w, 0);           // light from the left
    shade.addColorStop(0, 'rgba(255,255,255,0.12)'); shade.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = shade; ctx.fillRect(x, y, w, h);
    const peak = b.id === 'mansion' ? 38 : 32;
    ctx.fillStyle = b.roof;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(b.x, y - peak); ctx.lineTo(x + w + 8, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';                                // shady side of the roof
    ctx.beginPath(); ctx.moveTo(b.x, y - peak); ctx.lineTo(x + w + 8, y); ctx.lineTo(b.x, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';                              // roof tiles
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 8 + k * 8, y - k * 8); ctx.lineTo(x + w + 8 - k * 8, y - k * 8); ctx.stroke(); }
    if (b.id === 'bakery' || b.id === 'forge') {                       // chimney with smoke
        ctx.fillStyle = '#7A4A3A'; ctx.fillRect(x + w - 24, y - 26, 10, 18);
        for (let k = 0; k < 3; k++) {
            const t = (Date.now() / 1500 + k / 3) % 1;
            ctx.fillStyle = `rgba(220,220,220,${0.5 * (1 - t)})`;
            ctx.beginPath(); ctx.arc(x + w - 19 + Math.sin(t * 6) * 4, y - 30 - t * 30, 4 + t * 6, 0, Math.PI * 2); ctx.fill();
        }
    }
    drawBuildingStyle(b, x, y, w, h, peak, night);
    ctx.fillStyle = b.door || '#6B3E1E';                        // door
    ctx.fillRect(b.x - 9, y + h - 26, 18, 26);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(b.x + 4, y + h - 14, 2, 2);   // door knob
    ctx.fillStyle = night ? '#FFE070' : '#AADDFF';              // windows glow at night
    if (night) { ctx.shadowColor = '#FFE070'; ctx.shadowBlur = 12; }
    ctx.fillRect(x + 10, y + 12, 16, 14);
    ctx.fillRect(x + w - 26, y + 12, 16, 14);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.5;              // window frames
    ctx.strokeRect(x + 10, y + 12, 16, 14); ctx.strokeRect(x + w - 26, y + 12, 16, 14);
    ctx.fillStyle = '#222'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    const owned = b.cost && state.housesOwned[b.id];
    ctx.fillText(b.cost ? (owned ? `YOUR ${b.name} ❤` : b.name) : b.name, b.x, y + 9);
    if (b.cost && !owned) {                                     // FOR SALE sign on a post
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(x - 20, y + 22, 3, 34);
        ctx.fillStyle = '#FFF'; ctx.fillRect(x - 42, y + 8, 46, 22);
        ctx.fillStyle = '#C00'; ctx.font = 'bold 8px Arial';
        ctx.fillText('FOR SALE', x - 19, y + 17);
        ctx.fillText(`🪙${b.cost}`, x - 19, y + 27);
    }
    if (owned) {                                                // a little flag on your house
        ctx.fillStyle = '#555'; ctx.fillRect(b.x - 1, y - peak - 16, 2, 16);
        ctx.fillStyle = '#FF3355';
        ctx.beginPath(); ctx.moveTo(b.x + 1, y - peak - 16); ctx.lineTo(b.x + 14, y - peak - 12 + Math.sin(Date.now() / 200) * 2); ctx.lineTo(b.x + 1, y - peak - 8); ctx.fill();
    }
    ctx.restore();
}

// Hair, skin and clothes for each townsperson
const TOWN_LOOKS = {
    doctor: { hair: '#2A1A10', hairStyle: 'short', pants: '#DDD' },
    teacher:{ hair: '#6A3A1A', hairStyle: 'bun', pants: '#333' },
    hattie: { hair: '#FFCC33', hairStyle: 'long', pants: '#884488' },
    captain:{ hair: '#DDD', hairStyle: 'short', pants: '#EEE', beard: '#DDD' },
    baker:  { hair: '#8A5A2A', hairStyle: 'short', pants: '#6A4A2A', skin: '#E8B48A' },
    smith:  { hair: '#1A1A1A', hairStyle: 'bald', pants: '#3A2A1A', beard: '#1A1A1A', skin: '#C88A5A' },
    mayor:  { hair: '#777', hairStyle: 'short', pants: '#1A2A55', beard: '#999' },
    farmer: { hair: '#AA7A3A', hairStyle: 'short', pants: '#3A5A9A', skin: '#E0A878' },
    fisher: { hair: '#3A2A1A', hairStyle: 'short', pants: '#2A3A4A', beard: '#5A4A3A' },
    rose:   { hairStyle: 'bun',   pants: '#6A3A6A' },
    sam:    { hairStyle: 'spiky', pants: '#2A4A8A' },
    lily:   { hairStyle: 'long',  pants: '#AA4488', skin: '#C08060' },
    tom:    { hairStyle: 'bald',  pants: '#4A4A3A', beard: '#EEEEEE' },
};

// Each building has its own look
function drawBuildingStyle(b, x, y, w, h, peak, night) {
    const t = Date.now() / 1000;
    if (b.id === 'cottage') {
        ctx.fillStyle = '#D8B858';                                       // straw roof
        ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.quadraticCurveTo(b.x, y - peak - 12, x + w + 10, y + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,30,0.5)'; ctx.lineWidth = 1;
        for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(x - 6 + k * (w + 12) / 10, y); ctx.lineTo(b.x + (k - 5) * 3, y - peak + 6); ctx.stroke(); }
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF';                   // round window
        ctx.beginPath(); ctx.arc(b.x, y - peak * 0.35, 5, 0, Math.PI * 2); ctx.fill();
        for (const wx of [x + 10, x + w - 26]) {                         // flower boxes
            ctx.fillStyle = '#6B3E1E'; ctx.fillRect(wx - 1, y + 27, 18, 4);
            for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#FF5577', '#FFDD33', '#FF88CC', '#FFFFFF'][k]; ctx.beginPath(); ctx.arc(wx + 2 + k * 4.5, y + 26, 2, 0, Math.PI * 2); ctx.fill(); }
        }
    } else if (b.id === 'bighouse') {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;         // two floors
        ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x + w, y + 28); ctx.stroke();
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(b.x - 22, y + 24, 44, 3);   // balcony
        for (let k = 0; k <= 6; k++) ctx.fillRect(b.x - 22 + k * 7, y + 18, 2, 7);
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF';
        ctx.fillRect(b.x - 7, y + 6, 14, 12);                            // balcony door
    } else if (b.id === 'mansion') {
        ctx.fillStyle = b.roof;                                          // tower with a pointy top
        ctx.fillRect(x + w - 22, y - 22, 18, 30);
        ctx.beginPath(); ctx.moveTo(x + w - 25, y - 22); ctx.lineTo(x + w - 13, y - 48); ctx.lineTo(x + w - 1, y - 22); ctx.fill();
        ctx.fillStyle = night ? '#FFE070' : '#AADDFF'; ctx.fillRect(x + w - 16, y - 16, 6, 8);
        ctx.fillStyle = '#FFD700'; ctx.fillRect(x - 8, y - 2, w + 16, 3);   // gold trim
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;                   // fancy iron fence
        for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.moveTo(x - 4 + k * 10, y + h + 12); ctx.lineTo(x - 4 + k * 10, y + h + 2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - 4, y + h + 6); ctx.lineTo(b.x - 14, y + h + 6); ctx.moveTo(b.x + 14, y + h + 6); ctx.lineTo(x + w + 4, y + h + 6); ctx.stroke();
    } else if (b.id === 'clinic') {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, y - 12, 9, 0, Math.PI * 2); ctx.fill();   // red cross sign
        ctx.fillStyle = '#E02020'; ctx.fillRect(b.x - 2, y - 18, 4, 12); ctx.fillRect(b.x - 6, y - 14, 12, 4);
    } else if (b.id === 'bakery') {
        for (let k = 0; k < 8; k++) {                                    // striped awning
            ctx.fillStyle = k % 2 ? '#FFFFFF' : '#E05050';
            ctx.beginPath(); ctx.moveTo(x + k * w / 8, y + 30); ctx.lineTo(x + (k + 1) * w / 8, y + 30);
            ctx.lineTo(x + (k + 1) * w / 8, y + 36); ctx.arc(x + (k + 0.5) * w / 8, y + 36, w / 16, 0, Math.PI); ctx.fill();
        }
        ctx.fillStyle = '#E0A050'; ctx.beginPath(); ctx.ellipse(x + 14, y + 44, 9, 5, 0, 0, Math.PI * 2); ctx.fill();   // bread sign
        ctx.strokeStyle = '#A06020'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + 14 + k * 4, y + 41); ctx.lineTo(x + 12 + k * 4, y + 47); ctx.stroke(); }
    } else if (b.id === 'forge') {
        ctx.fillStyle = 'rgba(90,90,90,0.55)';                           // stone walls
        for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.ellipse(x + 6 + (k * 23) % (w - 8), y + 8 + Math.floor(k / 4) * 12, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); }
        const glow = 0.6 + Math.sin(t * 8) * 0.2;                       // fire glowing inside
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 60},20,${glow})`; ctx.fillRect(x + w - 26, y + 12, 16, 14);
        ctx.fillStyle = '#333';                                          // anvil outside
        ctx.fillRect(x + w + 2, y + h - 10, 16, 5); ctx.fillRect(x + w + 6, y + h - 5, 8, 5);
    } else if (b.id === 'hall') {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(b.x, y - 12, 8, 0, Math.PI * 2); ctx.fill();   // clock
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(b.x, y - 12, 8, 0, Math.PI * 2); ctx.moveTo(b.x, y - 12); ctx.lineTo(b.x + Math.cos(t) * 5, y - 12 + Math.sin(t) * 5);
        ctx.moveTo(b.x, y - 12); ctx.lineTo(b.x, y - 17); ctx.stroke();
        ctx.fillStyle = '#555'; ctx.fillRect(x + w + 4, y - 30, 2, 40);  // flag pole + flag
        ctx.fillStyle = '#3366AA';
        ctx.beginPath(); ctx.moveTo(x + w + 6, y - 30); ctx.lineTo(x + w + 22, y - 26 + Math.sin(t * 4) * 2); ctx.lineTo(x + w + 6, y - 20); ctx.fill();
    }
}

// Draws a hat so its brim sits at (x, y) — the top of a head
function drawHatOn(x, y, id) {
    ctx.save();
    if (id === 'crown')   { ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(x - 8, y + 2);
                            for (let k = 0; k <= 4; k++) ctx.lineTo(x - 8 + k * 4, k % 2 ? y - 3 : y - 10); ctx.lineTo(x + 8, y + 2); ctx.closePath(); ctx.fill();
                            ctx.fillStyle = '#FF3355'; ctx.beginPath(); ctx.arc(x, y - 1, 1.8, 0, Math.PI * 2); ctx.fill(); }
    if (id === 'cowboy')  { ctx.fillStyle = '#8A5A2A'; ctx.beginPath(); ctx.ellipse(x, y + 1, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill(); pathRoundRect(x - 7, y - 9, 14, 10, 3); ctx.fill();
                            ctx.fillStyle = '#5A3A1A'; ctx.fillRect(x - 7, y - 3, 14, 2); }
    if (id === 'wizard')  { ctx.fillStyle = '#3A2A9A'; ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x + 3, y - 22); ctx.lineTo(x + 10, y + 2); ctx.fill();
                            ctx.fillStyle = '#FFE066'; drawStar(x, y - 7, 3, '#FFE066'); }
    if (id === 'tophat')  { ctx.fillStyle = '#111'; ctx.fillRect(x - 10, y - 1, 20, 3); ctx.fillRect(x - 6, y - 14, 12, 14); ctx.fillStyle = '#C03030'; ctx.fillRect(x - 6, y - 4, 12, 2); }
    if (id === 'party')   { ctx.fillStyle = '#FF55AA'; ctx.beginPath(); ctx.moveTo(x - 6, y + 1); ctx.lineTo(x, y - 16); ctx.lineTo(x + 6, y + 1); ctx.fill();
                            ctx.fillStyle = '#FFE066'; ctx.beginPath(); ctx.arc(x, y - 16, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, y - 6, 8, 2); }
    if (id === 'pirate')  { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(x - 13, y + 1); ctx.quadraticCurveTo(x, y - 18, x + 13, y + 1); ctx.fill();
                            ctx.fillStyle = '#FFF'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('☠', x, y - 3); }
    if (id === 'cap')     { ctx.fillStyle = '#2A5ACC'; ctx.beginPath(); ctx.arc(x, y + 1, 7.5, Math.PI, 0); ctx.fill(); ctx.fillRect(x, y - 1, 13, 3); }
    if (id === 'flowers') { for (let k = 0; k < 5; k++) { ctx.fillStyle = ['#FF6699', '#FFFFFF', '#FFDD33', '#CC88FF', '#FF9944'][k]; ctx.beginPath(); ctx.arc(x - 8 + k * 4, y - 1 + (k % 2), 2.5, 0, Math.PI * 2); ctx.fill(); } }
    if (id === 'teacher') { ctx.fillStyle = '#111'; ctx.fillRect(x - 9, y - 4, 18, 3); ctx.fillRect(x - 5, y - 1, 10, 3);                // graduation cap
                            ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y - 3); ctx.lineTo(x + 9, y + 6); ctx.stroke(); }
    ctx.restore();
}

// A townsperson or villager, with little walking legs
function drawCraftingTable() {
    const { x, y } = CRAFTING_TABLE;
    drawGroundShadow(x + 3, y + 14, 16, 5);
    ctx.drawImage(blockCanvas('planks'), x - 12, y - 12);
    ctx.fillStyle = '#6A4424'; ctx.fillRect(x - 12, y - 12, 24, 5);
    ctx.fillStyle = '#AAAAAA'; ctx.fillRect(x - 8, y - 4, 7, 2); ctx.fillRect(x - 5, y - 7, 2, 8);   // hammer
    ctx.fillStyle = '#C8A070'; ctx.fillRect(x + 3, y - 6, 2, 10); ctx.fillStyle = '#888'; ctx.fillRect(x + 1, y - 7, 6, 3);   // saw
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Crafting Table', x, y + 24);
}

function drawPerson(n) {
    if (n.door || n.table) return;
    const small = n.small ? 0.8 : 1;
    const walking = n.walk !== undefined && Math.hypot(n.tx - n.x, n.ty - n.y) > 3;
    const bob = walking ? Math.abs(Math.sin(n.walk)) * 2 : Math.sin(Date.now() / 350 + n.x) * 1.2;
    const x = n.x, y = n.y - bob;
    drawGroundShadow(x, n.y + 14, 11 * small, 4);
    ctx.save();
    ctx.translate(x, y); ctx.scale(small, small);
    const look = TOWN_LOOKS[n.id] || {};
    drawHuman(0, 0, 1, { shirt: n.coat, pants: look.pants, hair: n.hair || look.hair, hairStyle: look.hairStyle || (n.hair ? 'short' : 'short'),
                         beard: look.beard, skin: look.skin, walk: walking ? n.walk * 2 : 0 });
    if (n.hat === 'teacher') drawHatOn(0, -23, 'teacher');
    if (n.hat === 'captain') drawHatOn(0, -23, 'pirate');
    if (n.hat === 'hattie')  drawHatOn(0, -23, ['crown', 'cowboy', 'wizard', 'tophat', 'party', 'pirate', 'cap', 'flowers'][Math.floor(Date.now() / 1500) % 8]);   // she keeps trying hats on!
    if (paradise.birthday && paradise.birthday.id === n.id) drawHatOn(0, -23, 'party');
    if (n.hat === 'doctor') {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-7, -25, 14, 5);
        ctx.fillStyle = '#E03030'; ctx.fillRect(-1, -25, 2, 5); ctx.fillRect(-3, -23, 6, 2);
        ctx.fillRect(-1, -2, 2, 8); ctx.fillRect(-4, 1, 8, 2);   // red cross
    } else if (n.hat === 'baker') {
        ctx.fillStyle = '#FFFFFF';                               // tall chef hat
        ctx.fillRect(-6, -30, 12, 9);
        ctx.beginPath(); ctx.arc(-3, -30, 4, 0, Math.PI * 2); ctx.arc(3, -30, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F2D2A0'; ctx.fillRect(-5, 0, 10, 6);   // apron pocket
    } else if (n.hat === 'smith') {
        ctx.fillStyle = '#333'; ctx.fillRect(-8, -23, 16, 4);    // bandana
        ctx.fillStyle = '#888'; ctx.fillRect(10, -4, 8, 5);      // hammer head
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(13, 1, 2, 9);    // hammer handle
    } else if (n.hat === 'mayor') {
        ctx.fillStyle = '#111'; ctx.fillRect(-6, -32, 12, 11); ctx.fillRect(-9, -22, 18, 2);   // top hat
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(0, 4, 2.5, 0, Math.PI * 2); ctx.fill();   // medal
    } else if (n.hat === 'farmer') {
        ctx.fillStyle = '#E8C860';                               // straw hat
        ctx.beginPath(); ctx.ellipse(0, -21, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-6, -27, 12, 6);
        ctx.fillStyle = '#3A5A9A'; ctx.fillRect(-7, 0, 14, 12);  // dungarees
    } else if (n.hat === 'fisher') {
        ctx.fillStyle = '#FFCC33'; ctx.fillRect(-8, -24, 16, 5);  // yellow rain hat
        ctx.strokeStyle = '#6B3E1E'; ctx.lineWidth = 1.5;          // fishing rod
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(22, -22); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(22, -22); ctx.lineTo(24, 6); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y + 28);
}

function drawSpeech(n, text) {
    ctx.save();
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 18;
    const bx = Math.max(8, Math.min(792 - w, n.x - w / 2)), by = n.y - 62;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
    ctx.fillRect(bx, by, w, 24); ctx.strokeRect(bx, by, w, 24);
    ctx.beginPath(); ctx.moveTo(n.x - 6, by + 24); ctx.lineTo(n.x, by + 32); ctx.lineTo(n.x + 6, by + 24); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillText(text, bx + w / 2, by + 16);
    ctx.restore();
}

// Town square fountain, lamp posts, crops, butterflies
function drawTownDetails(night) {
    const t = Date.now() / 1000;
    // Fountain
    const fx = 400, fy = 345;
    drawGroundShadow(fx + 4, fy + 14, 36, 8, 0.3);
    ctx.fillStyle = '#9A9A9A'; ctx.beginPath(); ctx.ellipse(fx, fy, 34, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3A8FCF'; ctx.beginPath(); ctx.ellipse(fx, fy - 2, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {                                   // ripples
        const r = ((t * 12 + k * 14) % 26);
        ctx.beginPath(); ctx.ellipse(fx, fy - 2, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#B0B0B0'; ctx.fillRect(fx - 3, fy - 22, 6, 20);
    for (let k = 0; k < 10; k++) {                                  // water spray
        const a = (k / 10) * Math.PI * 2, ph = (t * 1.5 + k / 10) % 1;
        ctx.fillStyle = `rgba(180,225,255,${0.8 * (1 - ph)})`;
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * ph * 20, fy - 24 - Math.sin(ph * Math.PI) * 14 + ph * 16, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // Lamp posts — glow at night
    for (const [lx, ly] of [[330, 290], [470, 290], [330, 400], [470, 400]]) {
        ctx.fillStyle = '#333'; ctx.fillRect(lx - 1.5, ly - 30, 3, 30);
        ctx.fillStyle = night ? '#FFE890' : '#DDD';
        ctx.beginPath(); ctx.arc(lx, ly - 32, 4, 0, Math.PI * 2); ctx.fill();
        if (night) {
            const glow = ctx.createRadialGradient(lx, ly - 32, 2, lx, ly - 32, 60);
            glow.addColorStop(0, 'rgba(255,230,140,0.45)'); glow.addColorStop(1, 'rgba(255,230,140,0)');
            ctx.fillStyle = glow; ctx.fillRect(lx - 60, ly - 92, 120, 120);
        }
    }
    // Crops on the farm (thirsty ones droop and go brown)
    for (const c of paradise.crops) {
        const droop = c.thirsty ? 4 : 0;
        ctx.strokeStyle = c.thirsty ? '#8A7030' : '#2F8F2F'; ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(c.x, c.y);
            ctx.quadraticCurveTo(c.x + side * 6, c.y - 10 + droop, c.x + side * 9, c.y - 4 + droop * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x, c.y - 14 + droop); ctx.stroke();
        if (!c.thirsty) { ctx.fillStyle = '#E03A2A'; ctx.beginPath(); ctx.arc(c.x + 3, c.y - 9, 3, 0, Math.PI * 2); ctx.fill(); }
        else if (!night) { ctx.fillStyle = '#88CCFF'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('💧?', c.x, c.y - 20); }
    }
    // Butterflies (daytime)
    if (!night) {
        for (let k = 0; k < 5; k++) {
            const bx = 400 + Math.sin(t * 0.4 + k * 2) * 300, by = 300 + Math.cos(t * 0.55 + k * 3) * 180;
            const flap = Math.abs(Math.sin(t * 12 + k)) * 4 + 1;
            ctx.fillStyle = ['#FFDD55', '#FF88CC', '#88CCFF', '#FFFFFF', '#FFAA44'][k];
            ctx.beginPath(); ctx.ellipse(bx - 3, by, flap, 3, 0, 0, Math.PI * 2); ctx.ellipse(bx + 3, by, flap, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
    }
}

function drawParadise() {
    const t = Date.now() / 400;
    const P = paradise, night = P.phase !== 'day';

    for (const b of BUILDINGS) drawBuilding(b, night);
    drawTownDetails(night);

    if (!night) {
        // Townspeople, apples, speech and prompts (everyone hides indoors at night)
        const people = [...WORKERS, ...P.villagers].sort((a, b) => a.y - b.y);
        for (const n of people) drawPerson(n);
        drawCraftingTable();
        // School chalkboard next to the Teacher
        ctx.fillStyle = '#6B3E1E'; ctx.fillRect(214, 232, 26, 20); ctx.fillStyle = '#2A4A2A'; ctx.fillRect(216, 234, 22, 16);
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.fillText('ABC', 227, 244);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 9px Arial'; ctx.fillText('🏫 SCHOOL', 227, 228);
        // Birthday balloons around the birthday person
        if (P.birthday) {
            const who = [...WORKERS, ...P.villagers].find(n => n.id === P.birthday.id);
            if (who) for (let k = 0; k < 3; k++) {
                const bx = who.x - 20 + k * 20, by = who.y - 48 + Math.sin(Date.now() / 400 + k) * 3;
                ctx.strokeStyle = '#EEE'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(who.x, who.y - 22); ctx.stroke();
                ctx.fillStyle = ['#FF4466', '#44AAFF', '#FFDD33'][k]; ctx.beginPath(); ctx.ellipse(bx, by, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
            }
        }
        for (const a of P.apples) {
            drawGroundShadow(a.x, a.y + 7, 6, 2);
            ctx.fillStyle = '#E02020';
            ctx.beginPath(); ctx.arc(a.x, a.y, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(a.x - 2.5, a.y - 2.5, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#33AA33'; ctx.fillRect(a.x - 1, a.y - 11, 4, 5);
        }
        const verb = mainBtn();
        const n = state.buildMode ? null : nearbyNpc();   // in build mode the button builds instead
        if (n && !(P.speech && P.speech.npc === n)) drawSpeech(n, `${verb}: ${talkLabel(n)}`);
        else if (nearbyCrop()) drawSpeech(nearbyCrop(), `${verb}: Water the crop`);
        else if (atFishingSpot()) {
            const f = P.fishing;
            const spot = { x: FISH_SPOT.x, y: FISH_SPOT.y };
            drawSpeech(spot, f.stage === 'idle' ? `${verb}: Cast your line` : f.stage === 'waiting' ? 'Wait for it…' : `!!! ${verb} NOW !!!`);
        }
        if (P.fishing.stage !== 'idle') {                          // bobber in the water
            const bob = P.fishing.stage === 'bite' ? Math.sin(Date.now() / 40) * 3 : Math.sin(Date.now() / 300) * 1;
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(player.x + 10, player.y - 10); ctx.lineTo(FISH_SPOT.x + 18, 592 + bob); ctx.stroke();
            ctx.fillStyle = '#FF3333'; ctx.beginPath(); ctx.arc(FISH_SPOT.x + 18, 592 + bob, 3, 0, Math.PI * 2); ctx.fill();
        }
        if (P.speech) drawSpeech(P.speech.npc, P.speech.text);
    }

    for (const e of roomEnemies()) {
        if (!e.alive) continue;
        drawEnemy(e, t);
        drawEnemyHp(e);
    }

    for (const c of P.chests) {
        if (!c.visible) continue;
        ctx.save();
        if (!c.opened) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16; }
        ctx.fillStyle = c.opened ? '#5a3010' : '#8B4513';
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
        ctx.fillStyle = c.opened ? '#3a200a' : '#6B3410';
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h / 2);
        if (!c.opened) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(c.x - 3, c.y - 4, 7, 7);
        } else {
            drawStar(c.x, c.y - 22, 11, '#FFD700');
        }
        ctx.restore();
    }

    // Status line: time of day / what to do
    const nightNum = state.paradiseClearCount + 1;
    let status, color = 'rgba(255,255,255,0.85)';
    if (state.lightCrystals >= 3)       status = '☀ Paradise Island is safe! Now go and beat the Devil!';
    else if (P.phase === 'day')         status = `${{ sun: '☀', rain: '🌧', snow: '❄' }[P.weather]} Daytime — night falls in ${Math.ceil(P.timer / 60)}s (monsters might come!)`;
    else if (P.phase === 'dusk')      { status = '🌙 MONSTER NIGHT IS COMING! Get ready!'; color = Math.floor(Date.now() / 200) % 2 ? '#FF6666' : '#FFFFFF'; }
    else if (P.quiet)                 { status = `🌙 A quiet night… sleep tight! Morning comes in ${Math.ceil(P.timer / 60)}s`; color = '#AABBFF'; }
    else if (allMonstersDefeated())   { status = '⭐ You did it! Open the chest to win a Light Crystal!'; color = '#FFD700'; }
    else { status = `🌙 MONSTER NIGHT ${nightNum}/3${nightNum === 3 ? ' — THE KING SLIME IS HERE!' : nightNum === 2 ? ' — THE GHOST KING IS HERE!' : ''} — beat every monster!`; color = '#AABBFF'; }
    ctx.save();
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillStyle = color; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    if (state.buildMode) ctx.globalAlpha = 0;   // the hotbar is showing instead
    ctx.fillText(status, 400, 544);
    if (state.job) {
        ctx.fillStyle = 'rgba(255,235,160,0.95)'; ctx.font = 'bold 12px Arial';
        ctx.fillText(`📋 Job: ${jobText()} — pays 🪙${state.job.pay}`, 400, 562);
    }
    ctx.restore();

    // Coins
    drawCoins(P.coins);
}

// ── DRAW: BACKGROUNDS ─────────────────────────────────────────
// Each room's ground is painted once onto its own hidden canvas, then copied every frame.
// A seeded random number generator makes the scenery look the same every time.
function seededRandom(seed) {
    return () => {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function paintHeaven(g, R) {
    const sky = g.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#8FD0FF'); sky.addColorStop(0.55, '#DDF1FF'); sky.addColorStop(1, '#FFFFFF');
    g.fillStyle = sky; g.fillRect(0, 0, 800, 600);
    for (let i = 0; i < 70; i++) {   // fluffy cloud floor
        const x = R() * 800, y = 250 + R() * 360, r = 30 + R() * 60;
        const c = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        c.addColorStop(0, 'rgba(255,255,255,0.95)'); c.addColorStop(1, 'rgba(230,240,255,0)');
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
}

const bgCache = {};
function roomBackground(room) {
    if (!bgCache[room]) {
        const c = document.createElement('canvas');
        c.width = 800; c.height = 600;
        if (room === 'void') { c.width = 900; c.height = 700; }   // fog is bigger than the screen so it can drift
        const painters = { hell: paintHell, paradise: paintParadise, underground: paintUnderground, void: paintVoidFog, heaven: paintHeaven, house: paintHouse,
                           ship: paintShip, candy: paintCandy, ice: paintIce, haunted: paintHaunted, sky: paintSky, space: paintSpace, arena: paintArena, mall: paintMall,
                           underwater: paintUnderwater, dino: paintDino, volcano: paintVolcano, jungle: paintJungle,
                           toy: paintToy, pyramid: paintPyramid, cloudcity: paintCloudCity, camp: paintCamp, olympus: paintOlympus, piratecove: paintPirateCove, chess: paintChess, library: paintLibrary,
                           greece: paintGreece, maze: paintMaze, gorgon: paintGorgon, underworld: paintUnderworld, viking: paintViking,
                           ...Object.fromEntries(Object.entries(SUBPLACES).map(([id, sp]) => [id, sp.paint])), stadium: paintStadium, snowfort: paintSnowfort };
        painters[room](c.getContext('2d'), seededRandom(room.length * 7919 + 13));
        bgCache[room] = c;
    }
    return bgCache[room];
}

function paintParadise(g, R) {
    g.fillStyle = '#3E8C38'; g.fillRect(0, 0, 800, 600);
    // Patchy grass colours
    for (let i = 0; i < 1400; i++) {
        g.fillStyle = `hsla(${95 + R() * 30}, ${40 + R() * 25}%, ${26 + R() * 16}%, 0.55)`;
        g.beginPath(); g.ellipse(R() * 800, R() * 600, 4 + R() * 12, 3 + R() * 7, R() * 3, 0, Math.PI * 2); g.fill();
    }
    // Grass blades
    g.lineWidth = 1;
    for (let i = 0; i < 3000; i++) {
        const x = R() * 800, y = R() * 600, h = 3 + R() * 5;
        g.strokeStyle = R() < 0.5 ? 'rgba(20,70,20,0.6)' : 'rgba(140,200,90,0.5)';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - h); g.stroke();
    }
    // Dirt paths from every door and portal to the town square
    const plaza = { x: 400, y: 330 };
    const ends = [...BUILDINGS.map(b => ({ x: b.x, y: b.y + 30 })), ...PORTALS.paradise, { x: 400, y: 478 }, { x: 255, y: 470 }, { x: 640, y: 548 }];
    for (const [w, col] of [[30, '#9C8456'], [22, '#C9B07A']]) {
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
        for (const e of ends) { g.beginPath(); g.moveTo(plaza.x, plaza.y); g.quadraticCurveTo((plaza.x + e.x) / 2 + 30, (plaza.y + e.y) / 2, e.x, e.y); g.stroke(); }
        g.fillStyle = col; g.beginPath(); g.arc(plaza.x, plaza.y, w * 2.2, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 400; i++) {   // pebbles on the paths
        const e = ends[Math.floor(R() * ends.length)], k = R();
        g.fillStyle = R() < 0.5 ? 'rgba(120,100,70,0.7)' : 'rgba(230,215,180,0.7)';
        g.beginPath(); g.arc(plaza.x + (e.x - plaza.x) * k + (R() - 0.5) * 14, plaza.y + (e.y - plaza.y) * k + (R() - 0.5) * 14, 1 + R() * 1.5, 0, Math.PI * 2); g.fill();
    }
    // Flowers
    const petals = ['#FFFFFF', '#FFE44D', '#FF7FB0', '#B98CFF', '#FF6A4D'];
    for (let i = 0; i < 140; i++) {
        const x = R() * 800, y = 70 + R() * 490, col = petals[Math.floor(R() * petals.length)];
        g.fillStyle = col;
        for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#FFB300'; g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
    }
    // Trees (kept away from buildings, portals and paths)
    // (the trees are drawn every frame now, so you can chop them down — see SCENERY)
    // Farm field with a fence
    g.fillStyle = '#6B4A2A'; g.fillRect(FARM.x, FARM.y, FARM.w, FARM.h);
    g.strokeStyle = '#4E3418'; g.lineWidth = 3;
    for (let fy = FARM.y + 14; fy < FARM.y + FARM.h; fy += 20) { g.beginPath(); g.moveTo(FARM.x + 6, fy); g.lineTo(FARM.x + FARM.w - 6, fy); g.stroke(); }
    g.strokeStyle = '#C8A070'; g.lineWidth = 2;
    g.strokeRect(FARM.x - 4, FARM.y - 4, FARM.w + 8, FARM.h + 8);
    for (let fx = FARM.x - 4; fx <= FARM.x + FARM.w + 4; fx += 20) {
        g.fillStyle = '#B08858'; g.fillRect(fx - 2, FARM.y - 9, 4, 10); g.fillRect(fx - 2, FARM.y + FARM.h - 1, 4, 10);
    }
    // Beach and sea along the bottom — it's an island!
    const sand = g.createLinearGradient(0, 566, 0, 588);
    sand.addColorStop(0, 'rgba(230,210,150,0)'); sand.addColorStop(0.4, '#E6D296'); sand.addColorStop(1, '#D8C080');
    g.fillStyle = sand; g.fillRect(0, 566, 800, 22);
    const sea = g.createLinearGradient(0, 586, 0, 600);
    sea.addColorStop(0, '#4FB3D9'); sea.addColorStop(1, '#1F6FA8');
    g.fillStyle = sea; g.fillRect(0, 586, 800, 14);
    // Wooden fishing pier
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(628, 552, 30, 50);
    for (let py = 548; py < 600; py += 7) {
        g.fillStyle = py % 14 ? '#9A6A3A' : '#8A5A2A'; g.fillRect(624, py, 32, 6);
    }
    g.fillStyle = '#5A3A1A'; g.fillRect(622, 548, 3, 52); g.fillRect(655, 548, 3, 52);
}

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

// Soft fog clouds for the Void (drawn over its colour, drifting slowly)
function paintVoidFog(g, R) {
    for (let i = 0; i < 30; i++) {
        const x = R() * 900, y = R() * 700, r = 60 + R() * 140;
        const fog = g.createRadialGradient(x, y, 0, x, y, r);
        fog.addColorStop(0, `rgba(255,255,255,${0.08 + R() * 0.1})`); fog.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = fog; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
}

// Darker edges make everything feel more real
let vignetteCanvas = null;
function drawVignette() {
    if (!vignetteCanvas) {
        vignetteCanvas = document.createElement('canvas');
        vignetteCanvas.width = 800; vignetteCanvas.height = 600;
        const g = vignetteCanvas.getContext('2d');
        const v = g.createRadialGradient(400, 320, 240, 400, 320, 560);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = v; g.fillRect(0, 0, 800, 600);
    }
    ctx.drawImage(vignetteCanvas, 0, 0);
}

function drawRoomBackground() {
    const t = Date.now() / 1000;
    if (state.room === ROOM.VOID) {
        ctx.fillStyle = VOID_BG_COLOR; ctx.fillRect(0, 0, 800, 600);
        ctx.drawImage(roomBackground('void'), -50 + Math.sin(t / 6) * 30, -50 + Math.cos(t / 8) * 15);
    } else if (state.room === ROOM.SECRET) {
        const gold = ctx.createRadialGradient(400, 300, 50, 400, 300, 500);
        gold.addColorStop(0, '#5A4210'); gold.addColorStop(1, '#1E1400');
        ctx.fillStyle = gold; ctx.fillRect(0, 0, 800, 600);
    } else {
        ctx.drawImage(roomBackground(state.room), 0, 0);
    }
    if (state.room === ROOM.HELL) {
        // Lava pools pulse, embers float up
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.15;
        ctx.fillStyle = '#FFE070'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.ellipse(70, 555, 40, 18, 0, 0, Math.PI * 2); ctx.ellipse(770, 190, 22, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        for (let i = 0; i < 24; i++) {
            const x = (i * 97 + Math.sin(t + i) * 20) % 800, y = 600 - ((t * 30 + i * 53) % 560);
            ctx.fillStyle = `rgba(255,${120 + (i % 5) * 25},40,${0.5 + 0.4 * Math.sin(t * 3 + i)})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    if (state.room === ROOM.PARADISE) {
        // Waves washing up the beach
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= 800; x += 10) ctx.lineTo(x, 587 + Math.sin(x / 30 + t * 2) * 2);
        ctx.stroke();
    }
}

// Soft shadow on the ground under something
function drawGroundShadow(x, y, rx, ry = rx * 0.35, alpha = 0.3) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
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

// Draws a pet (also used for the shop previews). s = size scale, face = 1 left / -1 right
function drawPetShape(id, x, y, s = 1, face = 1) {
    const t = Date.now();
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * face, s);
    if (PET_EMOJI[id]) {   // newer pets are big emoji
        const [em, filter] = PET_EMOJI[id];
        ctx.filter = filter; ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.scale(-1, 1); ctx.fillText(em, 0, -2);
        ctx.filter = 'none'; if (id === 'robodog') { ctx.font = '10px Arial'; ctx.fillText('📡', 4, -14); }
        ctx.restore();
        return;
    }
    if (id === 'puppy') {
        ctx.strokeStyle = '#8B5A2B'; ctx.lineWidth = 3;   // wagging tail
        ctx.beginPath(); ctx.moveTo(9, -1); ctx.lineTo(15, -7 + Math.sin(t / 60) * 4); ctx.stroke();
        ctx.fillStyle = '#C8904A';
        ctx.beginPath(); ctx.ellipse(2, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.fillRect(-6, 4, 3, 5); ctx.fillRect(6, 4, 3, 5);                       // legs
        ctx.beginPath(); ctx.arc(-9, -6, 7, 0, Math.PI * 2); ctx.fill();            // head
        ctx.fillStyle = '#6B3E1E';
        ctx.beginPath(); ctx.ellipse(-12, -8, 3, 6, 0.4, 0, Math.PI * 2); ctx.ellipse(-5, -9, 3, 6, -0.4, 0, Math.PI * 2); ctx.fill();   // floppy ears
        ctx.fillStyle = '#000';
        ctx.fillRect(-11, -8, 2, 2); ctx.beginPath(); ctx.arc(-15, -5, 1.8, 0, Math.PI * 2); ctx.fill();   // eye + nose
    } else if (id === 'kitten') {
        ctx.strokeStyle = '#E07A1A'; ctx.lineWidth = 3;   // curly tail
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.quadraticCurveTo(18, -4, 14, -12 + Math.sin(t / 150) * 2); ctx.stroke();
        ctx.fillStyle = '#FF9933';
        ctx.beginPath(); ctx.ellipse(2, 1, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-5, 4, 3, 5); ctx.fillRect(5, 4, 3, 5);
        ctx.beginPath(); ctx.arc(-8, -5, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(-13, -15); ctx.lineTo(-9, -10); ctx.moveTo(-7, -10); ctx.lineTo(-3, -15); ctx.lineTo(-2, -8); ctx.fill();   // ears
        ctx.fillStyle = '#000'; ctx.fillRect(-11, -7, 2, 2); ctx.fillRect(-6, -7, 2, 2);
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 0.8;   // whiskers
        ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(-17, -4); ctx.moveTo(-10, -2); ctx.lineTo(-17, -1); ctx.stroke();
    } else if (id === 'owl') {
        const flap = Math.sin(t / 90) * 5;
        ctx.translate(0, Math.sin(t / 300) * 2 - 6);   // hovers
        ctx.fillStyle = '#7A5A3A';
        ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-16, -6 - flap); ctx.lineTo(-8, 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(7, -2); ctx.lineTo(16, -6 - flap); ctx.lineTo(8, 6); ctx.fill();
        ctx.fillStyle = '#9A7A5A';
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-7, -14); ctx.lineTo(-3, -10); ctx.moveTo(8, -8); ctx.lineTo(7, -14); ctx.lineTo(3, -10); ctx.fill();   // ear tufts
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.arc(4, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-4, -4, 2, 0, Math.PI * 2); ctx.arc(4, -4, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22';
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(0, 4); ctx.fill();   // beak
    } else if (id === 'penguin') {
        const waddle = Math.sin(t / 120) * 0.15;
        ctx.rotate(waddle);
        ctx.fillStyle = '#FF9922'; ctx.fillRect(-6, 8, 5, 3); ctx.fillRect(1, 8, 5, 3);                        // feet
        ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2); ctx.fill();    // tummy
        ctx.fillStyle = '#1A1A2A'; ctx.beginPath(); ctx.ellipse(-9, 1, 3, 7, 0.3, 0, Math.PI * 2); ctx.ellipse(9, 1, 3, 7, -0.3, 0, Math.PI * 2); ctx.fill();   // flippers
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-3, -6, 2, 0, Math.PI * 2); ctx.arc(3, -6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-3, -6, 1, 0, Math.PI * 2); ctx.arc(3, -6, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF9922'; ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(2, -3); ctx.lineTo(0, 0); ctx.fill();   // beak
    } else if (id === 'unicorn') {
        const gallop = Math.sin(t / 80) * 2;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-7, 3, 3, 8 + gallop); ctx.fillRect(5, 3, 3, 8 - gallop);                              // legs
        ctx.beginPath(); ctx.ellipse(1, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();                          // body
        ctx.beginPath(); ctx.ellipse(-11, -7, 5, 6, -0.4, 0, Math.PI * 2); ctx.fill();                     // head
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.lineTo(-17, -22); ctx.lineTo(-10, -13); ctx.fill();   // golden horn
        ['#FF4466', '#FFAA22', '#FFEE33', '#44DD66', '#44AAFF', '#AA66FF'].forEach((c, i) => {           // rainbow mane + tail
            ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-7 + i * 1.2, -10 + i * 2, 2.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12 + i * 0.8, -2 + i * 1.6 + Math.sin(t / 150 + i) * 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-12, -8, 1.3, 0, Math.PI * 2); ctx.fill();
    } else if (id === 'trex') {
        const stomp = Math.sin(t / 100) * 2;
        ctx.strokeStyle = '#4A8A3A'; ctx.lineWidth = 6; ctx.lineCap = 'round';                              // tail
        ctx.beginPath(); ctx.moveTo(8, 2); ctx.quadraticCurveTo(18, 4, 22, -4); ctx.stroke();
        ctx.fillStyle = '#3A7A2A'; ctx.fillRect(-4, 6, 4, 7 + stomp); ctx.fillRect(4, 6, 4, 7 - stomp);    // big legs
        ctx.fillStyle = '#5AAA4A'; ctx.beginPath(); ctx.ellipse(2, 0, 10, 9, 0, 0, Math.PI * 2); ctx.fill();   // body
        ctx.beginPath(); ctx.ellipse(-9, -10, 9, 7, -0.2, 0, Math.PI * 2); ctx.fill();                     // huge head
        ctx.fillStyle = '#3A7A2A'; ctx.fillRect(-6, 0, 4, 2); ctx.fillRect(-6, 3, 3, 2);                     // tiny arms!
        ctx.fillStyle = '#FFF'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-16 + k * 3, -6); ctx.lineTo(-15 + k * 3, -3); ctx.lineTo(-14 + k * 3, -6); ctx.fill(); }   // teeth
        ctx.fillStyle = '#FFEE33'; ctx.beginPath(); ctx.arc(-9, -13, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(-9.5, -14, 1, 2.5);
    } else if (id === 'dragon') {
        const flap = Math.sin(t / 100) * 4;
        ctx.fillStyle = '#2E8B3E';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(8, -16 - flap); ctx.lineTo(12, -3); ctx.fill();   // wing
        ctx.strokeStyle = '#44BB55'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(9, 2); ctx.quadraticCurveTo(16, 4, 18, -2); ctx.stroke();           // tail
        ctx.fillStyle = '#44BB55';
        ctx.beginPath(); ctx.ellipse(2, 1, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFCC66';
        ctx.beginPath(); ctx.ellipse(1, 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();                        // belly
        ctx.fillStyle = '#44BB55';
        ctx.beginPath(); ctx.arc(-9, -5, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFAA22';
        ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-8, -16); ctx.lineTo(-6, -11); ctx.fill();    // horn
        ctx.fillStyle = '#FFEE33'; ctx.fillRect(-12, -7, 3, 3);
        ctx.fillStyle = '#000'; ctx.fillRect(-11, -7, 1, 3);
    }
    ctx.restore();
}

function drawPet() {
    if (state.activePet < 0 || state.gamePhase !== 'playing') return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 10, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const hop = state.danceTimer > 0 ? Math.abs(Math.sin(state.danceTimer / 4)) * 8 : pet.stomp > 0 ? Math.sin(pet.stomp / 15 * Math.PI) * 12 : 0;
    const lv = petLevel(), petId = PETS[state.activePet].id;
    const grow = petId === 'dragon' ? 1 + (lv - 1) * 0.2 : 1;   // 🐉 your dragon grows up as it levels up!
    drawPetShape(petId, pet.x, pet.y - hop, grow, pet.face);
    const costume = PET_COSTUMES.find(c => c.id === state.petCostume);
    if (costume) { ctx.save(); ctx.font = '13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(costume.icon, pet.x, pet.y - hop - 13 * grow); ctx.restore(); }
    if (lv > 1) { ctx.fillStyle = '#FFE066'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('★'.repeat(lv - 1), pet.x, pet.y - 22 - hop); }
}

// ── DRAW: PROJECTILES ─────────────────────────────────────────
// Each power looks like the real thing: ice shards, fireballs, crackling lightning, water drops
function drawProjectiles() {
    const t = Date.now();
    for (const p of projectiles) {
        const a = Math.atan2(p.dy, p.dx);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(a);
        if (p.pierce) ctx.scale(2.2, 2.2);   // charge shots are HUGE
        if (p.power === POWER.ICE) {
            // Pointy ice crystal
            ctx.shadowColor = '#AEE4FF'; ctx.shadowBlur = 12;
            const g = ctx.createLinearGradient(-10, -4, 8, 4);
            g.addColorStop(0, '#E8F8FF'); g.addColorStop(1, '#4A9AE8');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-2, -5); ctx.lineTo(-10, 0); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, 0); ctx.stroke();
        } else if (p.power === POWER.BRIMSTONE) {
            // Flickering fireball
            const flick = 1 + Math.sin(t / 30 + p.x) * 0.15;
            const g = ctx.createRadialGradient(2, 0, 1, 0, 0, 10 * flick);
            g.addColorStop(0, '#FFFBD0'); g.addColorStop(0.35, '#FFB020'); g.addColorStop(0.75, '#FF4A00'); g.addColorStop(1, 'rgba(180,20,0,0)');
            ctx.fillStyle = g; ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.ellipse(-2, 0, 11 * flick, 8 * flick, 0, 0, Math.PI * 2); ctx.fill();
        } else if (p.power === POWER.LIGHTNING) {
            // Crackling spark bolt
            ctx.strokeStyle = '#FFFFFF'; ctx.shadowColor = '#FFE033'; ctx.shadowBlur = 16; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(-14, 0);
            for (let k = 1; k <= 4; k++) ctx.lineTo(-14 + k * 7, (Math.random() - 0.5) * 8);
            ctx.stroke();
            ctx.fillStyle = '#FFF7B0'; ctx.beginPath(); ctx.arc(10, 0, 4, 0, Math.PI * 2); ctx.fill();
        } else if (p.power === POWER.WATER) {
            // Water droplet with a shine
            const g = ctx.createRadialGradient(2, -2, 1, 0, 0, 10);
            g.addColorStop(0, '#E6FBFF'); g.addColorStop(0.5, '#4AC8E8'); g.addColorStop(1, '#1A7AB0');
            ctx.fillStyle = g; ctx.shadowColor = '#66DDFF'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-2, -8, 6, -6); ctx.arc(4, 0, 6, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-2, 8, -12, 0); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(5, -2.5, 1.8, 0, Math.PI * 2); ctx.fill();
        } else {
            // Rainbow orb
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
            g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, p.color); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.shadowColor = p.color; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// Little trail left behind each shot
function spawnShotTrail(p) {
    const trail = {
        [POWER.ICE]:       { color: '#DDF4FF', r: 1.5, dy: 0 },
        [POWER.BRIMSTONE]: { color: Math.random() < 0.5 ? '#FF8A20' : 'rgba(90,90,90,0.8)', r: 3, dy: -0.6 },   // flames + smoke
        [POWER.LIGHTNING]: { color: '#FFF3A0', r: 1.5, dy: 0 },
        [POWER.WATER]:     { color: '#9EE6FF', r: 2, dy: 0.5 },
    }[p.power] || { color: p.color, r: 2.5, dy: 0 };
    particles.push({ x: p.x - p.dx * 0.5, y: p.y - p.dy * 0.5, dx: (Math.random() - 0.5) * 0.8, dy: trail.dy + (Math.random() - 0.5) * 0.8,
                     life: 14, maxLife: 14, color: trail.color, r: trail.r + Math.random() * 1.5 });
}

// Zig-zag chain-lightning bolts
function drawBolts() {
    for (const b of bolts) {
        ctx.save();
        ctx.globalAlpha = b.life / 12;
        ctx.strokeStyle = Math.random() < 0.5 ? '#FFFFFF' : (b.color || '#FFE033');
        ctx.shadowColor = '#FFE033'; ctx.shadowBlur = 14; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1);
        const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) || 1;
        const nx = -(b.y2 - b.y1) / len, ny = (b.x2 - b.x1) / len;
        for (let k = 1; k < 6; k++) {
            const j = (Math.random() - 0.5) * 18;
            ctx.lineTo(b.x1 + (b.x2 - b.x1) * k / 6 + nx * j, b.y1 + (b.y2 - b.y1) * k / 6 + ny * j);
        }
        ctx.lineTo(b.x2, b.y2); ctx.stroke();
        ctx.restore();
    }
}

function drawHeartPickups() {
    for (const h of heartPickups) {
        if (h.life < 120 && Math.floor(Date.now() / 120) % 2) continue;   // blinks before vanishing
        ctx.save();
        ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FF3355'; ctx.shadowColor = '#FF3355'; ctx.shadowBlur = 10;
        ctx.fillText('❤', h.x, h.y + Math.sin(Date.now() / 200 + h.x) * 3);
        ctx.restore();
    }
}

function drawEnemyProjectiles() {
    for (const p of enemyProjectiles) {
        ctx.save();
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
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

