// A session's own page (/session/?c=<slug>&s=<number>). Ben, October 23,
// 2026: "The session page should functionally only be to prep the
// session... The session page should show content to the learners and
// should be prep for the leader, but once the session is going, the
// session page on humanshaped.org should serve no further purpose for the
// leader (other than as reference)." So it holds no live controls: when
// the session is, its call, what to bring, and the plan with each part's
// words, which its leaders change here. Everyone joins with one button,
// and the session itself happens in the add-on inside Meet (/meet/).
(function () {
  var root = document.querySelector('[data-session]');
  if (!root || !window.supabase || !window.HUB || !window.CohortLib) return;
  var db = (window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key));
  var lib = window.CohortLib, U = window.UI;
  var query = new URLSearchParams(location.search);
  var slug = query.get('c') || '';
  var wanted = /^\d{1,2}$/.test(query.get('s') || '') ? Number(query.get('s')) : null;

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function show(state) { root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; }); }
  function fail(m) { $('[data-error-text]').textContent = m; show('error'); }
  function safe(u) { return /^https:\/\//.test(u || '') ? u : null; }
  function link(text, href, cls, external) {
    var a = el('a', cls || null, text); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  var K = { me: null, member: false, plan: null, tabs: null };
  var bringReady = Promise.resolve(null);

  function load() {
    if (!slug) return fail('This page needs to know which session to show. Open it from your cohort’s Sessions.');
    show('loading');
    db.auth.getSession().then(function (s) {
      if (!s.data || !s.data.session) return show('signed-out');
      var me = s.data.session.user;
      return db.from('cohorts').select('*').eq('slug', slug).maybeSingle().then(function (c) {
        if (c.error) return fail('This session could not be opened: ' + c.error.message);
        if (!c.data) return show('not-member');
        var cohort = c.data;
        return Promise.all([
          db.from('sessions').select('*').eq('cohort_id', cohort.id).order('number'),
          db.from('enrollments').select('user_id').eq('cohort_id', cohort.id).eq('user_id', me.id).neq('status', 'left'),
          db.from('cohort_teachers').select('user_id').eq('cohort_id', cohort.id).eq('user_id', me.id)
        ]).then(function (res) {
          var bad = res.filter(function (r) { return r.error; })[0];
          if (bad) return fail('This session could not be loaded: ' + bad.error.message);
          var sessions = res[0].data, member = res[1].data.length > 0, leading = res[2].data.length > 0;
          K.me = me; K.member = member;
          if (!member && !leading) return show('not-member');
          if (window.CohortNav) window.CohortNav.draw($('[data-cohort-nav]'), { cohort: cohort, teaching: leading, member: member, current: 'live', within: true });
          if (!sessions.length) {
            $('[data-no-sessions]').replaceChildren(U.empty('No sessions yet', leading ? U.link('Go to Sessions', '/cohort/?c=' + encodeURIComponent(cohort.slug) + '&t=sessions', 'btn-secondary') : null));
            return show('no-sessions');
          }
          var t = lib.currentAndNext(sessions, new Date(), cohort.session_minutes);
          var named = wanted == null ? null : sessions.filter(function (x) { return x.number === wanted; })[0];
          var session = named || (t.live ? t.next : (t.next || t.current));
          // The address names the session, so it can be kept and shared.
          if (!named) history.replaceState(null, '', lib.sessionUrl(cohort.slug, session.number));
          var live = !!(t.live && t.next && t.next.id === session.id);
          // A session its leader is still running counts as on, even past
          // its hour (found in the loop's live test: running over, the page
          // said Finished and took away Join the call).
          var ends = session.starts_at ? Date.parse(session.starts_at) + cohort.session_minutes * 60000 : null;
          if (live || ends == null || ends > Date.now() || ends < Date.now() - 3 * 3600000) return draw(cohort, sessions, session, live, leading);
          return db.from('show_state').select('current_scene, updated_at').eq('session_id', session.id).maybeSingle().then(function (st) {
            var row = st && st.data;
            var running = !!(row && row.current_scene && Date.parse(row.updated_at) > Date.now() - 45 * 60000);
            draw(cohort, sessions, session, running, leading);
          }, function () { draw(cohort, sessions, session, false, leading); });
        });
      });
    }).catch(function (err) { fail('Something went wrong: ' + (err && err.message ? err.message : 'no details') + '.'); });
  }

  function draw(cohort, sessions, session, live, leading) {
    var ends = session.starts_at ? Date.parse(session.starts_at) + cohort.session_minutes * 60000 : null;
    var finished = !live && ends != null && ends < Date.now();
    document.title = lib.sessionTitle(session) + ', ' + cohort.title + ' | Human Shaped';
    $('[data-title]').textContent = lib.sessionTitle(session);

    // When, on the reader's own clock, and its state.
    var when = $('[data-when]'); when.replaceChildren();
    when.appendChild(U.status('session', live ? 'live' : finished ? 'finished' : safe(session.meet_url) ? 'ready' : 'planned'));
    if (session.starts_at) {
      var start = new Date(session.starts_at), end = new Date(start.getTime() + cohort.session_minutes * 60000);
      var time = function (d) { return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
      when.appendChild(document.createTextNode(' ' + start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ', ' + time(start) + ' to ' + time(end) + ', your time'));
    }
    $('[data-scope]').textContent = session.scope || '';
    $('[data-scope]').hidden = !session.scope;

    // What a person does from here: join the call; afterward, the recording.
    var acts = $('[data-actions]'); acts.replaceChildren();
    if (!finished && safe(session.meet_url)) acts.appendChild(link('Join the call', session.meet_url, 'btn-primary', true));
    // A recording the recorder put in Drive plays here, through the relay,
    // for anyone who can read this session (the cohort and its leaders).
    var play = window.RecordLib && safe(session.recording_url) ? window.RecordLib.playUrl(session.recording_url, window.HUB.videoRelay) : null;
    if (!play && safe(session.recording_url)) acts.appendChild(link('Watch the recording', session.recording_url, finished ? 'btn-primary' : 'btn-secondary', true));
    drawRecording(session.recording_url, play);
    acts.hidden = !acts.children.length;

    // Every session in the cohort, this one marked.
    var pager = $('[data-pager]'); pager.replaceChildren();
    var weeks = el('ol');
    sessions.forEach(function (x) {
      var li = el('li'), a = link(String(x.number), lib.sessionUrl(cohort.slug, x.number));
      a.title = lib.sessionTitle(x);
      a.setAttribute('aria-label', lib.sessionTitle(x));
      if (x === session) a.setAttribute('aria-current', 'page');
      li.appendChild(a); weeks.appendChild(li);
    });
    pager.appendChild(weeks);
    pager.hidden = sessions.length < 2;

    // What to bring: the stage's "Be ready to...", which the plan's
    // bring-back part asks for, and the stages this session starts.
    drawPlan(cohort, sessions, session, leading, finished);
    drawPrep(cohort, session, leading);
    var stages = lib.stagesForWeek(session.number);
    var stageBox = $('[data-stages]'); stageBox.replaceChildren();
    stages.forEach(function (n) { var li = el('li'); li.appendChild(link('Stage ' + n, '/path/' + n + '/')); stageBox.appendChild(li); });
    $('[data-stages-section]').hidden = !stages.length;

    K.started = !!(session.starts_at && Date.parse(session.starts_at) < Date.now());
    if (leading && K.started) drawAfter(cohort, session);
    $('[data-after-leading]').hidden = !leading;
    if (K.started) drawStory(cohort, session, leading);
    if (leading) drawEdits(session);
    return bringReady.then(function (bring) { drawViews(session, leading, finished, !!play, bring, stages.length > 0); show('ready'); });
  }

  // One view at a time (SESSION-DESIGN.md), opening where this person is needed.
  function drawViews(session, leading, finished, played, bring, stages) {
    var items = Array.isArray(session.prep_questions) ? session.prep_questions : [];
    var before = leading || items.length > 0 || (!!bring && !finished) || stages;
    var list = [];
    function add(key, label) { list.push({ key: key, label: label }); }
    if (played && finished) add('recording', 'Recording');
    if (leading) add('plan', 'Plan');
    if (before) add('before', 'Before');
    if (!leading) add('plan', 'Plan');
    if (played && !finished) add('recording', 'Recording');
    if (K.started) add('after', 'After');
    // A part's address names the view too, and the row's links never carry a part.
    var url = new URL(location.href), opened = url.searchParams.get('part');
    if (opened) { url.searchParams.delete('part'); url.searchParams.set('t', 'plan'); history.replaceState(null, '', url.pathname + url.search); }
    K.tabs = U.tabs($('[data-views]'), list, root, { label: lib.sessionTitle(session), onChange: function () { if (K.plan) K.plan.part(partNow()); studying(); } });
    if (opened) { url.searchParams.set('part', opened); history.replaceState(null, '', url.pathname + url.search); K.plan.part(opened); }
    studying();
  }
  function partNow() { return new URLSearchParams(location.search).get('part'); }
  function studying() { root.classList.toggle('is-part', !!partNow()); }
  window.addEventListener('popstate', function () { if (K.plan) K.plan.part(partNow()); studying(); });

  function drawRecording(url, play) {
    var sec = $('[data-recording-section]'), v = $('[data-recording-video]');
    sec.hidden = !play;
    if (!play) { v.removeAttribute('src'); return; }
    $('[data-recording-link]').href = url;
    $('[data-recording-note]').hidden = true;
    v.onerror = function () { $('[data-recording-note]').hidden = false; };
    if (v.getAttribute('src') !== play) v.src = play;
  }

  // Work handed in before the session (prep_questions on the session):
  // a learner answers each question privately here, and its leaders read
  // every answer. One plain question per box (Ben, October 28, 2026).
  function drawPrep(cohort, session, leading) {
    var sec = $('[data-prep-section]'), form = $('[data-prep-form]'), list = $('[data-prep-answers]');
    var items = Array.isArray(session.prep_questions) ? session.prep_questions.filter(function (q) { return q && q.id && q.prompt; }) : [];
    // An exchange to reply to is an item too: { kind: 'exchange', token }.
    var exItems = items.filter(function (q) { return q.kind === 'exchange' && /^[0-9a-f]{32}$/.test(q.token || ''); });
    var qs = items.filter(function (q) { return q.kind !== 'exchange'; });
    form.replaceChildren(); list.replaceChildren();
    var exBox = $('[data-prep-exchanges]'); exBox.replaceChildren();
    var adds = $('[data-prep-add]'); adds.replaceChildren(); adds.hidden = !leading;
    sec.hidden = !items.length && !leading;
    if (leading) drawPrepAdd(cohort, session, leading, adds);
    if (!items.length) { if (leading) list.appendChild(U.empty('Nothing to do before this session yet')); return; }
    drawPrepExchanges(exItems, exBox, cohort, leading, session);
    if (leading) {
      if (!qs.length) return;
      $('[data-prep-note]').replaceChildren(U.visibility('staff', 'Everyone’s answers'));
      return Promise.all([
        db.from('prep_answers').select('user_id, question_id, body, updated_at').eq('session_id', session.id),
        db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id).neq('status', 'left')
      ]).then(function (res) {
        if (res[0].error) { list.appendChild(el('p', 'small', 'The answers could not load: ' + res[0].error.message)); return; }
        var names = {}, rows = res[0].data || [];
        (res[1].data || []).forEach(function (e) { names[e.user_id] = e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone'; });
        var people = Object.keys(names), done = people.filter(function (id) { return rows.some(function (r) { return r.user_id === id; }); });
        var who = el('ul', 'prep-people');
        people.forEach(function (id) {
          var li = el('li', done.indexOf(id) >= 0 ? 'is-done' : null, names[id]);
          who.appendChild(li);
        });
        list.appendChild(el('p', 'ui-meta-line', done.length + ' of ' + people.length + ' have answered.'));
        list.appendChild(who);
        qs.forEach(function (q) {
          var mine = rows.filter(function (r) { return r.question_id === q.id; });
          var box = el('div', 'session-prep-q');
          var said = el('span', 'part-saved'); said.setAttribute('role', 'status');
          var ask = el('textarea', 'prep-ask'); ask.rows = 1; ask.maxLength = 500; ask.value = q.prompt; ask.setAttribute('aria-label', 'The question');
          var wait = null;
          ask.addEventListener('input', function () {
            clearTimeout(wait);
            wait = setTimeout(function () {
              if (!ask.value.trim()) return;
              q.prompt = ask.value.trim();
              savePrep(session, items).then(function (r) { said.textContent = r.error ? 'Not saved: ' + r.error.message : 'Saved'; });
            }, 700);
          });
          var head = el('div', 'prep-q-head');
          head.appendChild(ask); head.appendChild(said);
          head.appendChild(removeButton(drop));
          function drop() {
            U.confirm({ title: 'Remove this question?', body: mine.length ? 'Its ' + mine.length + ' answers stay saved, but no one will see them here.' : 'It comes off this session.', action: 'Remove' }).then(function (yes) {
              if (!yes) return;
              session.prep_questions = items.filter(function (x) { return x !== q; });
              savePrep(session, session.prep_questions).then(function () { drawPrep(cohort, session, leading); });
            });
          }
          box.appendChild(head);
          if (!mine.length) box.appendChild(el('p', 'small', 'No answers yet.'));
          mine.forEach(function (r) {
            var p = el('p'); p.appendChild(el('strong', null, (names[r.user_id] || 'Someone') + ': ')); p.appendChild(document.createTextNode(r.body));
            box.appendChild(p);
          });
          list.appendChild(box);
        });
      });
    }
    if (!K.member || !K.me) { sec.hidden = true; return; }
    if (!qs.length) return;
    $('[data-prep-note]').replaceChildren(U.visibility('teachers', 'Your answers'));
    return db.from('prep_answers').select('question_id, body').eq('session_id', session.id).eq('user_id', K.me.id).then(function (r) {
      var had = {};
      (r.data || []).forEach(function (a) { had[a.question_id] = a.body; });
      qs.forEach(function (q) {
        var label = el('label', null, q.prompt);
        var box = el('textarea'); box.name = q.id; box.rows = 3; box.maxLength = 4000; box.value = had[q.id] || '';
        label.appendChild(box); form.appendChild(label);
      });
      var actions = el('div', 'actions'), save = el('button', 'btn-primary', 'Save my answers'), said = el('p', 'small');
      save.type = 'submit'; said.setAttribute('role', 'status');
      actions.appendChild(save); form.appendChild(actions); form.appendChild(said);
      form.onsubmit = function (ev) {
        ev.preventDefault();
        var rows = [], gone = [];
        qs.forEach(function (q) {
          var v = form.elements[q.id].value.trim();
          if (v) rows.push({ session_id: session.id, cohort_id: cohort.id, user_id: K.me.id, question_id: q.id, body: v });
          else if (had[q.id]) gone.push(q.id);
        });
        U.say(said, 'Saving');
        var work = [];
        if (rows.length) work.push(db.from('prep_answers').upsert(rows, { onConflict: 'session_id,user_id,question_id' }));
        if (gone.length) work.push(db.from('prep_answers').delete().eq('session_id', session.id).eq('user_id', K.me.id).in('question_id', gone));
        Promise.all(work).then(function (res) {
          var bad = res.filter(function (x) { return x.error; })[0];
          if (bad) return U.say(said, 'Not saved: ' + bad.error.message, 'problem');
          rows.forEach(function (x) { had[x.question_id] = x.body; });
          gone.forEach(function (id) { delete had[id]; });
          U.say(said, 'Saved. You can change these until the session.');
        });
      };
    });
  }

  function removeButton(fn) { var b = el('button', 'btn-secondary small', 'Remove'); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function savePrep(session, items) { return db.from('sessions').update({ prep_questions: items }).eq('id', session.id); }

  // A leader adds what people do before the session: a question, or a new
  // exchange to reply to.
  function drawPrepAdd(cohort, session, leading, box) {
    var items = Array.isArray(session.prep_questions) ? session.prep_questions : [];
    function put(item) {
      session.prep_questions = items.concat([item]);
      return savePrep(session, session.prep_questions).then(function (r) {
        if (r.error) { U.say(said, 'Not saved: ' + r.error.message, 'problem'); return; }
        drawPrep(cohort, session, leading);
      });
    }
    var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
    var row = el('div', 'actions');
    var q = el('button', 'btn-secondary', 'Add a question'); q.type = 'button';
    q.addEventListener('click', function () { put({ id: 'q' + Date.now().toString(36), prompt: 'A question for everyone' }); });
    // The real new-exchange page, which brings the leader back here with the
    // exchange added (Ben, November 6, 2026: "it should present me with the
    // new exchange interface and not ask me for a link").
    var x = el('a', 'btn-secondary', 'Add an exchange');
    x.href = '/exchange/new/?c=' + encodeURIComponent(cohort.id) + '&s=' + Number(session.number);
    row.appendChild(q); row.appendChild(x); row.appendChild(said);
    box.appendChild(row);
  }

  // Each exchange to reply to before the session: a link, and whether this
  // learner has posted in it; for a leader, how many have.
  function drawPrepExchanges(exItems, box, cohort, leading, session) {
    exItems.forEach(function (q) {
      var row = el('div', 'session-prep-exchange');
      row.appendChild(el('h3', null, q.prompt));
      box.appendChild(row);
      if (leading) {
        var off = el('button', 'btn-secondary small', 'Remove'); off.type = 'button';
        off.addEventListener('click', function () {
          session.prep_questions = session.prep_questions.filter(function (x) { return x !== q; });
          savePrep(session, session.prep_questions).then(function () { drawPrep(cohort, session, leading); });
        });
        row.appendChild(off);
      }
      // Through the exchange function: posts and other people's exchanges
      // cannot be read directly, so a direct read always came back empty.
      db.rpc('exchange', { t: q.token }).then(function (r) {
        if (r.error || !r.data || r.data.private) { row.appendChild(el('p', 'small', 'This exchange could not be found.')); return; }
        var a = el('a', 'btn-secondary', r.data.title); a.href = '/exchange/#' + q.token;
        var acts = el('div', 'actions'); acts.appendChild(a); row.appendChild(acts);
        var posts = r.data.posts || [], maker = r.data.maker && r.data.maker.name;
        if (leading) {
          return db.from('enrollments').select('user_id').eq('cohort_id', cohort.id).neq('status', 'left').then(function (e) {
            var names = [];
            posts.forEach(function (p) { var n = p.author && p.author.name; if (n && n !== maker && names.indexOf(n) < 0) names.push(n); });
            row.appendChild(el('p', 'ui-meta-line', names.length + ' of ' + (e.data || []).length + ' have replied' + (names.length ? ': ' + names.join(', ') : '') + '.'));
          });
        }
        if (K.me) acts.appendChild(U.status('task', posts.some(function (p) { return p.mine; }) ? 'done' : 'todo'));
      });
    });
  }

  function drawPlan(cohort, sessions, session, leading, finished) {
    var box = $('[data-plan]');
    if (!window.ShowBuilder || !window.ShowLib) { box.replaceChildren(U.empty('The plan could not load')); return; }
    function partUrl(id) {
      var u = new URL(lib.sessionUrl(cohort.slug, session.number), location.href);
      u.searchParams.set('t', 'plan');
      if (id) u.searchParams.set('part', id);
      return u.pathname + u.search;
    }
    K.plan = window.ShowBuilder.mount(box, {
      db: db, cohort: cohort, session: session, sessions: sessions, readOnly: !leading,
      agenda: lib.agenda(cohort.session_minutes), turn: window.LiveLib ? window.LiveLib.TURN : [],
      href: partUrl,
      go: function (id) {
        history.pushState({ t: 'plan' }, '', partUrl(id));
        K.plan.part(id);
        studying();
        window.scrollTo(0, 0);
      }
    });
    // What to bring comes from the plan's bring-back part.
    bringReady = db.from('scenes').select('kind, title, config, position').eq('session_id', session.id).order('position').then(function (r) {
      var bring = (r.data || []).filter(function (x) { return (x.kind === 'rooms' || x.kind === 'presenter') && x.config && x.config.prompt; })[0];
      var sec = $('[data-bring-section]');
      // What to bring matters only before the session.
      sec.hidden = !bring || !!finished;
      if (bring) $('[data-bring]').textContent = bring.config.prompt;
      return bring || null;
    });
  }

  // What came of a session, for its leaders: what was answered, and what they
  // heard. Nothing is scored, because a question here has no right answer.
  // What happened, from what was kept. A leader reads everyone; a learner's
  // reads return only their own rows, so they see what is kept about them.
  function drawStory(cohort, session, leading) {
    var box = $('[data-story]'), L = window.SessionStoryLib, R = window.ReactLib;
    box.replaceChildren();
    Promise.all([
      db.from('session_events').select('user_id, kind, detail, at').eq('session_id', session.id).order('at').limit(5000),
      db.from('live_checks').select('id').eq('session_id', session.id),
      db.from('live_answers').select('user_id, check_id').eq('cohort_id', cohort.id),
      db.from('live_requests').select('user_id').eq('session_id', session.id),
      db.from('live_queue').select('user_id, shown_at').eq('session_id', session.id),
      db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
      db.from('session_talk').select('user_id, name, started_s, ended_s').eq('session_id', session.id).limit(5000),
      db.from('session_reads').select('state, read_seconds').eq('session_id', session.id).maybeSingle(),
      db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id)
    ]).then(function (res) {
      if (res.some(function (r) { return r.error; })) { box.appendChild(el('p', 'small', 'What happened could not be read.')); return; }
      var ids = res[1].data.map(function (k) { return k.id; }), names = {};
      res[5].data.concat(res[8].data).forEach(function (e) {
        if (leading || e.user_id === K.me.id) names[e.user_id] = e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone';
      });
      if (K.me && !names[K.me.id] && !leading) names[K.me.id] = 'You';
      var talk = res[6].data, read = res[7].data;
      var who = L.people({ names: names, events: res[0].data, talk: talk, requests: res[3].data, queue: res[4].data,
        answers: res[2].data.filter(function (a) { return ids.indexOf(a.check_id) >= 0; }) });
      var stops = leading ? L.stops(res[0].data) : [];
      if (!who.length && !stops.length) { box.appendChild(U.empty('Nothing was kept from this session')); return; }
      if (stops.length) {
        box.appendChild(el('h3', null, 'How it moved'));
        var ol = el('ol', 'session-story-stops');
        stops.forEach(function (x) {
          var li = el('li'); li.appendChild(el('span', null, x.scene || x.stage));
          li.appendChild(el('span', 'small', x.minutes + ' min'));
          ol.appendChild(li);
        });
        box.appendChild(ol);
      }
      box.appendChild(el('h3', null, leading ? 'What was kept, by person' : 'What was kept about you'));
      // Talk covers only what was recorded, and rooms never are.
      if (read && read.state === 'done') box.appendChild(el('p', 'small', 'Speaking is from ' + L.spoken(read.read_seconds) + ' of recording. Breakout rooms are not recorded.'));
      who.forEach(function (p) {
        var card = el('div', 'session-prep-q');
        if (leading) card.appendChild(el('h4', null, p.name));
        var facts = [];
        if (p.spoke) facts.push(['Speaking', L.spoken(p.spoke)]);
        if (p.minutes) facts.push(['Add-on open', p.minutes + ' min']);
        if (p.reactions.length) facts.push(['Reactions', p.reactions.map(function (r) { var d = R && R.reaction(r[0]); return (d ? d.label : r[0]) + ' ' + r[1]; }).join(', ')]);
        if (p.answers) facts.push(['Answers', String(p.answers)]);
        if (p.requests) facts.push(['Requests', String(p.requests)]);
        if (p.shown) facts.push(['Work shown', String(p.shown)]);
        card.appendChild(U.facts(facts));
        box.appendChild(card);
      });
      // A name on a tile the site cannot connect to anyone: asked once.
      if (leading) L.others(talk).forEach(function (o) {
        var card = el('div', 'session-prep-q');
        card.appendChild(el('h4', null, o.name));
        card.appendChild(U.facts([['Speaking', L.spoken(o.spoke)]]));
        if (o.name === L.UNMATCHED) { box.appendChild(card); return; }
        var pick = el('select'); pick.setAttribute('aria-label', 'Who is ' + o.name + '?');
        pick.appendChild(new Option('Who is this?', ''));
        Object.keys(names).sort(function (a, b) { return names[a].localeCompare(names[b]); }).forEach(function (id) { pick.appendChild(new Option(names[id], id)); });
        pick.addEventListener('change', function () {
          if (!pick.value) return;
          db.rpc('name_speaker', { s: session.id, label: o.name, member: pick.value }).then(function (r) {
            if (r.error) { card.appendChild(el('p', 'small', 'Not saved: ' + r.error.message)); return; }
            drawStory(cohort, session, leading);
          });
        });
        card.appendChild(pick);
        box.appendChild(card);
      });
    });
  }

  function drawAfter(cohort, session) {
    var box = $('[data-after-answers]'), f = $('[data-heard-form]'), said = $('[data-heard-message]');
    box.replaceChildren();
    f.hidden = !('heard' in session);
    f.elements.heard.value = session.heard || '';
    f.onsubmit = function (ev) {
      ev.preventDefault();
      U.say(said, 'Saving');
      db.from('sessions').update({ heard: f.elements.heard.value.trim() || null }).eq('id', session.id).then(function (r) {
        U.say(said, r.error ? 'Not saved: ' + r.error.message : 'Saved', r.error ? 'problem' : undefined);
      });
    };
    Promise.all([
      db.from('live_checks').select('*').eq('session_id', session.id),
      db.from('live_answers').select('*').eq('cohort_id', cohort.id),
      db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id)
    ]).then(function (res) {
      if (res[0].error || res[1].error) { box.appendChild(el('p', 'small', 'The answers could not be read.')); return; }
      var names = {};
      (res[2].data || []).forEach(function (e) { names[e.user_id] = e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone'; });
      var ids = res[0].data.map(function (k) { return k.id; });
      var rows = (res[1].data || []).filter(function (a) { return ids.indexOf(a.check_id) >= 0; });
      var checks = window.TeachLib.checkAnswers(res[0].data, rows, function (id) { return names[id] || 'Someone'; });
      if (!checks.length) box.appendChild(U.empty('No questions were asked in this session'));
      checks.forEach(function (k) {
        var card = el('div', 'session-prep-q');
        card.appendChild(el('h3', null, k.prompt));
        if (!k.answers.length) card.appendChild(el('p', 'small', 'No answers.'));
        k.answers.forEach(function (a) {
          var p = el('p'); p.appendChild(el('strong', null, a.name + ': ')); p.appendChild(document.createTextNode(a.text));
          card.appendChild(p);
        });
        box.appendChild(card);
      });
    });
  }

  // A leader's own fields for the session: its title, the challenge in
  // their words, and the recording once there is one.
  // Each thing a leader can change sits where it shows: the title on the
  // title, what comes before the next session under the plan, and the
  // recording's link, which the recorder fills in, with what came of it.
  function drawEdits(s) {
    K.editing = s;
    var title = $('[data-title-form]'), next = $('[data-next-form]'), rec = $('[data-recording-form]');
    next.hidden = false;
    next.elements.scope.value = s.scope || '';
    rec.elements.recording_url.value = s.recording_url || '';
    var head = $('[data-title]');
    var rename = el('button', 'btn-secondary small session-rename-open', 'Rename');
    rename.type = 'button';
    var old = $('.session-rename-open'); if (old) old.remove();
    head.after(rename);
    function open(on) { title.hidden = !on; head.hidden = on; rename.hidden = on; }
    rename.addEventListener('click', function () {
      var now = K.editing;
      title.elements.title.value = now.title && now.title !== lib.sessionName(now.number) ? now.title : '';
      open(true); title.elements.title.focus();
    });
    $('[data-title-cancel]').onclick = function () { open(false); };
    function save(patch, said, done) {
      U.say(said, 'Saving');
      db.from('sessions').update(patch).eq('id', K.editing.id).then(function (r) {
        if (r.error) { U.say(said, 'Not saved: ' + r.error.message, 'problem'); return; }
        Object.assign(K.editing, patch);
        U.say(said, 'Saved');
        if (done) done();
      });
    }
    title.onsubmit = function (ev) {
      ev.preventDefault();
      save({ title: title.elements.title.value.trim() || lib.sessionName(K.editing.number) }, $('[data-title-status]'), function () {
        head.textContent = lib.sessionTitle(K.editing);
        open(false);
      });
    };
    next.onsubmit = function (ev) {
      ev.preventDefault();
      save({ scope: next.elements.scope.value.trim() || null }, $('[data-next-status]'), function () {
        $('[data-scope]').textContent = K.editing.scope || ''; $('[data-scope]').hidden = !K.editing.scope;
      });
    };
    rec.onsubmit = function (ev) {
      ev.preventDefault();
      var link = rec.elements.recording_url.value.trim(), said = $('[data-recording-status]');
      if (link && !safe(link)) { U.say(said, 'A recording link starts with https://', 'problem'); return; }
      save({ recording_url: link || null }, said);
    };
  }

  $('[data-reload]').addEventListener('click', load);
  load();
})();
