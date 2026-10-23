// The cohort's "Try my app" section: requests to try someone's app on a
// device they do not have, read and moved as the person with their own
// GitHub token (rules in asks-lib.js). Each card opens its issue on
// GitHub, where what people saw is kept.
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
      // GitHub lets browsers keep its answers for a minute; a list read
      // right after a change must be the new one.
      cache: 'no-store',
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
    if (!repo) { box.appendChild(U.empty('Nothing to try yet', o.leading ? U.link('Go to Conversation', talk) : null)); return; }
    if (!o.access || o.access.state !== 'member') { box.appendChild(U.empty('Opens once you join on GitHub', U.link('Go to Conversation', talk))); return; }
    var token = D.tokenFrom(o.session, stores(), Date.now(), o.db && o.db.auth && o.db.auth.storageKey);
    var me = o.session && o.session.user && o.session.user.user_metadata ? o.session.user.user_metadata.user_name : null;
    if (!token || !me) {
      var b = U.button('Sign in again', 'btn-secondary', function () {
        b.disabled = true;
        o.db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname + location.search } });
      });
      box.appendChild(U.empty('GitHub needs you to sign in again', b));
      return;
    }

    var meta = el('p', 'ui-meta-line');
    meta.appendChild(U.visibility('cohort'));
    box.appendChild(meta);
    var bar = el('div', 'ui-toolbar');
    var asking = form();
    asking.hidden = true;
    var start = U.button('Ask someone to try my app', 'btn-primary', function () { asking.hidden = false; start.hidden = true; asking.querySelector('input').focus(); });
    bar.appendChild(start);
    bar.appendChild(U.link('Open on GitHub', 'https://github.com/' + repo + '/issues?q=label%3A' + A.LABEL));
    box.appendChild(bar);
    box.appendChild(asking);
    function closeForm() { asking.reset(); asking.hidden = true; start.hidden = false; start.focus(); }
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
          if (!cols[c.key].length) sec.appendChild(U.empty(c.key === 'asked' ? 'Nothing waiting' : c.key === 'taken' ? 'No one is trying one' : 'Nothing tried lately'));
          var ul = U.rows();
          cols[c.key].forEach(function (card) { ul.appendChild(cardRow(card, c.key)); });
          sec.appendChild(ul);
          board.appendChild(sec);
        });
      });
    }

    function cardRow(card, column) {
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var saw = null;
      var actions = A.moves(card, column, me).map(function (m) {
        return U.button(A.MOVE_LABELS[m], 'btn-secondary small', function (ev) {
          var btn = ev.currentTarget;
          // Tried it: first, what they saw, for the person who asked.
          if (m === 'done') { saw.hidden = false; saw.querySelector('textarea').focus(); return; }
          btn.disabled = true;
          var q = A.request(repo, card, m, me);
          ask(token, q.method, q.url, q.body).then(function (r) {
            btn.disabled = false;
            if (r.ok) load(); else U.say(said, 'Not moved: ' + (r.body.message || r.status), 'problem');
          });
        });
      });
      if (A.moves(card, column, me).indexOf('done') !== -1) saw = sawForm(card, said);
      var name = function (x) { return x === me ? 'you' : '@' + x; };
      var holding = card.holders.length === 1 && card.holders[0] === me ? 'you have it'
        : card.holders.length ? card.holders.map(name).join(', ') + (card.holders.length > 1 ? ' have it' : ' has it') : null;
      var bits = [card.device, card.by ? 'asked by ' + name(card.by) : null, holding];
      if (card.comments) bits.push(card.comments === 1 ? '1 reply' : card.comments + ' replies');
      var row = U.row({ title: card.title, href: card.url, meta: bits.filter(Boolean).join(', '), actions: actions });
      if (card.app) row.querySelector('.ui-row-main').appendChild(U.link('Open the app', card.app));
      row.querySelector('.ui-row-main').appendChild(said);
      if (saw) row.querySelector('.ui-row-main').appendChild(saw);
      return row;
    }

    function sawForm(card, said) {
      var f = el('form', 'cohort-form');
      f.hidden = true;
      var l = el('label', null, 'What did you see?');
      var t = el('textarea'); t.rows = 2; t.maxLength = 4000; t.required = true;
      l.appendChild(t); f.appendChild(l);
      var acts = el('div', 'actions');
      var go = el('button', 'btn-primary', 'Send and mark tried'); go.type = 'submit';
      acts.appendChild(go);
      acts.appendChild(U.button('Cancel', 'btn-secondary', function () { f.reset(); f.hidden = true; }));
      f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var c = A.sawComment(repo, card, t.value);
        if (c.problem) { U.say(said, c.problem, 'problem'); return; }
        go.disabled = true;
        ask(token, c.method, c.url, c.body).then(function (r) {
          if (!r.ok) { go.disabled = false; U.say(said, 'Not sent: ' + (r.body.message || r.status), 'problem'); return; }
          var q = A.request(repo, card, 'done', me);
          return ask(token, q.method, q.url, q.body).then(function (r2) {
            go.disabled = false;
            if (r2.ok) load(); else U.say(said, 'Sent, but not marked tried: ' + (r2.body.message || r2.status), 'problem');
          });
        });
      });
      return f;
    }

    function form() {
      var f = el('form', 'cohort-form asks-form');
      var t = el('label', null, 'What should they try?');
      var title = el('input'); title.name = 'title'; title.maxLength = 200; title.required = true;
      title.placeholder = 'Sign in and save a film';
      t.appendChild(title);
      var dl = el('label', null, 'On which device?');
      var device = el('select'); device.name = 'device'; device.required = true;
      var none = el('option', null, 'Choose one'); none.value = ''; device.appendChild(none);
      A.DEVICES.forEach(function (x) { var op = el('option', null, x); op.value = x; device.appendChild(op); });
      dl.appendChild(device);
      var ul = el('label', null, 'Where is your app?');
      var url = el('input'); url.name = 'url'; url.type = 'url'; url.placeholder = 'https://'; url.defaultValue = o.app || '';
      ul.appendChild(url);
      var d = el('label', null, 'Anything they should know (optional)');
      var details = el('textarea'); details.name = 'details'; details.rows = 2; details.maxLength = 4000;
      d.appendChild(details);
      var acts = el('div', 'actions');
      var go = el('button', 'btn-primary', 'Ask'); go.type = 'submit';
      var cancel = U.button('Cancel', 'btn-secondary', function () { U.say(said, ''); closeForm(); });
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      acts.appendChild(go); acts.appendChild(cancel); acts.appendChild(said);
      f.appendChild(t); f.appendChild(dl); f.appendChild(ul); f.appendChild(d); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = A.newTry(title.value, device.value, url.value, details.value);
        if (n.problem) { U.say(said, n.problem, 'problem'); return; }
        go.disabled = true;
        ask(token, 'POST', A.createUrl(repo), n.body).then(function (r) {
          go.disabled = false;
          if (!r.ok) { U.say(said, 'Not asked: ' + (r.body.message || r.status), 'problem'); return; }
          closeForm();
          load();
        });
      });
      return f;
    }
  }

  root.CohortAsks = { mount: mount };
})(window);
