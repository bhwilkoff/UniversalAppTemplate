// notices: the one door through which meet@humanshaped.org's Apps Script
// learns who asked to be emailed when something is waiting for them on
// the hub, and says which emails it sent (research/notes/reach-notes.md,
// migration 20261003220000). It hands over an address and two counts per
// person, never the words of a note or of feedback.
//
// Who may call: meet@humanshaped.org itself, shown by the Google ID token
// its Apps Script sends (ScriptApp.getIdentityToken(), checked in
// ../_shared/google-id.js), so nobody pastes a secret anywhere. While the
// older NOTICES_SECRET is still set in Supabase, that secret in the
// x-notices-secret header is accepted too.
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.
// Deploy with verify_jwt off: the caller is a script, not a person.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { callerAllowed } from '../_shared/google-id.js';

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
    get: (k: string) => Deno.env.get(k), secretName: 'NOTICES_SECRET', secretHeader: 'x-notices-secret', sameSecret, fetchFn: fetch,
  });
  if (!who.ok) return reply(401, { message: 'No.', reason: who.reason });

  let input: { action?: string; ids?: unknown };
  try { input = await req.json(); } catch { return reply(400, { message: 'Send JSON.' }); }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  if (input.action === 'digest') {
    const { data, error } = await db.rpc('notice_digest');
    if (error) return reply(500, { message: error.message });
    return reply(200, { people: data });
  }
  if (input.action === 'sent') {
    const ids = Array.isArray(input.ids) ? input.ids.filter((x) => typeof x === 'string' && UUID.test(x)) : [];
    if (!ids.length || ids.length > 500) return reply(400, { message: 'Which people?' });
    const { data, error } = await db.rpc('mark_notified', { ids });
    if (error) return reply(500, { message: error.message });
    return reply(200, { marked: data });
  }
  return reply(400, { message: 'Ask for digest or sent.' });
});
