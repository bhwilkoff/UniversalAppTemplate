// Pure helpers for the week-5 showing, open to guests (LOOP-PLAN.md, H5;
// COURSE.md week 5, "Shown to everyone, guests welcome"), and for the
// lesson a cohort sends back to the template ("What a cohort gives
// back"). The showcases come from public_showcases() (migration
// 20261004030000), which returns only what a teacher chose to make
// public; everything is still checked and cut to size here before a page
// shows it. Used by /showcase/, /events/, /teach/, and /cohort/, and
// tested in tools/test/showcase-lib.test.mjs.
(function (root) {
  var SLUG = /^[a-z0-9-]{1,60}$/;
  var REPO = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
  var MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]{3,40}$/;
  var TEMPLATE = 'bhwilkoff/UniversalAppTemplate';

  function text(v, max) {
    if (typeof v !== 'string') return '';
    var t = v.replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
  }

  function safeUrl(v) {
    if (typeof v !== 'string') return null;
    try { var u = new URL(v.trim()); return u.protocol === 'https:' ? u.href : null; } catch (e) { return null; }
  }

  // The date and clock of an instant in a time zone, as the events list
  // reads them ({ y, m, d, h, min, day }), or null.
  function localParts(iso, timeZone) {
    var t = Date.parse(iso);
    if (isNaN(t)) return null;
    var f;
    try {
      f = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    } catch (e) { return null; }
    var p = {};
    f.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    var out = { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute };
    out.day = p.year + '-' + p.month + '-' + p.day;
    return out;
  }

  function cleanApp(a) {
    if (!a || typeof a !== 'object' || typeof a.app_repo !== 'string' || !REPO.test(a.app_repo)) return null;
    return { repo: a.app_repo, name: text(a.app_name, 80) || a.app_repo.split('/')[1], url: safeUrl(a.app_url) };
  }

  // One row of public_showcases(), as a page may show it, or null.
  function cleanShowcase(r) {
    if (!r || typeof r !== 'object' || typeof r.cohort_slug !== 'string' || !SLUG.test(r.cohort_slug)) return null;
    var startsMs = Date.parse(r.starts_at);
    var minutes = typeof r.minutes === 'number' && r.minutes > 0 && r.minutes <= 240 ? r.minutes : 90;
    var zone = text(r.time_zone, 60) || 'UTC';
    return {
      slug: r.cohort_slug,
      cohort: text(r.cohort_title, 120) || r.cohort_slug,
      number: typeof r.session_number === 'number' ? r.session_number : null,
      title: text(r.title, 120),
      startsAt: isNaN(startsMs) ? null : new Date(startsMs).toISOString(),
      endsAt: isNaN(startsMs) ? null : new Date(startsMs + minutes * 60000).toISOString(),
      minutes: minutes,
      timeZone: zone,
      guestLink: typeof r.guest_link === 'string' && MEET.test(r.guest_link) ? r.guest_link : null,
      apps: (Array.isArray(r.apps) ? r.apps : []).map(cleanApp).filter(Boolean)
    };
  }

  function cleanAll(rows) { return (Array.isArray(rows) ? rows : []).map(cleanShowcase).filter(Boolean); }

  // The showcase a guest following /showcase/?c=<slug> should see: the
  // next one that has not ended, or else the most recent one.
  function showcaseFor(rows, slug, now) {
    var t = (now || new Date()).getTime();
    var mine = cleanAll(rows).filter(function (s) { return s.slug === slug && s.startsAt; });
    var ahead = mine.filter(function (s) { return Date.parse(s.endsAt) >= t; }).sort(function (a, b) { return Date.parse(a.startsAt) - Date.parse(b.startsAt); });
    if (ahead.length) return ahead[0];
    var past = mine.sort(function (a, b) { return Date.parse(b.startsAt) - Date.parse(a.startsAt); });
    return past[0] || null;
  }

  // Whether the showing is on now, coming up, or over.
  function stateOf(s, now) {
    if (!s || !s.startsAt) return 'unknown';
    var t = (now || new Date()).getTime();
    if (t < Date.parse(s.startsAt)) return 'upcoming';
    if (t <= Date.parse(s.endsAt)) return 'now';
    return 'over';
  }

  // A showcase in the shape the events list draws (CommunityLib's
  // cleaned events), linking to its own page on this site.
  function toEvent(s) {
    var starts = localParts(s.startsAt, s.timeZone), ends = localParts(s.endsAt, s.timeZone);
    if (!starts) return null;
    return {
      slug: null,
      title: s.cohort + ': ' + (s.title || 'the showing'),
      kind: 'showcase',
      starts: starts,
      ends: ends && ends.day === starts.day ? ends : null,
      timeZone: s.timeZone,
      place: '',
      online: null,
      link: '/showcase/?c=' + encodeURIComponent(s.slug),
      host: null,
      about: 'The last session of a five-week cohort, where everyone shows what they built. Guests are welcome.',
      writeUp: null,
      showcase: true
    };
  }

  // Showcases split the way the events list splits events: coming up
  // through their end, soonest first; past, newest first.
  function splitShowcases(rows, now) {
    var t = (now || new Date()).getTime();
    var all = cleanAll(rows).filter(function (s) { return s.startsAt; });
    var up = all.filter(function (s) { return Date.parse(s.endsAt) >= t; }).sort(function (a, b) { return Date.parse(a.startsAt) - Date.parse(b.startsAt); });
    var past = all.filter(function (s) { return Date.parse(s.endsAt) < t; }).sort(function (a, b) { return Date.parse(b.startsAt) - Date.parse(a.startsAt); });
    return { upcoming: up.map(toEvent).filter(Boolean), past: past.map(toEvent).filter(Boolean) };
  }

  function eventKey(e) {
    return e.starts.day + 'T' + String(e.starts.h == null ? 0 : e.starts.h).padStart(2, '0') + String(e.starts.min || 0).padStart(2, '0');
  }

  // Two splits (community events and showcases) as one, in order.
  function mergeSplits(a, b) {
    function up(x, y) { return eventKey(x) < eventKey(y) ? -1 : eventKey(x) > eventKey(y) ? 1 : 0; }
    return {
      upcoming: (a.upcoming || []).concat(b.upcoming || []).sort(up),
      past: (a.past || []).concat(b.past || []).sort(function (x, y) { return -up(x, y); })
    };
  }

  // Whether a cohort has reached the week its lesson is chosen: it is
  // finished, or its last session has begun.
  function lessonTime(cohort, sessions, now) {
    if (!cohort) return false;
    if (cohort.status === 'finished') return true;
    var t = (now || new Date()).getTime();
    var list = (sessions || []).filter(function (s) { return s && s.starts_at; });
    if (!list.length) return false;
    var last = list.reduce(function (a, b) { return (b.number || 0) > (a.number || 0) ? b : a; });
    var weeks = cohort.weeks || last.number;
    return (last.number || 0) >= weeks && Date.parse(last.starts_at) <= t;
  }

  // A new issue on the template, written out for the cohort to fill in.
  // It carries the cohort's title only when given, and nothing about any
  // person: credit is the cohort's to add, with each person's yes.
  function lessonIssueUrl(cohortTitle) {
    var from = text(cohortTitle, 120);
    var title = 'A lesson from ' + (from || 'a cohort') + ': ';
    var body = [
      '## The lesson',
      '',
      'One thing this cohort learned that the next builder should not have to learn again: a prompt that worked, a step that broke, or a correction that kept coming up.',
      '',
      '## Where it came from',
      '',
      'Which stage or step of the path it belongs to, and what happened.',
      '',
      '## What should change',
      '',
      'The words, step, skill, or tool you would change, if you know.',
      '',
      '## Who learned it',
      '',
      'Credit the people who learned it, by their GitHub names, only if each of them said yes.',
      '',
      '_Everything here is public, so leave out anything private about anyone._'
    ].join('\n');
    return 'https://github.com/' + TEMPLATE + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  var lib = {
    localParts: localParts, cleanShowcase: cleanShowcase, cleanAll: cleanAll, showcaseFor: showcaseFor, stateOf: stateOf,
    toEvent: toEvent, splitShowcases: splitShowcases, mergeSplits: mergeSplits, lessonTime: lessonTime, lessonIssueUrl: lessonIssueUrl
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ShowcaseLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
