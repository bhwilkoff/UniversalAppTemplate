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

export function consentNotice({ cohortTitle } = {}) {
  const where = cohortTitle ? ` for ${cohortTitle}` : '';
  return (
    `I am recording this session${where} now, so that anyone who misses it can watch it later. ` +
    'The recording goes only to this cohort\'s members, in our shared Google Drive folder, and nowhere else. ' +
    'If you would rather not appear, turn your camera off and use the chat, or tell me and I will trim your part. ' +
    'Breakout rooms are not recorded, and I will stop the recording before we split up.'
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
