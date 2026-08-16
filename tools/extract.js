#!/usr/bin/env node
/* Extract course data to JSON for the python solution checker.
   Usage: node tools/extract.js data/week2.js [/tmp/w2.json]   (default out: stdout)
          node tools/extract.js            → all data/*.js to stdout */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let args = process.argv.slice(2);
let out = null;
if (args.length && args[args.length - 1].endsWith('.json')) out = args.pop();
let files = args;
if (files.length === 0) {
  files = fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.js')).map(f => path.join('data', f)).sort();
}
const sandbox = { CourseData: { weeks: [], cards: [], dojoExtras: [] }, console: { log: () => {} } };
vm.createContext(sandbox);
for (const rel of files) {
  const full = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: rel, timeout: 10000 });
}
const json = JSON.stringify({ weeks: sandbox.CourseData.weeks, cards: sandbox.CourseData.cards });
if (out) { fs.writeFileSync(out, json); console.log(`wrote ${out} (${json.length} bytes)`); }
else process.stdout.write(json);
