// The community on the site (LOOP-PLAN.md, G5): the events people host
// on /events/, and the next events and newest discussions on /start/.
// Both come from community.json, which a workflow in the public
// humanshaped/community repository publishes (tools/community/README.md),
// so a visitor needs no GitHub sign-in and spends none of GitHub's limit.
(function () {
  var C = window.CommunityLib;
  if (!C) return;
  var SOURCE = 'https://raw.githubusercontent.com/humanshaped/community/main/community.json';
  var events = document.querySelector('[data-events]');
  var threads = document.querySelector('[data-threads]');
  var next = document.querySelector('[data-next-events]');
  if (!events && !threads && !next) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, text, cls) { var a = el('a', cls, text); a.href = href; return a; }
  function ago(iso) { return window.CohortLib ? window.CohortLib.ago(iso, new Date()) : new Date(iso).toLocaleDateString(); }

  function eventItem(e, past) {
    var li = el('li', 'event');
    li.appendChild(el('p', 'event-kind', C.kindName(e.kind)));
    var h = el('h3');
    if (e.link) h.appendChild(link(e.link, e.title)); else h.textContent = e.title;
    li.appendChild(h);
    li.appendChild(el('p', 'event-when', C.whenText(e)));
    var where = [];
    if (e.place) where.push(e.place);
    if (e.online) where.push(e.place ? 'and online' : 'Online');
    if (where.length) li.appendChild(el('p', 'event-where', where.join(', ')));
    if (e.about) li.appendChild(el('p', null, e.about));
    var links = el('ul', 'links');
    function add(a) { var l = el('li'); l.appendChild(a); links.appendChild(l); }
    if (past && e.writeUp) add(link(e.writeUp, 'What the room learned'));
    if (!past && e.online) add(link(e.online, 'Join online'));
    if (e.host) add(link('https://github.com/' + e.host, 'Hosted by ' + e.host));
    if (links.children.length) li.appendChild(links);
    if (past && !e.writeUp) li.appendChild(el('p', 'small', 'No write-up yet.'));
    return li;
  }

  function threadItem(t) {
    var li = el('li');
    li.appendChild(link(t.url, t.title, 'feed-line'));
    li.appendChild(el('span', 'feed-when', C.threadLine(t, ago)));
    return li;
  }

  function drawEvents(data) {
    var split = C.splitEvents(data.events, new Date());
    var up = events.querySelector('[data-upcoming]'), past = events.querySelector('[data-past]');
    up.replaceChildren(); past.replaceChildren();
    if (!split.upcoming.length) up.appendChild(el('p', 'small', 'Nothing is on the calendar right now. If you are planning something, tell us about it below, and it will be listed here.'));
    else { var ol = el('ol', 'events'); split.upcoming.forEach(function (e) { ol.appendChild(eventItem(e, false)); }); up.appendChild(ol); }
    events.querySelector('[data-past-section]').hidden = !split.past.length;
    if (split.past.length) { var ol2 = el('ol', 'events'); split.past.forEach(function (e) { ol2.appendChild(eventItem(e, true)); }); past.appendChild(ol2); }
  }

  function drawNext(data) {
    var soon = C.splitEvents(data.events, new Date()).upcoming.slice(0, 2);
    next.replaceChildren();
    if (!soon.length) return;
    var ol = el('ol', 'events');
    soon.forEach(function (e) { ol.appendChild(eventItem(e, false)); });
    next.appendChild(ol);
    next.hidden = false;
  }

  function drawThreads(data) {
    var list = C.threads(data.threads, 5);
    var box = threads.querySelector('[data-threads-list]');
    box.replaceChildren();
    if (!list.length) { box.appendChild(el('p', 'small', 'No one has started a discussion yet, so the first one could be yours.')); }
    else { var ol = el('ol', 'feed'); list.forEach(function (t) { ol.appendChild(threadItem(t)); }); box.appendChild(ol); }
    threads.hidden = false;
  }

  function trouble() {
    if (events) {
      events.querySelector('[data-upcoming]').replaceChildren(el('p', 'small', 'The list of events could not be reached just now. It lives in the humanshaped community repository on GitHub, and reading this page again in a minute usually brings it back.'));
    }
  }

  fetch(SOURCE, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      data = data && typeof data === 'object' ? data : {};
      if (events) drawEvents(data);
      if (next) drawNext(data);
      if (threads) drawThreads(data);
    })
    .catch(trouble);
})();
