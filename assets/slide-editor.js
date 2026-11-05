// The slide editor: one textarea made into a place to build slides, used in
// the add-on's Edit this part and in the session page's plan. The text is
// the deck; the toolbar adds a real example to write over; the checker says
// what will not fit; and where there is room, the slides show as they will on
// the main stage. In Meet there is no room, and the leader's own stage is the
// preview. SlideEditor.attach({ input, preview }) returns { check() }.
(function () {
  var L = window.SlidesLib;
  if (!L) return;
  var SRC = '/assets/vendor/deck-kit.js?v=20261104b';
  var loading = null;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function load() {
    if (window.DeckKit) return Promise.resolve(window.DeckKit);
    if (!loading) loading = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = SRC; s.onload = function () { ok(window.DeckKit); }; s.onerror = no;
      document.head.appendChild(s);
    });
    return loading;
  }

  // The first slide of a deck as a picture, for a list of parts.
  function thumb(box, text) {
    load().then(function (K) {
      var svg = K.render(L.deck(text))[0];
      if (svg) { box.innerHTML = svg; box.classList.add('slide-thumb'); }
    }, function () {});
  }

  function attach(o) {
    var input = o.input;
    var tools = el('div', 'ui-toolbar slide-tools');
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Add to these slides');
    function put(r) {
      input.value = r.text;
      input.focus();
      input.setSelectionRange(r.caret, r.caret);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    L.ADD.forEach(function (a) {
      var b = el('button', 'btn-secondary small', a.label); b.type = 'button';
      b.addEventListener('click', function () { put(L.insert(input.value, input.selectionStart, a.text)); });
      tools.appendChild(b);
    });
    var n = el('button', 'btn-secondary small', 'Note'); n.type = 'button';
    n.addEventListener('click', function () { put(L.insertNote(input.value, input.selectionStart)); });
    tools.appendChild(n);
    var said = el('ul', 'slide-said');
    said.setAttribute('role', 'status');
    var shown = o.preview ? el('div', 'slide-preview') : null;
    input.classList.add('slide-source');
    input.spellcheck = true;
    // Beside the field's label, never inside it: a click on a label presses
    // the first button it holds.
    var after = input.closest('label') || input;
    after.parentNode.insertBefore(tools, after.nextSibling);
    tools.parentNode.insertBefore(said, tools.nextSibling);
    if (shown) said.parentNode.insertBefore(shown, said.nextSibling);

    var timer = null, last = null;
    function check() {
      var text = L.withoutNotes(input.value);
      if (text === last) return;
      last = text;
      load().then(function (K) {
        said.replaceChildren();
        var full = L.deck(text);
        var found = text ? K.lint(full) : [];
        found.slice(0, 3).forEach(function (f) { said.appendChild(el('li', null, f.words)); });
        if (!shown) return;
        shown.replaceChildren();
        if (!text) return;
        K.render(full).forEach(function (svg, i) {
          var b = el('button', 'slide-pick'); b.type = 'button';
          b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          b.innerHTML = svg;
          b.addEventListener('click', function () {
            var at = L.offset(input.value, i);
            input.focus(); input.setSelectionRange(at, at);
          });
          shown.appendChild(b);
        });
      }, function () { said.replaceChildren(el('li', null, 'The slides cannot be drawn here.')); });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(check, 350); });
    check();
    return { check: check };
  }

  window.SlideEditor = { attach: attach, load: load, thumb: thumb };
})();
