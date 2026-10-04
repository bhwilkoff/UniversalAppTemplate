// Checks a Google ID token, the kind meet@humanshaped.org's Apps Script
// gets from ScriptApp.getIdentityToken(), so the notices and setup-queue
// functions know the caller is meet@ itself without a shared secret that
// someone has to paste. Plain JavaScript with Web Crypto only, so Deno runs
// it in the functions and node tests it (tools/test/google-id.test.mjs).
//
// What it checks, in order: the token's shape; its header names RS256 and
// a key Google publishes (https://www.googleapis.com/oauth2/v3/certs); the
// signature; who issued it; that it is current (with a little room for
// clocks that disagree); that its audience is the script's own OAuth
// client; and that it speaks for one allowed, verified humanshaped.org
// address. Any failure is a plain reason, never an exception.

const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const SKEW = 120; // seconds

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

// The audience rule: an exact list when one is configured, otherwise the
// prefix every OAuth client ID in the script's Cloud project begins with
// ("<project number>-").
export function audienceOk(aud, { audiences = [], audiencePrefixes = [] } = {}) {
  if (typeof aud !== 'string' || !aud) return false;
  if (audiences.length) return audiences.includes(aud);
  return audiencePrefixes.some((p) => p && aud.startsWith(p) && aud.endsWith('.apps.googleusercontent.com'));
}

// Checks every claim except the signature. `now` is seconds since 1970.
export function claimsProblem(c, opts) {
  const { now, allowedEmails = [], hd = 'humanshaped.org' } = opts;
  if (!c || typeof c !== 'object') return 'no claims';
  if (!ISSUERS.includes(c.iss)) return 'issuer';
  if (typeof c.exp !== 'number' || c.exp + SKEW < now) return 'expired';
  if (typeof c.iat !== 'number' || c.iat - SKEW > now) return 'issued in the future';
  if (!audienceOk(c.aud, opts)) return 'audience';
  if (c.email_verified !== true && c.email_verified !== 'true') return 'email not verified';
  const email = String(c.email || '').toLowerCase();
  if (!allowedEmails.map((e) => e.toLowerCase()).includes(email)) return 'email';
  if (hd && c.hd !== hd) return 'domain';
  return null;
}

// Verifies a token against a JWKS ({ keys: [...] }). Returns
// { ok: true, claims } or { ok: false, reason }.
export async function verifyGoogleIdToken(token, jwks, opts) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'shape' };
  let header, claims;
  try { header = b64urlJson(parts[0]); claims = b64urlJson(parts[1]); } catch { return { ok: false, reason: 'shape' }; }
  if (header.alg !== 'RS256') return { ok: false, reason: 'algorithm' };
  const jwk = (jwks && Array.isArray(jwks.keys) ? jwks.keys : []).find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) return { ok: false, reason: 'unknown key' };
  let good = false;
  try {
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1]));
  } catch { good = false; }
  if (!good) return { ok: false, reason: 'signature' };
  const problem = claimsProblem(claims, opts);
  return problem ? { ok: false, reason: problem } : { ok: true, claims };
}

// Google's keys, fetched once and kept for an hour (they rotate over days).
let cached = null;
export async function googleJwks(fetchFn = fetch, nowMs = Date.now()) {
  if (cached && cached.until > nowMs) return cached.jwks;
  const res = await fetchFn('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error('Google keys ' + res.status);
  const jwks = await res.json();
  cached = { jwks, until: nowMs + 3600 * 1000 };
  return jwks;
}

// The options both functions use, from their environment. GOOGLE_ID_EMAILS
// (default meet@humanshaped.org), GOOGLE_ID_AUDIENCES (exact client IDs,
// comma-separated; once whoAmI has printed it, pin it here), and
// GOOGLE_ID_PROJECT_NUMBER (default the human-shaped project's).
export function optionsFromEnv(get, nowSeconds) {
  const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
  const emails = list(get('GOOGLE_ID_EMAILS'));
  return {
    now: nowSeconds,
    allowedEmails: emails.length ? emails : ['meet@humanshaped.org'],
    hd: 'humanshaped.org',
    audiences: list(get('GOOGLE_ID_AUDIENCES')),
    audiencePrefixes: [(get('GOOGLE_ID_PROJECT_NUMBER') || '1086485459450') + '-'],
  };
}

// The caller is let in by a valid Google ID token in Authorization, or,
// while the old secret is still set, by that secret in its own header.
export async function callerAllowed(req, { get, secretName, secretHeader, sameSecret, fetchFn }) {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      const jwks = await googleJwks(fetchFn);
      const r = await verifyGoogleIdToken(m[1].trim(), jwks, optionsFromEnv(get, Math.floor(Date.now() / 1000)));
      if (r.ok) return { ok: true, by: 'google' };
      return { ok: false, reason: r.reason };
    } catch (e) {
      return { ok: false, reason: 'keys unavailable' };
    }
  }
  const secret = get(secretName) || '';
  if (secret.length >= 32 && sameSecret(req.headers.get(secretHeader) || '', secret)) return { ok: true, by: 'secret' };
  return { ok: false, reason: 'no credentials' };
}
