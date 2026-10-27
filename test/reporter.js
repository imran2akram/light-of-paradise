// Checks that reportError() in index.html sends a report when ERROR_LOG_URL is set,
// sends each distinct error once, and stops after MAX_ERROR_REPORTS.
//   node test/reporter.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const { loadGame } = require('./headless');

let html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const before = html;
html = html.replace("const ERROR_LOG_URL      = '';", "const ERROR_LOG_URL      = 'https://lop-errors.example.workers.dev/report';");
assert.notStrictEqual(html, before, 'could not find the ERROR_LOG_URL line in index.html');

const driver = String.raw`
console.error = () => {};   // quiet
startFromIntro(true);
changeRoom(ROOM.HELL);
let n = 0;
updateParticles = () => { throw new TypeError('boom ' + n); };   // the same error every frame...
loop(); loop(); loop();
assert.strictEqual(__h.fetches.length, 1, 'the same error is reported once, not once per frame');
const sent = JSON.parse(__h.fetches[0].opts.body);
assert.strictEqual(sent.where, 'update');
assert.strictEqual(sent.message, 'boom 0');
assert.strictEqual(sent.room, 'hell');
assert.strictEqual(sent.phase, 'playing');
assert(sent.stack.includes('TypeError'), 'stack is included');
assert.strictEqual(__h.fetches[0].opts.headers['Content-Type'], 'text/plain', 'simple request, no CORS preflight');
assert(__h.fetches[0].opts.body.length < 8000, 'report stays under the Worker size limit');
for (n = 1; n < 20; n++) loop();   // ...then 19 different ones
assert.strictEqual(__h.fetches.length, MAX_ERROR_REPORTS, 'reports stop at MAX_ERROR_REPORTS per page load');
assert.strictEqual(__h.rafCb, loop, 'the loop is still alive after all those errors');
console.log('reporter: all checks passed');
`;
global.assert = assert;
loadGame({ driver, html });
