// Starting an exchange (/exchange/new/, with ?c=<cohort id> from a cohort's
// page; PAGES.md): its name, who can see it, and the opening video, which
// is its prompt. Saving goes to the new exchange at /exchange/#<link>.
(function () {
  var X = window.ExchangeLib;
  var root = document.querySelector('[data-exchange-new]');
  if (!root || !X || !window.supabase || !window.HUB || !window.ExchangeRecorder || !window.ExchangeDrive) return;
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
  var asked = new URLSearchParams(location.search).get('c');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function show(state) {
    root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }

  // The new-exchange form: a name, where it lives, and the opening video,
  // which is the exchange's prompt. The video goes to the maker's Drive
  // first; the exchange and its opening video are then made together.
  // `opts.cohort` is a fixed cohort id, or the form has a <select>.
  function wireForm(form, opts) {
    var status = form.querySelector('[data-x-status]');
    var bar = form.querySelector('[data-x-progress]');
    var submit = form.querySelector('button[type="submit"]');
    var recorder = null, busy = false, saved = null;
    function ready() { submit.disabled = busy || !(recorder && recorder.result()); }
    form.xOpen = function () {
      if (!recorder) recorder = window.ExchangeRecorder.mount(form.querySelector('[data-x-recorder]'), { onChange: ready });
      ready();
    };
    form.xClose = function () {
      if (recorder) recorder.reset();
      status.textContent = '';
      bar.hidden = true;
    };
    window.addEventListener('pagehide', function () { if (recorder) recorder.release(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var r = recorder && recorder.result();
      var where = opts.cohort || (form.elements.where ? form.elements.where.value : '');
      var members = where === 'members';
      var checked = X.checkExchange({ title: form.elements.title.value, video: !!r, cohort: members ? '' : where });
      if (checked.error) { status.textContent = checked.error; return; }
      busy = true; ready();
      status.textContent = 'Connecting your Google Drive…';
      // A video already saved for this same recording is not saved twice.
      var stored = saved && saved.result === r ? Promise.resolve(saved.id) : window.ExchangeDrive.connect(opts.email).then(function (gtoken) {
        bar.hidden = false; bar.value = 0;
        status.textContent = 'Saving to your Google Drive…';
        return window.ExchangeDrive.save(gtoken, r.blob, {
          name: X.fileName(checked.row.title, new Date(), r.mime), mime: r.mime,
          description: 'Recorded for "' + checked.row.title + '" on humanshaped.org.'
        }, function (f) {
          bar.value = Math.round(f * 100);
          status.textContent = 'Saving to your Google Drive… ' + Math.round(f * 100) + '%';
        });
      }).then(function (id) { saved = { result: r, id: id }; return id; });
      stored.then(function (fileId) {
        status.textContent = 'Starting the exchange…';
        return db.rpc('start_exchange', {
          title: checked.row.title, cohort: checked.row.cohort, drive_file_id: fileId, mime: X.baseType(r.mime),
          kind: r.kind, seconds: r.seconds, note: form.elements.note.value.trim() || null, members: members
        });
      }).then(function (res) {
        if (res.error) throw new Error('your video is in your Drive, but the exchange did not start: ' + res.error.message);
        location.href = '/exchange/#' + res.data;
      }).catch(function (err) {
        busy = false; ready();
        bar.hidden = true;
        status.textContent = 'It was not started: ' + said(err) + '. Your video is still here, so you can try again.';
      });
    });
  }

  db.auth.getSession().then(function (s) {
    var me = s.data && s.data.session ? s.data.session.user : null;
    if (!me) return show('signed-out');
    var form = root.querySelector('[data-x-form]');
    var sel = form.elements.where;
    return Promise.all([
      db.rpc('am_i_a_member'),
      db.from('enrollments').select('cohorts(id, slug, title, status)').eq('user_id', me.id).neq('status', 'left'),
      db.from('cohort_teachers').select('cohorts(id, slug, title, status)').eq('user_id', me.id)
    ]).then(function (res) {
      if (res[0].data === true) {
        var m = el('option', null, 'Human Shaped members');
        m.value = 'members';
        sel.appendChild(m);
      }
      var seen = {}, any = false, from = null;
      res.slice(1).forEach(function (r) {
        (r.data || []).forEach(function (x) {
          var c = x.cohorts;
          if (!c || seen[c.id] || c.status === 'finished') return;
          seen[c.id] = any = true;
          if (c.id === asked) from = c;
          var o = el('option', null, 'Your cohort: ' + c.title);
          o.value = c.id;
          sel.appendChild(o);
        });
      });
      if (!any) {
        var none = el('option', null, 'Your cohort (you are in none yet)');
        none.disabled = true;
        sel.appendChild(none);
      }
      // Started from a cohort's page: that cohort is chosen, the
      // breadcrumb and Cancel lead back to it.
      if (from) {
        sel.value = from.id;
        var back = '/cohort/?c=' + encodeURIComponent(from.slug);
        root.ownerDocument.querySelectorAll('[data-x-back]').forEach(function (a) { a.href = back; if (a.hasAttribute('data-name')) a.textContent = from.title; });
      }
      wireForm(form, { email: me.email });
      show('ready');
      form.xOpen();
    });
  }).catch(function (e) {
    root.querySelector('[data-error-text]').textContent = 'The page could not reach Human Shaped: ' + said(e) + '.';
    show('error');
  });
})();
