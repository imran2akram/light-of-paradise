// Error reports for Light of Paradise.
//
//   POST /report      the game sends a small JSON report (see reportError() in index.html)
//   GET  /?token=…    a page listing recent reports, grouped by message (token = READ_TOKEN secret)
//   GET  /errors.json?token=…   the same as JSON
//
// Reports are stored in a D1 database (worker/schema.sql).

const MAX_BODY   = 8 * 1024;   // a report is a few hundred bytes; anything bigger is not from the game
const KEEP_ROWS  = 5000;       // oldest rows beyond this are trimmed now and then
const SHOW_ROWS  = 300;        // how many recent reports the page looks at

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, env) });
        if (request.method === 'POST' && url.pathname === '/report') return report(request, env);
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/errors.json')) return view(request, env, url);
        return new Response('Not found', { status: 404 });
    },
};

function allowedOrigin(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    return allowed.includes(origin) ? origin : null;
}

function cors(request, env) {
    const origin = allowedOrigin(request, env);
    return origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
}

const str = (v, max) => (v === undefined || v === null ? null : String(v).slice(0, max));

async function report(request, env) {
    if (!allowedOrigin(request, env)) return new Response('Forbidden', { status: 403 });
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response('Too large', { status: 413 });
    let r;
    try { r = JSON.parse(text); } catch (e) { return new Response('Bad JSON', { status: 400 }); }
    if (!r || typeof r !== 'object' || !r.message) return new Response('Bad report', { status: 400 });
    const level = Number.isFinite(Number(r.level)) ? Number(r.level) : null;
    await env.DB.prepare(
        'INSERT INTO errors (ts, build, where_, message, stack, room, phase, level, input, ua) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(new Date().toISOString(), str(r.build, 80), str(r.where, 40), str(r.message, 500), str(r.stack, 4000),
              str(r.room, 40), str(r.phase, 20), level, str(r.input, 20), str(r.ua, 300))
        .run();
    if (Math.random() < 0.02) {   // trim old rows occasionally so the table never grows without bound
        await env.DB.prepare('DELETE FROM errors WHERE id < (SELECT MAX(id) FROM errors) - ?').bind(KEEP_ROWS).run();
    }
    return new Response(null, { status: 204, headers: cors(request, env) });
}

async function view(request, env, url) {
    const token = url.searchParams.get('token') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!env.READ_TOKEN || token !== env.READ_TOKEN) return new Response('Unauthorized', { status: 401 });
    const { results } = await env.DB.prepare('SELECT * FROM errors ORDER BY id DESC LIMIT ?').bind(SHOW_ROWS).all();
    if (url.pathname === '/errors.json') return Response.json(results);

    // Group identical errors so one bug that fires 50 times reads as one row
    const groups = new Map();
    for (const row of results) {
        const key = row.where_ + '|' + row.message;
        const g = groups.get(key) || { ...row, count: 0, first: row.ts, rooms: new Set(), builds: new Set() };
        g.count++; g.first = row.ts; g.rooms.add(row.room || '?'); g.builds.add(row.build || '?');
        groups.set(key, g);
    }
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rows = [...groups.values()].map(g => `
        <details><summary><b>${g.count}×</b> <code>${esc(g.where_)}</code> ${esc(g.message)}
            <small>last ${esc(g.ts)} · first ${esc(g.first)} · rooms: ${esc([...g.rooms].join(', '))} · builds: ${esc([...g.builds].join(', '))}</small></summary>
            <pre>${esc(g.stack)}</pre><small>level ${esc(g.level)} · ${esc(g.input)} · ${esc(g.ua)}</small></details>`).join('');
    const html = `<!doctype html><meta charset="utf-8"><title>Light of Paradise errors</title>
<style>body{font:14px system-ui;margin:24px;max-width:1100px}details{border-bottom:1px solid #ddd;padding:8px 0}summary{cursor:pointer}pre{background:#f4f4f4;padding:8px;overflow:auto}small{color:#666}</style>
<h1>Light of Paradise errors</h1><p>${results.length} most recent reports, ${groups.size} distinct. <a href="/errors.json?token=${esc(token)}">JSON</a></p>
${rows || '<p>No errors reported. 🎉</p>'}`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
