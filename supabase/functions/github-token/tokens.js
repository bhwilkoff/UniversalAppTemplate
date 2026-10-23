// The pure parts of the github-token function (tested in
// tools/test/github-token.test.mjs): the refresh request GitHub expects,
// what to keep from its answer, and whether a kept token is still good.
// GitHub App user tokens last eight hours; their refresh tokens six months,
// and each refresh hands back a new refresh token and retires the old one
// (docs.github.com, "Refreshing user access tokens").

export const CLIENT_ID = 'Iv23littIQfinZfsRuZ9';
export const MARGIN = 10 * 60 * 1000;

export function refreshBody(clientId, clientSecret, refreshToken) {
  return new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }).toString();
}

// GitHub's answer, as the row to keep, or { problem } in words.
export function fromGitHub(json, now) {
  if (!json || typeof json !== 'object') return { problem: 'GitHub gave no answer.' };
  if (json.error) return { problem: json.error_description || json.error, expired: json.error === 'bad_refresh_token' };
  if (typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string') return { problem: 'GitHub did not send a new token.' };
  const at = now.getTime();
  return {
    access: json.access_token,
    accessExpires: json.expires_in ? new Date(at + Number(json.expires_in) * 1000).toISOString() : null,
    refresh: json.refresh_token,
    refreshExpires: json.refresh_token_expires_in ? new Date(at + Number(json.refresh_token_expires_in) * 1000).toISOString() : null,
  };
}

// A kept access token is handed out while more than ten minutes remain.
export function stillGood(row, now) {
  if (!row || !row.access_token || !row.access_expires_at) return false;
  return Date.parse(row.access_expires_at) - now.getTime() > MARGIN;
}
