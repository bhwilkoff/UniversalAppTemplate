// Pure helpers for a builder's own app, outside any cohort (G2,
// migration 20261004010000, hub-privacy-notes.md "Apps outside a
// cohort"). Used by /account/ and tested in tools/test/builder-lib.test.mjs.
(function (root) {
  var REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

  // The repository as owner/name, from what a person is likely to paste:
  // owner/name itself, or its address on GitHub, with or without .git.
  function repoFrom(text) {
    var t = String(text || '').trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\/+$/, '')
      .replace(/\.git$/i, '');
    var parts = t.split('/');
    if (parts.length < 2) return null;
    var repo = parts[0] + '/' + parts[1];
    return REPO.test(repo) && repo.length <= 140 ? repo : null;
  }

  // What the form sends, checked the way the database checks it, with a
  // plain sentence when something is not right.
  function checkOwnApp(input) {
    var repo = repoFrom(input.repo);
    if (!repo) return { error: 'Write the repository as owner/name, the way it appears on GitHub, or paste its address.' };
    var name = String(input.name || '').trim();
    if (name.length > 120) return { error: 'Keep the name under 120 characters.' };
    var url = String(input.url || '').trim();
    if (url && (!/^https:\/\/[^\s]+$/.test(url) || url.length > 500)) return { error: 'The address where it runs has to start with https://.' };
    return { row: { app_repo: repo, app_name: name || null, app_url: url || null, public: !!input.public } };
  }

  // One sentence about where the app stands in public.
  function standing(row, hide) {
    if (!row) return '';
    if (hide) return 'It is kept off the apps page for now' + (hide.reason ? ', because: ' + hide.reason : '.') + (hide.reason && !/[.!?]$/.test(hide.reason) ? '.' : '') + ' Your switch is still yours, and it shows again when the hide is lifted.';
    return row.public ? 'It is on the apps page, with a page of its own.' : 'Only you can see it. Nobody else knows it is here until you choose to show it.';
  }

  var lib = { repoFrom: repoFrom, checkOwnApp: checkOwnApp, standing: standing };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BuilderLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
