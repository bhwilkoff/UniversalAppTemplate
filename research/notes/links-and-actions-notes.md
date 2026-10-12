# Links and actions

October 12, 2026. Ben, looking at an exchange: "The whole site has a
pretty wonky way of displaying links that are completely unadorned right
next to buttons that are also links. We need a consistent design for links
and actions within the site... Please research the right way to develop a
standard design for these interface elements and apply it across the
site." The row he showed held three looks at once: a bold underlined link
("Open in Google Drive"), an outlined button ("Answer this video"), and an
underlined button in the accent color ("Remove from the exchange").

## What the site had

Seven styles for things a person presses: a filled button (`.btn-github`,
named for the first one), an outlined button (`.btn-quiet`), an outlined
link (`a.go` and the `.section-more` links), a bold underlined link
(`a.go-text`, and the hero's `a.text`), two underlined buttons
(`.link-btn` and `.btn-link`, which drifted apart), and a "danger" outline
whose text was the ordinary accent color. Pattern 7 in
`design-patterns.md` allowed "a quiet outlined button or a bold underlined
link" side by side, which is where the mixing came from.

## What design systems agree on

- **Links go somewhere; buttons do something.** The element follows what
  it does, so assistive technology announces it truthfully: NN/g
  (https://www.nngroup.com/articles/command-links/), Primer ("Do not use
  links for triggering an action",
  https://primer.style/product/components/link/guidelines/), Atlassian
  (https://atlassian.design/components/button/usage).
- **A link may look like a button** when it is the main next step: GOV.UK's
  Start button is a link styled as its primary button
  (https://design-system.service.gov.uk/components/button/), Material's
  buttons take an `href`, and NN/g makes the same exception for steps like
  "Checkout". The look follows emphasis; the element follows behavior.
- **One primary action per group.** GOV.UK, Atlassian, Primer, and Apple
  ("Keep the number of prominent buttons to one or two per view"; "use
  style, not size, to visually distinguish the preferred choice",
  https://developer.apple.com/design/human-interface-guidelines/buttons).
- **Destructive actions** are red only for consequences that cannot easily
  be undone, never in the primary slot, never by color alone, and confirmed
  with a final red button (GOV.UK warning button; Apple; Primer).
- **Inline links are underlined.** Color alone is not enough (WCAG 1.4.1,
  https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
  Navigation lists may drop the underline because their place says they
  are links (GOV.UK, https://design-system.service.gov.uk/styles/links/;
  NN/g, https://www.nngroup.com/articles/guidelines-for-visualizing-links/).
- **Targets** at least 24px (WCAG 2.5.8 AA), and 44px is the comfortable
  touch size (WCAG 2.5.5, Apple).
- **Leaving the site**: name the destination in the label (GOV.UK), and an
  icon helps people learn the convention (NN/g,
  https://www.nngroup.com/articles/new-browser-windows-and-tabs/). Open in
  the same tab unless there is a reason not to.

## Where they disagree, and the choice made here

GOV.UK lets a plain link (usually "Cancel") sit in a row of buttons;
Material and Primer reach the same quiet look with a text-only button.
That mix is exactly what Ben found wonky, so this site takes the stricter
reading of Apple's rule, same size and shape and only the style varies:
**everything in a row of actions is a button**, and a quiet choice like
Cancel is an outlined secondary button. Underlined text appears only inside
a sentence. Section-ending "more" links, which several systems leave as
underlined links, are outlined buttons here for the same reason: anything
that stands on its own looks like the other things that stand on their own.

## The standard

Written into `design-patterns.md` (pattern 7), `assets/site.css`
("Actions"), and checked by `tools/test/action-styles.test.mjs`.

| Style | Class | Use |
|---|---|---|
| Primary | `.btn-primary` | The main next step. One per group, first. |
| Secondary | `.btn-secondary` | Every other action, a link that stands alone, Cancel. |
| Danger | `.btn-danger` | Hard to undo. Last in its row; `.final` (filled red) on the confirming step. |
| In a sentence | a link, or `.text-button` | Underlined, the accent color. |
| Navigation | plain links | Header, footer, lists of pages; underline on hover. |

Red is `#B42318` on the light ground and `#FF9B8E` on the dark one (6.1:1
and 8.8:1 against their grounds; 6.6:1 and 8.8:1 for the text on a filled
red button).
