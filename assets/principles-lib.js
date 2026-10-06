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

  // Everything /principles/ shows, from the same file: the version, the
  // opening paragraph, the stem ("Human-shaped software:"), the note on
  // "not yet", and each principle's own section, as its full statement
  // (one sentence, no emphasis), what it means (markdown), and how you
  // can tell (markdown).
  function page(md) {
    var text = String(md || '').replace(/\r/g, '');
    var lines = text.split('\n');
    function paragraphs(chunk) {
      return chunk.split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    }
    function sectionOf(title) {
      var at = text.indexOf('\n## ' + title);
      if (at < 0) return '';
      var body = text.slice(at + 4 + title.length);
      var end = body.indexOf('\n## ');
      return end >= 0 ? body.slice(0, end) : body;
    }
    var head = text.slice(0, Math.max(0, text.indexOf('\n## ')));
    var headParas = paragraphs(head.replace(/^# .*$/m, ''));
    var version = (text.match(/\*Version ([\d.]+)/) || [])[1] || '';
    var byline = (headParas[0] || '').replace(/^\*|\*$/g, '');
    var intro = headParas.filter(function (p) { return !/^\*Version/.test(p); })[0] || '';
    var listParas = paragraphs(sectionOf('The principles')).filter(function (p) { return !/^\d+\. /.test(p); });
    var stem = listParas.filter(function (p) { return /:$/.test(p); })[0] || '';
    var meaning = paragraphs(sectionOf('What each principle means')).join(' ');
    var notYet = (meaning.match(/Not every principle[\s\S]*$/) || [''])[0];
    var principles = [];
    var cur = null;
    lines.forEach(function (line) {
      var h = /^## (\d+)\.\s+(.+)$/.exec(line);
      if (h) { cur = { n: Number(h[1]), name: h[2].trim(), anchor: slug(h[1] + '. ' + h[2]), lines: [] }; principles.push(cur); return; }
      if (/^## /.test(line)) { cur = null; return; }
      if (cur) cur.lines.push(line);
    });
    principles = principles.map(function (p) {
      var paras = p.lines.join('\n').split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      var statement = '', body = [], tell = '';
      paras.forEach(function (x, i) {
        if (i === 0 && /^\*\*[\s\S]+\*\*$/.test(x)) { statement = x.replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ').trim(); return; }
        var t = /^\*\*How you can tell:\*\*\s*([\s\S]*)$/.exec(x);
        if (t) { tell = t[1].replace(/\s*\n\s*/g, ' ').trim(); return; }
        body.push(x);
      });
      return { n: p.n, name: p.name, anchor: p.anchor, statement: statement, body: body.join('\n\n'), tell: tell };
    });
    return { version: version, byline: byline, intro: intro, stem: stem, notYet: notYet, principles: principles };
  }

  var lib = { RAW: RAW, parse: parse, page: page };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.PrinciplesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
