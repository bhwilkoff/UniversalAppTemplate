# Building the credential: notes for M4

Research notes, 2026-10-03, for building the one credential a cohort
earns (DECISIONS.md, "The credential"), following on from
`assessment-and-credentials-notes.md` (Topic B). Every claim has its
source beside it. **Checked here** means I ran it myself on this date;
**Unverified** means I could not confirm it from a primary source or a
test. These are notes, not site copy.

## What we built, in one paragraph

An Open Badges 3.0 `OpenBadgeCredential`, issued by
`did:web:humanshaped.org`, signed with a Data Integrity proof using the
`eddsa-rdfc-2022` cryptosuite and an Ed25519 key held off the web. Ten
achievements, one per level, where the level is the number of platforms
the app is published on, the web first. The signing request is copied
from `/teach/`, signed by `tools/credential/sign.mjs` on the signer's
computer, attached back on `/teach/` (which checks it first), and shown
at `/credential/?id=<id>`, which checks the signature in the browser.

## 1. The data model (Open Badges 3.0, VC 2.0)

- **Version.** Open Badges 3.0, Final Release, document version 1.4.5,
  issued 2026-06-29 ([spec](https://www.imsglobal.org/spec/ob/v3p0)).
- **Contexts, in order:** `https://www.w3.org/ns/credentials/v2`, then
  `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json` (spec,
  B.1.2). **Checked here:** context-3.0.3 is the newest that exists
  (3.0.4 and 3.0.5 return 404). Copies are kept at
  `/credential/contexts/`, and the VC 2.0 copy's SHA-256
  (`59955ced…ec92734`) is the one the W3C publishes; a test guards both.
- **Required on the credential:** `@context`, `id`, `type` (with
  `VerifiableCredential` and `OpenBadgeCredential`), `issuer`,
  `validFrom`, `credentialSubject` (spec B.1.2;
  [JSON schema](https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json)).
  `name`, `description`, `evidence`, and `credentialStatus` are optional.
  A proof is required to be verifiable (spec section 8).
- **Issuer profile:** only `id` and `type: Profile` are required (B.1.14).
- **Subject:** `type: AchievementSubject` and `achievement` required, and
  "either id or at least one identifier MUST be supplied" (B.1.3). We use
  both: `id` is the holder's GitHub profile URL, and an `IdentityObject`
  with `identityType: name`, `hashed: false` carries the name they chose
  on GitHub (B.1.12, B.1.30).
- **Achievement:** `id`, `type`, `name`, `description`, and `criteria`
  required (B.1.1). Our `id`s are `.json` URLs on this site, because
  GitHub Pages cannot serve JSON and HTML at one address by content
  negotiation; `criteria.id` points to the human page. **Unverified:**
  no source says outright that a `.json` id is fine; the field is only
  typed URI.
- **Evidence:** only `type: Evidence` required (B.1.9). One entry each for
  the repository, the live web app, and each further platform's link.
- **Revocation:** `credentialStatus` is optional (B.1.2, B.1.22). We do
  not publish a Bitstring Status List: the credential page asks the hub
  whether a credential was revoked. A wallet holding the file will not
  learn of a revocation (see decisions).

## 2. Signing at $0

- OB 3.0 allows VC-JWT (section 8.2) or embedded Data Integrity proofs
  (8.3), and for embedded proofs conformance "is currently limited to the
  Data Integrity EdDSA Cryptosuites v1.0 suite" (spec section 8). The
  [certification guide](https://www.imsglobal.org/spec/ob/v3p0/cert/)
  (v1.5, 2026-06-15) requires `eddsa-rdfc-2022` or `ecdsa-sd-2023` and
  that a badge "passes JSON-LD validation in safe mode". So we use
  `eddsa-rdfc-2022`, and canonicalize in safe mode everywhere, so that a
  property the contexts do not define is refused rather than silently
  left out of what is signed.
- The algorithm ([W3C vc-di-eddsa](https://www.w3.org/TR/vc-di-eddsa/),
  Recommendation 2025-05-15, section 3.2): canonicalize the proof options
  (carrying the document's `@context`) and the document without its
  proof with RDFC-1.0, SHA-256 each, sign the proof options' hash followed
  by the document's hash with Ed25519, and encode as base58btc multibase.
  Keys are Multikey with header `0xed01` (`z6Mk…`).
- **Checked here:** our implementation (`assets/credential-lib.js`, about
  150 lines of logic, with jsonld for canonicalization and Web Crypto for
  Ed25519) produces signatures byte for byte identical to Digital
  Bazaar's `@digitalbazaar/vc` with the `eddsa-rdfc-2022` cryptosuite,
  and each verifies the other's (`tools/credential/test/`, 19 tests).
- **VC-JWT** would be simpler to check in a browser, but the wallets and
  verifiers below are built around Data Integrity, so it was not chosen.

## 3. Who accepts it

| Verifier or wallet | What I found | Status |
|---|---|---|
| 1EdTech validator ([vc.1ed.tech](https://vc.1ed.tech), [source](https://github.com/1EdTech/digital-credentials-public-validator)) | Verifies `eddsa-rdfc-2022`, resolves did:web. Its resolver compares `assertionMethod` entries as strings with the full key URL, so `did.json` uses absolute ids in both places (ours does; a test guards it). Nothing in the code requires a certified issuer. | **Unverified** with a real credential |
| DCC VerifierPlus ([verifierplus.org](https://verifierplus.org), [source](https://github.com/digitalcredentials/verifier-plus), [verifier-core](https://github.com/digitalcredentials/verifier-core)) | Supports `eddsa-rdfc-2022` and did:web. An issuer outside its known registries is a yellow warning, not a failure ([ResultLog.tsx](https://github.com/digitalcredentials/verifier-plus/blob/main/app/components/ResultLog/ResultLog.tsx)). | **Unverified** with a real credential |
| Learner Credential Wallet ([user guide](https://lcw.app/userguide.html), [repo](https://github.com/openwallet-foundation-labs/learner-credential-wallet)) | Imports by file, pasted JSON, or URL; changelog adds `eddsa-rdfc-2022`; unknown registries show a warning and may disable links. Now under OpenWallet Foundation Labs ([history](https://lcw.app/history.html)). | **Unverified** |
| LearnCard ([interop guide](https://github.com/learningeconomy/LearnCard/blob/main/docs/how-to-guides/interoperate-with-learncard.md)) | Imports pasted or uploaded JSON and verifies DataIntegrityProof (EdDSA). | **Unverified** whether it resolves any did:web |
| Credly ([announcement](https://learn.credly.com/blog/credly-supports-open-badge-3.0), [import help](https://support.credly.com/hc/en-us/articles/30107800919707)) | Imports OB 3.0 from any issuer, but matches the badge to the account by a hashed email in the subject. Ours carries no email, so a Credly import will most likely fail. | **Unverified**, likely no |
| Open Badge Passport ([OBF](https://openbadgefactory.com/en/your-badges-are-now-open-badges-3-0/)) | Accepts 3.0 "from any certified issuer". We are not certified. | **Unverified**, likely no |

The research says it plainly: issue one real credential to ourselves and
try it in each of these before telling anyone it works there. The pages
only promise "a credential wallet that reads that standard" and name
VerifierPlus as a place to check it.

## 4. did:web on GitHub Pages

- `did:web:humanshaped.org` resolves to
  `https://humanshaped.org/.well-known/did.json`, and the document's `id`
  must equal the DID ([did:web](https://w3c-ccg.github.io/did-method-web/)).
- GitHub Pages serves dot-folders when `.nojekyll` exists
  ([Jekyll options](https://jekyllrb.com/docs/configuration/options/));
  the site has it (`https://humanshaped.org/.nojekyll` returns 200).
  **Checked here:** Pages sends `access-control-allow-origin: *`, which
  browser-based verifiers need. `did.json` is committed with no keys
  until Ben runs `make-key.mjs`.

## 5. Libraries

| Library | Version | License | Use |
|---|---|---|---|
| jsonld (Digital Bazaar) | 9.0.0 | BSD-3-Clause | Canonicalization in the tool, and in the browser from `cdn.jsdelivr.net/npm/jsonld@9.0.0/dist/jsonld.min.js` (197 KB, loaded only when a signature is checked, pinned with subresource integrity) |
| @digitalbazaar/vc, data-integrity, eddsa-rdfc-2022-cryptosuite, ed25519-multikey, security-document-loader | 7.3.0, 2.5.0, 1.3.0, 1.3.1, 3.2.0 | BSD-3-Clause | Tests only, as the reference to match |
| Web Crypto Ed25519 | Chrome 137, Firefox 129, Safari 17, Node 16.17 ([MDN data](https://github.com/mdn/browser-compat-data/blob/main/api/SubtleCrypto.json)) | n/a | Signing in Node, checking in browsers; an older browser sees "cannot check" rather than a false answer |

**Checked here:** the credential page checked a signature with the CDN
jsonld and Chrome's Web Crypto, and caught a one-field change.

## 6. Privacy choices

- The old rule made every `credentials` row public, which would have let
  anyone list every holder and their cohort. Now the public reads one
  credential at a time through `public_credential(id)`, by the link the
  holder shares; waiting and revoked credentials show nothing about the
  person. The credential page is `noindex`.
- The credential names the holder by their GitHub display name (or
  username) and links their GitHub profile; it holds no email.
- The holder can delete their own credential record at any time.

## Open questions for Ben

1. **Credly and Open Badge Passport.** Both likely need either an email
   in the credential (Credly) or a certified issuer (Passport). Adding a
   hashed email means asking each holder for one; certification costs
   money. The default built: neither.
2. **Revocation in wallets.** Without a published status list, a revoked
   credential still checks out in a wallet; only its page says it was
   revoked. A Bitstring Status List file on this site would fix that at
   $0, with one more signing step per revocation.
3. **What counts as "published" on a platform**: a store listing only, or
   also a public test link or a direct download? The pages say "where
   other people can get it for themselves".
4. **Ten platforms**, with iPhone and iPad as one and each TV platform as
   its own. Should the Apple platforms in one App Store listing count
   separately?
