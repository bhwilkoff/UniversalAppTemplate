// Your own app, outside any cohort (/apps/mine/; PAGES.md): its repository,
// name, address, and whether the apps page shows it. The database decides
// who may read and change it (builder_apps, migration 20261004010000).
(function () {
  var root = document.querySelector('[data-apps-mine]');
  if (!root || !window.supabase || !window.HUB || !window.BuilderLib) return;
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
  var ownAppWired = false;
  function show_(state) {
    root.querySelectorAll('.account-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function fail(message) { root.querySelector('[data-error-text]').textContent = message; show_('error'); }

  function drawOwnApp(uid) {
    var B = window.BuilderLib;
    var section = root;
    if (!B) return;
    var form = root.querySelector('[data-own-app-form]');
    var status = root.querySelector('[data-own-app-status]');
    var standing = root.querySelector('[data-own-app-standing]');
    var remove = root.querySelector('[data-own-app-remove]');
    var page = root.querySelector('[data-own-app-page]');
    function show(row, hide) {
      var st = B.standing(row, hide), U = window.UI;
      standing.replaceChildren();
      if (st) {
        standing.appendChild(U.visibility(st.audience));
        if (st.hidden) { standing.appendChild(document.createTextNode(' ')); standing.appendChild(U.status('app', 'hidden')); if (st.reason) standing.appendChild(U.el('span', 'ui-row-meta', ' ' + st.reason)); }
      }
      remove.hidden = !row;
      page.hidden = !(row && row.public && !hide);
      if (row) page.href = '/apps/app/?r=' + row.app_repo;
    }
    Promise.all([
      db.from('builder_apps').select('app_repo, app_name, app_url, public').eq('user_id', uid).maybeSingle(),
      db.from('builder_app_hides').select('reason').eq('user_id', uid).maybeSingle()
    ]).then(function (res) {
      if (res[0].error) return fail('Your app could not be read: ' + res[0].error.message);
      var row = res[0].data, hide = res[1].error ? null : res[1].data;
      form.elements.repo.value = row ? row.app_repo : '';
      form.elements.name.value = row && row.app_name || '';
      form.elements.url.value = row && row.app_url || '';
      form.elements.public.checked = !!(row && row.public);
      show(row, hide);
      show_('ready');
      if (ownAppWired) return;
      ownAppWired = true;
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var checked = B.checkOwnApp({
          repo: form.elements.repo.value, name: form.elements.name.value,
          url: form.elements.url.value, public: form.elements.public.checked
        });
        if (checked.error) { status.textContent = checked.error; return; }
        status.textContent = 'Saving…';
        db.from('builder_apps').upsert(Object.assign({ user_id: uid }, checked.row)).select('app_repo, app_name, app_url, public').single().then(function (s) {
          if (s.error) { status.textContent = 'Not saved: ' + s.error.message + '.'; return; }
          form.elements.repo.value = s.data.app_repo;
          status.textContent = 'Saved.';
          show(s.data, hide);
        });
      });
      remove.addEventListener('click', function () {
        status.textContent = 'Taking it off…';
        db.from('builder_apps').delete().eq('user_id', uid).then(function (d) {
          if (d.error) { status.textContent = 'Not taken off: ' + d.error.message + '.'; return; }
          form.reset();
          hide = null;
          show(null, null);
          status.textContent = 'Taken off. The hub no longer has it.';
        });
      });
    });
  }

  function load() {
    show_('loading');
    db.auth.getSession().then(function (s) {
      var session = s.data && s.data.session;
      if (!session) return show_('signed-out');
      drawOwnApp(session.user.id);
    }).catch(function (e) { fail('Something went wrong: ' + (e && e.message ? e.message : 'no details') + '.'); });
  }
  root.querySelector('[data-reload]').addEventListener('click', load);
  load();
})();
