// The session's thread (research/notes/meet-classroom-design.md, Wish 6
// and C5): one GitHub discussion for each live session, opened by a
// teacher from /live/ in the cohort's private repository, and shown on
// /live/ (and linked from the add-on) so anyone can post to it as
// themselves. Meet's chat stays for the moment; what should last goes
// here. This file holds the GraphQL, the words the thread opens with,
// which category it goes in, and when to read it again. Tested in
// tools/test/session-thread-lib.test.mjs.
//
// Copy here is awaiting Ben's review.
(function (root) {
  var D = typeof module !== 'undefined' && module.exports ? require('./discussions-lib.js') : root.DiscussionsLib;

  // The repository's ID and categories (to open the thread) and, when
  // the session has one, its thread by number, with the same fields as
  // DiscussionsLib.THREAD so its shaping can be reused.
  var BY_NUMBER =
    'query($owner: String!, $name: String!, $number: Int!, $has: Boolean!) {' +
    ' repository(owner: $owner, name: $name) {' +
    '  id url' +
    '  discussionCategories(first: 25) { nodes { id name slug } }' +
    '  discussion(number: $number) @include(if: $has) {' +
    '   id number title url bodyHTML createdAt locked' +
    '   author { login url }' +
    '   category { name }' +
    '   comments(last: 50) { totalCount nodes { id url bodyHTML createdAt isMinimized' +
    '    author { login url }' +
    '    replies(first: 20) { totalCount nodes { id url bodyHTML createdAt isMinimized author { login url } } } } }' +
    '  }' +
    ' }' +
    '}';

  function variables(repo, number) {
    var where = D.splitRepo(repo);
    if (!where) return null;
    var n = parseInt(number, 10);
    return { owner: where.owner, name: where.name, number: n > 0 ? n : 1, has: n > 0 };
  }

  // GitHub's answer as { repositoryId, url, categories, thread }, where
  // thread is null when the session has none yet, or when GitHub no
  // longer has that number (someone deleted the discussion).
  function shape(data) {
    var r = data && data.repository;
    if (!r) return null;
    return {
      repositoryId: r.id,
      url: r.url,
      categories: ((r.discussionCategories || {}).nodes || []).map(function (c) { return { id: c.id, name: c.name, slug: c.slug }; }),
      thread: r.discussion ? D.shapeThread({ node: r.discussion }) : null
    };
  }

  // Where the thread goes: a category made for sessions if the cohort's
  // repository has one, then General, then the first a person can start
  // a discussion in. Null when there is none.
  function category(categories) {
    var list = D.postableCategories(categories);
    var sessions = list.filter(function (c) { return /session|live|class/i.test(c.name); })[0];
    return sessions || list[0] || null;
  }

  function weekName(session) {
    var n = 'Week ' + session.number;
    return session.title && session.title !== n ? n + ': ' + session.title : n;
  }

  // The thread's title and opening words, the same for every teacher.
  function title(session) { return weekName(session) + ', the session thread'; }

  function body(session, liveUrl) {
    return [
      'This is the thread for ' + weekName(session) + '’s live session.',
      'Links, questions for later, and whatever you are stuck on can go here, and they stay, under your own name, after the call ends. Meet’s chat is for the moment, and this is for what should last.',
      'You can post here on GitHub or from the session page' + (/^https:\/\//.test(liveUrl || '') ? ' (' + liveUrl + ')' : '') + ', and you can edit or delete what you wrote, here, at any time.'
    ].join('\n\n');
  }

  // The thread's address on GitHub, for a link, or null.
  function threadUrl(repo, number) {
    var n = parseInt(number, 10);
    return D.splitRepo(repo) && n > 0 ? 'https://github.com/' + repo + '/discussions/' + n : null;
  }

  // What the page should offer, from what it knows.
  //   none      no repository for the cohort, so no thread
  //   waiting   no thread yet, and this person cannot open one
  //   open      a teacher with a GitHub token can open it
  //   signin    a teacher whose token has run out in this tab
  //   show      the thread exists; read it (with a token) or link to it
  function state(o) {
    if (!D.splitRepo(o.repo)) return 'none';
    if (o.number > 0) return 'show';
    if (!o.teaching) return 'waiting';
    return o.token ? 'open' : 'signin';
  }

  // How long to wait before reading again: every twenty seconds while
  // the page is in front of someone, and not at all while it is hidden
  // (a hidden tab reads again when it is shown). GitHub's GraphQL limit
  // is 5,000 points an hour for each person, and a read costs one.
  var EVERY = 20000;
  function nextRead(visible) { return visible ? EVERY : null; }

  // When a second teacher opened a thread at the same moment, the
  // session keeps the first one stored, and the extra one is named so the
  // teacher can delete it on GitHub.
  function settle(stored, made) {
    if (!stored) return { keep: made, extra: null };
    return { keep: stored, extra: made && made !== stored ? made : null };
  }

  var lib = {
    BY_NUMBER: BY_NUMBER, variables: variables, shape: shape, category: category,
    title: title, body: body, threadUrl: threadUrl, state: state, nextRead: nextRead, settle: settle, EVERY: EVERY
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SessionThreadLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
