// Running the show (research/notes/run-of-show-design.md, R3): the one
// show every view and main stage in a session follows. Shared by the Meet
// add-on's panel and /live/.
//
// It reads the session's run of show (scenes, R2) and where the show is
// (show_state, migration 20261004070000), hears about changes to either
// through Supabase Realtime (or reads again every fifteen seconds), and
// gives a teacher the moves: go to a scene, back and next, start or stop
// the scene's clock, pin something on the main stage or follow the scene
// again, edit a scene's words, and start a run of show of the session's
// own from COURSE.md's six parts.
//
// A session with no run of show of its own runs on the six parts
// (CohortLib.agenda), keyed by part. Before the show_state table exists,
// `shared` is false and the page keeps its own place, as before R3.
//
// ShowRun.start({ db, cohort, session, parts, teaching, onChange })
// returns { list(), state(), current(), shared, own(), go(key), step(d),
// clock(on), pin(onStage), save(key, fields), startOwn(), reload() }.
// onChange() is called whenever the list or the show changes.
// Words by Claude, awaiting Ben's review.
(function () {
  var K = window.ShowViewLib, SL = window.ShowLib;
  if (!K) return;
  var POLL = 15000;

  function start(o) {
    var db = o.db, sid = o.session.id, cid = o.cohort.id;
    var rows = [], show = null, ownTable = true, stateTable = true, channel = null, poller = null, timer = null;
    var api = { shared: false };

    function list() { return rows.length ? K.fromRows(rows) : K.scenes(o.parts || []); }

    function load() {
      return Promise.all([
        db.from('scenes').select('*').eq('session_id', sid).order('position'),
        db.from('show_state').select('*').eq('session_id', sid).maybeSingle()
      ]).then(function (res) {
        ownTable = !res[0].error;
        rows = ownTable ? (res[0].data || []) : [];
        stateTable = !res[1].error;
        api.shared = stateTable;
        show = stateTable ? (res[1].data || null) : null;
        if (o.onChange) o.onChange();
      }, function () { if (o.onChange) o.onChange(); });
    }

    function nudge() { clearTimeout(timer); timer = setTimeout(load, 250); }

    function listen() {
      if (!db.channel) { poller = setInterval(load, POLL); return; }
      var f = 'session_id=eq.' + sid;
      channel = db.channel('show:' + sid);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'scenes', filter: f }, nudge);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'show_state', filter: f }, nudge);
      poller = setInterval(load, POLL);
      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') { clearInterval(poller); poller = null; load(); }
        else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !poller) poller = setInterval(load, POLL);
      });
    }

    // Every move a teacher makes writes the one show row, then reads it
    // back, so the page shows what everyone else will see.
    function write(change) {
      if (!o.teaching || !stateTable) return Promise.resolve('The show cannot be moved from here.');
      var row = Object.assign({ session_id: sid, cohort_id: cid }, change);
      var q = show
        ? db.from('show_state').update(change).eq('session_id', sid).select('*')
        : db.from('show_state').insert(Object.assign({ current_scene: null }, row)).select('*');
      return q.then(function (r) {
        if (r.error) return r.error.message;
        if (r.data && r.data[0]) show = r.data[0];
        if (o.onChange) o.onChange();
        return null;
      });
    }

    function current() { return K.currentKey(show, list()); }

    // Going to a scene returns the main stage to following it.
    function go(key) { return write({ current_scene: key, stage: 'scene', stage_ref: null }); }
    function step(delta) {
      var key = K.step(list(), current(), delta);
      return key ? go(key) : Promise.resolve(null);
    }
    // The database starts the clock from its own time; any value restarts it.
    function clock(on) { return write({ scene_started_at: on ? new Date().toISOString() : null }); }
    function pin(onStage) { return write(K.stageChange(onStage)); }

    // A scene's words, changed in the moment: checked as the class
    // builder checks them (ShowLib.problem), then saved, so every view
    // and every main stage following the scene shows them at once.
    function save(key, fields) {
      var scene = list().filter(function (s) { return s.key === key; })[0];
      if (!scene || !scene.own) return Promise.resolve('Only a scene of this session’s own run of show can be changed here.');
      var e = K.edited(scene, fields, SL);
      if (e.problem) return Promise.resolve(e.problem);
      return db.from('scenes').update(e.change).eq('id', scene.id).select('*').then(function (r) {
        if (r.error) return r.error.message;
        if (!r.data || !r.data.length) return 'The change was not saved. Only the cohort’s teachers can change its run of show.';
        rows = rows.map(function (x) { return x.id === r.data[0].id ? r.data[0] : x; });
        if (o.onChange) o.onChange();
        return null;
      });
    }

    // A run of show of the session's own, from the six parts it is
    // running on, so its scenes can be changed. Where the show is moves
    // to the same scene in the new run of show.
    function startOwn() {
      if (!o.teaching || !ownTable || rows.length || !SL) return Promise.resolve('This session already has a run of show of its own.');
      var parts = o.parts || [];
      var made = SL.defaultShow(parts, window.LiveLib && window.LiveLib.TURN).map(function (s, i) {
        return Object.assign({ cohort_id: cid, session_id: sid, position: i }, s, { config: SL.cleanConfig(s.kind, s.config) });
      });
      var at = parts.map(function (p) { return p.key; }).indexOf(current());
      return db.from('scenes').insert(made).select('*').then(function (r) {
        if (r.error) return r.error.message;
        rows = (r.data || []).sort(function (a, b) { return a.position - b.position; });
        if (o.onChange) o.onChange();
        if (at >= 0 && rows[at]) return go(rows[at].id);
        return null;
      });
    }

    api.list = list;
    api.state = function () { return show; };
    api.current = current;
    api.own = function () { return rows.length > 0; };
    api.canOwn = function () { return o.teaching && ownTable && !rows.length && !!SL; };
    api.go = go; api.step = step; api.clock = clock; api.pin = pin; api.save = save; api.startOwn = startOwn;
    api.reload = load;
    api.ready = load().then(function () { listen(); return api; });
    return api;
  }

  window.ShowRun = { start: start };
})();
