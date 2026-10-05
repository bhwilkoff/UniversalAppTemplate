// The fifteen Human-Shaped Principles, read from the template's own
// PRINCIPLES.md, so the home page and anywhere else that lists them
// never keeps a copy of its own. Tested in tools/test/principles-lib.test.mjs.
(function (root) {
  var RAW = 'https://raw.githubusercontent.com/bhwilkoff/UniversalAppTemplate/main/docs/human-shaped/PRINCIPLES.md';

  // The numbered list under "## The principles": each item's bold lead
  // and the rest of its sentence, with markdown and line breaks removed.
  function parse(md) {
    var text = String(md || '');
    var start = text.indexOf('## The principles');
    if (start < 0) return [];
    var rest = text.slice(start + 1);
    var end = rest.indexOf('\n## ');
    var section = end >= 0 ? rest.slice(0, end) : rest;
    var items = [], cur = null;
    section.split('\n').forEach(function (line) {
      var m = /^(\d+)\.\s+(.*)$/.exec(line);
      if (m) { cur = { n: Number(m[1]), raw: m[2] }; items.push(cur); return; }
      if (cur && /^\s+\S/.test(line)) cur.raw += ' ' + line.trim();
      else if (!line.trim()) cur = null;
    });
    // Each principle's own section ("## 3. Values as guardrails"), for a
    // link straight to it on /principles/, made the way render.js makes
    // heading ids.
    var anchors = {};
    text.split('\n').forEach(function (line) {
      var h = /^## (\d+)\.\s+(.+)$/.exec(line);
      if (h) anchors[Number(h[1])] = slug(h[1] + '. ' + h[2]);
    });
    return items.map(function (it) {
      var b = /^\*\*(.+?)\*\*\s*(.*)$/.exec(it.raw);
      var lead = (b ? b[1] : it.raw).replace(/[,.]\s*$/, '');
      var tail = (b ? b[2] : '').replace(/\*/g, '').trim();
      return { n: it.n, lead: lead, rest: tail, anchor: anchors[it.n] || null };
    }).filter(function (p) { return p.lead; });
  }

  function slug(t) {
    return String(t).toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
  }

  var lib = { RAW: RAW, parse: parse };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.PrinciplesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
