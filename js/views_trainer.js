/* ML Quest — code trainer: editor + run/submit against tests, exercise view, playground */
'use strict';

(function () {
  const { h } = UI;

  function makeEditor(host, initial) {
    if (window.CodeMirror) {
      const cm = CodeMirror(host, {
        value: initial, mode: 'python', theme: 'material-darker', lineNumbers: true,
        indentUnit: 4, tabSize: 4, viewportMargin: Infinity,
        extraKeys: { Tab: cm => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    '), 'Shift-Tab': cm => cm.indentSelection('subtract') },
      });
      return { get: () => cm.getValue(), set: v => cm.setValue(v), onChange: f => cm.on('change', f), refresh: () => cm.refresh() };
    }
    const ta = h('textarea', { class: 'editor-fallback', spellcheck: 'false' });
    ta.value = initial;
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 4;
        ta.dispatchEvent(new Event('input'));
      }
    });
    host.appendChild(ta);
    return { get: () => ta.value, set: v => { ta.value = v; }, onChange: f => ta.addEventListener('input', f), refresh: () => {} };
  }

  /* Trainer component. opts: { bossMode, practice, onPass, persist=true } */
  function createTrainer(ex, opts = {}) {
    const persist = opts.persist !== false;
    const saved = persist ? Store.S.code[ex.id] : null;
    const wrap = h('div', {});
    const editorHost = h('div', { class: 'editor-shell' });
    const statusEl = h('span', { class: 'runner-status' });
    const consoleEl = h('div', { class: 'console', style: { display: 'none' } });
    const testsEl = h('div', {});
    const passActions = h('div', {});

    const ed = makeEditor(editorHost, saved || ex.starter);
    let saveTimer = null;
    ed.onChange(() => {
      if (!persist) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { Store.S.code[ex.id] = ed.get(); Store.save(); }, 400);
    });

    const unsub = Runner.onStatus(t => { statusEl.textContent = t; });

    function logConsole(text, isErr) {
      consoleEl.style.display = 'block';
      consoleEl.innerHTML = '';
      consoleEl.appendChild(h('span', { class: isErr ? 'err' : '' }, text || '(no output)'));
    }

    let busy = false;
    async function exec(withTests) {
      if (busy) return;
      busy = true;
      runBtn.disabled = submitBtn.disabled = true;
      testsEl.innerHTML = '';
      passActions.innerHTML = '';
      logConsole(withTests ? 'Running tests…' : 'Running…');
      try {
        const res = await Runner.run({
          code: ed.get(),
          tests: withTests ? ex.tests : [],
          packages: ex.packages || [],
          timeoutMs: withTests ? CFG.submitTimeoutMs : CFG.runTimeoutMs,
        });
        if (res.setupError) {
          logConsole(res.setupError, true);
        } else {
          logConsole(res.stdout ? res.stdout : (withTests ? '' : '(no output — add a print() to see values)'));
          if (!res.stdout && withTests) consoleEl.style.display = 'none';
        }
        if (withTests && !res.setupError) renderTests(res.tests);
        if (withTests && res.setupError) onFail();
      } catch (e) {
        logConsole(e.message || String(e), true);
        if (e.timeout) UI.toast('⏱ Time limit — likely an infinite loop. Runtime restarted.', 'bad', 5000);
      } finally {
        busy = false;
        runBtn.disabled = submitBtn.disabled = false;
      }
    }

    function onFail() {
      if (!Store.isDone(ex.id)) {
        Store.S.fails[ex.id] = (Store.S.fails[ex.id] || 0) + 1;
        Store.save();
      }
    }

    function renderTests(results) {
      testsEl.innerHTML = '';
      const allPass = results.length > 0 && results.every(t => t.pass);
      for (const t of results) {
        testsEl.appendChild(h('div', { class: 'test-line ' + (t.pass ? 'pass' : 'fail') },
          h('span', { class: 't-ico' }, t.pass ? '✅' : '❌'),
          h('div', {}, h('div', {}, t.name), t.message ? h('div', { class: 't-msg' }, t.message) : null)));
      }
      if (allPass) {
        if (opts.bossMode) {
          UI.toast('✅ Task solved!', 'good');
          if (opts.onPass) opts.onPass();
        } else if (opts.practice) {
          UI.toast('✅ Solved (practice — boss tasks pay XP during the boss fight)', 'good');
        } else {
          const first = !Store.isDone(ex.id);
          if (first) {
            let xp = ex.xp;
            if (Store.S.solutionSeen[ex.id]) xp = Math.round(xp * CFG.xp.solutionSeenFactor);
            Store.markDone(ex.id, { event: 'exercise-pass', id: ex.id });
            Store.addXp(xp, ex.title + (xp < ex.xp ? ' (solution was revealed — half XP)' : ''));
            UI.confetti(90);
          } else {
            UI.toast('✅ All tests pass — good reps!', 'good');
          }
          const ctx = App.findDayOf(ex.id);
          passActions.appendChild(h('div', { class: 'row mt' },
            h('span', { class: 'spacer' }),
            ctx ? h('button', { class: 'btn primary', onclick: () => App.go('day/' + ctx.day.id) }, '← Back to day') : null));
        }
      } else {
        onFail();
      }
    }

    const runBtn = h('button', { class: 'btn', title: 'Run your code (no tests) — Ctrl/Cmd+Enter', onclick: () => exec(false) }, '▶ Run');
    const submitBtn = h('button', { class: 'btn primary', title: 'Run the tests — Ctrl/Cmd+Shift+Enter', onclick: () => exec(true) }, '✓ Submit');
    const resetBtn = h('button', {
      class: 'btn ghost', onclick: () => UI.confirmModal('Reset the editor to the starter code?', () => { ed.set(ex.starter); }, 'Reset')
    }, '⟲ Reset');

    wrap.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); exec(e.shiftKey); }
    });

    wrap.appendChild(editorHost);
    wrap.appendChild(h('div', { class: 'tr-toolbar' }, runBtn, submitBtn, resetBtn, statusEl));
    wrap.appendChild(consoleEl);
    wrap.appendChild(testsEl);
    wrap.appendChild(passActions);

    // warm the runtime + packages in the background so Submit feels instant
    setTimeout(() => Runner.warmup(ex.packages || []), 300);

    return { el: wrap, getCode: () => ed.get(), setCode: v => ed.set(v), refresh: () => ed.refresh(), destroy: () => unsub() };
  }
  window.Trainer = { create: createTrainer };

  // ---------- exercise page ----------
  Views.exercise = function (el, params) {
    const ex = Store.IDX.ex[params.id];
    if (!ex) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Exercise not found.'))); return; }
    const ctx = App.findDayOf(ex.id);
    const done = Store.isDone(ex.id);
    const practice = ex.kind === 'boss';

    const tabs = { desc: null, hints: null, sol: null, tests: null };
    const tabBody = h('div', {});
    let activeTab = 'desc';

    function renderTab() {
      tabBody.innerHTML = '';
      for (const [k, btn] of Object.entries(tabBtns)) btn.classList.toggle('active', k === activeTab);
      if (activeTab === 'desc') {
        tabBody.appendChild(h('div', { class: 'lesson-body', html: MD.render(ex.description) }));
      } else if (activeTab === 'hints') {
        const used = Store.S.hintsUsed[ex.id] || 0;
        ex.hints.forEach((hint, i) => {
          if (i < used) tabBody.appendChild(h('div', { class: 'hint-box', html: '<b>Hint ' + (i + 1) + ':</b> ' + MD.render(hint) }));
        });
        if (used < ex.hints.length) {
          tabBody.appendChild(h('button', {
            class: 'btn mt', onclick: () => { Store.S.hintsUsed[ex.id] = used + 1; Store.save(); renderTab(); }
          }, '💡 Reveal hint ' + (used + 1) + ' / ' + ex.hints.length));
        }
        if (used === 0) tabBody.appendChild(h('p', { class: 'small dim mt' }, 'Hints are free — struggling a bit first is where the learning lives.'));
      } else if (activeTab === 'sol') {
        if (!Store.S.solutionSeen[ex.id] && !done) {
          tabBody.appendChild(h('div', { class: 'hint-box' },
            h('p', { style: { marginTop: 0 } }, 'Peeking before your first pass halves this exercise\'s XP (' + ex.xp + ' → ' + Math.round(ex.xp * CFG.xp.solutionSeenFactor) + '). Struggle is XP for your brain.'),
            h('button', { class: 'btn', onclick: () => { Store.S.solutionSeen[ex.id] = true; Store.save(); renderTab(); } }, '👀 Show solution anyway')));
        } else {
          tabBody.appendChild(h('pre', { class: 'codeblock', html: MD.hlPython(ex.solution) }));
          tabBody.appendChild(h('button', {
            class: 'btn mt', onclick: () => UI.confirmModal('Replace your editor code with the solution?', () => trainer.setCode(ex.solution), 'Replace')
          }, '⎘ Copy into editor'));
        }
      } else if (activeTab === 'tests') {
        tabBody.appendChild(h('p', { class: 'small muted' }, 'Your code is checked against these. Names only — the asserts stay hidden until they fail.'));
        ex.tests.forEach(t => tabBody.appendChild(h('div', { class: 'test-line' }, h('span', { class: 't-ico' }, '🧪'), h('div', {}, t.name))));
      }
    }
    const tabBtns = {
      desc: h('button', { class: 'tab active', onclick: () => { activeTab = 'desc'; renderTab(); } }, 'Task'),
      hints: h('button', { class: 'tab', onclick: () => { activeTab = 'hints'; renderTab(); } }, 'Hints (' + ex.hints.length + ')'),
      sol: h('button', { class: 'tab', onclick: () => { activeTab = 'sol'; renderTab(); } }, 'Solution'),
      tests: h('button', { class: 'tab', onclick: () => { activeTab = 'tests'; renderTab(); } }, 'Tests (' + ex.tests.length + ')'),
    };

    const trainer = createTrainer(ex, { practice });

    const kindPill = ex.kind === 'homework' ? h('span', { class: 'pill acc' }, '🏗️ homework')
      : ex.kind === 'boss' ? h('span', { class: 'pill warn' }, '👑 boss task — practice mode') : null;

    el.appendChild(h('div', { class: 'page' },
      h('div', { class: 'row', style: { marginBottom: '8px' } },
        ctx ? h('a', { href: '#/day/' + ctx.day.id, class: 'small muted' }, '← ' + ctx.day.title) : h('a', { href: '#/map', class: 'small muted' }, '← Map')),
      h('div', { class: 'trainer' },
        h('div', { class: 'tr-left card' },
          h('div', { class: 'row' },
            h('h2', { style: { marginBottom: 0 } }, ex.title),
            h('span', { class: 'spacer' }),
            done ? h('span', { class: 'pill good' }, '✓ solved') : null),
          h('div', { class: 'row', style: { marginTop: '8px' } },
            h('span', { class: 'diff-stars' }, UI.stars(ex.difficulty)),
            h('span', { class: 'pill' }, '+' + ex.xp + ' XP'),
            (ex.packages || []).length ? h('span', { class: 'pill' }, '📦 ' + ex.packages.join(', ')) : null,
            ex.asyncMode ? h('span', { class: 'pill' }, 'async') : null,
            kindPill),
          h('div', { class: 'tabs' }, ...Object.values(tabBtns)),
          tabBody),
        h('div', {},
          trainer.el,
          h('p', { class: 'small dim', style: { marginTop: '10px' } },
            '⌨️ ', h('kbd', {}, 'Ctrl/⌘ + Enter'), ' run · ', h('kbd', {}, 'Ctrl/⌘ + Shift + Enter'), ' submit · code autosaves')))));
    renderTab();
    setTimeout(() => trainer.refresh(), 50);
  };

  // ---------- playground ----------
  const PLAY_SNIPPETS = {
    'Hello Python': 'print("Hello from Python running in your browser!")\n\nfor i in range(3):\n    print(f"quest log #{i}")\n',
    'NumPy demo': 'import numpy as np\n\nX = np.arange(12).reshape(3, 4)\nprint(X)\nprint("column means:", X.mean(axis=0))\n',
    'Timing code': 'import time\n\nt0 = time.perf_counter()\ntotal = sum(i * i for i in range(1_000_00))\nprint(total, f"{(time.perf_counter() - t0) * 1000:.2f} ms")\n',
  };

  Views.playground = function (el) {
    const pseudoEx = { id: '__playground__', starter: Store.S.code['__playground__'] || PLAY_SNIPPETS['Hello Python'], tests: [], packages: [] };
    const trainer = createTrainer(pseudoEx, { persist: true, practice: true });
    // hide submit for playground (second toolbar button)
    const toolbar = trainer.el.querySelector('.tr-toolbar');
    toolbar.children[1].style.display = 'none';

    const sel = h('select', { class: 'btn', onchange: () => { if (sel.value) { trainer.setCode(PLAY_SNIPPETS[sel.value]); } } },
      h('option', { value: '' }, 'Snippets…'),
      ...Object.keys(PLAY_SNIPPETS).map(k => h('option', { value: k }, k)));
    const npBtn = h('button', { class: 'btn ghost', onclick: () => { Runner.warmup(['numpy']); UI.toast('Loading numpy in the background…'); } }, '📦 preload numpy');
    const pdBtn = h('button', { class: 'btn ghost', onclick: () => { Runner.warmup(['pandas']); UI.toast('Loading pandas in the background…'); } }, '📦 preload pandas');
    toolbar.appendChild(sel); toolbar.appendChild(npBtn); toolbar.appendChild(pdBtn);

    el.appendChild(h('div', { class: 'page page-narrow' },
      h('h1', {}, '🧪 Playground'),
      h('p', { class: 'sub' }, 'A scratchpad with real Python (Pyodide). numpy / pandas import on demand — first import downloads the package, then it\'s cached.'),
      h('div', { class: 'card' }, trainer.el)));
    setTimeout(() => trainer.refresh(), 50);
  };
})();
