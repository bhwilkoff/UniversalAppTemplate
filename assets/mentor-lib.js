// Pure helpers for mentors (DECISIONS.md, "Alumni"; migration
// 20261003200000): which cohorts a credential holder can help, and how a
// member's role reads on a page. Used by /account/, /cohort/, and
// /teach/, and tested in tools/test/mentor-lib.test.mjs.
(function (root) {
  // Cohorts someone may join as a mentor: open or running, not one they
  // teach, and not one they are already in (having left one does not
  // count, since they may come back to help). Open cohorts first, then by
  // start date.
  function mentorChoices(cohorts, myEnrollments, teachingIds) {
    var inIt = {};
    (myEnrollments || []).forEach(function (e) {
      var id = e.cohort_id || (e.cohorts && e.cohorts.id);
      if (id && e.status !== 'left') inIt[id] = true;
    });
    var teaching = {};
    (teachingIds || []).forEach(function (id) { teaching[id] = true; });
    return (cohorts || []).filter(function (c) {
      return (c.status === 'open' || c.status === 'running') && !inIt[c.id] && !teaching[c.id];
    }).slice().sort(function (a, b) {
      var oa = a.status === 'open' ? 0 : 1, ob = b.status === 'open' ? 0 : 1;
      return (oa - ob) || String(a.starts_on || '').localeCompare(String(b.starts_on || ''));
    });
  }

  // The word shown beside a person's name, or nothing for a student.
  function roleLabel(role) { return role === 'mentor' ? 'Mentor' : ''; }

  // The role a teacher's switch moves someone to.
  function otherRole(role) { return role === 'mentor' ? 'student' : 'mentor'; }

  var lib = { mentorChoices: mentorChoices, roleLabel: roleLabel, otherRole: otherRole };
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.MentorLib = lib;
})(typeof globalThis !== 'undefined' ? globalThis : this);
