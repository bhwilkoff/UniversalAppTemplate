// What slides show from GitHub, read once through the github-read function and
// held in SlidesLib, so every place a slide is drawn finds it there.
(function () {
  var L = window.SlidesLib;
  if (!L) return;
  var asking = {};
  // A failure shows, but is not kept: the next look tries again.
  function failed(key) {
    L.ghHold(key, { error: 'GitHub could not be read just now.' });
    setTimeout(function () { L.ghDrop(key); }, 30000);
  }
  // Resolves true when something new arrived, so the caller can draw again.
  function preload(db, cohortId, text) {
    var wanted = L.ghSpecs(text).filter(function (s) { return s.repo && !L.ghHas(s.key) && !asking[s.key]; });
    if (!wanted.length) return Promise.resolve(false);
    return Promise.all(wanted.map(function (s) {
      asking[s.key] = true;
      return db.functions.invoke('github-read', { body: { cohort_id: cohortId, repo: s.repo, show: s.show } }).then(function (r) {
        if (r && r.data) return L.ghHold(s.key, r.data);
        console.log('[github] ' + s.key + ': ' + (r && r.error && r.error.message));
        failed(s.key);
      }, function () { failed(s.key); }).then(function () { delete asking[s.key]; });
    })).then(function () { return true; });
  }
  window.GitHubBlock = { preload: preload };
})();
