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

Tools is a grid of tiles, and a tile opens one tool, with All tools to go back. Rule 4's two levels, and nothing to scan. The board and Breakouts are tiles of their own from the start of the call: putting the board up opens the main stage first if it is closed, and Breakouts says it is connecting until the call's signals arrive.

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
