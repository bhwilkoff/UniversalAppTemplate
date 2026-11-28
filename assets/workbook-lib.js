// Workbooks, without the page around them (DECISIONS.md, "Workbooks"): a
// workbook's blocks from Minerva's workbook data or from its plain export, an
// answer read back safely, and what a leader sees across everyone's answers.
// Tested in tools/test/workbook-lib.test.mjs.
(function (root) {
  var TYPES = { Instructions: 'text', FreeResponse: 'free', MultipleChoice: 'choice', Table: 'table', File: 'file' };

  function cut(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // A Quill delta (or its JSON) as plain lines: lists keep their marks, an
  // image is its own line (img(src) gives it, "[An image]" without), colors do
  // not travel.
  function deltaText(v, img) {
    var d = v;
    if (typeof v === 'string') { try { d = JSON.parse(v); } catch (e) { return v.replace(/\u200b/g, '').trim(); } }
    var ops = (d && d.ops) || [], line = '', out = [];
    ops.forEach(function (o) {
      if (typeof o.insert !== 'string') {
        if (o.insert && o.insert.image) { if (line) out.push(line); out.push(img ? img(String(o.insert.image)) : '[An image]'); line = ''; }
        return;
      }
      var a = o.attributes || {};
      var parts = o.insert.split('\n');
      parts.forEach(function (p, i) {
        var t = p;
        if (t && a.bold) t = '**' + t + '**';
        else if (t && a.italic) t = '*' + t + '*';
        line += t;
        if (i < parts.length - 1) {
          var pre = a.list === 'bullet' ? '- ' : a.list === 'ordered' ? '1. ' : '';
          if (line || !out.length || !IMAGE_LINE.test(out[out.length - 1])) out.push(pre + line);
          line = '';
        }
      });
    });
    if (line) out.push(line);
    return out.join('\n').replace(/\u200b/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // An image kept with a workbook is a line "![](i3.png)": the file i3.png in
  // the workbook's folder of the private bucket workbook-files.
  var IMAGE_LINE = /^!\[\]\((i\d{1,3}\.(?:png|jpg|webp|gif))\)$/;
  var DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/;
  function imageName(n, type) { return 'i' + n + '.' + (type === 'jpeg' ? 'jpg' : type); }

  // A block's text in order: words, and the images between them.
  function parts(text) {
    var out = [], words = [];
    function flush() { var t = words.join('\n').trim(); if (t) out.push({ text: t }); words = []; }
    String(text || '').split('\n').forEach(function (l) {
      var m = IMAGE_LINE.exec(l.trim());
      if (m) { flush(); out.push({ image: m[1] }); } else words.push(l);
    });
    flush();
    return out;
  }

  // One workbook's blocks, from Minerva's own data ({ title, blocks: [{ type,
  // block_components }] }) or the plain export ({ title, blocks: [{ type, text,
  // choices, rows }] }). Keys are b1, b2, … by position.
  function normalize(w) {
    if (!w || !Array.isArray(w.blocks)) return null;
    var images = [], given = w.images && typeof w.images === 'object' ? w.images : {};
    function img(src) {
      var m = DATA_URL.exec(src);
      if (!m || images.length >= 60) return '[An image]';
      var name = imageName(images.length + 1, m[1]);
      images.push({ name: name, data: src });
      return '![](' + name + ')';
    }
    var blocks = w.blocks.slice(0, 120).map(function (b, i) {
      var type = TYPES[b.type] || null;
      if (!type) return null;
      var out = { key: 'b' + (i + 1), type: type, text: '' };
      var comps = Array.isArray(b.block_components) ? b.block_components : null;
      if (comps) {
        out.text = comps.filter(function (c) { return c.type === 'Text'; }).map(function (c) { return deltaText(c.value, img); }).filter(Boolean).join('\n\n');
        var f = comps.filter(function (c) { return c.type !== 'Text'; })[0] || {};
        if (type === 'free') out.height = f.height || 'short';
        if (type === 'choice') { out.multiple = f.multiple === true || f.multiple === 'true'; out.choices = (f.choices || []).map(function (c) { return cut(c.label, 300); }); }
        if (type === 'table') out.rows = (f.value || []).slice(0, 40).map(function (r) { return r.slice(0, 12).map(function (c) { return { text: cut(deltaText(c.value), 500), fill: !c.readOnly }; }); });
      } else {
        out.text = String(b.text || '').split('\n').map(function (l) {
          var m = IMAGE_LINE.exec(l.trim());
          if (!m) return l;
          var src = typeof given[m[1]] === 'string' ? given[m[1]] : '', t = DATA_URL.exec(src);
          return t ? img(src) : '[An image]';
        }).join('\n');
        if (type === 'free') out.height = b.height || 'short';
        if (type === 'choice') { out.multiple = !!b.multiple; out.choices = (b.choices || []).map(function (c) { return cut(c, 300); }); }
        if (type === 'table') out.rows = (b.rows || []).slice(0, 40).map(function (r) { return r.slice(0, 12).map(function (c) { return { text: cut(c.text, 500), fill: !!c.fill }; }); });
      }
      out.text = cut(out.text, 6000);
      return out;
    }).filter(Boolean);
    var res = { title: cut(String(w.title || '').trim() || 'A workbook', 200), blocks: blocks };
    if (images.length) res.images = images;
    return res;
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

  // Whether new blocks can replace a workbook's blocks without moving anyone's
  // answers: the same keys and types, in the same places.
  function sameShape(a, b) {
    a = a || []; b = b || [];
    return a.length === b.length && a.every(function (x, i) { return x.key === b[i].key && x.type === b[i].type; });
  }
  // Waiting for what is in it: no blocks yet, or images that never came in.
  function waiting(w) {
    return !(w.blocks || []).length || w.blocks.some(function (b) { return /\[(An )?image\]/i.test(String(b.text || '')); });
  }

  // ---- a leader's editing (/teach/workbook/) -----------------------------
  // A new block's key is one no block in it has had, so adding or moving a
  // block never moves anyone's answers to another question.
  function nextKey(blocks) {
    var n = 0;
    (blocks || []).forEach(function (b) { var m = /^b(\d+)$/.exec(b && b.key); if (m) n = Math.max(n, Number(m[1])); });
    return 'b' + (n + 1);
  }
  function newBlock(type, blocks) {
    var b = { key: nextKey(blocks), type: type, text: '' };
    if (type === 'free') b.height = 'short';
    if (type === 'choice') { b.multiple = false; b.choices = ['', '']; }
    if (type === 'table') b.rows = [[{ text: '', fill: false }, { text: '', fill: false }], [{ text: '', fill: true }, { text: '', fill: true }]];
    return b;
  }
  // A table as a leader typed it: a cell with words is fixed, an empty one is
  // for people to fill in. Rows keep the widest row's length.
  function tableFrom(grid) {
    var rows = (grid || []).slice(0, 40).map(function (r) { return (r || []).slice(0, 12).map(function (t) { return cut(String(t == null ? '' : t).trim(), 500); }); });
    var w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.filter(function (r) { return r.length; }).map(function (r) {
      while (r.length < w) r.push('');
      return r.map(function (t) { return { text: t, fill: !t }; });
    });
  }
  // Blocks fit to keep: known types, words cut to size, choices without blanks,
  // unique keys. What is wrong for a person to fix comes back as `problem`.
  function cleanBlocks(blocks) {
    var seen = {}, problem = null;
    var out = (blocks || []).slice(0, 120).map(function (b, i) {
      if (!b || ['text', 'free', 'choice', 'table', 'file'].indexOf(b.type) < 0) return null;
      var key = /^b\d+$/.test(b.key) && !seen[b.key] ? b.key : null;
      if (!key) return null;
      seen[key] = true;
      var o = { key: key, type: b.type, text: cut(String(b.text || '').trim(), 6000) };
      var n = i + 1;
      if (b.type !== 'text' && !o.text && !problem) problem = 'Block ' + n + ' needs its question.';
      if (b.type === 'text' && !o.text && !problem) problem = 'Block ' + n + ' has no words.';
      if (b.type === 'free') o.height = b.height === 'long' ? 'long' : 'short';
      if (b.type === 'choice') {
        o.multiple = !!b.multiple;
        o.choices = (b.choices || []).map(function (c) { return cut(String(c || '').trim(), 300); }).filter(Boolean).slice(0, 30);
        if (o.choices.length < 2 && !problem) problem = 'Block ' + n + ' needs at least two choices.';
      }
      if (b.type === 'table') {
        o.rows = (b.rows || []).slice(0, 40).map(function (r) { return (r || []).slice(0, 12).map(function (c) { return { text: cut(String((c && c.text) || ''), 500), fill: !!(c && c.fill) }; }); });
        if (!o.rows.some(function (r) { return r.some(function (c) { return c.fill; }); }) && !problem) problem = 'Block ' + n + ' has no empty cell to fill in.';
      }
      return o;
    }).filter(Boolean);
    return { blocks: out, problem: problem };
  }
  // The next free image name in a workbook, "i4.png", from the names its
  // blocks already use.
  function nextImage(blocks, type) {
    var n = 0;
    (blocks || []).forEach(function (b) {
      String((b && b.text) || '').split('\n').forEach(function (l) { var m = IMAGE_LINE.exec(l.trim()); if (m) n = Math.max(n, Number(/^i(\d+)/.exec(m[1])[1])); });
    });
    return n >= 999 ? null : imageName(n + 1, type);
  }

  var lib = { nextKey: nextKey, newBlock: newBlock, tableFrom: tableFrom, cleanBlocks: cleanBlocks, nextImage: nextImage, normalize: normalize, parts: parts, sameShape: sameShape, waiting: waiting, deltaText: deltaText, answerOf: answerOf, summary: summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.WorkbookLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
