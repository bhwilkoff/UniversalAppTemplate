# Universal App Template

Archive Watch started on April 17, 2026, as an Apple TV app for
watching old public-domain films. By the end of September it ran on
iPhones, iPads, Macs, Apple TVs, Android phones, Google TVs, Fire TVs,
Rokus and the web, from one repository, built mostly by one person
working with Claude Code.

This template is what I learned doing that, and doing it three times
before with BOBA Playbook, Bsky Dreams and Tidbits Trivia. It is a
starting point for your own app: a web app, a native Apple app for
iPhone, iPad, Mac and Apple TV, a native Android app, and optional
Windows and smart-TV apps, all sharing one data plane and one set of
rules. And it is the method, written down where your AI agent will
read it.

## Why it exists

I want to build software that makes folks more capable, not more
passive. I want it to feel at home on every device they own, and still
open on the old one in the drawer. And I want to build it with an AI
agent without handing the agent the parts that were supposed to be
mine, or theirs.

I call that *human-shaped software*. Some problems are computer-shaped:
you can hand them to the agent and be done. Learning, community and
relationships are not, because they only happen when a person does the
work. Human-shaped software takes the mechanical work off people's hands
and leaves them the learning.

**Learning is the frame for all of it.**

It runs three ways. As a student, you learn a way of building, one stage
at a time, by bringing your work back and showing it. As a builder, you
learn what your app is by deciding, judging and using, which are the
parts the agent should never do for you. And as a human, you decide at
every step what to hand to the machine and what to keep. The app should
leave the people who use it more capable, and building it should leave
you more capable too.

Every round of the path makes the same three moves:

1. **Write it down.** Values, rules and reasons live where the agent
   reads them, because an agent keeps only the values you write down.
2. **Prove it.** The agent is never the tester. Evidence that something
   works comes from the real screen, a real device, or a person.
3. **Live with it.** Use the app every day, with the people it is for.
   That is where the next feature, and the next value, come from.

Those moves shaped every choice in the template:

- **Values come first, in writing.** Every feature answers four
  questions before it is built: does it deepen understanding, invite
  participation, support agency, and stay clear rather than clever.
- **Feature parity, not design consistency.** The verbs are the same on
  every platform. The idioms are each platform's own.
- **Native apps over one shared data plane.** The data is built once and
  published. Each platform is a native consumer of it.
- **A low floor and a high ceiling.** An app should open on old
  hardware, and the newest devices should get everything they can do.

I am teaching a class on building human-shaped software with AI from
this template. The same path serves a class and a builder working alone.
`docs/research/values-based-approaches.md` sets it beside other
values-based ways of building, and says what it borrowed from each.

## Start here

The path is nine stages, in `docs/path/`. Each one says what you will
make, why it is built that way, what to do, and what to bring back.

| Stage | What you will do |
|---|---|
| [00. Why we build](docs/path/00-why-we-build.md) | Write down your values where the agent will read them. |
| [01. The first prototype](docs/path/01-first-prototype.md) | One platform, real data, on a phone, this week. |
| [02. The shape of an app](docs/path/02-shape-of-an-app.md) | One data plane, native apps, and `PARITY.md`. |
| [03. Going native](docs/path/03-going-native.md) | Add Apple and Android, and choose your floors by the hardware they reach. |
| [04. Seeing it work](docs/path/04-seeing-it-work.md) | Real devices, honest instruments, and leaving the room as you found it. |
| [05. Shipping](docs/path/05-shipping.md) | Every store from the command line. |
| [06. Keeping it running](docs/path/06-keeping-it-running.md) | Pulse, the CI fleet, and loops. |
| [07. Raising the ceiling](docs/path/07-raising-the-ceiling.md) | New features on the newest devices, without raising the floor. |
| [08. Working with AI](docs/path/08-working-with-ai.md) | Make the repository remember, so the agent can. |

Keep [Talking to your agent](docs/path/talking-to-your-agent.md) open
the whole way through. It is the set of moves I actually use, in the
words I actually typed, and every stage points back to it.

Teaching with it? `COURSE.md` maps the stages to weeks.

## Using it for your app

1. Click **Use this template** on GitHub to make your own copy.
2. Open it with your agent: Claude Code, Gemini CLI, Antigravity, or
   any agent that reads `AGENTS.md`. That file gives the agent the rules
   and the skill table, so it already knows how this template builds.
   (`CLAUDE.md` imports it, and `GEMINI.md` points to it.)
3. Tell it why your app exists (stage 00), then what you want and where
   the truth lives (stage 01). It will build the first version and put
   it live at an address you can open on your phone.

Everything else waits until you need it. `docs/path/talking-to-your-agent.md`
is the one page to keep open while you work.

## What is in the box

| Where | What it is |
|---|---|
| `AGENTS.md` | The agent's instructions: who the app is for, the rules, which skill to use when. `CLAUDE.md` imports it and `GEMINI.md` points to it, so every agent reads the same file. |
| `SCRATCHPAD.md`, `DECISIONS.md`, `PARITY.md`, `DEEP_LINKS.md` | The project's memory: current state, the reasons behind choices, what exists on which platform, and the link contract. |
| `docs/path/` | The nine stages. |
| `docs/` | The reference docs each stage points to. Map: [`docs/README.md`](docs/README.md). |
| `.claude/skills/` | 146 skills, 56 of them written from shipped apps. Catalog: [`.claude/skills/README.md`](.claude/skills/README.md). |
| `tools/` | Device testing, store submission, CI and Pulse tooling. Catalog: [`tools/README.md`](tools/README.md). |
| `index.html`, `css/`, `js/` | The web app: plain HTML, CSS and JavaScript, no build step. |
| `apple/` | Swift starter for one universal Xcode target (iPhone, iPad, Mac, Apple TV). See `apple/README.md`. |
| `android/` | Kotlin and Jetpack Compose starter. See `android/README.md`. |
| `windows/` | Optional Avalonia starter, built and tested entirely in CI. See `windows/README.md`. |
| `tv.js`, `tv.css`, `tv/`, `cast/` | The smart-TV layer over the web app (LG, Samsung) and a Google Cast receiver. |
| `pulse/` | The product-health dashboard. |
| `.github/workflows/` | Cloud builds and store submission, plus guardian workflows that ship switched off. |

Every starter compiles out of the box, and every starter opens straight to
a screen through debug-only launch doors, so testing and store
screenshots work from day one.

## Where this came from

This is the sixth generation of a template I started for BOBA Playbook, and each app since has folded its lessons
back in:

- **BOBA Playbook** gave it the parity matrix, the design-doc
  discipline, the four questions, and a set of lessons about data,
  images, and marketplaces.
- **Bsky Dreams** gave it values-based feed ranking, reader mode, and
  the share extension.
- **Tidbits Trivia** gave it cross-platform multiplayer, determinism
  across languages, Windows from a Mac, and the first device fleet.
- **Archive Watch** gave it most of the rest: the shared data plane,
  the Apple TV and smart-TV platforms, real-device testing, cloud store
  submission, the CI fleet, Pulse, and the floor-by-hardware rule.

`docs/PROVENANCE.md` records where each lesson came from.

## Contributing

`CONTRIBUTING.md` has the rules for changes to the template itself. The
short version: update `PARITY.md` with every user-facing change, lead
decisions with why, and write prose the way `docs/maintaining/WRITING.md`
describes.

MIT licensed.

Start with stage 00. It is the part most worth keeping.
