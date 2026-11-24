// What Excalidraw can do that needs this site behind it: pictures anyone can
// paste or drop (kept in the board's own storage), websites and videos on the
// canvas, links to other things on the board, a person's own library of
// shapes, and a saved board opened again. board.js calls BoardTools.start(o)
// once Excalidraw has loaded; pure rules are in BoardLib.
(function () {
  var B = window.BoardLib, P = window.BoardPagesLib;
  if (!B || !P) return;

  function dataUrlBlob(url) { return fetch(url).then(function (r) { return r.blob(); }); }
  // Storage keeps png, jpeg, webp, and gif. Anything else Excalidraw can show
  // (an SVG, say) is kept as the picture it draws.
  var KEPT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  function drawnPng(url) {
    return new Promise(function (yes, no) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || 800, h = img.naturalHeight || 600, s = Math.min(2000 / w, 2000 / h, Math.max(1, 1000 / w));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { return b ? yes(b) : no(new Error('the picture could not be read')); }, 'image/png');
      };
      img.onerror = function () { no(new Error('the picture could not be read')); };
      img.src = url;
    });
  }

  // Inside Meet's frame a download never starts and the clipboard refuses, with
  // no word to anyone (measured in a real call, November 24, 2026). A window the
  // board opens is not in that frame, so saving and copying happen there. It
  // has to open on the press itself, before the file is ready.
  function inFrame() { try { return window.top !== window.self && window.top.location.origin !== location.origin; } catch (e) { return true; } }
  function handOff(o) {
    var w = window.open('/board/save/', '_blank', 'popup,width=560,height=600');
    if (!w) return Promise.reject(new Error('the browser did not let a window open to save it in'));
    return new Promise(function (yes, no) {
      var timer = setTimeout(function () { done(); no(new Error('the window to save it in did not answer')); }, 20000);
      function done() { clearTimeout(timer); window.removeEventListener('message', hear); }
      function hear(e) {
        if (e.source !== w || e.origin !== location.origin || !e.data || !e.data.hsSaveReady) return;
        done();
        Promise.resolve(o.blob).then(function (blob) { w.postMessage({ hsSave: { blob: blob, name: o.name, copy: !!o.copy } }, location.origin); yes(); }, no);
      }
      window.addEventListener('message', hear);
    });
  }
  function outOfFrame(say) {
    if (!inFrame()) return;
    var click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (!this.download || !/^(blob|data):/.test(this.href)) return click.call(this);
      handOff({ name: this.download, blob: dataUrlBlob(this.href) }).catch(function (e) { say('Not saved: ' + e.message + '. Open the board in its own tab to save it.'); });
    };
    var clip = navigator.clipboard;
    if (clip && clip.write) {
      var write = clip.write.bind(clip);
      clip.write = function (items) {
        return write(items).catch(function (e) {
          var it = items && items[0];
          if (!it || it.types.indexOf('image/png') < 0) throw e;
          return handOff({ name: 'board.png', blob: it.getType('image/png'), copy: true });
        });
      };
    }
  }

  // o: { db, X, api(), board(), cohort, session, me, canDraw(), say(text), changed(), stage }
  function start(o) {
    outOfFrame(function (t) { var api = o.api(); if (api) api.setToast({ message: t, closable: true, duration: 9000 }); });
    var X = o.X, store = o.db.storage ? o.db.storage.from(P.BUCKET) : null;

    // ---------------- pictures ----------------
    // A picture goes to the others only once it is kept, so nobody is sent a
    // frame with nothing in it. state: 'saving' | 'kept' | 'failed'
    var files = {}, n = 0;
    function idFor(file) {
      n += 1;
      var id = P.fileIdOf(P.pathFor(o.cohort.id, o.board().id, file.name || 'picture', n, Date.now(), KEPT[file.type] || 'png'));
      files[id] = 'saving';
      return id;
    }
    function waiting(e) { return !!e && e.type === 'image' && !e.isDeleted && (!e.fileId || files[e.fileId] === 'saving' || files[e.fileId] === 'failed'); }
    function keep(id, f, tries) {
      var path = P.pathOf(id);
      if (!path || !store) return;
      (KEPT[f.mimeType] ? dataUrlBlob(f.dataURL) : drawnPng(f.dataURL)).then(function (blob) {
        return store.upload(path, blob, { contentType: KEPT[blob.type] ? blob.type : 'image/png', upsert: false }).then(function (r) {
          if (r.error && !/exists/i.test(r.error.message || '')) throw r.error;
          files[id] = 'kept';
          o.changed();
        });
      }).catch(function (e) {
        if (tries < 2) return setTimeout(function () { keep(id, f, tries + 1); }, 1500 * (tries + 1));
        files[id] = 'failed';
        var api = o.api();
        api.updateScene({ elements: api.getSceneElementsIncludingDeleted().map(function (x) {
          return x.fileId === id && !x.isDeleted ? Object.assign({}, x, { isDeleted: true, version: x.version + 1, versionNonce: Math.floor(Math.random() * 1e9), updated: Date.now() }) : x;
        }), captureUpdate: X.CaptureUpdateAction.NEVER });
        api.setToast({ message: 'The picture could not be kept' + (e && e.message ? ': ' + e.message : '') + '.', closable: true, duration: 8000 });
      });
    }
    var started = {};
    function onFiles(all) {
      Object.keys(all || {}).forEach(function (id) {
        if (files[id] !== 'saving' || started[id] || !all[id].dataURL) return;
        started[id] = true;
        keep(id, all[id], 0);
      });
    }

    // ---------------- websites, videos, links ----------------
    function mayEmbed(link) { return B.embeddable(link, location.hostname); }
    // A page gets the same sandbox a learner's app has on the stage, keeping
    // its own origin, so it can hold on to what people do in it.
    function embed(el) {
      if (!B.embedOwn(el.link, location.hostname)) return null;
      return X.createElement('iframe', { className: 'excalidraw__embeddable', src: el.link, title: 'A page on the board', referrerPolicy: 'no-referrer',
        allow: 'clipboard-write; fullscreen', sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads' });
    }
    function linkFor(id) {
      return location.origin + B.link(o.cohort.slug, o.session, o.groupId, false, null) + '&element=' + encodeURIComponent(id);
    }
    function openLink(el, ev) {
      // Excalidraw opens a link to this site in this frame, which on the stage
      // would replace the board.
      ev.preventDefault();
      var link = X.normalizeLink ? X.normalizeLink(el.link || '') : el.link;
      var id = B.elementOf(link, location.host), api = o.api();
      var there = id ? api.getSceneElements().filter(function (e) { return e.id === id || (e.groupIds || []).indexOf(id) >= 0; }) : [];
      if (there.length) return api.scrollToContent(there, { fitToContent: true, animate: true });
      if (/^(https?:|mailto:)/i.test(link)) window.open(link, '_blank', 'noopener');
    }

    // ---------------- the library ----------------
    var libReady = false, libTimer = null, libText = '[]';
    function loadLibrary() {
      return o.db.from('board_libraries').select('items').eq('user_id', o.me.id).maybeSingle().then(function (r) {
        if (r.error) { console.log('[board] the library was not read: ' + r.error.message); return; }
        var items = (r.data && r.data.items) || [], text = JSON.stringify(items);
        if (libReady && text === libText) return;
        libText = text;
        return o.api().updateLibrary({ libraryItems: items, merge: false, prompt: false }).then(function () { libReady = true; });
      }).then(function () { if (!libReady) libReady = true; });
    }
    function onLibrary(items) {
      if (!libReady) return;
      clearTimeout(libTimer);
      libTimer = setTimeout(function () {
        var text = JSON.stringify(items);
        if (text === libText) return;
        o.db.from('board_libraries').upsert({ user_id: o.me.id, items: items, updated_at: new Date().toISOString() }).then(function (r) {
          if (r.error) return o.api().setToast({ message: 'Your library was not saved: ' + r.error.message, closable: true, duration: 8000 });
          libText = text;
        });
      }, 800);
    }
    // "Add to Excalidraw" on libraries.excalidraw.com comes back here.
    function fromLink() {
      var t = X.parseLibraryTokensFromUrl && X.parseLibraryTokensFromUrl();
      if (!t) return;
      history.replaceState({}, '', location.pathname + location.search);
      if (!B.libraryHost(t.libraryUrl)) return;
      fetch(t.libraryUrl).then(function (r) { if (!r.ok) throw new Error('it answered ' + r.status); return r.blob(); }).then(function (blob) {
        return o.api().updateLibrary({ libraryItems: blob, merge: true, prompt: true, openLibraryMenu: true, defaultStatus: 'published' });
      }).catch(function (e) { if (e && e.name !== 'AbortError') o.api().setToast({ message: 'That library could not be added: ' + (e && e.message || 'no reason given'), closable: true }); });
    }
    window.addEventListener('hashchange', fromLink);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && libReady) loadLibrary(); });

    // ---------------- a saved board, opened again ----------------
    function openFile() {
      var pick = document.createElement('input');
      pick.type = 'file'; pick.accept = '.excalidraw,.excalidrawlib,.json,image/png,image/svg+xml';
      pick.addEventListener('change', function () { if (pick.files[0]) addFile(pick.files[0]); });
      pick.click();
    }
    function addFile(file) {
      var api = o.api();
      return X.loadSceneOrLibraryFromBlob(file, null, null).then(function (got) {
        if (got.type === X.MIME_TYPES.excalidrawlib) return api.updateLibrary({ libraryItems: file, merge: true, openLibraryMenu: true, prompt: false });
        // Beside what is here, under new names, so nothing on the board is
        // replaced; its pictures are kept the way a pasted one is.
        var here = B.drawn(api.getSceneElements()), map = {}, add = [];
        var els = (got.data.elements || []).filter(function (e) { return !e.isDeleted; });
        Object.keys(got.data.files || {}).forEach(function (id) {
          var f = got.data.files[id]; map[id] = idFor({ name: 'picture', type: f.mimeType });
          add.push(Object.assign({}, f, { id: map[id] }));
        });
        var placed = B.beside(els, here, String(Date.now().toString(36)), map);
        api.addFiles(add);
        api.updateScene({ elements: api.getSceneElementsIncludingDeleted().concat(X.restoreElements(placed, null, { repairBindings: true })), captureUpdate: X.CaptureUpdateAction.IMMEDIATELY });
        onFiles(api.getFiles());
        api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.8, animate: true });
      }).catch(function (e) { api.setToast({ message: 'That file could not be opened' + (e && e.message ? ': ' + e.message : '') + '.', closable: true, duration: 8000 }); });
    }

    return {
      props: { generateIdForFile: idFor, validateEmbeddable: mayEmbed, renderEmbeddable: embed, generateLinkForSelection: linkFor, onLinkOpen: openLink,
        onLibraryChange: onLibrary, libraryReturnUrl: location.origin + B.link(o.cohort.slug, o.session, o.groupId, false, null) },
      waiting: waiting, onFiles: onFiles, openFile: openFile, addFile: addFile,
      ready: function () { loadLibrary().then(fromLink, fromLink); }
    };
  }

  window.BoardTools = { start: start };
})();
