// The session recorder (/record/?c=<slug>&s=<number>), opened by a
// leader from the Recording cue in the Meet add-on or /live/.
//
// Meet frames the add-on without screen or microphone capture (measured
// in a live call as meet@, October 28, 2026), and the Chrome extension in
// tools/session-recorder was one more thing to install, so the add-on
// opens this page in its own window, where the browser allows both. It
// records the Meet tab the leader picks, with the tab's sound and the
// leader's own microphone mixed in (Meet never plays your own voice back
// to you), and writes it to this computer in ten-second pieces as it goes.
// When it stops, the leader saves the file, or puts it in Drive (the
// site's drive.file permission, as exchanges do) and on the session page.
//
// It only starts after the leader ticks that they have read the notice
// aloud and posted it in the chat, and while it runs everyone sees
// "recording" in the panel (the same signal the cue used to send by hand).
//
// Signing in: this window's own humanshaped.org sign-in, or the panel's,
// handed over with postMessage from the window that opened it (the same
// handoff as /account/?handoff=meet, in the other direction). Without
// either it still records and saves; only the notice for everyone and the
// session page link need it.
(function () {
  var R = window.RecordLib, A = window.AddonLib, D = window.ExchangeDrive;
  var root = document.querySelector('[data-record]');
  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }
  function show(state) { root.querySelectorAll('[data-state]').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }

  var params = new URLSearchParams(location.search);
  var slug = params.get('c') || '', number = Number(params.get('s'));
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
  var K = { me: null, email: null, cohort: null, session: null, leading: false };
  var rec = null;   // the recording in progress

  // ------------------------------------------------------------------
  // Signing in, and which session this is
  // ------------------------------------------------------------------

  function sessionOf() {
    return db.auth.getSession().then(function (s) { return s.data && s.data.session ? s.data.session : null; }, function () { return null; });
  }
  // Ask the window that opened this one for its sign-in, for up to five
  // seconds, and take it only from that window, on this origin.
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
    return sessionOf().then(function (s) { return s || fromOpener(); }).then(function (s) {
      if (!s) return null;
      K.me = s.user; K.email = s.user && s.user.email;
      if (!slug) return null;
      return db.from('cohorts').select('id, slug, title').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error || !c.data) return null;
        K.cohort = c.data;
        return Promise.all([
          db.from('sessions').select('id, number, title, recording_url').eq('cohort_id', c.data.id).eq('number', number).maybeSingle(),
          db.from('cohort_teachers').select('user_id').eq('cohort_id', c.data.id).eq('user_id', K.me.id)
        ]).then(function (res) {
          K.session = res[0].data || null;
          K.leading = !!(res[1].data && res[1].data.length);
        });
      });
    }).catch(function () { return null; });
  }

  function drawReady() {
    var title = K.cohort ? K.cohort.title : '';
    $('[data-where]').textContent = K.cohort ? (number === 0 ? 'Prep' : 'Week ' + number) + ', ' + title : 'Record the session';
    $('[data-notice]').textContent = R.notice(title);
    var note = $('[data-signin-note]');
    if (!K.me) { note.hidden = false; note.textContent = 'Not signed in: this records and saves, but cannot show everyone the recording notice or link it from the session page.'; }
    else if (!K.leading || !K.session) { note.hidden = false; note.textContent = 'You do not lead this session: this records and saves, but cannot show everyone the notice or link it.'; }
    show('ready');
  }

  $('[data-copy]').addEventListener('click', function () {
    var status = $('[data-copy-status]');
    Promise.resolve(navigator.clipboard && navigator.clipboard.writeText($('[data-notice]').textContent)).then(function () {
      status.textContent = 'Copied. Paste it into the Meet chat.';
    }, function () { status.textContent = 'Copying did not work here; select the notice and copy it.'; });
  });
  $('[data-told]').addEventListener('change', function (e) { $('[data-start]').disabled = !e.target.checked; });

  // ------------------------------------------------------------------
  // "Recording" for everyone, in the panel and on the main stage
  // ------------------------------------------------------------------

  function canSignal() { return !!(K.me && K.leading && K.session && K.cohort); }
  function signal(on) {
    if (!canSignal()) return Promise.resolve();
    var now = new Date().toISOString();
    return db.from('live_signals').update({ cleared_at: now }).eq('session_id', K.session.id).eq('kind', 'recording').is('cleared_at', null).then(function () {
      if (!on) return null;
      return db.from('live_signals').insert({ cohort_id: K.cohort.id, session_id: K.session.id, created_by: K.me.id, kind: 'recording' });
    }).catch(function () { return null; });
  }

  // ------------------------------------------------------------------
  // Pieces on this computer (the origin private file system)
  // ------------------------------------------------------------------

  function store() {
    if (!navigator.storage || !navigator.storage.getDirectory) return Promise.resolve(null);
    return navigator.storage.getDirectory().then(function (top) { return top.getDirectoryHandle('recordings', { create: true }); }).catch(function () { return null; });
  }
  function writeFile(dir, name, data) {
    return dir.getFileHandle(name, { create: true }).then(function (h) {
      return h.createWritable().then(function (w) { return w.write(data).then(function () { return w.close(); }); });
    });
  }
  function readMeta(dir) {
    return dir.getFileHandle('meta.json').then(function (h) { return h.getFile(); }).then(function (f) { return f.text(); }).then(JSON.parse).catch(function () { return null; });
  }
  function saveMeta(dir, meta) { return writeFile(dir, 'meta.json', JSON.stringify(meta)); }
  // The whole recording, as one file made of the pieces on disk, so a
  // long session is never held in memory.
  function assemble(dir, mime) {
    var names = [];
    return (async function () { for await (var entry of dir.values()) if (entry.kind === 'file' && R.isPiece(entry.name)) names.push(entry.name); })().then(function () {
      names.sort();
      return Promise.all(names.map(function (n) { return dir.getFileHandle(n).then(function (h) { return h.getFile(); }); }));
    }).then(function (files) { return new Blob(files, { type: R.extension(mime) === 'mp4' ? 'video/mp4' : 'video/webm' }); });
  }

  // ------------------------------------------------------------------
  // Recording
  // ------------------------------------------------------------------

  $('[data-start]').addEventListener('click', function () {
    var status = $('[data-start-status]');
    var mime = R.pickMime(function (m) { return window.MediaRecorder && MediaRecorder.isTypeSupported(m); });
    if (!mime || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { status.textContent = 'This browser cannot record a tab. Use Chrome on a computer.'; return; }
    var audio = new AudioContext();
    var controller = window.CaptureController ? new CaptureController() : null;
    var screen = null, mic = null;
    status.textContent = 'Choose the Meet tab in the window that opens.';
    var options = {
      video: { displaySurface: 'browser', frameRate: 30 },
      audio: { suppressLocalAudioPlayback: false },
      preferCurrentTab: false, selfBrowserSurface: 'exclude', surfaceSwitching: 'include', systemAudio: 'exclude', monitorTypeSurfaces: 'exclude'
    };
    if (controller) options.controller = controller;
    navigator.mediaDevices.getDisplayMedia(options).then(function (s) {
      screen = s;
      // Stay on this window rather than jumping to the tab; the leader is
      // already looking at Meet beside it.
      try { if (controller) controller.setFocusBehavior('no-focus-change'); } catch (e) { /* too late, or not offered */ }
      var video = s.getVideoTracks()[0], settings = video ? video.getSettings() : {};
      var wrong = R.checkCapture(settings.displaySurface, s.getAudioTracks().length);
      if (wrong) { s.getTracks().forEach(function (t) { t.stop(); }); throw new Error(wrong); }
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (m) { mic = m; }, function () { mic = null; });
    }).then(function () {
      return audio.resume();
    }).then(function () {
      var out = audio.createMediaStreamDestination();
      audio.createMediaStreamSource(new MediaStream(screen.getAudioTracks())).connect(out);
      if (mic) audio.createMediaStreamSource(mic).connect(out);
      var mixed = new MediaStream([screen.getVideoTracks()[0], out.stream.getAudioTracks()[0]]);
      return store().then(function (top) {
        var started = Date.now(), id = String(started);
        var meta = { id: id, slug: slug, number: number, cohortTitle: K.cohort ? K.cohort.title : '', sessionId: K.session ? K.session.id : null, started: started, mime: mime, seconds: 0, bytes: 0, stopped: false, mic: !!mic };
        return (top ? top.getDirectoryHandle(id, { create: true }) : Promise.resolve(null)).then(function (dir) {
          begin({ dir: dir, meta: meta, screen: screen, mic: mic, audio: audio, mixed: mixed });
        });
      });
    }).catch(function (e) {
      if (screen) screen.getTracks().forEach(function (t) { t.stop(); });
      if (mic) mic.getTracks().forEach(function (t) { t.stop(); });
      audio.close();
      status.textContent = e && e.name === 'NotAllowedError' ? 'Nothing was chosen, so nothing is recording.' : (e && e.message ? e.message : 'The recording could not start.');
    });
  });

  function begin(r) {
    rec = r;
    r.memory = r.dir ? null : [];
    r.queue = Promise.resolve();
    r.piece = 0;
    r.recorder = new MediaRecorder(r.mixed, { mimeType: r.meta.mime, videoBitsPerSecond: 1500000, audioBitsPerSecond: 128000 });
    r.recorder.ondataavailable = function (e) {
      if (!e.data || !e.data.size) return;
      r.meta.bytes += e.data.size;
      r.meta.seconds = (Date.now() - r.meta.started) / 1000;
      if (!r.dir) { r.memory.push(e.data); return; }
      var name = R.pieceName(++r.piece), meta = Object.assign({}, r.meta);
      r.queue = r.queue.then(function () { return writeFile(r.dir, name, e.data); }).then(function () { return saveMeta(r.dir, meta); }).catch(function (err) { r.writeError = err; });
    };
    r.recorder.onstop = function () { finish(r); };
    r.screen.getVideoTracks()[0].addEventListener('ended', stop);
    r.recorder.start(10000);
    $('[data-mic-note]').textContent = r.mic ? 'Your microphone and the call are both in the recording.' : 'Your microphone is not in the recording, so your voice will be missing. Stop, allow the microphone, and start again.';
    r.tick = setInterval(function () {
      $('[data-clock]').textContent = R.duration((Date.now() - r.meta.started) / 1000);
      $('[data-bytes]').textContent = r.meta.bytes ? ', ' + R.size(r.meta.bytes) : '';
    }, 1000);
    if (r.dir) saveMeta(r.dir, r.meta);
    signal(true);
    show('recording');
  }

  function stop() {
    if (!rec || !rec.recorder || rec.recorder.state === 'inactive') return;
    rec.recorder.stop();
  }
  $('[data-stop]').addEventListener('click', stop);

  function finish(r) {
    clearInterval(r.tick);
    r.screen.getTracks().forEach(function (t) { t.stop(); });
    if (r.mic) r.mic.getTracks().forEach(function (t) { t.stop(); });
    r.audio.close();
    r.meta.stopped = true;
    r.meta.seconds = (Date.now() - r.meta.started) / 1000;
    rec = null;
    signal(false);
    $('[data-stop-notice]').textContent = R.stopNotice() + ' (Say this aloud.)';
    show('done');
    r.queue.then(function () { return r.dir ? saveMeta(r.dir, r.meta) : null; }).then(function () {
      if (r.dir) return list();
      // Without a place on disk, the one recording stays in memory until saved.
      drawItem({ meta: r.meta, blob: function () { return Promise.resolve(new Blob(r.memory, { type: 'video/webm' })); } }, true);
    });
  }

  window.addEventListener('beforeunload', function (e) {
    if (rec) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------------
  // Recordings on this computer: save, put in Drive, or delete
  // ------------------------------------------------------------------

  function list() {
    var box = $('[data-list]');
    return store().then(function (top) {
      if (!top) return;
      var items = [];
      return (async function () {
        for await (var entry of top.values()) {
          if (entry.kind !== 'directory') continue;
          var meta = await readMeta(entry);
          if (meta && (!rec || rec.meta.id !== meta.id)) items.push({ dir: entry, meta: meta });
        }
      })().then(function () {
        box.replaceChildren();
        items.sort(function (a, b) { return b.meta.started - a.meta.started; });
        items.forEach(function (it) {
          it.blob = function () { return assemble(it.dir, it.meta.mime); };
          it.remove = function () { return top.removeEntry(it.dir.name, { recursive: true }); };
          drawItem(it);
        });
        $('[data-saved]').hidden = !items.length;
      });
    });
  }

  function drawItem(it, memoryOnly) {
    var m = it.meta, li = el('li', 'record-item');
    var title = R.fileName(m.cohortTitle, m.number, m.started, m.mime);
    li.appendChild(el('p', null, title));
    li.appendChild(el('p', 'small', R.duration(m.seconds) + ', ' + R.size(m.bytes) + (m.stopped ? '' : ', stopped early when the window closed') + (m.driveId ? ', in Drive' : '')));
    var acts = el('div', 'actions'), status = el('p', 'small'), bar = el('progress');
    status.setAttribute('role', 'status'); bar.max = 1; bar.value = 0; bar.hidden = true;

    var save = button('btn-secondary', 'Save to this computer');
    save.addEventListener('click', function () {
      status.textContent = 'Putting the pieces together…';
      it.blob().then(function (blob) {
        var a = document.createElement('a'), url = URL.createObjectURL(blob);
        a.href = url; a.download = title; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        status.textContent = 'Saved as “' + title + '” in your downloads.';
      }, function (e) { status.textContent = 'It could not be put together: ' + (e && e.message ? e.message : 'no details') + '.'; });
    });
    acts.appendChild(save);

    var up = button('btn-primary', m.driveId ? 'Put it in Drive again' : 'Put it in Drive and on the session page');
    up.addEventListener('click', function () {
      if (!D) { status.textContent = 'Drive is not available on this page.'; return; }
      up.disabled = true; status.textContent = 'Connecting Drive…';
      // Google's window must open from this click, before anything else waits.
      var token = null;
      D.connect(K.email).then(function (t) {
        token = t; status.textContent = 'Putting the pieces together…';
        return it.blob();
      }).then(function (blob) {
        bar.hidden = false; status.textContent = 'Uploading ' + R.size(blob.size) + '…';
        return D.save(token, blob, {
          name: title, mime: blob.type, kind: 'session-recording',
          description: 'A Human Shaped session recording, linked from the cohort’s session page.',
          folder: { key: 'recordings', name: 'Human Shaped recordings', description: 'Session recordings from humanshaped.org. Each is linked from its cohort’s session page, and anyone with a recording’s link can watch it.' }
        }, function (p) { bar.value = p; });
      }).then(function (fileId) {
        m.driveId = fileId;
        var link = R.driveUrl(fileId);
        if (it.dir) saveMeta(it.dir, m);
        status.replaceChildren(document.createTextNode('In Drive: '));
        var a = el('a', null, 'open it'); a.href = link; a.target = '_blank'; a.rel = 'noopener'; status.appendChild(a);
        if (!(K.me && K.leading && K.cohort)) { status.appendChild(document.createTextNode('. Sign in as a leader to put it on the session page, or paste the link there.')); return; }
        return db.from('sessions').update({ recording_url: link }).eq('cohort_id', K.cohort.id).eq('number', m.number).select('id').then(function (r) {
          status.appendChild(document.createTextNode(r.error || !r.data || !r.data.length ? '. It is not on the session page yet; paste the link there.' : ', and it is on the session page.'));
        });
      }).catch(function (e) {
        status.textContent = 'Not in Drive: ' + (e && e.message ? e.message : 'no details') + '. It is still on this computer; try again.';
      }).then(function () { up.disabled = false; bar.hidden = true; });
    });
    acts.appendChild(up);

    if (!memoryOnly && it.remove) {
      var del = button('btn-secondary', 'Delete from this computer'), sure = false;
      del.addEventListener('click', function () {
        if (!sure) { sure = true; del.textContent = 'Yes, delete it'; status.textContent = m.driveId ? 'Drive keeps its copy.' : 'It is not in Drive, so this is the only copy.'; return; }
        it.remove().then(list, function (e) { status.textContent = 'Not deleted: ' + (e && e.message ? e.message : 'no details') + '.'; });
      });
      acts.appendChild(del);
    }
    li.appendChild(acts); li.appendChild(bar); li.appendChild(status);
    $('[data-list]').appendChild(li);
    $('[data-saved]').hidden = false;
  }

  load().then(function () { drawReady(); return list(); });
})();
