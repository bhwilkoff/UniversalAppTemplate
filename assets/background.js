// A cohort's own background for Meet (C9 in
// research/notes/meet-classroom-design.md): one of the brand kit's
// backgrounds (tools/mark/make_backgrounds.py) with the cohort's name set
// under the wordmark, drawn in this browser and saved as a file. The name
// stays in the upper left, out of the middle where Meet puts the person.
(function (root) {
  var W = 1920, H = 1080;
  var LOOKS = {
    paper: { src: '/assets/brand/backgrounds/paper.png', ink: '#585C62' },
    evening: { src: '/assets/brand/backgrounds/evening.png', ink: '#A7ABB0' }
  };

  // The name in at most two lines of the given width, the second cut short.
  function lines(ctx, text, width) {
    var words = String(text || '').trim().split(/\s+/), out = [], line = '';
    words.forEach(function (w) {
      var next = line ? line + ' ' + w : w;
      if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
    });
    if (line) out.push(line);
    if (out.length > 2) {
      var second = out.slice(1).join(' ');
      while (second.length > 1 && ctx.measureText(second + '\u2026').width > width) second = second.slice(0, -1);
      out = [out[0], second.trim() + '\u2026'];
    }
    return out;
  }

  // Resolves to a PNG Blob of the background with the title on it.
  function make(title, look) {
    var L = LOOKS[look] || LOOKS.evening;
    var img = new Image();
    var loaded = new Promise(function (ok, no) { img.onload = ok; img.onerror = function () { no(new Error('The background did not load.')); }; });
    img.src = L.src;
    var font = '600 44px Commissioner, system-ui, sans-serif';
    var fonts = document.fonts && document.fonts.load ? document.fonts.load(font).catch(function () {}) : Promise.resolve();
    return Promise.all([loaded, fonts]).then(function () {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      ctx.font = font; ctx.fillStyle = L.ink; ctx.textBaseline = 'alphabetic';
      lines(ctx, title, 500).forEach(function (t, i) { ctx.fillText(t, 98, 222 + i * 56); });
      return new Promise(function (ok, no) { c.toBlob(function (b) { b ? ok(b) : no(new Error('The background could not be drawn.')); }, 'image/png'); });
    });
  }

  function fileName(title, look) {
    var slug = String(title || 'cohort').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'cohort';
    return 'human-shaped-' + slug + '-' + (LOOKS[look] ? look : 'evening') + '.png';
  }

  // Draws, then hands the file to the browser to save.
  function save(title, look) {
    return make(title, look).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = fileName(title, look);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    });
  }

  root.CohortBackground = { make: make, save: save, fileName: fileName };
})(typeof globalThis !== 'undefined' ? globalThis : this);
