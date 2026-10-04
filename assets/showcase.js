// The week-5 showing for guests, at /showcase/?c=<slug> (LOOP-PLAN.md,
// H5). It reads public_showcases() (migration 20261004030000) with the
// hub's public key and no sign-in, and shows only what the cohort's
// teacher made public: when the showing is, the way in if the teacher
// shared it, and the apps their builders chose to show. Words by Claude,
// awaiting Ben's review.
(function () {
  var S = window.ShowcaseLib, HUB = window.HUB;
  var root = document.querySelector('[data-showcase]');
  if (!S || !root) return;
  var slug = new URLSearchParams(location.search).get('c') || '';

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text, cls) { var a = el('a', cls, text); a.href = href; return a; }
  function status(words, withEvents) {
    var p = $('[data-showcase-status]');
    p.replaceChildren(document.createTextNode(words));
    if (withEvents) { p.appendChild(document.createTextNode(' ')); p.appendChild(link('/events/', 'Events')); p.appendChild(document.createTextNode(' lists every showing that is coming up.')); }
    p.hidden = false;
  }

  function whenText(s) {
    var d = new Date(s.startsAt);
    var opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: s.timeZone, timeZoneName: 'short' };
    var there = d.toLocaleString('en-US', opts);
    var here = '';
    try {
      if (Intl.DateTimeFormat().resolvedOptions().timeZone !== s.timeZone) {
        here = d.toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      }
    } catch (e) { here = ''; }
    return there + ', for ' + s.minutes + ' minutes' + (here ? ' (' + here + ' where you are)' : '') + '.';
  }

  function drawJoin(s, state) {
    var box = $('[data-join]');
    box.replaceChildren();
    if (state === 'over') {
      box.appendChild(el('p', null, 'This showing has happened. The apps below are still being built, and each one’s page follows what comes next for it.'));
      return;
    }
    if (s.guestLink) {
      box.appendChild(el('p', null, 'The call is on Google Meet, hosted by meet@humanshaped.org. Open the link a few minutes early and choose Ask to join, and someone in the room will let you in.'));
      box.appendChild(el('p', null, 'You do not need a Google account to come from a computer: open the link in your browser, type your name, and choose Ask to join. From a phone, the Meet app may ask you to sign in first, so a computer is the easier way in.'));
      var a = el('p', 'actions');
      a.appendChild(link(s.guestLink, state === 'now' ? 'Join the showing now' : 'The link to join', 'btn-quiet'));
      box.appendChild(a);
    } else {
      box.appendChild(el('p', null, 'The cohort’s teacher shares the way in with the guests they invite, so if someone asked you to come, the link is in their invitation. If the teacher posts it here, it will appear on this page.'));
    }
  }

  function drawApps(apps) {
    var list = $('[data-apps]');
    list.replaceChildren();
    $('[data-apps-section]').hidden = !apps.length;
    apps.forEach(function (a) {
      var li = el('li', 'app');
      var h = el('h3');
      h.appendChild(link('/apps/app/?r=' + encodeURIComponent(a.repo), a.name));
      li.appendChild(h);
      li.appendChild(el('p', 'facts', a.repo));
      if (a.url) { var p = el('p'); p.appendChild(link(a.url, 'Where it runs')); li.appendChild(p); }
      list.appendChild(li);
    });
  }

  function draw(s) {
    var state = S.stateOf(s, new Date());
    document.querySelector('[data-showcase-title]').textContent = s.cohort;
    document.title = s.cohort + ', the showing | Human Shaped';
    var lead = state === 'over'
      ? 'The last night of this cohort, where everyone showed the app they built, the feature they wanted from their own use, and one value with the decision it changed.'
      : 'The last night of this cohort, where everyone shows the app they built, the feature they wanted from their own use, and one value with the decision it changed. Guests are welcome, and you are invited.';
    document.querySelector('[data-showcase-lead]').textContent = lead;
    $('[data-showcase-status]').hidden = true;
    $('[data-when]').textContent = (state === 'now' ? 'On now. ' : '') + whenText(s);
    $('[data-when-section]').hidden = false;
    drawJoin(s, state);
    drawApps(s.apps);
    $('[data-guests-section]').hidden = state === 'over';
  }

  if (!slug) { status('Each cohort’s showing has its own page, linked from its invitation.', true); return; }
  if (!HUB || !HUB.url) { status('The hub could not be reached just now.', false); return; }

  fetch(HUB.url + '/rest/v1/rpc/public_showcases', {
    method: 'POST',
    headers: { apikey: HUB.key, 'Content-Type': 'application/json' },
    body: '{}'
  })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rows) {
      var s = S.showcaseFor(rows, slug, new Date());
      if (!s) { status('This cohort has no public showing yet. Its teacher chooses whether the last session is open to guests.', true); return; }
      draw(s);
    })
    .catch(function () { status('The showing could not be read just now. Reading this page again in a minute usually brings it back.', false); });
})();
