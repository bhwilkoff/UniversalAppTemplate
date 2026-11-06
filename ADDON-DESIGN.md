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
| Now | Leader: this moment. Before the session, open the stage and start. In a part, your notes and what the part needs: the question's answers, who shows next, rooms and their clock. |
| Plan | Every part, one line each. Go to one; change one. |
| Tools | What you do to the room: main stage, ask a question, a card, breakouts, recording. |
| People | Who is here, who answered, guests and who they are, recognition. |
| Now (learner) | Where to go, then what is being asked. |
| Mine (learner) | Your answers, your work to show, your app. |

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
