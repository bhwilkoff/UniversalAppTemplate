// The teaching desk (/teach/; PAGES.md): what needs the teacher, as
// counts that link to each queue, and a row for each cohort. Someone who
// does not teach yet asks to here. The database decides who may do what.
(function () {
  var root = document.querySelector('[data-teach]');
  if (!root || !window.supabase || !window.HUB || !window.TeachLib || !window.TeachPage) return;
  var P = window.TeachPage, el = P.el, lib = window.TeachLib;
  var db = null, me = null;

  // Old links opened one cohort here as /teach/?c=<id>.
  var old = new URLSearchParams(location.search).get('c');
  if (old) { location.replace('/teach/cohort/?c=' + encodeURIComponent(old)); return; }
  var anchors = { '#waiting': '/teach/feedback/', '#requests': '/teach/requests/' };
  if (anchors[location.hash]) { location.replace(anchors[location.hash]); return; }

  function $(sel) { return root.querySelector(sel); }
  function say(sel, text) { $(sel).textContent = text || ''; }
  function statusText(s) {
    return { draft: 'Draft, visible only to you', open: 'Open for people to join', running: 'Running', finished: 'Finished' }[s] || s;
  }

  // ---- what needs you -----------------------------------------------
  // One row per queue that has something in it, each a count and a link.
  function row(box, text, href, label) {
    var li = el('li');
    li.appendChild(el('span', null, text + ' '));
    var a = el('a', 'btn-secondary small', label); a.href = href;
    li.appendChild(a);
    box.appendChild(li);
  }
  function loadNeeds(teacher) {
    var jobs = [
      db.from('cohort_teachers').select('cohort_id').eq('user_id', me.id).then(function (r) {
        var ids = (r.data || []).map(function (x) { return x.cohort_id; });
        if (!ids.length) return 0;
        return Promise.all([
          db.from('shares').select('id, cohort_id, kind, feedback(author_id)').in('cohort_id', ids).in('kind', ['for-feedback', 'question']),
          db.from('cohort_teachers').select('cohort_id, user_id').in('cohort_id', ids)
        ]).then(function (res) {
          if (res[0].error || res[1].error) return null;
          var teachers = {};
          res[1].data.forEach(function (t) { (teachers[t.cohort_id] = teachers[t.cohort_id] || []).push(t.user_id); });
          return lib.waitingForFeedback(res[0].data, teachers).length;
        });
      }),
      teacher.can_approve ? db.from('teacher_requests').select('user_id, state, created_at').eq('state', 'waiting').then(function (r) { return r.error ? null : lib.waitingRequests(r.data).length; }) : 0,
      teacher.can_sign ? db.rpc('credentials_to_sign').then(function (r) { return r.error ? null : r.data.length; }) : 0
    ];
    return Promise.all(jobs).then(function (n) {
      var box = $('[data-needs]');
      box.replaceChildren();
      if (n[0]) row(box, n[0] === 1 ? 'One request for feedback or question is waiting for you.' : n[0] + ' requests for feedback and questions are waiting for you.', '/teach/feedback/', 'Answer them');
      if (n[1]) row(box, n[1] === 1 ? 'One person is asking to teach.' : n[1] + ' people are asking to teach.', '/teach/requests/', 'Read the requests');
      if (n[2]) row(box, n[2] === 1 ? 'One credential is waiting to be signed.' : n[2] + ' credentials are waiting to be signed.', '/teach/signing/', 'Sign them');
      if (n[0] == null || n[1] == null || n[2] == null) row(box, 'Some of what waits for you could not be counted just now.', '/teach/feedback/', 'Open your feedback queue');
      $('[data-needs-none]').hidden = !!box.children.length;
    });
  }

  // ---- your cohorts ---------------------------------------------------
  function loadList() {
    return db.from('cohort_teachers').select('cohorts(*)').eq('user_id', me.id).then(function (r) {
      if (r.error) return page.fail('Your cohorts could not be loaded: ' + r.error.message);
      var box = $('[data-cohort-list]');
      box.replaceChildren();
      var cohorts = r.data.map(function (x) { return x.cohorts; }).filter(Boolean)
        .sort(function (a, b) { return (b.starts_on || '').localeCompare(a.starts_on || ''); });
      if (!cohorts.length) box.appendChild(window.UI.empty('No cohorts yet', window.UI.link('Plan a cohort', '/teach/new/', 'btn-secondary')));
      cohorts.forEach(function (c) {
        var card = el('article', 'cohort-card');
        var h = card.appendChild(el('h3'));
        var a = h.appendChild(el('a', null, c.title));
        a.href = '/teach/cohort/?c=' + c.id;
        card.appendChild(el('p', 'small', statusText(c.status) + (c.starts_on ? ', first day ' + c.starts_on : '') + '.'));
        box.appendChild(card);
      });
    });
  }

  // ---- asking to teach ----------------------------------------------
  // Someone who does not teach yet sees the request form, or their own
  // request and its answer. The database decides who may read and
  // change what (teacher_requests in supabase/migrations).
  var myRequest = null;
  var askForm = $('[data-ask-form]');
  function loadMyRequest() {
    return db.from('teacher_requests').select('*').eq('user_id', me.id).maybeSingle().then(function (r) {
      if (r.error) return page.fail('Your request to teach could not be loaded: ' + r.error.message);
      myRequest = r.data;
      drawMyRequest();
    });
  }
  function drawMyRequest() {
    var state = lib.requestState(false, myRequest);
    if (state === 'ask') {
      askForm.reset();
      $('[data-ask-cancel]').hidden = true;
      say('[data-ask-submit]', 'Send my request');
      say('[data-ask-message]', '');
      page.show('ask');
      if (location.hash === '#ask') $('#ask').scrollIntoView();
      return;
    }
    var waiting = state === 'waiting';
    $('[data-asked-status]').replaceChildren(window.UI.status('request', waiting ? 'waiting' : 'declined'), document.createTextNode(waiting ? '' : ' You can take it back and ask again later.'));
    say('[data-asked-why]', myRequest.why);
    say('[data-asked-brings]', myRequest.brings || '');
    $('[data-asked-brings-box]').hidden = !myRequest.brings;
    say('[data-asked-reply]', myRequest.reply || '');
    $('[data-asked-reply-box]').hidden = !myRequest.reply;
    $('[data-asked-edit]').hidden = !waiting;
    var w = $('[data-asked-withdraw]');
    w.textContent = 'Take it back';
    say('[data-asked-message]', '');
    page.show('asked');
  }
  askForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = askForm.elements;
    var row = { why: f.why.value.trim(), brings: f.brings.value.trim() || null };
    if (!row.why) return say('[data-ask-message]', 'Say a little about why you would like to teach, and then send it.');
    var editing = !!myRequest;
    var q = editing
      ? db.from('teacher_requests').update(Object.assign({ updated_at: new Date().toISOString() }, row)).eq('user_id', me.id).select().single()
      : db.from('teacher_requests').insert(Object.assign({ user_id: me.id }, row)).select().single();
    say('[data-ask-message]', 'Sending…');
    q.then(function (r) {
      if (r.error) return say('[data-ask-message]', 'It could not be sent: ' + r.error.message);
      myRequest = r.data;
      drawMyRequest();
    });
  });
  $('[data-asked-edit]').addEventListener('click', function () {
    var f = askForm.elements;
    f.why.value = myRequest.why;
    f.brings.value = myRequest.brings || '';
    $('[data-ask-cancel]').hidden = false;
    say('[data-ask-submit]', 'Save the changes');
    say('[data-ask-message]', '');
    page.show('ask');
    f.why.focus();
  });
  $('[data-ask-cancel]').addEventListener('click', drawMyRequest);
  // Taking a request back asks once more on the page itself.
  $('[data-asked-withdraw]').addEventListener('click', function () {
    var b = this;
    window.UI.confirm({ title: 'Take back your request?', body: 'Its words are deleted. You can ask again.', action: 'Take back' }).then(function (ok) { if (ok) withdraw(b); });
  });
  function withdraw(b) {
    b.disabled = true;
    db.from('teacher_requests').delete().eq('user_id', me.id).select('user_id').then(function (r) {
      b.disabled = false;
      if (r.error || !r.data.length) return say('[data-asked-message]', 'It could not be taken back: ' + (r.error ? r.error.message : 'no request was found') + '.');
      myRequest = null;
      drawMyRequest();
    });
  }

  var page = P.start(root, function (client, user, name, teacher) {
    db = client; me = user;
    return Promise.all([loadNeeds(teacher), loadList()]);
  }, { notTeacher: function (client, user) { db = client; me = user; return loadMyRequest(); } });
})();
