// The cohort's conversation on the site: GitHub Discussions in the
// cohort's private repository, read and posted as the student with
// their own GitHub token (DiscussionsLib holds the GraphQL and the token
// rules). /cohort/ shows the newest five with threads opened in place;
// /live/ shows the newest three, compactly. Every thread links to
// GitHub, which stays the home of the conversation.
//
// Copy here is awaiting Ben's review.
(function (root) {
  var D = root.DiscussionsLib;
  if (!D) return;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function link(href, text, cls) { var a = el('a', cls || null, text); a.href = href; return a; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function ago(iso) { return root.CohortLib ? root.CohortLib.ago(iso, new Date()) : new Date(iso).toLocaleDateString(); }
  function who(a) { return a ? a.login : 'someone who has left GitHub'; }
  function replies(n) { return n === 0 ? 'no replies yet' : n === 1 ? '1 reply' : n + ' replies'; }

  function stores() {
    var s = null, l = null;
    try { s = root.sessionStorage; } catch (e) {}
    try { l = root.localStorage; } catch (e) {}
    return { session: s, local: l };
  }

  // The GitHub token this tab holds, taking a fresh one from the session
  // when GitHub has just handed one over.
  function token(db, session) {
    return D.tokenFrom(session, stores(), Date.now(), db && db.auth && db.auth.storageKey);
  }
  function forget() { D.forget(stores().session); }

  // Back through GitHub to this same page. The person has already
  // authorized the app, so GitHub sends them straight back.
  function signInAgain(db, b) {
    b.disabled = true;
    b.textContent = 'Going to GitHub…';
    db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + location.pathname + location.search } })
      .then(function (r) { if (r && r.error) { b.disabled = false; b.textContent = 'Sign in again to read it here'; } });
  }

  // GitHub's HTML, cleaned again here, since it is put into this page.
  function body(html) {
    var box = el('div', 'talk-body');
    if (!html.trim()) return box;
    if (root.DOMPurify) {
      box.innerHTML = root.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
      box.querySelectorAll('a[href]').forEach(function (a) { a.rel = 'noopener'; });
    } else {
      box.appendChild(el('p', 'small', 'This page could not load what it needs to show the text safely, so read it on GitHub.'));
    }
    return box;
  }

  // What to say when GitHub says no.
  function explain(p, repo) {
    var box = el('div', 'talk-problem');
    if (p.kind === 'not-visible') {
      box.appendChild(el('p', null, 'GitHub will not show this cohort’s repository to your account yet. Usually that means the invitation to the humanshaped organization is still waiting for you, in your email or on GitHub, so accept it and read this page again.'));
      box.appendChild(el('p')).appendChild(link('https://github.com/orgs/humanshaped/invitation', 'See the invitation on GitHub'));
    } else if (p.kind === 'rate') {
      box.appendChild(el('p', null, 'GitHub has asked this page to slow down for a little while (in its words: “' + (p.message || 'rate limit') + '”). Try again in a few minutes. The conversation on GitHub itself is not affected.'));
    } else if (p.kind === 'forbidden') {
      box.appendChild(el('p', null, 'GitHub did not allow that, and said: “' + (p.message || 'forbidden') + '”. If it keeps happening, tell your teacher, because the cohort’s repository may need a setting changed.'));
    } else if (p.kind === 'offline') {
      box.appendChild(el('p', null, 'GitHub could not be reached just now. Check your connection and try again.'));
    } else {
      box.appendChild(el('p', null, 'GitHub answered with a problem: “' + (p.message || 'no details') + '”.'));
    }
    return box;
  }

  function noToken(box, db, repo, expired, compact) {
    var p = el('p', compact ? 'small' : null, compact
      ? 'This page can read the conversation for a few hours after you sign in, and that time has passed, so sign in again or open it on GitHub.'
      : expired
        ? 'GitHub ends this page\u2019s permission to read the conversation for you after eight hours, and that time has passed, so sign in again to read it here, or open it on GitHub.'
        : 'GitHub lets this page read the conversation for you for a few hours after you sign in, and that time has passed in this tab, so sign in again to read it here, or open it on GitHub.');
    box.appendChild(p);
    var acts = el('div', 'actions');
    var b = button('Sign in again to read it here', 'btn-quiet', function () { signInAgain(db, b); });
    acts.appendChild(b);
    if (compact) acts.appendChild(link('https://github.com/' + repo + '/discussions', 'Open it on GitHub'));
    box.appendChild(acts);
  }

  // ------------------------------------------------------------------
  // /cohort/: the newest five, a thread opened in place, and posting
  // ------------------------------------------------------------------
  function full(box, o) {
    var where = D.splitRepo(o.repo);
    var tok = token(o.db, o.session);
    var list = null, openId = null;
    var area = el('div', 'talk');
    box.appendChild(area);
    if (!where) return;
    if (!tok) { noToken(area, o.db, o.repo, false, false); return; }

    function load(thenOpen) {
      area.replaceChildren(el('p', 'small', 'Reading the conversation from GitHub…'));
      D.ask(tok, D.LIST, { owner: where.owner, name: where.name, n: 5 }).then(function (r) {
        area.replaceChildren();
        if (r.problem) return trouble(r.problem);
        list = D.shapeList(r.data);
        if (!list) return trouble({ kind: 'not-visible' });
        draw();
        if (thenOpen) openThread(thenOpen);
      });
    }

    function trouble(p) {
      area.replaceChildren();
      if (p.kind === 'expired') { forget(); tok = null; return noToken(area, o.db, o.repo, true, false); }
      area.appendChild(explain(p, o.repo));
      area.appendChild(el('div', 'actions')).appendChild(button('Try again', 'btn-quiet', function () { load(); }));
    }

    function draw() {
      area.replaceChildren();
      var ol = el('ol', 'talk-list');
      if (!list.discussions.length) area.appendChild(el('p', 'small', 'No one has started a conversation yet, so the first one could be yours.'));
      list.discussions.forEach(function (d) { ol.appendChild(item(d)); });
      if (list.discussions.length) area.appendChild(ol);
      var foot = el('p', 'small talk-foot');
      if (list.total > list.discussions.length) foot.appendChild(link(list.url + '/discussions', 'All ' + list.total + ' conversations on GitHub'));
      foot.appendChild(button('Read it again', 'btn-link', function () { load(openId); }));
      area.appendChild(foot);
      area.appendChild(startForm());
    }

    function item(d) {
      var li = el('li', 'talk-item');
      li.dataset.id = d.id;
      var head = el('div', 'talk-head');
      var t = button(d.title, 'talk-title', function () { openId === d.id ? closeThread() : openThread(d.id); });
      t.setAttribute('aria-expanded', 'false');
      head.appendChild(t);
      head.appendChild(el('p', 'small talk-meta', who(d.author) + (d.category ? ' in ' + d.category : '') + ', ' + replies(d.comments) + ', last active ' + ago(d.lastActivity)));
      head.appendChild(link(d.url, 'On GitHub', 'small talk-gh'));
      li.appendChild(head);
      var thread = el('div', 'talk-thread'); thread.hidden = true;
      li.appendChild(thread);
      return li;
    }

    function itemFor(id) { return area.querySelector('.talk-item[data-id="' + id + '"]'); }

    function closeThread() {
      var li = openId && itemFor(openId);
      if (li) { li.querySelector('.talk-thread').hidden = true; li.querySelector('.talk-title').setAttribute('aria-expanded', 'false'); }
      openId = null;
    }

    function openThread(id) {
      closeThread();
      var li = itemFor(id);
      if (!li) return;
      openId = id;
      var box = li.querySelector('.talk-thread');
      li.querySelector('.talk-title').setAttribute('aria-expanded', 'true');
      box.hidden = false;
      box.replaceChildren(el('p', 'small', 'Reading the thread…'));
      D.ask(tok, D.THREAD, { id: id }).then(function (r) {
        if (r.problem && r.problem.kind === 'expired') return trouble(r.problem);
        box.replaceChildren();
        if (r.problem) return box.appendChild(explain(r.problem, o.repo));
        var t = D.shapeThread(r.data);
        if (!t) return box.appendChild(explain({ kind: 'not-visible' }, o.repo));
        drawThread(box, t);
      });
    }

    function post(p) {
      var art = el('article', 'talk-post' + (p.reply ? ' reply' : ''));
      art.appendChild(el('p', 'small talk-by', who(p.author) + ', ' + ago(p.createdAt)));
      if (p.minimized) art.appendChild(el('p', 'small', 'This comment is hidden on GitHub.'));
      else art.appendChild(body(p.html));
      return art;
    }

    function drawThread(box, t) {
      box.appendChild(post(t));
      t.comments.forEach(function (c) {
        box.appendChild(post(c));
        c.replies.forEach(function (r) { r.reply = true; box.appendChild(post(r)); });
        if (c.moreReplies) box.appendChild(el('p', 'small talk-more')).appendChild(link(c.url, c.moreReplies + ' more replies to this on GitHub'));
      });
      if (t.more) box.appendChild(el('p', 'small talk-more')).appendChild(link(t.url, t.more + ' more comments on GitHub'));
      if (t.locked) { box.appendChild(el('p', 'small', 'This conversation is locked, so no one can add to it.')); return; }
      box.appendChild(replyForm(t));
    }

    function replyForm(t) {
      var f = el('form', 'inline-form talk-form');
      var label = el('label', null, 'Your reply');
      var ta = el('textarea'); ta.rows = 3; ta.required = true; ta.maxLength = 65000;
      label.appendChild(ta); f.appendChild(label);
      f.appendChild(el('p', 'small hint', 'It goes to GitHub as yours, marked as sent from Human Shaped, and you can edit or delete it there.'));
      var acts = el('div', 'actions');
      var b = el('button', 'btn-quiet', 'Post your reply'); b.type = 'submit';
      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      acts.appendChild(b); acts.appendChild(msg); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var text = ta.value.trim();
        if (!text) return;
        b.disabled = true; msg.textContent = 'Posting to GitHub…';
        var old = f.querySelector('.talk-problem'); if (old) old.remove();
        D.ask(tok, D.COMMENT, { discussionId: t.id, body: text }).then(function (r) {
          b.disabled = false;
          if (r.problem) {
            if (r.problem.kind === 'expired') return trouble(r.problem);
            msg.textContent = '';
            f.appendChild(explain(r.problem, o.repo));
            return;
          }
          load(t.id);
        });
      });
      return f;
    }

    function startForm() {
      var cats = D.postableCategories(list.categories);
      var wrap = el('details', 'talk-start');
      wrap.appendChild(el('summary', null, 'Start a conversation'));
      if (!cats.length) {
        wrap.appendChild(el('p', 'small', 'This repository has no category a new conversation can go in yet, so start it on GitHub.'));
        return wrap;
      }
      var f = el('form', 'inline-form talk-form');
      var l1 = el('label', null, 'What it is about'); var title = el('input'); title.required = true; title.maxLength = 256; l1.appendChild(title); f.appendChild(l1);
      var l2 = el('label', null, 'Where it belongs'); var sel = el('select');
      cats.forEach(function (c) { var op = el('option', null, c.name); op.value = c.id; sel.appendChild(op); });
      l2.appendChild(sel); f.appendChild(l2);
      var l3 = el('label', null, 'What you want to say'); var ta = el('textarea'); ta.rows = 4; ta.required = true; ta.maxLength = 65000; l3.appendChild(ta); f.appendChild(l3);
      f.appendChild(el('p', 'small hint', 'Only the people in this cohort can see it. It goes to GitHub as yours, marked as sent from Human Shaped, and stays there under your name even if you leave the cohort, unless you delete it.'));
      var acts = el('div', 'actions');
      var b = el('button', 'btn-quiet', 'Post it to GitHub'); b.type = 'submit';
      var msg = el('span', 'small'); msg.setAttribute('role', 'status');
      acts.appendChild(b); acts.appendChild(msg); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!title.value.trim() || !ta.value.trim()) return;
        b.disabled = true; msg.textContent = 'Posting to GitHub…';
        var old = f.querySelector('.talk-problem'); if (old) old.remove();
        D.ask(tok, D.CREATE, { repositoryId: list.repositoryId, categoryId: sel.value, title: title.value.trim(), body: ta.value.trim() }).then(function (r) {
          b.disabled = false;
          if (r.problem) {
            if (r.problem.kind === 'expired') return trouble(r.problem);
            msg.textContent = '';
            f.appendChild(explain(r.problem, o.repo));
            return;
          }
          var made = r.data && r.data.createDiscussion && r.data.createDiscussion.discussion;
          load(made ? made.id : null);
        });
      });
      wrap.appendChild(f);
      return wrap;
    }

    load();
  }

  // ------------------------------------------------------------------
  // /live/: the newest three, to bring on screen
  // ------------------------------------------------------------------
  function compact(box, o) {
    var where = D.splitRepo(o.repo);
    var tok = token(o.db, o.session);
    box.replaceChildren();
    if (!where) return;
    if (!tok) return noToken(box, o.db, o.repo, false, true);
    box.appendChild(el('p', 'small', 'Reading the conversation from GitHub…'));
    D.ask(tok, D.LIST, { owner: where.owner, name: where.name, n: 3 }).then(function (r) {
      box.replaceChildren();
      var list = !r.problem && D.shapeList(r.data);
      if (r.problem && r.problem.kind === 'expired') { forget(); return noToken(box, o.db, o.repo, true, true); }
      if (!list) {
        box.appendChild(explain(r.problem || { kind: 'not-visible' }, o.repo));
        box.appendChild(el('div', 'actions')).appendChild(link('https://github.com/' + o.repo + '/discussions', 'Open it on GitHub'));
        return;
      }
      if (!list.discussions.length) box.appendChild(el('p', 'small', 'No one has started a conversation yet.'));
      var ol = el('ol', 'talk-list compact');
      list.discussions.forEach(function (d) {
        var li = el('li', 'talk-item');
        var a = link(d.url, d.title, 'talk-title'); a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
        li.appendChild(el('p', 'small talk-meta', who(d.author) + ', ' + replies(d.comments) + ', last active ' + ago(d.lastActivity)));
        if (o.onShow) li.appendChild(button('Add it to the queue', 'btn-link', function () { o.onShow(d.url); }));
        ol.appendChild(li);
      });
      if (list.discussions.length) box.appendChild(ol);
      var foot = el('p', 'small talk-foot');
      foot.appendChild(link(list.url + '/discussions', 'Open the conversation on GitHub'));
      foot.appendChild(button('Read it again', 'btn-link', function () { compact(box, o); }));
      box.appendChild(foot);
    });
  }

  root.CohortTalk = { full: full, compact: compact, token: token, forget: forget };
})(typeof globalThis !== 'undefined' ? globalThis : this);
