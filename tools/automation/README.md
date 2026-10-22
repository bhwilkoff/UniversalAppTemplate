# humanshaped/automation

*Written by Claude, awaiting Ben's review.*

Everything in `repo/` belongs at the root of the public
**`humanshaped/automation`** repository. Its workflows run on GitHub
Actions' schedule, free because the repository is public, and call
`supabase/functions/github-tick`, which accepts only a workflow on the
main branch of humanshaped/automation, proven by GitHub's OIDC token
(`tick.js`, `callerOk`). Design: research/notes/cohort-repository-design.md,
"Notifications".
