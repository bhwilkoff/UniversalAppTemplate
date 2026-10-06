// The credential's pure logic, shared by the signing tool
// (tools/credential/), the teacher page (/teach/), and the public
// credential page (/credential/). It builds an Open Badges 3.0
// credential from a credential row, and signs and checks it with a
// Data Integrity proof using the eddsa-rdfc-2022 cryptosuite
// (research/notes/credential-build-notes.md).
//
// Two things are handed in rather than built here, so that this file
// runs the same in Node and in a browser: `canonize`, which turns a
// JSON-LD document into canonical N-Quads (the jsonld library does
// this, with the contexts kept on this site), and `subtle`, the Web
// Crypto interface that both Node and browsers provide for Ed25519 and
// SHA-256. Tested in tools/test/credential-lib.test.mjs and, with the
// real canonicalization, in tools/credential/test/.
(function (root) {
  var SITE = 'https://humanshaped.org';
  var ISSUER_DID = 'did:web:humanshaped.org';
  var CONTEXTS = [
    'https://www.w3.org/ns/credentials/v2',
    'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
  ];
  // Where this site keeps its own copy of each context, so that nothing
  // is fetched from anywhere else while a credential is checked.
  var CONTEXT_FILES = {};
  CONTEXT_FILES[CONTEXTS[0]] = '/credential/contexts/credentials-v2.json';
  CONTEXT_FILES[CONTEXTS[1]] = '/credential/contexts/ob-v3p0-context-3.0.3.json';

  // The platforms an app can be published on. The web comes first and is
  // the one every credential needs (DECISIONS.md, "The credential"); each
  // further platform adds a level. The ids are stored in
  // public.credentials.platforms, and the migration checks the same list.
  var PLATFORMS = [
    { id: 'web', label: 'The web' },
    { id: 'iphone-ipad', label: 'iPhone and iPad' },
    { id: 'mac', label: 'Mac' },
    { id: 'apple-tv', label: 'Apple TV' },
    { id: 'vision-pro', label: 'Apple Vision Pro' },
    { id: 'android', label: 'Android' },
    { id: 'google-tv', label: 'Google TV and Android TV' },
    { id: 'fire-tv', label: 'Fire TV' },
    { id: 'roku', label: 'Roku' },
    { id: 'windows', label: 'Windows' }
  ];
  var NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  function platform(id) {
    for (var i = 0; i < PLATFORMS.length; i++) if (PLATFORMS[i].id === id) return PLATFORMS[i];
    return null;
  }

  var ISSUER = {
    id: ISSUER_DID,
    type: ['Profile'],
    name: 'Human Shaped',
    url: SITE + '/credential/issuer/',
    description: 'humanshaped.org, the home of free cohorts for building software for people rather than for profit.'
  };

  // The words of each level. Drafted by Claude for milestone M4, awaiting
  // Ben's review.
  var CRITERIA = 'The holder took part in a cohort at humanshaped.org and built an app for a ' +
    'human-shaped problem, one that belongs to people rather than to computers. The evidence ' +
    'is the app’s repository, which holds the app and the record of how it was made, and ' +
    'an app live on the web at a real address is enough for the first level. Each further ' +
    'platform the app is published on, where other people can get it for themselves, adds a ' +
    'level. A teacher of the cohort opened the repository and every link before this ' +
    'credential was issued.';

  function levelName(level) {
    return level === 1
      ? 'Human-shaped software, live on the web'
      : 'Human-shaped software, live on ' + NUMBERS[level] + ' platforms';
  }
  function levelDescription(level) {
    var base = 'Built an app for a human-shaped problem in a cohort at humanshaped.org, and put it live on the web';
    return level === 1
      ? base + ', at an address anyone can open.'
      : base + ' and on ' + NUMBERS[level - 1] + ' more platform' + (level > 2 ? 's' : '') + ', where other people can get it for themselves.';
  }

  function achievementUrl(level) { return SITE + '/credential/achievements/level-' + level + '.json'; }

  function achievement(level) {
    if (!(level >= 1 && level <= PLATFORMS.length)) throw new Error('There is no level ' + level + '.');
    return {
      id: achievementUrl(level),
      type: ['Achievement'],
      achievementType: 'Achievement',
      name: levelName(level),
      description: levelDescription(level),
      criteria: { id: SITE + '/credential/issuer/#level-' + level, narrative: CRITERIA },
      image: { id: SITE + '/credential/badge.png', type: 'Image', caption: 'The human-shaped mark' }
    };
  }

  // The file published at /credential/achievements/level-N.json.
  function achievementDocument(level) {
    var doc = { '@context': CONTEXTS.slice() };
    var a = achievement(level);
    Object.keys(a).forEach(function (k) { doc[k] = a[k]; });
    return doc;
  }

  // ---- a credential row, checked ------------------------------------
  // The shape the teacher page copies and the signing tool reads:
  //   { credential, issued_at, person: { github_login, name },
  //     cohort: { title }, app: { name, repo, url }, platforms: [...],
  //     links: { <platform>: "https://..." },
  //     recognitions: [{ skill, by, week, moment }] }
  // `app.url` is the live web app; `links` holds every other platform.
  // `recognitions` are the skills a teacher recognized in class (R16),
  // copied onto the record by the database (migration 20261006020000);
  // a request without them has none.
  var REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var LOGIN = /^[A-Za-z0-9-]{1,39}$/;
  function isHttps(u) {
    if (typeof u !== 'string' || !/^https:\/\//.test(u)) return false;
    try { new URL(u); return true; } catch (e) { return false; }
  }

  function problems(row) {
    var out = [];
    if (!row || typeof row !== 'object') return ['There is no credential to read.'];
    if (!UUID.test(row.credential || '')) out.push('The credential has no id from the hub.');
    if (!row.issued_at || isNaN(Date.parse(row.issued_at))) out.push('The credential has no date it was issued.');
    var p = row.person || {};
    if (!LOGIN.test(p.github_login || '')) out.push('The person has no GitHub username.');
    var app = row.app || {};
    if (!REPO.test(app.repo || '')) out.push('The app has no repository, written as owner/name.');
    if (!isHttps(app.url)) out.push('The app has no live address on the web that starts with https://.');
    var platforms = row.platforms || [];
    if (platforms[0] !== 'web') out.push('Every credential starts with the web, so the web comes first in the platforms.');
    var seen = {};
    platforms.forEach(function (id) {
      if (!platform(id)) out.push('"' + id + '" is not one of the platforms.');
      else if (seen[id]) out.push(platform(id).label + ' is listed twice.');
      seen[id] = true;
      if (id !== 'web' && platform(id) && !isHttps((row.links || {})[id])) out.push(platform(id).label + ' needs a link where people can get the app, starting with https://.');
    });
    Object.keys(row.links || {}).forEach(function (id) {
      if (!seen[id]) out.push('There is a link for ' + id + ', which is not one of the platforms chosen.');
    });
    var recs = row.recognitions == null ? [] : row.recognitions;
    if (!Array.isArray(recs) || recs.length > MAX_RECOGNITIONS) out.push('The recognitions should be a list of at most ' + MAX_RECOGNITIONS + '.');
    else recs.forEach(function (r, i) {
      var n = 'Recognition ' + (i + 1);
      if (!r || typeof r !== 'object') { out.push(n + ' is not a recognition.'); return; }
      if (typeof r.skill !== 'string' || !r.skill.trim() || r.skill.length > 120) out.push(n + ' has no skill, or one longer than 120 characters.');
      if (r.by != null && (typeof r.by !== 'string' || r.by.length > 200)) out.push(n + ' names who gave it in a way that cannot be read.');
      if (r.week != null && !(Number.isInteger(r.week) && r.week > 0)) out.push(n + ' has a week that is not a number.');
      if (r.moment != null && (typeof r.moment !== 'string' || r.moment.length > 300)) out.push(n + ' has a moment longer than 300 characters.');
    });
    return out;
  }

  // ---- recognitions as evidence ---------------------------------------
  // Each skill a teacher recognized in class (R16; DECISIONS.md,
  // "Recognitions in the credential") is named in the evidence, with who
  // recognized it and when. It has no link: the moment was in class.
  var MAX_RECOGNITIONS = 30;
  var RECOGNIZED = 'Recognized in class';
  var RECOGNIZED_PREFIX = RECOGNIZED + ': ';
  function oneLine(t) { return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }
  function recognitionEvidence(r) {
    var by = oneLine(r.by) || 'a teacher';
    var moment = oneLine(r.moment).replace(/[.!?]+$/, '');
    var when = moment ? '. ' + moment : (r.week ? ', in week ' + r.week : ', in class');
    return {
      type: ['Evidence'],
      name: RECOGNIZED_PREFIX + oneLine(r.skill),
      genre: RECOGNIZED,
      narrative: 'Recognized by ' + by + when + '.'
    };
  }

  function levelFor(platforms) { return (platforms || []).length; }

  function credentialUrl(id) { return SITE + '/credential/?id=' + id; }

  function evidence(row) {
    var app = row.app;
    var name = app.name || app.repo.split('/')[1];
    var list = [{
      id: 'https://github.com/' + app.repo,
      type: ['Evidence'],
      name: 'The repository for ' + name,
      genre: 'Repository',
      narrative: 'Where the app and the record of how it was made live, in the holder’s own GitHub account.'
    }, {
      id: app.url,
      type: ['Evidence'],
      name: name + ' on the web',
      genre: 'Live app'
    }];
    row.platforms.slice(1).forEach(function (id) {
      list.push({ id: row.links[id], type: ['Evidence'], name: name + ' on ' + platform(id).label, genre: 'Published app' });
    });
    (row.recognitions || []).forEach(function (r) { list.push(recognitionEvidence(r)); });
    return list;
  }

  function stamp(iso) { return new Date(iso).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

  // The credential, without its proof, exactly as the signing tool signs
  // it and as /teach/ expects to find it when the signed file comes back.
  function buildCredential(row) {
    var wrong = problems(row);
    if (wrong.length) throw new Error(wrong.join(' '));
    var level = levelFor(row.platforms);
    var name = (row.person.name || '').trim() || row.person.github_login;
    var appName = (row.app.name || '').trim() || row.app.repo.split('/')[1];
    var c = {
      '@context': CONTEXTS.slice(),
      id: credentialUrl(row.credential),
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      name: levelName(level),
      description: 'For ' + appName + (row.cohort && row.cohort.title ? ', built in ' + row.cohort.title.trim() : '') + '.',
      issuer: JSON.parse(JSON.stringify(ISSUER)),
      validFrom: stamp(row.issued_at),
      credentialSubject: {
        id: 'https://github.com/' + row.person.github_login,
        type: ['AchievementSubject'],
        identifier: [{ type: 'IdentityObject', identityType: 'name', hashed: false, identityHash: name }],
        achievement: achievement(level)
      },
      evidence: evidence(row)
    };
    return c;
  }

  // ---- the hub's records ----------------------------------------------
  // A public.credentials row, with the person's profile and the cohort,
  // in the shape the signing tool reads (the "signing request").
  function requestFromRecord(rec, profile, cohort) {
    var links = {};
    Object.keys(rec.platform_links || {}).forEach(function (k) { links[k] = rec.platform_links[k]; });
    return {
      credential: rec.id,
      // Postgres gives microseconds, which not every browser parses; the
      // credential is dated to the second anyway.
      issued_at: String(rec.issued_at).replace(/\.\d+/, ''),
      person: { github_login: profile.github_login, name: profile.display_name || null },
      cohort: { title: cohort.title },
      app: { name: rec.app_name || null, repo: rec.evidence_repo, url: rec.app_url },
      platforms: (rec.platforms || []).slice(),
      links: links,
      recognitions: (rec.recognitions || []).map(function (r) {
        return { skill: r.skill, by: r.by == null ? null : r.by, week: r.week == null ? null : r.week, moment: r.moment == null ? null : r.moment };
      })
    };
  }

  // Where one person's credential stands in a cohort, from all the
  // records for them there: the live one if there is one, or else the
  // most recently revoked.
  function recordState(records) {
    var live = (records || []).filter(function (r) { return !r.revoked_at; })[0];
    if (live) return { state: live.signed ? 'signed' : 'waiting', record: live };
    var revoked = (records || []).slice().sort(function (a, b) { return (b.revoked_at || '').localeCompare(a.revoked_at || ''); })[0];
    return revoked ? { state: 'revoked', record: revoked } : { state: 'none', record: null };
  }

  // A credential waiting to be signed, as public.credentials_to_sign()
  // returns it to a signer (migration 20261004040000), becomes the same
  // signing request /teach/ makes for a cohort's own teachers.
  function requestFromWaiting(w) {
    return requestFromRecord(w, { github_login: w.github_login, display_name: w.display_name }, { title: w.cohort_title });
  }

  // credentials_to_sign() and credential_recognitions_to_sign() are two
  // lists of the same credentials; each waiting one takes its
  // recognitions from the second.
  function withRecognitions(waiting, recs) {
    var by = {};
    (recs || []).forEach(function (r) { by[r.id] = r.recognitions || []; });
    return (waiting || []).map(function (w) {
      var copy = {};
      Object.keys(w).forEach(function (k) { copy[k] = w[k]; });
      copy.recognitions = by[w.id] || [];
      return copy;
    });
  }

  // The one command a signer runs on their own computer (tools/credential/).
  var SIGN_COMMAND = 'node tools/credential/sign-waiting.mjs';

  // Where one record stands, for the person who holds it.
  function standing(rec) {
    if (!rec) return 'none';
    if (rec.revoked_at) return 'revoked';
    return rec.signed ? 'signed' : 'waiting';
  }

  // A signed file pasted or chosen by a signer, read as JSON, with the
  // reason in plain words when it is not.
  function readSigned(text) {
    var doc;
    try { doc = JSON.parse(String(text || '')); } catch (e) { throw new Error('That is not a signed credential file. It should be the JSON the signing tool printed.'); }
    if (!doc || typeof doc !== 'object' || !doc.proof) throw new Error('That has no signature in it. It should be the JSON the signing tool printed.');
    return doc;
  }

  // ---- reading a signed credential, for people ----------------------
  function describe(doc) {
    var s = doc.credentialSubject || {};
    var ids = s.identifier || [];
    var nameObj = ids.filter(function (x) { return x.identityType === 'name' && !x.hashed; })[0];
    var login = typeof s.id === 'string' && s.id.indexOf('https://github.com/') === 0 ? s.id.slice(19) : null;
    var a = s.achievement || {};
    var level = /level-(\d+)\.json$/.exec(a.id || '');
    return {
      title: a.name || doc.name || 'A credential',
      name: nameObj ? nameObj.identityHash : (login || 'Someone'),
      login: login,
      description: doc.description || '',
      achievement: a.description || '',
      criteria: a.criteria ? a.criteria.narrative : '',
      criteriaUrl: a.criteria ? a.criteria.id : null,
      level: level ? Number(level[1]) : null,
      validFrom: doc.validFrom || null,
      evidence: (doc.evidence || []).filter(function (e) { return e.genre !== RECOGNIZED; })
        .map(function (e) { return { url: e.id, name: e.name || e.id, genre: e.genre || '' }; }),
      recognitions: (doc.evidence || []).filter(function (e) { return e.genre === RECOGNIZED; }).map(function (e) {
        var n = String(e.name || '');
        return { skill: n.indexOf(RECOGNIZED_PREFIX) === 0 ? n.slice(RECOGNIZED_PREFIX.length) : n, narrative: e.narrative || '' };
      })
    };
  }

  // A stable form of a JSON value, for comparing two documents.
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }

  // Does this signed file say exactly what the row says? (Everything but
  // the proof must match what buildCredential makes from the row.)
  function matchesRow(signed, row) {
    if (!signed || typeof signed !== 'object' || !signed.proof) return false;
    var copy = {};
    Object.keys(signed).forEach(function (k) { if (k !== 'proof') copy[k] = signed[k]; });
    return stable(copy) === stable(buildCredential(row));
  }

  // ---- base58btc and Multikey ---------------------------------------
  var B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function base58Encode(bytes) {
    var digits = [0];
    for (var i = 0; i < bytes.length; i++) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    var out = '';
    for (var k = 0; k < bytes.length && bytes[k] === 0; k++) out += '1';
    for (var q = digits.length - 1; q >= 0; q--) out += B58[digits[q]];
    return bytes.length ? out : '';
  }
  function base58Decode(text) {
    var bytes = [0];
    for (var i = 0; i < text.length; i++) {
      var value = B58.indexOf(text[i]);
      if (value < 0) throw new Error('That is not base58.');
      var carry = value;
      for (var j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
    }
    for (var k = 0; k < text.length && text[k] === '1'; k++) bytes.push(0);
    return new Uint8Array(bytes.reverse());
  }
  function multibase(bytes) { return 'z' + base58Encode(bytes); }
  function fromMultibase(text) {
    if (typeof text !== 'string' || text[0] !== 'z') throw new Error('Only base58btc multibase values (starting with z) are read here.');
    return base58Decode(text.slice(1));
  }
  function withHeader(a, b, key) {
    var out = new Uint8Array(key.length + 2);
    out[0] = a; out[1] = b; out.set(key, 2);
    return out;
  }
  // Ed25519 public keys carry the multicodec header 0xed 0x01, and secret
  // keys 0x80 0x26 (W3C Controlled Identifiers, Multikey).
  function publicKeyMultibase(raw) { return multibase(withHeader(0xed, 0x01, raw)); }
  function secretKeyMultibase(seed) { return multibase(withHeader(0x80, 0x26, seed)); }
  function rawKey(mb, a, b, what) {
    var bytes = fromMultibase(mb);
    if (bytes.length !== 34 || bytes[0] !== a || bytes[1] !== b) throw new Error('That is not an Ed25519 ' + what + ' key.');
    return bytes.slice(2);
  }
  function publicKeyBytes(mb) { return rawKey(mb, 0xed, 0x01, 'public'); }
  function secretKeyBytes(mb) { return rawKey(mb, 0x80, 0x26, 'secret'); }

  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64url(text) {
    var s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // A new Ed25519 key, as a Multikey with its secret (for the signing
  // tool only: the secret never belongs in this repository or a browser).
  function generateKey(subtle, fragment) {
    return subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']).then(function (pair) {
      return subtle.exportKey('jwk', pair.privateKey);
    }).then(function (jwk) {
      return {
        '@context': 'https://w3id.org/security/multikey/v1',
        id: ISSUER_DID + '#' + (fragment || 'key-1'),
        type: 'Multikey',
        controller: ISSUER_DID,
        publicKeyMultibase: publicKeyMultibase(fromB64url(jwk.x)),
        secretKeyMultibase: secretKeyMultibase(fromB64url(jwk.d))
      };
    });
  }
  function publicPart(key) {
    return { id: key.id, type: 'Multikey', controller: key.controller, publicKeyMultibase: key.publicKeyMultibase };
  }
  function importPrivate(subtle, key) {
    var jwk = { kty: 'OKP', crv: 'Ed25519', x: b64url(publicKeyBytes(key.publicKeyMultibase)), d: b64url(secretKeyBytes(key.secretKeyMultibase)) };
    return subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
  }
  function importPublic(subtle, mb) {
    return subtle.importKey('raw', publicKeyBytes(mb), { name: 'Ed25519' }, false, ['verify']);
  }

  // The issuer's DID document, published at /.well-known/did.json.
  function didDocument(keys) {
    var methods = (keys || []).map(publicPart);
    return {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
      id: ISSUER_DID,
      verificationMethod: methods,
      assertionMethod: methods.map(function (m) { return m.id; })
    };
  }

  // ---- eddsa-rdfc-2022 ----------------------------------------------
  // W3C Data Integrity EdDSA Cryptosuites v1.0, section 3.3: canonicalize
  // the document without its proof and the proof options (carrying the
  // document's @context) with RDFC-1.0, hash each with SHA-256, and sign
  // the proof options' hash followed by the document's hash.
  function withoutProof(doc) {
    var copy = {};
    Object.keys(doc).forEach(function (k) { if (k !== 'proof') copy[k] = doc[k]; });
    return copy;
  }
  function proofOptions(proof, context) {
    var o = { '@context': context };
    ['type', 'cryptosuite', 'created', 'verificationMethod', 'proofPurpose'].forEach(function (k) {
      if (proof[k] !== undefined) o[k] = proof[k];
    });
    return o;
  }
  function utf8(text) { return new TextEncoder().encode(text); }
  function hashData(subtle, canonize, doc, proof) {
    var unsecured = withoutProof(doc);
    return Promise.all([
      canonize(proofOptions(proof, unsecured['@context'])),
      canonize(unsecured)
    ]).then(function (n) {
      return Promise.all([subtle.digest('SHA-256', utf8(n[0])), subtle.digest('SHA-256', utf8(n[1]))]);
    }).then(function (h) {
      var out = new Uint8Array(64);
      out.set(new Uint8Array(h[0]), 0);
      out.set(new Uint8Array(h[1]), 32);
      return out;
    });
  }

  function sign(doc, opts) {
    var proof = {
      type: 'DataIntegrityProof',
      cryptosuite: 'eddsa-rdfc-2022',
      created: stamp(opts.created || new Date().toISOString()),
      verificationMethod: opts.key.id,
      proofPurpose: 'assertionMethod'
    };
    return Promise.all([hashData(opts.subtle, opts.canonize, doc, proof), importPrivate(opts.subtle, opts.key)])
      .then(function (r) { return opts.subtle.sign({ name: 'Ed25519' }, r[1], r[0]); })
      .then(function (sig) {
        var signed = withoutProof(doc);
        proof.proofValue = multibase(new Uint8Array(sig));
        signed.proof = proof;
        return signed;
      });
  }

  // Check a signed credential against the issuer's DID document. The
  // answer is { ok: true } or { ok: false, reason }, in plain words.
  function verify(doc, opts) {
    function no(reason) { return { ok: false, reason: reason }; }
    if (!doc || typeof doc !== 'object') return Promise.resolve(no('This is not a credential.'));
    var proof = doc.proof;
    if (!proof || Array.isArray(proof)) return Promise.resolve(no('It has no signature, or more than one.'));
    if (proof.type !== 'DataIntegrityProof' || proof.cryptosuite !== 'eddsa-rdfc-2022') return Promise.resolve(no('It is signed in a way this page does not check.'));
    if (proof.proofPurpose !== 'assertionMethod') return Promise.resolve(no('Its signature was not made for issuing a credential.'));
    var issuer = typeof doc.issuer === 'string' ? doc.issuer : (doc.issuer || {}).id;
    if (issuer !== ISSUER_DID) return Promise.resolve(no('It does not say it was issued by humanshaped.org.'));
    var vm = proof.verificationMethod;
    var did = opts.didDocument || {};
    if (did.id !== ISSUER_DID) return Promise.resolve(no('The issuer’s key list could not be read.'));
    var method = (did.verificationMethod || []).filter(function (m) { return m.id === vm; })[0];
    var allowed = (did.assertionMethod || []).some(function (a) { return a === vm || (a && a.id === vm); });
    if (!method || !allowed) return Promise.resolve(no('It was signed with a key humanshaped.org does not list as its own.'));
    var sig;
    try { sig = fromMultibase(proof.proofValue); } catch (e) { return Promise.resolve(no('Its signature is not readable.')); }
    return Promise.all([hashData(opts.subtle, opts.canonize, doc, proof), importPublic(opts.subtle, method.publicKeyMultibase)])
      .then(function (r) { return opts.subtle.verify({ name: 'Ed25519' }, r[1], sig, r[0]); })
      .then(function (good) {
        return good ? { ok: true, verificationMethod: vm } : no('Something in it has changed since it was signed.');
      }, function (err) {
        var msg = err && err.message ? err.message : '';
        if (/safe mode|Relative|invalid|dropped/i.test(msg)) return no('It holds something that is not part of the credential standard, so it cannot be checked.');
        return no('It could not be checked: ' + (msg || 'no details') + '.');
      });
  }

  var lib = {
    SITE: SITE, ISSUER_DID: ISSUER_DID, ISSUER: ISSUER, CONTEXTS: CONTEXTS, CONTEXT_FILES: CONTEXT_FILES,
    PLATFORMS: PLATFORMS, platform: platform, levelFor: levelFor, levelName: levelName,
    achievement: achievement, achievementDocument: achievementDocument, achievementUrl: achievementUrl,
    problems: problems, buildCredential: buildCredential, recognitionEvidence: recognitionEvidence,
    withRecognitions: withRecognitions, MAX_RECOGNITIONS: MAX_RECOGNITIONS, credentialUrl: credentialUrl,
    describe: describe, matchesRow: matchesRow, stable: stable,
    requestFromRecord: requestFromRecord, recordState: recordState,
    requestFromWaiting: requestFromWaiting, SIGN_COMMAND: SIGN_COMMAND, standing: standing, readSigned: readSigned,
    base58Encode: base58Encode, base58Decode: base58Decode,
    publicKeyMultibase: publicKeyMultibase, secretKeyMultibase: secretKeyMultibase,
    publicKeyBytes: publicKeyBytes, secretKeyBytes: secretKeyBytes,
    generateKey: generateKey, publicPart: publicPart, didDocument: didDocument,
    proofOptions: proofOptions, hashData: hashData, sign: sign, verify: verify
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CredentialLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
