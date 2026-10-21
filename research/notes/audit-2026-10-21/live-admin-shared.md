# Audit: explanatory text vs. interface on live, board, card, add-on, showcase, events, admin, header and footer

Repo: `/Users/bhwilkoff/Documents/GitHub/humanshaped-site` (read only, no edits). File:line points at the line in the repo. Quotes are trimmed to under 15 words.

## Before the tables: a doc conflict to settle first

`research/notes/navigation-and-wayfinding-notes.md` §6, "The page header", item 3 tells pages to add a **role sentence**: "You teach this cohort. This is the page its people see; your tools are on the teaching page." That is almost word for word the sentence Ben is objecting to. PAGES.md rule 5 says the opposite ("The interface shows whose view it is, not a sentence"). The repo's rule is to fix the doc first, then the feature, so that note needs rewriting before any of the role-sentence fixes below land, or a later session will put the sentences back.

## The shared vocabulary used below

These are the elements from the brief. Two are new, and they are marked as such.

- **Page header facts**: a definition list of key facts.
- **Status label**: a state shown as an icon plus a word.
- **Visibility marker**: who can see this, as an icon plus a few words.
- **Row**
- **Empty state**: one line plus one action.
- **Checklist**
- **Field hint**
- **Disclosure**: details or a popover, closed by default.
- **Tabs or segmented control**
- **Count badge**
- **Toast or inline status**
- **Confirm step**
- **Toolbar**
- **Timer or progress indicator**
- **Presence indicator**: who is here, or who is on stage.
- **New: banner (signal).** One full-width, colored strip with an icon, a title, an optional timer, and one action. It is for things that interrupt everyone: recording, "go to your room", "come back".
- **New: connection chip.** One small status label for "Live / Checking every 15s / Offline", used the same way on /live/, /board/, and /addon/.

---

## 1. /live/?c= — static markup (`live/index.html`)

| Quote | Where | Verdict |
|---|---|---|
| "Opening the session…" | live/index.html:67 | KEEP as a loading state, but use the shared state component (§17) |
| "Keep this page open beside the session." (h1) | :69 | REPLACE with the shared signed-out state: h1 "Week N live session", one sign-in action |
| "…this page will hold the session's agenda, this week's challenge, the queue…" | :70 | CUT (a sales paragraph inside a gate) |
| "This session is for the people in its cohort." | :74 | KEEP (refusal), in the shared not-member state |
| "If you are in it, open this page from your home page." | :75 | REPLACE with the empty state's one action: "Go to your home" |
| "Sessions are recorded so that anyone who misses one… can watch it later." | :100 | REPLACE with a **visibility marker** on the recording ("Recorded · cohort only") plus a disclosure for the policy. It shows even when nothing is recording. |
| "When it is your turn, open your work in its own tab and present…" | :136 | REPLACE with a **disclosure** ("How to present") next to "Ask to present it", or show it only to the person who is up next |
| "The link, from GitHub or anywhere on the web" (label) | :146 | REPLACE: label "Link" plus a field hint ("https://…") |
| "What should people look at, if you want to say" (label) | :149 | REPLACE: label "Note" with an "Optional" field hint |
| "Show everyone the results as answers come in" (checkbox) | :167 | KEEP (a control label) |
| data-checks-intro (filled by live.js:171–173) | :163 | see live.js below |
| "Shared since the last session, newest first. You can share yours from your cohort page." | :182 | REPLACE: the section heading says what it is; "newest first" goes in a sort indicator; "share yours" becomes an empty-state action |

## 2. /live/ — live.js

| Quote | Where | Verdict |
|---|---|---|
| "This page needs to know which cohort's session to show. Open it from your cohort page." | live.js:78 | REPLACE with the shared "missing link" error state plus a "Go to your home" action |
| "This session could not be opened: …" / "could not be loaded: …" / "Something went wrong: …" | :87, :98, :136 | KEEP (warning), in the shared error state; make the three phrasings one |
| kicker "…, live now" | :145 | REPLACE with a **status label** ("● Live") |
| kicker ". You are teaching it." | :145 | **CUT.** It breaks PAGES.md rule 5. The cohort row already shows "Teaching it". |
| "This week's challenge will be here once your teacher writes it." | :147 | REPLACE with an empty state. Students: "No challenge yet." Teachers: a "Write it" action. |
| "Join the session" / "The Meet link" (one button, two labels) | :149 | KEEP the button. Show liveness with the status label, not by changing the button text. |
| Questions intro, teacher: "Ask a short question to see what is landing. Each person sees…" | :172 | REPLACE with a **visibility marker** ("Answers: you only · results hidden until shown") plus a "Deleted when the cohort ends" disclosure |
| Questions intro, student: "Your teacher may ask a short question… Only you and your teacher…" | :173 | REPLACE with a visibility marker ("Only you and your teacher"). It is said three times (see §6). |
| "Nothing has been brought back yet for this session." | :181 | KEEP as an empty state; add a "Bring yours" action |
| "Wants to know: …" | :187, :389 | KEEP as a labeled field (row) |
| "Before the session, week N" / "Minute X of Y, for Z minutes" | :204 | REPLACE with a **timer or progress indicator** (a scene bar) |
| "This week's design stage for the whole cohort. Everyone draws on it at once…" | :315 | CUT. The slot title and the "Open the design stage" button say it, and the glossary repeats it. |
| "What your teacher heard in week N's checks, and what changes" | :329 | KEEP as a section heading; shorten to "Heard last week" |
| "What you heard in week N's checks… shows here while people arrive once you write it…" | :334 | REPLACE with an empty state: "Not written yet" plus a "Write it" link |
| "This cohort has no groups yet, so everyone stays in the main session. You can make groups…" | :355 | REPLACE with an empty state: "No groups" plus a "Make groups" action |
| "You are not in a group yet, so stay in the main session, and your teacher will say…" | :356 | REPLACE with a status label ("No group · stay in main room") |
| "Each builder takes a turn, in the order below, which moves along by one each week…" | :359 | REPLACE with a numbered **checklist or stepper** that shows the order. The "run timers from any one screen" part becomes a disclosure. |
| "This group has no room of its own yet, so it stays in the main session until…" | :378 | REPLACE with a status label ("No room") plus a teacher action ("Add room") |
| "The order this week" / "Each turn, about N minutes" | :382, :403 | KEEP as headings; put the minutes in a duration badge |
| "You can say what you want to know when your turn starts, or write it on…" | :390 | REPLACE with an empty field and a "Add your question" action |
| "They will say what they want to know when their turn starts." | :391 | CUT; show a dash or nothing in that cell |
| "No one is in this group yet." | :398 | KEEP as an empty state |
| Readiness: "You marked it ready to move on." / "Ready to move on, by their own reading." | cohort-lib.js:137–138 | REPLACE with a **status label** ("Ready" / "Not yet") marked self-assessed |
| "Seen working on a device by A and B." | cohort-lib.js:145 | REPLACE with a **presence or avatar indicator** ("Seen by" plus avatars) |
| "Say what people should look at, if you like, then add it." | :563 | REPLACE with focus on the note field and a field hint |
| "GitHub cannot see that repository, so paste the commit's link instead." | :574 | KEEP (refusal, inline status) |
| "That needs to be a full link that starts with https://." | :595 | KEEP (field error) |
| "The page could not read the latest changes: …" | :621 | KEEP (warning) as the **connection chip** in its error state |
| "Next to present" / "On the main stage" / "Your part: …" | :667, :703, :706 | KEEP as headings; the stage is a **presence indicator** |
| "Thank them, and bring up NAME from the wings" | :710 | KEEP (action); a shorter label would read better |
| "Everyone in the wings has presented." / "No one is in the wings yet. Ask to present below." | :726 | KEEP as an empty state, with the action as a button rather than "below" |
| "Presented so far (N)" | :729 | REPLACE with a disclosure summary plus a **count badge** |
| "Delete this question and every answer to it?" | :771 | KEEP (confirm step) |
| "You answered: …" / "You did not answer this one." | :818, :825 | KEEP / REPLACE with a status label ("Not answered") |
| "No question is open right now. When your teacher asks one, it appears here." | :852 | REPLACE with an empty state: just "No open question" |
| "Planned for this scene, KIND" | :922 | KEEP (heading) |
| "Asked. The answers are below." | :926 | REPLACE with a toast ("Asked") |
| "This page checks for changes every fifteen seconds." / "Changes… appear here as they happen." | :944–945 | REPLACE with the **connection chip** ("Live" / "Every 15s") |

## 3. Run of show, used on both /live/ and /addon/ (show-view.js, show-view-lib.js, show-run.js)

This is the densest layer of explanatory text in the product. **Every** collapsible slot has a summary line, every scene has a kind line, and there is a nine-term glossary on top.

| Quote | Where | Verdict |
|---|---|---|
| "Today's scenes in order. The open one is happening now; choose another to move everyone there." | show-view.js:35 | CUT. A **stepper** with `aria-current` and a "Now" status label on the current scene shows this. |
| "Today's scenes in order. The open one is happening now." | :36 | CUT |
| Scene kind lines ("Someone explains, and everyone listens and reads along.", ×7) | show-view-lib.js:27–33, shown at show-view.js:62 | REPLACE: the kind name plus an icon is enough; the line goes behind a disclosure or a tooltip |
| "What happens in this scene" (details) | show-view.js:65 | KEEP (already a disclosure) |
| "Make this the current scene" | :76 | KEEP (action); "Go to scene" would be shorter |
| "The clock is stopped." | :129 | REPLACE with the **timer**'s paused state (an icon) |
| "The main stage shows X instead of this scene." | :132 | REPLACE with a **presence or stage indicator** ("On stage: X") plus a "Back to scene" action |
| "This week is running on the six parts. To change a scene… give this week a run…" | :149 | REPLACE with a **confirm step** on "Edit": "Make a copy for this week?" |
| Field hint "A few lines, with a blank line between them." | :175 | KEEP (field hint) |
| Field hint "One to a line, two to eight. Leave empty for…" | :177 | KEEP (field hint) |
| "Your own main stage shows this as you type. Everyone else sees it when…" | :194 | REPLACE with a "Draft · only you see this" status label |
| "Not shown yet: …" / "Everyone sees it now." | :200 | KEEP as a toast or inline status |
| "Any time in the show" / "Everything that is not part of the current scene, kept here…" | :214–215 | Keep the heading, CUT the line |
| "Stuck? Ask yourself one question first, then try what X suggests, and bring it…" | :224–230 | REPLACE with a single "Stuck?" link button (a disclosure for the 20-minute rule) |
| "What the words mean" plus a 9-term glossary ("Run of show", "Cue", "The wings"…) | :235, show-view-lib.js:14–22 | REPLACE. If the interface needs a glossary, the labels are wrong. Use plain labels (Rooms, Presenting, Queue) and drop the theatre metaphor, or keep the glossary on the help page. |
| Slot lines, ×16, e.g. "Its clock, and the cues to start it or move…", "Whose turn it is in your room, the step you are on…", "The stages this week's work comes from." | show-view-lib.js:45–76 (drawn at show-view.js:253) | **CUT all.** Each slot's name, contents, and count badge are self-evident. Put a **visibility marker** on the teacher-only slots instead of prose. |
| "To put the card on the main stage of everyone's Meet, open the card page and present that tab." | show-view.js:341–343 | REPLACE with a "Open card for presenting ↗" button |
| "You are presenting. Everyone sees your work on the main stage." | show-view-lib.js:197 | REPLACE with a **presence indicator** ("On stage: You") |
| "The show cannot be moved from here." / "Only a scene of this session's own run…" / "Only the cohort's teachers can change…" / "already has a run of show…" | show-run.js:66, :96, :101, :112 | KEEP (refusals) |

## 4. Live signals: banners and teacher cues (signals.js, signals-lib.js), on /live/, /addon/, /card/

| Quote | Where | Verdict |
|---|---|---|
| "You are recording now, and everyone in the cohort sees this line until you say…" | signals.js:111 | REPLACE with a recording **banner** ("● Recording") plus a "Stop" action |
| "Your teacher is recording now, on their own computer, and only the people in this cohort…" | :112 | REPLACE with the banner plus a **visibility marker** ("Cohort only") |
| "You are counting how much you talk, and everyone… sees this line until…" | :114 | REPLACE with a banner or status label ("Counting talk time") plus "Stop" |
| "Your teacher's recorder is counting how much they talk… keeps no one's words for this." | :115 | REPLACE with a status label plus a disclosure ("What's counted") |
| Talk share sentence: "…talked N percent of the time anyone was talking… from the sound alone…" | signals-lib.js:247–248 | REPLACE with a **stat** ("Teacher talk: 41%") plus a disclosure for the method |
| "Come back to the main room" / "The time in the rooms is up." / "Your teacher is calling everyone back." | signals.js:127–128 | KEEP the banner title; the reason becomes the banner subtitle (fine as is) |
| "The main room is the session's own Meet call." | :131 | CUT, or render the button |
| "Everyone is in their rooms" / "Go to your group's room" | :137 | KEEP (banner title) |
| "Finish the thought you are on, and then come back to the main room." | :143 | REPLACE with the **timer**'s warning state ("1 min left") |
| "You are not in a group yet, so stay in the main room…" / "Your group has no room of its own yet…" | :147, :152 | REPLACE with a banner status label ("Stay in main room") |
| "X has no room yet, so it stays in the main room." | :163 | REPLACE with a status label on each room row ("No room") |
| "Everyone else is watching." / "…so take your time." | :181–182 | CUT |
| "Everyone else is watching. Your teacher pins them…, but Meet on a phone does not show pins…" | :183 | REPLACE with the **presence indicator** ("On stage: A, B"); CUT the explanation |
| "Recording now, for this cohort only" | :216 | KEEP; it is already a status label plus a visibility marker. Make it the template for everywhere else. |
| Confirm: "This cohort has no groups yet, so everyone will stay in the main room. Send the signal anyway?" | :279–280 | KEEP (confirm step) |
| "Saved. The cohort sees it on this page." / "Removed. Nobody sees it now." | :348, :355 | REPLACE with a toast plus a **visibility marker** on the saved value |
| "Ready to show." | :367 | REPLACE with focus on the button; CUT the text |
| Label "Minutes in the rehearsal rooms, if you want a clock" | signals-lib.js:261 | REPLACE: label "Minutes" with an "Optional" field hint |
| "Everyone sees 'Come back to the main room' for ten minutes." | :276 | REPLACE with a live status label plus a timer |
| "Saved cards, to fill in with one press" | :297 | REPLACE with the heading "Saved cards" |
| "Then pin the same people for everyone in Meet: open the menu on each…" | :314 | REPLACE with a **disclosure** ("How to pin in Meet") or a **checklist** step |
| "This only shows everyone a notice. The recorder runs on your own computer, so say aloud…" | :320 | REPLACE with a **checklist** (☐ Say it aloud ☐ Start recorder ☐ Tell everyone) |
| "Everyone sees that you are recording." / "…counting your talk." | :323, :334 | REPLACE with a status label ("Showing to everyone") |
| "If you turn it on in the recorder, it counts how much you talk… never anyone's words." | :331 | REPLACE with a disclosure ("What is counted") |
| "When the session ends, the recorder shows you your share. It is yours: keep it…" | :338 | REPLACE with a **visibility marker** next to Save ("Cohort will see this") |
| Validation lines: "Choose who is presenting first.", "Three people is the most the stage holds…", "Keep a card under 200 characters…", "Write the percent the recorder showed you…" | :153–235 | KEEP (field errors and refusals) |

## 5. Rooms (rooms.js, rooms-lib.js)

| Quote | Where | Verdict |
|---|---|---|
| "They would like you here, asked N minutes ago." | rooms.js:97 | REPLACE with a **status label** ("✋ Wants teacher · 3m") |
| "You asked for your teacher N ago. They will say so when they arrive." | :98 | REPLACE with a status label ("✋ Asked · 3m"); CUT the second sentence |
| "This step's time is up. Move on when you are ready." | :196 | REPLACE with the **timer**'s overtime state ("0:00 · over") |
| "M:SS left in this step" | :196 | KEEP as a timer |
| "Not started yet." / "Every turn is done." / "Your turn, step 2 of 5: …" | rooms-lib.js:48–56 | REPLACE with a **progress indicator** (a stepper) plus a status label |
| "You are presenting." / "X is presenting, and you are the audience." | rooms-lib.js:87–88 | REPLACE with the **presence indicator**; CUT "you are the audience" |
| "Paste the room's Meet link, which starts with https://, and its spaces/ name if setup printed one." | rooms-lib.js:116 | KEEP (field error); move the spaces/ detail into a field hint |

## 6. Questions (question-view.js, live-lib.js)

| Quote | Where | Verdict |
|---|---|---|
| Kind descriptions ("Everyone picks one of a few choices.", ×6) | live-lib.js:86–91, shown at question-view.js:79 | KEEP as a field hint (it is a choice the person cannot see the result of yet). A segmented control with icons would be better. |
| "One on each line, two to eight." / "From three to ten." / "Optional, such as 'Not at all'." | question-view.js:64–71 | KEEP (field hints) |
| Label "Your answer, which only you and your teacher see" | :177 | REPLACE: label "Your answer" plus a **visibility marker**. This is the **third** time the same privacy fact appears on the student view, after the slot line and the checks intro. |
| "Shown with everyone's, with no names, if your teacher shows them." | :178 | REPLACE with a visibility marker ("Anonymous · shown if teacher shares") |
| "N answers, with no names" | :210 | REPLACE: a count badge plus an anonymous marker |
| Validation ("Write the question first.", "Keep each choice under 120 characters."…) | live-lib.js:53–211 | KEEP (field errors) |
| "Each person could choose more than one." / "In the order people put them, on average, first at the top." | live-lib.js:252, :264 | KEEP (facts you cannot see in a chart) as a chart caption |

## 7. Discussions and the session thread (discussions.js), on /live/

| Quote | Where | Verdict |
|---|---|---|
| "GitHub will not show this cohort's repository to your account yet. Usually that means…" | discussions.js:60 | KEEP (warning), shortened to one line plus the "See the invitation" action |
| "GitHub has asked this page to slow down…" / "GitHub could not be reached just now…" | :63, :67 | KEEP (warning), as one error-state component |
| Three versions of "permission to read the conversation has expired", e.g. "GitHub ends this page's permission… after eight hours…" | :85, :87, :88 | REPLACE with one short status ("Session expired") plus a "Sign in again" action; drop the hour-count explanations |
| "No one has started a conversation yet, so the first one could be yours." | :131 | REPLACE with an empty state: "No conversations" plus a "Start one" action |
| "This conversation is locked, so no one can add to it." | :191, :445 | REPLACE with a **status label** ("🔒 Locked") |
| "It goes to GitHub as yours, marked as sent from Human Shaped, and you can edit…" | :200 | REPLACE with a **visibility marker** ("Posts to GitHub as you") |
| "Only the people in this cohort can see it. It goes to GitHub as yours… even if you leave…" | :239 | REPLACE: visibility marker ("Cohort only · on GitHub as you") plus a disclosure for the persistence fact. The persistence fact is a real warning, so keep it inside the disclosure. |
| "It goes to GitHub as yours, where only the cohort can see it…" | :453 | REPLACE with the same visibility marker. One fact, three different wordings. |
| "This repository has no category… so start it on GitHub." | :230 | KEEP (refusal) |
| "Your teacher has not opened this session's thread yet. It will be here when they do." | :335 | REPLACE with an empty state: "No thread yet" |
| "Opening it starts a discussion in the cohort's repository on GitHub, under your name…" | :359 | REPLACE with a visibility marker next to the "Open thread" button |
| "Another teacher opened the thread at the same moment… Yours is still on GitHub as number N…" | :397 | KEEP (a fact you cannot discover) |
| "This session's thread is no longer on GitHub (someone may have deleted it)…" | :411, :413 | KEEP (warning), shortened |
| "N more replies to this on GitHub" | :188, :439 | KEEP (link with a count) |

## 8. Pushed during class (live-commits.js, followup-lib.js)

| Quote | Where | Verdict |
|---|---|---|
| "The session has not begun, so nothing has been pushed during it yet." | live-commits.js:54 | REPLACE with an empty state: "Starts at 7:00" |
| "No one has added their repository yet, so there is nothing to read." | :55 | REPLACE with an empty state: "No repositories" |
| "Reading N repositories on GitHub…" | :56 | KEEP (loading) |
| "Nothing has been pushed since the session began." | :70 | KEEP (empty state) |
| "X is private or moved, so its commits are not shown." / "GitHub did not answer… perhaps because of its hourly limit." | followup-lib.js:105–106 | REPLACE with a status label on each repository row ("Private", "Unavailable") |

## 9. /board/ (board/index.html, board.js, board-pages.js)

| Quote | Where | Verdict |
|---|---|---|
| "The board is for the people in a cohort." / "Sign in…, and this page will open the board your cohort draws on…" | board/index.html:75–76 | REPLACE with the shared signed-out state; CUT the paragraph |
| "This board is for the people in its cohort." / "If you are in it, open the board from the session page…" | :80–81 | KEEP the refusal; the path becomes an action button |
| "Everyone in the cohort sees what you draw here… saved every few seconds… deleted with… download… lock…" (5 facts in one paragraph) | :116 | REPLACE. Visibility: a **visibility marker** ("Cohort sees live"). Saved: the **connection chip** ("Saved 7:42"). Deleted: a **warning** next to Download ("Deleted when cohort ends"). Pages: the "Add a PDF" button already exists. Lock: the lock button exists. |
| "The board is Excalidraw, which is open source under the MIT License." | :117 | KEEP (license credit) as small print in the footer |
| "Clear the board for everyone?" / "Everything on it disappears… cannot be brought back…" | :123–124 | KEEP (confirm step plus warning) |
| "This page needs to know which cohort's board to open. Open it from the session page." | board.js:60 | REPLACE with the shared missing-link error state |
| "The board opens here once you are signed in." / "Sign in from the Human Shaped panel beside the call…" | :69–70 | KEEP (a fact you cannot discover, since the stage has no sign-in) |
| "This board belongs to a group you are not in. Your own group's board is linked…" | :97 | KEEP the refusal; the second sentence becomes a "Your group's board" button |
| "Your teacher has not made a board for X yet. The session's board is open to everyone…" | :112 | REPLACE with an empty state plus an "Open the session's board" action |
| "Loading the drawing tools…" | :119 | KEEP (loading) |
| kicker ". You are teaching it." | :137 | **CUT** (rule 5) |
| "The board is locked, so only teachers can draw on it." / "Your teacher has locked the board, so it is here to look at and download." | :159 | REPLACE with a **status label** ("🔒 Locked") |
| "Live with everyone on the board." / "Not live right now, so the board checks for changes every ten seconds." | :160 | REPLACE with the **connection chip** |
| "Here now: A, B." | :161 | REPLACE with a **presence indicator** (avatars) |
| "Saved at 7:42." | :162 | KEEP as a status, inside the chip |
| "Also this session: X, Y, and Z" | :181 | REPLACE with **tabs** across the session board and group boards |
| "This board has been deleted, as boards are when a cohort finishes." | :416 | KEEP (fact) |
| "Placed N pages from F. Draw on them; zoom with the controls in the corner." | board-pages.js:136 | REPLACE with a toast ("Placed 4 pages"); CUT the how-to |
| "A folder of PDFs and pictures in a public GitHub repository, such as…" | :164 | KEEP as a field hint |
| "The folder could not be read: … It needs to be in a public repository." | :192 | KEEP (refusal) |
| Tooltip "The board is locked, so only a teacher can add pages." | :203 | KEEP (refusal, on a disabled control) |
| "is a slide deck; export it as a PDF first (File, then Download…)" | board-pages-lib.js:24 | KEEP (refusal with a fix) |
| Board templates ("The prompt I would send", "Would solving it make my life better?"…) | board-lib.js:76–124 | Out of scope: lesson content drawn onto the canvas, not interface |

## 10. /card/ (card/index.html, card.js), for OBS or presenting

| Quote | Where | Verdict |
|---|---|---|
| "Opening the card…" | card/index.html:34 | KEEP (loading) |
| "Sign in to show this cohort's cards." / "Sign in with GitHub, then come back…" | :36–37 | KEEP (refusal), in the shared state; the link should be a button |
| "These cards are for the people in this cohort." | :40 | KEEP (refusal); it has no action, unlike the other pages |
| "This page needs to know which cohort's cards to show. Open it from the live session page." | card.js:16 | REPLACE with the shared missing-link state |
| "Recording now, for this cohort only" | via signals.js:216 | KEEP (status label) |

## 11. /addon/ side panel (addon/index.html, addon.js, chat-view.js, class-channel.js, code-runner.js)

| Quote | Where | Verdict |
|---|---|---|
| "This page runs inside Google Meet." / "In any other browser, the same session is on your cohort's live page…" | addon/index.html:33–34 | KEEP the refusal; the second line becomes a button ("Open the live page") |
| "Meet keeps this panel apart from the rest of your browser, so it needs your permission…" | :40 | REPLACE with the button label alone ("Use my humanshaped.org sign-in"); move the explanation into a disclosure |
| "If neither works here, open your cohort's live page in a new tab and keep it…" | :50 | KEEP (fallback), as a secondary link |
| "Link your GitHub account, once." / "Your cohort works through GitHub: your app lives there…" | :56–57 | KEEP the heading; CUT the paragraph |
| "This call is not one of your cohort's rooms yet." | :68 | KEEP (refusal) |
| "This call's code is X. If it is your cohort's session or one group's room, a teacher can paste…" | addon.js:199 | REPLACE with page header facts ("Call code: abc-defg-hij") plus a "Copy link" action and the teaching-page button. CUT the how-to. |
| "Your own AI agent can follow this class with you… What it says reaches the class only if you share it." | :99 | REPLACE with a single "Connect your agent" row plus a visibility marker. It is always visible, every session, to everyone. |
| Header "Week N, the main room. You are teaching. Another cohort uses this call too." | addon.js:544 | Keep "Week N · Main room" as **page header facts**; **CUT** "You are teaching" (rule 5); KEEP "Another cohort uses this call" as a **warning** label |
| "The panel could not load all of its parts. Close it and open it again." | :38 | KEEP (warning) |
| "Your browser did not let the panel use it, so sign in with GitHub in a small window instead." | :75 | KEEP (refusal), shortened |
| "You are not signed in on humanshaped.org in this browser yet, so sign in…" | :81 | KEEP (fact) |
| "Your browser blocked the small window." / "Finish signing in in the small window, and this panel will follow." | :119–139 | KEEP (inline status) |
| "The window closed before it handed your sign-in back. If you finished…" | :145 | KEEP (warning) |
| "Meet did not say which call this is. Close the panel and open it again." | :181 | KEEP (warning) |
| "This cohort has no sessions yet." | :220 | REPLACE with an empty state; it currently goes to the *error* state |
| "Name a skill someone just showed, and when. Only they and the cohort's teachers see it." | :332 | REPLACE with a **visibility marker** ("Them + teachers"); CUT the instruction (the form's fields say it) |
| "Given to X. Only they and the cohort's teachers see it." | :355 | REPLACE with a toast plus a visibility marker |
| Roster summary "8 of 12 here, 5 answered, 3 sharing where they are." | roster-lib.js:47–52 | REPLACE with **count badges** ("Here 8/12 · Answered 5") on a **presence indicator** |
| "Here now" / "Not here yet" / "Answered" / "Not yet" | addon.js:446–452 | KEEP (presence indicator plus status labels, already right) |
| "Your trio's own design stage for this week. Everyone in the trio draws on it at once…" | :503 | CUT (the button says it) |
| "This week's design stage for the whole cohort. Everyone draws on it at once…" | :504 | CUT (repeats /live/) |
| "During a design stage scene, the main stage shows this board to everyone… add a PDF…" | :509 | REPLACE with a disclosure ("How the design stage works"), or CUT |
| "This session has no thread yet. Open it on the session page, and it will be linked…" | :529 | REPLACE with an empty state plus an "Open thread" action |
| "Links, questions for later, and what you are stuck on go here, and they stay on GitHub…" | :532 | REPLACE with a visibility marker ("On GitHub as you") |
| "What you heard in week N's checks shows here once you write it on your teaching page." | :705 | REPLACE with an empty state plus a "Write it" link (same as /live/ :334) |
| "There are no trios yet, so everyone stays in the main room." | :757 | REPLACE with an empty state. It says "trios" here, but /live/ says "groups" for the same thing. |
| "No one is in the wings yet. People ask to present from their own view." | :873 | KEEP the empty state; CUT the second sentence |
| "N answers, which only you and the other teachers see" | :921 | REPLACE: count badge plus visibility marker |
| "The main stage is open. Present it from Meet when you want everyone to see it." | :1133 | REPLACE with a status label ("Main stage open") plus a disclosure for presenting |
| "This panel checks for changes every fifteen seconds." | :1147 | REPLACE with the **connection chip** |
| "This add-on is not set up yet: it needs its Google Cloud project number in assets/addon-config.js." | :1169 | KEEP, but it is developer text a user could see; reword or show it only to the admin |
| "React to what is happening now" / "Where you stand on what is being said" | class-channel.js:28, :43 | KEEP (aria-labels only) |
| "Keys 1 to 8 react, and A, U, and D say where you stand, while this panel has focus." | :72 | REPLACE with key hints already drawn on each button (`react-key` spans exist), plus a "?" shortcut popover |
| "That is a lot of reactions at once. Give it a moment." | :85 | KEEP (refusal, toast) |
| "Reactions are not reaching the class just now…" | :147 | REPLACE with the **connection chip**'s offline state |
| "The stage I am on" / "Not sharing" | :59–61 | KEEP (a select with a clear default); add a visibility marker |
| "Your teacher has not opened the class chat for this session yet." | chat-view.js:195 | KEEP (empty state) |
| "Open the chat for this session. It is a discussion in the cohort's repository on GitHub…" | :196 | REPLACE with a visibility marker next to "Open the class chat" |
| "The chat lives on GitHub, so you post as yourself. Connect GitHub once for this class." | :204 | REPLACE: the button "Connect GitHub" plus a visibility marker |
| "Asked. Everyone answers in the panel, and the count shows as answers come in." | :178 | REPLACE with a toast ("Asked") |
| "📊 Quick poll: …" (an emoji in text posted to GitHub) | :179 | Note: an emoji used as chrome in generated content (R-ICON-1) |
| "Running (Python takes a moment the first time)…" | code-runner.js:131 | KEEP (loading, a fact) |
| "It runs only in your browser, and nothing you change is sent anywhere." | :142 | REPLACE with a visibility marker ("Only you · not sent") |
| "Sent. Everyone has their own copy to change and run." | :101 | REPLACE with a toast ("Sent") |
| "It ran for more than five / thirty seconds, so it was stopped." | :41, :64 | KEEP (refusal) |

## 12. /addon/stage/ main stage (addon/stage/index.html, addon-stage.js)

| Quote | Where | Verdict |
|---|---|---|
| "This page runs inside Google Meet." (outside state) | addon/stage/index.html:31–32 | KEEP (refusal); same as the panel |
| "The grey line under each bar is how people answered the first time." | :52 | REPLACE with a chart **legend** (swatch plus "First time") |
| "Answer on your cohort's live page, where only you and your teacher see…" | :53 | REPLACE with a short instruction ("Answer in the panel") plus a visibility marker. It also contradicts the add-on, where people answer in the panel. |
| "Where everyone is" (kicker) plus "Where everyone is today." (h1) | :70–71 | CUT one; they say the same thing twice |
| "N answers so far, with no names." | addon-stage.js:78 | REPLACE: a count badge plus an anonymous marker |
| "No room has started its turns yet." | :82 | KEEP (empty state) |
| "Would like the teacher" | :88 | KEEP (status label) |
| "N people chose to say where they are. Anyone can, from the panel." | :102–103 | KEEP the count; CUT "Anyone can, from the panel" |
| "Time to move on" | :175 | KEEP (timer state) |

## 13. /showcase/ (showcase/index.html, showcase.js)

| Quote | Where | Verdict |
|---|---|---|
| "On the last night of a five-week cohort, everyone shows the app…" (lead) | showcase/index.html:70 | KEEP (a public page, prose about the event) |
| "Reading the showing…" | :76 | KEEP (loading) |
| "These are the apps their builders chose to show in public. Each one is still theirs…" | :86 | REPLACE with a visibility marker ("Public by choice"); CUT the rest |
| "Being a good guest." section | :93–96 | KEEP (content for guests). **Bug at :96:** the text is garbled: "The cohort<a…>How we treat one another</a> says the rest.rsquo;s own <a…>agreement</a> says the rest." It needs a fix. |
| "On now. " plus the date sentence | showcase.js:83 | REPLACE "On now" with a **status label** ("● Live"); the date goes in **page header facts** |
| "This showing has happened. The apps below are still being built…" | :45 | REPLACE with a status label ("Ended") |
| "The call is on Google Meet, hosted by meet@… choose Ask to join…" | :49 | REPLACE with a **checklist** (1 Open link 2 Ask to join 3 Wait), or page header facts ("Where: Google Meet") |
| "You do not need a Google account to come from a computer… a computer is easier." | :50 | KEEP (a fact you cannot discover), inside a disclosure |
| "The cohort's teacher shares the way in with the guests they invite…" | :55 | REPLACE with an empty state ("Link by invitation") |
| "Each cohort's showing has its own page, linked from its invitation. Events lists…" | :90 | REPLACE with an empty state plus an "Events" action |
| "This cohort has no public showing yet. Its teacher chooses whether…" | :101 | KEEP (refusal), shortened |
| "The showing could not be read just now. Reading this page again in a minute…" | :104 | REPLACE with the shared error state plus "Try again" |

## 14. /events/ (events/index.html, community.js)

| Quote | Where | Verdict |
|---|---|---|
| Lead "These are the meetups, hackathons, and showcases that people are hosting…" | events/index.html:69 | KEEP (public intro), could be shortened |
| Host cards: meetup and hackathon blurbs | :79, :83 | KEEP (content) |
| "When you make the flyer and the slides, the brand kit has…" | :86 | REPLACE with a row link ("Brand kit →") |
| "Reading the list of events…" | :92 | KEEP (loading) |
| "If you are hosting a gathering… listed here once someone has read it… Everything you write there is public…" | :106 | REPLACE with a **checklist** (Tell us → reviewed in days → listed → add write-up) plus a **visibility marker** ("Public") next to "Tell us about your event". The public warning is real; keep it as the marker. |
| "The guides for a meetup and a hackathon have everything else you need…" | :107 | CUT (it repeats the host cards above) |
| Marks paragraph "Two marks say that your software is aligned with or endorsed by…" | :115 | KEEP (content) |
| Discussion paragraph "The humanshaped organization on GitHub holds every conversation…" | :127 | KEEP (content), shortened |
| "No write-up yet." | community.js:42 | REPLACE with a status label on the row |
| "Nothing is on the calendar right now. If you are planning something, tell us…" | :56 | REPLACE with an empty state: "Nothing scheduled" plus "Tell us about yours" |
| "No one has started a discussion yet, so the first one could be yours." | :76 | REPLACE with an empty state (the same phrase as discussions.js:131) |
| "The list of events could not be reached just now. It lives in the humanshaped community repository…" | :83 | REPLACE with the shared error state; CUT where it lives |

## 15. Admin: /admin/, /admin/people/, /admin/person/, /admin/changes/

| Quote | Where | Verdict |
|---|---|---|
| Lead "Who has signed in, who may do what, and what is waiting. Every change…" | admin/index.html:75 | CUT. The area row and the counts say it. |
| "Checking whether you are signed in…" (×4 pages) | each admin page :79 | KEEP (loading), as the shared component |
| "Running the hub is for its admins, so it starts with signing in." (×4) | :82 | REPLACE with the shared signed-out state |
| "Running the hub is for its admins. If you think you should be one, ask an admin…" (×4) | :87 | KEEP the refusal, shortened ("Admins only") |
| "N people have signed in, and M teach." / "See everyone" | admin.js:25 | REPLACE with **count badges** or stats ("People 42 · Teachers 6") linking to the queues |
| "Admins: A, B." | :26 | REPLACE with page header facts |
| "There is only one admin. A second one means the hub is never locked if…" | :27 | KEEP (warning); give it a warning status icon |
| "One person is asking to teach." / "N credentials are waiting to be signed." | :29, :31 | REPLACE with a count badge row ("Requests to teach 1 →") |
| "No rights have been changed here yet." | :35; admin/changes/index.html:95 | KEEP (empty state) |
| People lead "Everyone who has signed in. Open someone to change what they may do." | admin/people/index.html:75 | CUT. The table and its linked names show it. |
| "N people, the first 200." | admin-people.js:14 | KEEP (count; the cap is a fact you cannot discover) |
| Person facts "@x on GitHub. First signed in May 3." | admin-person.js:83–84 | REPLACE with **page header facts** (a definition list: GitHub, Signed in with, Since) |
| "They are asking to teach. Making them a teacher here answers their request…" | admin/person/index.html:100 | KEEP (a fact you cannot discover), as a status label ("Asked to teach") plus a short line |
| Label "A note for the log, if you would like one" | :102 | REPLACE: label "Log note" with an "Optional" field hint |
| Right rows "Teacher: yes" plus a description ("Plans cohorts and polls, and teaches…") | admin-person.js:22–23; admin-lib.js:6–9 | Turn "yes/no" into a **status label** or switch. The description becomes a field hint or disclosure (it is useful the first time). |
| "Only another admin can take this from you." | admin-person.js:29 | KEEP (refusal), on a disabled control |
| Confirm "Taking away teaching also takes approving, signing, and admin… Click again to go ahead." | :38; admin-lib.js:6, :9 | REPLACE the double-click arming with a real **confirm step** (a dialog like the board's Clear dialog); the warning text stays |
| "Who teaches and who is in a cohort is changed by its teachers, on its teaching page." | admin/person/index.html:106 | REPLACE: each cohort row links to its teaching page; CUT the sentence |
| "Not in a cohort, and not teaching one." / "No one has changed their rights here." | admin-person.js:62, :73 | KEEP (empty states) |
| Cohort row "Spring: A student in it, and has left. It is running." | :64–67 | REPLACE with a **row** that has status labels (role, member status, cohort status) |
| Changes lead "Every time someone's rights here were given or taken away… No one can edit…" | admin/changes/index.html:75 | KEEP "No one can edit" as a lock marker on the table; CUT the rest |
| "There is no one at this address. Everyone is listed together." | admin/person/index.html:91 | KEEP (not-found state) plus a "People" action |

## 16. Site header and footer (assets/site.js, every page's markup)

| Quote | Where | Verdict |
|---|---|---|
| "Sign in with GitHub" (header button) | every page, e.g. live/index.html:56 | KEEP |
| Account menu "Your home / Your account / Sign out"; aria "Your account, signed in as X" | site.js:132–136 | KEEP (already interface) |
| "Copied" / "Select the code above to copy it" | site.js:36–40 | KEEP (toast or inline status) |
| Footer "The ideas, the method, the tools, and the cohorts are free, and what you build is yours." | e.g. live/index.html:218 | KEEP (brand line). On in-session tools like /live/ and /board/, consider a minimal footer. |
| Footer "Made by Ben Wilkoff, with help from people and tools." | :246 | KEEP (credit) |
| Header and footer render in full on /live/ and /board/ | — | Not text, but the in-session pages carry the full marketing chrome |

---

## 17. Signed-out, not-a-member, loading, and error states

**How they are worded today:**

| State | Variants found |
|---|---|
| Loading | "Opening the session…", "Opening the board…", "Opening the card…", "Opening the stage…", "Checking whether you are signed in…" (admin and teach, ×14), "Reading the showing…", "Reading the list of events…", "Finding the poll…". The first four are page-specific and the admin and teach ones are generic. |
| Signed out | **Slogan h1 plus a sales paragraph** (/live/ "Keep this page open beside the session.", /cohort/ "Your cohort lives here."). **Refusal h1 plus a promise** (/board/ "The board is for the people in a cohort."). **Instruction h1** (/card/ "Sign in to show this cohort's cards.", /addon/ "Sign in to see this call's session."). **No h1, a "so it starts with signing in" sentence** (admin ×4, teach ×8, polls ×3, apps/mine, exchange/new). Google sign-in is offered on /account/ and /addon/ but not on /live/ or /board/, which link to /account/. |
| Not a member or role | /live/ "This session is for the people in its cohort." plus "open this page from your home page". /board/ "This board is for…" plus a different path. /card/: the refusal with **no action**. /cohort/ "This cohort is for the people in it." plus a join link. Admin "Running the hub is for its admins. If you think…". Teach "This page is for teachers. Ask to teach…". Specialist "Only the person who holds the signing key…". |
| Missing parameter | "This page needs to know which cohort's session/board/cards to show. Open it from…" (live.js:78, board.js:60, card.js:16). These land in the **error** state, with a "Try again" button that cannot help. |
| Not found | "There is no one at this address. Everyone is listed together." / "There is no cohort of yours at this address…" / "There is no poll of yours…". These are consistent with each other. |
| Error | "Something went wrong: X.", "The board could not be opened: X", "The session could not be loaded: X", "The hub could not be read: X", "…could not be reached just now. Reading this page again in a minute usually brings it back." (showcase, events). Some pages have a "Try again" button (live, board, addon, admin) and some do not (card, stage, showcase, events). |

**Proposed component: `<hs-state>`, one partial plus one helper in site.js.** Every gate uses the same four slots:

1. **Icon**: lock for signed out, person-off for not a member, compass for missing or not found, warning triangle for error, spinner for loading.
2. **h1 that names the thing** the page is about, never a slogan: "Week 3 live session", "The board", "Running the hub". This follows the wayfinding note's own §6 rule 2.
3. **One line**, from a fixed set:
   - Signed out: "Sign in to open this."
   - Not a member: "Only people in this cohort can open this." Or "Only admins…", or "Only teachers…".
   - Missing parameter: "This link is missing its cohort."
   - Not found: "Nothing is at this address."
   - Error: "This could not load." The raw error goes inside a closed **disclosure** ("Details").
   - Loading: no line, just the h1 and a spinner.
4. **One primary action**, plus an optional secondary:
   - Signed out: GitHub sign-in, with Google beside it everywhere, the same as /account/.
   - Not a member: "Go to your home". On /cohort/: "See open cohorts".
   - Missing or not found: "Go to your home", or the list page.
   - Error: "Try again", which also fixes /card/, /stage/, /showcase/, and /events/.

Four changes follow from this. The missing-parameter case becomes a not-found state instead of an error state. The 25+ hand-written copies collapse into one. Signed-out sales paragraphs move to the public pages they belong on. And "so it starts with signing in" disappears.

---

## Summary

### Recurring patterns

1. **A role sentence where the role row already exists.** ". You are teaching it." (live.js:145, board.js:137) and ". You are teaching." (addon.js:544) appear on pages that already show "Teaching it" in the cohort row. This is exactly what PAGES.md rule 5 bans, and the wayfinding note §6 prescribes it, so the doc has to be fixed first.
2. **Privacy explained as prose, three to five times per surface, in different words each time.** "Only you and your teacher see your answer" appears in the slot line, the checks intro, and the answer label. "It goes to GitHub as yours…" has three wordings in discussions.js alone. Recording appears as a standing notice, a signal line, a slot line, and a control hint. One **visibility marker** component replaces about 20 sentences.
3. **Every container explains itself.** There are 16 slot lines (show-view-lib.js:45–76), 7 scene-kind lines, the timeline intro, "Any time in the show" plus its line, and a 9-term glossary. The theatre metaphor (wings, cues, main stage, run of show) needs a glossary to work, which is the clearest sign the labels should be plainer.
4. **State written as sentences instead of labels.** Examples: "The board is locked, so only…", "Not live right now, so the board checks…", "This step's time is up. Move on when…", "You asked for your teacher 3 minutes ago. They will say so…", "Ready to move on, by their own reading". These need **status labels**, **timers**, and a **connection chip**.
5. **"X, so Y" empty states.** "This cohort has no groups yet, so everyone stays… You can make groups on…". Each should be one line plus one action button, not a sentence that names where the action lives.
6. **How-to steps for third-party tools inline**, such as pinning in Meet, presenting a tab, and "Keys 1 to 8 react…". These belong behind a **disclosure** or in a **checklist**.
7. **Presence written as a list in a sentence**: "Here now: A, B.", "8 of 12 here, 5 answered…", "Everyone else is watching…". These need a **presence indicator** with **count badges**.

### The five worst surfaces

1. **The run of show on /live/ and /addon/** (show-view.js plus show-view-lib.js). Every slot, every scene, and the page as a whole carries an explanatory line, plus a glossary. It is the largest single source of prose-as-interface, and it repeats on both surfaces.
2. **The /live/ student view.** It stacks the recording notice, the scene intro, slot lines, the questions intro, the answer label, the wings how-to, the brought-back intro, and "Stuck? Ask yourself…", all visible at once during class.
3. **The teacher cues** (signals-lib.js:255–350). Each cue has a paragraph about what it does, what Meet does, and what to say aloud, where a checklist and status labels would do.
4. **The /board/ foot paragraph** (board/index.html:116), five facts in one block, plus the sentence-form status line (board.js:159–162).
5. **The /addon/ panel chrome**: the always-on "Your own AI agent can follow this class…" line, the role sentence in the header, the no-room how-to paragraph, the design stage explainer, and the keyboard sentence.

### Inconsistencies

- **groups / trios / rooms / rehearsal rooms**: /live/ says "groups" (live.js:355), /addon/ says "trios" (addon.js:757), and signals say "rooms". **main session / main room**: live.js:356 says "main session" while signals.js:147 says "main room".
- **Where to answer**: the stage says "Answer on your cohort's live page" (addon/stage/index.html:53), but the panel has its own answer form.
- **Liveness is shown four ways**: "This page checks for changes every fifteen seconds" (live), "This panel checks…" (addon), "Not live right now, so the board checks… every ten seconds" (board), and "Reactions are not reaching the class…" (class-channel).
- **Sign-in options differ**: Google sign-in appears on /account/ and /addon/ only. /live/ and /board/ link to /account/, and /card/ uses a plain text link.
- **Not-a-member actions differ**: /card/ has none, /live/ points to home, /board/ describes a two-step path, and /cohort/ offers to join.
- **Missing-parameter errors offer "Try again"**, which cannot help.
- **"Nothing yet" wording differs**: "No one has started a conversation yet, so the first one could be yours" (discussions.js:131) against "No one has started a discussion yet…" (community.js:76).
- **Confirm steps differ**: the board uses a real dialog, admin rights use a "Click again to go ahead" arming button, signals use an inline "Remove it? Keep it / Remove", and /live/ questions use an inline "Delete this question…?".
- **Defects found along the way**: garbled text at showcase/index.html:96; an emoji in generated text at chat-view.js:179; an add-on setup error (addon.js:1169) that names a config file to end users; the admin pages' ready state is named `data-state="teacher"` (cosmetic, not visible).
