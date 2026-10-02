// Runs the real upload code against a fake Drive that follows the
// documented resumable protocol, including the failures we promise to
// survive: a dropped connection, a short write, an expired token, and a
// cohort folder the drive.file scope cannot reach.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSession, sendChunks } from '../extension/drive.js';

const KB256 = 256 * 1024;

function fakeDrive({ failInitWith401 = false, parentForbidden = false, dropPutNumber = -1, shortWriteOnPut = -1 } = {}) {
  const state = { received: 0, total: null, puts: 0, inits: [], tokens: [], metadata: null };
  const headers = (h) => ({ get: (k) => h[k] ?? null });
  const reply = (status, h = {}, body = {}) => ({ status, ok: status >= 200 && status < 300, headers: headers(h), json: async () => body });

  async function fetchImpl(url, init) {
    if (init.method === 'POST') {
      const meta = JSON.parse(init.body);
      state.inits.push(meta);
      state.tokens.push(init.headers.Authorization);
      if (failInitWith401 && state.inits.length === 1) return reply(401, {}, { error: { message: 'expired' } });
      if (parentForbidden && meta.parents) return reply(404, {}, { error: { message: 'File not found: folder' } });
      state.total = Number(init.headers['X-Upload-Content-Length']);
      state.metadata = meta;
      return reply(200, { Location: 'https://upload.example/session/1' });
    }
    const range = init.headers['Content-Range'];
    if (range.startsWith('bytes */')) {
      if (state.received === state.total) return reply(200, {}, { id: 'file1' });
      return reply(308, state.received ? { Range: `bytes=0-${state.received - 1}` } : {});
    }
    state.puts += 1;
    if (state.puts === dropPutNumber) throw new TypeError('network dropped');
    const [, start, end] = range.match(/bytes (\d+)-(\d+)\//).map(Number);
    assert.equal(start, state.received, 'client sent from the offset Drive reported');
    const len = end - start + 1;
    assert.equal(init.body.size, len);
    const isLast = end + 1 === state.total;
    if (!isLast) assert.equal(len % KB256, 0, 'non-final chunks are multiples of 256 KiB');
    const accepted = state.puts === shortWriteOnPut ? KB256 : len;
    state.received = start + accepted;
    if (state.received === state.total) return reply(201, {}, { id: 'file1', name: state.metadata.name, webViewLink: 'https://drive/x' });
    return reply(308, { Range: `bytes=0-${state.received - 1}` });
  }
  return { state, fetchImpl };
}

const blob = new Blob([new Uint8Array(3 * 1024 * 1024 + 123)], { type: 'video/webm' });
const tokens = () => {
  let n = 0;
  return async (force) => `token-${force ? ++n : n}`;
};
const noSleep = async () => {};

test('uploads a file in 256 KiB-aligned chunks into the folder', async () => {
  const drive = fakeDrive();
  const { resumeUri, folderProblem } = await startSession({ blob, metadata: { name: 'a.webm', parents: ['F'] }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  assert.equal(folderProblem, null);
  const seen = [];
  const file = await sendChunks({ blob, resumeUri, chunkSize: 1024 * 1024, fetchImpl: drive.fetchImpl, onProgress: (s) => seen.push(s), sleep: noSleep });
  assert.equal(file.id, 'file1');
  assert.equal(drive.state.received, blob.size);
  assert.deepEqual(drive.state.metadata.parents, ['F']);
  assert.equal(seen.at(-1), blob.size);
});

test('a dropped connection resumes from what Drive actually has', async () => {
  const drive = fakeDrive({ dropPutNumber: 2 });
  const { resumeUri } = await startSession({ blob, metadata: { name: 'a.webm' }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  const file = await sendChunks({ blob, resumeUri, chunkSize: 1024 * 1024, fetchImpl: drive.fetchImpl, sleep: noSleep });
  assert.equal(file.id, 'file1');
  assert.equal(drive.state.received, blob.size);
});

test('a short write is followed by sending the rest', async () => {
  const drive = fakeDrive({ shortWriteOnPut: 1 });
  const { resumeUri } = await startSession({ blob, metadata: { name: 'a.webm' }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  const file = await sendChunks({ blob, resumeUri, chunkSize: 1024 * 1024, fetchImpl: drive.fetchImpl, sleep: noSleep });
  assert.equal(file.id, 'file1');
});

test('an expired token is refreshed once', async () => {
  const drive = fakeDrive({ failInitWith401: true });
  await startSession({ blob, metadata: { name: 'a.webm' }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  assert.deepEqual(drive.state.tokens, ['Bearer token-0', 'Bearer token-1']);
});

test('an unreachable cohort folder falls back to My Drive and says why', async () => {
  const drive = fakeDrive({ parentForbidden: true });
  const { folderProblem } = await startSession({ blob, metadata: { name: 'a.webm', parents: ['F'] }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  assert.match(folderProblem, /File not found/);
  assert.equal(drive.state.metadata.parents, undefined);
  assert.equal(drive.state.metadata.name, 'a.webm');
});

test('a hard failure reports where it stopped', async () => {
  const drive = fakeDrive();
  const { resumeUri } = await startSession({ blob, metadata: { name: 'a.webm' }, getToken: tokens(), fetchImpl: drive.fetchImpl });
  const failing = async (url, init) => (init.headers['Content-Range'].startsWith('bytes */') ? drive.fetchImpl(url, init) : { status: 400, ok: false, headers: { get: () => null }, json: async () => ({ error: { message: 'Bad request' } }) });
  await assert.rejects(sendChunks({ blob, resumeUri, fetchImpl: failing, sleep: noSleep }), (err) => err.name === 'UploadError' && err.resumeUri === resumeUri && /Bad request/.test(err.message));
});
