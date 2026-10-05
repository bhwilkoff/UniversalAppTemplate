// The in-class chat in the Meet panel (R15). Every message is a comment
// on the session's "Week N, in class" discussion in the cohort's private
// repository, posted by the person who wrote it with their own GitHub
// token; replies are GitHub's replies, reactions are GitHub's. The class
// channel nudges every panel the moment something is posted, and the
// chat also reads again every fifteen seconds while it is open. Logic in
// ChatLib; GitHub's API through DiscussionsLib.ask.
//
//   ChatView.start({ db, mount, cohort, session, me, teaching, channel,
//     onPoll(prompt, choices) -> Promise }) -> { refresh() }
(function () {
  var C = window.ChatLib, D = window.DiscussionsLib;
  if (!C || !D) return;
  var EVERY = 15000;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function button(label, cls, onClick) { var b = el('button', cls || 'btn-quiet', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function store() { try { return window.sessionStorage; } catch (e) { return null; } }

  function start(o) {
    var box = o.mount, where = D.splitRepo(o.cohort.github_repo), popup = null;
    var chat = null, timer = null, replying = null, draft = '', fromAgent = false, problem = null, loading = false;
    if (!where) { box.hidden = true; return { refresh: function () {} }; }
    box.hidden = false;

    function token() { return D.read(store(), Date.now()); }

    // GitHub's token comes from a small window to /account/?handoff=github.
    function connect() {
      popup = window.open('/account/?handoff=github', 'hs-github', 'popup,width=480,height=720');
      if (!popup) { problem = 'Your browser blocked the small window. Allow pop-ups for this panel and try again.'; draw(); }
    }
    window.addEventListener('message', function (event) {
      var t = C.acceptToken(event, location.origin, popup);
      if (!t) return;
      D.remember({ provider_token: t }, store(), Date.now());
      popup = null; problem = null;
      read();
    });

    function read() {
      var n = o.session.chat_number, t = token();
      if (!n || !t) { chat = null; draw(); return Promise.resolve(); }
      if (loading) return Promise.resolve();
      loading = true;
      return D.ask(t, C.CHAT, { owner: where.owner, name: where.name, n: n }).then(function (r) {
        loading = false;
        if (r.problem) {
          if (r.problem.kind === 'expired') D.forget(store());
          problem = r.problem.kind === 'expired' ? null : 'GitHub said: ' + r.problem.message;
        } else { chat = C.shape(r.data); problem = chat ? null : 'The chat’s discussion was not found.'; }
        draw();
      });
    }

    // A teacher opens the chat: a discussion in the cohort's repository,
    // and its number on the session, so every panel finds it.
    function openChat(status) {
      var t = token();
      status.textContent = 'Opening the chat on GitHub…';
      D.ask(t, C.REPO, { owner: where.owner, name: where.name }).then(function (r) {
        if (r.problem) throw new Error(r.problem.message);
        var cat = C.category(r.data.repository.discussionCategories.nodes);
        if (!cat) throw new Error('the repository has no discussion categories');
        return D.ask(t, C.OPEN, { repo: r.data.repository.id, cat: cat.id, title: C.weekTitle(o.session), body: C.opening(o.session, location.origin + '/live/?c=' + encodeURIComponent(o.cohort.slug)) });
      }).then(function (r) {
        if (r.problem) throw new Error(r.problem.message);
        var n = r.data.createDiscussion.discussion.number;
        return o.db.from('sessions').update({ chat_number: n }).eq('id', o.session.id).select('chat_number').maybeSingle().then(function (u) {
          if (u.error) throw new Error(u.error.message);
          o.session.chat_number = n;
          if (o.channel) o.channel.nudge('chat');
          return read();
        });
      }).catch(function (e) { status.textContent = 'The chat did not open: ' + e.message + '.'; });
    }

    function post(text, replyTo) {
      var b = C.body(text, fromAgent && !replyTo);
      if (!b || !chat) return Promise.resolve(false);
      var q = replyTo ? D.ask(token(), C.REPLY, { d: chat.id, to: replyTo, body: b }) : D.ask(token(), C.SAY, { d: chat.id, body: b });
      return q.then(function (r) {
        if (r.problem) { problem = 'Not sent: ' + r.problem.message; draw(); return false; }
        if (o.channel) o.channel.nudge('chat');
        read();
        return true;
      });
    }

    function react(m, content) {
      var had = m.reactions.some(function (r) { return r.content === content && r.mine; });
      D.ask(token(), had ? C.UNREACT : C.REACT, { s: m.id, c: content }).then(function (r) {
        if (r.problem) { problem = 'GitHub said: ' + r.problem.message; draw(); return; }
        if (o.channel) o.channel.nudge('chat');
        read();
      });
    }

    function message(m, isReply) {
      var li = el('li', 'chat-msg' + (isReply ? ' is-reply' : '') + (m.ai ? ' is-ai' : ''));
      var head = el('p', 'chat-head');
      head.appendChild(el('span', 'chat-who', m.author));
      if (m.ai) head.appendChild(el('span', 'chat-ai', 'AI, shared by them'));
      head.appendChild(el('span', 'chat-when', C.ago(m.at)));
      li.appendChild(head);
      li.appendChild(el('p', 'chat-text', m.hidden ? 'Hidden on GitHub.' : m.text));
      var row = el('div', 'chat-reacts');
      m.reactions.forEach(function (r) {
        var b = button(r.emoji + ' ' + r.count, 'chat-react' + (r.mine ? ' is-mine' : ''), function () { react(m, r.content); });
        b.setAttribute('aria-pressed', String(r.mine));
        b.setAttribute('aria-label', C.reactionOf(r.content).label + ', ' + r.count + (r.mine ? ', including yours' : ''));
        row.appendChild(b);
      });
      var more = el('details', 'chat-more');
      more.appendChild(el('summary', null, 'React'));
      C.REACTIONS.forEach(function (r) {
        var b = button(r.emoji, 'chat-react', function () { more.open = false; react(m, r.content); });
        b.setAttribute('aria-label', r.label);
        more.appendChild(b);
      });
      row.appendChild(more);
      if (!isReply) row.appendChild(button('Reply', 'chat-reply', function () { replying = replying === m.id ? null : m.id; draw(); }));
      li.appendChild(row);
      if (!isReply && m.replies.length) {
        var ul = el('ul', 'chat-replies');
        m.replies.forEach(function (r) { ul.appendChild(message(r, true)); });
        li.appendChild(ul);
      }
      if (!isReply && replying === m.id) li.appendChild(composer(m.id));
      return li;
    }

    function composer(replyTo) {
      var f = el('form', 'chat-compose');
      var area = el('textarea'); area.rows = 2; area.maxLength = C.MAX;
      area.placeholder = replyTo ? 'Reply…' : 'Say something to the class…';
      area.setAttribute('aria-label', replyTo ? 'Your reply' : 'Your message');
      if (!replyTo) { area.value = draft; area.addEventListener('input', function () { draft = area.value; }); }
      // Enter sends; Shift and Enter makes a new line.
      area.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
      f.appendChild(area);
      if (!replyTo) {
        var lab = el('label', 'chat-agent');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = fromAgent;
        cb.addEventListener('change', function () { fromAgent = cb.checked; });
        lab.appendChild(cb); lab.appendChild(document.createTextNode(' This is what my AI agent said'));
        f.appendChild(lab);
      }
      var send = el('button', 'btn-github', replyTo ? 'Reply' : 'Send'); send.type = 'submit';
      f.appendChild(send);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        send.disabled = true;
        post(area.value, replyTo).then(function (ok) {
          send.disabled = false;
          if (!ok) return;
          if (replyTo) replying = null; else { draft = ''; fromAgent = false; }
          area.value = '';
        });
      });
      return f;
    }

    // A teacher's quick poll: a question of the run of show, asked at once
    // with its count shown, and a line in the chat saying so.
    function pollForm() {
      var d = el('details', 'chat-poll');
      d.appendChild(el('summary', null, 'Quick poll'));
      var p = el('input'); p.type = 'text'; p.placeholder = 'The question'; p.setAttribute('aria-label', 'The question');
      var c = el('textarea'); c.rows = 3; c.placeholder = 'One choice on each line'; c.setAttribute('aria-label', 'The choices');
      var status = el('p', 'small');
      d.appendChild(p); d.appendChild(c);
      d.appendChild(button('Ask everyone', 'btn-quiet', function () {
        var choices = c.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 8);
        if (!p.value.trim() || choices.length < 2) { status.textContent = 'Write a question and at least two choices.'; return; }
        o.onPoll(p.value.trim(), choices).then(function (err) {
          if (err) { status.textContent = 'Not asked: ' + err; return; }
          status.textContent = 'Asked. Everyone answers in the panel, and the count shows as answers come in.';
          post('📊 Quick poll: ' + p.value.trim() + '\n' + choices.map(function (x) { return '• ' + x; }).join('\n'));
          p.value = ''; c.value = '';
        });
      }));
      d.appendChild(status);
      return d;
    }

    function draw() {
      var keep = box.querySelector('.chat-list'), atBottom = !keep || keep.scrollTop + keep.clientHeight >= keep.scrollHeight - 20;
      var active = document.activeElement, typing = active && box.contains(active) && /^(TEXTAREA|INPUT)$/.test(active.tagName);
      if (typing) return;   // never redraw under someone's fingers; the next read catches up
      box.replaceChildren();
      box.appendChild(el('h2', null, 'The class chat'));
      if (problem) box.appendChild(el('p', 'small error', problem));
      if (!o.session.chat_number) {
        if (!o.teaching) { box.appendChild(el('p', 'small', 'Your teacher has not opened the class chat for this session yet.')); return; }
        box.appendChild(el('p', 'small', 'Open the chat for this session. It is a discussion in the cohort’s repository on GitHub, so everything said in class stays there, apart from the ongoing conversation.'));
        if (!token()) { box.appendChild(button('Connect GitHub first', 'btn-github', connect)); return; }
        var st = el('p', 'small');
        box.appendChild(button('Open the class chat', 'btn-github', function () { openChat(st); }));
        box.appendChild(st);
        return;
      }
      if (!token()) {
        box.appendChild(el('p', 'small', 'The chat lives on GitHub, so you post as yourself. Connect GitHub once for this class.'));
        box.appendChild(button('Connect GitHub', 'btn-github', connect));
        return;
      }
      if (!chat) { box.appendChild(el('p', 'small', 'Reading the chat…')); return; }
      var list = el('ol', 'chat-list');
      if (!chat.messages.length) list.appendChild(el('li', 'small', 'Nothing has been said yet.'));
      chat.messages.forEach(function (m) { list.appendChild(message(m, false)); });
      box.appendChild(list);
      if (atBottom) setTimeout(function () { list.scrollTop = list.scrollHeight; }, 0);
      if (!chat.locked) box.appendChild(composer(null));
      if (o.teaching && o.onPoll) box.appendChild(pollForm());
      var foot = el('p', 'small chat-foot');
      var a = el('a', null, 'The chat on GitHub'); a.href = chat.url; a.target = '_blank'; a.rel = 'noopener';
      foot.appendChild(a);
      box.appendChild(foot);
    }

    if (o.channel) o.channel.onNudge('chat', function () {
      // A teacher opening the chat changes the session row; read it.
      if (!o.session.chat_number) {
        o.db.from('sessions').select('chat_number').eq('id', o.session.id).maybeSingle().then(function (r) {
          if (r.data && r.data.chat_number) { o.session.chat_number = r.data.chat_number; read(); }
        });
      } else read();
    });
    timer = setInterval(function () { if (!document.hidden) read(); }, EVERY);
    draw();
    read();
    return { refresh: read };
  }

  window.ChatView = { start: start };
})();
