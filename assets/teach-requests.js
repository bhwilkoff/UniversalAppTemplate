// Requests to teach, for the people who approve teachers
// (/teach/requests/; PAGES.md). decide_teacher_request decides who may.
(function () {
  var root = document.querySelector('[data-teach-requests]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib || !window.TeachPage) return;
  var P = window.TeachPage, el = P.el, lib = window.TeachLib;
  var db = null;
  function $(sel) { return root.querySelector(sel); }

  // People who can approve teachers see every waiting request, with a
  // place to answer, an approve button that asks once more on the page,
  // and a decline button.
  function loadRequests() {
    return db.from('teacher_requests')
      .select('user_id, why, brings, state, created_at, profiles!teacher_requests_user_id_fkey(github_login, display_name)')
      .eq('state', 'waiting').then(function (r) {
        var box = $('[data-request-list]');
        if (r.error) { box.replaceChildren(el('p', 'small error', 'The requests to lead could not be loaded: ' + r.error.message)); return; }
        var waiting = lib.waitingRequests(r.data);
        box.replaceChildren();
        if (!waiting.length) { box.appendChild(el('p', 'small', 'No one is waiting to hear about leading right now.')); return; }
        waiting.forEach(function (q) { box.appendChild(requestCard(q)); });
      });
  }
  function requestCard(q) {
    var p = q.profiles || {};
    var login = p.github_login || 'someone';
    var card = el('article', 'cohort-card share');
    var who = el('p', 'kicker');
    var gh = el('a', null, p.display_name ? p.display_name + ' (@' + login + ')' : '@' + login);
    gh.href = 'https://github.com/' + encodeURIComponent(login);
    who.appendChild(gh);
    who.appendChild(document.createTextNode(' asks to lead'));
    card.appendChild(who);
    card.appendChild(el('p', 'small', 'Asked ' + new Date(q.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + '.'));
    card.appendChild(el('p', null, q.why));
    if (q.brings) {
      card.appendChild(el('p', 'small', 'What they would bring'));
      card.appendChild(el('p', null, q.brings));
    }
    var form = el('form', 'inline-form');
    var label = el('label', null, 'Your answer, which they will read');
    var input = el('textarea'); input.rows = 3; input.maxLength = 2000;
    label.appendChild(input); form.appendChild(label);
    var approve = el('button', 'btn-secondary', 'Approve'); approve.type = 'submit';
    var decline = el('button', 'btn-danger', 'Decline'); decline.type = 'button';
    var msg = el('p', 'small');
    var actions = el('div', 'actions'); actions.appendChild(approve); actions.appendChild(decline);
    form.appendChild(actions); form.appendChild(msg);
    function decide(yes) {
      approve.disabled = decline.disabled = true;
      db.rpc('decide_teacher_request', { person: q.user_id, approve: yes, answer: input.value.trim() || null }).then(function (r) {
        approve.disabled = decline.disabled = false;
        if (r.error) { msg.textContent = 'That was not saved: ' + r.error.message; return; }
        loadRequests();
      });
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      window.UI.confirm({ title: 'Make @' + login + ' a leader?', body: 'They can plan and run cohorts of their own.', action: 'Approve', danger: false }).then(function (ok) { if (ok) decide(true); });
    });
    decline.addEventListener('click', function () {
      window.UI.confirm({ title: 'Decline @' + login + '\u2019s request?', body: 'They read your answer, and can ask again later.', action: 'Decline' }).then(function (ok) { if (ok) decide(false); });
    });
    card.appendChild(form);
    return card;
  }

  var page = P.start(root, function (client, user, name, teacher) {
    db = client;
    if (!teacher.can_approve) return page.show('not-approver');
    return loadRequests();
  });
})();
