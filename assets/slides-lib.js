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

  // A slide marked {.build} shows its lines one at a time. The renderer does
  // not know the mark, so it comes out of what the renderer reads.
  var BUILD = /^##.*\{[^}]*\.build\b/;
  function clean(text) {
    return String(text || '').split('\n').map(function (l) {
      if (!BUILD.test(l)) return l;
      return l.replace(/\s*\.build\b/, '').replace(/\s*\{\s*\}\s*$/, '').replace(/\{\s+/, '{');
    }).join('\n');
  }
  // The lines a slide can reveal: everything under its headline, outside a
  // fence, but for notes and the column mark.
  function lines(slide) {
    var fence = false, n = 0;
    slide.forEach(function (l) {
      if (/^```/.test(l)) { fence = !fence; return; }
      if (fence || !l.trim() || /^##/.test(l) || /^>/.test(l) || /^\|\s*$/.test(l)) return;
      n += 1;
    });
    return n;
  }
  // Every stop in a deck, in order: { slide, shown }, where shown is how many
  // of its lines are drawn (Infinity for all of them).
  function frames(text) {
    var out = [];
    split(text).forEach(function (s, i) {
      var build = s.some(function (l) { return BUILD.test(l); });
      var n = build ? lines(s) : 0;
      if (n < 2) { out.push({ slide: i, shown: Infinity }); return; }
      for (var k = 1; k <= n; k++) out.push({ slide: i, shown: k === n ? Infinity : k });
    });
    return out;
  }
  // The stop that shows a slide whole, for the leader's stage while editing.
  function frameOf(text, slide) {
    var f = frames(text), at = 0;
    f.forEach(function (x, i) { if (x.slide <= slide) at = i; });
    return at;
  }

  function withoutNotes(text) {
    return String(text || '').split('\n').filter(function (l) { return !/^>/.test(l); }).join('\n').trim();
  }
  // Each slide's speaker notes, one string a slide.
  function notes(text) {
    return split(text).map(function (lines) {
      return lines.filter(function (l) { return /^>/.test(l); }).map(function (l) { return l.replace(/^>\s?/, ''); }).join('\n').trim();
    });
  }

  // A part of a slide that comes from GitHub: a fence naming a repository and
  // what to show. github.com cannot be framed, so what it holds becomes the
  // deck's own words, and every place a slide is drawn needs nothing more.
  var GH_FENCE = /```github\n([\s\S]*?)```/g;
  var github = {};
  function ghSpec(body) {
    var repo = (/^repo:\s*(\S+)/m.exec(body) || [])[1] || '', show = (/^show:\s*(\S+)/m.exec(body) || [])[1] || 'issues';
    return { repo: repo, show: show, key: repo.toLowerCase() + '|' + show };
  }
  function ghSpecs(text) {
    var out = [], m, re = new RegExp(GH_FENCE.source, 'g');
    while ((m = re.exec(String(text || '')))) out.push(ghSpec(m[1]));
    return out;
  }
  function ghHold(key, data) { github[key] = data; }
  function ghAll() { return github; }
  function ghDrop(key) { delete github[key]; }
  function ghHas(key) { return Object.prototype.hasOwnProperty.call(github, key); }
  function cell(s) { return String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim(); }
  function ghWords(spec, d) {
    if (!spec.repo) return '- Name a repository';
    if (!d) return '- Reading ' + spec.repo + ' on GitHub';
    if (d.error) return '- ' + cell(d.error);
    if (spec.show === 'readme') {
      var lines = String(d.text || '').split('\n').map(function (l) { return l.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim(); })
        .filter(function (l) { return l && !/^[!<\[]/.test(l); }).slice(0, 5);
      return lines.length ? lines.map(function (l) { return '- ' + cell(l).slice(0, 90); }).join('\n') : '- This repository has no README yet';
    }
    if (spec.show === 'repo') {
      var a = d.about || {};
      return ['- ' + (cell(a.description) || cell(a.name)), '- ' + (a.issues || 0) + ' open, ' + (a.stars || 0) + ' stars'].join('\n');
    }
    var rows = d.rows || [];
    if (!rows.length) return spec.show === 'commits' ? '- No commits yet' : '- Nothing open right now';
    if (spec.show === 'commits') return rows.map(function (r) { return '- ' + cell(r.title) + ', ' + cell(r.by); }).join('\n');
    return '```sheet\nNumber | Title | By\n--- | --- | ---\n' + rows.map(function (r) { return '#' + r.n + ' | ' + cell(r.title) + ' | ' + cell(r.by); }).join('\n') + '\n```';
  }
  // What a slide's GitHub rows open, for the stage to offer.
  function ghLinks(text, slide) {
    var one = split(text)[slide];
    if (!one) return [];
    var out = [];
    ghSpecs(one.join('\n')).forEach(function (s) {
      ((github[s.key] || {}).rows || []).forEach(function (r) { if (r.url) out.push({ label: (r.n ? '#' + r.n + ' ' : '') + cell(r.title).slice(0, 48), url: r.url }); });
    });
    return out.slice(0, 6);
  }
  function ghExpand(text) {
    return String(text || '').replace(new RegExp(GH_FENCE.source, 'g'), function (all, body) {
      var spec = ghSpec(body);
      return ghWords(spec, github[spec.key]);
    });
  }

  // What the renderer reads: the site's look, and no closing QR code.
  // A blank to fill in (___) stays a blank: two on one line read as bold
  // ("helps ___ to ___" drew as "helps _ to ___" in bold, found running the
  // demo session's prompt stems). Code fences keep their text as written.
  function blanks(text) {
    var fence = false;
    return String(text || '').split('\n').map(function (l) {
      if (/^```/.test(l)) { fence = !fence; return l; }
      return fence ? l : l.replace(/(\\?)(_{3,})/g, function (all, esc, run) { return esc ? all : run.replace(/_/g, '\\_'); });
    }).join('\n');
  }
  function deck(text) { return text ? HEAD + ghExpand(blanks(clean(text))) : ''; }

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
    { key: 'build', label: 'Point by point', text: '## One idea, a point at a time {.build}\n\n- The first point\n- The next point\n- The last point\n' },
    { key: 'title', label: 'Title', text: '## A title {.title}\n\nA line under it\n' },
    { key: 'two', label: 'Two columns', text: '## Two sides {.two}\n\n- On the left\n\n|\n\n- On the right\n' },
    { key: 'icon', label: 'Big icon', text: '## :lightbulb: One idea {.icon}\n\n- Beside a big icon\n' },
    { key: 'table', label: 'Table', text: '## A table\n\n```sheet\nName | Count\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'chart', label: 'Chart', text: '## A chart\n\n```sheet\n---\nchart: bar\n---\nName | Count:number\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'github', label: 'GitHub', text: '## From GitHub\n\n```github\nrepo: \nshow: issues\n```\n' },
    { key: 'diagram', label: 'Diagram', text: '## A diagram\n\n```diagram\n---\nkind: mind\n---\n- The center\n  - One branch\n  - Another branch\n```\n' }
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

  var lib = { ghAll: ghAll, ghDrop: ghDrop, ghLinks: ghLinks, ghSpecs: ghSpecs, ghHold: ghHold, ghHas: ghHas, ghExpand: ghExpand, HEAD: HEAD, split: split, count: count, withoutNotes: withoutNotes, notes: notes, deck: deck, blanks: blanks, clean: clean, frames: frames, frameOf: frameOf, step: step, arrive: arrive, ADD: ADD, NOTE: NOTE, insert: insert, insertNote: insertNote, offset: offset, slideAt: slideAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SlidesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
