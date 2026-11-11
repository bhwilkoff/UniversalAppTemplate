// course-import: brings a course in from Minerva's Course Builder as a draft
// cohort with sessions you set (DECISIONS.md, "Courses come in from Course
// Builder"; the shape of the export is in convert.js).
//
// A leader posts { export_url } with their own token. The link is single-use
// and needs an import_url, so this function opens it once with its own
// address and a secret, and Course Builder posts the course back here about
// a minute later as a form field, exported_course. That post carries no
// account, so it is taken only with the secret of an import still waiting.
// The leader's page reads course_imports to see how it went.
//
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY itself.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { convert } from './convert.js';

const ALLOWED_ORIGINS = ['https://humanshaped.org', 'https://www.humanshaped.org'];
const EXPORT = /^https:\/\/coursebuilder\.minerva\.edu\/api\/v2\/export\/courseexport\/(\d{1,9})\/([0-9a-f]{32})\/?$/;
const SELF = 'https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/course-import';

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
    const part = String(jwt || '').split('.')[1];
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof json.client_id === 'string' && json.client_id !== '';
  } catch (_) { return false; }
}
function slugFrom(text: string) {
  return String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '') || 'imported-course';
}
function hex(n: number) {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

// deno-lint-ignore no-explicit-any
async function build(db: any, leader: string, course: any) {
  const plan = convert(course);
  // An address no other cohort uses.
  const base = slugFrom(plan.cohort.title);
  let slug = base, n = 1;
  while (true) {
    const taken = await db.from('cohorts').select('id').eq('slug', slug).maybeSingle();
    if (!taken.data) break;
    n += 1; slug = base + '-' + n;
    if (n > 50) throw new Error('No free address for this cohort.');
  }
  const c = await db.from('cohorts').insert(Object.assign({}, plan.cohort, {
    slug, created_by: leader, status: 'draft', weeks: Math.max(1, Math.min(26, plan.sessions.length)),
  })).select('id').single();
  if (c.error) throw new Error('The cohort could not be made: ' + c.error.message);
  const cohortId = c.data.id;
  const refs: Record<string, string> = {};
  const later: { id: string; ref: string; config: Record<string, unknown>; key: string }[] = [];
  for (const s of plan.sessions) {
    const row = await db.from('sessions').insert({ cohort_id: cohortId, number: s.number, title: s.title, before: s.before, readings: s.readings }).select('id').single();
    if (row.error) throw new Error('Session ' + s.number + ' could not be made: ' + row.error.message);
    const sid = row.data.id;
    // Workbooks first, so a breakout part can name its rooms' workbooks.
    const wbIds: Record<string, string> = {};
    for (const w of (s.workbooks || [])) {
      const made = await db.from('workbooks').insert({ cohort_id: cohortId, session_id: sid, kind: w.kind, position: w.position, title: w.title, source: w.source }).select('id').single();
      if (made.error) throw new Error('A workbook of session ' + s.number + ' ("' + w.title + '") could not be made: ' + made.error.message);
      wbIds[w.ref] = made.data.id;
    }
    for (const sc of s.scenes) {
      const config = Object.assign({}, sc.config);
      const pending = config.results_of_ref as string | undefined;
      delete config.results_of_ref;
      const pendingRerun = config.rerun_of_ref as string | undefined;
      delete config.rerun_of_ref;
      const wbRefs = config.workbooks_refs as string[] | undefined;
      delete config.workbooks_refs;
      if (wbRefs && wbRefs.length) config.workbooks = wbRefs.map((r) => wbIds[r]).filter(Boolean);
      const slides = sc.deck ? sc.deck.split('\n').filter((l: string) => !/^>/.test(l)).join('\n') : null;
      const ins = await db.from('scenes').insert({
        cohort_id: cohortId, session_id: sid, position: sc.position, kind: sc.kind, title: sc.title,
        minutes: sc.minutes, body: sc.body || null, config, slides, created_by: leader,
      }).select('id').single();
      if (ins.error) throw new Error('A part of session ' + s.number + ' ("' + sc.title + '") could not be made: ' + ins.error.message);
      const id = ins.data.id;
      if (sc.ref) refs[sc.ref] = id;
      if (pending) later.push({ id, ref: pending, config, key: 'results_of' });
      if (pendingRerun) later.push({ id, ref: pendingRerun, config, key: 'rerun_of' });
      if (sc.notes) {
        const note = await db.from('scene_notes').insert({ scene_id: id, cohort_id: cohortId, body: sc.notes });
        if (note.error) throw new Error('Notes for "' + sc.title + '" could not be saved: ' + note.error.message);
      }
      if (sc.deck) {
        const deck = await db.from('scene_decks').insert({ scene_id: id, cohort_id: cohortId, body: sc.deck });
        if (deck.error) throw new Error('Slides for "' + sc.title + '" could not be saved: ' + deck.error.message);
      }
    }
  }
  // A part that shows an earlier question's answers points at that part.
  for (const l of later) {
    if (!refs[l.ref]) continue;
    l.config[l.key] = refs[l.ref];
    await db.from('scenes').update({ config: l.config }).eq('id', l.id);
  }
  return { cohortId, counts: plan.counts, warnings: plan.warnings };
}

Deno.serve(async (req) => {
  const h = headers(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return new Response(JSON.stringify({ message: 'Use POST.' }), { status: 405, headers: h });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: h });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const url = new URL(req.url);

  // Course Builder's post: only for an import still waiting, with its secret.
  const receive = url.searchParams.get('receive');
  if (receive) {
    const nonce = url.searchParams.get('n') || '';
    const row = await db.from('course_imports').select('*').eq('id', receive).maybeSingle();
    if (!row.data || row.data.state !== 'waiting' || row.data.nonce !== nonce || Date.parse(row.data.created_at) < Date.now() - 3600000) {
      return reply(404, { message: 'No import is waiting here.' });
    }
    await db.from('course_imports').update({ state: 'received', updated_at: new Date().toISOString() }).eq('id', receive);
    try {
      const form = await req.formData();
      const course = JSON.parse(String(form.get('exported_course') || ''));
      const done = await build(db, row.data.created_by, course);
      await db.from('course_imports').update({ state: 'done', cohort_id: done.cohortId, counts: done.counts, warnings: done.warnings.slice(0, 200), updated_at: new Date().toISOString() }).eq('id', receive);
      return reply(200, { ok: true });
    } catch (e) {
      const problem = String((e as Error).message || e).slice(0, 1000);
      console.log('[course-import] ' + problem);
      await db.from('course_imports').update({ state: 'failed', problem, updated_at: new Date().toISOString() }).eq('id', receive);
      return reply(200, { ok: false });
    }
  }

  // A leader starting one.
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const { data: who, error: whoError } = await db.auth.getUser(jwt);
  if (whoError || !who.user) return reply(401, { message: 'Sign in first.' });
  if (isAgentToken(jwt)) return reply(403, { message: 'An AI agent cannot bring a course in.' });
  const teacher = await db.from('teachers').select('user_id').eq('user_id', who.user.id).maybeSingle();
  if (!teacher.data) return reply(403, { message: 'Only leaders can bring a course in.' });
  let body: { export_url?: string } = {};
  try { body = await req.json(); } catch (_) { /* empty */ }
  const link = String(body.export_url || '').trim().replace(/\?.*$/, '');
  const m = EXPORT.exec(link);
  if (!m) return reply(400, { message: 'That is not a Course Builder export link. It looks like https://coursebuilder.minerva.edu/api/v2/export/courseexport/1234/…/' });
  const nonce = hex(16);
  const made = await db.from('course_imports').insert({ created_by: who.user.id, course_ref: m[1], nonce }).select('id').single();
  if (made.error) return reply(500, { message: 'The import could not start: ' + made.error.message });
  const id = made.data.id;
  const target = SELF + '?receive=' + id + '&n=' + nonce;
  const out = await fetch(link.replace(/\/?$/, '/') + '?import_url=' + encodeURIComponent(target));
  if (!out.ok) {
    let said = '';
    try { said = (await out.json()).message || ''; } catch (_) { /* not JSON */ }
    const problem = said === 'Access token already used'
      ? 'That link was already used. Make a new export in Course Builder and paste its link without opening it.'
      : 'Course Builder said no' + (said ? ': ' + said : ' (' + out.status + ').');
    await db.from('course_imports').update({ state: 'failed', problem, updated_at: new Date().toISOString() }).eq('id', id);
    return reply(400, { message: problem, import_id: id });
  }
  return reply(200, { import_id: id });
});
