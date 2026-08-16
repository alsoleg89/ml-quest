/* ML Quest — boss exams: timed quiz + coding tasks, scoring, results */
'use strict';

Views.boss = function (el, params) {
  const { h } = UI;
  const IDX = Store.IDX;
  const B = IDX.bosses[params.id];
  if (!B) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Boss not found.'))); return; }
  const ctx = App.findDayOf(B.id);
  const tasks = (B.tasks || []).map(tid => IDX.ex[tid]).filter(Boolean);
  const TASK_WEIGHT = 3;
  const maxScore = B.quiz.length + tasks.length * TASK_WEIGHT;

  const page = h('div', { class: 'page page-narrow' });
  el.appendChild(page);

  let st = null;       // running state
  let timerInt = null;
  function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }
  window.addEventListener('hashchange', stopTimer, { once: true });

  function intro() {
    const rec = Store.S.bossResults[B.id] || {};
    page.innerHTML = '';
    page.appendChild(h('div', { class: 'card boss-hero' },
      h('div', { class: 'boss-skull' }, B.id === 'w5-boss' ? '🏆' : '👑'),
      h('div', { class: 'boss-title' }, B.title),
      h('div', { class: 'lesson-body', style: { maxWidth: '520px', margin: '0 auto' }, html: MD.render(B.intro) }),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } },
        h('span', { class: 'pill' }, '⏱ ' + B.timeLimitMin + ' min'),
        h('span', { class: 'pill' }, '❓ ' + B.quiz.length + ' questions'),
        h('span', { class: 'pill' }, '⚔️ ' + tasks.length + ' coding task' + (tasks.length === 1 ? '' : 's') + ' (×' + TASK_WEIGHT + ' weight)'),
        h('span', { class: 'pill' }, 'pass ≥ ' + B.passPct + '%'),
        h('span', { class: 'pill acc' }, '+' + CFG.xp.bossPass + ' XP')),
      rec.attempts ? h('p', { class: 'muted small mt' },
        'Attempts: ' + rec.attempts + ' · best score: ' + (rec.scorePct || 0) + '%' + (rec.passed ? ' · defeated ✓ (retakes give no XP)' : '')) : null,
      h('p', { class: 'muted small' }, 'No feedback until the end — just like the real thing. Answers lock as you go.'),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
        ctx ? h('button', { class: 'btn ghost', onclick: () => App.go('day/' + ctx.day.id) }, 'Not yet') : null,
        h('button', { class: 'btn primary big', onclick: start }, '⚔️ Start the fight'))));
  }

  function start() {
    st = {
      phase: 'quiz', qIdx: 0,
      answers: new Array(B.quiz.length).fill(null),
      taskPassed: {}, taskIdx: 0,
      endAt: Date.now() + B.timeLimitMin * 60000,
      finished: false,
    };
    timerInt = setInterval(() => {
      const left = st.endAt - Date.now();
      const tEl = document.getElementById('boss-timer');
      if (tEl) {
        const s = Math.max(0, Math.ceil(left / 1000));
        tEl.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        tEl.classList.toggle('low', left < 120000);
      }
      if (left <= 0 && !st.finished) { UI.toast('⏱ Time is up!', 'bad'); finish(); }
    }, 400);
    render();
  }

  function header(subtitle) {
    return h('div', { class: 'row', style: { marginBottom: '14px' } },
      h('b', {}, B.title), h('span', { class: 'muted small' }, subtitle),
      h('span', { class: 'spacer' }),
      h('span', { class: 'boss-timer', id: 'boss-timer' }, '…'));
  }

  function render() {
    page.innerHTML = '';
    if (st.phase === 'quiz') {
      if (st.qIdx >= B.quiz.length) {
        st.phase = tasks.length ? 'tasks' : 'done';
        if (st.phase === 'done') return finish();
        return render();
      }
      const it = B.quiz[st.qIdx];
      const card = h('div', { class: 'card' },
        header('question ' + (st.qIdx + 1) + ' / ' + B.quiz.length),
        h('div', { class: 'quiz-progress' }, ...B.quiz.map((_, i) =>
          h('div', { class: i < st.qIdx ? 'hit' : i === st.qIdx ? 'cur' : '' }))),
        h('div', { class: 'quiz-q', html: MD.render(it.q) }),
        ...it.options.map((opt, oi) => h('button', {
          class: 'opt', html: MD.render(opt).replace(/^<p>|<\/p>$/g, ''),
          onclick: () => { st.answers[st.qIdx] = oi; st.qIdx++; render(); }
        }, )));
      page.appendChild(card);
    } else if (st.phase === 'tasks') {
      if (st.taskIdx >= tasks.length) return finish();
      const ex = tasks[st.taskIdx];
      const passed = !!st.taskPassed[ex.id];
      const next = h('div', { class: 'row mt' },
        h('button', { class: 'btn ghost', onclick: () => { st.taskIdx++; render(); } }, passed ? '' : 'Skip (0 pts)'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn primary', style: { display: passed ? '' : 'none' }, id: 'boss-next-task', onclick: () => { st.taskIdx++; render(); } },
          st.taskIdx + 1 < tasks.length ? 'Next task →' : 'Finish the fight →'));
      const trainer = Trainer.create(ex, {
        bossMode: true,
        onPass: () => {
          st.taskPassed[ex.id] = true;
          const btn = document.getElementById('boss-next-task');
          if (btn) btn.style.display = '';
        },
      });
      page.appendChild(h('div', { class: 'card' },
        header('coding task ' + (st.taskIdx + 1) + ' / ' + tasks.length + ' · worth ' + TASK_WEIGHT + ' questions'),
        h('h2', {}, ex.title),
        h('div', { class: 'lesson-body', html: MD.render(ex.description) }),
        trainer.el,
        next));
      setTimeout(() => trainer.refresh(), 50);
    }
  }

  function finish() {
    if (st.finished) return;
    st.finished = true;
    stopTimer();
    const correct = B.quiz.reduce((a, it, i) => a + (st.answers[i] === it.answer ? 1 : 0), 0);
    const passedTasks = Object.keys(st.taskPassed).length;
    const scorePct = Math.round(100 * (correct + passedTasks * TASK_WEIGHT) / maxScore);
    const passed = scorePct >= B.passPct;

    const prev = Store.S.bossResults[B.id] || { attempts: 0, scorePct: 0, passed: false };
    const firstPass = passed && !prev.passed;
    Store.S.bossResults[B.id] = {
      attempts: prev.attempts + 1,
      scorePct: Math.max(prev.scorePct || 0, scorePct),
      passed: prev.passed || passed,
      at: Date.now(),
    };
    Store.save();
    if (firstPass) {
      Store.markDone(B.id, { event: 'boss-pass', id: B.id, scorePct });
      Store.addXp(CFG.xp.bossPass + passedTasks * 40, B.title + ' defeated!');
      UI.confetti(220);
    }

    const wrongList = B.quiz.map((it, i) => ({ it, i, ok: st.answers[i] === it.answer, picked: st.answers[i] }))
      .filter(x => !x.ok);

    page.innerHTML = '';
    page.appendChild(h('div', { class: 'card verdict' },
      h('div', { class: 'v-big' }, passed ? (B.id === 'w5-boss' ? '🏆' : '👑') : '💀'),
      h('div', { class: 'v-score' }, scorePct + '%'),
      h('p', { style: { fontWeight: 700, fontSize: '18px', margin: '0' } },
        passed ? (B.id === 'w5-boss' ? 'THE GAUNTLET FALLS. You are interview-ready.' : 'Boss defeated!') : 'Not this time — but the reps count.'),
      h('p', { class: 'muted' }, 'Quiz ' + correct + '/' + B.quiz.length + ' · tasks ' + passedTasks + '/' + tasks.length +
        ' · pass mark ' + B.passPct + '%' + (firstPass ? ' · +' + (CFG.xp.bossPass + passedTasks * 40) + ' XP' : '')),
      h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
        h('button', { class: 'btn', onclick: () => { intro(); } }, '↻ Rematch'),
        ctx ? h('button', { class: 'btn primary', onclick: () => App.go('day/' + ctx.day.id) }, 'Back to day →') : null)));

    if (wrongList.length) {
      const rev = h('div', { class: 'card mt' }, h('h2', {}, '📚 Review your misses (' + wrongList.length + ')'));
      for (const w of wrongList) {
        rev.appendChild(h('div', { style: { borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '12px' } },
          h('div', { class: 'quiz-q', style: { fontSize: '15px' }, html: MD.render(w.it.q) }),
          h('div', { class: 'small', style: { color: 'var(--bad)' } }, 'Your answer: ' + (w.picked === null ? '(none)' : w.it.options[w.picked])),
          h('div', { class: 'small', style: { color: 'var(--good)' } }, 'Correct: ' + w.it.options[w.it.answer]),
          h('div', { class: 'explain', html: MD.render(w.it.explain) })));
      }
      page.appendChild(rev);
    }
    window.scrollTo(0, 0);
  }

  intro();
};
