// Drawing together in an open room (/board/room/, framed by each person's
// main stage, addon-stage.js): an Excalidraw canvas with no account and no
// database. What changes goes to the stage around it by postMessage, and the
// stage carries it through the call's room (tools/rooms, 'strokes'); what
// others drew comes back the same way and merges with Excalidraw's own
// reconcileElements. The drawing lives in the room and is erased when the
// call ends; anyone can save it as a picture or a file from the menu.
(function () {
  var mount = document.querySelector('[data-board-room]');
  if (!mount || window.parent === window) return;
  var VENDOR = '/assets/vendor/excalidraw-0.18.1/excalidraw.js?v=20261124f';
  window.EXCALIDRAW_ASSET_PATH = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.18.1/dist/prod/';
  var MAX_ELEMENTS = 150, MAX_BYTES = 120000, EVERY = 300;
  var X = null, api = null, seen = {}, waiting = [], timer = null, last = -1;
  // Everyone else's pointer, as Excalidraw's collaborators; one unheard from
  // for five seconds is taken away. This page's own is sent at most every
  // 150 ms.
  var others = new Map(), seenAt = {}, lastPointer = 0;
  function showOthers() { if (api) api.updateScene({ collaborators: new Map(others) }); }
  setInterval(function () {
    var now = Date.now(), gone = false;
    others.forEach(function (v, k) { if (now - (seenAt[k] || 0) > 5000) { others.delete(k); gone = true; } });
    if (gone) showOthers();
  }, 2000);
  function onPointer(e) {
    var now = Date.now();
    if (!e || !e.pointer || now - lastPointer < 150) return;
    lastPointer = now;
    post({ t: 'pointer', elements: [], p: { x: e.pointer.x, y: e.pointer.y, down: e.button === 'down' } });
  }

  function post(m) { window.parent.postMessage(Object.assign({ hsDraw: true }, m), location.origin); }
  function markSeen(list) { list.forEach(function (e) { if (e && e.id && !(seen[e.id] >= e.version)) seen[e.id] = e.version; }); }
  // Pictures need a place to keep their files, which a room does not have.
  function unsent() {
    return api.getSceneElementsIncludingDeleted().filter(function (e) { return e.type !== 'image' && !(seen[e.id] >= e.version); });
  }
  function send() {
    timer = null;
    if (!api) return;
    var all = unsent(), chunk = [], size = 0;
    for (var i = 0; i < all.length && chunk.length < MAX_ELEMENTS; i++) {
      var n = JSON.stringify(all[i]).length;
      if (n > 60000) { seen[all[i].id] = all[i].version; continue; }
      if (chunk.length && size + n > MAX_BYTES) break;
      chunk.push(all[i]); size += n;
    }
    if (chunk.length) { markSeen(chunk); post({ t: 'strokes', elements: chunk }); }
    if (all.length > chunk.length) timer = setTimeout(send, EVERY);
  }
  function onChange(elements) {
    var v = X.getSceneVersion(elements);
    if (v === last) return;
    last = v;
    if (!timer) timer = setTimeout(send, EVERY);
  }
  // An element whose ordering key is not one Excalidraw could have made
  // ("b2" from a test script, found in a real call) makes it throw and draw
  // nothing; such a key is dropped so Excalidraw gives the element a new one.
  var B62 = /^[0-9A-Za-z]+$/;
  function okIndex(k) {
    if (typeof k !== 'string' || !k || !B62.test(k)) return false;
    var c = k.charCodeAt(0), n = c >= 97 && c <= 122 ? c - 97 + 2 : c >= 65 && c <= 90 ? 90 - c + 2 : 0;
    return n > 0 && k.length >= n && k.charAt(k.length - 1) !== '0';
  }
  function clean(list) { return list.map(function (e) { return e && e.index != null && !okIndex(e.index) ? Object.assign({}, e, { index: null }) : e; }); }
  function apply(remote, whole) {
    if (!api) { waiting.push([remote, whole]); return; }
    if (whole && !remote.length) {
      seen = {}; last = -1;
      api.updateScene({ elements: [], captureUpdate: X.CaptureUpdateAction.NEVER });
      return;
    }
    remote = clean(remote);
    markSeen(remote);
    var merged;
    try { merged = X.reconcileElements(api.getSceneElementsIncludingDeleted(), X.restoreElements(remote, null), api.getAppState()); }
    catch (e) {
      // One more try with every incoming key dropped, rather than nothing drawn.
      merged = X.reconcileElements(api.getSceneElementsIncludingDeleted(), X.restoreElements(remote.map(function (x) { return Object.assign({}, x, { index: null }); }), null), api.getAppState());
    }
    last = X.getSceneVersion(merged);
    api.updateScene({ elements: merged, captureUpdate: X.CaptureUpdateAction.NEVER });
    if (whole) setTimeout(function () { if (api.scrollToContent) api.scrollToContent(undefined, { fitToContent: true }); }, 50);
    if (unsent().length && !timer) timer = setTimeout(send, EVERY);
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (e.origin !== location.origin || e.source !== window.parent || !d || !d.hsDraw || !Array.isArray(d.elements)) return;
    if (d.t === 'strokes') apply(d.elements, false);
    if (d.t === 'drawing') apply(d.elements, true);
    if (d.t === 'pointer' && d.p && typeof d.p.id === 'string') {
      others.set(d.p.id, { pointer: { x: d.p.x, y: d.p.y, tool: 'pointer' }, button: d.p.down ? 'down' : 'up', username: d.p.name || '' });
      seenAt[d.p.id] = Date.now();
      showOthers();
    }
  });

  function theme() { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  import(VENDOR).then(function (lib) {
    X = lib;
    var root = X.createRoot(mount);
    root.render(X.createElement(X.Excalidraw, {
      excalidrawAPI: function (a) {
        if (api || !a) return;
        api = a;
        var w = waiting; waiting = [];
        w.forEach(function (x) { apply(x[0], x[1]); });
        post({ t: 'ready' });
      },
      onChange: onChange,
      onPointerUpdate: onPointer,
      isCollaborating: true,
      aiEnabled: false,
      theme: theme(),
      langCode: 'en',
      initialData: { appState: { viewBackgroundColor: '#ffffff' } },
      UIOptions: {
        tools: { image: false },
        canvasActions: { loadScene: false, clearCanvas: false, saveToActiveFile: false, toggleTheme: true, changeViewBackgroundColor: false, export: { saveFileToDisk: true }, saveAsImage: true }
      }
    }));
  }, function () {
    mount.textContent = 'The drawing tools did not load. Check the connection and try again.';
  });
})();
