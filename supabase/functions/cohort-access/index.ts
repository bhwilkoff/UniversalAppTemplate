// cohort-access: adds a person to their cohort's GitHub team when they
// join, and takes them off it when they leave, so the cohort's private
// conversation opens and closes with membership. The rules are in
// plan.js; this file only asks the database, asks GitHub, and records
// the answer in github_access.
//
// "provision", asked by a teacher of the cohort, makes the conversation
// itself: the private repository with Discussions on and the secret team
// that reads it (rules in provision.js). It needs the GitHub App to have
// the repository Administration permission as well as Members.
//
// Secrets (set in Supabase, never in this repository):
//   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import { plan, outcome } from './plan.js';
import {
  mayProvision, namesFor, stepsFor, repoRequest, teamRequest, teamReadRequest,
  discussionsMutation, recorded, isAgentToken,
} from './provision.js';

const ALLOWED_ORIGINS = ['https://humanshaped.org', 'https://www.humanshaped.org'];

function headers(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req) => {
  const h = headers(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return new Response(JSON.stringify({ message: 'Use POST.' }), { status: 405, headers: h });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Who is asking: the signed-in person's own token, checked by Supabase.
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: who, error: whoError } = await db.auth.getUser(jwt);
  if (whoError || !who.user) return reply(401, { message: 'Sign in first.' });
  const uid = who.user.id;
  // A person's AI agent reads the hub and never changes GitHub for them.
  if (isAgentToken(jwt)) return reply(403, { message: 'An AI agent cannot change who is in a cohort\u2019s conversation.' });

  let input: { action?: string; cohort_id?: string };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }
  if (!input.cohort_id) return reply(400, { message: 'Which cohort?' });
  if (input.action === 'provision') return provision(db, uid, input.cohort_id, reply);

  const [profile, cohort, enrollment, teacher] = await Promise.all([
    db.from('profiles').select('github_login').eq('id', uid).maybeSingle(),
    db.from('cohorts').select('id, github_team').eq('id', input.cohort_id).maybeSingle(),
    db.from('enrollments').select('status').eq('cohort_id', input.cohort_id).eq('user_id', uid).maybeSingle(),
    db.from('cohort_teachers').select('user_id').eq('cohort_id', input.cohort_id).eq('user_id', uid).maybeSingle(),
  ]);
  const failed = [profile, cohort, enrollment, teacher].find((r) => r.error);
  if (failed) return reply(500, { message: 'The hub could not be read: ' + failed.error!.message });

  const p = plan({
    action: input.action,
    login: profile.data?.github_login,
    cohort: cohort.data,
    enrollment: enrollment.data,
    teaches: !!teacher.data,
  });
  if (!p.ok) return reply(p.status, { message: p.message });

  const token = await appToken();
  if (!token) return reply(503, { message: 'The cohort\u2019s conversation is not connected to GitHub yet. Try again later, or tell your teacher.' });

  const gh = await github(token, p.method, p.path, p.body);
  const result = outcome(p.method, gh.status, gh.body);

  const saved = await db.from('github_access').upsert({
    cohort_id: input.cohort_id,
    user_id: uid,
    state: result.state,
    detail: result.detail,
    updated_at: new Date().toISOString(),
  });
  if (saved.error) return reply(500, { message: 'GitHub answered, but the hub could not record it: ' + saved.error.message, ...result });

  return reply(result.state === 'failed' ? 502 : 200, result);
});

// A short-lived token for the humanshaped installation of the GitHub App,
// or null when the App is not set up.
async function appToken(): Promise<string | null> {
  try {
    const auth = createAppAuth({
      appId: Deno.env.get('GITHUB_APP_ID')!,
      privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!,
      installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')),
    });
    return (await auth({ type: 'installation' })).token;
  } catch (err) {
    console.error('cohort-access: GitHub App auth failed:', (err as Error).message);
    return null;
  }
}

async function github(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch('https://api.github.com' + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'humanshaped-hub',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body: json };
}

// Make the cohort's private repository and secret team, or finish making
// them, and record them on the cohort. Each step is checked against what
// GitHub says exists first, so asking twice never makes two of anything.
// deno-lint-ignore no-explicit-any
async function provision(db: any, uid: string, cohortId: string, reply: (s: number, b: unknown) => Response) {
  const [cohort, teacher] = await Promise.all([
    db.from('cohorts').select('id, slug, title, status, github_repo, github_team, created_by').eq('id', cohortId).maybeSingle(),
    db.from('cohort_teachers').select('user_id').eq('cohort_id', cohortId).eq('user_id', uid).maybeSingle(),
  ]);
  if (cohort.error || teacher.error) return reply(500, { message: 'The hub could not be read: ' + (cohort.error || teacher.error).message });
  const c = cohort.data;
  const allowed = mayProvision({ agent: false, cohort: c, teaches: !!teacher.data || (c && c.created_by === uid) });
  if (!allowed.ok) return reply(allowed.status, { message: allowed.message });
  const names = namesFor(c);
  if (!names.ok) return reply(names.status, { message: names.message });

  const token = await appToken();
  if (!token) return reply(503, { message: 'The hub cannot reach GitHub just now. Try again later, or tell Ben.' });

  const repoNow = await github(token, 'GET', `/repos/humanshaped/${encodeURIComponent(names.repo)}`);
  const teamNow = await github(token, 'GET', `/orgs/humanshaped/teams/${encodeURIComponent(names.team)}`);
  const reachNow = teamNow.status === 200
    ? await github(token, 'GET', `/orgs/humanshaped/teams/${encodeURIComponent(names.team)}/repos/humanshaped/${encodeURIComponent(names.repo)}`)
    : { status: 404, body: null };
  for (const r of [repoNow, teamNow]) {
    if (r.status !== 200 && r.status !== 404) return reply(502, { message: `GitHub answered ${r.status} while looking: ${r.body?.message || 'no details'}` });
  }
  const plan = stepsFor({
    cohort: c, names,
    repo: repoNow.status === 200 ? repoNow.body : null,
    team: teamNow.status === 200 ? teamNow.body : null,
    teamCanRead: reachNow.status === 200 || reachNow.status === 204,
  });
  if (!plan.ok) return reply(plan.status, { message: plan.message });

  let repo = repoNow.status === 200 ? repoNow.body : null;
  const done: string[] = [];
  const fail = (step: string, r: { status: number; body: { message?: string } | null }) =>
    reply(502, {
      message: `GitHub refused at "${step}" (${r.status}: ${String(r.body?.message || 'no details').slice(0, 200)}). ` +
        (r.status === 403 ? 'The Human Shaped Hub app may need the repository Administration permission; Ben can grant it. ' : '') +
        'Press the button again once that is fixed, and it picks up where it stopped.',
      done,
    });

  for (const step of plan.steps) {
    if (step === 'create-repo') {
      const q = repoRequest(c, names);
      const r = await github(token, q.method, q.path, q.body);
      if (r.status !== 201) return fail(step, r);
      repo = r.body;
    } else if (step === 'turn-on-discussions') {
      const q = discussionsMutation(repo.node_id);
      const r = await github(token, 'POST', '/graphql', q);
      if (r.status !== 200 || r.body?.errors) return fail(step, { status: r.status, body: { message: r.body?.errors?.[0]?.message } });
    } else if (step === 'create-team') {
      const q = teamRequest(c, names);
      const r = await github(token, q.method, q.path, q.body);
      if (r.status !== 201) return fail(step, r);
    } else if (step === 'let-team-read') {
      const q = teamReadRequest(names);
      const r = await github(token, q.method, q.path, q.body);
      if (r.status !== 204) return fail(step, r);
    } else if (step === 'record') {
      const saved = await db.from('cohorts').update(recorded(names)).eq('id', c.id);
      if (saved.error) return reply(500, { message: 'GitHub is ready, but the hub could not record it: ' + saved.error.message, done });
    }
    done.push(step);
  }
  return reply(200, { state: 'ready', ...recorded(names), done });
}
