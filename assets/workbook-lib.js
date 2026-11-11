// Workbooks, without the page around them (DECISIONS.md, "Workbooks"): a
// workbook's blocks from Minerva's workbook data or from its plain export, an
// answer read back safely, and what a leader sees across everyone's answers.
// Tested in tools/test/workbook-lib.test.mjs.
(function (root) {
  var TYPES = { Instructions: 'text', FreeResponse: 'free', MultipleChoice: 'choice', Table: 'table', File: 'file' };

  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // A Quill delta (or its JSON) as plain lines: lists keep their marks, an
  // image is a short note, colors do not travel.
  function deltaText(v) {
    var d = v;
    if (typeof v === 'string') { try { d = JSON.parse(v); } catch (e) { return v.replace(/​/g, '').trim(); } }
    var ops = (d && d.ops) || [], line = '', out = [];
    ops.forEach(function (o) {
      if (typeof o.insert !== 'string') { if (o.insert && o.insert.image) line += '[An image]'; return; }
      var a = o.attributes || {};
      var parts = o.insert.split('\n');
      parts.forEach(function (p, i) {
        var t = p;
        if (t && a.bold) t = '**' + t + '**';
        else if (t && a.italic) t = '*' + t + '*';
        line += t;
        if (i < parts.length - 1) {
          var pre = a.list === 'bullet' ? '- ' : a.list === 'ordered' ? '1. ' : '';
          out.push(pre + line); line = '';
        }
      });
    });
    if (line) out.push(line);
    return out.join('\n').replace(/​/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // One workbook's blocks, from Minerva's own data ({ title, blocks: [{ type,
  // block_components }] }) or the plain export ({ title, blocks: [{ type, text,
  // choices, rows }] }). Keys are b1, b2, … by position.
  function normalize(w) {
    if (!w || !Array.isArray(w.blocks)) return null;
    var blocks = w.blocks.slice(0, 120).map(function (b, i) {
      var type = TYPES[b.type] || null;
      if (!type) return null;
      var out = { key: 'b' + (i + 1), type: type, text: '' };
      var comps = Array.isArray(b.block_components) ? b.block_components : null;
      if (comps) {
        out.text = comps.filter(function (c) { return c.type === 'Text'; }).map(function (c) { return deltaText(c.value); }).filter(Boolean).join('\n\n');
        var f = comps.filter(function (c) { return c.type !== 'Text'; })[0] || {};
        if (type === 'free') out.height = f.height || 'short';
        if (type === 'choice') { out.multiple = f.multiple === true || f.multiple === 'true'; out.choices = (f.choices || []).map(function (c) { return cut(c.label, 300); }); }
        if (type === 'table') out.rows = (f.value || []).slice(0, 40).map(function (r) { return r.slice(0, 12).map(function (c) { return { text: cut(deltaText(c.value), 500), fill: !c.readOnly }; }); });
      } else {
        out.text = String(b.text || '');
        if (type === 'free') out.height = b.height || 'short';
        if (type === 'choice') { out.multiple = !!b.multiple; out.choices = (b.choices || []).map(function (c) { return cut(c, 300); }); }
        if (type === 'table') out.rows = (b.rows || []).slice(0, 40).map(function (r) { return r.slice(0, 12).map(function (c) { return { text: cut(c.text, 500), fill: !!c.fill }; }); });
      }
      out.text = cut(out.text, 6000);
      return out;
    }).filter(Boolean);
    return { title: cut(String(w.title || '').trim() || 'A workbook', 200), blocks: blocks };
  }

  // What can be kept for a block: words, the picked choices, or a table's
  // fill-in cells. Anything else is nothing.
  function answerOf(block, value) {
    if (!block || !value || typeof value !== 'object') return null;
    if (block.type === 'free' || block.type === 'file') {
      var t = typeof value.text === 'string' ? value.text.slice(0, 8000) : '';
      return t.trim() ? { text: t } : null;
    }
    if (block.type === 'choice') {
      var n = (block.choices || []).length;
      var picks = (Array.isArray(value.picks) ? value.picks : []).filter(function (x) { return typeof x === 'number' && x >= 0 && x < n; });
      picks = picks.filter(function (x, i) { return picks.indexOf(x) === i; });
      picks = block.multiple ? picks.sort(function (a, b) { return a - b; }) : picks.slice(0, 1);
      return picks.length ? { picks: picks } : null;
    }
    if (block.type === 'table') {
      var rows = block.rows || [];
      var cells = rows.map(function (r, y) { return r.map(function (c, x) { var v = value.cells && value.cells[y] && value.cells[y][x]; return c.fill && typeof v === 'string' ? v.slice(0, 1000) : ''; }); });
      return cells.some(function (r) { return r.some(function (v) { return v.trim(); }); }) ? { cells: cells } : null;
    }
    return null;
  }

  // For a leader: each block's answers across everyone (or every room), with
  // counts for choices.
  function summary(workbook, answers, nameOf) {
    var by = {};
    (answers || []).forEach(function (a) { (by[a.block] = by[a.block] || []).push(a); });
    return (workbook.blocks || []).filter(function (b) { return b.type !== 'text'; }).map(function (b) {
      var rows = by[b.key] || [];
      var out = { key: b.key, type: b.type, text: b.text, answered: rows.length };
      if (b.type === 'choice') {
        out.counts = (b.choices || []).map(function (c, i) { return { label: c, count: rows.filter(function (a) { return ((a.value || {}).picks || []).indexOf(i) >= 0; }).length }; });
      } else {
        out.answers = rows.map(function (a) { return { who: nameOf ? nameOf(a) : '', value: a.value }; });
      }
      return out;
    });
  }

  var lib = { normalize: normalize, deltaText: deltaText, answerOf: answerOf, summary: summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.WorkbookLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
