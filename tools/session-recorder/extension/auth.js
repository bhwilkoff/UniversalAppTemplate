// chrome.identity.getAuthToken signs in with the account the Chrome
// profile is signed in to (the sync account, or else the first Google web
// account): https://developer.chrome.com/docs/extensions/reference/api/identity
// That is why the host records from a Chrome profile signed in as
// meet@humanshaped.org.

import { isPlaceholderClientId } from './lib.js';

let lastToken = null;

export async function getToken(forceRefresh) {
  const clientId = (chrome.runtime.getManifest().oauth2 || {}).client_id;
  if (isPlaceholderClientId(clientId)) {
    throw new Error('Drive upload is not set up: manifest.json has no OAuth client ID yet.');
  }
  if (forceRefresh && lastToken) {
    await chrome.identity.removeCachedAuthToken({ token: lastToken }).catch(() => {});
  }
  const result = await chrome.identity.getAuthToken({ interactive: true });
  lastToken = typeof result === 'string' ? result : result && result.token;
  if (!lastToken) throw new Error('Google did not return a sign-in token.');
  return lastToken;
}

export async function whoAmI(token) {
  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive answered ${res.status}`);
  const body = await res.json();
  return body.user && body.user.emailAddress;
}
