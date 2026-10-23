// github-tick: what humanshaped/automation's hourly workflow asks for.
// For now, one job: open the discussion for each session starting within
// the day, so GitHub emails everyone watching the cohort's repository and
// the thread is ready for the session (rules in tick.js).
//
// Who may call: a workflow in humanshaped/automation, shown by the OIDC
// token GitHub Actions gives it, checked here against GitHub's published
// keys, so nobody pastes a secret anywhere.
//
// Secrets (set in Supabase, never in this repository):
//   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.
// Deploy with tools/deploy-github-tick.sh (verify_jwt off: the caller is
// a workflow, not a person), which puts the site's discussion helpers
// beside this file.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5';
import './discussions-lib.js';
import './session-thread-lib.js';
import { callerOk, due, whenLine, ISSUER, AUDIENCE } from './tick.js';

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).DiscussionsLib;
// deno-lint-ignore no-explicit-any
const S = (globalThis as any).SessionThreadLib;
const json = { 'Content-Type': 'application/json' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: json });
const KEYS = createRemoteJWKSet(new URL(ISSUER + '/.well-known/jwks'));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(jwt, KEYS, { issuer: ISSUER, audience: AUDIENCE }));
  } catch {
    return reply(401, { message: 'No.' });
  }
  const who = callerOk(claims);
  if (!who.ok) return reply(403, { message: 'No.', reason: who.reason });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600000).toISOString();
  const rows = await db.from('sessions')
    .select('id, cohort_id, number, title, starts_at, discussion_number, cohorts(slug, status, github_repo, time_zone)')
    .is('discussion_number', null).gt('starts_at', now.toISOString()).lte('starts_at', until);
  if (rows.error) return reply(500, { message: rows.error.message });
  const sessions = due(rows.data, now);
  if (!sessions.length) return reply(200, { opened: [] });

  const token = await appToken();
  if (!token) return reply(503, { message: 'The GitHub App is not set up.' });

  const opened: string[] = [];
  const problems: string[] = [];
  for (const s of sessions) {
    const repo = s.cohorts.github_repo;
    const found = await graphql(token, S.BY_NUMBER, S.variables(repo, null));
    const where = found.data ? S.shape(found.data) : null;
    const category = where ? S.category(where.categories) : null;
    if (!where || !category) { problems.push(`${repo} week ${s.number}: ${found.problem || 'no category to post in'}`); continue; }
    const live = 'https://humanshaped.org/session/?c=' + encodeURIComponent(s.cohorts.slug) + '&s=' + Number(s.number);
    const body = S.body(s, live) + '\n\n' + whenLine(s.starts_at, s.cohorts.time_zone);
    const made = await graphql(token, D.CREATE, { repositoryId: where.repositoryId, categoryId: category.id, title: S.title(s), body });
    const number = made.data?.createDiscussion?.discussion?.number;
    if (!number) { problems.push(`${repo} week ${s.number}: ${made.problem || 'not made'}`); continue; }
    // A leader may have opened one from /live/ in the meantime; theirs stays.
    const saved = await db.from('sessions').update({ discussion_number: number }).eq('id', s.id).is('discussion_number', null).select('id');
    if (saved.error || !saved.data.length) problems.push(`${repo} week ${s.number}: made #${number}, but the session already had a thread`);
    else opened.push(`${repo}#${number}`);
  }
  return reply(problems.length ? 207 : 200, { opened, problems });
});

async function appToken(): Promise<string | null> {
  try {
    const auth = createAppAuth({
      appId: Deno.env.get('GITHUB_APP_ID')!,
      privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!,
      installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')),
    });
    return (await auth({ type: 'installation' })).token;
  } catch (err) {
    console.error('github-tick: GitHub App auth failed:', (err as Error).message);
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function graphql(token: string, query: string, variables: unknown): Promise<{ data?: any; problem?: string }> {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'humanshaped-tick' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) return { problem: (j.errors?.[0]?.message || j.message || 'GitHub answered ' + r.status).slice(0, 200), data: j.data };
  return { data: j.data };
}
