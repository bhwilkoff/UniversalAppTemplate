/* The toolkit's guide pages (/start/meetup/, /start/hackathon/): print
   one sheet at a time, or all of a page's sheets when the browser's own
   print command is used. */
(function () {
  'use strict';
  document.querySelectorAll('[data-print-sheet]').forEach(function (b) {
    b.addEventListener('click', function () {
      var block = document.getElementById(b.getAttribute('data-print-sheet'));
      if (!block) return;
      block.classList.add('printing');
      document.body.setAttribute('data-printing', block.id);
      window.print();
    });
  });
  window.addEventListener('afterprint', function () {
    document.body.removeAttribute('data-printing');
    document.querySelectorAll('.sheet-block.printing').forEach(function (s) { s.classList.remove('printing'); });
  });
})();
