# Open rooms

The Cloudflare Worker behind open rooms (ADDON-DESIGN.md, "Open rooms"): one Durable Object per Meet call. It runs on the Free plan, so reaching a daily limit stops rooms for the day and costs nothing.

- `room-logic.js` is every rule, with no network in it (`tools/test/room-logic.test.mjs`).
- `worker.js` carries the messages and erases a room when it ends, or a day after its last change.

Deploy with `npx wrangler deploy` from this folder. To keep a repository off the stage, add it to `BLOCKED_REPOS` in `wrangler.toml` and deploy.
