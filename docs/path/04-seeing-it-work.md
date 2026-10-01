# 04. Seeing it work

**Where you are.** Two platforms run on your own devices, and so far you
have been the one checking every fix. That stops here.

On August 14, 2026, a version of Archive Watch reached my Apple TV with
stuttering audio and captions that ran late. The agent had called it
tested. I wrote back:

> This version is a huge step backward and you keep claiming things are
> fixed and you have fully tested them, but I see no evidence of either.

The same day came the sentence this whole stage is built on:

> You should be able to see stuttering and swallowed audio. You should
> be able to see the captions and measure their timing and their
> accuracy... I should not be the one testing your work.

## Why the agent cannot grade itself

An agent reports what it intended. "I fixed it" is a true statement about
the code, and it says nothing about the app. Everything short of the real
device lies a little, too.

- **The simulator lies about the filesystem.** tvOS lets a simulator
  write to folders a real Apple TV forbids. The app passes in the
  simulator and crashes on its first launch in a living room.
- **The app's own logs lie about the screen.** A log line that says
  "caption shown" tells you the code ran. It does not tell you a person
  could read the caption.

So the agent does the testing, and the evidence comes from outside it:
a picture of the actual screen, a number read from the device, or a
person holding it.

**The agent is never the tester.**

That rule is written into this template's decision log, and everything
below follows from it.

## What I want

I want to be able to read the word "fixed" in a session log and trust
it. That means every "fixed" points at something someone could look at:
a screenshot, a measurement, a test run that could have failed and did
not.

## The ladder

Evidence comes in rungs, from cheapest to most convincing. The agent
should use the cheapest rung that can actually see the bug.

1. **Doors.** Every starter in this template has small, debug-only entry
   points that open any screen directly: start on this tab, open this
   item, stay muted, go home after this many seconds. On the web they are
   ordinary URL parameters (`?view=`, `?item=`, `?mute=1`). Doors are how
   the agent's tests, and your store screenshots, reach a known screen
   without tapping through the app.
2. **Simulators and headless browsers.** Fast and free, and fine for
   layout and logic. A headless browser is also the only way to get a
   true 1920×1080 TV screen on a laptop.
3. **Real devices on a bench.** Screenshots of the actual glass, read
   with on-device text recognition, so the agent grades what a person
   would see.
4. **A person.** Some things only a person can judge: whether a
   transition feels right, whether a caption is readable from the couch.
   Those go on a short list for you, and the agent does not pretend to
   have checked them.

## The bench

A bench is the set of real devices the agent is allowed to drive. The
agent keeps the list in a file (`tools/bench.json`) and adds to it as
you connect each device. Every device on it has a **role**:

- **test**: the agent may use it freely.
- **floor**: the oldest hardware you support (Archive Watch keeps a 2015
  Apple TV HD for this).
- **os-control**: a device held on an older OS, to tell an OS bug from
  an app bug.
- **owner-watches**: a device a person actually uses. The agent refuses
  it unless you say yes for that run.
- **owner-personal-never-touch**: your own phone. The agent refuses it
  every time, even when handed its raw ID.

The last two roles exist because of what happened next.

## Leave the room as you found it

Handing the testing to the agent was the right move, and the first
months of it were rough in a very domestic way. On September 17, in the
middle of a run, I typed:

> Stop using the fireplace tv for testing. I'm actively watching on it
> now.

The agent had been driving the Apple TV in the room where I was
watching a film. Another run left a film playing unmuted on a different
Apple TV for about an hour, and because an Apple TV sends its sound to
every HomePod in the house, movie music came out of speakers all over
our home. Nobody knew why.

The fix was never to stop testing on real hardware. It was to test on
it the way a careful person would. Every run in this template now
follows the same manners:

- **One lease for the whole run.** Two agent sessions driving the same
  TV each find the other's app on screen and report it as a bug in
  their own. `tools/devlease.py` gives one session the device for the
  whole run, and the other waits.
- **Doors are muted and time-limited by default.** An audible run is
  opt-in, and the agent asks first. That is the HomePod lesson.
- **Teardown is checked, not assumed.** The agent stops the app, asks
  the device whether anything is still running, puts the TV back in the
  power state it found, and reads that back too.
- **The Mac is captured one window at a time.** A full-screen capture
  on my Mac once picked up personal documents that happened to be open
  beside the app. The capture tool now takes exactly one window, owned
  by exactly your app, and has no fallback to the whole screen.

## Instruments that tell the truth

A test rig is an instrument, and an instrument that cannot see must say
so. Archive Watch learned each of these the expensive way:

- A sleeping Apple TV returns a perfectly valid, perfectly black
  screenshot. So the agent asks the TV whether it is on before every
  capture, rather than guessing from the pixels.
- A screenshot left over from an earlier run looks exactly like a new
  one. So every capture deletes the old file first and refuses one more
  than a minute old.
- A check that returned "not on the home screen" whenever its text
  recognition failed was wrong for weeks, and nobody noticed, because it
  never said "I could not tell." Now it says so.
- **Pass, fail and skip are three numbers.** A skip is not a pass. A
  run that found zero results did not pass.
- **A test is not a test until you have seen it fail.** Break the code
  on purpose, watch the test catch it, then put the code back.

The full list, 26 of them, is in `docs/AUTONOMOUS-FLEET-TESTING.md`
and `docs/DEVICE-HARNESSES.md`, and the skills that carry them are
`device-observation-harness`, `autonomous-fleet-testing` and
`concurrent-agent-device-leases`.

## The same honesty, inside the app

Everything above is honesty you ask of the agent's instruments. Your app
owes the people who use it the same thing. Any part of it that runs on
its own (a computer opponent, a suggestion, a search that guesses, a
caption written by speech recognition) should say what it can do, say
how sure it is, step back when it is not sure, and never pass itself off
as a person. Tidbits Trivia's labeled computer opponent from stage 00 is
this rule. A reader that says "I could not tell" is the same rule,
turned toward you. The `learning-orientation-design` skill carries the
checklist.

## What it costs

A bench is hardware, and hardware is money and space. Archive Watch's
bench grew to fourteen devices, including two Rokus and a Samsung TV.
You do not need that. You need the device your people use and, if you
can find one, an old one. It also costs time: every run on a real device
is slower than a simulator run. That is why the ladder exists. Most
checks belong on the lower rungs, and only the ones that can fool the
lower rungs need to climb.

## Working with your agent

Start with what you have. My bench grew to fourteen devices, but it grew
one device at a time, months into building. One phone is enough for
this stage.

1. **Hand over the testing.** Tell the agent, in your own words, what I
   said on August 14: that it should see what you see, and that you
   should not be the one testing its work. Ask it to set itself up to
   test on your device. It will tell you the physical steps only you can
   do: turning on developer mode, trusting the computer, reading it a
   pairing code. Do those, and read it the codes.

2. **Say whose devices are whose.** Tell the agent which device is yours
   and must never be touched, which ones people in your home actually
   use and need asking about first, and which it may use freely. It
   writes those down as roles, and its tools refuse the devices you
   protected.

3. **Ask for proof with every "fixed."** From now on, when the agent
   says something works, ask to see it: a screenshot from your device, a
   measurement, a test that could have failed. Look at the screenshot
   yourself. If there is no way to prove the fix yet, ask for one. One
   of my earliest requests like that came in Bsky Dreams' first month,
   after three fixes for a doubled-up feed had not worked:

   > You have clearly not found the root cause of the issue, nor are you
   > actually testing to make sure that it is fixed before telling me
   > that it works. Please create a test for how you will determine if a
   > post is rendered a signgle time and continue to work until your
   > code passes that test.

4. **When it guesses, stop it.** If a fix fails twice, ask for research,
   or for a way to see the problem, before the next attempt. On
   September 6, I was watching a film at home while the agent chased an
   audio dropout, and it kept blaming AirPlay. I checked the one thing I
   could check from the couch:

   > I just confirmed. The audio went out on the TV speakers as well. It
   > ISN'T Airplay. Please stop guessing and figure out the issue.

5. **Keep living with the app.** The agent's instruments will miss
   things. You will catch them by using the app, and each one you report
   becomes a check the agent adds, so it does not miss that one again.

6. **Correct its manners.** If it leaves something playing, drives a
   device someone is using, or wakes a TV in the wrong room, say so, and
   ask for a rule so it never happens again.

**When you are ready to move on,** the agent has proven a fix to you
with a screenshot from your own device, your devices have roles, and
you have stopped being the first person to find its mistakes. The app
works, and you can prove it. Stage 05 puts it where other people can
install it.

Be ready to show the screenshot that proved a fix, and to say what it
would have looked like if the fix had not worked.
