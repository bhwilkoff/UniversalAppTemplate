# 02. The shape of an app

In September 2026, Roku's store analytics showed Archive Watch crashing
16 times in two days, always on the same line:
`DetailScreen.brs:781`, a count over a film's cast list.

The Roku code was correct. The data was not. A cast member with no
profile photo was arriving as a bare string instead of a list, and a
string has no count. That was true of 2,798 cast entries across 1,716
films, 5.4% of the catalog. Open any one of them on a Roku and the
channel fell over.

But, the web app read the very same field and never crashed. Its code
happened to check `Array.isArray(c)`, without a comment explaining why,
and it quietly handled both shapes. The web looked fine, which
meant the data looked fine, and the only place the truth showed up
was a crash log from the one platform that trusted the documentation.

Here is how the decision record put it afterward:

> A second reader coping is not evidence of a correct contract; it is
> what hides an incorrect one.

That story is the shape of every app in this template. There is one
source of data, many readers of it, and the readers will disagree
quietly unless something makes them disagree out loud.

## What I want

I want the person watching on a Roku in their living room and the
person watching on a phone on the bus to get the same film, the same
rights decision, the same search results, and the same saved list. I do
not want them to get the same screen. The Roku should feel like a Roku.
The phone should feel like a phone.

**Same verb, native idiom.**

That line is the whole parity rule. The verbs (browse, search, save,
play, share) are identical everywhere. The idioms, meaning the controls
and gestures and layouts that carry each verb, are whatever each
platform's own people already know. Search on iOS is `.searchable`. On
Android it is a Material `SearchBar`. On the web it is
`<input type="search">` with the query in the URL. On a TV it is a
focusable field you reach with a remote.

The Archive Watch plan said it plainly before any port began: the tvOS
app "is *not* the definitive version to be shrunk onto other screens."

## Two layers

Every app built from this template has two layers, and you build them
differently.

**The data plane is built once.** Whatever your app is about (films,
trading cards, trivia questions, posts), there is one pipeline that
decides what exists, what is allowed, and what it is called. It
publishes its result: a database file on a GitHub Release, JSON on
GitHub Pages, or a small hosted backend when people need to see one
another's data. Every app is a consumer of that result, and only a
consumer.

Archive Watch's contract states its one rule like this:

> No client re-implements or re-hosts any part of the pipeline.

So no app re-derives which films are for adults, or re-checks rights,
or re-matches a film to its poster. Those answers are baked into the
published database, and each app filters with a `WHERE` clause. When
the pipeline fixes a rights mistake, all nine surfaces inherit the fix
without a single app update.

**The apps are built natively, once per ecosystem.** There are three
main codebases, not nine:

- **Apple** (iPhone, iPad, Mac, Apple TV) is one Xcode target in Swift.
  A shared `Core/` folder holds the models, the networking, the query
  logic and the sync. In a media app, 60 to 70 percent of the Swift is
  in `Core/` and compiles for every Apple device. Only the views differ.
- **Android** (phones, tablets, Google TV, Fire TV) is Kotlin and
  Jetpack Compose. One app, with the TV experience chosen at runtime.
- **The web** is plain HTML, CSS and JavaScript with no build step. It
  is also the reach play: no install, every browser, and the canonical
  link that every native app's Share button points to. The smart-TV
  web platforms (LG, Samsung) reuse it.

A Roku channel, if you reach one, is a fourth: Roku has its own
language (BrightScript) and nothing to share with the others except the
data plane. That is exactly why the data plane matters.

## Why native, and what it costs

A cross-platform framework (Flutter, React Native, Compose
Multiplatform) would give you one codebase instead of three. That is a
real advantage, and a lot of good apps are built that way.

I chose native anyway, for two reasons. The first is that each
platform's newest ideas arrive in its own toolkit first: Liquid Glass
on iOS, the focus engine on tvOS, Material 3 Expressive on Android.
A framework reaches them late, or approximately. The second reason is
newer, and it is a guess I am willing to defend. With an agent writing
most of the code, I think the cost of a second and third codebase
dropped a great deal. The cost of an app that feels slightly foreign on
every device it runs on did not drop at all.

The price is discipline. Three codebases drift unless something holds
them together. This template holds them together with four things.

1. **`PARITY.md`.** Every feature a person can use is a row. Every
   platform is a column. Every cell is honest: ✅ shipped, 🚧 in
   progress, ⏳ planned, 🚫 not doing it (with the reason), or n/a when
   the platform cannot have it at all. A feature ships with its row, in
   the same commit, or it did not ship.
2. **The data contract** (`docs/DATA-CONTRACT.md`, seeded from
   `docs/templates/`). It names every published file, its shape, and the
   query verbs every app must reproduce. It is written the day the
   second app exists. And after the Roku crash, it is *tested*: a script
   asserts the documented shape over the real published file, so the
   producer breaks the build instead of a TV breaking in someone's
   living room.
3. **One client per app for every network call.** `js/api.js` on the
   web, a shared singleton in Swift, one Ktor client in Kotlin. Views
   never fetch on their own. That is where the contract is read, so it
   is the one place to fix when the contract changes.
4. **Deep links as a contract** (`DEEP_LINKS.md`). Every screen worth
   sharing has a web address, and every native app opens that same
   address. Share a film from an Apple TV and a friend on Android lands
   on the same film.

## The skills that carry this

When you (or your agent) reach this part of the work, these skills hold
the detail:

- `cross-platform-parity-discipline`: running `PARITY.md` and auditing it.
- `shared-data-plane-contract`: publishing the data plane, and what a
  browser can and cannot fetch.
- `multiplatform-expansion-method`: finding the seam and ordering the
  platforms.
- `native-platform-first`: exhausting the platform's own controls before
  building a custom one.
- `canonical-entity-identity`: one stable ID per thing, on every platform.

## What to do

1. Write one sentence naming the data your app is about, and one naming
   where it will be published. Put both in `DECISIONS.md` as your
   data-plane decision, with the *why* first.
2. List your app's first five verbs. Add each as a row in `PARITY.md`,
   with a cell for every platform you chose in stage 00.
3. For one of those verbs, write its idiom on each platform in the Notes
   column. If you do not know a platform's idiom, ask your agent to
   look it up in that platform's skill, and check the answer against the
   platform's own documentation.
4. Open `js/api.js`. Find where the web app would call your data. That
   is the first line of your contract.

Be ready to show your five rows and explain one idiom you had to look up.
