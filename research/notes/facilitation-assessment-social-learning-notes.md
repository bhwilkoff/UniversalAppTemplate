# Facilitation, assessment, and social learning: do the teacher moves hold up?

*Research notes, October 3, 2026, written because Ben was not sure about
the teacher moves drafted into COURSE.md (DECISIONS.md, "Teacher moves
wait on more research"). Not site copy, and nothing here is in Ben's
voice. It builds on `pedagogy-and-showcase-notes.md` and
`assessment-and-credentials-notes.md` and does not repeat their sources
except where a claim depends on them.*

**How the sources are marked.**

- **Strong:** a meta-analysis or several randomized trials that agree.
- **Moderate:** one good randomized trial, a quasi-experiment, or a
  meta-analysis with known caveats.
- **Weak:** surveys, single-course studies, self-reports, preprints, or
  reports published by the program being studied.
- **Practice:** a practitioner method with long use and no controlled
  test. Useful, low risk, not proven.
- **Checked** means I found and read the source (or its abstract) in
  this session. **From memory** means I am citing it from prior
  knowledge and did not re-open it today; check it before quoting it
  anywhere public.

**How the other traditions are named.** Each tradition is attributed
here, in this file. In the right-hand column of the tables, and in any
change proposed for COURSE.md, it is restated in the course's own words
about learning and AI, so that the course never imports a vocabulary
its students would have to learn first.

---

## Part 1. The short answer

The session shape in COURSE.md is mostly right, and three things in it
are better supported than Ben may think: explaining one decision with
the agent closed, trying the prompt before seeing the real one, and a
check for understanding that the teacher reads before the next session.
Five things should change, and five are missing.

| Move in COURSE.md or showing-your-work.md | Verdict | One-line reason |
|---|---|---|
| A week before week 1, for setup and meeting your group | **Holds** | Every model of online facilitation puts access and belonging first (Salmon; Walton). |
| Groups that stay together, visible expectations | **Holds, with a default** | Make trios the default; no study I found compares pairs and trios online, but a pair breaks when one person is away. |
| Show the bring-back on the real device | **Holds** | A performance on the real thing is the assessment; nothing else in the course tests "can you use it". |
| Explain one decision with the agent closed | **Holds strongly** | The 2024 to 2026 AI studies converge here more than anywhere else. |
| Three questions for every bring-back | **Holds, needs one step before it** | The builder should say what they want to know first (Tuning protocol; Critical Response Process). |
| "Great job" answers nothing, so ask for one thing that worked and one that did not | **Holds** | Feedback about the person backfires (Kluger and DeNisi). |
| Read one real prompt, trying first | **Holds** | Productive failure and peer instruction both support "try alone, then compare, then see". |
| Hand the prompt reading to students by week 5 | **Change** | Right direction, too fast as written. Draw the situation from students' own bring-backs from week 3; volunteers lead in week 5. |
| Build time in the session | **Change** | The weakest use of live time. Shrink to about ten minutes and make it "send your first prompt before you leave". |
| Check for understanding "in a line in the chat" | **Change** | Answers in public chat copy each other. Answer privately (the M3 build already does this), and the teacher opens the next session with what they heard. |
| "One value at work" | **Change (reconcile)** | COURSE.md folds it into part 1; the /live/ agenda gives it its own seven minutes. Pick one. |
| Cameras welcome, never required | **Holds** | Camera reasons are unequal (Castelli and Sarvary); give other ways to be present. |
| A value is worth what it changed | **Holds** | It is a performance criterion, and the right one. |
| One lesson sent back to the template | **Holds** | It is how a newcomer moves from the edge of a practice toward its center (Lave and Wenger). Keep it small. |
| Partners reach out first when someone goes quiet | **Holds, add the teacher** | Recurse's faculty reach out when attendance drops; the teacher needs a weekly sweep too. |
| **Missing:** what "ready" means for each stage | **Add** | The README proposes "met or not yet" against each stage's "When you are ready to move on"; COURSE.md never says it. |
| **Missing:** a strong and a weak example before the first bring-back | **Add** | Criteria help only when people have seen what meeting them looks like (Jonsson and Svingby; Kulkarni). |
| **Missing:** the builder judges their own work before others do | **Add** | Self-assessment improves self-regulation (Panadero, Jonsson, and Botella). |
| **Missing:** what to do with the AI review | **Add** | AI feedback is accepted easily and improves work least (Weidlich). Decide what you think of it before acting on it. |
| **Missing:** how a new teacher learns to run a session | **Add** | The Carpentries and P2PU both train facilitators on a short, repeated script with practice. |

The tools worth building, in order of learning per hour of building, are
in Part 7. The first one is not a feature at all: if humanshaped.org's
Google account is on Workspace for Education Fundamentals, Meet has no
breakout rooms, so the course's central move (show your work in your
group) has nowhere to happen until each group has its own room.

---

## Part 2. Online facilitation of small live sessions

### 2.1 What the frameworks agree on

| Source | What it found or proposes | Strength and limits | In the course's words |
|---|---|---|---|
| Salmon, *E-Moderating* (2000; 3rd ed. Routledge 2011), five-stage model: access and motivation, online socialisation, information exchange, knowledge construction, development. Summary: https://edutechwiki.unige.ch/en/E-moderation_five-stage_model | People cannot do the work of stage 4 until stages 1 and 2 are done; each stage needs a different kind of help from the facilitator. Checked (summary). | Framework, built on forum courses, widely used, not experimentally tested. | The week before is for getting in and meeting people. Nobody is asked to critique anyone until they know who is in the room. |
| Garrison, Anderson, and Archer (2000), Community of Inquiry, The Internet and Higher Education 2(2-3):87-105, https://doi.org/10.1016/S1096-7516(00)00016-6 (in `pedagogy-and-showcase-notes.md` 4.1) | Social, cognitive, and teaching presence; teaching presence predicts the other two; online discussion rarely reaches "resolution". | Framework with a large survey literature. | The teacher's steering matters most, and the bring-back is the "resolution" most online classes never reach. |
| Rovai (2002), "Building sense of community at a distance", IRRODL 3(1); synthesis in Lowenthal et al. (2023), TechTrends, https://link.springer.com/article/10.1007/s11528-023-00904-3 | Sense of community has four parts (spirit, trust, interaction, common expectations) and is associated with small-group activities, group facilitation, social equality, and community size; stronger community went with less isolation and more perceived learning. Checked (abstracts and synthesis). | Correlational, survey based. | Small groups, said expectations, and a teacher who facilitates the groups rather than lecturing the room. |
| Bernard et al. (2009), "A meta-analysis of three types of interaction treatments in distance education", Review of Educational Research 79(3):1243-1289 | Designed interaction (learner with content, with other learners, with teacher) raised achievement; designed learner-content and learner-learner interaction showed the larger effects. From memory. | Meta-analysis, mostly pre-2008 courses. | Live time should be spent on people doing things with each other and with their apps, not on watching. |

### 2.2 The first minutes

What skilled facilitators do in the first five minutes, across the
programs I could check:

| Program | The opening | Source |
|---|---|---|
| P2PU learning circles | Every meeting has the same four parts: a 5 to 10 minute check-in (recap, personal goal for the meeting), material, a group activity, and a reflection. The check-in is consistent on purpose: "a reliable way to build community, recap previous sessions, and set expectations". | https://docs.p2pu.org/methodology/learning-circle-structure (Checked). Practice. |
| Recurse Center | Daily written check-ins on Zulip; "sharing a bug that's besting you in check-ins or presentations will help you get advice"; four social rules (no well-actually's, no feigned surprise, no backseat driving, no subtle -isms) explained at the start, once acted out by faculty breaking one on purpose. | https://www.recurse.com/manual and https://www.recurse.com/social-rules (Checked). Practice. |
| The Carpentries | Colored sticky notes as status flags all session (done, or stuck); "minute cards" before each break (one thing learned or liked, one thing confusing) that the instructors read and answer at the start of the next part. | https://carpentries.github.io/instructor-training/aio.html; https://carpentries.org/blog/2017/06/minute-cards/ (Checked). Practice, with a long record across thousands of workshops. |
| Liberating Structures, 1-2-4-All | Think alone for a minute, then in pairs, then fours, then the whole group: everyone has an answer before anyone speaks. | https://www.liberatingstructures.com/1-1-2-4-all/ (from memory; site checked in the earlier notes). Practice. |

**What this means here.** The /live/ agenda already opens with "Arrive:
one line in the chat, what you shipped or where you are stuck", which is
a P2PU check-in and a Carpentries status flag at once. COURSE.md's four
parts leave it out; it should be written in. Two teacher moves belong in
it:

1. **Close the loop from last week.** The teacher opens by saying, in a
   minute, what they read in last week's checks for understanding and
   what they changed because of it. This is the Carpentries minute-card
   habit, and it is the step that makes a check for understanding
   worth answering. Stephen Brookfield's Critical Incident
   Questionnaire rests on the same rule: report back what students
   said, every week, or stop asking (Brookfield, *Becoming a Critically
   Reflective Teacher*, 1995 and 2017; from memory). Practice.
2. **Read the "stuck" lines and route them.** A student who writes that
   they are stuck is asked, in the chat, whether they want to be the
   one whose stuck moment the group works on, or to stay a few minutes
   after. Nobody is called out by name for being stuck.

### 2.3 During small-group time

| Finding | Source | Strength |
|---|---|---|
| Students value breakout work when the task, the time, and the roles are clear, and some find unstructured talk with strangers stressful. | Edinburgh (2023) and Canadian student-perception studies, in `pedagogy-and-showcase-notes.md` 4.3 | Weak |
| Peer discussion produces real understanding, not copying: in a 350-student genetics course, 77 percent of students who got a question wrong, then right after discussing it with neighbors, also got a new question on the same idea right on their own. | Smith et al. (2009), Science 323:122-124, https://doi.org/10.1126/science.1165919 (Checked) | Moderate |
| Peer Instruction (answer alone, discuss, answer again) raised conceptual and quantitative mastery over ten years of physics courses. | Crouch and Mazur (2001), American Journal of Physics 69(9):970-977, https://eric.ed.gov/?id=EJ652839 (Checked) | Moderate (one program, many cohorts) |
| Pair programming improved assignments, exams, and pass rates across 18 studies and 3,308 students, but not attitudes. | Umapathy and Ritzhaupt (2017), ACM TOCE 17(4), https://doi.org/10.1145/2996201 (Checked) | Moderate |
| Waiting at least three seconds after a question changes who answers and how fully. | Rowe (1986), "Wait time: slowing down may be a way of speeding up", Journal of Teacher Education 37(1):43-50 (from memory) | Moderate, classroom studies |

**What the teacher does while groups work.** The programs above agree on
three things: the task is on screen in the group's room as well as the
main room (P2PU facilitator guides, https://docs.p2pu.org/courses/facilitator-guides,
Checked); the facilitator visits briefly and says so when arriving, so a
group does not stop to perform; and someone in each group keeps time.
The teacher's job is to listen for one pattern across groups to name
when everyone returns, which `pedagogy-and-showcase-notes.md` Part 7
already proposes.

**The Meet problem.** Google's own edition comparison lists breakout
rooms, polls, Q&A, and recording for Education Standard and Plus, and
not for Education Fundamentals; hand raising and 24-hour meetings are in
every edition (https://knowledge.workspace.google.com/admin/getting-started/editions/compare-education-editions,
Checked through a summarizer, and two vendor pages agree). DECISIONS.md
says recording "needs a paid license on this edition", which matches
Fundamentals. **Not verified:** which edition humanshaped.org's
Workspace is on. If it is Fundamentals, groups need their own Meet
links (each one created by meet@, so no 60-minute limit for three or
more people on a personal account applies), and the live page has to
send each group to its room and back. This is the first tool in Part 7.

### 2.4 The close

| Program | The close |
|---|---|
| P2PU | A planned reflection, "plus and delta": one thing that went well, one to change next time (https://docs.p2pu.org/methodology/learning-circle-structure, Checked). |
| Carpentries | The minute card: one thing learned or liked, one thing still confusing, read before the next part (Checked, above). |
| Liberating Structures | "What, So What, Now What" (from memory). The /live/ agenda's close already uses it. |

**Implementation intentions.** A specific "when and how I will do it"
plan roughly doubles follow-through compared with a goal alone, across
94 studies (Gollwitzer and Sheeran, 2006, Advances in Experimental
Social Psychology 38:69-119; from memory). Moderate to strong. In the
course's words: leave the session having already sent the first prompt
of the week, not just having named it. That is why Part 4 proposes
turning "Build" into "Start".

### 2.5 Synchronous and asynchronous

- Most of a five-week build happens alone, between sessions. COURSE.md
  and the earlier notes say "about 75 minutes live plus three to five
  hours on your own". Nothing I found argues for more live time; the
  meta-analytic record favors designed interaction of any kind over
  more contact hours (Bernard et al. 2009, above).
- Live time is the only time a person can be seen using their app by
  someone else. Spend it on that, on trying-then-comparing, and on
  starting. Spend asynchronous time on building, on mid-week posts, and
  on written feedback.
- Mozilla Open Leaders, the closest match to "one real project each",
  ran about three hours a week: one hour-long cohort call that
  introduced the next module and discussed the assignments, plus a
  30-minute mentor call every two weeks per project, with a final call
  where everyone shared a case study
  (https://tagteam.harvard.edu/hub_feeds/3865/feed_items/2279235/about,
  Checked; schedule at https://mozilla.github.io/leadership-training/schedule/,
  in the earlier notes). Weak (program description, no evaluation found).
  Lesson: a regular one-to-one touch per project, not only the group
  call. In a free cohort with one teacher, the group is that touch, and
  the teacher's feedback queue is the backstop.

### 2.6 Cameras optional

- Camera-off reasons are mostly appearance, who or what is behind you,
  and connection, and they fall unequally: 38 percent of
  underrepresented students worried about people behind them, against
  24 percent of others (Castelli and Sarvary, 2021, Ecology and
  Evolution 11(8):3565-3576,
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8057329/, Checked). Weak
  to moderate (one course, survey).
- Cameras on raised daily fatigue in a four-week field experiment, more
  for women and newer employees (Shockley et al. 2021, in the earlier
  notes). Moderate.

**What this adds.** COURSE.md's camera norms hold. What is missing is
other ways to be present: a line in the chat, a hand raised, the app
shown by sharing a phone's screen, and a written answer to the check.
Participation should never be measured by camera.

### 2.7 Belonging and trust

- Belonging interventions work where the setting gives people real
  chances to belong (Walton et al. 2023, Science 380:499-505, in the
  earlier notes). Moderate.
- People take learning risks when they believe mistakes will not be
  punished (Edmondson 1999, in the earlier notes). Moderate to strong.
- Growth-mindset messages ("not yet") have small average effects:
  Sisk et al. (2018), Psychological Science 29(4):549-571, found weak
  effects overall; Yeager et al. (2019), Nature 573:364-369, found a
  small effect, concentrated among lower-achieving students in
  supportive schools (both from memory). Moderate. "Not yet" helps as a
  rule about revision, not as a slogan.

**In the course's words.** Trust comes from the week before (a true
story about a rough first week, which COURSE.md has), from four short
social rules said aloud (Recurse; this fits DECISIONS.md's "said plainly
where people meet", and is not a covenant), and from the first
bring-back being low stakes.

### 2.8 How new facilitators learn

| Program | How it trains facilitators | Source |
|---|---|---|
| The Carpentries | A two-day instructor training (live coding, formative assessment, motivation), then a short "teaching demonstration" before certification, then usually co-teaching a first workshop. | https://carpentries.github.io/instructor-training/aio.html (Checked); the checkout steps from memory. Practice. |
| P2PU | Facilitators need no subject expertise and act "closer to a party host than a university lecturer"; each course has a weekly facilitator guide that turns material into an agenda. | https://docs.p2pu.org/facilitation/facilitation-basics (in the earlier notes); facilitator guides (Checked). Practice; one self-report survey found most circles completed. |
| Recurse Center | Faculty model the social rules, run check-ins, and reach out to anyone whose participation drops. | https://www.recurse.com/manual (Checked). Practice. |

**What this means here.** A new teacher should get, for each week, a
one-page guide: the situation for the prompt reading, the check
question, a strong and a weak example bring-back for the week's stages,
and the words for the opening and the close. They should sit in on (or
co-lead) one session of another teacher's cohort first. The /teach/guide/
page reads COURSE.md live; the weekly guides belong in the template so
anyone can run a cohort, and the site presents them.

---

## Part 3. Assessment that fits building a real thing

### 3.1 What each tradition says, and the evidence for it

| Tradition | What it is | Evidence | Strength | Fit for five weeks |
|---|---|---|---|---|
| Project-based learning | Learning organized around a sustained project with a real product. | Chen and Yang (2019), Educational Research Review 26:71-81: 30 studies, 12,585 students, mean effect 0.71 over traditional teaching; group size not a significant moderator (https://www.sciencedirect.com/science/article/abs/pii/S1747938X19300211, Checked). Condliffe et al. (2017), MDRC: positive associations, but the field lacks shared design principles, which makes effects hard to judge (https://www.mdrc.org/work/publications/project-based-learning, Checked). | Moderate (school-age, mostly quasi-experiments) | Already the course's shape: one real app. |
| Challenge-based learning (Apple, with the New Media Consortium) | Big idea, essential question, challenge, then guiding questions, solution, action, reflection. | Apple and NMC's own reports: a 2009 pilot (321 students, 29 teachers, six US high schools) and a 2011 implementation study (19 schools, 90 teachers, 1,500 students), with teacher and student self-reports of improved skills and engagement (https://eric.ed.gov/?id=ED532404, https://www.apple.com/ca/education/docs/NMC_CBLi_Report_Oct_2011.pdf, Checked). | Weak (published by the program's sponsors, self-report, no comparison groups) | The structure fits: the "why we build" paragraph is the essential question, the "Be ready to..." line is the challenge. The evidence does not add anything beyond PBL's. |
| Performance-based assessment | The learner does the real task in front of an assessor. | The strongest evidence is indirect: practice and feedback on the real task (formative assessment, Black and Wiliam 1998, in the earlier notes). | Framework plus strong indirect support | The bring-back on the real device is one. Keep it as the center. |
| Portfolio assessment | A body of work with the learner's reflection on it. | Mostly descriptive literature; I found no strong comparative trial in this pass. | Weak | The repository already is one (commits, DECISIONS.md, the note). The credential points to it. Nothing to build. |
| Competency-based assessment | Move on when you can show the competence, not when the clock says. | Launch School's model (earlier notes); higher-education studies are mostly descriptive. | Weak | Partly: the cohort keeps the clock, but the credential has no deadline (DECISIONS.md). |
| Specifications grading | Each piece is met or not yet against clear specs; revision is free or costs a token. | Hackerson et al. (2024), scoping review of 75 STEM studies on alternative grading: 106 outcomes positive and 38 trending positive, 10 negative (mostly pass and grade-distribution measures); no shared theory and few validated measures (Disciplinary and Interdisciplinary Science Education Research 6:15, https://diser.springeropen.com/articles/10.1186/s43031-024-00106-8, Checked). A 2024 instrument study found specs grading may not be achieving all its hypothesized outcomes (Journal of Chemical Education, https://pubs.acs.org/doi/10.1021/acs.jchemed.4c00698, Checked abstract). | Weak to moderate | "Ready or not yet" against each stage's "When you are ready to move on" is this, without grades. Low risk. |
| Ungrading | Remove grades; rely on feedback and self-assessment. | Blum (ed.), *Ungrading* (2020): argued from practice (from memory). Critics note self-assessment can favor confident students. | Weak | The course is already ungraded. The useful part is self-assessment, below. |
| "Not yet" | A result that says the work is not there yet, with revision expected. | Growth-mindset effects are small (2.7 above). Retakes raised students' sense of competence, autonomy, and relatedness in one STEM study (CBE Life Sciences Education, https://www.lifescied.org/doi/10.1187/cbe.24-06-0167, Checked abstract). | Weak to moderate | Keep as a revision rule: "not yet" says what is missing and costs nothing. |

### 3.2 Self and peer assessment that works

| Finding | Source | Strength |
|---|---|---|
| Self-assessment improved self-regulated learning (d from 0.23 to 0.65 across measures) and self-efficacy. | Panadero, Jonsson, and Botella (2017), Educational Research Review 22:74-98, https://doi.org/10.1016/j.edurev.2017.08.004 (Checked) | Strong for self-regulation; less for achievement |
| Peer assessment improves performance about as much as teacher assessment (g about 0.31). | Double, McGrane, and Hopfenbeck (2020), in the earlier notes | Moderate |
| Giving feedback teaches the giver. | Nicol, Thomson, and Breslin (2014), in the earlier notes | Moderate |
| Rubrics help when shared with exemplars and used for self-assessment. | Jonsson and Svingby (2007), in the earlier notes | Moderate |
| Peer grading gets more accurate after one practice round on staff-graded samples, and with plain, parallel criteria. | Kulkarni et al. (2013), in the earlier notes | Moderate |
| Students rated teacher feedback as less fair and were less willing to revise from it, yet teacher feedback improved their work the most; LLM feedback improved it the least. Sources were blinded. | Weidlich et al. (2025), Computers and Education Open 9, N = 90, https://www.sciencedirect.com/science/article/pii/S266655732500059X (Checked) | Moderate (randomized, small, one task) |
| Across 41 studies and 4,813 students, AI feedback and human feedback produced no significant difference in performance. | Kaliisa, Misiejuk, López-Pernas, and Saqr (2025), Educational Psychology, https://doi.org/10.1080/01443410.2025.2553639 (Checked abstract) | Moderate (meta-analysis of short, mostly writing tasks) |

**In plain words.** People learn most from judging their own work
against a clear picture of "ready", then hearing from peers who saw it,
with the teacher's feedback saved for where it changes the most. AI
feedback is not worse on average for a writing task, but it is the
feedback people take most easily and change least from.

### 3.3 Critique protocols

| Protocol (attributed) | Shape | Evidence | What the course should take, in its own words |
|---|---|---|---|
| Ron Berger and EL Education, "kind, specific, helpful"; "Austin's Butterfly" | Peers critique a draft against a model, the maker revises several times. | Berger, *An Ethic of Excellence* (2003); the video https://vimeo.com/38247060 (Checked). Practice; a demonstration, not a study. | Every round is a draft. The next version is the point of the feedback. |
| Tuning protocol (Coalition of Essential Schools; McDonald and Allen) | Presenter states a focusing question, shows the work; clarifying questions; warm and cool feedback while the presenter listens; presenter reflects. | Practice (https://www.schoolreforminitiative.org/protocols/, in the earlier notes). | **Say what you want to know before anyone answers.** This is the step showing-your-work.md lacks. |
| Critical friends groups (NSRF) | A stable small group that meets over time using protocols. | Curry (2008), Teachers College Record 110(4), found real benefits and real limits: groups drift into politeness without a facilitator (from memory). Weak (qualitative). | Stable groups need a protocol, or they become pleasant and useless. |
| Liz Lerman's Critical Response Process | Statements of meaning; the artist asks questions; responders ask neutral questions; opinions only with the artist's permission. | Used in dance and arts education since 1990 (https://lizlerman.com/critical-response-process/, Checked); a dance-composition classroom study found it reduced tension around critique (ResearchGate summary, Checked). Weak. | **The builder asks first.** Partners first say what the app is for, as they understood it, which is exactly showing-your-work.md's first question. |

**Verdict.** The three questions (where is it going, how is it going,
what is next) are Hattie and Timperley's feedback model and line up with
the first step of Lerman's process. They hold. What is missing is the
builder's own question at the start (Tuning, Lerman) and a moment of
clarifying questions before any opinion (Tuning). Add both, inside the
same time.

### 3.4 Which suit five weeks

- **Suits:** a performance on the real device every week; met or not
  yet against each stage's "ready" list; self-assessment first, peers
  second, teacher at the two moments that matter most; a portfolio that
  already exists (the repository); a final public showing.
- **Does not suit:** anything with a score, partial credit, or a
  rubric with levels (too heavy for five weeks and for volunteers to
  apply); tokens (there are no deadlines to buy back); quizzes with
  correct answers.

---

## Part 4. Social learning, especially online

### 4.1 Communities of practice and starting at the edge

- Lave and Wenger (1991), *Situated Learning*: newcomers learn by
  "legitimate peripheral participation", doing real but small work at
  the edge of a community and moving inward (earlier notes).
  Framework.
- Lurking is often how people join. Nonnecke and Preece's interviews
  found 79 reasons for lurking; the top five were not needing to post,
  learning the group's norms first, thinking that not posting was
  helpful, not being able to make the software work, and poor group
  dynamics. Many lurkers considered themselves members
  (https://www.cis.uoguelph.ca/~nonnecke/research/whylurk.pdf and
  https://www.dhi.ac.uk/san/waysofbeing/data/communities-murphy-preece-2004b.pdf,
  Checked). Weak (interviews, small).

**In the course's words.** Watching is a legitimate way to start, in
the hub and on GitHub. In the cohort, though, a person is never only
watching: the bring-back is real work every week, and sending one lesson
back to the template is the move from the edge toward the center. The
hub should never count posts as participation.

### 4.2 Cohort effects

- Cohort-based course completion figures (90 percent and up) are
  self-reported by companies that sell the format (earlier notes).
  Weak. The direction is believable; the numbers are not evidence.
- MOOC completion around 3 to 6 percent (Reich and Ruipérez-Valiente
  2019, earlier notes). Strong.
- The mechanism that is supported: being expected, by name, by people
  you know (Rovai 2002; Walton et al. 2023, above).

### 4.3 Peer instruction

Answer alone, then discuss, then answer again (Crouch and Mazur 2001;
Smith et al. 2009, above). Moderate. **In the course's words:** the
prompt reading already is this. Write your prompt alone, compare with a
partner, then see the real one.

### 4.4 Learning in public and working out loud

- Bryce Williams (2010) defined working out loud as "observable work
  plus narrating your work" (secondary summaries, e.g.
  https://lucidea.com/blog/working-out-loud/, Checked). Practice.
- Austin Kleon, *Show Your Work!* (2014): share the process, not only
  the finished thing (https://en.wikipedia.org/wiki/Austin_Kleon,
  Checked). Practice; a popular book, not research.
- I found no controlled study of learning in public as a learning
  method. The supported parts are underneath it: giving feedback
  teaches the giver (Nicol), and seeing others' work is a comparison
  people learn from (Nicol 2021, earlier notes).
- The counterweight: visible ranking hurts. Badges and a leaderboard
  lowered motivation and, through it, exam scores in a semester-long
  class, which the authors traced to social comparison (Hanus and Fox
  2015, earlier notes). Moderate.

**In the course's words.** Show the round, not the finish: the commit
feed and the bring-backs already do this. Never rank or count.

### 4.5 Stable groups or rotating partners

- **No study I found compares stable and rotating groups in an online
  cohort of adults building their own projects.** Not verified either
  way. The MOOC team-formation work (Wen, Kraut, Rosé and others at
  Carnegie Mellon) found peer learning fails without support and
  studied how teams are formed, not whether to keep them
  (https://arxiv.org/pdf/1404.5521; https://par.nsf.gov/servlets/purl/10080586,
  Checked as listings only).
- What supports stability: critical friends groups exist because
  feedback improves when the giver saw last week's version (Curry 2008,
  from memory); Rovai's small-group factor; Recurse and Mozilla both
  keep people with the same mentor or group.
- What supports some rotation: groups drift into politeness (Curry), and
  seeing more classmates' work widens comparison.
- **Pairs or trios.** Pair programming evidence supports pairs for
  shared work (Umapathy and Ritzhaupt 2017), but in this course each
  person builds their own app, so the group's job is witnessing and
  feedback, and a pair has no witness when one person is away. A trio
  gives each presenter two viewers, which is also what the README's
  "show it, live, to two people" assumed.

**Recommendation.** Trios by default, kept for all five weeks; a pair
only when the numbers force it, and then paired with another pair for
the bring-back. Change a group when one is not working, after a quiet
check by the teacher at the end of week 2. For breadth, add one
asynchronous look across groups in week 3 (open two apps from outside
your group and leave the three questions), and keep week 5's open
showing.

### 4.6 Keeping people from going quiet

| Move | Source | Strength |
|---|---|---|
| Faculty reach out when someone's participation drops; leaving is guilt-free. | Recurse manual (Checked) | Practice |
| Lurkers stay quiet when they cannot make the software work, or the group dynamics are poor. | Preece et al. 2004 (Checked) | Weak |
| Superposters in MOOC forums did not crowd others out; they drove engagement. | Huang et al. (2014), Learning at Scale (Checked as a citation; finding from a secondary summary) | Weak |
| Belonging is built early, with a true story that struggle is normal. | Walton and Cohen 2011; Walton et al. 2023 (earlier notes) | Moderate |

**In the course's words.** The partner reaches out first (COURSE.md
has this), and the teacher reaches out within two days of a missed
session or a week without a bring-back, privately and kindly, with an
easy way back in and an easy way out.

### 4.7 What platform features help, and what becomes noise

| Feature | Helps or noise | Why |
|---|---|---|
| Seeing classmates' live apps and commits | Helps | Comparison and witnessing (Nicol); it is the work, not talk about it. Already built. |
| Bring-backs with written feedback | Helps | Peer feedback (Double et al.). Already built. |
| One shared conversation space (GitHub discussions) | Helps if it is one place | P2PU and Recurse each use one channel per purpose; nothing I found supports more channels. |
| Like counts, reaction tallies, follower counts on apps | Noise, and harmful | Social comparison (Hanus and Fox); badges steer behavior toward the badge (Anderson et al. 2013, earlier notes). |
| Streaks, points, completion percentages | Harmful | Deci, Koestner, and Ryan (1999), earlier notes. |
| Notifications for every commit or post | Noise | My inference; no source. A weekly digest is enough. |
| Attendance or camera tracking | Harmful | Unequal camera reasons (Castelli and Sarvary); it measures presence, not learning. |

---

## Part 5. Learning with an AI agent beside you (2024 to 2026)

The earlier notes (Part 6) cover Bastani et al. 2025, Shen and Tamkin
2026, Lehmann et al., Prather et al. 2024, Kazemitabaar et al., Lee et
al. 2025, METR 2025, and the vibe-coding studies. What this pass adds:

| Study | What it found | Limits |
|---|---|---|
| Fan et al. (2025), "Beware of metacognitive laziness", British Journal of Educational Technology 56:489-530, https://doi.org/10.1111/bjet.13544 (Checked) | Randomized: learners with ChatGPT, a human expert, a checklist, or nothing. The ChatGPT group improved its essay scores most, but knowledge gain and transfer did not differ; their self-regulation processes differed. | Writing task, one session, students. |
| OECD Digital Education Outlook 2026, https://www.oecd.org/en/publications/oecd-digital-education-outlook-2026_062a7394-en.html (Checked through summaries) | Synthesis: general-purpose AI used without a teaching purpose raises performance on the task without raising learning; tools or teaching designed for learning show sustained gains. | A synthesis of the studies above, not new data. |
| Kaliisa et al. (2025), above | AI and human feedback produced similar performance gains. | Short tasks. |
| Weidlich et al. (2025), above | Students accept AI and peer feedback more readily; teacher feedback improves work most. | Small, one task. |
| Gerlich (2025), Societies 15(1):6, https://www.mdpi.com/2075-4698/15/1/6 (Checked) | 666 UK adults: heavier AI use correlated with lower critical-thinking scores (r = -0.68), through cognitive offloading. | Correlational, self-report, a correction was published; do not lean on it. |
| Mircea et al. (2026), arXiv 2604.24521, https://arxiv.org/abs/2604.24521 (Checked abstract) | 178 students on 18 capstone teams with real clients: teams themselves arrived at "verification and maintaining independent understanding" as their rules; clients expected standards for comprehension and quality. | Preprint, one course, baseline only. |

**In the course's words.** The agent makes a round look finished before
the builder understands it. That is the gap every study above keeps
finding, between how the work looks and what the person can now do on
their own. The course's three answers are the right ones and are
better supported now than when COURSE.md was written:

1. **Explain one decision with the agent closed** tests what is still
   yours. Keep it every week.
2. **Try the prompt yourself before you see the real one** keeps the
   thinking in the person (productive failure: Sinha and Kapur 2021,
   Review of Educational Research 91(5):761-798, found an advantage for
   conceptual knowledge when the design was faithful; from memory).
3. **Prove it on the device** answers "it looks done".

**What facilitators should add.**

- **Before acting on the AI review, write down what you agree with and
  what you do not.** showing-your-work.md already asks this of public
  comments ("decide what you think of it, and only then bring it to the
  agent"). Apply it to the human-shaped review too. This is the
  self-regulation step Fan et al. found the AI group skipped.
- **Ask the partner's question the agent cannot answer:** "What did you
  give up?" It is already in the template's suggested prompt; make it
  the clarifying question partners ask in the bring-back.
- **Say the honest thing in week 1:** what the research shows, what it
  does not, and that no study yet follows non-programmers shipping an
  app with an agent over weeks (earlier notes, 6.4).
- **Do not police the tool.** Guarded tutors that withhold help drew the
  lowest ratings and the most switching to outside chatbots (Eastwood,
  Denny et al. 2026, earlier notes). The course asks people to keep the
  deciding and judging, not to use the agent less.

---

## Part 6. Verdicts on each move, and the changes to COURSE.md

### 6.1 The session, rewritten as five parts

The /live/ agenda (`assets/cohort-lib.js`) and COURSE.md disagree today:
the agenda has six parts including "One value at work" and "Arrive";
COURSE.md has four. This version reconciles them, at 75 minutes, and
scales the way the agenda already does.

| Minutes | Part | What happens | What it rests on |
|---|---|---|---|
| 0-7 | **Arrive** | One line each in the chat: what you shipped, or where you are stuck. The teacher says what they heard in last week's checks, and what they changed because of it. | P2PU check-in; Carpentries minute cards; Brookfield. |
| 7-32 | **Show what you brought back** (trios, about 8 minutes each) | The builder says in one line what they want to know. Shows it on the device. Explains one decision with the agent closed. Partners ask one clarifying question ("what did you give up?" is a good one). Partners answer the three questions while the builder listens. The builder says what they will do next. | Tuning protocol; Lerman; Hattie and Timperley; Shen and Tamkin. |
| 32-38 | **One decision their values changed** | Back together. One volunteer. The teacher names one pattern they heard across groups. | "A value is worth what it changed"; teaching presence. |
| 38-63 | **Read one real prompt, trying first** | The situation on screen. Everyone writes their prompt alone, compares with a partner, then sees the real one; talk about the difference. Weeks 1 and 2: the teacher picks a situation from the path. Weeks 3 and 4: from a classmate's real stuck moment, with their permission. Week 5: a volunteer leads with their own. | Peer instruction; productive failure; worked examples that fade. |
| 63-75 | **Start, then check** | Everyone sends the first prompt of the week to their agent now, with a room open for anyone stuck. Last three minutes: two questions, answered privately on the live page: the week's question ("what can you decide or judge about your app now that you could not last week?") and "what is still muddy?" | Implementation intentions; minute cards; answers private so they do not copy each other (Smith et al.'s reason for voting alone first). |

### 6.2 Changes to COURSE.md, in one list

1. **Add "Arrive" as a part,** with the teacher closing the loop on last
   week's checks.
2. **Give the bring-back a first step and a second:** the builder says
   what they want to know, and partners ask one clarifying question
   before the three questions. Same time box.
3. **Settle "one value at work"** as its own short part after the
   groups, as the agenda already has it, and say so in COURSE.md.
4. **Fade the prompt reading through the cohort's own work:** path
   situations in weeks 1 and 2, classmates' situations in weeks 3 and 4,
   a volunteer leads in week 5. Remove the expectation that every
   student will lead.
5. **Turn "Build" into "Start":** about ten minutes, everyone sends the
   week's first prompt before leaving.
6. **Answer the check privately, not in the chat,** and add "what is
   still muddy?" The teacher reads both before the next session and
   says what changed.
7. **Add a short section, "Ready or not yet":** each stage's "When you
   are ready to move on" paragraph is the bar. The builder marks
   themselves first; a partner confirms by seeing it on a device; "not
   yet" says what is missing and costs nothing to redo. The teacher
   looks closely at week 4 (shipping), week 5 (the showing), and after
   anyone's second "not yet". This is what the README's section 8
   proposed; COURSE.md never adopted it.
8. **Show a strong and a weak bring-back in the week before,** and have
   everyone practice the three questions on the weak one once.
9. **Trios by default,** pairs only when numbers force it, a check on
   every group at the end of week 2, and one look across groups in
   week 3.
10. **Say the four social rules aloud in the week before** (adapted from
    Recurse, credited in the notes, not in the course).
11. **The teacher reaches out within two days** after a missed session
    or a silent week, privately, with a way back in and a way out.
12. **Before acting on the AI review, write what you agree with and what
    you do not** (in showing-your-work.md, beside "The human-shaped
    review, labeled as AI").
13. **A new teacher sits in on or co-leads one session first,** and uses
    a one-page guide for each week (a new file per week in the
    template, presented on /teach/guide/).
14. **Update "What I am unsure about":** pairs or trios now has a
    default and a reason; the prompt reading has a fading plan; add the
    open question of whether peers can confirm "ready" reliably.

### 6.3 Ben's three doubts, answered

| Doubt (DECISIONS.md) | Answer | Confidence |
|---|---|---|
| Pairs or trios | Trios. The group's job here is to witness and give feedback on each person's own app, and a trio keeps two witnesses when one person is away. No study compares them directly. | Moderate reasoning, weak direct evidence |
| Fading the prompt reading | Keep fading, but through the cohort's own stuck moments rather than a handover to students in week 5. Volunteers lead in week 5. | Moderate (worked-example fading is strong; the timeline is judgment) |
| Lessons sent back | Keep. It is the newcomer's move inward in a community of practice. Keep it one lesson per cohort, chosen together in week 5, credited, and never required of an individual. | Framework |

---

## Part 7. Tools for the hub, ranked by learning per hour of building

Hour estimates are mine, for this codebase as it stands (Supabase,
plain scripts, the M3 tables on the `m3-live` branch). They are
guesses, not measurements.

| Rank | Tool | Why it helps learning | Rough hours | Notes |
|---|---|---|---|---|
| 1 | **A room for each group.** One Meet link per group, created by meet@ through `tools/meet-events`, shown on the group card on /cohort/ and on /live/ during "Show what you brought back", with a "back to the main room" link. | Without breakout rooms (Education Fundamentals), the core move has nowhere to happen. | 3 to 6 | First confirm the Workspace edition. If it has breakout rooms, build nothing; write the steps in the teacher guide. |
| 2 | **Close the loop on checks.** On /teach/, last session's answers to both check questions, and one field, "what I heard, and what changes", shown at the top of /live/ during "Arrive". | Makes the check worth answering; the single highest-leverage facilitation habit across Carpentries, P2PU, and Brookfield. | 2 to 4 | M3 already stores answers privately to teachers. Add the muddy-point question as a default second check. Keep answers until the next session is over, at least. |
| 3 | **The group's protocol on /live/.** For the trio: the names in presenting order, each step of the bring-back with its own timer (reuse `runTimer`), and each presenter's "what I want to know" line. | Clear task, time, and roles are what make small-group time work (breakout studies; P2PU guides). | 3 to 5 | Pure page work over existing groups data. |
| 4 | **Ready or not yet on the bring-back.** When sharing a bring-back, the builder sees the stage's "ready" list, marks each item met or not yet, and writes what they want to know. A partner can confirm "seen on a device". | Self-assessment first (Panadero), peers second (Double); turns the README's model into something people do. | 4 to 8 | Extends `shares`. The list comes from the stage file, read live like render.js does. Never a score, never public outside the cohort. |
| 5 | **"Not seen this week," for teachers only.** A list of people with no bring-back, no feedback given, and no commits in the past seven days, worded as "reach out", with nothing stored beyond what students already shared. | Recurse's reach-out habit; quiet people leave without it. | 2 to 4 | Risk: it can feel like surveillance. Show it only to the cohort's teachers, from data students chose to share plus public commits, and never as a count shown to students. |
| 6 | **The weekly facilitator guide** (content, not code): for each week, the opening words, the prompt situation, the check question, and one strong and one weak bring-back. | How new teachers learn (Carpentries, P2PU); exemplars make "ready" mean something (Jonsson and Svingby). | Writing time, not build time | Belongs in the template beside COURSE.md; /teach/guide/ presents it. Ben's review needed. |
| 7 | **The show-your-work queue** (M3) | Useful for week 5's open showing and for "one decision their values changed". Little use inside trios, where the order is fixed. | Already built | Keep it simple. Do not extend it. |
| 8 | **A week 3 look across groups.** Two apps from outside your group suggested on /cohort/, with the three questions. | Breadth without breaking stable groups. | 1 to 3 | Uses existing shares and feedback. |

**Do not build:**

- Points, streaks, levels, badges along the way, completion
  percentages, or leaderboards (Deci, Koestner, and Ryan; Hanus and Fox).
- Like counts or reaction tallies on apps or bring-backs (social
  comparison).
- Attendance, camera, or time-on-task tracking.
- Quizzes with correct answers or scores. The M3 checks correctly have
  no correct-answer column; keep it that way.
- AI-written summaries of students for teachers, or AI grading of
  bring-backs. The teacher's reading is the point of the check, and
  teacher feedback is where improvement comes from (Weidlich).
- Automatic partner rotation.
- A second chat space beside GitHub discussions.

---

## Part 8. What I could not verify

- Which Google Workspace edition humanshaped.org is on, and so whether
  Meet has breakout rooms and polls for meet@.
- Any study comparing stable and rotating groups, or pairs and trios,
  in an online adult cohort.
- An independent evaluation of Apple's challenge-based learning; the
  reports I found are the sponsor's own.
- An evaluation of Mozilla Open Leaders' outcomes.
- The exact Carpentries certification steps today (teaching
  demonstration and community discussion) were cited from memory.
- Items marked "from memory" above: Bernard et al. 2009, Rowe 1986,
  Brookfield, Gollwitzer and Sheeran 2006, Sisk et al. 2018, Yeager et
  al. 2019, Curry 2008, Sinha and Kapur 2021, Blum 2020, and the
  Liberating Structures pages.
- Whether peers who are new to building can reliably judge "ready". The
  Kulkarni calibration result comes from MOOC essay grading, not apps.
