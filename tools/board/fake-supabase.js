// A stand-in for supabase-js, used only by sync-check.mjs: it answers the
// board page's queries from a small in-memory hub kept by the test, and
// relays Realtime broadcast and presence between the pages the test
// opens, so two headless browsers can draw on one board with no network.
// Never loaded by the site itself.
(function () {
  function query(table) {
    var q = { table: table, op: 'select', filters: [], values: null, single: false };
    var b = {
      select: function () { if (q.op !== 'update') q.op = 'select'; return b; },
      eq: function (c, v) { q.filters.push(['eq', c, v]); return b; },
      neq: function (c, v) { q.filters.push(['neq', c, v]); return b; },
      not: function (c, o, v) { q.filters.push(['not', c, v]); return b; },
      order: function () { return b; },
      limit: function () { return b; },
      gte: function () { return b; },
      update: function (v) { q.op = 'update'; q.values = v; return b; },
      maybeSingle: function () { q.single = true; return b; },
      then: function (ok, bad) { return window.__fakeDb(q).then(ok, bad); }
    };
    return b;
  }

  var channels = {};
  window.__fakeDeliver = function (topic, event, payload) {
    var ch = channels[topic];
    if (!ch || !ch.connected) return false;
    (ch.handlers['broadcast:' + event] || []).forEach(function (f) { f({ event: event, payload: payload }); });
    return true;
  };
  window.__fakePresence = function (topic, state) {
    var ch = channels[topic];
    if (!ch) return;
    ch.presence = state;
    (ch.handlers['presence:sync'] || []).forEach(function (f) { f(); });
  };
  window.__fakeStatus = function (topic, state) {
    var ch = channels[topic];
    if (!ch) return;
    ch.connected = state === 'SUBSCRIBED';
    if (ch.status) ch.status(state);
  };

  window.supabase = {
    createClient: function () {
      return {
        auth: {
          getSession: function () { return Promise.resolve({ data: { session: window.__FAKE_SESSION } }); },
          onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
        },
        realtime: { setAuth: function () { return Promise.resolve(); } },
        from: query,
        rpc: function (name, args) { return window.__fakeDb({ rpc: name, args: args }); },
        channel: function (topic, opts) {
          var ch = { topic: topic, handlers: {}, presence: {}, connected: false, status: null, private: !!(opts && opts.config && opts.config.private) };
          channels[topic] = ch;
          var api = {
            on: function (type, filter, cb) { var k = type + ':' + filter.event; (ch.handlers[k] = ch.handlers[k] || []).push(cb); return api; },
            subscribe: function (cb) {
              ch.status = cb;
              window.__fakeJoin(topic, ch.private).then(function (ok) { window.__fakeStatus(topic, ok ? 'SUBSCRIBED' : 'CHANNEL_ERROR'); });
              return api;
            },
            send: function (m) {
              if (!ch.connected) return Promise.resolve('error');
              return window.__fakeSend(topic, m.event, m.payload).then(function () { return 'ok'; });
            },
            track: function (p) { return window.__fakeTrack(topic, p); },
            presenceState: function () { return ch.presence; }
          };
          return api;
        }
      };
    }
  };
})();
