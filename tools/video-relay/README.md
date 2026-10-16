# The exchange video relay

*Written by Claude, awaiting Ben's review. October 16, 2026.*

Exchange videos live in each poster's own Google Drive. A browser cannot
stream them from Drive directly any more: Drive's download address refuses
another site's video player, and the Drive API answered the site's browser
key with Google's "automated queries" page after 6 to 10 seconds, on home
Wi-Fi and on an iPhone over 5G alike. So the page asks this Cloudflare
Worker, which fetches the file from Drive's download address on the
server, where that refusal does not apply.

- **Address:** `https://humanshaped-video.benwilkoff.workers.dev/v/<drive file id>`
  (`?type=` carries the type the hub kept, for a file Drive serves
  without one; `?warm=1` fetches it ahead and answers 204).
- **It serves only exchange videos.** It asks the hub's
  `exchange_video_known()` (migration 20261016010000), which answers yes
  or no and nothing else, and refuses a page on another site.
- **It keeps a copy for a day in Cloudflare's cache,** so after the first
  request each range (and each later viewer) is answered in under a
  second instead of Drive's two or three. The page asks ahead for the
  videos in a thread that are still shared, so they are usually ready
  before anyone presses one. A video its owner stops sharing disappears
  from the page right away and from the cache within a day.
- **Cost:** nothing. Workers' free plan allows 100,000 requests a day, and
  the cache is free.

Deploy with `wrangler deploy` from this folder (the account wrangler is
signed in to is Ben's). The two values in `wrangler.toml` are the public
ones every page already carries.
