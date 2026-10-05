// Pages on the board (R13, research/notes/active-learning-notes.md): a
// PDF's pages or images, placed on a scene's board as pictures the class
// can draw on, zoom into, and work on together. The board's scene holds
// only each picture's name; the picture itself is in the private storage
// bucket 'board-files' (migration 20261005030000), at
// '<cohort id>/<board id>/<file>'. Tested in tools/test/board-pages-lib.test.mjs.
(function (root) {
  var BUCKET = 'board-files';
  var MAX_PAGES = 30;               // pages added at once
  var MAX_BYTES = 25 * 1024 * 1024; // a PDF or image to read
  var PAGE_WIDTH = 1200;            // how wide a page is laid on the board
  var GAP = 60;
  var IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  // What a chosen file is: a PDF to split into pages, a picture to place,
  // or neither (with the reason, in words).
  function kindOf(file) {
    var type = String(file && file.type || '').toLowerCase();
    var name = String(file && file.name || '').toLowerCase();
    var size = Number(file && file.size) || 0;
    if (size > MAX_BYTES) return { kind: null, why: 'is larger than 25 MB' };
    if (type === 'application/pdf' || /\.pdf$/.test(name)) return { kind: 'pdf' };
    if (IMAGE_TYPES.indexOf(type) >= 0 || /\.(png|jpe?g|webp|gif)$/.test(name)) return { kind: 'image' };
    if (/\.(pptx?|key|odp)$/.test(name)) return { kind: null, why: 'is a slide deck; export it as a PDF first (File, then Download, then PDF in Google Slides; File, then Export in PowerPoint or Keynote)' };
    return { kind: null, why: 'is not a PDF or a picture' };
  }

  // A file's path in the bucket, and the name the board's scene keeps
  // for it (Excalidraw's fileId), which carries the path.
  function slugName(name) {
    return String(name || 'page').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page';
  }
  function pathFor(cohortId, boardId, name, n, stamp, ext) {
    return cohortId + '/' + boardId + '/' + stamp + '-' + slugName(name) + '-' + n + '.' + (ext || 'jpg');
  }
  function fileIdOf(path) { return 'hs:' + path; }
  function pathOf(fileId) {
    var s = String(fileId || '');
    if (s.indexOf('hs:') !== 0) return null;
    var p = s.slice(3);
    return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[a-z0-9-]+\.(jpg|png|webp|gif)$/.test(p) ? p : null;
  }

  // The pictures on a board that this page does not have yet.
  function missingFiles(elements, have) {
    var out = [], seen = {};
    (elements || []).forEach(function (e) {
      if (!e || e.isDeleted || e.type !== 'image' || !e.fileId) return;
      var p = pathOf(e.fileId);
      if (p && !(have && have[e.fileId]) && !seen[e.fileId]) { seen[e.fileId] = true; out.push({ fileId: e.fileId, path: p }); }
    });
    return out;
  }

  // Where new pages go: one under another, below whatever is already on
  // the board, each PAGE_WIDTH wide at its own shape.
  function layout(elements, sizes) {
    var live = (elements || []).filter(function (e) { return e && !e.isDeleted; });
    var top = live.length ? Math.max.apply(null, live.map(function (e) { return (e.y || 0) + (e.height || 0); })) + GAP * 2 : 0;
    var left = live.length ? Math.min.apply(null, live.map(function (e) { return e.x || 0; })) : 0;
    var y = top;
    return (sizes || []).map(function (s) {
      var h = s.width > 0 ? Math.round(PAGE_WIDTH * s.height / s.width) : PAGE_WIDTH;
      var at = { x: left, y: y, width: PAGE_WIDTH, height: h };
      y += h + GAP;
      return at;
    });
  }

  // An image element for Excalidraw, locked so drawing on it never moves it.
  function pageElement(id, fileId, at, n, now) {
    return {
      id: id, type: 'image', fileId: fileId, status: 'saved', scale: [1, 1],
      x: at.x, y: at.y, width: at.width, height: at.height, angle: 0,
      strokeColor: 'transparent', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null,
      seed: 7000 + n, version: 1, versionNonce: 9000 + n, isDeleted: false, boundElements: null, updated: now || 0,
      link: null, locked: true
    };
  }

  // A teacher's library: a folder in a GitHub repository, written as
  // owner/repo/folder or pasted as its github.com address.
  function libraryOf(text) {
    var t = String(text || '').trim().replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/+$/, '');
    var m = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\/tree\/([^/]{1,100}))?(?:\/(.{0,300}))?$/.exec(t);
    if (!m || /\.\./.test(t)) return null;
    var path = (m[4] || '').replace(/^\/+/, '');
    var api = 'https://api.github.com/repos/' + m[1] + '/' + m[2] + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    return { owner: m[1], repo: m[2], ref: m[3] || null, path: path, api: api + (m[3] ? '?ref=' + encodeURIComponent(m[3]) : '') };
  }
  // The files in a library folder this board can place, from GitHub's
  // contents listing.
  function libraryFiles(listing) {
    return (Array.isArray(listing) ? listing : []).filter(function (f) {
      return f && f.type === 'file' && /^https:\/\/raw\.githubusercontent\.com\//.test(f.download_url || '') && kindOf({ name: f.name, size: f.size }).kind;
    }).map(function (f) { return { name: String(f.name), url: f.download_url, size: Number(f.size) || 0, kind: kindOf({ name: f.name }).kind }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  var lib = {
    BUCKET: BUCKET, MAX_PAGES: MAX_PAGES, MAX_BYTES: MAX_BYTES, PAGE_WIDTH: PAGE_WIDTH,
    kindOf: kindOf, pathFor: pathFor, fileIdOf: fileIdOf, pathOf: pathOf, missingFiles: missingFiles,
    layout: layout, pageElement: pageElement, libraryOf: libraryOf, libraryFiles: libraryFiles
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BoardPagesLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
