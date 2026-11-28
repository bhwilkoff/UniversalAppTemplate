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
  function apply(remote, whole) {
    if (!api) { waiting.push([remote, whole]); return; }
    if (whole && !remote.length) {
      seen = {}; last = -1;
      api.updateScene({ elements: [], captureUpdate: X.CaptureUpdateAction.NEVER });
      return;
    }
    markSeen(remote);
    var merged = X.reconcileElements(api.getSceneElementsIncludingDeleted(), X.restoreElements(remote, null), api.getAppState());
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
