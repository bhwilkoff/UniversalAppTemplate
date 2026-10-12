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

  // The video file itself, through the Drive API with the site's browser
  // key, for the browser's own player. Drive's embedded player fails in
  // Safari on a phone, which blocks the cookies it needs inside another
  // site; and Drive's download address refuses other sites' players.
  function mediaUrl(id, key) {
    if (!DRIVE_ID.test(String(id || '')) || !key) return null;
    return 'https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&key=' + encodeURIComponent(key);
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

  // Who sent a reaction, as words: "Ana", "Ana and Ben", "Ana, Ben, and
  // Cy", and past three, "Ana, Ben, and 4 others".
  function names(list) {
    var n = (list || []).filter(Boolean);
    if (n.length <= 2) return n.join(' and ');
    if (n.length === 3) return n[0] + ', ' + n[1] + ', and ' + n[2];
    var rest = n.length - 2;
    return n[0] + ', ' + n[1] + ', and ' + rest + (rest === 1 ? ' other' : ' others');
  }

  var api = {
    MAX_SECONDS: MAX_SECONDS, MAX_UPLOAD_SECONDS: MAX_UPLOAD_SECONDS, FORMATS: FORMATS, pickFormat: pickFormat, baseType: baseType, extFor: extFor,
    clock: clock, lengthWords: lengthWords, ago: ago, drive: drive, mediaUrl: mediaUrl, fileName: fileName,
    CHUNK: CHUNK, chunkEnd: chunkEnd, resumeFrom: resumeFrom, checkExchange: checkExchange, summary: summary, names: names
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ExchangeLib = api;
})(this);
