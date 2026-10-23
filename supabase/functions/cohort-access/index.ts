// cohort-access: adds a person to their cohort's GitHub team when they
// join, and takes them off it when they leave, so the cohort's private
// conversation opens and closes with membership. The rules are in
// plan.js; this file only asks the database, asks GitHub, and records
// the answer in github_access.
//
// Each person also gets their own role on the repository, above the
// team's read access: a leader maintains, a learner writes unless a
// leader chose another role on humanshaped.org (repo_roles). "sync",
// asked by a leader, brings everyone's role on GitHub up to what Human
// Shaped records, takes off anyone who has left, and finishes any
// invitation that has since been accepted.
//
// "provision", asked by a teacher of the cohort, makes the conversation
// itself: the private repository with Discussions on and the secret team
// that reads it (rules in provision.js). It needs the GitHub App to have
// the repository Administration permission as well as Members, and,
// for the files it starts the repository with, Contents and Workflows.
//
// Secrets (set in Supabase, never in this repository):
//   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import { plan, outcome, wantedRole, repoName, collaboratorRequest, roleOutcome, syncStep } from './plan.js';
import {
  mayProvision, namesFor, stepsFor, repoRequest, teamRequest, teamReadRequest,
  discussionsMutation, recorded, isAgentToken, issuesRequest, seedFiles,
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
  if (input.action === 'sync') return sync(db, uid, input.cohort_id, reply);
  if (input.action === 'archive') return archive(db, uid, input.cohort_id, reply);

  const [profile, cohort, enrollment, teacher, chosen] = await Promise.all([
    db.from('profiles').select('github_login').eq('id', uid).maybeSingle(),
    db.from('cohorts').select('id, github_team, github_repo').eq('id', input.cohort_id).maybeSingle(),
    db.from('enrollments').select('status').eq('cohort_id', input.cohort_id).eq('user_id', uid).maybeSingle(),
    db.from('cohort_teachers').select('user_id').eq('cohort_id', input.cohort_id).eq('user_id', uid).maybeSingle(),
    db.from('repo_roles').select('role').eq('cohort_id', input.cohort_id).eq('user_id', uid).maybeSingle(),
  ]);
  const failed = [profile, cohort, enrollment, teacher, chosen].find((r) => r.error);
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
  const result: { state: string; detail: string | null } = outcome(p.method, gh.status, gh.body);

  // Their own role on the repository: set once they are in the
  // organization, taken off when they leave.
  let role: string | null = null;
  const repo = repoName(cohort.data);
  if (repo && (result.state === 'member' || result.state === 'removed')) {
    const want = result.state === 'member'
      ? wantedRole({ teaches: !!teacher.data, enrolled: !!enrollment.data && enrollment.data.status !== 'left', chosen: chosen.data?.role })
      : null;
    const q = collaboratorRequest(repo, profile.data!.github_login, want);
    const r = await github(token, q.method, q.path, q.body);
    const o = roleOutcome(q.method, r.status, r.body);
    if (o.ok) role = want;
    else result.detail = o.detail;
  }

  const saved = await db.from('github_access').upsert({
    cohort_id: input.cohort_id,
    user_id: uid,
    state: result.state,
    detail: result.detail,
    repo_role: role,
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
  const waiting: string[] = [];
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
    } else if (step === 'turn-on-issues') {
      const q = issuesRequest(names);
      const r = await github(token, q.method, q.path, q.body);
      if (r.status !== 200) return fail(step, r);
    } else if (step === 'write-files') {
      // The repository works without these, so a file GitHub refuses
      // (most often because the app has not been given Contents and
      // Workflows yet) is reported, never a failure.
      for (const f of seedFiles(c)) {
        const at = `/repos/humanshaped/${encodeURIComponent(names.repo)}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`;
        const there = await github(token, 'GET', at);
        if (there.status === 200) continue;
        const r = there.status === 404
          ? await github(token, 'PUT', at, { message: f.message, content: base64(f.content) })
          : there;
        if (r.status !== 201 && r.status !== 200) waiting.push(`${f.path} (${r.status}: ${String(r.body?.message || 'no details').slice(0, 120)})`);
      }
    }
    done.push(step);
  }
  return reply(200, { state: 'ready', ...recorded(names), done, waiting });
}

function base64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// A leader brings GitHub up to what Human Shaped records for everyone in
// the cohort (syncStep in plan.js decides what each person needs).
// deno-lint-ignore no-explicit-any
// A finished cohort's repository, archived when its leader says so
// (JOURNEYS.md, Ben's decision 9): everyone keeps reading it, and nothing
// new can be added. Only a leader of a finished cohort may.
// deno-lint-ignore no-explicit-any
async function archive(db: any, uid: string, cohortId: string, reply: (s: number, b: unknown) => Response) {
  const [cohort, leader] = await Promise.all([
    db.from('cohorts').select('id, status, github_repo, github_team').eq('id', cohortId).maybeSingle(),
    db.from('cohort_teachers').select('user_id').eq('cohort_id', cohortId).eq('user_id', uid).maybeSingle(),
  ]);
  if (!leader.data) return reply(403, { message: 'Only a leader of this cohort can do this.' });
  if (!cohort.data || cohort.data.status !== 'finished') return reply(409, { message: 'Mark the cohort finished first.' });
  const repo = repoName(cohort.data);
  if (!repo) return reply(409, { message: 'This cohort has no repository.' });
  const token = await appToken();
  if (!token) return reply(503, { message: 'Human Shaped cannot reach GitHub just now. Try again later.' });
  const r = await github(token, 'PATCH', '/repos/' + repo, { archived: true });
  if (r.status !== 200) return reply(502, { message: 'GitHub did not archive it: ' + (r.body?.message || r.status) });
  return reply(200, { archived: repo });
}

// deno-lint-ignore no-explicit-any
async function sync(db: any, uid: string, cohortId: string, reply: (s: number, b: unknown) => Response) {
  const [cohort, leaders, members, chosen, access] = await Promise.all([
    db.from('cohorts').select('id, github_repo, github_team').eq('id', cohortId).maybeSingle(),
    db.from('cohort_teachers').select('user_id, profiles(github_login)').eq('cohort_id', cohortId),
    db.from('enrollments').select('user_id, status, profiles(github_login)').eq('cohort_id', cohortId),
    db.from('repo_roles').select('user_id, role').eq('cohort_id', cohortId),
    db.from('github_access').select('user_id, state, repo_role').eq('cohort_id', cohortId),
  ]);
  const bad = [cohort, leaders, members, chosen, access].find((r) => r.error);
  if (bad) return reply(500, { message: 'Human Shaped could not be read: ' + bad.error.message });
  // deno-lint-ignore no-explicit-any
  if (!leaders.data.some((t: any) => t.user_id === uid)) return reply(403, { message: 'Only a leader of this cohort can do this.' });
  const c = cohort.data;
  const repo = repoName(c);
  if (!repo || !c.github_team) return reply(409, { message: 'This cohort does not have its repository yet.' });

  const token = await appToken();
  if (!token) return reply(503, { message: 'Human Shaped cannot reach GitHub just now. Try again later.' });

  // deno-lint-ignore no-explicit-any
  const people = new Map<string, any>();
  // deno-lint-ignore no-explicit-any
  for (const m of members.data as any[]) people.set(m.user_id, { id: m.user_id, login: m.profiles?.github_login, enrolled: m.status !== 'left' });
  // deno-lint-ignore no-explicit-any
  for (const t of leaders.data as any[]) people.set(t.user_id, { ...(people.get(t.user_id) || { id: t.user_id, login: t.profiles?.github_login }), teaches: true });
  // deno-lint-ignore no-explicit-any
  for (const r of chosen.data as any[]) if (people.has(r.user_id)) people.get(r.user_id).chosen = r.role;
  // deno-lint-ignore no-explicit-any
  for (const a of access.data as any[]) if (people.has(a.user_id)) people.get(a.user_id).access = a;

  const changed: string[] = [];
  const problems: { login: string; detail: string }[] = [];
  const membership = (login: string) => `/orgs/humanshaped/teams/${encodeURIComponent(c.github_team)}/memberships/${encodeURIComponent(login)}`;

  for (const p of people.values()) {
    const step = syncStep(p);
    if (!step) continue;
    let state = p.access.state;
    let role = p.access.repo_role;
    let detail: string | null = null;
    if (step.kind === 'remove') {
      await github(token, 'DELETE', membership(p.login));
      const q = collaboratorRequest(repo, p.login, null);
      const r = await github(token, q.method, q.path);
      const o = roleOutcome(q.method, r.status, r.body);
      if (o.ok) { state = 'removed'; role = null; } else detail = o.detail!;
    } else {
      if (step.kind === 'check-invitation' || step.kind === 'join') {
        const r = await github(token, step.kind === 'join' ? 'PUT' : 'GET', membership(p.login), step.kind === 'join' ? { role: p.teaches ? 'maintainer' : 'member' } : undefined);
        const o = outcome('PUT', r.status === 404 ? 404 : r.status, r.body);
        state = r.status === 404 ? 'failed' : o.state;
        detail = r.status === 404 ? 'Their invitation is gone. They can ask again from the cohort\u2019s Conversation.' : o.detail;
      }
      if (state === 'member') {
        const q = collaboratorRequest(repo, p.login, step.role);
        const r = await github(token, q.method, q.path, q.body);
        const o = roleOutcome(q.method, r.status, r.body);
        if (o.ok) role = step.role; else detail = o.detail!;
      }
    }
    if (detail) problems.push({ login: p.login, detail });
    if (state !== p.access.state || role !== p.access.repo_role || detail) {
      await db.from('github_access').update({ state, repo_role: role, detail, updated_at: new Date().toISOString() })
        .eq('cohort_id', cohortId).eq('user_id', p.id);
      if (!detail) changed.push(p.login);
    }
  }
  return reply(problems.length ? 207 : 200, { changed, problems });
}
