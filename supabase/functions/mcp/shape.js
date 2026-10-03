// How the hub's MCP server answers a student's agent, decided without
// touching the database, so every answer is tested on its own
// (tools/test/mcp-shape.test.mjs). Answers are short plain text that a
// model reads well, and each one links back to the hub page it came from.

export const SITE = 'https://humanshaped.org';
const RAW = 'https://raw.githubusercontent.com/bhwilkoff/UniversalAppTemplate/main/';
const BLOB = 'https://github.com/bhwilkoff/UniversalAppTemplate/blob/main/';

// The parts of the method an agent can read, by name.
export const METHOD = {
  setup: 'docs/path/setup.md',
  why: 'docs/path/00-why-we-build.md',
  'stage-01': 'docs/path/01-first-prototype.md',
  'stage-02': 'docs/path/02-shape-of-an-app.md',
  'stage-03': 'docs/path/03-going-native.md',
  'stage-04': 'docs/path/04-seeing-it-work.md',
  'stage-05': 'docs/path/05-shipping.md',
  'stage-06': 'docs/path/06-keeping-it-running.md',
  'stage-07': 'docs/path/07-raising-the-ceiling.md',
  'stage-08': 'docs/path/08-working-with-ai.md',
  talking: 'docs/path/talking-to-your-agent.md',
  principles: 'docs/human-shaped/PRINCIPLES.md',
  'review-skill': '.claude/skills/human-shaped-review/SKILL.md',
};
export function methodUrls(part) {
  const path = METHOD[part];
  return path ? { raw: RAW + path, github: BLOB + path } : null;
}
// Stage numbers ("00", "01") to method parts.
export function stagePart(n) { return n === '00' ? 'why' : 'stage-' + n; }

// Which cohort a question is about. With a slug, that one; without, the
// person's only cohort, or the one running now; otherwise ask.
export function chooseCohort(cohorts, slug) {
  if (slug) {
    const c = cohorts.find((x) => x.slug === slug);
    return c ? { cohort: c } : { text: `You are not in a cohort called "${slug}". ` + listText(cohorts) };
  }
  if (!cohorts.length) return { text: noCohorts() };
  if (cohorts.length === 1) return { cohort: cohorts[0] };
  const running = cohorts.filter((c) => c.status === 'running');
  if (running.length === 1) return { cohort: running[0] };
  return { text: 'You are in more than one cohort, so say which one. ' + listText(cohorts) };
}

function noCohorts() {
  return `You are not in a cohort yet. Open cohorts are listed at ${SITE}/cohorts/, and joining happens on ${SITE}/account/.`;
}
function listText(cohorts) {
  return cohorts.length ? 'Your cohorts: ' + cohorts.map((c) => `${c.slug} (${c.title})`).join(', ') + '.' : noCohorts();
}

export function cohortsText(cohorts) {
  if (!cohorts.length) return noCohorts();
  return cohorts.map((c) => [
    `${c.title} (slug: ${c.slug})`,
    `  Status: ${c.status}. You are ${c.role === 'teacher' ? 'its teacher' : 'a ' + c.role}.`,
    c.starts_on ? `  ${c.weeks} weeks from ${c.starts_on}.` : `  ${c.weeks} weeks; dates to come.`,
    `  Cohort page: ${SITE}/cohort/?c=${encodeURIComponent(c.slug)}`,
  ].join('\n')).join('\n\n');
}

// This week: the session that has most recently started (CohortLib.currentAndNext).
export function thisWeekText(cohort, t, stages, schedule) {
  const lines = [`${cohort.title}`];
  if (!t.current) {
    lines.push('No sessions are scheduled yet, so there is no week to describe. Your teacher sets them up.');
    return lines.join('\n');
  }
  const s = t.current;
  lines.push(`Week ${s.number}${s.title && s.title !== 'Week ' + s.number ? ': ' + s.title : ''}`);
  lines.push(s.scope ? `This week's challenge, in the teacher's words: ${s.scope}` : 'The teacher has not written this week\'s challenge yet.');
  if (stages.length) {
    lines.push('Stages of the path this week: ' + stages.map((n) => `${n} (method part "${stagePart(n)}", ${SITE}/path/${n}/)`).join(', ') + '.');
  }
  lines.push('Weekly session: ' + schedule);
  lines.push(`Cohort page: ${SITE}/cohort/?c=${encodeURIComponent(cohort.slug)}`);
  return lines.join('\n');
}

export function nextSessionText(cohort, t, parts, when, broughtBack) {
  if (!t.next) return `${cohort.title}: there is no session still to come.`;
  const s = t.next;
  const lines = [
    `${cohort.title}, week ${s.number}${t.live ? ' (happening now)' : ''}: ${when}`,
    s.meet_url ? `Join on Google Meet: ${s.meet_url}` : 'The Meet link is not posted yet.',
    `Session page: ${SITE}/live/?c=${encodeURIComponent(cohort.slug)}`,
    '',
    'Agenda:',
    ...parts.map((p) => `- Minute ${p.start}, ${p.minutes} min, ${p.name}: ${p.what}`),
    '',
  ];
  if (broughtBack.length) {
    lines.push('What you have shared since the last session:');
    broughtBack.forEach((x) => lines.push(`- ${x.kind}${x.note ? ': ' + x.note : ''}${x.url ? ' (' + x.url + ')' : ''}`));
  } else {
    lines.push('You have not shared anything since the last session. Sharing happens on the cohort page, in your own words.');
  }
  return lines.join('\n');
}

// Partners' logins, apps, and repositories; never an email.
export function groupText(cohort, group, partners) {
  if (!group) return `${cohort.title}: you are not in a group yet. Your teacher arranges groups.`;
  const lines = [`${cohort.title}, your group: ${group.name}`];
  if (group.expectations) lines.push(`What it is for: ${group.expectations}`);
  if (!partners.length) lines.push('No one else is in it yet.');
  partners.forEach((p) => {
    const bits = [`@${p.login}`];
    if (p.app_name) bits.push(`building ${p.app_name}`);
    if (p.app_repo) bits.push(`https://github.com/${p.app_repo}`);
    if (p.app_url) bits.push(p.app_url);
    lines.push('- ' + bits.join(', '));
  });
  return lines.join('\n');
}

// Their own work, with feedback marked by who gave it, and any follow-up
// notes their teachers sent them (migration 20261003130000).
export function workText(cohort, mine, shares, teacherIds, myId, notes) {
  const lines = [`${cohort.title}, your work`];
  if (mine) {
    lines.push(`App: ${mine.app_name || '(no name yet)'}`);
    if (mine.app_repo) lines.push(`Repository: https://github.com/${mine.app_repo}`);
    if (mine.app_url) lines.push(`Live at: ${mine.app_url}`);
  }
  if (notes && notes.length) {
    lines.push('', 'Notes from your teacher, to you alone:');
    [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at))
      .forEach((n) => lines.push(`- ${n.created_at.slice(0, 10)}: ${n.body}`));
  }
  if (!shares.length) {
    lines.push('You have not shared anything with the cohort yet.');
    return lines.join('\n');
  }
  lines.push('', 'What you have shared, newest first:');
  [...shares].sort((a, b) => b.created_at.localeCompare(a.created_at)).forEach((s) => {
    lines.push(`- ${s.created_at.slice(0, 10)}, ${s.kind}${s.note ? ': ' + s.note : ''}${s.url ? ' (' + s.url + ')' : ''}`);
    (s.feedback || []).forEach((f) => {
      const who = f.author_id === myId ? 'you' : teacherIds.includes(f.author_id) ? 'your teacher' : 'a classmate';
      lines.push(`    Feedback from ${who}: ${f.body}`);
    });
  });
  return lines.join('\n');
}

// What is happening in the live session right now: the "show your work"
// queue and the teacher's open questions (migration 20261003080000). The
// agent reads it so it knows what the person is in the middle of; adding
// to the queue and answering stay the person's own acts, on the page.
// Queue items arrive with a `label` (LiveLib.itemLabel) and a `login`.
export function thisSessionText(cohort, session, live, queue, checks, myAnswers, tallies, myId) {
  if (!session) return `${cohort.title}: no sessions are scheduled yet, so there is nothing happening live.`;
  const lines = [
    `${cohort.title}, week ${session.number}${live ? ' (happening now)' : ' (the next session; it is not live yet)'}`,
    `Session page: ${SITE}/live/?c=${encodeURIComponent(cohort.slug)}`,
    '',
  ];
  const waiting = queue.filter((q) => q.state !== 'shown').sort((x, y) => x.created_at.localeCompare(y.created_at));
  const shown = queue.filter((q) => q.state === 'shown');
  // Only the person's own items are described. Classmates' items are
  // counted, never listed, because the consent page promises an agent
  // never reads what classmates shared outside the person's group.
  if (!waiting.length) {
    lines.push(shown.length ? `Show your work: everything in the queue has been shown (${shown.length}).` : 'Show your work: nothing is in the queue yet.');
  } else {
    lines.push(`Show your work: ${waiting.length} waiting to be shown${shown.length ? `, ${shown.length} already shown` : ''}.`);
    const mine = waiting.map((q, i) => ({ q, place: i + 1 })).filter((x) => x.q.user_id === myId);
    if (!mine.length) lines.push('You have nothing in the queue.');
    mine.forEach(({ q, place }) => lines.push(`- Yours, number ${place} in line: ${q.label} (${q.url})${q.note ? `. Your note: "${q.note}"` : ''}`));
  }
  shown.filter((q) => q.user_id === myId).forEach((q) => lines.push(`- Yours, already shown: ${q.label}`));
  lines.push('');
  const open = checks.filter((k) => k.state === 'open');
  if (!open.length) {
    lines.push('Checks for understanding: no question is open right now.');
  } else {
    lines.push('Checks for understanding, open now:');
    open.forEach((k) => {
      lines.push(`- "${k.prompt}"${k.choices ? ' Choices: ' + k.choices.map((c, i) => `${i + 1}. ${c}`).join('; ') + '.' : ' (answered in their own words)'}`);
      const mine = myAnswers.find((x) => x.check_id === k.id);
      const said = mine ? (k.choices ? k.choices[mine.choice - 1] : mine.body) : null;
      lines.push(said ? `  You answered: ${said}` : '  You have not answered yet.');
      const t = tallies[k.id];
      if (k.choices && t) {
        const by = Object.fromEntries(t.map((r) => [r.choice, Number(r.answers)]));
        lines.push('  Count so far, with no names: ' + k.choices.map((c, i) => `${c} ${by[i + 1] || 0}`).join(', ') + '.');
      }
    });
    lines.push('', 'A check for understanding is how the teacher sees what is landing, so it only helps if the answer is the person\'s own. Do not write or suggest an answer; if they ask, help them think it through with questions instead. Answering happens on the session page.');
  }
  lines.push('', 'This view is read-only. Adding to the queue happens on the session page, by the person.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------
// For teachers (research/notes/meet-classroom-design.md, C6): the
// teacher's own agent reads the cohort they teach, so it can help them
// look closely at a student's work during or after class. Every answer
// is read-only, and every one ends by saying whose words reach a
// student: the teacher's, never the agent's.
// ---------------------------------------------------------------------

export const TEACHER_ASIDE = 'This is read-only, and for the teacher alone. Anything you make of it is the teacher\'s to give or not: the hub never sends what an agent wrote, and a follow-up is written and sent by the teacher on ' + SITE + '/teach/. If you help the teacher think about someone\'s work, say that it comes from an AI, ask the method\'s questions rather than grading, and do not post anywhere.';

// Which cohort a teacher's question is about, among the cohorts they
// teach. Anyone who does not teach it gets a plain refusal, so a
// student's agent never reads classmates' work through these tools.
export function teacherCohort(cohorts, slug) {
  const teaching = cohorts.filter((c) => c.role === 'teacher');
  if (slug) {
    const c = cohorts.find((x) => x.slug === slug);
    if (!c) return { text: `You do not teach a cohort called "${slug}".` + (teaching.length ? ' ' + teachingList(teaching) : '') };
    if (c.role !== 'teacher') return { text: notATeacher(c) };
    return { cohort: c };
  }
  if (!teaching.length) {
    return { text: cohorts.length ? notATeacher(cohorts[0]) : 'This tool is for the people who teach a Human Shaped cohort, and you do not teach one. Your own cohorts are in my_cohorts.' };
  }
  if (teaching.length === 1) return { cohort: teaching[0] };
  const running = teaching.filter((c) => c.status === 'running');
  if (running.length === 1) return { cohort: running[0] };
  return { text: 'You teach more than one cohort, so say which one. ' + teachingList(teaching) };
}
function notATeacher(c) {
  return `This tool is for the teachers of a cohort, and you are not one of ${c.title}'s teachers, so it has nothing to show you. Your own work is in my_work, and your group is in my_group.`;
}
function teachingList(cohorts) {
  return 'The cohorts you teach: ' + cohorts.map((c) => `${c.slug} (${c.title})`).join(', ') + '.';
}

function personName(p) { return (p.profiles && (p.profiles.display_name || p.profiles.github_login)) || 'Someone'; }
function loginOf(p) { return p.profiles && p.profiles.github_login ? ` (@${p.profiles.github_login})` : ''; }
function day(iso) { return String(iso || '').slice(0, 10); }

// Everyone in the cohort with their app, repository, and live link, and
// the groups. Never an email.
export function rosterText(cohort, people, groups) {
  const here = people.filter((p) => p.status !== 'left')
    .sort((a, b) => personName(a).toLowerCase().localeCompare(personName(b).toLowerCase()));
  const lines = [`${cohort.title}, the people in it (${here.length})`];
  if (!here.length) lines.push('No one has joined yet.');
  here.forEach((p) => {
    const bits = [`${personName(p)}${loginOf(p)}, ${p.role}`];
    if (p.app_name) bits.push(`building ${p.app_name}`);
    bits.push(p.app_repo ? `https://github.com/${p.app_repo}` : 'no repository given yet');
    if (p.app_url) bits.push(`live at ${p.app_url}`);
    if (p.app_public) bits.push('they have said it is ready to show');
    lines.push('- ' + bits.join(', '));
  });
  if (groups && groups.length) {
    const names = Object.fromEntries(here.map((p) => [p.user_id, personName(p)]));
    lines.push('', 'Groups:');
    groups.forEach((g) => {
      const members = (g.group_members || []).map((m) => names[m.user_id]).filter(Boolean);
      lines.push(`- ${g.name}: ${members.length ? members.join(', ') : 'no one yet'}${g.expectations ? `. For: ${g.expectations}` : ''}`);
    });
  }
  lines.push('', `Teacher page: ${SITE}/teach/`,
    'Each public repository can be read on GitHub itself, and GitHub\'s own MCP server, connected read-only, is the way to read the code closely.',
    '', TEACHER_ASIDE);
  return lines.join('\n');
}

// One student's work in the cohort: what they shared (with their
// question, their own mark, and the feedback on it), their answers to
// checks, what they queued to show, the feedback they gave classmates,
// and the notes their teachers sent them. names maps a person's id to
// their name, teacherIds lists the cohort's teachers, and meId is the
// teacher asking.
export function studentWorkText(cohort, person, work, names, teacherIds, meId) {
  const who = (id) => (id === meId ? 'you' : names[id] || 'someone');
  const role = (id) => (id === person.user_id ? 'themselves' : teacherIds.includes(id) ? 'a teacher' : 'a classmate');
  const lines = [`${personName(person)}${loginOf(person)} in ${cohort.title}`];
  if (person.app_name) lines.push(`App: ${person.app_name}`);
  lines.push(person.app_repo ? `Repository: https://github.com/${person.app_repo}` : 'No repository given yet.');
  if (person.app_url) lines.push(`Live at: ${person.app_url}`);

  const shares = [...(work.shares || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  lines.push('', shares.length ? 'What they shared, newest first:' : 'They have not shared anything with the cohort yet.');
  shares.forEach((s) => {
    lines.push(`- ${day(s.created_at)}, ${s.kind}${s.note ? ': ' + s.note : ''}${s.url ? ' (' + s.url + ')' : ''}`);
    if (s.want_to_know) lines.push(`    Their question: ${s.want_to_know}`);
    if (s.readiness === 'ready') lines.push('    Their own mark: ready to move on.');
    if (s.readiness === 'not-yet') lines.push(`    Their own mark: not yet${s.missing ? ', because ' + s.missing : ''}.`);
    const seen = (work.confirmations || []).filter((c) => c.share_id === s.id).map((c) => who(c.user_id));
    if (seen.length) lines.push(`    Seen working on a device by ${seen.join(', ')}.`);
    (s.feedback || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((f) => lines.push(`    Feedback from ${who(f.author_id)} (${role(f.author_id)}): ${f.body}`));
  });

  const answers = work.answers || [];
  lines.push('', answers.length
    ? 'Their answers to checks for understanding (only they and the cohort\'s teachers see these):'
    : 'They have not answered a check for understanding.');
  answers.forEach((x) => lines.push(`- ${x.week ? 'Week ' + x.week + ', ' : ''}"${x.prompt}": ${x.text || '(no answer)'}`));
  const queue = work.queue || [];
  if (queue.length) {
    lines.push('', 'What they asked to show in a session:');
    queue.forEach((q) => lines.push(`- ${q.week ? 'Week ' + q.week + ', ' : ''}${q.label} (${q.url})${q.note ? `, "${q.note}"` : ''}, ${q.state === 'shown' ? 'shown' : 'not shown'}`));
  }
  const given = work.given || [];
  if (given.length) {
    lines.push('', 'Feedback they gave classmates:');
    given.forEach((g) => lines.push(`- ${day(g.created_at)}, to ${who(g.to)}: ${g.body}`));
  }
  const notes = work.notes || [];
  if (notes.length) {
    lines.push('', 'Notes the cohort\'s teachers sent them:');
    notes.forEach((n) => lines.push(`- ${day(n.created_at)}, from ${who(n.author_id)}: ${n.body}`));
  }
  lines.push('', 'Their code and commits are on GitHub, which is the place to read them.', '', TEACHER_ASIDE);
  return lines.join('\n');
}

// The session as it stands: which part it is by the clock, the queue
// with names, the open checks with each answer by name, and the commits
// pushed to the cohort's repositories since it began (FollowupLib).
export function classNowText(cohort, now) {
  const s = now.session;
  if (!s) return `${cohort.title}: no sessions are scheduled yet, so there is no class to describe.`;
  const lines = [
    `${cohort.title}, week ${s.number}${now.live ? ' (happening now)' : now.started ? ' (the most recent session, which is over)' : ' (it has not begun yet)'}`,
    `Session page: ${SITE}/live/?c=${encodeURIComponent(cohort.slug)}`,
  ];
  if (now.live && now.part) lines.push(`By the clock, the part now is "${now.part.name}" (minute ${now.part.start}, for ${now.part.minutes} minutes), though a teacher who started a part's timer on the session page may be somewhere else.`);
  lines.push('');
  const queue = now.queue || [];
  const waiting = queue.filter((q) => q.state !== 'shown').sort((x, y) => x.created_at.localeCompare(y.created_at));
  const shown = queue.filter((q) => q.state === 'shown');
  if (!queue.length) lines.push('Show your work: nothing is in the queue.');
  else {
    lines.push(`Show your work: ${waiting.length} waiting, ${shown.length} shown.`);
    waiting.forEach((q, i) => lines.push(`${i + 1}. ${q.name}: ${q.label} (${q.url})${q.note ? `, "${q.note}"` : ''}`));
    shown.forEach((q) => lines.push(`- Shown: ${q.name}, ${q.label}`));
  }
  lines.push('');
  const open = (now.checks || []).filter((k) => k.state === 'open');
  if (!open.length) lines.push('Checks for understanding: no question is open.');
  open.forEach((k) => {
    lines.push(`Open check: "${k.prompt}"${k.choices ? ' Choices: ' + k.choices.join('; ') + '.' : ''} ${k.answers.length} answered.`);
    k.answers.forEach((x) => lines.push(`- ${x.name}: ${x.text}`));
  });
  lines.push('');
  const commits = now.commits || [];
  if (!now.started) lines.push('Commits: the session has not begun, so nothing has been pushed during it yet.');
  else if (!commits.length) lines.push('Commits pushed to the cohort\'s repositories since the session began: none yet.');
  else {
    lines.push(`Commits pushed to the cohort's repositories since the session began, newest first (${commits.length}):`);
    commits.forEach((c) => lines.push(`- ${c.date.slice(11, 16)} UTC, ${c.name || c.repo} in ${c.repo}: ${c.line}${c.agent ? ` (with ${c.agent})` : ''}${c.url ? ' ' + c.url : ''}`));
  }
  if (now.unread) lines.push(now.unread);
  lines.push('', TEACHER_ASIDE);
  return lines.join('\n');
}
