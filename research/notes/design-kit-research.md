# The design kit: research and recommendation

October 21, 2026. Ben wants "a consistent platform", "rules that we can
rely upon as we continue to build features", and a kit that is "fully
research based". This note is that research, and a recommendation for
each component the three audits in `audit-2026-10-21/` call for. It is
meant to become DESIGN-KIT.md (which `assets/ui.js` and PAGES.md already
name, though the file does not exist yet), so each rule here is written
to be quoted.

How to read it. Section 1 says what the site already has. Section 2 is
what mature design systems and research say, component by component,
each claim with its source. Section 3 weighs the design skills installed
for agents. Section 4 sets the site's own rules beside the systems and
says how to reconcile them. Section 5 is the writing rules. Section 6 is
the kit itself, one entry per component. Section 7 lists the mechanical
checks. Section 8 lists what could not be verified.

A note on sources. Most pages were read directly. Three were read from
their published source instead of the live site, and say so: Primer's
rules come from its docs repository
(https://github.com/primer/design/tree/main/content), last committed
July 1, 2025, so the live site may be a little newer; Polaris's from the
MDX that builds polaris.shopify.com
(https://github.com/Shopify/polaris/tree/main/polaris.shopify.com/content),
because the live site would not load; and Material 3 from the rendered
page in a browser. Where a recommendation is a judgment with no source
behind it, it says "judgment".

---

## 1. What the site has now

- **The audits** found the interface explaining itself in sentences
  where a component would do: about 35 privacy sentences, 25 state
  sentences, 18 empty states written as "X, so Y", 10 surfaces whose
  facts became prose, 8 success messages carrying explanation, and four
  different confirmation patterns on each side of the site
  (`audit-2026-10-21/member-pages.md`, `teacher-pages.md`,
  `live-admin-shared.md`). They also found one real contradiction prose
  cannot hold: a cohort-only exchange whose Drive video is link-shared.
- **`assets/ui.js`** begins the kit: `status(tone, label)` with tones
  done, waiting, off, alert, and time; `visibility(who)` with seven
  audiences (Only you, Stays on this computer, You and your teachers,
  Your cohort, Human Shaped members, Anyone with the link, Everyone);
  `facts(pairs)` as a `<dl>`; `row()` and `rows()`; `empty(text,
  action)`; `disclosure(summary, content)`; and `button` and `link`.
  The CSS for these is the `ui-` block near the end of `site.css`, plus
  `.ui-toolbar`. Two gaps: `status` takes any label, and `visibility`
  takes a label that overrides its fixed words, so neither yet holds a
  fixed vocabulary.
- **The site's own rules** (design-patterns.md, links-and-actions-notes.md,
  ai-design-anti-patterns.md, DECISIONS.md): no pill badges or status
  chips with nothing behind them (D14), no tracked capitals (D2), no
  colored stripes on a card's edge (D6), color only inside inset panels
  (pattern 1), forest for what can be clicked and thistle for what is
  current (pattern 5), at most three text styles in a section (pattern
  9), one filled button per group and first, red only for what is hard
  to undo and last, everything in a row of actions a button (pattern 7,
  checked by `tools/test/action-styles.test.mjs`), and PAGES.md's seven
  rules (one page per kind of thing, making is its own page, role shown
  by the interface and not a sentence).
- **One doc conflict remains.** DECISIONS.md, "Every page says what it
  is, whose view it is, and what it is for", still says "a role line
  instead of a role switcher", while PAGES.md rule 5 and the navigation
  note's "No role line (superseded October 21, 2026)" say the opposite.
  DECISIONS.md should be corrected first, or a later session will put the
  role sentences back.
- **`window.confirm`** is still called in `assets/exchange.js` and
  `assets/teach-times-poll.js`.

---

## 2. What mature systems and research say

### 2.1 Status labels (GOV.UK Tag, Primer Label and StateLabel, Polaris Badge)

- **Status only, never a control.** GOV.UK: "Do not make a tag
  interactive by making it into a link or button", because people will
  not expect to press it and pressable and non-pressable tags would look
  alike (https://design-system.service.gov.uk/components/tag/). Shopify:
  "Badges are read-only indicators. They can't contain links, buttons,
  or other interactive elements"
  (https://shopify.dev/docs/api/customer-account-ui-extensions/latest/web-components/feedback-and-status-indicators/badge.md).
  Material makes the same split from the other side: "Chips aren't
  buttons", chips are always interactive, and a separate Badge shows
  counts or status (https://m3.material.io/components/chips/guidelines).
- **Few states.** GOV.UK: start with as few as will work, since "The
  more you add, the harder it is for users to remember them"
  (https://design-system.service.gov.uk/components/tag/), and "Start
  with the smallest number of different statuses you think might work"
  (https://design-system.service.gov.uk/patterns/complete-multiple-tasks/).
  Primer's StateLabel is a fixed set for issues and pull requests:
  draft, open, closed, merged, unavailable
  (https://primer.style/product/components/state-label/).
- **Word form.** GOV.UK: "Use adjectives (descriptive words) and not
  verbs (action words)" (https://design-system.service.gov.uk/components/tag/).
  Polaris: "Use a single word", two only for a complex state ("Partially
  refunded"), "Always describe the tone in the past tense. For example,
  refunded not refund", and "Don't use alternatives to existing badge
  options" (https://polaris.shopify.com/components/feedback-indicators/badge).
  Shopify's App Home badge: "Keep labels to 1-2 words" and "Use
  consistent tones for the same status across your app"
  (https://shopify.dev/docs/api/app-home/web-components/feedback-and-status-indicators/badge.md).
- **Never color alone.** GOV.UK: "Do not use colour alone to convey
  information" (https://design-system.service.gov.uk/components/tag/).
  Primer: "you can't rely on the scheme/variant alone to give meaning…
  Make sure that the label text provides sufficient meaning/context on
  its own" (https://primer.style/product/components/label/). WCAG 1.4.1
  (Level A): color is not "the only visual means of conveying
  information" (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- **Sentence case, not capitals.** GOV.UK Frontend 5.0 changed tags so
  "Text within the tag is no longer bold and uppercase with extra letter
  spacing", because "uppercase text can be harder to read", and changed
  their colors "to make them more distinguishable from buttons"
  (https://github.com/alphagov/govuk-frontend/releases/tag/v5.0.0;
  https://design-system.service.gov.uk/components/tag/). Some users had
  tried to click the old dark tags, thinking they were buttons (same
  page).
- **What tones mean.** Polaris: Success for "a successful, completed, or
  desirable state", Attention for something that "requires merchants'
  attention but the issue isn't critical", Warning for "time-sensitive
  issues… often reversible", Critical for "critical and irreversible
  issues", and of the last two, "seeing this badge can feel stressful…
  it should only be used when absolutely necessary"
  (https://polaris.shopify.com/components/feedback-indicators/badge).
  GOV.UK: "Do not use the red background colour for any status text
  except errors" (https://design-system.service.gov.uk/patterns/complete-multiple-tasks/).
- **Primer Label markup.** A plain `<span>` with no semantics; a set of
  labels belongs in a `<ul>`; every variant meets 4.5:1
  (https://primer.style/product/components/label/).

### 2.2 Task lists and checklists (GOV.UK Task list and Complete multiple tasks)

- Use only when people cannot finish in one sitting or must choose the
  order; not for a fixed-order flow, and not to show answers
  (https://design-system.service.gov.uk/components/task-list/).
- The whole row is the link, with a title, an optional hint, and a
  status; the link points `aria-describedby` at the hint and status.
  Statuses were made to look less like buttons after users tried to
  click them, and "Completed" lost its colored background because
  unfinished tasks got hard to spot once many were done (same page).
- The status words: "Completed" (plain black text, no background),
  "Incomplete", "In progress", "Not yet started", "Cannot start yet"
  (grey text, row not linked), and "There is a problem" (red, only when
  an error cannot be avoided)
  (https://design-system.service.gov.uk/patterns/complete-multiple-tasks/).
- Hints are one short sentence, no full stops, no links; sentence case
  because uppercase "makes them harder to read"
  (https://design-system.service.gov.uk/components/task-list/).

### 2.3 Key facts (GOV.UK Summary list, Primer PageHeader, Polaris Page)

- GOV.UK's Summary list shows key facts as a `<dl>`: "only use it to
  present information that has a key and at least one value", and "Do
  not use it for tabular data or a simple list of information or tasks"
  (https://design-system.service.gov.uk/components/summary-list/). For a
  missing value, put a link to the question in the value column, not a
  Change link (same page). Summary cards need a unique title and at most
  "2 to 3 actions" (same page).
- Primer's PageHeader is "the title area at the top of the main content
  region that shows the user where they are": a context area (parent
  link or breadcrumbs), the title, actions, a description, and a
  navigation slot (https://primer.style/product/components/page-header/).
- Polaris: "Always provide a title", "Always provide breadcrumbs when a
  page has a parent page", one primary activity as "a primary button in
  the page header", titles in "as few words as possible" and "Not be
  truncated"; a secondary action can be a verb alone when the noun is
  the page's own object ("Import", not "Import orders")
  (https://polaris.shopify.com/components/layout-and-structure/page).

### 2.4 Navigation rows, tabs, and segmented controls

- **Primer UnderlineNav**: switch "between 2 or more related views", each
  with "discrete content with a unique URL"; one selected by default;
  "not a pattern for navigating stepped flows"; no more than 2 levels and
  no stacked underline navs; labels "clear, short, and concise", "Do not
  rely on leading visuals, tooltips, or supplemental descriptions";
  icons all or none; with several counters, "wait for all the data to be
  ready before displaying the counters"; overflow collapses into a menu;
  `aria-current="page"` (https://primer.style/product/components/underline-nav/).
- **GOV.UK Service navigation**: the current item carries
  `aria-current`, links sit in a labeled `<nav>`, with a Menu toggle on
  small screens (https://design-system.service.gov.uk/components/service-navigation/).
- **NN/g tabs**: "The fewer tabs, the better", "Tab labels should usually
  be 1-2 words", "Use at least two selection indicators", one row, above
  the panel, avoid all caps, don't mix in-page and navigation tabs
  (https://www.nngroup.com/articles/tabs-used-right/). Material: "Avoid
  using more than four tabs at once" and "Use tabs to group related
  content, not sequential content"
  (https://m3.material.io/components/tabs/guidelines).
- **APG Tabs** (in-page tab panels only): `tablist`, `tab`, `tabpanel`,
  `aria-selected`, arrow keys move between tabs
  (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
- **WCAG 3.2.3** (AA): repeated navigation stays "in the same relative
  order" (https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html);
  the navigation note already records that inserting an item for a role
  keeps the order.
- **Segmented controls**. Primer: pick one value "and immediately apply
  that selection"; "2–5 choices with text labels"; labels "should be
  nouns or noun phrases" and "may not wrap"; it is a list of buttons,
  "Do not treat a segmented control like" a radiogroup, tablist, or
  toolbar; arrow keys do not move selection
  (https://primer.style/product/components/segmented-control/). Apple:
  "closely related choices that affect an object, state, or view", about
  five segments on a phone, "Use nouns or noun phrases", text or images
  but not both, and for "completely separate sections" use a tab bar
  instead (https://developer.apple.com/design/human-interface-guidelines/segmented-controls).
  Material: 2 to 5 choices, "Don't allow segments to wrap", and segmented
  buttons are now "no longer recommended" in its expressive update in
  favor of a connected button group
  (https://m3.material.io/components/segmented-buttons/guidelines).
- **Apple tab bars** are "only to enable navigation, not to help people
  perform actions" (https://developer.apple.com/design/human-interface-guidelines/tab-bars,
  as cited in navigation-and-wayfinding-notes.md).

### 2.5 Breadcrumbs and back links

- GOV.UK: breadcrumbs help people "understand where they are within a
  website's structure and move between levels"; not on flat sites or in
  linear journeys; placed before `<main>`; start at home and end at the
  parent (the rule to include the current page was removed in June
  2020); can collapse to first and last on small screens; `<nav
  aria-label="Breadcrumb">` (https://design-system.service.gov.uk/components/breadcrumbs/).
- GOV.UK Back link: "Never use the back link component together with
  the Breadcrumbs component"; text "Back" by default
  (https://design-system.service.gov.uk/components/back-link/).
- NN/g: breadcrumbs "augment but do not replace" the main navigation,
  show hierarchy not history, follow one canonical path, link only to
  real pages, and on desktop "always show the full trail"
  (https://www.nngroup.com/articles/breadcrumbs/). NN/g also says the
  current page "should not be a link", and APG marks the current page
  with `aria-current="page"` (https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/);
  both assume the trail ends at the current page, which GOV.UK and this
  site do not.

### 2.6 Lists of things (Primer ActionList, Polaris IndexTable)

- Polaris IndexTable: rows "perform an action when clicked", opening the
  detail page; paginate past 50; right-align numbers; "Indicate when not
  all members of a resource are being shown"
  (https://polaris.shopify.com/components/tables/index-table).
- Primer ActionList: don't mix single and multi-select in one list;
  danger items "at the end of the list"; "For destructive or irremediable
  actions, show a confirmation dialog… If the action is not destructive,
  present the user a way to undo… Never use a warning when you mean
  undo"; filtered lists announce results with `role="status"`
  (https://primer.style/product/components/action-list/).
- Primer ActionMenu: no form inputs inside a menu; icons on every item or
  none; focus returns to the trigger on close; 24 by 24 px targets
  (https://primer.style/product/components/action-menu/).
- Polaris Card: "only one primary call to action per card", optional
  persistent actions such as Edit at the upper right
  (https://polaris.shopify.com/components/layout-and-structure/card).

### 2.7 Empty states (NN/g, Primer Blankslate, Polaris EmptyState)

- NN/g's three guidelines: show system status ("Totally empty states
  cause confusion about how and whether the system is working"), give
  learning cues ("Star your favorites to list them here"), and give
  direct pathways ("link directly to the steps that need to be taken")
  (https://www.nngroup.com/articles/empty-state-interface-design/).
- Primer: a placeholder "to tell users why content is missing"; primary
  text "should sound welcoming, human, and convey the intention of the
  feature"; secondary text "brief and non-redundant"; "one primary
  action" that leads to the creation flow; for errors, no playful
  graphic, "Default to using the alert icon", and avoid both "There was
  a problem" and over-technical detail
  (https://primer.style/product/ui-patterns/empty-states/;
  https://primer.style/product/components/blankslate/).
- Polaris: "Be encouraging and never make merchants feel unsuccessful or
  guilty", "Use only one primary call-to-action button", an
  action-oriented title, and the button in "{verb}+{noun}" form ("Create
  order", not "New order")
  (https://polaris.shopify.com/components/layout-and-structure/empty-state).

### 2.8 Feedback: banners, toasts, inline status

- **NN/g** separates indicators (passive, contextual), validations
  (errors about input, which the person must resolve), and notifications
  (system events, action-required or passive). A toast is "a small
  nonmodal popup that disappears after a few seconds" and "would be a bad
  way to implement an error message"; one participant waited five minutes
  for content because the error faded after five seconds
  (https://www.nngroup.com/articles/indicators-validations-notifications/).
- **Primer Saving**: if success is not obvious, use an inline message or
  a banner; avoid toasts on github.com because of their accessibility
  problems (https://primer.style/product/ui-patterns/saving/). Primer
  notification messaging: "Use success messaging sparingly and rely more
  on interaction context", and place messages near the action
  (https://primer.style/product/ui-patterns/notification-messaging/).
  Primer deprecated its Flash component for Banner
  (https://github.com/primer/design/blob/main/content/deprecated-components/flash.mdx).
- **Material Snackbar**: one at a time, one action at most, "Avoid using
  auto-dismissing snackbars on web unless there's also inline feedback",
  and snackbars "shouldn't be the only way to access a core use case"
  (https://m3.material.io/components/snackbar/guidelines).
- **Polaris Toast** (now deprecated for App Bridge's): short messages to
  confirm an action, "Not go over 3 words", "noun + verb" ("Product
  updated", not "Your product has been successfully updated"), "Rarely be
  used for error messages", and an action only "if the same action is
  available elsewhere on the page"
  (https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/deprecated/toast.mdx).
- **WCAG 2.2.1** (A): a message that disappears on its own after a set
  time is a time limit; a five-second new-mail toast passes only because
  the same information is in the Inbox
  (https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).
  APG: "avoid designing alerts that disappear automatically"
  (https://www.w3.org/WAI/ARIA/apg/patterns/alert/).
- **WCAG 4.1.3** (AA): status messages must reach assistive technology
  "without receiving focus", by `role="status"` (a cart count) or
  `role="alert"` (an error)
  (https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
  Primer: the status element "must always be rendered", not inserted
  with its message (https://primer.style/product/ui-patterns/loading/).
- **Banners.** GOV.UK Notification banner: "Use notification banners
  sparingly" because "people often miss them"; for something about the
  current page, use the content (Inset text or Warning text) instead;
  never on the same page as an error summary; one per page, before the
  `h1`; the success variant uses `role="alert"`, the important variant
  `role="region"`; headings kept the same across the service (WCAG
  3.2.4) (https://design-system.service.gov.uk/components/notification-banner/).
  Primer Banner: "Use banners sparingly", "Do not display more than one
  banner… on a single page at the same time", a required title, at most
  two actions, a fixed icon per variant, and success "only… if the
  success is not easily apparent in the UI"
  (https://primer.style/product/components/banner/). Polaris Banner: "1
  to 2 sentences", "Explain how to resolve the issue", no more than one
  primary action, `role="alert"` only for critical and warning
  (https://polaris.shopify.com/components/feedback-indicators/banner).
- **Warning and inset text.** GOV.UK Warning text: for "legal
  consequences of an action" and the like, an "!" icon hidden from
  screen readers, the message in `<strong>`, and visually hidden
  "Warning" text (https://design-system.service.gov.uk/components/warning-text/).
  Inset text: "Use inset text very sparingly", some people miss it near
  prominent elements, and do not use it for very important information
  (https://design-system.service.gov.uk/components/inset-text/).

### 2.9 Confirmation

- **NN/g**: confirm only consequential actions (destroying work, costing
  money, irreversible), "if you cry wolf too many times, people will stop
  paying attention", be specific instead of "Are you sure?", buttons named
  for the outcome ("Delete file" and "Keep file"), no default Yes, a typed
  word only for rare and very dangerous actions, and undo where possible
  (https://www.nngroup.com/articles/confirmation-dialog/).
- **Primer ConfirmationDialog**: for "actions that have serious,
  permanent, or widespread impacts", not for frequent or low-risk ones
  ("this creates fatigue"); a "clear, specific question", "ideally under
  5 words", never "Are you sure?" or "Delete?"; "Explain consequences",
  and not "This action cannot be undone." alone; buttons "1-3 words",
  imperative ("Delete repository" and "Cancel"); initial focus on Cancel
  when the confirm button is dangerous
  (https://primer.style/product/components/confirmation-dialog/guidelines/;
  https://primer.style/product/components/confirmation-dialog/).
- **Apple alerts**: "Use alerts sparingly", avoid them "for common,
  undoable actions, even when they're destructive", button titles of one
  or two words "that describes the result", and "Always use 'Cancel'"
  for the cancel button
  (https://developer.apple.com/design/human-interface-guidelines/alerts).
- **GitHub** confirms widening a repository's visibility in its Danger
  Zone with "I have read and understand these effects"
  (https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility).
- **WCAG 3.3.4** (AA): deleting a person's data must be reversible,
  checked, or confirmed
  (https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html).
- **The element.** MDN `<dialog>` with `showModal()` makes the rest of
  the page inert, closes on Esc, and should include "an explicit button"
  to close (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).
  APG Alert dialog: `alertdialog`, `aria-labelledby`, and
  `aria-describedby` pointing at the message
  (https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/). Primer Dialog:
  the close button "may not be visually hidden", and live regions go
  inside the dialog (https://primer.style/product/components/dialog/guidelines/).

### 2.10 Forms: labels, hints, errors, saving

- **Labels, not placeholders.** GOV.UK: "Do not use placeholder text in
  place of a label, or for hints or examples", because it vanishes, not
  all screen readers read it, and its default styling often fails
  contrast (https://design-system.service.gov.uk/components/text-input/).
  NN/g: "Disappearing placeholder text strains users' short-term memory"
  and people "may mistake a placeholder for data that was automatically
  filled in" (https://www.nngroup.com/articles/form-design-placeholders/).
  Primer: "Placeholder text is never an acceptable substitute for a
  label"; labels "no more than 3 words", sentence case
  (https://primer.style/product/ui-patterns/forms/).
- **Hints.** GOV.UK: "Use hint text for help that's relevant to the
  majority of users" (https://design-system.service.gov.uk/components/text-input/);
  "Keep each hint to a single short sentence, without any full stops"
  and "Do not use links in hint text"
  (https://design-system.service.gov.uk/patterns/question-pages/).
- **Error messages.** GOV.UK: an empty field gets an instruction
  starting "Enter" or "Select" ("Enter your first name"); an invalid one
  a description with "must" ("Name must be 35 characters or less"); the
  message matches the label; avoid "please", "sorry", "valid",
  "invalid", "you forgot", and humor; never "An error occurred", "Select
  an option", or "This field is required"; do not clear fields; a
  visually hidden "Error:" prefix and `aria-describedby`; and never use
  an error message to say someone lacks permission
  (https://design-system.service.gov.uk/components/error-message/).
- **Error summary.** GOV.UK: always shown on a validation error, headed
  "There is a problem", worded the same as the inline messages, above
  the `h1`, focus moved to it, each item a link to its field
  (https://design-system.service.gov.uk/components/error-summary/).
  Primer: validate on submit; with three or more errors show a summary,
  otherwise focus the first invalid field; `aria-invalid` and
  `aria-describedby`; "Live regions should not be used for form
  validation" (https://primer.style/product/ui-patterns/forms/).
- **Disabled buttons.** GOV.UK: "Disabled buttons have poor contrast and
  can confuse some users, so avoid them if possible"
  (https://design-system.service.gov.uk/components/button/). Primer: "Do
  not disable or hide a form's save button" and "There should only be one
  save button on a page" (https://primer.style/product/ui-patterns/saving/).
- **Saving.** Primer: "Start with an explicit saving pattern… never mix
  save patterns in a single form"; toggles and segmented controls save
  at once; text fields, checkbox groups, and selects save with a button;
  preserve data on error (https://primer.style/product/ui-patterns/saving/).
  NN/g: "Toggle switches should take immediate effect" and do not belong
  in forms with a Submit button
  (https://www.nngroup.com/articles/toggle-switch-guidelines/).
- **WCAG**: 3.3.1 errors identified and described in text, 3.3.2 labels
  or instructions for input, 3.3.3 suggest the correction when known,
  1.3.1 labels and groups in markup (`<label>`, `<fieldset>`)
  (https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html;
  https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html;
  https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html;
  https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).

### 2.11 Progressive disclosure

- NN/g: "Initially, show users only a few of the most important
  options", the path to the rest obvious and clearly labeled, and
  "Designs that go beyond 2 disclosure levels typically have low
  usability" (https://www.nngroup.com/articles/progressive-disclosure/).
  Accordions suit people who need "only a few key pieces of content"
  (https://www.nngroup.com/articles/accordions-complex-content/).
- GOV.UK Details: for "information that only some users will need",
  never to "hide information that the majority of your users will need";
  "some users avoid clicking the link to show more details" thinking it
  leaves the page (https://design-system.service.gov.uk/components/details/).
- Primer: "Pair progressive disclosure icons with descriptive text", use
  it sparingly, chevron for collapsible content, text-only toggles
  discouraged (https://primer.style/product/ui-patterns/progressive-disclosure/).
- APG Disclosure: a `button` with `aria-expanded`
  (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). MDN: native
  `<details>` needs a `<summary>`, and a shared `name` makes an
  exclusive accordion without script
  (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details).

### 2.12 Loading

- NN/g: under 1 second, no indicator; about 2 to 10 seconds, a skeleton
  for a page or a spinner "on a single module"; over 10 seconds, a
  progress bar; skeletons that show only the frame "should not be used as
  a progress indicator" (https://www.nngroup.com/articles/skeleton-screens/).
  The limits behind this are 0.1, 1, and 10 seconds
  (https://www.nngroup.com/articles/response-times-3-important-limits/).
- Primer: under 1 second "Don't show a loading state"; 1 to 3 seconds
  indeterminate; 3 to 10 determinate; avoid layout shift; label the
  indicator specifically ("loading status checks"); `role="status"`
  always rendered; `aria-busy` while updating
  (https://primer.style/product/ui-patterns/loading/).

### 2.13 Counts

- Primer CounterLabel: "Always use counter label with adjacent text that
  provides supplementary information regarding what the count is for"
  (https://primer.style/product/components/counter-label/).
- Material tab badges: "Limit badge content to four characters" and clear
  them once the content is seen
  (https://m3.material.io/components/tabs/guidelines). Apple: "Reserve
  badges for critical information so you don't dilute their impact and
  meaning" (https://developer.apple.com/design/human-interface-guidelines/tab-bars).

### 2.14 Icons and labels, recognition, and system status

- NN/g: "text labels are necessary to communicate the meaning and reduce
  ambiguity", "Icon labels should be visible at all times", and only a
  few icons are universal (https://www.nngroup.com/articles/icon-usability/).
- NN/g heuristic 1: "clearly communicate to users what the system's state
  is"; "A lack of information often equates to a lack of control"
  (https://www.nngroup.com/articles/visibility-system-status/).
- NN/g heuristic 6: make "information and interface functions visible",
  and "Instead of showing general tutorials, use contextual tips
  tailored to the page" (https://www.nngroup.com/articles/recognition-and-recall/).
- WCAG 3.2.4 (AA): "Components that have the same functionality within a
  set of web pages are identified consistently"
  (https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html).
  WCAG 2.5.3 (A): the accessible name contains the visible label,
  ideally at its start (https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html).
- WCAG 2.5.8 (AA): targets at least 24 by 24 CSS pixels, or spaced so a
  24 px circle around each does not touch another
  (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
  2.4.7 focus visible, 2.4.11 focus not entirely hidden by sticky
  content, 1.4.11 3:1 for the parts that identify a control and its
  state (https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html;
  https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html;
  https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### 2.15 Who can see it: visibility markers

- **Slack**: "Public channels" (anyone in the workspace but guests can
  find and join) and "Private channels" (joined only when a member adds
  you) (https://slack.com/help/articles/360017938993-What-is-a-channel);
  a lock beside a private channel's name
  (https://slack.com/blog/collaboration/slack-essentials-organize-your-work-and-conversations);
  shared channels sit under "Connections" with a double-diamond icon,
  outside people carry their company's logo on their picture, and the
  message box reminds you "external partners are in the channel"
  (https://slack.com/resources/using-slack/tips-for-joining-slack-connect-channel).
- **Google Drive** "General access": "Restricted" ("Only people who have
  been given access can open the file"), "Anyone with the link" ("Anyone
  on the internet who has the link can open the file without signing
  in"), and the organization option; files outsiders can open carry an
  "External" badge (https://support.google.com/drive/answer/7166529).
  Restricted is the default for new files
  (https://knowledge.workspace.google.com/admin/drive/set-general-access-sharing-options-for-your-organization).
- **GitHub**: "Public repositories are accessible to everyone on the
  internet"; "Private repositories are only accessible to you, people you
  explicitly share access with"
  (https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories).
  Since October 2021 every repository is labeled Public, Private, or
  Internal beside its name; before that only private and internal ones
  were, and people overlooked that a repository was public and committed
  private code to it
  (https://github.blog/changelog/2021-10-11-all-repositories-are-labeled-public-private-or-internal/).
  "Secret gists aren't private": anyone with the URL can view one
  (https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists).
- **Canvas** (from community threads, since the official guide pages
  would not load): a green check for published and a grey crossed
  circle for unpublished, which teachers click to change
  (https://community.canvaslms.com/t5/Canvas-Question-Forum/Light-green-checkmarks-on-published-items/m-p/593210);
  an unpublished module hides its items whatever their own setting
  (https://community.instructure.com/en/kb/articles/660890-how-do-i-publish-or-unpublish-a-module-as-an-instructor);
  Student View shows a teacher what students see
  (https://community.instructure.com/en/kb/articles/661143-how-do-i-view-a-course-as-a-test-student-using-student-view).
- **Discourse**: unlisted topics show a crossed-out eye, and "Regular
  users who have a direct link can still view an unlisted topic"; the
  lock means "Closed" or "Archived" on topics
  (https://meta.discourse.org/t/understanding-closed-unlisted-and-archived-topics/51238)
  and also marks private categories, which admins complain is confusing
  (https://meta.discourse.org/t/how-to-remove-the-lock-icon-in-private-categories/99919).
- **Facebook**'s audience selector appears where you share and on posts
  already shared, with Public, Friends, and Only Me
  (https://www.facebook.com/help/120939471321735); in 2014 a new person's
  first post defaulted to Friends instead of Public, with a reminder
  before posting publicly
  (https://about.fb.com/news/2014/05/making-it-easier-to-share-with-who-you-want/).
- **OneDrive** links: "Anyone", "People in your organization", "People
  with existing access", "Specific people"
  (https://support.microsoft.com/en-us/onedrive/share-files-and-folders-in-microsoft-onedrive).

**The pattern these share** (synthesis of the sources above): a small
fixed set of audience words, three to five, from narrow to wide, each
naming who and not a mechanism, each defined once; an icon always with a
word, and one icon per meaning (Discourse's double-duty lock is the
warning); every state labeled, the open one included (GitHub's 2021
lesson); the marker on the thing wherever it appears and at the moment
it is shared; a narrow, named default; widening asks for confirmation;
honest names for the middle state ("Anyone with the link" is not
private); and a way to see the thing as its audience does.

---

## 3. The installed design skills: what to adopt, what to reject

| Skill | Rule | Verdict, and why |
|---|---|---|
| `universal-feature-states` | Every list defines loading, empty, error, offline, and an Unavailable state, never a silently missing button | **Adopt.** It matches NN/g's "Totally empty states cause confusion" and Primer's error states. The "never a silently missing button" rule needs one clarification here: PAGES.md rule 5 hides tools for a role a person does not hold, which is not a capability the device lacks, so hiding those is right. |
| same | Skeleton for any load over 300 ms | **Adjust to 1 second.** NN/g and Primer both say no indicator under 1 second (2.12). |
| same | Error for a write sits above the action as a banner, with retry | **Adopt, as the inline status beside the control** (2.8). |
| same | Hint banners and walkthroughs | **Reject walkthroughs on the web** (the skill itself says web primitives are legible); a hint is allowed only as a fact not discoverable by looking (section 5). |
| `mobile-first-density-design` | Density from removing chrome; one canonical cell; rule 7, only refusals, warnings, and undiscoverable facts on screen | **Adopt.** Rule 7 is the site's own writing rule. |
| same | Six levels of type | **Adopt, under the site's tighter pattern 9** (three styles per section). |
| same | L2 section header "bold uppercase, letter-spacing 0.05em" | **Reject.** The site bans tracked capitals (D2), and GOV.UK moved away from uppercase because it is harder to read (2.1). |
| same | Progressive disclosure must be predictable: a chevron pushes, no chevron inlines | **Adopt, translated:** a `<summary>` opens in place; a row title goes to a page. |
| `native-platform-first` | `<dialog>`, `<details>`, Popover API, native validation | **Adopt.** It is the basis for the confirm step and disclosure here. Native validation bubbles are not enough on their own, because GOV.UK and Primer want inline messages and a summary (2.10). |
| `make-it-look-like-itself` | The look comes from the app's own why; avoid machine-made tells | **Adopt.** Already done here with forest and thistle. |
| `learner-experience-design` | Order by what needs the person now; counts with links, not charts; never a score; every row lands on the exact thing; empty states with one action | **Adopt all.** Rule 5 (no streaks or progress bars) also limits the checklist: setup tasks only, never learning progress. |
| `frontend-design` | Bold, unexpected aesthetics, motion, textures, grain | **Reject for the kit.** A component kit wants the opposite: predictable, repeated parts. The anti-patterns note already found this skill's escape routes to be a cluster of their own. |
| `killer-ui` (KUI) | One primary CTA per screen; 44 px targets; four states per screen; labels above inputs | **Adopt.** |
| same | Badges "always pill shape", "ALWAYS UPPERCASE", 10 px; section labels uppercase at 35% opacity; placeholder text at 35% opacity | **Reject.** Pill badges (D14) and capitals (D2) are banned here; 35% opacity text fails WCAG 1.4.3's 4.5:1 (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). |
| same | Cards with an "optional 4px left" accent border | **Reject** (D6, no colored stripes). |
| same | "Destructive: Red variant. Delete, remove, cancel" | **Reject for Cancel.** Cancel is never red; red is for what is hard to undo (pattern 7; Apple's destructive style is for "a destructive action people didn't deliberately choose", 2.9). |
| same | Inline validation as they type, green check when valid | **Reject.** Primer validates on submit; NN/g warns against showing errors prematurely (https://www.nngroup.com/articles/error-message-guidelines/); a green check is color carrying meaning. |
| same | Empty state with "illustration" | **Reject.** Pattern 6: real things as the pictures, no illustrations. A Phosphor icon only for the error and gate states. |
| `ui-ux-pro-max` | Visible labels, error near the field, error summary for many errors, focus the first invalid field, `aria-live` for toasts | **Adopt the form rules.** |
| same | "Auto-dismiss toasts in 3-5s" | **Reject.** WCAG 2.2.1, NN/g, Material on the web, and APG all argue against messages that vanish (2.8). |
| same | Required fields marked with an asterisk | **Adjust.** Primer requires required fields to be visibly marked and set in code (2.10); WCAG 1.3.1 says color plus an asterisk alone is not enough. Use the word, not the symbol. |
| same | Bottom nav at most 5; breadcrumbs for 3+ levels; focus to main on route change | **Adopt** where they apply (the area row stays at five or fewer). |

---

## 4. The site's rules beside the systems

| Site rule | Systems | Agree or conflict | Reconcile |
|---|---|---|---|
| **No pill badges** (D14) | Primer Label and Polaris Badge are pills; GOV.UK tags are rectangles on a light fill; Material puts status in Badge, not chips | Conflicts in shape only. The systems agree on the point underneath: a status must not look pressable (GOV.UK's v5 change, 2.1) | **Keep: a status is an icon and a word with no shape around it.** Buttons have a border and a fill; statuses never do, so the two cannot be confused. This also meets 1.4.1 with no extra parts. |
| **No tracked capitals** (D2) | GOV.UK dropped uppercase tags; NN/g says avoid all caps in tabs; Primer and Polaris require sentence case | Agree | Keep. Sentence case everywhere, no `text-transform: uppercase`, no positive letter-spacing on small text. |
| **No colored stripes** (D6) | GOV.UK Inset text is a left-bordered block, and its banners use colored borders; KUI recommends accent borders | Conflicts | **Keep the ban.** A notice is a tinted inset panel with an icon and a bold first line. The icon and words carry the meaning (WCAG 1.4.1), which a stripe never did. |
| **Color only in inset panels** (pattern 1) | Primer, Polaris, and GOV.UK banners are colored blocks | Agrees in spirit: all three say banners are rare and one per page | A notice is the one tinted panel on a page (`--surface`), full content width, never edge to edge. Its tone is in the icon and the words. Red appears only as the icon and title color of a problem notice. |
| **Forest for what can be clicked, thistle for what is current** (pattern 5) | Polaris and Primer give each tone a hue | Partly conflicts: the systems use green for success, and forest is the site's link color | A "done" status uses the ink color with a forest check icon; it never uses forest text, so it does not read as a link. "Current" (a live session, this week) takes a thistle fill on the icon only, since thistle is never small text on white (DECISIONS.md, forest and thistle). |
| **One filled button per group, first** (pattern 7) | GOV.UK "Avoid using multiple default buttons"; Polaris one primary per card and per empty state; Primer Banner "one must be primary and one secondary" | Agree | Keep. A row list counts each row as a group, but rows carry only secondary buttons (judgment: ten filled buttons down a list would undo the rule's purpose). |
| **Red only for hard to undo, last, filled only on the confirming step** (pattern 7) | NN/g, Primer, Apple, GOV.UK ("Most services should not need" a warning button) | Agree | Keep, and extend to status: red is for "hard to undo" and for "something is wrong", nothing else (GOV.UK: red only for errors). |
| **Everything in a row of actions is a button; Cancel is outlined** (pattern 7) | GOV.UK allows a Cancel link beside buttons | Conflict already settled in links-and-actions-notes.md | Keep. |
| **No `A · B · C` meta strings** (ai-design-anti-patterns.md; `exchange-lib.js:118`) | GOV.UK's Summary list and Primer's PageHeader use labeled facts | The rule was right, but its fix (write a sentence) produced the prose the audits found | Facts go in the facts list (key and value) on a page, and as short labeled items in a row's meta line, never in a sentence. Correct the comment at `exchange-lib.js:118`. |
| **No highlighted words** (pattern 4) | No system highlights words in running text | Agree | Keep. |
| **Three text styles per section** (pattern 9) | GOV.UK v5 made tag text regular weight at body size | Agree | Status, visibility, and counts reuse the small label style; they add no new size. |

---

## 5. Writing rules for the interface

These are the rules every label, button, status, and message follows.
Each names its source.

1. **A sentence is allowed only when it is one of three things:** a
   refusal (why something is closed to you, or absent), a warning (a
   consequence you would not otherwise know), or a fact you cannot
   discover by looking (mobile-first-density-design rule 7; PAGES.md rule
   5; NN/g's contextual tips, https://www.nngroup.com/articles/recognition-and-recall/).
   A sentence that explains a control, restates what just happened, says
   who can see something, or names where an action lives is a missing
   component, and the audits say which one.
2. **Sentence case everywhere**, no punctuation in labels and buttons, no
   colons after form labels (Primer, https://primer.style/product/getting-started/foundations/content/;
   Polaris, https://polaris.shopify.com/content/grammar-and-mechanics).
3. **Labels are short**: a form label at most three words (Primer
   Forms), a tab or row-of-links item one or two words (NN/g tabs), a
   status one or two words (Polaris, Shopify App Home), a success line at
   most three words (Polaris Toast).
4. **Buttons are verbs naming the thing**: "Make a poll", "Remove Ada",
   "Delete this draft" (Polaris "{verb}+{noun}"; Primer "an imperative
   verb"; GOV.UK "describing the action it performs",
   https://design-system.service.gov.uk/components/button/). The noun can
   drop when the page is about that thing (Polaris Page: "Import", not
   "Import orders"), and the common words stand alone: Save, Cancel,
   Continue, Close. Polaris's own Button page now prefers "Save" over
   "Save product", which this rule reconciles the same way.
5. **One verb per kind of action** (WCAG 3.2.4). The audits found eight
   labels for removing. The set: **Remove** takes something out of a list
   and can be put back; **Delete** ends it for good (red, confirmed);
   **Hide** and **Show** change who sees it; **Leave** ends your own
   membership; **Take back** withdraws your own answer. Every message
   after an action reuses the button's verb ("Remove" leads to "Removed";
   Primer: use "the same terms used by the UI elements that triggered
   it").
6. **One name per thing** (WCAG 3.2.4). Keep a short lexicon in
   DESIGN-KIT.md and check it. The audits' conflicts to settle first:
   groups, trios, rooms, and rehearsal rooms (pick "group"); main session
   and main room; the apps page, named two ways; Open, "Open for joining",
   and "Open for people to join" (pick "Open").
7. **Status words are adjectives or past participles**, never verbs
   (GOV.UK, Polaris): "Signed", "Closed", "Waiting".
8. **Errors say what is wrong and what to do**, in the field's own terms
   ("Enter a title for the poll"; "Title must be 80 characters or
   less") (GOV.UK Error message; Polaris, https://polaris.shopify.com/content/error-messages;
   NN/g, https://www.nngroup.com/articles/error-message-guidelines/). No
   "please", "sorry", "oops", "invalid", "you forgot", "something went
   wrong", or "There was a problem" alone; never the database's words
   ("the database refused") or a config file's name.
9. **Words to avoid** in the interface: "easy", "quick", "just",
   exclamation marks, emoji, ampersands, "click here" (Primer content);
   "please" (GOV.UK).
10. **Times on the reader's clock, written out**, never raw ISO dates or
    24-hour times (the teacher audit found both; judgment on the format,
    to be fixed in one helper).

---

## 6. The kit

Each entry gives what it is for, when to use it and when not, its words,
its anatomy, its accessibility rules, and how to catch misuse
mechanically. "ui.js" names the function that should build it, so no
page draws one by hand.

### 6.1 Page header with facts

- **For:** telling a person, at the top of every page about one thing,
  what it is, its state, who sees it, and what they can do (PAGES.md rule
  4; Primer PageHeader; Polaris Page).
- **Use** on every page about one thing. **Not** on reading pages or the
  signed-out pitch, which keep the hero.
- **Anatomy, in order:** breadcrumb (6.3) → `h1` naming the thing (its
  real name, never a slogan) → one line holding the status label (6.4)
  and the visibility marker (6.5) → facts (`UI.facts`, a `<dl>` of key
  and value) → actions (one filled button at most, first; secondary
  next; danger last) → the area row or cohort bar (6.2), touching the
  content below.
- **Words:** fact keys are one or two words ("Next session", "Places",
  "Teachers"); values are short ("Tue Nov 3, 7:00 pm your time", "12 of
  18"). An empty fact is left out (ui.js already does this), unless its
  absence matters, in which case the value is a link to the page that
  fills it (GOV.UK Summary list).
- **Accessibility:** one `h1`; the facts as `<dl>` (GOV.UK; WCAG 1.3.1);
  the document title most specific first ("Spring cohort, Teaching,
  Human Shaped", navigation note).
- **Checks:** every page with `.page-head` has exactly one `h1`; no
  `·` or ` | ` in rendered fact values; no sentence (a string ending in a
  period) inside `.ui-facts dd`.

### 6.2 Area row and cohort bar

- **For:** moving between the pages of one area or one cohort (PAGES.md;
  Primer UnderlineNav; GOV.UK Service navigation).
- **Use** at the top of every page in that area, in a fixed order. **Not**
  for actions (Apple: tabs navigate), not for steps in a flow (Primer),
  and never stacked: a cohort's pages show the cohort bar in place of the
  area row (PAGES.md).
- **Words:** each item one or two words, nouns, the same name everywhere
  it appears (WCAG 3.2.4). A count may follow a label (6.6).
- **Anatomy:** a labeled `<nav>` holding a list of links; the current one
  underlined and heavier, two cues (NN/g tabs); items for a role are
  added in their place, never reordered (WCAG 3.2.3); at most five items
  so the row fits at 375 px, with any more collapsing into a "More" menu
  (Primer overflow; Moodle's five tabs, cited in the navigation note).
- **Accessibility:** `aria-current="page"` on the current link; every item
  an `<a href>` with its own URL; targets at least 24 px (WCAG 2.5.8).
- **Checks:** every `.area-nav` item is an `<a href>` with a unique URL;
  exactly one `aria-current`; no `<button>` inside; no page contains both
  `.area-nav` and the cohort bar.

### 6.3 Breadcrumbs

- **For:** saying where a page sits (GOV.UK; NN/g).
- **Use** on pages below an area's first level. **Not** on pages that are
  themselves an item in the area row, and never with a back link (GOV.UK
  Back link).
- **Words:** each crumb is the parent page's name as it appears in the
  row or as that page's `h1`.
- **Anatomy:** from the area's first page to the parent, not the current
  page (GOV.UK; the `h1` beneath names it). At phone width only the
  parent, with a leading "‹" (already in site.css).
- **Accessibility:** `<nav aria-label="Breadcrumb">` with an `<ol>`,
  placed before `<main>` so the skip link passes it (GOV.UK). No
  `aria-current`, since the current page is not in the trail.
- **Checks:** no page has both `nav.crumbs` and a back link; the last
  crumb's `href` is not the current page; the label is "Breadcrumb".

### 6.4 Status label, with a fixed set of states and tones

- **For:** the state of one thing, as an icon and a word (GOV.UK Tag;
  Primer StateLabel; Polaris Badge).
- **Use** wherever a thing has more than one possible state and the state
  changes what a person does. **Not** for categories or kinds (use a
  plain word in the meta line), not as a control (GOV.UK, Shopify), and
  not for a person's progress in learning (learner-experience-design
  rule 5).
- **Tones** (five, each with one icon and one color; the word always
  carries the meaning):

  | Tone | Icon (Phosphor) | Color | Means |
  |---|---|---|---|
  | `done` | check-circle | ink text, forest icon | finished, nothing left to do |
  | `active` | circle, filled | ink text, thistle-filled icon with an ink outline | open, running, live now |
  | `waiting` | circle-dashed | muted | not started, or waiting on someone |
  | `off` | minus-circle | muted | draft, closed, hidden, not yet possible |
  | `problem` | warning-circle | danger | something is wrong and needs fixing |

  This replaces ui.js's `alert` (renamed so it is not mistaken for
  `role="alert"`) and drops `time`, which is a fact, not a state.
  Forest is never the text color of a status, so a status never reads as
  a link (pattern 5).
- **Words: a fixed registry**, keyed by thing and state, the only source
  of status text. Proposed, from the states the audits found (each word
  an adjective or past participle, one or two words, sentence case):

  | Thing | States (word, tone) |
  |---|---|
  | Cohort | Draft (off), Open (active), Running (active), Finished (done) |
  | Session | Planned (waiting), Ready (active), Live now (active), Finished (done) |
  | Poll | Open (active), Closed (off); for the person answering, Answered (done) |
  | Request to teach | Waiting (waiting), Approved (done), Declined (off) |
  | Credential | Not earned yet (off), Waiting to be signed (waiting), Signed (done) |
  | App in a cohort | Submitted (done), Not submitted (waiting), Hidden (off) |
  | GitHub invitation | Invited (waiting), Joined (done), Failed (problem) |
  | Exchange | Open (active), Closed (off) |
  | Checklist task | Done (done), To do (waiting), Cannot start yet (off) |
  | Connection (live, board, add-on) | Live (active), Checking (waiting), Offline (problem) |

  One word means one thing across the site (WCAG 3.2.4): "Open" always
  means people can take part now; "Closed" always means it no longer
  takes part but still exists; "Finished" means it ran to its end.
- **Anatomy:** inline, icon then word, no box, no fill, no pill. A set of
  statuses for one thing sits in a `<ul>` (Primer Label).
- **Accessibility:** the icon is `aria-hidden` and the word is real text
  (ui.js does this); text at 4.5:1 and the icon at 3:1 (WCAG 1.4.3,
  1.4.11). A status that changes while the page is open is announced by
  a `role="status"` region (WCAG 4.1.3), not by the label itself.
- **Checks:** `UI.status(thing, state)` takes registry keys only and
  throws on anything else; a unit test asserts every word is at most
  three words, sentence case, and not a verb from the action set; no
  file outside ui.js creates `.ui-status`; no CSS gives `.ui-status` a
  background, border, or `border-radius`.

### 6.5 Visibility marker, with a fixed set of audiences

- **For:** who can see this, as an icon and a few words, so no sentence
  ever has to say it (section 2.15).
- **Use** on everything a person makes or that is about them, wherever
  it appears: in its page header, on its row, and beside the control
  that creates or shares it. **Not** for things everyone can see by
  nature (the public pages).
- **Audiences** (fixed, narrow to wide, written from the reader's side;
  one icon per meaning, and a lock means only "Only you"):

  | Key | Words | Icon |
  |---|---|---|
  | `device` | On this device | device-mobile |
  | `me` | Only you | lock-simple |
  | `teachers` | You and your teachers | user |
  | `cohort` | Your cohort | users |
  | `members` | Human Shaped members | users-three |
  | `link` | Anyone with the link | link |
  | `public` | Everyone | globe-simple |

  Changes from ui.js: "Stays on this computer" becomes "On this device"
  (a phone is not a computer); `link` gets its own icon so it no longer
  shares the globe with `public` (Discourse's lesson); `members` gets
  its own icon. When a teacher views a student's private thing, the
  marker names the person: "Ada and her teachers" (judgment: the words
  stay relative to the reader). "Public on GitHub" from the member audit
  is `public` plus the place, written as a fact ("Repository: on
  GitHub"), not a new audience.
- **Two-part markers.** When the thing and its file differ, show both,
  each labeled: the exchange "Your cohort", its video file "Anyone with
  the Drive link". This is the one contradiction the audits found that
  prose could not hold.
- **Each word is defined once**, in a disclosure on the marker (a
  `popover` button reading the audience words, opening one sentence: who
  that is). "Human Shaped members" is defined there and nowhere else
  (the member audit found it defined three times in parentheses).
- **Defaults and widening:** the narrowest audience that works is the
  default and is shown, not implied (Drive's "Restricted"; Facebook's
  2014 change). Widening to `link` or `public` is a confirm step (6.13)
  naming the new audience (GitHub's Danger Zone).
- **Accessibility:** icon `aria-hidden`; the visible words are the
  accessible name (WCAG 2.5.3); in a form, the marker is tied to its
  control with `aria-describedby`.
- **Checks:** `UI.visibility` takes keys only and drops the free `label`
  override; a source scan fails on the old privacy phrases ("only you
  and", "only the people in", "anyone with its link", "seen only by",
  "yours alone") in any `.js` or `.html` string outside ui.js; every
  form that creates a member's thing contains a `.ui-visibility`.

### 6.6 Count badge

- **For:** how many things wait, in a row of links or a row on a desk
  (Primer CounterLabel; learner-experience-design rule 3).
- **Use** only for things waiting on this person, or for the size of a
  list when the list is elsewhere. **Not** for scores, streaks, totals of
  someone's work, or comparisons (learner-experience-design rule 5), and
  not for zero: when nothing waits, the count is absent (Apple: reserve
  badges for what matters; judgment on hiding zero).
- **Words:** a number, always beside the noun it counts ("Feedback 5",
  "5 waiting"). Four characters at most (Material), so "999+" is the cap
  (judgment).
- **Anatomy:** the number in tabular figures, the label style's weight,
  no pill, no colored circle (D14). In a row of links it follows the
  label after a space.
- **Accessibility:** the accessible name includes the noun ("Feedback, 5
  waiting"), never a bare number (Primer). When several counts load at
  different times, show none until all are ready (Primer UnderlineNav).
- **Checks:** every `.ui-count` sits inside an element whose text holds a
  word besides the number; no `.ui-count` renders "0".

### 6.7 Row and row list

- **For:** one thing in a list, leading to its own page (PAGES.md rules 1
  and 3; Polaris IndexTable; GOV.UK Task list rows).
- **Use** for every list of things that have pages. **Not** for tabular
  comparisons (use a table) or for the facts of one thing (6.1).
- **Anatomy** (`UI.row`): the title, a link to the thing's own page and
  the row's only link to it → a meta line of short facts (date, count,
  name) → status and visibility on the right → at most two secondary
  actions, then any danger action last (Polaris Card; GOV.UK summary
  cards, "2 to 3 actions"). On a phone the side drops under the title.
  No filled buttons in rows.
- **Words:** the title is the thing's name, not a description; the meta
  line holds facts, not a sentence.
- **Accessibility:** a `<ul>` of `<li>`; the title link points
  `aria-describedby` at the row's status (GOV.UK Task list); actions
  name their thing in their accessible name ("Remove Ada"), even when
  the visible label is shorter (WCAG 2.5.3, label at the start).
- **Checks:** every `.ui-row` with an `href` title opens a page whose
  URL identifies one thing (learner-experience-design rule 8, checked by
  following each link in a test fixture); no `.btn-primary` inside
  `.ui-row`; at most three buttons per row.

### 6.8 Empty state

- **For:** a list or place with nothing in it yet (NN/g; Primer
  Blankslate; Polaris EmptyState).
- **Use** for every list that can be empty. **Not** while loading (never
  "nothing here" before the data arrives, learner-experience-design rule
  4), and not for errors (6.15) or refusals (6.15).
- **Words:** one short line that says what is absent, "No polls yet",
  and at most one action, a verb naming the thing, "Make a poll". The
  button is the learning cue NN/g asks for, so no sentence names where
  the action lives. When a filter empties a list: "Nothing matches" and
  "Clear the filter". When the absence is not the person's to fix:
  the fact alone ("No sessions this week").
- **Anatomy:** the line in muted text, the button below it, on the page's
  ground, no illustration (pattern 6).
- **Accessibility:** a paragraph and a real button or link; if the list
  emptied while the page was open (the last item removed), the change is
  announced by the page's `role="status"` region.
- **Checks:** `.ui-empty` holds one `<p>` of at most eight words and at
  most one button; banned in empty text: ", so ", "will be listed here",
  "will be here", "when one opens".

### 6.9 Checklist

- **For:** a short set of setup tasks a person can do in any order
  (GOV.UK Task list and Complete multiple tasks): getting ready for a
  cohort, a teacher's cohort setup, linking accounts.
- **Use** when the tasks take more than one sitting or can be done in any
  order. **Not** for a fixed sequence (use pages in order), not to show
  answers (use facts), and never for learning progress
  (learner-experience-design rule 5).
- **Words:** each task a short imperative phrase naming the thing ("Add
  your app", "Choose a Meet link"); status from the checklist registry
  (Done, To do, Cannot start yet); a one-line count above, "2 of 5 done"
  (judgment: GOV.UK gives no count wording).
- **Anatomy:** a list; each row's title links to the page where the task
  is done; Done is plain text with the check icon and no fill, so
  unfinished tasks stand out (GOV.UK's research); a task that cannot
  start is not linked and is muted. The checklist disappears once every
  task is done.
- **Accessibility:** `<ol>` if order helps, `<ul>` otherwise; the task
  link points `aria-describedby` at its status (GOV.UK).
- **Checks:** checklist rows use the checklist registry only; a "Cannot
  start yet" row has no `href`.

### 6.10 Field, hint, and inline error

- **For:** every input a person fills in.
- **Words:** label at most three words, sentence case, no colon (Primer).
  Hint only when most people need it, one short sentence, no full stop,
  no link (GOV.UK). Who will see the answer is a visibility marker beside
  the label, not hint text. Optional fields say "(optional)" in the
  label, written out, not an asterisk (judgment, following Primer's rule
  that requirement be visible and WCAG 1.3.1's note that an asterisk
  with color is not enough). Errors follow section 5 rule 8: "Enter…",
  "Select…", "… must be …", worded the same in the field and the summary
  (GOV.UK).
- **Anatomy:** label → hint → error (with the warning icon and a hidden
  "Error:" prefix) → control, the field outlined in red while in error
  (GOV.UK Error message). Fields are never cleared on error (GOV.UK; NN/g).
  On submit, focus the first invalid field when there are one or two
  errors; with three or more, show an error summary headed "There is a
  problem" above the `h1`, each item a link to its field, and move focus
  to it (Primer Forms; GOV.UK Error summary). One Save button per page,
  never disabled (Primer Saving; GOV.UK Button). Explicit save for text,
  checkboxes, and selects; toggles and segmented controls save at once,
  never both in one form (Primer Saving; NN/g toggles). This settles the
  teacher audit's "groups save on tick, weeks need Save".
- **Accessibility:** `<label for>`; groups in `<fieldset>` with a
  `<legend>`; `aria-describedby` from the control to hint and error;
  `aria-invalid="true"` in error; no live region for validation (Primer);
  input height at least 44 px.
- **Checks:** every `input`, `select`, and `textarea` has a label; no
  `placeholder` attribute without a label, and none holding an example
  that a hint should hold; no `disabled` on a `type="submit"` button;
  error strings start with "Enter" or "Select" or contain "must"; no
  error string contains "invalid", "please", "sorry", or "required".

### 6.11 Disclosure

- **For:** detail only some people need: Meet setup by hand, the raw
  error, how a rule is computed (GOV.UK Details; NN/g progressive
  disclosure).
- **Use** for rare detail. **Not** for anything most people need (GOV.UK),
  not for a whole section (make it a page), and never more than two
  levels deep (NN/g).
- **Words:** the summary names what is inside, as a noun phrase: "Set up
  Meet by hand", "Error details", "Who can see this". Never "More",
  "Learn more", or "Click to expand" alone.
- **Anatomy:** native `<details>` and `<summary>` (`UI.disclosure`), with
  the browser's own marker; closed by default.
- **Accessibility:** the native element carries expanded state; no
  `role` on `<details>` (MDN). The definition popovers on visibility
  markers use the Popover API with a real `<button>` (native-platform-first).
- **Checks:** no `<details>` nested inside two others; summary text is
  not one of "More", "Details", "Learn more", "Show more".

### 6.12 Toolbar

- **For:** the actions on the thing the page is about, gathered in one
  place (PAGES.md rule 6; Apple: toolbars act, tabs navigate).
- **Use** below the page header when a thing has more than two actions.
  **Not** for navigation, and not on list pages, whose only action is
  usually making a new thing (that is the page header's one button).
- **Words:** each a verb naming the thing; the primary action follows the
  thing's state (the teacher audit's example: Draft, "Open for joining";
  Open, "Rehearse"; Running, "Open live session"; Finished, "Issue
  credentials").
- **Anatomy:** one filled button first, up to three secondary, danger
  last; more go into a "More actions" menu built as a disclosure button
  and a list (the account menu's pattern in learner-experience-design
  rule 7). The current `.ui-toolbar` draws a bordered card around the
  buttons; dropping the border and fill would follow the density rule of
  removing chrome (judgment).
- **Accessibility:** a plain group of buttons. Do not add
  `role="toolbar"`, which promises arrow-key movement the site does not
  provide (judgment; Primer says the same of segmented controls).
- **Checks:** `action-styles.test.mjs` already covers order and the one
  filled button; add: no links to other areas inside `.ui-toolbar`.

### 6.13 Confirm step

- **For:** a last check before something hard to undo: deleting, removing
  a person, leaving a cohort, widening who can see something (NN/g;
  Primer ConfirmationDialog; WCAG 3.3.4).
- **Use** only for those. **Not** for anything that can be undone easily
  (Apple; Primer: "Use confirmations for actions that can be easily
  undone" is a don't): taking a card down, removing a list item that can
  be added back, closing a poll that can be reopened. Those act at once
  and offer Undo in the inline status (6.14).
- **Words:** title a short question naming the thing, under five words
  ("Delete this poll?", "Remove Ada as teacher?"); one sentence saying
  the consequence ("Its 14 answers are deleted too."), never "This
  cannot be undone." alone (Primer); the confirming button repeats the
  verb and the thing ("Delete poll"), and the other is "Cancel" (Apple,
  Primer). Never Yes, No, OK, or "Are you sure?" (NN/g). For the rarest
  and widest changes (deleting an account), a typed word (NN/g).
- **Anatomy:** a native `<dialog>` opened with `showModal()`
  (native-platform-first; MDN): title, sentence, Cancel (secondary)
  then the confirming button (`.btn-danger.final`) last. One shared
  helper (`UI.confirm({title, body, action})` returning a promise)
  replaces the four patterns the audits found (arming buttons,
  `window.confirm`, inline "Delete it? Keep it / Delete", and none).
- **Accessibility:** `aria-labelledby` the title and `aria-describedby`
  the sentence (APG Alert dialog); initial focus on Cancel because the
  action is dangerous (Primer); Esc cancels; focus returns to the button
  that opened it.
- **Checks:** no `window.confirm`, `confirm(`, `alert(`, or `prompt(` in
  any asset (two today); no "Click again" or `data-armed` patterns;
  every `.btn-danger.final` sits inside a `<dialog>`; dialog buttons are
  never "Yes", "No", or "OK".

### 6.14 Inline status (in place of toasts)

- **For:** saying that something just happened, or did not (NN/g
  indicators; Primer Saving; WCAG 4.1.3).
- **Use** after any action that does not change the page enough to show
  its own result. **Not** as a toast: the site has none, because toasts
  vanish (WCAG 2.2.1), sit away from the control, and fail as errors
  (NN/g; Primer; Material on the web; APG).
- **Words:** noun and past participle, at most three words: "Saved",
  "Poll made", "Link copied", "Ada removed" with an Undo button when the
  action can be undone (Polaris Toast's word pattern without its
  timer). Failures say what failed and offer the retry: "Not saved" plus
  "Try again". No explanation after the status (the audits' "Saved. It
  shows…").
- **Anatomy:** a line directly beside or under the control that caused
  it, kept until the next action on that control. After a save that lands
  on the thing made (PAGES.md rule 2), the line sits under the page
  header. A button's own label never flips to carry the status
  ("Copied") (judgment: the audits found it inconsistent, and a changing
  name breaks WCAG 2.5.3 for voice users).
- **Accessibility:** a `role="status"` element present in the HTML from
  the start, filled when the status changes (Primer Loading; WCAG
  4.1.3); errors from a write use `role="alert"` (WCAG 4.1.3 example).
- **Checks:** no `toast` or `snackbar` class or file; no `setTimeout`
  that clears a status element's text; every `[role=status]` exists in
  static HTML or in the component's first render.

### 6.15 Notice, for warnings and refusals

- **For:** the few sentences the writing rules allow: a warning (a
  consequence you would not otherwise know) and a refusal (why something
  is closed to you) (GOV.UK Warning text and Notification banner; Primer
  Banner).
- **Use** sparingly, one per page at most (GOV.UK; Primer). **Not** for
  success (6.14), not for form errors (6.10), not for marketing.
- **Kinds:**
  - *Warning*: warning icon, a bold first line stating the consequence,
    optional second sentence; one action at most. Example: "This session
    is being recorded."
  - *Refusal*: lock icon, one line. Example: "Only this cohort's teachers
    can open this."
  - *Page gate*: when a whole page is closed or empty, the live and admin
    audit's six states, each with the page's `h1` naming the thing, one
    fixed line, and one primary action: signed out ("Sign in to open
    this", the same sign-in buttons as /account/); not a member ("Only
    people in this cohort can open this", "Go to your home"); missing
    part of the link and not found, which become one state ("Nothing is
    at this address", "Go to your home"); error ("This could not load",
    "Try again", the raw error in an "Error details" disclosure, Primer's
    alert icon and no playfulness); and loading (6.17).
  - *Live signal*: the one exception to "one per page" and to "sparingly",
    for messages that interrupt everyone in a live session (recording,
    go to your group, come back), as the live audit proposed; it is
    still an inset panel with an icon, a title, an optional timer, and one
    action.
- **Anatomy:** a tinted inset panel (`--surface`), round corners, no
  stripe, the icon before a bold first line, full content width, placed
  above the `h1` for a page-wide warning or above the section it is about
  (GOV.UK; Primer). The problem tone colors only the icon and title.
- **Accessibility:** the icon `aria-hidden`, with visually hidden
  "Warning" before a warning's text (GOV.UK); a notice present at load is
  plain content; one that appears mid-page uses `role="status"`, or
  `role="alert"` only when the person must act now (Polaris Banner);
  never auto-dismissed (APG).
- **Checks:** at most one `.ui-notice` per page (excluding live signals);
  no `border-left` or `border-top` wider than 1px in any notice or card
  rule in site.css; no `role="alert"` on a notice present at page load;
  gate text comes only from the gate registry.

### 6.16 Tabs and segmented control

- **Tabs, as links.** Second-level pages of one thing (the teacher
  audit's tabs for /teach/cohort/: Overview, Sessions, Follow-up, People,
  Groups, Apps, Credentials, Settings) are the area-row pattern (6.2),
  each its own URL (Primer UnderlineNav). Eight is more than the five that
  fit at 375 px, so the last ones collapse into "More" (Primer), or the
  set shrinks (judgment: People and Groups, or Apps and Credentials, may
  share a page). No in-page tab panels anywhere: the site has no tabs that
  swap content without changing the URL, so it never mixes the two
  (Primer; NN/g).
- **Segmented control, for filtering a list in place.** "Submitted / Not
  yet / Hidden" on a cohort's apps; "Upcoming / Past" on sessions.
  2 to 5 choices, nouns, no wrapping, the selection applies at once
  (Primer; Apple; Material). It filters one list; it never switches
  between unrelated sections (Apple) and never sits inside a tab as a
  second tab bar (mobile-first-density-design, tab-inside-tab).
- **Accessibility:** tabs as links with `aria-current="page"`. The
  segmented control is a labeled group of buttons with `aria-pressed`
  (Primer: not a radiogroup or tablist), followed by a `role="status"`
  line naming the result ("5 apps") (Primer ActionList).
- **Checks:** no `role="tablist"` anywhere; a `.ui-segmented` has 2 to 5
  buttons, exactly one `aria-pressed="true"`, and a group label.

### 6.17 Skeleton loading

- **For:** holding a page's shape while its data loads (NN/g; Primer;
  universal-feature-states).
- **Use** for loads that pass 1 second; nothing at all before that (NN/g;
  Primer). Decide signed in or out before the first paint so neither
  version flashes (learner-experience-design rule 1). **Not** a
  frame-only skeleton (NN/g), not a full-page spinner, and not a sentence
  ("Checking whether you are signed in…", fourteen copies today).
- **Words:** none on screen. A visually hidden status names what loads:
  "Loading your cohorts" (Primer: label it specifically).
- **Anatomy:** three to five placeholder rows with the same height as
  `.ui-row`, plain `--surface` bars, no shimmer under
  `prefers-reduced-motion`; the real rows replace them in place (no
  layout shift). A single module that loads late gets a small spinner
  instead (NN/g).
- **Accessibility:** `aria-busy="true"` on the region while it loads, the
  status element always rendered (Primer).
- **Checks:** no string beginning "Checking whether", "Opening the",
  "Reading the", or "Finding the" in page HTML or scripts; every
  `[aria-busy]` region has a sibling `role="status"`.

---

## 7. The mechanical checks, together

One test file (for example `tools/test/design-kit.test.mjs`) beside
`action-styles.test.mjs`, so a new feature cannot drift from the kit:

1. No `window.confirm`, `confirm(`, `alert(`, or `prompt(` in `assets/`
   (fails today on `exchange.js` and `teach-times-poll.js`).
2. Status text only from the registry: `UI.status` throws on unknown
   keys; the registry's words are unique per meaning, at most three
   words, sentence case.
3. Visibility only from the audience set: no `label` override; old
   privacy phrases absent from all strings outside ui.js.
4. No `text-transform: uppercase` and no positive `letter-spacing` on
   text under 1.25rem in `site.css`.
5. No colored edge stripes: no `border-left` or `border-top` wider than
   1px on any card, notice, or panel rule.
6. No background, border, or radius on `.ui-status` or `.ui-count`.
7. One filled button per group, red last (already checked); add: no
   `.btn-primary` in `.ui-row`; every `.btn-danger.final` inside a
   `<dialog>`.
8. Forms: every control labeled; no placeholder without a label; no
   disabled submit buttons; error strings start "Enter" or "Select" or
   contain "must".
9. Navigation: area rows are links only, one `aria-current`; no page with
   both breadcrumbs and a back link; breadcrumbs labeled "Breadcrumb".
10. Empty states: one line of at most eight words and at most one button;
    banned phrases absent.
11. `role="status"` regions exist at first render; no `setTimeout`
    clears them; no toast.
12. A banned-words scan over user-facing strings: "please", "sorry",
    "oops", "invalid", "click here", "easy", "just", "!", "something went
    wrong", and the database's own words.
13. A lexicon scan for retired synonyms (trios, main room, "Open for
    joining", and the old names for the apps page).
14. At most one `.ui-notice` per page, and no `role="alert"` on content
    present at load.
15. US English, as the template's `tools/test_us_english.py` does.

Not mechanically checkable, so part of every page review at 375 and
1280 px, light and dark: does any sentence remain that is not a refusal,
a warning, or an undiscoverable fact; does every row land on the exact
thing; is a status ever the only sign of something a person must act on.

---

## 8. Not verified, and open questions

- GOV.UK's phrase "Button text should be short" was not found on its
  Button page; its rule is "describing the action it performs".
- Polaris's "actionable language" page, which its EmptyState and Banner
  pages link to, is no longer in the repository; the {verb}+{noun} rule
  here comes from the EmptyState and Page docs. Polaris's current Button
  page prefers "Save" to "Save product", which conflicts with its own
  {verb}+{noun} rule; section 5 rule 4 reconciles them.
- GitHub's own docs define Public, Private, and Internal but do not
  document the label beside a repository's name; the changelog of
  October 11, 2021 is the source for the label.
- Canvas's publish icons come from community threads, not the official
  guide, which would not load.
- I found no NN/g article on sharing or audience indicators; the
  visibility pattern in 2.15 is a synthesis of the products.
- Primer's StateLabel lists more states in code than in its design doc;
  colors for the newer ones were not verified.
- Open for Ben: the exact audience words (especially "Human Shaped
  members" and the teacher's-eye form "Ada and her teachers"), the status
  registry's words, and whether /teach/cohort/'s eight tabs shrink to
  five or collapse into More.
- To fix first, per "fix the doc first": the role line in DECISIONS.md,
  and the comment at `assets/exchange-lib.js:118` that turns facts into
  sentences.
