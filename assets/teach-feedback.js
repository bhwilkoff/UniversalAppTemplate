// What a teacher's cohorts are waiting on them for (/teach/feedback/;
// PAGES.md): each request for feedback and each question with no answer
// from a teacher yet, answered here.
(function () {
  var root = document.querySelector('[data-teach-feedback]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib || !window.TeachPage) return;
  var P = window.TeachPage, el = P.el, lib = window.TeachLib;
  var db = null, me = null;
  function $(sel) { return root.querySelector(sel); }

  // ---- the feedback queue -------------------------------------------
  // Everything in the teacher's cohorts that asks for feedback or asks a
  // question and has no answer from a teacher yet (TeachLib.waitingForFeedback).
  function loadQueue() {
    var box = $('[data-queue-list]');
    return db.from('cohort_teachers').select('cohort_id, cohorts(id, slug, title)').eq('user_id', me.id).then(function (r) {
      if (r.error) { box.replaceChildren(el('p', 'small error', 'The requests could not be loaded: ' + r.error.message)); return; }
      var cohorts = {};
      r.data.forEach(function (x) { if (x.cohorts) cohorts[x.cohort_id] = x.cohorts; });
      var ids = Object.keys(cohorts);
      if (!ids.length) { box.replaceChildren(el('p', 'small', 'Nothing yet, because you do not have a cohort yet.')); return; }
      return Promise.all([
        db.from('shares').select('id, cohort_id, user_id, kind, url, note, created_at, profiles!shares_user_id_fkey(github_login, display_name), feedback(author_id)')
          .in('cohort_id', ids).in('kind', ['for-feedback', 'question']),
        db.from('cohort_teachers').select('cohort_id, user_id').in('cohort_id', ids)
      ]).then(function (res) {
        if (res[0].error || res[1].error) {
          box.replaceChildren(el('p', 'small error', 'The requests could not be loaded: ' + (res[0].error || res[1].error).message));
          return;
        }
        var teachers = {};
        res[1].data.forEach(function (t) { (teachers[t.cohort_id] = teachers[t.cohort_id] || []).push(t.user_id); });
        drawQueue(lib.waitingForFeedback(res[0].data, teachers), cohorts);
      });
    });
  }
  function drawQueue(waiting, cohorts) {
    var box = $('[data-queue-list]');
    box.replaceChildren();
    if (!waiting.length) { box.appendChild(el('p', 'small', 'Nothing is waiting for you right now.')); return; }
    waiting.forEach(function (s) {
      var c = cohorts[s.cohort_id];
      var who = s.profiles ? (s.profiles.display_name || '@' + s.profiles.github_login) : 'Someone';
      var card = el('article', 'cohort-card share');
      card.appendChild(el('p', 'kicker', (s.kind === 'question' ? 'A question from ' : 'Feedback requested by ') + who));
      card.appendChild(el('p', 'small', c.title + ', ' + new Date(s.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.'));
      if (s.note) card.appendChild(el('p', null, s.note));
      if (s.url && /^https:\/\//.test(s.url)) {
        var a = el('a', null, s.url.replace(/^https:\/\//, '')); a.href = s.url; a.rel = 'noopener';
        card.appendChild(el('p')).appendChild(a);
      }
      var form = el('form', 'inline-form');
      var label = el('label', null, s.kind === 'question' ? 'Your answer' : 'Your feedback');
      var input = el('textarea'); input.rows = 3; input.required = true; input.maxLength = 8000;
      label.appendChild(input); form.appendChild(label);
      var send = el('button', 'btn-primary', 'Send'); send.type = 'submit';
      var open = el('a', 'btn-secondary', 'Open the cohort'); open.href = '/cohort/?c=' + c.id;
      var actions = el('div', 'actions'); actions.appendChild(send); actions.appendChild(open); form.appendChild(actions);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        send.disabled = true;
        db.from('feedback').insert({ share_id: s.id, author_id: me.id, body: input.value.trim() }).then(function (r) {
          if (r.error) { send.disabled = false; send.textContent = 'Not sent, try again'; return; }
          loadQueue();
        });
      });
      card.appendChild(form);
      box.appendChild(card);
    });
  }

  P.start(root, function (client, user) { db = client; me = user; return loadQueue(); });
})();
