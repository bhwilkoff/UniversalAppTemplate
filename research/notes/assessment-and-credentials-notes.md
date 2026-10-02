# Assessment, challenges and portable credentials for humanshaped.org

Research notes, 2026-10-01. For Ben, ahead of the course launch. Every
factual claim has its source beside it. Where I could not verify
something, I say so. These are notes, not site copy: nothing here has
been through `WRITING.md`.

Note on where this file lives: `research/` is inside the `site` branch,
and GitHub Pages serves everything in that branch. If this file is
pushed, it is public at humanshaped.org/research/notes/. Decide that
before committing.

---

## Topic A. Self-paced work, live meetings and challenge assessment

### What the models look like

**Cohort-paced, short, live-heavy (Maven).** Courses usually run 2 to 6
weeks, with live sessions 1 to 3 times a week of 60 to 90 minutes, a
cohort of 20 to 200, and an async community between sessions
([SkillScouter review](https://skillscouter.com/maven-review/)). Maven
names three formats: Classic (about 4 live sessions), Weekend Seminar,
and Hybrid (live sessions plus async projects)
([Maven help: course formats](https://help.maven.com/en/articles/8178672-course-formats)).
The widely quoted 90%+ cohort completion figure traces back to Maven's
own self-reported numbers, and no independent study verifies the
head-to-head comparison with MOOCs
([AI Enablement Academy](https://aienablement.academy/insights/cohort-completion-rates-honest)).
Treat that number as marketing.

**Cohort with no curriculum and no grades (Recurse Center).** Six or
twelve week batches, "no grades, exams, curricula, or even classes"
([RC FAQ](https://www.recurse.com/faq)). Structure is real but almost all
optional and mostly organized by participants: study groups,
presentations, check-ins
([About RC](https://www.recurse.com/about)). People choose their own
accountability: posting check-ins in Zulip, daily check-ins, office
hours. Weekly Thursday presentations are the shared ritual. Faculty
reach out if someone's attendance drops, and leaving is guilt-free. The
three self-directives are "work at the edge of your abilities," "build
your volitional muscles," and "learn generously." Alumni never graduate
([RC User's Manual](https://www.recurse.com/manual)).

**Self-paced mastery with human-graded gates (Launch School).** No time
measurements; you move on only after mastery. Each course ends in
human-graded written and live interview assessments that must be passed
before the next course, and a failed attempt comes back with specific
feedback on what to practice
([Launch School: mastery](https://public.launchschool.com/mastery),
[FAQ](https://public.launchschool.com/faq)).

**Free, self-paced, community-supported (The Odin Project,
freeCodeCamp, Exercism, Kaggle Learn).**
- Odin: three self-paced paths, lessons interspersed with projects
  ([theodinproject.com](https://www.theodinproject.com/)), a large
  Discord for help ([Career Karma](https://careerkarma.com/schools/the-odin-project/)).
  Every project has a "Student Solutions" section where learners post
  their code and live site, and the lesson tells them to look only
  after finishing and to "focus on meeting the project requirements
  rather than comparing yourself to others"
  ([Odin lesson page](https://www.theodinproject.com/lessons/foundations-recipes)).
  A known weakness: self-paced learners lack someone telling them
  whether they are on track
  ([MentorCruise](https://mentorcruise.com/blog/the-odin-project-vs-freecodecamp-which-one-actually-gets-you-hired-31a00/)).
- freeCodeCamp: five projects per certification; to claim it you accept
  an Academic Honesty Pledge, and bots plus manual review audit
  projects, revoking certifications for plagiarism
  ([freeCodeCamp honesty policy](https://www.freecodecamp.org/news/academic-honesty-policy)).
- Exercism: free, volunteer mentors review submitted solutions and
  discuss refactors; learners can switch to "independent mode" when
  mentor queues are slow ([Wikipedia: Exercism](https://en.wikipedia.org/wiki/Exercism),
  [exercism.org](https://exercism.org/)).
- Kaggle Learn: free short courses with in-browser exercises and a free
  completion certificate ([Kaggle announcement](https://www.kaggle.com/getting-started/125806)).
  Completion-based, not evidence-based.

**Large self-paced with a final project (CS50x).** Problem sets plus a
final project; staff audit submissions, and a violation of the academic
honesty policy removes certificate eligibility or revokes an issued one
([CS50x FAQ](https://cs50.harvard.edu/x/faqs/)). Many CS50 final project
specs have historically asked for a short video demo; I could not
confirm the current CS50x 2026 wording, so check
[the project page](https://cs50.harvard.edu/x/project) before citing it.

**Build-in-public sprint with demo day (Buildspace Nights & Weekends,
now closed).** Free six-week program; each week had one lecture, one
talk and one weekly update; challenges asked people to build, gather
feedback and market; demo day at week 6
([Cam Houser review](https://www.camhouser.com/a-review-of-buildspaces-nights-and-weekends-program/),
[GitHub readme](https://github.com/thatshycoder/Buildspace-Nights-and-Weekends/blob/master/readme.md)).
Advancement involved a community vote and a cash prize, which reviewers
called convoluted (same review). The company ended in 2024
([The Runway](https://www.therunway.ventures/p/buildspace)). The lesson
to take: the weekly public update and demo day worked; the prize and the
vote turned it into a contest.

**Ship-to-earn for teens (Hack Club "You Ship, We Ship").** A ship needs
an open-source repo with a README and a working demo link
([hackclub/ships](https://github.com/hackclub/ships)). Many YSWS programs
also require Hackatime, an editor plugin that logs coding time, with a
minimum of logged hours
([Hackatime docs](https://hackatime.hackclub.com/docs/getting-started/quick-start)).
This is the surveillance end of verification, and it exists because
there is a material reward to protect. Human Shaped Software has no
prize to protect, so it does not need it.

**Peer learning without an expert (P2PU learning circles).** Small
groups meet weekly around a free online course; the facilitator does
not need subject expertise and acts "closer to a party host than a
university lecturer"
([P2PU learning circles intro](https://p2pu.github.io/learning-about-learning-circles/modules/introduction/read-&-watch/),
[facilitation basics](https://docs.p2pu.org/facilitation/facilitation-basics)).
Weekly facilitator guides turn course material into a meeting agenda
([P2PU facilitator guides](https://docs.p2pu.org/courses/facilitator-guides)).

**Project cohort with mentors (Mozilla Open Leaders).** A 14-week
program: each project had a mentor call every two weeks plus a weekly
cohort call of about 1.5 hours that introduced the next module and
discussed assignments; participants worked on their own real open
project the whole time
([Mozilla Open Leaders](https://www.mozillafoundation.org/en/initiatives/mozilla-open-leaders/),
[leadership-training repo](https://github.com/mozilla/leadership-training),
[schedule](https://mozilla.github.io/leadership-training/schedule/)).
This is the closest structural match to "one real app per student."

**Share-your-work culture (fast.ai).** A standing "Share your work here"
forum thread invites a blog post, notebook, repo or web app made with
what people learned, and allows asking for feedback on drafts
([fast.ai forums](https://forums.fast.ai/t/share-your-work-here/27676)).
fast.ai's newer paid course (How to Solve It With Code) has a community
and a two-week refund window
([fast.ai post](https://www.fast.ai/posts/2025-10-15-solveit2.html));
I could not verify its live/self-paced structure.

**Connected learning (Connected Learning Lab, Ito et al. 2013).** The
framework's principles: interest-powered, peer-supported, academically
or opportunity oriented, production-centered, openly networked, shared
purpose ([Ito et al. 2013 via ResearchGate](https://www.researchgate.net/publication/265232707_Ito_M_Gutierrez_K_Livingstone_S_Penuel_W_Rhodes_J_Salen_K_Schor_J_Sefton-Green_J_Watkins_C_2013_Connected_Learning_An_Agenda_for_Research_and_Design_Irvine_CA_The_Digital_Media_and_Learning_Research_H),
[CITE Journal summary](https://citejournal.org/volume-18/issue-2-18/english-language-arts/learners-without-borders-connected-learning-in-a-digital-third-space/)).
"One real app for people you can name" already satisfies most of these.

**Not researched.** I did not find usable current sources on Reforge's
or Scrimba's assessment structure in this pass; nothing below depends
on them.

### Rubrics, peer review and grading that keeps people learning

- **Peer review can be accurate if it is trained.** In Stanford's MOOC
  study, calibrated peer review (students first practice grading staff-
  graded samples) plus feedback on each grader's bias improved accuracy,
  and rewriting rubric items with parallel structure and unambiguous
  wording cut mean grading error from 12.4% to 9.9%
  ([Kulkarni et al. 2013, TOCHI](https://hci.stanford.edu/publications/2013/Kulkarni-PeerAssessmentTOCHI_DO_NOT_REDISTRIBUTE.pdf)).
  Implication: short, concrete, yes/no rubric items, and one shared
  practice round in week 1.
- **Specifications grading.** Every piece of work is met / not yet met
  against clear specs, no partial credit; "bundles" of work map to
  outcomes; "tokens" buy a revision or an extension
  ([University of Miami summary](https://academictechnologies.it.miami.edu/explore-technologies/technology-summaries/alternative-grading/),
  [Active Learning PS](https://activelearningps.com/2016/03/30/specifications-grading/),
  [Nilson on Grading for Growth](https://gradingforgrowth.com/p/holding-specifications-grading-to)).
  This fits a no-grades course well: "met" or "not yet, here is what
  is missing," and revision is free.
- **Mastery with feedback on a miss** (Launch School, above) is the same
  idea with a human in the loop.

### Verifying the work was done, without surveillance

What the field does, from heaviest to lightest:
1. Time tracking in the editor (Hack Club Hackatime, above). Needed only
   when there is a prize.
2. Bot plagiarism audits plus revocation (freeCodeCamp, CS50x, above).
3. Live demonstration to a human (Launch School interviews; Recurse and
   Buildspace presentations; Mozilla mentor calls, above).
4. A public artifact anyone can open: live link plus repo (Hack Club,
   Odin, fast.ai, above).

For this course, the template already supplies honest, non-surveilling
evidence because the method itself produces it: a live URL, a store
listing, a screenshot the agent used to prove a fix, the running note,
the parity matrix, DECISIONS.md entries, and a public commit history.
The strongest check is the one the course already plans: showing the
work live to two other people each week (`COURSE.md`, "What each class
session is for"). A live app on your own phone, shown to a person, is
very hard to fake and costs nobody their privacy. My inference, not a
sourced claim: where the work is your own app for people you can name,
the incentive to fake is low, and a pledge plus live showing is enough.

Agent-built code complicates "did you write it" checks (freeCodeCamp's
pledge is about code you wrote). Human Shaped Software should not ask
that question. It should ask "did you decide, judge and use it," which
the bring-backs already test.

### Supporting people who fall behind

- Recurse: faculty reach out when attendance drops; leaving is
  guilt-free; alumni access never ends ([RC manual](https://www.recurse.com/manual)).
- Launch School: no clock at all; you move on when you are ready
  ([Launch School mastery](https://public.launchschool.com/mastery)).
- Exercism: an independent mode when mentors are slow
  ([Wikipedia](https://en.wikipedia.org/wiki/Exercism)).
- Specs grading: tokens for extensions and revisions (above).
- Mozilla Open Leaders: a fixed biweekly mentor call per project, so
  nobody goes more than two weeks unseen (above).

### Proposed model for humanshaped.org

**Pacing: cohort-paced with a self-paced floor.** Ten weekly stages as
in `COURSE.md`. Each stage page (already in `docs/path/`) is the
self-paced part. One live session a week does the three things
`COURSE.md` lists: show the bring-back to at least two others, read one
prompt together, build. One optional office hour a week for people who
are stuck. A student who falls behind keeps going at their own pace;
the credential has no deadline (the Recurse and Launch School pattern),
and the course reopens to alumni in later cohorts.

**The challenge for each stage is its "Be ready to..." line**, unchanged.
That line is already a spec. Evidence and reviewer:

| Stage | Bring-back (from `docs/path/`) | Evidence a person can open | Reviewed by |
|---|---|---|---|
| 00 | Why-we-build paragraph, the people, the rule, its cost | The paragraph and the rule as written (link to the note or CLAUDE.md section) | Two peers in session, then self |
| 01 | App on your phone; one thing real data taught you | Live URL; a phone screenshot | Two peers (they open the URL on their own phones) |
| 02 | The matrix; one cell your eyes proved wrong | Link to PARITY.md; the before/after of that cell | Two peers |
| 03 | One verb on two platforms; the floor and what it omits | Two screenshots side by side; the floor row | Two peers |
| 04 | The screenshot that proved a fix | The screenshot plus the one-line "what it proved" | Two peers |
| 05 | Installed from a store on a device you did not build on | Store or test-track link; a photo of the other device | Peer installs it, if possible; else instructor |
| 06 | One honest number, one "could not read", what the loop finished | Screenshot of Pulse; the session-log entry | Two peers |
| 07 | The feature, the older-device sentence, one change from someone else | Screenshot or short clip; who suggested the change | Two peers |
| 08 | The skill, the mistake it saves, one value with the decision it changed | Link to the skill file and the DECISIONS.md entry | Instructor (this is the capstone check) |

Rubric per bring-back: three or four yes/no items, met or not yet, taken
straight from the stage's "When you are ready to move on" paragraph. For
example, stage 01: the app opens at a public address; the data in it is
real, from a pipeline; the student sent at least two rounds of feedback
from their phone; the student can name one thing real data taught them.
"Not yet" comes with what is missing and costs nothing to redo.

**Who reviews.** Peers for every stage, live, in the session (that is
both the learning and the verification). The student writes one line of
self-review ("what I would show differently"). Ben reviews twice: at
stage 05 (shipping, where things go most wrong) and stage 08 (the
capstone), and whenever a peer marks "not yet" twice.

**How it shows in the platform.** A per-student page listing the ten
stages, each with the student's bring-back link, date shown, and who saw
it ("shown to Ana and Lee"). No points, no streaks, no leaderboard, no
percentages. Stages are marked "shown" or blank, never "failed." The
page is private to the cohort by default, and the student chooses
whether to make it public; that public page becomes the credential's
evidence URL. Practical note: a static site cannot store submissions.
The cheapest honest options are a GitHub issue or discussion per
student in a cohort repo (free, already where the work lives) or a form
service; the sign-up backend decision in the site's CLAUDE.md will
likely decide this. I did not research those services here.

---

## Topic B. Portable credentials

### The standards, as of today

- **Open Badges 3.0** is a 1EdTech Final Release; the current document
  version is 1.4.5, issued 2026-06-29
  ([OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0)). It restructures
  the badge as a W3C Verifiable Credential and "aligns with the
  conventions of the Verifiable Credentials Data Model v2.0" (same).
  Every OpenBadgeCredential must carry a proof; the spec supports VC-JWT
  and Data Integrity (linked data) proofs (same).
- **VC Data Model 2.0, Data Integrity, the EdDSA cryptosuites and
  Bitstring Status List** became W3C Recommendations on 2025-05-15
  ([W3C news](https://www.w3.org/news/2025/the-verifiable-credentials-2-0-family-of-specifications-is-now-a-w3c-recommendation),
  [VC DM 2.0](https://www.w3.org/TR/vc-data-model-2.0/),
  [Bitstring Status List](https://www.w3.org/TR/vc-bitstring-status-list/)).
- **Issuer certification** tests proofs made with
  `eddsa-rdfc-2022` (Data Integrity EdDSA) or `ecdsa-sd-2023`, and
  defines revocation as a `BitstringStatusListEntry` with
  `statusPurpose: revocation`
  ([OB 3.0 certification guide](https://www.imsglobal.org/spec/ob/v3p0/cert/)).
- **Issuer identity.** The implementation guide shows `did:web`
  resolving to a hosted JSON resource, and also mentions `did:key` and
  `did:jwk`. The issuer profile carries the public key in a
  `verificationMethod`, and the proof's `verificationMethod` points to
  it by fragment. Issuer profile and Achievement URLs should serve
  JSON-LD to JSON clients and HTML to browsers via the `Accept` header
  ([OB 3.0 implementation guide](https://www.imsglobal.org/spec/ob/v3p0/impl)).
  One secondary source says certified implementations must use
  `did:web` or `did:key` with an Ed25519 key
  ([search summary citing the cert guide](https://www.imsglobal.org/spec/ob/v3p0/cert/));
  my fetch of the cert guide did not show that line, so treat it as
  unverified.
- **Recipient.** Either the learner's DID (when a wallet proves control
  of it) or, for link-shared badges, a salted SHA-256 email hash in
  `credentialSubject.identifier`
  ([implementation guide](https://www.imsglobal.org/spec/ob/v3p0/impl)).
- **Evidence.** OB 3.0 has an Evidence class: "information supporting a
  claim such as a URL to an artifact produced by the Learner," with
  narrative, name, description and genre
  ([OB 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0); field list
  as in OB 2.0's [Evidence class](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html)).
- **Open Badges 2.0** is still in wide use. Its "hosted" verification
  needs no signature at all: the Assertion, BadgeClass and Issuer
  Profile are JSON-LD files at stable HTTPS URLs, on the same origin as
  the issuer profile by default; the Assertion URL "is the source of
  truth"
  ([OB 2.0 spec](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html)).
  Note DCC's VerifierPlus verifies OB 3.0 but not OB 2.0
  ([verifier-plus](https://github.com/digitalcredentials/verifier-plus)),
  so OB 2.0 alone limits where the badge can be checked.

### Issuers: who is still free

| Issuer | Cost | OB 3.0 | Source |
|---|---|---|---|
| Canvas Credentials / Badgr (now Parchment Digital Badges) | Free issuing ended 2025-12-31; no new free issuers after 2025-06-30. Earners keep a free backpack. | Moving to it | [Chapman](https://blogs.chapman.edu/academics/2025/06/16/sunset-of-canvas-badges-credentials/), [Certifier](https://certifier.io/blog/canvas-badges) |
| Credly | Custom quote, no public price | Imports OB 2.0 and 3.0 from any issuer (announced 2024-10-16) | [Certifier](https://certifier.io/blog/credly-pricing-is-credly-worth-it), [Credly blog](https://learn.credly.com/blog/credly-supports-open-badge-3.0) |
| Open Badge Factory | From about 220 EUR/yr; 60-day Pro trial, then a limited free level | Certified; all OBF badges are 3.0 | [OBF FAQ](https://openbadgefactory.com/en/resources/faq/), [OBF trial](https://support.openbadgefactory.com/en/support/solutions/articles/80001054254-can-i-try-out-the-platform-for-free-), [OBF on 3.0](https://openbadgefactory.com/en/your-badges-are-now-open-badges-3-0/) |
| Badgecraft (becoming Awero) | Free Personal plan: up to 100 badges, 100 people, 10 activities | Not confirmed | [Badgecraft pricing](https://www.badgecraft.eu/en/pricing) |
| Moodle | Free, self-hosted | Sources conflict: one says 5.0 finalizes OB 3.0, Moodle's own certification shows OB 2.0/2.1 | [Open LMS](https://support.openlms.net/hc/en-us/articles/25767806327068-What-s-New-In-Moodle-5-0-And-5-1), [Moodle docs](https://docs.moodle.org/dev/openbadges), [1EdTech cert](https://site.imsglobal.org/certifications/moodle/moodle) |
| DCC open-source stack | Free, self-hosted (Docker services) | Yes (OpenBadgeCredential) | [issuer-coordinator](https://github.com/digitalcredentials/issuer-coordinator), [signing-service](https://github.com/digitalcredentials/signing-service) |

The DCC stack: issuer-coordinator calls a signing service and a status
(revocation) service, run together under Docker Compose; the signing
service handles VC 1.1 and 2.0; an admin dashboard does CSV batch
issuing with email ([issuer-coordinator](https://github.com/digitalcredentials/issuer-coordinator),
[signing-service](https://github.com/digitalcredentials/signing-service),
[DCC GitHub](https://github.com/digitalcredentials),
[DCC: our work](https://dcconsortium.org/our-work)). Other open-source
issuers exist (for example [educredentials/ec-issuer](https://github.com/educredentials/ec-issuer)
for OB 3.0 and the EU learner model). WordPress plugins: not researched.

### Wallets and backpacks

- **Learner Credential Wallet** (iOS and Android, free, open source,
  stewarded by the Digital Credentials Commons, formerly Consortium)
  ([lcw.app](https://lcw.app/)). Claiming works by QR or deep link; the
  issuer asks the wallet for the learner's DID, then signs the badge
  to it ([DCC badging lab](https://badging.dcconsortium.org/lcw-experience-badge)).
  A Medium post says stewardship moved to the OpenWallet Foundation;
  I could not open it to confirm
  ([Medium](https://medium.com/open-learning/dcc-transfers-stewardship-of-learner-credential-wallet-to-the-open-wallet-foundation-24fe0c336829)).
- **Open Badge Passport**: free backpack, 1EdTech certified for 2.0 and
  3.0 ([Open Badge Passport](https://openbadgepassport.com/),
  [OBF on 3.0](https://openbadgefactory.com/en/your-badges-are-now-open-badges-3-0/)).
- **Canvas Credentials backpack**: remains free for earners
  ([Chapman](https://blogs.chapman.edu/academics/2025/06/16/sunset-of-canvas-badges-credentials/)).
- **Credly**: earners can upload OB 2.0 and 3.0 badges from any issuer
  ([Credly blog](https://learn.credly.com/blog/credly-supports-open-badge-3.0)).
- **LinkedIn**: no native OB verification found. Learners add it under
  Licenses & certifications with a public Credential URL
  ([Sertifier](https://sertifier.com/blog/digital-badges-on-linkedin/),
  [LastingDynamics](https://www.lastingdynamics.com/academy/insight/add-badge-to-linkedin)).
  So the credential needs a public HTML page per award.
- **Europass**: built for European Digital Credentials (EDC), a
  different format; some issuers issue both
  ([Europass](https://europass.europa.eu/en/european-digital-credentials-learning),
  [EASEC comparison](https://easec.eu/europass-digital-credential-vs-open-badges/)).
  Not a target for this course.
- **Verifying**: VerifierPlus (free, open source, run by DCC at
  verifierplus.org) verifies pasted, uploaded, linked or QR credentials
  ([verifier-plus](https://github.com/digitalcredentials/verifier-plus),
  [FAQ](https://verifierplus.org/faq)).

### Can humanshaped.org issue OB 3.0 from GitHub Pages?

Yes, with one caveat, and without any server.

- `did:web:humanshaped.org` resolves to
  `https://humanshaped.org/.well-known/did.json`. GitHub Pages skips
  dot-folders unless `.nojekyll` is present
  ([Andrew Shepard](https://andrewshepard78.medium.com/adding-well-known-and-other-dot-files-in-your-github-pages-site-df64a267470),
  [GitHub blog](https://github.blog/news-insights/bypassing-jekyll-on-github-pages/)).
  The site branch already has `.nojekyll` (checked locally).
- The issuer profile, the Achievement, a revocation status list, and a
  public HTML page per award are all static files.
- Signing does not need a serverless function. With a cohort of tens of
  people, Ben can sign on his own Mac (or in a GitHub Action holding the
  private key as a secret), then commit the signed JSON and its HTML
  page. The private key never touches the repo. A serverless signer
  (Cloudflare Workers free tier: 100,000 requests a day, but 10 ms CPU
  per request, [Cloudflare limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/limits.mdx))
  is only needed if students should claim into a wallet on their own,
  and RDF canonicalization may exceed 10 ms; I did not test that.
- **The caveat:** the implementation guide asks for `Accept`-header
  content negotiation (JSON-LD vs HTML at one URL)
  ([impl guide](https://www.imsglobal.org/spec/ob/v3p0/impl)). GitHub
  Pages cannot do that. Workaround: give the Achievement a `.json` id
  and link the HTML page from it. Whether every backpack accepts that
  is unverified.
- **Unverified:** whether Open Badge Passport, Credly and LCW accept a
  self-issued `did:web` credential from an issuer that is not 1EdTech
  certified. Test before promising it.

Cost: $0 (domain already owned). Paid alternative if self-issuing fails
the backpack test: Open Badge Factory, from about 220 EUR a year
([OBF FAQ](https://openbadgefactory.com/en/resources/faq/)), or
Badgecraft's free Personal plan if its OB 3.0 support checks out.

### Recommendation: simplest standards-compliant path

1. **Self-issue OB 3.0 from humanshaped.org.** Issuer `did:web:humanshaped.org`,
   one Ed25519 key, proofs `eddsa-rdfc-2022`, one Achievement
   ("Human Shaped Software, Cohort 1"), a Bitstring Status List for
   revocation. Signed by a small local script using DCC's open-source
   libraries, files committed to the `site` branch. $0.
2. **Recipient:** salted email hash by default (so the badge is shareable
   by link), or the learner's DID if they claim into LCW.
3. **Deliver three ways:** a downloadable `.json`, a public HTML page
   (for LinkedIn's Credential URL), and an "open in VerifierPlus" link.
4. **Before cohort 1 ends, test one real credential** in VerifierPlus,
   LCW, Open Badge Passport and Credly. If any refuses, fall back to Open
   Badge Factory for cohort 1 and fix self-issuing after.
5. **Skip OB 2.0.** It is easier (hosted, no signature) but VerifierPlus
   does not read it, and the newer wallets are built around 3.0.

**What the credential should say and embed.**
- `achievement.criteria.narrative`: the ten bring-backs in plain words,
  and that each was shown live to other people.
- `evidence` (one entry each, with a URL and one-line narrative): the
  student's live app; the store or test-track link if they shipped;
  their public bring-back page (Topic A); optionally the public repo.
- Nothing private: no email in clear, no screenshots of private data.
  The student chooses which evidence links go in; a credential is
  permanent and signed, and a link they later want gone should not be
  baked in. Keep evidence as links they control, so they can take a
  page down without breaking the signature.

---

## Topic C. Progress without gamification

- **Rewards can undermine intrinsic motivation.** A meta-analysis of 128
  experiments found engagement-, completion- and performance-contingent
  tangible rewards significantly undermined free-choice intrinsic
  motivation (d = -0.40, -0.36, -0.28)
  ([Deci, Koestner & Ryan 1999](https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf)).
  Verbal, informational feedback can enhance it; the same reward
  helps when it reads as information about competence and hurts when it
  reads as control
  ([Deci, Koestner & Ryan 2001](https://www.selfdeterminationtheory.org/SDT/documents/2001_DeciKoestnerRyan.pdf)).
  The 1999 findings were contested
  ([Cameron et al. comment, PubMed](https://pubmed.ncbi.nlm.nih.gov/10589298)).
- **The three needs.** SDT holds that motivation and wellbeing depend on
  autonomy, competence and relatedness
  ([Ryan & Deci, SDT encyclopedia entry](https://selfdeterminationtheory.org/wp-content/uploads/2023/01/2022_RyanDeci_SDT_Encyclopedia.pdf),
  [APA](https://www.apa.org/research-practice/conduct-research/self-determination-theory)).
- **Badges and leaderboards in a real class.** Over a 16-week semester,
  students in a course with badges and a leaderboard reported lower
  intrinsic motivation, satisfaction and empowerment than a
  non-gamified section, and lower motivation mediated lower exam scores
  (Hanus & Fox 2015, *Computers & Education* 80: 152-161; summary via
  [Semantic Scholar](https://www.semanticscholar.org/paper/Assessing-the-effects-of-gamification-in-the-A-on-Hanus-Fox/dff76a9862467d426113ec530f83942016ae3a97)).
  The authors pointed to social comparison.
- **Badge design matters.** Abramovich, Schunn & Higashi found badge
  effects depend on the type of badge and the learner's prior
  expertise
  ([ETR&D 2013](https://link.springer.com/article/10.1007/s11423-013-9289-2)).
- **Badges steer behavior.** On Stack Overflow, people change what they
  do as they approach a badge threshold
  ([Anderson et al. 2013](https://dl.acm.org/doi/10.1145/2488388.2488398)).
  That is the risk: the badge, not the learning, decides the next move.

**What this means for the platform.**
- Show progress as a record of things made and shown, with names of the
  people who saw them. That is competence plus relatedness, as
  information, not control.
- No points, streaks, levels, leaderboards, completion percentages or
  surprise rewards. No public ranking of any kind.
- One credential at the end, for the whole body of work, issued after
  the student has already shown it to people. It describes what
  happened; it is not the reason to do the work. Do not announce
  per-stage badges.
- The student chooses what is public (autonomy).
- Follow the Odin Project's lead: let people see each other's work, and
  say plainly not to compare.

---

## Recommendations (short)

1. Keep the "Be ready to..." line as each stage's challenge. Turn its
   "When you are ready to move on" paragraph into a 3 to 4 item met /
   not-yet checklist.
2. Peers review live every week; Ben reviews at stages 05 and 08 and on
   any repeat "not yet." Revision is always free. No deadline on the
   credential.
3. Evidence is what the method already produces: live link, store link,
   screenshot, and links into the student's own repo. No time tracking,
   no plagiarism bots, no "did you write the code" pledge.
4. One per-student progress page: stages, links, who saw it. No points.
5. Self-issue one Open Badges 3.0 credential from humanshaped.org via
   `did:web`, signed locally, at $0. Test it in four wallets before
   cohort 1 ends; Open Badge Factory is the paid fallback.
6. Evidence in the credential: the live app, the store link, the public
   bring-back page, chosen by the student.

## Open questions for Ben

1. Should this notes file be public? Anything in `research/` on the
   `site` branch is served by GitHub Pages.
2. Where do submissions live? A cohort GitHub repo (issues or
   discussions per student) is free and fits the template; a form tool
   ties to the undecided sign-up backend. Students without GitHub
   accounts change the answer.
3. Stage 05 costs money ($99/yr Apple, $25 Google, per `COURSE.md`).
   Does the credential require a store listing, or is "installed on a
   device you did not build on" from a direct build enough? I would
   accept the latter.
4. Is the credential for completing all ten bring-backs, or for a
   shipped app plus some subset? Partial completion could get a
   "participated" record with no badge, or nothing.
5. Do you want students to claim into a wallet themselves (needs a
   small signing endpoint) or receive a file and link from you (needs
   nothing)? The second is simpler for cohort 1.
6. Should peers who reviewed be named in the credential's evidence
   narrative ("shown to two peers each week")? It honors relatedness
   but names people in a permanent signed record; I would describe the
   practice without names.
7. Who are the alumni after cohort 1? Recurse's "never graduate" model
   suggests letting alumni attend later sessions and review newcomers'
   bring-backs.
