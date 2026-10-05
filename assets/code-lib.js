// Code everyone in the call can run (R14, research/notes/active-learning-
// notes.md). A teacher sends a short program on the class channel (it
// rides in their presence, so someone who joins late still gets it);
// everyone gets their own copy to change and run in their own browser,
// in a sandbox that cannot reach the page, the hub, or anyone's sign-in.
// Nothing is stored. Tested in tools/test/code-lib.test.mjs.
(function (root) {
  var LANGS = { js: 'JavaScript', py: 'Python' };
  var MAX = 4000;          // characters of code sent to the class
  var MAX_OUT = 8000;      // characters of output shown
  var LIMIT_MS = { js: 5000, py: 30000 };  // Python's first run loads Pyodide

  function clean(text) { return String(text == null ? '' : text).replace(/\r\n?/g, '\n'); }

  // What rides in the teacher's presence, and what everyone accepts.
  function message(lang, text, onStage) {
    if (!LANGS[lang]) return null;
    var t = clean(text);
    if (!t.trim() || t.length > MAX) return null;
    return { lang: lang, text: t, stage: !!onStage };
  }
  function read(m) {
    if (!m || typeof m !== 'object' || !LANGS[m.lang] || typeof m.text !== 'string') return null;
    if (!m.text.trim() || m.text.length > MAX) return null;
    return { lang: m.lang, text: clean(m.text), stage: !!m.stage };
  }

  // The code a teacher in the call is sharing now, from the presence
  // state: the first teacher's, by user id, so every screen agrees.
  function shared(presence, teacherIds) {
    var ids = Object.keys(presence || {}).filter(function (k) { return (teacherIds || []).indexOf(k) >= 0; }).sort();
    for (var i = 0; i < ids.length; i++) {
      var c = read(((presence[ids[i]] || [])[0] || {}).code);
      if (c) return c;
    }
    return null;
  }

  // The page a JavaScript program runs in: a sandboxed frame with no
  // access to its parent's origin. Its console and errors come back by
  // postMessage, tagged with this run's token.
  function jsDocument(code, token) {
    var safe = JSON.stringify(clean(code)).replace(/</g, '\\u003c');
    var t = JSON.stringify(String(token));
    return '<!doctype html><meta charset="utf-8"><script>(function(){' +
      'var T=' + t + ';function send(k,a){try{parent.postMessage({hsRun:T,kind:k,text:Array.prototype.map.call(a,function(x){try{return typeof x==="string"?x:JSON.stringify(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}}' +
      '["log","info","warn","error"].forEach(function(k){console[k]=function(){send(k==="error"?"error":"out",arguments)}});' +
      'window.onerror=function(m,s,l){send("error",[m+(l?" (line "+l+")":"")]);};' +
      'try{(0,eval)(' + safe + ');send("done",[])}catch(e){send("error",[String(e&&e.message||e)]);send("done",[])}' +
      '})();<\/script>';
  }

  // Output, kept to a size a panel can show.
  function trimOut(text) {
    var t = String(text || '');
    return t.length > MAX_OUT ? t.slice(0, MAX_OUT) + '\n… (the rest was cut)' : t;
  }

  // What a panel sends its own main stage while the teacher has the code
  // there, and what the stage takes.
  var STAGE = 'hs-code';
  function stageMessage(code) {
    return JSON.stringify({ type: STAGE, v: 1, code: code && code.stage ? { lang: code.lang, text: code.text } : null });
  }
  function readStage(payload) {
    var m;
    try { m = JSON.parse(payload); } catch (e) { return null; }
    if (!m || m.type !== STAGE || m.v !== 1) return null;
    if (m.code === null) return { code: null };
    var c = read(m.code);
    return c ? { code: { lang: c.lang, text: c.text } } : null;
  }

  var lib = { LANGS: LANGS, MAX: MAX, LIMIT_MS: LIMIT_MS, message: message, read: read, shared: shared, jsDocument: jsDocument, trimOut: trimOut, stageMessage: stageMessage, readStage: readStage };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CodeLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
