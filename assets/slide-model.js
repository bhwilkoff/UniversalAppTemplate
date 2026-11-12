// What the slide studio changes, as plain text in and text out (SESSION-DESIGN.md).
// A deck stays Tiny Little Office's text, so the stage, the notes, and "Edit as
// text" never learn the studio exists. A slide here is its array of lines.
(function (root) {
  var L = root.SlidesLib || (typeof require !== 'undefined' ? require('./slides-lib.js') : null);

  function slides(text) { return L.split(text).map(trim); }
  function trim(lines) {
    var a = lines.slice();
    while (a.length && !a[0].trim()) a.shift();
    while (a.length && !a[a.length - 1].trim()) a.pop();
    return a;
  }
  function join(list) {
    return list.map(function (s) { return trim(s).join('\n'); }).filter(Boolean).join('\n\n---\n\n') + '\n';
  }

  // A line in three pieces: what marks it, its words, and what follows them.
  // A slide's headline is # or ##: the deck kit draws both, and a room's
  // slides and many talk.md files use #.
  var HEAD = /^(#{1,2}\s+(?::[a-z0-9-]+:\s+)?)(.*?)(\s*\{[^}]*\})?\s*$/;
  var POINT = /^(\s*[-*]\s+)(.*)$/;
  function pieces(line) {
    var m = HEAD.exec(line);
    if (m) return { kind: 'head', before: m[1], words: m[2], after: m[3] || '' };
    m = POINT.exec(line);
    if (m) return { kind: 'point', before: m[1], words: m[2], after: '' };
    return { kind: 'line', before: '', words: line, after: '' };
  }

  // The lines a person can type on, in the order the slide draws them.
  function editable(lines) {
    var out = [], fence = false, column = 0;
    lines.forEach(function (l, i) {
      if (/^```/.test(l)) { fence = !fence; return; }
      if (fence || !l.trim() || /^>/.test(l) || PICTURE.test(l.trim())) return;
      if (/^\|\s*$/.test(l)) { column = 1; return; }
      var p = pieces(l);
      out.push({ line: i, kind: p.kind, words: p.words, column: column });
    });
    return out;
  }
  function setWords(lines, i, words) {
    var a = lines.slice(), p = pieces(a[i]);
    a[i] = p.before + String(words).replace(/\s*\n\s*/g, ' ').trim() + p.after;
    return a;
  }
  // The next point under a line: a point follows a point, and a headline
  // starts the list.
  function addAfter(lines, i) {
    var a = lines.slice(), p = pieces(a[i]);
    if (p.kind === 'head') {
      var next = i + 1;
      while (next < a.length && !a[next].trim()) next += 1;
      a.splice(i + 1, next - i - 1, '', '- ');
      return { lines: a, line: i + 2 };
    }
    a.splice(i + 1, 0, p.kind === 'point' ? p.before : '');
    return { lines: a, line: i + 1 };
  }
  function remove(lines, i) { var a = lines.slice(); a.splice(i, 1); return a; }

  // The words as the renderer draws them.
  function plain(words) {
    return String(words || '').replace(/\*\*|__|`/g, '').replace(/(^|\s)[*_](\S)/g, '$1$2').replace(/(\S)[*_](\s|$)/g, '$1$2')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  }
  // Which drawn lines belong to which editable line. A long line wraps into
  // several, and anything else drawn (a table's cells) belongs to none.
  function match(items, drawn) {
    var at = 0;
    return items.map(function (it) {
      var want = plain(it.words);
      if (!want) return [];
      for (var s = at; s < drawn.length; s++) {
        var got = '', group = [];
        for (var e = s; e < drawn.length && got.length < want.length; e++) {
          got = (got ? got + ' ' : '') + plain(drawn[e]);
          group.push(e);
        }
        if (got === want) { at = group[group.length - 1] + 1; return group; }
      }
      return [];
    });
  }

  var LAYOUTS = [
    { key: 'slide', label: 'Words' }, { key: 'title', label: 'Title' },
    { key: 'two', label: 'Two columns' }, { key: 'icon', label: 'Big icon' }
  ];
  function headIndex(lines) {
    for (var i = 0; i < lines.length; i++) if (/^#{1,2}\s/.test(lines[i])) return i;
    return -1;
  }
  function marks(line) {
    var m = /\{([^}]*)\}\s*$/.exec(line || '');
    return m ? m[1].trim().split(/\s+/).filter(Boolean) : [];
  }
  function withMarks(line, list) {
    var bare = line.replace(/\s*\{[^}]*\}\s*$/, '');
    return list.length ? bare + ' {' + list.join(' ') + '}' : bare;
  }
  function layoutOf(lines) {
    var m = marks(lines[headIndex(lines)]);
    return m.indexOf('.title') >= 0 ? 'title' : m.indexOf('.two') >= 0 ? 'two' : m.indexOf('.icon') >= 0 ? 'icon' : 'slide';
  }
  function setLayout(lines, key) {
    var a = lines.slice(), h = headIndex(a);
    if (h < 0) { a.unshift('## A headline', ''); h = 0; }
    var keep = marks(a[h]).filter(function (x) { return ['.title', '.two', '.icon'].indexOf(x) < 0; });
    if (key !== 'slide') keep.unshift('.' + key);
    a[h] = withMarks(a[h], keep);
    if (key === 'icon' && !iconOf(a)) a = setIcon(a, 'lightbulb');
    var bar = a.findIndex(function (l) { return /^\|\s*$/.test(l); });
    if (key === 'two' && bar < 0) a.push('', '|', '', '- The other side');
    if (key !== 'two' && bar >= 0) a.splice(bar, 1);
    return a;
  }
  function revealed(lines) { return marks(lines[headIndex(lines)]).indexOf('.build') >= 0; }
  function setRevealed(lines, on) {
    var a = lines.slice(), h = headIndex(a);
    if (h < 0) return a;
    var keep = marks(a[h]).filter(function (x) { return x !== '.build'; });
    if (on) keep.push('.build');
    a[h] = withMarks(a[h], keep);
    return a;
  }
  function iconOf(lines) {
    var m = /^#{1,2}\s+:([a-z0-9-]+):/.exec(lines[headIndex(lines)] || '');
    return m ? m[1] : '';
  }
  function setIcon(lines, name) {
    var a = lines.slice(), h = headIndex(a);
    if (h < 0) return a;
    var hashes = /^#+/.exec(a[h])[0];
    var bare = a[h].replace(/^#{1,2}\s+(?::[a-z0-9-]+:\s+)?/, '');
    a[h] = hashes + ' ' + (name ? ':' + name + ': ' : '') + bare;
    return a;
  }

  function noteOf(lines) {
    return lines.filter(function (l) { return /^>/.test(l); }).map(function (l) { return l.replace(/^>\s?/, ''); }).join('\n');
  }
  function setNote(lines, text) {
    var a = trim(lines.filter(function (l) { return !/^>/.test(l); }));
    var said = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (said.length) { a.push(''); said.forEach(function (l) { a.push('> ' + l); }); }
    return a;
  }

  // A picture on a slide, written ![words](https://...): where it sits, its
  // address, and the words read out in its place. One to a slide.
  var PICTURE = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/;
  function picture(lines) {
    for (var i = 0; i < lines.length; i++) {
      var m = PICTURE.exec(String(lines[i]).trim());
      if (m) return { line: i, alt: m[1], url: m[2] };
    }
    return null;
  }
  function setPicture(lines, url, alt) {
    var words = String(alt || '').replace(/[\[\]\n]/g, ' ').replace(/\s+/g, ' ').trim();
    var line = '![' + words + '](' + url + ')';
    var a = lines.slice(), p = picture(a);
    if (p) { a[p.line] = line; return a; }
    var notes = a.findIndex(function (l) { return /^>/.test(l); });
    if (notes < 0) return a.concat(['', line]);
    a.splice(notes, 0, line, '');
    return a;
  }
  function removePicture(lines) {
    var p = picture(lines);
    if (!p) return lines;
    var a = lines.slice();
    a.splice(p.line, 1);
    return trim(a);
  }

  // A table, chart, or diagram on a slide: where it sits, and its text.
  function block(lines) {
    var from = lines.findIndex(function (l) { return /^```\s*(sheet|diagram|github)\b/.test(l); });
    if (from < 0) return null;
    var to = from + 1;
    while (to < lines.length && !/^```/.test(lines[to])) to += 1;
    return { app: /^```\s*(\w+)/.exec(lines[from])[1], from: from, to: to, body: lines.slice(from + 1, to).join('\n') };
  }
  function setBlock(lines, body) {
    var b = block(lines);
    if (!b) return lines;
    var a = lines.slice();
    a.splice.apply(a, [b.from + 1, b.to - b.from - 1].concat(String(body).split('\n')));
    return a;
  }
  // A sheet's text as rows of cells, and back. The head holds a chart's kind.
  function grid(body) {
    var head = /^---\n([\s\S]*?)\n---\n/.exec(body), rest = head ? body.slice(head[0].length) : body;
    var rows = rest.split('\n').filter(function (l) { return l.includes('|') && !/^[\s|:-]+$/.test(l); })
      .map(function (l) { return l.split('|').map(function (c) { return c.trim(); }); });
    var chart = head ? (/^chart:\s*(\S+)/m.exec(head[1]) || [])[1] || '' : '';
    return { chart: chart, head: head ? head[1] : '', rows: rows };
  }
  function ungrid(g) {
    var cols = Math.max.apply(null, g.rows.map(function (r) { return r.length; }).concat(1));
    var line = function (r) { var c = r.slice(); while (c.length < cols) c.push(''); return c.join(' | '); };
    var sep = new Array(cols).fill('---').join(' | ');
    var out = g.rows.length ? [line(g.rows[0]), sep].concat(g.rows.slice(1).map(line)) : [];
    return (g.head ? '---\n' + g.head + '\n---\n' : '') + out.join('\n');
  }

  // A diagram's lines, each a label on the slide.
  function outline(body) {
    var out = [];
    String(body).split('\n').forEach(function (l, i) {
      var m = /^(\s*[-*]\s+)(.*)$/.exec(l);
      if (m) out.push({ line: i, words: m[2] });
    });
    return out;
  }
  function setOutline(body, i, words) {
    var a = String(body).split('\n'), m = /^(\s*[-*]\s+)/.exec(a[i]);
    a[i] = (m ? m[1] : '') + String(words).replace(/\s*\n\s*/g, ' ').trim();
    return a.join('\n');
  }
  // The rows of a table, all one width, so each drawn cell has its place.
  function even(rows) {
    var cols = Math.max.apply(null, rows.map(function (r) { return r.length; }).concat(1));
    return rows.map(function (r) { var c = r.slice(); while (c.length < cols) c.push(''); return c; });
  }

  function move(list, from, to) {
    var a = list.slice(), x = a.splice(from, 1)[0];
    a.splice(to, 0, x);
    return a;
  }

  var lib = { slides: slides, join: join, pieces: pieces, editable: editable, setWords: setWords, addAfter: addAfter, remove: remove,
    plain: plain, match: match, LAYOUTS: LAYOUTS, layoutOf: layoutOf, setLayout: setLayout, revealed: revealed,
    setRevealed: setRevealed, iconOf: iconOf, setIcon: setIcon, noteOf: noteOf, setNote: setNote, block: block, setBlock: setBlock,
    grid: grid, ungrid: ungrid, outline: outline, setOutline: setOutline, even: even, move: move,
    picture: picture, setPicture: setPicture, removePicture: removePicture };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SlideModel = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
