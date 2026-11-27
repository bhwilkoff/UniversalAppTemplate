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
  // A kinetic slide (DECISIONS.md, "Kinetic slides"): a fence naming how its
  // points arrive, each point one step, drawn in 3D on the main stage by
  // assets/kinetic-kit.js. Everywhere else it is the same points as a list.
  // A point may carry a picture, ![what it shows](https://...), which kinds
  // with a card or a sign draw on it. The first slides, written on November 26,
  // used the fence name motion, which still reads.
  var KINETIC = /^```\s*(kinetic|motion)\b/;
  var KINETIC_KINDS = [
    { key: 'stack', name: 'Blocks stack up', when: 'Something built a piece at a time', pictures: false },
    { key: 'pile', name: 'Cards land in a pile', when: 'Notes, feedback, or things gathered' },
    { key: 'forward', name: 'Cards come forward', when: 'One question or idea at a time' },
    { key: 'spotlight', name: 'A spotlight moves', when: 'Taking turns, or people in order' },
    { key: 'path', name: 'A path, stop by stop', when: 'Steps in order, or a journey' },
    { key: 'loop', name: 'Around a loop', when: 'A cycle that repeats' },
    { key: 'dominoes', name: 'Dominoes fall', when: 'Each thing leads to the next' },
    { key: 'stairs', name: 'Stairs climb', when: 'Levels, from where you start to where you reach' },
    { key: 'target', name: 'Rings close in', when: 'From the broad to the point' },
    { key: 'grow', name: 'Plants grow', when: 'Ideas that grow from small beginnings' },
    { key: 'timeline', name: 'A timeline', when: 'Things in the order they happened' },
    { key: 'gather', name: 'Words gather', when: 'One idea at a time, said large', pictures: false }
  ];
  var KINETIC_MOST = 8;
  var POINT_PICTURE = /!\[([^\]]*)\]\(((?:https:\/\/|pic:)[^\s)]+)\)/;
  function pointOf(text) {
    var m = POINT_PICTURE.exec(text);
    var words = text.replace(POINT_PICTURE, ' ').replace(/\s+/g, ' ').trim();
    return { words: words || (m ? m[1] : ''), picture: m ? { alt: m[1] || words, url: m[2] } : null };
  }
  function kineticOf(lines) {
    lines = lines || [];
    var from = -1;
    for (var k = 0; k < lines.length; k++) if (KINETIC.test(lines[k])) { from = k; break; }
    if (from < 0) return null;
    var to = from + 1;
    while (to < lines.length && !/^```/.test(lines[to])) to += 1;
    var body = lines.slice(from + 1, to).join('\n');
    var head = /^---\n([\s\S]*?)\n---(\n|$)/.exec(body);
    var kind = head ? ((/^kind:\s*(\S+)/m.exec(head[1]) || [])[1] || '') : '';
    if (!KINETIC_KINDS.some(function (x) { return x.key === kind; })) kind = 'stack';
    var points = (head ? body.slice(head[0].length) : body).split('\n')
      .map(function (l) { var m = /^\s*[-*]\s+(.*)$/.exec(l); return m ? pointOf(m[1].trim()) : null; })
      .filter(function (p) { return p && p.words; }).slice(0, KINETIC_MOST);
    var title = '';
    for (var h = 0; h < lines.length; h++) if (/^#{1,2}\s/.test(lines[h])) { title = lines[h].replace(/^#{1,2}\s+/, '').replace(/\s*\{[^}]*\}\s*$/, '').trim(); break; }
    return { kind: kind, points: points, beats: points.map(function (p) { return p.words; }), title: title, from: from, to: to };
  }
  function bare(text) { var t = String(text || ''); return t.indexOf(HEAD) === 0 ? t.slice(HEAD.length) : t; }
  function kineticAt(text, i) { return kineticOf(split(bare(resolve(text)))[i]); }

  // A picture a deck owns is written ![words](pic:name.webp): it lives in the
  // private deck-pictures storage, in the deck's own folder, and only a page
  // that is signed in can make links to it (DeckPictures.prepare). Those links
  // are kept here by name, and every drawing reads the deck through resolve(),
  // so the editor's text keeps the short name and never a link that runs out.
  var PICS = {};
  var PIC_NAME = /^[a-z0-9]{6,40}\.(webp|png|jpe?g)$/;
  var PIC_REF = /!\[([^\]]*)\]\(pic:([^\s)]+)\)/g;
  // How many links were new, so a page that keeps drawn slides draws again.
  function usePictures(map) {
    var n = 0;
    Object.keys(map || {}).forEach(function (k) {
      if (PIC_NAME.test(k) && /^https:\/\//.test(map[k] || '') && PICS[k] !== map[k]) { PICS[k] = map[k]; n++; }
    });
    return n;
  }
  function picNames(text) {
    var out = [], m, re = new RegExp(PIC_REF.source, 'g'), t = String(text || '');
    while ((m = re.exec(t))) if (PIC_NAME.test(m[2]) && out.indexOf(m[2]) < 0) out.push(m[2]);
    return out;
  }
  function picsFor(text) {
    var out = {};
    picNames(text).forEach(function (n) { if (PICS[n]) out[n] = PICS[n]; });
    return out;
  }
  function pictureUrl(src) {
    var m = /^pic:(.+)$/.exec(String(src || ''));
    return m ? PICS[m[1]] || '' : String(src || '');
  }
  // A picture with no link yet is its words alone on a line of its own, and
  // nothing beside other words, until the link comes.
  function resolve(text) {
    var t = String(text || '');
    if (t.indexOf('](pic:') < 0) return t;
    return t.split('\n').map(function (line) {
      return line.replace(new RegExp(PIC_REF.source, 'g'), function (all, alt, name) {
        if (PICS[name]) return '![' + alt + '](' + PICS[name] + ')';
        return line.trim() === all ? alt : '';
      });
    }).join('\n');
  }
  // The deck as a renderer that cannot move draws it: each kinetic slide becomes
  // its headline and its points, so a thumbnail, the session page, and a
  // device without 3D show what the stage shows, a point at a time.
  function still(text) {
    var t = String(text || '');
    if (!/```\s*(kinetic|motion)\b/.test(t)) return t;
    var head = t.indexOf(HEAD) === 0 ? HEAD : '';
    var out = [], slide = [], fence = false;
    function flush() {
      var m = kineticOf(slide);
      if (!m) { out.push.apply(out, slide); slide = []; return; }
      var heads = slide.filter(function (l) { return /^#{1,2}\s/.test(l); }).slice(0, 1);
      var notes = slide.filter(function (l) { return /^>/.test(l); });
      out.push.apply(out, heads.concat([''], m.beats.map(function (b) { return '- ' + b; }), notes.length ? [''].concat(notes) : [], ['']));
      slide = [];
    }
    t.slice(head.length).split('\n').forEach(function (l) {
      if (/^```/.test(l)) fence = !fence;
      if (!fence && /^---\s*$/.test(l)) { flush(); out.push(l); return; }
      slide.push(l);
    });
    flush();
    return head + out.join('\n');
  }
  // The deck kit, drawing every kinetic slide as its points. One wrapper a kit.
  function kit(K) {
    if (!K) return K;
    if (K.__still) return K;
    if (!K.__stillKit) {
      var w = {};
      Object.keys(K).forEach(function (n) { w[n] = K[n]; });
      w.render = function (t) { return K.render(still(resolve(t))); };
      w.words = function (t) { return K.words(still(resolve(t))); };
      w.frame = function (t, a, s) { return K.frame(still(resolve(t)), a, s); };
      if (K.lint) w.lint = function (t) { return K.lint(still(resolve(t))); };
      w.__still = true;
      try { Object.defineProperty(K, '__stillKit', { value: w }); } catch (e) { return w; }
    }
    return K.__stillKit;
  }

  // Every stop in a deck, in order: { slide, shown }, where shown is how many
  // of its lines are drawn (Infinity for all of them). A kinetic slide stops at
  // each of its points.
  function frames(text) {
    var out = [];
    split(text).forEach(function (s, i) {
      var build = s.some(function (l) { return BUILD.test(l); });
      var moving = kineticOf(s);
      var n = moving ? moving.points.length : build ? lines(s) : 0;
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

  // A slide that is only a picture (![words](https://...)) draws the picture,
  // fitted to the slide, because the renderer draws no images (found running
  // an imported course whose slides were a PDF's pages). The words are read
  // out for anyone who cannot see it.
  var PICTURE = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/;
  function pictureOf(lines) {
    var body = (lines || []).map(function (l) { return String(l).trim(); }).filter(function (l) { return l && l.charAt(0) !== '>'; });
    var m = body.length === 1 ? PICTURE.exec(body[0]) : null;
    return m ? { alt: m[1], url: m[2] } : null;
  }
  function pictures(text) {
    var t = resolve(text);
    if (t.indexOf(HEAD) === 0) t = t.slice(HEAD.length);
    return split(t).map(pictureOf);
  }
  function attr(v) { return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function pictureSvg(svg, pic) {
    var vb = /viewBox="([^"]+)"/.exec(svg || '');
    var box = vb ? vb[1] : '0 0 1600 900', p = box.split(/[\s,]+/);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + attr(box) + '" role="img" aria-label="' + attr(pic.alt || 'A picture') + '">' +
      '<image href="' + attr(pic.url) + '" x="' + attr(p[0]) + '" y="' + attr(p[1]) + '" width="' + attr(p[2]) + '" height="' + attr(p[3]) + '" preserveAspectRatio="xMidYMid meet"/></svg>';
  }
  // The renderer's slides, with each picture slide drawn as its picture.
  function render(kit, text) {
    text = resolve(text);
    var out = kit.render(text), pics = pictures(text);
    return out.map(function (svg, i) { return pics[i] ? pictureSvg(svg, pics[i]) : svg; });
  }

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
    { key: 'picture', label: 'Picture', text: '## One idea, with a picture\n\n- What you will say about it\n\n![What the picture shows](https://example.com/picture.jpg)\n' },
    { key: 'table', label: 'Table', text: '## A table\n\n```sheet\nName | Count\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'chart', label: 'Chart', text: '## A chart\n\n```sheet\n---\nchart: bar\n---\nName | Count:number\n--- | ---\nFirst | 3\nSecond | 5\n```\n' },
    { key: 'github', label: 'GitHub', text: '## From GitHub\n\n```github\nrepo: \nshow: issues\n```\n' },
    { key: 'diagram', label: 'Diagram', text: '## A diagram\n\n```diagram\n---\nkind: mind\n---\n- The center\n  - One branch\n  - Another branch\n```\n' },
    { key: 'kinetic', label: 'Kinetic', text: '## One idea, built a piece at a time\n\n```kinetic\n---\nkind: stack\n---\n- The first piece\n- The next piece\n- The last piece\n```\n' }
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

  var lib = { ghAll: ghAll, ghDrop: ghDrop, ghLinks: ghLinks, ghSpecs: ghSpecs, ghHold: ghHold, ghHas: ghHas, ghExpand: ghExpand, HEAD: HEAD, split: split, count: count, withoutNotes: withoutNotes, notes: notes, deck: deck, render: render, pictures: pictures, blanks: blanks, clean: clean, frames: frames, frameOf: frameOf, step: step, arrive: arrive, ADD: ADD, NOTE: NOTE, insert: insert, insertNote: insertNote, offset: offset, slideAt: slideAt, KINETIC_KINDS: KINETIC_KINDS, KINETIC_MOST: KINETIC_MOST, kineticOf: kineticOf, kineticAt: kineticAt, pointOf: pointOf, still: still, kit: kit, usePictures: usePictures, picNames: picNames, picsFor: picsFor, pictureUrl: pictureUrl, resolve: resolve, PIC_NAME: PIC_NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SlidesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
