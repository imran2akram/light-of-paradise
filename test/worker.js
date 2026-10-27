// Tests the error-report Worker (worker/src/index.js) with a fake D1 database.
//   node test/worker.js
'use strict';
const assert = require('assert');

// Tiny in-memory stand-in for the D1 calls the Worker makes
function fakeDb() {
    const rows = [];
    let nextId = 1;
    return {
        rows,
        prepare(sql) {
            let args = [];
            const stmt = {
                bind(...a) { args = a; return stmt; },
                async run() {
                    if (sql.startsWith('INSERT')) {
                        const [ts, build, where_, message, stack, room, phase, level, input, ua] = args;
                        rows.push({ id: nextId++, ts, build, where_, message, stack, room, phase, level, input, ua });
                    } else if (sql.startsWith('DELETE')) {
                        const keep = args[0], max = rows.length ? rows[rows.length - 1].id : 0;
                        for (let i = rows.length - 1; i >= 0; i--) if (rows[i].id < max - keep) rows.splice(i, 1);
                    } else throw new Error('unexpected SQL: ' + sql);
                    return { success: true };
                },
                async all() {
                    assert(sql.startsWith('SELECT'), 'unexpected SQL: ' + sql);
                    return { results: rows.slice().reverse().slice(0, args[0]) };
                },
            };
            return stmt;
        },
    };
}

(async () => {
    const worker = (await import('../worker/src/index.js')).default;
    const env = { DB: fakeDb(), ALLOWED_ORIGINS: 'https://imran2akram.github.io, http://localhost:8000', READ_TOKEN: 'secret123' };
    const call = (method, path, { origin, body, token } = {}) => worker.fetch(new Request('https://lop-errors.example.workers.dev' + path, {
        method, body, headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } }), env);
    const report = { where: 'update', message: "Cannot read properties of undefined (reading 'x')", stack: 'TypeError: ...\n    at updateEnemyProjectiles',
                     room: 'hell', phase: 'playing', level: 2, input: 'pad', build: '10/27/2026 16:55:01', ua: 'TestBrowser/1.0' };
    const origin = 'https://imran2akram.github.io';
    let r;

    r = await call('POST', '/report', { origin, body: JSON.stringify(report) });
    assert.strictEqual(r.status, 204, 'a good report is accepted');
    assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), origin, 'CORS header names the page');
    assert.strictEqual(env.DB.rows.length, 1);
    assert.strictEqual(env.DB.rows[0].message, report.message);
    assert.strictEqual(env.DB.rows[0].where_, 'update');
    assert.strictEqual(env.DB.rows[0].level, 2);

    r = await call('POST', '/report', { origin: 'https://evil.example', body: JSON.stringify(report) });
    assert.strictEqual(r.status, 403, 'other sites cannot post');
    r = await call('POST', '/report', { body: JSON.stringify(report) });
    assert.strictEqual(r.status, 403, 'no origin header: refused');
    r = await call('POST', '/report', { origin, body: 'not json' });
    assert.strictEqual(r.status, 400, 'bad JSON is refused');
    r = await call('POST', '/report', { origin, body: JSON.stringify({ where: 'draw' }) });
    assert.strictEqual(r.status, 400, 'a report without a message is refused');
    r = await call('POST', '/report', { origin, body: 'x'.repeat(10000) });
    assert.strictEqual(r.status, 413, 'oversized bodies are refused');
    r = await call('POST', '/report', { origin, body: JSON.stringify({ ...report, message: 'm'.repeat(2000), stack: 's'.repeat(9000) }) });
    assert.strictEqual(r.status, 413, 'a huge stack is refused by the size limit');
    assert.strictEqual(env.DB.rows.length, 1, 'none of the bad reports were stored');

    r = await call('OPTIONS', '/report', { origin });
    assert.strictEqual(r.status, 204);
    assert.strictEqual(r.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');

    r = await call('GET', '/');
    assert.strictEqual(r.status, 401, 'the page needs the token');
    r = await call('GET', '/?token=wrong');
    assert.strictEqual(r.status, 401);
    r = await call('GET', '/?token=secret123');
    assert.strictEqual(r.status, 200);
    let html = await r.text();
    assert(html.includes('1×') && html.includes('updateEnemyProjectiles') && html.includes('hell'), 'page shows the report');
    assert(!html.includes('<script'), 'nothing in a report is rendered as HTML');

    await call('POST', '/report', { origin, body: JSON.stringify({ ...report, message: '<script>alert(1)</script>', room: 'void' }) });
    await call('POST', '/report', { origin, body: JSON.stringify({ ...report, room: 'void' }) });
    r = await call('GET', '/', { token: 'secret123' });
    html = await r.text();
    assert(html.includes('2×'), 'identical errors are grouped and counted');
    assert(html.includes('hell, void') || html.includes('void, hell'), 'rooms are listed');
    assert(html.includes('&lt;script&gt;') && !html.includes('<script>alert'), 'report text is escaped');

    r = await call('GET', '/errors.json?token=secret123');
    const json = await r.json();
    assert.strictEqual(json.length, 3, 'JSON has every row');

    r = await call('GET', '/nope');
    assert.strictEqual(r.status, 404);

    delete env.READ_TOKEN;
    r = await call('GET', '/?token=');
    assert.strictEqual(r.status, 401, 'no token configured means nobody can read');

    console.log('worker: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
