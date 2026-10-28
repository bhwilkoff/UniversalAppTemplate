// Saving an exchange video in the person's own Google Drive (Ben, October
// 11, 2026: "the uploads should be directly to the Google Drive account
// that you logged in with and then embedded dirctly into the page").
//
// The site asks only for Drive's `drive.file` permission, which reaches
// the files this site makes and nothing else in the person's Drive. Each
// video goes into a "Human Shaped exchanges" folder, up in 8 MiB pieces
// that pick up where they stopped if the connection drops, and is then
// shared so anyone with its link can watch it, which is what lets the
// exchange page embed it. Nothing passes through humanshaped.org.
//
//   ExchangeDrive.connect(email)                -> Promise<token>
//   ExchangeDrive.save(token, blob, meta, onProgress(0..1)) -> Promise<fileId>
//   ExchangeDrive.share(token, fileId)          -> Promise<fileId>
(function () {
  var X = window.ExchangeLib;
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var API = 'https://www.googleapis.com/drive/v3';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  var FOLDER = 'Human Shaped exchanges';
  var gis = null, held = null;

  function loadGoogle() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve(window.google.accounts.oauth2);
    if (gis) return gis;
    gis = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { window.google && window.google.accounts ? resolve(window.google.accounts.oauth2) : reject(new Error('Google did not load')); };
      s.onerror = function () { gis = null; reject(new Error('Google could not be reached')); };
      document.head.appendChild(s);
    });
    return gis;
  }

  // Asks Google for a Drive token, suggesting the account the person signed
  // in with. Must be called from a click, or the browser blocks the window.
  function connect(email) {
    if (held && held.expires > Date.now() + 60000) return Promise.resolve(held.token);
    if (!window.HUB || !window.HUB.googleClientId) return Promise.reject(new Error('Google is not set up on this site'));
    return loadGoogle().then(function (oauth) {
      return new Promise(function (resolve, reject) {
        oauth.initTokenClient({
          client_id: window.HUB.googleClientId,
          scope: SCOPE,
          login_hint: email || undefined,
          callback: function (r) {
            if (!r || r.error || !r.access_token) return reject(new Error(r && r.error ? 'Google said ' + r.error.replace(/_/g, ' ') : 'Google did not connect Drive'));
            held = { token: r.access_token, expires: Date.now() + (+r.expires_in || 3600) * 1000 };
            resolve(r.access_token);
          },
          error_callback: function (e) { reject(new Error(e && e.type === 'popup_closed' ? 'the Google window was closed before Drive was connected' : 'Google did not connect Drive')); }
        }).requestAccessToken();
      });
    });
  }

  function call(token, method, url, body) {
    return fetch(url, {
      method: method,
      headers: Object.assign({ Authorization: 'Bearer ' + token }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
        if (!r.ok) throw new Error((j && j.error && j.error.message) || 'Drive answered ' + r.status);
        return j;
      });
    });
  }

  // The folder this site made before, or a new one. drive.file can see
  // only what this site made, so the search never reads anything else.
  // The session recorder (/record/) passes its own folder in meta.folder.
  var EXCHANGES = { key: 'exchanges', name: FOLDER, description: 'Videos you recorded for exchanges on humanshaped.org. Anyone with a video\'s link can watch it.' };
  function folder(token, spec) {
    spec = spec || EXCHANGES;
    var q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false and appProperties has { key='humanshaped' and value='" + spec.key + "' }";
    return call(token, 'GET', API + '/files?fields=files(id)&pageSize=1&q=' + encodeURIComponent(q)).then(function (r) {
      if (r && r.files && r.files.length) return r.files[0].id;
      return call(token, 'POST', API + '/files?fields=id', {
        name: spec.name, mimeType: 'application/vnd.google-apps.folder', appProperties: { humanshaped: spec.key },
        description: spec.description
      }).then(function (f) { return f.id; });
    });
  }

  function begin(token, blob, meta, parent) {
    return fetch(UPLOAD + '?uploadType=resumable&fields=id', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': X.baseType(blob.type || meta.mime),
        'X-Upload-Content-Length': String(blob.size)
      },
      body: JSON.stringify(Object.assign({
        name: meta.name, parents: [parent], mimeType: X.baseType(blob.type || meta.mime),
        description: meta.description || '', appProperties: { humanshaped: meta.kind || 'exchange-video' }
      }, meta.thumbnail ? { contentHints: { thumbnail: { image: meta.thumbnail, mimeType: 'image/jpeg' } } } : {}))
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error('Drive would not start the upload (' + r.status + ')' + (t ? ': ' + t.slice(0, 160) : '')); });
      var where = r.headers.get('Location');
      if (!where) throw new Error('Drive did not say where to send the video');
      return where;
    });
  }

  // One piece, with progress. Resolves { done: id } or { next: offset }.
  function put(where, blob, start, onProgress) {
    var end = X.chunkEnd(start, blob.size);
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', where);
      xhr.setRequestHeader('Content-Range', 'bytes ' + start + '-' + (end - 1) + '/' + blob.size);
      xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress((start + e.loaded) / blob.size); };
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 201) {
          try { return resolve({ done: JSON.parse(xhr.responseText).id }); } catch (e) { return reject(new Error('Drive finished but did not name the file')); }
        }
        if (xhr.status === 308) return resolve({ next: X.resumeFrom(xhr.getResponseHeader('Range')) || end });
        reject(Object.assign(new Error('Drive stopped the upload (' + xhr.status + ')'), { status: xhr.status }));
      };
      xhr.onerror = function () { reject(Object.assign(new Error('the connection dropped'), { network: true })); };
      xhr.send(blob.slice(start, end));
    });
  }

  // Where to start again after a dropped piece.
  function ask(where, size) {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', where);
      xhr.setRequestHeader('Content-Range', 'bytes */' + size);
      xhr.onload = function () {
        if (xhr.status === 200 || xhr.status === 201) { try { return resolve({ done: JSON.parse(xhr.responseText).id }); } catch (e) { /* fall through */ } }
        resolve({ next: X.resumeFrom(xhr.getResponseHeader('Range')) });
      };
      xhr.onerror = function () { resolve(null); };
      xhr.send();
    });
  }

  function send(where, blob, onProgress) {
    var tries = 0;
    function step(start) {
      return put(where, blob, start, onProgress).then(function (r) {
        tries = 0;
        return r.done ? r.done : step(r.next);
      }, function (e) {
        if (!(e.network || e.status >= 500) || ++tries > 5) throw e;
        return new Promise(function (r) { setTimeout(r, 1000 * Math.pow(2, tries)); }).then(function () {
          return ask(where, blob.size);
        }).then(function (s) {
          if (s && s.done) return s.done;
          return step(s ? s.next : start);
        });
      });
    }
    return step(0);
  }

  // A frame about a second in, as Drive's fallback picture. Drive makes
  // its own picture when it can and uses this only when it cannot, as with
  // the fragmented, rotated MP4 that Safari on a phone records. Resolves
  // to URL-safe base64 JPEG, or null; never holds up the upload more than
  // four seconds.
  function frame(blob) {
    return new Promise(function (resolve) {
      var url = null, done = false, v = document.createElement('video');
      function finish(out) {
        if (done) return;
        done = true;
        try { v.removeAttribute('src'); v.load(); } catch (e) { /* gone */ }
        if (url) URL.revokeObjectURL(url);
        resolve(out);
      }
      setTimeout(function () { finish(null); }, 4000);
      try {
        url = URL.createObjectURL(blob);
        v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.onloadeddata = function () {
          var d = isFinite(v.duration) ? v.duration : 2;
          v.currentTime = Math.min(1, d / 2);
        };
        v.onseeked = function () {
          try {
            var w = v.videoWidth, h = v.videoHeight, scale = Math.min(1, 640 / Math.max(w, h));
            if (!w || !h) return finish(null);
            var c = document.createElement('canvas');
            c.width = Math.round(w * scale); c.height = Math.round(h * scale);
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            var data = c.toDataURL('image/jpeg', 0.8).split(',')[1] || '';
            finish(data ? data.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : null);
          } catch (e) { finish(null); }
        };
        v.onerror = function () { finish(null); };
        v.src = url;
      } catch (e) { finish(null); }
    });
  }

  function save(token, blob, meta, onProgress) {
    onProgress = onProgress || function () {};
    return Promise.all([folder(token, meta.folder), meta.thumbnail === undefined ? frame(blob) : meta.thumbnail]).then(function (got) {
      return begin(token, blob, Object.assign({}, meta, { thumbnail: got[1] }), got[0]);
    }).then(function (where) {
      return send(where, blob, onProgress);
    }).then(function (id) {
      onProgress(1);
      return share(token, id);
    });
  }

  // Anyone with the link may watch. Also used to share a video again after
  // its owner stopped sharing it in Drive; drive.file still reaches it,
  // since this site made it.
  function share(token, id) {
    return call(token, 'POST', API + '/files/' + id + '/permissions?fields=id', { role: 'reader', type: 'anyone' }).then(function () { return id; });
  }

  window.ExchangeDrive = { connect: connect, save: save, share: share, frame: frame };
})();
