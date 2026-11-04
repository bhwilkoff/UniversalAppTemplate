# Who can reach the add-on, and with which account

*Written by Claude, November 4, 2026, for Ben's decision.*

Ben: "Is there a way that we can allow anyone who has access to the link for
the call to be able to access the Human Shaped add-on and its content?"

## What was seen in a real call

- The Google account in Meet and the Human Shaped account are separate. A
  Google account with no Human Shaped account ran a test learner's panel,
  signed in with GitHub, without any trouble.
- Meet decides the add-on step. A Google account with the add-on gets Join
  activity; one without it gets Install and join activity.
- The panel needs a Human Shaped sign-in, and the database's rules let only
  cohort members read sessions, parts, and the show's place.

## What is not known

- Google's pages do not say whether someone in a call without a Google
  account can run an add-on. Not tested.
- An administrator can install an add-on for their organization (Google calls
  these admin-installed apps). Whether Minerva would is its call.

## What happens with the wrong Google account

"Continue with Google" on an address not linked to a Human Shaped account
makes a new, empty account. The panel then asks to link GitHub. Linking the
GitHub that already has an account offers to remove the empty one, and the
person signs in with GitHub. "Not now" instead leads to a call the account has
no cohort for. An account page offers one Google account only; once one is
linked, it offers no way to add another. Sign out sits at the foot of the
panel.

## Options

1. **A way to switch.** "Use a different account" at the top of the panel and
   on the no-cohort screen, and more than one Google account on one Human
   Shaped account. No change to who can see what.
2. **A stage the leader feeds.** The leader's panel sends the stage over a
   channel named by a secret in Meet's `additionalData`, which reaches only
   people who join the activity. The stage then needs no sign-in, and no
   learner sees a stage waiting on their panel.
3. **Guests by the call's link.** Anyone with the link can read that session's
   plan and answer, with no Human Shaped account, in Meet or on a plain page
   in any browser. Needs Supabase anonymous sign-ins (off today), guest rights
   limited to one session, and limits on writing. Guest answers belong to no
   one, so they cannot be followed up, and a forwarded link shows the plan.
   Leader notes, names, others' answers, and the GitHub conversation stay
   closed. /privacy/ would need to say so.

Pages Meet loads can change without another Marketplace review, unless the
listing or the Google scopes change.

Sources: https://developers.google.com/workspace/meet/add-ons/guides/overview,
https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on,
https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk.activitystartingstate
