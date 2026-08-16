/* ML Quest — DOM helpers, toasts, modals, confetti, progress rings */
'use strict';

window.UI = (function () {
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  let toastWrap = null;
  function toast(msg, type = '', ms = 3400) {
    if (!toastWrap) { toastWrap = h('div', { class: 'toast-wrap' }); document.body.appendChild(toastWrap); }
    const t = h('div', { class: 'toast ' + type, html: msg });
    toastWrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 450); }, ms);
  }

  function modal(content, opts = {}) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal' });
    if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
    back.appendChild(box);
    function close() { back.remove(); if (opts.onClose) opts.onClose(); }
    back.addEventListener('click', e => { if (e.target === back && opts.dismissable !== false) close(); });
    document.body.appendChild(back);
    return { close, box };
  }

  function confirmModal(text, onYes, yesLabel = 'Yes, do it') {
    const wrap = h('div', {},
      h('p', { style: { marginTop: '0' } }, text),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '18px' } },
        h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Cancel'),
        h('button', { class: 'btn danger', onclick: () => { m.close(); onYes(); } }, yesLabel)));
    const m = modal(wrap);
    return m;
  }

  const CONF_COLORS = ['#7c5cff', '#00d4ff', '#2dd4a7', '#ffd166', '#ff5c7a', '#ffffff'];
  function confetti(count = 140) {
    let cv = document.getElementById('confetti-canvas');
    if (!cv) { cv = h('canvas', { id: 'confetti-canvas' }); document.body.appendChild(cv); }
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const parts = [];
    for (let i = 0; i < count; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - .5) * 240,
        y: innerHeight * 0.35,
        vx: (Math.random() - .5) * 11,
        vy: -Math.random() * 12 - 3,
        s: 4 + Math.random() * 5,
        r: Math.random() * Math.PI,
        vr: (Math.random() - .5) * 0.3,
        c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0],
      });
    }
    const t0 = performance.now();
    function frame(t) {
      const dt = 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.vy += 0.28 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (t - t0 < 2400) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    }
    requestAnimationFrame(frame);
  }

  function ring(pct, size = 92, label = '', sub = '') {
    const r = (size - 10) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(1, pct)));
    const wrap = h('div', { class: 'ring-wrap', style: { width: size + 'px', height: size + 'px' } });
    wrap.innerHTML =
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--panel2)" stroke-width="8"/>' +
      '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#00d4ff"/></linearGradient></defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#rg)" stroke-width="8" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" ' +
      'transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" style="transition: stroke-dashoffset .6s"/></svg>';
    wrap.appendChild(h('div', { class: 'ring-label' }, label, sub ? h('span', { class: 'r-sub' }, sub) : null));
    return wrap;
  }

  function fmtMin(min) {
    if (!min) return '';
    const hrs = Math.floor(min / 60), m = min % 60;
    return hrs ? hrs + 'h ' + (m ? m + 'm' : '') : m + ' min';
  }

  function stars(diff) { return '★'.repeat(diff) + '☆'.repeat(3 - diff); }

  return { h, toast, modal, confirmModal, confetti, ring, fmtMin, stars };
})();
