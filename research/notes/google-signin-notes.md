# Google sign-in beside GitHub

*Written by Claude, awaiting Ben's review. October 4, 2026.*

Google lists a Meet add-on publicly only if it offers Google sign-in to
someone who is not signed in (tools/meet-addon/LISTING.md), and Ben chose
to add it beside GitHub (DECISIONS.md, "Google sign-in beside GitHub").
GitHub stays the identity for cohorts, repositories, and discussions.

## What the sources say

- **Meet add-ons.** "Google One Tap sign-in is strongly recommended",
  with "a fallback Google sign-in button"; linking an existing account
  happens "in a dialog window", never as a password form inside the
  panel; and "Federated Credential Manager (FedCM) for Google Sign-in is
  unavailable for Meet add-ons"
  (https://developers.google.com/workspace/meet/add-ons/guides/sign-in-guide).
  So the panel uses Google's default One Tap and button, with no FedCM
  setting.
- **Supabase with Google's ID token.** `signInWithIdToken({ provider:
  'google', token, nonce })`, with "a hashed version [of the nonce] to
  Google and a non-hashed version to signInWithIdToken"; the nonce check
  can be skipped, and we do not skip it
  (https://supabase.com/docs/guides/auth/social-login/auth-google).
- **Linking.** Supabase "automatically links identities with the same
  email address to a single user", only when the email is verified.
  Manual linking needs `GOTRUE_SECURITY_MANUAL_LINKING_ENABLED`, and
  unlinking needs "at least 2 linked identities"
  (https://supabase.com/docs/guides/auth/auth-identity-linking). The
  pinned supabase-js (2.117.2) also links from an ID token:
  `linkIdentity({ provider: 'google', token, nonce })` posts to
  `/token?grant_type=id_token` with `link_identity: true` (read in
  @supabase/auth-js 2.117.2, GoTrueClient.js), so linking Google needs no
  redirect and no client secret.
- **Iframes.** Google's FedCM guide says One Tap in a cross-origin frame
  needs the parent's `allow="identity-credentials-get"`
  (https://developers.google.com/identity/gsi/web/guides/fedcm-migration).
  Meet's frame is Meet's to set, and Meet asks add-ons for One Tap, so we
  expect it works; it is untested.

## How the accounts stay one account

- **GitHub first, Google later.** Sign in with GitHub, and on /account/,
  under Linked accounts, press Google's button: that links Google to this
  account. From then on, One Tap in Meet reaches the same account.
- **Same email.** If someone's Google email is the verified email GitHub
  gave Supabase, Supabase links the two by itself the first time they
  use Google.
- **Google first, with a GitHub that already has an account here.** The
  Google sign-in makes a new, empty account, and linking GitHub to it is
  refused ("identity already exists"). The link window then offers "Use
  my GitHub account instead": it deletes the empty Google-only account
  (only when it has Google and nothing else and no GitHub name), signs in
  with GitHub, and hands that back to Meet. Nothing is merged by guessing.
- **Google first, GitHub new to the hub.** Linking GitHub fills in the
  profile's GitHub name and number (migration 20261004060000).

## The database (migration 20261004060000)

- `profiles.github_login` may be empty until GitHub is linked; joining a
  cohort, by any path, needs it.
- GitHub fields come only from a GitHub identity, judged by the provider
  Supabase records. Two holes closed on the way: an email sign-up (email
  sign-up is switched on) could claim any unused GitHub name through its
  own metadata, and anyone could edit their own profile's GitHub name,
  which cohort-access uses to add people to a cohort's private team.
- Google's account number (often 21 digits) is never read as a GitHub id;
  it would have overflowed `bigint` and failed the sign-up.

## Configuration

Done by the coordinator: a Web OAuth client in `human-shaped`
(authorized JavaScript origin `https://humanshaped.org`; redirect
`https://bifrieqzkihuxfzttgvd.supabase.co/auth/v1/callback`), Google
enabled in Supabase Auth with that client ID and no secret, manual
linking on, nonce check on. Still to do: apply the migration, and switch
off email sign-up (`external_email_enabled: false`), which nothing here
uses.
