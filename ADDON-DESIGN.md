# The add-on's design

Binding for `/addon/` and `/addon/stage/`, like DESIGN-KIT.md. Fix this file first, then the panel. Research: research/notes/addon-redesign-research.md.

Ben, November 6, 2026: "Our goal should be to have an add-on for both the leader and the learner that looks completely at home within the Google Meet interface. It should also function as a well-designed interface in itself rather than a long list of every feature."

## The shape

```
Leader                         Learner
+------------------------+     +------------------------+
| Part title      4:32   |     | Part title             |
| Stage on · Recording   |     |                        |
| Now  Plan  Tools People|     | Now  Mine              |
|                        |     |                        |
| what this moment needs |     | the one thing asked    |
|                        |     |                        |
| [Back] [Next slide   ] |     | reactions, one row     |
+------------------------+     +------------------------+
```

**Always there, for a leader:** the part, its time, what is live in the room, and one button that names the next step. **Always there, for a learner:** the part.

| Tab | Holds |
|---|---|
| Now | Leader: this moment. Before the session, open the stage and start. In a part, what people are asking for, your notes, and what the part needs: the question's answers, who shows next, rooms and their clock. |
| Plan | Every part, one line each. Go to one; change one. |
| Tools | Tiles for what you do to the room: main stage, a question, apps, breakouts, a card, the board, recording. |
| People | Who is here, who answered, guests and who they are, recognition. |
| Now (learner) | Where to go, then what is being asked. |
| Mine (learner) | Your app first, then what you can ask for, then your answers and work. |

## Rules

1. Design at 320 by 500. It stays fluid from 300 to 480, one column, nothing scrolling sideways.
2. The top frame and the bottom bar never scroll away. Together they stay under 160px.
3. Four tabs for a leader, two for a learner, one row, one word, always labeled.
4. Two levels at most: a tab, and a view with Back. No modals in the panel.
5. One filled button per view. Next is 48px tall; other targets at least 32.
6. A person can read the panel in one glance. A live action takes two presses at most.
7. A thing appears when the moment needs it and leaves when it is done. Its place does not change.
8. A control that changes the room says its state, and says so before it reaches the room.
9. Now is defined for each state: before, teaching, question open, in breakouts, coming back, ended; and for loading, empty, error, and offline.
10. The panel wears Meet's colors, type, and shapes, light and dark. Brand color appears only on the main stage.
11. A feature earns the panel only if it is used during a live session. Preparation stays on the session page.

## The main stage is shared

Ben, November 6, 2026: "Build upon what we already have and emphasize full collaboration between leaders and learners on the main stage."

Measured in a real call: each person's stage takes their own clicks and keys, Meet lets it frame a learner's `github.io` app, and it can reach GitHub's API. It does not share the panel's sign-in, so **a stage has no sign-in, and what a person does on it, their own panel does for them** (`AddonLib.actMessage`).

| On the stage | Who | How |
|---|---|---|
| A live app | A learner asks from the top of Mine; the leader presses Show it in Now, or shows anyone's from Tools | Everyone gets their own working copy, so a class can use it at once. A page that refuses framing keeps Open in a new tab |
| A question | Learners, on the stage | Choices are buttons, and words are typed there. The panel saves them |
| Reactions | Everyone | A centered strip at the very foot of the stage, with a lane above it where sent reactions float; every view ends above both, so they never cover what is shown (Ben, November 11, 2026) |
| A classmate's app, for one person | A learner, from Mine's Your classmates' apps | Try it on my stage shows it on that learner's own stage only, never everyone's, until Back to the class stage in Now; nothing is written to the shared show |
| The board | Everyone | It fills the stage. Add a note, select it, Vote for this. Each vote is its own dot |
| GitHub | A leader adds it to a slide | Issues, pull requests, commits, a README, or the repository, drawn on the slide; rows open on GitHub from the stage |

## Asking

Ben, November 6, 2026: "a learner should be able to request to do any of the things a leader can do right from the add-on or the main stage itself."

Ben, November 11, 2026: "Any question that I'm asking of the cohort members needs to be done on the main stage or within the add-on sidebar. Any action that I need the cohort members to take, should be able to be completed within the Google Meet." A question a leader asks from Tools goes on everyone's main stage at once, whatever it was showing. A learner without an app address adds it in Mine.

A learner asks from Now, where Ask your leader for always sits, or with Ask on the stage: a question for everyone, a message on the stage, a link, the board, breakouts, or something else in their own words. It arrives in the leader's Now with Do it and Not now. Do it runs the leader's own action. A learner never changes the room directly.

## A tied guest is that member

Ben, November 6, 2026: "If I have tied that new google account to their account within Human Shaped, it should registar as that user." Once tied, someone is that member here: their name, their app, their place in the queue, their answers, their reactions, and their board notes (`who()` in the panel, `private.claimed_member` in the database).

## Running a session again

Ben, November 10, 2026: "sometimes a cohort member has to miss a session. They could watch the recording, but they obviously won't get as much out of the experience as if I was running the session again for them. I'd love to be able to load up any previously built session if I am logged in correctly to the add-on." Asked where, he chose any call he is signed in to; asked where the work goes, he chose that session.

1. **A leader picks the session, in any call.** In a cohort's call, Plan starts with the session's name and Run another session, a list of the cohort's sessions. In any other call, a signed-in leader's open room offers Run a cohort session before anyone starts. Choosing one makes the call that cohort's, running that session, for three hours or until Back to the schedule. The list holds every cohort the leader leads, drafts and finished ones too, so a course can be run before it is open.
2. **Everyone in the call follows.** Every panel watches which session its call runs and opens again when it changes, once per change. Members come in as themselves, and anyone else as a guest the leader can tie to a member. A call that is another cohort's own, or is running another cohort's session, is refused.
3. **The work goes to that session, beside the first run.** Answers, posts, and what people do are saved with that session, and nothing of the first run changes. A makeup's recording is never put in place of the first run's.
4. **The leader sees it is a rerun.** The top of the panel says the session's name and "again" (Week 2 again, or Session 4 again) while it lasts.
5. **A draft runs for its leaders alone.** A leader can run a draft's session in any call to try it, and nobody else in that call follows it, becomes its guest, or can run another session over it.

## Parts brought from Course Builder

Ben, November 10, 2026: "Quiet student should function based upon any data that we can actually use (someone who hasn't done any reactions is an indicator, someone who hasn't shared anything yet is another indicator)."

1. **A part's document goes on the stage.** A part with a document and no slides shows the document, framed (a Google file in its preview). A part with both shows its slides, and Now offers Show the document and Back to the slides, which every stage follows (show_state stage `doc`).
2. **People are featured by name, one or several at once.** Any part set to feature someone offers in Now how many (up to eight, starting from the part's own number) and whom: at random, someone quiet so far, or someone who chose a given answer to the newest choice question (Course Builder's Voting filters). The picks show with why (no reactions, no answers, nothing shared, not in the queue, no requests), then Feature them or Pick again. Quiet is counted from this session's reactions and stances, answers, posts, the queue, and requests, among the people in the call; anyone featured already goes to the back (RosterLib.toFeatureMany; show_state stage `people`, logged as people:<ids>).
3. **A debrief shows the earlier question's answers.** A part pointing at an earlier question part pins that question's answers, closed or open, with counts for everyone, and nobody answers there. A part can also ask an earlier question again (Course Builder's Repoll), and the stage shows the first time beside the second.
4. **A question asks as it was written.** A part's own setting decides whether people see the counts.
5. **Breakouts start as the part says.** As many rooms as its group size needs (Course Builder's "groups:<flavors>:<most per group>"), never an empty one, with its minutes and random sorting, fill the breakout tool, fixed so the rooms previewed are the rooms launched. Each flavor's document is dealt out to the rooms in turn: the leader sees the list, and each learner in a breakout room sees their own room's. A breakout part's group workbooks are dealt out the same way: each room answers its own copy together in the panel, saved as they go, and the leader reads every room's on the session page.
6. **One written answer can go on every stage.** Ben, November 11, 2026, said yes to the audit's list, including "Put a chosen written answer on the stage." Under Read the answers, a leader presses Put on stage beside one answer; it goes up without its author's name until the leader presses Show the name. Every panel reads it through `on_stage()`, which gives only what a leader put up.
7. **A room's work goes on every stage for its debrief.** Each room's work lists the breakout rooms with Put on stage: the room's people and its workbook answers, read through `on_stage()` (Course Builder's Feature Breakout Groups).
8. **The same rooms can meet again.** The breakout tool keeps the rooms last launched in this session, in the leader's browser, and offers Same rooms as last time (Course Builder's Re-run Breakout); only people still in the call go back.
9. **What a part is for shows with it.** A part's purpose (Course Builder's activity learning goal, or a leader's own) shows at the top of Now for everyone in the call.
10. **Pre-class work starts the debrief.** A leader's Now holds Pre-class work: how many answered each of the session's own workbooks, the counts for each choice, and each written answer with Put on stage, which goes up without its author's name until Show the name (show_state stage `work`).
## Open rooms' tools in cohort sessions

Ben, November 11, 2026: "I want you to bring everything in from our work on open rooms. There is no reason to wait until after the session, as I want to test the items we worked on for open rooms within the session."

1. **The call's own room carries them.** A cohort panel also joins the room keyed to the call's Meet code (CohortRoom, over RoomClient), only for these tools; the session itself stays with the cohort. A leader opens the room the first time they use one. Nothing in the room is kept after the call, as in an open room.
2. **Show a website.** A leader's tile takes any link pasted whole and works it out as open rooms do (a GitHub account's or repository's Pages site, or any address checked first and refused plainly if it will not be shown inside another page). Everyone gets their own working copy on their stage.
3. **A clock.** A leader starts one to ten minutes with what it is for; it sits as the part's clock at the top of every stage until it runs out or is stopped.
4. **Propose and vote.** A leader opens it with a prompt. Everyone proposes ideas and votes, in their panel or on their own stage, and the stage shows the ideas with their counts. A leader takes it off the stage or clears it.
5. **Stances.** Agree, Not sure, and Disagree sit beside the reactions on each stage's strip and in a learner's panel, and the stage shows the counts above the strip.
6. **A cohort pin wins.** When a leader puts anything of the cohort's on the stage, the room's website or ideas come down.

## Open rooms

Ben, November 7, 2026: "I'd like for the add-on to be usable by anyone as a set of presentation tools." And: "I want to make it as easy of a pipeline as possible."

Any Meet call that is not a cohort's is an open room. The panel looks up the call before it asks anything of anyone, so a stranger's first screen is Start a session, with no account made and nothing to sign in to.

```
Host                           Everyone else
+------------------------+     +------------------------+
| Title            4:32  |     | Title                  |
| Stage on · 12 here     |     | 12 here                |
| Now Slides Tools People|     | Now  Yours             |
|                        |     |                        |
| this slide's notes     |     | the one thing asked    |
|                        |     |                        |
| [Back] [Next slide   ] |     | reactions, one row     |
+------------------------+     +------------------------+
```

The rules above hold here too. What differs:

1. **A room is the call.** Its address is the Meet code. Whoever presses Start is the host; if the host is gone for a minute, anyone can take over. The host can hand it to anyone in the room.
2. **Nothing is kept.** A room lives on Cloudflare, apart from the cohorts' database, and is erased when the host ends it or a day after its last change. The talk stays in the host's own browser until they keep it in a repository.
3. **Notes never leave the panel.** Only the slides go to the room.
4. **Each stage connects for itself.** Unlike a cohort's stage, an open room's stage needs no panel: it takes what it shows from the room, and what a person does on it goes straight to the room.
5. **Answers carry no names.** The stage counts them. The host reads the words, without names.
6. **A website runs in its own frame.** Everyone gets their own working copy. A site at its own address keeps its own origin; a repository with no site is shown from its files at one commit, sealed to scripts and forms. The room says when such a repository has a new version, and the host decides when it reaches the stage.
7. **Not everyone installs.** People can use the room's link, `/room/?<code>`, on any device, with no add-on.
8. **Slides are edited on the slide.** Ben, November 9, 2026: "I don't understand why we are back to the plain text slide editor instead of allowing for editing on the stage." The Slides tab shows the deck as pictures (press one to show it) and Edit on your stage, which opens the cohort's slide studio on the host's own stage only. Everyone else keeps seeing what was there until the host presses Done. Text is one press away inside the studio, never the first thing.
9. **Every tool says what it is for, in words that say how it works.** Ben, November 9: "Each link/feature needs to have a purpose and make sense," and "Words we use for features should be descriptive and help users to know what they are for without having to try everything out." Names come from the lexicon in DESIGN-KIT.md, and one word never names two features. **Propose and vote** opens only with the host's prompt: everyone proposes ideas and votes for the ones they would choose. It is not a board, because nothing on it is placed or moved. **Show a website** lists the host's own GitHub Pages sites to choose from, or takes any link pasted whole and works out how to show it: a GitHub account lists its sites, a repository (or a file or folder in one) shows its Pages site or else its page, and any other address is checked first and refused plainly if the site will not be shown inside another page. Nobody types a path inside a repository, and nobody pastes HTML.
10. **Nothing covers what is shown.** The foot of every room's stage holds the buttons for reactions and stances, and above them a lane where sent reactions float up and fade. The stage's views end above both. A running clock is the whole stage when the stage is clear, and a small pill at the top right over anything else, a page and the board included.

The ladder, in order, none of it required by the step before:

| Step | What a person does | Needs |
|---|---|---|
| Use it | Slides, a question, Propose and vote, a website, a clock, reactions | Nothing |
| Keep it | Makes their own copy of `humanshaped/stage-template` with GitHub's own page, and names it in Slides. `talk.md` is their slides | A GitHub account |
| Build in the room | Shows their site by its address, or `index.html` from their repository, changes it, and shows the new version | The same |
| Join a cohort | Follows Learn to build this way from Yours or the closing card | Sign-in |

Signing in is offered and never required. One Tap rides on top as it does for a guest.

## Tools

Tools is a grid of tiles, and a tile opens one tool, with All tools to go back. Each tile is named for what it does to the room, and says On or Off on its face; Ask where people stand turns on and off from its tile. The top of the panel names the part and where it falls (Part 3 of 7), and says what is on the stage, with Clear. A learner's Now is headed by what to do now, Answer the question or Show your app, with the control under it (Ben, November 11, 2026). Rule 4's two levels, and nothing to scan. The board and Breakouts are tiles of their own from the start of the call: putting the board up opens the main stage first if it is closed, and Breakouts says it is connecting until the call's signals arrive.

## Sign-in in Meet

Meet's frame refuses the Storage Access request, so the panel cannot borrow the site's sign-in. Sign in opens the small window, which hands back at once for anyone signed in on the site.

## What leaves the panel

The panel's chat and code runner (Meet has chat; code belongs on the stage or a page). The path picker, Pushed during class, From the conversation, and the stages list move to the session page.

## The way back

Every cohort gets this panel. `details.panel = 'old'` on a cohort, or `?panel=old` on the address, brings back the previous one. Chat, the code runner, and the class thread do not appear in this panel.

## Decisions Ben made, November 6, 2026

1. **Reactions stay, and get easier.** Ben: "Our reactions are far better than the ones built into Google Meet. They should be easily accessible within our add-on and have keyboard shortcuts for triggering them akin to the ones that are used in the Minerva Active Learning Forum."
2. **Posts.** A person with GitHub connected posts as themselves. Anyone else posts through the app, with their name in the text.
3. **GitHub is required to join a cohort.** A person connects it as they join. A guest by call link still needs nothing.
4. **Reminders stay native.** Ben: "we are trying to leverage Github and Google Calendar's native notification systems rather than creating ones that we have to build and maintain." Requiring GitHub to join is what closes the gap, so nothing new gets built.
5. **Guests stay, with One Tap.** A signed-out person sees the One Tap prompt, can dismiss it, and carries on as a guest.

Where these stand:

- **Keys:** built and tested in a real call. Shift and a number reacts, R goes to reactions, K lists the keys, and A, U, and D say where you stand. They work with focus in the panel or on the main stage. They cannot work with focus on Meet's own page, because Meet's page does not share key presses with an add-on; a Chrome extension is the only way past that.
- **Posts:** not built. With GitHub required to join, the app's fallback would reach only guests, so it waits on whether guests should post at all.
- **GitHub to join:** the database already refused it; the Join button now waits too.
- **Reminders:** nothing to build.
- **One Tap:** it shows inside Meet's panel on the sign-in screen. Over a first-time guest it is built, and not yet seen, because a test profile's panel cannot be returned to a first visit.

## What Week 2 showed, November 11, 2026

Read from the session's recording (Ben's own panel and stage, every 10 seconds), its transcript, and the panel's event log. Ben, at the end of the recording: "It is clear that nobody knows where to click to answer questions ... It should feel like a natural extension of the meeting itself. It should never feel like, oh, I've got to open this back up ... I absolutely have to be able to open and close each one of the tools easily ... I should never have to ask the learners what is on their screen."

What the class managed through the add-on in 53 minutes: two of four learners answered the first question, nobody wrote a next prompt in eleven minutes, two answered the last question, nobody asked the leader for anything, and nobody showed an app from Mine; both demos used Meet's screen sharing, and feedback went into Meet's chat.

Priority 1 stopped people from taking part, priority 2 cost the leader time and confidence, and priority 3 is finish.

### Priority 1

1. **Close the main stage ended the activity, twice** (5:40 and 25:30 into the recording). Each time every learner's panel closed. Their panels came back 7 to 12 minutes later, and one learner's after 25. The leader pressed it to make room for a screen share and to take a card down. **Fix:** nothing in the panel ends the activity except End activity on the last part, which asks in place first. Clearing the stage puts the part's own slide back.
2. **Learners could not tell where to answer.** "For some reason, I can't even reply." A learner pressed Agree believing it answered the question (the log has that stance at the same second). **Fix:** an open question leads the learner's Now with its own answer controls, as well as the stage, and says "Your answer is in" once saved. Stances are hidden while a question is open.
3. **Putting one answer on the stage took the question away from everyone else.** "Once [she] submitted I can no longer type." The stage's answer view replaces the question view. **Fix:** a shown answer sits beside the open question, and the question keeps taking answers until the leader closes it.
4. **Your next prompt** was open eleven minutes with no answers, and **What did you ask your agent to change?** was closed after seven seconds. Same cause as 2: the place to write was not where learners looked.
5. **One learner could not answer the first question at all, and Ask again made a second copy of it,** splitting four answers across two questions. The first cause is not found yet. It needs a learner-side test in a real call. **Fix for the second:** Ask again reopens the same question.
6. **Show my app was not found.** Leader: "Did you just share your screen or did you use the tools inside of the add-on?" "The screen." **Fix:** on a part that asks people to show their app, each learner's Now leads with Show my app, or the address field if they have none yet, and the leader's Now lists who is ready with Show it.

### Priority 2

7. **The leader could not tell what was on the stage.** "If I take that down, does it show?" A card went up over an open question's results. **Fix:** the top frame says what is on the stage in words, with one way to clear it. Every tile says on its face whether it is on, and turns off where it turned on.
8. **Which tab, when.** "It is not intuitive for me as a leader when I'm supposed to be on the Now tab, on the Plan tab, on the Tools tab, on the People tab." **Fix:** Now holds everything the current part plans, its question and its showing apps included. Tools is only for what the plan did not expect.
9. **Stances stuck and overlapped.** "Agree 1" stayed on the stage from the fourth minute to the end, the leader could not clear it ("the Agree, Disagree, Not Sure bar, I cannot get to"), and on a question's results it was drawn through the reactions strip. **Fix:** stances start each part at zero, are a tool the leader turns on and off, and keep their own row above the strip.
10. **People said learners were not here while they sat in the call.** It counts open panels, not people, and after each forced end it showed nearly everyone as not here. **Fix:** it says what it knows: Human Shaped open, or not yet, with how to open it.
11. **The leader cannot see what learners see.** "I should never have to ask the learners what is on their screen." **Fix:** See it as a learner shows the learner's Now for this moment, inside the leader's panel.
12. **Part clocks on the stage.** "Time is up" sat on the stage through most parts, and the leader told a learner to "disregard the two minutes and 30 seconds." **Fix:** a part's clock is the leader's, in the panel. The stage shows a clock only when the leader starts one.
13. **Recording said "The recording has stopped"** while the recording ran.

### Priority 3

14. Last part looks disabled.
15. Feedback in Meet's chat is fine. The add-on builds on Meet, and does not compete with what Meet already does well.

### Where the fixes stand (November 11, 2026, evening)

Tested in a real Meet call with a leader and a learner profile, running Week 3 so Week 2's data stayed untouched.

| # | Fix | State |
|---|---|---|
| 1 | Close the main stage is gone; the top line says what is on the stage, with Clear | Seen in the call. Meet's own End activity asks first. Meet gives learners no prompt to rejoin a restarted activity, only the small icon at the top right, which is why Week 2's learners took minutes to come back |
| 2 | An open question leads the learner's Now, headed Answer the question; the stage says Choose your answer or Write your answer | Seen in the call |
| 2 | Choices stay buttons while counts show; the stage says Your answer is in | Seen in the call for a choice. For a written answer a long question's stage hid the line; fixed and checked offline |
| 2 | The panel's choices were drawn as empty boxes with squeezed words | Fixed; seen in the call |
| 3 | A shown answer sits under the open question, which keeps taking answers | Seen in the call, both sides |
| 5 | Open it again reopens a closed planned question | Built; not yet seen in the call |
| 6 | On a showing part, Show your app leads the learner's Now | Seen in the call |
| 7 | Tiles say On or Off and are named for what they do | Seen in the call |
| 8 | An open question's answers stay in the leader's Now | Seen in the call |
| 9 | Stances: a tile, closed on each new part, hidden until a learner has answered an open question, bar above the strip, chosen stance pressed | Seen in the call; the pressed color was unreadable in Meet's dark theme, fixed and checked offline |
| 10 | People says who has Human Shaped open | Seen in the call |
| 11 | What learners see now, in the leader's Now | Seen in the call |
| 12 | No part clock on the stage | Seen in the call |
| 13 | The recording control says Take the recording notice down | Built |
| 14 | The last part reads as a fact | Built |

### From Ben's words after Week 2 (second round, November 11, 2026)

| Ask | Fix | State |
|---|---|---|
| "What I can do to prep for the next step" | Coming next at the foot of Now: kind, minutes, the question it asks, Show your app, what goes on the stage | Seen in the call |
| "Open and close each one of the tools easily" | A tile that is on carries Take down, Stop, or Close it | Seen in the call (Propose and vote, clock, an app) |
| "Not clear where to go for voting on things, any of the tools" | A learner's Now is headed Propose an idea, and vote, or Try the website on your stage | Seen in the call; a learner proposed from the panel and voted from the stage |
| Show your app from the leader's side | Who is ready leads Now with Show it | Seen in the call |
| "Supposed to be on the plan tab" | Plan offers Edit this part only on the current part | Built |
| "I've got to open this back up" | A closed side panel only hides; the stage keeps working | Seen in the call. Reopening is three presses in Meet's own menus |
| Found in the call | A started clock now has its own corner over every stage view; a website or Propose and vote comes down on a new part | Seen in the call |

## From the class platform study, November 11, 2026

What the add-on gained (DECISIONS.md, "What another class platform taught"):

- **Mark this moment**, under the reactions for leaders and learners: one press keeps the time, with a word if wanted, and the mark appears beside the recording on the session page for that person alone.
- **Hide names** on Read the answers, so a leader reads the idea before the person; the same switch on the session page's answers.
- **−30 sec and +30 sec** beside a running part clock and a running stage clock.
- **Your share of the talking** in the leader's Now, from the last recorded session, for the leader alone.
- **Say it like** beside names in People and under a featured name on the stage, from each person's account page.
- **The cohort's groups**: breakouts can be kept as named groups and launched again in one press.
- **Side by side**: two or three people's apps on the stage at once (stage `apps`), and a part's document beside its open question.

## Every stage fits its screen, November 12, 2026

Ben: "The content should be responsive to screen size." Found running the demo session on a laptop-sized window.

- **A view fits the stage it is on.** Type is sized to the stage with a readable floor; when a view still runs past the space above the strip, the whole view scales down until it fits, again on every resize. Slides end above the strip and scale whole.
- **Choices follow the width they have.** Beside a document, or on a narrow stage, each choice stacks its label over its bar and count, and long choices take one column (a container query on the view, not the window).
- **The strip follows the stage too.** It and its lane shrink on a small stage, so what is shown keeps most of the height.
- **A Writing part keeps its slide beside its question,** so the prompt stems on it stay in view while people write; a part's document still takes that place when it has one.
- **A blank to fill in stays a blank.** Three or more underscores on a slide draw as a blank line, never as bold, so "helps ___ to ___" reads as written.
- **Plan's Go is on every part,** finished ones included, so a leader can return to any part in one press.

## What a learner's real call showed, November 12, 2026

Ben: "You should definitely do a learner panel test," then "Can we solve for the 'still rough' stuff and anything else you have documented that needs to be polished (look for both design and the language we are using for each feature)?"

- **A leader's move reaches learners at once.** After every move or pin the leader's panel nudges the call's channel, and each learner's panel reads the show again; the database's change events, seconds slower, stay as the fallback.
- **A board note starts in the template's first frame**, each next one a little lower and to the right, unless the person has zoomed in on one frame. Notes are written in Write a note at the foot of the board.
- **One name per feature.** Featuring is Feature someone in Now and in Tools; the board is The board on the stage; the rooms are Every room; a group's own call is its room, never a rehearsal room or a trio.
- **A learner's Mine** keeps each closed section's disclosure marker, and leaves out who is waiting to show, which Show my app at the top already covers. A guest's link says Sign in as a member of this cohort.
- **Joining late** is the activity icon at the top right of Meet, then Join activity, wherever the panel tells people how.
- **Words on the stage** keep one fact each: where to answer, and that counts show without names. An answer put on the stage is set as a quote. A learner's request reads "asks for a message on the stage: “…”".
