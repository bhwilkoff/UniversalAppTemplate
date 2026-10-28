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

  // The first format this browser records, best first. VP9 keeps a
  // shared screen sharp at a low rate; Opus carries the voices.
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

  function driveUrl(fileId) { return 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view'; }

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
    driveUrl: driveUrl, checkCapture: checkCapture, MIMES: MIMES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.RecordLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
