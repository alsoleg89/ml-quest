/* ML Quest — state: XP, levels, streaks, badges, SRS, daily quest, content index */
'use strict';

window.Store = (function () {
  const KEY = CFG.storageKey;
  let S = null;
  let saveTimer = null;

  const DEFAULTS = () => ({
    v: 1,
    xp: 0,
    done: {},           // id -> ts
    fails: {},          // exercise id -> failed submit count
    quizScores: {},     // quiz id -> {correct, total}
    bossResults: {},    // boss id -> {scorePct, passed, attempts, at}
    code: {},           // exercise id -> source
    caseWork: {},       // case id -> {stage, answers: [], ticks: {}, coverage, doneAt}
    solutionSeen: {},
    hintsUsed: {},
    cards: {},          // card id -> {due, streak}
    cardsReviewed: 0,
    reviewsByDay: {},
    streak: { count: 0, last: null, freezes: 1 },
    badges: {},
    quest: null,
    questsClaimed: 0,
    activity: {},       // date -> xp earned
    settings: { theme: 'dark' },
    createdAt: Date.now(),
  });

  function todayStr(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dateDiffDays(a, b) { // a,b: 'YYYY-MM-DD'
    return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
  }

  function load() {
    S = DEFAULTS();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        for (const k of Object.keys(S)) if (k in saved) S[k] = saved[k];
      }
    } catch (e) { console.warn('state load failed', e); }
    document.documentElement.dataset.theme = S.settings.theme || 'dark';
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 250);
  }
  window.addEventListener('beforeunload', () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} });

  // ---------- content index ----------
  const IDX = {
    weeks: [], daysOrdered: [], ex: {}, lessons: {}, quizzes: {}, bosses: {}, cases: {}, cardsByDeck: {}, cardById: {},
    build() {
      this.weeks = [...CourseData.weeks].sort((a, b) => a.num - b.num);
      this.daysOrdered = []; this.ex = {}; this.lessons = {}; this.quizzes = {}; this.bosses = {}; this.cases = {};
      for (const W of this.weeks) {
        for (const d of W.days) this.daysOrdered.push({ week: W, day: d });
        Object.entries(W.exercises || {}).forEach(([id, e]) => { this.ex[id] = { ...e, id, weekId: W.id }; });
        Object.entries(W.lessons || {}).forEach(([id, l]) => { this.lessons[id] = { ...l, id, weekId: W.id }; });
        Object.entries(W.quizzes || {}).forEach(([id, q]) => { this.quizzes[id] = { items: q, id, weekId: W.id }; });
        Object.entries(W.cases || {}).forEach(([id, c]) => { this.cases[id] = { ...c, id, weekId: W.id }; });
        if (W.boss) this.bosses[W.boss.id] = { ...W.boss, weekId: W.id };
      }
      for (const c of (CourseData.dojoExtras || [])) this.cases[c.id] = { ...c, extra: true };
      this.cardsByDeck = {}; this.cardById = {};
      for (const c of CourseData.cards) {
        (this.cardsByDeck[c.deck] = this.cardsByDeck[c.deck] || []).push(c);
        this.cardById[c.id] = c;
      }
    },
    dayBlocks(day) {
      return day.blocks.map((b, i) => {
        const key = b.type === 'cards' ? 'cards:' + day.id + ':' + i : b.id;
        return { ...b, key, idx: i };
      });
    },
    coreBlocks(day) { return this.dayBlocks(day).filter(b => !b.optional); },
    dayProgress(day) {
      const core = this.coreBlocks(day);
      const done = core.filter(b => !!S.done[b.key]).length;
      return { done, total: core.length, pct: core.length ? done / core.length : 0 };
    },
    weekProgress(W) {
      let done = 0, total = 0;
      for (const d of W.days) { const p = this.dayProgress(d); done += p.done; total += p.total; }
      return { done, total, pct: total ? done / total : 0 };
    },
    weekDone(wid) {
      const W = this.weeks.find(w => w.id === wid);
      if (!W) return false;
      return this.weekProgress(W).pct >= 1;
    },
    allHomeworkDone() {
      const hws = Object.values(this.ex).filter(e => e.kind === 'homework');
      return hws.length > 0 && hws.every(e => !!S.done[e.id]);
    },
    nextUp() {
      for (const { week, day } of this.daysOrdered) {
        const blocks = this.coreBlocks(day);
        const block = blocks.find(b => !S.done[b.key]);
        if (block) return { week, day, block };
      }
      return null;
    },
    dojoList() {
      const ordered = [];
      for (const { day } of this.daysOrdered) {
        for (const b of day.blocks) if (b.type === 'case' && this.cases[b.id]) ordered.push(this.cases[b.id]);
      }
      const referenced = new Set(ordered.map(c => c.id));
      const rest = Object.values(this.cases).filter(c => !referenced.has(c.id));
      return { curriculum: ordered, extras: rest };
    },
    totals() {
      const ex = Object.values(this.ex);
      return {
        exercises: ex.filter(e => !e.kind).length,
        homework: ex.filter(e => e.kind === 'homework').length,
        bosses: Object.keys(this.bosses).length,
        cards: CourseData.cards.length,
        days: this.daysOrdered.length,
      };
    },
  };

  // ---------- xp / levels / streak ----------
  function level() {
    const L = CFG.levels;
    let idx = 0;
    for (let i = 0; i < L.length; i++) if (S.xp >= L[i].xp) idx = i;
    const cur = L[idx], next = L[idx + 1] || null;
    const pct = next ? (S.xp - cur.xp) / (next.xp - cur.xp) : 1;
    return { n: idx + 1, title: cur.title, cur, next, pct };
  }

  function touchStreak() {
    const today = todayStr();
    const st = S.streak;
    let comeback = false;
    if (st.last === today) return { comeback };
    if (!st.last) { st.count = 1; }
    else {
      const gap = dateDiffDays(st.last, today);
      if (gap === 1) st.count += 1;
      else if (gap === 2 && st.freezes > 0) { st.freezes -= 1; st.count += 1; UI.toast('🧊 Streak freeze used — streak saved!', 'gold'); }
      else if (gap > 1) { if (gap >= 3) comeback = true; st.count = 1; }
    }
    st.last = today;
    return { comeback };
  }

  function addXp(n, label) {
    if (!n) return;
    const before = level().n;
    S.xp += n;
    const today = todayStr();
    S.activity[today] = (S.activity[today] || 0) + n;
    const { comeback } = touchStreak();
    UI.toast('+' + n + ' XP' + (label ? ' — ' + label : ''), 'good', 2200);
    const after = level();
    if (after.n > before) {
      UI.confetti(160);
      UI.toast('⬆️ <b>Level ' + after.n + ' — ' + after.title + '</b>', 'gold', 5000);
    }
    checkBadges({ event: 'xp', comeback });
    save();
    if (window.App && App.refreshHud) App.refreshHud();
  }

  // ---------- completion ----------
  function markDone(key, ctx = {}) {
    if (S.done[key]) return false;
    S.done[key] = Date.now();
    ensureQuest();
    checkBadges(ctx);
    save();
    return true;
  }
  const isDone = key => !!S.done[key];

  function checkBadges(ctx = {}) {
    for (const b of CFG.badges) {
      if (S.badges[b.id]) continue;
      let ok = false;
      try { ok = b.check(S, ctx, IDX); } catch (e) {}
      if (ok) {
        S.badges[b.id] = Date.now();
        UI.toast(b.emoji + ' Badge unlocked: <b>' + b.title + '</b>', 'gold', 5000);
        UI.confetti(90);
      }
    }
    save();
  }

  // ---------- daily quest ----------
  function ensureQuest() {
    const today = todayStr();
    if (S.quest && S.quest.date === today) { refreshQuestDone(); return S.quest; }
    const items = [];
    let cursor = IDX.nextUp();
    const seen = new Set();
    while (cursor && items.length < 3) {
      const { day, block } = cursor;
      if (seen.has(block.key)) break;
      seen.add(block.key);
      items.push({ key: block.key, label: questLabel(day, block) });
      // find following core block after this one
      const blocks = IDX.coreBlocks(day);
      const i = blocks.findIndex(b => b.key === block.key);
      let nb = blocks[i + 1];
      if (nb) cursor = { week: cursor.week, day, block: nb };
      else {
        const di = IDX.daysOrdered.findIndex(x => x.day.id === day.id);
        const nx = IDX.daysOrdered[di + 1];
        cursor = nx ? { week: nx.week, day: nx.day, block: IDX.coreBlocks(nx.day)[0] } : null;
      }
    }
    if (items.length < 3) items.push({ key: 'cards-daily', label: 'Review 8 flashcards', cardsNeeded: 8 });
    S.quest = { date: today, items, claimed: false };
    refreshQuestDone();
    save();
    return S.quest;
  }
  function questLabel(day, block) {
    const meta = CFG.blockMeta[block.type] || {};
    let name = '';
    if (block.type === 'lesson') name = (IDX.lessons[block.id] || {}).title || 'Lesson';
    else if (block.type === 'quiz') name = 'Quiz: ' + day.title;
    else if (block.type === 'exercise' || block.type === 'homework') name = (IDX.ex[block.id] || {}).title || 'Exercise';
    else if (block.type === 'cards') name = 'Review ' + block.count + ' cards';
    else if (block.type === 'boss') name = (IDX.bosses[block.id] || {}).title || 'Boss';
    else if (block.type === 'case') name = (IDX.cases[block.id] || {}).title || 'Design case';
    return (meta.emoji || '') + ' ' + name;
  }
  function refreshQuestDone() {
    if (!S.quest) return;
    const today = todayStr();
    for (const it of S.quest.items) {
      it.done = it.cardsNeeded ? (S.reviewsByDay[today] || 0) >= it.cardsNeeded : !!S.done[it.key];
    }
  }
  function claimQuest() {
    ensureQuest();
    if (S.quest.claimed || !S.quest.items.every(i => i.done)) return false;
    S.quest.claimed = true;
    S.questsClaimed += 1;
    addXp(CFG.xp.questBonus, 'Daily quest complete 🎯');
    checkBadges({ event: 'quest' });
    return true;
  }

  // ---------- flashcards SRS ----------
  const SRS_STEPS_DAYS = [1, 3, 7, 14, 30];
  function gradeCard(cardId, ok) {
    const rec = S.cards[cardId] || { streak: 0, due: 0 };
    if (ok) {
      rec.streak += 1;
      const days = SRS_STEPS_DAYS[Math.min(rec.streak - 1, SRS_STEPS_DAYS.length - 1)];
      rec.due = Date.now() + days * 86400000;
    } else {
      rec.streak = 0;
      rec.due = Date.now() + 10 * 60000;
    }
    S.cards[cardId] = rec;
    S.cardsReviewed += 1;
    const t = todayStr();
    S.reviewsByDay[t] = (S.reviewsByDay[t] || 0) + 1;
    refreshQuestDone();
    if (ok) addXp(CFG.xp.card, null); else save();
    checkBadges({ event: 'card' });
  }
  function pickCards(deck, n) {
    const pool = IDX.cardsByDeck[deck] || [];
    const now = Date.now();
    const due = [], fresh = [], later = [];
    for (const c of pool) {
      const rec = S.cards[c.id];
      if (!rec) fresh.push(c);
      else if (rec.due <= now) due.push(c);
      else later.push(c);
    }
    due.sort((a, b) => (S.cards[a.id].due - S.cards[b.id].due));
    later.sort((a, b) => (S.cards[a.id].due - S.cards[b.id].due));
    return [...due, ...fresh, ...later].slice(0, n);
  }
  function deckStats(deck) {
    const pool = IDX.cardsByDeck[deck] || [];
    const now = Date.now();
    let due = 0, seen = 0;
    for (const c of pool) {
      const rec = S.cards[c.id];
      if (rec) { seen++; if (rec.due <= now) due++; }
    }
    return { total: pool.length, seen, due, fresh: pool.length - seen };
  }

  // ---------- misc ----------
  function exportJson() { return JSON.stringify(S, null, 2); }
  function importJson(text) {
    const obj = JSON.parse(text);
    if (typeof obj.xp !== 'number' || !obj.done) throw new Error('not an ML Quest save file');
    localStorage.setItem(KEY, JSON.stringify(obj));
    load();
  }
  function resetAll() { localStorage.removeItem(KEY); load(); }

  function setTheme(t) { S.settings.theme = t; document.documentElement.dataset.theme = t; save(); }

  return {
    get S() { return S; },
    IDX, load, save, level, addXp, markDone, isDone, checkBadges,
    ensureQuest, claimQuest, gradeCard, pickCards, deckStats,
    exportJson, importJson, resetAll, setTheme, todayStr,
  };
})();
