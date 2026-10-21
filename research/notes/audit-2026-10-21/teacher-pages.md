# Teacher-side audit: text that explains the interface, humanshaped.org

I changed no files. I read every teacher page's static HTML and every string its scripts generate: teach.js, teach-page.js, teach-cohort-form.js, teach-cohort.js, teach-lib.js, question-bank.js, question-view.js (plus the kind lines in live-lib.js), show-builder.js (plus show-lib.js, curriculum-lib.js and board-lib.js), followup-lib.js, credential-lib.js, teach-feedback.js, teach-requests.js, teach-signing.js, the three teach-times scripts, times-lib.js, times-calendar.js, and render.js for the guide. Paths are relative to `/Users/bhwilkoff/Documents/GitHub/humanshaped-site/`.

**Where the owner's example lives.** "You teach this cohort … Open it as its teacher" is not on a teacher surface. It is the role line on the student page `/cohort/`, specified in `research/notes/navigation-and-wayfinding-notes.md:489`. It belongs to the student-side audit, but the same pattern (a sentence where the cohort bar's "Teaching it" link and a role marker would do) appears all over the teacher side.

Verdicts: **K** = KEEP (R refusal, W warning, F fact you cannot discover by looking), **R** = REPLACE, **C** = CUT.

---

## Shared states on all 10 teacher pages
| Quote | Where | Verdict |
|---|---|---|
| "Checking whether you are signed in…" | every `teach/**/index.html` (loading section, ~line 81) | R: one shared loading skeleton or inline status, no sentence |
| "This page is for teachers, so it starts with signing in." | teach/index.html:84, new:84, cohort/edit:76, cohort:70, feedback:84, requests:84, signing:84 | R: empty state ("Sign in to teach" plus the GitHub button) |
| "Polls are made by teachers, so this starts with signing in." | times/index.html:77, times/new:78, times/poll:80 | R: the same empty state. The wording differs from the line above (inconsistent) |
| "This page is for teachers. Ask to teach a cohort, and once…" | the not-teacher section on the 7 pages above | R: empty state with one action, "Ask to teach" |
| "Polls are made by teachers. Ask to teach…you can make one here." | times ×3, lines 82–85 | R: the same as the line above |
| "There is no cohort of yours at this address…" | cohort:79, cohort/edit:85 | K (F), trimmed to "No cohort here" plus a "Your cohorts" button |
| "There is no poll of yours…It may have been deleted." | times/poll:89 | K (F), as an empty state |
| "Only the people who approve teachers read requests to teach." | requests:93 | K (R) |
| "Only the person who holds the signing key signs credentials." | signing:93 | K (R) |

## /teach/ (the desk; teach/index.html, assets/teach.js)
| Quote | Where | Verdict |
|---|---|---|
| H1 "Run a cohort." | :76 | R: the h1 should name the place ("Teaching"). The nav notes forbid slogans as h1s |
| "A cohort is something you make here rather than…" (55 words) | :77 | C |
| "Teaching here is by invitation while the first cohorts find their shape…" | :100 | K (F) for "by invitation" only; the guide link becomes a help link |
| "The people you would teach, where you would find them…" | :103 | R: field hint, one short line |
| "Only you and the people who approve teachers can read this…" | :104 | R: visibility marker ("Only you and approvers"). "Change it or take it back" is shown by the buttons, so C |
| "Say a little about why you would like to teach…" | teach.js:124 | K (validation), shown inline under the field |
| "Your request is waiting for an answer, which will appear here…" | teach.js:106 | R: status label "Waiting for an answer" |
| "…it was not a yes this time. Taking the request back clears it…" | teach.js:107 | R: status label "Declined", plus field hint under "Take it back": "You can ask again." (K F) |
| "Its words will be deleted. Click again to take it back." | teach.js:153 | R: confirm step |
| "One request for feedback or question is waiting for you." (and the plurals) | teach.js:52 | R: row "Feedback" with a count badge and an "Answer" action |
| "One person is asking to teach." / "…credentials are waiting to be signed." | teach.js:53–54 | R: a row with a count badge |
| "Some of what waits for you could not be counted just now." | teach.js:55 | K (W) as inline status. It always links to the feedback queue, which is wrong when another count failed |
| "Nothing is waiting for you right now." | :138 | R: empty state |
| "You do not teach a cohort yet. Planning one starts it as a draft…" | teach.js:68 | R: empty state "No cohorts yet" plus a "Plan a cohort" action |
| Cohort row "Draft, visible only to you, first day 2026-01-13." | teach.js:19, :74 | R: row with a status label, a formatted date and one action. "Only you" is wrong once there are co-teachers |
| Buttons "Your polls for finding a weekly time", "The teaching guide" | :142 | R: toolbar. The polls button repeats the "Polls" tab in the area nav, so C. The guide belongs in the area nav |

## /teach/new/ and /teach/cohort/edit/ (the cohort builder; HTML lines are for new/, edit/ is 4 lines earlier; assets/teach-cohort-form.js)
| Quote | Where | Verdict |
|---|---|---|
| "Its details: who it is for, when it meets…" (edit lead) | edit:69 | C |
| "Each answer shapes how the cohort runs…except its address." | new:99, edit:95 | C. On the edit page "change any of them later" makes no sense |
| "Its name on the cohorts page and at the top of its own page." | new:105 | C: the live preview shows this |
| "Lowercase letters, numbers, and hyphens. It stays the same once…" | new:108 | R: field hint "Can't be changed after saving" (K F), with the character rule as inline validation only |
| "A sentence or two in your own words…the kind of problem…" | new:113 | C: the placeholder already does this job |
| "Cohort Prep is the week before it, and the cohort runs…" | new:119 | R: a computed field hint ("Prep week from Jan 5 · last session Feb 10") instead of the rule |
| "One live session a week. The first is on the first of these days…" | new:126 | R: computed field hint "First session: Tue Jan 13, 5:00 PM (7:00 PM your time)" |
| Option "75 minutes, as the weekly guides are written" | new:137 | R: "75 minutes" with a "Recommended" tag |
| "Sessions of an hour or less leave out the break." | new:139 | K (F) as a field hint, shown only when 60 is chosen |
| "Everyone works in a group of three…a multiple of three…" | new:145 | R: field hint "Leave empty for no limit", plus an inline note only when the number is not a multiple of 3 |
| Status radios: "Only its teachers can see it. Start here." / "Listed on the cohorts page…" / "…it leaves the cohorts page." | new:152–154 | R: each option gets a status label plus a visibility marker (Only teachers, Anyone, Members). "Start here" is C. Better still, take status out of the form: a status label in the cohort header and a lifecycle action in the toolbar (Open for joining, Start, Finish) |
| "Finished…questions and answers are deleted, and you can issue credentials." | new:155 | K (W), moved into a confirm step when Finished is chosen |
| "The cohort talks in Discussions in its own private repository…" | new:161 | R: a visibility toggle "Conversation: Members / Anyone" |
| "Fill these in only if you made them yourself…" | new:165 | C: the disclosure's summary already says this. Keep the disclosure |
| "People see it here once it is Open." / "This is how it is listed…" / "It is not listed…while it is running." | new:183, form.js:48–49 | R: visibility marker on the preview ("Not listed: Draft") |
| Validation lines ("Give the cohort a name…", time zone, capacity, repository, team, slug) | form.js:98–109, teach-lib:244–246 | K, but all of them print in one line at the bottom (`data-form-message`). They should sit inline under the field that is wrong |
| "Another cohort already uses that short name. Try another." | form.js:156 | K (R), inline under the slug field |

## /teach/cohort/?c= (teach/cohort/index.html; teach-cohort.js "tc"; teach-lib "tl"; show-builder "sb"; question-bank "qb"; question-view "qv")

**Header and toolbar**
| Quote | Where | Verdict |
|---|---|---|
| Meta line "Draft, visible only to you. Tuesdays at 17:00 America/Denver, 75 minutes. 5 weeks from 2026-01-13." | :92, tc:46–49 | R: page header facts (Status, When, Length, Weeks, Places) plus a status label and a visibility marker. The raw ISO date and 24-hour time are inconsistent with the rest of the site |
| Buttons "Edit the details / Make the weekly sessions / Every rehearsal room now / Copy the setup for the Meet script / Delete this draft" | :94–98 | R: toolbar with a primary action that changes by phase, then Edit, then an overflow menu (Copy Meet setup, Delete draft). "Every rehearsal room now" is obscure; it opens the live page's rooms board |
| Catch-all `data-detail-message` line | :100 | R: toast or inline status beside the control that caused it. At least eight actions write their result here, far from the control |
| "In the call itself, the live page in a tab beside Meet…add-on…" (about 50 words, with a README link) | :102 | R: disclosure in the Live area or the guide. Keep the fact "Add-on: testing, meet@ only" as a status label (K F) |

**Before the first session (setup)**
| Quote | Where | Verdict |
|---|---|---|
| "What this cohort needs before people arrive. Each step checks itself off…" | :107 | R: checklist with a progress count ("4 of 9") and the guide as a help link. Cut the sentence |
| Step labels such as "Once people have joined, make the trios, then ask meet@ again…" and "Open the live page once…try a timer and a check, so nothing…is new" | tl:186–208 | R: checklist items with a short verb ("Make trios", "Rehearse on the live page") plus an action button. Put the why in a disclosure |
| " (if you would like)" | tc:102 | R: an "Optional" tag |
| "Asked. meet@ picks it up within the hour…" / "It did not work: …" / "Done…make the weekly sessions first and ask again." | tl:216–218 | R: a status label on the step (Asked, Failed, Done) with the detail in a disclosure. The failure reason is K (W) |
| "A group without a room still needs one." | tl:205 | R: a status label on the group ("Needs room") |
| "Asked. meet@humanshaped.org picks it up within the hour, invites everyone…" (40 words) | tc:122 | R: toast plus the step's status label |
| "You have asked already, and meet@ has not finished yet." | tc:120 | K (R) |
| "The repository X and its team are ready…Open the cohort's conversation…" | tc:143 | R: toast, with the checklist step marked done |
| "Set the first day, the session day, and the time first…" | tc:169 | K (R). Better: disable the button and give the reason as a field hint |
| "N weekly sessions are set. Changing the dates later and making them again keeps…" | tc:173 | R: toast "5 sessions made". When sessions already exist, the button becomes "Update sessions" with the keep-what-you-wrote fact as its hint (K F) |
| "Copied. Paste it into the Meet events script…add your own email under 'teachers'." | tc:204, 207 | R: a disclosure "Set up Meet by hand" in Settings. The steps are K (F) only for that rare path |
| "This cannot be undone. Click again to delete it." | tc:156 | R: confirm step (K W) |

**Since the last session (checks, not seen, follow-ups)**
| Quote | Where | Verdict |
|---|---|---|
| "Every answer from week N, by name, for you alone. Read them before…" | tc:555 | R: visibility marker "Only teachers". Cut the instruction |
| "No questions were asked in week N's session, so there is nothing…" | tc:556 | R: empty state |
| "Your own words to the whole cohort, which the session page shows…" | :120 | R: visibility marker "Your cohort" plus field hint "Shown as people arrive next session". The craft advice moves to the guide |
| "Saved. It shows on the session page while people arrive next time." | tc:238 | R: toast "Saved" |
| "No one listed here has shared…reach out…in the next two days…Only you see this…" (about 75 words) | tc:579 | R: a count badge on the heading, visibility marker "Only you", and a disclosure "How this is worked out" holding "not attendance" (K F) |
| "Everyone in the cohort has shared, queued, answered…" | tc:580 | R: empty state |
| "They have not chosen email, so a note to them…is how your words reach them." | tc:591 | R: a per-row reach marker ("Note only" or "Email OK") plus a "Write" action that jumps to their follow-up |
| "They said you may email them." | tc:590 | R: reach marker icon plus an action |
| "What each person did on purpose around week N's session…Every word is yours to write." (about 90 words) | tc:367 | R: sort label "Muddy first", a draft status label, a visibility marker on each send. C for the rest |
| "Once people join, each of them is listed here after every session…" | tc:368 | R: empty state |
| Summary gist "Still muddy: …" / "Brought something back, marked ready" / "Nothing from them…" | tc:433–435 | R: one status-label set with icons (Muddy, Ready, Not yet, Took part, Nothing) |
| "They marked it ready to move on." / "They marked it not yet, because…" | tc:463–464 | R: status label, with the reason kept as quoted text |
| "…which is worth a kind, private word with an easy way back in." | tc:490 | C: the advice goes to the guide. The status label carries "Nothing" |
| "It goes as your feedback on their bring-back, where they and the cohort…" | tc:500 | R: visibility marker "Your cohort" on the send field |
| "It goes as a note on their cohort page that only they and…teachers…" | tc:501 | R: visibility marker "Only them and teachers" |
| "It can go only as feedback…until the hub's database has notes…" | tc:502 | C: this leaks the development state |
| "Or, privately, since they said you may email them: …nothing is sent until you send it there." | tc:516–518 | R: a secondary action "Write from your email" with a mail icon. Cut the explanation |
| "Draft kept in this browser only." | tc:525 | K (F) as a status label "Draft · this browser" |
| "This browser will not keep drafts, so send it before you leave…" | tc:525 | K (W) |
| "Sent, as feedback on their bring-back." / "Sent, as a note…" | tc:542 | R: toast |
| "Saved. They will see it was edited." | tc:418 | R: toast "Saved". "They'll see it was edited" becomes a field hint on the edit form (K F) |

**Sessions and the run of show**
| Quote | Where | Verdict |
|---|---|---|
| "Each week's run of show is the plan you will run in Meet…" (about 45 words) | :138 | C. A Sessions tab with week rows replaces it |
| "No sessions yet. Set the day and time, then make the weekly sessions." | tc:600 | R: empty state with one action |
| Checkboxes "Open this session to guests…" / "Show its Meet link on the public page…" | tc:619, 623 | R: a visibility control per session (Members, or Anyone as a public showing) plus a "Share Meet link" toggle |
| "Guests read only when it is, the way in if you share it…appears on Events…" | tc:630–633 | R: a "Public page" row action. "Listed on Events once open or running" is K (F) as a field hint |
| "N minutes planned, 15 to spare…Students see the scenes' titles…your notes stay…" | sb:75, show-lib:66–71 | R: a minutes meter (planned against session length) plus visibility markers on the list ("Your cohort sees titles and minutes") and on the note field |
| "Week N has no run of show yet." | sb:76 | R: empty state with one primary action and secondary actions (the buttons already exist) |
| Scene-kind hint ("You explain. The main stage shows a title…") | sb:183, show-lib:13–19 | K (F) as a field hint. Better: a kind picker with an icon and one line per option |
| "A few lines. A blank line starts a new one." | sb:189 | K (F) field hint |
| "One per line, two to eight. Leave empty for…own words." | sb:193 | K (F) field hint |
| "One per line, a title and its minutes, such as 'Their question, 2'." | sb:215 | R: a repeatable row editor (title and minutes inputs, "Add room scene") so there is no format to explain |
| "Only the cohort's teachers see it." | sb:217 | R: visibility marker "Only teachers" |
| "Week N starts from the six parts. Change anything." / "…ready to change…Change anything." | sb:320, 332; curriculum-lib:216 | R: toast "Added 6 scenes". C for "Change anything" |
| "Remove X?" (armed button) | sb:124 | R: shared confirm step |

**Question bank**
| Quote | Where | Verdict |
|---|---|---|
| "The questions you prepare before class: choose one, choose any, a scale…" (about 60 words) | :144 | C. The section gets visibility marker "Only teachers"; "Asked questions are copies" goes in a disclosure (K F) |
| "For this cohort's teachers" / "Yours, in every cohort you teach" | qb:43 | R: visibility marker (icon plus "Only you" or "Your teachers") |
| "No questions in the bank yet." | qb:48 | R: empty state plus "Write a question" |
| "Delete it from the bank? Anything already asked from it stays." | qb:64 | K (F), inside the shared confirm step |
| Radios "Just you, in every cohort you teach" / "This cohort's teachers, for X" | qb:91 | R: visibility segmented control |
| "…only the teacher who wrote it can keep it just for themselves." | qb:116 | K (R) |
| Kind lines ("Everyone picks one of a few choices." …) | qv:80, live-lib:86–91 | K (F) field hint |
| "One on each line, two to eight." | qv:64 | K (F) |
| "From three to ten." | qv:69 | C: the min and max attributes plus inline validation do this |
| "Optional, such as 'Not at all'." / "…'Completely'." | qv:70–71 | R: a placeholder and an "Optional" tag |

**The lesson sent back**
| Quote | Where | Verdict |
|---|---|---|
| "In the last week, the cohort chooses together…Everything on GitHub is public…" (about 70 words) | :151 | R: visibility marker "Public on GitHub" on the button (K W), and a confirm step or checklist "Everyone credited said yes". The story moves to a disclosure or the guide |

**People and Teachers**
| Quote | Where | Verdict |
|---|---|---|
| "No one has joined yet. People can join once the cohort is open." | tc:757 | R: empty state plus an "Open for joining" action |
| "Make them a mentor" / "Make them a student again" inline on every row | tc:786 | R: a row overflow menu. The "Mentor" tag is already a good status label |
| "A cohort can have more than one teacher, and a new teacher leads best…" | :160 | C (the advice goes to the guide). "A co-teacher can do everything you can" is K (F) as the field hint on Add co-teacher |
| " made this cohort" | tc:707 | R: status label "Creator" |
| "Step away: you will no longer teach it" / "Take X off this cohort" | tc:714 | R: confirm step |
| "Added. They will find the cohort on their own teaching page." | tc:748 | R: toast "Added" |

**Apps**
| Quote | Where | Verdict |
|---|---|---|
| "An app goes up on humanshaped.org/apps/ when its builder says…for you alone…" (about 45 words, two variants) | tc:828–831 | R: segmented "Submitted / Not yet / Hidden" with count badges, visibility marker "Only teachers" on Not yet, and a status label "Not-submitted list opens Jan 30" |
| "Apps appear here once people join." / "No one has said their app is ready yet." | tc:832, 840 | R: empty state |
| "Still needs a repository and a live address." | tc:867 | R: missing-item chips in a checklist style |
| "Shown on humanshaped.org/apps/." | tc:868 | R: visibility marker "Anyone" |
| "Kept off humanshaped.org/apps/, with the reason they read: '…'" | tc:872 | R: status label "Hidden" with the quoted reason |
| "It goes back on…/apps/ and the feed. Click again to show it." | tc:888–890 | R: confirm step |
| Label "Why, in a sentence they will read (you may leave it empty)" | tc:907 | R: label "Reason", an "Optional" tag and visibility marker "They see this" |
| "It stays on the cohort's own pages for everyone in the cohort…" | tc:910 | K (F) as visibility marker "Still visible to your cohort" |

**Groups**
| Quote | Where | Verdict |
|---|---|---|
| "Trios, because a trio still has two people…Each group has its own Meet room…" (about 70 words) | :179 | C. Each group card carries a room status label and visibility marker "Group members" |
| "No groups yet." | tc:934 | R: empty state plus "Add a group" |
| "People will appear here as they join." | tc:952 | C |
| Group membership as one checkbox per person in every group | tc:940–951 | R: one group picker per person, or an assignment board. A grid of N×M checkboxes says nothing about the trios |
| Room input that takes the "link \| spaces/name" line the Meet script prints | tc:961–966 | R: a room status label filled by meet@, with a manual override in a disclosure. The pipe format is internal plumbing |
| "A Meet link starts with https://." | tc:978 | K (validation) |

**Credentials**
| Quote | Where | Verdict |
|---|---|---|
| "Credentials are issued here once the cohort is finished…" | :190 | R: the tab is disabled with status label "Opens when Finished" plus a link "What each level asks" |
| "Open each person's repository and every link before you record…key…off the web…" | :192 | R: a per-person checklist (Open repo, Open links, Record, With signer, Signed). The key reason goes in a disclosure |
| "No one stayed in this cohort to the end." | tc:1014 | K as an empty state |
| "Level. Signed on X, and public at its own page, which the holder can share." | tc:1067 | R: status label "Signed", visibility marker "Anyone with the link", and the date as a fact |
| "Why, for the record (only the cohort's teachers and the holder read it)" | tc:1074 | R: visibility marker |
| "Its page will say it was revoked…cannot be undone…Click again to revoke." | tc:1083 | K (W), inside the confirm step |
| "Recorded on X, and waiting to be signed." | tc:1098 | R: status label "With signer" |
| "Copied. On the signer's computer, run: pbpaste \| node tools/credential/sign.mjs --key…" | tc:1114 | R: remove it. Teachers should not see the signer's commands at all, and this one **contradicts** /teach/signing/ (which uses `sign-waiting.mjs`). The copy and attach flow repeats the signing queue |
| "For a record made by mistake. Click again to remove it." | tc:1141 | R: confirm step |
| "Waiting for their repository and the live address…they add on the cohort page." | tc:1157 | R: status label "Missing: repo, live address" |
| "Not issued yet." / "Their last credential was revoked on…" | tc:1160, 1155 | R: status label |
| "I opened the repository and every link, and they show…own work." | tc:1184 | K: an attestation, which is a legitimate confirm step |
| "This is level N: …" | tc:1199 | R: a level badge that updates as platforms are ticked |

## /teach/feedback/ (assets/teach-feedback.js)
| Quote | Where | Verdict |
|---|---|---|
| "When someone in one of your cohorts asks for feedback…oldest first." | :77 | C. "Oldest first" becomes a sort indicator |
| "Nothing yet, because you do not have a cohort yet." | js:21 | R: empty state plus "Plan a cohort" |
| "Nothing is waiting for you right now." | js:40 | R: empty state |
| Kicker "A question from X" / "Feedback requested by X" | js:45 | R: a row with a kind badge (Question or Feedback) and the person |
| Button flips to "Not sent, try again" | js:63 | R: inline error status (inconsistent with the rest of the site) |

## /teach/requests/ (assets/teach-requests.js)
| Quote | Where | Verdict |
|---|---|---|
| "People who would like to lead…Approving one makes them a teacher…" | :77 | C. The confirm step already carries "makes them a teacher", and the answer field's label already says they read it |
| "No one is waiting to hear about teaching right now." | js:21 | R: empty state |
| Label "Your answer, which they will read" | js:42 | R: label "Answer" plus visibility marker "They see this" |
| "They will be able to make and run cohorts…Click again to approve." | js:63 | R: confirm step (K F). Decline has no confirm at all, which is inconsistent |

## /teach/signing/ (assets/teach-signing.js)
| Quote | Where | Verdict |
|---|---|---|
| "Credentials…recorded, oldest first. Copy one, run node tools/…sign-waiting.mjs…" | :77 | K (F), but as a numbered checklist (Copy, Run, Paste) with the command in a code block that has its own copy button. It should not be a lead paragraph |
| "Nothing is waiting to be signed right now." | js:49 | R: empty state |
| "Copied. Now run … in the site folder, and paste…below." | js:70 | R: toast "Copied". The command lives in the checklist |
| "Copy the text above, then give it to the signing tool." | js:71 | K (fallback) |
| "Signed and saved. Its holder can find it on their account page now." | js:97 | R: status label "Signed" plus a toast |
| Signature-check errors | js:89–91, credential-lib:510–532 | K (R) |

## /teach/times/ (assets/teach-times.js)
| Quote | Where | Verdict |
|---|---|---|
| "Before a cohort forms…No one needs an account…never listed anywhere…" (about 60 words) | :70 | R: visibility marker "Anyone with the link · no account needed" (K F). C for the rest |
| "You have not made a poll yet." | js:20 | R: empty state plus "Make a poll". That button currently sits separately at :93 |
| Row "Taking answers, for X, 3 answers. Mon, Tue…" | js:27–29 | R: a row with status label (Taking answers or Closed), an answer count badge and the meta |

## /teach/times/new/ (assets/teach-times-new.js)
| Quote | Where | Verdict |
|---|---|---|
| Labels "Your name, as people will see it" / "What people will see at the top" / "A note to them, if you would like one" | :93–95 | R: short labels (Your name, Title, Note) with an "Optional" tag and one visibility marker for the form: "Shown to people answering" |
| "Who the cohort is for, or anything that would help someone decide." | :95 | C: use a placeholder |
| "Its other teachers will see the answers too." | :96 | R: visibility marker "Your teachers" |
| "Choose as many as you like…a session may run past the end." | :103 | K (F) for "a session may run past the end". C for the rest |
| "Optional. Times are converted for each person using this week's daylight saving." | :110 | R: an "Optional" tag. The daylight-saving detail goes in a disclosure |
| Errors "Choose at least one day." and similar | times-lib:154–157 | K, shown inline under the field |
| "The poll may not have been made…If it appears in your polls, it was saved." | js:47 | K (W) |

## /teach/times/poll/ (assets/teach-times-poll.js, times-calendar.js)
| Quote | Where | Verdict |
|---|---|---|
| Facts line "Taking answers. Mon, Tue…every 30 minutes…beginning the week of…" | :98, js:115 | R: page header facts plus a status label |
| "Mark the times you could make…people answering see a dot…" | :106 | R: field hint "People answering see your times as dots" (K F) |
| "Google tells this page only when you are busy…nothing…is saved." | :109 | K (F, privacy), as a short marker or a disclosure next to the button |
| "N free times are marked. A corner mark means busy…" | calendar:111–113 | R: a legend entry for the corner mark, plus a toast with the count |
| "Look them over, then save your times." | js:157 | R: an unsaved-changes state on Save. Cut the sentence |
| "Your times are saved." / "Saved." | js:186, 197 | R: toast |
| "Anyone with this link can answer, so share it with the people…" | :126 | R: visibility marker "Anyone with the link" (K W) |
| "N people have answered. Choose a time to see who can make it." | js:72 | R: a count badge. Make the grid cells look pressable instead of the instruction |
| "No one has answered yet." ×3, plus "Once people answer, their times are here…" | js:73, 65, 221; :160 | R: one empty state for the whole results area |
| "A draft, so no one can join yet." / "Open for joining." | js:228 | R: status label |
| "No email address from X." | js:232 | K (F) as a per-person "no email" marker |
| "Each person you invited sees the cohort…when they open the poll's link again." | :150 | K (F), short |
| Checkbox "Open for joining now, and listed on the cohorts page" | :168 | R: a status choice with a visibility marker |
| Toggle and Delete at the bottom of the page; host-name form at the top | :99–101, 179–181 | R: toolbar at the top (Copy link, See as they will, overflow with Stop taking answers, Rename, Delete) |
| `window.confirm` for remove and delete | js:90, 316 | R: the shared confirm step (inconsistent with the rest of the site) |
| "Set up the cohort" links to `/teach/?c=` | js:233 | R: link `/teach/cohort/?c=`. Today it relies on the legacy redirect |

## /teach/guide/ (interactive parts only)
| Quote | Where | Verdict |
|---|---|---|
| "Reading the current text from the template on GitHub." | render.js:145 | C: the skeleton lines already show loading |
| "…which usually means a network hiccup…always readable on GitHub itself." | render.js:155 | R: short error "Couldn't reach GitHub" plus the two actions that already exist |
| noscript notice | guide:203–205 | K (F) |
| "Ask to teach" primary button, shown to everyone including teachers | guide:218 | R: make it state-aware, or show a small link only |
| Crumb `<p>` "Teach › The teaching guide"; the week pages' crumb is labelled "Teaching" but goes to /teach/guide/ | guide:71, week-*:68 | R: the shared `<nav><ol>` crumb with correct labels. The guide also has no Teaching area nav, so add a "Guide" tab |

---

## How to organize /teach/cohort/
Today the page runs header, setup, since-last-session, sessions, question bank, lesson, people, teachers, apps, groups and credentials on one scroll. Every section opens with a paragraph that says why it exists.

Recommendation: keep the cohort bar (Cohort home · Live session · Teaching it) and give "Teaching it" its own second-level tabs. Make them real sub-pages so they can be linked, with count badges:

1. **Overview** (`/teach/cohort/?c=`): page header facts (status label, visibility marker, when on your clock, places "12 of 18", next session) and a toolbar whose primary action follows the phase (Draft: Open for joining; Open: Rehearse; Running: Open live session; Finished: Issue credentials). Below it, "What needs you" rows with count badges that link to each tab (Follow-ups for week 3: 5, Not seen: 2, Apps not submitted: 3, Credentials to record: 4), and the setup checklist until it is done.
2. **Sessions:** a row per week (date, status label Planned / Run of show ready / Ran, Meet-link marker, public-showing marker). Each opens a session page with its details, run-of-show builder, check answers and "What I heard". Question bank as a sub-tab.
3. **Follow-up:** the weekly job after each session. Person rows with gist status labels, draft labels and reach markers. The not-seen list becomes a filter here.
4. **People:** roster rows (role label, group, app, reach marker, overflow menu).
5. **Groups:** a trio board with room status labels.
6. **Apps:** segmented Submitted / Not yet / Hidden.
7. **Credentials:** disabled until Finished. Rows with status labels; no signing commands.
8. **Settings:** edit details, co-teachers, conversation repository, Meet setup by hand (disclosure), send the lesson back, and Delete draft as a danger zone.

## Summary
**Recurring patterns**
1. **Section intro paragraphs** (40–90 words) that say what the section is for and who can see it. Nearly every h3 on the cohort page has one, and the desk, feedback, requests, signing and polls pages open with one.
2. **Visibility told in prose**, about 25 times: "for you alone", "only they and the cohort's teachers", "Students see…", "Anyone with this link…". One visibility-marker component would replace all of them.
3. **State told as sentences** instead of status labels: cohort status, request status, credential state, poll state, submission state, meet@ request state, follow-up gist.
4. **Rules explained instead of computed:** session dates, the first session, the prep week, level, room format, the pipe-separated room line.
5. **Success messages that carry explanation** ("Saved. It shows…", "Added. They will find…"). These should be toasts.
6. **Empty states as sentences with no action.**
7. **Craft advice in the interface** (reach out within two days, co-lead first, say what you noticed). It belongs in the guide.

**The five worst surfaces**
1. The cohort page's since-last-session block: three generated paragraphs of 75–90 words, plus a per-person how-to.
2. The cohort page's credentials section: CLI instructions, a flow that repeats /teach/signing/, and a signing command that contradicts that page's.
3. The cohort page's top: a raw meta string, five unrelated buttons, the Meet add-on paragraph, one message line every action writes to, and a setup checklist whose items are long sentences.
4. The cohort builder (new and edit): a rule paragraph under every question, status radios that explain themselves, and an edit page that says "later".
5. The poll page: a facts sentence, three separate "No one has answered yet" lines, settings split between the top and bottom, and `window.confirm`.

Runners-up: the Apps and Groups intros, and the signing page's lead.

**Inconsistencies**
- **Status words:** "Draft, visible only to you" (desk and cohort page, and wrong once there are co-teachers), "Only its teachers can see it" (form), "A draft, so no one can join yet" (poll). Open appears as "Open for people to join", "Open" and "Open for joining".
- **Confirmations** come in four forms:
  - a two-click button plus a sentence (about 10 places);
  - `window.confirm` (the poll page);
  - an inline "Delete it? Keep it / Delete" (the question bank);
  - none at all (Decline request, unticking a group member, closing a poll).
- **Feedback on actions:** a shared message line far from the control, per-control status text, button labels that flip ("Copied", "Not sent, try again"), and form errors collected at the bottom instead of inline.
- **Saving:** group membership saves as soon as you tick, while weeks, rooms and host times each need their own Save button.
- **Navigation:**
  - The Teaching area nav is missing on the edit page and the guide.
  - Crumb markup differs between pages.
  - The week guides' crumb is mislabelled.
  - "Set up the cohort" goes to a legacy URL.
  - "Polls" is both a tab and a desk button.
- **Gate wording:** "This page is for teachers…" and "Polls are made by teachers…" say the same thing differently.
- **Date formats:** the cohort meta and the desk use raw ISO dates and 24-hour times; other pages format them.
- **Visibility inside labels:** some labels carry it in parentheses ("Your answer, which they will read", "Why, for the record (only…)"), while elsewhere it is a radio choice.
- **Development state shown to teachers:** "until the hub's database has notes" and "the database refused" appear in many error lines.
