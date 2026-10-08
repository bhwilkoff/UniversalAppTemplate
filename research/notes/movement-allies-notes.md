# Who is already doing this work, and how Human Shaped joins in

*Research, October 8, 2026, in two rounds. Written by Claude, awaiting
Ben's review. Not site copy, and nothing here is in Ben's voice.*

Ben asked for "multiple rounds of research on other organizations that
are aligned with the goals of Human Shaped," on movements and ideas that
already fit the principles, and on the people who have written or
talked about them, because "if we are going to lead a movement (and a
set of cohorts that embrace the movement), we need to understand who is
already aligned with these efforts and how we might be able to join in
the work that is already ongoing."

**Round 1** swept five areas: education, software movements, AI ethics
and politics, writers and thinkers, and what is new in 2025 and 2026.
**Round 2** went deep on the ten strongest allies, checked what round 1
could not, filled the gaps (outside the US, disability, Indigenous data,
teachers, older adults and faith groups, and precedents for a mark), and
looked at money and structure. The full files, about 41,000 words with
every fact marked **Checked** (opened that day) or **From memory**, are
in `research/notes/allies/`:

| File | What it holds |
|---|---|
| `r1-education.md` | 24 educational organizations and learning movements |
| `r1-software.md` | 27 software movements and communities |
| `r1-ethics.md` | About 35 organizations, campaigns, and policy frames for human-first AI |
| `r1-thinkers.md` | 38 writers and thinkers, the critique in three lessons, a ten-item reading list by week |
| `r1-wave.md` | 2025 and 2026: courses, events, manifestos, backlash, funders, channels |
| `r2-deep.md` | The ten strongest allies: the door, what we can offer, friction, a first step |
| `r2-verify.md` | Round 1's open leads, confirmed or corrected |
| `r2-gaps.md` | 36 entries outside round 1's US and English-speaking lens, and what makes a self-declared mark trusted |
| `r2-funding.md` | Fiscal sponsors and open calls through mid-2027 |

Where round 2 corrected round 1, round 2 wins. The two corrections that
matter: the **Center for Humane Technology** told its community on
October 1, 2026 that its program work ends after October (its course is
paused, its fellows program cancelled), so it is no longer a partner to
plan around; and **Rust** did not ban AI by default, it adopted a
policy for its main repository that lets AI "answer, analyze, review"
but not create.

---

## 1. The shape of the wave

Human Shaped is not alone, and it is not early. Five currents already
run in the same direction, and the course sits where they meet.

1. **Personal and community software.** Clay Shirky's situated software
   (2004), Robin Sloan's "An app can be a home-cooked meal" (2020),
   Maggie Appleton's "barefoot developers" (Local-First Conf, 2024), and
   Ink & Switch's "Malleable Software" (June 2025) all describe software
   made by and for a few people who know the problem. Appleton's talk is
   the nearest outside statement of what the course teaches. The living
   communities are **local-first** (Local-First Conf, lofi.so) and
   **IndieWeb** ("make what you need, use what you make").
2. **Builders who use AI and keep their agency.** Recurse Center's
   July 2025 position ("use AI-powered tools to complement or increase
   your agency, not replace it"), Simon Willison on AI-assisted
   programming that is not vibe coding, Kent Beck's "Augmented Coding",
   and Craig Mod, who builds his own tools with AI but says "I don't
   ever want it touching the writing itself". That is principle 13 in
   another person's words. Jeremy Howard's solveit course ("Don't
   outsource your thinking to AI", five weeks) is the closest method
   match, and it costs $500.
3. **Learning by making, and teachers teaching teachers.** Constructionism
   and Scratch, the Raspberry Pi Foundation's new unit (September 2026)
   that teaches students to ask an AI for guiding and challenging
   feedback instead of answers, P2PU and libraries' AI learning circles,
   Fab Academy's many local teachers sharing one course, the National
   Writing Project's 144 local sites, and Edcamp.
4. **Human-first AI as civic and political work.** The Resonant
   Computing Manifesto (December 2025: private, dedicated, plural,
   adaptable, prosocial), Data & Society's AI Civics (launched May 2026
   to train trainers toward a national civic coalition), the Collective
   Intelligence Project, the Design Justice Network, the Public AI
   Network, Indigenous data sovereignty (CARE principles, Te Hiku Media,
   Local Contexts), disability justice (Sins Invalid's principles,
   Knowbility), and labor's new contract terms (under the WGA's 2026
   contract, a writer may choose AI but cannot be required to use it).
5. **Refusal.** Audrey Watters ("Ed-Tech Criticism. AI Refusal."),
   Civics of Technology's "Against Tech Hype" conference, the July 2025
   educators' refusal letter (1,458 signatures), writing faculty's
   right-to-refuse resolution (CCCC, March 2026), Fairplay's call with
   260+ groups for a five-year pause on generative AI in preK-12
   schools, The Odin Project ("We do not recommend using AI tools for
   your learning"), and NLnet, which says work that is "mostly
   LLM-generated is already ineligible" and is writing a stricter
   policy now.

The fifth current is made of Ben's own colleagues. Educators are the
course's likeliest students and teachers, and many of the most
thoughtful ones are refusing. Human Shaped will be judged by them first.

## 2. Where Human Shaped fits, and what only it adds

Most of the groups in the first four currents either **talk about**
human-first AI (policy, critique, manifestos) or **build** without
teaching anyone new to build. The communities that build (local-first,
IndieWeb, Recurse) are made of people who already program. The ones
that teach (Raspberry Pi, Hack Club, P2PU) mostly serve young people or
teach *about* AI rather than building *with* it. The paid cohorts that
teach non-programmers to build with agents (Maven and its like, some at
$2,500) are for founders.

What nobody else found in this research offers, all at once:

- **Free cohorts that take a non-programmer from their own problem to a
  shipped app,** working with an agent.
- **Values written where the agent reads them** (principle 3). Spec Kit
  has a "constitution" step and AGENTS.md now claims over 60,000
  projects, but neither says what the values should be. Human Shaped is
  the only effort found that puts human-first values in front of the
  agent as the method itself.
- **Anyone may teach,** with a public hub of apps and a mark for
  declaring how software was made.

That is the gap to stand in. The rest of the field is where to borrow,
cite, show up, and give back.

## 3. The critique, and what it should change

The strongest critics would say three things (`r1-thinkers.md`,
section 5). Each is a reason to change something, not only to answer it.

1. **"Your AI is not a tool."** L. M. Sacasas, June 22, 2026: "Your AI
   is not a tool. It is an environment, and you are in it." The course
   leans on the phrase "a tool that people wield." It should also say
   how its practices (writing first, the student's own words, small
   groups, the teacher's feedback before the agent's) keep a student
   aware of how the agent is shaping them.
2. **"A free course is still marketing for Anthropic and Google."**
   (Watters, Crawford, Hao; the Humanity AI call prefers open-weight
   models.) Name the costs the student does not pay (energy, labor,
   data), name Claude and Gemini side by side, and keep an open path
   visible. The Public AI Network serves public models (Apertus,
   SEA-LION) for free with no training on prompts; trying one in a
   cohort, in public, would be the honest answer.
3. **"Crediting the agent treats it as a mind."** (Bender and Hanna,
   Lanier.) Principle 14 could say plainly that crediting an agent is a
   record of which tool did what, not a claim of authorship.

**A decision for Ben: how commits credit the agent.** The open-source
world is settling on a convention (`r2-verify.md`, item 6). The Linux
kernel uses `Assisted-by:` and says agents never add `Signed-off-by`.
Fedora, Rust, and Software Freedom Conservancy ask for disclosure. A
September 2026 study of 281 project policies found 83% allow AI, 15%
forbid it, and no shared trailer, and several projects strip or reject
`Co-authored-by` for agents. This project and the template use
`Co-Authored-By: Claude`. That fits principle 14's spirit, but it is the
form the critics object to, and it can get a student's contribution
turned away upstream. Worth a DECISIONS.md entry either way.

**The mark needs one line beside it.** "Not By AI" and the Authors
Guild's "Human Authored" both define human work as work with no AI in
it. A human-shaped app could never honestly carry either one, and a
visitor who knows them will read "human-shaped" as "no AI." The brand
kit should say what the mark claims and what it does not.

**The best model for the mark is Local Contexts** (`r2-gaps.md`). Its
Labels are applied only by the community with authority, institutions
can apply only Notices that flag a community's interest, and every mark
links to a public record. A trusted self-declared mark links to its
evidence, lets only the right party declare, keeps the icon fixed while
the words can be local, has an honest form for "not yet", gives no
score that lets strengths hide weak spots, and is cheap to check.
HUMAN-SHAPED.md already does most of this; the Notice idea is the
missing piece.

## 4. Who to approach, in order

Each row is the door found on the organization's own site, and what
Human Shaped can bring, not only ask for. Details and contacts by role
are in `r2-deep.md` and `r2-gaps.md`.

| # | Who | Why them | The door | What we bring |
|---|---|---|---|---|
| 1 | **Collective Intelligence Project** (Weval) | Works with the labs the course uses, so no stance conflict; has education evaluations but none on coding agents | Contribute an evaluation through weval.org/sandbox or a pull request to github.com/weval-org/configs (CC0) | An open test of whether coding agents follow the human-shaped method, which a cohort could write. Principles 3, 6, and 9 in practice |
| 2 | **Data & Society, AI Civics** | Two-year train-the-trainer program toward a civic coalition; "educational communities" is a named later sector | Organization interest form (mailchi.mp/datasociety/ai-civics); program director Meg Young | A working many-teachers model and cohort apps as cases |
| 3 | **National Writing Project** | Teachers teaching teachers at 144 local sites; writing comes first in the method too | Local sites and the national network | The likeliest source of cohort leaders; a cohort shaped for writing teachers |
| 4 | **Resonant Computing** | The closest manifesto; a new Lab that lists aligned gatherings and takes project nominations | Sign-up form, the open theses document, Lab nominations | Cohort apps as examples of its five values; a thesis on values written for agents |
| 5 | **Local-first and IndieWeb** | The communities whose talks describe what the course teaches | lofi.so monthly online meetups and Discord; Local-First Conf 2027 (Berlin, May 25 to 26, call for talks around January); Homebrew Website Club (anyone can start one), IndieWeb's "Build Don't Buy" Create Day on November 27 | Non-programmers who ship small, owned software. IndieWeb's wiki bans AI-written content, so lead with what the student wrote |
| 6 | **Design Justice Network** | Its principles are the closest outside statement of principle 1 | Sign the principles (no review step); membership is pay what you can or volunteer time | A cite in PRINCIPLES.md already exists; signing makes it mutual. It is openly wary of Big Tech, so expect hard questions |
| 7 | **Civics of Technology** | The most serious critic, and Ben's own field | Guest blog pitches through its proposal form; its conference has been every early August | A candid post on what the course does about the critique. If it is welcome here, it is welcome anywhere |
| 8 | **Knowbility** (AIR, AccessWorks) | Testers with disabilities, and an event that is already volunteers building for a community | AIR's annual event; AccessWorks for testing | Principle 7 for real; studies find agents write inaccessible code unless asked, so the template should ask by default |
| 9 | **Libraries and P2PU** | Toronto Public Library's AI learning circles end in December 2026; libraries gather adults with a host, not an expert | TPL's program team; P2PU looks dormant (no open circles, last forum post June 2026) | A free follow-on cohort, and a library-ready version of Cohort Prep |
| 10 | **Local Contexts** | The best precedent for the mark | support@localcontexts.org | Credit in the brand kit, and a request to review the declaration's design |

**Cite and learn from, without asking anything:** Recurse Center (no
partner door, but its stance is the course's in other words), the
Raspberry Pi Foundation's feedback unit, Fab Academy's Node model,
Hack Club's rule against "fully vibe coded" projects (teens who age out
at 19 fit the adult cohorts), Edcamp as the free teacher-run event to
recommend on /events/, and the Alliance of Civic Technologists (the old
Code for America brigades: civictechnologists.org, groups apply to
join).

**Read, do not court:** DAIR, AI Now, Fairplay, Audrey Watters, and
NLnet's coming policy. Answering them in public teaches more than
asking them for anything.

**Judgment calls for Ben:** the Pro-Human AI Declaration (organizations
can sign; its 313 signers run from labor unions and Randi Weingarten to
Steve Bannon), anything branded by Anthropic or Google (Claude Campus
Builder Clubs, Claude Corps, Claude for Teachers; useful places to meet
people, costly to independence if the course leans on them), and the
AFT's AI academy, which is funded by OpenAI, Microsoft, and Anthropic.

## 5. Dates in the next three months

| Date | What | Note |
|---|---|---|
| Oct 14 | Homebrew Website Club; Recurse Center's public talk on AI agents | Attend |
| Oct 21 | **Humanity AI open call** closes, 4:59 pm PT | $75K to $1M. Needs a 501(c)(3) lead; rules out work that is "primarily" AI literacy or promotes specific tools; prefers open-weight models. Only as a collaboration, with a partner leading (Data & Society is the natural one), and only if a partner says yes this week |
| late Oct | CSTA 2027 proposals (Anaheim, July 8 to 11) likely close | Confirm the date now |
| Oct 26 | EIFL's library AI-literacy award closes | For a library partner, not for Human Shaped itself |
| Oct 28 to 30 | MozFest, Barcelona | Attend only; its session call is closed |
| Oct 31 | FOSDEM stands close | |
| **Nov 2** | **MIT Solve 2027 Global Learning Challenge** closes, noon ET | Needs a working prototype (the hub is one); $10K to every team selected; the AI for Humanity Prize adds up to $150K; no organization-type rule found. About 25 hours, plus April and September trips |
| Nov 14 to 15 | Opportunity Hack, Tempe | Mentor or judge applications open |
| Nov 16 | FOSDEM 2027 main track call closes (event Jan 30 to 31) | The right room for the crediting question |
| Nov 16 to 22 | Handmade Network Beta Week | |
| Nov 27 | IndieWeb "Build Don't Buy" Create Day | A cohort could join as a show-your-work session |
| Nov 30 | Prototype Fund round closes | Germany residents only |
| Dec 12 to 13 | IndieWebCamp San Diego (tentative) | |
| ~Jan 2027 | Local-First Conf call for talks | |
| Feb 2027 | Next Claude Corps cohort | A free cohort for fellows, if Ben wants that door |

## 6. Money and structure

Human Shaped has no 501(c)(3) of its own (checked against the IRS's
exempt-organizations file and ProPublica). Every call that requires one,
and the nonprofit discounts from Anthropic and GitHub, needs a fiscal
sponsor, a partner to lead, or a new nonprofit. The best general fit
among sponsors is **Social Good Fund** (8%, $29 a month refunded once a
project raises $5,000 in a year). Hack Club's HCB takes only teen-led
groups, NumFOCUS is closed to new projects, and Open Source Collective
cannot lead a 501(c)(3)-only call. Details are in `r2-funding.md`.

Worth Ben's time, in order: **MIT Solve** (low cost to independence),
**choosing a sponsor slowly** (it opens every other door, and the sponsor
holds the money), and **Humanity AI only through a partner**. The largest
grants bring the most pressure to reshape the method, toward open models
and away from naming Claude or Gemini. That pressure may even be
healthy, but it should be Ben's choice, not a grant's.

On free credits for students (GitHub Copilot for students, Google's
year of AI Pro for US college students through December 31, Claude for
Teachers if Anthropic's page confirms it), the course can tell students
about offers that already exist, but should never require one, should
name Claude and Gemini side by side, and should warn about auto-renewal.

## 7. What this could change in the site and template

These are proposals, each waiting on Ben.

1. **A reading list by week** (`r1-thinkers.md`, section 6), from Sloan
   and Appleton in Cohort Prep to Sacasas beside Narayanan and Kapoor in
   week 5. It belongs in the template (COURSE.md), with the site
   presenting it.
2. **A "kin" section on /about/ or /events/**: the movements Human Shaped
   stands beside (local-first, IndieWeb, Design Justice, Resonant
   Computing, Recurse's stance), each linked, so a newcomer sees a field
   and not a lone project. Principle 14, applied to the movement itself.
3. **One line beside the mark** on /start/brand/ saying "human-shaped"
   is not "no AI", and a Notice-style form for "not yet", after Local
   Contexts.
4. **A DECISIONS.md entry on how commits credit the agent.**
5. **Accessibility asked for by default** in the template's agent
   instructions, with Knowbility's AccessWorks as the way to test with
   people.
6. **An open-model experiment** in one cohort, through the Public AI
   Network, written up in public.
7. **A Weval evaluation** of the method, written by a cohort.

## Sources and limits

Nine files, each with its own sources. Several sites blocked automated
reading (Mozilla, the Verge, the New Yorker, Medium, Fedora's docs, and
Code for America's summit site); the files say where search summaries
stood in. Nilay Patel's "software brain" is from the Decoder episode
"The People Do Not Yearn for Automation" (April 23, 2026), quoted here
only through Daring Fireball, so check the wording on the Verge before
using it on the site. Nothing has been sent to any organization, and no
form has been filled in.
