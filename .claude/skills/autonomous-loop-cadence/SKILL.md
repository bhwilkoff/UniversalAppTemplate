---
name: autonomous-loop-cadence
description: Use when running an autonomous /loop on a multi-platform codebase (iOS / web / Android, or similar). Encodes the cadence, discipline, and source-of-work rules battle-tested across 100+ ticks on the BOBA Playbook repo (iOS Swift + web vanilla-JS + Android Kotlin/Compose). Covers platform rotation, opt-tick discipline, mining research folders for user requests, design-doc binding, parity-matrix audits before shipping polish, version-bump rules, CI gates per platform, lesson capture, and stop conditions. Triggers when invoking /loop with no interval on a multi-platform codebase, when the user asks for an "all-night loop" or "keep iterating," or when picking up an in-flight autonomous session post-compaction.
---

# Autonomous Loop Cadence (multi-platform)

The `/loop` skill schedules the next tick. **This skill governs what to put IN those ticks** when the project ships across multiple platforms.

## When to invoke

- User runs `/loop` with no interval ("dynamic mode") on a project that ships on 2+ platforms.
- User says "keep iterating," "loop all night," "keep going" against a project with cross-platform parity.
- You're picking up an in-flight loop after compaction and see an `AUTONOMOUS_PROGRESS.md` file with tick-by-tick history.
- You're about to invent feature work yourself and the project has a research / Discord / handoff folder.

If the project has only one platform, this skill is overkill — invoke `feature-shipping-discipline` instead.

## The cadence that survived 200 ticks

```
tick % 5  →  what
  0       →  opt (net-remove lines)
  1, 4    →  Android  (or whichever platform is least mature)
  2       →  iOS      (or platform #2 by maturity)
  3       →  web      (or platform #3)
```

**Why this shape, not "round-robin":**
- The least-mature platform gets 2/5 ticks. Parity catches up instead of drifting.
- Every 5th tick is opt. Without it, the codebase grows monotonically — feature ticks always *add* lines.
- Predictable enough that the user can interrupt with a "next iOS tick, please fix X" and you can confidently say "tick N+M is iOS."

**Pick your own platform-cadence ratio per project.** If three platforms are equally mature, do `1,2=A 3=B 4=C 0=opt`. If one platform dominates user share, lean into it. The discipline is *having a fixed rotation* and *opt every 5th*, not the specific assignment.

## Source-of-work priority (the most important rule)

When a feature tick fires, **pick what to ship from a durable backlog in this priority order**:

1. **User-requested features mined from research folders.** Almost every project has a Slack / Discord / handoff / support folder where real users have asked for things. These are the highest-signal work — they don't require justification, they're already validated by demand.
   - For BOBA: `~/Documents/Claude/Projects/Bo Jackson Battle Arena Research/discord-exports/extracted/QUALITATIVE_FINDINGS.md` + `questions.txt` + `support.txt`.
   - For other projects: look for `handoff-*`, `feedback-*`, `support-*`, `*-research` folders outside the repo.
2. **Project's deferred-work list** (SCRATCHPAD.md, ROADMAP.md, deferred sections of milestone docs).
3. **Cross-platform parity gaps** (PARITY.md or equivalent — rows marked `⏳` or `🚧` for a specific platform).
4. **Out-of-band requests** the user dropped into the loop ("On the next iOS tick, also fix X"). These get queued durably (see §below) and pulled when the cadence calls for the right platform.

**Never invent the next feature.** Loops that run on imagination produce same-feature polish drift — Ben's exact pushback at BOBA tick 178: *"these loops are really circling around the same exact features"*. If the backlog runs low (≤2 items), re-mine the research folder. Don't make stuff up.

## Mining a research folder (the canonical pattern)

Spawn a general-purpose Agent (don't read 26k lines into your own context):

```
Agent({
  description: "Mine [source] for user-requested features",
  subagent_type: "general-purpose",
  prompt: "
    Where to look: [paths]
    Filter OUT: [already-shipped list from PARITY] + [binding-rule rejections from DECISIONS]
    What to include: User-requested features not yet shipped, ranked by (demand × value / effort).
    Cross-reference against [SCRATCHPAD.md] and [PARITY.md] to confirm not-shipped.
    Report: 8-15 items, prioritized, ≤600 words. Punch-list shape: title / what / platform(s) / evidence / S/M/L.
    NO methodology recap. NO research summary. Just the ranked list.
  "
})
```

The returned punch list goes into AUTONOMOUS_PROGRESS.md so it survives compaction. Subsequent feature ticks pull from there.

**The agent will be wrong sometimes.** Verify "not shipped" claims against the actual codebase before shipping — at BOBA tick 179 the agent's #1 ("power-range filter not shipped") was wrong; the filter was in all 3 platforms already. The audit IS the value.

## Audit before shipping (anti-duplicate-work)

Before any feature tick that claims to "ship X on platform Y":
1. `grep -rn "X\|x_helper\|XScreen" {platform_path}` — does it already exist?
2. If yes, the parity matrix is lying. Fix the matrix in this tick instead of duplicate-building. That counts as the platform's tick.
3. If no, ship.

This caught **8 false-⏳ rows** at BOBA tick 196. Without the audit, ticks 197-200 would have been shipping things that already existed.

## Opt-tick discipline (every 5th)

Opt ticks must **net-remove lines** unless they're CI fixes. Real opt-tick categories:

- **Dead-code drop** — orphan imports, unused helpers, stale comments
- **Stale planning collapse** — docs that planned for something already shipped (BOBA tick 200: -44 lines from SCRATCHPAD)
- **Defensive guard simplification** — `if (typeof X !== 'object' || !X)` for an X that's guaranteed to exist
- **Duplicate-narrative consolidation** — two sections that describe the same thing
- **Comment trim** — long historical preambles where 1 line would suffice
- **CI fix that nets -lines** — fixing a bug while removing dead code

Anti-pattern: an opt-tick that net-ADDS lines (a new helper, more comments, defensive checks). When you can't find a net-removal target, document why and commit a no-op tick log — better than padding with new code.

**Recurring opt-tick failure mode (defend against it):** `grep` for orphan symbols is fragile — see [[feedback_autonomous_loop_failure_modes]]. Trailing-lambda invocations (`remember { ... }`), fully-qualified refs (`Icons.Default.X`), and function references without `()` all hide from naive `\bX\(` patterns.

## Cross-platform parity sweep (the loop's main shape)

When a punch-list item touches multiple platforms, ship in a 3-tick sequence:

```
Tick N+0 = least-mature platform first (Android in BOBA's case)
Tick N+1 = next platform (iOS)
Tick N+2 = remaining (web)
```

Each tick:
- Strikes the platform-specific row in the punch list (`✅ Android · ⏳ iOS · ⏳ web` → `✅ ✅ ⏳` → `✅ ✅ ✅`)
- Reuses identifiers / function names / accent colors so the implementations are visibly parallel
- The 3rd tick's commit says "closes the trio" so future audits know this item is fully done

At BOBA, items #2 (rainbow lens), #5 (DBS contextual sheet), and #7 (print-run badge) shipped this way across 3 ticks each.

## Version-bump rules (project-specific but pick one)

For BOBA — iOS only:
- Every iOS-touching tick bumps **both** `MARKETING_VERSION` (+0.001) and `CURRENT_PROJECT_VERSION` (+1) in the same commit as the feature.
- Web and Android ticks do NOT bump.
- Opt ticks that touch iOS code DO bump (the file changed).

Don't rely on CI auto-bump scripts — they're a fallback, not source of truth.

## CI gates per platform

After pushing, decide when to fire the next tick based on which platforms ran in this tick:

| Platform pushed | Next-tick delay |
|---|---|
| Android touched | **270s** — Gradle compile is the canary; need to see CI green before next push |
| iOS source touched | 270s recommended (Xcode Cloud has no public status quickly), OR 90s if you accept the risk |
| Web only | **90s** — Pages build is fast and self-correcting |
| Docs / data only | 90s |

Pre-CI verification helps but isn't a substitute. `node -e "new Function(fs.readFileSync('js/app.js','utf8'))"` catches JS syntax errors locally. iOS SwiftUI body-scope `switch` expressions trigger the "compiler unable to type-check in reasonable time" diagnostic *in SourceKit before commit* — pay attention to those.

## Out-of-band user requests

When the user drops a request mid-loop ("on the next iOS tick, fix the triple-spinner"):

1. **Acknowledge in plain text + a one-line "queued for tick N" note.**
2. **Log it durably** in AUTONOMOUS_PROGRESS.md under a "## Pending [platform] asks" section so it survives compaction.
3. **Commit the log** immediately — don't trust it to survive in your context.
4. When the right-platform tick comes, pull it from the log AND any new bits.

Don't context-switch mid-tick to handle the request unless the user explicitly says "do it now." The cadence is the discipline.

## Lesson capture as memory files

When a tick burns a CI cycle (compile fail, type-check timeout, missing import, etc.):

1. **Fix the bug** in the next opt or fix-tick.
2. **Write a memory file** that future loops will find: `~/.claude/projects/{proj}/memory/feedback_{lesson}.md`. Include the exact symptom, root cause, and the "how to apply" rule.
3. **Add a pointer to MEMORY.md** so it loads into context at session start.
4. **Cross-reference** other related lessons via `[[name]]` syntax.

The compounding effect: at BOBA, the [[feedback_autonomous_loop_failure_modes]] file collected 9 recurring CI breaks over 200 ticks. By tick 200, future loops can avoid those 9 specific traps by reading one memory file.

## Durable progress log

Every tick appends to `AUTONOMOUS_PROGRESS.md` at the repo root. Structure:

```markdown
### Tick N — YYYY-MM-DD — [platform]: [one-line summary]
- **Context:** what was on the queue.
- **Implementation:** what changed, with file references.
- **Verification:** what you tested before pushing.
- **Lessons / lessons captured:** links to new memory files.
- **Next:** what tick N+1 should do.
```

Commit this every tick (don't batch). After compaction, future-you can `tail -50 AUTONOMOUS_PROGRESS.md` and know exactly where to resume.

**Also use this file for the durable backlog** (Discord-mined punch list, pending out-of-band asks, items marked ✅/⏳/🔮 per platform).

## Stop conditions

Stop the loop without re-scheduling when:

1. **User says stop / pause / done.** Acknowledge, write a final tick-log noting the stop, don't ScheduleWakeup.
2. **Backlog runs to zero** AND the research folder is freshly-mined (no new items). Push a notification: "loop idle, backlog empty, re-mine recommended."
3. **Multiple CI failures in a row** (3+ ticks broken). Stop, surface the recurring failure mode, ask the user how to proceed.
4. **A genuinely-multi-tick refactor is mid-flight.** Don't fire the next cadence-platform tick while the previous one's work isn't shippable — that compounds breakage.

When stopping per (1) — Ben is here telling you — skip the PushNotification. He already knows.

## Design-doc binding (composes with `binding-design-doc-discipline`)

Within feature ticks, the [[binding-design-doc-discipline]] skill governs UI decisions. Quote the rule from the relevant binding doc (`DESIGN.md` / `WEB-DESIGN.md` / `ANDROID-DESIGN.md`) before proposing any new view, sheet, or affordance. If no rule fits, propose a doc edit first.

## What this skill is NOT

- **Not a substitute for `/loop`.** That skill schedules wakeups; this one governs content.
- **Not a checklist to mechanically run through.** It's a discipline. If a tick demands deviating (e.g., critical CI break interrupting cadence), deviate intentionally and document why.
- **Not platform-specific.** The cadence shape works for any multi-platform repo. The example commands (Gradle, xcconfig, etc.) are BOBA-flavored — translate to your stack.

## Anti-patterns this skill prevents

### ❌ Same-feature drift
The user's #1 complaint when loops run unsupervised. Without a durable backlog, you'll polish the same 4 features for 30 ticks. The Discord-mining + audit-before-ship rules prevent it.

### ❌ Opt ticks that net-add lines
"Refactor for clarity" that adds 50 lines of new helpers + comments. If you can't find a real drop, do a docs-collapse tick or a stale-narrative consolidation.

### ❌ Trusting the parity matrix without grepping
PARITY.md drifts. Always verify the ⏳ claim against the actual codebase before treating it as a backlog item.

### ❌ Inventing feature work when the backlog runs low
Re-mine the research folder. Don't make up the next "should we add X?" Most invented features fail the "real user demand" test that mined items pass automatically.

### ❌ Batching commits across ticks
Each tick = one commit = one push = one CI run. Reverts stay surgical that way. Ben at BOBA: *"I'd like you commit instead of queueing as you go. We can selectively revert if we need to later."*

### ❌ Re-scheduling after a user stop directive
The `/loop` dynamic-mode runtime requires active ScheduleWakeup each turn. Omitting it ends the loop. Don't re-schedule "just in case" after the user has said stop.

## See also

- [[binding-design-doc-discipline]] — UI rule citation discipline (use within feature ticks)
- [[architectural-decision-log]] — recording the WHY of architecture choices
- [[feature-shipping-discipline]] — the end-to-end ship sequence for a single feature
- The bundled `/loop` skill — handles wakeup scheduling; this skill handles content
