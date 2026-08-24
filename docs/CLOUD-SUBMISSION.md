# Cloud build & store submission runbook

Turnkey, command-line submission for all four store binaries — **macOS / iOS / tvOS** (Apple App
Store) and **Android** (Google Play) — with no Xcode GUI, no Android Studio, and no manual uploads.
This is the pipeline battle-tested on shipping apps; it lives in seven files:

| File | Role |
|---|---|
| `.github/workflows/appstore-build.yml` | Cloud (GitHub Actions) build+sign+upload of the 3 Apple apps |
| `tools/submit-appstore.sh` | The Apple archive→sign→upload driver (runs locally OR in CI) |
| `tools/asc_certs.py` | Find/create an Apple signing cert via the ASC REST API |
| `tools/asc_profiles.py` | Create App Store provisioning profiles per bundle id |
| `tools/ci_make_signing_p12.py` | Mint a CI signing cert → `.p12` (to seed the GH secrets) |
| `tools/submit-play.sh` | Build the signed AAB + publish to Google Play |
| `tools/play-publish.py` | The Play Developer API v3 "edits" upload/release transaction |

> **Before first use:** `chmod +x tools/submit-appstore.sh tools/submit-play.sh` (git preserves the
> bit after you commit it). Fill in the `# FILL IN` / `<PLACEHOLDER>` values (see each section).

Placeholders used throughout: `AppName` (Xcode scheme/product, no spaces), `com.example.appname`
(the shared Apple bundle id AND the Play applicationId), `<TEAM_ID>` (your 10-char Apple Team ID),
`<ORG_NAME>` (org name exactly as it appears in your signing certs).

---

## 1. Why build in the cloud

The dev Mac problem, and the two rejections that force this pipeline:

- **ITMS-90301** — Apple **rejects App Store builds made on a BETA macOS**. If your dev Mac runs a
  beta OS (common when you target the newest SDK / Liquid Glass early), you *cannot submit locally*.
- **ITMS-90111** — the **Xcode/SDK floor**: App Review rejects a build made with an Xcode/SDK older
  than Apple's current floor, which Apple raises every few weeks. A build number ending in a
  lowercase letter (e.g. `27A5194q`) is a *beta* and is always rejected — you need a GA or RC.

A **GitHub-hosted macOS runner** always has a current released macOS + Xcode, so it clears both — and
it's **free for a public repo**. `appstore-build.yml` runs `tools/submit-appstore.sh` there.

**TestFlight still works from a beta box** — you can always get builds to internal/external testers
locally; only *App Review submission* needs the released toolchain. So testing is never blocked.

> The `macos-NN` runner label + the Xcode version glob in `appstore-build.yml` are a **moving
> target** — bump them when ITMS-90111 recurs (see the header comment in that file).

---

## 2. Apple pathway (the happy path)

Apple platforms can all live in **one App Store Connect record** sharing **one bundle id**
(`com.example.appname`) — iOS is added as a second platform to the tvOS record, macOS as a third.
Build numbers are per-platform within the record.

1. **Bump the version + push.** Edit `AppVersion.xcconfig` (patch `MARKETING_VERSION` +1 and
   `CURRENT_PROJECT_VERSION` +1), commit, push. The runner builds the committed version, and the
   build number must be ahead of the last upload for each platform.
2. **Run the workflow:**
   ```bash
   gh workflow run appstore-build.yml -f platform=all        # or: mac | ios | tvos
   gh run watch $(gh run list --workflow=appstore-build.yml -L1 --json databaseId -q '.[0].databaseId')
   ```
3. **Finish in App Store Connect (web).** Once each build processes (a few minutes), open your app
   record → each platform version → **select the build** → **Submit for Review**. (Upload ≠ submit.)

To run the same thing **locally** on a machine with a *released* Xcode (no beta):
```bash
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer tools/submit-appstore.sh all
```
The script refuses a `*beta*` `DEVELOPER_DIR`. It archives → resolves the embedded bundle ids →
ensures the Apple Distribution cert (+ Mac Installer cert for macOS) → creates an App Store profile
per bundle id → writes a manual `ExportOptions.plist` → exports + uploads. Re-running is safe.

---

## 3. Apple: MANUAL signing + the 7 CI secrets

**Why manual, not automatic/cloud signing:** cloud-managed ("Automatically manage signing") signing
can fail for a team's ASC API key with *"Cloud signing permission error"* — but the **same key can
create certs + profiles directly via the ASC REST API**. So the pipeline signs manually: it mints/reuses
an Apple Distribution cert, builds App Store provisioning profiles, and hands xcodebuild a manual
`ExportOptions.plist`. On CI the cert+key come from a `.p12` imported into a temp keychain; the
`ASC_DIST_CERT_ID` env var tells `submit-appstore.sh` to use that cert directly (skip find/create).

**The 7 required GitHub secrets** (`appstore-build.yml` consumes all of them):

| Secret | What it is |
|---|---|
| `APPLE_DIST_P12` | base64 of the **Apple Distribution** `.p12` (leaf cert + private key) |
| `APPLE_INSTALLER_P12` | base64 of the **3rd-Party-Mac-Installer** `.p12` (macOS `.pkg` signing) |
| `APPLE_P12_PASSWORD` | the password protecting BOTH `.p12`s |
| `APPLE_DIST_CERT_ID` | the Distribution cert **id** (ties the App Store profiles to that cert) |
| `ASC_KEY_P8` | base64 of the App Store Connect API key `AuthKey_<KEYID>.p8` |
| `ASC_KEY_ID` | the ASC API **Key ID** |
| `ASC_ISSUER_ID` | the ASC API **Issuer ID** (a UUID) |

The workflow also reads `ASC_TEAM_ID` / `ASC_ORG_NAME` (wired from `secrets.APPLE_TEAM_ID` /
`secrets.APPLE_ORG_NAME`, or just hardcode them in `submit-appstore.sh`'s PER-APP CONFIG block).

### Seeding the secrets (one-time)

First get an **App Store Connect API key**: ASC ▸ *Users and Access ▸ Integrations ▸ App Store
Connect API* ▸ generate a key (Role: **App Manager** or Admin). Note the **Key ID** + **Issuer ID**;
download `AuthKey_<KEYID>.p8` (one download only) to `~/.appstoreconnect/private_keys/`.

```bash
export ASC_KEY_ID=<KEYID> ASC_ISSUER_ID=<ISSUER-UUID> ASC_ORG_NAME="<ORG_NAME>"
export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8
PW="$(openssl rand -hex 16)"

# Mint a DEDICATED CI Apple Distribution cert → .p12 (no keychain import, no GUI prompt).
# Apple allows 2 Apple Distribution certs; this uses the 2nd slot.
read DIST_ID DIST_P12 < <(python3 tools/ci_make_signing_p12.py distribution build/ci-dist.p12 "$PW")
# And the Mac Installer cert (only needed if you ship macOS .pkg):
read INST_ID INST_P12 < <(python3 tools/ci_make_signing_p12.py mac_installer build/ci-inst.p12 "$PW")

# Push all 7 secrets.
gh secret set APPLE_DIST_P12      < <(base64 -i "$DIST_P12")
gh secret set APPLE_INSTALLER_P12 < <(base64 -i "$INST_P12")
gh secret set APPLE_P12_PASSWORD  --body "$PW"
gh secret set APPLE_DIST_CERT_ID  --body "$DIST_ID"
gh secret set ASC_KEY_P8          < <(base64 -i "$ASC_KEY_PATH")
gh secret set ASC_KEY_ID          --body "$ASC_KEY_ID"
gh secret set ASC_ISSUER_ID       --body "$ASC_ISSUER_ID"
# optional: gh secret set APPLE_TEAM_ID --body "<TEAM_ID>"; gh secret set APPLE_ORG_NAME --body "<ORG_NAME>"
```
Keep the `.p12`s as a durable backup (e.g. `~/.appstoreconnect/private_keys/`). **Never commit
them** (`build/` and `*.p8`/`*.p12` should be gitignored).

`ci_make_signing_p12.py` mints a **dedicated** CI cert (not your existing one) because an existing
cert's private key lives in the login keychain and exporting it triggers a GUI auth prompt; minting
fresh means we generate the keypair locally and build the `.p12` with openssl, no prompt.

---

## 4. Apple: the two cert gotchas (both cost real hours)

Baked into `asc_certs.py` + `ci_make_signing_p12.py` — do not "fix" them away:

1. **`csrContent` must be RAW PEM, not base64.** When creating a cert via
   `POST /v1/certificates`, `csrContent` is the CSR file's **raw PEM string, WITH the
   `-----BEGIN/END CERTIFICATE REQUEST-----` headers**. Base64-encoding the PEM (double-encoding) is
   rejected `409 ENTITY_ERROR.ATTRIBUTE.INVALID "Invalid Certificate"`.

2. **The `.p12` must be built with `openssl pkcs12 -export -legacy`.** OpenSSL 3 defaults to
   PBES2 / AES-256 / SHA-256 encryption, which macOS `security import` **cannot read** — it fails
   *"MAC verification failed"*. `-legacy` uses the SHA1/3DES PBE the macOS keychain accepts.

The JWT for every ASC API call is **ES256** (the `.p8` is an EC P-256 key) via **PyJWT +
cryptography**. Homebrew's `python3` is externally-managed (PEP 668) and often lacks PyJWT, which
made the cert step die `ModuleNotFoundError: No module named 'jwt'` — so `submit-appstore.sh`
**self-heals**: if `python3` can't `import jwt`, it provisions `tools/.asc-venv` (gitignored) and
runs the cert/profile tools from it.

---

## 5. Google Play pathway

`submit-play.sh` bumps `versionCode`, builds the release AAB with your upload key
(`~/.gradle/gradle.properties`), then `play-publish.py` runs the **Play Developer API v3 "edits"
transaction**: insert an edit → upload the `.aab` → point a track at the new versionCode with release
notes → commit.

```bash
tools/submit-play.sh --track production --notes "What's new…"          # bump + build + publish
tools/submit-play.sh --track internal --draft                          # internal draft, no rollout
tools/submit-play.sh --track production --rollout 0.1 --notes "…"      # staged 10% rollout
```

Key facts baked in:
- **`versionCode` must be unique + monotonic** — Play rejects any previously-uploaded versionCode,
  even unreleased ones. The script bumps it in `android/app/build.gradle.kts` (skip with `--no-bump`).
- **`applicationId` ≠ `namespace`.** `PLAY_PACKAGE` (default `com.example.appname`) must be the Play
  **applicationId**, which can differ from the Gradle `namespace`. Set it in `play-publish.py` or via
  the env var.

### The service-account JSON key (one-time)

`play-publish.py` needs a **Google Play Developer API service-account JSON key** at
`~/.config/play/PLAY_SERVICE_ACCOUNT.json` (or set `PLAY_SERVICE_ACCOUNT_JSON`). Get it:

1. **Google Cloud Console** → new project → enable `androidpublisher.googleapis.com`.
2. **IAM & Admin → Service Accounts → Create** (skip the roles step). → **Keys → Add key → JSON**.
3. Move it: `mkdir -p ~/.config/play && mv ~/Downloads/*.json ~/.config/play/PLAY_SERVICE_ACCOUNT.json && chmod 600 ~/.config/play/PLAY_SERVICE_ACCOUNT.json`
4. **Play Console → Users and permissions → Invite** the service account's email, grant **Release to
   production** (+ **Release to testing tracks**) for your app. (You **no longer need** to "link" the
   Play account to a Cloud project — ignore old guides that hinge on that.)

> **The 2026 org-policy blocker + workaround.** If JSON-key creation is greyed out / errors *"Service
> account key creation is disabled"*, your Google account belongs to a Cloud **organization** that
> enforces `iam.disableServiceAccountKeyCreation` (and its `iam.managed.…` twin). Either turn both
> policies **Off** at the org level (needs Organization Policy Administrator), OR — **easiest escape
> hatch** — create the project under a **personal Gmail with no organization** (no org → no policy →
> keys just work). A service account from *any* project can be invited into Play Console; identities
> need not match.

Connectivity check before a real release (proves key + permissions, zero cost):
```bash
python3 -c "
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
c=service_account.Credentials.from_service_account_file(
  os.path.expanduser('~/.config/play/PLAY_SERVICE_ACCOUNT.json'),
  scopes=['https://www.googleapis.com/auth/androidpublisher'])
s=build('androidpublisher','v3',credentials=c,cache_discovery=False)
print('OK edit id', s.edits().insert(packageName='com.example.appname',body={}).execute()['id'])
"
```
(A GitHub Actions Android release path also exists — see `.github/workflows/android-build.yml`, which
uploads to the internal track on a `v*-android` tag using the `PLAY_SERVICE_ACCOUNT_JSON` secret.)

---

## 6. Compile-guard gotchas for the GA toolchain

The runner uses a **released (GA/RC)** Xcode, which may be a whole major behind your beta dev box.
Two things break a GA compile that a beta compile hides:

- **`#if compiler(>=X.Y)` — not just `#available`.** If you call an API that exists **only in a newer
  SDK** (e.g. a macOS-27-only symbol), a bare `if #available(macOS 27, *)` still won't **compile** on
  the older GA SDK — the symbol isn't in that SDK at all. Wrap such sites in
  `#if compiler(>=X.Y)` (the newer toolchain's Swift version) with the older-SDK API in the `#else`.
  This makes the same source compile on BOTH the beta toolchain (new API) and the GA toolchain (old
  API), and auto-switches once the new toolchain goes GA.

- **No tuple-sort closures in a type-checked hot path.** Sorting by a multi-field tuple key inside a
  `.sorted { … }` closure can blow the Swift type-checker's budget on the GA compiler
  ("the compiler is unable to type-check this expression in reasonable time") even when the beta
  compiles it fine. Extract an explicit comparator / precompute the sort key into a named value.

Diagnose an ITMS-90111 rejection by comparing the latest **released/RC** Xcode on
<https://developer.apple.com/news/releases> to your build's `xcodebuild -version`, then bump the
runner + Xcode glob in `appstore-build.yml` and rebuild all three Apple platforms at a fresh build
number.
