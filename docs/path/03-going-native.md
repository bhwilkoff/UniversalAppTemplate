# 03. Going native

Late in September 2026, an iPhone 6 Plus prompted a question I put to
the agent: "The current native app requires iOS 26, but we are
investigating if we can make it work on older hardware."

The agent measured instead of guessing. It test-built the app at lower
and lower deployment targets and counted what broke. Nothing native
could reach the iPhone 6 Plus at all. Apple's current tools stop at iOS
15. Below iOS 17, the app's data layer fell apart: 428 errors. At iOS 18,
the whole app needed changes in two files.

And iOS 26 was exactly the release that dropped the iPhone XS and XR.
Moving the floor to 18 brought those phones back for the cost of two
files. The iPhone 6 Plus got something too: a pointer to the website, which
is where a device that old belongs.

**The floor is a floor, not a ceiling.**

## What I want

I want the hand-me-down phone, the 2015 Apple TV, and the Fire TV stick
someone got for free to run the app, and run it well. I also want the
newest devices to get everything they are capable of. Those two wants
only look like they conflict.

Here is how I said it to the agent during the Android version of the
same work:

> Remember, you are trying to keep the floor low for Android, but we
> aren't trying to hamstring modern devices that are capable of doing
> many more things. If you have to make it so that certain features can
> only be utilized on more modern devices, that is okay.

So, a floor is where the app starts working. It is never the limit on
what the app can do.

## The order of the platforms

Archive Watch arrived on its platforms in this order, and the order is
the method:

1. **Apple TV, April 17.** The platform where its people were. Seven
   weeks alone, with the data pipeline growing underneath it.
2. **iPhone and iPad, the web, and Android, all on June 9.** Three
   platforms in one day was possible because the seam was already clean.
   The data plane was published, so each new app was only views and a
   reader.
3. **Mac, June 22.** Thirteen days later. The Mac is the cheapest
   platform to add, because it shares the entire Apple `Core/` with the
   iPhone and the Apple TV. It still needed its own shell: pointer,
   keyboard, menu bar, and resizable windows. It is never the iPad app
   stretched out (`macos-platform-patterns` carries the traps).
4. **Roku, September 3.** A different language (BrightScript) and almost
   no ready-made controls. Everything it shares with the others is the
   data plane.

The `multiplatform-expansion-method` skill turns that order into steps:
find the seam between data and views, then add platforms in order of how
much they can reuse.

## One Apple target, one Android app

On Apple, one Xcode target builds for iPhone, iPad, Mac and Apple TV.
Shared code lives in `Core/` and compiles for all four. The views live
in `iOS/`, `macOS/` and `tvOS/`, each behind an `#if os(...)` guard.
There is one version number (`AppVersion.xcconfig`) and one CloudKit
database, so a film saved on the iPhone is saved on the Apple TV.

On Android, one app serves phones, tablets, Google TV and Fire TV. The
TV experience is chosen at runtime from the device itself, never forked
into a second app (`androidtv-compose-focus`).

## Choosing a floor

Choosing a floor is a measurement, not an opinion.

1. **Ask what hardware each candidate floor reaches.** iOS 18 and 17 run
   on the same phones, so 17 buys nothing that 18 does not. iOS 26 lost
   the XS and XR, so 18 buys them back. tvOS 27 dropped the Apple TV HD
   and the first 4K, so the Apple TV floor stays at 26.
2. **Test-build at each candidate and count the errors.** Do not commit
   it. Read the count. Two files is a yes. 428 errors is a no.
3. **Hold the floor with a test.** `tools/test_ios_floor.py` and
   `tools/test_tvos_floor.py` run before every Apple archive and refuse a
   target above the floor you chose. On Android, keep `lint NewApi`
   clean at the floor for every build flavor.
4. **Gate newer features by capability.** On Apple, `#available`. On
   Android, `Build.VERSION.SDK_INT`. Live captions in Archive Watch are an
   iOS 26 feature, and the iOS 18 phone simply does not show the button.
5. **Send what is left to the web.** The website is the floor below the
   floor.

Some traps showed up along the way, and the skills carry them. Android 6
and 7 do not trust the certificate authority behind most of the web
(Let's Encrypt), so the app installed and then could not download its own
catalog until those roots were bundled. A library pinned for the floor
but only half-pinned crashed the Google TV at runtime on a build that
compiled cleanly. The fix was to pin everything that library was built
against, with the reason written beside the pin.

## What it costs

Every gated feature is two paths to keep working, and the older path
only gets tested if you own an older device. Archive Watch keeps an
Apple TV HD on the bench for that reason. It does not have an iOS 18
phone yet, which means the iOS 18 path is tested less than it should be.
Stage 04 is about why that matters.

## What to do

1. Pick your second platform. Write down why, in one sentence, in
   `DECISIONS.md`.
2. For Apple: follow `apple/README.md` to create the one universal
   target at the repository root. For Android: open `android/` in
   Android Studio and run `./gradlew :app:assembleDebug`.
3. Ask your agent to measure the floor: test-build at two candidate
   deployment targets and report the error counts. Do not let it commit
   the experiment.
4. Record the floor you chose and the hardware it reaches as a decision,
   leading with *why*.
5. Build your first verb from stage 02 on the new platform, in that
   platform's own idiom, and update its row in `PARITY.md` in the same
   commit.

Be ready to name the oldest device your app will run on, and the
newest feature it will not show there.
