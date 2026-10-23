// github-token: a fresh GitHub token for the person asking, so no page ever
// says "sign in again" while their sign-in is good (JOURNEYS.md, the
// walk-through audit; migration 20261023020000).
//
//   { action: 'keep', refresh_token }  right after a GitHub sign-in or link:
//     trades it for a new pair at once (which proves it is good), checks the
//     token is this person's own GitHub account, keeps the refresh token,
//     and answers with the eight-hour token.
//   { action: 'get' }  from any page whose tab holds no token: the kept
//     token if it has time left, or a fresh one from the refresh token.
//   { action: 'forget' }  on sign-out.
//
// Only the person themselves can call it (their own sign-in, verify_jwt on,
// and never their AI agent's). The refresh token never leaves the server;
// the eight-hour token goes back to the person's own tab. Needs the
// GitHub App's client secret as GITHUB_APP_CLIENT_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CLIENT_ID, refreshBody, fromGitHub, stillGood } from './tokens.js';

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

function isAgentToken(jwt: string) {
  try {
    const part = jwt.split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof json.client_id === 'string' && json.client_id !== '';
  } catch { return false; }
}

async function refresh(secret: string, refreshToken: string) {
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: refreshBody(Deno.env.get('GITHUB_APP_CLIENT_ID') || CLIENT_ID, secret, refreshToken),
  });
  return fromGitHub(await r.json().catch(() => null), new Date());
}

async function githubId(token: string) {
  const r = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && typeof u.id === 'number' ? u.id : null;
}

Deno.serve(async (req) => {
  const h = headers(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: who, error: whoError } = await db.auth.getUser(jwt);
  if (whoError || !who.user) return reply(401, { message: 'Sign in first.' });
  if (isAgentToken(jwt)) return reply(403, { message: 'An AI agent does not get a GitHub token.' });
  const uid = who.user.id;

  let input: { action?: string; refresh_token?: string };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }

  if (input.action === 'forget') {
    await db.rpc('github_token_drop', { u: uid });
    return reply(200, { forgotten: true });
  }

  const secret = Deno.env.get('GITHUB_APP_CLIENT_SECRET');
  if (!secret) return reply(200, { token: null, reason: 'not set up' });

  if (input.action === 'keep') {
    const given = String(input.refresh_token || '');
    if (!given || given.length > 2000) return reply(400, { message: 'Which refresh token?' });
    const got = await refresh(secret, given);
    if ('problem' in got) return reply(200, { token: null, reason: got.problem });
    const [{ data: profile }, id] = await Promise.all([
      db.from('profiles').select('github_id').eq('id', uid).maybeSingle(),
      githubId(got.access),
    ]);
    if (!id || !profile || Number(profile.github_id) !== id) return reply(403, { message: 'That GitHub account is not the one on this sign-in.' });
    await db.rpc('github_token_put', { u: uid, gh: id, refresh: got.refresh, refresh_expires: got.refreshExpires, access: got.access, access_expires: got.accessExpires });
    return reply(200, { token: got.access, expires_at: got.accessExpires });
  }

  if (input.action === 'get') {
    const read = async () => ((await db.rpc('github_token_get', { u: uid })).data || [])[0] || null;
    const row = await read();
    if (!row) return reply(200, { token: null, reason: 'none' });
    if (stillGood(row, new Date())) return reply(200, { token: row.access_token, expires_at: row.access_expires_at });
    const got = await refresh(secret, row.refresh_token);
    if ('problem' in got) {
      // Another tab may have refreshed it a moment ago, retiring this one.
      const again = await read();
      if (again && stillGood(again, new Date())) return reply(200, { token: again.access_token, expires_at: again.access_expires_at });
      if (got.expired) await db.rpc('github_token_drop', { u: uid });
      return reply(200, { token: null, reason: got.problem });
    }
    await db.rpc('github_token_put', { u: uid, gh: row.github_id, refresh: got.refresh, refresh_expires: got.refreshExpires, access: got.access, access_expires: got.accessExpires });
    return reply(200, { token: got.access, expires_at: got.accessExpires });
  }

  return reply(400, { message: 'Ask to keep, get, or forget.' });
});
