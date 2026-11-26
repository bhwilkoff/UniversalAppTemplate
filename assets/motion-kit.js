// Slides that move (DECISIONS.md, "Slides that move"). A slide holding a
// motion fence is drawn here in 3D, on everyone's own stage, from the same
// text and the same step every stage already follows, so nothing new is sent
// through a call. Each point of the fence arrives as one step. Where WebGL 2 is
// missing, or the drawing fails, the deck kit's own slide stays in its place.
//
// MotionKit.show(box, text, at, shown, svg) takes over box when slide `at` of
// the deck text moves, and returns false otherwise; `svg` is the still slide,
// shown until the first frame is drawn. MotionKit.clear(box) gives it back.
// three.js is vendored (assets/vendor/three-0.170.0, MIT) and loaded only when
// a moving slide is on the stage.
(function () {
  var L = window.SlidesLib;
  if (!L || !L.motionAt) return;
  var SRC = '/assets/vendor/three-0.170.0/three.module.min.js';
  var W = 960, H = 600;
  var PAPER = '#131916', INK = '#E8EDEA', DARK = '#131916', MUTED = '#3A4540';
  var ACCENTS = ['#DCC4F0', '#8FD6B4', '#F2C879', '#9CC7F0', '#F2A79C'];
  var FONT = 'Commissioner, system-ui, -apple-system, "Segoe UI", sans-serif';
  var STEP = 0.9;

  var loading = null;
  function three() { return loading || (loading = import(SRC)); }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var wait = new Promise(function (ok) { setTimeout(ok, 1500); });
    return Promise.race([Promise.all([document.fonts.load('600 64px Commissioner'), document.fonts.load('400 64px Commissioner')]), wait]).catch(function () {});
  }
  var able = null;
  function canMove() {
    if (able !== null) return able;
    try {
      var g = document.createElement('canvas').getContext('webgl2');
      able = !!g;
      var x = g && g.getExtension('WEBGL_lose_context');
      if (x) x.loseContext();
    } catch (e) { able = false; }
    return able;
  }
  function calm() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Words on a face, drawn on a canvas and fitted: the largest size that keeps
  // them within `most` lines and inside the face.
  function lines(ctx, words, width) {
    var out = [], line = '';
    String(words).split(/\s+/).forEach(function (w) {
      var next = line ? line + ' ' + w : w;
      if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
    });
    if (line) out.push(line);
    return out;
  }
  function face(T, words, o) {
    var c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    var ctx = c.getContext('2d');
    ctx.fillStyle = o.bg; ctx.fillRect(0, 0, o.w, o.h);
    if (o.stripe) { ctx.fillStyle = o.stripe; ctx.fillRect(0, 0, o.w, Math.round(o.h * 0.07)); }
    var pad = o.pad || 0.08, room = o.w * (1 - 2 * pad), tall = o.h * (1 - 2 * pad), size = o.size, set = [];
    for (; size > 18; size -= 4) {
      ctx.font = (o.weight || 600) + ' ' + size + 'px ' + FONT;
      set = lines(ctx, words, room);
      if (set.length <= (o.most || 3) && set.length * size * 1.18 <= tall && set.every(function (l) { return ctx.measureText(l).width <= room; })) break;
    }
    ctx.fillStyle = o.fg; ctx.textBaseline = 'middle'; ctx.textAlign = o.align === 'left' ? 'left' : 'center';
    var x = o.align === 'left' ? o.w * pad : o.w / 2, top = o.h / 2 - (set.length - 1) * size * 0.59 + (o.stripe ? o.h * 0.03 : 0);
    set.forEach(function (l, i) { ctx.fillText(l, x, top + i * size * 1.18); });
    var tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function rounded(T, w, h, d, r) {
    var s = new T.Shape(), x = -w / 2 + r, y = -h / 2 + r, iw = w - 2 * r, ih = h - 2 * r;
    s.moveTo(x, y - r); s.lineTo(x + iw, y - r); s.quadraticCurveTo(x + iw + r, y - r, x + iw + r, y);
    s.lineTo(x + iw + r, y + ih); s.quadraticCurveTo(x + iw + r, y + ih + r, x + iw, y + ih + r);
    s.lineTo(x, y + ih + r); s.quadraticCurveTo(x - r, y + ih + r, x - r, y + ih);
    s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
    var b = Math.min(r, d / 3);
    var g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.6, bevelSegments: 3, curveSegments: 5 });
    g.center();
    return g;
  }

  // The room every kind is drawn in: a soft key light, a fill in the site's
  // lilac, and a floor that shows only shadows, so the slide's paper shows.
  function world(T) {
    var scene = new T.Scene();
    scene.fog = new T.Fog(PAPER, 22, 44);
    scene.add(new T.HemisphereLight('#ffffff', '#1d2622', 1.5));
    var key = new T.DirectionalLight('#ffffff', 2.2);
    key.position.set(-6, 13, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 45;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    scene.add(key);
    var fill = new T.DirectionalLight('#DCC4F0', 0.55);
    fill.position.set(9, 4, 6);
    scene.add(fill);
    var front = new T.DirectionalLight('#ffffff', 0.7);
    front.position.set(0, 3, 12);
    scene.add(front);
    var floor = new T.Mesh(new T.PlaneGeometry(90, 90), new T.ShadowMaterial({ opacity: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    var camera = new T.PerspectiveCamera(30, W / H, 0.1, 120);
    return { scene: scene, camera: camera };
  }

  // Each piece moves from where it is toward where its step puts it, so going
  // back a step plays the same move in reverse, and a late joiner's stage
  // simply starts with the pieces already in place.
  function piece(apply) { return { p: 0, to: 0, apply: apply }; }
  function settle(items, dt, still) {
    var busy = false;
    items.forEach(function (it) {
      if (still) it.p = it.to;
      else if (it.p !== it.to) { var d = dt / STEP; it.p = it.to > it.p ? Math.min(it.to, it.p + d) : Math.max(it.to, it.p - d); }
      if (it.p !== it.to) busy = true;
    });
    return busy;
  }

  var KINDS = {};

  // Blocks stack up: each point is a block that drops onto the one before.
  KINDS.stack = function (T, beats) {
    var w = world(T), items = [], blocks = [], h = 0.95, top = 0;
    beats.forEach(function (words, i) {
      var bw = 6.2 - i * 0.28, color = ACCENTS[i % ACCENTS.length];
      var mat = new T.MeshStandardMaterial({ color: color, roughness: 0.55, transparent: true });
      var block = new T.Mesh(rounded(T, bw, h, 2.3, 0.12), mat);
      block.castShadow = true; block.receiveShadow = true;
      var label = new T.Mesh(new T.PlaneGeometry(bw - 0.3, h - 0.12), new T.MeshStandardMaterial({ map: face(T, words, { w: Math.round((bw - 0.3) * 200), h: Math.round((h - 0.12) * 200), bg: color, fg: DARK, size: 84, most: 2, pad: 0.04 }), roughness: 0.6, transparent: true }));
      label.position.z = 1.151;
      block.add(label);
      var g = new T.Group(); g.add(block); w.scene.add(g);
      var y = h / 2 + i * (h + 0.02), x = (hash(i + 1) - 0.5) * 0.3, ry = (hash(i + 9) - 0.5) * 0.12;
      var it = piece(function (p) {
        g.visible = p > 0;
        var fall = Math.min(1, p / 0.72), q = clamp((p - 0.72) / 0.28);
        var drop = 7.5 * (1 - fall * fall) + 0.32 * Math.sin(q * Math.PI) * (1 - q);
        g.position.set(x, y + drop, 0);
        g.rotation.y = ry + (1 - easeOut(p)) * 0.5;
        block.scale.set(1 + 0.05 * Math.sin(q * Math.PI) * (1 - q), 1 - 0.1 * Math.sin(q * Math.PI) * (1 - q), 1);
        mat.opacity = label.material.opacity = clamp(p / 0.15);
      });
      items.push(it); blocks.push({ mat: mat, color: new T.Color(color) });
    });
    var look = new T.Vector3(), goal = new T.Vector3(), at = new T.Vector3(0, 3, 16), beat = 0, dim = new T.Color(MUTED);
    function aim(b) {
      top = Math.max(1, b) * (h + 0.02);
      var d = 12 + top * 1.25;
      goal.set(0, top * 0.5 + d * 0.22, d);
      look.set(0, top * 0.5 + d * 0.035, 0);
    }
    return {
      scene: w.scene, camera: w.camera,
      set: function (b, now) { beat = b; items.forEach(function (it, i) { it.to = i < b ? 1 : 0; if (now) it.p = it.to; }); aim(b); if (now) at.copy(goal); },
      update: function (dt, t, still) {
        var busy = settle(items, dt, still);
        items.forEach(function (it, i) { it.apply(it.p); blocks[i].mat.color.copy(blocks[i].color).lerp(dim, i < beat - 1 ? 0.18 : 0); });
        var k = still ? 1 : 1 - Math.exp(-dt * 3.2);
        at.lerp(goal, k);
        if (at.distanceTo(goal) > 0.01) busy = true;
        w.camera.position.copy(at); w.camera.lookAt(look);
        return busy;
      }
    };
  };

  // Cards land in a pile: each point is a card that falls onto the others.
  KINDS.pile = function (T, beats) {
    var w = world(T), items = [];
    beats.forEach(function (words, i) {
      var cw = 3.6, cd = 2.25, accent = ACCENTS[i % ACCENTS.length];
      var side = new T.MeshStandardMaterial({ color: '#cfd6d2', roughness: 0.8 });
      var top = new T.MeshStandardMaterial({ map: face(T, words, { w: 720, h: 450, bg: INK, fg: DARK, stripe: accent, size: 76, most: 4, pad: 0.1 }), roughness: 0.75 });
      var card = new T.Mesh(new T.BoxGeometry(cw, 0.045, cd), [side, side, top, side, side, side]);
      card.castShadow = true; card.receiveShadow = true;
      w.scene.add(card);
      var a = hash(i + 3) * Math.PI * 2, r = i ? 0.45 + hash(i + 5) * 0.75 : 0;
      var land = { x: Math.cos(a) * r, y: 0.03 + i * 0.05, z: Math.sin(a) * r * 0.55, ry: (hash(i + 7) - 0.5) * (i === beats.length - 1 ? 0.25 : 0.8) };
      var from = { x: land.x + (hash(i + 11) - 0.5) * 4, y: land.y + 6.5, z: land.z - 2.5, rx: -1.1, rz: (hash(i + 13) - 0.5) * 1.6, ry: land.ry + 1.4 };
      items.push(piece(function (p) {
        card.visible = p > 0;
        var f = clamp(p / 0.82), q = clamp((p - 0.82) / 0.18), e = easeOut(f);
        card.position.set(lerp(from.x, land.x, e), lerp(from.y, land.y, f * f) + 0.12 * Math.sin(q * Math.PI) * (1 - q), lerp(from.z, land.z, e));
        card.rotation.set(lerp(from.rx, 0, e), lerp(from.ry, land.ry, e), lerp(from.rz, 0, e) + 0.03 * Math.sin(q * Math.PI));
      }));
    });
    w.camera.position.set(0, 8.2, 6.6);
    w.camera.lookAt(0, 0, -0.9);
    return {
      scene: w.scene, camera: w.camera,
      set: function (b, now) { items.forEach(function (it, i) { it.to = i < b ? 1 : 0; if (now) it.p = it.to; }); },
      update: function (dt, t, still) { var busy = settle(items, dt, still); items.forEach(function (it) { it.apply(it.p); }); return busy; }
    };
  };

  // Cards come forward: the points wait face down in a row, and each step
  // turns one over and brings it to the front; the ones already said go back
  // to the row face up.
  KINDS.forward = function (T, beats) {
    var w = world(T), n = beats.length, cards = [];
    beats.forEach(function (words, i) {
      var accent = ACCENTS[i % ACCENTS.length];
      var side = new T.MeshStandardMaterial({ color: '#cfd6d2', roughness: 0.8 });
      var front = new T.MeshStandardMaterial({ map: face(T, words, { w: 760, h: 480, bg: INK, fg: DARK, stripe: accent, size: 80, most: 4, pad: 0.1 }), roughness: 0.7 });
      var back = new T.MeshStandardMaterial({ map: face(T, String(i + 1), { w: 380, h: 240, bg: accent, fg: DARK, size: 120, most: 1 }), roughness: 0.7 });
      var card = new T.Mesh(new T.BoxGeometry(3.8, 2.4, 0.05), [side, side, side, side, front, back]);
      card.castShadow = true;
      var g = new T.Group(); g.add(card); w.scene.add(g);
      var span = Math.min(1.75, 10 / Math.max(1, n - 1)), x = (i - (n - 1) / 2) * span;
      cards.push({ g: g, out: piece(), up: piece(), row: { x: x, y: 0.02, z: 1.2, ry: 0 } });
    });
    var front = { x: 0, y: 2.2, z: 1.0 };
    w.camera.position.set(0, 2.9, 12);
    w.camera.lookAt(0, 1.85, 0);
    return {
      scene: w.scene, camera: w.camera,
      set: function (b, now) {
        cards.forEach(function (c, i) {
          c.out.to = i === b - 1 ? 1 : 0; c.up.to = i < b ? 1 : 0;
          if (now) { c.out.p = c.out.to; c.up.p = c.up.to; }
        });
      },
      update: function (dt, t, still) {
        var items = []; cards.forEach(function (c) { items.push(c.out, c.up); });
        var busy = settle(items, dt, still);
        cards.forEach(function (c, i) {
          var o = easeInOut(c.out.p), u = easeInOut(c.up.p), bob = still ? 0 : Math.sin(t * 1.3 + i * 1.7) * 0.05;
          c.g.position.set(lerp(c.row.x, front.x, o), lerp(c.row.y, front.y, o) + Math.sin(c.out.p * Math.PI) * 0.7 + bob, lerp(c.row.z, front.z, o));
          var s = lerp(0.42, 1, o); c.g.scale.set(s, s, s);
          c.g.rotation.set(-0.05 * (1 - o), Math.PI * (1 - u) + c.row.ry * (1 - o), 0);
        });
        return busy || !still;
      }
    };
  };

  function dispose(scene) {
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      var m = o.material;
      (Array.isArray(m) ? m : m ? [m] : []).forEach(function (x) { if (x.map) x.map.dispose(); x.dispose(); });
    });
  }

  function make(box) {
    var el = document.createElement('div'); el.className = 'motion';
    var frame = document.createElement('div'); frame.className = 'motion-frame';
    var still = document.createElement('div'); still.className = 'motion-still';
    var canvas = document.createElement('canvas'); canvas.className = 'motion-canvas'; canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    frame.appendChild(still); frame.appendChild(canvas); el.appendChild(frame);
    var st = { el: el, frame: frame, still: still, canvas: canvas, renderer: null, kind: null, key: null, want: null, raf: 0, broken: false, last: 0 };
    st.fit = function () {
      var r = box.getBoundingClientRect(), fw = Math.min(r.width, r.height * W / H), fh = fw * H / W;
      if (!fw) return;
      frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
      if (st.renderer) { st.renderer.setSize(fw, fh, false); if (st.kind) draw(st, 0); }
    };
    if (window.ResizeObserver) { st.watch = new ResizeObserver(st.fit); st.watch.observe(box); }
    window.addEventListener('resize', st.fit);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) run(st); });
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); st.broken = true; canvas.hidden = true; still.hidden = false; });
    box.__motion = st;
    return st;
  }

  function draw(st, dt) {
    var t = performance.now() / 1000;
    var busy = st.kind.update(dt, t, calm());
    st.renderer.render(st.kind.scene, st.kind.camera);
    return busy;
  }
  function run(st) {
    if (st.raf || !st.kind || st.broken) return;
    st.last = performance.now();
    st.raf = requestAnimationFrame(function tick(now) {
      st.raf = 0;
      if (!st.kind || !st.el.isConnected || document.hidden) return;
      var dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (draw(st, dt) && !calm()) st.raf = requestAnimationFrame(tick);
    });
  }

  function apply(st, T) {
    var want = st.want;
    if (!want || st.broken) return;
    if (!st.renderer) {
      try {
        st.renderer = new T.WebGLRenderer({ canvas: st.canvas, antialias: true, alpha: true });
        st.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        st.renderer.setClearColor(0x000000, 0);
        st.renderer.outputColorSpace = T.SRGBColorSpace;
        st.renderer.toneMapping = T.NeutralToneMapping;
        st.renderer.shadowMap.enabled = true;
        st.renderer.shadowMap.type = T.PCFSoftShadowMap;
      } catch (e) { console.log('[motion] no 3D here: ' + (e && e.message)); st.broken = true; return; }
      st.fit();
    }
    if (st.key !== want.key) {
      if (st.kind) dispose(st.kind.scene);
      st.kind = (KINDS[want.m.kind] || KINDS.stack)(T, want.m.beats);
      st.key = want.key;
      st.kind.set(Math.max(0, want.beat - 1), true);
      st.kind.update(0, 0, true);
    }
    st.kind.set(want.beat, false);
    st.canvas.hidden = false;
    run(st);
  }

  function show(box, text, at, shown, svg) {
    var m = L.motionAt(text, at);
    if (!m || !m.beats.length || !canMove() || (box.__motion && box.__motion.broken)) { clear(box); return false; }
    var st = box.__motion || make(box);
    if (box.firstChild !== st.el || box.childNodes.length !== 1) box.replaceChildren(st.el);
    st.still.innerHTML = headline(text, at, m) || svg || '';
    st.fit();
    var beat = shown && shown !== Infinity ? Math.min(shown, m.beats.length) : m.beats.length;
    st.want = { key: m.kind + '\n' + m.beats.join('\n'), m: m, beat: beat };
    Promise.all([three(), fonts()]).then(function (r) { if (box.__motion === st && st.el.isConnected) apply(st, r[0]); })
      .catch(function (e) { console.log('[motion] three.js did not load: ' + (e && e.message)); st.broken = true; st.still.innerHTML = svg || ''; });
    return true;
  }
  // The slide's paper and headline, drawn by the deck kit as its first point
  // only, so the headline sits where every other slide's does; the points
  // themselves are the 3D's to draw.
  function headline(text, at, m) {
    var K = L.kit(window.DeckKit);
    if (!K) return '';
    try {
      var svg = K.frame(text, at, 1), first = m.beats[0];
      var box = document.createElement('div'); box.innerHTML = svg;
      Array.prototype.forEach.call(box.querySelectorAll('text'), function (t) { if (first && t.textContent && first.indexOf(t.textContent.trim()) >= 0 && t.textContent.trim()) t.remove(); });
      Array.prototype.forEach.call(box.querySelectorAll('circle, path[d^="M"]'), function (c) { if (c.closest && !c.closest('text') && c.getAttribute('r') && Number(c.getAttribute('r')) < 8) c.remove(); });
      return box.innerHTML;
    } catch (e) { return ''; }
  }
  function clear(box) {
    var st = box && box.__motion;
    if (!st) return;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (st.kind) { dispose(st.kind.scene); st.kind = null; st.key = null; }
    st.canvas.hidden = true;
    if (st.el.parentNode === box) box.removeChild(st.el);
  }

  // For a box that is going away: its 3D context goes with it, since a page
  // may hold only a few at once.
  function drop(box) {
    var st = box && box.__motion;
    if (!st) return;
    clear(box);
    if (st.renderer) { st.renderer.dispose(); st.renderer.forceContextLoss(); st.renderer = null; }
    if (st.watch) st.watch.disconnect();
    window.removeEventListener('resize', st.fit);
    box.__motion = null;
  }

  window.MotionKit = { show: show, clear: clear, drop: drop, canMove: canMove, KINDS: Object.keys(KINDS) };
})();
