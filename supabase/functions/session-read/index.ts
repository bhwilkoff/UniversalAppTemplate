// Reads who was speaking in each session's recording, with no one pressing
// anything. Design: DECISIONS.md, "A session keeps what happened".
//
// Every ten minutes Supabase Cron calls this with the x-reminders-key header.
// Any session whose recording is unread gets the job started in its cohort's
// private repository. That job then calls here with GitHub's OIDC token: once
// to ask for the recording and the names, and once with what it read. Only
// turns are kept; nothing is committed to the repository.
//
// Secrets: REMINDERS_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY,
// GITHUB_APP_INSTALLATION_ID.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';
import { WORKFLOW, WORKFLOW_PATH } from '../_shared/session-read-workflow.js';
import { ISSUER, AUDIENCE, callerOk, clean, driveId, due, fullName } from './logic.js';

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const KEYS = createRemoteJWKSet(new URL(ISSUER + '/.well-known/jwks'));
const utf8 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

function sameKey(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function appToken(): Promise<string> {
  const auth = createAppAuth({
    appId: Deno.env.get('GITHUB_APP_ID')!,
    privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!,
    installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')!),
  });
  return (await auth({ type: 'installation' })).token;
}

// deno-lint-ignore no-explicit-any
async function github(token: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  const r = await fetch('https://api.github.com' + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'humanshaped-session-read', 'X-GitHub-Api-Version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
  return { status: r.status, body: parsed };
}

const decoded = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

// deno-lint-ignore no-explicit-any
async function tick(db: any) {
  const now = new Date();
  const rows = await db.from('sessions').select('id, cohort_id, recording_url, cohorts(github_repo)').not('recording_url', 'is', null);
  if (rows.error) return reply(500, { message: rows.error.message });
  const reads = await db.from('session_reads').select('*');
  if (reads.error) return reply(500, { message: reads.error.message });
  // deno-lint-ignore no-explicit-any
  const byId = new Map(reads.data.map((r: any) => [r.session_id, r]));
  // deno-lint-ignore no-explicit-any
  const todo = rows.data.filter((s: any) => due(s, byId.get(s.id) || null, now)).slice(0, 2);
  if (!todo.length) return reply(200, { started: [] });
  const token = await appToken();
  const started: string[] = [], problems: string[] = [];
  for (const s of todo) {
    const repo = fullName(s.cohorts.github_repo);
    const at = `/repos/${repo}/contents/${WORKFLOW_PATH}`;
    const there = await github(token, 'GET', at);
    const same = there.status === 200 && decoded(there.body.content) === WORKFLOW;
    if (!same) {
      const put = await github(token, 'PUT', at, { message: 'Read who was speaking in session recordings', content: utf8(WORKFLOW), sha: there.body?.sha });
      if (put.status !== 200 && put.status !== 201) { problems.push(`${s.id}: file ${put.status}`); continue; }
      continue; // GitHub takes a moment to know a new workflow; the next tick starts it.
    }
    const prior = byId.get(s.id) as { tries?: number; recording_url?: string } | undefined;
    const tries = prior && prior.recording_url === s.recording_url ? (prior.tries || 0) + 1 : 1;
    const go = await github(token, 'POST', `/repos/${repo}/actions/workflows/session-read.yml/dispatches`, { ref: 'main', inputs: { session: s.id } });
    if (go.status !== 204) { problems.push(`${s.id}: start ${go.status}`); continue; }
    await db.from('session_reads').upsert({ session_id: s.id, cohort_id: s.cohort_id, recording_url: s.recording_url, state: 'running', tries, started_at: now.toISOString(), problem: null });
    started.push(s.id);
  }
  return reply(problems.length ? 207 : 200, { started, problems });
}

// deno-lint-ignore no-explicit-any
async function job(db: any, req: Request, jwt: string) {
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(jwt, KEYS, { issuer: ISSUER, audience: AUDIENCE }));
  } catch {
    return reply(401, { message: 'No.' });
  }
  const body = await req.json().catch(() => ({}));
  const s = await db.from('sessions').select('id, cohort_id, recording_url, cohorts(github_repo)').eq('id', String(body.session || '')).maybeSingle();
  if (s.error || !s.data) return reply(404, { message: 'No such session.' });
  const repo = s.data.cohorts?.github_repo;
  const who = callerOk(claims, repo);
  if (!who.ok) return reply(403, { message: 'No.', reason: who.reason });
  const token = await appToken();
  const file = await github(token, 'GET', `/repos/${fullName(repo)}/contents/${WORKFLOW_PATH}?ref=${claims.workflow_sha}`);
  if (file.status !== 200 || decoded(file.body.content) !== WORKFLOW) return reply(403, { message: 'No.', reason: 'edited' });

  const [learners, leaders, known] = await Promise.all([
    db.from('enrollments').select('user_id, profiles(display_name, github_login)').eq('cohort_id', s.data.cohort_id),
    db.from('cohort_teachers').select('user_id, profiles(display_name, github_login)').eq('cohort_id', s.data.cohort_id),
    db.from('talk_names').select('label, user_id').eq('cohort_id', s.data.cohort_id),
  ]);
  if (learners.error || leaders.error || known.error) return reply(500, { message: 'The people could not be read.' });
  // deno-lint-ignore no-explicit-any
  const people = [...learners.data, ...leaders.data].map((p: any) => ({ id: p.user_id, name: p.profiles?.display_name || p.profiles?.github_login || '' }));

  if (body.action === 'start') {
    const id = driveId(s.data.recording_url);
    // deno-lint-ignore no-explicit-any
    const names = [...people, ...known.data.map((k: any) => ({ id: k.user_id, name: k.label }))];
    return id ? reply(200, { file: id, names }) : reply(404, { message: 'No recording.' });
  }
  if (body.action === 'fail') {
    await db.from('session_reads').update({ state: 'failed', problem: String(body.problem || 'no details').slice(0, 200), finished_at: new Date().toISOString() }).eq('session_id', s.data.id);
    return reply(200, { kept: false });
  }
  if (body.action === 'finish') {
    const read = clean(body, people.map((p) => p.id));
    if (!read) return reply(422, { message: 'That is not a reading.' });
    const gone = await db.from('session_talk').delete().eq('session_id', s.data.id);
    if (gone.error) return reply(500, { message: gone.error.message });
    const rows = read.turns.map((t) => ({ ...t, session_id: s.data.id, cohort_id: s.data.cohort_id }));
    const put = rows.length ? await db.from('session_talk').insert(rows) : { error: null };
    if (put.error) return reply(500, { message: put.error.message });
    await db.from('session_reads').update({ state: 'done', read_seconds: read.seconds, problem: null, finished_at: new Date().toISOString() }).eq('session_id', s.data.id);
    return reply(200, { kept: rows.length });
  }
  return reply(400, { message: 'Say start, finish, or fail.' });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const key = Deno.env.get('REMINDERS_KEY') || '';
  const given = req.headers.get('x-reminders-key') || '';
  if (given) return key && sameKey(given, key) ? tick(db) : reply(401, { message: 'No.' });
  return job(db, req, (req.headers.get('authorization') || '').replace(/^Bearer /, ''));
});
