/* ML Quest — Design Dojo: staged mock-interview case player + case library */
'use strict';

(function () {
  const { h } = UI;

  Views.dojo = function (el) {
    const { curriculum, extras } = Store.IDX.dojoList();
    if (!curriculum.length && !extras.length) {
      el.appendChild(h('div', { class: 'page page-narrow' },
        h('h1', {}, '🏛️ Design Dojo'),
        h('div', { class: 'card' }, 'No design cases yet — Weeks 6-7 content is not loaded.')));
      return;
    }
    function caseTile(c, optional) {
      const work = Store.S.caseWork[c.id];
      const done = Store.isDone(c.id);
      return h('div', { class: 'deck-tile', onclick: () => App.go('case/' + c.id) },
        h('div', { class: 'row' },
          h('span', { style: { fontSize: '22px' } }, '🏛️'),
          h('span', { class: 'spacer' }),
          done ? h('span', { class: 'pill good' }, '✓ ' + Math.round((work && work.coverage || 0) * 100) + '%')
               : work ? h('span', { class: 'pill warn' }, 'in progress') : null,
          optional ? h('span', { class: 'pill' }, 'optional') : null),
        h('div', { style: { fontWeight: 800, marginTop: '6px' } }, c.title),
        h('div', { class: 'small muted', style: { marginTop: '4px' } }, c.brief),
        h('div', { class: 'small dim', style: { marginTop: '8px' } },
          c.stages.length + ' stages · ~' + c.minutes + ' min · +' + c.xp + ' XP'));
    }
    el.appendChild(h('div', { class: 'page' },
      h('h1', {}, '🏛️ Design Dojo'),
      h('p', { class: 'sub' }, 'Mock system-design interviews. Type your answer for each stage OUT of your head first, then compare with the model answer and honestly tick what you covered — the XP is for your brain, not the leaderboard. Your answers are saved: reread them the night before a real interview.'),
      curriculum.length ? h('h2', {}, 'Curriculum cases') : null,
      h('div', { class: 'deck-grid' }, ...curriculum.map(c => caseTile(c, false))),
      extras.length ? h('h2', { style: { marginTop: '26px' } }, 'Extra practice') : null,
      h('div', { class: 'deck-grid' }, ...extras.map(c => caseTile(c, true)))));
  };

  Views.caseView = function (el, params) {
    const C = Store.IDX.cases[params.id];
    if (!C) { el.appendChild(h('div', { class: 'page' }, h('div', { class: 'card' }, 'Case not found.'))); return; }
    const ctx = App.findDayOf(C.id);
    const S = Store.S;
    if (!S.caseWork[C.id]) S.caseWork[C.id] = { stage: 0, answers: [], ticks: {}, coverage: 0 };
    const work = S.caseWork[C.id];
    const done = Store.isDone(C.id);

    const page = h('div', { class: 'page page-narrow' });
    el.appendChild(page);

    function totalRubric() { return C.stages.reduce((a, s) => a + s.rubric.length, 0); }
    function tickedCount() {
      let n = 0;
      for (const arr of Object.values(work.ticks)) n += arr.filter(Boolean).length;
      return n;
    }

    function render() {
      page.innerHTML = '';
      page.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('a', { href: ctx ? '#/day/' + ctx.day.id : '#/dojo', class: 'small muted' },
          '← ' + (ctx ? ctx.day.title : 'Dojo')),
        h('span', { class: 'spacer' }),
        h('span', { class: 'pill' }, (work.stage >= C.stages.length ? C.stages.length : work.stage) + ' / ' + C.stages.length + ' stages'),
        done ? h('span', { class: 'pill good' }, '✓ done') : h('span', { class: 'pill' }, '+' + C.xp + ' XP')));
      page.appendChild(h('h1', {}, '🏛️ ' + C.title));
      page.appendChild(h('div', { class: 'card lesson-body', html: MD.render(C.scenario) }));

      C.stages.forEach((st, i) => {
        if (i > work.stage) return;
        const isCurrent = i === work.stage && work.stage < C.stages.length;
        const revealed = i < work.stage || (work.ticks[i] !== undefined && !isCurrent) || (isCurrent && work.ticks[i] !== undefined);
        const cardEl = h('div', { class: 'card mt' });
        cardEl.appendChild(h('div', { class: 'row' },
          h('span', { class: 'pill acc' }, 'Stage ' + (i + 1)),
          h('b', {}, st.name),
          h('span', { class: 'spacer' }),
          work.ticks[i] ? h('span', { class: 'pill', id: 'cov-' + i }, work.ticks[i].filter(Boolean).length + '/' + st.rubric.length + ' covered') : null));
        cardEl.appendChild(h('div', { class: 'lesson-body', style: { marginTop: '8px' }, html: MD.render(st.prompt) }));

        // your answer
        const ta = h('textarea', {
          class: 'editor-fallback',
          placeholder: 'Think out loud here — bullets are fine. Write BEFORE you peek. (autosaves)',
          style: { minHeight: '120px', borderRadius: '11px', border: '1px solid var(--line)', background: 'var(--panel2)', color: 'var(--text)', marginTop: '10px' },
        });
        ta.value = work.answers[i] || '';
        ta.addEventListener('input', () => { work.answers[i] = ta.value; Store.save(); });
        cardEl.appendChild(ta);

        if (work.ticks[i] === undefined) {
          cardEl.appendChild(h('div', { class: 'row mt' },
            h('span', { class: 'small dim' }, 'No wrong answers here — but write something first.'),
            h('span', { class: 'spacer' }),
            h('button', {
              class: 'btn primary', onclick: () => {
                work.ticks[i] = new Array(st.rubric.length).fill(false);
                Store.save(); render();
              }
            }, '👀 Reveal model answer')));
        } else {
          cardEl.appendChild(h('div', { class: 'hint-box mt' },
            h('b', {}, '📋 Model answer'),
            h('div', { class: 'lesson-body', html: MD.render(st.model) })));
          const rub = h('div', { class: 'mt' }, h('b', {}, '✅ What did you cover? (tick honestly)'));
          st.rubric.forEach((r, ri) => {
            const cb = h('input', { type: 'checkbox', style: { width: '18px', height: '18px', flexShrink: 0 } });
            cb.checked = !!work.ticks[i][ri];
            cb.addEventListener('change', () => {
              work.ticks[i][ri] = cb.checked;
              Store.save();
              const pill = document.getElementById('cov-' + i);
              if (pill) pill.textContent = work.ticks[i].filter(Boolean).length + '/' + st.rubric.length + ' covered';
            });
            rub.appendChild(h('label', { class: 'quest-item', style: { cursor: 'pointer' } }, cb, h('span', { class: 'small', html: MD.render(r).replace(/^<p>|<\/p>$/g, '') })));
          });
          cardEl.appendChild(rub);
          if (isCurrent) {
            cardEl.appendChild(h('div', { class: 'row mt' },
              h('span', { class: 'spacer' }),
              h('button', {
                class: 'btn primary', onclick: () => { work.stage = i + 1; Store.save(); render(); window.scrollTo(0, document.body.scrollHeight); }
              }, i + 1 < C.stages.length ? 'Next stage →' : '🏁 Finish case')));
          }
        }
        page.appendChild(cardEl);
      });

      if (work.stage >= C.stages.length) renderSummary();
    }

    function renderSummary() {
      const cov = totalRubric() ? tickedCount() / totalRubric() : 0;
      work.coverage = cov;
      let xpNote = '';
      if (!done) {
        const xp = Math.max(Math.round(C.xp * 0.4), Math.round(C.xp * cov));
        Store.markDone(C.id, { event: 'case-done', id: C.id });
        Store.addXp(xp, C.title + ' — ' + Math.round(cov * 100) + '% coverage');
        UI.confetti(110);
        xpNote = '+' + xp + ' XP banked.';
      }
      Store.save();
      page.appendChild(h('div', { class: 'card verdict mt' },
        h('div', { class: 'v-big' }, cov >= 0.8 ? '🏛️' : cov >= 0.55 ? '📐' : '📚'),
        h('div', { class: 'v-score' }, Math.round(cov * 100) + '%'),
        h('p', { class: 'muted' },
          (cov >= 0.8 ? 'Interview-ready on this case. ' : cov >= 0.55 ? 'Solid skeleton — reread the stages where you missed rubric points. ' : 'Good rep. Redo this case in a few days — coverage climbs fast. ') + xpNote),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', {
            class: 'btn', onclick: () => {
              UI.confirmModal('Restart this case? Your typed answers stay, ticks reset.', () => {
                work.stage = 0; work.ticks = {}; Store.save(); App.render();
              }, 'Restart');
            }
          }, '↻ Redo'),
          h('button', { class: 'btn primary', onclick: () => App.go(ctx ? 'day/' + ctx.day.id : 'dojo') }, 'Done →'))));
    }

    render();
  };
})();
