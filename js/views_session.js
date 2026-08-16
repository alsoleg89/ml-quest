/* ML Quest — day session player, lesson reader, quiz player */
'use strict';

(function () {
  const { h } = UI;

  function blockInfo(block, day) {
    const IDX = Store.IDX;
    const meta = CFG.blockMeta[block.type] || { emoji: '❔', label: block.type };
    let title = '', sub = [], go = null, xpNote = '';
    if (block.type === 'lesson') {
      const L = IDX.lessons[block.id];
      title = L ? L.title : block.id;
      xpNote = '+' + CFG.xp.lesson + ' XP';
      go = () => App.go('lesson/' + block.id);
    } else if (block.type === 'quiz') {
      const Q = IDX.quizzes[block.id];
      title = 'Warm-up quiz';
      if (Q) xpNote = '+' + (Q.items.length * CFG.xp.quizPerCorrect) + ' XP max';
      const sc = Store.S.quizScores[block.id];
      if (sc) sub.push('best ' + sc.correct + '/' + sc.total);
      go = () => App.go('quiz/' + block.id);
    } else if (block.type === 'exercise' || block.type === 'homework') {
      const E = IDX.ex[block.id];
      title = E ? E.title : block.id;
      if (E) { sub.push(UI.stars(E.difficulty)); xpNote = '+' + E.xp + ' XP'; if (E.packages && E.packages.length) sub.push(E.packages.join('+')); }
      go = () => App.go('ex/' + block.id);
    } else if (block.type === 'cards') {
      const dmeta = CFG.decks[block.deck] || {};
      title = 'Flashcards — ' + (dmeta.title || block.deck);
      xpNote = '+' + (block.count * CFG.xp.card) + ' XP';
      go = () => { sessionCardsCtx = { dayId: day.id, key: block.key }; App.go('review/' + block.deck + '/' + block.count); };
    } else if (block.type === 'boss') {
      const B = IDX.bosses[block.id];
      title = B ? B.title : block.id;
      sub.push('⏱ ' + (B ? B.timeLimitMin : '?') + ' min');
      xpNote = '+' + CFG.xp.bossPass + ' XP';
      go = () => App.go('boss/' + block.id);
    } else if (block.type === 'case') {
      const C = IDX.cases[block.id];
      title = C ? C.title : block.id;
      if (C) { sub.push(C.stages.length + ' stages'); xpNote = '+' + C.xp + ' XP'; }
      go = () => App.go('case/' + block.id);
    }
    return { meta, title, sub, go, xpNote };
  }

  // context for marking a cards block done after a review session started from a day
  let sessionCardsCtx = null;
  window.__mlqCardsCtx = {
    get: () => sessionCardsCtx,
    clear: () => { sessionCardsCtx = null; },
  };

  Views.day = function (el, params) {
    const IDX = Store.IDX;
    const found = IDX.daysOrdered.find(x => x.day.id === params.id);
    if (!found) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Day not found.'))); return; }
    const { week, day } = found;
    const prog = IDX.dayProgress(day);

    // day-clear bonus (fires once, when returning to a fully cleared day)
    if (prog.pct >= 1 && !Store.isDone('daydone:' + day.id)) {
      Store.markDone('daydone:' + day.id, { event: 'day-clear' });
      UI.confetti(150);
      Store.addXp(25, 'Day cleared — ' + day.title + ' 🎉');
    }

    const blocks = IDX.dayBlocks(day).map(b => {
      const info = blockInfo(b, day);
      const done = Store.isDone(b.key);
      return h('div', { class: 'block-card' + (done ? ' done' : '') + (b.optional ? ' optional' : '') },
        h('div', { class: 'block-ico' }, done ? '✅' : info.meta.emoji),
        h('div', { class: 'block-main' },
          h('div', { class: 'block-title' }, info.title, b.optional ? h('span', { class: 'pill', style: { marginLeft: '8px' } }, 'optional') : null),
          h('div', { class: 'block-meta' }, [info.meta.label, UI.fmtMin(b.minutes), ...info.sub, info.xpNote].filter(Boolean).join(' · '))),
        h('button', { class: 'btn' + (done ? '' : ' primary'), onclick: info.go }, done ? 'Review' : 'Start'));
    });

    const di = week.days.findIndex(d => d.id === day.id);
    const prevD = week.days[di - 1] || null;
    const nextD = week.days[di + 1] || (IDX.weeks.find(w => w.num === week.num + 1) || { days: [] }).days[0] || null;

    el.appendChild(h('div', { class: 'page page-narrow' },
      h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('a', { href: '#/map', class: 'small muted' }, '← Map'),
        h('span', { class: 'spacer' }),
        prevD ? h('a', { href: '#/day/' + prevD.id, class: 'small muted' }, '← prev day') : null,
        nextD ? h('a', { href: '#/day/' + nextD.id, class: 'small muted' }, 'next day →') : null),
      h('h1', {}, week.emoji + ' ' + day.title),
      h('p', { class: 'sub' }, 'Week ' + week.num + ' · Day ' + (di + 1) + ' · ~' + UI.fmtMin(day.minutes) +
        ' · ' + prog.done + '/' + prog.total + ' core blocks done'),
      h('div', { class: 'progress' }, h('div', { style: { width: Math.round(prog.pct * 100) + '%' } })),
      prog.pct >= 1 ? h('div', { class: 'card mt', style: { textAlign: 'center' } },
        h('div', { style: { fontSize: '28px' } }, '🎉'),
        h('b', {}, 'Day cleared!'),
        h('p', { class: 'muted small' }, 'Optional blocks still give XP. Or push on →'),
        nextD ? h('button', { class: 'btn primary', onclick: () => App.go('day/' + nextD.id) }, 'Next day →') : null) : null,
      h('div', { class: 'block-list' }, ...blocks)));
  };

  Views.lesson = function (el, params) {
    const IDX = Store.IDX;
    const L = IDX.lessons[params.id];
    if (!L) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Lesson not found.'))); return; }
    const ctx = App.findDayOf(params.id);
    const done = Store.isDone(params.id);

    el.appendChild(h('div', { class: 'page page-narrow' },
      ctx ? h('a', { href: '#/day/' + ctx.day.id, class: 'small muted' }, '← ' + ctx.day.title) : null,
      h('h1', { style: { marginTop: '8px' } }, '📖 ' + L.title),
      h('div', { class: 'card lesson-body mt', html: MD.render(L.md) }),
      h('div', { class: 'row mt', style: { justifyContent: 'center', padding: '10px 0 30px' } },
        done
          ? h('span', { class: 'pill good' }, '✓ read')
          : h('button', {
              class: 'btn primary big', onclick: (e) => {
                if (Store.markDone(params.id, { event: 'lesson' })) Store.addXp(CFG.xp.lesson, 'Lesson read');
                if (ctx) App.go('day/' + ctx.day.id); else App.go('map');
              }
            }, '✓ Mark as read · +' + CFG.xp.lesson + ' XP'),
        ctx ? h('button', { class: 'btn ghost', onclick: () => App.go('day/' + ctx.day.id) }, 'Back to day') : null)));
  };

  Views.quiz = function (el, params) {
    const IDX = Store.IDX;
    const Q = IDX.quizzes[params.id];
    if (!Q) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Quiz not found.'))); return; }
    const ctx = App.findDayOf(params.id);
    const items = Q.items;
    const already = Store.isDone(params.id);
    let idx = 0;
    const results = new Array(items.length).fill(null); // true/false

    const page = h('div', { class: 'page page-narrow' });
    el.appendChild(page);

    function renderQ() {
      page.innerHTML = '';
      page.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } },
        ctx ? h('a', { href: '#/day/' + ctx.day.id, class: 'small muted' }, '← ' + ctx.day.title) : null,
        h('span', { class: 'spacer' }),
        already ? h('span', { class: 'pill' }, 'review mode — XP already banked') : null));

      if (idx >= items.length) return renderEnd();

      const it = items[idx];
      const segs = items.map((_, i) => h('div', { class: i < idx ? (results[i] ? 'hit' : 'miss') : i === idx ? 'cur' : '' }));
      const card = h('div', { class: 'card' },
        h('div', { class: 'quiz-progress' }, ...segs),
        h('div', { class: 'small dim', style: { marginBottom: '6px' } }, 'Question ' + (idx + 1) + ' / ' + items.length),
        h('div', { class: 'quiz-q', html: MD.render(it.q) }));
      const optBtns = it.options.map((opt, oi) =>
        h('button', { class: 'opt', html: MD.render(opt).replace(/^<p>|<\/p>$/g, ''), onclick: () => pick(oi) }));
      optBtns.forEach(b => card.appendChild(b));
      const after = h('div', {});
      card.appendChild(after);
      page.appendChild(card);

      function pick(oi) {
        if (results[idx] !== null) return;
        results[idx] = oi === it.answer;
        optBtns.forEach((b, i) => {
          b.disabled = true;
          if (i === it.answer) b.classList.add('correct');
          else if (i === oi) b.classList.add('wrong');
          else b.classList.add('faded');
        });
        after.appendChild(h('div', { class: 'explain', html: '<b>' + (results[idx] ? '✓ Correct.' : '✗ Not quite.') + '</b> ' + MD.render(it.explain) }));
        after.appendChild(h('div', { class: 'row mt' },
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn primary', onclick: () => { idx++; renderQ(); } },
            idx + 1 < items.length ? 'Next →' : 'Finish')));
        after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function renderEnd() {
      const correct = results.filter(Boolean).length;
      const first = !already;
      if (first) {
        Store.S.quizScores[params.id] = { correct, total: items.length };
        Store.markDone(params.id, { event: 'quiz' });
        if (correct > 0) Store.addXp(correct * CFG.xp.quizPerCorrect, 'Quiz: ' + correct + '/' + items.length);
        else Store.save();
      } else {
        const sc = Store.S.quizScores[params.id];
        if (sc && correct > sc.correct) Store.S.quizScores[params.id] = { correct, total: items.length };
        Store.save();
      }
      const pct = correct / items.length;
      page.appendChild(h('div', { class: 'card verdict' },
        h('div', { class: 'v-big' }, pct >= 0.8 ? '🔥' : pct >= 0.6 ? '👍' : '📚'),
        h('div', { class: 'v-score' }, correct + ' / ' + items.length),
        h('p', { class: 'muted' }, pct >= 0.8 ? 'Sharp. Interview-grade recall.' : pct >= 0.6 ? 'Solid — reread the explanations you missed.' : 'No stress: reread the lesson, then retake. Reps build recall.'),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn', onclick: () => { idx = 0; results.fill(null); renderQ(); } }, '↻ Retake'),
          ctx ? h('button', { class: 'btn primary', onclick: () => App.go('day/' + ctx.day.id) }, 'Back to day →') : null)));
      if (pct >= 0.8 && first) UI.confetti(70);
    }

    renderQ();
  };
})();
