// Pure logic for the session recorder. No chrome.* and no DOM here, so
// every function runs under `node --test` (see ../test/lib.test.mjs).

export const UPLOAD_GRANULE = 256 * 1024;
export const DEFAULT_UPLOAD_CHUNK = 32 * UPLOAD_GRANULE; // 8 MiB
export const RECORDER_TIMESLICE_MS = 10_000;

// Ordered by preference. VP9 keeps a 90-minute screen-heavy session near
// half the size of VP8 at the same bitrate.
export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function pickMimeType(isTypeSupported) {
  for (const type of MIME_CANDIDATES) {
    if (isTypeSupported(type)) return type;
  }
  return null;
}

export const QUALITY = {
  standard: { videoBitsPerSecond: 2_500_000, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 },
  smaller: { videoBitsPerSecond: 1_200_000, maxWidth: 1280, maxHeight: 720, maxFrameRate: 24 },
};

export function estimateBytes(quality, minutes) {
  const q = QUALITY[quality] || QUALITY.standard;
  const audioBits = 128_000;
  return Math.round(((q.videoBitsPerSecond + audioBits) / 8) * minutes * 60);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function slug(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Local wall-clock time on purpose: the host reads the name, and the
// cohort's members see the same date the session page shows.
export function recordingFilename({ cohortId, startedAt }) {
  const d = startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(d.getTime())) throw new Error('startedAt is not a date');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const cohort = slug(cohortId) || 'session';
  return `humanshaped-${cohort}-${stamp}.webm`;
}

export function consentNotice({ cohortTitle, countingTalk = false } = {}) {
  const where = cohortTitle ? ` for ${cohortTitle}` : '';
  return (
    `I am recording this session${where} now, so that anyone who misses it can watch it later. ` +
    'The recording goes only to this cohort\'s members, in our shared Google Drive folder, and nowhere else. ' +
    'I may mark moments to share back with you as short clips, and any clip goes only to this cohort too. ' +
    'If you would rather not appear, turn your camera off and use the chat, or tell me and I will trim your part. ' +
    'Breakout rooms are not recorded, and I will stop the recording before we split up.' +
    (countingTalk
      ? ' My recorder is also counting how much I talk compared with everyone else, from the sound alone, never who else talks or what anyone says, and only I see that number unless I choose to share it with the cohort.'
      : '')
  );
}

export function stopNotice() {
  return 'I have stopped recording. Anything from here on is not recorded.';
}

// Accepts a bare folder ID or any Drive folder URL a person might paste.
export function parseFolderId(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const fromUrl = s.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || s.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  const id = fromUrl ? fromUrl[1] : s;
  return /^[A-Za-z0-9_-]{10,}$/.test(id) ? id : null;
}

// One cohort per line: "id | label | folder ID or URL". This is the same
// line the meet-events Apps Script prints after it makes a folder.
export function parseCohortList(text) {
  const cohorts = [];
  const errors = [];
  String(text || '')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 3) {
        errors.push(`Line ${i + 1} needs three parts separated by "|": id | name | folder`);
        return;
      }
      const [id, label, folder] = parts;
      const folderId = parseFolderId(folder);
      if (!slug(id)) errors.push(`Line ${i + 1}: the cohort id is empty`);
      else if (!folderId) errors.push(`Line ${i + 1}: "${folder}" is not a Drive folder ID or link`);
      else cohorts.push({ id: slug(id), label: label || id, folderId });
    });
  return { cohorts, errors };
}

export function formatCohortList(cohorts) {
  return (cohorts || []).map((c) => `${c.id} | ${c.label} | ${c.folderId}`).join('\n');
}

export function contentRange(start, endExclusive, total) {
  return `bytes ${start}-${endExclusive - 1}/${total}`;
}

// Drive's 308 reply carries "Range: bytes=0-N" for what it already has.
// No header means it has nothing yet.
export function nextOffsetFromRange(rangeHeader) {
  if (!rangeHeader) return 0;
  const m = String(rangeHeader).match(/bytes=0-(\d+)/);
  return m ? Number(m[1]) + 1 : 0;
}

export function uploadChunkSize(requested = DEFAULT_UPLOAD_CHUNK) {
  const n = Math.max(UPLOAD_GRANULE, Math.floor(requested / UPLOAD_GRANULE) * UPLOAD_GRANULE);
  return n;
}

export function classifyUploadStatus(status) {
  if (status === 200 || status === 201) return 'done';
  if (status === 308) return 'incomplete';
  if (status === 401) return 'auth';
  if (status === 404) return 'expired';
  if (status === 408 || status === 429 || status >= 500) return 'retry';
  return 'fatal';
}

export function backoffMs(attempt) {
  return Math.min(30_000, 1000 * 2 ** attempt);
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[u]}`;
}

export function isMeetUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'meet.google.com' && /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(u.pathname);
  } catch {
    return false;
  }
}

export function isPlaceholderClientId(clientId) {
  return !clientId || /REPLACE/i.test(clientId) || !/\.apps\.googleusercontent\.com$/.test(clientId);
}

export function newSessionId(now = Date.now(), rand = Math.random) {
  return `${now.toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
}

// ---------------------------------------------------------------------
// Clip marks (Wish 11). The host marks a moment while recording, with an
// optional word; afterwards the finish page cuts a clip from a little
// before the mark to a while after it, inside the recording's length.
// ---------------------------------------------------------------------

export const CLIP_BEFORE_MS = 30_000;
export const CLIP_AFTER_MS = 90_000;
export const MARK_WORD_MAX = 80;

export function newMark(atMs, word) {
  const at = Math.max(0, Math.round(Number(atMs) || 0));
  const w = String(word || '').replace(/\s+/g, ' ').trim().slice(0, MARK_WORD_MAX);
  return { atMs: at, word: w };
}

// Marks in time order, one per moment: two marks within two seconds of
// each other are the same moment pressed twice, and the first word wins.
export function addMark(marks, mark) {
  const list = (marks || []).slice();
  const near = list.find((m) => Math.abs(m.atMs - mark.atMs) < 2000);
  if (near) {
    if (!near.word && mark.word) near.word = mark.word;
    return list.sort((a, b) => a.atMs - b.atMs);
  }
  list.push(mark);
  return list.sort((a, b) => a.atMs - b.atMs);
}

// The clip's range for a mark, clamped to the recording. Without a known
// length (an unfinished recording), the end is not clamped.
export function clipRange(atMs, lengthMs, before = CLIP_BEFORE_MS, after = CLIP_AFTER_MS) {
  const start = Math.max(0, atMs - before);
  let end = atMs + after;
  if (Number.isFinite(lengthMs) && lengthMs > 0) end = Math.min(end, lengthMs);
  return { startMs: start, endMs: Math.max(start, end) };
}

export function clipFilename(recordingName, mark) {
  const base = String(recordingName || 'recording.webm').replace(/\.webm$/i, '');
  const t = formatDuration(mark.atMs).replace(/:/g, '-');
  const word = slug(mark.word);
  return `${base}-clip-${t}${word ? `-${word}` : ''}.webm`;
}

// ---------------------------------------------------------------------
// The host's own talk share (Wish 4). Measured on the host's computer
// from two levels only: the host's microphone, and the call's mixed
// audio from the tab (Meet never plays the host's own voice back, so the
// tab is everyone else together). It cannot tell who else spoke, and it
// keeps no sound. Nothing about any other person is counted.
// ---------------------------------------------------------------------

// Root mean square of a block of samples between -1 and 1.
export function rms(samples) {
  if (!samples || !samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

export const TALK_DEFAULTS = {
  // Levels above these count as someone talking. A quiet room sits near
  // 0.003; normal speech into a headset or laptop microphone is 0.02 to
  // 0.2. Tuned on synthetic levels only; a real call may move them.
  micThreshold: 0.02,
  tabThreshold: 0.015,
  // Speech has gaps between words. A voice counts as still talking for
  // this long after its level drops, so a sentence is one stretch.
  holdMs: 400,
};

// Counts milliseconds of: the host talking, anyone else talking, both at
// once, and nobody. Feed it one pair of levels per tick.
export function createTalkCounter(options = {}) {
  const o = { ...TALK_DEFAULTS, ...options };
  const totals = { hostMs: 0, othersMs: 0, bothMs: 0, quietMs: 0 };
  let hostHeld = 0;
  let othersHeld = 0;
  return {
    add(micLevel, tabLevel, dtMs) {
      const dt = Math.max(0, Math.min(Number(dtMs) || 0, 1000));
      hostHeld = micLevel >= o.micThreshold ? o.holdMs : Math.max(0, hostHeld - dt);
      othersHeld = tabLevel >= o.tabThreshold ? o.holdMs : Math.max(0, othersHeld - dt);
      const host = hostHeld > 0;
      const others = othersHeld > 0;
      if (host && others) totals.bothMs += dt;
      else if (host) totals.hostMs += dt;
      else if (others) totals.othersMs += dt;
      else totals.quietMs += dt;
    },
    totals() {
      return { ...totals };
    },
  };
}

// The host's share of the time anyone was talking: the host's time
// (including talking over someone) over all talking time. Null when there
// was too little talk to say anything (under a minute).
export const TALK_MIN_MS = 60_000;
export function talkShare(totals) {
  if (!totals) return null;
  const host = (totals.hostMs || 0) + (totals.bothMs || 0);
  const anyone = host + (totals.othersMs || 0);
  if (anyone < TALK_MIN_MS) return null;
  return host / anyone;
}

export function talkSentence(share) {
  if (share == null) return 'There was too little talking to count a share.';
  const p = Math.round(share * 100);
  return `You talked ${p} percent of the time anyone was talking.`;
}
