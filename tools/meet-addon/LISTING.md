# Listing the Meet add-on publicly

*Written by Claude, awaiting Ben's review. Researched October 4, 2026.*

I want students on their own Gmail accounts to be able to use Human
Shaped inside a call, and a private add-on cannot reach them: it only
reaches accounts in humanshaped.org. So the add-on has to be listed
publicly on the Google Workspace Marketplace, which means Google reviews
it first. This is everything that listing needs, in the order you would
do it in one sitting, with the exact words and files for each field.

## Before you start: what only you can supply

- **Your legal name or the organization's**, as the developer, and a
  **physical address**. Google asks for both in the developer details,
  and /terms/ and /support/ now name Learning is Change, Inc., 8287 S
  Pennsylvania Ct., Littleton, CO 80122 (Ben, October 4).
- **A support email that someone reads.** The pages say
  meet@humanshaped.org today. If nobody reads it, give me the address
  that is read and I will change the pages.
- **Whether you are a "trader"** under EU law (selling to people in the
  EEA as a business). Human Shaped is free, so the honest answer is
  likely non-trader; it is a question Google asks and only you can
  answer.
- **Proof you own humanshaped.org** in Google Search Console (one TXT
  record at WordPress.com, where the DNS lives). Google's brand
  verification needs it for the consent screen.

## What Google checks

From [App review process and requirements](https://developers.google.com/workspace/marketplace/about-app-review):

- **Review takes time:** "App review typically takes several days."
  Plan for a few weeks, since a request for changes starts the clock
  again.
- **Visibility is permanent:** "Once you choose a visibility option and
  save the App Configuration page, you can't change your selection
  later" ([configure the SDK](https://developers.google.com/workspace/marketplace/enable-configure-sdk)).
  Public is the choice that reaches students. Unlisted is a kind of
  public listing that does not show in search; Google's pages do not say
  it skips review, so plan as if it does not.
- **Consent screen:** it must be **External** and **In production**, and
  the app must pass verification. With no sensitive scopes this is brand
  verification: a home page on a verified domain that describes the app
  and links the privacy policy, and the same privacy link on the consent
  screen ([OAuth app verification](https://support.google.com/cloud/answer/13464321)).
- **For every app:** the name matches the consent screen, is 50
  characters or less, and is not generic; the short and long
  descriptions differ; every link works; there are no obvious bugs and
  it is "not meant for testing purposes"; sign-in is asked for only
  once, and sign-out works; icons are "sized correctly, square, and have
  transparent backgrounds," in color.
- **For Meet add-ons:** the add-on works "even if third-party cookies
  are disabled"; it is responsive and "must not have horizontal scrolling
  within the iframe"; "When the user isn't already signed in, the add-on
  must present the One Tap sign-in prompt"; the logo is identifiable,
  and dark mode logos are set in the manifest.

## What still has to change before we submit

These are not listing work, and they are the honest risks to review:

1. **Sign-in.** Review asks for Google's One Tap prompt when someone is
   not signed in, and the Meet sign-in guide calls One Tap "strongly
   recommended" with a Google sign-in button as the fallback
   ([sign-in guide](https://developers.google.com/workspace/meet/add-ons/guides/sign-in-guide)).
   Human Shaped signs in with GitHub. The likely answer is to offer One
   Tap first and link the Google account to the person's GitHub
   sign-in on humanshaped.org once, in a small window (the guide's own
   advice for "other mechanisms"), but that is a change to how the hub
   signs people in, so it is a decision for you.
2. **Third-party cookies off.** The panel's sign-in uses the Storage
   Access API and then a small window that hands the sign-in back. That
   should work with third-party cookies blocked, but nobody has tried
   it in Chrome with them blocked yet.
3. **The panel's layout.** In the screenshots, the numbers on the
   activity row sit on top of the activity names (Queue, Checks). Review
   reads screenshots for being "hard to read," and the redesign of the
   panel (research/notes/run-of-show-design.md) will change these
   screens anyway, so take the screenshots again after it, with
   `python3 tools/mark/make_listing.py`.
4. **Not a work in progress.** Review turns down apps "meant for testing
   purposes." Submit once the redesigned teacher and student views have
   been through a real call with someone on a Gmail account.

## The files

`python3 tools/mark/make_listing.py` draws all of these from the site's
own pages and brand files (Chrome and macOS's sips are all it needs):

| File | What it is for |
|---|---|
| `listing/icon-32.png`, `icon-48.png`, `icon-96.png`, `icon-128.png` | Application icons. Google asks for 32 and 128 at least, and 48 and 96 when there is a web app. Transparent corners, in color. |
| `listing/banner-220x140.png` | The application card banner, 220 by 140. |
| `listing/screenshot-1-welcome.png`, `screenshot-2-question.png`, `screenshot-3-showing-work.png` | Screenshots, 1280 by 800 (the recommended size; up to 10 are allowed). The real main stage and side panel with sample data, labeled as sample data. |
| `listing/logo-light-512.png`, `logo-dark-512.png` | Meet's logos. The same files are at `assets/brand/meet-logo-light.png` and `meet-logo-dark.png`, which `deployment.json` now points to. |

## In one sitting, as meet@humanshaped.org

Each step names the screen and what goes in each field.

1. **Prove you own the domain.** In
   [Search Console](https://search.google.com/search-console), add the
   property humanshaped.org as a Domain, copy the TXT record it gives
   you into WordPress.com's DNS for humanshaped.org, and press Verify.
2. **Update the deployment.** In the Cloud console, Google Workspace
   Marketplace SDK, HTTP Deployments, open `human-shaped`, and replace
   its JSON with all of `tools/meet-addon/deployment.json` (it now names
   the light and dark logos). Save. *(The agent can do this step.)*
3. **Finish the consent screen.** Google Auth Platform:
   - **Branding:** App name `Human Shaped`; user support email (the one
     you chose above); app logo `listing/icon-128.png`; app home page
     `https://humanshaped.org`; privacy policy
     `https://humanshaped.org/privacy/`; terms of service
     `https://humanshaped.org/terms/`; authorized domain
     `humanshaped.org`; developer contact email (yours).
   - **Audience:** External, then **Publish app** to move it to In
     production. With no scopes, Google asks for brand verification;
     submit it from the Verification Center.
4. **App Configuration** (Marketplace SDK):
   - **App visibility:** Public. *This cannot be changed after saving.*
   - **Installation settings:** Individual + Admin Install, so a
     student or a teacher can install it themselves and a school's admin
     can install it for everyone.
   - **App integration:** Google Meet add-on, deployment `human-shaped`.
   - **OAuth scopes:** none beyond what Meet add-ons need by default.
   - **Developer information:** developer name (your legal name or the
     organization's), developer website `https://humanshaped.org`,
     developer email (the one someone reads), trader status.
   - **Links:** terms `https://humanshaped.org/terms/`, privacy
     `https://humanshaped.org/privacy/`, support
     `https://humanshaped.org/support/`.
5. **Store listing:**
   - **Application name:** `Human Shaped`
   - **Short description** and **detailed description:** below.
   - **Category:** Education.
   - **Application icons:** the four `listing/icon-*.png` files.
   - **Application card banner:** `listing/banner-220x140.png`.
   - **Screenshots:** the three `listing/screenshot-*.png` files.
   - **Support links:** terms, privacy, and support, as above.
   - **Pricing:** Free.
6. **Publish.** Press Publish on the store listing. The listing shows
   as under review; Google writes to the developer email when it is
   approved or needs changes.

## The words

### Short description (under 200 characters)

> Run a Human Shaped cohort session inside Google Meet: this week's
> plan and timers, work people want to show, and questions for everyone,
> in the side panel and on the main stage.

### Detailed description

> Human Shaped is a free, five-week course for people who build software
> with AI for the people who will use it, not for profit. This add-on
> is how a session runs inside Google Meet.
>
> The side panel knows which cohort and week the call belongs to, from
> the call itself, so nobody picks anything by hand. A teacher sees the
> part of the session that is happening now and its timer, the work
> people asked to show, the questions they want to ask everyone, and the
> rooms each small group meets in. The main stage shows one thing at a
> time, large and calm: a welcome as people arrive, a question with its
> count of answers when the teacher chooses to show it, or someone's
> work while they talk about it.
>
> What it does not do matters as much. It never records, transcribes,
> or measures who talks. It never joins the call as a participant. It
> asks Google for no permissions, and the only thing it reads from Meet
> is the call's meeting code. Answers to questions are counted without
> names on the stage.
>
> Signing in uses your humanshaped.org account. Everything is free, and
> what you build in a cohort is yours.

### Privacy, in short (for anywhere the listing asks)

> Human Shaped reads only the call's meeting code from Google Meet, to
> find the cohort the call belongs to. It asks for no Google
> permissions, reads no Google account data, and records nothing. What
> the hub keeps, who can read it, and how to delete it are on
> https://humanshaped.org/privacy/.

## Do the pages cover what review asks?

- **/privacy/** says what the add-on reads from Meet (only the meeting
  code), that it does not record or join the call, what is kept and for
  how long, how to delete it, and that nothing is sold. That covers
  "how your app accesses, uses, stores, and shares Google user data."
  **Gap:** the developer's legal name and address.
- **/terms/** covers the add-on and how to ask questions. **Gap:** the
  legal name and address (placeholders in comments).
- **/support/** covers where to ask and the add-on. **Gap:** a support
  address someone reads, if meet@ is not read.
- **The home page** links the privacy page, which brand verification
  asks for.
