// A host's sessions kept as files in their own Google Drive (Ben, November
// 28, 2026: "I approve keeping a non-cohort host's sessions in their own
// Google Drive. That aligns with the idea of all learners getting keep their
// own data too."). Only Drive's drive.file permission: the site reaches the
// files it made and nothing else. Each session is one JSON file in a "Human
// Shaped sessions" folder the person can open, move, share, or delete in
// Drive like any file; nothing is kept on humanshaped.org.
//
//   MyDrive.connect(email)            -> Promise<token>   (from a click)
//   MyDrive.list(token)               -> Promise<[{ id, name, modifiedTime }]>
//   MyDrive.save(token, session, id?) -> Promise<id>      (a new file, or that file)
//   MyDrive.open(token, id)           -> Promise<session>
//   MyDrive.session(title, talk)      -> a session in the file's own shape
(function (root) {
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var API = 'https://www.googleapis.com/drive/v3';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
  var KIND = 'human-shaped-session';
  var gis = null, held = null;

  function loadGoogle() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve(root.google.accounts.oauth2);
    if (gis) return gis;
    gis = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { root.google && root.google.accounts ? resolve(root.google.accounts.oauth2) : reject(new Error('Google did not load')); };
      s.onerror = function () { gis = null; reject(new Error('Google could not be reached')); };
      document.head.appendChild(s);
    });
    return gis;
  }

  function connect(email) {
    if (held && held.expires > Date.now() + 60000) return Promise.resolve(held.token);
    if (!root.HUB || !root.HUB.googleClientId) return Promise.reject(new Error('Google is not set up on this site'));
    return loadGoogle().then(function (oauth) {
      return new Promise(function (resolve, reject) {
        oauth.initTokenClient({
          client_id: root.HUB.googleClientId, scope: SCOPE, login_hint: email || undefined,
          callback: function (r) {
            if (!r || r.error || !r.access_token) return reject(new Error(r && r.error ? 'Google said ' + r.error.replace(/_/g, ' ') : 'Google did not connect Drive'));
            held = { token: r.access_token, expires: Date.now() + (+r.expires_in || 3600) * 1000 };
            resolve(r.access_token);
          },
          error_callback: function (e) {
            reject(new Error(e && e.type === 'popup_closed' ? 'The Google window closed before Drive was connected.' : e && e.type === 'popup_failed_to_open' ? 'The Google window could not open here.' : 'Google did not connect Drive.'));
          }
        }).requestAccessToken();
      });
    });
  }

  function call(token, method, url, body, type) {
    return fetch(url, { method: method, headers: Object.assign({ Authorization: 'Bearer ' + token }, body ? { 'Content-Type': type || 'application/json' } : {}), body: body })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
          if (!r.ok) throw new Error((j && j.error && j.error.message) || 'Drive answered ' + r.status);
          return j;
        });
      });
  }

  function folder(token) {
    var q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false and appProperties has { key='humanshaped' and value='sessions' }";
    return call(token, 'GET', API + '/files?fields=files(id)&pageSize=1&q=' + encodeURIComponent(q)).then(function (r) {
      if (r && r.files && r.files.length) return r.files[0].id;
      return call(token, 'POST', API + '/files?fields=id', JSON.stringify({
        name: 'Human Shaped sessions', mimeType: 'application/vnd.google-apps.folder', appProperties: { humanshaped: 'sessions' },
        description: 'Sessions you made for Google Meet with Human Shaped. Each is a file you own.'
      })).then(function (f) { return f.id; });
    });
  }

  function list(token) {
    var q = "trashed = false and appProperties has { key='humanshaped' and value='" + KIND + "' }";
    return call(token, 'GET', API + '/files?orderBy=modifiedTime%20desc&pageSize=50&fields=files(id,name,modifiedTime)&q=' + encodeURIComponent(q))
      .then(function (r) { return (r && r.files) || []; });
  }

  // One request with the file's details and its contents together.
  function multipart(meta, json) {
    var b = 'hs' + Math.random().toString(36).slice(2);
    return { type: 'multipart/related; boundary=' + b, body: '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
      '\r\n--' + b + '\r\nContent-Type: application/json\r\n\r\n' + JSON.stringify(json, null, 1) + '\r\n--' + b + '--' };
  }

  function save(token, s, id) {
    var name = (String(s.title || '').trim() || 'A session').slice(0, 120) + '.json';
    if (id) {
      var m = multipart({ name: name }, s);
      return call(token, 'PATCH', UPLOAD + '/' + encodeURIComponent(id) + '?uploadType=multipart&fields=id', m.body, m.type).then(function (f) { return f.id; });
    }
    return folder(token).then(function (parent) {
      var m = multipart({ name: name, parents: [parent], mimeType: 'application/json', appProperties: { humanshaped: KIND } }, s);
      return call(token, 'POST', UPLOAD + '?uploadType=multipart&fields=id', m.body, m.type).then(function (f) { return f.id; });
    });
  }

  function open(token, id) {
    return call(token, 'GET', API + '/files/' + encodeURIComponent(id) + '?alt=media').then(function (s) {
      if (!s || s.kind !== KIND || !Array.isArray(s.parts)) throw new Error('That file is not a Human Shaped session.');
      return s;
    });
  }

  function session(title, talk) {
    return { kind: KIND, version: 1, title: String(title || '').slice(0, 120), parts: [{ kind: 'talk', title: 'Slides', slides: String(talk || '') }] };
  }
  // A session's slides, from its first part that has them.
  function talkOf(s) { var p = (s && s.parts || []).filter(function (x) { return typeof x.slides === 'string'; })[0]; return p ? p.slides : ''; }

  root.MyDrive = { connect: connect, list: list, save: save, open: open, session: session, talkOf: talkOf, KIND: KIND };
})(typeof window !== 'undefined' ? window : this);
