// Checks that index.html and js/ agree, and that every script file parses.
//   node test/scripts.js
// Fails if a js/*.js file is not loaded by index.html (or loaded twice), if
// index.html loads a file that is missing, or if any file (or all of them
// joined, as the page runs them) has a syntax error.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { spawnSync } = require('child_process');
const { pageScripts, checkScripts } = require('./headless');

const html = path.join(__dirname, '..', 'index.html');
const problems = checkScripts(html);

function syntax(file, label) {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (r.status !== 0) problems.push('syntax error in ' + label + '\n' + r.stderr);
}
const scripts = pageScripts(html).filter(s => s.text !== null);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lop-'));
for (const [i, s] of scripts.entries()) {
    if (s.src) syntax(s.file, s.src);
    else { const f = path.join(tmp, 'inline' + i + '.js'); fs.writeFileSync(f, s.text); syntax(f, 'an inline script'); }
}
const joined = path.join(tmp, 'game.js');
fs.writeFileSync(joined, scripts.map(s => s.text.endsWith('\n') ? s.text : s.text + '\n').join(''));
syntax(joined, 'all scripts joined');
fs.rmSync(tmp, { recursive: true, force: true });

for (const p of problems) console.log('FAIL ' + p);
console.log(problems.length ? problems.length + ' problem(s)' : 'ok   ' + scripts.length + ' scripts load in order, all parse');
process.exitCode = problems.length ? 1 : 0;
