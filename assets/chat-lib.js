// The in-class chat (R15, research/notes/active-learning-notes.md): a
// chat in the Meet panel whose every message is a comment on the
// session's "Week N, in class" discussion in the cohort's private
// repository (sessions.chat_number, migration 20261005040000). Each
// person posts as themselves with their own GitHub token; replies are
// GitHub's replies; reactions are GitHub's reactions. So the class's chat
// stays in GitHub, beside the cohort's ongoing conversation, after the
// call. Tested in tools/test/chat-lib.test.mjs.
(function (root) {
  // The chat: the discussion by its number, its newest comments with
  // their replies and reactions, and whether this reader reacted.
  var CHAT =
    'query($owner: String!, $name: String!, $n: Int!) {' +
    ' repository(owner: $owner, name: $name) {' +
    '  discussion(number: $n) { id url locked' +
    '   comments(last: 60) { totalCount nodes { id url bodyText createdAt isMinimized author { login }' +
    '    reactionGroups { content viewerHasReacted reactors { totalCount } }' +
    '    replies(first: 30) { nodes { id url bodyText createdAt isMinimized author { login }' +
    '     reactionGroups { content viewerHasReacted reactors { totalCount } } } } } }' +
    '  }' +
    ' }' +
    '}';
  // What a teacher needs to open the chat: the repository's id and its
  // categories.
  var REPO =
    'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id discussionCategories(first: 25) { nodes { id name slug } } } }';
  var OPEN =
    'mutation($repo: ID!, $cat: ID!, $title: String!, $body: String!) {' +
    ' createDiscussion(input: {repositoryId: $repo, categoryId: $cat, title: $title, body: $body}) { discussion { number url } } }';
  var SAY =
    'mutation($d: ID!, $body: String!) { addDiscussionComment(input: {discussionId: $d, body: $body}) { comment { id } } }';
  var REPLY =
    'mutation($d: ID!, $to: ID!, $body: String!) { addDiscussionComment(input: {discussionId: $d, replyToId: $to, body: $body}) { comment { id } } }';
  var REACT = 'mutation($s: ID!, $c: ReactionContent!) { addReaction(input: {subjectId: $s, content: $c}) { reaction { content } } }';
  var UNREACT = 'mutation($s: ID!, $c: ReactionContent!) { removeReaction(input: {subjectId: $s, content: $c}) { reaction { content } } }';

  // GitHub's eight reactions, in its own order.
  var REACTIONS = [
    { content: 'THUMBS_UP', emoji: '👍', label: 'Thumbs up' },
    { content: 'HEART', emoji: '❤️', label: 'Heart' },
    { content: 'LAUGH', emoji: '😄', label: 'Laugh' },
    { content: 'HOORAY', emoji: '🎉', label: 'Hooray' },
    { content: 'ROCKET', emoji: '🚀', label: 'Rocket' },
    { content: 'EYES', emoji: '👀', label: 'Eyes' },
    { content: 'CONFUSED', emoji: '😕', label: 'Confused' },
    { content: 'THUMBS_DOWN', emoji: '👎', label: 'Thumbs down' }
  ];
  function reactionOf(content) { return REACTIONS.filter(function (r) { return r.content === content; })[0] || null; }

  var MAX = 2000;

  // What a person shares from their own AI agent is marked as AI, in
  // the message itself, so it reads that way on GitHub too.
  var AI_MARK = '🤖 From my AI agent:';
  function aiBody(text) { return AI_MARK + '\n\n' + String(text || '').trim(); }
  function readAi(text) {
    var t = String(text || '');
    if (t.indexOf(AI_MARK) !== 0) return { ai: false, text: t };
    return { ai: true, text: t.slice(AI_MARK.length).replace(/^\s+/, '') };
  }

  // A message to post, or null when it is empty or too long.
  function body(text, fromAgent) {
    var t = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim();
    if (!t || t.length > MAX) return null;
    return fromAgent ? aiBody(t) : t;
  }

  function shapeOne(c) {
    var said = readAi(c.bodyText);
    return {
      id: c.id, url: c.url, author: c.author ? c.author.login : 'someone who has left GitHub',
      at: c.createdAt, text: said.text, ai: said.ai, hidden: !!c.isMinimized,
      reactions: (c.reactionGroups || []).map(function (g) {
        var r = reactionOf(g.content);
        return r ? { content: g.content, emoji: r.emoji, count: (g.reactors && g.reactors.totalCount) || 0, mine: !!g.viewerHasReacted } : null;
      }).filter(function (r) { return r && r.count > 0; })
    };
  }
  function shape(data) {
    var d = data && data.repository && data.repository.discussion;
    if (!d) return null;
    return {
      id: d.id, url: d.url, locked: !!d.locked, total: d.comments.totalCount,
      messages: (d.comments.nodes || []).map(function (c) {
        var m = shapeOne(c);
        m.replies = ((c.replies && c.replies.nodes) || []).map(shapeOne);
        return m;
      })
    };
  }

  // The discussion's title and opening, and the category it goes in:
  // one named for sessions or class if the repository has it, else
  // General.
  function weekTitle(session) { return 'Week ' + Number(session && session.number) + ', in class'; }
  function opening(session, liveUrl) {
    return 'The in-class chat for week ' + Number(session && session.number) + '. Everything said in the Meet panel’s chat during class is here, posted by the person who said it.' +
      (liveUrl ? '\n\nThe session page: ' + liveUrl : '');
  }
  function category(cats) {
    var list = cats || [];
    return list.filter(function (c) { return /class|session|live/i.test(c.name); })[0] ||
      list.filter(function (c) { return /general/i.test(c.name); })[0] || list[0] || null;
  }

  // The GitHub token, handed from the sign-in window to the panel that
  // opened it, on this site's origin only, and nothing else with it.
  var TOKEN = 'hs-github';
  function tokenMessage(token) {
    return typeof token === 'string' && /^[A-Za-z0-9_]{20,255}$/.test(token) ? { type: TOKEN, token: token } : null;
  }
  function acceptToken(event, origin, opened) {
    if (!event || event.origin !== origin || !opened || event.source !== opened) return null;
    var d = event.data;
    if (!d || d.type !== TOKEN || typeof d.token !== 'string' || !/^[A-Za-z0-9_]{20,255}$/.test(d.token)) return null;
    return d.token;
  }

  // How long ago, in a few words.
  function ago(iso, now) {
    var s = Math.max(0, Math.round(((now || Date.now()) - Date.parse(iso)) / 1000));
    if (!isFinite(s)) return '';
    if (s < 60) return 'just now';
    var m = Math.round(s / 60);
    return m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago';
  }

  var lib = {
    CHAT: CHAT, REPO: REPO, OPEN: OPEN, SAY: SAY, REPLY: REPLY, REACT: REACT, UNREACT: UNREACT,
    REACTIONS: REACTIONS, reactionOf: reactionOf, MAX: MAX, AI_MARK: AI_MARK, aiBody: aiBody, readAi: readAi, body: body,
    shape: shape, weekTitle: weekTitle, opening: opening, category: category,
    tokenMessage: tokenMessage, acceptToken: acceptToken, ago: ago
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ChatLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
