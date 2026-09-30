# 01. The first prototype

Archive Watch began on April 17, 2026. The first two commits were the
repository itself and a set of research notes on where film metadata
could come from. There was no screen. The next day brought a pipeline
to gather films from archive.org, and a small web page for checking its
work. On the third day the catalog held 799 films, and only then did the
Apple TV app start to look like something.

It ran on one platform, the Apple TV, for seven weeks.
The iPhone, web and Android versions all started on the same day, June
9, and they could start that fast because the data was already real.

**One platform, real data, this week.**

That is the low floor. It is not about writing the least code. It is
about getting something true in front of you as early as possible, so
that every decision after it is made against the real thing.

## What I want

I want someone who has never shipped an app to see their idea running
on a real device, with real data in it, before the first week is out.
Not a mockup. Not a list of "Lorem ipsum" rows. A thing they can hold
and be disappointed by in useful ways.

## Where to start

Start where your people are. Archive Watch started on the Apple TV
because it is an app for watching old films on a couch. A trivia game
for a classroom might start on the web, because every student already
has a browser. If you do not know where your people are, start on the
web, because it has the lowest floor of all:

- There is nothing to install. The web app in this template is plain
  HTML, CSS and JavaScript, with no framework and no build step
  (`DECISIONS.md` 001 explains why).
- There is nothing to pay. An Apple developer account costs $99 a year
  and a Google Play account $25 once. The web costs nothing, and GitHub
  Pages hosts it for free.
- There is nothing hidden. You, or your agent, can read every line the
  browser runs. In a class, that matters more than anything a framework
  offers.

The cost is real, too. Without a framework you write your own small
view system (the template gives you one in `js/app.js`), and when an app
grows past twenty or so interacting parts, plain JavaScript starts to
ask more of you. Decision 001 says when to revisit.

## Real data from day one

The single most useful thing you can do in week one is replace every
fake row with a real one. Real data is uneven. Titles run long. Images
come in every shape. Some records are missing the one field your design
assumed. You want to find that out now, while your design is a sketch,
and not in week nine when it is a promise.

So, where does your data come from? An open API, a spreadsheet you
export as JSON, a public dataset, your own notes. Archive Watch used
archive.org's public search. For the prototype, it is enough to save
twenty real records as a JSON file in the repository and read them.
The pipeline can come later. The realness cannot.

## The four states

Every list in this template has four states besides the happy one:
**loading**, **empty**, **error**, and **offline**. The
`universal-feature-states` skill describes each. Build them into the
first list, not the last. A person who opens your app on a train, with
no signal, should see a sentence that tells them what happened, not a
blank screen.

## What to do

1. Make your own copy of the template (the green "Use this template"
   button on GitHub), and clone it.
2. Fill in the top of `CLAUDE.md`: the app's name, what it does in one
   sentence, and the "Why we build" paragraph from stage 00.
3. Save twenty real records from your data source as
   `assets/sample.json`.
4. Run the web app: `python3 -m http.server 8080`, then open
   http://localhost:8080.
5. Ask your agent to read `assets/sample.json` through `js/api.js`
   (`API.get('/assets/sample.json')`) and show it as a list, with all
   four states. Read what it wrote before you accept it.
6. Open the same address on your phone. Find your computer's local
   address (on a Mac, System Settings, then Wi-Fi, then Details) and
   visit `http://<that address>:8080` from a phone on the same network.
   Test at phone width first. Desktop can wait.

Be ready to show your list on a phone, and to name one thing the real
data taught you that fake data would have hidden.
