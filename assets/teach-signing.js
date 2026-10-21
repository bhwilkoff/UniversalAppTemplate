// Credentials waiting to be signed, for a signer (/teach/signing/;
// PAGES.md; migration 20261004040000).
(function () {
  var root = document.querySelector('[data-teach-signing]');
  if (!root || !window.supabase || !window.HUB || !window.TeachPage) return;
  var P = window.TeachPage, el = P.el;
  var cred = window.CredentialLib;
  var db = null;
  function $(sel) { return root.querySelector(sel); }

  function linkList(items) {
    var ul = el('ul', 'links');
    items.forEach(function (x) {
      var li = el('li'); var a = el('a', null, x[0]); a.href = x[1]; a.rel = 'noopener';
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }

  // The recognitions a credential carries as evidence (migration
  // 20261006020000), so the teacher and the signer see what will be
  // signed with the work.
  function recognitionList(recs) {
    if (!recs || !recs.length) return null;
    var wrap = el('div', 'credential-recognitions');
    wrap.appendChild(el('p', 'small', 'Recognized in class, and named in its evidence:'));
    var ul = el('ul', 'links');
    recs.forEach(function (r) {
      var e = cred.recognitionEvidence(r);
      var li = el('li'); li.appendChild(el('span', null, r.skill)); li.appendChild(el('span', 'small', ' ' + e.narrative));
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    return wrap;
  }

  // ---- signing, for a signer (migration 20261004040000) --------------
  // Every credential waiting to be signed, across cohorts. The signer
  // copies its request, signs it on the computer that holds the key
  // (tools/credential/sign-waiting.mjs), and pastes or chooses the signed
  // file, which is checked here before the database takes it.
  function loadSigning() {
    if (!cred) return Promise.resolve();
    return Promise.all([db.rpc('credentials_to_sign'), db.rpc('credential_recognitions_to_sign')]).then(function (res) {
      var r = res[0], box = $('[data-signing-list]');
      var err = r.error || res[1].error;
      if (err) { box.replaceChildren(el('p', 'small error', 'What is waiting to be signed could not be loaded: ' + err.message)); return; }
      box.replaceChildren();
      if (!r.data.length) { box.appendChild(el('p', 'small', 'Nothing is waiting to be signed right now.')); return; }
      cred.withRecognitions(r.data, res[1].data).forEach(function (w) { box.appendChild(signingCard(w)); });
    });
  }
  function signingCard(w) {
    var card = el('article', 'cohort-card credential-person');
    var who = (w.display_name ? w.display_name + ' (@' + w.github_login + ')' : '@' + w.github_login);
    card.appendChild(el('p', 'who-line', who + ', ' + w.cohort_title));
    card.appendChild(el('p', 'small', cred.levelName(cred.levelFor(w.platforms)) + '. Recorded on ' +
      new Date(w.issued_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + '.'));
    var links = [['The repository', 'https://github.com/' + w.evidence_repo], ['On the web', w.app_url]];
    (w.platforms || []).slice(1).forEach(function (id) { links.push(['On ' + cred.platform(id).label, (w.platform_links || {})[id]]); });
    card.appendChild(linkList(links));
    var recs = recognitionList(w.recognitions);
    if (recs) card.appendChild(recs);
    var request = cred.requestFromWaiting(w);
    var msg = el('p', 'small'); msg.setAttribute('role', 'status');
    var copy = el('button', 'btn-secondary', 'Copy the signing request'); copy.type = 'button';
    var shown = el('textarea', 'signing-request'); shown.readOnly = true; shown.rows = 8; shown.hidden = true;
    shown.value = JSON.stringify(request, null, 2);
    copy.addEventListener('click', function () {
      var done = function () { msg.textContent = 'Copied. Now run ' + cred.SIGN_COMMAND + ' in the site folder, and paste what it puts on your clipboard below.'; };
      var fallback = function () { shown.hidden = false; shown.select(); msg.textContent = 'Copy the text above, then give it to the signing tool.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(shown.value).then(done, fallback); else fallback();
    });
    var form = el('form', 'inline-form');
    var label = el('label', null, 'The signed file');
    var pasted = el('textarea'); pasted.rows = 4; pasted.placeholder = 'Paste the signed credential here';
    label.appendChild(pasted); form.appendChild(label);
    var pick = el('label', 'btn-secondary file-pick', 'Or choose the file');
    var file = el('input'); file.type = 'file'; file.accept = '.json,application/json,application/ld+json';
    pick.appendChild(file);
    var save = el('button', 'btn-secondary', 'Check and attach it'); save.type = 'submit';
    var acts = el('div', 'actions'); acts.appendChild(copy); acts.appendChild(save); acts.appendChild(pick);
    form.appendChild(acts);
    function attach(text) {
      save.disabled = true;
      msg.textContent = 'Checking the signature…';
      Promise.resolve().then(function () {
        var doc = cred.readSigned(text);
        if (!cred.matchesRow(doc, request)) throw new Error('That file is not the signed credential for this record. Its words or links differ from what was recorded.');
        return window.CredentialCheck.check(doc).then(function (c) {
          if (!c.ok) throw new Error('Its signature does not check out. ' + c.reason);
          return db.rpc('attach_signed_credential', { credential: w.id, file: doc });
        });
      }).then(function (r) {
        if (r.error) throw new Error('It was not saved: ' + r.error.message);
        card.replaceChildren(el('p', 'who-line', who + ', ' + w.cohort_title),
          el('p', 'small', 'Signed and saved. Its holder can find it on their account page now.'));
      }).catch(function (err) { msg.textContent = err.message; save.disabled = false; file.value = ''; });
    }
    form.addEventListener('submit', function (ev) { ev.preventDefault(); attach(pasted.value); });
    file.addEventListener('change', function () { var f = file.files && file.files[0]; if (f) f.text().then(attach); });
    card.appendChild(form);
    card.appendChild(shown);
    card.appendChild(msg);
    return card;
  }

  var page = P.start(root, function (client, user, name, teacher) {
    db = client;
    if (!teacher.can_sign) return page.show('not-signer');
    return loadSigning();
  });
})();
