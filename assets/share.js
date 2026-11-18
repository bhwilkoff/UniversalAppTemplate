// The window a learner's panel opens to share their screen onto the stage
// (/share/?c=<slug>&s=<number>). It takes the panel's sign-in by the same
// handoff as /record/, captures the screen the learner picks, puts it in the
// session's show queue as a screen, and streams it to every stage that asks
// (assets/screen-share.js). Stopping, or closing the window, takes it down.
(function () {
  var A = window.AddonLib, X = window.ScreenShare;
  var root = document.querySelector('[data-share]');
  function $(s) { return root.querySelector(s); }
  function show(state) { root.querySelectorAll('[data-state]').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  var params = new URLSearchParams(location.search);
  var slug = params.get('c') || '', number = Number(params.get('s')), member = params.get('m') || null;
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
  var K = { me: null, cohort: null, session: null }, live = null, row = null, stream = null;

  function fromOpener() {
    var opener = window.opener;
    if (!opener || !window.GoogleSignInLib || !A) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var asked = 0, timer = null;
      function onMessage(event) {
        var tokens = A.acceptHandoff(event, location.origin, opener);
        if (!tokens) return;
        done();
        db.auth.setSession(tokens).then(function (r) { resolve(r.data && r.data.session ? r.data.session : null); }, function () { resolve(null); });
      }
      function done() { clearInterval(timer); window.removeEventListener('message', onMessage); }
      window.addEventListener('message', onMessage);
      function ask() {
        if (++asked > 10) { done(); return resolve(null); }
        try { opener.postMessage(window.GoogleSignInLib.wantMessage(), location.origin); } catch (e) { done(); resolve(null); }
      }
      ask(); timer = setInterval(ask, 500);
    });
  }

  function load() {
    return db.auth.getSession().then(function (s) { return s.data && s.data.session ? s.data.session : null; }, function () { return null; })
      .then(function (s) { return s || fromOpener(); }).then(function (s) {
        if (!s || !slug) return null;
        K.me = s.user;
        return db.from('cohorts').select('id, slug').eq('slug', slug).maybeSingle().then(function (c) {
          if (c.error || !c.data) return null;
          K.cohort = c.data;
          return db.from('sessions').select('id').eq('cohort_id', c.data.id).eq('number', number).maybeSingle().then(function (r) { K.session = r.data || null; return K.session; });
        });
      });
  }

  function stop() {
    if (live) { live.stop(); live = null; }
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    if (row) { var id = row; row = null; return db.from('live_queue').update({ state: 'shown' }).eq('id', id).then(function () {}, function () {}); }
    return Promise.resolve();
  }

  $('[data-start]').addEventListener('click', function () {
    var status = $('[data-share-status]');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { status.textContent = 'This browser cannot share a screen. Use Chrome on a computer.'; return; }
    status.textContent = '';
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false }).then(function (s) {
      stream = s;
      var id = X.uuid();
      return db.from('live_queue').insert({ cohort_id: K.cohort.id, session_id: K.session.id, user_id: member || K.me.id, kind: 'screen', url: X.urlOf(location.origin, id) })
        .select('id').single().then(function (r) {
          if (r.error) { stop(); status.textContent = 'Not shared: ' + r.error.message; return; }
          row = r.data.id;
          $('[data-preview]').srcObject = s;
          live = X.present({ db: db, id: id, stream: s, onCount: function (n) {
            $('[data-line]').textContent = n ? (n === 1 ? 'One stage is showing your screen.' : n + ' stages are showing your screen.') : 'Your leader puts it on the stage.';
          } });
          s.getVideoTracks()[0].addEventListener('ended', function () { stop().then(function () { show('done'); }); });
          show('sharing');
        });
    }, function () { status.textContent = 'Nothing was shared. Press the button again to choose a screen, a window, or a tab.'; });
  });
  $('[data-stop]').addEventListener('click', function () { stop().then(function () { show('done'); }); });
  window.addEventListener('pagehide', function () { stop(); });

  load().then(function (s) { show(s ? 'ready' : 'none'); }, function () { show('none'); });
})();
