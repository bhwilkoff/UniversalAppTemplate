// What slides show from GitHub, read once through the github-read function and
// held in SlidesLib, so every place a slide is drawn finds it there.
(function () {
  var L = window.SlidesLib;
  if (!L) return;
  var asking = {};
  // Resolves true when something new arrived, so the caller can draw again.
  function preload(db, cohortId, text) {
    var wanted = L.ghSpecs(text).filter(function (s) { return s.repo && !L.ghHas(s.key) && !asking[s.key]; });
    if (!wanted.length) return Promise.resolve(false);
    return Promise.all(wanted.map(function (s) {
      asking[s.key] = true;
      return db.functions.invoke('github-read', { body: { cohort_id: cohortId, repo: s.repo, show: s.show } }).then(function (r) {
        L.ghHold(s.key, r && r.data ? r.data : { error: 'GitHub could not be read just now.' });
      }, function () { L.ghHold(s.key, { error: 'GitHub could not be read just now.' }); }).then(function () { delete asking[s.key]; });
    })).then(function () { return true; });
  }
  window.GitHubBlock = { preload: preload };
})();
