// An exchange (/exchange/#<link>): a thread of short videos, oldest first,
// as Threadit arranged its replies. Each video lives in its maker's own
// Google Drive and plays here through Drive's player. The database decides
// who may see and add to an exchange (migration 20261011010000); this page
// only asks.
(function () {
  var root = document.querySelector('[data-exchange]');
  if (!root || !window.supabase || !window.HUB || !window.ExchangeLib) return;
  var X = window.ExchangeLib;
  var db = window.HUB.client ? window.HUB.client() : window.supabase.createClient(window.HUB.url, window.HUB.key);
  var token = null, ex = null, me = null, current = null, replyTo = null, recorder = null, posting = false;
  var RETURN = 'hs-exchange-return';
  // Whether each video is ready and shared with anyone who has its link:
  // post id -> 'open' | 'closed' | 'preparing' (new, not ready yet), or
  // 'asking' while the check runs.
  var reach = {};

  function $(sel) { return root.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/assets/icons.svg#' + name);
    svg.appendChild(use);
    return svg;
  }
  function said(e) { return e && e.message ? e.message : String(e || 'no details'); }
  function show(state) {
    root.querySelectorAll('.x-state').forEach(function (s) { s.hidden = s.getAttribute('data-state') !== state; });
  }
  function fail(text) { $('[data-error-text]').textContent = text; show('error'); }
  // The shared hub client gives every request 20 seconds (hub-config.js).
  function within(p) { return Promise.resolve(p); }

  function tokenFromHash() {
    var m = /^#?([0-9a-f]{32})(?:\/([0-9a-f-]{36}))?$/.exec(location.hash);
    return m ? { token: m[1], post: m[2] || null } : null;
  }

  function face(person, size) {
    var wrap = el('span', 'x-face');
    wrap.style.setProperty('--size', size + 'px');
    var initials = el('span', 'x-initials', String(person.name || '?').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase());
    initials.setAttribute('aria-hidden', 'true');
    wrap.appendChild(initials);
    if (person.avatar && /^https:\/\//.test(person.avatar)) {
      var img = el('img');
      img.alt = ''; img.width = size; img.height = size; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = function () { img.remove(); };
      img.src = person.avatar;
      wrap.appendChild(img);
    }
    return wrap;
  }

  // ---- the thread -----------------------------------------------------
  function byId(id) { return ex.posts.filter(function (p) { return p.id === id; })[0]; }
  function drawHead() {
    $('[data-title]').textContent = ex.title;
    document.title = ex.title + ' | Human Shaped';
    var prompt = $('[data-prompt]');
    prompt.textContent = ex.prompt || '';
    prompt.hidden = !ex.prompt;
    $('[data-summary]').textContent = X.summary(ex);
    var where = $('[data-where]');
    where.replaceChildren();
    if (ex.cohort) {
      where.appendChild(document.createTextNode('Only the people in '));
      var a = el('a', null, ex.cohort.title);
      a.href = '/cohort/?c=' + encodeURIComponent(ex.cohort.slug);
      where.appendChild(a);
      where.appendChild(document.createTextNode(' can see this exchange.'));
    } else if (ex.members) {
      where.textContent = 'Only Human Shaped members can see this exchange: people in a cohort, now or before, and teachers.';
    } else {
      where.textContent = 'Anyone with this page\'s link can watch, and anyone signed in can add a video' + (ex.replies_open ? '.' : ' once its maker opens replies again.');
    }
    $('[data-tools]').hidden = !ex.mine;
    $('[data-toggle-replies]').textContent = ex.replies_open ? 'Close replies' : 'Open replies again';
  }

  function isFresh(p) { return Date.now() - new Date(p.created_at).getTime() < 10 * 60000; }
  // Drive makes a video's picture once it has prepared the video, so the
  // picture says both that a new video is ready and that an older one is
  // still shared. A new video without one is still being prepared and is
  // asked about again every 30 seconds; after ten minutes, no picture
  // means its owner stopped sharing it.
  function checkShared(p) {
    var links = X.drive(p.drive_file_id);
    if (!links || reach[p.id] || !window.fetch) return;
    reach[p.id] = 'asking';
    fetch(links.shared, { credentials: 'omit' }).then(function (r) {
      return r.ok && /^image\//.test(r.headers.get('content-type') || '');
    }, function () { return false; }).then(function (open) {
      var fresh = isFresh(p);
      reach[p.id] = open ? 'open' : fresh ? 'preparing' : 'closed';
      if (!ex || !byId(p.id)) return;
      if (reach[p.id] === 'preparing') {
        setTimeout(function () { if (reach[p.id] === 'preparing') { delete reach[p.id]; checkShared(p); } }, 30000);
        return;
      }
      if (open) {
        // Ready: drop the "still preparing" line without reloading the player.
        if (current && current.id === p.id) { var wait = $('[data-preparing]'); if (wait) wait.remove(); }
        if (fresh) drawThread();
        return;
      }
      if (current && current.id === p.id) play(current, false);
      else drawThread();
    });
  }

  function drawThread() {
    var list = $('[data-thread]');
    list.replaceChildren();
    ex.posts.forEach(function (p, i) {
      var li = el('li', 'x-clip');
      var b = el('button', 'x-clip-btn');
      b.type = 'button';
      if (current && current.id === p.id) b.setAttribute('aria-current', 'true');
      var thumb = el('span', 'x-thumb');
      var links = X.drive(p.drive_file_id);
      var fresh = isFresh(p);
      var closed = reach[p.id] === 'closed';
      if (!closed) checkShared(p);
      if (closed) li.classList.add('x-clip-closed');
      if (links && !closed && (!fresh || reach[p.id] === 'open')) {
        var img = el('img');
        img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.crossOrigin = 'anonymous';
        img.onerror = function () { img.remove(); };
        img.src = links.thumb;
        thumb.appendChild(img);
      }
      thumb.appendChild(face(p.author, 36));
      var len = el('span', 'x-len', p.seconds != null ? X.clock(p.seconds) : '');
      if (p.seconds != null) thumb.appendChild(len);
      var words = el('span', 'x-clip-words');
      words.appendChild(el('span', 'x-clip-name', p.author.name + (p.mine ? ' (you)' : '')));
      var reply = p.reply_to && byId(p.reply_to);
      words.appendChild(el('span', 'x-clip-when', (i === 0 ? 'Opened the exchange ' : reply ? 'Answered ' + reply.author.name + ' ' : 'Added a video ') + X.ago(p.created_at)));
      if (p.note) words.appendChild(el('span', 'x-clip-note', p.note));
      var felt = reactionsOf(p);
      if (felt.length) {
        var line = el('span', 'x-clip-reacts', felt.map(function (x) { return x.kind.emoji; }).join(' '));
        line.setAttribute('aria-hidden', 'true');
        words.appendChild(line);
      }
      if (closed) words.appendChild(el('span', 'x-clip-closed-note', 'No longer shared'));
      b.appendChild(thumb); b.appendChild(words);
      b.setAttribute('aria-label', p.author.name + ', ' + X.ago(p.created_at) + (p.seconds != null ? ', ' + X.lengthWords(p.seconds) : '') + (p.note ? '. ' + p.note : '')
        + (felt.length ? '. Reactions: ' + felt.map(function (x) { return x.kind.label; }).join(', ') : ''));
      b.addEventListener('click', function () { play(p, true); });
      li.appendChild(b);
      if (p.mine || ex.can_moderate) {
        var rm = el('button', 'x-clip-remove');
        rm.type = 'button';
        rm.title = 'Remove from the exchange';
        rm.setAttribute('aria-label', 'Remove ' + (p.mine ? 'your' : p.author.name + '\'s') + ' video from the exchange');
        rm.appendChild(icon('trash'));
        rm.addEventListener('click', function () { removePost(p); });
        li.appendChild(rm);
      }
      list.appendChild(li);
    });
    var empty = $('[data-thread-empty]');
    empty.hidden = ex.posts.length > 0;
    empty.textContent = ex.mine ? 'No videos yet. Record the first one to open the exchange.' : 'No videos yet.';
    var add = $('[data-add]');
    add.hidden = !ex.can_reply || !$('[data-compose]').hidden;
    add.textContent = ex.posts.length ? 'Add your video' : 'Record the first video';
    $('[data-closed]').hidden = ex.replies_open || ex.mine;
    $('[data-signin]').hidden = !!me || !ex.replies_open;
  }

  function play(p, focus) {
    current = p;
    var stage = $('[data-player]');
    stage.replaceChildren();
    var now = $('[data-now]');
    now.replaceChildren();
    if (!p) {
      stage.appendChild(el('p', 'x-player-empty', ex.mine ? 'Your opening video will play here.' : 'The first video will play here.'));
      now.hidden = true;
      drawThread();
      return;
    }
    var links = X.drive(p.drive_file_id);
    if (reach[p.id] === 'closed') {
      stage.appendChild(closedNotice(p));
    } else {
      var frame = el('iframe');
      frame.src = links.preview;
      frame.title = 'Video by ' + p.author.name;
      frame.allow = 'autoplay; fullscreen';
      frame.setAttribute('allowfullscreen', '');
      frame.loading = 'lazy';
      stage.appendChild(frame);
    }

    now.hidden = false;
    var who = el('div', 'x-now-who');
    who.appendChild(face(p.author, 44));
    var lines = el('div');
    lines.appendChild(el('p', 'x-now-name', p.author.name + (p.mine ? ' (you)' : '')));
    lines.appendChild(el('p', 'x-now-when', X.ago(p.created_at) + (p.seconds != null ? ', ' + X.lengthWords(p.seconds) : '') + (p.kind === 'screen' ? ', sharing their screen' : '')));
    who.appendChild(lines);
    now.appendChild(who);
    var reply = p.reply_to && byId(p.reply_to);
    if (reply) {
      var r = el('p', 'x-now-reply');
      r.appendChild(document.createTextNode('In answer to '));
      var rb = el('button', 'text-button', reply.author.name + '\'s video');
      rb.type = 'button';
      rb.addEventListener('click', function () { play(reply, true); });
      r.appendChild(rb);
      now.appendChild(r);
    }
    if (p.note) now.appendChild(el('p', 'x-now-note', p.note));
    if (isFresh(p) && reach[p.id] !== 'open') {
      var wait = el('p', 'hint', 'Drive can take a few minutes to prepare a new video. If it does not play yet, open it in Google Drive or come back shortly.');
      wait.setAttribute('data-preparing', '');
      now.appendChild(wait);
    }
    var box = el('div', 'x-reactions');
    now.appendChild(box);
    drawReactions(p, box);
    var acts = el('div', 'actions');
    if (ex.can_reply) {
      var ans = el('button', 'btn-secondary', 'Answer this video');
      ans.type = 'button';
      ans.addEventListener('click', function () { compose(p); });
      acts.appendChild(ans);
    }
    // Leaving the site: named in the label, marked with the arrow-out
    // icon, in the same tab (research/notes/links-and-actions-notes.md).
    var open = el('a', 'btn-secondary', 'Open in Google Drive');
    open.href = links.view;
    open.appendChild(icon('arrow-square-out'));
    acts.appendChild(open);
    if (p.mine || ex.can_moderate) {
      var rm = el('button', 'btn-danger', 'Remove from the exchange');
      rm.type = 'button';
      rm.addEventListener('click', function () { removePost(p); });
      acts.appendChild(rm);
    }
    now.appendChild(acts);
    drawThread();
    if (focus) {
      try { history.replaceState(null, '', location.pathname + '#' + token + '/' + p.id); } catch (e) { /* the link still works */ }
      if (window.matchMedia && window.matchMedia('(max-width: 56rem)').matches) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---- reactions ----------------------------------------------------
  // The Meet add-on's eight reactions (react-lib.js), kept with the video
  // so its maker sees them later (migration 20261012030000).
  var R = window.ReactLib, reacting = {};
  function reactionsOf(p) {
    if (!R) return [];
    return (p.reactions || []).map(function (x) { return { r: x.r, names: x.names || [], mine: !!x.mine, kind: R.reaction(x.r) }; })
      .filter(function (x) { return x.kind && x.names.length; });
  }
  function drawReactions(p, box) {
    box = box || $('.x-reactions');
    if (!box || !R) return;
    var focused = box.contains(document.activeElement) ? document.activeElement.getAttribute('data-r') : null;
    box.replaceChildren();
    var felt = reactionsOf(p);
    if (ex.can_react) {
      var row = el('div', 'react-row');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'React to this video');
      R.REACTIONS.forEach(function (r) {
        var b = el('button', 'react-btn');
        b.type = 'button';
        var on = felt.some(function (x) { return x.r === r.id && x.mine; });
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-label', r.label + ' (key ' + r.key + ')');
        b.title = r.label + ' (' + r.key + ')';
        b.setAttribute('data-r', r.id);
        b.appendChild(el('span', 'react-emoji', r.emoji)).setAttribute('aria-hidden', 'true');
        b.appendChild(el('span', 'react-key', r.key)).setAttribute('aria-hidden', 'true');
        b.addEventListener('click', function () { react(p, r.id); });
        row.appendChild(b);
      });
      box.appendChild(row);
      if (focused) { var again = row.querySelector('[data-r="' + focused + '"]'); if (again) again.focus(); }
    }
    if (felt.length) {
      var who = el('ul', 'x-reacted');
      felt.forEach(function (x) {
        var li = el('li');
        li.appendChild(el('span', 'x-reacted-emoji', x.kind.emoji)).setAttribute('aria-hidden', 'true');
        li.appendChild(el('span', null, x.kind.label + ': ' + X.names(x.names)));
        who.appendChild(li);
      });
      box.appendChild(who);
    }
  }
  function float(id) {
    var stage = $('[data-player]'), kind = R && R.reaction(id);
    if (!stage || !kind) return;
    var layer = stage.querySelector('.react-layer');
    if (!layer) { layer = el('div', 'react-layer'); layer.setAttribute('aria-hidden', 'true'); stage.appendChild(layer); }
    var f = el('div', 'react-float');
    f.style.left = (10 + Math.random() * 75) + '%';
    f.appendChild(el('span', 'react-emoji', kind.emoji));
    layer.appendChild(f);
    setTimeout(function () { f.remove(); }, 3400);
  }
  // A reaction turns on or off; the button answers at once and the hub's
  // answer then replaces the video's reactions.
  function react(p, id) {
    if (!ex.can_react || reacting[p.id]) return;
    var on = !reactionsOf(p).some(function (x) { return x.r === id && x.mine; });
    reacting[p.id] = true;
    var btn = $('.x-reactions [data-r="' + id + '"]');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.classList.remove('sent'); void btn.offsetWidth; btn.classList.add('sent'); }
    if (on) float(id);
    within(db.rpc('react_to_exchange_post', { post: p.id, reaction: id, turn_on: on })).then(function (r) {
      if (r.error) throw r.error;
      p.reactions = r.data || [];
    }).catch(function (e) {
      if (btn) btn.setAttribute('aria-pressed', String(!on));
      var box = $('.x-reactions');
      if (box) box.appendChild(el('p', 'hint', 'That reaction did not go through: ' + said(e) + '.'));
      return 'failed';
    }).then(function (failed) {
      reacting[p.id] = false;
      if (failed) return;
      if (current && current.id === p.id) drawReactions(p);
      drawThread();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!R || !ex || !ex.can_react || !current || !$('[data-compose]').hidden) return;
    var k = R.keyFor(e);
    if (k && k.reaction) { e.preventDefault(); react(current, k.reaction); }
  });

  // Shown in place of the player when a video's owner has stopped sharing
  // it in Google Drive, or has deleted it there. The video keeps its place
  // in the thread, since later videos may answer it.
  function closedNotice(p) {
    var box = el('div', 'x-player-empty');
    box.appendChild(el('p', null, p.mine
      ? 'This video is no longer shared in your Google Drive, so nobody else can watch it here.'
      : 'This video can\'t play here, because ' + p.author.name + ' is no longer sharing it in Google Drive.'));
    if (p.mine) {
      var again = el('button', 'btn-secondary', 'Share it again');
      again.type = 'button';
      var say = el('p', 'hint');
      again.addEventListener('click', function () {
        again.disabled = true;
        say.textContent = 'Connecting your Google Drive…';
        window.ExchangeDrive.connect(me && me.email).then(function (gtoken) {
          return window.ExchangeDrive.share(gtoken, p.drive_file_id);
        }).then(function () {
          reach[p.id] = 'open';
          play(p, false);
        }).catch(function (e) {
          again.disabled = false;
          say.textContent = 'It was not shared again: ' + said(e) + '. If you deleted it in Drive, remove it from the exchange instead.';
        });
      });
      box.appendChild(again);
      box.appendChild(say);
    }
    return box;
  }

  // ---- adding a video -------------------------------------------------
  function compose(to) {
    replyTo = to || null;
    var box = $('[data-compose]');
    box.hidden = false;
    $('[data-add]').hidden = true;
    $('[data-compose-title]').textContent = ex.posts.length ? (to ? 'Answer ' + to.author.name : 'Add your video') : 'Record the first video';
    var line = $('[data-replying]');
    line.replaceChildren();
    if (to) {
      line.appendChild(document.createTextNode('Your video will answer ' + to.author.name + '\'s, and join the end of the exchange. '));
      var whole = el('button', 'text-button', 'Answer the whole exchange instead');
      whole.type = 'button';
      whole.addEventListener('click', function () { compose(null); });
      line.appendChild(whole);
    } else {
      line.textContent = ex.posts.length ? 'Your video joins the end of the exchange.' : (ex.prompt ? 'Your video opens the exchange, under its prompt.' : 'Your video opens the exchange.');
    }
    if (!recorder) recorder = window.ExchangeRecorder.mount($('[data-recorder]'), { onChange: function (r) { $('[data-post]').disabled = !r || posting; } });
    $('[data-post]').disabled = !recorder.result();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('[data-compose-title]').focus();
  }
  function closeCompose() {
    if (recorder) recorder.reset();
    $('[data-compose]').hidden = true;
    $('[data-note]').value = '';
    $('[data-progress]').hidden = true;
    $('[data-post-status]').textContent = '';
    drawThread();
  }

  function post() {
    var r = recorder && recorder.result();
    if (!r || posting) return;
    posting = true;
    var btn = $('[data-post]'), bar = $('[data-progress]'), say = $('[data-post-status]');
    btn.disabled = true;
    say.textContent = 'Connecting your Google Drive…';
    var email = me && me.email;
    window.ExchangeDrive.connect(email).then(function (gtoken) {
      bar.hidden = false; bar.value = 0;
      say.textContent = 'Saving to your Google Drive…';
      return window.ExchangeDrive.save(gtoken, r.blob, {
        name: X.fileName(ex.title, new Date(), r.mime), mime: r.mime,
        description: 'Recorded for "' + ex.title + '" on humanshaped.org.'
      }, function (f) {
        bar.value = Math.round(f * 100);
        say.textContent = 'Saving to your Google Drive… ' + Math.round(f * 100) + '%';
      });
    }).then(function (fileId) {
      say.textContent = 'Adding it to the exchange…';
      return within(db.rpc('add_exchange_post', {
        t: token, drive_file_id: fileId, mime: X.baseType(r.mime), kind: r.kind,
        seconds: r.seconds, note: $('[data-note]').value.trim() || null, reply_to: replyTo ? replyTo.id : null
      })).then(function (res) {
        if (res.error) throw new Error('your video is in your Drive, but the exchange did not take it: ' + res.error.message);
        return res.data;
      });
    }).then(function (postId) {
      posting = false;
      closeCompose();
      return load(postId);
    }).catch(function (e) {
      posting = false;
      btn.disabled = !recorder.result();
      bar.hidden = true;
      say.textContent = 'Not posted: ' + said(e) + '. Your recording is still here, so you can try again.';
    });
  }

  function removePost(p) {
    if (!window.confirm('Take this video out of the exchange? It stays in ' + (p.mine ? 'your' : 'its maker\'s') + ' Google Drive, where it can be deleted.')) return;
    within(db.rpc('remove_exchange_post', { post: p.id })).then(function (r) {
      if (r.error) throw r.error;
      return load();
    }).catch(function (e) { window.alert('It was not removed: ' + said(e) + '.'); });
  }

  // ---- the maker's tools ------------------------------------------------
  function copyLink(btn) {
    var url = location.origin + location.pathname + '#' + token;
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy the link'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); });
    else window.prompt('Copy this link', url);
  }

  // ---- signing in to reply ----------------------------------------------
  function mountSignIn() {
    var gbox = $('[data-google]');
    if (window.HSGoogle && gbox && !gbox.dataset.mounted) {
      gbox.dataset.mounted = '1';
      window.HSGoogle.mount({
        db: db, button: gbox, prompt: false,
        theme: document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
        onSession: function () { load(); },
        onError: function (e) { $('[data-signin-status]').textContent = 'Google sign-in did not finish: ' + said(e) + '.'; }
      });
    }
  }
  $('[data-github]').addEventListener('click', function () {
    try { sessionStorage.setItem(RETURN, location.hash.replace(/^#/, '')); } catch (e) { /* comes back to /exchange/ without it */ }
    db.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: location.origin + '/exchange/' } });
  });

  // ---- loading ------------------------------------------------------------
  function load(selectId) {
    return db.auth.getSession().then(function (s) {
      me = s.data && s.data.session ? s.data.session.user : null;
      var t = tokenFromHash();
      if (!t) {
        var back = null;
        try { back = sessionStorage.getItem(RETURN); sessionStorage.removeItem(RETURN); } catch (e) { /* none */ }
        if (back) { history.replaceState(null, '', location.pathname + '#' + back); t = tokenFromHash(); }
      }
      if (!t) return show('missing');
      token = t.token;
      return within(db.rpc('exchange', { t: token })).then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return show('missing');
        if (r.data.private) {
          $('[data-private-title]').textContent = r.data.members ? 'This exchange is for Human Shaped members.' : 'This exchange is for a cohort.';
          $('[data-private-lead]').textContent = r.data.members
            ? 'Only people who are in a cohort, now or before, and teachers can watch it and add to it.'
            : 'Only the people in the cohort it belongs to can watch it and add to it.';
          $('[data-private-signin]').hidden = !!me;
          return show('private');
        }
        ex = r.data;
        drawHead();
        show('ready');
        var pick = byId(selectId || t.post) || (current && byId(current.id)) || ex.posts[0] || null;
        play(pick, false);
        mountSignIn();
        if (ex.mine && !ex.posts.length && $('[data-compose]').hidden) compose(null);
      });
    }).catch(function (e) { fail('The exchange could not be loaded: ' + said(e) + '.'); });
  }

  $('[data-add]').addEventListener('click', function () { compose(null); });
  $('[data-post]').addEventListener('click', post);
  $('[data-cancel]').addEventListener('click', closeCompose);
  $('[data-copy]').addEventListener('click', function (e) { copyLink(e.target); });
  $('[data-toggle-replies]').addEventListener('click', function () {
    within(db.from('exchanges').update({ replies_open: !ex.replies_open }).eq('token', token)).then(function (r) {
      if (r.error) throw r.error;
      return load();
    }).catch(function (e) { window.alert('Nothing changed: ' + said(e) + '.'); });
  });
  $('[data-delete]').addEventListener('click', function () {
    if (!window.confirm('Delete "' + ex.title + '" for everyone? The videos stay in each person\'s Google Drive. This cannot be undone.')) return;
    within(db.from('exchanges').delete().eq('token', token)).then(function (r) {
      if (r.error) throw r.error;
      location.href = '/account/#exchanges';
    }).catch(function (e) { window.alert('It was not deleted: ' + said(e) + '.'); });
  });
  $('[data-retry]').addEventListener('click', function () { load(); });
  window.addEventListener('hashchange', function () { var t = tokenFromHash(); if (!t || t.token !== token) { current = null; load(); } });
  window.addEventListener('pagehide', function () { if (recorder) recorder.release(); });
  load();
})();
