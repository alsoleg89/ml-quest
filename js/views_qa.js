/* ML Quest — content QA: run every exercise's reference solution against its tests
   inside the real Pyodide runtime. Maintenance tool (linked from Settings). */
'use strict';

Views.qa = function (el) {
  const { h } = UI;
  const IDX = Store.IDX;
  const log = h('div', { class: 'card mt', style: { fontFamily: 'var(--mono)' } });
  const summary = h('div', { class: 'row mt' });
  let running = false;

  function allExercises(weekFilter) {
    const out = [];
    for (const W of IDX.weeks) {
      if (weekFilter && W.id !== weekFilter) continue;
      for (const [id, ex] of Object.entries(W.exercises || {})) out.push({ id, ex });
    }
    return out;
  }

  async function runAll(weekFilter) {
    if (running) return;
    running = true;
    log.innerHTML = '';
    summary.innerHTML = '';
    const items = allExercises(weekFilter);
    let pass = 0, fail = 0;
    const t0 = performance.now();
    for (let i = 0; i < items.length; i++) {
      const { id, ex } = items[i];
      const line = h('div', { class: 'qa-line' }, '⏳ ' + (i + 1) + '/' + items.length + ' ' + id + ' — ' + ex.title);
      log.appendChild(line);
      line.scrollIntoView({ block: 'nearest' });
      try {
        const res = await Runner.run({
          code: ex.solution, tests: ex.tests, packages: ex.packages || [], timeoutMs: 60000,
        });
        const bad = res.setupError ? [{ name: 'setup', message: res.setupError }] : res.tests.filter(t => !t.pass);
        if (bad.length === 0) {
          pass++;
          line.className = 'qa-line pass';
          line.textContent = '✅ ' + id + ' (' + res.tests.length + ' tests, ' + res.durationMs + 'ms)';
        } else {
          fail++;
          line.className = 'qa-line fail';
          line.textContent = '❌ ' + id + ' — ' + bad.map(b => b.name + ': ' + (b.message || '').split('\n')[0]).join(' | ');
        }
      } catch (e) {
        fail++;
        line.className = 'qa-line fail';
        line.textContent = '💥 ' + id + ' — ' + (e.message || e);
      }
    }
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    summary.appendChild(h('span', { class: 'pill ' + (fail ? 'warn' : 'good') },
      pass + ' pass · ' + fail + ' fail · ' + secs + 's'));
    running = false;
  }

  const totals = IDX.totals();
  el.appendChild(h('div', { class: 'page page-narrow' },
    h('h1', {}, '🔬 Content QA'),
    h('p', { class: 'sub' }, 'Runs every reference solution against its own tests in the real in-browser runtime. ' +
      Object.values(IDX.ex).length + ' exercises · ' + totals.cards + ' cards loaded.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', onclick: () => runAll(null) }, '▶ Run all'),
      ...IDX.weeks.map(W => h('button', { class: 'btn', onclick: () => runAll(W.id) }, W.id))),
    summary, log));
};
