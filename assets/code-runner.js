// Code everyone in the call can run (R14), in the Meet panel. A teacher
// writes or pastes a short program and sends it to the class; everyone
// gets their own copy to change and run here. JavaScript runs in a
// sandboxed frame with no access to this page; Python runs in Pyodide
// (from jsDelivr) in a worker, loaded the first time someone runs Python.
// Each run is stopped if it takes too long. Logic in CodeLib.
//
//   CodeRunner.start({ mount, teaching, onSend(message or null) })
//     -> { show(shared) }   shared: CodeLib.shared(...) or null
(function () {
  var C = window.CodeLib;
  if (!C) return;
  var PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }

  // JavaScript: a fresh sandboxed frame per run.
  function runJs(code) {
    return new Promise(function (done) {
      var token = Math.random().toString(36).slice(2), out = [], finished = false;
      var f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts');
      f.style.display = 'none';
      function end(note) {
        if (finished) return;
        finished = true;
        window.removeEventListener('message', hear);
        clearTimeout(timer);
        f.remove();
        if (note) out.push({ kind: 'error', text: note });
        done(out);
      }
      function hear(e) {
        var d = e.data;
        if (!d || d.hsRun !== token || e.source !== f.contentWindow) return;
        if (d.kind === 'done') return end();
        out.push({ kind: d.kind === 'error' ? 'error' : 'out', text: String(d.text) });
      }
      window.addEventListener('message', hear);
      var timer = setTimeout(function () { end('It ran for more than five seconds, so it was stopped.'); }, C.LIMIT_MS.js);
      f.srcdoc = C.jsDocument(code, token);
      document.body.appendChild(f);
    });
  }

  // Python: one worker, kept between runs, started again after a stop.
  var py = null;
  function pyWorker() {
    if (py) return py;
    var src = 'importScripts("' + PYODIDE + 'pyodide.js");' +
      'var ready=loadPyodide({indexURL:"' + PYODIDE + '"});' +
      'onmessage=function(e){ready.then(function(p){var out=[];p.setStdout({batched:function(s){out.push({kind:"out",text:s})}});p.setStderr({batched:function(s){out.push({kind:"error",text:s})}});' +
      'try{p.runPython(e.data.code)}catch(err){out.push({kind:"error",text:String(err.message||err).split("\\n").slice(-3).join("\\n")})}postMessage({id:e.data.id,out:out})},function(err){postMessage({id:e.data.id,out:[{kind:"error",text:"Python could not load: "+err}]})})};';
    py = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    return py;
  }
  function runPy(code) {
    return new Promise(function (done) {
      var w = pyWorker(), id = Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        w.removeEventListener('message', hear);
        w.terminate(); py = null;
        done([{ kind: 'error', text: 'It ran for more than thirty seconds, so it was stopped. (The first Python run also loads Python itself, which takes a moment.)' }]);
      }, C.LIMIT_MS.py);
      function hear(e) {
        if (!e.data || e.data.id !== id) return;
        clearTimeout(timer);
        w.removeEventListener('message', hear);
        done(e.data.out || []);
      }
      w.addEventListener('message', hear);
      w.postMessage({ id: id, code: code });
    });
  }

  function start(o) {
    var box = o.mount, current = null, mine = null;
    box.replaceChildren();

    // A teacher's composer: the language, the program, and whether it is
    // on the main stage too.
    if (o.teaching) {
      var d = el('details', 'code-compose');
      d.appendChild(el('summary', null, 'Code for everyone to run'));
      var lang = el('select');
      Object.keys(C.LANGS).forEach(function (k) { lang.appendChild(new Option(C.LANGS[k], k)); });
      lang.setAttribute('aria-label', 'Language');
      var area = el('textarea', 'code-text'); area.rows = 8; area.spellcheck = false; area.maxLength = C.MAX;
      area.setAttribute('aria-label', 'The program to send');
      area.placeholder = 'console.log("Hello, cohort")';
      var onStage = el('label', 'code-check');
      var box2 = el('input'); box2.type = 'checkbox';
      onStage.appendChild(box2); onStage.appendChild(document.createTextNode(' Also show it on the main stage'));
      var line = el('p', 'small');
      var acts = el('div', 'actions');
      acts.appendChild(button('Send it to everyone', 'btn-github', function () {
        var m = C.message(lang.value, area.value, box2.checked);
        if (!m) { line.textContent = 'Write a program first, up to ' + C.MAX + ' characters.'; return; }
        o.onSend(m);
        line.textContent = 'Sent. Everyone has their own copy to change and run.';
      }));
      acts.appendChild(button('Take it back', 'btn-quiet', function () { o.onSend(null); line.textContent = 'Taken back.'; }));
      d.appendChild(lang); d.appendChild(area); d.appendChild(onStage); d.appendChild(acts); d.appendChild(line);
      box.appendChild(d);
    }

    // Everyone's copy of the shared program.
    var card = el('section', 'code-card');
    card.hidden = true;
    box.appendChild(card);

    function draw() {
      card.replaceChildren();
      card.hidden = !current;
      if (!current) return;
      card.appendChild(el('p', 'kicker', C.LANGS[current.lang] + ' from your teacher'));
      var area = el('textarea', 'code-text'); area.rows = Math.min(14, current.text.split('\n').length + 1); area.spellcheck = false;
      area.value = mine != null ? mine : current.text;
      area.setAttribute('aria-label', 'Your copy of the program');
      area.addEventListener('input', function () { mine = area.value; });
      // Tab indents, so Python can be written here.
      area.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || e.shiftKey) return;
        e.preventDefault();
        var s = area.selectionStart; area.setRangeText('    ', s, area.selectionEnd, 'end'); mine = area.value;
      });
      var out = el('pre', 'code-out'); out.hidden = true; out.setAttribute('aria-live', 'polite');
      var acts = el('div', 'actions');
      var run = button('Run it', 'btn-github', function () {
        run.disabled = true; out.hidden = false; out.textContent = current.lang === 'py' ? 'Running (Python takes a moment the first time)…' : 'Running…';
        (current.lang === 'py' ? runPy : runJs)(area.value).then(function (lines) {
          run.disabled = false;
          out.replaceChildren();
          if (!lines.length) { out.textContent = 'It ran, and printed nothing.'; return; }
          lines.forEach(function (l) { out.appendChild(el('span', l.kind === 'error' ? 'code-err' : null, C.trimOut(l.text) + '\n')); });
        });
      });
      acts.appendChild(run);
      acts.appendChild(button('Start again from the teacher’s', 'btn-quiet', function () { mine = null; draw(); }));
      card.appendChild(area); card.appendChild(acts); card.appendChild(out);
      card.appendChild(el('p', 'small', 'It runs only in your browser, and nothing you change is sent anywhere.'));
    }

    return {
      show: function (shared) {
        var changed = JSON.stringify(shared && { l: shared.lang, t: shared.text }) !== JSON.stringify(current && { l: current.lang, t: current.text });
        current = shared;
        if (changed) { mine = null; draw(); }
      }
    };
  }

  window.CodeRunner = { start: start, runJs: runJs, runPy: runPy };
})();
