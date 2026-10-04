// Pure helpers for reaching a person who is not on the site
// (research/notes/reach-notes.md, G4): checking the address a person
// gives on /account/, and the link that opens a teacher's own mail with a
// private word to one student. Used by hub.js and teach.js, tested in
// tools/test/reach-lib.test.mjs.
//
// Nothing here sends anything. The teacher's own mail program does, after
// the teacher reads it over and presses send.
(function (root) {
  var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  // What a person's choices on /account/ come to, checked before saving.
  function checkChoice(input) {
    var email = String((input && input.email) || '').trim();
    var teachers = !!(input && input.teachers_may_email);
    var notices = !!(input && input.notices);
    if (email && (!EMAIL.test(email) || email.length > 254)) return { error: 'That does not look like an email address.' };
    if ((teachers || notices) && !email) return { error: 'Add the address you would like used first.' };
    return { row: { email: email || null, teachers_may_email: teachers, notices: notices } };
  }

  // Some mail programs cut a mailto: link short, so a long draft is
  // trimmed and says so, and the teacher pastes the rest.
  var MAX_BODY = 1800;

  function mailtoHref(email, subject, body) {
    if (!EMAIL.test(String(email || ''))) return null;
    var text = String(body || '');
    if (text.length > MAX_BODY) text = text.slice(0, MAX_BODY).replace(/\s+\S*$/, '') + '\n\n[Your draft was longer. Paste the rest here.]';
    var q = [];
    if (subject) q.push('subject=' + encodeURIComponent(subject));
    if (text) q.push('body=' + encodeURIComponent(text));
    return 'mailto:' + encodeURIComponent(email).replace(/%40/g, '@') + (q.length ? '?' + q.join('&') : '');
  }

  // The subject line of a teacher's private word, from the cohort's name.
  function reachSubject(cohortTitle) {
    var t = String(cohortTitle || '').trim();
    return t ? 'Checking in, from ' + t : 'Checking in, from your Human Shaped cohort';
  }

  // reach_for()'s rows, by person.
  function byPerson(rows) {
    var out = {};
    (rows || []).forEach(function (r) { out[r.user_id] = { mayEmail: !!r.may_email && EMAIL.test(r.email || ''), email: r.may_email ? r.email : null }; });
    return out;
  }

  var lib = { checkChoice: checkChoice, mailtoHref: mailtoHref, reachSubject: reachSubject, byPerson: byPerson, MAX_BODY: MAX_BODY };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.ReachLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
