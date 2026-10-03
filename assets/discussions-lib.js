// The cohort's conversation, read from and posted to GitHub Discussions
// as the student, with their own GitHub token (research/notes/
// cohort-conversation-notes.md, sections 2 and 7). This file holds the
// GraphQL, the shaping of GitHub's answers, the plain reading of its
// errors, and where the token is kept. Tested in
// tools/test/discussions-lib.test.mjs.
(function (root) {
  var API = 'https://api.github.com/graphql';

  // The newest discussions, the categories a new one can go in, and the
  // repository's ID (createDiscussion needs it). One point an hour's
  // 5,000. The newest comment's time is read too, because GitHub does
  // not say whether UPDATED_AT moves when someone comments.
  var LIST =
    'query($owner: String!, $name: String!, $n: Int!) {' +
    ' repository(owner: $owner, name: $name) {' +
    '  id url' +
    '  discussionCategories(first: 25) { nodes { id name slug } }' +
    '  discussions(first: $n, orderBy: {field: UPDATED_AT, direction: DESC}) {' +
    '   totalCount' +
    '   nodes { id number title url createdAt updatedAt' +
    '    author { login url }' +
    '    category { name }' +
    '    comments(last: 1) { totalCount nodes { createdAt } } }' +
    '  }' +
    ' }' +
    '}';

  // One thread: its opening post, its comments, and their replies.
  var THREAD =
    'query($id: ID!) {' +
    ' node(id: $id) { ... on Discussion {' +
    '  id number title url bodyHTML createdAt locked' +
    '  author { login url }' +
    '  category { name }' +
    '  comments(first: 50) { totalCount nodes { id url bodyHTML createdAt isMinimized' +
    '   author { login url }' +
    '   replies(first: 20) { totalCount nodes { id url bodyHTML createdAt isMinimized author { login url } } } } }' +
    ' } }' +
    '}';

  var CREATE =
    'mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {' +
    ' createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {' +
    '  discussion { id number url }' +
    ' }' +
    '}';

  var COMMENT =
    'mutation($discussionId: ID!, $body: String!) {' +
    ' addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {' +
    '  comment { id url }' +
    ' }' +
    '}';

  function splitRepo(repo) {
    var m = String(repo || '').match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
    return m ? { owner: m[1], name: m[2] } : null;
  }

  function person(a) {
    // A deleted GitHub account comes back as null (GitHub shows "ghost").
    return a && a.login ? { login: a.login, url: a.url || 'https://github.com/' + a.login } : null;
  }

  function later(a, b) { return !a ? b : !b ? a : (Date.parse(a) >= Date.parse(b) ? a : b); }

  function shapeList(data) {
    var r = data && data.repository;
    if (!r) return null;
    var d = r.discussions || { totalCount: 0, nodes: [] };
    return {
      repositoryId: r.id,
      url: r.url,
      total: d.totalCount || 0,
      categories: ((r.discussionCategories || {}).nodes || []).map(function (c) { return { id: c.id, name: c.name, slug: c.slug }; }),
      discussions: (d.nodes || []).filter(Boolean).map(function (n) {
        var last = n.comments && n.comments.nodes && n.comments.nodes[0];
        return {
          id: n.id,
          number: n.number,
          title: n.title,
          url: n.url,
          author: person(n.author),
          category: n.category ? n.category.name : null,
          comments: n.comments ? n.comments.totalCount : 0,
          lastActivity: later(later(n.createdAt, n.updatedAt), last && last.createdAt)
        };
      })
    };
  }

  function shapeComment(c) {
    return { id: c.id, url: c.url, html: c.bodyHTML || '', createdAt: c.createdAt, author: person(c.author), minimized: !!c.isMinimized };
  }

  function shapeThread(data) {
    var n = data && data.node;
    if (!n || !n.id) return null;
    var cs = n.comments || { totalCount: 0, nodes: [] };
    var shown = 0;
    var comments = (cs.nodes || []).filter(Boolean).map(function (c) {
      var x = shapeComment(c);
      var rs = c.replies || { totalCount: 0, nodes: [] };
      x.replies = (rs.nodes || []).filter(Boolean).map(shapeComment);
      x.moreReplies = Math.max(0, (rs.totalCount || 0) - x.replies.length);
      shown += 1;
      return x;
    });
    return {
      id: n.id, number: n.number, title: n.title, url: n.url, html: n.bodyHTML || '',
      createdAt: n.createdAt, locked: !!n.locked,
      author: person(n.author), category: n.category ? n.category.name : null,
      comments: comments, total: cs.totalCount || 0, more: Math.max(0, (cs.totalCount || 0) - shown)
    };
  }

  // The categories a student can start a conversation in. Announcements
  // (only maintainers may start one) and Polls (the API cannot give a
  // poll its choices) are left out; General comes first.
  var NOT_FOR_STARTING = ['announcements', 'polls'];
  function postableCategories(categories) {
    var list = (categories || []).filter(function (c) {
      return NOT_FOR_STARTING.indexOf(String(c.slug || c.name || '').toLowerCase()) === -1;
    });
    return list.filter(function (c) { return /^general$/i.test(c.name); })
      .concat(list.filter(function (c) { return !/^general$/i.test(c.name); }));
  }

  // GitHub's answer, read as a person would want it said. Returns null
  // when nothing went wrong.
  //   expired      the token is no longer good (sign in again)
  //   not-visible  GitHub will not show the repository to this person
  //   rate         GitHub's rate limit
  //   forbidden    GitHub refused this one thing
  //   github       anything else GitHub said
  function problem(status, body) {
    var errors = (body && body.errors) || [];
    var first = errors[0] || {};
    var text = first.message || (body && body.message) || '';
    if (status === 401) return { kind: 'expired', message: text || 'Bad credentials' };
    var rate = errors.some(function (e) { return e.type === 'RATE_LIMITED' || /rate limit/i.test(e.message || ''); }) ||
      ((status === 403 || status === 429) && /rate limit|abuse|secondary/i.test(text));
    if (rate) return { kind: 'rate', message: text };
    if (status >= 400) return { kind: status === 403 ? 'forbidden' : 'github', message: text || 'GitHub answered ' + status + '.' };
    if (!errors.length) return null;
    if (errors.some(function (e) { return e.type === 'NOT_FOUND' && e.path && (e.path[0] === 'repository' || e.path[0] === 'node'); })) {
      return { kind: 'not-visible', message: text };
    }
    if (errors.some(function (e) { return e.type === 'FORBIDDEN'; }) || /not accessible by integration|permission/i.test(text)) {
      return { kind: 'forbidden', message: text };
    }
    return { kind: 'github', message: text };
  }

  // Ask GitHub once. Resolves to { data } or { problem }, never rejects.
  function ask(token, query, variables, fetchImpl) {
    var f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!token) return Promise.resolve({ problem: { kind: 'expired', message: 'No GitHub token in this tab.' } });
    return f(API, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        var p = problem(r.status, body);
        // A partial answer with an error is still a problem worth naming.
        return p ? { problem: p, data: body.data || null } : { data: body.data };
      });
    }, function () {
      return { problem: { kind: 'offline', message: 'GitHub could not be reached.' } };
    });
  }

  // ---------------------------------------------------------------
  // The token. GitHub hands it over once, right after sign-in, and it
  // lasts eight hours. It is kept for this browser tab only
  // (sessionStorage), and taken out of the session supabase-js saves in
  // localStorage, so the student's GitHub key never sits in long-lived
  // storage. It is only ever sent to api.github.com.
  // ---------------------------------------------------------------
  var KEY = 'hs-github-token';
  var LIFE = 7.5 * 3600000;   // GitHub's eight hours, less a margin

  function remember(session, store, now) {
    var t = session && session.provider_token;
    if (!t || !store) return;
    try {
      var held = JSON.parse(store.getItem(KEY) || 'null');
      if (held && held.token === t) return;
      store.setItem(KEY, JSON.stringify({ token: t, at: now }));
    } catch (e) {}
  }

  function read(store, now) {
    if (!store) return null;
    try {
      var held = JSON.parse(store.getItem(KEY) || 'null');
      if (!held || typeof held.token !== 'string') return null;
      if (now - held.at > LIFE) { store.removeItem(KEY); return null; }
      return held.token;
    } catch (e) { return null; }
  }

  function forget(store) { try { if (store) store.removeItem(KEY); } catch (e) {} }

  // Remove the provider's tokens from the session supabase-js stored.
  // Only those two fields change; anything unexpected is left alone.
  function scrub(store, storageKey) {
    if (!store || !storageKey) return false;
    try {
      var raw = store.getItem(storageKey);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !('provider_token' in s || 'provider_refresh_token' in s)) return false;
      delete s.provider_token;
      delete s.provider_refresh_token;
      store.setItem(storageKey, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  }

  // Everything a page does with the token, in one call: keep a fresh one
  // from the session, scrub the long-lived copy, and say what this tab
  // holds now.
  function tokenFrom(session, stores, now, storageKey) {
    remember(session, stores.session, now);
    scrub(stores.local, storageKey);
    return read(stores.session, now);
  }

  var lib = {
    LIST: LIST, THREAD: THREAD, CREATE: CREATE, COMMENT: COMMENT, API: API,
    splitRepo: splitRepo, shapeList: shapeList, shapeThread: shapeThread,
    postableCategories: postableCategories, problem: problem, ask: ask,
    remember: remember, read: read, forget: forget, scrub: scrub, tokenFrom: tokenFrom,
    TOKEN_KEY: KEY, TOKEN_LIFE: LIFE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.DiscussionsLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
