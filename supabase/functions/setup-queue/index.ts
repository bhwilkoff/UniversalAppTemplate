// setup-queue: the one door through which meet@humanshaped.org's Apps
// Script (tools/meet-events, processSetupRequests) takes the requests
// teachers made on /teach/ to set up their cohort's calls, and says how
// each went (migration 20261004000000). Each claimed request comes with
// the cohort in the very shape /teach/'s "Copy the setup for the Meet
// script" gives, built by the same TeachLib.meetSetup, so the script
// treats it exactly as a pasted setup.
//
// Who may call: meet@humanshaped.org itself, shown by the Google ID token
// its Apps Script sends (ScriptApp.getIdentityToken(), checked in
// ../_shared/google-id.js), so nobody pastes a secret anywhere. While the
// older SETUP_QUEUE_SECRET is still set in Supabase, that secret in the
// x-setup-secret header is accepted too.
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.
// Deploy with tools/deploy-setup-queue.sh (verify_jwt off: the caller is a
// script, not a person), which puts assets/teach-lib.js beside this file.

import { createClient } from 'npm:@supabase/supabase-js@2';
import './teach-lib.js';
import { callerAllowed } from '../_shared/google-id.js';

// deno-lint-ignore no-explicit-any
const TeachLib = (globalThis as any).TeachLib;
const json = { 'Content-Type': 'application/json' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: json });

// The same answer however much of the secret matches.
function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { message: 'Use POST.' });
  const who = await callerAllowed(req, {
    get: (k: string) => Deno.env.get(k), secretName: 'SETUP_QUEUE_SECRET', secretHeader: 'x-setup-secret', sameSecret, fetchFn: fetch,
  });
  if (!who.ok) return reply(401, { message: 'No.', reason: who.reason });

  let input: { action?: string; id?: string; ok?: boolean; detail?: string; meet_url?: string; rooms?: unknown };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  if (input.action === 'claim') {
    const { data, error } = await db.rpc('claim_setup_requests', { n: 5 });
    if (error) return reply(500, { message: error.message });
    // deno-lint-ignore no-explicit-any
    const requests = (data || []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      setup: TeachLib.meetSetup(r.cohort, r.members || [], r.teachers || [], r.groups || []),
    }));
    return reply(200, { requests });
  }
  if (input.action === 'finish') {
    if (!input.id || !UUID.test(input.id)) return reply(400, { message: 'Which request?' });
    const rooms = input.rooms && typeof input.rooms === 'object' && !Array.isArray(input.rooms) ? input.rooms : null;
    const { data, error } = await db.rpc('finish_setup_request', {
      r: input.id,
      ok: input.ok === true,
      detail: String(input.detail || '').slice(0, 1000),
      meet_url: typeof input.meet_url === 'string' ? input.meet_url : null,
      rooms,
    });
    if (error) return reply(500, { message: error.message });
    return reply(200, { state: data });
  }
  return reply(400, { message: 'Ask to claim or finish.' });
});
