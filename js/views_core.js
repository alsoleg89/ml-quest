/* ML Quest — app shell: router, topbar HUD, settings */
'use strict';

window.Views = {};

window.App = (function () {
  const { h } = UI;
  let contentEl = null;

  const routes = [];
  function route(pattern, fn) { routes.push({ parts: pattern.split('/').filter(Boolean), fn }); }

  function parseHash() {
    const hash = location.hash.replace(/^#\/?/, '');
    return hash.split('/').filter(Boolean).map(decodeURIComponent);
  }

  function match() {
    const seg = parseHash();
    if (seg.length === 0) return { fn: Views.home, params: {} };
    for (const r of routes) {
      if (r.parts.length !== seg.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < r.parts.length; i++) {
        if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = seg[i];
        else if (r.parts[i] !== seg[i]) { ok = false; break; }
      }
      if (ok) return { fn: r.fn, params };
    }
    return { fn: Views.home, params: {} };
  }

  function go(path) { location.hash = path; }

  function findDayOf(refId) {
    for (const { week, day } of Store.IDX.daysOrdered) {
      for (const b of Store.IDX.dayBlocks(day)) {
        if (b.id === refId || b.key === refId) return { week, day };
      }
      if (week.boss && week.boss.id === refId) return { week, day };
      if (week.boss && (week.boss.tasks || []).includes(refId)) return { week, day };
    }
    return null;
  }

  // ---------- topbar ----------
  function topbar() {
    const S = Store.S;
    const lv = Store.level();
    const seg = parseHash();
    const section = seg[0] || 'home';
    const navLink = (href, label, keys) =>
      h('a', { href: '#/' + href, class: keys.includes(section) ? 'active' : '' }, label);
    const streakActive = S.streak.last === Store.todayStr();
    return h('div', { class: 'topbar', id: 'topbar' },
      h('div', { class: 'logo' }, '⚔️ ', h('span', { class: 'lg-grad' }, 'ML Quest')),
      h('nav', { class: 'nav' },
        navLink('', 'Home', ['home', '']),
        navLink('map', 'Map', ['map', 'day', 'lesson', 'quiz', 'ex', 'boss']),
        navLink('dojo', 'Dojo', ['dojo', 'case']),
        navLink('cards', 'Cards', ['cards', 'review']),
        navLink('bank', 'Bank', ['bank']),
        navLink('play', 'Playground', ['play'])),
      h('div', { class: 'topbar-right' },
        h('div', { class: 'streak-chip' + (streakActive ? '' : ' cold'), title: 'Daily streak · freezes: ' + S.streak.freezes },
          '🔥 ' + S.streak.count),
        h('div', { class: 'xp-wrap' },
          h('div', { class: 'xp-top' },
            h('span', {}, S.xp + ' XP'),
            h('span', {}, lv.next ? (lv.next.xp - S.xp) + ' to lvl ' + (lv.n + 1) : 'MAX')),
          h('div', { class: 'xp-bar' }, h('div', { style: { width: Math.round(lv.pct * 100) + '%' } }))),
        h('div', { class: 'lvl-chip', title: 'Level ' + lv.n }, 'Lv ' + lv.n + ' · ' + lv.title),
        h('button', {
          class: 'icon-btn', title: 'Switch content language / Переключить язык',
          onclick: () => Store.setLang(Store.S.settings.lang === 'ru' ? 'en' : 'ru')
        }, Store.S.settings.lang === 'ru' ? 'EN' : 'RU'),
        h('button', {
          class: 'icon-btn', title: 'Toggle theme',
          onclick: () => { Store.setTheme(Store.S.settings.theme === 'dark' ? 'light' : 'dark'); }
        }, Store.S.settings.theme === 'dark' ? '☀️' : '🌙'),
        h('button', { class: 'icon-btn', title: 'Settings', onclick: settingsModal }, '⚙️')));
  }

  function refreshHud() {
    const old = document.getElementById('topbar');
    if (old) old.replaceWith(topbar());
  }

  function settingsModal() {
    const wrap = h('div', {},
      h('h2', {}, '⚙️ Settings'),
      h('p', { class: 'muted small' }, 'Progress is saved in this browser (localStorage). Export a backup if you care about your streak.'),
      h('div', { class: 'row mt' },
        h('button', {
          class: 'btn', onclick: () => {
            const blob = new Blob([Store.exportJson()], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: 'mlquest-save-' + Store.todayStr() + '.json' });
            document.body.appendChild(a); a.click(); a.remove();
          }
        }, '⬇️ Export progress'),
        h('button', {
          class: 'btn', onclick: () => {
            const inp = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
            inp.addEventListener('change', () => {
              const f = inp.files[0];
              if (!f) return;
              f.text().then(t => {
                try { Store.importJson(t); UI.toast('Progress imported ✓', 'good'); m.close(); render(); }
                catch (e) { UI.toast('Import failed: ' + e.message, 'bad'); }
              });
            });
            document.body.appendChild(inp); inp.click();
          }
        }, '⬆️ Import')),
      h('div', { class: 'row mt' },
        h('button', {
          class: 'btn danger', onclick: () => {
            m.close();
            UI.confirmModal('Reset ALL progress (XP, streak, badges, code)? This cannot be undone.', () => {
              Store.resetAll(); UI.toast('Progress reset', ''); render();
            }, 'Reset everything');
          }
        }, '🗑️ Reset progress'),
        h('span', { class: 'spacer' }),
        h('a', { href: '#/qa', class: 'small dim', onclick: () => m.close() }, 'content QA')),
      h('p', { class: 'small dim mt' }, 'ML Quest · local app · Python runs in your browser via Pyodide (internet needed on first load).'));
    const m = UI.modal(wrap);
  }

  // ---------- render ----------
  function render() {
    const root = document.getElementById('app');
    root.innerHTML = '';
    root.appendChild(topbar());
    contentEl = h('div', {});
    root.appendChild(contentEl);
    const { fn, params } = match();
    try {
      fn(contentEl, params);
    } catch (e) {
      console.error(e);
      contentEl.appendChild(h('div', { class: 'page' },
        h('div', { class: 'card' }, h('h2', {}, '💥 Render error'), h('pre', { class: 'console' }, String(e.stack || e)))));
    }
    window.scrollTo(0, 0);
  }

  function boot() {
    Store.load();
    if (Store.S.settings.lang === 'ru') Store.applyRu();
    Store.IDX.build();
    Store.ensureQuest();
    window.addEventListener('hashchange', render);
    render();
  }

  return { route, go, render, boot, refreshHud, findDayOf };
})();
