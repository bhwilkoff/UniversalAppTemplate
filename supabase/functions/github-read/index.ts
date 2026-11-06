// github-read: what a slide shows from GitHub, for anyone in the cohort
// (SESSION-DESIGN.md). github.com cannot be framed, so a slide draws GitHub's
// data itself. The app's own token reads, so a guest or a learner with no GitHub
// sees the cohort's private repository too, and nobody approves anything. It
// reads only: the cohort's own repository, or any public one.
//
// { cohort_id, repo: 'owner/name', show: 'issues' | 'pulls' | 'commits' | 'readme' | 'repo' }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';

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

const SHOWS = ['issues', 'pulls', 'commits', 'readme', 'repo'];
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const held = new Map<string, { at: number; body: unknown }>();

async function appToken(): Promise<string | null> {
  try {
    const auth = createAppAuth({
      appId: Deno.env.get('GITHUB_APP_ID')!,
      privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!,
      installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')),
    });
    return (await auth({ type: 'installation' })).token;
  } catch (err) {
    console.error('github-read: GitHub App auth failed:', (err as Error).message);
    return null;
  }
}
async function gh(token: string, path: string, accept = 'application/vnd.github+json') {
  const res = await fetch('https://api.github.com' + path, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'humanshaped-hub' },
  });
  return { status: res.status, body: accept.includes('raw') ? await res.text() : await res.json().catch(() => null) };
}

Deno.serve(async (req) => {
  const h = headers(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: who, error } = await db.auth.getUser(jwt);
  if (error || !who.user) return reply(401, { message: 'Sign in first.' });
  const uid = who.user.id;

  let input: { cohort_id?: string; repo?: string; show?: string };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }
  const { cohort_id: cohortId, repo, show } = input;
  if (!cohortId || !repo || !REPO.test(repo) || !SHOWS.includes(show || '')) return reply(400, { message: 'Name a repository and what to show.' });

  const [cohort, enrolled, leads, guest] = await Promise.all([
    db.from('cohorts').select('github_repo').eq('id', cohortId).maybeSingle(),
    db.from('enrollments').select('user_id').eq('cohort_id', cohortId).eq('user_id', uid).neq('status', 'left').maybeSingle(),
    db.from('cohort_teachers').select('user_id').eq('cohort_id', cohortId).eq('user_id', uid).maybeSingle(),
    db.from('call_guests').select('user_id').eq('cohort_id', cohortId).eq('user_id', uid).maybeSingle(),
  ]);
  if (!enrolled.data && !leads.data && !guest.data) return reply(403, { message: 'Only people in this cohort can read this.' });

  const key = `${repo.toLowerCase()}|${show}`;
  const kept = held.get(key);
  const own = (cohort.data?.github_repo || '').toLowerCase() === repo.toLowerCase();
  const token = await appToken();
  if (!token) return reply(503, { message: 'GitHub cannot be reached just now.' });

  const about = await gh(token, `/repos/${repo}`);
  if (about.status !== 200) return reply(200, { error: 'That repository could not be found, or it is private.' });
  if (about.body.private && !own) return reply(200, { error: 'Only this cohort’s own private repository can be shown.' });
  if (kept && Date.now() - kept.at < 60000) return reply(200, kept.body);

  const by = (x: { user?: { login?: string } | null }) => x.user?.login || 'someone';
  let body: unknown;
  if (show === 'issues' || show === 'pulls') {
    const r = await gh(token, show === 'issues' ? `/repos/${repo}/issues?state=open&per_page=20` : `/repos/${repo}/pulls?state=open&per_page=8`);
    const rows = (Array.isArray(r.body) ? r.body : []).filter((x: { pull_request?: unknown }) => show === 'pulls' || !x.pull_request).slice(0, 6);
    body = { rows: rows.map((x: { number: number; title: string; html_url: string; user?: { login?: string } }) => ({ n: x.number, title: x.title.slice(0, 90), by: by(x), url: x.html_url })) };
  } else if (show === 'commits') {
    const r = await gh(token, `/repos/${repo}/commits?per_page=6`);
    body = { rows: (Array.isArray(r.body) ? r.body : []).map((x: { html_url: string; commit: { message: string; author?: { name?: string } }; author?: { login?: string } }) => ({
      title: x.commit.message.split('\n')[0].slice(0, 90), by: x.author?.login || x.commit.author?.name || 'someone', url: x.html_url,
    })) };
  } else if (show === 'readme') {
    const r = await gh(token, `/repos/${repo}/readme`, 'application/vnd.github.raw+json');
    body = { text: r.status === 200 ? String(r.body).slice(0, 3000) : '' };
  } else {
    body = { about: { name: about.body.full_name, description: about.body.description || '', stars: about.body.stargazers_count, issues: about.body.open_issues_count, pushed: about.body.pushed_at } };
  }
  held.set(key, { at: Date.now(), body });
  return reply(200, body);
});
