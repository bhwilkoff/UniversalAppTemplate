// The words for each hub-wide right and each change to one (PAGES.md,
// "An admin"; migration 20261021020000). Pure, so it is tested in
// tools/test/admin-lib.test.mjs.
(function (root) {
  var RIGHTS = [
    { key: 'teacher', name: 'Leader', what: 'Plans cohorts and polls, and leads the cohorts they plan or are added to.', give: 'Make them a leader', take: 'Take away leading', confirmTake: 'Taking away leading also takes approving, signing, and admin. The cohorts they already lead keep them as a leader.' },
    { key: 'can_approve', name: 'Approves leaders', what: 'Reads requests to lead and decides them, and can hide an app from the public list.', give: 'Let them approve leaders', take: 'Take away approving' },
    { key: 'can_sign', name: 'Signs credentials', what: 'Signs credentials with Human Shaped’s key, on the computer that holds it.', give: 'Let them sign credentials', take: 'Take away signing' },
    { key: 'can_admin', name: 'Admin', what: 'Changes anyone’s rights here and reads the log of every change.', give: 'Make them an admin', take: 'Take away admin', confirmGive: 'An admin can change anyone’s rights, including yours.', confirmTake: 'They will no longer be able to change anyone’s rights.' }
  ];
  function right(key) { return RIGHTS.filter(function (r) { return r.key === key; })[0]; }
  function nameOf(p) { return (p.display_name && String(p.display_name).trim()) || (p.github_login ? '@' + p.github_login : 'Someone'); }
  // "Teacher, Admin", or "None" for someone who has signed in and nothing more.
  function rightsText(p) {
    var held = RIGHTS.filter(function (r) { return p[r.key]; }).map(function (r) { return r.name; });
    return held.length ? held.join(', ') : 'None';
  }
  // The roles and rights someone holds, as tags: Leader and Learner first.
  function rolesOf(p) {
    var t = [];
    if (p.teacher) t.push('Leader');
    if (p.enrolled > 0) t.push('Learner');
    if (p.can_approve) t.push('Approver');
    if (p.can_sign) t.push('Signer');
    if (p.can_admin) t.push('Admin');
    return t;
  }
  // The change, as a phrase after the actor's name: "made Ivy a teacher".
  function changeText(c, subject) {
    var r = right(c.right), who = subject || 'them';
    if (!r) return 'changed a right of ' + who;
    var gave = c.after && !c.before;
    var phrases = {
      teacher: gave ? 'made ' + who + ' a leader' : 'took away ' + who + '’s leading',
      can_approve: gave ? 'let ' + who + ' approve leaders' : 'took away ' + who + '’s approving',
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
  var api = { RIGHTS: RIGHTS, right: right, nameOf: nameOf, rightsText: rightsText, rolesOf: rolesOf, changeText: changeText, confirmFor: confirmFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminLib = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
