// Recording chunks go to IndexedDB as they arrive, which does two jobs:
// a 90-minute session never sits in memory, and a crash, a closed tab or
// a failed upload still leaves every chunk recorded so far on this
// computer. IndexedDB is shared by every page of the extension's origin,
// so the offscreen recorder writes and the finish page reads.

const DB_NAME = 'hs-session-recorder';
const DB_VERSION = 1;

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('sessions', { keyPath: 'id' });
        db.createObjectStore('chunks', { keyPath: ['sessionId', 'seq'] });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putSession(session) {
  const db = await open();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').put(session);
  await done(tx);
  return session;
}

export async function updateSession(id, patch) {
  const db = await open();
  const tx = db.transaction('sessions', 'readwrite');
  const store = tx.objectStore('sessions');
  const current = await request(store.get(id));
  if (!current) throw new Error(`No recording with id ${id}`);
  const next = { ...current, ...patch };
  store.put(next);
  await done(tx);
  return next;
}

export async function getSession(id) {
  const db = await open();
  return request(db.transaction('sessions').objectStore('sessions').get(id));
}

export async function listSessions() {
  const db = await open();
  const all = await request(db.transaction('sessions').objectStore('sessions').getAll());
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function addChunk(sessionId, seq, blob) {
  const db = await open();
  const tx = db.transaction('chunks', 'readwrite');
  tx.objectStore('chunks').put({ sessionId, seq, blob });
  await done(tx);
}

export async function assembleRecording(sessionId, mimeType = 'video/webm') {
  const db = await open();
  const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]);
  const rows = await request(db.transaction('chunks').objectStore('chunks').getAll(range));
  rows.sort((a, b) => a.seq - b.seq);
  return new Blob(rows.map((r) => r.blob), { type: mimeType.split(';')[0] });
}

export async function deleteRecording(sessionId) {
  const db = await open();
  const tx = db.transaction(['chunks', 'sessions'], 'readwrite');
  tx.objectStore('chunks').delete(IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER]));
  tx.objectStore('sessions').delete(sessionId);
  await done(tx);
}
