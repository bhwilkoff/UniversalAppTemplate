# 04. Seeing it work

On September 17, 2026, in the middle of a test run, I typed this to the
agent working on Archive Watch:

> Stop using the fireplace tv for testing. I'm actively watching on it
> now.

The agent had been driving the Apple TV in the room where I was
watching a film. Another run left a film
playing unmuted on another Apple TV for about an hour, and because an
Apple TV sends its sound to every HomePod in the house, movie music
came out of speakers all over our home. Nobody knew why.

Both of those are real-device testing done badly. And yet the bench of
real devices is the best thing Archive Watch built. The fix was never to
stop testing on real hardware. It was to test on it the way a careful
person would: with permission, with the volume down, and leaving the
room the way you found it.

## Why real devices at all

Because everything short of the real device lies, a little.

- **The simulator lies about the filesystem.** tvOS lets a simulator
  write to folders a real Apple TV forbids. The app passes in the
  simulator and crashes on the first launch in a living room.
- **The app's own logs lie about the screen.** A log line that says
  "caption shown" tells you the code ran. It does not tell you a person
  could read the caption.
- **The agent's report lies about the result.** Not on purpose. An
  agent reports what it intended, and "I fixed it" is a statement about
  the code, not about the app.

**The agent is never the tester.**

That is Decision 032 in this template, and it is the rule this stage is
built around. The agent changes the code. The evidence that the change
worked comes from something outside the agent: a picture of the actual
screen, a number read from the device, or a person holding it.

## What I want

I want to be able to read the word "fixed" in a session log and trust
it. That means every "fixed" points at something someone could look at:
a screenshot, a measurement, a run of a harness that could have failed
and did not.

## The ladder

Evidence comes in rungs, from cheapest to most convincing. Use the
cheapest one that can actually see the bug.

1. **Doors.** Every app in this template ships small, environment-gated
   entry points (`APP_START_TAB`, `APP_START_ITEM`, `APP_MUTE`,
   `APP_DOOR_SECONDS`) that open any screen directly and do nothing in a
   release build. The starters already honor them in debug builds. On
   the web they are ordinary URL parameters (`?view=`, `?item=`,
   `?mute=1`). They are how a
   harness, or a store screenshot, gets to a known state without tapping
   through the app. `tools/hook_coverage.py` reports which screens have
   one.
2. **Simulators and headless browsers.** Fast and free, and fine for
   layout and logic. Headless Chrome is also the only way to get a true
   1920×1080 TV viewport on a laptop, which is why the TV-web tools use it.
3. **Real devices on a bench.** Screenshots of the actual glass, read
   with on-device text recognition (OCR), so the harness grades what a
   person would see.
4. **A person.** Some things only a person can judge: whether a
   transition feels right, whether a caption is readable from the couch.
   Those go on a short list for the owner, and the harness does not
   pretend to have checked them.

## The bench

A bench is the set of real devices your harness is allowed to drive.
In this template it is a file, `tools/bench.json`, copied from
`tools/bench.example.json`, and every device in it has a **role**:

- **test**: the harness may use it freely.
- **floor**: the oldest hardware you support (Archive Watch keeps a 2015
  Apple TV HD for this).
- **os-control**: a device held on an older OS, to tell an OS bug from
  an app bug.
- **owner-watches**: a device a person actually uses. The harness
  refuses it unless you say yes for that run.
- **owner-personal-never-touch**: your own phone. The harness refuses
  it every time, even when handed its raw ID.

Those last two roles exist because of the fireplace TV.

## Leave the room as you found it

Every run in this template follows the same manners.

- **One lease for the whole run.** Two agent sessions driving the same
  TV each find the other's app on screen and report it as a bug in
  their own. `tools/devlease.py` gives one session the device for the
  whole run, and the other waits.
- **Doors are muted and time-limited by default.** An audible run is
  opt-in, and you ask first. That is the HomePod lesson.
- **Teardown is checked, not assumed.** The harness stops the app, then
  asks the device whether anything is still running, then puts the TV
  back in the power state it found, and reads that back too
  (`tools/atv_teardown.sh`, `tools/apple_device.py`).
- **The Mac is captured one window at a time.** A full-screen capture
  on the owner's Mac once picked up personal documents that happened to
  be open beside the app. `tools/mac_window_shot.swift` captures exactly
  one window, owned by exactly your app, and has no fallback to the
  whole screen.

## Instruments that tell the truth

A harness is an instrument, and an instrument that cannot see must say
so. Archive Watch learned each of these the expensive way:

- A sleeping Apple TV returns a perfectly valid, perfectly black
  screenshot. So the harness asks the TV if it is on before every
  capture, rather than guessing from the pixels.
- A screenshot file left over from an earlier run looks exactly like a
  new one. So every capture deletes the old file first and refuses one
  more than a minute old.
- A check that returned "not on the home screen" whenever its text
  recognition failed was wrong for weeks, and nobody noticed, because it
  never said "I could not tell." Now it says so.
- **Pass, fail and skip are three numbers.** A skip is not a pass. A
  run that parsed zero results did not pass.
- **A test is not a test until you have seen it fail.** Break the code
  on purpose, watch the test catch it, then put the code back. Plant a
  control where you can.

The full list, 26 of them, is in `docs/AUTONOMOUS-FLEET-TESTING.md`
and `docs/DEVICE-HARNESSES.md`, and the skills that carry them are
`device-observation-harness`, `autonomous-fleet-testing` and
`concurrent-agent-device-leases`.

## What it costs

A bench is hardware, and hardware is money and space. Archive Watch's
bench grew to fourteen devices, including two Rokus and a Samsung TV.
You do not need that. You need the device your people use, and, if you
can find one, an old one.

It also costs time. Every run on a real device is slower than a
simulator run. That is why the ladder exists: most checks belong on the
lower rungs, and only the ones that can fool the lower rungs need to
climb.

## What to do

1. Add one door to your app: an environment variable that opens your
   most important screen directly, and does nothing in a release build.
2. Copy `tools/bench.example.json` to `tools/bench.json`. Add your own
   phone with the role `owner-personal-never-touch`. Add any device you
   are willing to let a harness drive as `test`.
3. Fill in `tools/app_config.py`: your bundle IDs, and the words that
   prove your app is on screen.
4. Ask your agent to fix something small, then to prove it with a
   screenshot from a real device or a harness run. Read the screenshot
   yourself.
5. Write one test that should fail on the old code. Run it against the
   old code first.

Be ready to show the screenshot that proved your fix, and to say what
it would have looked like if the fix had not worked.
