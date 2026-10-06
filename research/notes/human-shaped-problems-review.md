# Human-shaped problems: the changed passages, for Ben's review

October 6, 2026. LOOP-PLAN "Next for the cloud session", item 2. Ben's
piece (DECISIONS.md, "Human-shaped problems") now carries the idea
wherever a newcomer meets it. Nothing here is done until Ben has read it.

## Fixes made to Ben's own words (please confirm)

In `docs/human-shaped/computer-shaped-problems.md`, where the piece is
quoted whole:

| As written | As it reads now |
|---|---|
| It'is something | It is something |
| present in a inawing way | present in a gnawing way |
| my ballot or bote in person | my ballot or vote in person |
| socieoeconomic data | socioeconomic data |
| route for halloween trick or treating | route for Halloween trick or treating |
| Good Human-Shaped problems: / Computer-Shaped Problems: | Good human-shaped problems: / Computer-shaped problems: (the site's spelling) |

Left as written, for Ben to decide:

- "the cheapest (and least convenient) trips for the delivery drivers":
  is "least convenient" what you meant?
- "aggregated, quantified, and leveraged": "leverage" is on WRITING.md's
  list of words not to use. It is kept because it is your sentence, and
  it describes the computer-shaped view.

## Template (`main`)

1. **`docs/human-shaped/computer-shaped-problems.md`**, "Computer-shaped
   and human-shaped" (rendered at /principles/#computer-shaped-and-human-shaped).
   The section's first two paragraphs are replaced by your piece: the
   definition, both lists, and the two closing lines in bold. The old
   film examples now sit in the "Almost every app is both" paragraph.
   **Removed:** "A human-shaped problem only gets solved when a person
   does part of the work. Deciding what is worth your evening, learning
   something hard, and watching a film with a friend are all
   human-shaped. A computer can set the table for them, but it cannot eat
   the meal for you." Say if you want the meal line back.
2. **`docs/path/00-why-we-build.md`**, step 1, "Start your note with the
   why" now begins: "At the top, write the human-shaped problem it is
   for: the gentle hum of worry or concern you have about an area of
   your life, something that has gone unsolved for months or even years,
   and that you cannot do yourself with the tools and resources you have
   now (computer-shaped problems has examples of both shapes). Then write
   who it is for, and what you hope it does for them." The link in "Human-shaped
   software" now says the longer story has "examples of each shape".
3. **`docs/human-shaped/PRINCIPLES.md`**, principle 1, after "Human-shaped
   software is built for those problems.": "A human-shaped problem is the
   gentle hum of worry or concern you have about an area of your life: it
   has gone unsolved for months or even years, and you cannot do it
   yourself with the tools and resources you have now (examples of each
   shape)." The statement and "How you can tell" are unchanged, so the
   version stays 0.6.
4. **`COURSE.md`**, "The one requirement", added: "A human-shaped problem
   is one they have lived with: the gentle hum of worry or concern about
   an area of their life, unsolved for months or even years, that their
   current tools and resources are not up to (examples of each shape)."
5. **`docs/teaching/before.md`**, "Start": "the why at the top" became
   "the human-shaped problem and the why at the top".
6. **`.claude/skills/human-shaped-review/SKILL.md`**: for principle 1 the
   agent also reads your section, asks whether the builder's problem has
   gone unsolved for months or years and is something they could not do
   with the tools they had, and whether the app treats the world as
   stories or as data points. It never decides the shape for the builder
   and never offers your examples as theirs. The MCP server's review
   prompts (`review_my_own_work`, a student's review) follow this skill,
   read live from `main`, so they changed with it and need no deploy.

## Site (`site`)

7. **Home, "The idea"**: the paragraph now opens with the definition:
   "A human-shaped problem is the gentle hum of worry or concern you have
   about an area of your life. It has gone unsolved for months or even
   years, and you cannot do it yourself with the tools you have now. AI
   makes it tempting to treat every problem as a database waiting for the
   right code, the habit Nilay Patel calls software brain." The two cards
   are your two closing lines, each with one of your examples under it
   (the negative-sentiment one, and the child-without-screens one), and a
   link, "More problems of each shape". **Removed** from the cards: the
   Archive Watch film-summaries contrast, which stays in full on
   /principles/#why.
8. **/cohorts/**, the lead: "...have a human-shaped problem in mind:
   something in their life that has gone unsolved for months or even
   years, that they cannot do themselves with the tools they have now,
   and that touches real people they can name (examples of each shape)."
9. **/path/, stage 00, /principles/, the meetup kit's reading, and
   /cohort/'s week 1** render the template's files live, so items 1 to 3
   reach them with no change on the site.

The class builder's first-week defaults (the agenda parts in
`assets/cohort-lib.js` and the closing checks in `assets/live-lib.js`)
do not mention the problem, so they are unchanged. The week-before guide
(item 5) is where a cohort first writes it down.
