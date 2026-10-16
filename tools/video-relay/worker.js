// The exchange video relay: streams an exchange video from its owner's
// Google Drive to the browser's own player. Google answers a browser that
// asks Drive for a shared file from another site with an error, or (through
// the Drive API with a key) with its "automated queries" page after 6 to 10
// seconds (October 16, 2026), so the page asks this instead:
//
//   GET https://humanshaped-video.<account>.workers.dev/v/<drive file id>
//
// It serves only files that are videos in an exchange (the hub's
// exchange_video_known(), migration 20261016010000), passes the browser's
// Range through so a video starts without downloading it whole. Drive takes
// two or three seconds to answer each request, so after the first one the
// whole file is put in Cloudflare's cache for a day, and later requests
// (the next range, the next viewer) are answered from there. A file its
// owner stopped sharing comes back 403, the same as from Drive, once the
// day is up (the page already stops offering it as soon as Drive's picture
// of it is gone).
const ID = /^[A-Za-z0-9_-]{10,200}$/;
const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
// What a file without a type of its own (an uploaded .mov) is served as,
// from the type the hub kept when it was posted (?type=).
const TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const SITES = /^https:\/\/(humanshaped\.org|localhost|127\.0\.0\.1)(:\d+)?\//;

function plain(status, text) {
  return new Response(text, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
}

async function known(id, env, ctx) {
  const cache = caches.default;
  const key = new Request('https://relay.cache/known/' + id);
  const hit = await cache.match(key);
  if (hit) return (await hit.text()) === 'yes';
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/exchange_video_known', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ drive_file_id: id })
  });
  if (!r.ok) return false;
  const yes = (await r.json()) === true;
  // A posted video stays posted for a while; a new one is known within a minute.
  ctx.waitUntil(cache.put(key, new Response(yes ? 'yes' : 'no', { headers: { 'cache-control': 'max-age=' + (yes ? 3600 : 60) } })));
  return yes;
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD', 'access-control-allow-headers': 'Range', 'access-control-max-age': '86400' } });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return plain(405, 'Only GET and HEAD.');
    const url = new URL(req.url);
    const m = /^\/v\/([^/]+)$/.exec(url.pathname);
    if (!m || !ID.test(m[1])) return plain(404, 'Not an exchange video.');
    const ref = req.headers.get('referer');
    if (ref && !SITES.test(ref)) return plain(403, 'Exchange videos play on humanshaped.org.');
    const id = m[1];
    if (!(await known(id, env, ctx))) return plain(404, 'Not an exchange video.');

    const drive = 'https://drive.usercontent.google.com/download?id=' + id + '&export=download&confirm=t';
    // The page asks ahead for the videos in a thread (?warm=1).
    if (url.searchParams.has('warm')) {
      ctx.waitUntil(keep(id, drive));
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*' } });
    }
    const range = req.headers.get('range');
    const cacheKey = new Request('https://relay.cache/file/' + id, range ? { headers: { range } } : {});
    const hit = await caches.default.match(cacheKey);
    if (hit) return finish(hit, req, url, 'hit');

    const up = await fetch(drive, { headers: range ? { range } : {} });
    const type = up.headers.get('content-type') || '';
    if (!up.ok || /^text\/html/.test(type)) {
      if (up.body) up.body.cancel();
      return plain(up.status === 404 ? 404 : 403, 'Drive did not share this video.');
    }
    ctx.waitUntil(keep(id, drive));
    return finish(up, req, url, 'miss');
  }
};

// The whole file, once, into the cache (which answers ranges from it).
async function keep(id, drive) {
  const key = new Request('https://relay.cache/file/' + id);
  if (await caches.default.match(key)) return;
  const whole = await fetch(drive);
  if (!whole.ok || /^text\/html/.test(whole.headers.get('content-type') || '')) { if (whole.body) whole.body.cancel(); return; }
  const h = new Headers();
  for (const name of ['content-type', 'content-length', 'last-modified', 'etag']) { const v = whole.headers.get(name); if (v) h.set(name, v); }
  h.set('cache-control', 'public, max-age=86400');
  await caches.default.put(key, new Response(whole.body, { status: 200, headers: h }));
}

function finish(from, req, url, how) {
  const out = new Headers();
  for (const h of PASS) { const v = from.headers.get(h); if (v) out.set(h, v); }
  const type = out.get('content-type') || '';
  const hint = url.searchParams.get('type');
  if (!/^video\//.test(type) && TYPES.includes(hint)) out.set('content-type', hint);
  if (!out.has('accept-ranges')) out.set('accept-ranges', 'bytes');
  out.set('cache-control', 'private, max-age=3600');
  out.set('access-control-allow-origin', '*');
  out.set('access-control-expose-headers', 'content-length, content-range, accept-ranges');
  out.set('cross-origin-resource-policy', 'cross-origin');
  out.set('x-relay', how);
  return new Response(req.method === 'HEAD' ? null : from.body, { status: from.status, headers: out });
}
