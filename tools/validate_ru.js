#!/usr/bin/env node
/* Validate Russian translation overlays (data/i18n/ru-*.js) against the English content.
   Checks: unknown ids, array-length mismatches (quiz/options/stages/rubric/hints),
   string hygiene (backticks, ${), and prints per-category coverage.
   Usage: node tools/validate_ru.js        Exit 1 on structural errors. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const err = m => errors.push(m);

const sandbox = { CourseData: { weeks: [], cards: [], dojoExtras: [], ru: { week: {}, day: {}, lesson: {}, quiz: {}, ex: {}, case: {}, boss: {}, card: {} } }, console: { log: () => {} } };
vm.createContext(sandbox);

const dataFiles = fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.js')).map(f => 'data/' + f);
const i18nDir = path.join(ROOT, 'data', 'i18n');
const ruFiles = fs.existsSync(i18nDir) ? fs.readdirSync(i18nDir).filter(f => f.endsWith('.js')).map(f => 'data/i18n/' + f) : [];

for (const rel of [...dataFiles, ...ruFiles]) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (rel.includes('i18n') && /\$\{/.test(src)) err(`[${rel}] contains "\${"`);
  try { vm.runInContext(src, sandbox, { filename: rel, timeout: 10000 }); }
  catch (e) { err(`[${rel}] JS error: ${e.message}`); }
}

const CD = sandbox.CourseData;
const R = CD.ru;

function hygiene(where, s) {
  if (typeof s !== 'string') { err(`${where}: not a string`); return; }
  if (!s.trim()) err(`${where}: empty`);
  if (s.includes('`')) err(`${where}: backtick in content`);
  if (((s.match(/~~~/g) || []).length) % 2 !== 0) err(`${where}: unbalanced ~~~`);
}
function walkStrings(where, v) {
  if (typeof v === 'string') hygiene(where, v);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(`${where}[${i}]`, x));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(`${where}.${k}`, x);
}

// collect expected ids from EN content
const EN = { week: {}, day: {}, lesson: {}, quiz: {}, ex: {}, case: {}, boss: {}, card: {} };
for (const W of CD.weeks) {
  EN.week[W.id] = W;
  W.days.forEach(d => EN.day[d.id] = d);
  Object.entries(W.lessons || {}).forEach(([id, x]) => EN.lesson[id] = x);
  Object.entries(W.quizzes || {}).forEach(([id, x]) => EN.quiz[id] = x);
  Object.entries(W.exercises || {}).forEach(([id, x]) => EN.ex[id] = x);
  Object.entries(W.cases || {}).forEach(([id, x]) => EN.case[id] = x);
  if (W.boss) EN.boss[W.boss.id] = W.boss;
}
CD.cards.forEach(c => EN.card[c.id] = c);
CD.dojoExtras.forEach(x => EN.case[x.id] = x);

// structural checks + coverage
const cats = ['week', 'day', 'lesson', 'quiz', 'ex', 'case', 'boss', 'card'];
for (const cat of cats) {
  for (const [id, tr] of Object.entries(R[cat])) {
    const en = EN[cat][id];
    if (!en) { err(`ru.${cat}["${id}"]: unknown id`); continue; }
    walkStrings(`ru.${cat}.${id}`, tr);
    if (cat === 'quiz' || cat === 'boss') {
      const enQuiz = cat === 'quiz' ? en : en.quiz;
      const trQuiz = cat === 'quiz' ? tr : tr.quiz;
      if (trQuiz) {
        if (trQuiz.length !== enQuiz.length) err(`ru.${cat}.${id}: ${trQuiz.length} items vs ${enQuiz.length} in EN`);
        trQuiz.forEach((it, i) => {
          if (it.options && it.options.length !== 4) err(`ru.${cat}.${id}[${i}]: options must be 4`);
          if (it.answer !== undefined) err(`ru.${cat}.${id}[${i}]: do not include "answer"`);
        });
      }
    }
    if (cat === 'ex' && tr.hints && tr.hints.length !== en.hints.length)
      err(`ru.ex.${id}: hints ${tr.hints.length} vs ${en.hints.length}`);
    if (cat === 'case' && tr.stages) {
      if (tr.stages.length !== en.stages.length) err(`ru.case.${id}: stages ${tr.stages.length} vs ${en.stages.length}`);
      else tr.stages.forEach((s, i) => {
        if (s.rubric && s.rubric.length !== en.stages[i].rubric.length)
          err(`ru.case.${id}.stages[${i}]: rubric ${s.rubric.length} vs ${en.stages[i].rubric.length}`);
      });
    }
    for (const k of Object.keys(tr)) {
      const allowed = {
        week: ['title', 'subtitle', 'goal'], day: ['title'], lesson: ['title', 'md'],
        quiz: null, ex: ['title', 'brief', 'description', 'hints'],
        case: ['title', 'brief', 'scenario', 'stages'], boss: ['title', 'intro', 'quiz'], card: ['q', 'a'],
      }[cat];
      if (allowed && !allowed.includes(k)) err(`ru.${cat}.${id}: unexpected field "${k}"`);
    }
  }
  const total = Object.keys(EN[cat]).length;
  const done = Object.keys(R[cat]).filter(id => EN[cat][id]).length;
  console.log(`  ${cat.padEnd(7)} ${done}/${total}${done === total ? ' ✓' : ''}`);
}

if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('\nOK — 0 errors.');
