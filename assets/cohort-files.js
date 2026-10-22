// The cohort's Files section: the files in its repository on GitHub,
// grouped by folder, and a way to add one, as the person, with their own
// GitHub token (the rules are in cohort-files-lib.js). Every file opens
// on GitHub, which stays its home, with its history and its undo.
(function (root) {
  var F = root.CohortFilesLib, D = root.DiscussionsLib, U = root.UI;
  if (!F || !D || !U) return;
  var el = U.el;

  function stores() {
    var s = null, l = null;
    try { s = root.sessionStorage; } catch (e) {}
    try { l = root.localStorage; } catch (e) {}
    return { session: s, local: l };
  }

  function ask(token, method, url, body) {
    return fetch(url, {
      method: method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (json) {
        return { status: r.status, body: json, problem: F.problem(r.status, json) };
      });
    }, function () {
      return { status: 0, body: {}, problem: { kind: 'offline', message: 'GitHub could not be reached.' } };
    });
  }

  // The file's bytes as base64, without the data: prefix.
  function base64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).replace(/^data:[^,]*,/, '')); };
      r.onerror = function () { reject(new Error('The file could not be read.')); };
      r.readAsDataURL(file);
    });
  }

  function mount(box, o) {
    if (!box) return;
    var repo = o.cohort.github_repo;
    var access = o.access || null;
    var weeks = o.cohort.weeks || 5;
    box.replaceChildren();

    if (!repo) {
      // The repository is made from Conversation; files wait for it.
      var go = o.leading ? U.link('Go to Conversation', '/cohort/?c=' + encodeURIComponent(o.cohort.slug) + '&t=talk') : null;
      box.appendChild(U.empty('No files yet', go));
      return;
    }
    if (!access || access.state !== 'member') {
      box.appendChild(U.empty('Files open once you join on GitHub', U.link('Go to Conversation', '/cohort/?c=' + encodeURIComponent(o.cohort.slug) + '&t=talk')));
      return;
    }
    var token = D.tokenFrom(o.session, stores(), Date.now(), o.db && o.db.auth && o.db.auth.storageKey);
    if (!token) { box.appendChild(signInAgain(o.db)); return; }

    var meta = el('p', 'ui-meta-line');
    meta.appendChild(U.visibility('cohort'));
    box.appendChild(meta);

    var canAdd = F.canAdd(access.repo_role);
    var adder = canAdd ? addForm(o, repo, weeks, token, function () { list(); }) : null;
    var actions = el('div', 'actions');
    actions.appendChild(U.link('Open on GitHub', F.folderUrl(repo, '')));
    box.appendChild(actions);
    if (adder) box.appendChild(adder);
    var listBox = el('div');
    box.appendChild(listBox);
    list();

    function list() {
      listBox.replaceChildren(el('div', 'ui-skeleton'));
      ask(token, 'GET', F.treeUrl(repo)).then(function (r) {
        listBox.replaceChildren();
        if (r.problem && r.problem.kind !== 'empty') { listBox.appendChild(explain(r.problem, o)); return; }
        var groups = r.problem ? [] : F.groups(r.body.tree, weeks);
        if (!groups.length) { listBox.appendChild(U.empty('No files yet')); return; }
        groups.forEach(function (g) {
          var sec = el('section', 'files-group');
          var h = el('h3');
          var a = el('a', null, g.label); a.href = F.folderUrl(repo, g.dir); a.rel = 'noopener';
          h.appendChild(a);
          sec.appendChild(h);
          var ul = U.rows();
          g.files.forEach(function (f) {
            ul.appendChild(U.row({ title: f.name, href: F.pageUrl(repo, f.path), meta: F.size(f.size) }));
          });
          sec.appendChild(ul);
          listBox.appendChild(sec);
        });
      });
    }
  }

  // Adding a file: a folder, the file, and a commit made as the person.
  // A name already in that folder is replaced only after a confirm,
  // and GitHub keeps the earlier version in the file's history.
  function addForm(o, repo, weeks, token, done) {
    var form = el('form', 'inline-form files-add');
    var where = el('label', null, 'Folder ');
    var pick = el('select');
    pick.name = 'folder';
    F.folders(weeks).forEach(function (f) {
      var opt = el('option', null, f.label); opt.value = f.path; pick.appendChild(opt);
    });
    where.appendChild(pick);
    var which = el('label', null, 'File ');
    var input = el('input');
    input.type = 'file';
    input.name = 'file';
    input.required = true;
    which.appendChild(input);
    var submit = el('button', 'btn-secondary', 'Add the file');
    submit.type = 'submit';
    var said = el('p', 'ui-inline-status');
    said.setAttribute('role', 'status');
    form.appendChild(where); form.appendChild(which); form.appendChild(submit); form.appendChild(said);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var file = input.files && input.files[0];
      if (!file) { U.say(said, 'Choose a file', 'problem'); return; }
      if (F.tooBig(file.size)) { U.say(said, 'Files must be 25 MB or smaller; share videos as an exchange', 'problem'); return; }
      var name = F.cleanName(file.name);
      if (!name) { U.say(said, 'Rename the file and try again', 'problem'); return; }
      var path = pick.value + '/' + name;
      submit.disabled = true;
      U.say(said, '');
      base64(file).then(function (content) {
        return put(content, null).then(function (r) {
          if (r.problem && r.problem.kind === 'exists') return replace(content);
          return r;
        });
      }).then(function (r) {
        submit.disabled = false;
        if (!r) return;
        if (r.problem) { U.say(said, 'Not added: ' + (r.problem.message || r.problem.kind), 'problem'); return; }
        U.say(said, 'Added');
        form.reset();
        done();
      }, function (err) {
        submit.disabled = false;
        U.say(said, 'Not added: ' + err.message, 'problem');
      });

      function put(content, sha) {
        var body = { message: (sha ? 'Replace ' : 'Add ') + path, content: content };
        if (sha) body.sha = sha;
        return ask(token, 'PUT', F.contentsUrl(repo, path), body);
      }
      function replace(content) {
        return U.confirm({
          title: 'Replace ' + name + '?',
          body: 'A file with this name is already in that folder. GitHub keeps the earlier one in its history.',
          action: 'Replace file',
          danger: false
        }).then(function (ok) {
          if (!ok) return null;
          return ask(token, 'GET', F.contentsUrl(repo, path)).then(function (r) {
            if (r.problem) return r;
            return put(content, r.body.sha);
          });
        });
      }
    });
    return form;
  }

  function signInAgain(db) {
    var b = U.button('Sign in again to see the files', 'btn-secondary', function () {
      b.disabled = true;
      db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname + location.search } })
        .then(function (r) { if (r && r.error) b.disabled = false; });
    });
    return U.empty('GitHub needs you to sign in again', b);
  }

  function explain(p, o) {
    var box = el('div', 'ui-notice');
    if (p.kind === 'expired') return signInAgain(o.db);
    if (p.kind === 'not-ready') {
      box.appendChild(el('p', null, o.leading
        ? 'GitHub has not let Human Shaped read files here yet. The Human Shaped Hub app needs the Contents permission.'
        : 'GitHub has not let Human Shaped read files here yet.'));
    } else if (p.kind === 'rate') {
      box.appendChild(el('p', null, 'GitHub has asked this page to slow down. Try again in a few minutes.'));
    } else {
      box.appendChild(el('p', null, 'GitHub said: “' + (p.message || 'no details') + '”'));
    }
    return box;
  }

  root.CohortFiles = { mount: mount };
})(window);
