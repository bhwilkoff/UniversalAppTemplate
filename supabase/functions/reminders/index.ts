// reminders: what Supabase Cron asks for every ten minutes. GitHub does
// the sending: the app comments on an issue in each person's own private
// repository, and GitHub emails them (research/notes/notifications-notes.md,
// where the test of that is written down). Comments cannot be private in a
// shared repository, which is why each person has their own.
//
// Each run: put right anyone whose invitation was accepted without the hub
// hearing, then for each person say what is new at once, and what is open
// once a day. Everything is read again here, so finished work is never
// mentioned. Words and timing are in assets/reminders-lib.js.
//
// Who may call: the x-reminders-key header. Send { dry: true } to see every
// message without sending, and { only: '<slug>' } for one cohort.
// Secrets: REMINDERS_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY,
// GITHUB_APP_INSTALLATION_ID. Deploy with tools/deploy-reminders.sh.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import './reminders-lib.js';
import { collaboratorRequest, repoName, wantedRole } from './plan.js';

// deno-lint-ignore no-explicit-any
const R = (globalThis as any).ReminderLib;
const ORG = 'humanshaped';
const json = { 'Content-Type': 'application/json' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: json });
const pause = () => new Promise((f) => setTimeout(f, 1100));

function sameKey(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });
  const key = Deno.env.get('REMINDERS_KEY') || '';
  if (!key || !sameKey(req.headers.get('x-reminders-key') || '', key)) return reply(401, { message: 'No.' });
  const input = await req.json().catch(() => ({}));
  const dry = !!input.dry, now = new Date();

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const token = await appToken();
  if (!token) return reply(503, { message: 'The GitHub App is not set up.' });
  const gh = github(token);

  let cq = db.from('cohorts').select('id, slug, title, time_zone, github_repo, details').in('status', ['open', 'running']).not('github_repo', 'is', null);
  if (input.only) cq = cq.eq('slug', input.only);
  const cohorts = (await cq).data || [];
  const ids = cohorts.map((c) => c.id);
  if (!ids.length) return reply(200, { sent: [], note: 'No cohorts.' });

  const [members, leaders, threads, stops, sessions, access, roles, feedback] = await Promise.all([
    db.from('enrollments').select('cohort_id, user_id, status, profiles(github_login, display_name)').in('cohort_id', ids).neq('status', 'left'),
    db.from('cohort_teachers').select('cohort_id, user_id, profiles(github_login, display_name)').in('cohort_id', ids),
    db.from('reminder_threads').select('*').in('cohort_id', ids),
    db.from('reminder_choices').select('user_id').eq('stopped', true),
    db.from('sessions').select('cohort_id, number, starts_at').in('cohort_id', ids).gt('starts_at', now.toISOString()).order('starts_at'),
    db.from('github_access').select('cohort_id, user_id').in('cohort_id', ids).eq('state', 'invited'),
    db.from('repo_roles').select('cohort_id, user_id, role').in('cohort_id', ids),
    db.rpc('reminder_leader_items'),
  ]);
  const bad = [members, leaders, threads, stops, sessions, access, roles, feedback].find((r) => r.error);
  if (bad) return reply(500, { message: bad.error!.message });

  const problems: string[] = [], repaired: string[] = [], sent: unknown[] = [];
  const login = (p: unknown) => (p as { github_login?: string } | null)?.github_login || '';

  // An invitation accepted without the hub hearing: GitHub is the truth.
  for (const a of access.data!) {
    const m = members.data!.find((x) => x.user_id === a.user_id && x.cohort_id === a.cohort_id);
    const l = (leaders.data!.find((x) => x.user_id === a.user_id && x.cohort_id === a.cohort_id));
    const who = login((m || l)?.profiles);
    if (!who || !(await isMember(gh, who))) continue;
    repaired.push(who);
    if (dry) continue;
    const cohort = cohorts.find((c) => c.id === a.cohort_id)!;
    const chosen = roles.data!.find((r) => r.user_id === a.user_id && r.cohort_id === a.cohort_id)?.role;
    const want = wantedRole({ teaches: !!l, enrolled: !!m, chosen });
    const q = collaboratorRequest(repoName(cohort), who, want);
    const r = await gh(q.method, q.path, q.body);
    if (r.status >= 300) { problems.push(`${who}: role ${r.status}`); continue; }
    await db.from('github_access').update({ state: 'member', detail: null, repo_role: want, updated_at: now.toISOString() }).eq('cohort_id', a.cohort_id).eq('user_id', a.user_id);
  }

  // Read after the repair, so a mended invitation is not mentioned.
  const open = await db.rpc('reminder_open_items');
  if (open.error) return reply(500, { message: open.error.message });
  const seen = (threads.data!).map((t) => Date.parse(t.events_seen_at));
  const since = new Date(seen.length ? Math.min(...seen) : now.getTime() - 3600000).toISOString();
  const events = await db.rpc('reminder_events', { since });
  if (events.error) return reply(500, { message: events.error.message });
  const stopped = new Set(stops.data!.map((s) => s.user_id));

  for (const c of cohorts) {
    if (c.details?.reminders === 'off') continue;
    const next = sessions.data!.find((s) => s.cohort_id === c.id) || null;
    const common = { slug: c.slug, zone: c.time_zone, nextStart: next?.starts_at || null, nextNumber: next?.number ?? null };
    const itemsOf = (uid: string) => open.data.filter((o: { user_id: string; cohort_id: string }) => o.user_id === uid && o.cohort_id === c.id);
    const thread = (uid: string) => threads.data!.find((t) => t.user_id === uid && t.cohort_id === c.id) || null;
    const fresh = (uid: string) => {
      const t = thread(uid);
      const from = t ? Date.parse(t.events_seen_at) : now.getTime();
      return events.data.filter((e: { user_id: string; cohort_id: string; at: string }) => e.user_id === uid && e.cohort_id === c.id && Date.parse(e.at) > from);
    };
    const repoIssues = (await gh('GET', `/repos/${c.github_repo}/issues?state=open&per_page=10`)).body;
    const issues = (Array.isArray(repoIssues) ? repoIssues : []).filter((i: { pull_request?: unknown }) => !i.pull_request);
    const waiting = feedback.data.find((f: { cohort_id: string }) => f.cohort_id === c.id)?.waiting || 0;

    const send = async (uid: string, who: string, due: boolean, body: string | null) => {
      if (!body) return;
      if (dry) { sent.push({ to: who, cohort: c.slug, digest: due, body }); return; }
      const ok = await deliver(db, gh, uid, who, c, thread(uid), body, due, now, problems);
      if (ok) sent.push({ to: who, cohort: c.slug, digest: due });
      await pause();
    };

    for (const m of members.data!.filter((x) => x.cohort_id === c.id)) {
      if (stopped.has(m.user_id)) continue;
      const who = login(m.profiles);
      if (!who) continue;
      const items = itemsOf(m.user_id), news = fresh(m.user_id), t = thread(m.user_id);
      const due = R.digestDue({ now, zone: c.time_zone, lastOn: t?.last_digest_on || null, nextStart: common.nextStart, hasItems: items.length > 0 });
      if (!due && !news.length) continue;
      await send(m.user_id, who, due, R.learnerMessage({ ...common, login: who, items: due ? items : [], events: news }));
    }

    const people = members.data!.filter((x) => x.cohort_id === c.id).map((m) => ({
      name: (m.profiles as { display_name?: string } | null)?.display_name || login(m.profiles),
      items: itemsOf(m.user_id),
    })).filter((p) => p.items.length);
    for (const l of leaders.data!.filter((x) => x.cohort_id === c.id)) {
      if (stopped.has(l.user_id)) continue;
      const who = login(l.profiles);
      if (!who) continue;
      const news = fresh(l.user_id), t = thread(l.user_id);
      const due = R.digestDue({ now, zone: c.time_zone, lastOn: t?.last_digest_on || null, nextStart: common.nextStart, hasItems: people.length > 0 || issues.length > 0 || waiting > 0 });
      if (!due && !news.length) continue;
      await send(l.user_id, who, due, R.leaderMessage({ ...common, login: who, events: news, people: due ? people : [], issues: due ? issues : [], feedback: due ? waiting : 0 }));
    }
  }
  return reply(problems.length ? 207 : 200, { dry, repaired, sent, problems });
});

// deno-lint-ignore no-explicit-any
type GH = (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any }>;

async function isMember(gh: GH, who: string) {
  return (await gh('GET', `/orgs/${ORG}/members/${encodeURIComponent(who)}`)).status === 204;
}

// One message into the person's own thread, making the repository and
// issue the first time. Only an organization member is added: adding
// anyone else would send them a second invitation.
// deno-lint-ignore no-explicit-any
async function deliver(db: any, gh: GH, uid: string, who: string, c: { id: string; title: string }, t: any, body: string, due: boolean, now: Date, problems: string[]) {
  const stamp: Record<string, string> = { events_seen_at: now.toISOString() };
  if (due) stamp.last_digest_on = R.localDay(now, (c as unknown as { time_zone: string }).time_zone);
  if (t) {
    const r = await gh('POST', `/repos/${ORG}/${t.repo}/issues/${t.issue_number}/comments`, { body });
    if (r.status >= 300) { problems.push(`${who}: comment ${r.status}`); return false; }
    await db.from('reminder_threads').update(stamp).eq('user_id', uid).eq('cohort_id', c.id);
    return true;
  }
  if (!(await isMember(gh, who))) return false;
  const repo = R.repoFor(who);
  const made = await gh('POST', `/orgs/${ORG}/repos`, { name: repo, private: true, has_issues: true, has_wiki: false, has_projects: false, description: `Reminders for ${who} from Human Shaped. Only you and the organization's owners can see this.` });
  if (made.status >= 300 && made.status !== 422) { problems.push(`${who}: repository ${made.status}`); return false; }
  const add = await gh('PUT', `/repos/${ORG}/${repo}/collaborators/${encodeURIComponent(who)}`, { permission: 'triage' });
  if (add.status >= 300) { problems.push(`${who}: access ${add.status}`); return false; }
  const issue = await gh('POST', `/repos/${ORG}/${repo}/issues`, { title: R.issueTitle(c.title), body });
  if (issue.status >= 300) { problems.push(`${who}: issue ${issue.status}`); return false; }
  const saved = await db.from('reminder_threads').insert({ user_id: uid, cohort_id: c.id, repo, issue_number: issue.body.number, ...stamp });
  if (saved.error) { problems.push(`${who}: ${saved.error.message}`); return false; }
  return true;
}

function github(token: string): GH {
  return async (method, path, body) => {
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'humanshaped-reminders', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
  };
}

async function appToken(): Promise<string | null> {
  try {
    const auth = createAppAuth({ appId: Deno.env.get('GITHUB_APP_ID')!, privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!, installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')) });
    return (await auth({ type: 'installation' })).token;
  } catch (err) {
    console.error('reminders: GitHub App auth failed:', (err as Error).message);
    return null;
  }
}
