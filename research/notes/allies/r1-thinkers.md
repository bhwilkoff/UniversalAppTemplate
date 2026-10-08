# Thinkers and voices for Human Shaped (research round 1)

Researched October 8, 2026, for humanshaped.org. Written by Claude for
Ben's review; none of this is Ben's voice and none of it should go on
the site as copy without his reading.

**How facts are marked.**

- **Checked**: I opened the page this session and read the fact there.
  Every quotation in this file comes from a Checked page.
- **Search**: the fact came from search-result summaries this session,
  and I did not open the primary page. Treat it as likely, and open the
  page before citing it.
- **From memory**: from what I knew before this session. Verify first.

**The principles, by number** (short form, from the brief):
1 start from a human-shaped problem; 2 increase what people can do, not
profit extracted; 3 values written down as guardrails for people and
agents; 4 iteration, never ship a first draft; 5 grounded in research;
6 decisions with feedback; 7 tested the way people use it;
8 documentation as seriously as code; 9 share openly; 10 learning counts
as success; 11 people own their data; 12 create no new human problems;
13 the builder's own voice; 14 credit everyone, AI agents included;
15 bring joy to at least one person.

**Already cited in the template.** `docs/research/values-based-approaches.md`
already names Papert and Resnick (constructionism), and
`docs/human-shaped/not-vibe-coding.md` already cites Simon Willison.
`docs/human-shaped/computer-shaped-problems.md` cites Nilay Patel's
"software brain" through a Verge Decoder link
(theverge.com/podcast/917029/software-brain-ai-backlash-databases-automation),
which I could not open (the Verge blocks the fetcher), so the citation
stands on Ben's own reading.

---

## 1. The lineage

### Ivan Illich
- **Key idea.** Tools should widen what a person can do with their own
  hands and judgment, for purposes they choose, and should be limited
  so they do not make people dependent on institutions and experts. He
  calls these convivial tools, against manipulative ones.
- **Read.** *Tools for Conviviality*, 1973, Harper & Row. Wikipedia
  summary: https://en.wikipedia.org/wiki/Tools_for_Conviviality.
  Carl Mitcham's 2023 essay on it:
  https://thinkingafterivanillich.net/wp-content/uploads/2022/10/Tools-for-Conviviality-Argument-Insight-Influence.pdf
  (**Search**). The often quoted line ("easily used, by anybody, as often
  or as seldom as desired...") reached me only through a secondary blog;
  check it against the book before quoting.
- **Principles.** Supports 2, 11, 12, 10. Challenges the whole project
  in one way: Illich would ask whether a frontier AI model, owned by a
  few companies, can ever be a convivial tool.
- **Engage.** Cite in stage 00 and on /about/ as the oldest root of
  "increase what people can do". A short excerpt fits week 1 (Write).
  Sacasas (below) is the living Illich reader to invite.

### Ursula Franklin
- **Key idea.** Holistic technologies leave the maker in control of the
  whole work from start to finish; prescriptive technologies break work
  into steps controlled by someone else, and they breed a culture of
  compliance. She held that teaching and caring for people should stay
  holistic.
- **Read.** *The Real World of Technology*, the 1989 CBC Massey Lectures
  (book 1990, revised 1999), House of Anansi. Summary:
  https://peacemagazine.org/archive/v33n1p18.htm (**Search**; I know
  the book's argument **From memory**).
- **Principles.** Supports 1, 2, 10, 13. It is the clearest test for
  how a student uses an agent: is the student still holding the whole
  work (holistic), or following the agent's steps (prescriptive)?
- **Engage.** The single best frame for week 5's stage 08 (Working with
  AI). Free, Canadian, plain-spoken; the lectures are short enough to
  assign one.

### Seymour Papert
- **Key idea.** Children (and adults) learn best by building things they
  care about and can share, and the computer should be something the
  learner programs, not something that programs the learner.
- **Read.** *Mindstorms: Children, Computers, and Powerful Ideas*, 1980.
  Free PDF from the MIT Media Lab circulates (**From memory**).
- **Principles.** Supports 1, 10, 15, 9.
- **Engage.** Already cited. Use his "the computer programs the child"
  line as the cohort's warning about agents, once the exact wording is
  checked in the book.

### Neil Postman
- **Key idea.** Every technology is a trade: it gives something and
  takes something, its benefits and harms fall unevenly, and it changes
  the whole environment rather than adding one thing to it.
- **Read.** "Five Things We Need to Know About Technological Change",
  talk, Denver, 1998 (**From memory**; the PDF I tried would not open).
  *Technopoly*, 1992.
- **Principles.** Supports 12, 5, 6.
- **Engage.** The "five things" are a ready-made checklist for week 4
  (Publish, then write: what is happening to the app when I am not
  holding it?). Pair with Sacasas.

### Joseph Weizenbaum
- **Key idea.** The author of ELIZA, alarmed at how quickly people
  confided in it, argued that there are decisions computers should not
  be given, however capable they become: judgment is not calculation.
- **Read.** *Computer Power and Human Reason: From Judgment to
  Calculation*, W. H. Freeman, 1976.
  https://en.wikipedia.org/wiki/Computer_Power_and_Human_Reason
  (**Search**).
- **Principles.** Supports 6, 12, 13, and the course's rule that the
  agent's feedback never stands in for the teacher's.
- **Engage.** The ELIZA story is the origin of the course's stance that
  an AI is labeled as AI. A short reading for week 5 beside Turkle.

### Christopher Alexander
- **Key idea.** Good places are made by ordinary people using shared,
  named patterns, and grown step by step rather than designed at once.
  In 1996 he told a room of programmers that they carry responsibility
  for whether what they build makes life more whole.
- **Read.** "The Origins of Pattern Theory, the Future of the Theory,
  and the Generation of a Living World", keynote, OOPSLA, San Jose,
  October 1996. https://www.patternlanguage.com/archive/ieee.html
  (**Checked**). *A Pattern Language*, 1977; *The Timeless Way of
  Building*, 1979.
- **Principles.** Supports 4 (piecemeal growth), 8 and 9 (patterns as
  shared documentation), 3.
- **Engage.** The template's skills and memories are a pattern language
  in Alexander's sense. Cite in stage 08 and in the teaching guide.

### Douglas Engelbart
- **Key idea.** Computers should raise people's ability to understand
  and solve hard problems together, not replace them; the system to
  improve is the human, their tools, and their methods at once.
- **Read.** *Augmenting Human Intellect: A Conceptual Framework*, SRI,
  1962. https://www.dougengelbart.org/content/view/138 (**Checked**).
  Its definition begins: "By "augmenting human intellect" we mean
  increasing the capability of a man to approach a complex problem
  situation," (sentence continues).
- **Principles.** Supports 2, 10, 8 (he co-evolved tools and methods).
- **Engage.** Principle 2's oldest wording. Cite on /principles/ source
  notes and in stage 00.

---

## 2. Critics (the people who would push back on Human Shaped)

These are the voices most likely to critique a course that teaches
people to build with Claude and Gemini. Each critique teaches something
the course should answer in writing, not wave away.

### L. M. (Michael) Sacasas
- **Key idea.** Technology forms us as much as we use it; the questions
  to ask are about what a tool does to our attention, our relationships,
  and our moral life. In June 2026 he argued directly against the
  "AI is a tool" frame.
- **Read.** *The Convivial Society* newsletter,
  https://theconvivialsociety.substack.com (**Checked**: recent posts
  include "Your AI Is Not a Tool", June 22, 2026; "Owning Our Words:
  Sounding the Depths of Language", February 7, 2026). His forthcoming
  book *41 Questions: Technology and the Moral Life*, Avid Reader Press
  (**Search**; no date found). From "Your AI Is Not a Tool"
  (**Checked**): "Your AI is not a tool. It is an environment, and you
  are in it." and "I can pick up a tool and put it down, but the
  environment absorbs me into itself."
- **Principles.** Challenges the course's core stance ("AI is a tool
  people wield"). Supports 12, 13, 10.
- **What the critique teaches.** Human Shaped says the agent is a tool;
  Sacasas says no careful user is exempt from being shaped by it. The
  honest answer is to name the environment too: the noticing log, the
  rule that writing stays the student's, and the week 5 reflection are
  practices of attention, which is exactly what he recommends. Week 5
  could assign this essay and ask, "How has building with the agent
  changed what you notice?"
- **Engage.** The single strongest candidate to invite as a guest
  critic at a showing, or to pitch a conversation for his newsletter.
  His older "41 questions" list (2021) is a ready-made reflection tool
  (**From memory**).

### Audrey Watters
- **Key idea.** Education technology has a long history of promising to
  fix schools and mostly selling control, surveillance, and automation;
  she now writes openly as an AI refuser.
- **Read.** *Teaching Machines: The History of Personalized Learning*,
  MIT Press, 2021 (**From memory**). Newsletter *Second Breakfast*,
  tagline "Ed-Tech Criticism. AI Refusal."
  https://2ndbreakfast.audreywatters.com (**Checked**: posts through
  October 6, 2026). From "Move Slow, Remake Things" (September 5, 2026,
  **Checked**): the resistance "is, in part, about the loss of control;
  the loss of agency, autonomy, and privacy."
- **Principles.** Challenges the course's use of AI at all. Supports 11,
  12, 10.
- **What the critique teaches.** A free course that teaches people to
  use a commercial model looks, from her side, like ed-tech marketing
  done for free. The answer is in the course's own commitments:
  students own the repositories, the agent is read-only on the hub, the
  student decides whether to share what the agent said. Write those
  down on /about/ in plain terms, and say what the course does not
  claim (that AI improves learning).
- **Engage.** Cite her history in the teaching guide for teachers. Do
  not pitch her to endorse; she has said she refuses. A respectful link
  as "the strongest case against what we do" is the honest move.

### Emily M. Bender and Alex Hanna
- **Key idea.** "AI" is a marketing term that bundles very different
  systems; large language models produce plausible text without
  understanding, and the hype serves the companies selling them.
- **Read.** *The AI Con: How to Fight Big Tech's Hype and Create the
  Future We Want*, Harper, 2025 (**Search**). Their podcast *Mystery AI
  Hype Theater 3000* (DAIR) (**From memory**).
- **Principles.** Challenges the course's habit of speaking of the
  agent as a collaborator (14, credit AI agents, especially). Supports
  5, 12, 13.
- **What the critique teaches.** Principle 14 (credit AI agents) can
  read as treating the model as a co-author. Word it as recording which
  tool did what, the way a builder credits a library, and the critique
  becomes support.
- **Engage.** A chapter for week 1, when students learn why a computer
  cannot simply solve their problem. DAIR's community is a good place
  to listen, not to pitch.

### Brian Merchant
- **Key idea.** The Luddites were skilled workers fighting the use of
  machines against them, not against machines; AI is being used the
  same way against workers today.
- **Read.** *Blood in the Machine*, Little, Brown, 2023 (**From
  memory**). Newsletter https://www.bloodinthemachine.com (**Checked**:
  recent posts include "The real AI jobs apocalypse", September 4, 2026,
  and "California just passed the strongest AI labor laws in the US",
  October 1, 2026).
- **Principles.** Supports 2 (who gains), 12, 14.
- **What the critique teaches.** Ask, in week 1, whose work the app
  replaces, not only whose life it helps.
- **Engage.** The book's first chapters as a week 1 reading; his
  newsletter takes reader stories and might cover free, non-commercial
  cohorts as a counterexample.

### Cory Doctorow
- **Key idea.** Platforms decay in a predictable pattern: good to users,
  then to business customers, then they claw value back for
  shareholders. He calls it enshittification, and the cures are
  competition, regulation, interoperability, and worker power.
- **Read.** *Enshittification: Why Everything Suddenly Got Worse and
  What to Do About It*, MCD / Farrar, Straus and Giroux, 2025
  (**Search**). Daily blog https://pluralistic.net (**From memory**).
- **Principles.** Supports 2, 11, 9, 12. Gives the vocabulary for why
  Human Shaped insists on $0 to run and student-owned repositories.
- **Engage.** Cite on /about/ when explaining "for people instead of
  profit". A short Pluralistic post fits week 4 (keeping it running).

### Meredith Whittaker
- **Key idea.** AI agents that act for you need deep access to your
  messages, cards, and apps, which breaks privacy and security
  boundaries that took decades to build.
- **Read.** SXSW 2025 talk, reported by TechCrunch, March 7, 2025
  (**Search**). Signal's writing on AI agents (**From memory**).
- **Principles.** Supports 11, 12, and the hub's read-only agent design.
- **What the critique teaches.** The student's own agent connected to
  the hub is exactly what she warns about. The course's answer (agent
  tokens are read-only everywhere, the token lives in sessionStorage
  only) should be explained in plain words on /connect/, citing her.
- **Engage.** Cite on /connect/ and in stage 06.

### Kate Crawford
- **Key idea.** AI is not immaterial; it is built on mined minerals,
  energy, water, and underpaid human labeling, and it concentrates
  power.
- **Read.** *Atlas of AI*, Yale, 2021; "Calculating Empires" (with
  Vladan Joler), 2023 (**From memory**).
- **Principles.** Supports 12, 14, 5.
- **What the critique teaches.** The course says "$0 to run" for the
  student; it is not $0 for the world. One honest paragraph on the cost
  of the agent belongs in stage 08.
- **Engage.** A reading for week 5.

### Karen Hao
- **Key idea.** The leading AI company behaves like an empire, taking
  data, labor, and land from people who do not share in the gains.
- **Read.** *Empire of AI*, Penguin Press, May 20, 2025 (**Search**).
- **Principles.** Supports 12, 2, 14.
- **Engage.** Background for teachers; too long to assign in five weeks.

### Sherry Turkle
- **Key idea.** Machines that speak to us in a human voice change what
  we expect of each other, and the danger is not that they feel but
  that we stop asking people for what only people can give.
- **Read.** *Artificial Intimacy: Who We Become When We Talk to
  Machines*, Little, Brown, September 2026 (**Search**; dates differ).
  *Reclaiming Conversation*, 2015 (**From memory**).
- **Principles.** Supports 12, 13, and the course's rule that the
  teacher's and classmates' feedback is never replaced by the agent's.
- **Engage.** Brand new book; a strong week 5 reading and a good
  person to cite where the course explains why feedback happens in
  groups of three, face to face.

### Douglas Rushkoff
- **Key idea.** Technology should serve human connection; being human
  is a team sport, and much of the tech industry treats people as
  resources to extract.
- **Read.** *Team Human*, Norton, 2019 (**From memory**). The *Team
  Human* podcast, with several AI episodes in 2026 (**Search**).
- **Principles.** Supports 2, 12, 15.
- **Engage.** A podcast to pitch: a free course that uses AI agents to
  build small tools for people is the kind of tension his show likes.

### Jaron Lanier
- **Key idea.** "There is no AI": a model is a mashup of what many
  people made, and those people should be credited and paid (data
  dignity).
- **Read.** "There Is No A.I.", *The New Yorker*, 2023 (**Search**).
  *You Are Not a Gadget*, 2010 (**From memory**).
- **Principles.** Supports 14 strongly (credit everyone; he would say
  credit the people inside the model), 11, 13.
- **Engage.** Cite where principle 14 is explained.

### Ted Chiang
- **Key idea.** Art is the sum of many choices; a model that makes the
  choices for you removes what made the work yours.
- **Read.** "Why A.I. Isn't Going to Make Art", *The New Yorker*, August
  2024 (**Search**; I could not open the New Yorker).
- **Principles.** Supports 13 and the course's line that the student's
  writing stays the student's.
- **Engage.** The essay is the clearest argument for why stage 00 asks
  the student to write the problem statement themselves. Week 1 reading.

### Arvind Narayanan and Sayash Kapoor
- **Key idea.** AI is a normal technology: powerful, but adopted slowly
  and shaped by people and institutions, not an alien superintelligence.
  Most hype and doom are both wrong.
- **Read.** "AI as Normal Technology", Knight First Amendment Institute,
  April 15, 2025. https://knightcolumbia.org/content/ai-as-normal-technology
  (**Checked**). It opens: "We articulate a vision of artificial
  intelligence (AI) as normal technology." *AI Snake Oil*, Princeton,
  2024 (**From memory**).
- **Principles.** Supports 5, 6, 2; the closest match in the literature
  to the course's own stance.
- **Engage.** The best single reading for a cohort that holds a middle
  position. Week 5. Their newsletter (now *AI as Normal Technology*,
  **From memory**) might take a reader essay on teaching with agents.

### Kentaro Toyama
- **Key idea.** Technology amplifies whatever human intent and capacity
  is already there; it cannot substitute for it.
- **Read.** *Geek Heresy: Rescuing Social Change from the Cult of
  Technology*, PublicAffairs, 2015. https://kentarotoyama.org
  (**Checked**): the site describes "the theory that for the most part,
  technology amplifies underlying human forces".
- **Principles.** Supports 1, 10, 2. It explains why the course starts
  with a problem in the student's own life: the agent amplifies the
  student's care, or their lack of it.
- **Engage.** Cite in stage 00. University of Michigan School of
  Information; a guest for a teachers' session.

### Tressie McMillan Cottom
- **Key idea.** Technology and credentialing promise opportunity while
  often sorting people by class and race; she writes about who actually
  benefits.
- **Read.** *Lower Ed*, 2017; *Thick*, 2019 (**From memory**). Her *New
  York Times* columns on AI (**not found** this session).
- **Principles.** Supports 2, 12, and the course's free, open-to-all
  stance; a check on the Open Badges credential.
- **Engage.** Background for teachers; the credential pages should
  survive her reading.

### Ruha Benjamin
- **Key idea.** Technology encodes the hierarchies of those who build it,
  and imagination is itself a site of struggle; people can imagine and
  build otherwise.
- **Read.** *Race After Technology*, 2019 (**From memory**);
  *Imagination: A Manifesto*, W. W. Norton, 2024 (**Search**).
- **Principles.** Supports 1, 12, 15, 9.
- **Engage.** *Imagination* is short and hopeful; a fit for Cohort Prep
  or week 1.

### danah boyd
- **Key idea.** Data are social, made by people inside institutions,
  and their legitimacy comes from that context, not from the numbers.
- **Read.** *Data Are Made, Not Found*, University of Chicago Press,
  about September 2026. https://www.zephoria.org/thoughts/archives/2026/08/24/
  (**Checked**). *It's Complicated*, 2014 (**From memory**).
- **Principles.** Supports 5, 6, 11, and week 4's "one honest number".
- **Engage.** The new book is a strong fit for week 4, where students
  take one number back to their people.

### Cal Newport
- **Key idea.** Focus is a skill, and tools that fragment attention cost
  more than they save; lately, that AI's progress and its effect on
  thinking should both be judged soberly.
- **Read.** *Deep Work*, 2016; *Digital Minimalism*, 2019 (**From
  memory**). *Deep Questions* podcast, AI episodes 2025 and 2026
  (**Search**).
- **Principles.** Supports 12, 10.
- **Engage.** Optional; his audience is large and might care about a
  course that uses AI to build rather than to think.

---

## 3. Builders (people who build with AI and keep people central)

### Simon Willison
- **Key idea.** Building with an LLM is fine and fun, but if you will
  ship it, you must understand and be able to explain the code.
- **Read.** "Not all AI-assisted programming is vibe coding (but vibe
  coding rocks)", March 19, 2025.
  https://simonwillison.net/2025/Mar/19/vibe-coding/ (**Checked**):
  "I won't commit any code to my repository if I couldn't explain
  exactly what it does to somebody else." His blog,
  https://simonwillison.net, is active daily (**Checked**).
- **Principles.** Supports 4, 7, 8, 9, 14.
- **Engage.** Already cited. He links often to thoughtful projects; a
  student app with a good HUMAN-SHAPED.md and open repository is the
  kind of thing he notices.

### Kent Beck
- **Key idea.** "Augmented coding" keeps the craft's values (tests,
  simplicity, coverage) while the agent types.
- **Read.** "Augmented Coding: Beyond the Vibes", June 25, 2025.
  https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes
  (**Checked**): "In vibe coding you don't care about the code, just the
  behavior of the system." and "In augmented coding you care about the
  code, its complexity, the tests, & their coverage."
- **Principles.** Supports 4, 7, 8.
- **Engage.** Pair with Willison for week 3 (Seeing it work). A name the
  developer audience trusts.

### Geoffrey Litt (and Ink & Switch)
- **Key idea.** People should be able to reshape their own software;
  AI code generation helps but does not get us there by itself.
- **Read.** Geoffrey Litt, Josh Horowitz, Peter van Hardenberg, and
  Todd Matthews, "Malleable Software: Restoring User Agency in a World
  of Locked-Down Apps", Ink & Switch, June 2025.
  https://www.inkandswitch.com/essay/malleable-software/ (**Checked**):
  "AI code generation alone does not address all the barriers to
  malleability." One source lists Litt at Notion in 2026 (**Search**).
- **Principles.** Supports 2, 9, 11, 15.
- **Engage.** A reading for week 4 (Raising the ceiling). Ink & Switch's
  local-first community is a natural neighbor.

### Maggie Appleton
- **Key idea.** Language models could let "barefoot developers", capable
  non-professionals, build home-cooked software for their communities,
  and the defaults should keep them owning their data.
- **Read.** "Home-Cooked Software and Barefoot Developers", talk, Local-
  first Conference, Berlin, May 2024.
  https://maggieappleton.com/home-cooked-software (**Checked**): "Barefoot
  developers are going to be people who live in this middle bit." She
  now works at GitHub Next (**Checked**).
- **Principles.** Supports 1, 2, 11, 15. It is almost a description of
  the cohort's students.
- **Engage.** A Cohort Prep reading. A natural guest for a showing, and
  GitHub Next is the team behind tools the course already depends on.

### Robin Sloan
- **Key idea.** An app can be made for a few people you love, the way a
  home cook makes dinner, with no plan to scale.
- **Read.** "An app can be a home-cooked meal", February 2020.
  https://www.robinsloan.com/notes/home-cooked-app/ (**Checked**): "I am
  the programming equivalent of a home cook."
- **Principles.** Supports 15, 1, 2.
- **Engage.** The shortest and kindest reading for Cohort Prep or week 1.

### Craig Mod
- **Key idea.** He builds his own tools with AI agents (his newsletter
  sender, a members' social space) and will not let AI touch his
  writing.
- **Read.** "How a Writer Uses AI Without Losing His Voice", *AI & I*
  podcast (Every), July 8, 2026.
  https://every.to/podcast/transcript-how-a-writer-uses-ai-without-losing-his-voice
  (**Checked**): "But I don't ever want it touching the writing itself,
  because for me that's the whole point" and "So I think we're going to
  enter this golden age of tool building."
- **Principles.** Supports 13 directly, and 2, 15. He is the course's
  stance lived by one person.
- **Engage.** The best living example for week 1 and 5. A guest at a
  showing would be a coup; his *Roden* and *Ridgeline* newsletters
  reach readers who care about craft.

### Paul Ford
- **Key idea.** AI coding is a real disruption, and the strongest
  objections to it are valid; he hopes it makes software a more
  accessible craft without deprofessionalizing it.
- **Read.** "The A.I. Disruption We've Been Waiting for Has Arrived",
  *The New York Times*, February 2026 (**Search**; summary on
  https://simonwillison.net/2026/Feb/23/paul-ford, not opened). "What Is
  Code?", *Bloomberg Businessweek*, 2015 (**From memory**).
- **Principles.** Supports 2, 9, 10.
- **Engage.** Co-founder of Aboard; his podcast *Reqless* (**From
  memory**, verify name) could take a pitch about teaching non-
  programmers to build.

### Anil Dash
- **Key idea.** Most people who build technology hold a "majority AI
  view": LLMs are useful, but over-hyped and forced on everyone, and
  should be treated as an ordinary technology. He argues for many small
  independent AIs over a few giant ones.
- **Read.** "The Majority AI View", October 17, 2025.
  https://www.anildash.com/2025/10/17/the-majority-ai-view/ (**Checked**):
  "Technologies like LLMs have utility, but the absurd way they've been
  over-hyped, the fact they're being forced on everyone". "Maybe it's
  time for lots of little indie AIs to take over", June 15, 2026
  (**Checked**, title only).
- **Principles.** Supports 2, 9, 12; the course's stance in a builder's
  words.
- **Engage.** A good person to invite or pitch; he writes about humane
  tech and community, and links projects he likes.

### Nilay Patel
- **Key idea.** "Software brain": the habit of seeing every problem as a
  database to automate.
- **Read.** Decoder episode on software brain, *The Verge* (link already
  in the template; **not opened**, the site blocks the fetcher).
- **Principles.** The source of the course's starting contrast (1).
- **Engage.** Already cited. Decoder interviews executives, so a pitch
  is unlikely to land; a note to him once the course has a showing of
  real apps is reasonable.

---

## 4. Educators

### Ethan Mollick
- **Key idea.** Use AI deliberately, and decide which tasks stay human
  before defaults decide for you. In 2026 he wrote that the age of
  "co-intelligence" is giving way to agents.
- **Read.** *Co-Intelligence*, 2024 (**From memory**). *One Useful
  Thing*, https://www.oneusefulthing.org (**Checked**: "Choosing to Stay
  Human", May 26, 2026; "Co-Existence and the End of Co-Intelligence",
  June 4, 2026; "Agency and Agents", August 31, 2026). From "Choosing to
  Stay Human" (**Checked**): "Balancing using AI with our own mental
  abilities is going to be a defining challenge of the coming years."
- **Principles.** Supports 10, 13, 5. He is more enthusiastic than the
  course; useful as the optimistic pole.
- **Engage.** "Choosing to Stay Human" fits week 5. His newsletter
  reaches a huge teacher audience; a pitch about student-built apps with
  written values is plausible.

### John Warner
- **Key idea.** Writing is thinking and feeling; if AI can do an
  assignment, the assignment was not asking students to write.
- **Read.** *More Than Words: How to Think About Writing in the Age of
  AI*, Basic Books, 2025 (**Search**). Newsletter *The Biblioracle
  Recommends* (**From memory**).
- **Principles.** Supports 13, 10, 8.
- **Engage.** The argument behind "the problem statement is the
  student's own words". Week 1 reading; a likely guest for a teachers'
  session.

### Marc Watkins
- **Key idea.** Teachers need AI literacy and their own judgment, not
  bans or blind adoption; he tests tools in the classroom and reports.
- **Read.** *Rhetorica*, https://marcwatkins.substack.com (**Search**).
  He directs the AI Institute for Teachers at the University of
  Mississippi (**Search**).
- **Principles.** Supports 10, 6, 5.
- **Engage.** His institute trains teachers; a natural partner for the
  "anyone can teach a cohort" path.

### Leon Furze
- **Key idea.** GenAI in schools is following familiar ed-tech patterns
  ("GenAI is normal edtech"), and teachers need practical, ethical
  frameworks.
- **Read.** https://leonfurze.com/blog; *Practical AI Strategies*
  (**Search**). A May 13, 2026 post and episode, "GenAI is Normal
  Edtech" (**Search**).
- **Principles.** Supports 5, 10, 12.
- **Engage.** Australian; his podcast is his blog read aloud. A pitch
  about the AI Assessment Scale meeting a building course is plausible.

### Mike Caulfield
- **Key idea.** Information literacy as quick moves (SIFT); in 2025 he
  turned those moves into prompts that make a model check sources
  better.
- **Read.** *Verified* (with Sam Wineburg), Chicago, 2023 (**From
  memory**). *The End(s) of Argument* on Substack; the SIFT Toolbox and
  "Deep Background" prompts (**Search**).
- **Principles.** Supports 5, 3 (values and method written as prompts
  for agents), 8.
- **Engage.** His prompt work is the closest thing in education to the
  course's review skill. Worth a direct conversation.

### Punya Mishra
- **Key idea.** Teachers are designers of learning, and the question
  with AI is what we actually want learning to be, not what the tools
  make easy.
- **Read.** https://www.punyamishra.com; "Who Ordered That? On AI,
  Education, and the Illusion of Necessity", 2025 (**Search**).
- **Principles.** Supports 10, 1, 4.
- **Engage.** Arizona State; his creativity and design lens suits the
  teachers' guide.

### Dan Meyer
- **Key idea.** A self-described "token AI sceptic" in math education:
  learning is social and teachers matter more than chatbot tutors.
- **Read.** *Mathworlds*, https://danmeyer.substack.com (**Search**).
- **Principles.** Supports 10, 12, and the course's insistence on
  people giving feedback to people.
- **Engage.** He writes sharply about chatbot tutors; worth reading
  before writing the agent-feedback copy.

### Mitch Resnick
- **Key idea.** Projects, Passion, Peers, and Play; on AI, he warns
  against tools that answer for children and argues for tools that help
  them create.
- **Read.** *Lifelong Kindergarten*, MIT Press, 2017 (**From memory**).
  "Generative AI and Creative Learning: Concerns, Opportunities, and
  Choices", 2023 (**Search**; Medium blocks the fetcher).
- **Principles.** Supports 1, 10, 15, 9.
- **Engage.** Already cited. His four Ps map onto the cohort almost
  one to one, and the groups of three are "peers".

### Ben Shneiderman
- **Key idea.** Human-Centered AI: aim for high human control and high
  automation together, and design AI as a tool that amplifies people.
- **Read.** *Human-Centered AI*, Oxford University Press, 2022
  (**Search**).
- **Principles.** Supports 2, 6, 7, and the stance in the brief almost
  word for word.
- **Engage.** Cite where the course says "AI is a tool"; he gives it
  academic grounding, which balances Sacasas.

---

## 5. Honest summary of the critique

The sharpest critics (Watters, Bender and Hanna, Sacasas) would say
three things, and each has a lesson.

1. **"AI is not a tool."** (Sacasas.) The course should stop resting on
   that word alone and say how its practices (noticing, own words,
   groups of three, the teacher's feedback first) keep the student
   aware of being shaped.
2. **"A free course is still marketing for Anthropic and Google."**
   (Watters, Crawford, Hao.) Name the costs the student does not pay
   (energy, labor, data), and keep the open path (non-commercial models)
   visible in setup.
3. **"Crediting the agent treats it as a mind."** (Bender and Hanna,
   Lanier.) Word principle 14 as a record of which tool did what, and
   credit the people whose work trained the model where possible.

The builders (Willison, Beck, Litt, Appleton, Mod) mostly support the
method, and the educators (Warner, Resnick, Mishra, Meyer) mostly
support the human parts: own words, peers, problems from your own life.

---

## 6. Proposed reading list (one or two per week, all short)

| Week | Reading | Why here | Principles |
|---|---|---|---|
| Cohort Prep | Robin Sloan, "An app can be a home-cooked meal" (2020) | Gives permission to build small, for a few people | 1, 15 |
| Cohort Prep | Maggie Appleton, "Home-Cooked Software and Barefoot Developers" (2024) | Describes who the students are about to become | 2, 11 |
| 1 (Write) | Ted Chiang, "Why A.I. Isn't Going to Make Art" (2024), or one chapter of John Warner, *More Than Words* (2025) | Why the problem statement must be in the student's own words | 13, 1 |
| 1 (Write) | Kentaro Toyama, the amplification chapter of *Geek Heresy* (2015) | The agent amplifies the care you bring | 1, 2 |
| 2 (Play) | Ursula Franklin, *The Real World of Technology*, lecture on holistic and prescriptive technology (1989) | Are you holding the whole work, or following the agent's steps? | 2, 10, 13 |
| 3 (Play, publish) | Simon Willison, "Not all AI-assisted programming is vibe coding" (2025), with Kent Beck, "Augmented Coding" (2025) | What it means to know your app works | 4, 7, 8 |
| 4 (Publish, write) | Ink & Switch, "Malleable Software" (2025), or danah boyd on how data are made (2026) | Raising the ceiling; the one honest number | 2, 6, 11 |
| 4 (Publish, write) | Cory Doctorow, a short Pluralistic post on enshittification | Why the app is $0 and owned by its builder | 2, 11, 12 |
| 5 (Publish) | L. M. Sacasas, "Your AI Is Not a Tool" (2026), paired with Narayanan and Kapoor, "AI as Normal Technology" (2025) | Stage 08: the strongest critique beside the closest ally | 10, 12, 13 |
| 5 (Publish) | Christopher Alexander, OOPSLA keynote (1996) | Skills and memories as a pattern language for the next builder | 8, 9, 4 |

Ethan Mollick's "Choosing to Stay Human" (2026) is a lighter alternate
for week 5, and Sherry Turkle's *Artificial Intimacy* (2026) is the
best book for a teacher who wants to go further.

---

## 7. Unchecked leads

- Check the Illich conviviality quotation against the book before any
  use.
- Find and open Ted Chiang's New Yorker essay (blocked here) and the
  Verge software-brain episode, so both can be quoted.
- Mitch Resnick's newer writing (Medium blocked the fetcher); check
  web.media.mit.edu/~mres/papers.html for 2025 to 2026 work.
- Tressie McMillan Cottom's AI columns in the *New York Times*: none
  found this session.
- Paul Ford's podcast name and the exact NYT essay; open the original.
- Marc Watkins, Leon Furze, Punya Mishra, Dan Meyer: open each archive
  for 2026 posts before citing.
- Sacasas's *41 Questions* publication date (Avid Reader Press).
- Possible new voices not researched: Amy J. Ko (computing education,
  University of Washington), Hamel Husain and Eugene Yan on evaluation,
  Matt Webb (Interconnected) on small AI tools, Hillary Mason, Kyle
  Chayka (*Filterworld*), Ezra Klein's AI interviews, Margaret Mitchell
  (Hugging Face), Timnit Gebru (DAIR), Abeba Birhane, Safiya Umoja Noble
  (*Algorithms of Oppression*), Philip Agre ("Toward a Critical
  Technical Practice", 1997), Langdon Winner ("Do Artifacts Have
  Politics?", 1980), Lucy Suchman, Bret Victor (Dynamicland), Alan Kay,
  Jessica Riskin. Winner and Agre are strong lineage additions.
- Jonathan Haidt: left out; his work is on adolescents and phones, not
  on building tools, so it is not relevant here beyond his blurb on
  Turkle's book.
