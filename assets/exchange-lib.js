// Pure helpers for exchanges (/exchange/, /account/, /cohort/; migration
// 20261011010000): choosing a recording format the browser can make and
// Drive can play, naming files, reading Drive's resumable-upload replies,
// and the words for times and lengths. Tested in
// tools/test/exchange-lib.test.mjs.
(function (root) {
  // Five minutes a video, as Threadit kept its clips short: long enough to
  // show something and say why, short enough that people watch the thread.
  var MAX_SECONDS = 300;
  // A video someone already has may run longer, up to the 30 minutes the
  // hub keeps per video.
  var MAX_UPLOAD_SECONDS = 1800;

  // MP4 plays most reliably in Drive's player, and Safari only records it;
  // Chrome records it now too. WebM is the fallback.
  var FORMATS = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  function pickFormat(isSupported) {
    if (typeof isSupported !== 'function') return '';
    for (var i = 0; i < FORMATS.length; i++) {
      try { if (isSupported(FORMATS[i])) return FORMATS[i]; } catch (e) { /* try the next */ }
    }
    return '';
  }
  function baseType(mime) { return String(mime || '').split(';')[0].trim().toLowerCase() || 'video/mp4'; }
  function extFor(mime) {
    var t = baseType(mime);
    return t === 'video/webm' ? 'webm' : t === 'video/quicktime' ? 'mov' : t === 'video/x-matroska' ? 'mkv' : 'mp4';
  }

  function clock(seconds) {
    var s = Math.max(0, Math.round(+seconds || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function lengthWords(seconds) {
    var s = Math.max(0, Math.round(+seconds || 0));
    if (s < 60) return s + (s === 1 ? ' second' : ' seconds');
    var m = Math.round(s / 60);
    return m + (m === 1 ? ' minute' : ' minutes');
  }

  function ago(iso, now) {
    var then = new Date(iso).getTime(), n = (now || new Date()).getTime();
    var s = Math.round((n - then) / 1000);
    if (isNaN(s)) return '';
    if (s < 60) return 'just now';
    var m = Math.round(s / 60);
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.round(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24);
    if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: new Date(iso).getFullYear() === new Date(n).getFullYear() ? undefined : 'numeric' });
  }

  var DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;
  function drive(id) {
    if (!DRIVE_ID.test(String(id || ''))) return null;
    return {
      preview: 'https://drive.google.com/file/d/' + id + '/preview',
      view: 'https://drive.google.com/file/d/' + id + '/view',
      // Drive's /thumbnail address answers a browser signed in to Google
      // with a dark placeholder; the picture itself, asked for without
      // cookies, is the video's real frame.
      thumb: 'https://lh3.googleusercontent.com/d/' + id + '=w640',
      // Asked without cookies, this answers with an image only while anyone
      // with the link may watch; once its owner stops sharing it, Google
      // sends a sign-in page instead.
      shared: 'https://lh3.googleusercontent.com/d/' + id + '=w64'
    };
  }

  // The video file itself, for the browser's own player, through the
  // site's relay (tools/video-relay), which fetches it from Drive. Drive's
  // embedded player fails in Safari on a phone, Drive's download address
  // refuses other sites' players, and the Drive API with a key now gets
  // Google's "automated queries" page (October 16, 2026). The type the hub
  // kept goes along for a file Drive serves without one.
  function mediaUrl(id, relay, mime) {
    if (!DRIVE_ID.test(String(id || '')) || !relay) return null;
    return String(relay).replace(/\/$/, '') + '/v/' + id + (mime ? '?type=' + encodeURIComponent(baseType(mime)) : '');
  }

  // "Human Shaped exchange, Week 2 check-in, 2026-10-11 14.05.mp4"
  function fileName(title, when, mime) {
    var t = String(title || 'exchange').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    var d = when || new Date();
    function two(n) { return ('0' + n).slice(-2); }
    var stamp = d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + ' ' + two(d.getHours()) + '.' + two(d.getMinutes());
    return 'Human Shaped exchange, ' + t + ', ' + stamp + '.' + extFor(mime);
  }

  // Resumable uploads go up in pieces that are multiples of 256 KiB, as
  // Drive asks; 8 MiB keeps a phone on a weak connection from starting over.
  var CHUNK = 8 * 1024 * 1024;
  function chunkEnd(start, size) { return Math.min(size, start + CHUNK); }
  // After a 308, Drive's Range header ("bytes=0-1048575") says what it has.
  function resumeFrom(rangeHeader) {
    var m = /bytes=0-(\d+)/.exec(String(rangeHeader || ''));
    return m ? +m[1] + 1 : 0;
  }

  function checkExchange(input) {
    var title = String(input.title || '').trim();
    if (!title) return { error: 'Give the exchange a name people will recognize.' };
    if (title.length > 120) return { error: 'Keep the name under 120 characters.' };
    if (!input.video) return { error: 'Record or choose the opening video. It is the exchange\'s prompt.' };
    return { row: { title: title, cohort: input.cohort || null } };
  }

  // A sentence about an exchange, never an "A · B · C" string.
  function summary(e) {
    var n = (e.posts || []).length;
    var where = e.cohort ? ' in ' + e.cohort.title : '';
    var count = n === 0 ? 'no videos yet' : n === 1 ? 'one video so far' : n + ' videos so far';
    return 'Started by ' + e.maker.name + where + ', with ' + count + '.';
  }

  // The thread in reading order, nested two levels under the opening video
  // (research/notes/exchange-threads-notes.md): the opening video is the
  // prompt; a video that answers it, or answers nothing, is a response;
  // anything that answers a response, or an answer, joins that response's
  // branch in time order, so nothing is indented twice. Each item says its
  // depth (0 the prompt, 1 a response, 2 an answer), its branch (the
  // response it sits under), and parent (the video it answers, if still
  // here). Posts come oldest first, as exchange() sends them.
  function threadOrder(posts) {
    var list = (posts || []).slice();
    if (!list.length) return [];
    var byId = {};
    list.forEach(function (p) { byId[p.id] = p; });
    var prompt = list[0];
    function topOf(p) {
      var seen = {}, cur = p;
      while (cur.reply_to && byId[cur.reply_to] && cur.reply_to !== prompt.id && !seen[cur.id]) {
        seen[cur.id] = true;
        cur = byId[cur.reply_to];
      }
      return cur;
    }
    var out = [{ post: prompt, depth: 0, branch: null, parent: null }];
    var responses = [], answers = {};
    list.slice(1).forEach(function (p) {
      var top = topOf(p);
      if (top === p) responses.push(p);
      else (answers[top.id] = answers[top.id] || []).push(p);
    });
    responses.forEach(function (r) {
      out.push({ post: r, depth: 1, branch: r.id, parent: r.reply_to && byId[r.reply_to] ? byId[r.reply_to] : null });
      (answers[r.id] || []).forEach(function (a) {
        out.push({ post: a, depth: 2, branch: r.id, parent: byId[a.reply_to] || null });
      });
    });
    return out;
  }

  // Who sent a reaction, as words: "Ana", "Ana and Ben", "Ana, Ben, and
  // Cy", and past three, "Ana, Ben, and 4 others".
  function names(list) {
    var n = (list || []).filter(Boolean);
    if (n.length <= 2) return n.join(' and ');
    if (n.length === 3) return n[0] + ', ' + n[1] + ', and ' + n[2];
    var rest = n.length - 2;
    return n[0] + ', ' + n[1] + ', and ' + rest + (rest === 1 ? ' other' : ' others');
  }

  // Which phone's own screen recorder to explain: 'ios' (iPadOS Safari
  // calls itself a Mac, so a Mac with touch is an iPad), 'android', or null
  // on a computer, which shares its screen in the page.
  function phoneKind(ua, touchPoints) {
    ua = String(ua || '');
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return null;
  }

  // How to record the screen with the recorder the phone already has, ending
  // back on this page with the recording in Photos or the phone's videos.
  // Phone browsers (other than Safari from iOS 27) cannot share a screen in
  // the page, and the phone's recorder can show any app, not only the browser.
  var SCREEN_STEPS = {
    ios: [
      'Swipe down from the top-right corner to open Control Center, then touch and hold Screen Recording and turn the microphone on, so your voice is recorded along with your screen. If Screen Recording isn’t there, touch and hold an empty spot in Control Center to add it.',
      'Tap Start Recording, and after the countdown show what you want to show, talking it through as you go.',
      'Tap the red indicator at the top of the screen to stop, and the recording is saved to Photos.',
      'Come back to this page and choose the recording.'
    ],
    android: [
      'Swipe down twice from the top of the screen and tap Screen record (Screen recorder on some phones). If it isn’t there, tap the pencil to add it.',
      'Choose to record sound from the microphone, so your voice is recorded along with your screen, then tap Start.',
      'Show what you want to show, talking it through as you go, and stop from the notification at the top of the screen. The recording is saved with your videos.',
      'Come back to this page and choose the recording.'
    ]
  };
  function screenSteps(kind) { return SCREEN_STEPS[kind] ? SCREEN_STEPS[kind].slice() : []; }

  // Whether the browser's own player already puts a large play button over
  // a paused video. Phones and tablets do (Safari on iPhone and iPad,
  // Chrome on Android), and so do Firefox and Safari on a computer; Chrome
  // and Edge on a computer show nothing until the pointer moves onto the
  // video (seen October 16, 2026), so only there does the page add its own.
  function drawsOwnPlay(ua, coarse) {
    ua = String(ua || '');
    if (coarse || /Android|iPhone|iPad|iPod|Mobile/.test(ua)) return true;
    if (/Firefox\//.test(ua)) return true;
    if (/Chrome\/|Chromium\/|Edg\//.test(ua)) return false;
    return /Safari\//.test(ua);
  }

  var api = {
    drawsOwnPlay: drawsOwnPlay, phoneKind: phoneKind, screenSteps: screenSteps,
    MAX_SECONDS: MAX_SECONDS, MAX_UPLOAD_SECONDS: MAX_UPLOAD_SECONDS, FORMATS: FORMATS, pickFormat: pickFormat, baseType: baseType, extFor: extFor,
    clock: clock, lengthWords: lengthWords, ago: ago, drive: drive, mediaUrl: mediaUrl, fileName: fileName,
    CHUNK: CHUNK, chunkEnd: chunkEnd, resumeFrom: resumeFrom, checkExchange: checkExchange, summary: summary, names: names, threadOrder: threadOrder
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ExchangeLib = api;
})(this);
