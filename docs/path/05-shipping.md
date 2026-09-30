# 05. Shipping

**Where you are.** Your app runs on your devices, and the agent can prove
its own fixes. Nobody else can install it yet.

On September 13, 2026, the App Store version of Archive Watch was
1.42.53. The repository was at 1.42.94. That is 41 versions, including
the whole shared-playlist feature, all of it verified on real devices
and shipped to nobody. Google Play was further behind still, on 1.42.6.

Nothing had reported the gap. The loop had been writing "verified on
the glass" in its session log for days, and every word of it was true.
The work simply sat.

**A feature nobody can install is unfinished.**

## What I want

I want shipping to be ordinary. Not a weekend, not a ceremony, not a
morning spent clicking through four store consoles. I want the agent to
be able to do the whole release from the command line, and I want to
be able to read, from the store itself, what is actually live.

That turned out to be possible for almost everything, but it took me
three months to get there. In June I was still creating App Store
versions by hand and uploading Android builds myself. By September my
whole release instruction for Tidbits Trivia was three words:

> Ship every platform

The places where a person still has to show up are listed below.

## One version number

Every platform in this template reads its version from one file,
`AppVersion.xcconfig`. The Apple apps use it directly. Android reads it
at build time. Windows has it stamped into its package.

That rule exists because of the same September 13. Android's version
name turned out to be typed by hand, under a comment claiming it
followed the shared file. It was 88 versions behind, so a crash report
from Google Play could not be matched to the code that caused it.
`tools/test_version_contract.py` now holds the rule.

The agent bumps it on every release, and a test fails if any platform
drifts from it.

## Apple, from a GitHub runner

The Apple apps are built, signed and uploaded by a GitHub Actions
workflow (`appstore-build.yml`) running on a released version of macOS
with a released Xcode. There is a reason you do not do this from your
own Mac.

If your Mac runs a beta of macOS or Xcode, which is common when you are
building for the newest features, the App Store accepts the upload and
then rejects the build for review. TestFlight takes it happily, so you
find out late. The cloud runner never has that problem, and for a
public repository it costs nothing.

The workflow refuses a build number that was already uploaded, runs the
floor tests from stage 03, archives, and then hands off to
`tools/asc_release.py`, which does the rest:

- It creates or renames the App Store version for each platform (iPhone
  and iPad, Apple TV, Mac). Three platforms are three versions and three
  reviews. An earlier tool here only knew about the iPhone, and that
  mistake cost a release.
- It waits for Apple to finish processing the build.
- It refuses to submit without release notes.
- It submits for review.

When you ask whether a release is live, the agent reads the answer
straight from Apple (`tools/asc_release.py status`) rather than
guessing. The runbooks it follows are
`docs/CLOUD-SUBMISSION.md` (build, sign, upload) and
`docs/APPLE-SUBMISSION-CLI.md` (version, release, review).

## Google Play, and the other stores

Android ships through the Google Play Developer API: `play-release.yml`
in CI, or `tools/submit-play.sh` from your own machine. One trap is
worth knowing before you meet it. Play limits release notes to 500
characters but only checks at the very end, after a version code has
been used, so a long note burns a version number. The tools check first.

The other stores (Amazon for Fire TV, Roku, the Microsoft Store, LG and
Samsung televisions) each have their own path, and the
`store-submission-playbook` skill carries them. Roku and the TV stores
still need a browser for parts of the process. The skill says which
parts, and how to drive them without guessing.

## What stays human

Some things only a person can do, and the template does not pretend
otherwise:

- Creating the developer accounts, and paying for them.
- Agreeing to each store's terms, and answering its privacy questions.
- Declaring anything the store asks a person to declare. When Google
  Play wanted a foreground-service declaration for Archive Watch, its
  form rendered as an empty grey box, and the only working way in was a
  link that appeared partway through a manual release.
- Recording a demo video when a reviewer asks for one.

Everything else is the agent's. The rule in `CLAUDE.md` is plain: the
full ship is the command line, and nobody is asked to press Submit.

## What it costs

An Apple developer account is $99 a year, and Google Play is $25 once.
The other stores are cheaper or free. The cloud builds are free for a
public repository.

It also costs patience. The first submission to every store takes
longer than any after it, because the first one is where you meet every
form.

## Working with your agent

1. **Open the accounts.** Create the store accounts yourself (Apple, and
   Google Play if you have an Android app), pay for them, and agree to
   their terms. Tell the agent when they exist.

2. **Ask for everything a submission needs.** In June, getting ready
   for Archive Watch's first iPhone release, this is how I started:

   > Let's get all of the info (screenshots, description, etc.) that we
   > need to submit the iPhone version to the app store.

   The agent drafts the listing, captures the screenshots from your app,
   answers what it can of the privacy questions, and tells you what only
   you can answer.

3. **Make the words yours.** Read the store description and the release
   notes out loud. Rewrite anything that sounds like a machine wrote it,
   and anything that is not true for that store. Your "no AI copy" rule
   from stage 00 applies to the store page too. In September the
   agent's release notes kept arriving with formatting that gave them
   away:

   > I really don't want to have to remove strange formatting every time
   > I want to submit to the app store that shows that it was AI
   > generated.

   And a few weeks later, when it wrote one set of notes for every
   platform:

   > The what's new text should be different by platform because the
   > features are different.

4. **Do the credential step together.** The build and submission run in
   the cloud and need keys from your accounts. Ask the agent to take you
   to the exact screen for each one. This is how I did it in September,
   when Archive Watch's YouTube posting needed a token only I could
   create:

   > I'd like you to use Chrome to take me to the right screen to
   > generate the oauth token and I'd like you to walk me through that
   > process

   When a secret has to be saved, type it into the prompt yourself with
   a `!` in front of the command the agent gives you, so the value goes
   straight where it belongs.

5. **Say ship.** Then ask whether it is really done. This was me on
   September 3, before moving Archive Watch on to its next piece of work:

   > Did you ship it fully? I'd like to move on to another scope of work.

6. **Paste the rejection whole.** If a store rejects the build, copy the
   entire message to the agent. It diagnoses, fixes and resubmits. If it
   says something cannot be done by the command line, and you know
   other apps do it, say so.

7. **Install it like a stranger.** Open your app's page in the store on a
   device you did not build it on, and install it. That, not the green
   checkmark, is shipped.

**When you are ready to move on,** someone who has never met you could
install your app from a store.

Be ready to show your app in a store, installed on a device you did not
build it on.
