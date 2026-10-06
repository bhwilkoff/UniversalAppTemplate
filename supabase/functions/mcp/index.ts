// mcp: the hub's Model Context Protocol server, so a student's own AI
// agent (Claude or Gemini) knows their cohort, this week's challenge, the
// next session, their group, their own work, and the method itself
// (research/notes/agent-connection-notes.md).
//
// Read-only by design. The agent signs in through the hub's OAuth server
// as the student, every query below runs as the student under row-level
// security, and migration 6 refuses any write from an agent's token.
// Sharing what the agent said stays the student's own act, on the site.
//
// Teachers get three more tools (cohort_roster, student_work, class_now)
// for their own agent, refused to anyone who does not teach the cohort
// (research/notes/meet-classroom-design.md, C6). They are read-only too:
// what a teacher's agent makes of a student's work is the teacher's to
// give or not, and the hub never sends it.
//
// Deploy with verify_jwt off (the middleware checks tokens itself and must
// answer the unauthenticated discovery request), and include
// assets/cohort-lib.js, assets/teach-lib.js, assets/live-lib.js, and
// assets/followup-lib.js beside this file (tools/deploy-mcp.sh does), so
// the server and the site share one copy of the week, schedule, live
// session, and commits logic.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.0.0';
import { pipeline } from 'npm:@supabase/middleware@1';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1';
import { z } from 'npm:zod@^4.3.6';
import './cohort-lib.js';
import './teach-lib.js';
import './live-lib.js';
import './followup-lib.js';
import {
  chooseCohort, cohortsText, thisWeekText, nextSessionText, groupText, workText, thisSessionText,
  teacherCohort, rosterText, studentWorkText, classNowText, showLine,
  METHOD, methodUrls, ownAppText, ownReviewPrompt,
} from './shape.js';

// deno-lint-ignore no-explicit-any
const CohortLib = (globalThis as any).CohortLib;
// deno-lint-ignore no-explicit-any
const TeachLib = (globalThis as any).TeachLib;
// deno-lint-ignore no-explicit-any
const LiveLib = (globalThis as any).LiveLib;
// deno-lint-ignore no-explicit-any
const FollowupLib = (globalThis as any).FollowupLib;

const COHORT_COLUMNS = 'id, slug, title, status, starts_on, weeks, time_zone, session_weekday, session_time, session_minutes';
const cohortArg = z.object({
  cohort: z.string().optional().describe('The cohort\'s short name (its slug). Leave it out when you are in one cohort.'),
});
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const FOR_TEACHERS = ' Only for the people who teach the cohort; anyone else is told so and shown nothing. Read-only: it changes nothing, and whatever you make of it is the teacher\'s to give to the student or not, because the hub never sends what an agent wrote.';
const PEOPLE = 'user_id, role, status, app_name, app_repo, app_url, app_public, profiles(github_login, display_name)';

// The signed-in person's id, from the token the middleware has verified.
function userId(req: Request): string {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(payload)).sub;
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    // deno-lint-ignore no-explicit-any
    async (req: Request, { supabase }: any) => {
      const uid = userId(req);

      // Every cohort this person is in or teaches.
      async function myCohorts() {
        const [enrolled, teaching] = await Promise.all([
          supabase.from('enrollments').select(`role, cohorts(${COHORT_COLUMNS})`).eq('user_id', uid).neq('status', 'left'),
          supabase.from('cohort_teachers').select(`cohorts(${COHORT_COLUMNS})`).eq('user_id', uid),
        ]);
        if (enrolled.error) throw new Error(enrolled.error.message);
        if (teaching.error) throw new Error(teaching.error.message);
        const byId = new Map();
        // deno-lint-ignore no-explicit-any
        enrolled.data.forEach((e: any) => e.cohorts && byId.set(e.cohorts.id, { ...e.cohorts, role: e.role }));
        // deno-lint-ignore no-explicit-any
        teaching.data.forEach((t: any) => t.cohorts && byId.set(t.cohorts.id, { ...t.cohorts, role: 'teacher' }));
        return [...byId.values()];
      }
      async function pick(slug?: string) {
        return chooseCohort(await myCohorts(), slug);
      }
      async function sessionsOf(cohortId: string) {
        const r = await supabase.from('sessions').select('id, number, starts_at, title, scope, meet_url').eq('cohort_id', cohortId);
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }
      function when(iso: string, zone: string) {
        return new Date(iso).toLocaleString('en-US', {
          timeZone: zone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        });
      }
      async function methodText(part: string) {
        const urls = methodUrls(part);
        if (!urls) return `There is no part called "${part}". The parts are: ${Object.keys(METHOD).join(', ')}.`;
        const r = await fetch(urls.raw);
        if (!r.ok) return `The template could not be reached just now. Read it at ${urls.github}`;
        return `${await r.text()}\n\n(Read live from the Universal App Template: ${urls.github})`;
      }

      // ---- for teachers ------------------------------------------------
      // Every query below runs as the teacher, so row-level security
      // already limits it to cohorts they teach; teacherCohort refuses
      // everyone else first, because classmates can read a cohort's roster
      // and shares, and these tools are not for them.
      async function teacherPick(slug?: string) {
        return teacherCohort(await myCohorts(), slug);
      }
      async function peopleOf(cohortId: string) {
        const [people, teachers] = await Promise.all([
          supabase.from('enrollments').select(PEOPLE).eq('cohort_id', cohortId).neq('status', 'left'),
          supabase.from('cohort_teachers').select('user_id, profiles(github_login, display_name)').eq('cohort_id', cohortId),
        ]);
        if (people.error) throw new Error(people.error.message);
        if (teachers.error) throw new Error(teachers.error.message);
        const names: Record<string, string> = {};
        // deno-lint-ignore no-explicit-any
        people.data.concat(teachers.data).forEach((p: any) => {
          if (p.profiles) names[p.user_id] = p.profiles.display_name || p.profiles.github_login;
        });
        // deno-lint-ignore no-explicit-any
        return { people: people.data, teacherIds: teachers.data.map((t: any) => t.user_id), names };
      }
      // Commits pushed to the cohort's public repositories since a time,
      // read live from GitHub's public API (no sign-in, so 60 requests an
      // hour from this server's address) and never stored.
      // deno-lint-ignore no-explicit-any
      async function commitsSince(people: any[], since: string) {
        const repos = FollowupLib.cohortRepos(people).slice(0, 40);
        // deno-lint-ignore no-explicit-any
        const results = await Promise.all(repos.map(async (who: any) => {
          try {
            const r = await fetch(FollowupLib.commitsUrl(who.repo, since), {
              headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'humanshaped-mcp' },
            });
            if (r.status === 404) return { repo: who.repo, missing: true };
            if (r.status === 409) return { repo: who.repo, list: [] };   // nothing committed yet
            if (!r.ok) return { repo: who.repo, unavailable: r.status };
            return { repo: who.repo, list: FollowupLib.normalizeCommits(await r.json(), who) };
          } catch {
            return { repo: who.repo, unavailable: 0 };
          }
        }));
        return {
          // deno-lint-ignore no-explicit-any
          commits: FollowupLib.pushedSince(results.filter((r: any) => r.list).map((r: any) => r.list), since, 40),
          unread: FollowupLib.unreadText(results),
        };
      }

      // A person's own app outside any cohort, and their own path marks.
      // Each is read on its own, so an older database answers without them.
      async function ownApp() {
        const [app, hide, marks] = await Promise.all([
          supabase.from('builder_apps').select('app_repo, app_name, app_url, public').eq('user_id', uid).maybeSingle(),
          supabase.from('builder_app_hides').select('reason').eq('user_id', uid).maybeSingle(),
          supabase.from('stage_marks').select('stage, item, state, note').eq('user_id', uid),
        ]);
        return ownAppText(app.error ? null : app.data, hide.error ? null : hide.data, marks.error ? [] : marks.data);
      }

      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'humanshaped', version: '0.1.0' });

        server.registerTool('my_cohorts', {
          title: 'My cohorts',
          description: 'The Human Shaped cohorts this person is in or teaches, with each one\'s short name, status, dates, and page.',
          inputSchema: z.object({}),
          annotations: READ_ONLY,
        }, async () => text(cohortsText(await myCohorts())));

        server.registerTool('this_week', {
          title: 'This week',
          description: 'This week in a cohort: the teacher\'s challenge, the stages of the method it covers, and the weekly session time.',
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const p = await pick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const t = CohortLib.currentAndNext(await sessionsOf(c.id), new Date(), c.session_minutes);
          const stages = t.current ? CohortLib.stagesForWeek(t.current.number) : [];
          return text(thisWeekText(c, t, stages, TeachLib.scheduleText(c, c.time_zone, 'en-US')));
        });

        server.registerTool('next_session', {
          title: 'Next session',
          description: 'The next live session: when it is, its agenda, the Meet link, and what this person has shared since the last one.',
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const p = await pick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const sessions = await sessionsOf(c.id);
          const t = CohortLib.currentAndNext(sessions, new Date(), c.session_minutes);
          let since: unknown[] = [];
          if (t.next) {
            const started = sessions.filter((s: { starts_at: string }) => s.starts_at && Date.parse(s.starts_at) < Date.parse(t.next.starts_at));
            const after = started.length ? started.map((s: { starts_at: string }) => s.starts_at).sort().pop() : '1970-01-01T00:00:00Z';
            const r = await supabase.from('shares').select('kind, note, url, created_at').eq('cohort_id', c.id).eq('user_id', uid).gte('created_at', after);
            if (r.error) throw new Error(r.error.message);
            since = r.data;
          }
          return text(nextSessionText(c, t, CohortLib.agenda(c.session_minutes), t.next ? when(t.next.starts_at, c.time_zone) : '', since));
        });

        // The run of show for a session (R14): its show_state and the
        // scene it is on, read through the cohort's own read rules.
        async function showOf(sessionId: string, minutes: number) {
          const st = await supabase.from('show_state').select('current_scene, scene_started_at, stage').eq('session_id', sessionId).maybeSingle();
          if (st.error || !st.data || !st.data.current_scene) return null;
          const key = st.data.current_scene;
          // A scene the teacher wrote is named by its id; otherwise the
          // show runs the six parts of the agenda, named by their keys.
          const sc = await supabase.from('scenes').select('id, title, kind, minutes').eq('session_id', sessionId);
          // deno-lint-ignore no-explicit-any
          const own = sc.error ? null : (sc.data || []).find((x: any) => x.id === key) || null;
          // deno-lint-ignore no-explicit-any
          const part = own ? null : (CohortLib.agenda(minutes) || []).find((x: any) => x.key === key) || null;
          const scene = own ? { title: own.title, kind: own.kind, minutes: own.minutes } : part ? { title: part.name, kind: 'talk', minutes: part.minutes } : null;
          return scene ? { scene, startedAt: st.data.scene_started_at, stage: st.data.stage, now: Date.now() } : null;
        }

        server.registerTool('this_session', {
          title: 'This session',
          description: 'What is happening in the live session: how many are waiting in the "show your work" queue and where this person\'s own items are in it, and the teacher\'s open checks for understanding with this person\'s own answers and any count the teacher has chosen to show. Read-only; answering and adding to the queue happen on the session page, by the person.',
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const p = await pick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const t = CohortLib.currentAndNext(await sessionsOf(c.id), new Date(), c.session_minutes);
          const session = t.live ? t.next : (t.next || t.current);
          if (!session) return text(thisSessionText(c, null, false, [], [], [], {}, uid));
          const [queue, checks, answers] = await Promise.all([
            supabase.from('live_queue').select('user_id, kind, url, note, state, created_at').eq('session_id', session.id),
            supabase.from('live_checks').select('id, kind, prompt, choices, points, state, show_tally').eq('session_id', session.id),
            supabase.from('live_answers').select('check_id, choice, body, value').eq('cohort_id', c.id).eq('user_id', uid),
          ]);
          const bad = [queue, checks, answers].find((r) => r.error);
          if (bad) throw new Error(bad.error.message);
          // Classmates' items are counted, never described (shape.js).
          // deno-lint-ignore no-explicit-any
          const items = queue.data.map((q: any) => ({ ...q, label: LiveLib.itemLabel(q) }));
          // check_results answers only when the teacher has shown the results (or to the cohort's teachers).
          // deno-lint-ignore no-explicit-any
          const counted = checks.data.filter((k: any) => k.state === 'open' && LiveLib.kindOf(k) !== 'short');
          const tallies: Record<string, unknown> = {};
          await Promise.all(counted.map(async (k: { id: string }) => {
            const r = await supabase.rpc('check_results', { c: k.id });
            if (!r.error && r.data) tallies[k.id] = r.data;
          }));
          return text(thisSessionText(c, session, t.live, items, checks.data, answers.data, tallies, uid, await showOf(session.id, c.session_minutes)));
        });

        server.registerTool('my_group', {
          title: 'My group',
          description: 'This person\'s group in a cohort: what it is for, and each partner\'s GitHub name, app, repository, and live link. Never emails.',
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const p = await pick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const g = await supabase.from('groups').select('id, name, expectations, group_members(user_id)').eq('cohort_id', c.id);
          if (g.error) throw new Error(g.error.message);
          // deno-lint-ignore no-explicit-any
          const mine = g.data.find((x: any) => x.group_members.some((m: any) => m.user_id === uid));
          if (!mine) return text(groupText(c, null, []));
          // deno-lint-ignore no-explicit-any
          const others = mine.group_members.map((m: any) => m.user_id).filter((id: string) => id !== uid);
          const e = others.length
            ? await supabase.from('enrollments').select('user_id, app_name, app_repo, app_url, profiles(github_login)').eq('cohort_id', c.id).in('user_id', others)
            : { data: [], error: null };
          if (e.error) throw new Error(e.error.message);
          // deno-lint-ignore no-explicit-any
          const partners = e.data.map((x: any) => ({ login: x.profiles?.github_login, app_name: x.app_name, app_repo: x.app_repo, app_url: x.app_url }));
          return text(groupText(c, mine, partners));
        });

        server.registerTool('my_work', {
          title: 'My work',
          description: 'This person\'s own app in a cohort, everything they have shared, and the feedback on it, marked as from their teacher, a classmate, or themselves.',
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const all = await myCohorts();
          if (!all.length && !cohort) return text(await ownApp());
          const p = chooseCohort(all, cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const [mine, shares, teachers, notes] = await Promise.all([
            supabase.from('enrollments').select('app_name, app_repo, app_url').eq('cohort_id', c.id).eq('user_id', uid).maybeSingle(),
            supabase.from('shares').select('kind, note, url, created_at, feedback(author_id, body, created_at)').eq('cohort_id', c.id).eq('user_id', uid),
            supabase.from('cohort_teachers').select('user_id').eq('cohort_id', c.id),
            // Read on its own: before migration 20261003130000, this fails quietly.
            supabase.from('teacher_notes').select('body, created_at').eq('cohort_id', c.id).eq('student_id', uid),
          ]);
          const bad = [mine, shares, teachers].find((r) => r.error);
          if (bad) throw new Error(bad.error.message);
          // deno-lint-ignore no-explicit-any
          return text(workText(c, mine.data, shares.data, teachers.data.map((t: any) => t.user_id), uid, notes.error ? [] : notes.data));
        });

        server.registerTool('my_app', {
          title: 'My own app',
          description: 'This person\'s own app outside any cohort, whether it shows on the hub, and their own marks on the human-shaped path. For someone building on their own.',
          inputSchema: z.object({}),
          annotations: READ_ONLY,
        }, async () => text(await ownApp()));

        server.registerTool('cohort_roster', {
          title: 'Cohort roster (for teachers)',
          description: 'Everyone in a cohort you teach: their names, GitHub logins, apps, repositories, and live links, and the groups. Never emails.' + FOR_TEACHERS,
          inputSchema: cohortArg,
          annotations: READ_ONLY,
        }, async ({ cohort }) => {
          const p = await teacherPick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const [who, groups] = await Promise.all([
            peopleOf(c.id),
            supabase.from('groups').select('name, expectations, group_members(user_id)').eq('cohort_id', c.id).order('name'),
          ]);
          if (groups.error) throw new Error(groups.error.message);
          return text(rosterText(c, who.people, groups.data));
        });

        server.registerTool('student_work', {
          title: 'One student\'s work (for teachers)',
          description: 'One student in a cohort you teach: what they shared, with their question, their own ready or not-yet mark, and the feedback on it; their answers to checks for understanding; what they asked to show in sessions; the feedback they gave classmates; and the notes teachers sent them.' + FOR_TEACHERS,
          inputSchema: z.object({
            student: z.string().describe('The student\'s GitHub login, with or without the @.'),
            cohort: z.string().optional().describe('The cohort\'s short name (its slug). Leave it out when you teach one cohort.'),
          }),
          annotations: READ_ONLY,
        }, async ({ student, cohort }) => {
          const p = await teacherPick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const login = student.trim().replace(/^@/, '').toLowerCase();
          const who = await peopleOf(c.id);
          // deno-lint-ignore no-explicit-any
          const person = who.people.find((x: any) => (x.profiles?.github_login || '').toLowerCase() === login);
          if (!person) return text(`No one with the GitHub login @${login} is in ${c.title}. cohort_roster lists who is.`);
          const sid = person.user_id;
          const [shares, answers, queue, given, notes] = await Promise.all([
            supabase.from('shares').select('*, feedback(author_id, body, created_at)').eq('cohort_id', c.id).eq('user_id', sid),
            supabase.from('live_answers').select('choice, body, value, live_checks(kind, prompt, choices, points, created_at, sessions(number))').eq('cohort_id', c.id).eq('user_id', sid),
            supabase.from('live_queue').select('kind, url, note, state, created_at, sessions(number)').eq('cohort_id', c.id).eq('user_id', sid).order('created_at'),
            supabase.from('feedback').select('body, created_at, shares!inner(cohort_id, user_id)').eq('author_id', sid).eq('shares.cohort_id', c.id).order('created_at'),
            // Read on its own: before migration 20261003130000, this fails quietly.
            supabase.from('teacher_notes').select('author_id, body, created_at').eq('cohort_id', c.id).eq('student_id', sid).order('created_at'),
          ]);
          const bad = [shares, answers, queue, given].find((r) => r.error);
          if (bad) throw new Error(bad.error.message);
          // deno-lint-ignore no-explicit-any
          const ids = shares.data.map((s: any) => s.id);
          const confirmed = ids.length
            ? await supabase.from('share_confirmations').select('share_id, user_id').in('share_id', ids)
            : { data: [], error: null };
          const work = {
            shares: shares.data,
            confirmations: confirmed.error ? [] : confirmed.data,
            // deno-lint-ignore no-explicit-any
            answers: answers.data.filter((a: any) => a.live_checks)
              // deno-lint-ignore no-explicit-any
              .sort((a: any, b: any) => a.live_checks.created_at.localeCompare(b.live_checks.created_at))
              // deno-lint-ignore no-explicit-any
              .map((a: any) => ({ week: a.live_checks.sessions?.number, prompt: a.live_checks.prompt, text: LiveLib.answerText(a.live_checks, a) })),
            // deno-lint-ignore no-explicit-any
            queue: queue.data.map((q: any) => ({ week: q.sessions?.number, label: LiveLib.itemLabel(q), url: q.url, note: q.note, state: q.state })),
            // deno-lint-ignore no-explicit-any
            given: given.data.filter((f: any) => f.shares.user_id !== sid).map((f: any) => ({ to: f.shares.user_id, body: f.body, created_at: f.created_at })),
            notes: notes.error ? [] : notes.data,
          };
          return text(studentWorkText(c, person, work, who.names, who.teacherIds, uid));
        });

        server.registerTool('class_now', {
          title: 'Class now (for teachers)',
          description: 'The live session in a cohort you teach (or the most recent one): which part it is by the clock, the "show your work" queue with names, the open checks for understanding with each answer by name, and the commits pushed to the cohort\'s public repositories since the session began, read live from GitHub.' + FOR_TEACHERS,
          inputSchema: cohortArg,
          annotations: { readOnlyHint: true, openWorldHint: true },
        }, async ({ cohort }) => {
          const p = await teacherPick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const now = new Date();
          const t = CohortLib.currentAndNext(await sessionsOf(c.id), now, c.session_minutes);
          const session = t.live ? t.next : t.current;
          if (!session) return text(classNowText(c, { session: null }));
          const started = !!session.starts_at && Date.parse(session.starts_at) <= now.getTime();
          const [who, queue, checks] = await Promise.all([
            peopleOf(c.id),
            supabase.from('live_queue').select('user_id, kind, url, note, state, created_at').eq('session_id', session.id),
            supabase.from('live_checks').select('id, kind, prompt, choices, points, state, created_at').eq('session_id', session.id),
          ]);
          if (queue.error) throw new Error(queue.error.message);
          if (checks.error) throw new Error(checks.error.message);
          // deno-lint-ignore no-explicit-any
          const checkIds = checks.data.map((k: any) => k.id);
          const answers = checkIds.length
            ? await supabase.from('live_answers').select('check_id, user_id, choice, body, value, updated_at').in('check_id', checkIds)
            : { data: [], error: null };
          if (answers.error) throw new Error(answers.error.message);
          const nameOf = (id: string) => who.names[id] || 'Someone';
          const answered = TeachLib.checkAnswers(checks.data, answers.data, nameOf);
          const pushed = started ? await commitsSince(who.people, session.starts_at) : { commits: [], unread: '' };
          return text(classNowText(c, {
            session, live: t.live, started,
            part: t.live ? CohortLib.partNow(CohortLib.agenda(c.session_minutes), session.starts_at, now) : null,
            // deno-lint-ignore no-explicit-any
            queue: queue.data.map((q: any) => ({ ...q, name: nameOf(q.user_id), label: LiveLib.itemLabel(q) })),
            // deno-lint-ignore no-explicit-any
            checks: checks.data.map((k: any) => ({ ...k, answers: answered.find((x: any) => x.id === k.id).answers })),
            commits: pushed.commits,
            unread: pushed.unread,
            show: await showOf(session.id, c.session_minutes),
          }));
        });

        server.registerTool('method', {
          title: 'The method',
          description: 'A part of the human-shaped method, read live from the Universal App Template: setup, why, stage-01 to stage-08, talking (to your agent), principles, or review-skill (the human-shaped review).',
          inputSchema: z.object({ part: z.enum(Object.keys(METHOD) as [string, ...string[]]) }),
          annotations: { readOnlyHint: true, openWorldHint: true },
        }, async ({ part }) => text(await methodText(part)));

        for (const part of Object.keys(METHOD)) {
          server.registerResource(`method-${part}`, `humanshaped://method/${part}`, {
            title: `The method: ${part}`,
            mimeType: 'text/markdown',
          }, async (uri) => ({ contents: [{ uri: uri.href, text: await methodText(part) }] }));
        }

        server.registerPrompt('review_this_week', {
          title: 'A human-shaped review of this week',
          description: 'Your agent reviews this week\'s work the way the human-shaped review does: questions, not grades, labeled as AI, and left for you to decide whether to share.',
          argsSchema: cohortArg,
        }, ({ cohort }) => ({
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Please give me a human-shaped review of this week's work${cohort ? ` in my cohort "${cohort}"` : ''}.`,
                'First call this_week to see the challenge and the stages, then call method with part "review-skill" and follow that skill exactly, reading my repository for evidence.',
                'Open the review with a line that says it is AI feedback, naming yourself, your model, and today\'s date. Give no scores or grades. Say plainly what you could not see. Ask the questions the method asks rather than answering them for me.',
                'Write the review to a file in my repository and stop there. Do not share it anywhere. I will decide whether to share it with my cohort, and my teacher\'s feedback is separate from yours.',
              ].join('\n\n'),
            },
          }],
        }));

        // For someone building on their own (H3): the same review,
        // built on my_app and their own path marks instead of a week.
        server.registerPrompt('review_my_own_work', {
          title: 'A human-shaped review of the app you are building on your own',
          description: 'For someone outside any cohort: your agent reads your own app and your marks on the stages, asks the method\'s questions, labels itself as AI, and leaves the review with you.',
          argsSchema: z.object({
            stage: z.string().optional().describe('A stage to review against, such as 03 or setup. Without one, your agent starts from the first stage you have not marked ready.'),
          }),
        }, ({ stage }) => ({
          messages: [{
            role: 'user' as const,
            content: { type: 'text' as const, text: ownReviewPrompt(stage) },
          }],
        }));

        server.registerPrompt('prepare_for_session', {
          title: 'Prepare for the next session',
          description: 'Your agent helps you choose one thing to bring back to the next live session, and you say it in your own words.',
          argsSchema: cohortArg,
        }, ({ cohort }) => ({
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Help me get ready for my next Human Shaped session${cohort ? ` in "${cohort}"` : ''}.`,
                'Call next_session and my_work first. Then ask me what I am proudest of and where I am stuck this week, and help me choose one thing to bring back that I can show on a real device.',
                'Do not write what I will say. Ask me questions until I can say it in a sentence or two of my own, and remind me that I share it myself, on my cohort page.',
              ].join('\n\n'),
            },
          }],
        }));

        // For a teacher during or after class (Wish 9): their own agent
        // reads a student's public repository and helps them look, and the
        // teacher decides what, if anything, to say.
        server.registerPrompt('check_this_code', {
          title: 'Look closely at a student\'s code (for teachers)',
          description: 'Your agent reads a student\'s public repository, or one commit in it, explains what changed in plain words, and asks the method\'s questions about it. It is labeled as AI, it posts nothing, and what you say to the student is yours to write.',
          argsSchema: z.object({
            repo: z.string().describe('The repository as owner/name, for example bea/garden-swap.'),
            commit: z.string().optional().describe('A commit\'s sha, to look at that change alone.'),
          }),
        }, ({ repo, commit }) => ({
          messages: [{
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `I teach a Human Shaped cohort, and I want to look closely at ${commit ? `commit ${commit} in ` : ''}https://github.com/${repo}${commit ? '' : ', starting with its recent commits'}.`,
                'Read it through GitHub, read-only. If I teach this student\'s cohort, student_work and class_now tell you what they shared and asked; call method with part "review-skill" for the questions the method asks.',
                'Explain in plain words what changed and which decisions it shows, then ask me the questions the method asks about it rather than answering them. Label everything you say as AI, naming yourself, your model, and today\'s date, and give no scores or grades.',
                'Do not post, comment, open issues, or write to the student anywhere. I will decide what, if anything, to say to them, in my own words.',
              ].join('\n\n'),
            },
          }],
        }));

        return server;
      });

      return handler.fetch(req);
    },
  ),
);
