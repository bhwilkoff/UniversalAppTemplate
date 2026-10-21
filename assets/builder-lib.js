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
  // Where the app stands, as parts (DESIGN-KIT.md): who can see it, and a
  // hide with its reason. null when there is no app yet.
  function standing(row, hide) {
    if (!row) return null;
    if (hide) return { audience: 'me', hidden: true, reason: hide.reason || null };
    return { audience: row.public ? 'public' : 'me', hidden: false, reason: null };
  }

  var lib = { repoFrom: repoFrom, checkOwnApp: checkOwnApp, standing: standing };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.BuilderLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
