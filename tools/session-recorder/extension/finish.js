import { formatBytes, formatDuration, parseFolderId, isPlaceholderClientId } from './lib.js';
import { listSessions, assembleRecording, deleteRecording, updateSession, getSession } from './store.js';
import { startSession, sendChunks, queryOffset } from './drive.js';
import { getToken } from './auth.js';

const focusId = new URLSearchParams(location.search).get('id');
const clientReady = !isPlaceholderClientId((chrome.runtime.getManifest().oauth2 || {}).client_id);

const STOP_REASONS = {
  host: '',
  'tab-closed': 'The Meet tab closed, so the recording stopped there.',
  'disk-full': 'This computer ran out of space, so the recording stopped there.',
  'write-failed': 'Saving a piece of the recording failed, so it stopped there.',
};

function setStatus(card, text, kind) {
  const el = card.querySelector('.upload-status');
  el.textContent = text;
  el.className = `upload-status ${kind || ''}`;
}

async function render() {
  const sessions = await listSessions();
  const { cohorts = [] } = await chrome.storage.local.get('cohorts');
  const list = document.getElementById('list');
  list.replaceChildren();
  document.getElementById('empty').hidden = sessions.length > 0;
  for (const s of sessions) list.append(await renderCard(s, cohorts));
  const focused = list.querySelector('.focus');
  if (focused) focused.scrollIntoView({ block: 'start' });
}

async function renderCard(session, cohorts) {
  const card = document.getElementById('card').content.firstElementChild.cloneNode(true);
  if (session.id === focusId) card.classList.add('focus');
  card.querySelector('.name').textContent = session.filename;

  const started = new Date(session.startedAt);
  const length = session.endedAt ? formatDuration(session.endedAt - session.startedAt) : 'unfinished';
  const facts = [
    started.toLocaleString(),
    length,
    formatBytes(session.bytes),
    session.cohortLabel || 'no cohort',
    session.micIncluded ? 'with your microphone' : 'without your microphone',
  ];
  card.querySelector('.facts').textContent = facts.join(' · ');

  const problems = [STOP_REASONS[session.stopReason] || '', session.error || ''];
  if (session.status === 'recording') problems.push('The recorder ended without finishing. This is everything it saved; the last few seconds may be missing.');
  if (!session.micIncluded && session.micError) problems.push(session.micError);
  const problemText = problems.filter(Boolean).join(' ');
  if (problemText) {
    card.querySelector('.problem').textContent = problemText;
    card.querySelector('.problem').hidden = false;
  }

  const blob = await assembleRecording(session.id, session.mimeType);
  const url = URL.createObjectURL(blob);
  const save = card.querySelector('.save');
  save.onclick = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = session.filename;
    a.click();
  };
  if (blob.size === 0) {
    save.hidden = true;
    card.querySelector('.problem').textContent = 'Nothing was recorded for this session.';
    card.querySelector('.problem').hidden = false;
  }

  const select = card.querySelector('.folder');
  for (const c of cohorts) select.append(new Option(c.label, c.folderId, false, c.folderId === session.folderId));
  select.append(new Option('Another folder (paste its ID or link)', '__other'));
  if (!cohorts.length || (session.folderId && !cohorts.some((c) => c.folderId === session.folderId))) {
    select.value = '__other';
    card.querySelector('.folder-id').value = session.folderId || '';
  }
  const syncOther = () => (card.querySelector('.other').hidden = select.value !== '__other');
  select.onchange = syncOther;
  syncOther();

  const uploadBtn = card.querySelector('.upload');
  if (!clientReady) {
    uploadBtn.disabled = true;
    setStatus(card, 'Drive upload is not set up yet (no OAuth client ID in manifest.json). Save the file to this computer instead.', 'muted');
  } else if (session.upload && session.upload.fileId) {
    showUploaded(card, session.upload);
  } else if (session.upload && session.upload.resumeUri) {
    uploadBtn.textContent = 'Resume upload';
    setStatus(card, 'An earlier upload did not finish. Resuming picks up where it stopped.', 'muted');
  }
  if (blob.size === 0) uploadBtn.disabled = true;

  uploadBtn.onclick = () => upload(card, session.id, blob, select);

  card.querySelector('.delete').onclick = async () => {
    const inDrive = session.upload && session.upload.fileId;
    const warning = inDrive
      ? 'Delete the copy on this computer? The Drive copy stays.'
      : 'This recording is not in Drive. If you have not saved it somewhere else, deleting it here loses it for good. Delete it?';
    if (!confirm(warning)) return;
    URL.revokeObjectURL(url);
    await deleteRecording(session.id);
    render();
  };
  return card;
}

function showUploaded(card, upload) {
  const status = card.querySelector('.upload-status');
  status.replaceChildren();
  status.className = 'upload-status ok';
  status.append('In Drive: ');
  const a = document.createElement('a');
  a.href = upload.webViewLink || `https://drive.google.com/file/d/${upload.fileId}/view`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'open the recording';
  status.append(a, '.');
  if (upload.folderProblem) {
    const p = document.createElement('span');
    p.className = 'error';
    p.textContent = ` It is in the top of meet@'s My Drive, not the cohort folder, because the extension could not reach that folder (${upload.folderProblem}). Run fileStrayRecordings in the meet-events script, or move it by hand, so the cohort can see it.`;
    status.append(p);
  }
  card.querySelector('.upload').hidden = true;
}

async function upload(card, sessionId, blob, select) {
  const btn = card.querySelector('.upload');
  const progress = card.querySelector('.progress');
  const session = await getSession(sessionId);
  const folderId = select.value === '__other' ? parseFolderId(card.querySelector('.folder-id').value) : select.value;
  if (select.value === '__other' && card.querySelector('.folder-id').value.trim() && !folderId) {
    setStatus(card, 'That does not look like a Drive folder ID or link.', 'error');
    return;
  }

  btn.disabled = true;
  progress.hidden = false;
  const onProgress = (sent, total) => {
    progress.value = total ? sent / total : 0;
    setStatus(card, `Uploading: ${formatBytes(sent)} of ${formatBytes(total)}. Keep this tab open.`, 'muted');
  };

  let resumeUri = session.upload && session.upload.total === blob.size ? session.upload.resumeUri : null;
  let folderProblem = (session.upload && session.upload.folderProblem) || null;
  try {
    let offset = 0;
    if (resumeUri) {
      const q = await queryOffset({ resumeUri, total: blob.size }).catch(() => null);
      if (q && q.done) return finished(card, sessionId, q.file, folderProblem);
      if (q) offset = q.offset;
      else resumeUri = null;
    }
    if (!resumeUri) {
      const started = await startSession({
        blob,
        getToken,
        metadata: {
          name: session.filename,
          mimeType: 'video/webm',
          parents: folderId ? [folderId] : undefined,
          description: `Human Shaped session recording${session.cohortLabel ? `, ${session.cohortLabel}` : ''}, ${new Date(session.startedAt).toLocaleString()}. The host announced the recording to everyone in the call.`,
          properties: { hsCohort: session.cohortId || '', hsStartedAt: String(session.startedAt) },
        },
      });
      resumeUri = started.resumeUri;
      folderProblem = started.folderProblem;
      await updateSession(sessionId, { upload: { resumeUri, total: blob.size, folderProblem, folderId } });
    }
    const file = await sendChunks({ blob, resumeUri, offset, onProgress });
    await finished(card, sessionId, file, folderProblem);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = err.resumeUri ? 'Resume upload' : 'Try the upload again';
    if (!err.resumeUri) await updateSession(sessionId, { upload: null });
    setStatus(card, `The upload did not finish: ${err.message || err} The recording is still on this computer, and you can save it with the button above.`, 'error');
  }
}

async function finished(card, sessionId, file, folderProblem) {
  const upload = { fileId: file.id, webViewLink: file.webViewLink, folderProblem };
  await updateSession(sessionId, { upload });
  card.querySelector('.progress').hidden = true;
  showUploaded(card, upload);
}

render().catch((err) => {
  document.getElementById('list').textContent = `Could not read the recordings on this computer: ${err.message || err}`;
});
