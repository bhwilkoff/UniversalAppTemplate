// The main stage's slides, as text (DECISIONS.md, "The main stage is built
// from slides"). A part's deck is written in Tiny Little Office's format, a
// slide between each line of three dashes, and this is everything the site
// needs to know about that text without drawing it. A line starting with >
// is a speaker note, which only leaders ever read.
(function (root) {
  var HEAD = '---\ntheme: humanshaped\nqr: no\n---\n';

  // The slides of a deck as their own lines. A dash line inside a fence (a
  // chart's or diagram's own head) is not a new slide.
  function split(text) {
    var out = [[]], fence = false;
    String(text || '').split('\n').forEach(function (line) {
      if (/^```/.test(line)) fence = !fence;
      if (!fence && /^---\s*$/.test(line)) { out.push([]); return; }
      out[out.length - 1].push(line);
    });
    return out.filter(function (s) { return s.join('').trim(); });
  }
  function count(text) { return split(text).length; }

  function withoutNotes(text) {
    return String(text || '').split('\n').filter(function (l) { return !/^>/.test(l); }).join('\n').trim();
  }
  // Each slide's speaker notes, one string a slide.
  function notes(text) {
    return split(text).map(function (lines) {
      return lines.filter(function (l) { return /^>/.test(l); }).map(function (l) { return l.replace(/^>\s?/, ''); }).join('\n').trim();
    });
  }

  // What the renderer reads: the site's look, and no closing QR code.
  function deck(text) { return text ? HEAD + String(text) : ''; }

  // A step inside a part's deck, or null when the step leaves the part.
  function step(total, at, delta) {
    var next = (Number(at) || 0) + delta;
    return next >= 0 && next < total ? next : null;
  }
  // Where a part starts when the show arrives at it: a step back lands on
  // its last slide, so going back retraces the talk.
  function arrive(total, delta) { return delta < 0 && total > 0 ? total - 1 : 0; }

  // The parts of a slide a leader can add from the toolbar, each a real
  // example to write over rather than a blank to fill in.
  var ADD = [
    { key: 'slide', label: 'Slide', text: '## One idea, in a few words\n\n- What you will say about it\n' },
    { key: 'title', label: 'Title', text: '## A title {.title}\n\nA line under it\n' },
    { key: 'two', label: 'Two columns', text: '## Two sides {.two}\n\n- On the left\n\n|\n\n- On the right\n' },
    { key: 'icon', label: 'Big icon', text: '## :lightbulb: One idea {.icon}\n\n- Beside a big icon\n' },
    { key: 'table', label: 'Table', text: '## A table\n\n```sheet\nName | Count:number\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'chart', label: 'Chart', text: '## A chart\n\n```sheet\n---\nchart: bar\n---\nName | Count:number\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'diagram', label: 'Diagram', text: '## A diagram\n\n```diagram\n---\nkind: flow\n---\n- First\n- Then\n- Last\n```\n' }
  ];
  var NOTE = '> What you want to remember to say\n';

  // The text with a new slide added after the one the caret is in.
  function insert(text, caret, addition) {
    var t = String(text || ''), at = Math.max(0, Math.min(Number(caret) || 0, t.length));
    var end = t.slice(at).search(/\n---\s*(\n|$)/);
    var cut = end < 0 ? t.length : at + end;
    var before = t.slice(0, cut).replace(/\s+$/, ''), after = t.slice(cut);
    var joined = before ? before + '\n\n---\n\n' + addition.replace(/\s+$/, '') : addition.replace(/\s+$/, '');
    return { text: joined + (after ? after : '\n'), caret: joined.length };
  }

  // A speaker note under the line the caret is on.
  function insertNote(text, caret) {
    var t = String(text || ''), at = Math.max(0, Math.min(Number(caret) || 0, t.length));
    var end = t.indexOf('\n', at);
    var cut = end < 0 ? t.length : end;
    var before = t.slice(0, cut) + '\n\n' + NOTE.replace(/\s+$/, '');
    return { text: before + t.slice(cut), caret: before.length };
  }

  // Where slide i starts in the text, and which slide a place in it is on.
  function offset(text, i) {
    var lines = String(text || '').split('\n'), fence = false, n = 0, pos = 0, inSlide = false;
    for (var k = 0; k < lines.length; k++) {
      var line = lines[k];
      if (/^```/.test(line)) fence = !fence;
      if (!fence && /^---\s*$/.test(line)) { if (inSlide) { n += 1; inSlide = false; } }
      else if (line.trim()) { if (!inSlide && n === i) return pos; inSlide = true; }
      pos += line.length + 1;
    }
    return String(text || '').length;
  }
  function slideAt(text, caret) { return Math.max(0, count(String(text || '').slice(0, caret)) - 1); }

  var lib = { HEAD: HEAD, split: split, count: count, withoutNotes: withoutNotes, notes: notes, deck: deck, step: step, arrive: arrive, ADD: ADD, NOTE: NOTE, insert: insert, insertNote: insertNote, offset: offset, slideAt: slideAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SlidesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
