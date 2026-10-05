// Pages on the board (R13): add a PDF's pages or pictures to the board,
// from this computer or from a teacher's library folder on GitHub, so the
// class can draw on them, zoom, and work on them together, inside Meet's
// main stage, without anyone sharing a screen. Logic in BoardPagesLib.
//
// board.js calls BoardPages.start({ db, X, api, board, cohort, canDraw,
// teaching, mount, status, onAdded }) once Excalidraw is ready, and the
// returned sync(elements) whenever the scene changes, so pictures someone
// else added are fetched from storage and shown here too.
(function () {
  var P = window.BoardPagesLib;
  if (!P) return;
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var LIB_KEY = 'hs-board-library';

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, onClick) { var b = el('button', 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }

  // pdf.js, loaded the first time a PDF is chosen. Its worker comes from
  // the same address, handed to the browser as this page's own blob,
  // since a worker cannot be loaded from another site directly.
  var pdfReady = null;
  function loadPdfJs() {
    if (pdfReady) return pdfReady;
    pdfReady = new Promise(function (yes, no) {
      var s = document.createElement('script');
      s.src = PDFJS; s.crossOrigin = 'anonymous';
      s.onload = function () {
        fetch(PDFJS_WORKER).then(function (r) { return r.blob(); }).then(function (b) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(b);
          yes(window.pdfjsLib);
        }, no);
      };
      s.onerror = function () { pdfReady = null; no(new Error('pdf.js did not load')); };
      document.head.appendChild(s);
    });
    return pdfReady;
  }

  function toDataUrl(blob) {
    return new Promise(function (yes, no) { var r = new FileReader(); r.onload = function () { yes(r.result); }; r.onerror = no; r.readAsDataURL(blob); });
  }
  function canvasBlob(canvas) {
    return new Promise(function (yes) { canvas.toBlob(function (b) { yes(b); }, 'image/jpeg', 0.85); });
  }

  // Every page of a PDF as a picture about 1600 pixels wide.
  function pdfPages(file, onPage) {
    return loadPdfJs().then(function (pdfjs) {
      return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, P.MAX_PAGES), out = [], i = 1;
      function next() {
        if (i > n) return Promise.resolve({ pages: out, more: doc.numPages - n });
        return doc.getPage(i).then(function (page) {
          var base = page.getViewport({ scale: 1 });
          var vp = page.getViewport({ scale: Math.min(3, 1600 / base.width) });
          var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
          return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return canvasBlob(c); }).then(function (b) {
            out.push({ blob: b, width: c.width, height: c.height });
            if (onPage) onPage(i, n);
            i++;
            return next();
          });
        });
      }
      return next();
    });
  }

  // A picture, made a JPEG no wider than 2000 pixels so it stays small.
  function imagePage(file) {
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, 2000 / bmp.width);
      var c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      return canvasBlob(c).then(function (b) { return { pages: [{ blob: b, width: c.width, height: c.height }], more: 0 }; });
    });
  }

  function start(o) {
    var pending = {}, busy = false;
    var store = o.db && o.db.storage ? o.db.storage.from(P.BUCKET) : null;
    if (!store) { o.mount.hidden = true; return { sync: function () {}, refresh: function () {} }; }

    // Pictures someone else placed, fetched once each.
    function sync(elements) {
      var api = o.api();
      if (!api) return;
      var have = api.getFiles() || {};
      P.missingFiles(elements, have).forEach(function (f) {
        if (pending[f.fileId]) return;
        pending[f.fileId] = true;
        store.download(f.path).then(function (r) {
          if (r.error || !r.data) { pending[f.fileId] = false; return; }
          return toDataUrl(r.data).then(function (url) {
            api.addFiles([{ id: f.fileId, mimeType: r.data.type || 'image/jpeg', dataURL: url, created: Date.now() }]);
          });
        }).catch(function () { pending[f.fileId] = false; });
      });
    }

    // Read, upload, and place one file's pages under everything else.
    function add(file) {
      var k = P.kindOf(file);
      if (!k.kind) { o.status(file.name + ' ' + k.why + '.'); return Promise.resolve(); }
      if (busy) { o.status('Still placing the last pages. Try again in a moment.'); return Promise.resolve(); }
      busy = true;
      o.status('Reading ' + file.name + '…');
      var read = k.kind === 'pdf' ? pdfPages(file, function (i, n) { o.status('Reading ' + file.name + ', page ' + i + ' of ' + n + '…'); }) : imagePage(file);
      var stamp = Date.now();
      return read.then(function (got) {
        var api = o.api(), X = o.X;
        var at = P.layout(api.getSceneElements(), got.pages.map(function (p) { return { width: p.width, height: p.height }; }));
        var placed = [], files = [];
        var uploads = got.pages.map(function (p, i) {
          var path = P.pathFor(o.cohort.id, o.board().id, file.name, i + 1, stamp, 'jpg');
          var fileId = P.fileIdOf(path);
          return store.upload(path, p.blob, { contentType: 'image/jpeg', upsert: false }).then(function (r) {
            if (r.error) throw r.error;
            return toDataUrl(p.blob).then(function (url) {
              files.push({ id: fileId, mimeType: 'image/jpeg', dataURL: url, created: stamp });
              placed.push(P.pageElement('page-' + stamp + '-' + (i + 1), fileId, at[i], i, stamp));
              o.status('Placed ' + placed.length + ' of ' + got.pages.length + '…');
            });
          });
        });
        return Promise.all(uploads).then(function () {
          api.addFiles(files);
          placed.sort(function (a, b) { return a.y - b.y; });
          api.updateScene({ elements: api.getSceneElementsIncludingDeleted().concat(X.restoreElements(placed, null)) });
          api.scrollToContent(api.getSceneElements().filter(function (e) { return placed.some(function (p) { return p.id === e.id; }); }), { fitToViewport: true, viewportZoomFactor: 0.9 });
          o.status('Placed ' + (placed.length === 1 ? 'one page' : placed.length + ' pages') + ' from ' + file.name + (got.more > 0 ? ', the first ' + P.MAX_PAGES + ' of them' : '') + '. Draw on them; zoom with the controls in the corner.');
          if (o.onAdded) o.onAdded();
        });
      }).catch(function (e) {
        o.status('The pages could not be placed: ' + (e && e.message ? e.message : 'something went wrong') + '.');
      }).then(function () { busy = false; });
    }

    // The controls: add from this computer, fit the pages, and, for a
    // teacher, the library folder.
    var box = o.mount;
    box.replaceChildren();
    var pick = el('input'); pick.type = 'file'; pick.accept = '.pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif'; pick.multiple = true; pick.hidden = true;
    pick.addEventListener('change', function () {
      var list = Array.prototype.slice.call(pick.files || []);
      pick.value = '';
      list.reduce(function (p, f) { return p.then(function () { return add(f); }); }, Promise.resolve());
    });
    box.appendChild(pick);
    var addBtn = button('Add a PDF or pictures', function () { pick.click(); });
    box.appendChild(addBtn);
    box.appendChild(button('Fit everything on the board', function () {
      var api = o.api(); if (api) api.scrollToContent(api.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.9 });
    }));

    if (o.teaching) {
      var lib = el('details', 'board-library');
      lib.appendChild(el('summary', null, 'Your library'));
      lib.appendChild(el('p', 'small', 'A folder of PDFs and pictures in a public GitHub repository, such as yourname/teaching/week-1. Slides go in as PDFs.'));
      var row = el('div', 'board-library-row');
      var input = el('input'); input.type = 'text'; input.placeholder = 'owner/repository/folder';
      input.setAttribute('aria-label', 'Your library folder on GitHub');
      try { input.value = localStorage.getItem(LIB_KEY) || ''; } catch (e) {}
      var list = el('ul', 'board-library-files');
      row.appendChild(input);
      row.appendChild(button('Open it', function () {
        var where = P.libraryOf(input.value);
        list.replaceChildren();
        if (!where) { list.appendChild(el('li', 'small', 'That does not look like a GitHub folder. Try owner/repository/folder.')); return; }
        try { localStorage.setItem(LIB_KEY, input.value.trim()); } catch (e) {}
        list.appendChild(el('li', 'small', 'Reading the folder…'));
        fetch(where.api, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('GitHub answered ' + r.status)); }).then(function (json) {
          var files = P.libraryFiles(json);
          list.replaceChildren();
          if (!files.length) list.appendChild(el('li', 'small', 'There are no PDFs or pictures in that folder.'));
          files.forEach(function (f) {
            var li = el('li');
            li.appendChild(button((f.kind === 'pdf' ? 'PDF: ' : 'Picture: ') + f.name, function () {
              o.status('Fetching ' + f.name + '…');
              fetch(f.url).then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error('GitHub answered ' + r.status)); }).then(function (b) {
                return add(new File([b], f.name, { type: b.type || (f.kind === 'pdf' ? 'application/pdf' : '') }));
              }).catch(function (e) { o.status(f.name + ' could not be fetched: ' + e.message + '.'); });
            }));
            list.appendChild(li);
          });
        }).catch(function (e) {
          list.replaceChildren(el('li', 'small', 'The folder could not be read: ' + e.message + '. It needs to be in a public repository.'));
        });
      }));
      lib.appendChild(row);
      lib.appendChild(list);
      box.appendChild(lib);
    }

    function canAdd() {
      var ok = o.canDraw();
      addBtn.disabled = !ok;
      addBtn.title = ok ? '' : 'The board is locked, so only a teacher can add pages.';
    }
    canAdd();
    return { sync: sync, refresh: canAdd };
  }

  window.BoardPages = { start: start };
})();
