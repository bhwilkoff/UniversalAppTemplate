# Human Shaped automation

Scheduled jobs for [humanshaped.org](https://humanshaped.org)'s cohorts, run in GitHub Actions. This repository is public so its Actions minutes cost nothing, and it holds no secrets: each workflow proves who it is to humanshaped.org with GitHub's own OIDC token.

- **Session threads** (`.github/workflows/session-threads.yml`), every hour: opens the discussion for each cohort session that starts within the day, in the cohort's repository, so everyone watching it is emailed by GitHub and the thread is ready when the session begins.

The code that does the work lives in humanshaped.org's `supabase/functions/github-tick`.
