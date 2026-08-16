#!/usr/bin/env node
/* ML Quest content validator — schema + string hygiene. Usage:
     node tools/validate.js [data/week2.js ...]      (default: all data/*.js)
   Exit code 1 on errors. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DECK_MIN = { python: 22, 'classic-ml': 28, nlp: 28, llm: 22, rag: 14, agents: 10, opt: 12, inf: 8, qtz: 8, prd: 10, design: 20, 'dev-agents': 12, 'biz-agents': 12 };
const DECKS = Object.keys(DECK_MIN);
const XP_BY_DIFF = { 1: 20, 2: 30, 3: 40 };
const PKGS = ['numpy', 'pandas'];

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`[${f}] ${m}`);
const warn = (f, m) => warnings.push(`[${f}] ${m}`);

function isStr(x) { return typeof x === 'string'; }

function checkStr(f, where, s, opts = {}) {
  if (!isStr(s) || s.trim().length === 0) { err(f, `${where}: missing/empty string`); return; }
  if (s.includes('`')) err(f, `${where}: contains a backtick character`);
  const fences = (s.match(/~~~/g) || []).length;
  if (fences % 2 !== 0) err(f, `${where}: unbalanced ~~~ fences (${fences})`);
  if (opts.min && s.length < opts.min) err(f, `${where}: too short (${s.length} < ${opts.min} chars)`);
  if (opts.max && s.length > opts.max) warn(f, `${where}: long (${s.length} > ${opts.max} chars)`);
}

function checkQuizItem(f, where, it) {
  if (!it || typeof it !== 'object') { err(f, `${where}: not an object`); return; }
  checkStr(f, `${where}.q`, it.q, { min: 10 });
  if (!Array.isArray(it.options) || it.options.length !== 4) err(f, `${where}: needs exactly 4 options`);
  else it.options.forEach((o, i) => checkStr(f, `${where}.options[${i}]`, o));
  if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer > 3) err(f, `${where}.answer: must be int 0..3`);
  checkStr(f, `${where}.explain`, it.explain, { min: 40 });
}

function checkQuizArray(f, where, arr, minN, maxN) {
  if (!Array.isArray(arr) || arr.length < minN || arr.length > maxN) {
    err(f, `${where}: needs ${minN}..${maxN} items, has ${Array.isArray(arr) ? arr.length : 'none'}`);
    return;
  }
  arr.forEach((it, i) => checkQuizItem(f, `${where}[${i}]`, it));
  const counts = [0, 0, 0, 0];
  arr.forEach(it => { if (Number.isInteger(it.answer) && it.answer >= 0 && it.answer < 4) counts[it.answer]++; });
  if (arr.length >= 6 && Math.max(...counts) / arr.length > 0.45)
    warn(f, `${where}: answer index distribution skewed (${counts.join('/')})`);
}

function checkCase(f, id, c) {
  const w = `case ${id}`;
  if (!c || typeof c !== 'object') { err(f, `${w}: not an object`); return; }
  checkStr(f, `${w}.title`, c.title);
  checkStr(f, `${w}.brief`, c.brief);
  checkStr(f, `${w}.scenario`, c.scenario, { min: 200 });
  if (!Number.isInteger(c.minutes) || c.minutes < 15 || c.minutes > 90) err(f, `${w}.minutes: bad`);
  if (!Number.isInteger(c.xp) || c.xp < 40 || c.xp > 120) err(f, `${w}.xp: expected 40..120`);
  if (!Array.isArray(c.stages) || c.stages.length < 4 || c.stages.length > 8) {
    err(f, `${w}.stages: need 4..8, has ${Array.isArray(c.stages) ? c.stages.length : 'none'}`);
    return;
  }
  c.stages.forEach((s, i) => {
    const sw = `${w}.stages[${i}]`;
    checkStr(f, `${sw}.name`, s && s.name, { min: 4 });
    checkStr(f, `${sw}.prompt`, s && s.prompt, { min: 80 });
    checkStr(f, `${sw}.model`, s && s.model, { min: 300 });
    if (!Array.isArray(s.rubric) || s.rubric.length < 3 || s.rubric.length > 8)
      err(f, `${sw}.rubric: need 3..8 items`);
    else s.rubric.forEach((r, ri) => checkStr(f, `${sw}.rubric[${ri}]`, r, { min: 15 }));
  });
}

function checkExercise(f, id, ex, referenced) {
  const w = `exercise ${id}`;
  if (!ex || typeof ex !== 'object') { err(f, `${w}: not an object`); return; }
  checkStr(f, `${w}.title`, ex.title);
  checkStr(f, `${w}.brief`, ex.brief);
  checkStr(f, `${w}.description`, ex.description, { min: 200 });
  checkStr(f, `${w}.starter`, ex.starter, { min: 30 });
  checkStr(f, `${w}.solution`, ex.solution, { min: 30 });
  if (ex.solution === ex.starter) err(f, `${w}: solution identical to starter`);
  if (![1, 2, 3].includes(ex.difficulty)) err(f, `${w}.difficulty: must be 1|2|3`);
  const kind = ex.kind;
  if (kind !== undefined && kind !== 'homework' && kind !== 'boss') err(f, `${w}.kind: bad value ${kind}`);
  const expectedXp = kind === 'homework' ? 100 : kind === 'boss' ? 40 : XP_BY_DIFF[ex.difficulty];
  if (ex.xp !== expectedXp) err(f, `${w}.xp: expected ${expectedXp}, got ${ex.xp}`);
  if (!Number.isInteger(ex.minutes) || ex.minutes < 5 || ex.minutes > 120) err(f, `${w}.minutes: bad`);
  if (!Array.isArray(ex.packages) || ex.packages.some(p => !PKGS.includes(p))) err(f, `${w}.packages: only ${PKGS.join(',')} allowed`);
  if (ex.asyncMode !== undefined && typeof ex.asyncMode !== 'boolean') err(f, `${w}.asyncMode: must be boolean`);
  if (!Array.isArray(ex.hints) || ex.hints.length < 2 || ex.hints.length > 4) err(f, `${w}.hints: need 2..4`);
  else ex.hints.forEach((h, i) => checkStr(f, `${w}.hints[${i}]`, h, { min: 15 }));
  const tMin = kind === 'homework' ? 6 : 3;
  const tMax = 12;
  if (!Array.isArray(ex.tests) || ex.tests.length < tMin || ex.tests.length > tMax)
    err(f, `${w}.tests: need ${tMin}..${tMax}, has ${Array.isArray(ex.tests) ? ex.tests.length : 'none'}`);
  else ex.tests.forEach((t, i) => {
    checkStr(f, `${w}.tests[${i}].name`, t && t.name, { min: 5 });
    checkStr(f, `${w}.tests[${i}].code`, t && t.code, { min: 10 });
  });
  const banned = [/\bopen\s*\(/, /\bimport\s+threading\b/, /\bimport\s+multiprocessing\b/, /\bimport\s+subprocess\b/,
    /\bimport\s+sklearn\b/, /\bfrom\s+sklearn\b/, /\bimport\s+torch\b/, /\bimport\s+matplotlib\b/, /\binput\s*\(/,
    /\btime\.sleep\s*\(/];
  for (const src of [ex.starter, ex.solution, ...(Array.isArray(ex.tests) ? ex.tests.map(t => t && t.code) : [])]) {
    if (!isStr(src)) continue;
    for (const re of banned) if (re.test(src)) err(f, `${w}: forbidden pattern ${re} in code`);
  }
  if (!referenced) warn(f, `${w}: not referenced by any day block or boss.tasks`);
}

function validateWeek(f, W, seenIds) {
  const wf = `${f} week ${W && W.id}`;
  if (!W || typeof W !== 'object') { err(f, 'week: not an object'); return; }
  if (!/^w[1-9]$/.test(W.id || '')) err(wf, `bad week id ${W.id}`);
  if (!Number.isInteger(W.num)) err(wf, 'num missing');
  checkStr(wf, 'title', W.title); checkStr(wf, 'subtitle', W.subtitle); checkStr(wf, 'goal', W.goal);
  if (!Array.isArray(W.days) || W.days.length !== 6) err(wf, `needs exactly 6 days, has ${(W.days || []).length}`);
  const referenced = new Set();
  (W.days || []).forEach((d, di) => {
    const dw = `${wf} day[${di}]`;
    if (!new RegExp(`^${W.id}d[1-9]$`).test(d.id || '')) err(dw, `bad day id ${d.id}`);
    if (seenIds.has(d.id)) err(dw, `duplicate id ${d.id}`); seenIds.add(d.id);
    checkStr(dw, 'title', d.title);
    if (!Number.isInteger(d.minutes) || d.minutes < 60 || d.minutes > 240) warn(dw, `minutes ${d.minutes} outside 60..240`);
    if (!Array.isArray(d.blocks) || d.blocks.length < 2) { err(dw, 'blocks missing'); return; }
    let sum = 0;
    d.blocks.forEach((b, bi) => {
      const bw = `${dw}.blocks[${bi}]`;
      sum += b.minutes || 0;
      switch (b.type) {
        case 'lesson': if (!W.lessons[b.id]) err(bw, `lesson ${b.id} not found`); break;
        case 'quiz': if (!W.quizzes[b.id]) err(bw, `quiz ${b.id} not found`); break;
        case 'exercise': case 'homework':
          if (!W.exercises[b.id]) err(bw, `exercise ${b.id} not found`); else referenced.add(b.id);
          if (b.type === 'homework' && W.exercises[b.id] && W.exercises[b.id].kind !== 'homework')
            err(bw, `${b.id} must have kind:"homework"`);
          break;
        case 'cards':
          if (!DECKS.includes(b.deck)) err(bw, `bad deck ${b.deck}`);
          if (!Number.isInteger(b.count) || b.count < 3 || b.count > 20) err(bw, `bad count ${b.count}`);
          break;
        case 'boss': if (!W.boss || W.boss.id !== b.id) err(bw, `boss ${b.id} not found`); break;
        case 'case': if (!W.cases || !W.cases[b.id]) err(bw, `case ${b.id} not found`); break;
        default: err(bw, `unknown block type ${b.type}`);
      }
    });
    if (Math.abs(sum - d.minutes) > 15) warn(dw, `day minutes ${d.minutes} != sum of blocks ${sum}`);
  });
  for (const [id, L] of Object.entries(W.lessons || {})) {
    if (seenIds.has(id)) err(wf, `duplicate id ${id}`); seenIds.add(id);
    checkStr(wf, `lesson ${id}.title`, L.title);
    checkStr(wf, `lesson ${id}.md`, L.md, { min: 2500, max: 13000 });
    if (isStr(L.md)) {
      if (!L.md.includes('### TL;DR')) err(wf, `lesson ${id}: missing "### TL;DR" section`);
      if (!L.md.includes('### Go deeper')) err(wf, `lesson ${id}: missing "### Go deeper" section`);
      if (!/interviews?, they ask/i.test(L.md)) warn(wf, `lesson ${id}: missing "In interviews, they ask" section`);
    }
  }
  for (const [id, q] of Object.entries(W.quizzes || {})) {
    if (seenIds.has(id)) err(wf, `duplicate id ${id}`); seenIds.add(id);
    checkQuizArray(wf, `quiz ${id}`, q, 5, 16);
  }
  if (W.boss) {
    const B = W.boss;
    if (seenIds.has(B.id)) err(wf, `duplicate id ${B.id}`); seenIds.add(B.id);
    checkStr(wf, 'boss.title', B.title); checkStr(wf, 'boss.intro', B.intro);
    if (!Number.isInteger(B.timeLimitMin) || B.timeLimitMin < 15 || B.timeLimitMin > 60) err(wf, 'boss.timeLimitMin bad');
    if (!Number.isInteger(B.passPct) || B.passPct < 50 || B.passPct > 90) err(wf, 'boss.passPct bad');
    checkQuizArray(wf, 'boss.quiz', B.quiz, 8, 16);
    if (!Array.isArray(B.tasks) || B.tasks.length < 1 || B.tasks.length > 3) err(wf, 'boss.tasks: need 1..3');
    else B.tasks.forEach(tid => {
      if (!W.exercises[tid]) err(wf, `boss task ${tid} not found in exercises`);
      else { if (W.exercises[tid].kind !== 'boss') err(wf, `boss task ${tid} must have kind:"boss"`); referenced.add(tid); }
    });
  } else err(wf, 'boss missing');
  for (const [id, ex] of Object.entries(W.exercises || {})) {
    if (seenIds.has(id)) err(wf, `duplicate id ${id}`); seenIds.add(id);
    checkExercise(wf, id, ex, referenced.has(id));
  }
  for (const [id, c] of Object.entries(W.cases || {})) {
    if (seenIds.has(id)) err(wf, `duplicate id ${id}`); seenIds.add(id);
    checkCase(wf, id, c);
  }
  const hw = Object.values(W.exercises || {}).filter(e => e && e.kind === 'homework');
  if (hw.length < 1 && W.num <= 5) err(wf, 'week needs at least one homework');
}

function validateCards(f, cards) {
  const seen = new Set();
  const perDeck = {};
  cards.forEach((c, i) => {
    const w = `card[${i}] ${c && c.id}`;
    if (!c || typeof c !== 'object') { err(f, `${w}: not an object`); return; }
    if (!/^[a-z-]+-\d{3}$/.test(c.id || '')) err(f, `${w}: bad id format`);
    if (seen.has(c.id)) err(f, `${w}: duplicate id`); seen.add(c.id);
    if (!DECKS.includes(c.deck)) err(f, `${w}: bad deck ${c.deck}`);
    if (![1, 2, 3].includes(c.level)) err(f, `${w}: bad level`);
    checkStr(f, `${w}.q`, c.q, { min: 15 });
    checkStr(f, `${w}.a`, c.a, { min: 80, max: 1600 });
    perDeck[c.deck] = (perDeck[c.deck] || 0) + 1;
  });
  return perDeck;
}

// ---- main ----
let files = process.argv.slice(2);
const allMode = files.length === 0;
if (allMode) {
  files = fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.js')).map(f => path.join('data', f)).sort();
}
const sandbox = { CourseData: { weeks: [], cards: [], dojoExtras: [] }, console: { log: () => {} } };
vm.createContext(sandbox);

for (const rel of files) {
  const full = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  const f = path.basename(rel);
  let src;
  try { src = fs.readFileSync(full, 'utf8'); } catch (e) { err(f, `cannot read: ${e.message}`); continue; }
  if (/\$\{/.test(src)) err(f, 'contains "${" — template interpolation is forbidden in content files');
  const before = { w: sandbox.CourseData.weeks.length, c: sandbox.CourseData.cards.length, x: sandbox.CourseData.dojoExtras.length };
  try { vm.runInContext(src, sandbox, { filename: f, timeout: 10000 }); }
  catch (e) { err(f, `JS parse/exec error: ${e.message}`); continue; }
  const addedW = sandbox.CourseData.weeks.slice(before.w);
  const addedC = sandbox.CourseData.cards.slice(before.c);
  const addedX = sandbox.CourseData.dojoExtras.slice(before.x);
  const seenIds = new Set();
  if (addedX.length) {
    const xIds = new Set();
    addedX.forEach((c, i) => {
      if (!c || !c.id) { err(f, `dojoExtras[${i}]: missing id`); return; }
      if (xIds.has(c.id)) err(f, `dojoExtras: duplicate id ${c.id}`); xIds.add(c.id);
      checkCase(f, c.id, c);
    });
    console.log(`  ${f}: ${addedX.length} dojo extra cases`);
  }
  addedW.forEach(W => validateWeek(f, W, seenIds));
  if (addedC.length) {
    const perDeck = validateCards(f, addedC);
    console.log(`  ${f}: ${addedC.length} cards — ${Object.entries(perDeck).map(([d, n]) => `${d}:${n}`).join(' ')}`);
    for (const [deck, min] of Object.entries(DECK_MIN)) {
      if ((perDeck[deck] || 0) > 0 && perDeck[deck] < min) warn(f, `deck ${deck}: ${perDeck[deck]} < recommended ${min}`);
    }
  }
  addedW.forEach(W => {
    const ex = Object.values(W.exercises || {});
    console.log(`  ${f}: ${W.id} "${W.title}" — ${(W.days || []).length} days, ${Object.keys(W.lessons || {}).length} lessons, ` +
      `${Object.values(W.quizzes || {}).reduce((a, q) => a + (q.length || 0), 0)} quiz items, ` +
      `${ex.filter(e => !e.kind).length} exercises, ${ex.filter(e => e.kind === 'homework').length} homework, ` +
      `${Object.keys(W.cases || {}).length} cases, ` +
      `boss quiz ${(W.boss && W.boss.quiz || []).length} + ${(W.boss && W.boss.tasks || []).length} tasks`);
  });
}

// cross-file global id uniqueness (weeks only; cards checked within file)
if (allMode) {
  const ids = new Set();
  for (const W of sandbox.CourseData.weeks) {
    for (const id of [W.id, ...Object.keys(W.lessons || {}), ...Object.keys(W.quizzes || {}), ...Object.keys(W.exercises || {}),
      ...Object.keys(W.cases || {}), ...(W.days || []).map(d => d.id), (W.boss || {}).id].filter(Boolean)) {
      if (ids.has(id)) err('global', `duplicate id across files: ${id}`);
      ids.add(id);
    }
  }
  const nums = sandbox.CourseData.weeks.map(w => w.num).sort();
  console.log(`  total: ${sandbox.CourseData.weeks.length} weeks (${nums.join(',')}), ${sandbox.CourseData.cards.length} cards`);
}

if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach(w => console.log('  ⚠ ' + w)); }
if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log('  ✗ ' + e)); console.log(`\n${errors.length} error(s).`); process.exit(1); }
console.log(`\nOK — 0 errors, ${warnings.length} warning(s).`);
