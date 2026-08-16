/* ML Quest — flashcards: deck hub, review sessions (SRS), question bank browser */
'use strict';

(function () {
  const { h } = UI;

  Views.cards = function (el) {
    const tiles = Object.entries(CFG.decks).map(([deck, meta]) => {
      const st = Store.deckStats(deck);
      if (st.total === 0) return null;
      return h('div', { class: 'deck-tile', onclick: () => App.go('review/' + deck + '/12') },
        h('div', { style: { fontSize: '30px' } }, meta.emoji),
        h('div', { style: { fontWeight: 800, marginTop: '4px' } }, meta.title),
        h('div', { class: 'small muted', style: { marginTop: '4px' } }, st.total + ' cards'),
        h('div', { class: 'row', style: { marginTop: '10px', gap: '6px' } },
          st.due ? h('span', { class: 'pill warn' }, st.due + ' due') : null,
          st.fresh ? h('span', { class: 'pill' }, st.fresh + ' new') : null,
          !st.due && !st.fresh ? h('span', { class: 'pill good' }, 'all scheduled ✓') : null));
    }).filter(Boolean);

    el.appendChild(h('div', { class: 'page' },
      h('h1', {}, '🃏 Interview flashcards'),
      h('p', { class: 'sub' }, 'Spaced repetition on real interview questions. "Got it" pushes a card further out (1 → 3 → 7 → 14 → 30 days); "Again" brings it back in 10 minutes. The cross-cutting decks (Training, Inference, Quantization, Production) mirror the roadmap\'s OPT / INF / QTZ / PRD question lists.'),
      h('div', { class: 'deck-grid' }, ...tiles),
      h('div', { class: 'row mt', style: { justifyContent: 'center' } },
        h('button', { class: 'btn', onclick: () => App.go('bank') }, '🔎 Browse all questions'))));
  };

  Views.review = function (el, params) {
    const deck = params.deck;
    const n = Math.max(1, Math.min(30, parseInt(params.n, 10) || 10));
    const meta = CFG.decks[deck] || { title: deck, emoji: '🃏' };
    const cards = Store.pickCards(deck, n);
    const ctx = window.__mlqCardsCtx ? window.__mlqCardsCtx.get() : null;
    let i = 0, got = 0;

    const page = h('div', { class: 'page page-narrow' });
    el.appendChild(page);

    if (!cards.length) {
      page.appendChild(h('div', { class: 'card' }, 'This deck is empty.'));
      return;
    }

    function renderCard() {
      page.innerHTML = '';
      page.appendChild(h('div', { class: 'row', style: { marginBottom: '12px' } },
        h('a', { href: ctx ? '#/day/' + ctx.dayId : '#/cards', class: 'small muted' }, '← back'),
        h('span', { class: 'spacer' }),
        h('span', { class: 'pill' }, meta.emoji + ' ' + meta.title),
        h('span', { class: 'pill' }, (i + 1) + ' / ' + cards.length)));

      if (i >= cards.length) return renderEnd();
      const c = cards[i];
      const flash = h('div', { class: 'flash' },
        h('div', { class: 'small dim', style: { marginBottom: '10px' } }, 'L' + c.level + (c.tags && c.tags.length ? ' · ' + c.tags.join(' · ') : '')),
        h('div', { class: 'f-q', html: MD.render(c.q) }));
      const actions = h('div', { class: 'row', style: { justifyContent: 'center', marginTop: '18px' } });

      function showAnswer() {
        actions.innerHTML = '';
        flash.appendChild(h('div', { class: 'f-a lesson-body', html: MD.render(c.a) }));
        actions.appendChild(h('button', {
          class: 'btn', onclick: () => { Store.gradeCard(c.id, false); i++; renderCard(); }
        }, '↻ Again'));
        actions.appendChild(h('button', {
          class: 'btn good', onclick: () => { Store.gradeCard(c.id, true); got++; i++; renderCard(); }
        }, '✓ Got it · +' + CFG.xp.card + ' XP'));
      }
      actions.appendChild(h('button', { class: 'btn primary big', onclick: showAnswer }, 'Show answer'));
      page.appendChild(flash);
      page.appendChild(actions);
      page.appendChild(h('p', { class: 'small dim', style: { textAlign: 'center', marginTop: '14px' } },
        'Say the answer OUT LOUD first — that\'s the interview muscle you\'re training.'));
    }

    function renderEnd() {
      // credit the day block that launched this session
      if (ctx && ctx.key && !Store.isDone(ctx.key)) {
        Store.markDone(ctx.key, { event: 'cards-block' });
        window.__mlqCardsCtx.clear();
      }
      page.appendChild(h('div', { class: 'card verdict' },
        h('div', { class: 'v-big' }, got >= cards.length * 0.8 ? '🧠' : '📚'),
        h('div', { class: 'v-score' }, got + ' / ' + cards.length),
        h('p', { class: 'muted' }, 'Cards you missed come back in 10 minutes. Cards you know retreat further each time.'),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn', onclick: () => { App.render(); } }, '↻ Another round'),
          h('button', { class: 'btn primary', onclick: () => App.go(ctx ? 'day/' + ctx.dayId : 'cards') }, 'Done →'))));
    }

    renderCard();
  };

  Views.bank = function (el) {
    let filterDeck = '', filterText = '';
    const list = h('div', {});

    function renderList() {
      list.innerHTML = '';
      const q = filterText.toLowerCase();
      let shown = 0;
      for (const c of CourseData.cards) {
        if (filterDeck && c.deck !== filterDeck) continue;
        if (q && !(c.q.toLowerCase().includes(q) || c.a.toLowerCase().includes(q))) continue;
        shown++;
        if (shown > 200) break;
        const item = h('div', {
          class: 'card bank-item', style: { marginTop: '10px', padding: '14px 18px' },
          onclick: () => item.classList.toggle('open')
        },
          h('div', { class: 'row' },
            h('span', { class: 'pill' }, (CFG.decks[c.deck] || {}).emoji + ' ' + c.deck),
            h('span', { class: 'pill' }, 'L' + c.level),
            h('span', { class: 'small dim' }, c.id)),
          h('div', { style: { fontWeight: 600, marginTop: '6px' }, html: MD.render(c.q) }),
          h('div', { class: 'f-a-wrap lesson-body', html: MD.render(c.a) }));
        list.appendChild(item);
      }
      if (!shown) list.appendChild(h('p', { class: 'muted', style: { marginTop: '20px' } }, 'Nothing matches.'));
    }

    const chips = h('div', { class: 'row', style: { marginTop: '12px' } },
      ...['', ...Object.keys(CFG.decks)].map(d => {
        const btn = h('button', {
          class: 'btn ghost', style: { padding: '5px 12px', fontSize: '13px' },
          onclick: () => { filterDeck = d; [...chips.children].forEach(c => c.classList.remove('primary')); btn.classList.add('primary'); renderList(); }
        }, d === '' ? 'All' : (CFG.decks[d] || {}).emoji + ' ' + (CFG.decks[d] || {}).title);
        if (d === '') btn.classList.add('primary');
        return btn;
      }));

    const search = h('input', {
      class: 'editor-fallback', placeholder: '🔎 Search questions… (e.g. "gradient", "LoRA", "GIL")',
      style: { minHeight: 'auto', height: '44px', borderRadius: '11px', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', marginTop: '12px' },
    });
    search.addEventListener('input', () => { filterText = search.value; renderList(); });

    el.appendChild(h('div', { class: 'page page-narrow' },
      h('h1', {}, '🔎 Question bank'),
      h('p', { class: 'sub' }, CourseData.cards.length + ' interview questions with model answers. Click a question to reveal. For active recall, use the flashcard decks instead.'),
      search, chips, list));
    renderList();
  };
})();
