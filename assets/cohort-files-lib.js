// The cohort's shared files: what sits in its repository on GitHub, read
// and added as the person, with their own GitHub token
// (research/notes/cohort-repository-design.md). Ben, October 22, 2026:
// "any shared resource or file should be stored on github within the
// cohort repository." This file holds the rules: which folders there
// are, which files are shown, how a name is made safe, and what GitHub's
// answers mean. Tested in tools/test/cohort-files-lib.test.mjs.
(function (root) {
  var API = 'https://api.github.com';
  // GitHub's own limit for a file added on the web.
  var MAX_BYTES = 25 * 1024 * 1024;

  // Resources for everything shared, then one folder for each week.
  function folders(weeks) {
    var list = [{ path: 'resources', label: 'Resources' }];
    for (var i = 1; i <= (weeks || 5); i++) list.push({ path: 'sessions/week-' + i, label: 'Week ' + i });
    return list;
  }

  function labelFor(dir, weeks) {
    var f = folders(Math.max(weeks || 5, weekOf(dir) || 0)).filter(function (x) { return x.path === dir; })[0];
    return f ? f.label : dir;
  }
  function weekOf(dir) { var m = /^sessions\/week-(\d+)$/.exec(dir); return m ? Number(m[1]) : null; }

  // What the files list shows: every file but the repository's own
  // machinery (the README, anything under .github, placeholder files),
  // grouped by folder in the order folders() gives, then any other folder
  // people made on GitHub, by name.
  function groups(tree, weeks) {
    var byDir = {};
    (tree || []).forEach(function (t) {
      if (!t || t.type !== 'blob' || typeof t.path !== 'string') return;
      if (/^\.github\//.test(t.path) || /(^|\/)\.gitkeep$/.test(t.path) || /^readme\.md$/i.test(t.path)) return;
      var cut = t.path.lastIndexOf('/');
      var dir = cut === -1 ? '' : t.path.slice(0, cut);
      (byDir[dir] = byDir[dir] || []).push({ path: t.path, name: t.path.slice(cut + 1), size: t.size || 0 });
    });
    // Resources, the weeks in number order, other folders by name, and
    // loose files last.
    function rank(d) {
      if (d === 'resources') return 0;
      if (weekOf(d)) return weekOf(d);
      return d === '' ? 100000 : 10000;
    }
    var dirs = Object.keys(byDir).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    return dirs.map(function (d) {
      return {
        dir: d,
        label: d === '' ? 'Other files' : labelFor(d, weeks),
        files: byDir[d].sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); })
      };
    });
  }

  // A file name that is safe as a path: no folders, no leading dots, and
  // only letters, numbers, spaces, dots, dashes, and underscores.
  function cleanName(name) {
    var n = String(name || '').split(/[\\/]/).pop().normalize('NFC');
    n = n.replace(/[^\p{L}\p{N} ._-]+/gu, '-').replace(/\s+/g, ' ').trim().replace(/^[.\s-]+/, '');
    if (n.length > 120) {
      var dot = n.lastIndexOf('.');
      var ext = dot > 0 && n.length - dot <= 10 ? n.slice(dot) : '';
      n = n.slice(0, 120 - ext.length).trim() + ext;
    }
    return n;
  }

  function tooBig(size) { return size > MAX_BYTES; }

  function size(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
  }

  function encodePath(path) { return String(path).split('/').map(encodeURIComponent).join('/'); }
  function treeUrl(repo) { return API + '/repos/' + repo + '/git/trees/HEAD?recursive=1'; }
  function contentsUrl(repo, path) { return API + '/repos/' + repo + '/contents/' + encodePath(path); }
  function pageUrl(repo, path) { return 'https://github.com/' + repo + '/blob/HEAD/' + encodePath(path); }
  function folderUrl(repo, dir) { return 'https://github.com/' + repo + (dir ? '/tree/HEAD/' + encodePath(dir) : ''); }

  // GitHub's answer, read as a person would want it said. null when all
  // is well.
  //   empty       the repository has no files yet
  //   expired     the token is no longer good (sign in again)
  //   not-ready   GitHub will not show it: an invitation not yet
  //               accepted, or the app not yet allowed to read files
  //   exists      a file of that name is already there
  //   forbidden   this person may not add files
  //   github      anything else
  function problem(status, body) {
    var text = (body && body.message) || '';
    if (status >= 200 && status < 300) return null;
    if (status === 409 && /empty/i.test(text)) return { kind: 'empty', message: text };
    if (status === 404 && /^Git Repository is empty/i.test(text)) return { kind: 'empty', message: text };
    if (status === 401) return { kind: 'expired', message: text || 'Bad credentials' };
    if (status === 422 && /sha/i.test(text)) return { kind: 'exists', message: text };
    if (status === 403 && /rate limit/i.test(text)) return { kind: 'rate', message: text };
    if (status === 403 && /not accessible by integration/i.test(text)) return { kind: 'not-ready', message: text };
    if (status === 403) return { kind: 'forbidden', message: text };
    if (status === 404) return { kind: 'not-ready', message: text };
    return { kind: 'github', message: text || 'GitHub answered ' + status + '.' };
  }

  // Who may add a file, from the role GitHub holds for them
  // (github_access.repo_role).
  function canAdd(role) { return role === 'write' || role === 'maintain'; }

  var lib = {
    MAX_BYTES: MAX_BYTES, folders: folders, groups: groups, cleanName: cleanName, tooBig: tooBig, size: size,
    treeUrl: treeUrl, contentsUrl: contentsUrl, pageUrl: pageUrl, folderUrl: folderUrl, problem: problem, canAdd: canAdd
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CohortFilesLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
