// What session-read decides, without touching GitHub or the database, so each
// rule is tested on its own (tools/test/session-read.test.mjs).
import { WORKFLOW_PATH } from '../_shared/session-read-workflow.js';

export const ISSUER = 'https://token.actions.githubusercontent.com';
export const AUDIENCE = 'https://humanshaped.org';
// Longer than the job's own time limit, so a slow run is never started twice.
const STALE_MS = 150 * 60000;
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
  if (claims.event_name !== 'repository_dispatch') return { ok: false, reason: 'event' };
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

// What was said, made safe to keep, on the same terms as a turn. Null when it
// is not a reading at all.
export function cleanWords(body, people) {
  if (!Array.isArray(body?.said) || body.said.length > 5000) return null;
  const known = new Set(people);
  const said = [];
  for (const w of body.said) {
    const start = Number(w?.start), end = Number(w?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > 6 * 3600) return null;
    const text = typeof w.text === 'string' ? w.text.trim().slice(0, 8000) : '';
    if (!text) return null;
    const user = w.user_id && known.has(w.user_id) ? w.user_id : null;
    const name = user ? null : (typeof w.name === 'string' ? w.name.slice(0, 80) : null);
    said.push({ user_id: user, name, started_s: start, ended_s: end, body: text });
  }
  return said;
}

// Google Drive's own transcript of a recording (Ben, November 18, 2026: "You
// have got to figure out a programatic/API way of getting the transcript").
// Drive makes an automatic English track for a video, and for a file shared
// by link it answers at drive.google.com/timedtext with no sign-in: type=list
// names the tracks, and type=track returns <text start dur> lines. These are
// the addresses Drive's own player uses; Google does not document them, so the
// runner's transcript stays as the backup.
export const CAPTIONS_HOST = 'https://drive.google.com/timedtext';
export function captionsUrls(id) {
  const base = `${CAPTIONS_HOST}?id=${encodeURIComponent(id)}&v=${encodeURIComponent(id)}`;
  return { list: base + '&type=list', track: base + '&type=track&lang=en&kind=asr&name=' };
}
export function hasAsrTrack(listXml) {
  return /<track\b[^>]*\bkind="asr"[^>]*\blang_code="en/.test(String(listXml || '')) || /<track\b[^>]*\blang_code="en[^>]*\bkind="asr"/.test(String(listXml || ''));
}
// Drive escapes its text twice (&amp;#39;), so the ampersand goes first.
function unescapeXml(s) {
  return s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
// Drive's lines are a few words each and overlap; they are joined into
// stretches that end at the end of a sentence, or after twenty seconds, with
// whole seconds that never run backwards. Null when it is not a transcript.
export function captionsFrom(xml) {
  const text = String(xml || '');
  if (!/^\s*(<\?xml[^>]*>\s*)?<transcript\b/.test(text)) return null;
  const out = [];
  let cur = null;
  for (const m of text.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const start = Number((/\bstart="([\d.]+)"/.exec(m[1]) || [])[1]);
    const dur = Number((/\bdur="([\d.]+)"/.exec(m[1]) || [])[1] || 0);
    const words = unescapeXml(m[2]).replace(/\s+/g, ' ').trim();
    if (!isFinite(start) || !words) continue;
    if (!cur) cur = { started_s: Math.floor(start), ended_s: Math.floor(start) + 1, body: '' };
    cur.body = (cur.body + ' ' + words).trim();
    cur.ended_s = Math.max(cur.ended_s, Math.ceil(start + (isFinite(dur) ? dur : 0)), cur.started_s + 1);
    if (/[.?!]$/.test(words) || start - cur.started_s >= 20 || cur.body.length > 1500) { out.push(cur); cur = null; }
    if (out.length > 5000) return null;
  }
  if (cur) out.push(cur);
  for (let i = 1; i < out.length; i++) if (out[i].started_s < out[i - 1].started_s) out[i].started_s = out[i - 1].started_s;
  return out.map((l) => ({ ...l, ended_s: Math.max(l.ended_s, l.started_s + 1), body: l.body.slice(0, 8000) }));
}
// Drive makes its track some time after the upload: ask every tick for the
// first two hours, then hourly for two days, then stop.
export function captionsDue(session, row, now) {
  if (!driveId(session.recording_url)) return false;
  if (!row || row.recording_url !== session.recording_url) return true;
  if (row.state === 'done' || row.state === 'private') return false;
  const age = now.getTime() - Date.parse(row.first_at), since = now.getTime() - Date.parse(row.checked_at);
  if (age > 48 * 3600000) return false;
  return age < 2 * 3600000 ? since >= 9 * 60000 : since >= 59 * 60000;
}
