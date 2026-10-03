// What the three tools share: the credential logic from the site
// (assets/credential-lib.js), canonicalization with the jsonld library
// and this site's own copies of the contexts, and reading a key file.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import jsonld from 'jsonld';

const require = createRequire(import.meta.url);
export const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const lib = require(join(SITE_ROOT, 'assets', 'credential-lib.js'));
export const subtle = globalThis.crypto.subtle;

// Only the contexts kept on this site are ever loaded, so checking a
// credential never depends on, or reaches out to, anyone else's server.
const contexts = {};
for (const [url, path] of Object.entries(lib.CONTEXT_FILES)) {
  contexts[url] = JSON.parse(readFileSync(join(SITE_ROOT, path), 'utf8'));
}
export async function documentLoader(url) {
  if (!contexts[url]) throw new Error(`This tool only loads the contexts kept on the site, not ${url}`);
  return { contextUrl: null, documentUrl: url, document: contexts[url] };
}

// RDFC-1.0, in safe mode: a property the contexts do not define would be
// dropped from what is signed, so safe mode refuses it instead.
export function canonize(doc) {
  return jsonld.canonize(doc, { algorithm: 'RDFC-1.0', format: 'application/n-quads', documentLoader, safe: true });
}

export function readJson(path) {
  return JSON.parse(path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8'));
}

// The private key lives outside the repository: in a file on the
// signer's own computer, or in an environment variable set from a
// GitHub Actions secret.
export function readKey(path) {
  const text = path ? readFileSync(path, 'utf8') : process.env.HUMANSHAPED_SIGNING_KEY;
  if (!text) throw new Error('No signing key. Pass --key <file> or set HUMANSHAPED_SIGNING_KEY.');
  const key = JSON.parse(text);
  if (!key.secretKeyMultibase || !key.publicKeyMultibase || !key.id) throw new Error('That file is not a signing key made by make-key.mjs.');
  return key;
}

export function insideSite(path) {
  const rel = relative(SITE_ROOT, resolve(path));
  return !rel.startsWith('..') && !isAbsolute(rel);
}

export function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const name = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[name] = true;
      else { out[name] = next; i++; }
    } else out._.push(argv[i]);
  }
  return out;
}
