// Making a cohort's conversation, decided without touching GitHub or the
// database, so each rule is tested on its own
// (tools/test/cohort-access-provision.test.mjs).
//
// A teacher of the cohort asks once, from /teach/, and the hub makes what
// Ben used to make by hand (research/notes/cohort-conversation-notes.md,
// "A teacher sets up the conversation alone"): a private repository in
// humanshaped named for the cohort, with Discussions on and nothing else,
// and a secret team of the same name that can read it. Asking again only
// finishes what is missing, so a step that failed can simply be retried.
//
// The repository and team carry the cohort's id in their descriptions.
// That is how the hub knows a repository or team with the cohort's name
// is its own (made by an earlier, unfinished try) and not someone else's,
// which it never touches.

import { ORG } from './plan.js';

const NAME = /^[a-z0-9-]{1,90}$/;

export function marker(cohortId) {
  return 'Human Shaped cohort ' + cohortId;
}

// Who may ask, before anything is read from GitHub. An AI agent never
// may, because making a repository is a change in the world.
export function mayProvision({ agent, cohort, teaches }) {
  if (agent) return refuse(403, 'An AI agent cannot set up a cohort. Do this yourself, signed in on humanshaped.org.');
  if (!cohort) return refuse(404, 'That cohort does not exist.');
  if (!teaches) return refuse(403, 'Only a teacher of this cohort can set up its conversation.');
  if (cohort.status === 'finished') return refuse(409, 'This cohort is finished, so it keeps the conversation it has.');
  return { ok: true };
}

// The names to use: what the cohort already records, or else its slug.
export function namesFor(cohort) {
  const recordedRepo = cohort.github_repo ? String(cohort.github_repo).replace(/^humanshaped\//, '') : null;
  const repo = recordedRepo || cohort.slug;
  const team = cohort.github_team || cohort.slug;
  if (!NAME.test(String(repo).toLowerCase()) || !NAME.test(team)) {
    return refuse(400, 'The cohort’s short name can only use lowercase letters, numbers, and dashes, up to 90 of them.');
  }
  return { ok: true, repo, team, recorded: !!(cohort.github_repo && cohort.github_team) };
}

// What is left to do, from what GitHub said exists. repo and team are
// GitHub's answers (null when absent); teamCanRead says whether the team
// already reaches the repository. A name that is taken by something the
// cohort did not make is refused, never reused.
export function stepsFor({ cohort, names, repo, team, teamCanRead }) {
  const mark = marker(cohort.id);
  const ours = (thing) => !!thing && (names.recorded || String(thing.description || '').includes(mark));
  if (repo && !ours(repo)) {
    return refuse(409, `The name humanshaped/${names.repo} is already taken by another repository. Change the cohort’s short name and try again.`);
  }
  if (team && !ours(team)) {
    return refuse(409, `The team name ${names.team} is already taken in humanshaped. Change the cohort’s short name and try again.`);
  }
  if (repo && repo.private === false) {
    return refuse(409, `humanshaped/${names.repo} is public, and a cohort’s conversation has to be private. Ask Ben to look at it.`);
  }
  const steps = [];
  if (!repo) steps.push('create-repo');
  if (!repo || !repo.has_discussions) steps.push('turn-on-discussions');
  if (!team) steps.push('create-team');
  if (!team || !teamCanRead) steps.push('let-team-read');
  if (!names.recorded) steps.push('record');
  if (repo && !repo.has_issues) steps.push('turn-on-issues');
  // Always last, and checked file by file, so asking again only adds a
  // file that is missing and never replaces one people have changed.
  steps.push('write-files');
  return { ok: true, steps };
}

export function repoRequest(cohort, names) {
  return {
    method: 'POST',
    path: `/orgs/${ORG}/repos`,
    body: {
      name: names.repo,
      description: (marker(cohort.id) + ': ' + String(cohort.title || '')).slice(0, 350),
      homepage: 'https://humanshaped.org/cohort/?c=' + encodeURIComponent(cohort.slug),
      private: true,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
    },
  };
}

export function teamRequest(cohort, names) {
  return {
    method: 'POST',
    path: `/orgs/${ORG}/teams`,
    body: { name: names.team, description: marker(cohort.id), privacy: 'secret', notification_setting: 'notifications_enabled' },
  };
}

export function teamReadRequest(names) {
  return {
    method: 'PUT',
    path: `/orgs/${ORG}/teams/${encodeURIComponent(names.team)}/repos/${ORG}/${encodeURIComponent(names.repo)}`,
    body: { permission: 'pull' },
  };
}

export function issuesRequest(names) {
  return { method: 'PATCH', path: `/repos/${ORG}/${encodeURIComponent(names.repo)}`, body: { has_issues: true } };
}

// The files a cohort's repository starts with
// (research/notes/cohort-repository-design.md): a README that says what
// the repository is for and where things go, and a workflow that keeps
// a copy of any history a push replaces, since a free organization's
// private repositories cannot protect a branch. The workflow's job runs
// only when a push was forced, so ordinary pushes cost no Actions
// minutes.
export function seedFiles(cohort) {
  const page = 'https://humanshaped.org/cohort/?c=' + encodeURIComponent(cohort.slug);
  return [
    {
      path: 'README.md',
      message: 'Start the cohort\u2019s repository',
      content: [
        `# ${String(cohort.title || cohort.slug)}`,
        '',
        `This is the shared repository for the ${String(cohort.title || cohort.slug)} cohort on [Human Shaped](${page}). Everyone in the cohort can read it, and learners and leaders add to it together. Your own app lives in your own repository, and exchange videos live in Google Drive; anything the cohort shares lives here.`,
        '',
        '- `resources/` holds anything shared with the whole cohort: links, readings, templates, and examples.',
        '- `sessions/week-1/`, `sessions/week-2/`, and so on hold what belongs to one week\u2019s session.',
        '',
        `You can add a file from the cohort\u2019s Files section on [humanshaped.org](${page}&t=files), or here on GitHub. The conversation is in this repository\u2019s Discussions.`,
        '',
        'Nothing here is lost by mistake: every change is a commit that can be reverted, and if a push ever replaces the history of a branch, a copy of what was there is kept on a branch named `recovered/...`.',
        '',
      ].join('\n'),
    },
    {
      path: '.github/workflows/keep-replaced-history.yml',
      message: 'Keep a copy of any history a push replaces',
      content: [
        '# Written by humanshaped.org when the cohort\u2019s repository was made.',
        '# A forced push replaces a branch\u2019s history. This keeps what was',
        '# there on a branch of its own and tells the cohort\u2019s leaders.',
        'name: Keep replaced history',
        'on: push',
        'permissions:',
        '  contents: write',
        '  issues: write',
        'jobs:',
        '  keep:',
        "    if: github.event.forced && github.event.before != '0000000000000000000000000000000000000000'",
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - uses: actions/github-script@v7',
        '        with:',
        '          script: |',
        "            const branch = context.ref.replace('refs/heads/', '');",
        "            const kept = `recovered/${branch}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;",
        '            await github.rest.git.createRef({ ...context.repo, ref: `refs/heads/${kept}`, sha: context.payload.before });',
        '            await github.rest.issues.create({',
        '              ...context.repo,',
        '              title: `A push replaced the history of ${branch}`,',
        '              body: `@${context.actor} pushed over the history of \\`${branch}\\`. What was there is kept on [\\`${kept}\\`](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/tree/${kept}), so it can be put back.`,',
        '            });',
        '',
      ].join('\n'),
    },
  ];
}

// GitHub's REST API has no switch for Discussions; GraphQL does.
export function discussionsMutation(repositoryNodeId) {
  return {
    query: 'mutation($id: ID!) { updateRepository(input: { repositoryId: $id, hasDiscussionsEnabled: true }) { repository { hasDiscussionsEnabled } } }',
    variables: { id: repositoryNodeId },
  };
}

// What to record on the cohort once every step is done.
export function recorded(names) {
  return { github_repo: `${ORG}/${names.repo}`, github_team: names.team };
}

// An agent's token says which OAuth client it came through (migration
// 20261003010000), and a person's own sign-in does not.
export function isAgentToken(jwt) {
  try {
    const part = String(jwt || '').split('.')[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return typeof json.client_id === 'string' && json.client_id !== '';
  } catch {
    return false;
  }
}

function refuse(status, message) {
  return { ok: false, status, message };
}
