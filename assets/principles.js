// Lists the Human-Shaped Principles wherever a page has
// <ol data-principles>, read live from the template (PrinciplesLib), with
// the page's own link to /principles/ as the fallback.
(function () {
  var list = document.querySelector('[data-principles]');
  var P = window.PrinciplesLib;
  if (!list || !P || !window.fetch) return;
  fetch(P.RAW).then(function (r) { return r.ok ? r.text() : ''; }).then(function (md) {
    var items = P.parse(md);
    if (!items.length) return;
    list.replaceChildren();
    items.forEach(function (p) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '/principles/' + (p.anchor ? '#' + p.anchor : '');
      var lead = document.createElement('span'); lead.className = 'p-lead'; lead.textContent = p.lead;
      a.appendChild(lead);
      if (p.rest) { var rest = document.createElement('span'); rest.className = 'p-rest'; rest.textContent = ' ' + p.rest; a.appendChild(rest); }
      li.appendChild(a);
      list.appendChild(li);
    });
    list.hidden = false;
    var fb = document.querySelector('[data-principles-fallback]');
    if (fb) fb.hidden = true;
  }).catch(function () {});
})();
