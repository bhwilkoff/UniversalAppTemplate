// Reads the printable sheets' words out of the template's own markdown,
// so a sheet on a wall says exactly what the template says today
// (tools/test/sheet-lib.test.mjs).
(function (root) {
  // The lines of one "## Heading" section, without the heading.
  function section(md, heading) {
    var lines = md.replace(/\r/g, '').split('\n');
    var start = lines.findIndex(function (l) { return l.trim() === '## ' + heading; });
    if (start < 0) return [];
    var out = [];
    for (var i = start + 1; i < lines.length && !/^## /.test(lines[i]); i++) out.push(lines[i]);
    return out;
  }

  // A markdown numbered list, each item's wrapped lines joined into one.
  function numbered(lines, indent) {
    var items = [];
    var re = new RegExp('^' + indent + '(\\d+)\\. (.*)$');
    var cont = new RegExp('^' + indent + '   +\\S');
    lines.forEach(function (l) {
      var m = l.match(re);
      if (m) items.push({ n: Number(m[1]), text: m[2].trim() });
      else if (items.length && cont.test(l) && l.trim()) items[items.length - 1].text += ' ' + l.trim();
    });
    return items;
  }

  // "**Starts from a human-shaped problem,** one that ..." becomes
  // { lead: 'Starts from a human-shaped problem,', rest: 'one that ...' }.
  function splitBold(text) {
    var m = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    return m ? { lead: m[1], rest: m[2] } : { lead: '', rest: text };
  }

  function parsePrinciples(md) {
    var lines = section(md, 'The principles');
    // The paragraphs before the list: the first is the intro, and a last
    // one ending in a colon ("Human-shaped software:") is the stem every
    // principle finishes.
    var paras = [], cur = '';
    for (var i = 0; i < lines.length; i++) {
      if (/^\d+\. /.test(lines[i])) break;
      if (lines[i].trim()) cur += (cur ? ' ' : '') + lines[i].trim();
      else if (cur) { paras.push(cur); cur = ''; }
    }
    if (cur) paras.push(cur);
    var stem = paras.length && /:$/.test(paras[paras.length - 1]) ? paras.pop() : '';
    var intro = paras[0] || '';
    var version = (md.match(/\*Version ([\d.]+)/) || [])[1] || '';
    return {
      version: version,
      intro: intro,
      stem: stem,
      items: numbered(lines, '').map(function (it) {
        var s = splitBold(it.text);
        return { n: it.n, lead: s.lead, rest: s.rest };
      })
    };
  }

  // The four questions sit in stage 00 as a list nested under the item
  // that names them; the paragraph after the list says what a "no" means.
  function parseQuestions(md) {
    var lines = md.replace(/\r/g, '').split('\n');
    var at = lines.findIndex(function (l) { return /\*\*The four questions\*\*/.test(l); });
    if (at < 0) return { questions: [], after: '' };
    var questions = [];
    var i = at + 1;
    for (; i < lines.length; i++) {
      var m = lines[i].match(/^\s+\d+\. (.+)$/);
      if (m) questions.push(m[1].trim());
      else if (questions.length && lines[i].trim()) break;
    }
    var after = [];
    for (; i < lines.length && lines[i].trim(); i++) after.push(lines[i].trim());
    // Keep only the first sentence: what a "no" means, not the history.
    var first = (after.join(' ').match(/^.*?[.!?](?=\s|$)/) || [''])[0];
    return { questions: questions, after: first.replace(/\*\*/g, '') };
  }

  var lib = { parsePrinciples: parsePrinciples, parseQuestions: parseQuestions, splitBold: splitBold };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SheetLib = lib;
})(this);
