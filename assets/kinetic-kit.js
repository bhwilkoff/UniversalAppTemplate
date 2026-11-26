// Kinetic slides (DECISIONS.md, "Kinetic slides"). A slide holding a kinetic
// fence is drawn here in 3D, on everyone's own stage, from the same text and
// the same step every stage already follows, so nothing new is sent through a
// call. Each point of the fence arrives as one step. Where WebGL 2 is missing,
// or the drawing fails, the deck kit's own slide stays in its place.
//
// KineticKit.show(box, text, at, shown, svg) takes over box when slide `at` of
// the deck text is kinetic, and returns false otherwise; `svg` is the still
// slide, shown until the first frame is drawn. KineticKit.clear(box) gives the
// box back, and KineticKit.drop(box) frees its 3D context for good.
// three.js is vendored (assets/vendor/three-0.170.0, MIT) and loaded only when
// a kinetic slide is on the stage. A new kind is a function in KINDS below and a
// row in SlidesLib.KINETIC_KINDS; look at it with tools/motion/look.mjs.
(function () {
  var L = window.SlidesLib;
  if (!L || !L.kineticAt) return;
  var SRC = '/assets/vendor/three-0.170.0/three.module.min.js';
  var W = 960, H = 600;
  var PAPER = '#131916', INK = '#E8EDEA', DARK = '#131916', MUTED = '#3A4540', SIDE = '#cfd6d2';
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
  // A point's picture, read so WebGL may draw it: only from a host that allows
  // it (CORS), and given four seconds. A picture that fails leaves the words.
  var pictures = {};
  function picture(url) {
    if (!pictures[url]) pictures[url] = new Promise(function (ok) {
      var img = new Image(), done = false;
      var end = function (v) { if (!done) { done = true; ok(v); } };
      img.crossOrigin = 'anonymous';
      img.onload = function () { end(img); };
      img.onerror = function () { console.log('[kinetic] a picture did not load: ' + url); end(null); };
      setTimeout(function () { end(null); }, 4000);
      img.src = url;
    });
    return pictures[url];
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
  function bump(q) { return Math.sin(q * Math.PI) * (1 - q); }
  function accent(i) { return ACCENTS[i % ACCENTS.length]; }

  // Words on a face, drawn on a canvas and fitted: the largest size that keeps
  // them within `most` lines and inside the face. A picture takes the top of
  // the face, cropped to fill it, and the words go under it.
  function lines(ctx, words, width) {
    var out = [], line = '';
    String(words).split(/\s+/).forEach(function (w) {
      var next = line ? line + ' ' + w : w;
      if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
    });
    if (line) out.push(line);
    return out;
  }
  function face(T, words, o, img) {
    var c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    var ctx = c.getContext('2d');
    if (o.bg !== 'transparent') { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, o.w, o.h); }
    var band = o.stripe ? Math.round(o.h * 0.07) : 0;
    if (o.stripe) { ctx.fillStyle = o.stripe; ctx.fillRect(0, 0, o.w, band); }
    var pad = o.pad == null ? 0.08 : o.pad, top = band, tall = o.h - band, most = o.most || 3;
    if (img && img.naturalWidth) {
      var gap = Math.round(o.w * 0.04), bx = gap, by = band + gap, bw = o.w - 2 * gap, bh = Math.round((o.h - band) * 0.6) - gap;
      var s = Math.max(bw / img.naturalWidth, bh / img.naturalHeight), sw = bw / s, sh = bh / s;
      try { ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, bx, by, bw, bh); } catch (e) {}
      top = by + bh; tall = o.h - top; most = Math.min(most, 2);
    }
    var room = o.w * (1 - 2 * pad), fit = tall * (1 - 2 * Math.min(pad, 0.12)), size = o.size, set = [];
    for (; size > 16; size -= 3) {
      ctx.font = (o.weight || 600) + ' ' + size + 'px ' + FONT;
      set = lines(ctx, words, room);
      if (set.length <= most && set.length * size * 1.18 <= fit && set.every(function (l) { return ctx.measureText(l).width <= room; })) break;
    }
    ctx.fillStyle = o.fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    var mid = top + tall / 2 - (set.length - 1) * size * 0.59;
    set.forEach(function (l, i) { ctx.fillText(l, o.w / 2, mid + i * size * 1.18); });
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
  // A card: light paper, the point's words (and picture) on its front, a
  // colored stripe across the top, and optionally its number on the back.
  function card(T, point, i, o) {
    o = o || {};
    var w = o.w || 3.6, h = o.h || 2.25, d = o.d || 0.05, px = o.px || 200;
    var side = new T.MeshStandardMaterial({ color: SIDE, roughness: 0.8 });
    var front = new T.MeshStandardMaterial({ map: face(T, point.words, { w: Math.round(w * px), h: Math.round(h * px), bg: INK, fg: DARK, stripe: accent(i), size: o.size || 78, most: o.most || 4, pad: 0.1 }, point.img), roughness: 0.72 });
    var back = o.back ? new T.MeshStandardMaterial({ map: face(T, String(i + 1), { w: Math.round(w * 100), h: Math.round(h * 100), bg: accent(i), fg: DARK, size: 120, most: 1 }), roughness: 0.7 }) : side;
    var mats = o.flat ? [side, side, front, side, side, side] : [side, side, side, side, front, back];
    var m = new T.Mesh(o.flat ? new T.BoxGeometry(w, d, h) : new T.BoxGeometry(w, h, d), mats);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // The room every kind is drawn in: a soft key light, a fill in the site's
  // lilac, a light from the front for the words, and a floor that shows only
  // shadows, so the slide's paper shows through.
  function world(T, dark) {
    var scene = new T.Scene();
    scene.fog = new T.Fog(PAPER, 24, 48);
    scene.add(new T.HemisphereLight('#ffffff', '#1d2622', dark ? 0.35 : 1.5));
    var key = new T.DirectionalLight('#ffffff', dark ? 0.35 : 2.2);
    key.position.set(-6, 13, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    scene.add(key);
    var fill = new T.DirectionalLight('#DCC4F0', dark ? 0.15 : 0.55);
    fill.position.set(9, 4, 6);
    scene.add(fill);
    var front = new T.DirectionalLight('#ffffff', dark ? 0.12 : 0.7);
    front.position.set(0, 3, 12);
    scene.add(front);
    var floor = new T.Mesh(new T.PlaneGeometry(120, 120), new T.ShadowMaterial({ opacity: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    var camera = new T.PerspectiveCamera(30, W / H, 0.1, 140);
    return { scene: scene, camera: camera, key: key };
  }
  // A camera that eases toward where the step wants it.
  function rig(T, camera, pos, look) {
    var at = new T.Vector3().fromArray(pos), see = new T.Vector3().fromArray(look), goal = at.clone(), aim = see.clone();
    camera.position.copy(at); camera.lookAt(see);
    return {
      to: function (p, l, now) { goal.fromArray(p); aim.fromArray(l); if (now) { at.copy(goal); see.copy(aim); } },
      step: function (dt, still) {
        var k = still ? 1 : 1 - Math.exp(-dt * 3);
        at.lerp(goal, k); see.lerp(aim, k);
        camera.position.copy(at); camera.lookAt(see);
        return at.distanceTo(goal) > 0.01 || see.distanceTo(aim) > 0.01;
      }
    };
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
  // The usual shape of a kind: pieces with a target from the step, applied
  // every frame, plus anything else the kind moves (a camera, a light).
  function kind(w, items, onSet, onUpdate) {
    return {
      scene: w.scene, camera: w.camera,
      set: function (b, now) { onSet(b, now); if (now) items.forEach(function (it) { it.p = it.to; }); },
      update: function (dt, t, still) {
        var busy = settle(items, dt, still);
        items.forEach(function (it) { if (it.apply) it.apply(it.p, t, still); });
        return (onUpdate ? onUpdate(dt, t, still) : false) || busy;
      }
    };
  }
  function upto(items, b) { items.forEach(function (it, i) { it.to = i < b ? 1 : 0; }); }
  function only(items, b) { items.forEach(function (it, i) { it.to = i === b - 1 ? 1 : 0; }); }

  var KINDS = {};

  // Blocks stack up: each point is a block that drops onto the one before.
  KINDS.stack = function (T, points) {
    var w = world(T), items = [], mats = [], h = 0.95, beat = 0, dim = new T.Color(MUTED);
    points.forEach(function (point, i) {
      var bw = 6.2 - i * 0.28, color = accent(i);
      var mat = new T.MeshStandardMaterial({ color: color, roughness: 0.55, transparent: true });
      var block = new T.Mesh(rounded(T, bw, h, 2.3, 0.12), mat);
      block.castShadow = true; block.receiveShadow = true;
      var label = new T.Mesh(new T.PlaneGeometry(bw - 0.3, h - 0.12), new T.MeshStandardMaterial({ map: face(T, point.words, { w: Math.round((bw - 0.3) * 200), h: Math.round((h - 0.12) * 200), bg: color, fg: DARK, size: 66, most: 2, pad: 0.04 }), roughness: 0.6, transparent: true }));
      label.position.z = 1.151;
      block.add(label);
      var g = new T.Group(); g.add(block); w.scene.add(g);
      var y = h / 2 + i * (h + 0.02), x = (hash(i + 1) - 0.5) * 0.3, ry = (hash(i + 9) - 0.5) * 0.12;
      items.push(piece(function (p) {
        g.visible = p > 0;
        var fall = Math.min(1, p / 0.72), q = clamp((p - 0.72) / 0.28);
        g.position.set(x, y + 7.5 * (1 - fall * fall) + 0.32 * bump(q), 0);
        g.rotation.y = ry + (1 - easeOut(p)) * 0.5;
        block.scale.set(1 + 0.05 * bump(q), 1 - 0.1 * bump(q), 1);
        mat.opacity = label.material.opacity = clamp(p / 0.15);
        mat.color.set(color).lerp(dim, i < beat - 1 ? 0.18 : 0);
      }));
      mats.push(mat);
    });
    var cam = rig(T, w.camera, [0, 4, 16], [0, 1, 0]);
    return kind(w, items, function (b, now) {
      beat = b; upto(items, b);
      var top = Math.max(1, b) * (h + 0.02), d = 12 + top * 1.25;
      cam.to([0, top * 0.5 + d * 0.22, d], [0, top * 0.5 + d * 0.035, 0], now);
    }, function (dt, t, still) { return cam.step(dt, still); });
  };

  // Cards land in a pile: each point is a card that falls onto the others.
  KINDS.pile = function (T, points) {
    var w = world(T), items = [];
    points.forEach(function (point, i) {
      var c = card(T, point, i, { flat: true, w: 3.6, h: 2.25, d: 0.045, size: 76 });
      w.scene.add(c);
      var a = hash(i + 3) * Math.PI * 2, r = i ? 0.45 + hash(i + 5) * 0.75 : 0;
      var land = { x: Math.cos(a) * r, y: 0.03 + i * 0.05, z: Math.sin(a) * r * 0.55, ry: (hash(i + 7) - 0.5) * (i === points.length - 1 ? 0.25 : 0.8) };
      var from = { x: land.x + (hash(i + 11) - 0.5) * 4, y: land.y + 6.5, z: land.z - 2.5, rx: -1.1, rz: (hash(i + 13) - 0.5) * 1.6, ry: land.ry + 1.4 };
      items.push(piece(function (p) {
        c.visible = p > 0;
        var f = clamp(p / 0.82), q = clamp((p - 0.82) / 0.18), e = easeOut(f);
        c.position.set(lerp(from.x, land.x, e), lerp(from.y, land.y, f * f) + 0.12 * bump(q), lerp(from.z, land.z, e));
        c.rotation.set(lerp(from.rx, 0, e), lerp(from.ry, land.ry, e), lerp(from.rz, 0, e) + 0.03 * Math.sin(q * Math.PI));
      }));
    });
    w.camera.position.set(0, 8.2, 6.6);
    w.camera.lookAt(0, 0, -0.9);
    return kind(w, items, function (b) { upto(items, b); });
  };

  // Cards come forward: the points wait face down in a row, and each step
  // turns one over and brings it to the front; the ones already said go back
  // to the row face up.
  KINDS.forward = function (T, points) {
    var w = world(T), n = points.length, items = [];
    var front = { x: 0, y: 2.2, z: 1.0 }, span = Math.min(1.75, 10 / Math.max(1, n - 1));
    var cards = points.map(function (point, i) {
      var g = new T.Group(); g.add(card(T, point, i, { w: 3.8, h: 2.4, size: 80, back: true })); w.scene.add(g);
      var c = { g: g, out: piece(), up: piece(), row: { x: (i - (n - 1) / 2) * span, y: 0.02, z: 1.2 } };
      items.push(c.out, c.up);
      return c;
    });
    w.camera.position.set(0, 2.9, 12);
    w.camera.lookAt(0, 1.85, 0);
    return kind(w, items, function (b) {
      cards.forEach(function (c, i) { c.out.to = i === b - 1 ? 1 : 0; c.up.to = i < b ? 1 : 0; });
    }, function (dt, t, still) {
      cards.forEach(function (c, i) {
        var o = easeInOut(c.out.p), u = easeInOut(c.up.p), bob = still ? 0 : Math.sin(t * 1.3 + i * 1.7) * 0.05;
        c.g.position.set(lerp(c.row.x, front.x, o), lerp(c.row.y, front.y, o) + Math.sin(c.out.p * Math.PI) * 0.7 + bob, lerp(c.row.z, front.z, o));
        var s = lerp(0.42, 1, o); c.g.scale.set(s, s, s);
        c.g.rotation.set(-0.05 * (1 - o), Math.PI * (1 - u), 0);
      });
      return !still;
    });
  };

  // A spotlight moves: the points stand in a row on a dark stage, and the
  // light finds each in turn, which steps forward into it.
  KINDS.spotlight = function (T, points) {
    var w = world(T, true), n = points.length, items = [];
    var cw = Math.min(3.2, 12.5 / n), span = cw * 1.12;
    var spot = new T.SpotLight('#fff6e8', 300, 30, 0.22, 0.5, 1.6);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024);
    spot.position.set(0, 10, 6); w.scene.add(spot); w.scene.add(spot.target);
    var beam = new T.Mesh(new T.ConeGeometry(1, 1, 40, 1, true), new T.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.045, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    w.scene.add(beam);
    var xs = points.map(function (p, i) { return (i - (n - 1) / 2) * span; });
    var cards = points.map(function (point, i) {
      var c = card(T, point, i, { w: cw, h: cw * 0.66, size: 84, most: 3 });
      var base = new T.Mesh(new T.CylinderGeometry(cw * 0.32, cw * 0.36, 0.25, 32), new T.MeshStandardMaterial({ color: '#2b3430', roughness: 0.9 }));
      base.receiveShadow = true; base.position.set(xs[i], 0.125, 0); w.scene.add(base);
      var g = new T.Group(); g.add(c); w.scene.add(g);
      var it = piece(function (p) {
        var e = easeInOut(p);
        g.position.set(xs[i], 0.25 + cw * 0.33 + e * 0.45, e * 1.1);
        var s = 1 + e * 0.22; g.scale.set(s, s, s);
        g.rotation.y = (1 - e) * -xs[i] * 0.04;
      });
      items.push(it);
      return it;
    });
    var aim = { x: xs[0] }, goal = xs[0];
    w.camera.position.set(0, 4.6, 19.5);
    w.camera.lookAt(0, 1.5, 0);
    return kind(w, items, function (b, now) { only(cards, b); goal = xs[Math.max(0, b - 1)]; if (now) aim.x = goal; }, function (dt, t, still) {
      aim.x = still ? goal : lerp(aim.x, goal, 1 - Math.exp(-dt * 3.5));
      spot.position.set(aim.x * 0.6, 10, 6);
      spot.target.position.set(aim.x, 0.9, 1.1);
      var top = spot.position, bottom = new T.Vector3(aim.x, 0, 1.1), len = top.distanceTo(bottom), r = Math.tan(0.22) * len;
      beam.scale.set(r, len, r);
      beam.position.copy(top).add(bottom).multiplyScalar(0.5);
      beam.lookAt(bottom); beam.rotateX(-Math.PI / 2);
      return Math.abs(aim.x - goal) > 0.01;
    });
  };

  // A path, stop by stop: stepping stones lead across the floor, a marker
  // hops along them, and each stop's sign rises as it is reached.
  KINDS.path = function (T, points) {
    var w = world(T), n = points.length, items = [];
    var curve = new T.CatmullRomCurve3([new T.Vector3(-6.4, 0, 3.2), new T.Vector3(-3, 0, 0.6), new T.Vector3(0, 0, 2.2), new T.Vector3(3.2, 0, -0.4), new T.Vector3(6.2, 0, 1.4)]);
    var stops = points.map(function (p, i) { return n === 1 ? 0.5 : 0.04 + 0.92 * i / (n - 1); });
    var stones = [], count = 34, stoneMat = new T.MeshStandardMaterial({ color: '#3d4842', roughness: 0.95 });
    for (var k = 0; k < count; k++) {
      var t = k / (count - 1), at = curve.getPoint(t);
      var s = new T.Mesh(new T.CylinderGeometry(0.26, 0.3, 0.08, 20), stoneMat.clone());
      s.position.set(at.x, 0.04, at.z); s.receiveShadow = true; w.scene.add(s);
      stones.push({ m: s, t: t });
    }
    var signs = points.map(function (point, i) {
      var at = curve.getPoint(stops[i]), g = new T.Group();
      var post = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.4, 10), new T.MeshStandardMaterial({ color: '#8a958f' }));
      post.position.y = 0.7; post.castShadow = true; g.add(post);
      var c = card(T, point, i, { w: 3.0, h: 1.7, d: 0.06, size: 74, most: 3 });
      c.position.y = 1.4 + 0.85; g.add(c);
      g.position.set(at.x, 0, at.z - 0.35); w.scene.add(g);
      var it = piece(function (p) { var e = easeOut(clamp(p * 1.4 - 0.25)); g.visible = p > 0; g.scale.set(1, Math.max(0.001, e), 1); c.material[4].color.setScalar(i < beat - 1 ? 0.78 : 1); });
      items.push(it);
      return it;
    });
    var beat = 0;
    var walker = new T.Mesh(new T.SphereGeometry(0.28, 28, 20), new T.MeshStandardMaterial({ color: ACCENTS[0], roughness: 0.4 }));
    walker.castShadow = true; w.scene.add(walker);
    var trav = { t: 0, from: 0, to: 0, p: 1 };
    w.camera.position.set(0, 9.6, 19.5);
    w.camera.lookAt(0, 1.1, 0.6);
    return kind(w, items, function (b, now) {
      beat = b; upto(signs, b);
      var goal = stops[Math.max(0, b - 1)];
      if (now) { trav.t = trav.from = trav.to = goal; trav.p = 1; } else if (goal !== trav.to) { trav.from = trav.t; trav.to = goal; trav.p = 0; }
    }, function (dt, t, still) {
      trav.p = still ? 1 : Math.min(1, trav.p + dt / (STEP * 1.1));
      var e = easeInOut(trav.p);
      trav.t = lerp(trav.from, trav.to, e);
      var at = curve.getPoint(trav.t), hops = Math.max(1, Math.round(Math.abs(trav.to - trav.from) * 12));
      walker.position.set(at.x, 0.28 + (trav.p < 1 ? Math.abs(Math.sin(trav.p * Math.PI * hops)) * 0.45 : 0), at.z);
      stones.forEach(function (s) { s.m.material.color.set(s.t <= trav.t + 0.005 ? '#8FD6B4' : '#3d4842'); });
      return trav.p < 1;
    });
  };

  // Around a loop: the points stand around a ring, a marker travels it, and
  // the ring lights up behind the marker until the loop closes.
  KINDS.loop = function (T, points) {
    var w = world(T), n = points.length, items = [], R = 4.3;
    var ang = function (i) { return Math.PI / 2 + (i / n) * Math.PI * 2; };
    var pos = function (a) { return { x: Math.cos(a) * R, z: Math.sin(a) * R * 0.78 }; };
    var beads = [];
    for (var k = 0; k < 72; k++) {
      var a = Math.PI / 2 + k / 72 * Math.PI * 2, p = pos(a);
      var bead = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), new T.MeshStandardMaterial({ color: '#3d4842' }));
      bead.position.set(p.x, 0.09, p.z); w.scene.add(bead); beads.push({ m: bead, a: a });
    }
    var cw = Math.min(2.7, 15 / n);
    var stations = points.map(function (point, i) {
      var p = pos(ang(i)), g = new T.Group(), c = card(T, point, i, { w: cw, h: cw * 0.6, size: 80, most: 3 });
      c.position.y = cw * 0.3 + 0.15; g.add(c); g.position.set(p.x, 0, p.z); w.scene.add(g);
      var it = piece(function (q) { var e = easeOut(q); g.position.y = e * 0.35; var s = 0.82 + e * 0.28; g.scale.set(s, s, s); c.material[4].color.setScalar(lerp(0.62, 1, Math.min(1, q * 2 + (it.seen ? 1 : 0)))); });
      it.seen = false;
      items.push(it);
      return it;
    });
    var marker = new T.Mesh(new T.SphereGeometry(0.24, 24, 16), new T.MeshStandardMaterial({ color: ACCENTS[2], roughness: 0.35 }));
    marker.castShadow = true; w.scene.add(marker);
    var trav = { a: ang(0), from: ang(0), to: ang(0), p: 1 }, lit = ang(0);
    w.camera.position.set(0, 10.4, 16.2);
    w.camera.lookAt(0, 1.4, -0.4);
    return kind(w, items, function (b, now) {
      only(stations, b);
      stations.forEach(function (s, i) { s.seen = i < b - 1; });
      var goal = ang(Math.max(0, b - 1)) + (b === n && n > 1 ? 0 : 0);
      if (now) { trav.a = trav.from = trav.to = goal; trav.p = 1; } else if (goal !== trav.to) { trav.from = trav.a; trav.to = goal; trav.p = 0; }
      lit = b === n ? ang(0) + Math.PI * 2 : goal;
    }, function (dt, t, still) {
      trav.p = still ? 1 : Math.min(1, trav.p + dt / (STEP * 1.2));
      trav.a = lerp(trav.from, trav.to, easeInOut(trav.p));
      var p = pos(trav.a);
      marker.position.set(p.x, 0.24 + (trav.p < 1 ? Math.sin(trav.p * Math.PI) * 0.4 : 0), p.z);
      var reach = trav.p < 1 ? trav.a : lit;
      beads.forEach(function (bd) { bd.m.material.color.set(bd.a <= reach + 0.001 ? '#F2C879' : '#3d4842'); });
      return trav.p < 1;
    });
  };

  // Dominoes fall: the points stand in a line going away, and each step tips
  // the front one over, face up, to show the one behind it.
  KINDS.dominoes = function (T, points) {
    var w = world(T), n = points.length, items = [], dh = 3.0, dw = 2.3, dd = 0.34, gap = 3.25;
    var doms = points.map(function (point, i) {
      var side = new T.MeshStandardMaterial({ color: '#2b3430', roughness: 0.6 });
      var front = new T.MeshStandardMaterial({ map: face(T, point.words, { w: Math.round(dw * 200), h: Math.round(dh * 200), bg: INK, fg: DARK, stripe: accent(i), size: 80, most: 5, pad: 0.1 }, point.img), roughness: 0.6 });
      var m = new T.Mesh(new T.BoxGeometry(dw, dh, dd), [side, side, side, side, front, side]);
      m.castShadow = true; m.receiveShadow = true;
      m.position.set(0, dh / 2, dd / 2);
      var pivot = new T.Group(); pivot.add(m);
      var x = (i % 2 ? 0.35 : -0.35), z = -i * gap;
      pivot.position.set(x, 0, z - dd / 2); w.scene.add(pivot);
      var it = piece(function (p) {
        var f = clamp(p / 0.8), q = clamp((p - 0.8) / 0.2);
        pivot.rotation.x = -(Math.PI / 2) * f * f + 0.06 * bump(q);
      });
      items.push(it);
      return { it: it, z: z, x: x };
    });
    var cam = rig(T, w.camera, [3, 5.6, 10], [0, 1.5, 0]);
    return kind(w, items, function (b, now) {
      doms.forEach(function (d, i) { d.it.to = i < b - 1 ? 1 : 0; });
      var c = doms[Math.max(0, b - 1)];
      cam.to([c.x + 4.6, 7.6, c.z + 15], [c.x, 1.9, c.z - 0.6], now);
    }, function (dt, t, still) { return cam.step(dt, still); });
  };

  // Stairs climb: a marker climbs a stair a step at a time, and each step's
  // sign stands up as it is reached.
  KINDS.stairs = function (T, points) {
    var beat = 0, w = world(T), n = points.length, items = [], run = Math.min(2.1, 14 / n), rise = 0.6, depth = 2.6;
    var x0 = -run * n / 2 + run / 2, steps = [];
    points.forEach(function (point, i) {
      var top = (i + 1) * rise, mat = new T.MeshStandardMaterial({ color: '#3d4842', roughness: 0.7 });
      var blk = new T.Mesh(new T.BoxGeometry(run, top, depth), mat);
      blk.position.set(x0 + i * run, top / 2, 0); blk.castShadow = true; blk.receiveShadow = true; w.scene.add(blk);
      var c = card(T, point, i, { w: run * 0.94, h: run * 0.62, d: 0.05, size: 80, most: 3 });
      var g = new T.Group(); g.add(c); c.position.y = run * 0.31; g.position.set(x0 + i * run, top, depth * 0.18); w.scene.add(g);
      var it = piece(function (p) {
        c.material[4].color.setScalar(i < beat - 1 ? 0.78 : 1);
        var e = easeOut(p); g.visible = p > 0; g.scale.set(1, Math.max(0.001, e), 1);
        mat.color.set('#3d4842').lerp(new T.Color(accent(i)), e * 0.85);
      });
      items.push(it); steps.push({ x: x0 + i * run, y: top });
    });
    var climber = new T.Mesh(new T.SphereGeometry(0.26, 24, 16), new T.MeshStandardMaterial({ color: INK, roughness: 0.35 }));
    climber.castShadow = true; w.scene.add(climber);
    var trav = { from: 0, to: 0, at: 0, p: 1 };
    var mid = n * rise / 2;
    w.camera.position.set(2.5, mid + 4.2, 14.5);
    w.camera.lookAt(0, mid + 0.4, 0);
    return kind(w, items, function (b, now) {
      beat = b; upto(items, b);
      var goal = Math.max(0, b - 1);
      if (now) { trav.at = trav.from = trav.to = goal; trav.p = 1; } else if (goal !== trav.to) { trav.from = trav.at; trav.to = goal; trav.p = 0; }
    }, function (dt, t, still) {
      trav.p = still ? 1 : Math.min(1, trav.p + dt / STEP);
      trav.at = lerp(trav.from, trav.to, easeInOut(trav.p));
      var i = Math.round(trav.at), s = steps[Math.max(0, Math.min(n - 1, i))], f = trav.at - Math.floor(trav.at);
      var lo = steps[Math.max(0, Math.floor(trav.at))], hi = steps[Math.min(n - 1, Math.ceil(trav.at))];
      climber.position.set(lerp(lo.x, hi.x, f), lerp(lo.y, hi.y, f) + 0.26 + Math.sin(f * Math.PI) * 0.5, -depth * 0.25);
      return trav.p < 1 || !s;
    });
  };

  // Rings close in: a target's rings run from the broad to the point; each
  // step lights the next ring in and a dart lands in it, and the point's words
  // join the list beside it.
  KINDS.target = function (T, points) {
    var w = world(T), n = points.length, items = [], R = 2.35, cx = -3.0, cy = 2.55;
    var board = new T.Group(); board.position.set(cx, cy, 0); w.scene.add(board);
    var back = new T.Mesh(new T.CylinderGeometry(R + 0.12, R + 0.12, 0.3, 64), new T.MeshStandardMaterial({ color: '#28302C', roughness: 0.8 }));
    back.rotation.x = Math.PI / 2; back.position.z = -0.16; back.castShadow = true; board.add(back);
    var stand = new T.Mesh(new T.BoxGeometry(0.25, cy, 0.25), new T.MeshStandardMaterial({ color: '#2b3430' }));
    stand.position.set(cx, cy / 2, -0.4); w.scene.add(stand);
    var rings = points.map(function (p, i) {
      var outer = R * (1 - i / n), inner = R * (1 - (i + 1) / n);
      var mat = new T.MeshStandardMaterial({ color: accent(i), roughness: 0.6, side: T.DoubleSide });
      var ring = new T.Mesh(new T.RingGeometry(inner, outer, 64), mat); ring.position.z = 0.001 * i; board.add(ring);
      return { mat: mat, r: (outer + inner) / 2, color: new T.Color(accent(i)) };
    });
    var dim = new T.Color('#2f3833');
    var tagW = 4.6, tagH = Math.min(1.0, 5.2 / n);
    var tags = [], darts = [];
    points.forEach(function (point, i) {
      var c = card(T, point, i, { w: tagW, h: tagH, d: 0.04, size: 70, most: 2, px: 220 });
      var y = cy + (n - 1) * tagH * 0.58 - i * tagH * 1.16;
      c.position.set(3.2, y, 0.2); w.scene.add(c);
      var a = hash(i + 21) * Math.PI * 2, rr = rings[i].r;
      var dart = new T.Group();
      var shaft = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.1, 10), new T.MeshStandardMaterial({ color: '#d9dedb', metalness: 0.4, roughness: 0.3 }));
      shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.55; dart.add(shaft);
      var fin = new T.Mesh(new T.ConeGeometry(0.16, 0.34, 4), new T.MeshStandardMaterial({ color: accent(i + 2) }));
      fin.rotation.x = -Math.PI / 2; fin.position.z = 1.05; dart.add(fin);
      dart.scale.setScalar(1.7); dart.castShadow = true; w.scene.add(dart);
      var land = new T.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.02), from = new T.Vector3(cx + 7, cy + 2.5, 9);
      var it = piece(function (p) {
        var e = easeOut(clamp(p / 0.75));
        dart.visible = p > 0; dart.position.lerpVectors(from, land, e); dart.position.y += Math.sin(e * Math.PI) * 0.8;
        dart.rotation.set(0.12 * (1 - e), 0.35 * (1 - e), 0);
        c.visible = p > 0; c.scale.set(1, Math.max(0.001, easeOut(p)), 1);
      });
      items.push(it); tags.push(c); darts.push(dart);
    });
    w.camera.position.set(0, 3.4, 16.5);
    w.camera.lookAt(0.2, 2.9, 0);
    var beat = 0;
    return kind(w, items, function (b) { beat = b; upto(items, b); }, function () {
      rings.forEach(function (r, i) { r.mat.color.copy(r.color).lerp(dim, i < beat ? (i === beat - 1 ? 0 : 0.35) : 0.75); r.mat.emissive = r.mat.emissive || new T.Color(); r.mat.emissive.set(i === beat - 1 ? r.color : '#000000').multiplyScalar(0.18); });
      tags.forEach(function (c, i) { c.material[4].color.setScalar(i === beat - 1 ? 1 : 0.7); });
      return false;
    });
  };

  // Plants grow: each point is a pot whose stem rises, leaves open, and the
  // point's words bloom at the top.
  KINDS.grow = function (T, points) {
    var beat = 0, w = world(T), n = points.length, items = [], span = Math.min(2.9, 13.5 / n), tw = Math.min(2.7, span * 0.95);
    points.forEach(function (point, i) {
      var x = (i - (n - 1) / 2) * span, hgt = 1.3 + (n > 1 ? i / (n - 1) : 0) * 1.1;
      var pot = new T.Mesh(new T.CylinderGeometry(0.55, 0.42, 0.75, 28), new T.MeshStandardMaterial({ color: '#B98A6E', roughness: 0.85 }));
      pot.position.set(x, 0.375, 0); pot.castShadow = true; pot.receiveShadow = true; w.scene.add(pot);
      var soil = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.05, 28), new T.MeshStandardMaterial({ color: '#3b2f27' }));
      soil.position.set(x, 0.73, 0); w.scene.add(soil);
      var stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.07, 1, 10), new T.MeshStandardMaterial({ color: '#5f9a72', roughness: 0.6 }));
      stem.castShadow = true; w.scene.add(stem);
      var leafMat = new T.MeshStandardMaterial({ color: '#8FD6B4', roughness: 0.55 });
      var leaves = [-1, 1].map(function (s) { var l = new T.Mesh(new T.SphereGeometry(0.3, 16, 10), leafMat); l.scale.set(1, 0.18, 0.5); l.castShadow = true; w.scene.add(l); return { m: l, s: s }; });
      var c = card(T, point, i, { w: tw, h: tw * 0.62, d: 0.05, size: 80, most: 3 }); w.scene.add(c);
      items.push(piece(function (p, t, still) {
        c.material[4].color.setScalar(i < beat - 1 ? 0.78 : 1);
        var sp = easeOut(clamp(p / 0.6)), lp = easeOut(clamp((p - 0.3) / 0.4)), bp = easeOut(clamp((p - 0.55) / 0.45));
        var h = Math.max(0.001, hgt * sp), sway = still ? 0 : Math.sin(t * 1.1 + i) * 0.03 * sp;
        stem.visible = p > 0; stem.scale.set(1, h, 1); stem.position.set(x, 0.75 + h / 2, 0); stem.rotation.z = sway;
        leaves.forEach(function (l) { l.m.visible = lp > 0; l.m.scale.set(lp, 0.18 * lp, 0.5 * lp); l.m.position.set(x + l.s * 0.3 * lp, 0.75 + hgt * 0.45 * sp, 0); l.m.rotation.z = -l.s * 0.5; });
        c.visible = bp > 0; c.scale.setScalar(Math.max(0.001, bp)); c.position.set(x - sway * h, 0.75 + h + tw * 0.31 * bp, 0.05); c.rotation.z = sway;
      }));
    });
    w.camera.position.set(0, 4.2, 17.5);
    w.camera.lookAt(0, 2.75, 0);
    return kind(w, items, function (b) { beat = b; upto(items, b); }, function (dt, t, still) { return !still; });
  };

  // A timeline: a rail runs across the floor, and each step drops a marker on
  // it and raises the point's card; the camera moves along with the time.
  // A point written "When: what" puts its "when" on the rail.
  KINDS.timeline = function (T, points) {
    var beat = 0, w = world(T), n = points.length, items = [], gap = 3.9;
    var x0 = -gap * (n - 1) / 2, len = gap * (n - 1) + 6;
    var rail = new T.Mesh(new T.BoxGeometry(len, 0.08, 0.16), new T.MeshStandardMaterial({ color: '#56625b' }));
    rail.position.set(0, 0.04, 0.6); rail.receiveShadow = true; w.scene.add(rail);
    var xs = [];
    points.forEach(function (point, i) {
      var x = x0 + i * gap, m = /^([^:]{1,18}):\s+(.+)$/.exec(point.words), when = m ? m[1] : '', words = m ? m[2] : point.words;
      var dot = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.12, 24), new T.MeshStandardMaterial({ color: accent(i), roughness: 0.4 }));
      dot.castShadow = true; w.scene.add(dot);
      var c = card(T, { words: words, img: point.img }, i, { w: 3.4, h: 2.1, d: 0.05, size: 76, most: 4 }); w.scene.add(c);
      var tag = null;
      if (when) {
        tag = new T.Mesh(new T.PlaneGeometry(2.6, 0.54), new T.MeshBasicMaterial({ map: face(T, when, { w: 520, h: 108, bg: 'transparent', fg: '#C1CAC5', size: 60, most: 1, pad: 0.02, weight: 500 }), transparent: true, toneMapped: false, depthWrite: false }));
        tag.position.set(x, 0.32, 1.25); w.scene.add(tag);
      }
      items.push(piece(function (p) {
        c.material[4].color.setScalar(i < beat - 1 ? 0.78 : 1);
        var d = easeOut(clamp(p / 0.5)), r = easeOut(clamp((p - 0.35) / 0.65));
        dot.visible = p > 0; dot.position.set(x, 0.1 + (1 - d) * 3, 0.6);
        c.visible = r > 0; c.scale.set(1, Math.max(0.001, r), 1); c.position.set(x, 0.25 + 1.05 * r + 0.3, 0.1);
        if (tag) tag.visible = d > 0.5;
      }));
      xs.push(x);
    });
    var cam = rig(T, w.camera, [0, 3.4, 11], [0, 1.5, 0]);
    return kind(w, items, function (b, now) {
      beat = b; upto(items, b);
      var x = n <= 3 ? 0 : xs[Math.max(0, b - 1)] - Math.sign(xs[Math.max(0, b - 1)]) * Math.min(Math.abs(xs[Math.max(0, b - 1)]), gap * 0.5);
      cam.to([x + 1.2, 3.6, n <= 3 ? 17 : 15], [x, 1.3, 0], now);
    }, function (dt, t, still) { return cam.step(dt, still); });
  };

  // Words gather: a swarm of pieces flies together to spell each point, then
  // scatters and gathers again into the next.
  KINDS.gather = function (T, points) {
    var w = world(T), N = 3600, items = [];
    var geo = new T.IcosahedronGeometry(0.052, 0), mat = new T.MeshStandardMaterial({ roughness: 0.5 });
    var mesh = new T.InstancedMesh(geo, mat, N); w.scene.add(mesh);
    var col = new T.Color();
    for (var i = 0; i < N; i++) { col.set(hash(i * 3.1) < 0.9 ? INK : accent(i)); mesh.setColorAt(i, col); }
    function shape(words) {
      var c = document.createElement('canvas'), cw = 1200, ch = 440; c.width = cw; c.height = ch;
      var ctx = c.getContext('2d'), size = 150, set = [];
      for (; size > 40; size -= 6) { ctx.font = '700 ' + size + 'px ' + FONT; set = lines(ctx, words, cw * 0.94); if (set.length <= 3 && set.length * size * 1.1 <= ch * 0.96) break; }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      set.forEach(function (l, k) { ctx.fillText(l, cw / 2, ch / 2 + (k - (set.length - 1) / 2) * size * 1.1); });
      var data = ctx.getImageData(0, 0, cw, ch).data, filled = [];
      for (var y = 0; y < ch; y += 2) for (var x = 0; x < cw; x += 2) if (data[(y * cw + x) * 4 + 3] > 128) filled.push([x, y]);
      var out = [], step = Math.max(1, filled.length / N);
      for (var k = 0; k < N; k++) {
        var f = filled[Math.floor((k * step) % Math.max(1, filled.length))] || [cw / 2, ch / 2];
        out.push(new T.Vector3((f[0] / cw - 0.5) * 11.6 + (hash(k + 5) - 0.5) * 0.03, 2.75 - (f[1] / ch - 0.5) * 4.25, (hash(k + 7) - 0.5) * 0.08));
      }
      return out;
    }
    var shapes = points.map(function (p) { return shape(p.words); });
    var rest = [];
    for (var r = 0; r < N; r++) rest.push(new T.Vector3((hash(r + 1) - 0.5) * 16, 0.05 + hash(r + 2) * 0.1, (hash(r + 3) - 0.5) * 6));
    var from = rest.map(function (v) { return v.clone(); }), to = rest, now = rest.map(function (v) { return v.clone(); });
    var prog = { p: 1 }, dummy = new T.Object3D();
    function draw(t, still) {
      for (var i = 0; i < N; i++) {
        var d = hash(i + 0.5) * 0.35, q = clamp((prog.p - d) / (1 - 0.35)), e = easeInOut(q);
        now[i].lerpVectors(from[i], to[i], e);
        var lift = Math.sin(q * Math.PI) * (1.2 + hash(i + 4) * 1.6);
        dummy.position.set(now[i].x + Math.sin(q * Math.PI) * (hash(i + 9) - 0.5) * 2, now[i].y + lift + (still ? 0 : Math.sin(t * 1.4 + i) * 0.012), now[i].z + Math.sin(q * Math.PI) * 1.4);
        dummy.rotation.set(i + t * (q < 1 ? 3 : 0.3), i * 2.1, 0);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    w.camera.position.set(0, 3.6, 15.5);
    w.camera.lookAt(0, 2.7, 0);
    var at = -1;
    return {
      scene: w.scene, camera: w.camera,
      set: function (b, quick) {
        var goal = b > 0 ? shapes[b - 1] : rest;
        if (b - 1 === at) return;
        at = b - 1;
        for (var i = 0; i < N; i++) from[i].copy(quick ? goal[i] : now[i]);
        to = goal; prog.p = quick ? 1 : 0;
      },
      update: function (dt, t, still) {
        prog.p = still ? 1 : Math.min(1, prog.p + dt / 1.5);
        draw(t, still);
        return !still;
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
    var el = document.createElement('div'); el.className = 'kinetic';
    var frame = document.createElement('div'); frame.className = 'kinetic-frame';
    var still = document.createElement('div'); still.className = 'kinetic-still';
    var canvas = document.createElement('canvas'); canvas.className = 'kinetic-canvas'; canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    var said = document.createElement('p'); said.className = 'visually-hidden'; said.setAttribute('aria-live', 'polite');
    var top = document.createElement('div'); top.className = 'kinetic-top'; top.setAttribute('aria-hidden', 'true');
    frame.appendChild(still); frame.appendChild(canvas); frame.appendChild(top); el.appendChild(frame); el.appendChild(said);
    var st = { el: el, frame: frame, still: still, top: top, canvas: canvas, said: said, renderer: null, kind: null, key: null, want: null, raf: 0, broken: false, last: 0 };
    st.fit = function () {
      var r = box.getBoundingClientRect(), fw = Math.min(r.width, r.height * W / H), fh = fw * H / W;
      if (!fw) return;
      frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
      if (st.renderer) { st.renderer.setSize(fw, fh, false); if (st.kind) draw(st, 0); }
    };
    if (window.ResizeObserver) { st.watch = new ResizeObserver(st.fit); st.watch.observe(box); }
    window.addEventListener('resize', st.fit);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) run(st); });
    canvas.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); st.broken = true; canvas.hidden = true; st.still.innerHTML = st.svg || ''; });
    box.__kinetic = st;
    return st;
  }

  function draw(st, dt) {
    var busy = st.kind.update(dt, performance.now() / 1000, calm());
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

  function apply(st, T, imgs) {
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
      } catch (e) { console.log('[kinetic] no 3D here: ' + (e && e.message)); st.broken = true; st.still.innerHTML = st.svg || ''; return; }
      st.fit();
    }
    if (st.key !== want.key) {
      if (st.kind) dispose(st.kind.scene);
      var points = want.m.points.map(function (p, i) { return { words: p.words, img: imgs[i] || null }; });
      try { st.kind = (KINDS[want.m.kind] || KINDS.stack)(T, points); }
      catch (e) { console.log('[kinetic] the ' + want.m.kind + ' slide did not build: ' + (e && e.message)); st.kind = null; st.key = null; st.broken = true; st.still.innerHTML = st.svg || ''; return; }
      st.key = want.key;
      st.kind.set(Math.max(0, want.beat - 1), true);
      st.kind.update(0, 0, true);
    }
    st.kind.set(want.beat, false);
    st.said.textContent = want.m.points[want.beat - 1] ? want.m.points[want.beat - 1].words : '';
    st.canvas.hidden = false;
    run(st);
  }

  function show(box, text, at, shown, svg) {
    var m = L.kineticAt(text, at);
    if (!m || !m.points.length || !canMove() || (box.__kinetic && box.__kinetic.broken)) { clear(box); return false; }
    var st = box.__kinetic || make(box);
    if (box.firstChild !== st.el || box.childNodes.length !== 1) box.replaceChildren(st.el);
    st.svg = svg || '';
    st.still.innerHTML = headline(text, at, m) || st.svg;
    st.top.innerHTML = words(st.still);
    st.fit();
    var beat = shown && shown !== Infinity ? Math.min(shown, m.points.length) : m.points.length;
    st.want = { key: m.kind + '\n' + m.points.map(function (p) { return p.words + (p.picture ? ' ' + p.picture.url : ''); }).join('\n'), m: m, beat: beat };
    var imgs = Promise.all(m.points.map(function (p) { return p.picture ? picture(p.picture.url) : null; }));
    Promise.all([three(), fonts(), imgs]).then(function (r) { if (box.__kinetic === st && st.el.isConnected) apply(st, r[0], r[2]); })
      .catch(function (e) { console.log('[kinetic] three.js did not load: ' + (e && e.message)); st.broken = true; st.still.innerHTML = st.svg; });
    return true;
  }
  // The slide's paper and headline, drawn by the deck kit from the slide with
  // its points taken out, so the headline sits where every other slide's does.
  function headline(text, at, m) {
    var K = L.kit(window.DeckKit);
    if (!K) return '';
    try {
      var slides = L.split(L.still(text).slice(L.HEAD.length)), lines = slides[at] || [];
      var only = lines.filter(function (l) { return /^#{1,2}\s/.test(l); });
      return K.render(L.HEAD + (only[0] || '## ' + m.title) + '\n\n' + '​' + '\n')[0] || '';
    } catch (e) { return ''; }
  }
  // The headline's words alone, laid over the 3D with a rim of the paper's
  // color, so a tall piece passing behind never hides them.
  function words(still) {
    var svg = still.querySelector('svg');
    if (!svg) return '';
    var copy = svg.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll('rect, path, circle, ellipse, line, polyline, polygon, image, use'), function (n) { n.remove(); });
    Array.prototype.forEach.call(copy.querySelectorAll('text'), function (t) { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', PAPER); t.setAttribute('stroke-width', '7'); t.setAttribute('stroke-linejoin', 'round'); });
    return copy.outerHTML;
  }
  function clear(box) {
    var st = box && box.__kinetic;
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
    var st = box && box.__kinetic;
    if (!st) return;
    clear(box);
    if (st.renderer) { st.renderer.dispose(); st.renderer.forceContextLoss(); st.renderer = null; }
    if (st.watch) st.watch.disconnect();
    window.removeEventListener('resize', st.fit);
    box.__kinetic = null;
  }

  window.KineticKit = { show: show, clear: clear, drop: drop, canMove: canMove, KINDS: Object.keys(KINDS) };
})();
