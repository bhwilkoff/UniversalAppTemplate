import { parseCohortList, formatCohortList, isPlaceholderClientId } from './lib.js';
import { getToken, whoAmI } from './auth.js';

const $ = (id) => document.getElementById(id);

function say(el, text, kind) {
  el.textContent = text;
  el.className = kind || '';
}

async function loadCohorts() {
  const { cohorts = [] } = await chrome.storage.local.get('cohorts');
  $('cohort-list').value = formatCohortList(cohorts);
}

$('save-cohorts').onclick = async () => {
  const { cohorts, errors } = parseCohortList($('cohort-list').value);
  if (errors.length) {
    say($('cohort-result'), `Nothing saved yet. ${errors.join('. ')}.`, 'error');
    return;
  }
  await chrome.storage.local.set({ cohorts });
  $('cohort-list').value = formatCohortList(cohorts);
  say($('cohort-result'), `Saved ${cohorts.length} cohort${cohorts.length === 1 ? '' : 's'}.`, 'ok');
};

$('allow-mic').onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    say($('mic-result'), 'The recorder can use your microphone now.', 'ok');
  } catch (err) {
    say($('mic-result'), `Chrome did not allow the microphone (${err.name || err}). Check the camera and microphone setting for this extension in Chrome's site settings.`, 'error');
  }
};

$('ext-id').textContent = chrome.runtime.id;
const clientId = (chrome.runtime.getManifest().oauth2 || {}).client_id;
if (isPlaceholderClientId(clientId)) {
  say($('client-status'), 'No OAuth client ID in manifest.json yet, so Drive upload is off. Recording and saving to this computer still work. The README walks through creating one.', 'error');
  $('check-drive').disabled = true;
} else {
  say($('client-status'), `OAuth client: ${clientId}`, 'muted');
}

$('check-drive').onclick = async () => {
  say($('drive-result'), 'Asking Google...', 'muted');
  try {
    const token = await getToken(false);
    const email = await whoAmI(token);
    const kind = /@humanshaped\.org$/i.test(email || '') ? 'ok' : 'error';
    const note = kind === 'ok' ? '' : ' That is not the meet@humanshaped.org account. Uploads would land in that account\'s Drive, so switch to the meet@ Chrome profile.';
    say($('drive-result'), `Signed in to Drive as ${email || 'an account Google would not name'}.${note}`, kind);
  } catch (err) {
    say($('drive-result'), `Drive sign-in failed: ${err.message || err}`, 'error');
  }
};

$('open-recordings').onclick = () => chrome.tabs.create({ url: 'finish.html' });

loadCohorts();
