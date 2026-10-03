import { formatBytes, formatDuration, parseFolderId, isPlaceholderClientId, clipRange, clipFilename, talkShare, talkSentence } from './lib.js';
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

  const lengthMs = session.endedAt ? session.endedAt - session.startedAt : null;
  if (blob.size > 0) renderMarks(card, session, url, lengthMs);
  renderTalk(card, session);

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

// ---------------------------------------------------------------------
// Clips (Wish 11)
// ---------------------------------------------------------------------

function renderMarks(card, session, url, lengthMs) {
  const marks = session.marks || [];
  const box = card.querySelector('.marks');
  box.hidden = !marks.length;
  const list = box.querySelector('.mark-list');
  list.replaceChildren();
  for (const m of marks) {
    const range = clipRange(m.atMs, lengthMs);
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.className = 'tabular';
    text.textContent = `${formatDuration(m.atMs)}${m.word ? `, ${m.word}` : ''} (clip ${formatDuration(range.startMs)} to ${formatDuration(range.endMs)})`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Make a clip';
    const status = document.createElement('span');
    status.className = 'muted';
    status.setAttribute('role', 'status');
    btn.onclick = async () => {
      btn.disabled = true;
      status.textContent = 'Making the clip…';
      try {
        const clip = await makeClip(url, range, session.mimeType, (done) => {
          status.textContent = `Making the clip: ${Math.round(done * 100)} percent.`;
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(clip);
        a.download = clipFilename(session.filename, m);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
        status.textContent = `Saved as ${a.download}, ${formatBytes(clip.size)}.`;
      } catch (err) {
        status.textContent = `The clip was not made: ${err.message || err}`;
      }
      btn.disabled = false;
    };
    li.append(text, ' ', btn, ' ', status);
    list.append(li);
  }
}

function once(target, event) {
  return new Promise((resolve, reject) => {
    const ok = () => { target.removeEventListener('error', bad); resolve(); };
    const bad = () => { target.removeEventListener(event, ok); reject(new Error('this recording could not be read here')); };
    target.addEventListener(event, ok, { once: true });
    target.addEventListener('error', bad, { once: true });
  });
}

// Plays the part of the recording in a hidden video and records what it
// plays, with no encoder library: the picture from captureStream, the
// sound through Web Audio so it never reaches the speakers. It takes as
// long as the clip. MediaRecorder's WebM has no index, so Chrome first
// learns the length by seeking to the end, then seeks to the start.
async function makeClip(url, range, mimeType, onProgress) {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.src = url;
  await once(video, 'loadedmetadata');
  if (!Number.isFinite(video.duration)) {
    video.currentTime = 1e101;
    await once(video, 'durationchange');
  }
  const start = range.startMs / 1000;
  const end = Math.min(range.endMs / 1000, Number.isFinite(video.duration) ? video.duration : Infinity);
  if (!(end > start)) throw new Error('the marked moment is past the end of the recording');
  video.currentTime = start;
  await once(video, 'seeked');

  const audio = new AudioContext();
  const sound = audio.createMediaStreamDestination();
  audio.createMediaElementSource(video).connect(sound);
  const picture = video.captureStream();
  const stream = new MediaStream([...picture.getVideoTracks(), ...sound.stream.getAudioTracks()]);
  const type = MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: type });
  const parts = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
  const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));

  recorder.start(1000);
  await video.play();
  await new Promise((resolve) => {
    const tick = () => {
      onProgress(Math.min(1, (video.currentTime - start) / (end - start)));
      if (video.currentTime >= end || video.ended) { video.removeEventListener('timeupdate', tick); resolve(); }
    };
    video.addEventListener('timeupdate', tick);
    video.addEventListener('ended', tick, { once: true });
  });
  video.pause();
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  await audio.close().catch(() => {});
  video.removeAttribute('src');
  video.load();
  return new Blob(parts, { type: type.split(';')[0] });
}

// ---------------------------------------------------------------------
// The host's own talk share (Wish 4). It is the host's to keep or let go;
// the recorder cannot sign in to the hub, so keeping it means typing the
// percent on the session page, where the cohort can read it.
// ---------------------------------------------------------------------

function renderTalk(card, session) {
  const box = card.querySelector('.talk');
  if (!session.countingTalk && !session.talk) { box.hidden = true; return; }
  box.hidden = false;
  const share = talkShare(session.talk);
  const sentence = box.querySelector('.talk-sentence');
  const help = box.querySelector('.talk-help');
  const actions = box.querySelector('.talk-actions');
  if (session.talkChoice === 'discarded') {
    sentence.textContent = 'You let your talk share for this session go.';
    help.textContent = '';
    actions.hidden = true;
    return;
  }
  sentence.textContent = session.status === 'recording' && !session.talk
    ? 'The recorder stopped before it saved a talk count.'
    : talkSentence(share);
  if (share == null) {
    help.textContent = 'Nothing about it is kept.';
    actions.hidden = true;
    return;
  }
  const percent = Math.round(share * 100);
  help.textContent = session.talkChoice === 'kept'
    ? `To keep it where the cohort can read it, open this session's page on humanshaped.org, and under "Your own talk" type ${percent}. Until you do, it is only on this computer.`
    : 'It counts only you, against everyone else together, never who else talked or what anyone said. Only you see it unless you save it on the session page.';
  box.querySelector('.talk-keep').hidden = session.talkChoice === 'kept';
  box.querySelector('.talk-keep').onclick = async () => {
    await updateSession(session.id, { talkChoice: 'kept' });
    await navigator.clipboard.writeText(String(percent)).catch(() => {});
    render();
  };
  box.querySelector('.talk-discard').onclick = async () => {
    await updateSession(session.id, { talk: null, talkChoice: 'discarded' });
    render();
  };
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
