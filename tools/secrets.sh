#!/bin/bash
# The only way an agent or the owner touches a secret value (.claude/skills/secrets-without-bookkeeping).
# Fixed recipes and fixed names only, so an exact permission rule can allow it. A value is never
# echoed, never put on a command line, and never written to a file: it moves from where it is made or
# kept (openssl, a downloaded file, the login Keychain) through a pipe into the one place that uses it
# (a Worker secret, a GitHub Actions secret, the Keychain). Names come from tools/app_config.py
# (GITHUB_REPO, SECRETS_NAME, WORKER_DIR, WORKER_NAME).
#
#   tools/secrets.sh list                         names only, from all three stores
#   tools/secrets.sh gen SESSION_SECRET           a new random Worker secret
#   tools/secrets.sh put-file NAME FILE           a downloaded key into the Worker, then the file is deleted
#                                                 (NAME: APPLE_PRIVATE_KEY; extend FILE_NAMES for your own)
#   tools/secrets.sh keychain-import-asc [P8] [ISSUER_ID] [--delete]
#                                                 the ASC API key into the Keychain (<name>:ASC_KEY_P8 as
#                                                 base64, <name>:ASC_KEY_ID from the file name,
#                                                 <name>:ASC_ISSUER_ID); --delete removes the .p8 once the
#                                                 Keychain copy is checked byte for byte (the owner approves it)
#   tools/secrets.sh renew-signing                mint new CI distribution AND Mac installer certificates
#                                                 (they share APPLE_P12_PASSWORD) and set the four GitHub secrets
#
# Anything else is refused before any command runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cfg() { (cd "$ROOT/tools" && python3 -c "import app_config; print(app_config.$1)"); }
REPO="$(cfg GITHUB_REPO)"
KC_ACCOUNT="$(cfg SECRETS_NAME)"
KC_PREFIX="$KC_ACCOUNT:"
WORKER_DIR="$(cfg WORKER_DIR)"
WORKER_NAME="$(cfg WORKER_NAME)"
[ -n "$REPO" ] || { echo "secrets.sh: set GITHUB_REPO in tools/app_config.py" >&2; exit 2; }
GEN_NAMES=(SESSION_SECRET)
FILE_NAMES=(APPLE_PRIVATE_KEY)

die() { echo "secrets.sh: $*" >&2; exit 2; }
in_list() { local x=$1; shift; local n; for n in "$@"; do [ "$n" = "$x" ] && return 0; done; return 1; }
wrangler() {
  [ -n "$WORKER_NAME" ] || die "this app has no Worker (WORKER_NAME is empty in tools/app_config.py)"
  (cd "$ROOT/$WORKER_DIR" && npx --no-install wrangler "$@")
}

# Prints a Keychain value to stdout: call it only inside a pipe or $(...), never bare.
kc_get() { security find-generic-password -a "$KC_ACCOUNT" -s "$KC_PREFIX$1" -w; }

# Stores stdin as a Keychain value through `security -i`, which reads the command
# on stdin, so the value is never on a command line (ps). One token, no spaces.
kc_put() {
  local v
  IFS= read -r v || true
  [[ "$v" =~ ^[A-Za-z0-9+/=_.-]+$ ]] || die "refusing to store $1: not a single token"
  printf 'add-generic-password -U -a %s -s %s -w %s\n' "$KC_ACCOUNT" "$KC_PREFIX$1" "$v" | security -i >/dev/null
}

b64() { base64 < "$1" | tr -d '\n'; }

recipe="${1:-}"
[ $# -gt 0 ] && shift

case "$recipe" in
  list)
    [ $# -eq 0 ] || die "list takes no arguments"
    echo "GitHub Actions ($REPO):"
    gh secret list --repo "$REPO" --json name --jq '.[].name' | sed 's/^/  /'
    echo "Cloudflare Worker ($WORKER_NAME):"
    if [ -n "$WORKER_NAME" ]; then wrangler secret list --format json | python3 -c 'import json,sys; [print("  " + s["name"]) for s in json.load(sys.stdin)]'; fi
    echo "login Keychain ($KC_PREFIX*):"
    security dump-keychain 2>/dev/null | sed -n "s/.*\"svce\"<blob>=\"$KC_PREFIX\([A-Za-z0-9_]*\)\".*/  \1/p" | sort -u
    ;;

  gen)
    [ $# -eq 1 ] || die "gen takes one name"
    in_list "$1" "${GEN_NAMES[@]}" || die "gen makes only: ${GEN_NAMES[*]}"
    openssl rand -base64 48 | tr -d '\n' | wrangler secret put "$1" >/dev/null
    echo "$1: a new value is set on the Worker (not shown)"
    ;;

  put-file)
    [ $# -eq 2 ] || die "put-file takes a name and a file"
    in_list "$1" "${FILE_NAMES[@]}" || die "put-file takes only: ${FILE_NAMES[*]}"
    [ -f "$2" ] && [ ! -L "$2" ] || die "not a regular file: $2"
    wrangler secret put "$1" < "$2" >/dev/null
    rm -f -- "$2"
    echo "$1: set on the Worker from the file, and the file is deleted"
    ;;

  keychain-import-asc)
    delete=0 p8="" issuer=""
    for a in "$@"; do
      case "$a" in
        --delete) delete=1 ;;
        *.p8) p8="$a" ;;
        *) [[ "$a" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]] || die "not an issuer id or a .p8: an argument"
           issuer="$a" ;;
      esac
    done
    if [ -z "$p8" ]; then
      shopt -s nullglob
      found=("$HOME"/.appstoreconnect/private_keys/AuthKey_*.p8)
      [ ${#found[@]} -eq 1 ] || die "found ${#found[@]} AuthKey_*.p8 files; name the one to import"
      p8="${found[0]}"
    fi
    [ -f "$p8" ] && [ ! -L "$p8" ] || die "not a regular file: $p8"
    kid="$(basename "$p8")"
    [[ "$kid" =~ ^AuthKey_([A-Z0-9]{10})\.p8$ ]] || die "the file is not named AuthKey_<KEYID>.p8"
    kid="${BASH_REMATCH[1]}"
    b64 "$p8" | kc_put ASC_KEY_P8
    printf '%s\n' "$kid" | kc_put ASC_KEY_ID
    [ -n "$issuer" ] && printf '%s\n' "$issuer" | kc_put ASC_ISSUER_ID
    cmp -s <(kc_get ASC_KEY_P8 | tr -d '\n') <(b64 "$p8") || die "the Keychain copy does not match the file; the file is kept"
    echo "ASC_KEY_P8 and ASC_KEY_ID are in the Keychain${issuer:+, and ASC_ISSUER_ID}"
    if [ "$delete" = 1 ]; then rm -f -- "$p8"; echo "the .p8 file is deleted"; else echo "the .p8 file is kept (--delete removes it)"; fi
    ;;

  renew-signing)
    [ $# -eq 0 ] || die "renew-signing takes no arguments: both certificates share one password"
    dir="$(mktemp -d)"
    trap 'rm -rf "$dir"' EXIT
    pw="$(openssl rand -hex 24)"
    for kind in distribution mac_installer; do
      (cd "$dir" && ASC_KEY_P8="$(kc_get ASC_KEY_P8)" ASC_KEY_ID="$(kc_get ASC_KEY_ID)" ASC_ISSUER_ID="$(kc_get ASC_ISSUER_ID)" \
        P12_PASSWORD="$pw" python3 "$ROOT/tools/ci_make_signing_p12.py" "$kind" "$dir/$kind.p12" - > "$dir/$kind.out")
    done
    read -r dist_id _ < "$dir/distribution.out"
    b64 "$dir/distribution.p12" | gh secret set APPLE_DIST_P12 --repo "$REPO"
    b64 "$dir/mac_installer.p12" | gh secret set APPLE_INSTALLER_P12 --repo "$REPO"
    printf '%s' "$pw" | gh secret set APPLE_P12_PASSWORD --repo "$REPO"
    printf '%s' "$dist_id" | gh secret set APPLE_DIST_CERT_ID --repo "$REPO"
    echo "APPLE_DIST_P12, APPLE_INSTALLER_P12, APPLE_P12_PASSWORD and APPLE_DIST_CERT_ID are set; prune old certificates with tools/asc_prune_certs.py"
    ;;

  *)
    die "unknown recipe; one of: list, gen, put-file, keychain-import-asc, renew-signing"
    ;;
esac
