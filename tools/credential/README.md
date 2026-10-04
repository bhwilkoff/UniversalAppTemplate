# The credential's signing tools

I want the one credential a cohort earns to be something its holder can
carry anywhere and anyone can check, and I want it to cost nothing to
issue. So humanshaped.org signs its own Open Badges 3.0 credentials, as
the issuer `did:web:humanshaped.org`, with a key that lives on the
signer's computer and never on the web. The research behind each choice
is in `research/notes/credential-build-notes.md`.

These tools do three things, and the credential logic itself lives in
`assets/credential-lib.js`, so the site and the tools can never disagree.

| Tool | What it does |
|---|---|
| `make-key.mjs` | Makes the signing key once, outside this repository, and adds only its public half to `.well-known/did.json`. |
| `sign.mjs` | Reads the signing request that `/teach/` copies, builds the credential, signs it with `eddsa-rdfc-2022`, checks the new signature, and prints the signed file. |
| `sign-waiting.mjs` | Signs the request on the clipboard with the key on this computer, checks it against the live `did.json`, and puts the signed file back on the clipboard. |
| `verify.mjs` | Checks a signed file against the live `did.json`, or a local copy with `--did-json`. |
| `write-files.mjs` | Rewrites the ten achievement files in `credential/achievements/` after a level's words change. |

## Making the real key, once

This is the one step only Ben does, on his own Mac, in a terminal in this
folder of the `site` branch:

1. `npm ci --prefix tools/credential --omit=dev`
2. `node tools/credential/make-key.mjs --out ~/.humanshaped/credential-key-1.json`
3. Copy `~/.humanshaped/credential-key-1.json` somewhere safe that is not
   on the web, such as a password manager's secure note. A lost key
   cannot sign again; a leaked one can sign as humanshaped.org.
4. Commit and push `.well-known/did.json`, which now lists the public
   key, and check that https://humanshaped.org/.well-known/did.json shows
   it and https://humanshaped.org/credential/issuer/ says a key is
   published.

The tool refuses to write a key anywhere inside this repository, and
refuses to overwrite one. If a key is ever lost or leaked, make
`key-2` with `--id key-2`, and remove a leaked key from `did.json`
(which makes everything it signed stop checking out, so re-sign those).

## Signing a credential

*The signer's way, written by Claude, awaiting Ben's review.* A teacher
whose row has `can_sign` (migration 20261004040000; Ben's does, and
anyone else's only by a change made by hand) sees "Waiting to be signed"
on `/teach/`, with every credential recorded in any cohort:

1. Press "Copy the signing request" on one.
2. In this folder of the `site` branch, on the computer that holds the
   key: `node tools/credential/sign-waiting.mjs`. It reads the request
   from the clipboard, shows what it is signing, signs it with
   `~/.humanshaped/credential-key-1.json` (or `--key`), checks the new
   signature against the live `did.json`, and puts the signed file back
   on the clipboard.
3. Paste it into the card on `/teach/` and press "Check and attach it".
   The page checks the file says exactly what was recorded and that its
   signature checks out, and only then saves it. Its holder finds it on
   their account page and on the cohort page from then on.

A teacher of the cohort can still do it the older way, below.

1. On `/teach/`, open the finished cohort, record the person's
   credential, and click "Copy what the signing tool needs".
2. `pbpaste | node tools/credential/sign.mjs --key ~/.humanshaped/credential-key-1.json > signed.json`
   (it shows what it is signing before it signs).
3. Back on `/teach/`, "Attach the signed file" and choose `signed.json`.
   The page checks that the file says exactly what was recorded and that
   its signature checks out before it saves it.
4. Delete `signed.json`; the credential now lives in the hub, and its
   holder can download it from their credential's page.

`sign-credential.workflow.yml` does step 2 in GitHub Actions instead, with
the key as a secret; its first lines say why it cannot live in this
branch and what it needs before it runs.

## Tests

`npm ci --prefix tools/credential && npm test --prefix tools/credential`
signs with a throwaway key made in a temporary folder, checks that
changing any field breaks the signature, and checks our signatures against
Digital Bazaar's reference libraries in both directions (they match byte
for byte). The pure logic is also tested with no libraries at all by
`node --test tools/test/*.mjs`.
