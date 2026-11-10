// One connection to an open room, shared in shape by the panel and the stage.
// RoomClient.connect({ code, role, name, on: { room, talk, html, mine, words,
// floats, ended, error, status } }). It reconnects by itself, with a pause that
// grows, because the first connections to a sleeping room can fail (measured
// November 7, 2026: 41 of the first 100).
(function () {
  var KEY = 'hs-room-secret', NAME = 'hs-room-name';
  function secret() {
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    if (s) return s;
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    s = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    try { localStorage.setItem(KEY, s); } catch (e) {}
    return s;
  }
  function savedName() { try { return localStorage.getItem(NAME) || ''; } catch (e) { return ''; } }
  function saveName(n) { try { localStorage.setItem(NAME, n); } catch (e) {} }

  function connect(o) {
    var on = o.on || {}, ws = null, closed = false, swapping = false, tries = 0, ping = null, queue = [], you = null, name = o.name || savedName();
    var mySecret = secret();
    function status(s) { if (on.status) on.status(s); }
    function send(m) {
      var s = JSON.stringify(m);
      if (ws && ws.readyState === 1 && you) ws.send(s); else queue.push(s);
    }
    function open() {
      ws = new WebSocket(window.RoomLib.socket(window.MEET_ADDON.rooms, o.code));
      ws.onopen = function () { ws.send(JSON.stringify({ t: 'hello', secret: mySecret, name: name, role: o.role })); };
      ws.onmessage = function (e) {
        if (e.data === 'pong') return;
        var m;
        try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'welcome') {
          you = m.you; tries = 0; status('on');
          if (on.welcome) on.welcome(m);
          var q = queue; queue = [];
          q.forEach(function (s) { ws.send(s); });
        } else if (m.t === 'room' && on.room) on.room(m.room);
        else if (m.t === 'talk' && on.talk) on.talk(m.text, m.v);
        else if (m.t === 'html' && on.html) on.html(m.html, m.v);
        else if (m.t === 'mine' && on.mine) on.mine(m.mine);
        else if (m.t === 'words' && on.words) on.words(m);
        else if (m.t === 'floats' && on.floats) on.floats(m.floats);
        else if (m.t === 'ended' && on.ended) on.ended();
        else if (m.t === 'error' && on.error) on.error(m.text);
      };
      ws.onclose = function () {
        you = null;
        if (closed) return;
        if (swapping) { swapping = false; return open(); }
        status('off');
        tries += 1;
        setTimeout(open, Math.min(10000, 400 * Math.pow(1.7, tries)) + Math.random() * 300);
      };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }
    open();
    ping = setInterval(function () { if (ws && ws.readyState === 1) ws.send('ping'); }, 30000);
    return {
      send: send,
      you: function () { return you; },
      name: function () { return name; },
      setName: function (n) { name = String(n || '').trim().slice(0, 60); saveName(name); send({ t: 'name', name: name }); },
      secret: function () { return mySecret; },
      // A stage takes on its own panel's identity, so the room sees one person.
      adopt: function (s) {
        if (!/^[0-9a-f]{32}$/.test(s) || s === mySecret) return false;
        mySecret = s;
        try { localStorage.setItem(KEY, s); } catch (e) {}
        you = null; tries = 0;
        if (ws && ws.readyState < 2) { swapping = true; ws.close(); }
        return true;
      },
      close: function () { closed = true; clearInterval(ping); if (ws) ws.close(); }
    };
  }
  window.RoomClient = { connect: connect, savedName: savedName, saveName: saveName };
})();
