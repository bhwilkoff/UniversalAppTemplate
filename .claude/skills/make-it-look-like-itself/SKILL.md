---
name: make-it-look-like-itself
description: "Use when an app built from this template still wears the template's look (its placeholder colors, fonts, shadows and icon), when the builder says 'it looks like every other app', 'make it ours', 'give it a look', 'design the brand', 'pick colors/fonts/icon', or at the stage 03 'make it look like itself' step. Researches real references first, proposes three distinct directions drawn from the app's own why, lets the builder choose or mix, then applies the chosen look in lockstep on every platform the app ships (web, Apple, Android, Windows) while keeping each platform's native idiom. Also the answer to store rejections for look-alike apps."
---

# Make it look like itself

Every app built from this template starts out looking like the template:
the web starter's neubrutalist shadows and Syne and Inter type, the
placeholder brand colors in each platform's theme file, and an empty
app icon. That look is a placeholder, and an app that ships wearing it
says nothing about the people it is for. It also looks like every other
app made from the same starting point, which the App Store (guideline
4.3) and Google Play both treat as a reason to reject.

The look should come from the app's own why. A trivia game for a
library's Thursday night and a tool for tracking seedlings with
neighbors should not share a palette, a typeface, or a voice.

## What stays and what changes

**Stays:** each platform's native idiom (SwiftUI, Material 3, Fluent,
the web's own controls), the six-level type ramp, the layout rules in
`mobile-first-density-design`, the four feature states, accessibility,
and parity. Same verb, native idiom.

**Changes:** the brand palette, the typeface on the web (and on native
where a custom face truly serves the app; system fonts are often the
right native answer), corner radius and density, the app icon and its
small mark, the illustration style if there is one, the shape of the
app's one core screen, and the voice of its words (which stay the
builder's own).

## The process

### 1. Read the why

Read the "Why we build" paragraph, the people the app is for, and its
one core action. Write down, in one sentence each, what the app should
feel like to those people and what it must never feel like.

### 2. Gather real references, before any drafting

Ask the builder for three to five things they love the look of: apps,
websites, posters, book covers, places, objects. Then do your own
research: find and look at (screenshot, if you have a browser) at least
ten real, well-made apps or sites in or near the app's subject, and note
concretely what each does with type, color, space, imagery, and its
one focal point. Drafting from memory produces the generic look this
skill exists to avoid.

### 3. Propose three directions that are truly different

For each direction:

- a short name and two sentences on how it feels, tied to the why;
- a palette (background, surface, text, muted text, one accent, the
  border, and dark-mode versions) with every text pair's contrast ratio
  checked to WCAG 2.2 AA;
- type: one family, or at most two, on the web, and what native uses;
- corner radius, density, and how the focused or selected thing stands
  out;
- an app icon concept that reads at 16 points and on a home screen;
- how the core screen changes shape, not only color.

Render each direction as a quick mockup of the app's real core screen
with real data, at phone width and desktop width, in light and dark,
and show the builder the images. Words alone cannot carry a look.

**Avoid the tells of machine-made design:** purple and blue gradients,
glassmorphism (except the platform's own Liquid Glass on Apple), emoji
as icons, a hero with three feature cards, generic stock imagery, fake
handwriting, more than two typefaces, stamps and tape and "draft"
effects, and anything borrowed from another app's trade dress.

### 4. The builder chooses, or mixes

Let the builder pick one, or take parts from two. Iterate on the chosen
one at least once before it ships (principle 4). Record the decision in
`DECISIONS.md` with the why first, and add it to the platform design
docs if they exist.

### 5. Apply it in lockstep

Change every platform the app ships, in the same round, so that parity
holds:

| Platform | Where the look lives |
|---|---|
| Web | `css/styles.css` `:root` tokens; font links in `index.html`; remove the neubrutalist shadows if the direction does not use them |
| Apple (iOS, iPadOS, macOS, tvOS) | `apple/Assets.xcassets` (AccentColor, AppIcon); create `apple/Core/Design.swift` for brand colors (`Color.brandPrimary`, never `Color.primary`) |
| Android | `android/app/src/main/java/.../ui/theme/Color.kt`, `Type.kt`, `Theme.kt`; launcher icon resources |
| Windows | `windows/AppName.App/App.axaml` brand resources and the pinned accent styles |
| Stores and web share | the app icon in every required size, the Open Graph image, store screenshots |

Keep the token names identical across platforms (the token table in
`AGENTS.md`), and keep brand tokens separate from semantic ones (success,
warning, and error colors carry meaning and do not change with the
brand).

### 6. Prove it

Screenshot the core screen on every platform, light and dark, phone and
desktop, and look at them side by side with the template's original
look. Check the contrast of every text pair again in the real build.
The look is done when someone who knows the template would not
recognize it, and someone who knows the app's people would.

## In a cohort

Classmates build from the same template at the same time, so this step
is also how a cohort's apps stop looking like siblings. Bring the three
directions to the show-and-tell before choosing, and tell the cohort why
the chosen one fits the people the app is for.
