// The public credential page (/credential/?id=<id>) and the key status on
// the issuer page (/credential/issuer/). Everything the credential page
// shows is read from the signed file itself, so what you see is what was
// signed, and the signature is checked here before the page calls it so.
(function () {
  var lib = window.CredentialLib;
  var checker = window.CredentialCheck;
  if (!lib || !checker) return;

  // ---- the issuer page: is a signing key published yet? -------------
  var keyStatus = document.querySelector('[data-key-status]');
  if (keyStatus) {
    checker.didDocument().then(function (did) {
      var keys = (did.verificationMethod || []).length;
      keyStatus.textContent = keys
        ? 'humanshaped.org publishes ' + (keys === 1 ? 'one signing key' : keys + ' signing keys') + ' there now, and every credential it has signed can be checked against ' + (keys === 1 ? 'it' : 'them') + '.'
        : 'The signing key has not been made yet, so no credential has been signed so far. The first will be signed when the first cohort finishes.';
    }, function () {
      keyStatus.textContent = 'The list of signing keys could not be read just now.';
    });
  }

  var root = document.querySelector('[data-credential]');
  if (!root) return;
  function $(sel) { return root.querySelector(sel); }
  function show(state) {
    root.querySelectorAll(':scope > [data-state]').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function day(iso) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  var id = new URLSearchParams(location.search).get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return show('none');
  if (!window.supabase || !window.HUB) return show('error');
  var db = window.supabase.createClient(window.HUB.url, window.HUB.key, { auth: { persistSession: false } });

  db.rpc('public_credential', { credential: id.toLowerCase() }).then(function (r) {
    if (r.error) return show('error');
    var row = r.data && r.data[0];
    if (!row) return show('missing');
    if (row.state === 'waiting') return show('waiting');
    if (row.state === 'revoked') {
      $('[data-revoked-when]').textContent = row.revoked_at ? 'on ' + day(row.revoked_at) : '';
      return show('revoked');
    }
    draw(row.signed);
  }, function () { show('error'); });

  function draw(doc) {
    var d = lib.describe(doc);
    document.title = d.title + ' | Human Shaped';
    $('[data-title]').textContent = d.title;
    var earned = $('[data-earned]');
    earned.replaceChildren();
    if (d.login) {
      var a = el('a', null, d.name); a.href = 'https://github.com/' + encodeURIComponent(d.login);
      earned.appendChild(a);
    } else earned.appendChild(document.createTextNode(d.name));
    earned.appendChild(document.createTextNode(' earned it ' + d.description.replace(/^For /, 'for ')));
    $('[data-issued]').textContent = 'Issued by humanshaped.org' + (d.validFrom ? ' on ' + day(d.validFrom) : '') + '.';

    var list = $('[data-evidence]');
    list.replaceChildren();
    d.evidence.forEach(function (e) {
      var li = el('li');
      if (/^https:\/\//.test(e.url)) {
        var a = el('a', null, e.name); a.href = e.url; a.rel = 'noopener';
        li.appendChild(a);
        li.appendChild(el('span', 'small', e.url.replace(/^https:\/\//, '').replace(/\/$/, '')));
      } else li.appendChild(el('span', null, e.name));
      list.appendChild(li);
    });

    $('[data-achievement]').textContent = d.achievement;
    $('[data-criteria]').textContent = d.criteria;
    if (d.level) $('[data-criteria-link]').href = '/credential/issuer/#level-' + d.level;

    $('[data-download]').onclick = function () {
      var blob = new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/ld+json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'humanshaped-credential-' + id.toLowerCase() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('[data-copy-link]').onclick = function () {
      var say = function (t) { $('[data-keep-message]').textContent = t; };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { say('Copied.'); }, function () { say(location.href); });
      else say(location.href);
    };
    show('signed');

    checker.check(doc).then(function (result) {
      root.querySelectorAll('[data-check]').forEach(function (p) {
        p.hidden = p.getAttribute('data-check') !== (result.ok ? 'ok' : 'bad');
      });
      if (!result.ok) $('[data-check-reason]').textContent = result.reason;
    });
  }
})();
