/* ML Quest — Pyodide worker lifecycle: boot, package loading, run queue, timeouts */
'use strict';

window.Runner = (function () {
  let worker = null;
  let jobSeq = 0;
  let queue = Promise.resolve();
  const pending = {};          // id -> {resolve, reject, timer, onStatus}
  const statusListeners = new Set();
  let lastStatus = '';

  function emitStatus(text) {
    lastStatus = text;
    for (const cb of statusListeners) { try { cb(text); } catch (e) {} }
  }

  function ensureWorker() {
    if (worker) return worker;
    const src = document.getElementById('pyworker-src').textContent;
    const blob = new Blob([src], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    worker.postMessage({ t: 'init', indexURL: CFG.pyodideIndexURL });
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.t === 'status') { emitStatus(m.text); if (m.id && pending[m.id] && pending[m.id].onStatus) pending[m.id].onStatus(m.text); return; }
      if (m.t === 'boot-ok') { emitStatus(''); return; }
      if (m.t === 'warm-ok') { emitStatus(''); return; }
      if (m.t === 'fatal') { emitStatus(''); UI.toast('Python runtime error: ' + m.error, 'bad', 6000); return; }
      if (m.t === 'exec-start') {
        const p = pending[m.id];
        if (p) {
          emitStatus('Running…');
          p.timer = setTimeout(() => {
            killWorker();
            p.reject({ timeout: true, message: 'Time limit exceeded — infinite loop? The Python runtime was restarted.' });
            delete pending[m.id];
          }, p.timeoutMs);
        }
        return;
      }
      if (m.t === 'done') {
        const p = pending[m.id];
        if (p) { clearTimeout(p.timer); emitStatus(''); p.resolve(m.result); delete pending[m.id]; }
        return;
      }
    };
    worker.onerror = (e) => {
      emitStatus('');
      for (const id of Object.keys(pending)) {
        clearTimeout(pending[id].timer);
        pending[id].reject({ message: 'Worker error: ' + (e.message || 'unknown') });
        delete pending[id];
      }
    };
    return worker;
  }

  function killWorker() {
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null;
  }

  function run({ code, tests = [], packages = [], timeoutMs = CFG.submitTimeoutMs, onStatus = null }) {
    const job = () => new Promise((resolve, reject) => {
      const id = ++jobSeq;
      pending[id] = { resolve, reject, timer: null, timeoutMs, onStatus };
      try {
        ensureWorker().postMessage({ t: 'run', id, code, tests, packages });
      } catch (e) {
        delete pending[id];
        reject({ message: 'Could not start Python worker: ' + e.message });
      }
    });
    const p = queue.then(job, job);
    queue = p.catch(() => {});
    return p;
  }

  function warmup(packages = []) {
    try { ensureWorker().postMessage({ t: 'warmup', packages }); } catch (e) {}
  }

  return {
    run, warmup,
    onStatus: cb => { statusListeners.add(cb); cb(lastStatus); return () => statusListeners.delete(cb); },
  };
})();
