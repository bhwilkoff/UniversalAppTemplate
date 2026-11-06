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

## Decisions waiting on Ben

Each has a default the work proceeds on, and can change.

1. **Reactions and stance.** Meet has its own reactions. Default: keep ours as one quiet row for learners, because they reach the main stage.
2. **Posts as the app.** Moving GitHub actions to the server removes approvals, but a post then reads as the app, not the person. Default: a person with GitHub connected posts as themselves; the panel needs GitHub for nothing.
3. **GitHub for learners.** Default: not needed to take part, only to build and publish, asked once at setup.
4. **Reminders without GitHub.** They ride on GitHub, so a Google-only person gets none. Default: a plain line on their home page until Ben chooses.
5. **Guests and Google's rule.** The listing says signed-out users must see the One Tap prompt, and a guest walks in without one. Default: guests stay, with Sign in on screen.
