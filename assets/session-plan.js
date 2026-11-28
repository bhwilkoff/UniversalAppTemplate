// A session as a file a host keeps in their own Drive (MyDrive), run part by
// part in any Meet call with no account (open rooms). One shape for what the
// builder saves and what a room runs. Tested in tools/test/session-plan.test.mjs.
//
// A part is one of:
//   { kind: 'talk', title, slides }                      slides in the deck syntax
//   { kind: 'question', title, prompt, ask, choices }    ask: choice|multi|scale|words|short
//   { kind: 'model', title, url, together }              an Ideas at Play model
//   { kind: 'site', title, url }                         a website
//   { kind: 'card', title, body }                        words on every stage
//   { kind: 'clock', title, minutes }                    a clock for the part
(function (root) {
  var KIND = 'human-shaped-session';
  var ASKS = ['choice', 'multi', 'scale', 'words', 'short'];
  var MODEL = /^https:\/\/ideasatplay\.org\/play\/[a-z0-9-]{1,140}\?v=\d{1,4}$/;

  function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n); }
  function https(u) { return /^https:\/\/\S+$/.test(String(u || '')) && String(u).length <= 2000; }

  // The parts that can run, cut to size; anything else is dropped.
  function clean(parts) {
    return (Array.isArray(parts) ? parts : []).slice(0, 60).map(function (p) {
      if (!p || typeof p !== 'object') return null;
      var title = str(p.title, 120);
      if (p.kind === 'talk') return typeof p.slides === 'string' && p.slides.trim() ? { kind: 'talk', title: title || 'Slides', slides: p.slides.slice(0, 42000) } : null;
      if (p.kind === 'question') {
        var ask = ASKS.indexOf(p.ask) >= 0 ? p.ask : 'short', prompt = str(p.prompt, 500);
        var choices = (Array.isArray(p.choices) ? p.choices : []).map(function (c) { return str(c, 120); }).filter(Boolean).slice(0, 8);
        if (!prompt || ((ask === 'choice' || ask === 'multi') && choices.length < 2)) return null;
        return { kind: 'question', title: title || 'Question', prompt: prompt, ask: ask, choices: ask === 'choice' || ask === 'multi' ? choices : [] };
      }
      if (p.kind === 'model') return MODEL.test(p.url || '') ? { kind: 'model', title: title || 'A model', url: p.url, together: p.together === true } : null;
      if (p.kind === 'site') return https(p.url) ? { kind: 'site', title: title || 'A website', url: p.url } : null;
      if (p.kind === 'card') { var body = str(p.body, 400); return body ? { kind: 'card', title: title || 'A card', body: body } : null; }
      if (p.kind === 'clock') { var m = Math.round(Number(p.minutes)); return m >= 1 && m <= 120 ? { kind: 'clock', title: title || 'A clock', minutes: m } : null; }
      return null;
    }).filter(Boolean);
  }

  function session(title, parts) { return { kind: KIND, version: 1, title: str(title, 120) || 'A session', parts: clean(parts) }; }

  // What the room is sent to run a part, in order.
  function messages(p) {
    if (!p) return [];
    if (p.kind === 'talk') return [{ t: 'talk', text: p.slides, title: p.title, show: true, at: 0, shown: 0 }];
    if (p.kind === 'question') return [{ t: 'ask', kind: p.ask, prompt: p.prompt, choices: p.choices }];
    if (p.kind === 'model') return [{ t: 'site', url: p.url, name: p.title, together: p.together }];
    if (p.kind === 'site') return [{ t: 'site', url: p.url, name: p.title }];
    if (p.kind === 'card') return [{ t: 'card', body: p.body }];
    if (p.kind === 'clock') return [{ t: 'clock', seconds: p.minutes * 60, label: p.title }];
    return [];
  }

  // A cohort session's plan (scenes, with their decks) as a file's parts:
  // each part's slides first, then what it asks or shows. Kinds a room cannot
  // run on its own (breakouts, the board, showing work) become a card with
  // their prompt, so the host still has the words.
  function fromScenes(scenes, decks) {
    var out = [];
    (scenes || []).forEach(function (s) {
      var c = s.config || {}, deck = (decks && decks[s.id]) || s.slides || '';
      if (deck && String(deck).trim()) out.push({ kind: 'talk', title: s.title, slides: deck });
      if (s.kind === 'question' && c.prompt) out.push({ kind: 'question', title: s.title, prompt: c.prompt, ask: c.kind || (c.options && c.options.length ? 'choice' : 'short'), choices: c.options || [] });
      else if (c.show && c.show.url) out.push(MODEL.test(c.show.url) ? { kind: 'model', title: c.show.name || s.title, url: c.show.url } : { kind: 'site', title: c.show.name || s.title, url: c.show.url });
      else if (['rooms', 'design', 'presenter', 'reflection'].indexOf(s.kind) >= 0 && c.prompt) out.push({ kind: 'card', title: s.title, body: c.prompt });
      else if (s.kind === 'break') out.push({ kind: 'clock', title: s.title, minutes: s.minutes });
    });
    return clean(out);
  }

  var lib = { KIND: KIND, clean: clean, session: session, messages: messages, fromScenes: fromScenes };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SessionPlan = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
