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
// Deploy with verify_jwt off (the middleware checks tokens itself and must
// answer the unauthenticated discovery request), and include
// assets/cohort-lib.js and assets/teach-lib.js beside this file, so the
// server and the site share one copy of the week and schedule logic.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.0.0';
import { pipeline } from 'npm:@supabase/middleware@1';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1';
import { z } from 'npm:zod@^4.3.6';
import './cohort-lib.js';
import './teach-lib.js';
import {
  chooseCohort, cohortsText, thisWeekText, nextSessionText, groupText, workText,
  METHOD, methodUrls,
} from './shape.js';

// deno-lint-ignore no-explicit-any
const CohortLib = (globalThis as any).CohortLib;
// deno-lint-ignore no-explicit-any
const TeachLib = (globalThis as any).TeachLib;

const COHORT_COLUMNS = 'id, slug, title, status, starts_on, weeks, time_zone, session_weekday, session_time, session_minutes';
const cohortArg = z.object({
  cohort: z.string().optional().describe('The cohort\'s short name (its slug). Leave it out when you are in one cohort.'),
});
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

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
        const r = await supabase.from('sessions').select('number, starts_at, title, scope, meet_url').eq('cohort_id', cohortId);
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
          description: 'This week in a cohort: the teacher\'s challenge, the stages of the human-shaped path it covers, and the weekly session time.',
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
          const p = await pick(cohort);
          if (!p.cohort) return text(p.text);
          const c = p.cohort;
          const [mine, shares, teachers] = await Promise.all([
            supabase.from('enrollments').select('app_name, app_repo, app_url').eq('cohort_id', c.id).eq('user_id', uid).maybeSingle(),
            supabase.from('shares').select('kind, note, url, created_at, feedback(author_id, body, created_at)').eq('cohort_id', c.id).eq('user_id', uid),
            supabase.from('cohort_teachers').select('user_id').eq('cohort_id', c.id),
          ]);
          const bad = [mine, shares, teachers].find((r) => r.error);
          if (bad) throw new Error(bad.error.message);
          // deno-lint-ignore no-explicit-any
          return text(workText(c, mine.data, shares.data, teachers.data.map((t: any) => t.user_id), uid));
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

        return server;
      });

      return handler.fetch(req);
    },
  ),
);
