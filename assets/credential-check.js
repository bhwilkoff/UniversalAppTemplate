// Checking a credential's signature in the browser, for /credential/ and
// /teach/. The jsonld library (loaded only when it is needed) turns the
// credential into canonical N-Quads, using the copies of the contexts
// kept on this site; Web Crypto checks the Ed25519 signature; and the
// issuer's keys come from this site's own /.well-known/did.json, which is
// what did:web:humanshaped.org resolves to.
(function () {
  var JSONLD = 'https://cdn.jsdelivr.net/npm/jsonld@9.0.0/dist/jsonld.min.js';
  // The library's exact bytes, so a changed copy on the CDN is refused.
  var INTEGRITY = 'sha384-U59hNclDxvxyjXzBNv2lXA8ESHdaRTqhxjTCyrIMXGngm/YTXgpIGVNnE9/CDzen';
  var lib = window.CredentialLib;
  var loading = null;

  function loadJsonld() {
    if (window.jsonld) return Promise.resolve(window.jsonld);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = JSONLD;
      s.crossOrigin = 'anonymous';
      s.integrity = INTEGRITY;
      s.onload = function () { window.jsonld ? resolve(window.jsonld) : reject(new Error('the checking library did not load')); };
      s.onerror = function () { reject(new Error('the checking library could not be loaded')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var contexts = null;
  function loadContexts() {
    if (contexts) return contexts;
    var urls = Object.keys(lib.CONTEXT_FILES);
    contexts = Promise.all(urls.map(function (u) {
      return fetch(lib.CONTEXT_FILES[u]).then(function (r) { if (!r.ok) throw new Error('a context file is missing'); return r.json(); });
    })).then(function (docs) {
      var map = {};
      urls.forEach(function (u, i) { map[u] = docs[i]; });
      return map;
    });
    return contexts;
  }

  function didDocument() {
    return fetch('/.well-known/did.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('the issuer’s key list could not be read');
      return r.json();
    });
  }

  // Resolves to { ok, reason }.
  function check(doc) {
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve({ ok: false, reason: 'This browser cannot check signatures.' });
    return Promise.all([loadJsonld(), loadContexts(), didDocument()]).then(function (r) {
      var jsonld = r[0], map = r[1], did = r[2];
      function documentLoader(url) {
        if (map[url]) return Promise.resolve({ contextUrl: null, documentUrl: url, document: map[url] });
        return Promise.reject(new Error('Only the contexts kept on this site are loaded, not ' + url));
      }
      function canonize(d) {
        return jsonld.canonize(d, { algorithm: 'RDFC-1.0', format: 'application/n-quads', documentLoader: documentLoader, safe: true });
      }
      return lib.verify(doc, { didDocument: did, subtle: window.crypto.subtle, canonize: canonize });
    }).catch(function (err) {
      var msg = err && err.message ? err.message : 'no details';
      if (err && err.name === 'NotSupportedError') msg = 'this browser cannot check Ed25519 signatures yet';
      return { ok: false, reason: 'It could not be checked here, because ' + msg + '.' };
    });
  }

  window.CredentialCheck = { check: check, didDocument: didDocument };
})();
