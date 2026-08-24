---
name: ci-fleet-engineering
description: Use when adding, editing, or debugging ANY scheduled GitHub Actions workflow that mutates shared data, publishes an artifact, or runs on a cron — and when diagnosing CI failures, cancelled runs, lock contention, lost work, or alert noise. Carries the fleet doctrine paid for across ~35 workflows - the compute/apply lock split, budgets that publish vs timeouts that kill, restore/publish guards against the clobber-delete class, the never-started/displaced-run sweeper, the green-but-broken health auditor, and "a red X is reserved for broken." Triggers on workflow yml, cron, concurrency group, timeout-minutes, gh release upload, cancelled run, "workflow failed", CI alert, lock, superseded, publish step skipped.
---

# CI Fleet Engineering

The full doctrine with incident write-ups: `docs/CI-FLEET.md`. The one-sentence
version: **a green run must have done something, a red run must mean something,
and no run may destroy work — its own or another's.**

## When writing or editing a workflow

1. **Mutates shared data?** Use the compute/apply split —
   `docs/templates/split-writer-workflow-template.yml` is the copyable shape.
   The lock (one shared concurrency group, `cancel-in-progress: false`) is held
   ONLY by the short apply job. GitHub keeps ONE pending run/job per group and
   DESTROYS the older pending on a newer arrival — short holds are survival.
   Run `python3 tools/check_workflow_gates.py` after touching any apply job.
2. **Long compute?** The tool takes `--max-minutes`, measured from PROCESS
   START, able to fire INSIDE one item, exiting 0 so publish still runs. Step
   `timeout-minutes` is a continue-on-error BACKSTOP above it, judged by a
   verdict step: fired + output grew → `::warning::`; fired + nothing → fail.
3. **Restores:** only a NON-EXISTENT release is a first run. Never `|| true` a
   restore. Snapshot-and-check any shared SQLite with
   `tools/sqlite_publish_guard.py`. `--clobber` = delete-then-upload; never
   clobber-upload a file that can be rejected (2 GB cap → both assets vanish).
4. **Uploads** wrap in `tools/gh_retry.sh` (must-persist, fails loudly);
   **dispatches** in `tools/gh_dispatch.sh` (fire-and-forget, exits 0).
5. **Never `cmd || true`** — capture the exit code and `::warning::` it.
   `tool | tee log` needs `set -o pipefail` or a crash goes green.

## Standing guardians (enable once per repo)

- `.github/workflows/retry-infra-failures.yml` + `tools/retry_infra_failures.py`
  — re-runs never-started runs and queue-displaced runs/apply-jobs. The gate is
  "zero steps ran," which is the no-side-effect proof; verify changes with
  `DRY_RUN=1` against real history.
- `.github/workflows/workflow-health.yml` + `tools/audit_workflow_health.py` —
  daily judge of what each workflow's last SCHEDULED run PRODUCED (green-but-
  zero-yield, killed-with-publish-skipped, stale schedules), each judged
  against its OWN cadence. It fails only for findings nothing else alerts.

## When diagnosing

- Run duration includes QUEUE time — read job-level startedAt/completedAt
  before diagnosing slowness (a "673-minute run" was a 1-minute job).
- A cancelled run with zero steps was displaced, not stopped; one with steps
  was stopped by a human or timeout. Never blur these.
- A check that reports "nothing to do" suspiciously fast is a finding, not a
  completion — verify what was OFFERED to it (markers, filters) before
  believing the count. Timestamps + TTLs on every "verified" marker; record
  the SOURCE on every "already tried" marker; persist evidence, not verdicts.
