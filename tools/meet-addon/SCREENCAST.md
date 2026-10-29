# Marketplace review screencast, shot by shot (2026-10-29)

*Written by Claude, awaiting Ben's review.*

The GWM Reviews Team wrote to benwilkoff@gmail.com on October 29, 2026
("Human Shaped (1086485459450) - Google Workspace Marketplace Review"):

> To facilitate the review process, please provide a screen recording or
> video demonstrating the complete end-to-end workflow of your
> application, highlighting how the requested scopes are being used.

They also ask for test credentials if the app needs them, and for the
test account gsmtestuser@marketplacetest.net to be allowlisted if access
is restricted.

The add-on requests two scopes, `userinfo.email` and `userinfo.profile`
(with `openid`, which Google's sign-in adds). Both are used for one
thing: signing the person in with Google inside Meet's side panel. The
Meet SDK gives the panel the call's meeting code, which the hub uses to
find the cohort; that is not a scope.

Made the way Archive Watch's two Google videos were
(Archive-Watch/docs/oauth/QUOTA-SCREENCAST.md): each section opens on an
English title card naming the scope it shows and when it is used, the
Chrome window is recorded on its own (never the whole screen), and the
Google account chooser is never on screen. It goes up on YouTube as
unlisted, and the link goes in a reply on Google's thread.

| # | Shot | Scope on the card |
|---|---|---|
| 1 | Title card: what Human Shaped is, the project number, the two scopes, and that nothing else is read from Google. | — |
| 2 | Cloud console, Marketplace SDK, App Configuration: the OAuth scopes list shows only `userinfo.email` and `userinfo.profile`. | both, as declared |
| 3 | A leader's Google Meet call (the sample cohort's session link). Activities, Add-ons, Human Shaped. | — |
| 4 | The side panel, signed out: Google's sign-in button and One Tap, beside GitHub. | — |
| 5 | Google's consent window for Human Shaped: name, email address, and profile picture. Continue. | both, granted |
| 6 | Card: what each scope is used for. Then "Link your GitHub account", and Not now (the reviewer's way in). | both, in use |
| 7 | The panel names the cohort and week from the call's meeting code: "Sample cohort for Google review", main room. | none (Meet SDK) |
| 8 | Running the session: start the part's clock, open the main stage, put the welcome on it, ask everyone a question, see the anonymous count, next part. | none |
| 9 | Close the main stage. | none |
| 10 | humanshaped.org/account/: the linked Google account shown by its email, how to unlink it, and how to delete the account. | email, shown |
| 11 | Sign out in the panel; it comes back signed out. | — |
| 12 | End card: the two scopes and their one use; no Drive, Calendar, Gmail, or call media is touched by the add-on; privacy at humanshaped.org/privacy/. | — |

**Not filmed:** the Google account chooser, notifications, any other
window, real learners' names (the sample cohort has none).

## Before recording

- meet@humanshaped.org signed in again in Ben's Chrome (Google asked it
  to verify on October 29).
- A sample cohort, labeled, with Ben as leader and a session whose Meet
  link is the call filmed in shot 3. Deleted after.
- The account that signs in on camera is meet@humanshaped.org with
  Google, a new Google-only account, which is exactly the reviewer's
  path: consent, Not now on GitHub, then the sample cohort (meet@ is in
  its `sample_leaders`). If meet@ already granted Human Shaped, that
  grant is removed first so the consent screen shows.

## What changed on the site for the review (October 29)

- `/addon/`: Not now on the GitHub step, and Sign out (review checks
  that sign-out works; the panel had none).
- A draft cohort with `details.any_call` opens in any call for its
  leaders; the Google addresses in `details.sample_leaders` become
  leaders on their first Google sign-in (migration 20261029010000).
  The sample is slug `sample-for-google-review`; delete it after review.
- `/privacy/` now has a section on Google sign-in: the scopes, their
  use, how long they are kept, and Limited Use. It used to say the
  add-on "asks Google for no permissions."
- Still wrong: the Marketplace store listing's detailed description says
  the add-on "asks Google for no permissions". Editing it may restart
  review, so it is Ben's call.

## Recording

Archive Watch's tools: `demo_window_record.swift` (build with
`-parse-as-library`, list with `onScreenWindowsOnly: false` when Chrome
sits on another Space) and `ax_press.swift` to dismiss Chrome bubbles.
Crop the "started debugging this browser" banner, which comes and goes
as the browser tools attach.
