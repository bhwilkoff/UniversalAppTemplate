---
name: money-story-design
description: "Use when designing how people look at, write about, and share their own spending: a ledger, a purchase detail, memos or notes on transactions, budgets, categories, values or tags, monthly reviews, photos attached to purchases, sharing a money story, or an AI assistant that talks about someone's money. Carries CentMemo's frame (every purchase is a moment in a life; the person writes its memo), the unexamined queue as home, values the person names, story views, attachments by reference, opt-in sharing, and the anti-patterns that make money apps shaming or passive (scores, streaks, red numbers, AI-written summaries, auto-categorized 'insights'). Triggers on spending, budget, transactions list, ledger, memo, money story, values, categories, monthly review, receipts, attach photo to purchase, financial wellness, 'insights', money journal."
---

# Money story design

From CentMemo, in the owner's words: "Each purchase made on the apple
card was done with intention. It is a marker of something that happened
in your life ... There are far too many charges on my card that go
unexamined." The app exists so a person examines their own spending and
sees what they value. Pair with `learning-orientation-design`.

## The frame

- **A purchase is a moment, not a number.** The row's job is to invite
  the question "what was this?", not to judge it.
- **The person writes the memo.** One memo per transaction, in their own
  words. No model writes, drafts, or "suggests" a memo or summary (house
  rule: no AI-written copy in the product). An assistant can point to what
  is unexamined and ask questions in its own surface; the words that land
  in the app are typed by the person.
- **Values are named by the person**, not chosen from our list ("time with
  my kids", "great meals"). They tag memos; the app can total by value.
  The bank's category stays visible as the bank's word.

## Surfaces

- **Home = Unexamined**: purchases with no memo, newest first, with a
  count. Done state: "Every purchase has a memo." No progress bars, no
  streaks; the count is a fact, not a score.
- **Ledger by month**: totals as facts (spent, paid or credited, memos
  written of total), rows show merchant, date, category, amount and the
  first lines of the memo when there is one.
- **Purchase detail**: what the bank says (date, posted, category, type,
  statement text, account), then the memo field, then value chips with
  inline "add a value". Save is explicit.
- **Story**: memos for a month or a value, in date order, as a page you
  read, with the amount as a quiet line above the person's words. This is
  what "telling the story of my finances to myself and others" looks like.
- **Attachments**: a photo or file belongs to a purchase by *reference*
  (PhotoKit local identifier) first; uploading a copy is a separate,
  explicit choice per item.
- **Sharing**: one story at a time, opt-in, previewed exactly as others
  will see it, amounts optional, revocable. Never a feed.

## Words

- Amounts in tabular figures; credits may be green (semantic color for
  meaning), spending is the default text color, never red.
- Use the person's language: "memo", "story", "values". Avoid "insights",
  "wellness score", "overspent", "guilty".
- Captions only for facts the person can't see (how to export from
  Wallet; that a removal is permanent).

## Anti-patterns

- Scores, grades, streaks, badges, confetti for "inbox zero".
- Red numbers and warnings for ordinary spending; moralizing budgets.
- Auto-generated "insights" or monthly summaries written by a model.
- Auto-categorizing into our taxonomy and hiding the bank's words.
- One-tap bulk "mark all reviewed" that turns examining into clearing.
- Notifications that contain amounts or merchants (also banned by Apple).

## Check before shipping a money surface

1. Does it leave the person knowing more about where their money went?
2. Is the person the author of every word saved?
3. Would it feel fine to show this screen to someone you love?
4. Does it work for the sparse case: a purchase with no memo, no category,
   a merchant name that is just a statement code?
