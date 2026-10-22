// What a scheduled run of humanshaped/automation does, decided without
// touching GitHub or the database, so each rule is tested on its own
// (tools/test/github-tick.test.mjs). Design:
// research/notes/cohort-repository-design.md, "Notifications".
//
// Each hour, a workflow in the public humanshaped/automation repository
// (public, so its Actions minutes cost nothing) asks this function to
// open the discussion for every session that starts within the next day
// and has none yet. Everyone watching the cohort's repository is emailed
// by GitHub, and the thread is ready for the session itself.

export const ISSUER = 'https://token.actions.githubusercontent.com';
export const AUDIENCE = 'https://humanshaped.org';
export const REPOSITORY = 'humanshaped/automation';
const AHEAD_MS = 24 * 3600000;

// Who may call: only a workflow on the main branch of
// humanshaped/automation, run on its schedule or by hand. The token's
// signature, issuer, audience, and expiry are checked first, in index.ts.
export function callerOk(claims) {
  if (!claims || claims.iss !== ISSUER) return { ok: false, reason: 'issuer' };
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(AUDIENCE)) return { ok: false, reason: 'audience' };
  if (claims.repository !== REPOSITORY) return { ok: false, reason: 'repository' };
  if (claims.ref !== 'refs/heads/main') return { ok: false, reason: 'ref' };
  if (!['schedule', 'workflow_dispatch'].includes(claims.event_name)) return { ok: false, reason: 'event' };
  return { ok: true };
}

// The sessions whose thread should open now: starting within a day, not
// yet started, with no thread, in a cohort that is open or running and
// has its repository.
//   rows: [{ id, number, title, starts_at, discussion_number, cohorts: { slug, status, github_repo, time_zone } }]
export function due(rows, now) {
  const t = now.getTime();
  return (rows || []).filter((s) => {
    const c = s.cohorts;
    if (!c || !c.github_repo || !['open', 'running'].includes(c.status)) return false;
    if (s.discussion_number) return false;
    const at = Date.parse(s.starts_at);
    return Number.isFinite(at) && at > t && at - t <= AHEAD_MS;
  });
}

// When the session starts, in the cohort's own zone, written out.
export function whenLine(startsAt, timeZone) {
  const zone = timeZone || 'America/Denver';
  const text = new Date(startsAt).toLocaleString('en-US', {
    timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'long',
  });
  return `It starts ${text.replace(' at ', ', ')}. On humanshaped.org it shows on your own clock.`;
}
