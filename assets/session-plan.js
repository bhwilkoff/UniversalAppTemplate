// A session as a file a host keeps in their own Drive (MyDrive), run part by
// part in any Meet call with no account (open rooms). One shape for what the
// builder saves and what a room runs. Tested in tools/test/session-plan.test.mjs.
//
// A part is one of:
//   { kind: 'talk', title, slides }                      slides in the deck syntax
//   { kind: 'question', title, prompt, ask, choices }    ask: choice|multi|scale|words|short|rank
//   { kind: 'model', title, url, together }              an Ideas at Play model
//   { kind: 'site', title, url }                         a website
//   { kind: 'card', title, body }                        words on every stage
//   { kind: 'clock', title, minutes }                    a clock for the part
//   { kind: 'workbook', title, blocks }                  each person answers in their panel
//     blocks: { key, type: text|free|choice|table, text, choices?, multiple?, rows? }
//     (a cohort workbook's own block shape, without files)
(function (root) {
  var KIND = 'human-shaped-session';
  var ASKS = ['choice', 'multi', 'scale', 'words', 'short', 'rank'];
  var MODEL = /^https:\/\/ideasatplay\.org\/play\/[a-z0-9-]{1,140}\?v=\d{1,4}$/;

  // A workbook's blocks that can run in a room, in the cohort workbook's own
  // shape; a block missing its words or choices is left out.
  function blocks(list) {
    var n = 0;
    return (Array.isArray(list) ? list : []).slice(0, 60).map(function (b) {
      if (!b || ['text', 'free', 'choice', 'table'].indexOf(b.type) < 0) return null;
      var text = String(b.text == null ? '' : b.text).trim().slice(0, 3000);
      if (!text) return null;
      var o = { key: 'b' + (++n), type: b.type, text: text };
      if (b.type === 'choice') {
        o.multiple = b.multiple === true;
        o.choices = (Array.isArray(b.choices) ? b.choices : []).map(function (c) { return str(c, 200); }).filter(Boolean).slice(0, 12);
        if (o.choices.length < 2) { n--; return null; }
      }
      if (b.type === 'table') {
        o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 20).map(function (r) {
          return (Array.isArray(r) ? r : []).slice(0, 8).map(function (c) { var t = str(c && c.text, 300); return { text: t, fill: !t }; });
        }).filter(function (r) { return r.length; });
        if (!o.rows.length) { n--; return null; }
      }
      return o;
    }).filter(Boolean);
  }
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
        var listed = ask === 'choice' || ask === 'multi' || ask === 'rank';
        if (!prompt || (listed && choices.length < 2)) return null;
        return { kind: 'question', title: title || 'Question', prompt: prompt, ask: ask, choices: listed ? choices : [] };
      }
      if (p.kind === 'model') return MODEL.test(p.url || '') ? { kind: 'model', title: title || 'A model', url: p.url, together: p.together === true } : null;
      if (p.kind === 'site') return https(p.url) ? { kind: 'site', title: title || 'A website', url: p.url } : null;
      if (p.kind === 'card') { var body = str(p.body, 400); return body ? { kind: 'card', title: title || 'A card', body: body } : null; }
      if (p.kind === 'workbook') { var bl = blocks(p.blocks); return bl.length ? { kind: 'workbook', title: title || 'A workbook', blocks: bl } : null; }
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
    if (p.kind === 'workbook') return [{ t: 'workbook', title: p.title, blocks: p.blocks }];
    return [];
  }

  // A cohort session's plan (scenes, with their decks) as a file's parts:
  // each part's slides first, then what it asks or shows. Kinds a room cannot
  // run on its own (breakouts, the board, showing work) become a card with
  // their prompt, so the host still has the words.
  // Workbooks (the cohort's rows: { id, kind, title, blocks }) come along as
  // workbook parts: a room part's workbooks just after it, and the session's
  // other individual workbooks at the end. A picture in a block's words stays
  // in the cohort's private storage, so its line is left out.
  function wbPart(w) {
    var bl = (w.blocks || []).map(function (b) { return Object.assign({}, b, { text: String(b.text || '').split('\n').filter(function (l) { return !/^!\[\]\([^)]*\)$/.test(l.trim()); }).join('\n') }); });
    return { kind: 'workbook', title: w.title, blocks: bl };
  }
  function fromScenes(scenes, decks, workbooks) {
    var out = [], byId = {}, used = {};
    (workbooks || []).forEach(function (w) { if (w && w.id) byId[w.id] = w; });
    (scenes || []).forEach(function (s) {
      var c = s.config || {}, deck = (decks && decks[s.id]) || s.slides || '';
      if (deck && String(deck).trim()) out.push({ kind: 'talk', title: s.title, slides: deck });
      if (s.kind === 'question' && c.prompt) out.push({ kind: 'question', title: s.title, prompt: c.prompt, ask: c.kind || (c.options && c.options.length ? 'choice' : 'short'), choices: c.options || [] });
      else if (c.show && c.show.url) out.push(MODEL.test(c.show.url) ? { kind: 'model', title: c.show.name || s.title, url: c.show.url } : { kind: 'site', title: c.show.name || s.title, url: c.show.url });
      else if (['rooms', 'design', 'presenter', 'reflection'].indexOf(s.kind) >= 0 && c.prompt) out.push({ kind: 'card', title: s.title, body: c.prompt });
      else if (s.kind === 'break') out.push({ kind: 'clock', title: s.title, minutes: s.minutes });
      (Array.isArray(c.workbooks) ? c.workbooks : []).forEach(function (id) { if (byId[id] && !used[id]) { used[id] = true; out.push(wbPart(byId[id])); } });
    });
    (workbooks || []).forEach(function (w) { if (w && w.id && !used[w.id] && w.kind !== 'group') out.push(wbPart(w)); });
    return clean(out);
  }

  // A workbook's answers, for keeping. The host's copy is a CSV with a row
  // per person and a column per question (a table's blanks each their own
  // column); a person's own copy is Markdown with their answers in place.
  function cells(b) {
    var out = [];
    (b.rows || []).forEach(function (r, i) { r.forEach(function (c, j) { if (c.fill) out.push({ k: i + ',' + j, label: b.text + ' (' + (r[0] && r[0].text ? r[0].text : 'row ' + (i + 1)) + ', column ' + (j + 1) + ')' }); }); });
    return out;
  }
  function answerText(b, v) {
    if (v == null) return '';
    if (b.type === 'choice') return (Array.isArray(v) ? v : []).map(function (i) { return b.choices[i]; }).filter(Boolean).join('; ');
    return String(v);
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? '"' + (/^[=+\-@]/.test(v) ? "'" : '') + v.replace(/"/g, '""') + '"' : v; }
  function answersCsv(all) {
    var cols = [];
    (all.blocks || []).forEach(function (b) {
      if (b.type === 'free' || b.type === 'choice') cols.push({ label: b.text, get: function (a) { return answerText(b, a[b.key]); } });
      if (b.type === 'table') cells(b).forEach(function (c) { cols.push({ label: c.label, get: function (a) { return a[b.key] ? a[b.key][c.k] || '' : ''; } }); });
    });
    var rows = [['Name'].concat(cols.map(function (c) { return c.label; }))];
    (all.people || []).forEach(function (p) { rows.push([p.name || 'Someone'].concat(cols.map(function (c) { return c.get(p.a || {}); }))); });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  function myCopy(w, a) {
    a = a || {};
    var out = ['# ' + w.title, ''];
    (w.blocks || []).forEach(function (b) {
      if (b.type === 'text') out.push(b.text, '');
      else if (b.type === 'free') out.push('**' + b.text + '**', '', answerText(b, a[b.key]) || '(no answer)', '');
      else if (b.type === 'choice') { out.push('**' + b.text + '**', ''); b.choices.forEach(function (c, i) { out.push('- [' + ((a[b.key] || []).indexOf(i) >= 0 ? 'x' : ' ') + '] ' + c); }); out.push(''); }
      else if (b.type === 'table') {
        out.push('**' + b.text + '**', '');
        b.rows.forEach(function (r, i) {
          out.push('| ' + r.map(function (c, j) { return (c.fill ? (a[b.key] && a[b.key][i + ',' + j]) || ' ' : c.text).replace(/\|/g, '/').replace(/\n/g, ' '); }).join(' | ') + ' |');
          if (i === 0) out.push('|' + r.map(function () { return ' --- '; }).join('|') + '|');
        });
        out.push('');
      }
    });
    return out.join('\n');
  }

  var lib = { KIND: KIND, blocks: blocks, clean: clean, answersCsv: answersCsv, myCopy: myCopy, session: session, messages: messages, fromScenes: fromScenes };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SessionPlan = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
