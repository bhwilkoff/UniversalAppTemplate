// The add-on's frame (ADDON-DESIGN.md): what never scrolls away, a few tabs,
// and the panes the panel's parts live in. The parts stay as they are and are
// moved into a pane, so what each one does does not change.
// PanelFrame.mount({ root, teaching }) returns the frame.
(function () {
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function mount(o) {
    var ready = o.into || o.root.querySelector('[data-state="ready"]');
    // A learner's panel is one view, with no tabs (Ben, November 12, 2026).
    var tabs = o.tabs ? o.tabs : o.teaching ? [['now', 'Now'], ['plan', 'Plan'], ['tools', 'Tools'], ['people', 'People']] : [['now', 'The class']];
    var shell = el('div', 'p2');
    var top = el('header', 'p2-top');
    var row = el('div', 'p2-top-row');
    var title = el('h1', 'p2-title');
    var time = el('p', 'p2-time');
    time.setAttribute('aria-live', 'off');
    row.appendChild(title);
    // A leader's running clock moves by half a minute either way.
    var clockBox = el('span', 'p2-clock');
    var less = el('button', 'p2-nudge', '−30'), more = el('button', 'p2-nudge', '+30');
    less.type = more.type = 'button';
    less.setAttribute('aria-label', 'Take 30 seconds off the clock'); more.setAttribute('aria-label', 'Add 30 seconds to the clock');
    less.hidden = more.hidden = true;
    var onNudge = null;
    less.addEventListener('click', function () { if (onNudge) onNudge(-30); });
    more.addEventListener('click', function () { if (onNudge) onNudge(30); });
    clockBox.appendChild(less); clockBox.appendChild(time); clockBox.appendChild(more);
    row.appendChild(clockBox);
    // Show me around: the panel's tour again, whenever this person asks.
    var help = el('button', 'p2-help', '?');
    help.type = 'button'; help.hidden = true;
    help.setAttribute('aria-label', 'Show me around');
    var onHelp = null;
    help.addEventListener('click', function () { if (onHelp) onHelp(); });
    row.appendChild(help);
    top.appendChild(row);
    // Where the session is: Part 3 of 7, or that it has not started.
    var step = el('p', 'p2-step'); step.hidden = true;
    top.appendChild(step);
    var chips = el('ul', 'p2-chips');
    top.appendChild(chips);
    // What everyone's main stage shows, in words, with the one way to change
    // it (Week 2: "if I take that down, does it show?").
    var stage = el('p', 'p2-stage'); stage.hidden = true;
    var stageLabel = el('span', 'p2-stage-label', 'On the stage');
    var stageWhat = el('span', 'p2-stage-what');
    var stageBtn = el('button', 'btn-secondary small p2-stage-btn'); stageBtn.type = 'button';
    stage.appendChild(stageLabel); stage.appendChild(stageWhat); stage.appendChild(stageBtn);
    top.appendChild(stage);
    var onStageBtn = null;
    stageBtn.addEventListener('click', function () { if (onStageBtn) onStageBtn(); });
    var nav = el('div', 'p2-tabs');
    nav.setAttribute('role', 'tablist');
    nav.hidden = tabs.length < 2;
    top.appendChild(nav);
    shell.appendChild(top);
    var panes = {}, buttons = {}, current = null;
    var body = el('div', 'p2-body');
    tabs.forEach(function (t) {
      var b = el('button', 'p2-tab', t[1]);
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.appendChild(el('span', 'p2-dot')).hidden = true;
      b.addEventListener('click', function () { show(t[0]); });
      nav.appendChild(b); buttons[t[0]] = b;
      var p = el('section', 'p2-pane');
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-label', t[1]); p.setAttribute('data-pane', t[0]);
      body.appendChild(p); panes[t[0]] = p;
    });
    shell.appendChild(body);
    var bar = el('footer', 'p2-bar');
    var back = el('button', 'btn-secondary p2-back', 'Back'); back.type = 'button';
    var next = el('button', 'btn-primary p2-next'); next.type = 'button';
    var low = el('div', 'p2-low');
    if (o.teaching) { bar.appendChild(back); bar.appendChild(next); }
    shell.appendChild(low);
    shell.appendChild(bar);
    ready.insertBefore(shell, ready.firstChild);
    o.root.classList.add('p2-panel');

    var onNext = null, onBack = null;
    next.addEventListener('click', function () { if (onNext) onNext(); });
    back.addEventListener('click', function () { if (onBack) onBack(); });

    function show(key) {
      if (!panes[key]) return;
      current = key;
      Object.keys(panes).forEach(function (k) {
        panes[k].hidden = k !== key;
        buttons[k].setAttribute('aria-selected', String(k === key));
        buttons[k].classList.toggle('is-on', k === key);
      });
      buttons[key].querySelector('.p2-dot').hidden = true;
      body.scrollTop = 0;
    }
    show('now');

    var drawn = '';
    return {
      el: shell, low: low,
      // What the tour points at, and its own button.
      tab: function (key) { return buttons[key] || null; },
      nextButton: function () { return next; },
      stageLine: function () { return stage; },
      onHelp: function (fn) { onHelp = fn; help.hidden = !fn; },
      pane: function (key) { return panes[key]; },
      show: show,
      current: function () { return current; },
      put: function (key, node) { if (node && panes[key] && node.parentNode !== panes[key]) panes[key].appendChild(node); },
      dot: function (key) { if (buttons[key] && key !== current) buttons[key].querySelector('.p2-dot').hidden = false; },
      // title, time, chips [{ text, on }], next { label, disabled }, canBack
      draw: function (s) {
        var key = JSON.stringify([s.title, s.step, s.chips, s.next && s.next.label, s.next && s.next.disabled, s.canBack]);
        time.textContent = s.time || '';
        time.classList.toggle('is-over', !!s.over);
        less.hidden = more.hidden = !(s.nudge && onNudge);
        if (key === drawn) return;
        drawn = key;
        title.textContent = s.title || '';
        step.textContent = s.step || ''; step.hidden = !s.step;
        chips.replaceChildren();
        (s.chips || []).forEach(function (c) { chips.appendChild(el('li', 'p2-chip' + (c.on ? ' is-on' : ''), c.text)); });
        chips.hidden = !(s.chips || []).length;
        if (s.next) { next.textContent = s.next.label; next.disabled = !!s.next.disabled; }
        back.hidden = !s.canBack;
      },
      // { what, action: { label, go } | null }, or null to hide.
      stage: function (v) {
        stage.hidden = !v;
        if (!v) return;
        if (stageWhat.textContent !== v.what) stageWhat.textContent = v.what;
        stageBtn.hidden = !v.action;
        if (v.action) { stageBtn.textContent = v.action.label; onStageBtn = v.action.go; }
      },
      on: function (n, b) { onNext = n; onBack = b; },
      onNudge: function (fn) { onNudge = fn; }
    };
  }
  window.PanelFrame = { mount: mount };
})();
