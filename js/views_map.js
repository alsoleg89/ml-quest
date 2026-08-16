/* ML Quest — course map: weeks and day nodes */
'use strict';

Views.map = function (el) {
  const { h } = UI;
  const IDX = Store.IDX;
  const next = IDX.nextUp();

  const weeks = IDX.weeks.map(W => {
    const wp = IDX.weekProgress(W);
    const bossRec = Store.S.bossResults[(W.boss || {}).id] || {};
    return h('div', { class: 'card week-card' },
      h('div', { class: 'week-head' },
        h('span', { class: 'week-emoji' }, W.emoji),
        h('span', { class: 'week-title' }, 'Week ' + W.num + ' — ' + W.title),
        h('span', { class: 'pill' }, W.subtitle),
        h('span', { class: 'spacer' }),
        bossRec.passed ? h('span', { class: 'pill good' }, '👑 boss down') : null,
        h('span', { class: 'pill' }, Math.round(wp.pct * 100) + '%')),
      h('p', { class: 'muted small', style: { margin: '8px 0 0' } }, W.goal),
      h('div', { class: 'day-nodes' },
        ...W.days.map((d, i) => {
          const p = IDX.dayProgress(d);
          const isNext = next && next.day.id === d.id;
          const hasBoss = d.blocks.some(b => b.type === 'boss');
          const cls = 'day-node' + (p.pct >= 1 ? ' done' : '') + (isNext ? ' next' : '') + (hasBoss ? ' bossday' : '');
          return h('div', { class: cls, onclick: () => App.go('day/' + d.id) },
            h('div', { class: 'd-num' }, 'DAY ' + (i + 1) + (hasBoss ? ' · 👑 BOSS' : '')),
            h('div', { class: 'd-title' }, d.title),
            h('div', { class: 'progress thin' }, h('div', { style: { width: Math.round(p.pct * 100) + '%' } })),
            h('div', { class: 'small dim', style: { marginTop: '6px' } },
              p.pct >= 1 ? '✓ cleared' : p.done + '/' + p.total + ' · ' + UI.fmtMin(d.minutes)));
        })));
  });

  el.appendChild(h('div', { class: 'page' },
    h('h1', {}, '🗺️ Course map'),
    h('p', { class: 'sub' }, '5 weeks · ' + IDX.totals().days + ' sessions · every week ends with a boss exam (T1–T6 from the roadmap). The glowing node is your recommended next step — but nothing is locked.'),
    ...weeks));
};
