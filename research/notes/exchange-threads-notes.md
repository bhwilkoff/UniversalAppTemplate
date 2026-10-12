# Nested replies in exchanges

October 12, 2026. Ben: "Please research and implement nested replies."
Until now an exchange was one line of videos, oldest first, the way
Threadit kept its threads; a reply remembered which video it answered
("Answered Maya", and "In answer to Maya's video" above the player) but
nothing was indented.

## What other tools do

- **Video tools stay shallow.** Threadit was one linear chain
  (https://9to5google.com/2021/03/18/google-area-120-threadit/); Marco Polo
  is linear too. Flip has a topic, response tiles, and one level of
  comments on a response (https://tlc.ucsc.edu/?p=953). VoiceThread's
  threaded comments allow "only one threaded conversation per root
  comment": later replies join the end of that thread rather than
  branching again (https://ccc.voicethread.com/howto/threaded-commenting).
- **Text tools mostly use one level.** Slack settled on one level after
  two years of trying designs
  (https://tidbits.com/2017/01/27/slack-shoehorns-threaded-messages-into-its-interface/);
  Teams keeps replies under the post; YouTube was one level for years and
  in 2025 moved to three on mobile, flattening anything deeper
  (https://www.androidauthority.com/youtube-premium-threaded-comments-3579874).
- **Deep nesting breaks on phones.** Wikimedia's mobile team found that
  indentation "takes up too much space on mobile, shrinks the line width"
  (https://phabricator.wikimedia.org/transactions/detail/PHID-XACT-TASK-5xefbv6wme2jowk/);
  Reddit sends deep branches to another page.
- **Flattening costs the "who answers whom"**, so every flattened reply
  needs an explicit label (https://tildes.net/~tildes?after=cpl).
- No Nielsen Norman Group or Baymard study of reply depth turned up; the
  working rules of thumb are two or three levels, collapsible
  (https://uxcel.com/lessons/comments-best-practices-499).
- **Accessible markup** is plain nested lists, not a tree widget: ARIA's
  tree pattern promises arrow-key navigation a thread does not have, and
  `aria-level` is redundant when the DOM nests
  (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-level).

## What exchanges do

- **Two levels under the opening video**, which is the prompt: responses
  (videos that answer the prompt, or nothing), and under each response its
  answers, indented once with a thin rule so it fits at 375px.
- **Deeper answers join their branch** in time order rather than indenting
  again, each saying whom it answers ("Answered Jo"). This is VoiceThread's
  and YouTube's flattening.
- **Oldest first** at both levels: the order people spoke in, with no
  ranking.
- **A branch with more than three answers** shows the first two and a
  "N more answers" button; it stays open if the video playing is inside.
- **Play all** plays the thread in reading order (the prompt, a response,
  its answers, the next response). When a video ends, a card says
  "Next: Sam, answering Maya" for five seconds with a Stop button. It
  works because videos now play in the browser's own player, which says
  when a video ends; a video that fell back to Drive's player ends the
  run.
- **Markup:** the thread is an `<ol>`; each response's answers are a
  nested `<ol>` labelled "Answers to Maya"; each video is one button.

The ordering lives in `assets/exchange-lib.js` (`threadOrder`, tested in
`tools/test/exchange-lib.test.mjs`); the drawing in `assets/exchange.js`.
