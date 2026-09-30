# 05. Shipping

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

That turned out to be possible for almost everything. The places it is
not are listed at the end, because they are the places a person has to
show up.

## One version number

Every platform in this template reads its version from one file,
`AppVersion.xcconfig`. The Apple apps use it directly. Android reads it
at build time. Windows has it stamped into its package.

That rule exists because of the same September 13. Android's version
name turned out to be typed by hand, under a comment claiming it
followed the shared file. It was 88 versions behind, so a crash report
from Google Play could not be matched to the code that caused it.
`tools/test_version_contract.py` now holds the rule.

Bump it on every release.

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

`python3 tools/asc_release.py status` tells you what is live, in review,
or waiting, straight from Apple. The runbooks are
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

## What to do

1. Set up the App Store signing secrets once, following
   `docs/CLOUD-SUBMISSION.md`.
2. Bump `AppVersion.xcconfig`, commit, and run
   `gh workflow run appstore-build.yml -f platform=ios -f submit=false`.
   Watch it finish.
3. Run `python3 tools/asc_release.py status` and read what Apple says
   about your build.
4. Write real release notes, in your own words, for a person who has
   never seen your app. Then ship.
5. Open your app's page in the store on your own phone and install it.
   That, not the green checkmark, is shipped.

Be ready to show your app in a store, installed on a device you did not
build it on.
