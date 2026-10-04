/**
 * Human Shaped live sessions: Calendar events, Meet links and the cohort
 * recordings folder, run as meet@humanshaped.org.
 *
 * Entry points. From the editor's Run button they use the cohort named in
 * the Script Property ACTIVE_COHORT; from `clasp run` you can pass an id.
 *   previewCohort('c1')         logs what setupCohort would do, changes nothing
 *   setupCohort('c1')           creates or updates the event and folder, then checks
 *   checkCohort('c1')           the "check it works" report, changes nothing
 *   fileStrayRecordings('c1')   moves recorder uploads that missed the folder into it
 *   whoAmI()                    logs the account this script runs as
 *
 * With groups in the definition, setupCohort also makes one Meet room per
 * group and prints the lines to paste into /teach/. By default each room
 * is a recurring event with the group invited. With the Script Property
 * ROOMS_VIA_MEET_API set to "true", each room is instead a Meet space
 * made through the Meet REST API, set to TRUSTED, with the group's
 * members added (so they join without knocking) and the teachers added
 * as co-hosts; the Calendar rooms stay the fallback when it is off.
 *
 * Cohort definitions come from the Script Property COHORTS_JSON (a JSON
 * array) or from a Google Sheet (Script Property COHORT_SHEET_ID, tab
 * "Cohorts", one row per cohort, headers named like the fields below).
 *
 * Only free services: Calendar, Drive, Sheets and Apps Script. No Meet
 * recording settings, because recording in Meet needs a paid license;
 * the session-recorder Chrome extension records instead.
 *
 * Docs this follows:
 *   Meet links on events: https://developers.google.com/workspace/calendar/api/guides/create-events
 *   Advanced Calendar:    https://developers.google.com/apps-script/advanced/calendar
 *   Advanced Drive (v3):  https://developers.google.com/apps-script/advanced/drive
 *   Meet spaces:          https://developers.google.com/workspace/meet/api/guides/meeting-spaces
 *   Space members:        https://developers.google.com/workspace/meet/api/guides/meeting-space-members
 */

var HOST_EMAIL_DEFAULT = 'meet@humanshaped.org';
var WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
var WEEKDAY_NAMES = {
  sunday: 'SU', monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH', friday: 'FR', saturday: 'SA',
  sun: 'SU', mon: 'MO', tue: 'TU', tues: 'TU', wed: 'WE', thu: 'TH', thur: 'TH', thurs: 'TH', fri: 'FR', sat: 'SA',
};

/* ------------------------------------------------------------------ */
/* Pure helpers (no Google services; tested in test/code.test.mjs)    */
/* ------------------------------------------------------------------ */

function splitEmails(value) {
  if (Array.isArray(value)) value = value.join(',');
  return String(value || '')
    .split(/[\s,;]+/)
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { return s; })
    .filter(function (s, i, all) { return all.indexOf(s) === i; });
}

function normalizeWeekday(value) {
  var v = String(value || '').trim().toLowerCase();
  if (WEEKDAYS.indexOf(v.toUpperCase()) >= 0) return v.toUpperCase();
  return WEEKDAY_NAMES[v] || null;
}

function parseLocalDate(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function formatLocalDate(d) {
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

// The first date on or after startDate that falls on the weekday.
function firstSessionDate(startDate, weekday) {
  var d = parseLocalDate(startDate);
  var target = WEEKDAYS.indexOf(weekday);
  if (!d || target < 0) return null;
  var shift = (target - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + shift);
  return formatLocalDate(d);
}

// Wall-clock arithmetic in UTC on purpose: Calendar gets a local time plus
// the cohort's time zone, and keeps the wall time steady across daylight
// saving changes.
function localDateTime(date, time, plusMinutes) {
  var d = parseLocalDate(date);
  var m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !m) return null;
  d.setUTCHours(+m[1], +m[2] + (plusMinutes || 0), 0, 0);
  return formatLocalDate(d) + 'T' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':00';
}

function normalizeCohort(raw) {
  var errors = [];
  var c = {
    id: String(raw.id || '').trim(),
    title: String(raw.title || '').trim(),
    startDate: String(raw.startDate || '').trim(),
    weekday: normalizeWeekday(raw.weekday),
    startTime: String(raw.startTime || '').trim(),
    timeZone: String(raw.timeZone || '').trim(),
    minutes: Number(raw.minutes),
    sessions: Number(raw.sessions),
    members: splitEmails(raw.members),
    teachers: splitEmails(raw.teachers),
    sessionUrl: String(raw.sessionUrl || '').trim(),
    groups: [],
  };
  // Groups, each with its own Meet room (Meet on Workspace for Education
  // Fundamentals has no breakout rooms). From /teach/'s setup they arrive
  // as an array; from a Sheet, as JSON in a "groups" column.
  var groups = raw.groups || [];
  if (typeof groups === 'string') {
    try { groups = groups.trim() ? JSON.parse(groups) : []; } catch (e) { errors.push('groups must be a JSON list, as /teach/ copies it'); groups = []; }
  }
  if (!Array.isArray(groups)) { errors.push('groups must be a list'); groups = []; }
  groups.forEach(function (g, i) {
    var group = { key: String(g.key || '').trim(), name: String(g.name || '').trim(), members: splitEmails(g.members) };
    if (!/^[a-z0-9-]{1,40}$/i.test(group.key)) errors.push('group ' + (i + 1) + ' needs a key of letters, numbers and dashes');
    if (!group.name) errors.push('group ' + (i + 1) + ' has no name');
    c.groups.push(group);
  });
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/i.test(c.id)) errors.push('id must be letters, numbers and dashes (for example "c1")');
  if (!c.title) errors.push('title is empty');
  if (!parseLocalDate(c.startDate)) errors.push('startDate must look like 2026-10-20');
  if (!c.weekday) errors.push('weekday must be a day such as "TU" or "Tuesday"');
  if (!/^\d{1,2}:\d{2}$/.test(c.startTime)) errors.push('startTime must look like 17:00');
  if (!/^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(c.timeZone) && c.timeZone !== 'UTC') errors.push('timeZone must be an IANA name such as America/Denver');
  if (!(c.minutes >= 15 && c.minutes <= 480)) errors.push('minutes must be between 15 and 480');
  if (!(c.sessions >= 1 && c.sessions <= 52 && Math.floor(c.sessions) === c.sessions)) errors.push('sessions must be a whole number from 1 to 52');
  if (!/^https:\/\//.test(c.sessionUrl)) errors.push('sessionUrl must start with https://');
  c.groups.reduce(function (all, g) { return all.concat(g.members); }, []).concat(c.members, c.teachers).filter(function (e, i, all) { return all.indexOf(e) === i; }).forEach(function (e) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) errors.push('"' + e + '" is not an email address');
  });
  if (!errors.length) {
    c.firstDate = firstSessionDate(c.startDate, c.weekday);
    c.start = localDateTime(c.firstDate, c.startTime, 0);
    c.end = localDateTime(c.firstDate, c.startTime, c.minutes);
  }
  return { cohort: c, errors: errors };
}

function rowToCohort(headers, row) {
  var raw = {};
  headers.forEach(function (h, i) {
    var key = String(h || '').trim();
    var v = row[i];
    if (v instanceof Date) v = formatLocalDate(new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())));
    if (key) raw[key] = v;
  });
  return raw;
}

function recurrenceRule(c) {
  return 'RRULE:FREQ=WEEKLY;COUNT=' + c.sessions + ';BYDAY=' + c.weekday;
}

function eventDescription(c, folderUrl) {
  var lines = [
    'Session page: ' + c.sessionUrl,
    '',
    'Recordings for this cohort: ' + (folderUrl || '(folder not made yet)'),
    '',
    'Sessions are recorded, and the host says so at the start of each one. Recordings are shared only with this cohort. If you would rather not appear, keep your camera off and use the chat, or ask the host to trim your part.',
  ];
  return lines.join('\n');
}

function guestList(c) {
  return c.members.concat(c.teachers).filter(function (e, i, all) { return all.indexOf(e) === i; });
}

function buildEventResource(c, folderUrl) {
  return {
    summary: c.title,
    description: eventDescription(c, folderUrl),
    start: { dateTime: c.start, timeZone: c.timeZone },
    end: { dateTime: c.end, timeZone: c.timeZone },
    recurrence: [recurrenceRule(c)],
    attendees: guestList(c).map(function (email) { return { email: email }; }),
    // Each member chose to share their email with the host, not with
    // the whole cohort.
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    extendedProperties: { private: { hsCohortId: c.id } },
  };
}

// A group's own room: the same weekly times as the cohort's event, with
// the group's members and the teachers invited, so that they can join
// without waiting to be let in while no host is there. Invited quietly
// (setup sends no email for it), because the session page sends people
// to their room when the group part starts.
function buildGroupRoomResource(c, g) {
  var guests = g.members.concat(c.teachers).filter(function (e, i, all) { return all.indexOf(e) === i; });
  return {
    summary: c.title + ', ' + g.name + ' room',
    description: [
      'The room for ' + g.name + ' during the group part of each session. The session page sends you here when the groups begin, and back to the main session afterward:',
      c.sessionUrl,
    ].join('\n'),
    start: { dateTime: c.start, timeZone: c.timeZone },
    end: { dateTime: c.end, timeZone: c.timeZone },
    recurrence: [recurrenceRule(c)],
    attendees: guests.map(function (email) { return { email: email }; }),
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    extendedProperties: { private: { hsCohortId: c.id, hsGroup: g.key } },
  };
}

// What setup prints for the teacher to paste into each group on /teach/.
function groupRoomLines(c, rooms) {
  if (!c.groups.length) return '';
  return ['Group rooms. On /teach/, paste each link into its group\'s "Its own Meet room":']
    .concat(c.groups.map(function (g) { return '  ' + g.name + ': ' + (rooms[g.key] || '(no Meet link yet; run checkCohort in a minute)'); }))
    .join('\n');
}

// ---- Rooms through the Meet REST API (C2) ----

// The switch: only the exact word "true" turns it on.
function roomsViaMeetApi(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

// A new room: TRUSTED lets members of the host's organization, invited
// external users, and dial-in users in without knocking; everyone else
// knocks (Meet REST API, "Manage meeting space members").
function spaceRequestBody() {
  return { config: { accessType: 'TRUSTED' } };
}

// Who a group's room should have as members: the group's people, and the
// teachers as co-hosts (a teacher who is also in the group is a
// co-host). The host owns the space and is never a member.
function wantedSpaceMembers(c, g, hostEmail) {
  var host = String(hostEmail || '').toLowerCase();
  var want = {};
  g.members.forEach(function (e) { if (e !== host) want[e] = 'ROLE_UNSPECIFIED'; });
  c.teachers.forEach(function (e) { if (e !== host) want[e] = 'COHOST'; });
  return Object.keys(want).sort().map(function (e) { return { email: e, role: want[e] }; });
}

// What to change: members to add, members to remove (by their resource
// name), and members whose role is wrong. have: [{name, email, role}]
// from spaces.members.list.
function diffSpaceMembers(want, have) {
  var byEmail = {};
  (have || []).forEach(function (m) { if (m.email) byEmail[String(m.email).toLowerCase()] = m; });
  var wanted = {};
  want.forEach(function (w) { wanted[w.email] = w; });
  function roleOf(m) { return m.role && m.role !== 'ROLE_UNSPECIFIED' ? m.role : 'ROLE_UNSPECIFIED'; }
  return {
    add: want.filter(function (w) { return !byEmail[w.email]; }),
    remove: (have || []).filter(function (m) { return !m.email || !wanted[String(m.email).toLowerCase()]; }).map(function (m) { return m.name; }),
    change: want.filter(function (w) { return byEmail[w.email] && roleOf(byEmail[w.email]) !== w.role; })
      .map(function (w) { return { name: byEmail[w.email].name, role: w.role }; }),
  };
}

// A member as the API takes it: the email, and a role only when it is
// one (an unspecified role is left out).
function memberBody(w) {
  return w.role === 'ROLE_UNSPECIFIED' ? { email: w.email } : { email: w.email, role: w.role };
}

// What setup prints for each Meet API room: the link, and the space's
// name, which /teach/ keeps with the room so its members can be set again.
function spaceRoomLines(c, rooms) {
  if (!c.groups.length) return '';
  return ['Group rooms. On /teach/, paste everything after each group\'s name into that group\'s "Its own Meet room":']
    .concat(c.groups.map(function (g) {
      var r = rooms[g.key];
      return '  ' + g.name + ': ' + (r && r.uri ? r.uri + ' | ' + r.name : '(no room yet)');
    }))
    .join('\n');
}

function meetLinkOf(event) {
  var conf = (event && event.conferenceData) || {};
  var video = (conf.entryPoints || []).filter(function (p) { return p.entryPointType === 'video'; })[0];
  return video ? video.uri : null;
}

// want: emails that should have access; have: [{email, role, id, type}]
function diffSharing(want, have, protectedEmails) {
  var keep = {};
  protectedEmails = (protectedEmails || []).map(function (e) { return e.toLowerCase(); });
  have.forEach(function (p) { if (p.email) keep[p.email.toLowerCase()] = p; });
  return {
    add: want.filter(function (e) { return !keep[e]; }),
    remove: have.filter(function (p) {
      if (p.type !== 'user' || !p.email) return false;
      if (p.role === 'owner') return false;
      var e = p.email.toLowerCase();
      return want.indexOf(e) < 0 && protectedEmails.indexOf(e) < 0;
    }),
    openLinks: have.filter(function (p) { return p.type === 'anyone' || p.type === 'domain'; }),
  };
}

function extensionLine(c, folderId) {
  return c.id + ' | ' + c.title + ' | ' + folderId;
}

function sameSet(a, b) {
  var x = a.slice().sort().join(',');
  var y = b.slice().sort().join(',');
  return x === y;
}

/* ------------------------------------------------------------------ */
/* Google services                                                     */
/* ------------------------------------------------------------------ */

function props_() {
  return PropertiesService.getScriptProperties();
}

function hostEmail_() {
  return (props_().getProperty('HOST_EMAIL') || HOST_EMAIL_DEFAULT).toLowerCase();
}

function me_() {
  return String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
}

function whoAmI() {
  var me = me_();
  var ok = me === hostEmail_();
  console.log(ok ? 'Running as ' + me + ', the host account. Good.' : 'Running as ' + (me || 'an unknown account') + ', but events and folders should belong to ' + hostEmail_() + '. Sign in as that account and run it again.');
  return me;
}

function loadRawCohorts_() {
  var all = [];
  var json = props_().getProperty('COHORTS_JSON');
  if (json) all = all.concat(JSON.parse(json));
  var sheetId = props_().getProperty('COHORT_SHEET_ID');
  if (sheetId) {
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Cohorts');
    if (!sheet) throw new Error('The sheet has no tab named "Cohorts".');
    var values = sheet.getDataRange().getValues();
    var headers = values.shift();
    values.forEach(function (row) {
      if (row.join('').trim()) all.push(rowToCohort(headers, row));
    });
  }
  return all;
}

function getCohort_(idOrObject) {
  // Run from the editor's Run button, a function gets no argument (or an
  // event object), so fall back to the ACTIVE_COHORT Script Property.
  if (!idOrObject || (typeof idOrObject === 'object' && !idOrObject.id)) {
    idOrObject = props_().getProperty('ACTIVE_COHORT');
    if (!idOrObject) throw new Error('Say which cohort: pass its id, or set the Script Property ACTIVE_COHORT.');
  }
  var raw = idOrObject;
  if (typeof idOrObject === 'string') {
    raw = loadRawCohorts_().filter(function (r) { return String(r.id).trim() === idOrObject; })[0];
    if (!raw) throw new Error('No cohort "' + idOrObject + '" in COHORTS_JSON or the Cohorts sheet.');
  }
  var result = normalizeCohort(raw);
  if (result.errors.length) throw new Error('The cohort definition has problems: ' + result.errors.join('; ') + '.');
  return result.cohort;
}

function saved_(id) {
  var s = props_().getProperty('cohort:' + id);
  return s ? JSON.parse(s) : {};
}

function save_(id, patch) {
  var next = Object.assign(saved_(id), patch);
  props_().setProperty('cohort:' + id, JSON.stringify(next));
  return next;
}

function previewCohort(idOrObject) {
  var c = getCohort_(idOrObject);
  var lines = [
    'Cohort ' + c.id + ': ' + c.title,
    'First session ' + c.start + ' to ' + c.end + ' (' + c.timeZone + '), every ' + c.weekday + ', ' + c.sessions + ' sessions.',
    'Guests (' + guestList(c).length + '): ' + guestList(c).join(', '),
    'Session page: ' + c.sessionUrl,
    saved_(c.id).eventId ? 'An event already exists; setupCohort would update it.' : 'setupCohort would create a new event with a Meet link.',
    saved_(c.id).folderId ? 'A folder already exists; setupCohort would sync its sharing.' : 'setupCohort would create a recordings folder and share it.',
    c.groups.length ? 'Group rooms (' + c.groups.length + ', ' + (useMeetApi_() ? 'as Meet spaces through the Meet REST API' : 'as Calendar events') + '): ' + c.groups.map(function (g) { var made = useMeetApi_() ? saved_(c.id).groupSpaces : saved_(c.id).groupEvents; return g.name + (made && made[g.key] ? ' (exists)' : ' (would be made)'); }).join(', ') : 'No groups, so no group rooms.',
  ];
  console.log(lines.join('\n'));
  return lines.join('\n');
}

function ensureFolder_(c) {
  var s = saved_(c.id);
  if (s.folderId) {
    try {
      var existing = DriveApp.getFolderById(s.folderId);
      if (!existing.isTrashed()) return existing;
    } catch (e) {
      // Gone or unreachable: make a new one below and say so in the check.
    }
  }
  var parentId = props_().getProperty('RECORDINGS_PARENT_FOLDER_ID');
  var parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder();
  var folder = parent.createFolder('Recordings, ' + c.title);
  folder.setDescription('Session recordings for ' + c.title + ' (' + c.id + '). Shared with cohort members only.');
  save_(c.id, { folderId: folder.getId() });
  return folder;
}

function listPermissions_(fileId) {
  var res = Drive.Permissions.list(fileId, { fields: 'permissions(id,emailAddress,role,type)', supportsAllDrives: true });
  return (res.permissions || []).map(function (p) {
    return { id: p.id, email: (p.emailAddress || '').toLowerCase(), role: p.role, type: p.type };
  });
}

function syncFolderSharing_(c, folderId) {
  var problems = [];
  var have = listPermissions_(folderId);
  var want = c.members.concat(c.teachers);
  var diff = diffSharing(want, have, [hostEmail_()]);
  diff.add.forEach(function (email) {
    var role = c.teachers.indexOf(email) >= 0 ? 'writer' : 'reader';
    try {
      // No Drive email: the Calendar invite already carries the folder link.
      Drive.Permissions.create({ role: role, type: 'user', emailAddress: email }, folderId, { sendNotificationEmail: false, supportsAllDrives: true });
    } catch (e) {
      problems.push('Could not share with ' + email + ' (' + e.message + '). This usually means the address has no Google account yet.');
    }
  });
  diff.remove.forEach(function (p) {
    Drive.Permissions.remove(folderId, p.id, { supportsAllDrives: true });
  });
  return problems;
}

function waitForMeet_(eventId) {
  for (var i = 0; i < 10; i++) {
    var e = Calendar.Events.get('primary', eventId);
    var status = e.conferenceData && e.conferenceData.createRequest && e.conferenceData.createRequest.status && e.conferenceData.createRequest.status.statusCode;
    if (!status || status === 'success' || status === 'failure') return e;
    Utilities.sleep(1500);
  }
  return Calendar.Events.get('primary', eventId);
}

function setupCohort(idOrObject) {
  var me = me_();
  if (me !== hostEmail_()) throw new Error('This is running as ' + me + '. Run it as ' + hostEmail_() + ' so the events and folders belong to the host account.');
  var c = getCohort_(idOrObject);
  var folder = ensureFolder_(c);
  var resource = buildEventResource(c, folder.getUrl());
  var s = saved_(c.id);
  var event = null;

  if (s.eventId) {
    try {
      event = Calendar.Events.get('primary', s.eventId);
      if (event.status === 'cancelled') event = null;
    } catch (e) {
      event = null;
    }
  }

  if (event) {
    event = Calendar.Events.patch(resource, 'primary', event.id, { sendUpdates: 'all', conferenceDataVersion: 1 });
  } else {
    resource.conferenceData = {
      createRequest: {
        requestId: 'hs-' + c.id + '-' + new Date().getTime(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
    event = Calendar.Events.insert(resource, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
    save_(c.id, { eventId: event.id });
  }
  var meetUrl = meetLinkOf(waitForMeet_(event.id));

  var viaApi = useMeetApi_();
  var rooms = viaApi ? ensureGroupSpaces_(c) : ensureGroupRooms_(c);
  if (c.groups.length) console.log(viaApi ? spaceRoomLines(c, rooms) : groupRoomLines(c, rooms));
  // Kept so processSetupRequests can hand the links back to the hub.
  save_(c.id, { lastLinks: { meetUrl: meetUrl, rooms: roomsForHub(rooms, viaApi) } });

  var problems = syncFolderSharing_(c, folder.getId());
  if (problems.length) console.log('Sharing problems:\n' + problems.join('\n'));
  console.log('Paste this line into the recorder extension settings:\n' + extensionLine(c, folder.getId()));
  return checkCohort(c);
}

// One recurring event per group, each with its own Meet link, made once
// and updated after that (saved by the group's key, so renaming a group
// keeps its room). Returns { key: meet link }.
function ensureGroupRooms_(c) {
  var saved = saved_(c.id).groupEvents || {};
  var rooms = {};
  c.groups.forEach(function (g) {
    var resource = buildGroupRoomResource(c, g);
    var event = null;
    if (saved[g.key]) {
      try {
        event = Calendar.Events.get('primary', saved[g.key]);
        if (event.status === 'cancelled') event = null;
      } catch (e) { event = null; }
    }
    if (event) {
      event = Calendar.Events.patch(resource, 'primary', event.id, { sendUpdates: 'none', conferenceDataVersion: 1 });
    } else {
      resource.conferenceData = { createRequest: { requestId: 'hs-' + c.id + '-' + g.key + '-' + new Date().getTime(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      event = Calendar.Events.insert(resource, 'primary', { conferenceDataVersion: 1, sendUpdates: 'none' });
      saved[g.key] = event.id;
      save_(c.id, { groupEvents: saved });
    }
    rooms[g.key] = meetLinkOf(waitForMeet_(event.id));
  });
  return rooms;
}

function useMeetApi_() {
  return roomsViaMeetApi(props_().getProperty('ROOMS_VIA_MEET_API'));
}

// One call to the Meet REST API as this account. Throws with Google's own
// message when it says no.
function meetApi_(method, path, body) {
  var res = UrlFetchApp.fetch('https://meet.googleapis.com/v2/' + path, {
    method: method,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  var data = text ? JSON.parse(text) : {};
  if (code >= 300) throw new Error('Meet API ' + method.toUpperCase() + ' ' + path + ' said ' + code + ': ' + ((data.error && data.error.message) || text));
  return data;
}

function listSpaceMembers_(spaceName) {
  var all = [], token = '';
  do {
    var page = meetApi_('get', spaceName + '/members?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    all = all.concat(page.members || []);
    token = page.nextPageToken || '';
  } while (token);
  return all;
}

// One Meet space per group, made once (saved by the group's key, so
// renaming a group keeps its room), kept TRUSTED, with its members set to
// the group and its teachers each time setup runs. Returns
// { key: { name, uri } }.
function ensureGroupSpaces_(c) {
  var saved = saved_(c.id).groupSpaces || {};
  var rooms = {};
  c.groups.forEach(function (g) {
    var space = null;
    if (saved[g.key]) {
      try { space = meetApi_('get', saved[g.key]); } catch (e) { space = null; }
    }
    if (!space) {
      space = meetApi_('post', 'spaces', spaceRequestBody());
      saved[g.key] = space.name;
      save_(c.id, { groupSpaces: saved });
    } else if (!space.config || space.config.accessType !== 'TRUSTED') {
      space = meetApi_('patch', space.name + '?updateMask=config.accessType', spaceRequestBody());
    }
    var diff = diffSpaceMembers(wantedSpaceMembers(c, g, hostEmail_()), listSpaceMembers_(space.name));
    diff.add.forEach(function (w) {
      try { meetApi_('post', space.name + '/members', memberBody(w)); }
      catch (e) { console.log('Could not add ' + w.email + ' to ' + g.name + '\'s room: ' + e.message); }
    });
    diff.change.forEach(function (m) { meetApi_('patch', m.name + '?updateMask=role', { role: m.role }); });
    diff.remove.forEach(function (name) { meetApi_('delete', name); });
    rooms[g.key] = { name: space.name, uri: space.meetingUri };
  });
  return rooms;
}

function checkCohort(idOrObject) {
  var c = getCohort_(idOrObject);
  var s = saved_(c.id);
  var lines = [];
  var problems = 0;
  function ok(text) { lines.push('  ok       ' + text); }
  function bad(text) { lines.push('  PROBLEM  ' + text); problems++; }
  function note(text) { lines.push('           ' + text); }

  var me = me_();
  if (me === hostEmail_()) ok('Running as ' + me + '.');
  else bad('Running as ' + me + ', not ' + hostEmail_() + '. The event and folder may belong to the wrong account.');

  // The event
  var event = null;
  if (!s.eventId) {
    bad('No event recorded for this cohort. Run setupCohort("' + c.id + '").');
  } else {
    try {
      event = Calendar.Events.get('primary', s.eventId);
    } catch (e) {
      bad('The saved event could not be found (' + e.message + '). Run setupCohort again to make a new one.');
    }
  }
  if (event) {
    if (event.status === 'cancelled') bad('The event was cancelled.');
    else ok('The event exists: ' + event.htmlLink);
    var rule = (event.recurrence || []).join(' ');
    if (rule.indexOf('COUNT=' + c.sessions) >= 0 && rule.indexOf('BYDAY=' + c.weekday) >= 0) ok('It repeats every ' + c.weekday + ' for ' + c.sessions + ' sessions.');
    else bad('The repeat rule is "' + rule + '", but the cohort asks for ' + recurrenceRule(c) + '.');
    var start = event.start || {};
    if (String(start.dateTime || '').indexOf(c.start) === 0 && start.timeZone === c.timeZone) ok('The first session starts ' + c.start + ' ' + c.timeZone + '.');
    else bad('The first session starts ' + start.dateTime + ' ' + start.timeZone + ', but the cohort says ' + c.start + ' ' + c.timeZone + '.');
    if ((event.description || '').indexOf(c.sessionUrl) >= 0) ok('The description links the session page.');
    else bad('The description does not contain the session page link ' + c.sessionUrl + '.');

    // The Meet link
    var conf = event.conferenceData || {};
    var key = conf.conferenceSolution && conf.conferenceSolution.key && conf.conferenceSolution.key.type;
    var video = (conf.entryPoints || []).filter(function (p) { return p.entryPointType === 'video'; })[0];
    var status = conf.createRequest && conf.createRequest.status && conf.createRequest.status.statusCode;
    if (key === 'hangoutsMeet' && video) ok('It has a Meet link: ' + video.uri);
    else if (status === 'pending') bad('Google is still making the Meet link. Run checkCohort again in a minute.');
    else bad('There is no Meet link on the event (conference status: ' + (status || 'none') + ').');

    // The guests
    var attendees = (event.attendees || []).filter(function (a) { return !a.organizer && !a.resource; });
    var have = attendees.map(function (a) { return String(a.email).toLowerCase(); });
    var want = guestList(c);
    var missing = want.filter(function (e) { return have.indexOf(e) < 0; });
    var extra = have.filter(function (e) { return want.indexOf(e) < 0; });
    if (!missing.length && !extra.length) ok('All ' + want.length + ' guests are invited, and no one else.');
    if (missing.length) bad('Not invited yet: ' + missing.join(', ') + '. Run setupCohort to add them.');
    if (extra.length) bad('Invited but not in the cohort: ' + extra.join(', ') + '.');
    var counts = {};
    attendees.forEach(function (a) { counts[a.responseStatus] = (counts[a.responseStatus] || 0) + 1; });
    note('Replies so far: ' + Object.keys(counts).map(function (k) { return counts[k] + ' ' + k; }).join(', '));
    if (event.guestsCanSeeOtherGuests !== false) bad('Guests can see one another\'s email addresses on the invite.');
  }

  // The group rooms, as Meet spaces when ROOMS_VIA_MEET_API is on
  if (useMeetApi_()) {
    var groupSpaces = s.groupSpaces || {};
    var spaceRooms = {};
    c.groups.forEach(function (g) {
      if (!groupSpaces[g.key]) { bad('No Meet space made yet for ' + g.name + '. Run setupCohort("' + c.id + '").'); return; }
      var sp = null;
      try { sp = meetApi_('get', groupSpaces[g.key]); } catch (e) { bad('The room for ' + g.name + ' could not be read (' + e.message + ').'); return; }
      spaceRooms[g.key] = { name: sp.name, uri: sp.meetingUri };
      if (sp.config && sp.config.accessType === 'TRUSTED') ok(g.name + ' has its own room, TRUSTED: ' + sp.meetingUri);
      else bad('The room for ' + g.name + ' is ' + ((sp.config && sp.config.accessType) || 'not set') + ', not TRUSTED, so the group may have to knock. Run setupCohort.');
      var d;
      try { d = diffSpaceMembers(wantedSpaceMembers(c, g, hostEmail_()), listSpaceMembers_(sp.name)); }
      catch (e) { bad('The members of ' + g.name + '\'s room could not be read (' + e.message + ').'); return; }
      if (!d.add.length && !d.remove.length && !d.change.length) ok('Its members are the group, with the teachers as co-hosts.');
      if (d.add.length) bad('Not members of ' + g.name + '\'s room yet: ' + d.add.map(function (w) { return w.email; }).join(', ') + '. Run setupCohort.');
      if (d.remove.length) bad(d.remove.length + ' member(s) of ' + g.name + '\'s room are not in the group. Run setupCohort.');
      if (d.change.length) bad(d.change.length + ' member(s) of ' + g.name + '\'s room have the wrong role. Run setupCohort.');
    });
    if (c.groups.length) note(spaceRoomLines(c, spaceRooms).split('\n').join('\n           '));
  }

  // The group rooms, as Calendar events otherwise
  var groupEvents = s.groupEvents || {};
  var rooms = {};
  if (!useMeetApi_()) c.groups.forEach(function (g) {
    if (!groupEvents[g.key]) { bad('No room made yet for ' + g.name + '. Run setupCohort("' + c.id + '").'); return; }
    var ge = null;
    try { ge = Calendar.Events.get('primary', groupEvents[g.key]); } catch (e) { bad('The room for ' + g.name + ' could not be found (' + e.message + ').'); return; }
    var link = meetLinkOf(ge);
    if (ge.status === 'cancelled') bad('The room for ' + g.name + ' was cancelled.');
    else if (link) { ok(g.name + ' has its own room: ' + link); rooms[g.key] = link; }
    else bad('The room for ' + g.name + ' has no Meet link yet.');
  });
  if (c.groups.length && !useMeetApi_()) note(groupRoomLines(c, rooms).split('\n').join('\n           '));

  // The folder
  var folder = null;
  if (!s.folderId) {
    bad('No recordings folder recorded for this cohort. Run setupCohort("' + c.id + '").');
  } else {
    try {
      folder = DriveApp.getFolderById(s.folderId);
    } catch (e) {
      bad('The recordings folder could not be opened (' + e.message + ').');
    }
  }
  if (folder) {
    if (folder.isTrashed()) bad('The recordings folder is in the trash.');
    else ok('The recordings folder exists: ' + folder.getUrl());
    var owner = folder.getOwner() ? folder.getOwner().getEmail().toLowerCase() : '';
    if (owner === hostEmail_()) ok('It belongs to ' + owner + '.');
    else bad('It belongs to ' + (owner || 'no one we can see') + ', not ' + hostEmail_() + '.');
    var perms = listPermissions_(s.folderId);
    var diff = diffSharing(c.members.concat(c.teachers), perms, [hostEmail_()]);
    if (!diff.add.length && !diff.remove.length) ok('It is shared with every member, and no one else.');
    if (diff.add.length) bad('Not shared with: ' + diff.add.join(', ') + '. Run setupCohort, and if it still fails, that address probably has no Google account.');
    if (diff.remove.length) bad('Shared with people outside the cohort: ' + diff.remove.map(function (p) { return p.email; }).join(', ') + '.');
    if (diff.openLinks.length) bad('Anyone with the link (or the whole domain) can open it. Turn link sharing off so only the cohort can see recordings.');
    var members = perms.filter(function (p) { return c.members.indexOf(p.email) >= 0; });
    var notReader = members.filter(function (p) { return p.role !== 'reader'; });
    if (notReader.length) note('Members with more than view access: ' + notReader.map(function (p) { return p.email + ' (' + p.role + ')'; }).join(', '));

    var videos = 0;
    var files = folder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      if (/^video\//.test(f.getMimeType())) videos++;
    }
    note(videos + ' recording' + (videos === 1 ? '' : 's') + ' in the folder so far.');

    var strays = findStrays_(c.id, s.folderId);
    if (strays.length) bad(strays.length + ' recording(s) for this cohort are outside the folder, so members cannot see them. Run fileStrayRecordings("' + c.id + '").');
    else ok('No recordings for this cohort are sitting outside the folder.');
  }

  note('Not checked here: whether recording works. Do the test call in the README before the first session.');
  var header = problems ? 'Check for ' + c.id + ': ' + problems + ' problem(s).' : 'Check for ' + c.id + ': everything looks right.';
  var report = header + '\n' + lines.join('\n');
  console.log(report);
  return report;
}

function findStrays_(cohortId, folderId) {
  var q = "properties has { key='hsCohort' and value='" + cohortId.replace(/'/g, '') + "' } and trashed = false and not '" + folderId + "' in parents";
  var res = Drive.Files.list({ q: q, fields: 'files(id,name)', pageSize: 100 });
  return res.files || [];
}

// The recorder extension uses the drive.file scope, so it may not be able
// to put a file into a folder this script made. When that happens it
// uploads to the top of My Drive and tags the file with hsCohort; this
// moves those files where the cohort can see them.
function fileStrayRecordings(idOrObject) {
  var c = getCohort_(idOrObject);
  var s = saved_(c.id);
  if (!s.folderId) throw new Error('No recordings folder for ' + c.id + ' yet. Run setupCohort first.');
  var folder = DriveApp.getFolderById(s.folderId);
  var strays = findStrays_(c.id, s.folderId);
  strays.forEach(function (f) { DriveApp.getFileById(f.id).moveTo(folder); });
  var msg = strays.length ? 'Moved ' + strays.length + ' recording(s) into ' + folder.getName() + ': ' + strays.map(function (f) { return f.name; }).join(', ') : 'Nothing to move.';
  console.log(msg);
  return msg;
}

// ---- "Something is waiting for you" emails (G4) ----
//
// Once a day, for people who asked on /account/, an email from this
// account saying a teacher wrote them a note or someone answered what
// they shared, with a link back. It never carries the words, which stay
// on the hub (research/notes/reach-notes.md). Off unless the Script
// Property NOTICES_ON is "true"; NOTICES_URL and NOTICES_SECRET say
// where to ask and prove it is us. Written by Claude, awaiting Ben's review.

function noticesOn(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function plural_(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

// The email for one person, from the counts the hub sent. Null when there
// is nothing to say or no sensible address.
function noticeEmail(person) {
  var notes = Math.max(0, Number(person && person.notes) || 0);
  var answers = Math.max(0, Number(person && person.answers) || 0);
  var to = String((person && person.email) || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || (!notes && !answers)) return null;
  var parts = [];
  if (notes) parts.push(notes === 1 ? 'a teacher wrote you a note' : 'your teachers wrote you ' + plural_(notes, 'note', 'notes'));
  if (answers) parts.push(answers === 1 ? 'someone answered what you shared' : plural_(answers, 'answer', 'answers') + ' came in on what you shared');
  var what = parts.join(', and ');
  return {
    to: to,
    subject: notes ? 'A note is waiting for you on Human Shaped' : 'Someone answered what you shared on Human Shaped',
    body: 'Hello,\n\nSince we last wrote, ' + what + '. The words themselves are on the site, so they stay where you and your cohort keep your work:\n\n' +
      'https://humanshaped.org/account/\n\n' +
      'You asked for these emails on that page, and you can turn them off there at any time.\n\nHuman Shaped\n'
  };
}

function askNotices_(action, extra) {
  var url = props_().getProperty('NOTICES_URL');
  var secret = props_().getProperty('NOTICES_SECRET');
  if (!url || !secret) throw new Error('Set NOTICES_URL and NOTICES_SECRET in Script Properties first.');
  var payload = { action: action };
  Object.keys(extra || {}).forEach(function (k) { payload[k] = extra[k]; });
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
    headers: { 'x-notices-secret': secret }, muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200) throw new Error('The hub said ' + res.getResponseCode() + ': ' + (body.message || 'no reason'));
  return body;
}

// Run by a daily time-driven trigger (see the README). Sends at most one
// email per person per run, and tells the hub who was sent one, so the
// same note is never sent twice.
function sendNotices() {
  if (!noticesOn(props_().getProperty('NOTICES_ON'))) {
    console.log('Notices are off. Set NOTICES_ON to true in Script Properties to send them.');
    return 'off';
  }
  var people = askNotices_('digest').people || [];
  var sent = [];
  people.forEach(function (p) {
    var mail = noticeEmail(p);
    if (!mail) return;
    MailApp.sendEmail({ to: mail.to, subject: mail.subject, body: mail.body, name: 'Human Shaped' });
    sent.push(p.user_id);
  });
  if (sent.length) askNotices_('sent', { ids: sent });
  var msg = 'Sent ' + sent.length + ' notice(s). Mail left today: ' + MailApp.getRemainingDailyQuota() + '.';
  console.log(msg);
  return msg;
}

// ---------------------------------------------------------------------
// Requests from /teach/ (migration 20261004000000). A teacher who is not
// Ben asks on /teach/ for their cohort's calls, and this account makes
// them: processSetupRequests, run by a time-driven trigger (see the
// README), takes the waiting requests through the setup-queue function,
// runs setupCohort on each one's setup (the same shape /teach/ copies),
// and reports the weekly Meet link and each group's room back, which the
// hub puts on the sessions and groups. Off unless the Script Property
// SETUP_QUEUE_ON is "true"; SETUP_QUEUE_URL and SETUP_QUEUE_SECRET say
// where to ask and prove it is us. Written by Claude, awaiting Ben's review.

function setupQueueOn(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

// The group rooms setup made, in the shape the hub reads:
// { key: { url, space } }, where a Calendar room has no space.
function roomsForHub(rooms, viaApi) {
  var out = {};
  Object.keys(rooms || {}).forEach(function (key) {
    var r = rooms[key];
    if (viaApi) { if (r && r.uri) out[key] = { url: r.uri, space: r.name || null }; }
    else if (r) out[key] = { url: r, space: null };
  });
  return out;
}

// What the teacher reads on /teach/ about how it went: the check's first
// line, which says how many problems it found.
function setupSummary(report) {
  var first = String(report || '').split('\n')[0].trim();
  return (first || 'Set up.').slice(0, 300);
}

function askSetupQueue_(action, extra) {
  var url = props_().getProperty('SETUP_QUEUE_URL');
  var secret = props_().getProperty('SETUP_QUEUE_SECRET');
  if (!url || !secret) throw new Error('Set SETUP_QUEUE_URL and SETUP_QUEUE_SECRET in Script Properties first.');
  var payload = { action: action };
  Object.keys(extra || {}).forEach(function (k) { payload[k] = extra[k]; });
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload),
    headers: { 'x-setup-secret': secret }, muteHttpExceptions: true
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200) throw new Error('The hub said ' + res.getResponseCode() + ': ' + (body.message || 'no reason'));
  return body;
}

function processSetupRequests() {
  if (!setupQueueOn(props_().getProperty('SETUP_QUEUE_ON'))) {
    console.log('The setup queue is off. Set SETUP_QUEUE_ON to true in Script Properties to take requests.');
    return 'off';
  }
  var requests = askSetupQueue_('claim').requests || [];
  var lines = [];
  requests.forEach(function (r) {
    try {
      var report = setupCohort(r.setup);
      var links = saved_(r.setup.id).lastLinks || {};
      askSetupQueue_('finish', { id: r.id, ok: true, detail: setupSummary(report), meet_url: links.meetUrl || null, rooms: links.rooms || null });
      lines.push(r.setup.id + ': done');
    } catch (e) {
      askSetupQueue_('finish', { id: r.id, ok: false, detail: String(e.message || e).slice(0, 900) });
      lines.push(r.setup.id + ': failed, ' + e.message);
    }
  });
  var msg = requests.length ? lines.join('\n') : 'No requests are waiting.';
  console.log(msg);
  return msg;
}
