// The recorder for exchanges: the camera or the screen, recorded in the
// browser with a countdown, a five-minute limit, a look back before
// posting, and as many tries as the person wants. Phones and browsers that
// cannot record in the page can use their own camera app or a video they
// already have. On a phone, Screen walks through the phone's own screen
// recorder (Control Center, or Android's Screen record tile) and then takes
// the recording it saved; Safari from iOS 27 can also share in the page.
//
//   var r = ExchangeRecorder.mount(box, { onChange(result | null) })
//   result = { blob, mime, seconds, kind: 'camera' | 'screen' | 'upload', picked }
//   (picked: chosen from the device rather than recorded here)
//   r.reset()   r.release()
(function () {
  var X = window.ExchangeLib;
  var md = navigator.mediaDevices || {};
  var canRecord = !!(window.MediaRecorder && md.getUserMedia);
  var canDisplay = canRecord && typeof md.getDisplayMedia === 'function';
  var phoneOs = X.phoneKind(navigator.userAgent, navigator.maxTouchPoints || 0);
  var canScreen = canDisplay || !!phoneOs;
  var phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var MAX_UPLOAD = 1024 * 1024 * 1024;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }

  function mount(box, opts) {
    var mode = 'camera', stream = null, recorder = null, chunks = [], started = 0, tick = null, countdown = null;
    var result = null, reviewUrl = null;

    var wrap = el('div', 'xr');
    var sources = el('div', 'xr-sources');
    sources.setAttribute('role', 'group');
    sources.setAttribute('aria-label', 'What to record');
    var camBtn = button('xr-source', 'Camera'), scrBtn = button('xr-source', 'Screen');
    camBtn.setAttribute('aria-pressed', 'true');
    scrBtn.setAttribute('aria-pressed', 'false');
    sources.appendChild(camBtn);
    if (canScreen) sources.appendChild(scrBtn);

    var stage = el('div', 'xr-stage');
    var live = el('video', 'xr-live');
    live.muted = true; live.playsInline = true; live.autoplay = true;
    live.setAttribute('playsinline', ''); live.setAttribute('aria-label', 'What your camera sees');
    var review = el('video', 'xr-review');
    review.controls = true; review.playsInline = true; review.setAttribute('playsinline', ''); review.hidden = true;
    var idle = el('div', 'xr-idle');
    var idleText = el('p', null, canRecord ? '' : 'This browser cannot record here. Upload a video instead.');
    idle.appendChild(idleText);
    var count = el('div', 'xr-count');
    count.setAttribute('aria-hidden', 'true');
    count.hidden = true;
    var badge = el('div', 'xr-badge');
    badge.hidden = true;
    stage.appendChild(live); stage.appendChild(review); stage.appendChild(idle); stage.appendChild(count); stage.appendChild(badge);
    var steps = el('ol', 'xr-steps');
    steps.hidden = true;
    X.screenSteps(phoneOs).forEach(function (t) { steps.appendChild(el('li', null, t)); });

    var controls = el('div', 'xr-controls');
    var onBtn = button('btn-secondary', 'Turn on the camera');
    var recBtn = button('xr-rec', 'Record');
    var stopBtn = button('xr-rec stop', 'Stop');
    var againBtn = button('btn-secondary', 'Record again');
    var upBtn = button('btn-secondary', 'Upload a video');
    var otherBtn = button('btn-secondary', 'Choose a different video');
    recBtn.hidden = stopBtn.hidden = againBtn.hidden = otherBtn.hidden = true;
    if (!canRecord) onBtn.hidden = true;
    controls.appendChild(onBtn); controls.appendChild(upBtn); controls.appendChild(recBtn); controls.appendChild(stopBtn); controls.appendChild(againBtn); controls.appendChild(otherBtn);

    var status = el('p', 'xr-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    var alt = el('div', 'xr-alt');
    var pick = el('input');
    pick.type = 'file'; pick.accept = 'video/*'; pick.hidden = true;
    var shoot = el('input');
    shoot.type = 'file'; shoot.accept = 'video/*'; shoot.setAttribute('capture', 'user'); shoot.hidden = true;
    var altLine = el('p', 'hint');
    var useApp = button('text-button', 'record with your phone\'s camera app');
    altLine.appendChild(document.createTextNode('Or '));
    altLine.appendChild(useApp);
    altLine.appendChild(document.createTextNode(' and come back here to post it.'));
    altLine.hidden = !phone;
    alt.appendChild(altLine); alt.appendChild(pick); alt.appendChild(shoot);

    wrap.appendChild(sources); wrap.appendChild(stage); wrap.appendChild(steps); wrap.appendChild(controls); wrap.appendChild(status); wrap.appendChild(alt);
    box.replaceChildren(wrap);
    if (!canScreen) sources.hidden = true;

    function say(t) { status.textContent = t || ''; }
    function set(r) { result = r; if (opts.onChange) opts.onChange(r); }
    function stopTracks() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
      live.srcObject = null;
    }
    function show(what) {
      var phoneScreen = mode === 'screen' && !!phoneOs;
      stage.hidden = phoneScreen && what === 'idle';
      steps.hidden = !(phoneScreen && what === 'idle');
      upBtn.textContent = phoneScreen ? 'Choose the recording' : 'Upload a video';
      altLine.hidden = !phone || mode === 'screen';
      idle.hidden = what !== 'idle';
      live.hidden = what !== 'live';
      review.hidden = what !== 'review';
      onBtn.hidden = !canRecord || what !== 'idle' || (mode === 'screen' && !canDisplay);
      upBtn.hidden = what !== 'idle';
      recBtn.hidden = what !== 'live';
      stopBtn.hidden = what !== 'recording';
      againBtn.hidden = what !== 'review' || !result || result.picked;
      otherBtn.hidden = what !== 'review' || !result || !result.picked;
      sources.querySelectorAll('button').forEach(function (b) { b.disabled = what === 'recording' || what === 'countdown'; });
      alt.hidden = what === 'recording' || what === 'countdown';
      if (what === 'recording' || what === 'countdown') live.hidden = false;
      stage.classList.toggle('recording', what === 'recording');
      stage.classList.toggle('mirror', mode === 'camera' && (what === 'live' || what === 'recording' || what === 'countdown'));
    }
    function setMode(m) {
      if (mode === m) return;
      mode = m;
      camBtn.setAttribute('aria-pressed', String(m === 'camera'));
      scrBtn.setAttribute('aria-pressed', String(m === 'screen'));
      onBtn.textContent = m === 'camera' ? 'Turn on the camera' : phoneOs ? 'Share from this page' : 'Choose what to share';
      idleText.textContent = m === 'camera'
        ? ''
        : 'Choose a window, a tab, or your whole screen to share. Your microphone records your voice with it.';
      stopTracks();
      show('idle');
    }
    camBtn.addEventListener('click', function () { setMode('camera'); });
    scrBtn.addEventListener('click', function () { setMode('screen'); });

    function getStream() {
      if (mode === 'camera') {
        return md.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
      }
      return md.getDisplayMedia({ video: { frameRate: 30 }, audio: true }).then(function (screen) {
        return md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (mic) {
          return new MediaStream(screen.getVideoTracks().concat(mic.getAudioTracks()));
        }, function () { return screen; });
      });
    }
    function turnOn() {
      say(mode === 'camera' ? 'Asking to use your camera and microphone…' : 'Choose what to share…');
      return getStream().then(function (s) {
        stream = s;
        live.srcObject = s;
        var v = s.getVideoTracks()[0];
        if (v) v.addEventListener('ended', function () { if (recorder && recorder.state === 'recording') stop(); else { stopTracks(); show('idle'); } });
        show('live');
        say(mode === 'camera' ? 'Your camera is on. Press Record when you are ready.' : 'Sharing is on. Press Record when you are ready.');
        recBtn.focus();
      }).catch(function (e) {
        show('idle');
        var denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
        say(denied
          ? (mode === 'camera' ? 'The camera is blocked. Allow it in this site\'s browser settings.' : 'Sharing was cancelled.')
          : 'The ' + mode + ' could not start' + (e && e.message ? ': ' + e.message : '') + '.'
            + (mode === 'screen' && phoneOs ? ' Your phone’s own screen recorder still works, with the steps above.' : ''));
      });
    }
    onBtn.addEventListener('click', turnOn);

    function begin() {
      var n = 3;
      show('countdown');
      count.hidden = false;
      count.textContent = n;
      say('Recording in 3 seconds.');
      countdown = setInterval(function () {
        n--;
        if (n > 0) { count.textContent = n; return; }
        clearInterval(countdown); countdown = null;
        count.hidden = true;
        record();
      }, 1000);
    }
    function record() {
      chunks = [];
      var mime = X.pickFormat(window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported.bind(window.MediaRecorder));
      try { recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : { videoBitsPerSecond: 2500000 }); }
      catch (e) { recorder = new MediaRecorder(stream); }
      recorder.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunks.push(ev.data); };
      recorder.onstop = function () {
        clearInterval(tick); tick = null;
        var seconds = Math.round((Date.now() - started) / 1000);
        var type = recorder.mimeType || mime || 'video/mp4';
        var blob = new Blob(chunks, { type: X.baseType(type) });
        stopTracks();
        if (!blob.size) { show('idle'); say('Nothing was recorded. Try again.'); return; }
        showReview(blob, seconds, mode, false);
      };
      recorder.start(1000);
      started = Date.now();
      show('recording');
      badge.hidden = false;
      var paint = function () {
        var s = (Date.now() - started) / 1000;
        badge.textContent = X.clock(s) + ' of ' + X.clock(X.MAX_SECONDS);
        if (s >= X.MAX_SECONDS) stop();
      };
      paint();
      tick = setInterval(paint, 250);
      say('Recording. Press Stop when you are done.');
      stopBtn.focus();
    }
    function stop() {
      badge.hidden = true;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
    }
    recBtn.addEventListener('click', begin);
    stopBtn.addEventListener('click', stop);

    function showReview(blob, seconds, kind, picked) {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
      reviewUrl = URL.createObjectURL(blob);
      review.src = reviewUrl;
      set({ blob: blob, mime: blob.type || 'video/mp4', seconds: seconds, kind: kind, picked: picked });
      show('review');
      say(picked
        ? 'Here is your video' + (seconds != null ? ' (' + X.lengthWords(seconds) + ')' : '') + '. Watch it back, then post it, or choose a different one.'
        : 'Here is your video (' + X.lengthWords(seconds) + '). Watch it back, then post it, or record again.');
    }
    againBtn.addEventListener('click', function () {
      set(null);
      review.removeAttribute('src');
      if (reviewUrl) { URL.revokeObjectURL(reviewUrl); reviewUrl = null; }
      if (canRecord) turnOn(); else show('idle');
    });

    function fromFile(input) {
      var f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      if (!/^video\//.test(f.type) && !/\.(mp4|mov|webm|m4v|mkv)$/i.test(f.name)) { say('That file is not a video.'); return; }
      if (f.size > MAX_UPLOAD) { say('That video is larger than 1 GB. Try a shorter one.'); return; }
      stopTracks();
      // A video chosen while Screen is selected is a screen recording, and
      // the thread says so.
      var kind = mode === 'screen' ? 'screen' : 'upload';
      var probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.muted = true;
      var url = URL.createObjectURL(f), settled = false;
      // Browsers may hold off reading a video in a background tab; the
      // review should not wait on its length forever.
      var late = setTimeout(function () { if (settled) return; settled = true; URL.revokeObjectURL(url); showReview(f, null, kind, true); }, 4000);
      probe.onloadedmetadata = function () {
        if (settled) return;
        settled = true; clearTimeout(late);
        var s = isFinite(probe.duration) ? Math.round(probe.duration) : null;
        URL.revokeObjectURL(url);
        if (s && s > X.MAX_UPLOAD_SECONDS) { say('That video is ' + X.lengthWords(s) + ' long. An exchange takes videos of up to 30 minutes.'); return; }
        showReview(f, s, kind, true);
      };
      probe.onerror = function () { if (settled) return; settled = true; clearTimeout(late); URL.revokeObjectURL(url); showReview(f, null, kind, true); };
      probe.src = url;
    }
    upBtn.addEventListener('click', function () { pick.click(); });
    otherBtn.addEventListener('click', function () { pick.click(); });
    useApp.addEventListener('click', function () { shoot.click(); });
    pick.addEventListener('change', function () { fromFile(pick); });
    shoot.addEventListener('change', function () { fromFile(shoot); });

    show('idle');
    return {
      result: function () { return result; },
      release: function () {
        if (countdown) clearInterval(countdown);
        if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
        stopTracks();
      },
      reset: function () {
        this.release();
        set(null);
        review.removeAttribute('src');
        if (reviewUrl) { URL.revokeObjectURL(reviewUrl); reviewUrl = null; }
        badge.hidden = true; count.hidden = true;
        show('idle'); say('');
      }
    };
  }

  window.ExchangeRecorder = { mount: mount, canRecord: canRecord };
})();
