// The window the board opens to save or copy what Meet's frame will not let it
// (/board/save/). It asks the board that opened it for one file, and does with
// it what the person pressed there: saves it at once, or copies it.
(function () {
  var $ = function (s) { return document.querySelector(s); }, file = null;
  function say(t) { $('[data-said]').textContent = t; }
  function save() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file.blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
    say('Saved as ' + file.name + '.');
  }
  function copy() {
    if (!navigator.clipboard || !window.ClipboardItem) return say('This browser cannot copy a picture. Save it instead.');
    var data = {}; data[file.blob.type] = file.blob;
    return navigator.clipboard.write([new ClipboardItem(data)]).then(function () { say('Copied.'); }, function () { say('Press Copy it.'); });
  }
  $('[data-save]').addEventListener('click', save);
  $('[data-copy]').addEventListener('click', copy);
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.source !== window.opener || file) return;
    var m = e.data && e.data.hsSave;
    if (!m || !(m.blob instanceof Blob)) return;
    file = { blob: m.blob, name: String(m.name || 'board').replace(/[^\w.\- ]+/g, '-').slice(0, 120) || 'board' };
    $('[data-name]').textContent = file.name;
    $('[data-save]').disabled = false;
    var picture = /^image\/(png|svg\+xml|jpeg|webp)$/.test(file.blob.type);
    if (picture) { $('[data-picture]').src = URL.createObjectURL(file.blob); $('[data-picture]').hidden = false; }
    $('[data-copy]').hidden = file.blob.type !== 'image/png';
    if (m.copy) copy(); else save();
  });
  if (window.opener) window.opener.postMessage({ hsSaveReady: true }, location.origin);
  else say('Nothing to save here. Open the board and choose what to download.');
})();
