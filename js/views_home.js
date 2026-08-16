/* ML Quest — home: continue CTA, daily quest, stats, weeks, badges */
'use strict';

Views.home = function (el) {
  const { h } = UI;
  const S = Store.S;
  const IDX = Store.IDX;

  if (!IDX.weeks.length) {
    el.appendChild(h('div', { class: 'page page-narrow' },
      h('div', { class: 'card' },
        h('h1', {}, '⚔️ ML Quest'),
        h('p', { class: 'muted' }, 'No course content found. The data files (data/week1.js …) are missing or broken — run node tools/validate.js to check.'))));
    return;
  }

  // overall progress
  let doneAll = 0, totalAll = 0;
  for (const W of IDX.weeks) { const p = IDX.weekProgress(W); doneAll += p.done; totalAll += p.total; }
  const overallPct = totalAll ? doneAll / totalAll : 0;

  const next = IDX.nextUp();
  const quest = Store.ensureQuest();
  const totals = IDX.totals();
  const exDone = Object.values(IDX.ex).filter(e => !e.kind && Store.isDone(e.id)).length;
  const hwDone = Object.values(IDX.ex).filter(e => e.kind === 'homework' && Store.isDone(e.id)).length;
  const bossesDone = Object.values(IDX.bosses).filter(b => (S.bossResults[b.id] || {}).passed).length;

  // hero
  let heroMain;
  if (next) {
    const meta = CFG.blockMeta[next.block.type] || {};
    const blockName = Store.ensureQuest && (function () {
      if (next.block.type === 'lesson') return (IDX.lessons[next.block.id] || {}).title;
      if (next.block.type === 'quiz') return 'Warm-up quiz';
      if (next.block.type === 'exercise' || next.block.type === 'homework') return (IDX.ex[next.block.id] || {}).title;
      if (next.block.type === 'cards') return 'Flashcards · ' + next.block.count;
      if (next.block.type === 'boss') return (IDX.bosses[next.block.id] || {}).title;
      return '';
    })();
    heroMain = h('div', { class: 'hero-main' },
      h('div', { class: 'hero-kicker' }, 'your quest continues'),
      h('div', { class: 'hero-title' }, next.week.emoji + ' Week ' + next.week.num + ' · ' + next.day.title),
      h('div', { class: 'hero-sub' }, 'Next up: ' + (meta.emoji || '') + ' ' + (blockName || '') +
        (next.block.minutes ? ' · ~' + next.block.minutes + ' min' : '')),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary big', onclick: () => App.go('day/' + next.day.id) }, '▶ Continue'),
        h('button', {
          class: 'btn', title: 'Lowest-friction start: a tiny step to beat the resistance',
          onclick: () => {
            const deckBlock = next.day.blocks.find(b => b.type === 'cards');
            const deck = deckBlock ? deckBlock.deck : 'python';
            App.go('review/' + deck + '/5');
          }
        }, '🔥 2-minute warm-up')));
  } else {
    heroMain = h('div', { class: 'hero-main' },
      h('div', { class: 'hero-kicker' }, 'quest complete'),
      h('div', { class: 'hero-title' }, '🏆 You finished ML Quest!'),
      h('div', { class: 'hero-sub' }, 'Keep the blade sharp: review flashcards and re-run bosses under time pressure.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary big', onclick: () => App.go('cards') }, '🃏 Review cards')));
  }

  const questCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h2', {}, '🎯 Daily quest'),
      h('span', { class: 'spacer' }),
      quest.claimed ? h('span', { class: 'pill good' }, 'claimed ✓') :
        h('button', {
          class: 'btn' + (quest.items.every(i => i.done) ? ' good' : ''),
          disabled: !quest.items.every(i => i.done),
          onclick: () => { if (Store.claimQuest()) App.render(); }
        }, 'Claim +' + CFG.xp.questBonus + ' XP')),
    ...quest.items.map(it => h('div', { class: 'quest-item' + (it.done ? ' done' : '') },
      h('div', { class: 'q-check' }, it.done ? '✓' : ''),
      h('div', { class: 'q-label' }, it.label))),
    h('p', { class: 'small dim', style: { marginBottom: 0 } },
      'Do the quest → keep the 🔥 streak. Miss a day? You have ' + S.streak.freezes + ' streak freeze' + (S.streak.freezes === 1 ? '' : 's') + '.'));

  const curWeek = next ? next.week : IDX.weeks[IDX.weeks.length - 1];
  const wp = IDX.weekProgress(curWeek);
  const bossRec = S.bossResults[(curWeek.boss || {}).id] || {};
  const weekCard = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('h2', {}, curWeek.emoji + ' Week ' + curWeek.num + ' — ' + curWeek.title),
      h('span', { class: 'spacer' }),
      h('span', { class: 'pill' }, wp.done + '/' + wp.total)),
    h('p', { class: 'muted small' }, curWeek.goal),
    h('div', { class: 'progress' }, h('div', { style: { width: Math.round(wp.pct * 100) + '%' } })),
    h('div', { class: 'row mt' },
      h('span', { class: 'pill' + (bossRec.passed ? ' good' : '') },
        '👑 ' + ((curWeek.boss || {}).title || 'Boss') + (bossRec.passed ? ' — defeated' : bossRec.attempts ? ' — best ' + bossRec.scorePct + '%' : '')),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn ghost', onclick: () => App.go('map') }, 'Open map →')));

  const stats = h('div', { class: 'stat-row' },
    h('div', { class: 'stat' }, h('div', { class: 'v' }, '🔥 ' + S.streak.count), h('div', { class: 'k' }, 'day streak')),
    h('div', { class: 'stat' }, h('div', { class: 'v' }, exDone + '/' + totals.exercises), h('div', { class: 'k' }, 'exercises solved')),
    h('div', { class: 'stat' }, h('div', { class: 'v' }, hwDone + '/' + totals.homework), h('div', { class: 'k' }, 'homeworks shipped')),
    h('div', { class: 'stat' }, h('div', { class: 'v' }, bossesDone + '/' + totals.bosses), h('div', { class: 'k' }, 'bosses defeated')));

  const weeksStrip = h('div', { class: 'card' },
    h('h2', {}, '🗺️ The road'),
    ...IDX.weeks.map(W => {
      const p = IDX.weekProgress(W);
      return h('div', { class: 'row road-row', style: { marginTop: '10px', cursor: 'pointer' }, onclick: () => App.go('map') },
        h('span', { class: 'road-emoji', style: { width: '30px', textAlign: 'center' } }, W.emoji),
        h('span', { class: 'road-label', style: { fontWeight: 700, fontSize: '14px' } }, 'W' + W.num + ' · ' + W.title),
        h('div', { class: 'progress thin road-bar', style: { flex: 1 } }, h('div', { style: { width: Math.round(p.pct * 100) + '%' } })),
        h('span', { class: 'small muted road-pct', style: { width: '52px', textAlign: 'right' } }, Math.round(p.pct * 100) + '%'));
    }));

  const badges = h('div', { class: 'card' },
    h('h2', {}, '🏅 Badges'),
    h('div', { class: 'badge-strip' },
      ...CFG.badges.map(b => h('div', {
        class: 'badge ' + (S.badges[b.id] ? 'earned' : 'locked'), title: b.desc
      }, h('div', { class: 'b-emoji' }, b.emoji), h('div', { class: 'b-name' }, b.title)))));

  el.appendChild(h('div', { class: 'page' },
    h('div', { class: 'card hero' },
      h('div', { class: 'hero-ring' }, UI.ring(overallPct, 110, Math.round(overallPct * 100) + '%', 'course')),
      heroMain),
    h('div', { class: 'grid2 mt', style: { marginTop: '16px' } }, questCard, weekCard),
    stats,
    h('div', { style: { marginTop: '16px' } }, weeksStrip),
    h('div', { style: { marginTop: '16px' } }, badges),
    h('div', { class: 'footer-note' }, 'Tip: consistency beats intensity. One block a day still finishes the quest. ⚔️')));
};
