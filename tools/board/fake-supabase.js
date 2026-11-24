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
      is: function (c, v) { q.filters.push(['is', c, v]); return b; },
      in: function (c, v) { q.filters.push(['in', c, v]); return b; },
      not: function (c, o, v) { q.filters.push(['not', c, v]); return b; },
      order: function () { return b; },
      limit: function () { return b; },
      gte: function () { return b; },
      single: function () { q.single = true; return b; },
      update: function (v) { q.op = 'update'; q.values = v; return b; },
      upsert: function (v) { q.op = 'upsert'; q.values = v; return b; },
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
        storage: { from: function () { return {
          list: function () { return Promise.resolve({ data: [] }); }, remove: function () { return Promise.resolve({}); },
          upload: function (path, blob, o) {
            return blob.arrayBuffer().then(function (buf) {
              var b = new Uint8Array(buf), t = ''; for (var k = 0; k < b.length; k++) t += String.fromCharCode(b[k]);
              return window.__fakeUpload(path, btoa(t), o && o.contentType);
            });
          },
          download: function (path) {
            return window.__fakeDownload(path).then(function (r) {
              if (!r) return { data: null, error: { message: 'Object not found' } };
              var t = atob(r.body), b = new Uint8Array(t.length); for (var k = 0; k < t.length; k++) b[k] = t.charCodeAt(k);
              return { data: new Blob([b], { type: r.type }), error: null };
            });
          }
        }; } },
        functions: { invoke: function () { return Promise.resolve({ data: null, error: { message: 'stand-in' } }); } },
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
