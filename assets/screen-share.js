// A screen shared onto the stage (Ben, November 18, 2026: "make it so that
// the stage itself simply converts from a slide to the app that is being
// demoed or the screen share that someone requests to do").
//
// Meet frames the add-on without screen capture, so the learner's /share/
// window captures, and sends the picture peer to peer (WebRTC) to every stage
// that asks: each person's main stage, and the stage in each panel. The two
// sides find each other on a Supabase Realtime broadcast channel named for the
// stream, "screen:<uuid>", which is also in the queue row's url. Nothing is
// kept: the channel carries only the handshake, and the picture never touches
// a server. Public STUN only, so a network that blocks peer connections shows
// a line saying so rather than a blank.
(function (root) {
  var ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  var ID = /\/share\/\?screen=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

  function idOf(url) { var m = ID.exec(String(url || '')); return m ? m[1] : null; }
  function urlOf(origin, id) { return String(origin) + '/share/?screen=' + id; }
  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    var b = new Uint8Array(16); root.crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function channel(db, id) { return db.channel('screen:' + id, { config: { broadcast: { self: false, ack: false } } }); }
  function say(ch, event, payload) { try { ch.send({ type: 'broadcast', event: event, payload: payload }); } catch (e) {} }

  // The sharer: one peer connection for each stage that asks.
  function present(o) {
    var ch = channel(o.db, o.id), peers = {}, ended = false, beat = null;
    function count() { if (o.onCount) o.onCount(Object.keys(peers).filter(function (k) { return peers[k].connectionState === 'connected'; }).length); }
    function drop(v) { if (peers[v]) { try { peers[v].close(); } catch (e) {} delete peers[v]; count(); } }
    ch.on('broadcast', { event: 'want' }, function (m) {
      var v = m.payload && m.payload.viewer;
      if (!v || ended) return;
      drop(v);
      var pc = new RTCPeerConnection({ iceServers: ICE });
      peers[v] = pc;
      o.stream.getTracks().forEach(function (t) { pc.addTrack(t, o.stream); });
      pc.onicecandidate = function (e) { if (e.candidate) say(ch, 'ice', { to: v, candidate: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = function () { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(v); else count(); };
      pc.createOffer().then(function (offer) { return pc.setLocalDescription(offer); }).then(function () {
        say(ch, 'offer', { to: v, sdp: pc.localDescription.sdp });
      }).catch(function () { drop(v); });
    });
    ch.on('broadcast', { event: 'answer' }, function (m) {
      var p = m.payload || {}, pc = peers[p.viewer];
      if (pc && p.sdp) pc.setRemoteDescription({ type: 'answer', sdp: p.sdp }).catch(function () {});
    });
    ch.on('broadcast', { event: 'ice-up' }, function (m) {
      var p = m.payload || {}, pc = peers[p.viewer];
      if (pc && p.candidate) pc.addIceCandidate(p.candidate).catch(function () {});
    });
    ch.subscribe(function (status) {
      if (status !== 'SUBSCRIBED') return;
      say(ch, 'ready', {});
      beat = setInterval(function () { say(ch, 'ready', {}); }, 5000);
    });
    return {
      stop: function () {
        ended = true; clearInterval(beat);
        say(ch, 'end', {});
        Object.keys(peers).forEach(drop);
        setTimeout(function () { try { o.db.removeChannel(ch); } catch (e) {} }, 300);
      }
    };
  }

  // A stage: asks for the picture until it has it, and says what is happening.
  function watch(o) {
    var ch = channel(o.db, o.id), me = uuid(), pc = null, done = false, asked = null, got = false;
    function state(s) { if (o.onState) o.onState(s); }
    function ask() { if (!done && !got) say(ch, 'want', { viewer: me }); }
    ch.on('broadcast', { event: 'offer' }, function (m) {
      var p = m.payload || {};
      if (p.to !== me || done) return;
      if (pc) try { pc.close(); } catch (e) {}
      pc = new RTCPeerConnection({ iceServers: ICE });
      pc.ontrack = function (e) { got = true; o.video.srcObject = e.streams[0]; state('showing'); };
      pc.onicecandidate = function (e) { if (e.candidate) say(ch, 'ice-up', { viewer: me, candidate: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = function () {
        if (pc.connectionState === 'failed') { got = false; state('blocked'); }
        if (pc.connectionState === 'disconnected') { got = false; state('waiting'); }
      };
      pc.setRemoteDescription({ type: 'offer', sdp: p.sdp }).then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(function () { say(ch, 'answer', { viewer: me, sdp: pc.localDescription.sdp }); })
        .catch(function () { state('blocked'); });
    });
    ch.on('broadcast', { event: 'ice' }, function (m) {
      var p = m.payload || {};
      if (p.to === me && pc && p.candidate) pc.addIceCandidate(p.candidate).catch(function () {});
    });
    ch.on('broadcast', { event: 'ready' }, function () { if (!got) ask(); });
    ch.on('broadcast', { event: 'end' }, function () { got = false; if (pc) try { pc.close(); } catch (e) {} pc = null; o.video.srcObject = null; state('ended'); });
    state('waiting');
    ch.subscribe(function (status) { if (status === 'SUBSCRIBED') { ask(); asked = setInterval(ask, 4000); } });
    return {
      stop: function () {
        done = true; clearInterval(asked);
        if (pc) try { pc.close(); } catch (e) {}
        o.video.srcObject = null;
        try { o.db.removeChannel(ch); } catch (e) {}
      }
    };
  }

  root.ScreenShare = { idOf: idOf, urlOf: urlOf, uuid: uuid, present: present, watch: watch };
})(typeof window !== 'undefined' ? window : globalThis);
