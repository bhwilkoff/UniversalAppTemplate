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
| 6 | The panel, signed in: the person's name and picture. Card: the email finds their Human Shaped account; the name and picture show who is signed in; nothing is stored beyond the account. | both, in use |
| 7 | The panel names the cohort and week from the call's meeting code: "Sample cohort for Google review", main room. | none (Meet SDK) |
| 8 | Running the session: start the part's clock, open the main stage, put the welcome on it, ask everyone a question, see the anonymous count, next part. | none |
| 9 | Close the main stage. | none |
| 10 | humanshaped.org/account/: the linked Google account shown by its email, how to unlink it, and how to delete the account. | email, shown |
| 11 | Sign out in the panel. | — |
| 12 | End card: the two scopes and their one use; no Drive, Calendar, Gmail, or call media is touched by the add-on; privacy at humanshaped.org/privacy/. | — |

**Not filmed:** the Google account chooser, notifications, any other
window, real learners' names (the sample cohort has none).

## Before recording

- meet@humanshaped.org signed in again in Ben's Chrome (Google asked it
  to verify on October 29).
- A sample cohort, labeled, with Ben as leader and a session whose Meet
  link is the call filmed in shot 3. Deleted after.
- Human Shaped's Google grant removed from the account that signs in, so
  shot 5 shows the consent screen rather than skipping it.
