# Gemini

The project instructions live in `AGENTS.md`. Read it first and follow
it. This file adds only what differs for Gemini CLI and Antigravity.

- **Loading.** Antigravity reads `AGENTS.md` on its own. Gemini CLI
  reads it through `.gemini/settings.json` (`context.fileName`). If
  Gemini CLI does not trust this folder, it ignores that setting, so
  open `AGENTS.md` yourself before any work.
- **Skills** live in `.claude/skills/`. The pointer skill in
  `.agents/skills/template-skills/` says how to find and load the one a
  task needs.
- **Memory.** The memory ratchet in `AGENTS.md` applies. Save
  corrections and confirmed choices with your memory tool, each with a
  "Why" line.
