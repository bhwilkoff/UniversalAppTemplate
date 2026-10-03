// Service worker: starts and stops the offscreen recorder and owns the
// "recording" indicator. The stream ID has to come from here (Chrome 116+)
// to be usable in an offscreen document:
// https://developer.chrome.com/docs/extensions/reference/api/tabCapture

import { isMeetUrl, newSessionId } from './lib.js';

const OFFSCREEN_URL = 'offscreen.html';

async function offscreenExists() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await offscreenExists()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['USER_MEDIA'],
    justification: 'Recording the Google Meet tab the host chose, with tabCapture and MediaRecorder.',
  });
}

async function closeOffscreen() {
  if (await offscreenExists()) await chrome.offscreen.closeDocument().catch(() => {});
}

async function showRecording(on) {
  await chrome.action.setBadgeText({ text: on ? 'REC' : '' });
  if (on) await chrome.action.setBadgeBackgroundColor({ color: '#B3261E' });
  await chrome.action.setTitle({ title: on ? 'Recording this session. Click to stop.' : 'Record a Human Shaped session' });
}

async function getState() {
  const { recorder } = await chrome.storage.session.get('recorder');
  return recorder || { recording: false };
}

async function setState(state) {
  await chrome.storage.session.set({ recorder: state });
}

async function start({ tabId, cohort, includeMic, quality, countTalk }) {
  const state = await getState();
  if (state.recording && (await offscreenExists())) {
    return { ok: false, error: 'A recording is already running. Stop it first.' };
  }
  const tab = await chrome.tabs.get(tabId);
  if (!isMeetUrl(tab.url || '')) {
    return { ok: false, error: 'This tab is not a Google Meet call. Open the call, then press the extension button in that tab.' };
  }
  await ensureOffscreen();
  let streamId;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } catch (err) {
    await closeOffscreen();
    return { ok: false, error: `Chrome would not let the extension capture this tab (${err.message || err}).` };
  }
  const sessionId = newSessionId();
  const reply = await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'start',
    streamId,
    sessionId,
    cohort,
    includeMic,
    quality,
    countTalk: Boolean(countTalk && includeMic),
  });
  if (!reply || !reply.ok) {
    await closeOffscreen();
    return { ok: false, error: (reply && reply.error) || 'The recorder did not start.' };
  }
  await setState({ recording: true, sessionId, tabId, startedAt: reply.startedAt, cohort, micIncluded: reply.micIncluded, micError: reply.micError, countingTalk: reply.countingTalk });
  await showRecording(true);
  return reply;
}

async function stop() {
  if (!(await offscreenExists())) {
    const state = await getState();
    await setState({ recording: false });
    await showRecording(false);
    if (state.sessionId) openFinish(state.sessionId);
    return { ok: true, sessionId: state.sessionId || null };
  }
  return chrome.runtime.sendMessage({ target: 'offscreen', type: 'stop' });
}

// A mark is a moment to clip later (Wish 11), from the popup's button or
// the keyboard shortcut. The badge says MARK for a moment so the host
// knows it took, without opening anything.
async function mark(word) {
  if (!(await offscreenExists())) return { ok: false, error: 'Nothing is recording.' };
  const reply = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'mark', word: word || '' });
  if (reply && reply.ok) {
    await chrome.action.setBadgeText({ text: 'MARK' });
    setTimeout(async () => {
      const state = await getState();
      await chrome.action.setBadgeText({ text: state.recording ? 'REC' : '' });
    }, 1500);
  }
  return reply || { ok: false, error: 'The recorder did not answer.' };
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'mark-moment') mark('');
});

function openFinish(sessionId) {
  chrome.tabs.create({ url: `finish.html?id=${encodeURIComponent(sessionId)}` });
}

async function status() {
  const state = await getState();
  if (state.recording && !(await offscreenExists())) {
    // The recorder went away without telling us (a crash, or Chrome
    // closed it). Its chunks are still in IndexedDB.
    await setState({ recording: false, lostSessionId: state.sessionId });
    await showRecording(false);
    return { recording: false, lostSessionId: state.sessionId };
  }
  return state;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'background') return false;
  const handlers = {
    start: () => start(message),
    stop: () => stop(),
    mark: () => mark(message.word),
    status: () => status(),
    'recorder-progress': async () => ({ ok: true }),
    'recorder-stopped': async () => {
      await setState({ recording: false });
      await showRecording(false);
      await closeOffscreen();
      openFinish(message.sessionId);
      return { ok: true };
    },
  };
  const handler = handlers[message.type];
  if (!handler) return false;
  handler().then(sendResponse, (err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true;
});

chrome.runtime.onStartup.addListener(() => showRecording(false));
