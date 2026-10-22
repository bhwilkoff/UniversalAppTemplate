// The cohort's Asks section: the board of what people have asked the
// cohort for, read and moved as the person with their own GitHub token
// (rules in asks-lib.js). Each card opens its issue on GitHub, where the
// conversation about it happens.
(function (root) {
  var A = root.AsksLib, D = root.DiscussionsLib, U = root.UI;
  if (!A || !D || !U) return;
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
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, status: r.status, body: b }; });
    }, function () { return { ok: false, status: 0, body: { message: 'GitHub could not be reached.' } }; });
  }

  function mount(box, o) {
    if (!box) return;
    box.replaceChildren();
    var repo = o.cohort.github_repo;
    var talk = '/cohort/?c=' + encodeURIComponent(o.cohort.slug) + '&t=talk';
    if (!repo) { box.appendChild(U.empty('No asks yet', o.leading ? U.link('Go to Conversation', talk) : null)); return; }
    if (!o.access || o.access.state !== 'member') { box.appendChild(U.empty('Asks open once you join on GitHub', U.link('Go to Conversation', talk))); return; }
    var token = D.tokenFrom(o.session, stores(), Date.now(), o.db && o.db.auth && o.db.auth.storageKey);
    var me = o.session && o.session.user && o.session.user.user_metadata ? o.session.user.user_metadata.user_name : null;
    if (!token || !me) {
      var b = U.button('Sign in again to see the asks', 'btn-secondary', function () {
        b.disabled = true;
        o.db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname + location.search } });
      });
      box.appendChild(U.empty('GitHub needs you to sign in again', b));
      return;
    }

    var meta = el('p', 'ui-meta-line');
    meta.appendChild(U.visibility('cohort'));
    box.appendChild(meta);
    box.appendChild(form());
    var board = el('div', 'asks-board');
    box.appendChild(board);
    load();

    function load() {
      ask(token, 'GET', A.listUrl(repo)).then(function (r) {
        board.replaceChildren();
        if (!r.ok) {
          var n = el('div', 'ui-notice');
          n.appendChild(el('p', null, r.status === 401 ? 'GitHub needs you to sign in again.' : 'GitHub said: “' + (r.body.message || 'no details') + '”'));
          board.appendChild(n);
          return;
        }
        var cols = A.columns(r.body, new Date());
        A.COLUMNS.forEach(function (c) {
          var sec = el('section', 'asks-column');
          sec.setAttribute('aria-label', c.label);
          var h = el('h3', null, c.label);
          sec.appendChild(h);
          if (!cols[c.key].length) sec.appendChild(el('p', 'ui-meta-line', c.key === 'asked' ? 'Nothing asked' : c.key === 'taken' ? 'No one on anything' : 'Nothing done lately'));
          var ul = U.rows();
          cols[c.key].forEach(function (card) { ul.appendChild(cardRow(card, c.key)); });
          sec.appendChild(ul);
          board.appendChild(sec);
        });
      });
    }

    function cardRow(card, column) {
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var actions = A.moves(card, column, me).map(function (m) {
        return U.button(A.MOVE_LABELS[m], 'btn-secondary small', function (ev) {
          var btn = ev.currentTarget; btn.disabled = true;
          var q = A.request(repo, card, m, me);
          ask(token, q.method, q.url, q.body).then(function (r) {
            btn.disabled = false;
            if (r.ok) load(); else U.say(said, 'Not moved: ' + (r.body.message || r.status), 'problem');
          });
        });
      });
      var bits = [card.by ? 'Asked by @' + card.by : null, card.holders.length ? card.holders.map(function (x) { return '@' + x; }).join(', ') + (card.holders.length > 1 ? ' have it' : ' has it') : null];
      if (card.comments) bits.push(card.comments === 1 ? '1 reply' : card.comments + ' replies');
      var row = U.row({ title: card.title, href: card.url, meta: bits.filter(Boolean).join(', '), actions: actions });
      row.querySelector('.ui-row-main').appendChild(said);
      return row;
    }

    function form() {
      var f = el('form', 'cohort-form asks-form');
      var t = el('label', null, 'Your ask ');
      var title = el('input'); title.name = 'title'; title.maxLength = 200; title.required = true;
      title.placeholder = 'Can someone test my app on an iPhone?';
      t.appendChild(title);
      var d = el('label', null, 'More detail (optional) ');
      var details = el('textarea'); details.name = 'details'; details.rows = 2; details.maxLength = 4000;
      d.appendChild(details);
      var acts = el('div', 'actions');
      var go = el('button', 'btn-secondary', 'Ask the cohort'); go.type = 'submit';
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      acts.appendChild(go); acts.appendChild(said);
      f.appendChild(t); f.appendChild(d); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = A.newAsk(title.value, details.value);
        if (n.problem) { U.say(said, n.problem, 'problem'); return; }
        go.disabled = true;
        ask(token, 'POST', A.createUrl(repo), n.body).then(function (r) {
          go.disabled = false;
          if (!r.ok) { U.say(said, 'Not asked: ' + (r.body.message || r.status), 'problem'); return; }
          U.say(said, 'Asked');
          f.reset();
          load();
        });
      });
      return f;
    }
  }

  root.CohortAsks = { mount: mount };
})(window);
