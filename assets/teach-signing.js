// Credentials waiting to be signed, for a signer (/teach/signing/;
// PAGES.md; migration 20261004040000). The signer chooses the key file
// from their own computer; the page reads it into memory, signs each
// credential, checks the signature against the published key list, and
// saves it. The key is never sent anywhere or kept after the visit.
(function () {
  var root = document.querySelector('[data-teach-signing]');
  if (!root || !window.supabase || !window.HUB || !window.TeachPage || !window.UI || !window.CredentialCheck) return;
  var P = window.TeachPage, U = window.UI, el = U.el;
  var cred = window.CredentialLib;
  var db = null, key = null, waiting = [], rowsById = {};
  function $(sel) { return root.querySelector(sel); }

  function readKey(text) {
    var k;
    try { k = JSON.parse(text); } catch (e) { return Promise.reject(new Error('That file is not a signing key.')); }
    if (!k || !k.secretKeyMultibase || !k.publicKeyMultibase || !k.id) return Promise.reject(new Error('That file is not a signing key.'));
    return window.CredentialCheck.didDocument().then(function (did) {
      var listed = (did.verificationMethod || []).some(function (m) { return m.id === k.id && m.publicKeyMultibase === k.publicKeyMultibase; });
      if (!listed) throw new Error('That key is not one humanshaped.org lists, so what it signs would not check out.');
      return k;
    });
  }
  function drawKey(problem) {
    $('[data-key-state]').replaceChildren(key ? U.status('done', 'Key ready') : problem ? U.status('alert', problem) : U.status('waiting', 'No key chosen'));
    $('[data-key-forget]').hidden = !key;
    $('[data-key-pick]').hidden = !!key;
    $('[data-sign-all]').disabled = !key || !waiting.length;
    Object.keys(rowsById).forEach(function (id) { var b = rowsById[id].button; if (b) b.disabled = !key; });
  }

  function evidence(w) {
    var ul = el('ul', 'links');
    var links = [['The repository', 'https://github.com/' + w.evidence_repo], ['On the web', w.app_url]];
    (w.platforms || []).slice(1).forEach(function (id) { links.push(['On ' + cred.platform(id).label, (w.platform_links || {})[id]]); });
    links.forEach(function (x) {
      if (!x[1]) return;
      var li = el('li'), a = el('a', null, x[0]); a.href = x[1]; a.rel = 'noopener';
      li.appendChild(a); ul.appendChild(li);
    });
    (w.recognitions || []).forEach(function (r) { ul.appendChild(el('li', null, 'Recognized in class: ' + r.skill)); });
    return ul;
  }

  function signOne(w) {
    var r = rowsById[w.id];
    r.button.disabled = true;
    r.side.replaceChildren(U.status('time', 'Signing'));
    return Promise.resolve().then(function () {
      var unsigned = cred.buildCredential(cred.requestFromWaiting(w));
      return window.CredentialCheck.sign(unsigned, key);
    }).then(function (signed) {
      return window.CredentialCheck.check(signed).then(function (c) {
        if (!c.ok) throw new Error(c.reason);
        return db.rpc('attach_signed_credential', { credential: w.id, file: signed });
      });
    }).then(function (res) {
      if (res.error) throw res.error;
      r.side.replaceChildren(U.status('done', 'Signed'), U.link('Its page', cred.credentialUrl(w.id), 'btn-secondary small'));
      waiting = waiting.filter(function (x) { return x.id !== w.id; });
      document.querySelector('[data-count]').replaceChildren(U.facts([['Waiting', String(waiting.length)]]));
      drawKey();
    }).catch(function (e) {
      r.side.replaceChildren(U.status('alert', 'Not signed: ' + P.said(e)), r.button);
      r.button.disabled = !key;
    });
  }

  function draw() {
    var box = $('[data-signing-list]');
    box.replaceChildren();
    rowsById = {};
    document.querySelector('[data-count]').replaceChildren(U.facts([['Waiting', String(waiting.length)]]));
    if (!waiting.length) { box.appendChild(U.empty('Nothing is waiting to be signed.')); drawKey(); return; }
    var list = U.rows();
    waiting.forEach(function (w) {
      var who = w.display_name ? w.display_name + ' (@' + w.github_login + ')' : '@' + w.github_login;
      var b = U.button('Sign', 'btn-secondary small', function () { signOne(w); });
      var item = U.row({
        title: who,
        meta: w.cohort_title + ', ' + cred.levelName(cred.levelFor(w.platforms)) + ', recorded ' + new Date(w.issued_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
        detail: U.disclosure('What it says', evidence(w)),
        actions: [b]
      });
      rowsById[w.id] = { button: b, side: item.querySelector('.ui-row-side') };
      list.appendChild(item);
    });
    box.appendChild(list);
    drawKey();
  }

  $('[data-key-file]').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then(readKey).then(function (k) { key = k; drawKey(); }, function (err) { key = null; drawKey(err.message); });
  });
  $('[data-key-forget]').addEventListener('click', function () { key = null; drawKey(); });
  $('[data-sign-all]').addEventListener('click', function () {
    waiting.slice().reduce(function (p, w) { return p.then(function () { return key ? signOne(w) : null; }); }, Promise.resolve());
  });
  window.addEventListener('pagehide', function () { key = null; });

  var page = P.start(root, function (client, user, name, teacher) {
    db = client;
    if (!teacher.can_sign) return page.show('not-signer');
    return Promise.all([db.rpc('credentials_to_sign'), db.rpc('credential_recognitions_to_sign')]).then(function (res) {
      var err = res[0].error || res[1].error;
      if (err) return page.fail('What is waiting could not be read: ' + err.message);
      waiting = cred.withRecognitions(res[0].data, res[1].data);
      draw();
    });
  });
})();
