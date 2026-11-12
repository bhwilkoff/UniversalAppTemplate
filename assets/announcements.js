// A leader's announcements to the cohort (cohort_announcements, migration
// 20261112010000): written here, posted as an issue in the cohort repository
// by the reminders function at the time chosen, so GitHub's own
// notifications carry them. Everyone in the cohort reads the posted ones here.
(function () {
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function local(d) {
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) + 'T' + two(d.getHours()) + ':' + two(d.getMinutes());
  }

  // o: { db, mount, cohort, me, leading }
  function draw(o) {
    var U = window.UI, db = o.db, box = o.mount;
    box.replaceChildren();
    db.from('cohort_announcements').select('*').eq('cohort_id', o.cohort.id).order('send_at', { ascending: false }).limit(50).then(function (r) {
      if (r.error) { box.appendChild(el('p', 'small', 'The announcements could not be read.')); return; }
      var rows = r.data || [];
      if (o.leading && o.cohort.github_repo && o.cohort.status !== 'finished') box.appendChild(form());
      if (!rows.length) { box.appendChild(U.empty(o.leading ? 'No announcements yet' : 'No announcements')); return; }
      var ul = el('ul', 'ui-rows announcement-list');
      rows.forEach(function (a) {
        var li = el('li', 'announcement');
        var head = el('p', 'announcement-head');
        head.appendChild(el('strong', null, a.title));
        head.appendChild(document.createTextNode(' '));
        var state = a.sent_at ? 'posted' : a.problem ? 'failed' : Date.parse(a.send_at) > Date.now() ? 'scheduled' : 'sending';
        if (o.leading || state !== 'posted') head.appendChild(U.status('announcement', state));
        li.appendChild(head);
        var when = new Date(a.sent_at || a.send_at);
        li.appendChild(el('p', 'small', (a.sent_at ? 'Posted ' : 'Posts ') + when.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
        li.appendChild(el('p', 'announcement-body', a.body));
        var acts = el('div', 'actions');
        if (a.issue_url) { var g = el('a', 'btn-secondary small', 'On GitHub'); g.href = a.issue_url; g.target = '_blank'; g.rel = 'noopener'; acts.appendChild(g); }
        if (o.leading && !a.sent_at) {
          var rm = el('button', 'btn-secondary small', 'Remove'); rm.type = 'button';
          rm.addEventListener('click', function () {
            U.confirm({ title: 'Remove this announcement?', body: 'It will not be posted.', action: 'Remove' }).then(function (yes) {
              if (yes) db.from('cohort_announcements').delete().eq('id', a.id).then(function () { draw(o); });
            });
          });
          acts.appendChild(rm);
        }
        if (acts.children.length) li.appendChild(acts);
        ul.appendChild(li);
      });
      box.appendChild(ul);
    });

    function form() {
      var d = el('details', 'announcement-new');
      d.appendChild(el('summary', null, 'Write an announcement'));
      var f = el('form', 'cohort-form');
      var note = el('p', 'ui-meta-line'); note.appendChild(U.visibility('cohort', 'Posted in the cohort repository')); f.appendChild(note);
      var tl = el('label', null, 'Title'); var t = el('input'); t.type = 'text'; t.maxLength = 120; t.required = true; tl.appendChild(t); f.appendChild(tl);
      var bl = el('label', null, 'What it says'); var b = el('textarea'); b.rows = 5; b.maxLength = 8000; b.required = true; bl.appendChild(b); f.appendChild(bl);
      var wl = el('label', null, 'When to post it');
      var w = el('input'); w.type = 'datetime-local'; w.min = local(new Date());
      wl.appendChild(w);
      wl.appendChild(el('span', 'hint', 'Leave it empty to post within ten minutes.'));
      f.appendChild(wl);
      var said = el('span', 'ui-inline-status'); said.setAttribute('role', 'status');
      var acts = el('div', 'actions');
      var go = el('button', 'btn-primary', 'Post it'); go.type = 'submit';
      w.addEventListener('input', function () { go.textContent = w.value ? 'Post it then' : 'Post it'; });
      acts.appendChild(go); acts.appendChild(said); f.appendChild(acts);
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var at = w.value ? new Date(w.value) : new Date();
        if (w.value && !(at.getTime() > Date.now() - 60000)) return U.say(said, 'Choose a time from now on.', 'problem');
        U.say(said, 'Saving');
        db.from('cohort_announcements').insert({ cohort_id: o.cohort.id, title: t.value.trim(), body: b.value.trim(), send_at: at.toISOString() }).then(function (r) {
          if (r.error) return U.say(said, 'Not saved: ' + r.error.message, 'problem');
          draw(o);
        });
      });
      d.appendChild(f);
      return d;
    }
  }

  window.Announcements = { draw: draw };
})();
