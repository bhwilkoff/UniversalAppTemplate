// The recorder. It lives in an offscreen document because a Manifest V3
// service worker has no DOM, so no MediaRecorder and no AudioContext.
// Recipe: https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
// Offscreen documents get only chrome.runtime, so everything else
// (storage, identity) stays in the service worker and extension pages:
// https://developer.chrome.com/docs/extensions/reference/api/offscreen

import { pickMimeType, QUALITY, RECORDER_TIMESLICE_MS, recordingFilename, newMark, addMark, rms, createTalkCounter } from './lib.js';
import { putSession, updateSession, addChunk } from './store.js';

let active = null;

function send(type, data = {}) {
  return chrome.runtime.sendMessage({ target: 'background', type, ...data }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;
  if (message.type === 'start') {
    start(message).then(sendResponse, (err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (message.type === 'stop') {
    stop('host').then(sendResponse, (err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (message.type === 'mark') {
    mark(message.word).then(sendResponse, (err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (message.type === 'status') {
    sendResponse(active ? publicState() : { recording: false });
    return false;
  }
  return false;
});

function publicState() {
  return {
    recording: true,
    sessionId: active.session.id,
    startedAt: active.session.startedAt,
    bytes: active.bytes,
    micIncluded: active.session.micIncluded,
    micError: active.session.micError,
    countingTalk: Boolean(active.talk),
    marks: active.marks.length,
  };
}

// The moment, measured from when the recording started, with an optional
// word. It is saved at once, so a crash keeps it.
async function mark(word) {
  if (!active) return { ok: false, error: 'Nothing is recording.' };
  const m = newMark(Date.now() - active.session.startedAt, word);
  active.marks = addMark(active.marks, m);
  await updateSession(active.session.id, { marks: active.marks });
  return { ok: true, mark: m, marks: active.marks.length };
}

// The host's own talk (Wish 4): two levels a tenth of a second, the
// microphone and the call's mixed audio, counted and thrown away. No
// sound is kept for this, and nothing says who else spoke.
const TALK_TICK_MS = 100;
function startTalk(ctx, micSource, tabSource) {
  const analyser = (source) => {
    const a = ctx.createAnalyser();
    a.fftSize = 2048;
    source.connect(a);
    return a;
  };
  const mic = analyser(micSource);
  const tab = analyser(tabSource);
  const buffer = new Float32Array(mic.fftSize);
  const counter = createTalkCounter();
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    mic.getFloatTimeDomainData(buffer);
    const micLevel = rms(buffer);
    tab.getFloatTimeDomainData(buffer);
    const tabLevel = rms(buffer);
    counter.add(micLevel, tabLevel, now - last);
    last = now;
  }, TALK_TICK_MS);
  return { counter, stop: () => clearInterval(timer) };
}

async function start({ streamId, sessionId, cohort, includeMic, quality, countTalk }) {
  if (active) return { ok: false, error: 'A recording is already running.' };
  const q = QUALITY[quality] || QUALITY.standard;

  // chromeMediaSource "tab" with the ID the service worker got from
  // tabCapture.getMediaStreamId. The ID works once and expires in seconds.
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: q.maxWidth,
        maxHeight: q.maxHeight,
        maxFrameRate: q.maxFrameRate,
      },
    },
  });

  // Capturing a tab silences it for the person at the computer, so the
  // tab's audio is routed back to the speakers. The microphone goes only
  // into the recording mix, never to the speakers, or the host would
  // hear themselves.
  const ctx = new AudioContext();
  const mix = ctx.createMediaStreamDestination();
  const tabAudio = ctx.createMediaStreamSource(tabStream);
  tabAudio.connect(ctx.destination);
  tabAudio.connect(mix);

  let micStream = null;
  let micSource = null;
  let micError = null;
  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(mix);
    } catch (err) {
      micError =
        err && err.name === 'NotAllowedError'
          ? 'Chrome has not given this extension your microphone. Open the extension options and press "Allow microphone".'
          : `The microphone did not start (${err && err.name ? err.name : err}).`;
    }
  }

  const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error('This version of Chrome cannot record WebM video.');

  const recordStream = new MediaStream([...tabStream.getVideoTracks(), ...mix.stream.getAudioTracks()]);
  const recorder = new MediaRecorder(recordStream, {
    mimeType,
    videoBitsPerSecond: q.videoBitsPerSecond,
    audioBitsPerSecond: 128_000,
  });

  const startedAt = Date.now();
  const session = await putSession({
    id: sessionId,
    cohortId: cohort ? cohort.id : '',
    cohortLabel: cohort ? cohort.label : '',
    folderId: cohort ? cohort.folderId : '',
    filename: recordingFilename({ cohortId: cohort ? cohort.id : '', startedAt: new Date(startedAt) }),
    startedAt,
    endedAt: null,
    mimeType,
    quality,
    status: 'recording',
    bytes: 0,
    chunks: 0,
    micIncluded: Boolean(micStream),
    micError,
    stopReason: null,
    error: null,
    upload: null,
    marks: [],
    countingTalk: Boolean(countTalk && micSource),
    talk: null,
  });

  // Counting talk needs the microphone; without it there is nothing to count.
  const talk = countTalk && micSource ? startTalk(ctx, micSource, tabAudio) : null;
  active = { session, recorder, tabStream, micStream, ctx, talk, marks: [], seq: 0, bytes: 0, writes: Promise.resolve(), writeError: null };

  recorder.ondataavailable = (event) => {
    if (!event.data || event.data.size === 0 || !active) return;
    const a = active;
    const seq = a.seq++;
    a.bytes += event.data.size;
    a.writes = a.writes
      .then(() => addChunk(a.session.id, seq, event.data))
      .then(() => updateSession(a.session.id, { bytes: a.bytes, chunks: a.seq, talk: a.talk ? a.talk.counter.totals() : null }))
      .catch((err) => {
        if (!a.writeError) {
          a.writeError = err;
          const reason = err && err.name === 'QuotaExceededError' ? 'disk-full' : 'write-failed';
          stop(reason);
        }
      });
    send('recorder-progress', { bytes: a.bytes });
  };

  // The Meet tab closing or navigating away ends the video track. Save what
  // we have rather than lose it.
  tabStream.getVideoTracks()[0].addEventListener('ended', () => stop('tab-closed'));

  recorder.start(RECORDER_TIMESLICE_MS);
  return { ok: true, ...publicState() };
}

async function stop(reason) {
  if (!active) return { ok: false, error: 'Nothing is recording.' };
  const a = active;
  if (a.stopping) return a.stopping;
  a.stopping = (async () => {
    if (a.recorder.state !== 'inactive') {
      await new Promise((resolve) => {
        a.recorder.addEventListener('stop', resolve, { once: true });
        a.recorder.stop();
      });
    }
    await a.writes;
    if (a.talk) a.talk.stop();
    a.tabStream.getTracks().forEach((t) => t.stop());
    if (a.micStream) a.micStream.getTracks().forEach((t) => t.stop());
    await a.ctx.close().catch(() => {});

    const error = a.writeError
      ? `Saving to this computer failed partway (${a.writeError.name || a.writeError}). Everything recorded before that point is kept.`
      : null;
    const patch = { status: 'stopped', endedAt: Date.now(), bytes: a.bytes, chunks: a.seq, stopReason: reason, error,
      marks: a.marks, talk: a.talk ? a.talk.counter.totals() : null };
    // If the disk is full this write can fail too; the chunks already
    // saved are still there, and the finish page can read them.
    await updateSession(a.session.id, patch).catch(() => {});
    active = null;
    await send('recorder-stopped', { sessionId: a.session.id, stopReason: reason, error });
    return { ok: true, sessionId: a.session.id };
  })();
  return a.stopping;
}
