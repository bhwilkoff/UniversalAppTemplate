// What session-read decides, without touching GitHub or the database, so each
// rule is tested on its own (tools/test/session-read.test.mjs).
import { WORKFLOW_PATH } from '../_shared/session-read-workflow.js';

export const ISSUER = 'https://token.actions.githubusercontent.com';
export const AUDIENCE = 'https://humanshaped.org';
const STALE_MS = 60 * 60000;
export const MOST_TRIES = 3;

// Only the workflow on the main branch of this session's own repository, run
// by dispatch. The token's signature, issuer, audience, and expiry are
// checked first; that the file is the real one is checked against GitHub.
export function fullName(repo) {
  const r = String(repo || '');
  return r.includes('/') ? r : 'humanshaped/' + r;
}

export function callerOk(claims, repo) {
  if (!claims || claims.iss !== ISSUER) return { ok: false, reason: 'issuer' };
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(AUDIENCE)) return { ok: false, reason: 'audience' };
  const full = fullName(repo);
  if (!repo || claims.repository !== full) return { ok: false, reason: 'repository' };
  if (claims.ref !== 'refs/heads/main') return { ok: false, reason: 'ref' };
  if (claims.event_name !== 'workflow_dispatch') return { ok: false, reason: 'event' };
  if (claims.workflow_ref !== `${full}/${WORKFLOW_PATH}@refs/heads/main`) return { ok: false, reason: 'workflow' };
  if (!/^[0-9a-f]{40}$/.test(String(claims.workflow_sha || ''))) return { ok: false, reason: 'sha' };
  return { ok: true };
}

export function driveId(url) {
  const m = /^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,200})/.exec(String(url || ''));
  return m ? m[1] : null;
}

// Whether a session's recording should be read now.
//   session: { recording_url, cohorts: { github_repo } }
//   read: its session_reads row, or null
export function due(session, read, now) {
  if (!driveId(session.recording_url) || !session.cohorts?.github_repo) return false;
  if (!read || read.recording_url !== session.recording_url) return true;
  if (read.state === 'done' || read.tries >= MOST_TRIES) return false;
  return now.getTime() - Date.parse(read.started_at) > STALE_MS;
}

// A finished reading, made safe to keep: whole seconds in order, only people
// of this cohort, and a label short enough to be a name. Null when it is not
// a reading at all.
export function clean(body, people) {
  const seconds = Number(body?.read_seconds);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 6 * 3600) return null;
  if (!Array.isArray(body?.turns) || body.turns.length > 5000) return null;
  const known = new Set(people);
  const turns = [];
  for (const t of body.turns) {
    const start = Number(t?.start), end = Number(t?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > seconds + 1) return null;
    const user = t.user_id && known.has(t.user_id) ? t.user_id : null;
    const name = user ? null : (typeof t.name === 'string' ? t.name.slice(0, 80) : null);
    turns.push({ user_id: user, name, started_s: start, ended_s: end });
  }
  return { seconds, turns };
}
