# Pedagogy and showcase notes

*Research notes, 2026-10-01, for the Human Shaped Software course
(humanshaped.org). Read alongside `../UniversalAppTemplate/COURSE.md`,
`docs/path/00-why-we-build.md`, `docs/path/talking-to-your-agent.md` and
`docs/research/values-based-approaches.md`. Not site copy. Nothing here
has been reviewed by Ben.*

How to read the evidence tags:

- **Strong**: meta-analysis or several randomized trials that agree.
- **Moderate**: one good randomized trial, a quasi-experiment, or a
  meta-analysis with wide spread or known caveats.
- **Weak**: surveys, case studies, single-site qualitative work,
  preprints with small samples, or practitioner reports.
- **Framework**: a theory or design stance. Useful, not something an
  experiment proved.

---

## Part 1. The short version

Ten things the research says, in plain words, and what they mean for
this course.

1. **People learn more by doing than by listening.** Strong. The course
   is built on this already. Keep lecture under ten minutes a session.
2. **Beginners need to see it done before they do it, and need less of
   that as they get better.** Strong. "Read one real prompt together" is
   a worked example. Do more of it early, less later, and hand it to the
   students by the end.
3. **Trying first, then seeing the expert answer, beats seeing the
   answer first,** for the deep part of a skill. Moderate. Have students
   write their own prompt for a real situation *before* they see Ben's.
4. **Using AI to do the work can leave people worse at the work, and
   feeling better at it.** Moderate and growing. The loss comes from
   handing the thinking over, not from using the tool. The course's
   "what stays yours" list is the right answer. It needs one weekly
   habit that checks it: explain one part of your app without the agent.
5. **Novices cannot yet judge what the agent made, and know it.**
   Moderate. Judging has to be taught as a skill, early, not saved for
   stage 04.
6. **Feedback helps when it says where you are going, how you are doing,
   and what to do next. It hurts about a third of the time when it is
   about the person.** Strong. Give the show-and-tell a shape.
7. **Giving feedback teaches the giver as much as getting it teaches the
   receiver.** Moderate. The two-person bring-back already does this.
8. **Cohorts finish; self-paced courses mostly do not.** Strong for MOOC
   dropout, weak for the exact cohort numbers people quote. Keep the
   cohort; build small stable groups inside it.
9. **Belonging is built early and on purpose.** Moderate. Week 0 and
   week 1 should tell people that struggle is normal, with Ben's own
   rounds of feedback as proof.
10. **Video calls tire people, and cameras-on tires some people more
    than others.** Moderate. Cameras for showing, off for building, and
    never a long stretch of staring.

Where the course already does the right thing, it is listed in each
section as **Already doing**. Where it should change, **Change**.

---

## Part 2. Learning by doing

### 2.1 Active learning

**What the research says.**

- Freeman et al. (2014) pooled 225 studies of undergraduate science,
  engineering and math courses. Students in traditional lectures were
  1.5 times more likely to fail than students in active-learning
  courses, and exam scores rose about half a standard deviation.
  PNAS 111(23):8410-8415. https://doi.org/10.1073/pnas.1319030111
  **Strong.**
- Theobald et al. (2020) found active learning narrowed achievement gaps
  for underrepresented students, most in courses with a high share of
  active time. PNAS 117(12):6476-6483.
  https://doi.org/10.1073/pnas.1916903117 **Strong.**
- Deslauriers et al. (2019) found students *learned more* in active
  classes but *felt* they learned less, because the effort felt like
  confusion. PNAS 116(39):19251-19257.
  https://doi.org/10.1073/pnas.1821936116 **Moderate** (one course,
  well designed).

**In plain words.** Doing beats listening. And the doing feels worse
while it works better, so tell people in advance that the struggle is
the learning.

**Already doing.** Every week is doing. There is no lecture in the
session template.

**Change.** Say out loud in week 1 that the confused feeling is the
point, and that a lecture would feel better and teach less. One
sentence, with the Deslauriers finding behind it.

### 2.2 Project-based learning

**What the research says.**

- PBLWorks' "Gold Standard PBL" names seven design elements: a
  challenging problem or question, sustained inquiry, authenticity,
  student voice and choice, reflection, critique and revision, and a
  public product. https://www.pblworks.org/what-is-pbl/gold-standard-project-design
  **Framework** (practitioner).
- Condliffe et al. (2017), MDRC's review for the Lucas Foundation,
  found PBL promising but the evidence thin, mostly because "PBL" means
  many different things and few studies were rigorous.
  https://www.mdrc.org/publication/project-based-learning **Review of
  mixed-quality evidence.**
- Since then, two large randomized trials: Krajcik et al. (2023),
  2,371 third graders, PBL science beat control on the end-of-year test
  across demographic groups. AERJ 60(1):70-102.
  https://doi.org/10.3102/00028312221129247 And Saavedra et al. (2021),
  Knowledge in Action AP courses, 8 percentage points more students
  earned a passing AP score in year one.
  https://journals.sagepub.com/doi/10.1177/00317217211058522 and the
  full report https://cesr.usc.edu/sites/default/files/Knowledge%20in%20Action%20Efficacy%20Study_18feb2021_final.pdf
  **Moderate to strong** (K-12, with heavy teacher support built in).
- Chen and Yang (2019), meta-analysis of 30 studies: PBL had a medium
  to large effect on achievement over traditional teaching.
  Educational Research Review 26:71-81.
  https://doi.org/10.1016/j.edurev.2018.11.001 **Moderate.**

The common thread in the trials that worked: PBL with *a lot* of
structure, not open-ended projects.

**In plain words.** One real thing, built over time, for real people,
shown in public, revised after critique. It works when the structure
is strong.

**Already doing.** Six of seven Gold Standard elements: the one real
app (challenging problem), weekly laps (sustained inquiry), "for people
you can actually name" (authenticity), "of their own choosing" (voice
and choice), "Be ready to..." shown to two people (critique and
revision), and the app itself live in a store or at an address (public
product). The numbered steps in every stage are the structure the
trials say is needed.

**Change.** Reflection is the missing element. The bring-back is mostly
*show*; add one sentence of *tell* each week: what I learned about my
app, about the method, about myself (the three ways). Also add a public
end: a final showcase open to anyone, with each app and its builder's
paragraph.

### 2.3 Constructionism

**What the research says.**

- Papert: people learn best when they build something they can share
  and care about. *Mindstorms* (1980); Papert and Harel, "Situating
  Constructionism" (1991). http://www.papert.org/articles/SituatingConstructionism.html
  **Framework.**
- Resnick's four Ps: Projects, Passion, Peers, Play. *Lifelong
  Kindergarten* (MIT Press, 2017).
  https://mitpress.mit.edu/9780262536134/lifelong-kindergarten/ Also low
  floors, high ceilings, wide walls (already adopted in the template).
  **Framework.**

**In plain words.** Make something real, about something you love, with
other people, with room to mess around.

**Already doing.** Projects and passion fully. Peers through the
bring-back.

**Change.** Play is the weak P. The course is serious from week 1.
Give explicit permission to throw things away: "a working throwaway
version costs an afternoon" (from the values research) should become a
weekly invitation. One "try something you might delete" prompt per
stage. Peers could be stronger too (see 4.4, build buddies).

### 2.4 Problem-based learning

**What the research says.** Hmelo-Silver (2004) describes the model:
learners start from an ill-structured problem, work out what they need
to know, research it, and apply it, with a facilitator who models
thinking rather than giving answers. Educational Psychology Review
16:235-266. https://doi.org/10.1023/B:EDPR.0000034022.16470.f3
Dochy et al. (2003) meta-analysis: positive effects on skills, a small
negative effect on knowledge in the short term. Learning and
Instruction 13(5):533-568. https://doi.org/10.1016/S0959-4752(02)00025-7
**Moderate.**

**In plain words.** Start from a real problem, figure out what you
need to know, then go learn it. Good for doing; slower for knowing
facts.

**Already doing.** "Research first, then build" in the talking guide is
exactly this move, done by the agent on the student's behalf.

**Change.** Make sure the *student* reads the research the agent
brings back, and says in one line what it changed. Otherwise the agent
does the problem-based learning and the student does not.

### 2.5 Worked examples, guidance, and productive failure

This is the debate behind Ben's open question, "how much to leave to
discovery."

**What the research says.**

- Kirschner, Sweller and Clark (2006): minimal guidance does not work
  for novices; working memory is too small to discover and learn at
  once. Educational Psychologist 41(2):75-86.
  https://doi.org/10.1207/s15326985ep4102_1 **Strong for novices.**
- Hmelo-Silver, Duncan and Chinn (2007) replied: problem-based and
  inquiry learning are *not* minimal guidance; they are heavily
  scaffolded, and work. Educational Psychologist 42(2):99-107.
  https://doi.org/10.1080/00461520701263368 **Framework plus review.**
- The expertise reversal effect: guidance that helps novices gets in
  the way of people who know more. Kalyuga et al. (2003), Educational
  Psychologist 38(1):23-31. https://doi.org/10.1207/S15326985EP3801_4
  **Strong.**
- Productive failure: students who try a problem *before* instruction,
  and mostly fail, then learn more deeply from the instruction that
  follows. Kapur (2008), Cognition and Instruction 26(3):379-424.
  https://doi.org/10.1080/07370000802212669 Sinha and Kapur (2021)
  meta-analysis of 53 studies: a moderate advantage for conceptual
  knowledge and transfer when the design is faithful, none for
  procedural knowledge. Review of Educational Research 91(5):761-798.
  https://doi.org/10.3102/00346543211019105 Loibl, Roll and Rummel
  (2017) review: it works when the instruction afterward builds on the
  students' own attempts. Educational Psychology Review 29:693-715.
  https://doi.org/10.1007/s10648-016-9379-x **Moderate.**
- Cognitive apprenticeship joins these: modeling, coaching,
  scaffolding, then fading; with articulation, reflection and
  exploration. Collins, Brown and Newman (1989), in Resnick (ed.),
  *Knowing, Learning, and Instruction*. **Framework,** widely used.

**In plain words.** The two sides agree more than the fight suggests.
Beginners need a lot of showing. The showing should fade as they get
better. And for the deep part of a skill, trying first and then seeing
how an expert did it beats seeing it first.

**Answer to Ben's open question.** Lots of guidance at first, less each
week, and the room left to discovery should be *inside* a structure:
try first, then compare.

**Already doing.** The numbered steps (guidance). "Read one real
prompt together" (modeling a worked example). The talking guide's
moves (a library of worked examples).

**Change.**

1. **Try, then compare.** In the prompt reading, show the situation
   first (the screenshot, the bug, what the agent said). Each student
   writes the prompt they would send. Then show Ben's real prompt.
   Discuss the difference. This is productive failure with a worked
   example after it, and it costs no extra time.
2. **Fade on purpose.** Weeks 1 to 3: Ben models, students copy the
   shape. Weeks 4 to 7: students bring their own prompt from the week,
   Ben coaches. Weeks 8 to 10: students run the prompt reading for one
   another, with their own prompts. Write the fade into COURSE.md.
3. **Name the stage of each step.** In stage pages, mark which steps
   are "do it this way" and which are "find your own way". Students who
   know more can skip the first kind (expertise reversal).

---

## Part 3. How adults learn

### 3.1 Andragogy and its critiques

**What the research says.** Knowles' assumptions: adults are
self-directing, bring experience, learn what they need for real tasks,
and want to apply it now. *The Modern Practice of Adult Education*
(1980). Critics note these are assumptions, not findings, describe many
children as well as many adults, and ignore context, culture and power.
Merriam (2001), New Directions for Adult and Continuing Education
89:3-14. https://doi.org/10.1002/ace.3 **Framework, with well-known
critiques.**

Grow's staged self-directed learning model is more useful here: the
same adult can be self-directed in one area and dependent in another,
and trouble comes from mismatching teaching style to the learner's
stage in *this* subject. Adult Education Quarterly 41(3):125-149.
https://doi.org/10.1177/0001848191041003001 **Framework.**

**In plain words.** Adults want relevance and control. But a confident
teacher who has never opened a terminal is a beginner in this room,
and needs a beginner's support without being treated like a child.

**Already doing.** Relevance and control (their own app, their own
people). Experience (what they know about their users).

**Change.** The week 0 setup session Ben already suspects is needed.
Make it explicit: one hour, tools installed, the first conversation
with the agent, and a sentence that says "being a beginner here does
not make you a beginner." Offer the faster students the fade early
(Grow), not a harder version of the same steps.

### 3.2 Transformative learning

**What the research says.** Mezirow: adults change how they see things
when a "disorienting dilemma" meets critical reflection and
conversation with others. Mezirow (1997), New Directions 74:5-12.
https://doi.org/10.1002/ace.7401 Empirical support is mostly
qualitative (Taylor 2007 review, IJLE 26(2):173-191,
https://doi.org/10.1080/02601370701219475). **Framework, weak
empirical base.**

**In plain words.** People change their minds when something surprises
them, they think hard about it, and they talk it through with others.

**Already doing.** Building a working app in an evening is a
disorienting dilemma for most people. "What will people stop learning?"
is critical reflection. The two-person bring-back is the conversation.

**Change.** Name the surprise. Week 2's bring-back could add: "What
surprised you this week about what the agent could or could not do?"
Keep it in the note; it becomes material for week 10.

### 3.3 Communities of practice

**What the research says.** Lave and Wenger (1991), *Situated
Learning*: newcomers learn by "legitimate peripheral participation",
doing real but small work at the edge of a community and moving toward
the center. Wenger-Trayner and Wenger-Trayner, "Introduction to
communities of practice" (2015): domain, community, practice.
https://www.wenger-trayner.com/introduction-to-communities-of-practice/
**Framework,** widely used.

**In plain words.** You learn a craft by doing real work next to people
who do it, starting at the edge and moving in.

**Already doing.** The template is the community's shared practice.
PROVENANCE.md is its memory.

**Change.**

1. Invite each cohort to send one lesson back to the template (a skill,
   a correction, a rule), the way each of Ben's four apps did. That is
   moving from the edge to the center, and it is real.
2. Invite alumni back as guests in the next cohort's week 1 and week 7.
3. Keep a cohort-to-cohort space (a Discord or forum) that survives the
   ten weeks.

### 3.4 Connected learning

**What the research says.** Ito et al. (2013), *Connected Learning: An
Agenda for Research and Design*: learning sticks when it is interest
driven, peer supported, and tied to opportunity, through shared
purpose, making, and open networks.
https://dmlhub.net/publications/connected-learning-agenda-for-research-and-design/
**Framework** from ethnographic research.

**In plain words.** Learning sticks when it starts from what you care
about, happens with friends, and leads somewhere that matters to you.

**Already doing.** Interest (their own app), production (a real app),
opportunity (a store listing, real users).

**Change.** "Openly networked" is open: let students choose to post
their work publicly each week (a cohort page on humanshaped.org, opt
in, never required).

---

## Part 4. Learning together online

### 4.1 The Community of Inquiry

**What the research says.** Garrison, Anderson and Archer (2000):
online learning needs three kinds of presence. Social (people feel
real to each other), cognitive (people build and test meaning), and
teaching (design, facilitation, direct instruction). The Internet and
Higher Education 2(2-3):87-105.
https://doi.org/10.1016/S1096-7516(00)00016-6 Later work finds teaching
presence predicts the other two, and that online discussion rarely
reaches the last phase of cognitive presence, "resolution" (applying
it). **Framework with a large survey-based literature; moderate.**

**In plain words.** People need to feel the others are real, need to
actually think, and need someone steering. Most online classes stop
at talking about an idea and never use it.

**Already doing.** Resolution every week: the bring-back is applied
work, not discussion.

**Change.** Social presence needs the most help. See build buddies
(4.4) and week 0.

### 4.2 Cameras and video fatigue

**What the research says.**

- Bailenson (2021) names four causes of "Zoom fatigue": close-up eye
  gaze, seeing yourself all the time, reduced movement, and extra
  effort to read and send nonverbal cues. Technology, Mind, and
  Behavior 2(1). https://doi.org/10.1037/tmb0000030 **Framework.**
- Shockley et al. (2021), a four-week field experiment: cameras on
  increased daily fatigue, and more so for women and newer employees.
  Journal of Applied Psychology 106(8):1137-1155.
  https://doi.org/10.1037/apl0000948 **Moderate.**
- Fauville et al. (2021): women reported more fatigue, linked to mirror
  anxiety from self-view. Computers in Human Behavior Reports 4:100119.
  https://doi.org/10.1016/j.chbr.2021.100119 **Moderate** (large
  survey).

**In plain words.** Cameras cost energy, and not equally. Use them when
seeing faces does work.

**Change (norms to write down).** Cameras welcome when showing and
talking in small groups. Cameras off during build time. Suggest hiding
self-view. A stretch-and-water break at the 45-minute mark of a 90.
Show the app by sharing the phone screen, which puts eyes on the work,
not the face.

### 4.3 Breakout rooms

**What the research says.** Studies are mostly student surveys in
single courses: students value small group tasks when the task is
clear and structured, and some find forced talk with strangers
stressful. Example: Edinburgh study of learner attributes in breakout
rooms (2023)
https://www.research.ed.ac.uk/en/publications/collaborative-learning-in-online-breakout-rooms-the-effects-of-le/
and a Canadian student-perception study
https://cjlt.ca/index.php/cjlt/article/view/28771 **Weak.**

**In plain words.** Small groups work when everyone knows exactly what
to do, how long they have, and who does what.

**Change.** Breakout rules: groups of three; the task pasted in the
chat *and* in the room; a visible timer; one named timekeeper; stable
groups across weeks (strangers each week is the stressful version).

### 4.4 Structures and protocols

None of these are peer-reviewed interventions; they are practitioner
tools with decades of use. **Weak (practitioner), but low risk.**

- **Liberating Structures** (Lipmanowicz and McCandless):
  https://www.liberatingstructures.com/ Useful here:
  - *1-2-4-All*: think alone, then pairs, then fours, then all.
  - *TRIZ*: "how would we make this app do the opposite of what we
    want?" A ready-made version of "argue the other side".
  - *Troika Consulting*: one person describes a stuck problem, two
    others discuss it while the first listens with camera off, then
    the first says what was useful. Fits a student stuck on the agent.
  - *What, So What, Now What*: a three-line reflection.
  - *15% Solutions*: "what can you do this week, without anyone's
    permission?"
- **School Reform Initiative / NSRF protocols**:
  https://www.schoolreforminitiative.org/protocols/ and
  https://nsrfharmony.org/protocols/
  - *Tuning protocol*: presenter shares work and a focusing question,
    clarifying questions, warm and cool feedback while the presenter
    listens, presenter reflects.
  - *Critical friends*: the same idea for a stable small group.
  - *Gallery walk*: work posted, people move through and leave notes.
    Online, this is an async page of app links.
- **P2PU learning circles**: peer-facilitated study groups with a
  simple meeting shape and an end-of-circle reflection.
  https://www.p2pu.org/ A University of Washington survey found most
  respondents completed their circle and most met the goal they set.
  https://digital.lib.washington.edu/researchworks/items/bac0a618-d298-4afc-bc60-ff33e26b2d9d/full
  **Weak** (self-reported).

**Already doing.** "Ask the agent to argue the other side" is TRIZ in
a different shape.

**Change.** Give "Show what you brought back" a short tuning protocol
(see the session template). Start a week with Troika when many people
are stuck.

### 4.5 Cohorts, completion and belonging

**What the research says.**

- MOOC completion is low and did not improve: Reich and
  Ruipérez-Valiente (2019) found it around 3 to 6 percent across
  edX/MIT/Harvard courses. Science 363(6423):130-131.
  https://doi.org/10.1126/science.aav7958 **Strong.**
- Cohort-based course figures (altMBA "96 percent", others "85 percent
  and up") come from companies selling the format, from paid,
  selective programs, and are not peer-reviewed. For example
  https://future.com/cohort-based-courses/ **Weak.** The direction is
  believable; the numbers are not evidence.
- The connectivist MOOCs (Siemens and Downes, 2008 onward) taught that
  open networks without structure leave many people lost. Kop (2011),
  IRRODL 12(3). https://doi.org/10.19173/irrodl.v12i3.882 Mackness, Mak
  and Williams (2010), "The ideals and reality of participating in a
  MOOC".
  https://www.lancaster.ac.uk/fss/organisations/netlc/past/nlc2010/abstracts/PDFs/Mackness.pdf
  **Weak to moderate** (qualitative).
- Belonging: a one-hour intervention telling students that worry about
  belonging is common and fades raised later grades for Black students.
  Walton and Cohen (2011), Science 331(6023):1447-1451.
  https://doi.org/10.1126/science.1198364 A very large replication
  found effects where the setting gave students real chances to belong,
  and not elsewhere. Walton et al. (2023), "Where and with whom does a
  brief social-belonging intervention promote progress in college?",
  Science 380(6644):499-505. https://doi.org/10.1126/science.ade4420
  (erratum: https://doi.org/10.1126/science.ads9718) **Moderate.**
- Psychological safety in teams: people take learning risks when they
  believe they will not be punished for mistakes. Edmondson (1999),
  Administrative Science Quarterly 44(2):350-383.
  https://doi.org/10.2307/2666999 **Moderate to strong.**
- Recurse Center's social rules: no feigned surprise, no
  well-actually's, no backseat driving, no subtle -isms. Short, about
  behavior, and explained. https://www.recurse.com/social-rules
  **Practitioner.**

**In plain words.** People finish when they are expected by name, by
people they know. Belonging is built on purpose, early, with a story
that struggle is normal, and it only works if the place actually lets
people belong.

**Change.**

1. **Build buddies.** Stable trios for the whole term. Each week's two
   viewers are your trio. Rotate one trio member at the midpoint so
   people meet more of the cohort.
2. **Week 0 belonging story.** Ben's own: Archive Watch's "UI feedback
   round 1 through round 7 in a single day", and the AirPlay sessions
   that were wrong. Real, already written in the path.
3. **Social rules, adapted.** Adopt Recurse's four almost as written.
   Add one: "no feigned surprise about tools" ("you've never used a
   terminal?"). Add a short code of conduct with one named person to
   tell and what happens next.
4. **Say who the course is for, honestly,** and how many hours a week
   it takes.

---

## Part 5. Feedback and assessment

**What the research says.**

- Black and Wiliam (1998): formative assessment (feedback used to
  change what happens next) produces some of the largest gains in
  education. Assessment in Education 5(1):7-74.
  https://doi.org/10.1080/0969595980050102 **Strong** (with later
  debate about the size).
- Hattie and Timperley (2007): good feedback answers three questions:
  Where am I going? How am I going? Where to next? It works at the task,
  process and self-regulation levels; praise of the person works least.
  Review of Educational Research 77(1):81-112.
  https://doi.org/10.3102/003465430298487 **Framework from
  meta-analyses.**
- Kluger and DeNisi (1996): in over a third of feedback interventions,
  performance got *worse*, mostly when feedback drew attention to the
  self. Psychological Bulletin 119(2):254-284.
  https://doi.org/10.1037/0033-2909.119.2.254 **Strong.**
- Wisniewski, Zierer and Hattie (2020): average effect around d = 0.48;
  high-information feedback works best. Frontiers in Psychology
  10:3087. https://doi.org/10.3389/fpsyg.2019.03087 **Strong.**
- Peer assessment improves performance about as much as teacher
  assessment: Double, McGrane and Hopfenbeck (2020), g about 0.31.
  Educational Psychology Review 32:481-509.
  https://doi.org/10.1007/s10648-019-09510-3 **Moderate.**
- Giving feedback teaches the giver: Nicol, Thomson and Breslin (2014),
  Assessment and Evaluation in Higher Education 39(1):102-122.
  https://doi.org/10.1080/02602938.2013.795518 And all feedback is a
  comparison the learner makes inside their own head: Nicol (2021),
  46(5):756-778. https://doi.org/10.1080/02602938.2020.1823314
  **Moderate.**
- Rubrics help when shared with exemplars and used for self-assessment;
  less clear as grading tools. Jonsson and Svingby (2007), Educational
  Research Review 2(2):130-144.
  https://doi.org/10.1016/j.edurev.2007.05.002 **Moderate.**
- Specifications grading (pass/not-yet against clear specs; Nilson,
  2015) and ungrading (Blum, ed., 2020) are well argued but weakly
  tested. Critics note self-assessment favors confident students.
  **Weak.**

**In plain words.** The best feedback says where you are headed, where
you are, and what to try next, about the work, never about the person.
Looking at someone else's work and comparing it to your own is
feedback too, and maybe the most powerful kind.

**Already doing.** "Be ready to..." is a specification. "When you are
ready to move on" is a checklist. The note, DECISIONS.md and the commit
history together are a portfolio. The two-person showing makes every
student a feedback giver.

**Change.**

1. **A feedback shape for the bring-back.** Viewers answer three
   questions, out loud or in a line each: What is this app for, as you
   understood it? (where going) What did you see work, and what did you
   see that did not? (how going) What would you try next? (where next).
   Ban "great job" on its own.
2. **Compare before you hear.** Before getting comments, the presenter
   looks at one peer's app this week and says one thing it does that
   theirs does not yet.
3. **No grades, a portfolio.** At week 10 each student has: the note
   from the top, the "Why we build" paragraph and its history, their
   standing instructions with dates, one screenshot that proved a fix,
   and the app. That is the record.
4. **One question bank for "prove it".** Short exemplars (a good
   bring-back, a weak one) shown in week 1, so people know what good
   looks like. This is what makes a rubric work, without the rubric.

---

## Part 6. Learning to build with AI

This is the newest and least settled research, and the most important
for this course. Most of it studies people *learning to code*. This
course teaches people to *build and judge* while an agent writes the
code, which no study has yet measured directly. That gap is worth
saying out loud to students.

### 6.1 What the studies found

- **Bastani et al. (2025),** about 1,000 high school math students in
  Turkey. Plain GPT-4 raised practice scores 48 percent, but students
  did 17 percent *worse* on the exam once the AI was taken away. A
  version that gave teacher-written hints instead of answers removed
  most of the harm. PNAS 122(26).
  https://doi.org/10.1073/pnas.2422633122 **Moderate to strong**
  (large field experiment, one setting).
- **Shen and Tamkin (Anthropic, 2026),** 52 mostly junior developers
  learning an unfamiliar Python library. The AI group scored about 17
  points lower on a later quiz without AI, with no meaningful time
  saving. Six patterns of AI use appeared; the three where people asked
  conceptual questions or asked for explanations kept their learning.
  Full delegation was the worst. arXiv 2601.20245.
  https://arxiv.org/abs/2601.20245 and
  https://www.anthropic.com/research/AI-assistance-coding-skills
  **Moderate** (randomized, small, preprint).
- **Lehmann, Cornelius and Sting (2024/2025),** university coding
  courses plus experiments: using an LLM for explanations (as a
  complement) deepened understanding; using it for solutions (as a
  substitute) hurt, most for students who started weakest. arXiv
  2409.09047. https://arxiv.org/abs/2409.09047 **Moderate.**
- **Prather et al. (2024), "The Widening Gap",** novices using Copilot
  and ChatGPT: stronger students sped up; struggling students
  compounded their metacognitive difficulties and left with an
  "illusion of competence". ICER 2024.
  https://doi.org/10.1145/3632620.3671116 **Weak to moderate**
  (qualitative, small).
- **Kazemitabaar et al. (2023),** novices learning with Codex did better
  during practice and no worse on later tests without it; students with
  more prior knowledge gained more. CHI 2023.
  https://doi.org/10.1145/3544548.3580919 **Moderate.** **CodeAid
  (2024),** a guarded assistant for 700 students that explained instead
  of writing solutions; students valued it, and it raised tensions
  between what students wanted and what teachers wanted. CHI 2024.
  https://doi.org/10.1145/3613904.3642773 **Weak to moderate.**
- **Eastwood, Denny et al. (2026),** 132 intro programming students,
  four AI tutor designs. The most "guarded" one (Socratic, full context)
  got the lowest ratings, the most stress, the most switching to an
  outside chatbot, and the fewest full explanations afterward. arXiv
  2609.29995. https://arxiv.org/abs/2609.29995 **Weak to moderate**
  (preprint). Guardrails alone are not the answer.
- **Lepp (2026),** 210 students: they used AI more for explanations and
  debugging than for code generation, and no use pattern predicted
  better exam scores. arXiv 2607.24755.
  https://arxiv.org/abs/2607.24755 **Weak.**
- **Kestin, Miller et al. (2025),** a carefully designed AI tutor
  doubled median learning gains over an active-learning class in
  Harvard physics, in less time. Scientific Reports.
  https://doi.org/10.1038/s41598-025-97652-6 **Moderate.** Design is
  everything: the same tool can help or harm.
- **Denny et al. (2024), Prompt Problems:** exercises where students
  write the prompt, not the code, and are graded on whether the
  generated code passes tests. SIGCSE 2024.
  https://doi.org/10.1145/3626252.3630909 **Framework with early
  classroom evidence.**
- **Lee et al. (2025),** 319 knowledge workers: more confidence in the
  AI went with less critical thinking; more self-confidence went with
  more. Critical thinking shifted toward verifying, integrating, and
  "task stewardship". CHI 2025.
  https://doi.org/10.1145/3706598.3713778 **Weak to moderate** (survey).
- **METR (2025),** 16 experienced developers on their own projects
  were 19 percent *slower* with AI tools but believed they were 20
  percent faster. arXiv 2507.09089.
  https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
  **Moderate** (randomized, small; METR now calls it historical for
  current tools). The lesson that lasts is the gap between feeling and
  fact.
- **Kosmyna et al. (2025), "Your Brain on ChatGPT",** EEG during essay
  writing; LLM users showed weaker engagement and less ownership. arXiv
  2506.08872. https://arxiv.org/abs/2506.08872 **Weak** (preprint, 54
  people, 18 in the key session, contested). Widely quoted; do not lean
  on it.

**On vibe coding and agents specifically** (all **weak**: small or
qualitative):

- Geng et al. (2025): students building web apps with Replit's agent
  mostly tested and debugged rather than reading code; more experienced
  students gave the agent much more context. arXiv 2507.22614.
  https://arxiv.org/abs/2507.22614
- Fawzy, Tahir and Blincoe (2026), 162 vibe coders: everyone knows the
  risks, but the ability to evaluate and verify depends on experience.
  "Expands access to software creation but without equally
  distributing the expertise needed for evaluation." arXiv 2605.24521.
  https://arxiv.org/abs/2605.24521
- Gama et al. (2025), a one-day vibe-coding hackathon with computing
  and non-computing students: fast prototypes and good cross-discipline
  teams, but "premature convergence in ideation" and little engagement
  with engineering practice. arXiv 2512.02750.
  https://arxiv.org/abs/2512.02750
- Naboulsi (2026), a curriculum for learning Claude Code with Claude
  Code (Guide, Collaborator, Peer, Launcher). Design paper, no outcome
  data. arXiv 2604.17460. https://arxiv.org/abs/2604.17460

No study yet follows non-programmers building and shipping a real app
with an agentic tool over weeks. This course would be one.

### 6.2 In plain words

The harm is not in using the agent. It is in handing over the part you
were supposed to be learning, and then feeling as if you learned it.
People who ask the agent "why" and "how does this work" keep their
learning. People who only say "do it" lose it. The weakest beginners
lose the most and notice the least.

In this course, the part students are supposed to be learning is not
the code. It is deciding, judging, and living with the app. So the
risk to watch is the agent quietly doing *those*: choosing the
feature, judging that it works, writing the words on screen.

### 6.3 Already doing

- "What stays yours" (talking guide) is the right list, and lines up
  with Lee et al.'s "task stewardship".
- "Ask for the truth about the state" and "Prove it" are the cure for
  the METR feeling-versus-fact gap and Prather's illusion of competence.
- "Say what you see, where, on which device" teaches judging through
  use, which is what Geng et al. saw novices do anyway.
- "Name where the truth lives" and the scope line before a round teach
  giving context, the thing experienced students did and novices did
  not.
- "Read one real prompt together" plus "write the prompt you will send"
  is a Prompt Problem.
- The book does not ask the agent to withhold help (Eastwood et al.
  suggest that backfires). It asks the human to keep the judging.

### 6.4 Change

1. **Explain it back, without the agent.** Each week, in the trio,
   each person picks one thing in their app and explains in two minutes
   how it works or why it is built that way, with the agent closed. If
   they cannot, that becomes a question to ask the agent ("explain this
   to me"), not a thing to fix. This is the one habit the Shen and
   Tamkin and Lehmann results point to most directly.
2. **Teach judging in week 2, not week 6.** Stage 04 is the full
   instrument. But Fawzy et al. say novices lack the means to verify.
   Give week 2 one small proving habit: "before you say it works, show
   the screenshot on your phone and say what you expected to see."
3. **Diverge before you build.** Gama et al. saw teams converge too
   fast. In week 1, before the app is chosen, each student writes three
   app ideas and the trio picks which one has the clearest people
   outside the screen.
4. **Ask "why" as often as "do".** Add a move to the talking guide:
   after a big change, ask the agent to explain what it did and why, in
   plain words, and correct anything that does not match what you know.
5. **Say the honest thing about the research.** One slide in week 1:
   what we know about learning with AI, what we do not, and that this
   cohort is part of finding out.

---

## Part 7. A live session, 60 to 90 minutes

The core is 75 minutes. The 60 and 90 minute versions follow.

| Minutes | Part | What happens | Why |
|---|---|---|---|
| 0-5 | Arrive | One line in the chat: what you shipped, or where you are stuck. Cameras welcome, not required. | Social presence; Ben sees who needs Troika. |
| 5-30 | Show what you brought back | Trios in breakouts. Each person gets 8 minutes: 3 to show it on the device, 1 for clarifying questions, 3 for the three feedback questions (where going, how going, where next) while the presenter listens, 1 for the presenter to say what they will do. Named timekeeper. | Tuning protocol; Hattie and Timperley; peer feedback teaches the giver. |
| 30-37 | One value at work | Back together. One volunteer: the decision their values changed this week and what it cost. Ben names one pattern he heard across rooms. | "A value is worth what it changed"; teaching presence. |
| 37-57 | Read one real prompt | Ben shows a situation from the path (screenshot, what the agent said). 4 minutes: everyone writes the prompt they would send. 4 minutes: compare in pairs. Ben shows his real prompt. 8 minutes: what did the builder want, what did the agent get wrong, what did the prompt fix? Then each person writes the prompt they will send this week, in their note. | Productive failure then worked example; Prompt Problems; modeling. In weeks 8 to 10, a student runs this with their own prompt. |
| 57-72 | Build | Cameras off. Main room stays open and quiet for co-working. A help room runs Troika for anyone stuck. | Doing; help without hovering. |
| 72-75 | Close | One line in chat, three parts: what, so what, now what. Name your bring-back for next week. | Reflection; a public commitment. |

**60 minutes.** Arrive 3, show 21 (7 minutes each), value at work 5,
prompt 16, close 3, build 12. Most building moves to self-paced time.

**90 minutes.** Add 10 minutes after "value at work" for the stage
introduction (Ben, no more than 10 minutes, one story from the stage's
opening). Extend build to 25. Put a 2-minute stretch break at about
minute 45.

**Week 1 and week 10 are different.** Week 1: social rules, the
belonging story, three app ideas in trios, the "why" paragraph out
loud. Week 10: the public showcase, each builder's paragraph and one
value with the decision it changed, guests welcome.

---

## Part 8. A weekly rhythm

Honest time: about 75 minutes live plus 3 to 5 hours on your own. Say
so on the sign-up page.

| When | What | Where |
|---|---|---|
| Session day | Live session. Leave with the prompt you will send. | Google Meet |
| Day after | Send that prompt. Start living with the app. Write feedback rounds in your note while you use it. | Your own time |
| Mid-week | Post to the gallery: link, one screenshot, one question you have. Leave a note on two trio members' posts using the three feedback questions. | A shared page or forum |
| Mid-week, optional | One open co-working hour, cameras off, Ben present for questions. | Google Meet |
| Any time | Trio check-in, 15 minutes or a thread: "explain it back" for one part of your app. | Trio's choice |
| Day before session | Write your bring-back in your note: the thing, and one sentence each on what you learned as a student, a builder, a human. | Your note |

---

## Part 9. Suggested changes to COURSE.md, in one list

1. Add **week 0**: setup, first conversation with the agent, social
   rules, the belonging story.
2. **Try, then compare** in the prompt reading.
3. **Fade the modeling**: Ben models in weeks 1-3, coaches in 4-7,
   students lead in 8-10.
4. A short **feedback shape** for the bring-back (three questions,
   timed, presenter listens).
5. **Build buddies**: stable trios, one rotation at the midpoint.
6. **Explain it back** weekly, agent closed.
7. A **reflection sentence** on the three ways each week.
8. **Camera and break norms**, written down.
9. A **mid-week async gallery**.
10. A **public showcase** at week 10, and an invitation to send one
    lesson back to the template.
11. **Three ideas before one app** in week 1.
12. A **small proving habit** from week 2.
13. Keep the course **ungraded**; the note, decisions and app are the
    portfolio.
14. Ask, at weeks 1, 5 and 10, a two-question check: "What can you
    decide or judge about your app now that you could not before?" and
    "Explain one part of your app." That is how Ben finds out what
    broke, which COURSE.md already asks for.

---

## Part 10. The showcase apps

Facts gathered 2026-10-01 from the live sites, the iTunes Search API
(`itunes.apple.com/lookup`), Apple and Google Play store pages. Images
are referenced by URL only, not downloaded.

### Archive Watch

- **In its own words:** "A cinematheque for the Internet Archive.
  Free, public domain, no account." (og:description, archivewatch.org).
  Longer site description: "A cinematheque for the Internet Archive —
  feature films, classic TV, silent cinema, animation, newsreels. Free,
  public domain, no account." App Store description opens: "Archive
  Watch turns the Internet Archive's vast public-domain moving-image
  collection into a cinematheque you can wander from your couch".
- **Platforms (site):** Apple TV, iPhone, iPad, Mac, Android, Google
  TV, Fire TV, Fire tablets, Roku, and the web. App Store compatibility
  lists iOS 18, iPadOS 18, macOS 26, tvOS 26, visionOS 2.
- **Store links:**
  - App Store: https://apps.apple.com/us/app/archive-watch/id6776697407
  - Google Play: https://play.google.com/store/apps/details?id=com.archivewatch.app
  - Amazon Appstore: https://www.amazon.com/gp/mas/dl/android?p=com.archivewatch.app
  - Roku: https://channelstore.roku.com/details/12a571a872732e40fe8d1d6c59f3849f:5ec8f46dcec2324229c8d096ea23c089/archive-watch
- **Timing:** Started April 17, 2026 (template README). First App Store
  release 2026-06-10; version 1.43.0 on 2026-09-30 (iTunes API). Play
  listing updated Sep 25, 2026, "1K+" downloads. App Store rating 4.1
  from 8 ratings (iTunes API, US).
- **Images:** og:image https://archivewatch.org/assets/app-icon/app-icon.png ;
  App Store screenshot
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/e9/22/17/e9221721-bb71-a90a-c8a7-bd19196910f4/01-Home.png/320x480bb.jpg ;
  Play icon https://play-lh.googleusercontent.com/k1U-1tU03iMly19q7-pH8eB1T3BfWhOiA9-58bL085UrWz_93KJRkFh-tcpahir-1HSmTpefFkriWE_N_5cQ=s0-br30
- **Gave the template (README, PROVENANCE):** "most of the rest": the
  shared data plane, Apple TV and smart-TV platforms, real-device
  testing, cloud store submission, the CI fleet, Pulse, and the
  floor-by-hardware rule. Also the macOS shell skill, media playback
  doctrine, and three standing instructions (only essential words, no
  AI-written copy, side doors).

### Tidbits Trivia

- **In its own words:** "Trivia from the whole of Wikipedia — and every
  question is a door to learn more." (og:description). Site
  description: "Trivia from the whole of Wikipedia. Play solo, keep a
  daily streak, or pass the phone." App Store description opens:
  "Tidbits turns the whole of Wikipedia into a trivia game".
- **Platforms:** Web (tidbitstrivia.com). App Store compatibility:
  iOS 26, iPadOS 26, macOS 26, tvOS 26, visionOS 26, and the store
  page mentions iMessage. Google Play (Android). The template says
  Windows was built from a Mac; I did not find a Microsoft Store
  listing (not searched exhaustively).
- **Store links:**
  - App Store: https://apps.apple.com/us/app/tidbits-trivia/id6782202277
  - Google Play: https://play.google.com/store/apps/details?id=com.tidbitstrivia.app
  - The website itself shows no store links (it is the web app).
- **Timing:** First built June 16, 2026 (talking guide). First App Store
  release 2026-08-24; version 1.9.0 on 2026-09-09. Play listing updated
  Sep 8, 2026, "10+" downloads.
- **Images:** og:image https://tidbitstrivia.com/assets/icon.png ; App
  Store screenshot
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4d/e0/0a/4de00acb-a026-60b7-fc8b-96eaf5507ee9/01-home.png/320x480bb.jpg ;
  Play icon https://play-lh.googleusercontent.com/Ktu0igzXHX2mNX0h0DFOc-eTzS_tM1J9DG6ut8BzOcQ92zqOOYP3ZDifPMRehKt44nAv4qwzZ-psGIwSeQZ_=s0-br30
- **Gave the template:** cross-platform multiplayer, determinism across
  languages, Windows from a Mac, and the first device fleet (README);
  the labeled-bot rule (stage 00). PROVENANCE notes Tidbits "wrote 20
  docs and zero skills", the drift PROVENANCE exists to catch.

### Bsky Dreams

- **In its own words:** "Your Personal Bluesky Experience" (site). App
  Store description opens: "Bsky Dreams is built for people who want to
  think more, not less."
- **Platforms:** Web app at bskydreams.com (sign in with a Bluesky App
  Password), and iOS. App Store compatibility: iOS 18.6, visionOS 2.6.
- **Store links:** App Store:
  https://apps.apple.com/us/app/bsky-dreams/id6760909675 . No Play
  listing found.
- **Timing:** First App Store release 2026-03-30; version 1.46 on
  2026-06-19.
- **Images:** No og:image on the site. App Store screenshot
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/71/ef/87/71ef879f-85b4-6bfc-58ba-518adba9e008/01-hero-1320x2868__U00281_U0029.png/320x480bb.jpg ;
  site icon at https://bskydreams.com/assets/app-icon.png (referenced in
  the page; not checked).
- **Gave the template:** values-based feed ranking, reader mode, the
  share extension (README); iOS production gotchas and the haptics
  taxonomy (PROVENANCE, Decisions 040 to 042).

### BOBA Playbook

- **In its own words:** "The definitive companion app for the Bo
  Jackson Battle Arena trading card game." og:description adds "Search
  17k+ cards · Collect · Build decks."
- **Platforms:** Web app (bobaplaybook.com) and Android (Google Play).
  No App Store listing found: the site's `apple-itunes-app` tag still
  holds the placeholder `YOUR_APP_ID`, and an App Store search for
  "BOBA Playbook" returned nothing by Learning is Change.
- **Store links:** Google Play:
  https://play.google.com/store/apps/details?id=com.bobaplaybook.app
- **Timing:** Play listing updated Jun 14, 2026, "10+" downloads.
  PROVENANCE says BOBA was "frozen 2026-06-30". The earliest template
  generation started with BOBA (README). Stage 00 places its first
  milestone evenings in spring 2026; no public launch date found.
- **Images:** og:image https://bobaplaybook.com/assets/icons/boba_playbook_icon_1024.png
  (alt text "BOBA Playbook — XOXO mark on a dark background.") ; Play
  icon https://play-lh.googleusercontent.com/yAMFgP6zCdgxIEHC_McnTx07EIYIXU9I0koebhp9_jldhaE5Mj11alQmNyu60_fSM1FgQfptVon0nS0HY9KILLs=s0-br30
- **Gave the template:** the parity matrix, the design-doc discipline,
  the four questions, and lessons about data, images and marketplaces
  (README); nine skills, the TRADE-DESIGN template and Decisions 044 to
  052 from the 2026-08-26 re-audit (PROVENANCE); the autonomous loop
  cadence skill.

### Showcase cautions

- Download counts are Google Play's own bands and change; quote them
  only with a date, or not at all.
- Several store and site descriptions contain em dashes. Quote them
  exactly or paraphrase; do not "fix" a quotation.
- BOBA is built around another company's game and IP. The showcase
  should not imply affiliation; the template's
  `third-party-ip-monetization` skill exists for this.
- An automated page summary of bobaplaybook.com returned invented
  details (prize pools, a different domain). Everything above comes
  from the raw page source and store APIs instead.

---

## Part 11. Open questions for Ben

1. **Who is in the cohort?** If teachers bring students, check age
   limits before inviting anyone under 18: Claude's consumer terms and
   Apple's developer program both have minimum ages (not verified here;
   check current terms). Under-18 students may need a teacher-run
   account path.
2. **Trios or pairs?** The research points to stable small groups.
   Trios survive an absence; pairs are simpler. Which matches how you
   want "at least two people"?
3. **How public?** Is the week 10 showcase open to anyone, and is a
   weekly public gallery opt-in or cohort-only?
4. **Fade schedule.** Are you comfortable handing the prompt reading
   to students from week 8?
5. **Explain it back.** Does a weekly "agent closed" habit fit your
   view that the code is the agent's? The research says the harm is in
   handing over understanding, not typing. You may want students to
   explain *decisions* rather than *code*.
6. **Measuring it.** Would you like a light pre/mid/post check (two
   questions) so the first cohort produces evidence, since no study yet
   covers this kind of learner?
7. **Session length.** 60, 75 or 90 minutes? The template above is
   built at 75.
8. **Code of conduct.** Who is the named person to report to, and is
   it only you?
9. **Showcase consent.** Do the store screenshots and icons need any
   permission you have not already given yourself (they are your apps),
   and should Bsky Dreams, which is frozen at June, be shown as
   current?
10. **Tidbits on Windows and BOBA on iOS.** Do these exist publicly? I
    could not confirm either.

---

## Sources not linked inline

- Papert, S. (1980). *Mindstorms*. Basic Books.
- Knowles, M. (1980). *The Modern Practice of Adult Education*.
- Lave, J. and Wenger, E. (1991). *Situated Learning*. Cambridge.
- Collins, A., Brown, J. S. and Newman, S. E. (1989). Cognitive
  apprenticeship. In L. B. Resnick (ed.), *Knowing, Learning, and
  Instruction*.
- Nilson, L. (2015). *Specifications Grading*. Stylus.
- Blum, S. D. (ed.) (2020). *Ungrading*. West Virginia University Press.
