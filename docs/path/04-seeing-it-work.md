# 04. Seeing it work

**Where you are.** Two platforms run on your own devices, and so far you
have been the one checking every fix. That stops here.

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
a screenshot, a measurement, a test run that could have failed
and did not.

## The ladder

Evidence comes in rungs, from cheapest to most convincing. Use the
cheapest one that can actually see the bug.

1. **Doors.** Every app in this template ships small, environment-gated
   entry points (`APP_START_TAB`, `APP_START_ITEM`, `APP_MUTE`,
   `APP_DOOR_SECONDS`) that open any screen directly and do nothing in a
   release build. The starters already honor them in debug builds. On
   the web they are ordinary URL parameters (`?view=`, `?item=`,
   `?mute=1`). They are how the
   agent's tests, and your store screenshots, get to a known state without tapping
   through the app. `tools/hook_coverage.py` reports which screens have
   one.
2. **Simulators and headless browsers.** Fast and free, and fine for
   layout and logic. Headless Chrome is also the only way to get a true
   1920×1080 TV viewport on a laptop, which is why the TV-web tools use it.
3. **Real devices on a bench.** Screenshots of the actual glass, read
   with on-device text recognition (OCR), so the agent grades what a
   person would see.
4. **A person.** Some things only a person can judge: whether a
   transition feels right, whether a caption is readable from the couch.
   Those go on a short list for the owner, and the agent does not
   pretend to have checked them.

## The bench

A bench is the set of real devices the agent is allowed to drive. The
agent keeps the list in a file (`tools/bench.json`) and fills it in as
you connect each device, and every device in it has a **role**:

- **test**: the agent may use it freely.
- **floor**: the oldest hardware you support (Archive Watch keeps a 2015
  Apple TV HD for this).
- **os-control**: a device held on an older OS, to tell an OS bug from
  an app bug.
- **owner-watches**: a device a person actually uses. The agent
  refuses it unless you say yes for that run.
- **owner-personal-never-touch**: your own phone. The agent refuses
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
- **Teardown is checked, not assumed.** The agent stops the app, then
  asks the device whether anything is still running, then puts the TV
  back in the power state it found, and reads that back too
  (`tools/atv_teardown.sh`, `tools/apple_device.py`).
- **The Mac is captured one window at a time.** A full-screen capture
  on the owner's Mac once picked up personal documents that happened to
  be open beside the app. `tools/mac_window_shot.swift` captures exactly
  one window, owned by exactly your app, and has no fallback to the
  whole screen.

## Instruments that tell the truth

A test rig is an instrument, and an instrument that cannot see must say
so. Archive Watch learned each of these the expensive way:

- A sleeping Apple TV returns a perfectly valid, perfectly black
  screenshot. So the agent asks the TV if it is on before every
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

## Working with your agent

Start with what you have. My bench grew to fourteen devices, but it grew
one device at a time, months into building. One phone is enough for
this stage.

1. **Hand over the testing.** Tell the agent, in your own words, what I
   told mine:

   > You should be able to see stuttering and swallowed audio. You
   > should be able to see the captions and measure their timing and
   > their accuracy... I should not be the one testing your work.

   Ask it to set itself up to test on your device. It will tell you the
   physical steps only you can do: turning on developer mode, trusting
   the computer, reading it a pairing code. Do those, and read it the
   codes.

2. **Say whose devices are whose.** Tell the agent which device is yours
   and must never be touched, which ones people in your home actually
   use and need asking about first, and which it may use freely. It
   writes those down as roles, and its tools refuse the devices you
   protected.

3. **Ask for proof with every "fixed."** From now on, when the agent
   says something works, ask to see it: a screenshot from your device, a
   measurement, a run that could have failed. Look at the screenshot
   yourself. When the report and your eyes disagree, say so:

   > This version is a huge step backward and you keep claiming things
   > are fixed and you have fully tested them, but I see no evidence of
   > either.

4. **When it guesses, stop it.** If a fix fails twice, ask for research,
   or for a way to see the problem, before the next attempt:

   > you're guessing, build a simulator so you can iterate locally
   > instead of making me test every tweak.

5. **Keep living with the app.** The agent's instruments will miss
   things. You will catch them by using the app, and each one you report
   becomes a check the agent adds, so it does not miss that one again.

6. **Correct its manners.** If it leaves something playing, drives a
   device someone is using, or wakes a TV in the wrong room, say so, and
   ask for a rule so it never happens again.

**When you are ready to move on,** the agent has proven a fix to you
with a screenshot from your own device, your devices have roles, and
you have stopped being the first person to find its mistakes.

Be ready to show the screenshot that proved a fix, and to say what it
would have looked like if the fix had not worked.
