/**
 * TEMPLATE (copy to worker/src/github-oidc.js). Needs a Worker with a JWKS-verifying
 * `verifyIdentityToken(token, {jwksUrl, issuers, audiences, keys}, nowMs)` (jwt.js: fetch and cache the issuer's
 * keys, check RS256 signature, iss, aud, exp) and `testKeys(env)` (a bench-only key override that refuses to exist
 * on a public host). Replace REPOSITORY, REPOSITORY_ID (`gh api repos/OWNER/REPO --jq .id`) and the workflow
 * map. Tests, one refused case per claim: another repository, another repository id, another branch, a pull
 * request ref, another workflow, the right workflow at another ref, a reusable workflow from another repo, a
 * missing job_workflow_ref, a push / pull_request / schedule event the route does not list, another audience, GitHub's
 * default audience, another issuer, an expired token, a forged signature, an unsigned token; plus one workflow
 * per route and the JWKS fetched once. See .claude/skills/secrets-without-bookkeeping.
 *
 * The owner's routes, by GitHub Actions OIDC instead of a stored token (owner: "I do not want to set or keep
 * track of keys and passwords for this repo.").
 *
 * A workflow with `id-token: write` asks GitHub for a short-lived JWT whose `aud` is this Worker's origin. It is
 * checked against GitHub's published keys (fetched and cached by jwt.js), and its claims must name this repository
 * (by name and by id, so a deleted-and-recreated namesake cannot pass), the main branch, exactly one workflow file,
 * and the events that workflow runs on. Fork pull requests are never given an id token. Every pin is a constant
 * here, not a var, so no environment can loosen it; the only test seam is the bench's LOCAL_TEST_JWKS, which a
 * Worker refuses to carry on any public host (auth.js testAuthRefused, checked first in index.js).
 */
import { TokenError, verifyIdentityToken } from "./jwt.js";
import { testKeys } from "./auth.js";

export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_JWKS = `${GITHUB_ISSUER}/.well-known/jwks`;
export const REPOSITORY = "OWNER/REPO";
export const REPOSITORY_ID = "REPLACE_WITH_NUMERIC_REPO_ID";
export const MAIN = "refs/heads/main";

/** Which workflow may call which owner route, and on which events. */
export const OWNER_WORKFLOWS = {
  operator: { workflow: ".github/workflows/operator.yml", events: ["workflow_dispatch"] },
  scheduled: { workflow: ".github/workflows/scheduled-check.yml", events: ["schedule", "workflow_dispatch"] },
};

/**
 * The verified claims of the bearer's GitHub token for `route`, or null. Never throws.
 * @param {"operator"|"scheduled"} route
 */
export async function githubCaller(request, env, url, route, nowMs = Date.now()) {
  const rule = OWNER_WORKFLOWS[route];
  const header = request.headers.get("authorization") || "";
  if (!rule || !header.startsWith("Bearer ")) return null;
  try {
    const c = await verifyIdentityToken(
      header.slice("Bearer ".length),
      { jwksUrl: GITHUB_JWKS, issuers: [GITHUB_ISSUER], audiences: [url.origin], keys: testKeys(env) },
      nowMs,
    );
    if (c.repository !== REPOSITORY) throw new TokenError("bad_repository");
    if (String(c.repository_id) !== REPOSITORY_ID) throw new TokenError("bad_repository_id");
    if (c.ref !== MAIN) throw new TokenError("bad_ref");
    if (c.job_workflow_ref !== `${REPOSITORY}/${rule.workflow}@${MAIN}`) throw new TokenError("bad_workflow");
    if (!rule.events.includes(c.event_name)) throw new TokenError("bad_event");
    return c;
  } catch {
    return null;
  }
}
