// SAMPLE DATA for the Marketplace screenshots only (tools/mark/make_listing.py).
// It stands in for supabase-js so the real add-on pages can be drawn with
// no network and no real person: every name, app, and answer here is made
// up. The site never loads this file; only the screenshot server does.
(function () {
  var ME = 'sample-teacher';
  var now = Date.now();
  var iso = function (ms) { return new Date(ms).toISOString(); };
  var people = [
    { user_id: 'sample-1', status: 'enrolled', profiles: { github_login: 'rosa-sample', display_name: 'Rosa' } },
    { user_id: 'sample-2', status: 'enrolled', profiles: { github_login: 'kenji-sample', display_name: 'Kenji' } },
    { user_id: 'sample-3', status: 'enrolled', profiles: { github_login: 'amara-sample', display_name: 'Amara' } },
    { user_id: 'sample-4', status: 'enrolled', profiles: { github_login: 'theo-sample', display_name: 'Theo' } },
    { user_id: 'sample-5', status: 'enrolled', profiles: { github_login: 'lena-sample', display_name: 'Lena' } },
    { user_id: 'sample-6', status: 'enrolled', profiles: { github_login: 'sam-sample', display_name: 'Sam' } }
  ];
  var TABLES = {
    cohorts: [{ id: 'sample-cohort', slug: 'sample', title: 'Human-shaped software, a sample cohort', status: 'running',
      starts_on: iso(now - 9 * 86400000).slice(0, 10), weeks: 5, session_minutes: 90, time_zone: 'America/Denver',
      github_repo: null, github_team: null }],
    sessions: [
      { id: 'sample-s1', cohort_id: 'sample-cohort', number: 1, starts_at: iso(now - 7 * 86400000 - 10 * 60000), title: 'Write it down', scope: null, meet_url: null },
      { id: 'sample-s2', cohort_id: 'sample-cohort', number: 2, starts_at: iso(now - 10 * 60000), title: 'Prove it',
        scope: 'Put the first screen of your app on a real device, and bring back one decision your values changed.',
        meet_url: 'https://meet.google.com/abc-defg-hij', discussion_number: null }
    ],
    enrollments: people,
    cohort_teachers: [{ cohort_id: 'sample-cohort', user_id: ME, profiles: { github_login: 'teacher-sample', display_name: 'Your teacher' } }],
    groups: [
      { id: 'sample-g1', cohort_id: 'sample-cohort', name: 'Trio A', meet_url: null, group_members: [{ user_id: 'sample-1' }, { user_id: 'sample-2' }, { user_id: 'sample-3' }] },
      { id: 'sample-g2', cohort_id: 'sample-cohort', name: 'Trio B', meet_url: null, group_members: [{ user_id: 'sample-4' }, { user_id: 'sample-5' }, { user_id: 'sample-6' }] }
    ],
    shares: [],
    live_queue: [
      { id: 'sample-q1', cohort_id: 'sample-cohort', session_id: 'sample-s2', user_id: 'sample-1', kind: 'app', url: 'https://example.org/bird-log', note: 'The first screen, running on my phone.', state: 'waiting', created_at: iso(now - 6 * 60000) },
      { id: 'sample-q2', cohort_id: 'sample-cohort', session_id: 'sample-s2', user_id: 'sample-4', kind: 'commit', url: 'https://github.com/example/garden-swap/commit/1a2b3c4', note: 'I took out the streak counter.', state: 'waiting', created_at: iso(now - 4 * 60000) }
    ],
    live_checks: [
      { id: 'sample-k1', cohort_id: 'sample-cohort', session_id: 'sample-s2', created_by: ME, prompt: 'How sure are you that your first screen does what you wrote down?',
        choices: ['Sure, I tried it', 'Mostly', 'Not yet', 'I am stuck'], state: 'open', show_tally: true, created_at: iso(now - 2 * 60000) }
    ],
    live_answers: [],
    live_signals: [],
    live_room_state: [],
    session_notes: [],
    card_presets: []
  };
  var RPC = { check_tally: [{ choice: 1, answers: 2 }, { choice: 2, answers: 3 }, { choice: 3, answers: 1 }] };

  function builder(table) {
    var one = false;
    var q = {
      then: function (ok, no) {
        var rows = TABLES[table] || [];
        var data = one ? (rows[0] || null) : rows;
        return Promise.resolve({ data: data, error: null }).then(ok, no);
      }
    };
    ['select', 'eq', 'neq', 'ilike', 'gte', 'lte', 'order', 'in', 'is', 'not', 'limit', 'update', 'insert', 'upsert', 'delete'].forEach(function (m) {
      q[m] = function () { return q; };
    });
    q.maybeSingle = q.single = function () { one = true; return q; };
    return q;
  }
  var session = { user: { id: ME }, access_token: 'sample', refresh_token: 'sample' };
  var client = {
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: session } }); },
      setSession: function () { return Promise.resolve({ data: { session: session }, error: null }); },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    },
    from: builder,
    rpc: function (name) { return Promise.resolve({ data: RPC[name] || [], error: null }); }
  };
  window.supabase = { createClient: function () { return client; } };
})();
