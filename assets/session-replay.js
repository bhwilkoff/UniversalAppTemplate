// The recording with its moments beside it (ReplayLib): each row opens the
// video at that second. A learner sees their own moments, and a leader sees
// everyone's, can line the add-on's moments up with the video, and writes
// feedback on a learner's moment that stays a draft until shared. Marks and
// feedback are in migration 20261112010000.
(function () {
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, fn) { var b = el('button', cls || 'btn-secondary small', label); b.type = 'button'; b.addEventListener('click', fn); return b; }

  // o: { db, mount, video, cohort, session, me, leading, outcomes, hideNames() }
  function draw(o) {
    var R = window.ReplayLib, S = window.SessionStoryLib, U = window.UI, RL = window.ReactLib, LL = window.LiveLib;
    var db = o.db, box = o.mount, v = o.video, session = o.session, cohort = o.cohort;
    var K = { rows: [], view: 'all', person: '', names: {}, feedback: [], marks: [], data: null };
    box.replaceChildren(el('p', 'small', 'Gathering the moments…'));

    function read() {
      return Promise.all([
        db.from('scenes').select('id, title, kind').eq('session_id', session.id),
        db.from('session_events').select('user_id, kind, detail, at').eq('session_id', session.id).in('kind', ['stage', 'reaction']).order('at').limit(5000),
        db.from('live_checks').select('id, prompt, kind, choices, created_at').eq('session_id', session.id),
        db.from('live_answers').select('check_id, user_id, choice, body, value, created_at').eq('cohort_id', cohort.id),
        db.from('live_queue').select('user_id, note, shown_at').eq('session_id', session.id),
        db.from('session_talk').select('user_id, name, started_s, ended_s').eq('session_id', session.id).limit(5000),
        db.from('session_marks').select('id, user_id, at, word').eq('session_id', session.id).eq('user_id', o.me.id),
        db.from('moment_feedback').select('*').eq('session_id', session.id),
        db.from('enrollments').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
        db.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohort.id),
        db.from('session_reads').select('read_seconds').eq('session_id', session.id).maybeSingle()
      ]);
    }

    function nameOf(id) {
      if (!id) return null;
      if (id === o.me.id) return 'You';
      return o.leading ? (K.names[id] || 'Someone') : null;
    }
    function shownName(id) { return o.leading && o.hideNames() && id !== o.me.id ? 'Someone' : nameOf(id); }

    function build() {
      var d = K.data, titles = {};
      d.scenes.forEach(function (s) { titles[s.id] = s.title; });
      K.rows = R.rows({
        startedAt: session.recording_started_at, length: K.length,
        sceneTitle: function (id) { return titles[id] || null; },
        events: d.events, checks: d.checks, queue: d.queue, talk: d.talk, marks: K.marks, feedback: K.feedback,
        answers: d.answers, answerText: function (k, a) { return LL && k ? (LL.answerText(k, a) || '') : (a.body || ''); },
        nameOf: nameOf
      });
    }

    function seek(s) {
      if (!v) return;
      try { v.currentTime = s; v.play().catch(function () {}); } catch (e) {}
      v.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function rowText(r) {
      var who = shownName(r.user_id);
      if (r.kind === 'part') return [el('strong', null, r.text)];
      if (r.kind === 'question') return [el('span', 'replay-kind', 'Question'), document.createTextNode(' ' + r.text)];
      if (r.kind === 'answer') return [el('span', 'replay-kind', who === 'You' ? 'You answered' : who + ' answered'), document.createTextNode(' ' + (r.text || ''))];
      if (r.kind === 'shown') return [document.createTextNode(who === 'You' ? 'You showed your work' : who + ' showed their work')];
      if (r.kind === 'talk') return [document.createTextNode((r.user_id ? (who === 'You' ? 'You' : who) : (r.name || 'Someone')) + ' spoke, ' + S.spoken(r.until - r.s))];
      if (r.kind === 'mark') return [el('span', 'replay-kind', 'Your mark'), document.createTextNode(r.text ? ' ' + r.text : '')];
      if (r.kind === 'reaction') return [el('span', 'replay-kind', 'Reactions'), document.createTextNode(' ' + r.counts.map(function (c) { var x = RL && RL.reaction(c[0]); return (x ? x.label : c[0]) + ' ' + c[1]; }).join(', '))];
      if (r.kind === 'feedback') {
        if (o.leading) return [el('span', 'replay-kind', 'Feedback for ' + (K.names[r.user_id] || 'Someone')), document.createTextNode(' ' + r.text)];
        return [el('span', 'replay-kind', 'Feedback from ' + (K.names[r.author_id] || 'your leader')), document.createTextNode(' ' + r.text)];
      }
      return [document.createTextNode(r.text || '')];
    }

    var list = el('ol', 'replay-rows');
    function drawRows() {
      list.replaceChildren();
      var shown = R.view(K.rows, K.view, K.person || null).filter(function (r) { return !(K.person && r.kind === 'reaction'); });
      if (!shown.length) { list.appendChild(el('li', 'small', K.view === 'mine' ? 'No marks or feedback here yet.' : 'Nothing to show here.')); return; }
      shown.forEach(function (r) {
        var li = el('li', 'replay-row replay-' + r.kind);
        li.dataset.s = String(r.s);
        var at = button(S.clock(r.s), 'replay-at', function () { seek(r.s); });
        at.setAttribute('aria-label', 'Play from ' + S.clock(r.s));
        li.appendChild(at);
        var text = el('p', 'replay-text');
        rowText(r).forEach(function (n) { text.appendChild(n); });
        li.appendChild(text);
        if (r.kind === 'mark') li.appendChild(button('Remove', 'link-button', function () {
          db.from('session_marks').delete().eq('id', r.id).then(function () { K.marks = K.marks.filter(function (m) { return m.id !== r.id; }); build(); drawRows(); });
        }));
        if (o.leading && r.user_id && r.user_id !== o.me.id && r.kind !== 'feedback' && r.kind !== 'mark') {
          li.appendChild(button('Feedback', 'link-button', function () { openFeedback(r.user_id, r.s, li); }));
        }
        list.appendChild(li);
      });
      follow();
    }

    // The row the video is at is marked as it plays.
    function follow() {
      if (!v) return;
      var t = v.currentTime || 0, cur = null;
      list.querySelectorAll('.replay-row').forEach(function (li) { if (Number(li.dataset.s) <= t) cur = li; li.removeAttribute('aria-current'); });
      if (cur && t > 0) cur.setAttribute('aria-current', 'time');
    }

    // A leader writes feedback on one learner's moment; it waits as a draft.
    function openFeedback(learner, s, after) {
      var old = box.querySelector('.replay-feedback-form'); if (old) old.remove();
      var f = el('form', 'cohort-form replay-feedback-form');
      f.appendChild(el('p', 'small', 'Feedback for ' + (K.names[learner] || 'Someone') + ' at ' + S.clock(s)));
      var note = el('p', 'ui-meta-line'); note.appendChild(U.visibility('them', 'Once shared')); f.appendChild(note);
      var area = el('textarea'); area.rows = 3; area.maxLength = 4000; area.required = true; area.setAttribute('aria-label', 'Feedback');
      f.appendChild(area);
      var pick = null;
      if (o.outcomes && o.outcomes.length) {
        var lab = el('label', null, 'What it practices ');
        pick = el('select');
        pick.appendChild(new Option('None in particular', ''));
        o.outcomes.forEach(function (x) { pick.appendChild(new Option('#' + x.name, x.name)); });
        lab.appendChild(pick); f.appendChild(lab);
      }
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var save = el('button', 'btn-primary small', 'Keep as a draft'); save.type = 'submit';
      acts.appendChild(save);
      acts.appendChild(button('Cancel', 'btn-secondary small', function () { f.remove(); }));
      acts.appendChild(said); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!area.value.trim()) return;
        U.say(said, 'Saving');
        db.from('moment_feedback').insert({ cohort_id: cohort.id, session_id: session.id, learner_id: learner, at_s: Math.round(s), body: area.value.trim(), outcome: pick && pick.value ? pick.value : null })
          .select('*').single().then(function (r) {
            if (r.error) return U.say(said, 'Not saved: ' + r.error.message, 'problem');
            K.feedback.push(r.data); build(); drawRows(); drawDrafts(); f.remove();
          });
      });
      after.after(f);
      area.focus();
    }

    var drafts = el('section', 'replay-drafts');
    function drawDrafts() {
      drafts.replaceChildren();
      if (!o.leading) { drafts.hidden = true; return; }
      var mine = K.feedback.slice().sort(function (a, b) { return (a.at_s || 0) - (b.at_s || 0); });
      drafts.hidden = !mine.length;
      if (!mine.length) return;
      var waiting = mine.filter(function (f) { return !f.shared_at; });
      drafts.appendChild(el('h3', null, 'Feedback'));
      var note = el('p', 'ui-meta-line'); note.appendChild(U.visibility('them', 'Each note, once shared')); drafts.appendChild(note);
      var ul = el('ul', 'replay-draft-list');
      mine.forEach(function (f) {
        var li = el('li');
        var head = el('p');
        head.appendChild(el('strong', null, K.names[f.learner_id] || 'Someone'));
        head.appendChild(document.createTextNode(' at '));
        head.appendChild(button(S.clock(f.at_s || 0), 'replay-at', function () { seek(f.at_s || 0); }));
        head.appendChild(document.createTextNode(' '));
        head.appendChild(U.status('feedback', f.delivered_at ? 'sent' : f.shared_at ? 'shared' : 'draft'));
        li.appendChild(head);
        if (f.outcome) li.appendChild(el('p', 'small', '#' + f.outcome));
        li.appendChild(el('p', null, f.body));
        if (!f.shared_at) li.appendChild(button('Remove', 'link-button', function () {
          db.from('moment_feedback').delete().eq('id', f.id).then(function (r) {
            if (r.error) return;
            K.feedback = K.feedback.filter(function (x) { return x.id !== f.id; }); build(); drawRows(); drawDrafts();
          });
        }));
        ul.appendChild(li);
      });
      drafts.appendChild(ul);
      if (waiting.length) {
        var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
        var acts = el('div', 'actions');
        acts.appendChild(button(waiting.length === 1 ? 'Share this feedback' : 'Share all ' + waiting.length, 'btn-primary', function () {
          var people = {};
          waiting.forEach(function (f) { people[f.learner_id] = true; });
          var n = Object.keys(people).length;
          U.confirm({ title: 'Share ' + (waiting.length === 1 ? 'this feedback' : 'these ' + waiting.length + ' notes') + '?', body: 'Each learner gets only their own, in their private repository. It cannot be taken back.', action: 'Share with ' + (n === 1 ? 'one learner' : n + ' learners') }).then(function (yes) {
            if (!yes) return;
            U.say(said, 'Sharing');
            db.from('moment_feedback').update({ shared_at: new Date().toISOString() }).in('id', waiting.map(function (f) { return f.id; })).select('*').then(function (r) {
              if (r.error) return U.say(said, 'Not shared: ' + r.error.message, 'problem');
              (r.data || []).forEach(function (x) { K.feedback = K.feedback.map(function (f) { return f.id === x.id ? x : f; }); });
              build(); drawRows(); drawDrafts();
            });
          });
        }));
        acts.appendChild(said);
        drafts.appendChild(acts);
      }
    }

    // Without the recording's start, a leader lines it up once: play to a
    // moment the add-on kept, then say it is here.
    function lineUp(mount) {
      var d = K.data, titles = {};
      d.scenes.forEach(function (s) { titles[s.id] = s.title; });
      var firsts = [], seen = {};
      d.events.forEach(function (e) {
        var m = /^scene:(.+)$/.exec(String(e.detail || ''));
        if (e.kind !== 'stage' || !m || seen[m[1]]) return;
        seen[m[1]] = true; firsts.push({ at: e.at, title: titles[m[1]] || 'A part' });
      });
      d.checks.forEach(function (k) { firsts.push({ at: k.created_at, title: 'Question: ' + (k.prompt || '') }); });
      firsts.sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
      if (!firsts.length) return;
      var f = el('form', 'cohort-form replay-line-up');
      f.appendChild(el('h3', null, 'Line up the moments'));
      f.appendChild(el('p', 'small', 'Play the video to one of these moments, pause, and choose it.'));
      var pick = el('select'); pick.setAttribute('aria-label', 'The moment the video shows');
      firsts.forEach(function (x, i) { pick.appendChild(new Option(x.title, String(i))); });
      f.appendChild(pick);
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var go = el('button', 'btn-primary small', 'It happens where the video is paused'); go.type = 'submit';
      acts.appendChild(go); acts.appendChild(said); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!v || !(v.currentTime > 0)) return U.say(said, 'Play the video to that moment first.', 'problem');
        var start = R.startFrom(firsts[Number(pick.value)].at, v.currentTime);
        U.say(said, 'Saving');
        db.from('sessions').update({ recording_started_at: start }).eq('id', session.id).then(function (r) {
          if (r.error) return U.say(said, 'Not saved: ' + r.error.message, 'problem');
          session.recording_started_at = start;
          paint();
        });
      });
      mount.appendChild(f);
    }

    function paint() {
      build();
      box.replaceChildren();
      box.appendChild(el('h2', null, 'Moments'));
      var note = el('p', 'ui-meta-line');
      note.appendChild(o.leading ? U.visibility('staff', 'Everyone’s moments') : U.visibility('teachers', 'Your moments'));
      box.appendChild(note);
      if (!session.recording_started_at && o.leading) lineUp(box);
      // A learner's feedback first, each note opening its moment.
      if (!o.leading && K.feedback.length) {
        var fbs = el('section', 'replay-drafts');
        fbs.appendChild(el('h3', null, 'Feedback for you'));
        var ful = el('ul', 'replay-draft-list');
        K.feedback.slice().sort(function (a, b) { return (a.at_s || 0) - (b.at_s || 0); }).forEach(function (f) {
          var li = el('li'), head = el('p');
          head.appendChild(el('strong', null, K.names[f.author_id] || 'Your leader'));
          head.appendChild(document.createTextNode(' at '));
          head.appendChild(button(S.clock(f.at_s || 0), 'replay-at', function () { seek(f.at_s || 0); }));
          li.appendChild(head);
          if (f.outcome) li.appendChild(el('p', 'small', '#' + f.outcome));
          li.appendChild(el('p', null, f.body));
          ful.appendChild(li);
        });
        fbs.appendChild(ful);
        box.appendChild(fbs);
      }
      var bar = el('div', 'replay-bar cohort-form');
      var which = el('select'); which.setAttribute('aria-label', 'Which moments');
      [['all', 'Every moment'], ['parts', 'Parts and questions'], ['talk', 'Who spoke'], ['mine', 'Your bookmarks and feedback']].forEach(function (x) { which.appendChild(new Option(x[1], x[0])); });
      which.value = K.view;
      which.addEventListener('change', function () { K.view = which.value; drawRows(); });
      bar.appendChild(which);
      if (o.leading) {
        var who = el('select'); who.setAttribute('aria-label', 'Whose moments');
        who.appendChild(new Option('Everyone', ''));
        Object.keys(K.names).filter(function (id) { return id !== o.me.id && K.learners[id]; }).sort(function (a, b) { return K.names[a].localeCompare(K.names[b]); })
          .forEach(function (id) { who.appendChild(new Option(K.names[id], id)); });
        who.value = K.person;
        who.addEventListener('change', function () { K.person = who.value; drawRows(); drawHere(); });
        bar.appendChild(who);
      }
      box.appendChild(bar);
      var here = el('div', 'actions replay-here');
      function drawHere() {
        here.replaceChildren();
        if (session.recording_started_at) here.appendChild(button('Bookmark this moment', 'btn-secondary small', markHere));
        if (o.leading && K.person) here.appendChild(button('Feedback for ' + K.names[K.person] + ' here', 'btn-secondary small', function () { openFeedback(K.person, v ? v.currentTime : 0, here); }));
        here.hidden = !here.children.length;
      }
      drawHere();
      box.appendChild(here);
      box.appendChild(list);
      drawRows();
      box.appendChild(drafts);
      drawDrafts();
    }

    function markHere() {
      if (!v || !session.recording_started_at) return;
      var at = new Date(Date.parse(session.recording_started_at) + v.currentTime * 1000).toISOString();
      db.from('session_marks').insert({ cohort_id: cohort.id, session_id: session.id, at: at }).select('id, user_id, at, word').single().then(function (r) {
        if (r.error) return;
        K.marks.push(r.data); build(); drawRows();
      });
    }

    read().then(function (res) {
      if (res.slice(0, 10).some(function (r) { return r.error; })) { box.replaceChildren(el('p', 'small', 'The moments could not be read.')); return; }
      K.data = { scenes: res[0].data, events: res[1].data, checks: res[2].data, answers: res[3].data, queue: res[4].data, talk: res[5].data };
      K.marks = res[6].data; K.feedback = res[7].data;
      K.learners = {};
      res[8].data.concat(res[9].data).forEach(function (e) { K.names[e.user_id] = e.profiles ? (e.profiles.display_name || e.profiles.github_login) : 'Someone'; });
      res[8].data.forEach(function (e) { K.learners[e.user_id] = true; });
      K.length = (res[10].data && res[10].data.read_seconds) || null;
      paint();
      // A link to one moment (from feedback in GitHub) opens the video there.
      var at = Number(new URLSearchParams(location.search).get('at'));
      if (v && isFinite(at) && at > 0) {
        var go = function () { try { v.currentTime = at; } catch (e) {} };
        if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
      }
      if (v) {
        v.addEventListener('loadedmetadata', function () { if (isFinite(v.duration) && v.duration > 0 && !K.length) { K.length = Math.ceil(v.duration); build(); drawRows(); } });
        v.addEventListener('timeupdate', follow);
      }
    });
  }

  window.SessionReplay = { draw: draw };
})();
