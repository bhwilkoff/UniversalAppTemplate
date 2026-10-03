# Connecting a student's own agent to the hub: research notes

Researched 2026-10-03 for humanshaped.org. The question: how a student's
own Claude or Gemini can connect to a small, read-only Model Context
Protocol (MCP) server on the hub, so their agent knows their cohort, this
week's challenge, the next session, their group, their own shares and
feedback, and the course's method. Every claim has its source beside it.
Pages were read on the date above; several of them change monthly, so
re-read the client pages the week before this ships. Anything I could not
confirm is marked **(unverified)** and gathered again near the end.

This replaces the shorter MCP section in `meet-recording-and-events-notes.md`
("The student's AI: one read-only MCP endpoint"), which was written on
2026-10-01. Two things in that section are now out of date: the endpoint
should live on Supabase, not a Cloudflare Worker, because Supabase has
since documented the whole authenticated path; and the "keep the public
MCP to public content" privacy stance is no longer needed, because the
same row-level security that guards the site can guard the agent.

What I checked in the repository first:

- The hub's tables (`supabase/migrations/20261002000000_hub.sql`):
  `cohorts`, `sessions` (with `scope`, the week's challenge, and
  `meet_url`), `enrollments` (with `app_name`, `app_repo`, `app_url`),
  `groups` and `group_members` (with `expectations`), `shares` (kinds
  `bring-back`, `for-feedback`, `ai-review`, `question`), and `feedback`.
  The session agenda is not stored; `assets/cohort-lib.js` computes it
  from `cohorts.session_minutes`.
- The project signs its tokens with an asymmetric key (ES256), which the
  Supabase MCP middleware requires. Checked at
  `https://bifrieqzkihuxfzttgvd.supabase.co/auth/v1/.well-known/jwks.json`.
- The project's OAuth 2.1 server is **off** today: its discovery URL
  answers `{"error_code":"feature_disabled","msg":"OAuth server is disabled"}`
  (`https://bifrieqzkihuxfzttgvd.supabase.co/.well-known/oauth-authorization-server/auth/v1`).
- The review skill is `.claude/skills/human-shaped-review/SKILL.md` in the
  template. Its rules already match the hub's: it labels itself as AI,
  never scores, writes a file, and leaves sharing to the builder.

---

## 1. How each client connects to a remote MCP server

| Client | How a student adds it | OAuth | A personal key in a header | Prompts and resources |
| --- | --- | --- | --- | --- |
| Claude Code | `claude mcp add --transport http <name> <url>`, then `/mcp` to sign in | Yes, discovered automatically, with dynamic registration or a client ID | Yes: `--header "Authorization: Bearer ..."` | Prompts as `/server:prompt`; resources as `@` mentions |
| claude.ai, Claude Desktop, Claude mobile | Customize, Connectors, Add custom connector, paste the URL | Yes; Claude's published identity (CIMD) or automatic registration (DCR) | **No for a student.** Request headers are an Owner-only beta for a limited set of organizations | Yes, from the attachment menu |
| Gemini CLI | `gemini mcp add --transport http -s user <name> <url>`, then `/mcp auth` | Yes, discovered automatically, with dynamic registration if supported | Yes: `--header`, or `headers` in `settings.json` | Prompts as slash commands; resources as `@` references |
| Gemini app (gemini.google.com) | Settings, Connected Apps, Add a custom app, paste the URL | Yes; the help page names dynamic client registration | Not documented | Not documented |

### Claude Code

- Remote servers are added with `claude mcp add --transport http <name> <url>`,
  and a bearer token can be sent with `--header "Authorization: Bearer your-token"`
  (https://code.claude.com/docs/en/mcp).
- Scope: the default is local (this project, private to you); `--scope user`
  makes it available in every project; `--scope project` writes it to
  `.mcp.json` in the repository (https://code.claude.com/docs/en/mcp). A
  student's repository is public, so a header with a key must never go in
  project scope.
- OAuth: add the server with no credentials, then run `/mcp` and follow the
  browser sign-in; `claude mcp login <name>` does the same from the shell
  (https://code.claude.com/docs/en/mcp).
- Claude Code identifies itself with its own Client ID Metadata Document and
  a loopback redirect on a port that changes each session, so the
  authorization server must accept `http://localhost/callback` and
  `http://127.0.0.1/callback` on any port
  (https://claude.com/docs/connectors/building/authentication, "Callback URLs").
- Connectors a student adds on claude.ai are automatically available in
  Claude Code when they are logged in with that claude.ai account
  (https://code.claude.com/docs/en/mcp, "Use MCP servers from claude.ai").
  So one connection on claude.ai can serve both.
- MCP prompts appear as `/servername:promptname (MCP)` and also run as
  `/mcp__servername__promptname`; resources are referenced with `@`, in the
  form `@server:protocol://resource/path`
  (https://code.claude.com/docs/en/mcp).
- Tool results are capped at 25,000 tokens by default in Claude Code and
  about 150,000 characters on claude.ai and Desktop; claude.ai gives a tool
  call 240 seconds (https://claude.com/docs/connectors/building).

### claude.ai, Claude Desktop, and Claude mobile (custom connectors)

- "Custom connectors using remote MCP are available on Claude, Cowork, and
  Claude Desktop for users on Free, Pro, Max, Team, and Enterprise plans.
  Free users are limited to one custom connector."
  (https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- Individuals add them under Customize, Connectors, "+ Add", "Add custom
  connector"; on Team and Enterprise an admin adds them
  (same page; https://code.claude.com/docs/en/mcp says the same for
  claude.ai/customize/connectors).
- Claude connects from Anthropic's servers, so the server must be on the
  public internet; Anthropic's traffic comes from `160.79.104.0/21`
  (https://claude.com/docs/connectors/building/authentication, "Network reference").
- Authentication types Claude supports
  (https://claude.com/docs/connectors/building/authentication):
  - OAuth with Dynamic Client Registration (`oauth_dcr`): supported by default.
  - OAuth with a Client ID Metadata Document (`oauth_cimd`): supported by
    default, but Claude uses it only when the authorization server
    advertises `client_id_metadata_document_supported: true` and `none` in
    `token_endpoint_auth_methods_supported`; otherwise it falls back to DCR.
  - No authentication (`none`): supported by default.
  - Static request headers (`static_headers`): "Fixed credential (API key or
    bearer token) entered by an organization Owner as a request header when
    adding the connector", "Beta, for a limited set of organizations", and
    "Owners whose organization doesn't have access don't see the Request
    headers section". The same page warns that every member's requests
    carry the same key, so it cannot identify a person.
- The support article lists "Request headers" among the dialog's settings
  without the Owner and beta limits
  (https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).
  I read the developer page as the precise one: **a Free or Pro student
  cannot rely on putting a personal key in a header on claude.ai.** OAuth
  is the only way a claude.ai connector can know who the student is.
- Claude's OAuth client "follows the 2025-03-26, 2025-06-18, and 2025-11-25
  authorization specifications", needs the redirect URI
  `https://claude.ai/api/mcp/auth_callback` for the hosted apps, requires S256
  PKCE, needs a `401` (not a `200`) carrying `WWW-Authenticate: Bearer
  resource_metadata="..."`, uses only the first entry in
  `authorization_servers`, and gives discovery, registration, and token
  endpoints 10 seconds (https://claude.com/docs/connectors/building and
  https://claude.com/docs/connectors/building/authentication).
- Tools, prompts, and resources are all supported; resource subscriptions
  and sampling are not (https://claude.com/docs/connectors/building).
  Prompts and resources are reached from the "+" menu, under Connectors,
  by hovering over the connector's name
  (https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp,
  as summarized in search results; I did not see that paragraph in my own
  fetch, so treat the menu path as **(unverified)**).

### Gemini CLI

From the Gemini CLI MCP guide
(https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md,
mirrored at https://geminicli.com/docs/tools/mcp-server/):

- A Streamable HTTP server is configured with `httpUrl` in `settings.json`
  (`url` is the older SSE transport), with optional `headers`, `timeout`,
  and `trust`.
- The command form is `gemini mcp add --transport http <name> <url>`, with
  `-H, --header` for headers, for example
  `gemini mcp add --transport http --header "Authorization: Bearer abc123" secure-http https://api.example.com/mcp/`.
- **The default scope is `project`**, which writes `.gemini/settings.json`
  inside the repository; `-s user` writes `~/.gemini/settings.json`. Since a
  student's repository is public, every instruction we give must say `-s user`.
- OAuth: "Gemini CLI supports OAuth 2.0 authentication for remote MCP
  servers"; with discovery it will "detect when a server requires OAuth
  authentication (401 responses)", "discover OAuth endpoints from server
  metadata", and "perform dynamic client registration if supported". Sign-in
  is `/mcp auth <name>`, it needs a local browser and a
  `http://localhost:<random-port>/oauth/callback` redirect, and tokens are
  stored in `~/.gemini/mcp-oauth-tokens.json`.
- Prompts run as slash commands (`/prompt-name`, with named or positional
  arguments); resources are referenced with `@server://resource/path`.
- Environment variable expansion is documented for the `env` block. Whether
  it also applies inside `headers` is **(unverified)** on that page.

### Google's Gemini app

- "Custom apps" in the Gemini app are MCP servers: "The MCP server must
  follow the standard MCP specifications". The person must be 18 or over and
  in the US, use a personal Google Account (not work or school), have Keep
  Activity on, and use English. They are added from Connected Apps at
  gemini.google.com, "Add a custom app", with the server's URL. The page
  mentions Dynamic Client Registration and an option to "enter your
  credentials" when the server does not support it
  (https://support.google.com/gemini/answer/17209137).
- So the Gemini app can work for some adult US students with personal
  accounts, through OAuth, and not at all for anyone signed in with a school
  or work Google account. Which MCP features it supports beyond tools is not
  stated **(unverified)**. Third-party write-ups date the rollout to June 29,
  2026; I could not find that date on a Google page **(unverified)**.

---

## 2. The current MCP specification: transport and authorization

The current revision is **2026-07-28** (https://modelcontextprotocol.io/specification/latest
redirects into `/specification/2026-07-28/`).

### Streamable HTTP, as of 2026-07-28

From https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http:

- The server "MUST provide a single HTTP endpoint path ... that supports POST".
  Every client message is its own POST; the server answers with either
  `application/json` or a request-scoped `text/event-stream`.
- This revision **removed the GET stream endpoint and protocol-level
  sessions**. A server that only speaks 2026-07-28 should answer GET or
  DELETE with `405`, ignore `Mcp-Session-Id`, and ignore `Last-Event-ID`.
  That makes a stateless serverless function a natural fit.
- Every POST carries `MCP-Protocol-Version`, `Mcp-Method`, and, for
  `tools/call`, `resources/read`, and `prompts/get`, `Mcp-Name`; the server
  must reject mismatches between headers and body with `400` and error
  `-32020`.
- "Servers MUST validate the Origin header on all incoming connections"
  and answer an invalid one with `403`.
- Clients built for 2025-era revisions still use an `initialize` handshake.
  Claude's connector client names only the 2025 authorization revisions
  (section 1), so the server has to serve both eras. The official
  TypeScript SDK v2 does this: "The handler serves 2025-era clients
  statelessly from the same factory by default"
  (https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md).
  The SDK is at `@modelcontextprotocol/server` 2.3.0, published 2026-10-02
  (https://registry.npmjs.org/@modelcontextprotocol/server).

### Authorization, as of 2026-07-28

From https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
(reached through `/specification/latest/basic/authorization`):

- "Authorization is OPTIONAL for MCP implementations." When it is used over
  HTTP, the MCP server is an OAuth 2.1 resource server.
- What the **MCP server** must do:
  - "MCP servers MUST implement OAuth 2.0 Protected Resource Metadata
    (RFC9728)", and point to it from a `401` with
    `WWW-Authenticate: Bearer resource_metadata="..."` (optionally with
    `scope="..."`).
  - "MCP servers MUST validate that access tokens were issued specifically
    for them as the intended audience", answer invalid or expired tokens
    with `401`, and "MUST NOT accept or transit any other tokens".
  - Tokens arrive only in the `Authorization: Bearer` header, never in the
    query string.
- What the **authorization server** must do:
  - "MUST implement OAuth 2.1", with PKCE.
  - "MUST provide at least one" of RFC 8414 authorization server metadata or
    OpenID Connect Discovery.
  - Client registration: Client ID Metadata Documents are now the
    **SHOULD**; Dynamic Client Registration (RFC 7591) is a **MAY** and is
    "deprecated and retained for backwards compatibility". Pre-registration
    is the third route.
- Clients must send the RFC 8707 `resource` parameter naming the MCP
  server's canonical URI in both the authorization and token requests.

### Can Supabase Auth be the authorization server?

Yes, and Supabase now documents the whole path for MCP.

- "Supabase Auth can act as an OAuth 2.1 and OpenID Connect (OIDC) identity
  provider", listing "authenticate AI agents through the Model Context
  Protocol" as a use case (https://supabase.com/docs/guides/auth/oauth-server).
- **Plan and status:** "OAuth 2.1 server is in beta and available on all
  Supabase plans. It has no separate charge. Users who sign in through your
  OAuth server count toward your project's Monthly Active Users"
  (https://supabase.com/docs/guides/auth/oauth-server/getting-started).
  Several agents acting for one person count as one MAU
  (https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication).
- **What it implements:** the authorization code flow with PKCE and the
  refresh token flow ("client_credentials or password are not supported"),
  OIDC discovery, a JWKS endpoint, and "Dynamic client registration:
  Automatic registration for MCP-compatible clients"
  (https://supabase.com/docs/guides/auth/oauth-server and
  https://supabase.com/docs/guides/auth/oauth-server/oauth-flows).
  Discovery for this project would be
  `https://bifrieqzkihuxfzttgvd.supabase.co/.well-known/oauth-authorization-server/auth/v1`,
  issuer `https://bifrieqzkihuxfzttgvd.supabase.co/auth/v1`
  (https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication).
- **We host the consent screen.** Supabase redirects the person to the Site
  URL plus a configured Authorization Path with an `authorization_id`; our
  page signs them in if needed, shows the client and scopes, and calls
  `supabase.auth.oauth.getAuthorizationDetails`, `approveAuthorization`, or
  `denyAuthorization` (https://supabase.com/docs/guides/auth/oauth-server/getting-started).
  Their React example is all client-side, so it can be a plain static page
  on GitHub Pages using the supabase-js the site already loads. The person
  signs in with GitHub there, exactly as on `/account/`.
- **Tokens are ordinary Supabase JWTs** "that include `user_id`, `role`, and
  `client_id` claims", and "Your existing Row Level Security policies
  automatically apply to OAuth tokens"
  (https://supabase.com/docs/guides/auth/oauth-server). The default `aud`
  is `"authenticated"`; changing it takes a Custom Access Token Hook
  (https://supabase.com/docs/guides/auth/oauth-server/token-security).
- **Two honest gaps against the MCP spec:**
  1. Supabase's pages do not mention Client ID Metadata Documents, so
     clients will use DCR, the deprecated-but-allowed route. Claude falls
     back to DCR on its own (section 1), and so does Gemini CLI.
  2. The default token is not bound to the MCP server as its audience, and
     I found nothing saying Supabase honors the RFC 8707 `resource`
     parameter **(unverified)**. In practice this means a token Claude holds
     for our MCP server would also work against the project's REST API, as
     the student, under RLS. The fix is in our RLS (see section 4), not in
     the protocol.
- Whether Supabase matches loopback redirects on any port, which Claude Code
  and Gemini CLI both need, is not stated **(unverified)**. Supabase's own
  guide tests the flow with Claude Code (`claude mcp add --transport http todos ...`,
  then `/mcp`), which suggests it works
  (https://supabase.com/docs/guides/getting-started/byo-mcp).
- Supabase's guide links a grant-management section for users to revoke
  connected clients; I could not find that section on the oauth-flows page
  **(unverified)**.

---

## 3. Can a Supabase Edge Function host it?

Yes. Supabase's guide "Deploy MCP servers"
(https://supabase.com/docs/guides/getting-started/byo-mcp) does exactly this,
against the 2026-07-28 spec:

- It uses the official SDK (`npm:@modelcontextprotocol/server@^2.0.0`):
  "`createMcpHandler` runs the Streamable HTTP transport and builds a fresh
  `McpServer` for each request, which suits the stateless Edge Functions
  runtime." It says mcp-lite works the same way
  (https://supabase.com/docs/guides/functions/examples/mcp-server-mcp-lite).
- For sign-in, it wraps the handler in
  `pipeline([withOAuthProtectedResource(), withSupabase({ auth: 'user' })], handler)`
  from `@supabase/middleware` and `@supabase/server` (1.6.0 or later;
  1.9.0 is current per https://registry.npmjs.org/@supabase/server).
  `withOAuthProtectedResource()` serves the RFC 9728 document and the `401`
  challenge; `withSupabase({ auth: 'user' })` verifies the token against the
  project's JWKS (asymmetric keys only, which this project has) and hands
  the tools a Supabase client scoped to that person, so "Anything the tools
  read or write goes through RLS."
- The function needs `verify_jwt = false` so the gateway lets the
  unauthenticated discovery request reach the middleware.
- Setup: enable the OAuth 2.1 server, enable dynamic client registration,
  host a consent screen, then `supabase functions deploy mcp`. The URL is
  `https://<project-ref>.supabase.co/functions/v1/mcp`.
- **Use the project URL, not a custom domain.** On a custom domain the
  advertised authorization server stops matching the issuer and "MCP clients
  that validate the Auth metadata stop at discovery" unless it is set by hand.
  (Same page.) A Supabase custom domain is also a paid add-on, so this fits
  the $0 rule anyway. GitHub Pages cannot proxy, so `humanshaped.org/mcp`
  is not available; the address students paste is the supabase.co one.
- Limitation, from the same page: no open channel back to the client, "which
  rules out MCP sampling". We need none.

### Free-plan limits that matter

| Limit | Free plan | Source |
| --- | --- | --- |
| Invocations | 500,000 a month | https://supabase.com/docs/guides/functions/pricing |
| Wall clock per request | 150 s | https://supabase.com/docs/guides/functions/limits |
| CPU per request | 2 s | https://supabase.com/docs/guides/functions/limits |
| Memory | 256 MB | https://supabase.com/docs/guides/functions/limits |
| Functions per project | 100 | https://supabase.com/docs/guides/functions/limits |
| OAuth server | no charge; users count as MAUs | https://supabase.com/docs/guides/auth/oauth-server/getting-started |

Each MCP message is one POST, so one invocation. A cohort of thirty people
each making a few hundred calls a week is a few tens of thousands a month,
well inside the quota. A few small database reads fit easily inside 2 s of
CPU. Fetching a template file from raw.githubusercontent.com waits on the
network, which counts against wall clock, not CPU.

---

## 4. The simplest honest auth for students

| | (a) OAuth through Supabase | (b) Personal access key | (c) Both |
| --- | --- | --- | --- |
| Claude Code | Yes (`/mcp`) | Yes (`--header`) | Yes |
| claude.ai, Desktop, mobile | Yes, on Free (one connector) | **No** for individuals (Owner-only beta) | Yes, through (a) |
| Gemini CLI | Yes (`/mcp auth`) | Yes (`--header`) | Yes |
| Gemini app | Personal US adult accounts only | Not documented | Through (a) |
| Who can see what | Existing RLS, already tested with 31 checks | A new path around RLS, needing its own rules and tests | Both |
| What we build | Turn on the beta server and DCR; one static consent page; harden RLS against OAuth tokens | A keys table (hashed), make/revoke on `/account/`, a key lookup, a security-definer read function, and tests | Both |
| What the student does | Paste a URL, click Approve on humanshaped.org | Make a key, copy it once, paste it into a command, never commit it | Their choice |
| Risks | Beta feature; token is not audience-bound; loopback matching unverified | A secret in a terminal command and a config file next to a public repo; we hold hashes | Two systems to keep honest |

**Recommendation for the first version: (a), OAuth only.**

The reasons, plainly:

- It is the only route that reaches claude.ai, Desktop, and mobile for a
  student on a Free or Pro plan, and the vision asks for "whatever AI
  chatbot you are currently using", including the page beside Meet, where a
  student is far more likely to have claude.ai open than a terminal.
- A student never handles a secret. They paste one URL and approve on our
  own page, signed in with GitHub, which is already how they sign in.
- It reuses the privacy rules we already have. The agent sees exactly what
  the student sees on `/cohort/`, because the same RLS policies decide it,
  and `supabase/tests/test_policies.py` already proves those rules as four
  different people.
- Connecting on claude.ai also connects Claude Code for anyone logged in
  with that account (section 1).

The costs of (a), named fairly:

- **It is a beta feature** on Supabase. If it changes or breaks, the agent
  connection breaks with it, and the site does not.
- **A token for the agent is a token for the student's whole API access.**
  Supabase OAuth tokens are ordinary user JWTs with `aud: "authenticated"`.
  Before turning this on, add one migration so that every write policy and
  the `calendar_contacts` read policy also require
  `(auth.jwt() ->> 'client_id') is null`, which the token-security guide
  shows as the pattern for "Only direct user sessions"
  (https://supabase.com/docs/guides/auth/oauth-server/token-security). Then
  an agent's token can only read what the student can read, and can write
  nothing. Add checks to `test_policies.py` for a fifth person, "the same
  student through an agent", and watch one fail when a rule is opened.
- **Dynamic registration lets any client register.** Supabase's own caution
  is to require user approval, monitor registered clients, and check
  redirect URIs (https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication).
  Our consent page always asks, and names the client and where it will
  redirect.
- **Free claude.ai users get one custom connector.** If a student already
  uses that slot for something else, they choose.

When (b) would be worth adding later: if a spike shows Supabase rejects
Claude Code's or Gemini CLI's loopback redirect, or if students on local
models or other agents ask for it. It would be built as a separate
security-definer function with its own tests, never as a bypass of RLS in
the MCP function.

---

## 5. Prompts and resources, not only tools

Which clients support them today:

| | Tools | Prompts | Resources | Source |
| --- | --- | --- | --- | --- |
| Claude Code | Yes | Yes, as slash commands | Yes, as `@` mentions | https://code.claude.com/docs/en/mcp |
| claude.ai, Desktop | Yes | Yes | Yes (no subscriptions) | https://claude.com/docs/connectors/building |
| Gemini CLI | Yes | Yes, as slash commands | Yes, as `@` references | https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md |
| Gemini app | Yes | Not documented | Not documented | https://support.google.com/gemini/answer/17209137 |

Yes, expose both, sparingly:

- **Prompts are how a student starts the method's conversation in one
  step.** A prompt only returns text the student's agent then reads; it
  does not run anything on our side, so it costs nothing and cannot act for
  the student. It is also the right place to restate the review skill's
  rules (label it as AI, no scores, questions over verdicts, write a file
  and stop), so a claude.ai user without the template checked out still
  gets a review done our way.
- **Resources suit the method's text,** which is long, public, and already
  in the template. A student working in their own repository already has
  `docs/path/` and the review skill on disk, because their repository was
  made from the template, so the resources mainly serve claude.ai and the
  Gemini app. Read them live from the template's `main` branch on
  raw.githubusercontent.com, as `assets/render.js` already does, so nothing
  is copied and nothing drifts.
- Everything a model should reach for on its own stays a **tool**, since
  every client supports tools and models call tools without being asked.

---

## 6. The recommended design

### Where it runs

One Supabase Edge Function, `mcp`, in this repository at
`supabase/functions/mcp/`, deployed to
`https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/mcp`, built on
`@modelcontextprotocol/server` 2.x with `createMcpHandler`, and wrapped in
`withOAuthProtectedResource()` and `withSupabase({ auth: 'user' })` exactly
as Supabase's guide shows (https://supabase.com/docs/guides/getting-started/byo-mcp).
`verify_jwt = false` for this function only. Every tool reads through the
person's own RLS-scoped client; none uses the service role. Every tool
carries `readOnlyHint: true`. As with the other functions, pure logic
(choosing this week, shaping the replies) lives in a plain `.js` file with
tests in `tools/test/`.

### Tools

Every tool that takes `cohort` accepts a slug and defaults to the person's
one running cohort; with more than one, it answers with the list and asks
which. Every reply is short plain text a model reads well, with links back
to the hub page it came from.

| Tool | Input | Returns |
| --- | --- | --- |
| `my_cohorts` | none | Each cohort the person is in or teaches: slug, title, status, their role, week N of M, and the `/cohort/?c=` link |
| `this_week` | `cohort?` | The week number, the session's title and `scope` (the challenge in the teacher's words), the template stages for this week (from `cohort-lib.js`'s `stagesForWeek`), and the session's date and time in the cohort's time zone and the person's own |
| `next_session` | `cohort?` | When the next live session is, its title, the agenda parts computed from `session_minutes`, the Meet link, and what the person has brought back for it so far |
| `my_group` | `cohort?` | Their group's name and expectations, and each partner's GitHub login, app name, repository, and live link. No emails, ever |
| `my_work` | `cohort?` | Their own app name, repository, and live link, and each of their shares (kind, note, link, date) with the feedback on it, each piece marked as from a teacher or a classmate |
| `method` | `part`: `why`, `stage-01` to `stage-08`, `principles`, or `review-skill` | The text of that template file, fetched live from `bhwilkoff/UniversalAppTemplate` `main`, with its GitHub link |

Left out on purpose for the first version: any write (a student shares an
AI review themselves, on `/cohort/`, as an `ai-review` share, so sharing is
always their act on our page); classmates' shares and feedback beyond the
student's group; live GitHub commits (the agent can read public GitHub
itself); and calendar emails.

### Prompts

| Prompt | Arguments | What it asks the agent to do |
| --- | --- | --- |
| `review_this_week` | `cohort?` | Call `this_week` and `method review-skill`, then walk the student's work for this week's stages the way the human-shaped review does: open with a line labeling it AI feedback with the agent, model, and date; no scores; say what it could not see; one question per principle; write the review to a file and stop. Remind the student they decide whether to share it, and that their teacher's feedback is separate |
| `prepare_for_session` | `cohort?` | Call `next_session` and `my_work`, then help the student choose one thing to bring back and say it in their own words, without writing it for them |

### Resources

`humanshaped://method/why`, `humanshaped://method/stage-01` through
`stage-08`, `humanshaped://method/principles`, and
`humanshaped://method/review-skill`, each read live from the template's
`main` branch. The same text the `method` tool returns, for clients that
attach resources.

### What a student follows

The connection steps, written for the site in Ben's voice later; these are
the facts they rest on.

**claude.ai, Claude Desktop, or Claude mobile (Free, Pro, or Max).** Open
Customize, then Connectors, choose Add custom connector, name it Human
Shaped, and paste
`https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/mcp`. Leave the
authentication on sign-in. Claude opens humanshaped.org; sign in with GitHub
if asked, read what Claude will be able to see, and choose Approve. If you
use Claude Code with the same account, it is connected there too.
(https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp;
https://code.claude.com/docs/en/mcp)

**Claude Code.** In a terminal:

```
claude mcp add --transport http --scope user humanshaped https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/mcp
```

Then type `/mcp` inside Claude Code, choose humanshaped, and approve in the
browser. Run the review with `/humanshaped:review_this_week`.
(https://code.claude.com/docs/en/mcp)

**Gemini CLI.** In a terminal:

```
gemini mcp add --transport http -s user humanshaped https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/mcp
```

The `-s user` matters: without it the setting is saved inside your
repository, which is public. Then type `/mcp auth humanshaped` inside Gemini
CLI and approve in the browser. Run the review with `/review_this_week`.
(https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)

**Gemini app.** Only for a personal Google account, 18 or over, in the US:
Settings, Connected Apps, Add a custom app, paste the same address, and
approve. (https://support.google.com/gemini/answer/17209137)

### What Ben must do

1. **Turn on the OAuth 2.1 server** in the Supabase dashboard
   (Authentication, OAuth Server), set the Authorization Path to
   `/oauth/consent/` (with the trailing slash, so GitHub Pages serves the
   folder's `index.html` without a redirect; whether Pages keeps the query
   string through its trailing-slash redirect is **(unverified)**), and
   **turn on dynamic client registration**
   (https://supabase.com/docs/guides/auth/oauth-server/getting-started).
   The Site URL is already https://humanshaped.org.
2. **Review the consent page's words** before it ships, since it is the one
   page where a student decides what their agent may see.
3. **Approve the RLS migration** that keeps agent tokens read-only and away
   from calendar emails.
4. **Try it once himself** on claude.ai Free or Pro, in Claude Code, and in
   Gemini CLI, before the header or the cohort page link to it. Nothing
   else needs a new account or a paid plan.

---

## What I could not verify

- Whether Supabase's OAuth server accepts loopback redirects on any port
  (Claude Code, Gemini CLI). Supabase's guide tests with Claude Code, which
  suggests yes.
- Whether Supabase honors the RFC 8707 `resource` parameter or supports
  Client ID Metadata Documents. Its pages name only DCR.
- Where users revoke connected clients in Supabase; the guide links a
  grant-management section I could not find.
- Whether GitHub Pages keeps the query string when it redirects
  `/oauth/consent` to `/oauth/consent/`.
- The exact claude.ai menu path to a connector's prompts and resources (seen
  only in search-result text from the support article).
- Whether Gemini CLI expands environment variables inside `headers`.
- Which MCP features the Gemini app supports beyond tools, and the date
  custom apps launched there.
- The support article and the developer page disagree on request headers
  for custom connectors; I followed the developer page (Owner-only beta).
- None of this has been run against the real project. The first build step
  should be a spike: enable the OAuth server on the real project, deploy
  Supabase's `whoami` example, and connect from claude.ai Free, Claude Code,
  and Gemini CLI, before writing the real tools.
