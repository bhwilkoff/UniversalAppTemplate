@./AGENTS.md

## Gemini

The project instructions live in `AGENTS.md`, imported above, so every
agent reads the same file. Edit `AGENTS.md`, not this one. Only notes
that apply to Google's agents alone belong here. The research behind
them is `docs/research/gemini-and-other-agents.md`.

- **Loading.** Gemini CLI reads this file and expands the import at the
  top. Antigravity reads `AGENTS.md` and this file on its own, but it
  cuts any rule file at 24,000 bytes, and `AGENTS.md` is about twice
  that, so its second half (from "Android app" through "Standing
  instructions") never reaches you on its own. Read `AGENTS.md` in full
  at the start of every session.
- **Trust.** Gemini CLI loads neither this file nor the skills until the
  person trusts the folder. If you were started without these
  instructions, say so and ask them to trust it.
- **Skills** live in `.claude/skills/`. `.agents/skills/` holds links to
  the three a learner asks for by name (`learning-orientation-design`,
  `make-it-look-like-itself`, `human-shaped-review`) and the
  `template-skills` pointer, which says how to load any of the others.
- **Memory.** The memory ratchet in `AGENTS.md` applies. A rule for the
  whole project goes in `AGENTS.md` under "Standing instructions", never
  in this file. A personal correction goes in your private project
  memory, each with a "Why" line.
