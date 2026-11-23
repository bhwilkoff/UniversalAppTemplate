// What a ten-minute job does with an item that failed: it writes down why,
// waits longer each time (an hour, a day, a week), and after the fourth
// failure stops and lists it, rather than trying the same thing every tick
// (Ben 2026-11-23: "fix the re-scan of the exact same failures. We should
// never build something that does that."). Rows live in job_failures, keyed
// by job and item; a success deletes the row, and so does anything that
// changes the item (a new recording, a person who has since joined).

export const WAITS_MIN = [60, 24 * 60, 7 * 24 * 60];
export const GIVE_UP_AFTER = WAITS_MIN.length + 1;

export function givenUp(row) {
  return !!row && row.tries >= GIVE_UP_AFTER;
}

export function waiting(row, now) {
  if (!row) return false;
  if (givenUp(row)) return true;
  return !!row.next_at && now.getTime() < Date.parse(row.next_at);
}

export function failure(prev, job, item, reason, now) {
  const tries = (prev?.tries || 0) + 1;
  const next = tries >= GIVE_UP_AFTER ? null : new Date(now.getTime() + WAITS_MIN[tries - 1] * 60000).toISOString();
  return { job, item, tries, reason: String(reason || 'no details').slice(0, 200), failed_at: now.toISOString(), next_at: next };
}

// The first `limit` rows not waiting out a failure, so items that keep
// failing never hold the places of new ones.
export function pick(rows, failures, keyOf, now, limit) {
  return (rows || []).filter((r) => !waiting(failures.get(keyOf(r)), now)).slice(0, limit);
}
