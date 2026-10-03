import { consentNotice, stopNotice, formatDuration, formatBytes, estimateBytes, isMeetUrl } from './lib.js';

const $ = (id) => document.getElementById(id);
let tickTimer = null;

function show(sectionId) {
  for (const id of ['not-meet', 'ready', 'recording', 'lost']) $(id).hidden = id !== sectionId;
}

function send(type, data = {}) {
  return chrome.runtime.sendMessage({ target: 'background', type, ...data });
}

function openPage(path) {
  chrome.tabs.create({ url: path });
  window.close();
}

async function loadCohorts() {
  const { cohorts = [], lastCohortId = '' } = await chrome.storage.local.get(['cohorts', 'lastCohortId']);
  return { cohorts, lastCohortId };
}

function selectedCohort(cohorts) {
  const id = $('cohort').value;
  return cohorts.find((c) => c.id === id) || null;
}

function renderNotice(cohorts) {
  const c = selectedCohort(cohorts);
  $('notice').textContent = consentNotice({ cohortTitle: c ? c.label : '', countingTalk: $('talk').checked && $('mic').checked });
}

async function copy(text, confirmEl) {
  await navigator.clipboard.writeText(text);
  if (confirmEl) confirmEl.hidden = false;
}

// The shortcut is whatever the host set in chrome://extensions/shortcuts,
// which may not be the one suggested, or none if another extension has it.
async function showShortcut() {
  const commands = await chrome.commands.getAll().catch(() => []);
  const c = commands.find((x) => x.name === 'mark-moment');
  $('mark-key').textContent = c && c.shortcut ? `(or press ${c.shortcut} in any tab)` : '(a shortcut can be set in chrome://extensions/shortcuts)';
}

function renderRecording(state) {
  showShortcut();
  show('recording');
  $('rec-cohort').textContent = state.cohort ? `Saving for ${state.cohort.label}` : 'Saving on this computer only (no cohort folder chosen)';
  $('mic-status').textContent = state.micIncluded ? 'Your microphone is in the recording.' : state.micError || 'Your microphone is not in this recording.';
  $('mic-status').className = state.micIncluded ? 'ok' : 'error';
  $('talk-status').hidden = !state.countingTalk;
  $('marked').textContent = state.marks ? `${state.marks} marked so far.` : '';
  const tick = () => ($('elapsed').textContent = formatDuration(Date.now() - state.startedAt));
  tick();
  clearInterval(tickTimer);
  tickTimer = setInterval(tick, 1000);
}

async function init() {
  const state = await send('status');
  if (state && state.recording) return renderRecording(state);
  if (state && state.lostSessionId) {
    show('lost');
    $('open-lost').onclick = () => openPage(`finish.html?id=${encodeURIComponent(state.lostSessionId)}`);
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isMeetUrl(tab.url || '')) {
    show('not-meet');
    $('open-recordings-1').onclick = () => openPage('finish.html');
    return;
  }

  show('ready');
  const { cohorts, lastCohortId } = await loadCohorts();
  const select = $('cohort');
  select.replaceChildren();
  for (const c of cohorts) select.append(new Option(c.label, c.id, false, c.id === lastCohortId));
  select.append(new Option('No folder: keep it on this computer', ''));
  if (!cohorts.length) select.value = '';

  for (const opt of $('quality').options) {
    opt.textContent = `${opt.value === 'standard' ? '1080p' : '720p'}, about ${formatBytes(estimateBytes(opt.value, 90))} for 90 minutes`;
  }

  // Counting talk listens to your microphone, so it needs it.
  const syncTalk = () => {
    $('talk').disabled = !$('mic').checked;
    if (!$('mic').checked) $('talk').checked = false;
    renderNotice(cohorts);
  };
  $('mic').onchange = syncTalk;
  $('talk').onchange = () => renderNotice(cohorts);
  syncTalk();
  select.onchange = () => renderNotice(cohorts);
  $('copy-notice').onclick = () => copy($('notice').textContent, $('copied')).catch(() => {});
  $('announced').onchange = () => ($('start').disabled = !$('announced').checked);
  $('open-options').onclick = () => chrome.runtime.openOptionsPage();

  $('start').onclick = async () => {
    $('start').disabled = true;
    $('start-error').hidden = true;
    const cohort = selectedCohort(cohorts);
    await chrome.storage.local.set({ lastCohortId: cohort ? cohort.id : '' });
    const reply = await send('start', {
      tabId: tab.id,
      cohort,
      includeMic: $('mic').checked,
      quality: $('quality').value,
      countTalk: $('talk').checked,
    }).catch((err) => ({ ok: false, error: String(err.message || err) }));
    if (!reply || !reply.ok) {
      $('start-error').textContent = (reply && reply.error) || 'The recording did not start.';
      $('start-error').hidden = false;
      $('start').disabled = false;
      return;
    }
    renderRecording({ ...reply, cohort });
  };
}

$('stop').onclick = async () => {
  $('stop').disabled = true;
  const reply = await send('stop').catch((err) => ({ ok: false, error: String(err.message || err) }));
  if (!reply || !reply.ok) {
    $('stop-error').textContent = (reply && reply.error) || 'Stopping failed. Close the Meet tab to end the capture; what was recorded is kept.';
    $('stop-error').hidden = false;
    $('stop').disabled = false;
    return;
  }
  window.close();
};
$('copy-stop').onclick = () => copy(stopNotice()).catch(() => {});
$('mark').onclick = async () => {
  $('mark').disabled = true;
  const reply = await send('mark', { word: $('mark-word').value }).catch((err) => ({ ok: false, error: String(err.message || err) }));
  $('mark').disabled = false;
  if (!reply || !reply.ok) {
    $('marked').textContent = (reply && reply.error) || 'The mark did not save.';
    return;
  }
  $('mark-word').value = '';
  $('marked').textContent = `Marked at ${formatDuration(reply.mark.atMs)}. ${reply.marks} so far.`;
};

init();
