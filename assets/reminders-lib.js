// Reminders: the words and the timing, for the home page and the
// reminders function alike, so an email never says what the site does not
// (research/notes/notifications-notes.md). Tested in
// tools/test/reminders-lib.test.mjs. Words by Claude, awaiting Ben's review.
(function (root) {
  var SITE = 'https://humanshaped.org';
  var ACCOUNT = SITE + '/account/#reminders';
  var HOUR = 8;      // the digest goes out from this hour, on the cohort's clock
  var WINDOW = 3;    // days before a session that the digest starts

  function sessionName(n) { return Number(n) === 0 ? 'Prep' : 'Week ' + n; }
  function sessionUrl(slug, n) { return '/session/?c=' + encodeURIComponent(slug) + '&s=' + Number(n); }
  function cohortUrl(slug, tab) { return '/cohort/?c=' + encodeURIComponent(slug) + (tab ? '&t=' + tab : ''); }

  // One open item as a sentence that starts with what to do, and where.
  function line(i) {
    var by = i.session_number == null ? '' : ' before ' + sessionName(i.session_number);
    if (i.kind === 'prep') return { text: 'Answer ' + (i.amount === 1 ? '1 question' : i.amount + ' questions') + by, href: sessionUrl(i.slug, i.session_number) };
    if (i.kind === 'exchange') return { text: 'Reply to the exchange' + by + (i.label ? ': ' + i.label : ''), href: '/exchange/#' + i.token };
    if (i.kind === 'repo') return { text: 'Add your repository and address', href: cohortUrl(i.slug, 'mine') };
    if (i.kind === 'invite') return { text: 'Accept your GitHub invitation', href: 'https://github.com/orgs/humanshaped/invitation' };
    return null;
  }

  function eventLine(e, slug) {
    if (e.kind === 'note') return { text: 'Read the note a leader wrote you', href: '/account/#notes' };
    if (e.kind === 'feedback') return { text: 'Read the feedback on what you shared', href: cohortUrl(slug, 'mine') };
    if (e.kind === 'video') return { text: 'Watch the new video in your exchange', href: '/exchange/#' + e.token };
    if (e.kind === 'reply') return { text: 'Watch the reply to your video', href: '/exchange/#' + e.token };
    return null;
  }

  // Dated items first, the nearest first; nothing else about order.
  function sorted(items) {
    return (items || []).slice().sort(function (a, b) {
      var x = a.starts_at ? Date.parse(a.starts_at) : Infinity, y = b.starts_at ? Date.parse(b.starts_at) : Infinity;
      return x === y ? 0 : x - y;
    });
  }

  function parts(date, zone) {
    var o = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return o;
  }
  function localDay(date, zone) { var p = parts(date, zone); return p.year + '-' + p.month + '-' + p.day; }
  function localHour(date, zone) { return Number(parts(date, zone).hour); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }

  // At most once a day, from the morning on, in the days before a session.
  function digestDue(o) {
    if (!o.hasItems || !o.nextStart) return false;
    var today = localDay(o.now, o.zone);
    if (o.lastOn === today || localHour(o.now, o.zone) < HOUR) return false;
    var left = daysBetween(today, localDay(new Date(o.nextStart), o.zone));
    return left >= 0 && left <= WINDOW;
  }

  function when(iso, zone) {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
  }
  function full(href) { return /^https:/.test(href) ? href : SITE + href; }
  function md(l) { return '[' + l.text.replace(/[\[\]]/g, '') + '](' + full(l.href) + ')'; }
  function footer() { return '[Stop these reminders](' + ACCOUNT + ')'; }

  // What a learner reads. Null when there is nothing to do.
  function learnerMessage(o) {
    var todo = sorted(o.items).map(line).filter(Boolean);
    var fresh = (o.events || []).map(function (e) { return eventLine(e, o.slug); }).filter(Boolean);
    if (!todo.length && !fresh.length) return null;
    var out = ['@' + o.login];
    if (todo.length) {
      if (o.nextStart) out.push(sessionName(o.nextNumber) + ' is ' + when(o.nextStart, o.zone) + '.');
      out.push(todo.map(function (l, i) { return (i + 1) + '. ' + md(l); }).join('\n'));
    }
    if (fresh.length) out.push(fresh.map(function (l) { return '- ' + md(l); }).join('\n'));
    out.push(footer());
    return out.join('\n\n');
  }

  // What a leader reads: who has what open, by name, and what waits on them.
  function leaderMessage(o) {
    var out = ['@' + o.login];
    var people = o.people || [], issues = o.issues || [];
    var fresh = (o.events || []).map(function (e) { return eventLine(e, o.slug); }).filter(Boolean);
    if (!people.length && !issues.length && !o.feedback && !fresh.length) return null;
    if (o.nextStart) out.push(sessionName(o.nextNumber) + ' is ' + when(o.nextStart, o.zone) + '.');
    if (people.length) {
      out.push('**Still open**\n\n' + people.map(function (p) {
        return '- ' + p.name + ': ' + sorted(p.items).map(function (i) { return line(Object.assign({}, i, { label: null })); }).filter(Boolean).map(function (l) { return l.text.charAt(0).toLowerCase() + l.text.slice(1); }).join('; ');
      }).join('\n'));
    }
    if (o.feedback) out.push('[Give feedback on ' + (o.feedback === 1 ? '1 piece of shared work' : o.feedback + ' pieces of shared work') + '](' + SITE + '/teach/feedback/)');
    if (issues.length) out.push('**Open issues in your cohort repository**\n\n' + issues.map(function (i) { return '- [' + String(i.title).replace(/[\[\]]/g, '') + '](' + i.html_url + ')'; }).join('\n'));
    if (fresh.length) out.push(fresh.map(function (l) { return '- ' + md(l); }).join('\n'));
    out.push('[Open your cohort](' + SITE + cohortUrl(o.slug) + ')');
    out.push(footer());
    return out.join('\n\n');
  }

  function issueTitle(cohortTitle) { return 'What is open for you: ' + cohortTitle; }
  function repoFor(login) { return 'reminders-' + String(login).toLowerCase(); }

  var lib = { line: line, eventLine: eventLine, sorted: sorted, digestDue: digestDue, localDay: localDay, learnerMessage: learnerMessage, leaderMessage: leaderMessage, issueTitle: issueTitle, repoFor: repoFor, HOUR: HOUR, WINDOW: WINDOW };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else if (typeof globalThis !== 'undefined') globalThis.ReminderLib = lib;
  if (root && root !== globalThis) root.ReminderLib = lib;
})(typeof window !== 'undefined' ? window : globalThis);
