// The words for each hub-wide right and each change to one (PAGES.md,
// "Running the hub"; migration 20261021020000). Pure, so it is tested in
// tools/test/admin-lib.test.mjs.
(function (root) {
  var RIGHTS = [
    { key: 'teacher', name: 'Teacher', what: 'Plans cohorts and polls, and teaches the cohorts they plan or are added to.', give: 'Make them a teacher', take: 'Take away teaching', confirmTake: 'Taking away teaching also takes approving, signing, and admin. The cohorts they already teach keep them as a teacher.' },
    { key: 'can_approve', name: 'Approves teachers', what: 'Reads requests to teach and decides them, and can hide an app from the public list.', give: 'Let them approve teachers', take: 'Take away approving' },
    { key: 'can_sign', name: 'Signs credentials', what: 'Signs credentials with the hub’s key, on the computer that holds it.', give: 'Let them sign credentials', take: 'Take away signing' },
    { key: 'can_admin', name: 'Admin', what: 'Changes anyone’s rights here and reads the log of every change.', give: 'Make them an admin', take: 'Take away admin', confirmGive: 'An admin can change anyone’s rights, including yours.', confirmTake: 'They will no longer be able to change anyone’s rights.' }
  ];
  function right(key) { return RIGHTS.filter(function (r) { return r.key === key; })[0]; }
  function nameOf(p) { return (p.display_name && String(p.display_name).trim()) || (p.github_login ? '@' + p.github_login : 'Someone'); }
  // "Teacher, Admin", or "None" for someone who has signed in and nothing more.
  function rightsText(p) {
    var held = RIGHTS.filter(function (r) { return p[r.key]; }).map(function (r) { return r.name; });
    return held.length ? held.join(', ') : 'None';
  }
  // The change, as a phrase after the actor's name: "made Ivy a teacher".
  function changeText(c, subject) {
    var r = right(c.right), who = subject || 'them';
    if (!r) return 'changed a right of ' + who;
    var gave = c.after && !c.before;
    var phrases = {
      teacher: gave ? 'made ' + who + ' a teacher' : 'took away ' + who + '’s teaching',
      can_approve: gave ? 'let ' + who + ' approve teachers' : 'took away ' + who + '’s approving',
      can_sign: gave ? 'let ' + who + ' sign credentials' : 'took away ' + who + '’s signing',
      can_admin: gave ? 'made ' + who + ' an admin' : 'took away ' + who + '’s admin right'
    };
    return phrases[c.right];
  }
  // Whether this change asks once more first, and with what words.
  function confirmFor(key, giving, person) {
    var r = right(key);
    if (!r) return null;
    if (giving && r.confirmGive) return r.confirmGive;
    if (!giving && r.confirmTake && (key !== 'teacher' || person.can_approve || person.can_sign || person.can_admin || (person.cohorts || []).some(function (c) { return c.role === 'teacher' && (c.status === 'open' || c.status === 'running'); }))) return r.confirmTake;
    return null;
  }
  var api = { RIGHTS: RIGHTS, right: right, nameOf: nameOf, rightsText: rightsText, changeText: changeText, confirmFor: confirmFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminLib = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
