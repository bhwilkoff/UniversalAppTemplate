# Research for the add-on redesign

*Written by Claude, November 6, 2026, from three research passes. Ben: "We are currently working on a 'kitchen sink' approach for this add-on."*

## How a many-featured narrow panel should work

No study compares an icon rail with top tabs at this width, and Google publishes no design guide or panel width for Meet add-ons. What the evidence supports:

- An icon rail costs about a quarter of a 320px panel (Material's default is 80dp), and hidden labels get ignored (NN/g, vertical navigation). Top tabs suit a few one or two word labels in one row (NN/g, tabs used right). An accordion or long list makes every heading a decision (NN/g).
- Microsoft's rules for apps in Teams meetings are the closest published: one column, vertical scrolling, a secondary layer with back, avoid modals, keep navigation visible, no unfamiliar colors.
- Live tools answer "what do I do now": presenter views show current, next, notes, and time; Poll Everywhere's flows advance with one gesture; Mentimote's Responses tab exists only when there are responses; Pear Deck keeps scrolling private and makes showing a click; Stream Deck keys show state, not only action.
- Talking while operating a screen interferes both ways with little practice and barely with a lot (ASHA 2021), so a live control must become habit: fixed place, changing content.
- Google Classroom add-ons give teachers several views and students one.

## What Meet offers an add-on

- Newest SDK is 1.2.0; docs still print 1.1.0. It adds the error `MeetingPolicyPreventsStartingActivity`.
- We do not use `getFrameOpenReason`, `getActivityStartingState`, `setActivityStartingState`, `closeAddon`, `loadSidePanel`, `unloadSidePanel`, `exposeToMeetWhenScreensharing`, or `getFrameType`.
- The SDK has no theme, size, title, participants, identity, recording, or activity-ended signal. `frameToFrameMessage` is its only event.
- Observed in Meet's CSS: panel 360px (a 30rem variant on wide windows), 20px radius, 16px gap; Google Sans or Roboto at 14/20, 16/24, 12/16, weights 400 and 500. Light: #fff, #f0f4f9, #1f1f1f, #444746, #0b57d0. Dark: #131314, #1e1f20, #e3e3e3, #c4c7c5, #a8c7fa.
- REST can list participants (`meetings.space.readonly`, sensitive) with names and no email, and Google says not for performance tracking. Presence from the add-on does this without a new scope. Events need Pub/Sub, which needs billing. The Media API ends January 15, 2027.
- Pasting a humanshaped.org link into Meet chat can show an install or open card, depending on what Google's reviewers set. Worth a test.

## GitHub and sign-in

A learner meets up to ten steps today, six of them approvals. Google's add-on install cannot be removed unless an administrator installs it. Accepting an organization invitation and authorizing an app need a person, though `PATCH /user/memberships/orgs/{org}` may accept an invitation with a user token (untested; a 2019 report shows a 403).

- Storage Access is dead code: `useSiteSignIn` only runs without a gesture, so a signed-in member with no panel session arrives as a guest.
- Enterprise Managed Users costs money and forbids public content.
- The installation token already opens discussions, comments on issues, and writes files. Posts made that way read as the app.
- Limits: 5,000 calls an hour for an installation, and 80 content creations a minute. Chat polling at 15 seconds with 20 panels would make 4,800 calls an hour.
- Refresh tokens sit as plain text columns. Anonymous sign-ins have no CAPTCHA, which Supabase recommends.

Sources are in the three passes: nngroup.com (tabs-used-right, vertical-nav, accordions-complex-content, progressive-disclosure), learn.microsoft.com (designing-apps-in-meetings), developers.google.com/workspace/meet (add-ons, api, release-notes), docs.github.com (rest/orgs/members, authorizing-github-apps), supabase.com/docs/guides/auth/auth-anonymous.
