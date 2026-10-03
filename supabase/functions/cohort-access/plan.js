// What the cohort-access function should do, decided without touching
// GitHub or the database, so every rule here is tested on its own
// (tools/test/cohort-access-plan.test.mjs).
//
// A person asks for their own access: "join" when they are in a cohort
// (or teach it), "leave" when they have left it. Nobody can ask for
// someone else, so the function never adds or removes a person who did
// not ask, and the database's own rules decide who is in a cohort.

export const ORG = 'humanshaped';

export function plan({ action, login, cohort, enrollment, teaches }) {
  if (!login) return refuse(400, 'Your GitHub name is missing from your profile. Sign out and in again.');
  if (!cohort) return refuse(404, 'That cohort does not exist.');
  if (!cohort.github_team) return refuse(409, 'This cohort does not have a GitHub team yet. Its teacher sets one up on /teach/.');
  const path = `/orgs/${ORG}/teams/${encodeURIComponent(cohort.github_team)}/memberships/${encodeURIComponent(login)}`;
  const enrolled = enrollment && enrollment.status !== 'left';

  if (action === 'join') {
    if (!enrolled && !teaches) return refuse(403, 'Join the cohort first, and then its conversation opens to you.');
    return { ok: true, method: 'PUT', path, body: { role: teaches ? 'maintainer' : 'member' } };
  }
  if (action === 'leave') {
    if (enrolled || teaches) return refuse(409, 'You are still in this cohort. Leave it from your account first.');
    return { ok: true, method: 'DELETE', path };
  }
  return refuse(400, 'Ask to join or to leave.');
}

// What GitHub's answer means for the person, in github_access terms.
// PUT answers 200 with state "active" (already in the organization) or
// "pending" (GitHub has emailed an invitation they must accept).
// DELETE answers 204, or 404 when they were not on the team anyway.
export function outcome(method, status, body) {
  if (method === 'PUT' && status === 200) {
    return body && body.state === 'active'
      ? { state: 'member', detail: null }
      : { state: 'invited', detail: 'GitHub has emailed an invitation to join the humanshaped organization. Accept it to open the conversation.' };
  }
  if (method === 'DELETE' && (status === 204 || status === 404)) return { state: 'removed', detail: null };
  const why = body && body.message ? String(body.message).slice(0, 300) : 'no details';
  return { state: 'failed', detail: `GitHub answered ${status}: ${why}` };
}

function refuse(status, message) {
  return { ok: false, status, message };
}
