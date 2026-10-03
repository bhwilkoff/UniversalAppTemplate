# The Human Shaped add-on for Google Meet

*Written by Claude, awaiting Ben's review.*

I want a teacher to be able to run a Human Shaped session from inside
Google Meet, with the part of the session, its timer, the queue of work
to show, and the checks for understanding in Meet's own side panel, and
a calm main stage they can present to everyone. On October 3, 2026, I
decided the add-on has to be open and free for anyone teaching or taking
a cohort (DECISIONS.md, "The classroom on Meet"), so we test it on our
own accounts first and then list it publicly on the Google Workspace
Marketplace.

**The add-on is two pages on humanshaped.org, and Google only frames them.**

- `/addon/` is the side panel. Meet tells it the call's meeting code,
  and it finds the cohort (or the group, in a group's room) whose Meet
  link holds that code, so nobody picks a cohort by hand.
- `/addon/stage/` is the main stage. The teacher opens it from the
  panel and chooses what it shows: the part and its timer, an open
  check's question (with the anonymous count only when the teacher
  shows it), or someone's work from the queue.

It never records, measures, or joins the call as a participant. It asks
Google for no permissions at all, and it reads nothing from Meet except
the meeting code.

## What it costs

Nothing. The Cloud project, the two Google services it needs, and the
pages on GitHub Pages are free, and Google charges no Marketplace fee.

## Setting it up

Each step ends with something you can check. Do them in order, signed
in as **meet@humanshaped.org** unless a step says otherwise, so that
nothing depends on your own login.

1. **Allow Meet add-ons in your organization.** In the Google Admin
   console, open the Meet settings for the organizational unit that
   holds ben@ and meet@, and turn on add-ons (the setting has separate
   switches for Google's own add-ons and for third-party ones; we need
   third-party). The exact menu path was not verified in the research.
   *Check:* in any Meet call, the Activities button opens a panel of
   add-ons.

2. **Make the Cloud project.** At console.cloud.google.com, make a
   project named "Human Shaped" inside the organization. Under APIs and
   services, enable the **Google Workspace Marketplace SDK** (the SDK,
   not the API) and the **Google Workspace add-ons API**.
   *Check:* both show as enabled under APIs and services.

3. **Send the agent the project number.** It is on the project's home
   page as "Project number" (twelve digits or so, and not a secret). It
   goes in `assets/addon-config.js`, because Meet's SDK will not open
   the panel without it.
   *Check:* once it is pushed, https://humanshaped.org/assets/addon-config.js
   shows the number.

4. **Fill in the consent screen.** Under Google Auth Platform, Branding:
   app name "Human Shaped", support email meet@humanshaped.org, home page
   https://humanshaped.org. Add no scopes. Choose the **External**
   audience and leave it in testing, so that nothing has to change when
   it is listed publicly. (If Google asks for Internal, that works for
   testing too, and can be changed later; that switch was not verified.)
   *Check:* the Branding page saves without asking for a scope.

5. **Add the deployment.** In the Marketplace SDK, open **HTTP
   deployments**, choose **Create new deployment**, give it the ID
   `human-shaped`, and paste all of `tools/meet-addon/deployment.json`.
   *Check:* the deployment is listed, with no error beside it.

6. **Install it for yourself.** On that deployment, press **Install**.
   This is how we test, and it involves no listing and no review.
   *Check:* open a Meet call as the account that installed it, open
   Activities, and "Human Shaped" is there.

7. **Try it in a real call.** First, on /teach/, make sure a test
   cohort's session has this call's link as its Meet link (and, to try a
   group's room, that one group has another call's link). Then:
   - open Human Shaped from Activities, and sign in with "Use my
     humanshaped.org sign-in" or "Sign in with GitHub in a small window";
   - the panel should name the cohort and the week, and say whether this
     is the main room or a group's room;
   - start the part's timer, then press **Open the main stage**, put a
     check on the stage, and present the stage from Meet.
   *Check, and bring back:* which sign-in worked; whether the small
   window closed itself and handed the sign-in back; whether the main
   stage opened; and what the other people in the call saw when it
   did (Meet tells everyone an activity started, and may ask them to
   install the add-on).

8. **Do not choose a visibility in App Configuration yet.** Google says
   the choice between private and public "can't" be changed once it is
   saved. Testing needs only step 6, so leave this until we list it.

## Listing it publicly, later

When the test call works, the public listing needs what we do not have
yet, and each is a small piece of work for the agent and a few minutes
for you:

- a privacy page and a terms page on humanshaped.org, linked from the
  consent screen, the listing, and the deployment (`termsUri`);
- the consent screen published for External use (no scopes, so no
  verification of sensitive scopes is expected);
- **Public** chosen once in the Marketplace SDK's App Configuration, as a
  Meet add-on using this deployment;
- the store listing: icons, a few screenshots of the panel and the
  stage, a short description, and the support and privacy links;
- Google's review, which Google says "typically takes several days," and
  which we should budget weeks for.

## How sign-in works inside Meet

Meet frames the panel, and the browser keeps a framed page's storage
apart from the same site in its own tab, so the panel cannot see the
sign-in this browser already has on humanshaped.org. And GitHub refuses
to be framed. So the panel tries, in order:

1. a session it already has (from an earlier sign-in inside Meet);
2. the **Storage Access API**, which asks the browser to let the panel
   use the humanshaped.org sign-in (Chrome may grant it without asking
   when third-party cookies are allowed, or after a click otherwise);
3. a **small window** to `/account/?handoff=meet`, which signs in with
   GitHub as usual and then hands the session back to the panel with
   `postMessage`, only to humanshaped.org, only to the window that
   opened it, and only the two Supabase tokens (never the GitHub token).
   If that window signed in only for the panel, it then forgets its own
   copy, because two copies refreshing the same session would end it;
4. if neither works, a link to open the live page in a new tab, which is
   where we are without the add-on at all.

## What only a real Meet can tell us

- that Meet's frame allows `requestStorageAccess` and popups at all;
- that the small window's `window.opener` survives the trip through
  GitHub and Supabase;
- that `startActivity` opens our main stage, and what it shows everyone
  else in the call;
- whether Meet's own `mainStageUri` field (marked deprecated in the
  add-ons API) is needed in the deployment; we leave it out and give the
  stage's address when the stage opens;
- whether the add-on appears in the Meet apps on Android and iOS.

Be ready to bring back what you saw in step 7.
