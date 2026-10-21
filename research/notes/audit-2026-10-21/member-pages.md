# humanshaped.org: where the interface explains itself in text instead of using elements

I read everything and changed nothing. All paths below are relative to `/Users/bhwilkoff/Documents/GitHub/humanshaped-site`. Line numbers are from the `site` branch at `eaf844e`.

**The line you quoted is already gone from the code.** "You teach this cohort… Open it as its teacher" was removed in commit `cd15ddf`. Now the cohort header row shows "Teaching it" only to teachers (`assets/cohort-nav.js:33`), and `drawRole` hides the student-only forms (`assets/cohort.js:618`). But the research doc still tells agents to write it. `research/notes/navigation-and-wayfinding-notes.md:477-500` asks for a "role line, one plain sentence" and quotes your line word for word. It also asks for "a facts sentence… not an A · B · C string". `assets/exchange-lib.js:118` repeats that rule ("A sentence about an exchange, never an 'A · B · C' string"). That rule is the main reason so many row and header details became prose. The doc should be fixed first: details go in **page header facts** and **status labels**, not sentences and not dot-strings.

Verdicts: **K** = KEEP (R = refusal, W = warning, F = fact you can't see by looking), **R→** = REPLACE with the named element, **C** = CUT.

---

## 1. Signed-in home (`index.html`, `assets/home.js`, `home-lib.js`, `exchange-list.js`)

| Quote | Where | Verdict |
|---|---|---|
| "Your Human Shaped." (h1) | index.html:85 | R→ h1 that names the page ("Home"). It is a slogan, not a name |
| "Signed in as @login." | index.html:86, home.js:178-182 | C. The avatar and the header account menu already show this |
| "Gathering your cohorts, exchanges, and times…" | index.html:89, home.js:346 | K (inline status). Better as skeleton rows |
| "Your home could not be gathered… Reload the page to try again." | home.js:348 | K (W), but R→ a Try again button instead of the instruction |
| "A teacher wrote you a note." / "N notes from your teachers are new." | home-lib.js:84 | R→ row "Notes from teachers" + count badge + Read |
| "Someone answered what you shared." / "N answers… are new." | home-lib.js:85 | R→ row + count badge |
| "A new video came in on your exchanges." | home-lib.js:86 | R→ row + count badge |
| "A request to teach is waiting for your answer." | home-lib.js:82 | R→ row + count badge |
| "Someone is waiting for your feedback." | home-lib.js:83 | R→ row + count badge |
| "You teach it." / "You are a mentor in it." | home-lib.js:57 | R→ role tag (Teacher / Mentor), the same tag the cohort page uses |
| "Week 2 is on right now." | home-lib.js:58 | R→ status label "Live" |
| "A draft, not yet open for people to join." | home-lib.js:64 | R→ status label "Draft" |
| "Every session has happened." | home-lib.js:66 | R→ status label "Ended" |
| "Its sessions are still to be set." / "Its dates are still to come." | home-lib.js:62,67 | R→ status label "Unscheduled" |
| "One cohort is open for people to join." | home.js:251 | R→ subheading "Open to join" + count badge |
| "You do not teach a cohort yet. A cohort you plan is listed here…" | home.js:263 | R→ empty state "No cohorts yet" + Plan a cohort |
| "You are not in a cohort yet, and none is open…" | home.js:264 | R→ empty state "No cohorts yet" + See the cohorts |
| "Taking answers, with 3 answers." | home.js:276 | R→ status label "Taking answers" / "Closed" + count badge |
| "You answered it, and it is closed now." | home.js:280 | R→ status labels "Answered" and "Closed" |
| "A poll of weekly times lets the people you hope will join…" | home.js:285 | R→ empty state "No polls yet" + Make a poll |
| "Built in X. Shown on the apps page." / "Seen only by your cohort." | home.js:300 | R→ row meta "Cohort: X" + visibility marker (Anyone / Your cohort) |
| "Yours alone until you choose to show it." | home.js:307 | R→ visibility marker "Only you" |
| "Building an app on your own, from the template? Add it here…" | home.js:310 | R→ empty state "No app yet" + Add your app |
| "The stage you marked most recently." | home.js:324 | R→ row meta with a date ("Marked 2 days ago") |
| "Let your own Claude or Gemini read your cohorts…" (and the three other link blurbs) | home.js:333-336 | C. The link names are enough |
| "You started it in X, and it has 3 videos. Last active…" | exchange-list.js:44-45 | R→ row: title, visibility marker, video count badge, relative time |
| "Exchanges you start or add a video to will be here." | exchange-list.js:47 | R→ empty state "No exchanges yet" + the existing Start button |
| "Your exchanges could not be loaded: …" | exchange-list.js:51 | K (W) + a Try again button |

## 2. /account/ (`account/index.html`, `assets/hub.js`, `google-signin.js`, `reach-lib.js`)

| Quote | Where | Verdict |
|---|---|---|
| "Your GitHub account is where your app lives…" (signed-out lead) | account:70 | R→ a "Why GitHub?" disclosure + a Privacy link |
| "How you sign in, how your teachers can reach you…" (signed-in lead) | hub.js:388 | C. It just lists the headings below it |
| "Checking whether you are signed in…" | account:75 | K (inline status) |
| "GitHub will ask whether to share your public profile…" | account:82 | R→ field hint "Shares your public profile only"; how to revoke goes in a disclosure |
| "You can also sign in with Google. Cohorts work through GitHub…" | account:85 | R→ field hint under the Google button: "You'll link GitHub once to join a cohort" (W) |
| "Once you are signed in, this window hands your sign-in back…" | account:87 | K (W, the window will close) |
| "That GitHub account already has a Human Shaped account…" | account:95 | K (R) |
| "Sign in with your GitHub account instead, then link Google…" | hub.js:130 | R→ checklist (1. Sign in with GitHub, 2. Link Google) |
| "The Google sign-in made a new, empty account a moment ago…" (four sentences) | hub.js:136 | R→ confirm step: one consequence line + button |
| "This window lost track of Meet. Close it, and choose…" | hub.js:107,355 | K (W) |
| "You are signed in inside Meet, and this window can close…" | hub.js:337,357 | K (inline status), shorter |
| "Something went wrong while signing in." | account:109 | K (W) |
| "Signed in as @x." | account:118 | R→ page header facts (Signed in as, Linked accounts) |
| "Link your GitHub account to join a cohort. Your app lives…" | account:124 | R→ checklist item / notice: one line + button. Cut the reason |
| "Cohorts you can join": "No cohort is open for sign-up right now…" | hub.js:413 | R→ empty state "No open cohorts" + See cohorts |
| "You are already in this cohort." | hub.js:418 | K (R). Could be a status label "Joined" on the card |
| "The cohort you chose is not open for sign-up any more." | hub.js:420 | K (R) |
| "You are a mentor in this cohort." | hub.js:283 | R→ role tag "Mentor" |
| Card dates: "Begins X, 5 weeks." + schedule sentence | hub.js:281-282 | R→ page header facts (Starts, Length, Session) |
| "Leaving a cohort" (h2 over your cohorts, each with Open and Leave) | account:163 | R→ heading "Your cohorts". The section is named after a single action |
| "You are not in a cohort yet." | hub.js:407 | R→ empty state + See cohorts |
| "The ways you can sign in to this one account…" | account:137 | C for the first sentence. "Never the last" R→ a disabled Unlink with a tooltip |
| ", linked as @x" / ", not linked" | hub.js:168-170 | R→ status label (Linked / Not linked) |
| "Without GitHub, your cohorts cannot reach you. Press again…" | hub.js:178 | K (W). A real confirm step, but the button text grows into a sentence. Use "Unlink?" plus a warning line |
| "Google is linked. Signing in with Google now reaches…" | hub.js:210 | R→ toast "Google linked" |
| "That Google account already signs in to a different account…" | hub.js:213 | K (R). The how-to steps go in a disclosure |
| "A teacher who has not seen you in a while may want…" | account:145 | R→ unchecked boxes already show "off". Cut, or keep one field hint |
| "It can be different from the one on your calendar invites…" | account:148 | R→ visibility marker "Your teachers" on the field. Cut the first sentence |
| "Email me, at most once a day, when a teacher writes…" (checkbox label) | account:152 | R→ short label "Daily email when something waits"; the list of triggers goes in a disclosure |
| "That second email comes from meet@humanshaped.org and says only…" | account:153 | K (F: sender and content), as a short field hint |
| "Saved. Both are off, so your teachers' words wait for you here." | hub.js:481 | R→ toast "Saved" |
| "Forgotten. The hub no longer has this address." | hub.js:491 | R→ toast "Address removed" |
| "That does not look like an email address." / "Add the address…first." | reach-lib.js:17-18 | K (inline validation) |
| "These are yours to keep after a cohort ends… Only you and…" | account:168 | R→ visibility marker "Only you and your teachers"; the Remove button already shows they can be removed |
| "What you marked on the stages. Only you can see it…" | account:175 | R→ visibility marker "Only you" |
| "You marked these stages ready to move on: A, B and C." | hub.js:590 | R→ checklist of stages with done marks |
| "What your teachers recorded when your cohort finished. Once it is signed…" | account:182 | R→ row: status label + date + one action "Open". Cut the Open Badges explanation |
| "Signed on X." + button "Open it, to share, download, or check it" | hub.js:519-520 | R→ status label "Signed" + button "Open credential" |
| "Recorded on X, and waiting to be signed. It will be here…" | hub.js:524 | R→ status label "Waiting for signature" + date |
| "Revoked on X: reason" | hub.js:526 | K (F), shown with status label "Revoked" |
| "This site keeps your GitHub name and picture, which cohorts…" (about 80 words) | account:187 | R→ a "What we keep" definition list, one row per item, each with its visibility marker, + Privacy link |
| Delete dialog: "This removes your profile, your place in every cohort…" | account:199 | K (W, confirm step) |
| Leave dialog: "What you shared with this cohort will be removed…" | account:210 | K (W, confirm step) |
| "Your account and everything you shared here have been deleted." | hub.js:257 | K (status). Side effect: it overwrites the first `.small` in the signed-out section, which is the GitHub permission note |
| "GitHub sign-in did not finish: … Nothing was saved." | hub.js:42 | K (W) |

## 3. /apps/mine/ (`apps/mine/index.html`, `assets/apps-mine.js`, `builder-lib.js`)

| Quote | Where | Verdict |
|---|---|---|
| "Your app is kept with your account, so this starts with signing in." | apps/mine:77 | R→ empty state "Sign in to add your app" + button |
| "For an app you are building on your own… never anything about you." | apps/mine:87 | R→ one-line page lead + visibility marker on the Show checkbox; "nothing about you" becomes a field hint |
| "As owner/name, or paste its address." | apps/mine:90 | K (field hint, format) |
| "Where it runs, if it runs somewhere" (label) | apps/mine:96 | R→ label "Address (optional)" |
| "Only you can see it. Nobody else knows it is here until…" | builder-lib.js:36 | R→ visibility marker "Only you" / "Anyone" |
| "It is on the apps page, with a page of its own." | builder-lib.js:36 | R→ visibility marker "Anyone" + the existing "See its page" link |
| "It is kept off the apps page for now, because: … Your switch is still yours…" | builder-lib.js:35 | K (F: a hide and its reason) as status label "Hidden by the hub" + reason. Cut the last sentence |
| Repo, name, and URL validation | builder-lib.js:24-28 | K (inline validation) |
| "Taken off. The hub no longer has it." | apps-mine.js:65 | R→ toast "Removed". Also: "Take it off the hub" deletes with **no confirm step** (apps-mine.js:58) |

## 4. /cohorts/ (`cohorts/index.html`, `assets/cohorts.js`, `path-marks.js`)

The topic prose on this page (lines 89-130, 145) is the public pitch, not instructions for using the interface. I left it out, except where it repeats privacy rules (see Inconsistencies).

| Quote | Where | Verdict |
|---|---|---|
| "What each week asks is below… open cohorts are listed at the bottom" | cohorts:76 | R→ in-page anchor nav (Weeks · Join), or C |
| "The session shows stages 00 and 01, and starts these." (×4) | cohorts:168,175,182,189 | R→ labels on each stage ("Shown" / "Started") |
| "Marked ready" | path-marks.js:318 | K. Already a status label, the model to copy |
| "The stages you marked ready say so. Only you can see your marks…" | path-marks.js:324 + 113 | R→ visibility marker "Only you". Cut the first sentence |
| "Every stage is a set of conversations with your agent. Connect it…" | cohorts:204 | R→ a "Connect your agent" row with one action |
| "No cohort is open to join right now, and when one opens…" | cohorts:212 | R→ empty state "No open cohorts" |
| "Joining uses your GitHub account… sign in with GitHub, and you will be asked…" | cohorts:213 | C when signed in (they need no sign-in). Signed out: R→ a three-step checklist |
| "Begins X, for 5 weeks, with room for 12 people." + schedule sentence | cohorts.js:28-29 (teach-lib.js:147,253) | R→ page header facts (Starts, Length, Seats, Session) |
| "You hold the credential, so you can join… as a mentor…" | cohorts:218 | R→ rows with "Mentor this cohort"; the role description goes in a disclosure; "everyone can see you are a mentor" becomes a visibility marker |
| "Running now." / "Open for sign-up." | cohorts.js:63 | R→ status label (Running / Open) |
| "If you do not have a GitHub account yet, it is free…" + "Create a GitHub account" button | cohorts:221-223 | C when signed in |

## 5. /cohort/?c= (`cohort/index.html`, `assets/cohort.js`, `cohort-lib.js`, `discussions.js`, `background.js`, `cohort-nav.js`, plus `submit-lib.js`, which this page loads)

| Quote | Where | Verdict |
|---|---|---|
| "Your cohort lives here." + "Sign in with the GitHub account you joined with…" | cohort:70-71 | R→ empty state "Sign in to see this cohort" + button. The h1 is a slogan |
| "This cohort is for the people in it." + "You are signed in, but not as a member…" | cohort:76-77 | K (R), shortened, + "See open cohorts" |
| "This page needs to know which cohort to show. Open it from your home page." | cohort.js:272 | K (R) + a Home button |
| "A few things to do before week 1… Each one checks itself off…" | cohort:95 | R→ checklist with visible done marks + a "2 of 4" count badge. Done is now only visually hidden text (cohort.js:520) |
| "Add your app's repository under Your app, so your classmates can follow it" (and the other steps) | cohort-lib.js:173-180 | R→ short checklist verbs: "Copy the template", "Add your repository", "Add your live address", "Open the conversation", "Connect your agent" with status label "Optional" |
| "Your teacher will put this week's challenge here." | cohort.js:633 | R→ empty state "Not posted yet" |
| "This week leads with write: <question>" | cohort.js:601 | R→ a tag for the move (Write / Play / Publish) + the question as content |
| "Stuck? Ask yourself one question first, then try what X suggests…" | cohort.js:604-610 | R→ one link "Stuck?" |
| "Happening now: Tuesday…, for 60 minutes." | cohort.js:638 | R→ page header facts (When, Length) + status label "Live" |
| "The last session has happened." / "The sessions have not been scheduled yet." | cohort.js:645 | R→ status label "Ended" / empty state "Not scheduled" |
| "A background for Meet with your cohort's name on it, kept out of the middle…" | cohort:119 | R→ the two backgrounds as thumbnail buttons. Cut the sentence |
| "Saved. In Meet, choose Backgrounds and effects, then…" | cohort.js:558 | K (F: where to use it in Meet) |
| "Your teacher has opened the showing to guests… Send them its public page…" | cohort:133 | R→ status label "Open to guests" + "Copy guest link" + visibility marker "Anyone with the link" |
| "Together, the cohort chooses one thing it learned… because GitHub is public." | cohort:136 | K (W: "Public on GitHub" as a visibility marker); the rest goes in a disclosure beside the existing button |
| "Written to you alone, so only you and the cohort's teachers can read these…" | cohort:144 | R→ visibility marker "Only you and your teachers" |
| "Remove it from my page" (note button) | cohort.js:431 | R→ "Remove", worded the same as /account/ |
| "Skills your teacher saw you show… named in the evidence of your credential, which is public…" | cohort:151 | K (W: these become public) as a visibility marker "You and teachers → Public once signed". Cut the rest |
| "It shows principle 5." | cohort.js:460 | R→ a "Principle 5" tag (link) |
| "The cohort talks in its own private space on GitHub, and your teacher is still setting it up." | cohort.js:483 | R→ empty state / status label "Not set up yet" |
| "The conversation is open to you. It happens in GitHub Discussions…" | cohort.js:489 | R→ visibility marker "Your cohort" + GitHub icon on the button. C |
| "GitHub has emailed you an invitation… Accept it, and the conversation opens." | cohort.js:497 | R→ checklist (1. Accept invitation, 2. I accepted it) with status label "Invitation sent" |
| "The cohort talks in GitHub Discussions… Opening it adds you to the cohort's team…" | cohort.js:502 | R→ visibility marker + button; the invitation consequence (F) becomes a field hint |
| "No one has started a conversation yet, so the first one could be yours." | discussions.js:131 | R→ empty state + Start a conversation |
| "It goes to GitHub as yours, marked as sent from Human Shaped…" (reply) | discussions.js:200 | R→ field hint "Posts to GitHub as you" |
| "Only the people in this cohort can see it… stays there under your name even if you leave…" | discussions.js:239 | K (W: it stays after you leave) as visibility marker "Your cohort" + a short hint |
| GitHub invitation pending / rate limit / forbidden / offline | discussions.js:60-69 | K (W), each cut to one line + an action |
| Three different wordings of "the read permission expired" | discussions.js:85-88 | K (W), but one wording + "Sign in again" |
| "This comment is hidden on GitHub." / "This conversation is locked…" | discussions.js:78,191 | R→ status labels "Hidden" / "Locked" |
| "This repository has no category a new conversation can go in yet…" | discussions.js:230 | K (R) |
| "Short videos back and forth between sessions, seen only by this cohort…" | cohort:162 | R→ visibility marker "Your cohort". Cut the definition |
| "Started by X, with 3 videos, closed to new videos. Last active…" | exchange-list.js:69 | R→ row: author, count badge, status label "Closed", time |
| "No exchanges yet in this cohort." | exchange-list.js:71 | K (empty state; the Start button is already there) |
| "Your teacher will add the others soon." | cohort.js:656 | R→ empty state |
| "Your group meets in its own room for the group part… when it is time: <link>" | cohort.js:661 | R→ page header fact "Group room" + button |
| "Your app goes up on humanshaped.org/apps/ when you say it is ready… Yours still needs…" | submit-lib.js:80-88 | R→ submission checklist (Repository / Address / Ready) with done marks |
| "Your credential from this cohort is signed. Open it to share, download, or check it." | cohort.js:354-356 | R→ status label "Signed" + "Open credential" |
| "Your teacher has recorded your credential… waiting to be signed…" | cohort.js:359 | R→ status label "Waiting for signature" |
| "Your teacher has kept your app off humanshaped.org/apps/ for now…" | cohort:179 | K (F: the hide and its reason) as status label "Hidden by teacher" + reason. Cut the reassurance |
| "Your classmates see your repository and its latest commits…" | cohort:184 | R→ visibility marker "Your cohort" |
| "My app is ready, so show it on humanshaped.org/apps/ for anyone to see" | cohort:187 | R→ label "Show on the apps page" + visibility marker "Anyone" |
| "Every app in the cohort goes up by the time the cohort ends…" (about 60 words) | cohort:188 | K the one warning (its repository names your GitHub account) as a field hint; C the rest |
| "An email for calendar invitations, if you want them" | cohort:190 | R→ label "Calendar email (optional)" |
| "Only you and your teacher can see it, and it is removed when you leave." | cohort:190 | R→ visibility marker "Only you and your teachers" |
| "Give the repository as owner/name, for example bea/garden-swap…" | cohort.js:719 | K (inline validation) |
| "Here as a mentor, to help." | cohort.js:84 | C. The "Mentor" role tag is right beside it |
| "This repository is private or has moved…" / "Nothing has been committed yet." / "GitHub could not be reached…" | cohort.js:101-103 | K (W / empty state) |
| "No one has joined yet." / "Nothing has been shared yet this cohort." | cohort.js:677,119 | K (empty state) |
| "Share this week's work with your cohort and your teacher… If your own AI agent…" | cohort:202 | R→ visibility marker "Your cohort and teachers"; the "What it is" select already covers the kinds |
| "Bring-back from X, 2 days ago" (kicker) | cohort.js:122-125 | R→ status label for the kind (Bring-back / Feedback wanted / AI review / Question) |
| "One line, which opens your turn in your group at the next session." | cohort:215 | K (F, field hint) |
| "Each stage ends with a paragraph that begins 'When you are ready…'" | cohort.js:251,257 | R→ a disclosure per stage holding the bar text. C the meta-explanation |
| "Judge it yourself first, and a partner can confirm it… costs nothing." | cohort:222 | R→ field hint "Partners confirm after seeing it on a device" |
| "Say what is still missing, so it reads as your next step." | cohort.js:225,751 | K (inline validation) |
| "You marked it ready to move on." / "Ready to move on, by their own reading." | cohort-lib.js:137-138 | R→ status label "Ready" / "Not yet" (marked as self-assessed) |
| "Seen working on a device by A and B." | cohort-lib.js:145 | R→ status label "Confirmed" + names or avatars |
| "Shared with your cohort." / "Saved." | cohort.js:757,732 | K (toast) |

## 6. /exchange/ (`exchange/index.html`, `assets/exchange.js`, `exchange-recorder.js`, `exchange-drive.js`, `exchange-lib.js`)

| Quote | Where | Verdict |
|---|---|---|
| "There is no exchange at this link." + "The link may have been cut short…" | exchange:71-72 | K (R). The second sentence can be shorter |
| "This exchange is for a cohort / for Human Shaped members." + "Only the people in…" | exchange:76-77, exchange.js:661-664 | K (R), as a visibility marker |
| "Started by X in Y, with 3 videos so far." | exchange-lib.js:123 | R→ page header facts (Started by, Cohort, Videos) |
| "Only the people in <cohort> can see this exchange." | exchange.js:74-78 | R→ visibility marker "Your cohort" |
| "Only Human Shaped members can see this exchange: people in a cohort…" | exchange.js:80 | R→ visibility marker "Members" + a popover defining members |
| "Anyone with this page's link can watch, and anyone signed in can add…" | exchange.js:82 | R→ visibility marker "Anyone with the link" |
| "Close replies" / "Open replies again" | exchange.js:85 | R→ status label (Open / Closed to new videos) + toggle |
| "Its maker has closed this exchange to new videos." | exchange:113 | R→ status label "Closed" (R) |
| "Sign in to react, or to add a video of your own. Your video is saved…" | exchange:115 | R→ "Sign in to add a video" + buttons; the Drive fact belongs at compose |
| "No videos yet. Record the first one to open the exchange." | exchange.js:228 | R→ empty state "No videos yet" + the existing button |
| "Your opening video will play here." | exchange.js:244 | C |
| "No longer shared" | exchange.js:170 | K (status label) |
| "Drive can take a few minutes to prepare a new video…" | exchange.js:436 | K (F) as inline status "Processing in Drive…" + "Open in Drive" |
| "This video is no longer shared in your Google Drive…" | exchange.js:515-516 | K (W) + the existing "Share it again" |
| "Shown beside your video, and read aloud to people who use a screen reader." | exchange:127 | C |
| "Your video is saved in your own Google Drive… anyone with its link can watch it…" | exchange:128 | K (W/F) as a visibility marker on the video file + field hint "Saved to your Google Drive" |
| "Your video will answer X's…" / "joins the end…" / "opens the exchange, under its prompt." | exchange.js:550-556 | R→ a "Replying to X ×" chip in the compose header. C the rest |
| "Record a new video, or upload one… nothing is recorded until you press Record." | exchange-recorder.js:52,131 | C. The buttons already say this |
| "This browser cannot record in the page. Upload a video…" | exchange-recorder.js:52 | K (R) |
| "Choose a window, a tab, or your whole screen… Your microphone records…" | exchange-recorder.js:132 | K the microphone fact as a field hint; C the first sentence (the browser's picker shows it) |
| Phone screen-recording steps (iOS / Android) | exchange-lib.js:190-199 | K (F, outside the site's control) inside a closed disclosure "How to record your screen" |
| "Or record with your phone's camera app and come back here…" | exchange-recorder.js:85-88 | R→ a "Use camera app" button |
| "Your camera is on. Press Record…" / "Recording. Press Stop…" / "Here is your video…" | exchange-recorder.js:160,213,230 | R→ recorder status label (Camera on / ● Recording 0:42 / Review). The buttons show the next step |
| "The browser was not allowed to use the camera…" | exchange-recorder.js:166 | K (W) |
| "That file is not a video." / "larger than 1 GB" / "up to 30 minutes" | exchange-recorder.js:244-262 | K (R) |
| "Connecting your Google Drive…" / "Saving… 40%" / "Adding it…" | exchange.js:578-591 | K (inline status). The percentage repeats the progress bar |
| "Not posted: … Your recording is still here…" | exchange.js:607 | K (W) |
| `window.confirm`: "Take this video out of the exchange? It stays in…Drive" | exchange.js:612 | K (W), but R→ the site's own confirm step instead of the browser dialog |
| `window.confirm`: "Delete … for everyone? … This cannot be undone." | exchange.js:690 | K (W), same: R→ the site's confirm step |

## 7. /exchange/new/ (`exchange/new/index.html`, `assets/exchange-new.js`)

| Quote | Where | Verdict |
|---|---|---|
| "A thread of short videos back and forth, which begins with yours." | exchange/new:70 | C |
| "Starting an exchange needs an account, so that people know whose question it is." | exchange/new:77 | R→ empty state "Sign in to start an exchange" + button |
| "Anyone with its link (people sign in to add a video)" | exchange/new:88 | R→ segmented control or radio options with visibility marker icons |
| "Human Shaped members (people in a cohort, now or before, and teachers)" | exchange-new.js:92 | R→ "Members" option + definition popover |
| "Only the people in X" / "(you are in none yet)" | exchange-new.js:103,109 | R→ "Your cohort: X" option; the disabled one becomes an empty state |
| "It is the exchange's prompt, so ask your question…" | exchange/new:91 | R→ field hint "Ask your question" |
| "Shown beside your video, and read aloud…" | exchange/new:94 | C (repeated from /exchange/) |
| "Your video is saved in your own Google Drive… anyone with its link can watch it." | exchange/new:95 | K (W). **It contradicts a cohort-only choice in the select above** (see Inconsistencies) |
| Validation: "Give the exchange a name people will recognize." etc. | exchange-lib.js:112-114 | K |
| Progress and failure statuses | exchange-new.js:51-76 | K |

## 8. /times/ (`times/index.html`, `assets/times.js`, `times-calendar.js`, `times-grid.js`)

| Quote | Where | Verdict |
|---|---|---|
| No poll at this link / could not be loaded | times:66-72 | K (R/W) |
| "From X, who would like to find the weekly time that works…" | times.js:104 | R→ page header facts "From: X" |
| "Each time is when a weekly session of 60 minutes would start…" | times.js:108-111 | R→ page header facts (Session length, First week) |
| "Tap a time to mark it, and tap it again to clear it." | times.js:113 | C. The toggle cells and the mode control already show this |
| "This poll has closed… The teacher is choosing a time…" | times:89 | R→ status label "Closed" (R) |
| "Your email, if you would like to hear when the cohort forms" | times:96 | R→ label "Email (optional)" |
| "Only the teacher sees your name and email." | times:97 | R→ visibility marker "Only the teacher" |
| "The teacher set these times in X." | times.js:82 | K (F), as a field hint beside the zone picker |
| "Google tells this page only when you are busy… Nothing… is saved or sent…" | times:109 | K (F, privacy) as visibility marker "Not saved" + short hint |
| "3 free times are marked. A corner mark means busy…" | times-calendar.js:111-113 | R→ toast "3 marked" + a corner-mark entry in the legend |
| "No calendar is ticked, so nothing is marked busy." | times-calendar.js:66 | C |
| "Marking free times between [08:00] and [20:00], your time." | times:111 | K (it is the form control) |
| Works for me / If need be (with color swatches) | times:114-115 | K. Already a segmented control, the model to copy |
| Host key: "X can make it" / "X could if need be" | times.js:90-95 | K (legend) |
| "The number in each time is how many people can make it…" | times:119 | R→ a legend entry beside the host key |
| "For example, a week you know you will miss." | times:122 | K (field hint) |
| "Thank you, X. Your answer is saved, and the numbers now show…" | times.js:227 | R→ toast "Saved" |
| "Your answer has been taken back, and the teacher no longer sees it." | times.js:248 | R→ toast "Answer withdrawn". "Take back my answer" has **no confirm step** |
| "This browser remembers your answer. To change it from another… keep this link" | times:133 | K (F: a secret link) as a field hint under the copy field |
| "You are invited to X." + schedule + "It is not open for joining yet…" | times.js:151-153 | R→ page header facts + status label (Draft / Open / Full) + Join |
| "Add your name, so the teacher knows…" / "Mark at least one time…" | times.js:204,207 | K (inline validation) |
| "Look them over before you send." | times.js:261 | C |

## 9. /apps/ and /apps/app/ (`apps/index.html`, `apps/app/index.html`, `assets/apps.js`, `apps-lib.js`)

| Quote | Where | Verdict |
|---|---|---|
| "…The first four are the apps the method came from." | apps:71 | C. The card's "Founding" status already says it |
| "The newest commits to every app here." | apps:88 | C |
| "Some apps are missing from this list for now." | apps.js:139 | K (W) |
| "Your app belongs here too." prose (3 paragraphs) | apps:100-102 | R→ for members, a row "Your app: [visibility marker] [Add / Change]". **Line 101 links to `/account/#own-app`, which no longer exists**; your app moved to /apps/mine/ |
| "One of the four apps the method came from" / "Shown here by the person building it" / "Being built in a cohort" | apps-lib.js:245-248 | R→ one-word status labels (Founding / Independent / Cohort / Endorsed / Aligned) |
| "Reading this app from the directory and from GitHub…" (and the section loaders) | apps/app:68,107-118 | K (inline status) |
| "This app is not in the directory yet." + long lead | apps/app:74-76 | K (R). Cut the explanation of how pages work |
| "This page reads the open directory on GitHub each time… trying again in a minute…" | apps/app:85 | K (W) + a Try again button |
| "Built by X, on iOS and web." | apps.js:276-277 | R→ page header facts (Built by, Platforms) |
| "This app has not answered the principles yet. Its builder can do that in a file…" | apps.js:306 | R→ empty state "Not declared yet" + "How to declare" link |
| "Of the 15 principles (version 1.2), 10 yes, 2 not yet…" | apps.js:315 | R→ count badges per answer, or a segmented bar |
| "Conversation about this app happens in its repository's Discussions on GitHub…" | apps.js:352-353 | R→ button "Join the conversation" + GitHub icon + visibility marker "Public" |
| "This repository has its conversations switched off on GitHub…" | apps.js:348 | K (R) |
| "GitHub could not tell this page just now where…" | apps.js:341 | K (W) |
| "Sign in with GitHub on this site and its newest discussions will show here." | apps.js:388 | R→ empty state + Sign in button |
| "Its builder chose to show it here on their own… tell us in the open directory" | apps/app:122 | R→ a "Report" link. The first sentence repeats the status kicker |
| "GitHub lets one visitor read only so much each hour…" | apps-lib.js:135 | K (W) |

## 10. /credential/ (`credential/index.html`, `assets/credential.js`)

| Quote | Where | Verdict |
|---|---|---|
| "Reading this credential from humanshaped.org…" | credential:69 | K (inline status) |
| "Each credential has its own address." + lead | credential:75-76 | K (R), shorter |
| "There is no credential at this address." + "…copied in part, or its holder…" | credential:84-85 | K (R), shorter |
| "This credential is waiting for its signature." + "A teacher has recorded it…" | credential:95-96 | R→ status label "Waiting for signature". C the lead |
| "humanshaped.org withdrew it…, so it no longer stands for anything here…" | credential:106 | K (W) with status label "Revoked" |
| "Issued by humanshaped.org on X." + "… earned it for …" | credential.js:66-67 | R→ page header facts (Holder, Level, Issued, Issuer) |
| "Checking the signature…" / "It checks out. humanshaped.org issued this…" | credential:131-132 | R→ status label "Verified" (icon + word) + a disclosure with the detail |
| "It does not check out. … Treat what this page says with care…" | credential:133 | K (W) with status label "Not verified" |
| "The evidence is the work itself… every link here opens what they made." | credential:139 | C |
| "Skills a teacher saw the holder show during the cohort's live sessions…" | credential:145 | C |
| "The file below is the credential itself, an Open Badges 3.0 credential…" | credential:158 | R→ buttons "Download (Open Badges 3.0)" + "Check on VerifierPlus"; wallet details go in a disclosure |
| "Copied." | credential.js:105 | K (toast) |

## 11. /connect/ (`connect/index.html`, no page script beyond site.js)

| Quote | Where | Verdict |
|---|---|---|
| "When your own Claude or Gemini is connected… it can only read…" | connect:68 | R→ the can / can-never two-list component from the consent page |
| "Building on your own, outside any cohort? Connecting works the same way…" | connect:70 | C. **It also links to the dead `/account/#own-app`** |
| "Every way of connecting starts from this one address. Your agent will open…" | connect:78 | R→ field hint under the copy box. C the second sentence |
| The Claude / Claude Code / Gemini sections as a whole | connect:83-113 | R→ tabs or segmented control (three ways of doing one thing) |
| Claude steps 1-4, including "free plan… allows one" | connect:86-89 | K (F: steps in an outside app) as a checklist |
| "A connector added in Claude is also there in Claude Code…" | connect:91 | K (F) |
| "Ask Claude Code to do it for you, in your own words or in these:" | connect:96 | C. The copy button labels it |
| Claude Code steps | connect:100-101 | K (F). Step 2 is long; the prompt names belong in code rows |
| "The -s user part matters: without it, Gemini saves the setting inside… public." | connect:107 | K (W) |
| "What it can and cannot do" prose | connect:118-119 | R→ the consent page's two lists, reused. They now differ (see Inconsistencies) |

## 12. /oauth/consent/ (`oauth/consent/index.html`, `assets/consent.js`)

| Quote | Where | Verdict |
|---|---|---|
| "Your own Claude or Gemini can know what your cohort is working on…" | consent:69 | C. The h2 and the lists say it |
| "Sign in with the same GitHub account you use for your cohort…" | consent:76 | K (F) as a field hint |
| "Signed in as X. It will send you back to Y." | consent:84 | K (F, security) as page header facts (Signed in as, Returns to) |
| Lists "What it can read" / "What it can never do" | consent:88-107 | K. This is the right element, the model for /connect/ |
| "What your agent says to you stays with you… To disconnect it later, remove…" | consent:109 | K the disconnect fact (F); C the first two sentences |
| "Connected. Your agent is on its way back…" / "Not connected. Nothing was shared…" | consent.js:31-32 | K (inline status), shorter |
| "Start again from your agent. If it keeps happening, the steps are on…" | consent:122 | K (W) + a button |
| "This page opens from your agent… nothing to answer here yet." | consent.js:39 | K (R) |

---

## Summary

### Which vocabulary items would remove the most text
1. **Visibility marker**, about 35 sentences. Who-can-see-this is written out as prose everywhere: home app rows, exchange rows, the exchange header (3 variants), the exchange-new select (4 options) and the Drive hints (2), cohort notes, recognitions, repo hint, apps-page checkbox, calendar email, share intro, the conversation states (3), discussions hints (2), account reach / notes / stages / data, /apps/mine intro and standing line, path-marks, the times name and calendar hints, and the apps/app conversation line. This one component, with a fixed set of words (Only you · You and your teachers · Your teachers · Your cohort · Members · Anyone with the link · Public on GitHub), is the biggest single win.
2. **Status label**, about 25. Cohort lines (Live / Draft / Ended / Unscheduled), poll lines (Taking answers / Closed / Answered), credential states (written as sentences in three places), readiness and confirmation marks, signature check, exchange closed / hidden / locked, invite state, apps directory status sentences, and the hidden-by-teacher notices.
3. **Empty state**, about 18. Almost every empty list says "…when one opens, it will be listed here" or "…will be here". These should be one short line plus one action.
4. **Page header facts**, about 10 surfaces. Next session, poll header, exchange summary, credential issued, app facts, open-cohort cards, invite, consent. The research rule against "A · B · C" strings pushed all of these into sentences.
5. **Toast**, about 8. Messages like "Saved. Both are off, so…" and "Thank you, X. Your answer is saved, and the numbers…" carry an explanation tacked onto a status.
6. **Checklist**, 6. Getting ready, the apps-page submission note, stages marked ready, the GitHub invitation, the Google/GitHub linking recovery, and the join steps.
7. **Count badge**, 6. Every "Waiting for you" row, poll answers, and exchange video counts.

### The five worst surfaces
1. **/cohort/?c=**: about 30 explanatory strings. Long intros on Notes and Recognized, three paragraphs for the conversation states, a 60-word hint under the apps-page checkbox, the submission paragraph, the stuck line, the ready-bar explanation, and the background caption.
2. **/account/**: the reach section (intro, hint, long checkbox label, sender note), the 80-word "Your data" paragraph, the credential intro, linked-accounts copy, and the Meet linking-recovery paragraphs.
3. **/exchange/ and /exchange/new/**: three visibility sentences, the members definition repeated three times, the recorder narrating each step, the "your video will answer…" lines, and Drive privacy repeated three times.
4. **Signed-in home**: every row's details are a full sentence, the "Waiting for you" rows are sentences instead of count badges, there are four empty-state paragraphs, and "More you can do" has a blurb under every link.
5. **/times/**: the session line ends in a tap instruction, the count-line explanation should be in the legend, the calendar result sentence explains the corner mark, and the save confirmation is a paragraph.

### Inconsistencies
- **Who can see it: teachers.** "Only you and the cohort's teachers can read them" (account:168), "Written to you alone, so only you and the cohort's teachers…" (cohort:144), "Only you and your teacher can see it" (cohort:190, singular), "Only the teachers of cohorts you are in see it" (account:148), "Only the teacher sees" (times:97).
- **Who can see it: only you.** "Yours alone until you choose to show it" (home.js:307), "Only you can see it. Nobody else knows it is here…" (builder-lib.js:36), "It stays yours alone until you choose to show it" (apps/mine:87), "Only you can see your marks…" (path-marks.js:113), "Only you can see it, and nothing here is counted" (account:175).
- **Who can see it: the cohort.** "seen only by this cohort" (cohort:162), "Seen only by your cohort." (home.js:300), "a repository only this cohort can see" (cohort.js:489, 502), "Only the people in this cohort can see it" (discussions.js:239), "Only the people in X can see this exchange" (exchange.js:74).
- **Who can see it: the apps page.** "Shown on the apps page." (home), "show it on humanshaped.org/apps/ for anyone to see" (cohort:187), "Show it on the apps page" (apps/mine:99), "It is on the apps page, with a page of its own" (builder-lib), "kept off humanshaped.org/apps/" (cohort:179). The page is named two ways.
- **Members** is defined in a parenthetical three times (exchange.js:80, 663; exchange-new.js:92) instead of once in a popover.
- **A real contradiction:** a cohort-only exchange still says "anyone with its link can watch it" (exchange/new:95, exchange:128). The Drive file is link-shared whatever the exchange's visibility. Prose can't hold both facts clearly. A two-part marker can: exchange "Your cohort", video file "Anyone with the Drive link".
- **Role** is shown four ways: the "Mentor" role tag (cohort.js:81), "You are a mentor in it." (home-lib), "You are a mentor in this cohort." (hub.js:283), and "Here as a mentor, to help." (cohort.js:84). Teacher is "You teach it." on home but only the nav row on the cohort page.
- **Credential state** is worded differently in three places (hub.js:524, cohort.js:359, credential:95), and the "Open it…" button text differs (hub.js:520 vs cohort.js:356).
- **Remove actions** have eight labels: "Remove this note", "Remove it from my page", "Remove it", "Remove the note", "Take it off the hub", "Forget my address", "Take back my answer", "Remove from the exchange".
- **Confirm step** is done four ways: native dialogs (account delete and leave), a button that arms on first press (Unlink), `window.confirm` (exchange), and **none** (/apps/mine "Take it off the hub", /times "Take back my answer").
- **Repository format** has three wordings: apps/mine:90, cohort.js:719, builder-lib.js:24.
- **"GitHub unreachable" and "private repo"** have three wordings: cohort.js:101-103, apps-lib.js:133-138, discussions.js:67. Read-permission expiry has three variants inside discussions.js:85-88.
- **Error recovery** varies: some states have a Try again button; home says "Reload the page"; apps/app says "trying again in a minute is the best next step" with no button.
- **What an agent can read** is two different lists: /connect/:118 omits the live-session queue and answers, and the classmates' shares limit, both of which /oauth/consent/ lists.
- **Dead links:** `/account/#own-app` at apps/index.html:101 and connect/index.html:70. Your app moved to `/apps/mine/` in `1f56f70`.
- **The docs prescribe the problem.** `research/notes/navigation-and-wayfinding-notes.md:477-500` (role line as a sentence, facts as a sentence) and the comment at `assets/exchange-lib.js:118`. Fix these first, so the next agent doesn't put the sentences back.
