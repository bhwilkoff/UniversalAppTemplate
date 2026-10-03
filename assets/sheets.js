/* Fills the printable sheets on /start/sheets/ from the template's own
   markdown, and prints one sheet at a time. */
(function () {
  'use strict';
  var RAW = 'https://raw.githubusercontent.com/bhwilkoff/UniversalAppTemplate/main/';

  function li(n, lead, rest) {
    var item = document.createElement('li');
    if (lead) { var b = document.createElement('b'); b.textContent = lead; item.appendChild(b); }
    if (rest) item.appendChild(document.createTextNode((lead ? ' ' : '') + rest));
    item.setAttribute('value', n);
    return item;
  }

  function fill(id, path, draw) {
    var block = document.getElementById(id);
    var status = block.querySelector('[data-sheet-status]');
    var button = block.querySelector('[data-print-sheet]');
    fetch(RAW + path).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (md) {
      if (!draw(block, md)) throw new Error('empty');
      status.hidden = true;
      button.disabled = false;
    }).catch(function () {
      status.textContent = 'The template could not be reached just now, so this sheet is empty. Try again in a moment.';
    });
  }

  fill('principles', 'docs/human-shaped/PRINCIPLES.md', function (block, md) {
    var p = SheetLib.parsePrinciples(md);
    if (!p.items.length) return false;
    block.querySelector('[data-sheet-intro]').textContent = p.intro;
    if (p.version) block.querySelector('[data-sheet-version]').textContent = 'Version ' + p.version + '. ';
    var list = block.querySelector('[data-sheet-principles]');
    p.items.forEach(function (i) { list.appendChild(li(i.n, i.lead, i.rest)); });
    return true;
  });

  fill('questions', 'docs/path/00-why-we-build.md', function (block, md) {
    var q = SheetLib.parseQuestions(md);
    if (!q.questions.length) return false;
    var list = block.querySelector('[data-sheet-questions]');
    q.questions.forEach(function (text, i) { list.appendChild(li(i + 1, '', text)); });
    block.querySelector('[data-sheet-after]').textContent = q.after;
    return true;
  });

  document.querySelectorAll('[data-print-sheet]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.body.setAttribute('data-printing', b.getAttribute('data-print-sheet'));
      window.print();
    });
  });
  window.addEventListener('afterprint', function () { document.body.removeAttribute('data-printing'); });
})();
