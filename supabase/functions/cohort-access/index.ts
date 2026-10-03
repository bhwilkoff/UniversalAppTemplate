// cohort-access: adds a person to their cohort's GitHub team when they
// join, and takes them off it when they leave, so the cohort's private
// conversation opens and closes with membership. The rules are in
// plan.js; this file only asks the database, asks GitHub, and records
// the answer in github_access.
//
// Secrets (set in Supabase, never in this repository):
//   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAppAuth } from 'npm:@octokit/auth-app@7';
import { plan, outcome } from './plan.js';

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

  let input: { action?: string; cohort_id?: string };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }
  if (!input.cohort_id) return reply(400, { message: 'Which cohort?' });

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

  // A short-lived token for the humanshaped installation of the GitHub App.
  let token: string;
  try {
    const auth = createAppAuth({
      appId: Deno.env.get('GITHUB_APP_ID')!,
      privateKey: Deno.env.get('GITHUB_APP_PRIVATE_KEY')!,
      installationId: Number(Deno.env.get('GITHUB_APP_INSTALLATION_ID')),
    });
    token = (await auth({ type: 'installation' })).token;
  } catch (err) {
    return reply(503, { message: 'The GitHub App is not set up yet: ' + (err as Error).message });
  }

  const gh = await fetch('https://api.github.com' + p.path, {
    method: p.method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'humanshaped-hub',
      ...(p.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: p.body ? JSON.stringify(p.body) : undefined,
  });
  const ghBody = gh.status === 204 ? null : await gh.json().catch(() => null);
  const result = outcome(p.method, gh.status, ghBody);

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
