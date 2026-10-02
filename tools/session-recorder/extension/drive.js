// Resumable upload to Google Drive, written against the documented
// protocol: https://developers.google.com/workspace/drive/api/guides/manage-uploads
// fetch, the token and the clock are injected so ../test/drive.test.mjs
// can run the whole thing against a fake Drive.

import { classifyUploadStatus, contentRange, nextOffsetFromRange, uploadChunkSize, backoffMs } from './lib.js';

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,parents';
const MAX_ATTEMPTS = 6;

export class UploadError extends Error {
  constructor(message, { resumeUri = null, offset = 0 } = {}) {
    super(message);
    this.name = 'UploadError';
    this.resumeUri = resumeUri;
    this.offset = offset;
  }
}

async function readError(res) {
  try {
    const body = await res.json();
    return (body && body.error && body.error.message) || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function startSession({ blob, metadata, getToken, fetchImpl = fetch }) {
  const init = async (meta, token) =>
    fetchImpl(UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': blob.type || 'video/webm',
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify(meta),
    });

  let token = await getToken(false);
  let res = await init(metadata, token);
  if (res.status === 401) {
    token = await getToken(true);
    res = await init(metadata, token);
  }

  let folderProblem = null;
  // With the drive.file scope the extension can only see folders this
  // Cloud project made or was handed. If the cohort folder is out of
  // reach, Drive answers 403 or 404 here. Rather than lose the upload,
  // put the file in the top of My Drive and say so.
  if ((res.status === 403 || res.status === 404) && metadata.parents && metadata.parents.length) {
    folderProblem = await readError(res);
    const { parents, ...rest } = metadata;
    res = await init(rest, token);
  }
  if (!res.ok) throw new UploadError(`Drive would not start the upload: ${await readError(res)}`);
  const resumeUri = res.headers.get('Location');
  if (!resumeUri) throw new UploadError('Drive did not return an upload address.');
  return { resumeUri, folderProblem };
}

export async function queryOffset({ resumeUri, total, fetchImpl = fetch }) {
  const res = await fetchImpl(resumeUri, { method: 'PUT', headers: { 'Content-Range': `bytes */${total}` } });
  const kind = classifyUploadStatus(res.status);
  if (kind === 'done') return { done: true, file: await res.json() };
  if (kind === 'incomplete') return { done: false, offset: nextOffsetFromRange(res.headers.get('Range')) };
  if (kind === 'expired') throw new UploadError('The upload session expired. Start the upload again.', { resumeUri: null });
  throw new UploadError(`Drive answered ${res.status} when asked how much it had.`, { resumeUri });
}

export async function sendChunks({
  blob,
  resumeUri,
  offset = 0,
  chunkSize,
  onProgress = () => {},
  fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const total = blob.size;
  const size = uploadChunkSize(chunkSize);
  let attempt = 0;
  let pos = offset;
  while (true) {
    const end = Math.min(pos + size, total);
    let res;
    try {
      res = await fetchImpl(resumeUri, {
        method: 'PUT',
        headers: { 'Content-Range': contentRange(pos, end, total) },
        body: blob.slice(pos, end),
      });
    } catch (err) {
      res = null;
      if (attempt >= MAX_ATTEMPTS) throw new UploadError(`The network kept failing (${err.message || err}).`, { resumeUri, offset: pos });
    }
    const kind = res ? classifyUploadStatus(res.status) : 'retry';
    if (kind === 'done') {
      onProgress(total, total);
      return res.json();
    }
    if (kind === 'incomplete') {
      attempt = 0;
      pos = nextOffsetFromRange(res.headers.get('Range'));
      onProgress(pos, total);
      continue;
    }
    if (kind === 'expired') throw new UploadError('The upload session expired. Start the upload again.');
    if (kind === 'retry' && attempt < MAX_ATTEMPTS) {
      await sleep(backoffMs(attempt));
      attempt += 1;
      const q = await queryOffset({ resumeUri, total, fetchImpl }).catch(() => null);
      if (q && q.done) {
        onProgress(total, total);
        return q.file;
      }
      if (q) pos = q.offset;
      continue;
    }
    throw new UploadError(`Drive stopped the upload: ${res ? await readError(res) : 'network error'}`, { resumeUri, offset: pos });
  }
}
