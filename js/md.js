/* ML Quest — markdown dialect renderer + tiny Python highlighter.
   Dialect: ## ### #### headings, **bold**, *italic*, ~inline code~,
   ~~~lang fences, - and 1. lists, [text](url), > quotes, --- rule. */
'use strict';

window.MD = (function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ESC[c]); }

  const PY_KW = new Set(('False None True and as assert async await break class continue def del elif else except ' +
    'finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case').split(' '));
  const PY_BUILTIN = new Set(('print len range enumerate zip map filter sorted sum min max abs round isinstance type ' +
    'list dict set tuple str int float bool super self cls object Exception ValueError TypeError KeyError IndexError ' +
    'StopIteration RuntimeError NotImplementedError AssertionError staticmethod classmethod property repr hash iter next ' +
    'getattr setattr hasattr vars any all open input format id frozenset bytes reversed divmod pow').split(' '));

  function hlPython(code) {
    let out = '', i = 0;
    const n = code.length;
    let prevWord = '';
    while (i < n) {
      const c = code[i];
      // comment
      if (c === '#') {
        let j = code.indexOf('\n', i); if (j === -1) j = n;
        out += '<span class="tok-com">' + esc(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // string (with optional prefix)
      if (c === '"' || c === "'" || /[rbufRBUF]/.test(c) && /["']/.test(code[i + 1] || '')) {
        let start = i;
        while (/[rbufRBUF]/.test(code[i])) i++;
        const q = code[i];
        if (q !== '"' && q !== "'") { out += esc(code.slice(start, i + 1)); i++; continue; }
        const triple = code.slice(i, i + 3) === q + q + q;
        let j = i + (triple ? 3 : 1);
        while (j < n) {
          if (code[j] === '\\') { j += 2; continue; }
          if (triple) { if (code.slice(j, j + 3) === q + q + q) { j += 3; break; } j++; }
          else { if (code[j] === q || code[j] === '\n') { j++; break; } j++; }
        }
        out += '<span class="tok-str">' + esc(code.slice(start, j)) + '</span>'; i = j; prevWord = ''; continue;
      }
      // decorator
      if (c === '@' && (i === 0 || code[i - 1] === '\n' || /\s/.test(code[i - 1]))) {
        let j = i + 1; while (j < n && /[\w.]/.test(code[j])) j++;
        out += '<span class="tok-dec">' + esc(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // number
      if (/\d/.test(c) && !/[\w]/.test(code[i - 1] || '')) {
        let j = i; while (j < n && /[\d._exEX+-]/.test(code[j])) {
          if ((code[j] === '+' || code[j] === '-') && !/[eE]/.test(code[j - 1])) break; j++;
        }
        out += '<span class="tok-num">' + esc(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // word
      if (/[A-Za-z_]/.test(c)) {
        let j = i; while (j < n && /\w/.test(code[j])) j++;
        const w = code.slice(i, j);
        if (PY_KW.has(w)) out += '<span class="tok-kw">' + w + '</span>';
        else if (prevWord === 'def' || prevWord === 'class') out += '<span class="tok-def">' + w + '</span>';
        else if (PY_BUILTIN.has(w)) out += '<span class="tok-def">' + w + '</span>';
        else out += esc(w);
        prevWord = w; i = j; continue;
      }
      if (!/\s/.test(c)) prevWord = '';
      out += esc(c); i++;
    }
    return out;
  }

  function inline(s) {
    // s is raw text (single logical line/paragraph). Escape, then transform.
    let t = esc(s);
    const codes = [];
    t = t.replace(/~([^~\n]+)~/g, (_, m) => { codes.push('<code>' + m + '</code>'); return '\x01' + (codes.length - 1) + '\x01'; });
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
    t = t.replace(/\x01(\d+)\x01/g, (_, i) => codes[+i]);
    return t;
  }

  function render(src) {
    if (!src) return '';
    const lines = String(src).replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^\s*~~~(\w*)\s*$/);
      if (fence) {
        const lang = fence[1].toLowerCase();
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*~~~\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // closing fence
        const code = buf.join('\n');
        const body = (lang === 'python' || lang === 'py') ? hlPython(code) : esc(code);
        out.push('<pre class="codeblock">' + body + '</pre>');
        continue;
      }
      if (/^\s*$/.test(line)) { i++; continue; }
      let m;
      if ((m = line.match(/^####\s+(.*)/))) { out.push('<h4>' + inline(m[1]) + '</h4>'); i++; continue; }
      if ((m = line.match(/^###\s+(.*)/))) { out.push('<h3>' + inline(m[1]) + '</h3>'); i++; continue; }
      if ((m = line.match(/^##\s+(.*)/))) { out.push('<h2>' + inline(m[1]) + '</h2>'); i++; continue; }
      if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote>' + buf.map(inline).join('<br>') + '</blockquote>'); continue;
      }
      if (/^\s*- /.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*- /.test(lines[i])) { buf.push(lines[i].replace(/^\s*- /, '')); i++; }
        out.push('<ul>' + buf.map(x => '<li>' + inline(x) + '</li>').join('') + '</ul>'); continue;
      }
      if (/^\s*\d+\.\s/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s/, '')); i++; }
        out.push('<ol>' + buf.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>'); continue;
      }
      // paragraph: gather until blank/structural line
      const buf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{2,4}\s|>\s?|\s*- |\s*\d+\.\s|\s*~~~|---+\s*$)/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      out.push('<p>' + buf.map(inline).join(' ') + '</p>');
    }
    return out.join('\n');
  }

  return { render, esc, hlPython };
})();
