// Pure helpers for the community side of the hub (LOOP-PLAN.md, G5):
// events people host and tell us about, the newest threads in the
// humanshaped discussions, and each app's own conversation on its page.
// The events and threads come from community.json, which a workflow in
// the public humanshaped/community repository publishes
// (tools/community/README.md); an app's threads are read live from
// GitHub. Everything here is untrusted text from GitHub, so it is
// checked and cut to size before a page shows it. Tested in
// tools/test/community-lib.test.mjs.
(function (root) {
  var KINDS = { meetup: 'Meetup', hackathon: 'Hackathon', showcase: 'Showcase', other: 'Gathering' };
  var LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
  var DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
  var STAMP = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function text(v, max) {
    if (typeof v !== 'string') return '';
    var t = v.replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }

  // Only https links leave this site from community data.
  function safeUrl(v) {
    if (typeof v !== 'string') return null;
    try { var u = new URL(v.trim()); return u.protocol === 'https:' ? u.href : null; } catch (e) { return null; }
  }

  function login(v) { return typeof v === 'string' && LOGIN.test(v.replace(/^@/, '')) ? v.replace(/^@/, '') : null; }

  // "2026-11-07" or "2026-11-07T18:30", read as the host wrote it, in
  // the event's own time zone, with no conversion.
  function parts(stamp) {
    var m = typeof stamp === 'string' ? stamp.match(STAMP) : null;
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var p = { y: y, m: mo, d: d, day: m[1] + '-' + m[2] + '-' + m[3] };
    if (m[4] != null) {
      if (+m[4] > 23 || +m[5] > 59) return null;
      p.h = +m[4]; p.min = +m[5];
    }
    return p;
  }

  // One event as a page may show it, or null when it is not usable.
  function cleanEvent(e) {
    if (!e || typeof e !== 'object') return null;
    var title = text(e.title, 120);
    var start = parts(e.starts);
    if (!title || !start) return null;
    var end = parts(e.ends);
    if (end && end.day < start.day) end = null;
    return {
      slug: typeof e.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(e.slug) ? e.slug : null,
      title: title,
      kind: KINDS[e.kind] ? e.kind : 'other',
      starts: start, ends: end,
      timeZone: text(e.time_zone, 60),
      place: text(e.place, 160),
      online: safeUrl(e.online),
      link: safeUrl(e.link),
      host: login(e.host),
      about: text(e.about, 400),
      writeUp: safeUrl(e.write_up)
    };
  }

  // The viewer's own date, as YYYY-MM-DD.
  function today(now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Coming up (soonest first) and already happened (newest first). An
  // event belongs to "coming up" through its last day.
  function splitEvents(list, now) {
    var t = today(now);
    var events = (Array.isArray(list) ? list : []).map(cleanEvent).filter(Boolean);
    function last(e) { return (e.ends || e.starts).day; }
    function key(e) { return e.starts.day + 'T' + String(e.starts.h == null ? 0 : e.starts.h).padStart(2, '0') + String(e.starts.min || 0).padStart(2, '0'); }
    var upcoming = events.filter(function (e) { return last(e) >= t; }).sort(function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
    var past = events.filter(function (e) { return last(e) < t; }).sort(function (a, b) { return key(a) > key(b) ? -1 : key(a) < key(b) ? 1 : 0; });
    return { upcoming: upcoming, past: past };
  }

  function weekday(p) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()]; }
  function clock(p) {
    var h = p.h % 12 || 12, ampm = p.h < 12 ? 'am' : 'pm';
    return h + (p.min ? ':' + String(p.min).padStart(2, '0') : '') + ' ' + ampm;
  }

  // "Saturday, November 7, 2026, at 6:30 pm (America/Denver)", or a
  // span of days, written out the same way for everyone.
  function whenText(e) {
    var s = e.starts, out = weekday(s) + ', ' + MONTHS[s.m - 1] + ' ' + s.d + ', ' + s.y;
    if (e.ends && e.ends.day !== s.day) {
      var en = e.ends;
      out += ', through ' + weekday(en) + ', ' + MONTHS[en.m - 1] + ' ' + en.d + (en.y !== s.y ? ', ' + en.y : '');
    } else if (s.h != null) {
      out += ', at ' + clock(s);
      if (e.ends && e.ends.h != null) out += ' until ' + clock(e.ends);
    }
    if (s.h != null && e.timeZone) out += ' (' + e.timeZone + ')';
    return out;
  }

  function kindName(kind) { return KINDS[kind] || KINDS.other; }

  // A thread from the humanshaped discussions, as community.json has it.
  function cleanThread(t) {
    if (!t || typeof t !== 'object') return null;
    var url = safeUrl(t.url);
    var title = text(t.title, 140);
    if (!url || !/^https:\/\/github\.com\//.test(url) || !title) return null;
    return {
      title: title, url: url,
      category: text(t.category, 40),
      author: login(t.author),
      comments: Math.max(0, Math.floor(Number(t.comments) || 0)),
      updatedAt: typeof t.updated_at === 'string' && !isNaN(Date.parse(t.updated_at)) ? t.updated_at : null
    };
  }

  function threads(list, limit) {
    return (Array.isArray(list) ? list : []).map(cleanThread).filter(Boolean).slice(0, limit || 5);
  }

  // An app's own conversation, from GitHub's REST list of its issues
  // (which includes pull requests, left out here) or from a GraphQL
  // list of its discussions. Both come out the same shape.
  function fromIssues(list, limit) {
    return (Array.isArray(list) ? list : []).filter(function (i) { return i && !i.pull_request; }).map(function (i) {
      return cleanThread({ title: i.title, url: i.html_url, author: i.user && i.user.login, comments: i.comments, updated_at: i.updated_at,
        category: i.state === 'closed' ? 'Closed' : '' });
    }).filter(Boolean).slice(0, limit || 3);
  }

  function fromDiscussions(data, limit) {
    var nodes = data && data.data && data.data.repository && data.data.repository.discussions && data.data.repository.discussions.nodes;
    return (Array.isArray(nodes) ? nodes : []).map(function (d) {
      return d && cleanThread({ title: d.title, url: d.url, author: d.author && d.author.login, comments: d.comments && d.comments.totalCount,
        updated_at: d.updatedAt, category: d.category && d.category.name });
    }).filter(Boolean).slice(0, limit || 3);
  }

  // The newest few discussions of one public repository, for GraphQL.
  var DISCUSSIONS = 'query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){discussions(first:$n,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{title url updatedAt author{login} comments{totalCount} category{name}}}}}';

  function replies(n) { return n === 0 ? 'no replies yet' : n === 1 ? '1 reply' : n + ' replies'; }

  // The line under a thread's title: who started it, its replies, and
  // when it last moved.
  function threadLine(t, ago) {
    var bits = [];
    if (t.author) bits.push(t.author);
    bits.push(replies(t.comments));
    if (t.updatedAt && ago) bits.push('active ' + ago(t.updatedAt));
    if (t.category) bits.push(t.category.toLowerCase() === 'closed' ? 'closed' : 'in ' + t.category);
    return bits.join(', ');
  }

  var lib = {
    KINDS: KINDS, DISCUSSIONS: DISCUSSIONS,
    text: text, safeUrl: safeUrl, login: login, parts: parts, cleanEvent: cleanEvent, today: today, splitEvents: splitEvents,
    whenText: whenText, kindName: kindName, cleanThread: cleanThread, threads: threads,
    fromIssues: fromIssues, fromDiscussions: fromDiscussions, replies: replies, threadLine: threadLine
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.CommunityLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
