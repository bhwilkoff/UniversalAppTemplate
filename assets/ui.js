// The hub's shared interface parts (DESIGN-KIT.md). Pages build their
// state, privacy, lists, empty places, confirmations, and results from
// these, so one idea always looks and reads the same, and a new feature
// starts from parts people already know instead of a sentence explaining
// itself. Research: research/notes/design-kit-research.md.
(function (root) {
  var ICONS = '/assets/icons.svg?v=20261022a#';
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', ICONS + name);
    svg.appendChild(use);
    return svg;
  }
  var uid = 0;
  function nextId(prefix) { uid += 1; return prefix + '-' + uid; }

  // ---- status: the registry is the only source of status words ---------
  var TONES = { done: 'check-circle', active: 'circle-fill', waiting: 'circle-dashed', off: 'minus-circle', problem: 'warning-circle' };
  var STATUS = {
    cohort: { draft: ['off', 'Draft'], open: ['active', 'Open'], running: ['active', 'Running'], finished: ['done', 'Finished'] },
    session: { planned: ['waiting', 'Planned'], ready: ['active', 'Ready'], live: ['active', 'Live now'], finished: ['done', 'Finished'] },
    poll: { open: ['active', 'Open'], closed: ['off', 'Closed'], answered: ['done', 'Answered'] },
    request: { waiting: ['waiting', 'Waiting'], approved: ['done', 'Approved'], declined: ['off', 'Declined'] },
    credential: { none: ['off', 'Not earned yet'], waiting: ['waiting', 'Waiting to be signed'], signed: ['done', 'Signed'], revoked: ['problem', 'Revoked'] },
    app: { submitted: ['done', 'Submitted'], notyet: ['waiting', 'Not submitted'], hidden: ['off', 'Hidden'] },
    invitation: { invited: ['waiting', 'Invited'], joined: ['done', 'Joined'], failed: ['problem', 'Failed'] },
    exchange: { open: ['active', 'Open'], closed: ['off', 'Closed'] },
    task: { done: ['done', 'Done'], todo: ['waiting', 'To do'], optional: ['waiting', 'Optional'], blocked: ['off', 'Cannot start yet'] },
    connection: { live: ['active', 'Live'], checking: ['waiting', 'Checking'], offline: ['problem', 'Offline'] },
    key: { ready: ['done', 'Ready'], none: ['waiting', 'Not chosen'] },
    work: { ready: ['done', 'Ready'], notyet: ['waiting', 'Not yet'], confirmed: ['done', 'Confirmed'] },
    showing: { open: ['active', 'Open to guests'] },
    action: { saving: ['waiting', 'Saving'], signing: ['waiting', 'Signing'], failed: ['problem', 'Failed'] }
  };
  function status(thing, state) {
    var s = STATUS[thing] && STATUS[thing][state];
    if (!s) throw new Error('No status ' + thing + '.' + state + ' in DESIGN-KIT.md');
    var span = el('span', 'ui-status ui-status-' + s[0]);
    span.appendChild(icon(TONES[s[0]]));
    span.appendChild(el('span', null, s[1]));
    return span;
  }

  // ---- visibility: who can see this, the same words everywhere ---------
  var AUDIENCES = {
    device: ['device-mobile', 'On this device', 'It is kept in this browser and never sent anywhere.'],
    me: ['lock-simple', 'Only you', 'No one else, including your teachers.'],
    teachers: ['user', 'You and your teachers', 'You and the teachers of this cohort.'],
    staff: ['user', 'Only teachers', 'The teachers of this cohort, and no one in it.'],
    approvers: ['user', 'You and approvers', 'You and the people who decide requests to teach.'],
    cohort: ['users', 'Your cohort', 'The people in this cohort and its teachers.'],
    members: ['users-three', 'Human Shaped members', 'People in a cohort, now or before, and teachers.'],
    link: ['link', 'Anyone with the link', 'Anyone you give the address to, signed in or not.'],
    public: ['globe-simple', 'Everyone', 'Anyone on the web.']
  };
  function visibility(audience, what) {
    var a = AUDIENCES[audience];
    if (!a) throw new Error('No audience ' + audience + ' in DESIGN-KIT.md');
    var wrap = el('span', 'ui-visibility');
    if (what) wrap.appendChild(el('span', 'ui-visibility-what', what));
    var id = nextId('aud');
    var b = el('button', 'ui-visibility-button');
    b.type = 'button';
    b.appendChild(icon(a[0]));
    b.appendChild(el('span', null, a[1]));
    var pop = el('span', 'ui-popover', a[2]);
    pop.id = id;
    if ('popover' in HTMLElement.prototype) {
      pop.setAttribute('popover', '');
      b.setAttribute('popovertarget', id);
    } else {
      pop.hidden = true;
      b.addEventListener('click', function () { pop.hidden = !pop.hidden; });
    }
    b.setAttribute('aria-describedby', id);
    wrap.appendChild(b);
    wrap.appendChild(pop);
    return wrap;
  }

  // ---- facts, counts, tags ----------------------------------------------
  function facts(pairs) {
    var dl = el('dl', 'ui-facts');
    pairs.forEach(function (p) {
      if (p == null || p[1] == null || p[1] === '') return;
      var d = el('div');
      d.appendChild(el('dt', null, p[0]));
      var dd = el('dd');
      if (p[1] instanceof Node) dd.appendChild(p[1]); else dd.textContent = p[1];
      d.appendChild(dd);
      dl.appendChild(d);
    });
    return dl;
  }
  // A number of things waiting, beside its noun; nothing at all for zero.
  function count(n, noun) {
    if (!n) return document.createTextNode('');
    var s = el('span', 'ui-count', n > 999 ? '999+' : String(n));
    s.setAttribute('aria-label', n + ' ' + (noun || 'waiting'));
    return s;
  }
  // A kind or a role, never a state: the week's move (Write, Play,
  // Publish), what a share is, a role (Teacher, Mentor).
  function tag(word) { return el('span', 'ui-tag', word); }

  // ---- rows, empty places, disclosures, buttons --------------------------
  function row(o) {
    var li = el('li', 'ui-row');
    var main = el('div', 'ui-row-main');
    var title = o.href ? el('a', 'ui-row-title', o.title) : el('span', 'ui-row-title', o.title);
    if (o.href) title.href = o.href;
    main.appendChild(title);
    if (o.meta) main.appendChild(el('span', 'ui-row-meta', o.meta));
    if (o.detail) main.appendChild(o.detail);
    li.appendChild(main);
    var side = el('div', 'ui-row-side');
    [o.status, o.visibility].concat(o.actions || []).forEach(function (x) { if (x) side.appendChild(x); });
    li.appendChild(side);
    return li;
  }
  function rows() { return el('ul', 'ui-rows'); }
  function empty(text, action) {
    var d = el('div', 'ui-empty');
    d.appendChild(el('p', null, text));
    if (action) d.appendChild(action);
    return d;
  }
  function disclosure(summary, content) {
    var d = el('details', 'ui-disclosure');
    d.appendChild(el('summary', null, summary));
    if (content instanceof Node) d.appendChild(content); else d.appendChild(el('p', null, content));
    return d;
  }
  function button(label, cls, onClick) {
    var b = el('button', cls || 'btn-secondary', label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function link(label, href, cls) {
    var a = el('a', cls || 'btn-secondary', label);
    a.href = href;
    return a;
  }

  // ---- results: beside the control, kept until the next action ----------
  function say(target, text, tone) {
    if (!target) return;
    target.textContent = text || '';
    target.classList.toggle('ui-say-problem', tone === 'problem');
  }

  // ---- confirm: a native dialog before something hard to undo -----------
  // UI.confirm({ title: 'Delete this poll?', body: 'Its answers go too.',
  // action: 'Delete poll' }) resolves true or false. Focus starts on
  // Cancel; Esc cancels; focus goes back where it was.
  var dlg = null;
  function confirm(o) {
    if (!dlg) {
      dlg = el('dialog', 'ui-dialog');
      dlg.setAttribute('aria-labelledby', 'ui-dialog-title');
      dlg.setAttribute('aria-describedby', 'ui-dialog-body');
      var form = el('form');
      form.method = 'dialog';
      var h = el('h2', null); h.id = 'ui-dialog-title';
      var p = el('p', null); p.id = 'ui-dialog-body';
      var acts = el('div', 'actions');
      var cancel = el('button', 'btn-secondary', 'Cancel'); cancel.value = 'cancel';
      var ok = el('button', 'btn-danger final', ''); ok.value = 'go';
      acts.appendChild(cancel); acts.appendChild(ok);
      form.appendChild(h); form.appendChild(p); form.appendChild(acts);
      dlg.appendChild(form);
      document.body.appendChild(dlg);
    }
    var back = document.activeElement;
    dlg.querySelector('#ui-dialog-title').textContent = o.title;
    var body = dlg.querySelector('#ui-dialog-body');
    body.textContent = o.body || '';
    body.hidden = !o.body;
    var go = dlg.querySelector('button[value="go"]');
    go.textContent = o.action;
    go.className = o.danger === false ? 'btn-primary' : 'btn-danger final';
    dlg.returnValue = '';
    return new Promise(function (resolve) {
      dlg.addEventListener('close', function done() {
        dlg.removeEventListener('close', done);
        if (back && back.focus) back.focus();
        resolve(dlg.returnValue === 'go');
      });
      dlg.showModal();
      dlg.querySelector('button[value="cancel"]').focus();
    });
  }
  // A button that confirms before it runs: { title, body, action, run }.
  function confirmStep(btn, o) {
    btn.addEventListener('click', function () {
      confirm({ title: o.title, body: o.body, action: o.action, danger: o.danger }).then(function (ok) { if (ok) o.run(); });
    });
  }

  // ---- page gates: a whole page closed or empty --------------------------
  var GATES = {
    'signed-out': ['Sign in to open this', ['Sign in with GitHub', '/account/', 'btn-primary']],
    'not-member': ['Only people in this cohort can open this', ['Go to your home', '/', 'btn-secondary']],
    'not-teacher': ['Only teachers can open this', ['Ask to teach', '/teach/', 'btn-secondary']],
    'not-admin': ['Only admins can open this', ['Go to your home', '/', 'btn-secondary']],
    missing: ['Nothing is at this address', ['Go to your home', '/', 'btn-secondary']],
    error: ['This could not load', null]
  };
  function gate(container, kind, o) {
    o = o || {};
    var g = GATES[kind];
    if (!g) throw new Error('No page gate ' + kind);
    container.replaceChildren();
    var box = el('div', 'ui-gate');
    box.appendChild(el('p', 'ui-gate-line', g[0]));
    var acts = el('div', 'actions');
    if (g[1]) acts.appendChild(link(g[1][0], g[1][1], g[1][2]));
    if (kind === 'error' && o.retry) acts.appendChild(button('Try again', 'btn-secondary', o.retry));
    if (acts.children.length) box.appendChild(acts);
    if (o.error) box.appendChild(disclosure('Error details', String(o.error)));
    container.appendChild(box);
  }

  // ---- loading: nothing for a second, then the shape of what is coming --
  function skeleton(container, what) {
    container.replaceChildren();
    var s = el('div', 'ui-skeleton');
    s.setAttribute('aria-busy', 'true');
    var st = el('span', 'visually-hidden', 'Loading' + (what ? ' ' + what : ''));
    st.setAttribute('role', 'status');
    s.appendChild(st);
    for (var i = 0; i < 3; i++) s.appendChild(el('i'));
    container.appendChild(s);
  }

  // ---- tabs: sections of one thing, each with its own address -----------
  // items: [{ key, label, count }] for panels here ([data-tab=key] under
  // panelsRoot), or { key, label, href } for another page in the row.
  // Items that do not fit fold into "More". Returns { go, current, link }.
  function tabs(mount, items, panelsRoot, opts) {
    opts = opts || {};
    var nav = el('nav', 'area-nav ui-tabs');
    nav.setAttribute('aria-label', opts.label || 'Sections');
    var ul = el('ul'), links = {}, lis = [];
    items.forEach(function (it) {
      var li = el('li'), a = el('a', null, it.label);
      if (it.href) {
        a.href = it.href;
      } else {
        var u = new URL(location.href);
        u.searchParams.delete('t');
        if (it.key !== items[0].key) u.searchParams.set('t', it.key);
        a.href = u.pathname + u.search;
        if (it.count) { a.appendChild(document.createTextNode(' ')); a.appendChild(count(it.count, 'waiting')); }
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
          e.preventDefault();
          go(it.key, true);
        });
        links[it.key] = a;
      }
      li.appendChild(a); ul.appendChild(li); lis.push(li);
    });
    var more = el('li', 'ui-tabs-more');
    var moreBtn = el('button', 'ui-tabs-more-button', 'More');
    moreBtn.type = 'button';
    moreBtn.setAttribute('aria-expanded', 'false');
    var moreList = el('ul', 'ui-tabs-more-list');
    moreList.hidden = true;
    moreBtn.addEventListener('click', function () {
      moreList.hidden = !moreList.hidden;
      moreBtn.setAttribute('aria-expanded', String(!moreList.hidden));
    });
    document.addEventListener('click', function (e) { if (!more.contains(e.target)) { moreList.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); } });
    more.appendChild(moreBtn); more.appendChild(moreList);
    ul.appendChild(more);
    nav.appendChild(ul);
    mount.replaceChildren(nav);
    function fit() {
      lis.forEach(function (li) { ul.insertBefore(li, more); });
      more.hidden = true;
      var avail = nav.clientWidth;
      if (!avail || ul.scrollWidth <= avail + 1) return;
      more.hidden = false;
      for (var i = lis.length - 1; i > 0 && ul.scrollWidth > avail + 1; i--) {
        if (lis[i].querySelector('[aria-current]')) continue;
        moreList.insertBefore(lis[i], moreList.firstChild);
      }
    }
    var now = null;
    function go(key, push) {
      if (!links[key]) key = items[0].key;
      now = key;
      Object.keys(links).forEach(function (k) {
        if (k === key) links[k].setAttribute('aria-current', 'page'); else links[k].removeAttribute('aria-current');
      });
      if (panelsRoot) panelsRoot.querySelectorAll('[data-tab]').forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== key; });
      if (push) history.pushState({ t: key }, '', links[key].getAttribute('href'));
      moreList.hidden = true;
      fit();
      if (opts.onChange) opts.onChange(key);
    }
    window.addEventListener('popstate', function () { go(new URLSearchParams(location.search).get('t') || items[0].key, false); });
    window.addEventListener('resize', fit);
    go(new URLSearchParams(location.search).get('t') || items[0].key, false);
    return { go: function (k) { go(k, true); }, current: function () { return now; }, link: function (k) { return links[k] && links[k].getAttribute('href'); } };
  }

  // Static pages mark where a part goes, and ui.js draws it, so markup and
  // script make the same thing: <span data-vis="cohort"></span>,
  // <span data-vis="link" data-vis-what="Video file"></span>,
  // <span data-status="exchange.closed"></span>.
  function hydrate(scope) {
    (scope || document).querySelectorAll('[data-vis]').forEach(function (n) {
      n.replaceWith(visibility(n.getAttribute('data-vis'), n.getAttribute('data-vis-what')));
    });
    (scope || document).querySelectorAll('[data-gate]').forEach(function (n) {
      gate(n, n.getAttribute('data-gate'));
      n.removeAttribute('data-gate');
    });
    (scope || document).querySelectorAll('[data-status]').forEach(function (n) {
      var k = n.getAttribute('data-status').split('.');
      n.replaceWith(status(k[0], k[1]));
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { hydrate(); });
    else hydrate();
  }

  root.UI = {
    el: el, icon: icon, status: status, visibility: visibility, facts: facts, count: count, tag: tag,
    row: row, rows: rows, empty: empty, disclosure: disclosure, button: button, link: link,
    say: say, confirm: confirm, confirmStep: confirmStep, gate: gate, skeleton: skeleton, tabs: tabs, hydrate: hydrate,
    STATUS: STATUS, AUDIENCES: AUDIENCES, GATES: GATES
  };
})(typeof window !== 'undefined' ? window : this);
