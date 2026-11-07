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
| Reactions | Everyone | A quiet row on the stage, and the keys |
| The board | Everyone | It fills the stage. Add a note, select it, Vote for this. Each vote is its own dot |
| GitHub | A leader adds it to a slide | Issues, pull requests, commits, a README, or the repository, drawn on the slide; rows open on GitHub from the stage |

## Asking

Ben, November 6, 2026: "a learner should be able to request to do any of the things a leader can do right from the add-on or the main stage itself."

A learner asks from Mine, or with Ask on the stage: a question for everyone, a message on the stage, a link, the board, breakouts, or something else in their own words. It arrives in the leader's Now with Do it and Not now. Do it runs the leader's own action. A learner never changes the room directly.

## A tied guest is that member

Ben, November 6, 2026: "If I have tied that new google account to their account within Human Shaped, it should registar as that user." Once tied, someone is that member here: their name, their app, their place in the queue, their answers, their reactions, and their board notes (`who()` in the panel, `private.claimed_member` in the database).

## Open rooms

Ben, November 7, 2026: "I'd like for the add-on to be usable by anyone as a set of presentation tools." And: "I want to make it as easy of a pipeline as possible."

Any Meet call that is not a cohort's is an open room. The panel looks up the call before it asks anything of anyone, so a stranger's first screen is Start a session, with no account made and nothing to sign in to.

```
Host                           Everyone else
+------------------------+     +------------------------+
| Title            4:32  |     | Title                  |
| Stage on · 12 here     |     | 12 here                |
| Now  Talk  Tools People|     | Now  Yours             |
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
6. **A page runs in a sealed frame.** The host shows a repository's `index.html` at one commit, or a page they pasted. It runs with scripts and forms and nothing else, and everyone gets their own working copy. The room says when a repository has a new version, and the host decides when it reaches the stage.
7. **Not everyone installs.** People can use the room's link, `/room/?<code>`, on any device, with no add-on.

The ladder, in order, none of it required by the step before:

| Step | What a person does | Needs |
|---|---|---|
| Use it | Slides, a question, the board, a clock, reactions | Nothing |
| Keep it | Makes their own copy of `humanshaped/stage-template` with GitHub's own page, and names it in Talk. `talk.md` is their slides | A GitHub account |
| Build in the room | Shows `index.html` from their repository, changes it, and shows the new version | The same |
| Join a cohort | Follows Learn to build this way from Yours or the closing card | Sign-in |

Signing in is offered and never required. One Tap rides on top as it does for a guest.

## Tools

Tools is a grid of tiles, and a tile opens one tool, with All tools to go back. Rule 4's two levels, and nothing to scan.

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
