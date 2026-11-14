// ── SCHOOLS: the Teacher lets you pick one. Hogwarts only lets you in if you're lucky! ──
const HOGWARTS_LETTER_COST   = 10;
const HOGWARTS_LETTER_CHANCE = 0.1;    // only 1 in 10 tries an owl brings your letter
function schoolItems() {
    return [
        { icon: '🏫', name: 'Town School', desc: 'Learn handy lessons', cost: 0, status: null,
          action: () => openMenu('🏫 SCHOOL — learn something new!', lessonItems) },
        { icon: '🏰', name: 'Hogwarts', desc: state.hogwarts ? 'Learn magic spells!' : 'Only if an owl brings your letter…',
          cost: state.hogwarts ? 0 : HOGWARTS_LETTER_COST, status: state.hogwarts ? 'YOU GO HERE' : null,
          action: () => {
              if (state.hogwarts) { openMenu('🏰 HOGWARTS', hogwartsItems); return; }
              if (!spend(HOGWARTS_LETTER_COST)) return;
              if (Math.random() >= HOGWARTS_LETTER_CHANCE) { showToast('🦉 No letter this time… the owl got lost! Try again!', '#CCBBFF', 180); return; }
              state.hogwarts = true; giveAward('hogwarts'); sfx('found');
              spawnParticles(player.x, player.y, '#FFD700', 30);
              showToast('🦉📜 A LETTER! You got into HOGWARTS! You are a WIZARD!', '#FFD700', 260);
              openMenu('🏰 HOGWARTS', hogwartsItems);
          } },
    ];
}
const HOUSES = [
    { id: 'gryffindor', icon: '🦁', name: 'Gryffindor', color: '#E0503A', bonus: 'Brave: stronger weapons', give: () => { state.weaponLevel++; } },
    { id: 'slytherin',  icon: '🐍', name: 'Slytherin',  color: '#3ABF6A', bonus: 'Sneaky: run faster',      give: () => {} },
    { id: 'ravenclaw',  icon: '🦅', name: 'Ravenclaw',  color: '#4A90E0', bonus: 'Clever: spells recharge faster', give: () => {} },
    { id: 'hufflepuff', icon: '🦡', name: 'Hufflepuff', color: '#F0C030', bonus: 'Kind: healing + a Shield Bubble', give: () => { state.lessons.healing = true; state.bubble = true; } },
];
function houseInfo() { return HOUSES.find(h => h.id === state.house); }
function sortingHat() {
    const h = HOUSES[Math.floor(Math.random() * HOUSES.length)];
    state.house = h.id; h.give(); giveAward('sorted'); sfx('found');
    spawnParticles(player.x, player.y, h.color, 30);
    showToast(`🎩 Hmm… let me see… ${h.icon} ${h.name.toUpperCase()}! (${h.bonus})`, h.color, 300);
}
function hogwartsItems() {
    const h = houseInfo();
    return [
        { icon: '🎩', name: 'The Sorting Hat', desc: h ? `${h.icon} ${h.name}: ${h.bonus}` : 'Which house will you be in?', cost: 0,
          status: h ? h.name.toUpperCase() : 'TRY IT ON!', action: () => { if (!h) sortingHat(); } },
        { icon: '🪄', name: 'Spell Class',   desc: 'Learn magic spells',        cost: 0, status: null, action: () => openMenu('🪄 SPELL CLASS', spellClassItems) },
        { icon: '🧪', name: 'Potion Class',  desc: 'Mix potions from blocks',   cost: 0, status: null, action: () => openMenu('🧪 POTION CLASS', potionItems) },
        { icon: '🧹', name: 'Broomstick',    desc: 'Fly over everything!',      cost: 40,
          status: state.mount === 'broom' ? 'RIDING' : state.mounts.broom ? 'OWNED — ride' : null,
          action: () => {
              if (!state.mounts.broom && !spend(40)) return;
              state.mounts.broom = true; state.mount = 'broom'; state.lastMount = 'broom'; menu = null;
              showToast('🧹 Up you go! Fly over walls and lava!', '#CCAAFF', 180);
          } },
        { icon: '🏁', name: 'Broomstick Race', desc: 'Fly through all the rings!', cost: 0, status: 'GO!',
          action: () => { menu = null; if (state.mounts.broom) { state.mount = 'broom'; state.lastMount = 'broom'; } startRingRace(); } },
        { icon: '⚔', name: 'Wizard Duel',   desc: 'Fight the Evil Wizard!',    cost: 0, status: 'DUEL!', action: () => { menu = null; startWizardDuel(); } },
        { icon: '🪄', name: 'Wand Shop',     desc: wandInfo().id === 'oak' ? 'Pick a magic wand' : `Your wand: ${wandInfo().name}`, cost: 0, status: null, action: () => openMenu('🪄 THE WAND SHOP', wandItems) },
        { icon: '🐣', name: 'Magic Creatures', desc: state.creature ? `Look after your ${creatureInfo().name}` : 'Adopt a magic creature', cost: 0, status: null, action: () => openMenu('🐣 MAGIC CREATURES', creatureItems) },
        { icon: '🟡', name: 'Catch the Snitch', desc: 'Catch the speedy golden ball!', cost: 0, status: 'GO!', action: () => { menu = null; startSnitch(); } },
        { icon: '♟', name: 'Wizard Chess',  desc: 'Giant chess pieces come alive!', cost: 0, status: 'PLAY!', action: () => { menu = null; changeRoom(ROOM.CHESS); showToast('♟ WIZARD CHESS! Beat every piece — the Queen is the boss!', '#FFE066', 220); } },
        { icon: '📚', name: 'Haunted Library', desc: 'Flying books… and a secret spell book', cost: 0, status: 'ENTER', action: () => { menu = null; changeRoom(ROOM.LIBRARY); showToast('📚 Shhh… the books are ALIVE!', '#CCAAFF', 200); } },
    ];
}
function startWizardDuel() {
    const list = state.room === ROOM.PARADISE ? paradise.ambushers : spawnList();
    const w = e0('wizard', Math.min(740, player.x + 220), Math.max(120, player.y - 80), { r: 26, coinDrop: 30, teleTimer: 150, spellTimer: 100, emerge: 0 });
    w.hp = w.maxHp = 20;
    list.push(w);
    showToast(`⚔ WIZARD DUEL! Use your spells! (${byInput('R', '✨', 'X')})`, '#CC99FF', 200); sfx('laugh');
}

// 🧪 Potions: mix blocks you've mined
const POTIONS = [
    { icon: '👻', name: 'Invisibility', need: { glass: 3, leaves: 2 }, desc: 'Monsters can\'t hurt you', drink: () => { state.invisible = 600; } },
    { icon: '🦍', name: 'Giant Potion', need: { stone: 4, log: 2 },    desc: 'Grow HUGE and stomp',     drink: () => { state.giant = 900; state.tiny = 0; } },
    { icon: '🐜', name: 'Tiny Potion',  need: { leaves: 3, dirt: 2 },  desc: 'Shrink and run super fast', drink: () => { state.tiny = 900; state.giant = 0; } },
    { icon: '❤', name: 'Healing',      need: { leaves: 2, glass: 1 }, desc: 'All your hearts back',    drink: () => { state.playerHp = fullHearts(); } },
    { icon: '⚡', name: 'Speed Potion', need: { planks: 2, dirt: 3 },  desc: 'Zoom for 10 seconds',     drink: () => { godSpeedTimer = 600; } },
];
function potionItems() {
    const has = need => settings.creative || Object.entries(need).every(([k, v]) => invCount(k) >= v);
    const needText = need => Object.entries(need).map(([k, v]) => `${v} ${BLOCKS[k].name}`).join(' + ');
    return POTIONS.map(p => ({
        icon: p.icon, name: p.name, desc: `${p.desc} · ${needText(p.need)}`, cost: 0, status: has(p.need) ? 'MIX IT!' : null,
        action: () => {
            if (!has(p.need)) { showToast(`🧪 You need ${needText(p.need)} (mine some!)`, '#FFAA88', 150); sfx('hurt'); return; }
            if (!settings.creative) for (const [k, v] of Object.entries(p.need)) state.inv[k] -= v;
            p.drink(); menu = null; giveAward('potion'); sfx('magic');
            spawnParticles(player.x, player.y, '#AA66FF', 20);
            showToast(`${p.icon} Gulp! ${p.name}!`, '#CC99FF', 150);
        },
    }));
}

function spellClassItems() {
    return SPELLS.filter(sp => sp.school).map(sp => ({
        icon: sp.icon, name: sp.name, desc: sp.desc, cost: sp.cost,
        status: state.spell === sp.id ? 'HOLDING' : state.spells[sp.id] ? 'LEARNED — pick' : null,
        action: () => {
            if (state.spells[sp.id]) { state.spell = sp.id; return; }
            if (spend(sp.cost)) { state.spells[sp.id] = true; state.spell = sp.id; showToast(`${sp.icon} You learned ${sp.name}! Cast it with ${byInput('R', '✨', 'X')}`); giveAward('wizard'); }
        },
    }));
}

function lessonItems() {
    return LESSONS.map(l => ({
        icon: l.icon, name: l.name, desc: l.desc, cost: l.cost, status: state.lessons[l.id] ? 'LEARNED' : null,
        action: () => {
            if (state.lessons[l.id]) return;
            if (spend(l.cost)) { state.lessons[l.id] = true; showToast(`🎓 You learned ${l.name}!`); giveAward('student'); }
        },
    }));
}

function hatItems() {
    return [
        ...HATS.map(h => ({
            icon: h.icon, name: h.name, desc: state.hat === h.id ? 'You are wearing it!' : 'Looks great on you', cost: h.cost,
            status: state.hat === h.id ? 'WEARING' : state.hats[h.id] ? 'OWNED — wear' : null,
            action: () => {
                if (state.hats[h.id]) { state.hat = state.hat === h.id ? null : h.id; return; }
                if (spend(h.cost)) { state.hats[h.id] = true; state.hat = h.id; showToast(`${h.icon} Looking good in your ${h.name}!`); giveAward('hat'); }
            },
        })),
        { icon: '🐾', name: 'Pet Costumes', desc: 'Dress up your pet!', cost: 0, status: 'LOOK →', action: () => openMenu('🐾 PET COSTUMES', petCostumeItems) },
        { icon: '🦸', name: 'Super Hero Suit', desc: 'A cape! Fly over walls and run faster', cost: 100,
          status: state.heroSuit === 'on' ? 'WEARING' : state.heroSuit ? 'OWNED — wear' : null,
          action: () => {
              if (state.heroSuit) { state.heroSuit = state.heroSuit === 'on' ? 'off' : 'on'; return; }
              if (spend(100)) { state.heroSuit = 'on'; giveAward('superhero'); showToast('🦸 SUPER HERO! You can fly over walls now!', '#FF4444', 200); }
          } },
    ];
}
const PET_COSTUMES = [
    { id: 'tophat',  icon: '🎩', name: 'Top Hat',     cost: 10 },
    { id: 'crown',   icon: '👑', name: 'Tiny Crown',  cost: 25 },
    { id: 'bow',     icon: '🎀', name: 'Pink Bow',    cost: 8  },
    { id: 'shades',  icon: '🕶', name: 'Cool Shades', cost: 12 },
    { id: 'party',   icon: '🥳', name: 'Party Face',  cost: 10 },
    { id: 'wizard',  icon: '🧙', name: 'Wizard Look', cost: 20 },
];
function petCostumeItems() {
    return [{ icon: '❌', name: 'No costume', desc: 'Just your pet', cost: 0, status: state.petCostume ? null : 'WEARING', action: () => { state.petCostume = null; } },
        ...PET_COSTUMES.map(c => ({ icon: c.icon, name: c.name, desc: 'Your pet will look AMAZING', cost: c.cost,
            status: state.petCostume === c.id ? 'WEARING' : state.petCostumes[c.id] ? 'OWNED — wear' : null,
            action: () => {
                if (state.petCostumes[c.id]) { state.petCostume = c.id; return; }
                if (spend(c.cost)) { state.petCostumes[c.id] = true; state.petCostume = c.id; giveAward('petCostume'); showToast(`${c.icon} Your pet looks so cute!`, '#FFE066', 150); }
            } }))];
}

// Crafting recipes: turn what you've mined into new things
function craftItems() {
    const has = (need) => settings.creative || Object.entries(need).every(([k, v]) => invCount(k) >= v);
    const take = (need) => { if (!settings.creative) for (const [k, v] of Object.entries(need)) state.inv[k] -= v; };
    const needText = (need) => Object.entries(need).map(([k, v]) => `${v} ${MATERIALS[k] || BLOCKS[k].name}`).join(' + ');
    const recipe = (icon, name, need, give, doneIf, extraDesc) => ({
        icon, name, desc: `${needText(need)}${extraDesc ? ' — ' + extraDesc : ''}`,
        cost: 0, status: doneIf && doneIf() ? 'DONE' : has(need) ? 'CRAFT!' : null,
        action: () => {
            if (doneIf && doneIf()) return;
            if (!has(need)) { showToast(`You need ${needText(need)}`, '#FF9988', 120); sfx('hurt'); return; }
            take(need); give(); sfx('found');
            giveAward('crafter');
        },
    });
    const add = (k, n) => () => { state.inv[k] = invCount(k) + n; showToast(`⚒ Crafted ${n} ${BLOCKS[k].name}!`); };
    return [
        recipe('🪵', '4 Planks', { log: 1 }, add('planks', 4)),
        recipe('🧱', '4 Bricks', { stone: 2 }, add('brick', 4)),
        recipe('🪟', '2 Glass', { stone: 1, leaves: 1 }, add('glass', 2)),
        recipe('💥', '2 TNT', { stone: 2, log: 1 }, add('tnt', 2)),
        recipe('⛏', 'Diamond Pickaxe', { diamond: 3, log: 2 }, () => { state.diamondPickaxe = true; showToast('⛏ DIAMOND PICKAXE — mine anything in one hit!'); },
               () => state.diamondPickaxe, 'mine in 1 hit'),
        recipe('🗡', 'Diamond Sword', { diamond: 2, log: 1 }, () => { state.weaponLevel = Math.min(3, state.weaponLevel + 1); showToast(`🗡 Weapon Level ${state.weaponLevel}!`); },
               () => state.weaponLevel >= 3, '+1 weapon level'),
        recipe('🛡', 'Iron Armor', { iron: 5 }, () => { state.armor = Math.max(state.armor, 1); state.playerHp++; showToast('🛡 IRON ARMOR — +1 heart!'); },
               () => state.armor >= 1, '+1 heart'),
        recipe('💠', 'Diamond Armor', { diamond: 5 }, () => { const was = state.armor; state.armor = 2; state.playerHp += 2 - was; showToast('💠 DIAMOND ARMOR — +2 hearts!'); },
               () => state.armor >= 2, '+2 hearts'),
        recipe('🟫', 'Blocky Outfit', { planks: 3, dirt: 2 }, () => { state.unlockedSkins[8] = true; state.activeSkin = 8; showToast('🟫 You look BLOCKY now!'); },
               () => state.unlockedSkins[8], 'a Minecraft look'),
    ];
}

// What the Blacksmith sells
function forgeItems() {
    const items = [];
    const ammoCost = AMMO_UPGRADE_COST[state.ammoBonus];
    items.push({ icon: '🎒', name: 'Bigger Ammo Bag', desc: `+1 ammo (you carry ${state.ammoMax})`, cost: ammoCost,
                 status: ammoCost === undefined ? 'MAXED' : null,
                 action: () => { if (ammoCost !== undefined && spend(ammoCost)) { state.ammoBonus++; state.ammoMax++; state.ammo = state.ammoMax; showToast(`CLANG! You carry ${state.ammoMax} ammo now!`); } } });
    const lvCost = WEAPON_LEVEL_COST[state.weaponLevel];
    items.push({ icon: '⚔', name: `Weapon Level ${Math.min(3, state.weaponLevel + 1)}`, desc: `Every shot hits harder (now Lv ${state.weaponLevel})`, cost: lvCost,
                 status: lvCost === undefined ? 'MAXED' : null,
                 action: () => { if (lvCost !== undefined && spend(lvCost)) { state.weaponLevel++; showToast(`⚔ WEAPON LEVEL ${state.weaponLevel}!`); } } });
    items.push({ icon: '🟨', name: 'Gold Armor', desc: '+1 heart', cost: 30, status: state.armor >= 1 ? 'OWNED' : null,
                 action: () => { if (state.armor < 1 && spend(30)) { state.armor = 1; state.playerHp++; showToast('🟨 GOLD ARMOR — +1 heart!'); } } });
    items.push({ icon: '🌈', name: 'Rainbow Armor', desc: '+4 hearts — the best armor!', cost: 150, status: state.armor >= 4 ? 'OWNED' : null,
                 action: () => { if (state.armor < 4 && spend(150)) { const was = state.armor; state.armor = 4; state.playerHp += 4 - was; showToast('🌈 RAINBOW ARMOR — +4 hearts!'); } } });
    items.push({ icon: '🎾', name: 'Bouncy Shots', desc: 'Your shots bounce off the walls', cost: 20, status: state.bouncy ? 'OWNED' : null,
                 action: () => { if (!state.bouncy && spend(20)) { state.bouncy = true; showToast('🎾 Boing! Your shots bounce now!'); } } });
    items.push({ icon: '💨', name: 'Super Dash', desc: 'Zoom super fast (Shift / LT)', cost: DASH_COST,
                 status: state.hasDash ? 'OWNED' : null,
                 action: () => { if (!state.hasDash && spend(DASH_COST)) { state.hasDash = true; showToast('💨 You can DASH now!'); } } });
    items.push({ icon: '🗡', name: 'Fighting Weapons →', desc: 'Sword, hammer, nunchucks, spear, whip', cost: 0,
                 status: state.melee ? MELEE_WEAPONS.find(m => m.id === state.melee).name.toUpperCase() : 'LOOK →',
                 action: () => openMenu("🗡 THE BLACKSMITH'S WEAPONS", meleeItems) });
    items.push({ icon: '🏹', name: 'Gadgets & Toys →', desc: 'Bombs, bows, water guns, banana peels…', cost: 0,
                 status: state.gadget ? GADGETS.find(g => g.id === state.gadget).name.toUpperCase() : 'LOOK →',
                 action: () => openMenu('🏹 GADGETS & TOYS', gadgetItems) });
    return items;
}

const GADGETS_PER_PAGE = 10;
function gadgetItems(page = 0) {
    const items = GADGETS.slice(page * GADGETS_PER_PAGE, (page + 1) * GADGETS_PER_PAGE).map(g => {
        const owned = state.ownedGadgets[g.id];
        return { icon: g.icon, name: g.name, desc: g.desc, cost: g.cost,
                 status: state.gadget === g.id ? 'HOLDING' : owned ? 'OWNED — pick' : null,
                 action: () => {
                     if (owned) { state.gadget = g.id; return; }
                     if (spend(g.cost)) { state.ownedGadgets[g.id] = true; state.gadget = g.id; showToast(`${g.icon} ${g.name}! Use it with ${byInput('Q', '⚙', 'B')}`); }
                 } };
    });
    if (GADGETS.length > (page + 1) * GADGETS_PER_PAGE)
        items.push({ icon: '➡', name: 'More gadgets', desc: 'Even more cool stuff!', cost: 0, status: 'NEXT', action: () => openMenu('🏹 MORE GADGETS', () => gadgetItems(page + 1)) });
    items.push({ icon: '⬅', name: 'Back', desc: 'Back to the Forge', cost: 0, status: 'BACK', action: () => openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems) });
    return items;
}

function meleeItems() {
    const items = [{ icon: '👊', name: 'Just Fists', desc: 'Punch, punch, KICK!', cost: 0, status: state.melee ? 'PICK' : 'HOLDING',
                     action: () => { state.melee = null; } }];
    for (const m of MELEE_WEAPONS) {
        const owned = state.ownedMelee[m.id];
        items.push({ icon: m.icon, name: m.name, desc: m.desc, cost: m.cost,
                     status: state.melee === m.id ? 'HOLDING' : owned ? 'OWNED — pick' : null,
                     action: () => {
                         if (owned) { state.melee = m.id; return; }
                         if (spend(m.cost)) {
                             state.ownedMelee[m.id] = true; state.melee = m.id; giveAward('weaponMaster');
                             if (m.id === 'lightsaber') state.saberColor = Math.floor(Math.random() * SABER_COLORS.length);
                             showToast(`${m.icon} ${m.name.toUpperCase()}! Swing it with ${byInput('J', '👊', 'RB')}`);
                         }
                     } });
    }
    items.push({ icon: '🪞', name: 'Mirror Shield', desc: 'Blocking bounces bullets back at monsters!', cost: 50, status: state.mirrorShield ? 'OWNED' : null,
                 action: () => { if (!state.mirrorShield && spend(50)) { state.mirrorShield = true; showToast(`🪞 MIRROR SHIELD! Block (${byInput('X', '🛡', 'LB')}) to bounce bullets back!`, '#AADDFF', 220); } } });
    items.push({ icon: '⬅', name: 'Back', desc: 'Back to the Forge', cost: 0, status: 'BACK', action: () => openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems) });
    return items;
}

function drawMenu() {
    if (!menu) return;
    const { X, Y, W } = MENU, H = menu.h;
    ctx.save();
    ctx.fillStyle = 'rgba(12,8,24,0.97)'; ctx.fillRect(X, Y, W, H);
    ctx.strokeStyle = '#FFB347'; ctx.lineWidth = 2; ctx.strokeRect(X, Y, W, H);
    ctx.fillStyle = '#FFB347'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
    ctx.fillText(menu.title, 400, Y + 26);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px Arial';
    const costs = menu.items().some(it => it.cost > 0);   // the coin count only matters where something costs coins
    const keysHint = costs ? byInput('Arrows + SPACE (or click) to buy, E to close', 'Tap to buy, ✕ to close', 'A to buy, B to close')
                           : byInput('Arrows + SPACE (or click) to choose, E to close', 'Tap to choose, ✕ to close', 'A to choose, B to close');
    ctx.fillText(menu.hint || (costs ? `Your coins: 🪙${state.coins}   ·   ${keysHint}` : keysHint), 400, Y + 44);
    ctx.beginPath(); ctx.arc(MENU_CLOSE.x, MENU_CLOSE.y, MENU_CLOSE.r, 0, Math.PI * 2);   // ✕ close button
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill(); ctx.strokeStyle = '#FFB347'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    for (const dir of [-1, 1]) { ctx.moveTo(MENU_CLOSE.x - 6, MENU_CLOSE.y - 6 * dir); ctx.lineTo(MENU_CLOSE.x + 6, MENU_CLOSE.y + 6 * dir); }
    ctx.stroke();
    menu.items().forEach((it, i) => {
        const r = menuItemRect(i);
        const cursor = i === menu.cursor && lastInput !== 'touch';
        ctx.fillStyle = it.status ? 'rgba(255,215,0,0.14)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = cursor ? '#FFFFFF' : it.status ? '#C8A040' : '#444'; ctx.lineWidth = cursor ? 2.5 : 1;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        if (menu.wide) {   // icon, a bold name, then the wrapped text under it
            ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFF';
            ctx.fillText(it.icon, r.x + 28, r.y + r.h / 2 + 8);
            ctx.textAlign = 'left'; ctx.fillStyle = '#FFE8B0'; ctx.font = 'bold 14px Arial';
            ctx.fillText(it.name, r.x + MENU_WIDE.TEXT_X, r.y + 17);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '12px Arial';
            wideDescLines(it).forEach((line, k) => ctx.fillText(line, r.x + MENU_WIDE.TEXT_X, r.y + MENU_WIDE.HEAD + 11 + k * MENU_WIDE.LINE));
            return;
        }
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#FFF';
        ctx.fillText(it.icon, r.x + 28, r.y + r.h / 2 + 8);
        ctx.textAlign = 'left';
        const tx = r.x + 54, tw = r.w - 58, off = (r.h - 54) / 2;
        ctx.font = '12px Arial';
        const desc = wrapText(it.desc, tw, 2), two = desc.length > 1;   // a long description takes two lines
        ctx.fillStyle = '#FFE8B0'; fitText(it.name, tx, r.y + off + (two ? 13 : 19), tw, two ? 13 : 14, true);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
        desc.forEach((line, k) => ctx.fillText(line, tx, r.y + off + (two ? 26 : 34) + k * 12, tw));
        ctx.fillStyle = it.status ? '#FFD700' : state.coins >= (it.cost || 0) ? '#FFD700' : '#886';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(it.status ? '✓ ' + it.status : it.cost ? `🪙${it.cost}` : '', tx, r.y + off + (two ? 51 : 50), tw);
    });
    ctx.restore();
}

// ── UPDATE: PARADISE TOWN ─────────────────────────────────────
function houseDoors() {
    return BUILDINGS.filter(b => b.cost).map(b => ({ id: b.id, door: true, name: b.name, x: b.x, y: b.y + 40, cost: b.cost }));
}

function townNpcs() {
    return [...WORKERS, ...paradise.villagers, ...houseDoors(), CRAFTING_TABLE];
}

function personName(id) {
    const p = [...WORKERS, ...VILLAGERS].find(n => n.id === id);
    return p ? p.name : id;
}

// The townsperson you're standing next to (only in the daytime — at night they hide indoors)
function nearbyNpc() {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day') return null;
    let best = null, bestD = TALK_RANGE;
    for (const n of townNpcs()) {
        const d = Math.hypot(player.x - n.x, player.y - n.y);
        if (d < bestD) { best = n; bestD = d; }
    }
    return best;
}

function jobDone(job = state.job) {
    return job && job.count !== undefined && job.got >= job.count;
}

// What the job line at the bottom of the screen says
function jobText() {
    const j = state.job;
    if (!j) return '';
    if (j.kind === 'deliver') return `Deliver ${j.item} to ${personName(j.stops[0])}${j.stops.length > 1 ? ` (+${j.stops.length - 1} more)` : ''}`;
    if (jobDone(j))           return `Done! Go back to the ${personName(j.giver)} to get paid`;
    return `${j.text} (${j.got}/${j.count})`;
}

// Each job giver has their own kind of job — the harder ones pay more
function makeJob(giver) {
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const people = [...WORKERS.map(w => w.id), ...VILLAGERS.map(v => v.id)].filter(id => id !== giver)
        .sort(() => Math.random() - 0.5);
    if (giver === 'baker')  return { giver, kind: 'deliver', stops: people.slice(0, 3), item: '🎂', text: 'Deliver 3 cakes', pay: 15 };
    if (giver === 'farmer') return { giver, kind: 'water', count: 6, got: 0, item: '💧', text: 'Water 6 thirsty crops', pay: 12 };
    if (giver === 'fisher') return { giver, kind: 'fish',  count: 3, got: 0, item: '🎣', text: 'Catch 3 fish at the pier', pay: 15 };
    if (Math.random() < 0.5) {
        return { giver, kind: 'deliver', stops: [people[0]], item: pick(['💌', '📦', '🌷']), text: `Take this to ${personName(people[0])}`, pay: 6 };
    }
    return { giver, kind: 'apples', count: 5, got: 0, item: '🍎', text: 'Pick 5 apples', pay: 10 };
}

function startJob(job) {
    state.job = job;
    if (job.kind === 'apples') {
        paradise.apples = [];
        for (let i = 0; i < job.count; i++) {
            paradise.apples.push(reachablePoint(60 + Math.random() * 680, 260 + Math.random() * 170));
        }
    }
    if (job.kind === 'water') {
        const crops = [...paradise.crops].sort(() => Math.random() - 0.5);
        crops.forEach((c, i) => { c.thirsty = i < job.count; });
    }
}

// A saved job comes back only if it is whole; startJob() puts the apples and thirsty crops back in the town
const JOB_KINDS = ['deliver', 'water', 'fish', 'apples'];
function restoreJob() {
    const j = state.job;
    const ok = j && typeof j === 'object' && JOB_KINDS.includes(j.kind) && typeof j.giver === 'string' && Number.isFinite(j.pay)
               && (j.kind === 'deliver' ? Array.isArray(j.stops) && j.stops.length > 0 : Number.isFinite(j.count) && Number.isFinite(j.got));
    if (!ok) { state.job = null; return; }
    startJob(j);
}

// What pressing the button will do, shown above the townsperson
function talkLabel(n) {
    const job = state.job, maxHp = fullHearts();
    if (job && job.kind === 'deliver' && job.stops[0] === n.id) return `Deliver ${job.item}`;
    if (n.door)            return state.housesOwned[n.id] ? 'Go inside 🏠' : `Buy ${n.name} (🪙${n.cost})`;
    if (n.table)           return 'Craft things ⚒';
    if (n.id === 'teacher') return 'Pick a School 🏫';
    if (n.id === 'hattie')  return 'Buy a hat 🎩';
    if (n.id === 'captain') return 'Set sail! ⛵';
    if (paradise.birthday && paradise.birthday.id === n.id && !paradise.birthday.wished) return 'Say Happy Birthday! 🎂';
    if (n.id === 'doctor') return state.playerHp < maxHp ? `Heal (🪙${HEAL_COST})` : 'Talk';
    if (n.id === 'smith')  return 'Open the Forge 🔨';
    if (WORKERS.some(w => w.id === n.id && w.giver)) {
        if (!job) return 'Get a job';
        if (job.giver === n.id && jobDone(job)) return 'Get paid!';
        return 'Talk';
    }
    return 'Chat';
}

function pirateSpeak(text) {   // 🏴‍☠️ Pirate Town mod
    return 'Arr! ' + text.replace(/\byou\b/gi, 'ye').replace(/\byour\b/gi, 'yer').replace(/\bmy\b/gi, 'me').replace(/\bhello\b|\bhi\b/gi, 'Ahoy')
                             .replace(/\bis\b/gi, 'be').replace(/\bcoins\b/gi, 'doubloons').replace(/!$/, ', matey!');
}
function say(n, text) {
    if (mod('pirateTalk')) text = pirateSpeak(text);
    paradise.speech = { npc: n, text, timer: 170 };
}

function payJob(n) {
    const job = state.job;
    state.coins += job.pay;
    addScore(job.pay * 2);
    spawnFloatText(player.x, player.y - 30, `+🪙${job.pay}`, '#FFD700', 70);
    say(n, `Thank you! Here's 🪙${job.pay}!`);
    state.job = null;
    sfx('buy');
}

function talkTo(n) {
    const job = state.job, maxHp = fullHearts();
    if (job && job.kind === 'deliver' && job.stops[0] === n.id) {
        job.stops.shift();
        if (job.stops.length === 0) { payJob(n); return; }
        addScore(5);
        say(n, `Yum, thank you! ${job.stops.length} more to go!`);
        sfx('coin');
        return;
    }
    const giver = WORKERS.find(w => w.id === n.id && w.giver);

    if (n.table) { openMenu('⚒ CRAFTING TABLE', craftItems); return; }
    if (n.id === 'teacher') { openMenu('🏫 PICK A SCHOOL!', schoolItems); return; }
    if (n.id === 'hattie')  { openMenu("🎩 HATTIE'S HATS", hatItems); return; }
    if (n.id === 'captain') { openMenu('⚓ WHERE SHALL WE SAIL, MATEY?', sailItems); return; }
    if (paradise.birthday && paradise.birthday.id === n.id && !paradise.birthday.wished) {
        paradise.birthday.wished = true;
        if (state.playerHp < fullHearts()) state.playerHp++;
        addScore(50);
        spawnConfettiAt(n.x, n.y - 20);
        say(n, 'Thank you!! Have some cake! 🎂 (+1 ❤)');
        [523, 523, 587, 523, 698, 659].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, null, i * 0.28));   // Happy Birthday tune
        giveAward('party');
        return;
    }
    if (n.door) {
        const b = BUILDINGS.find(b => b.id === n.id);
        if (state.housesOwned[n.id]) {
            state.houseFrom = n.id;
            changeRoom(ROOM.HOUSE);
        } else if (state.coins < n.cost) {
            say(n, `This ${n.name.toLowerCase()} costs 🪙${n.cost}. Keep saving!`);
        } else {
            state.coins -= n.cost;
            state.housesOwned[n.id] = true;
            giveAward('house');
            if (BUILDINGS.filter(b => b.cost).every(b => state.housesOwned[b.id])) giveAward('allHouses');
            addScore(n.cost * 2);
            spawnConfettiAt(b.x, b.y);
            say(n, `The ${n.name.toLowerCase()} is YOURS! 🏠 Rest here any time.`);
            sfx('win');
        }
    } else if (n.id === 'doctor') {
        if (state.playerHp >= maxHp)       say(n, 'You look healthy to me!');
        else if (state.coins < HEAL_COST)  say(n, `Healing costs 🪙${HEAL_COST}. Come back soon!`);
        else {
            state.coins -= HEAL_COST;
            state.playerHp = maxHp;
            spawnParticles(player.x, player.y, '#FF6688', 12);
            say(n, 'All better! ❤');
            sfx('buy');
        }
    } else if (n.id === 'smith') {
        openMenu("🔨 THE BLACKSMITH'S FORGE", forgeItems);
    } else if (giver) {
        if (!job) {
            startJob(makeJob(n.id));
            say(n, `${state.job.kind === 'deliver' ? jobText() : state.job.text}! I'll pay 🪙${state.job.pay}.`);
            sfx('coin');
        } else if (job.giver === n.id && jobDone(job)) {
            payJob(n);
        } else if (job.giver === n.id) {
            say(n, `Keep going: ${jobText()}!`);
        } else {
            say(n, 'Finish your other job first, then come back!');
        }
    } else {
        say(n, VILLAGER_CHAT[Math.floor(Math.random() * VILLAGER_CHAT.length)]);
    }
}

// Returns true if the player talked to someone (so the button doesn't also shoot)
function tryTalk() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    const shop = nearMallShop();
    if (shop) { openMenu(shop.title, shop.items); return true; }
    if (nearWishAngel()) { openMenu(`✨ MAKE A WISH — ${state.heavenWishes} left`, wishItems); return true; }
    const n = nearbyNpc();
    if (!n) return false;
    talkTo(n);
    return true;
}

function nearbyCrop() {
    if (state.room !== ROOM.PARADISE || paradise.phase !== 'day' || !state.job || state.job.kind !== 'water') return null;
    return paradise.crops.find(c => c.thirsty && Math.hypot(player.x - c.x, player.y - c.y) < 22) || null;
}

function atFishingSpot() {
    return state.room === ROOM.PARADISE && paradise.phase === 'day' && state.job && state.job.kind === 'fish'
        && !jobDone() && Math.hypot(player.x - FISH_SPOT.x, player.y - FISH_SPOT.y) < 26;
}

// Watering crops and fishing
function tryTownAction() {
    if (state.gamePhase !== 'playing' || state.won || state.levelComplete) return false;
    const crop = nearbyCrop();
    if (crop) {
        crop.thirsty = false;
        state.job.got++;
        spawnParticles(crop.x, crop.y - 6, '#66CCFF', 10);
        spawnFloatText(crop.x, crop.y - 26, `💧 ${state.job.got}/${state.job.count}`, '#88DDFF');
        sfx('splash');
        return true;
    }
    if (atFishingSpot()) {
        const f = paradise.fishing;
        if (f.stage === 'idle') {
            f.stage = 'waiting'; f.timer = 60 + Math.random() * 150;
            spawnParticles(FISH_SPOT.x, FISH_SPOT.y + 16, '#AADDFF', 5);
            sfx('splash');
        } else if (f.stage === 'waiting') {
            f.stage = 'idle';
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, 'Too early! It swam away…', '#FFFFFF', 70);
        } else {
            f.stage = 'idle';
            state.job.got++;
            countStat('fish');
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, `🐟 CAUGHT ONE! ${state.job.got}/${state.job.count}`, '#FFE066', 80);
            spawnParticles(FISH_SPOT.x, FISH_SPOT.y + 10, '#88CCFF', 14);
            sfx('found');
        }
        return true;
    }
    return false;
}

function updateTown() {
    const P = paradise;
    if (P.speech && --P.speech.timer <= 0) P.speech = null;
    if (state.room !== ROOM.PARADISE) return;

    if (P.phase === 'day') {
        // Surprise monsters!
        if (state.lightCrystals < 3 && --P.ambushTimer <= 0) {
            P.ambushTimer = AMBUSH_FRAMES[0] + Math.random() * (AMBUSH_FRAMES[1] - AMBUSH_FRAMES[0]);
            if (P.ambushers.length === 0) spawnAmbush();
        }
        updateWeather();
        // Villagers stroll about the town square
        for (const v of P.villagers) {
            const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
            if (d < 3) {
                if (Math.random() < 0.01) { v.tx = 250 + Math.random() * 310; v.ty = 260 + Math.random() * 170; }
            } else if (!(P.speech && P.speech.npc === v)) {   // stands still while talking to you
                const spd = v.small ? 0.8 : 0.5;
                v.x += dx / d * spd; v.y += dy / d * spd;
                v.walk += 0.2; v.face = dx > 0 ? -1 : 1;
            }
        }
        // Apple picking
        if (state.job && state.job.kind === 'apples') {
            for (let i = P.apples.length - 1; i >= 0; i--) {
                const a = P.apples[i];
                if (Math.hypot(player.x - a.x, player.y - a.y) > 22) continue;
                P.apples.splice(i, 1);
                state.job.got++;
                spawnFloatText(a.x, a.y - 16, `🍎 ${state.job.got}/${state.job.count}`, '#FF6666');
                sfx('coin');
            }
        }
        // Fishing: wait for a bite, then be quick!
        const f = P.fishing;
        if (f.stage !== 'idle' && !atFishingSpot()) f.stage = 'idle';
        if (f.stage === 'waiting' && --f.timer <= 0) { f.stage = 'bite'; f.timer = 50; sfx('bite'); }
        else if (f.stage === 'bite' && --f.timer <= 0) {
            f.stage = 'idle';
            spawnFloatText(FISH_SPOT.x, FISH_SPOT.y - 30, 'Too slow! It got away…', '#FFFFFF', 70);
        }
    }

    // Day → dusk → Monster Night (after all 3 crystals, Paradise stays peaceful)
    if (state.lightCrystals >= 3) return;
    if (P.phase === 'day' && --P.timer <= 0) {
        P.phase = 'dusk'; P.timer = DUSK_FRAMES; P.weather = 'sun';
        P.speech = null;
        sfx('nightfall');
    } else if (P.phase === 'dusk' && --P.timer <= 0) {
        P.phase = 'night';
        // Not every night brings monsters — but never two quiet nights in a row
        P.quiet = !P.lastQuiet && Math.random() > NIGHT_MONSTER_CHANCE;
        P.lastQuiet = P.quiet;
        if (P.quiet) { P.timer = QUIET_NIGHT_FRAMES; showToast('🌙 A quiet night… no monsters tonight!', '#AABBFF'); }
        else         { respawnParadiseWave(); sfx('laugh'); }
    } else if (P.phase === 'night' && P.quiet && --P.timer <= 0) {
        P.phase = 'day'; P.timer = dayFrames(); P.quiet = false;
        showToast('☀ Good morning, Paradise Island!', '#FFE066');
        maybeBirthday();
    }
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

