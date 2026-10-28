// The session recorder's pure parts (/record/): the notice a leader reads
// aloud, the file's name, which format this browser records, and the
// Drive link the session page carries. No page, no network. Tested in
// tools/test/record-lib.test.mjs. Words by Claude, awaiting Ben's review.
(function (root) {
  // Meet frames the add-on without camera, microphone, or screen capture
  // (measured in a live call as meet@, October 28, 2026), so the add-on
  // opens this page in its own window, where the browser allows them.
  function recordUrl(origin, slug, number) {
    return String(origin || '') + '/record/?c=' + encodeURIComponent(slug) + '&s=' + Number(number);
  }

  function notice(cohortTitle) {
    var where = cohortTitle ? ' for ' + cohortTitle : '';
    return 'I am recording this session' + where + ' now, so that anyone who misses it can watch it later. ' +
      'The recording is kept in Human Shaped’s Google Drive and linked only from this cohort’s session page. ' +
      'If you would rather not appear, turn your camera off and use the chat, or tell me and I will trim your part. ' +
      'Breakout rooms are not recorded, and I will stop the recording before we split up.';
  }
  function stopNotice() { return 'I have stopped recording. Anything from here on is not recorded.'; }

  // The first format this browser records, best first. WebM, because the
  // session page's player could not seek past half a minute into the MP4
  // Chrome recorded (October 28, 2026), and could anywhere in the WebM once
  // it has a duration (fixDuration). MP4 is the fallback.
  var MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  function pickMime(isSupported) {
    for (var i = 0; i < MIMES.length; i++) { try { if (isSupported(MIMES[i])) return MIMES[i]; } catch (e) { /* try the next */ } }
    return '';
  }
  function extension(mime) { return /mp4/.test(String(mime)) ? 'mp4' : 'webm'; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // "Prep, Minerva University Admissions ... 2026-10-28.webm", from the
  // local date the recording started.
  function fileName(cohortTitle, sessionNumber, started, mime) {
    var d = new Date(started), day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var n = Number(sessionNumber), name = isNaN(n) ? 'Session' : n === 0 ? 'Prep' : 'Week ' + n;
    var title = String(cohortTitle || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return name + ', ' + (title ? title + ', ' : '') + day + '.' + extension(mime);
  }

  // Each ten-second piece is kept as its own file while recording, so a
  // crash or a closed window keeps everything up to that moment.
  function pieceName(i) { var s = String(i); while (s.length < 6) s = '0' + s; return s + '.part'; }
  function isPiece(name) { return /^\d{6}\.part$/.test(String(name)); }

  function duration(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return (h ? h + ':' + pad(m) : String(m)) + ':' + pad(s % 60);
  }
  function size(bytes) {
    var b = Number(bytes) || 0;
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return Math.round(b / 1048576) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  }

  // Chrome writes a WebM recording without its length, so a player shows
  // no duration and its scrub bar does nothing. This adds the Duration
  // element to the header's Info, in the first piece the recorder wrote.
  // bytes: that piece (a Uint8Array); ms: the recording's length. Returns
  // the new piece, or null when it is not a WebM header this understands.
  function fixDuration(bytes, ms) {
    var b = bytes, n = b.length;
    function vint(i, keepMarker) {
      if (i >= n) return null;
      var first = b[i], len = 1, mask = 0x80;
      while (len <= 8 && !(first & mask)) { mask >>= 1; len++; }
      if (len > 8 || i + len > n) return null;
      var v = keepMarker ? first : (first & (mask - 1)), all = !keepMarker && v === mask - 1;
      for (var k = 1; k < len; k++) { v = v * 256 + b[i + k]; if (b[i + k] !== 0xff) all = false; }
      return { len: len, value: v, unknown: all };
    }
    function el(i) {
      var id = vint(i, true); if (!id) return null;
      var size = vint(i + id.len, false); if (!size) return null;
      return { id: id.value, start: i, data: i + id.len + size.len, size: size.unknown ? null : size.value };
    }
    var head = el(0);
    if (!head || head.id !== 0x1A45DFA3 || head.size == null) return null;
    var seg = el(head.data + head.size);
    if (!seg || seg.id !== 0x18538067) return null;
    var i = seg.data;
    while (i < n) {
      var e = el(i);
      if (!e || e.id === 0x1F43B675 || e.size == null) return null;
      if (e.id === 0x1549A966) {
        var end = e.data + e.size, scale = 1000000, j = e.data, kept = [];
        if (end > n) return null;
        while (j < end) {
          var c = el(j);
          if (!c || c.size == null) return null;
          if (c.id === 0x2AD7B1) { var t = 0; for (var k = 0; k < c.size; k++) t = t * 256 + b[c.data + k]; if (t) scale = t; }
          if (c.id !== 0x4489) kept.push(b.subarray(c.start, c.data + c.size));
          j = c.data + c.size;
        }
        var dur = new Uint8Array(11), dv = new DataView(dur.buffer);
        dur[0] = 0x44; dur[1] = 0x89; dur[2] = 0x88;
        dv.setFloat64(3, ms * 1000000 / scale);
        kept.push(dur);
        var body = kept.reduce(function (s, x) { return s + x.length; }, 0);
        var info = new Uint8Array(4 + 8), iv = new DataView(info.buffer);
        info.set([0x15, 0x49, 0xA9, 0x66, 0x01], 0);
        iv.setUint32(8, body); iv.setUint16(6, Math.floor(body / 4294967296) & 0xffff); info[5] = 0;
        var out = new Uint8Array(e.start + info.length + body + (n - end)), o = 0;
        out.set(b.subarray(0, e.start), o); o += e.start;
        out.set(info, o); o += info.length;
        kept.forEach(function (x) { out.set(x, o); o += x.length; });
        out.set(b.subarray(end), o);
        return out;
      }
      i = e.data + e.size;
    }
    return null;
  }

  function driveUrl(fileId) { return 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view'; }
  // The file id in a recording link the recorder wrote, or null for any
  // other link a leader pasted (which the page still links to as is).
  function driveId(url) {
    var m = /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,200})(?:[/?#]|$)/.exec(String(url || ''));
    return m ? m[1] : null;
  }
  // Where the session page's player reads a Drive recording: the site's
  // video relay (tools/video-relay), because Drive's own player refused a
  // viewer who was not signed in (meet@ test, October 28, 2026).
  function playUrl(url, relay) {
    var id = driveId(url);
    return id && relay ? String(relay).replace(/\/$/, '') + '/v/' + id : null;
  }

  // What the picker gave back, in the words a leader needs: a tab with
  // its sound is right; anything else says what to choose instead.
  function checkCapture(surface, audioTracks) {
    if (surface && surface !== 'browser') return 'That was a ' + (surface === 'monitor' ? 'whole screen' : 'window') + '. Choose the Meet tab instead, so the call’s sound comes with it.';
    if (!audioTracks) return 'The Meet tab came without its sound. Choose it again with “Also share tab audio” turned on.';
    return null;
  }

  var lib = {
    recordUrl: recordUrl, notice: notice, stopNotice: stopNotice, pickMime: pickMime, extension: extension,
    fileName: fileName, pieceName: pieceName, isPiece: isPiece, duration: duration, size: size,
    driveUrl: driveUrl, fixDuration: fixDuration, driveId: driveId, playUrl: playUrl, checkCapture: checkCapture, MIMES: MIMES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RecordLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
