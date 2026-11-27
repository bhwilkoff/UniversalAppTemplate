// Pictures a deck owns (DECISIONS.md, "A deck owns its pictures"). Each lives
// in the private storage bucket 'deck-pictures' at
// '<cohort id>/<scene id>/<name>', and the deck's text names it
// ![words](pic:<name>). Only a page that is signed in can make links to one,
// so it makes them here, for twelve hours, and hands them to SlidesLib; a
// stage that is not signed in is handed the same links by its panel.
// Removing a picture from a deck, or the part itself, deletes the file the
// next time tidy() runs. Tested in tools/test/deck-pictures.test.mjs.
(function (root) {
  var BUCKET = 'deck-pictures';
  var HOURS = 12;
  var LONGEST = 2000;          // the longest side kept, in pixels
  var QUALITY = 0.85;
  var MAX_BYTES = 5 * 1024 * 1024;
  var RECENT_MS = 10 * 60 * 1000; // a file this new may belong to a deck not yet saved
  var TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  var signed = {}; // name -> { url, until }

  function folder(cohortId, sceneId) { return cohortId + '/' + sceneId; }
  function newName(ext) {
    var id = (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/[^a-f0-9]/g, '');
    return id.slice(0, 16) + '.' + ext;
  }

  // The names in a folder's listing that the deck no longer uses and that are
  // old enough to be sure of it.
  function unused(listing, text, now) {
    var L = root.SlidesLib, used = L ? L.picNames(text) : [];
    return (listing || []).filter(function (f) {
      if (!f || !f.name || !f.id) return false;
      if (used.indexOf(f.name) >= 0) return false;
      var made = Date.parse(f.created_at || '');
      return !(made && now - made < RECENT_MS);
    }).map(function (f) { return f.name; });
  }

  // Links for every picture the deck names, made in one request; true when a
  // new link arrived, so the caller draws again.
  function prepare(db, cohortId, sceneId, text) {
    var L = root.SlidesLib;
    if (!db || !db.storage || !L || !cohortId || !sceneId) return Promise.resolve(false);
    var now = Date.now();
    var want = L.picNames(text).filter(function (n) { var s = signed[n]; return !s || s.until - now < 30 * 60 * 1000; });
    if (!want.length) return Promise.resolve(false);
    var dir = folder(cohortId, sceneId);
    return db.storage.from(BUCKET).createSignedUrls(want.map(function (n) { return dir + '/' + n; }), HOURS * 3600).then(function (r) {
      if (r.error) { console.log('[deck-pictures] no links: ' + r.error.message); return false; }
      var map = {};
      (r.data || []).forEach(function (x, i) {
        if (!x || !x.signedUrl || x.error) return;
        var name = want[i];
        signed[name] = { url: x.signedUrl, until: now + HOURS * 3600 * 1000 };
        map[name] = x.signedUrl;
      });
      L.usePictures(map);
      return Object.keys(map).length > 0;
    }, function (e) { console.log('[deck-pictures] no links: ' + (e && e.message)); return false; });
  }

  // A chosen file, made no larger than the stage needs and saved as WebP when
  // that is smaller; resolves to { blob, ext }.
  function shrink(file) {
    if (!root.createImageBitmap || !root.document) return Promise.resolve({ blob: file, ext: extOf(file.type) });
    return root.createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, LONGEST / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      var c = root.document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return new Promise(function (ok) { c.toBlob(ok, 'image/webp', QUALITY); }).then(function (blob) {
        if (blob && blob.type === 'image/webp' && (blob.size < file.size || scale < 1)) return { blob: blob, ext: 'webp' };
        return { blob: file, ext: extOf(file.type) };
      });
    }, function () { return { blob: file, ext: extOf(file.type) }; });
  }
  function extOf(type) { return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'; }
  function typeOf(ext) { return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'; }

  // A picture for one deck: stored in its folder, and its link made at once so
  // the editor shows it. Resolves to 'pic:<name>'.
  function upload(db, cohortId, sceneId, file) {
    if (!file || TYPES.indexOf(file.type) < 0) return Promise.reject(new Error('choose a PNG, JPEG, or WebP picture'));
    return shrink(file).then(function (s) {
      if (s.blob.size > MAX_BYTES) throw new Error('choose a picture under 5 MB');
      var name = newName(s.ext), path = folder(cohortId, sceneId) + '/' + name;
      return db.auth.getSession().then(function () {
        return db.storage.from(BUCKET).upload(path, s.blob, { contentType: typeOf(s.ext), cacheControl: '31536000' });
      }).then(function (r) {
        if (r.error) throw r.error;
        return prepare(db, cohortId, sceneId, '![](pic:' + name + ')').then(function () { return 'pic:' + name; });
      });
    });
  }

  // Deletes what a deck no longer uses, and the folder of any part that is
  // gone. Runs when a leader opens or leaves a deck, never mid-edit, so undo
  // never reaches for a file that was deleted.
  function tidy(db, cohortId, sceneId, text) {
    if (!db || !db.storage || !cohortId) return Promise.resolve(0);
    var store = db.storage.from(BUCKET), now = Date.now(), gone = 0;
    var mine = !sceneId ? Promise.resolve() : store.list(folder(cohortId, sceneId), { limit: 1000 }).then(function (l) {
      var names = unused(l && l.data, text, now).map(function (n) { return folder(cohortId, sceneId) + '/' + n; });
      if (!names.length) return;
      return store.remove(names).then(function (r) { if (!r.error) gone += names.length; });
    });
    var parts = Promise.all([store.list(cohortId, { limit: 1000 }), db.from('scenes').select('id').eq('cohort_id', cohortId)]).then(function (r) {
      var dirs = ((r[0] && r[0].data) || []).filter(function (f) { return f && !f.id; }).map(function (f) { return f.name; });
      if (r[1].error) return;
      var live = (r[1].data || []).map(function (x) { return x.id; });
      return Promise.all(dirs.filter(function (d) { return live.indexOf(d) < 0; }).map(function (d) {
        return forget(db, cohortId, d).then(function (n) { gone += n; });
      }));
    });
    return Promise.all([mine, parts]).then(function () { return gone; }, function (e) { console.log('[deck-pictures] tidy: ' + (e && e.message)); return gone; });
  }

  // Every picture of one part, as it is removed.
  function forget(db, cohortId, sceneId) {
    if (!db || !db.storage) return Promise.resolve(0);
    var store = db.storage.from(BUCKET), dir = folder(cohortId, sceneId);
    return store.list(dir, { limit: 1000 }).then(function (l) {
      var names = ((l && l.data) || []).filter(function (f) { return f && f.id; }).map(function (f) { return dir + '/' + f.name; });
      if (!names.length) return 0;
      return store.remove(names).then(function (r) { return r.error ? 0 : names.length; });
    });
  }

  // Every picture of a cohort, before the cohort itself is deleted: once it
  // is gone, nobody teaches it, so nobody could remove them after.
  function forgetCohort(db, cohortId) {
    if (!db || !db.storage || !cohortId) return Promise.resolve(0);
    return db.storage.from(BUCKET).list(cohortId, { limit: 1000 }).then(function (l) {
      var dirs = ((l && l.data) || []).filter(function (f) { return f && !f.id; }).map(function (f) { return f.name; });
      return Promise.all(dirs.map(function (d) { return forget(db, cohortId, d); }));
    }).then(function (ns) { return (ns || []).reduce(function (a, b) { return a + b; }, 0); }, function () { return 0; });
  }

  var api = { BUCKET: BUCKET, prepare: prepare, upload: upload, tidy: tidy, forget: forget, forgetCohort: forgetCohort, unused: unused, shrink: shrink };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DeckPictures = api;
})(typeof window !== 'undefined' ? window : globalThis);
