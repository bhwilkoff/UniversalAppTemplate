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
 * group (a recurring event with the group invited) and prints the links
 * to paste into /teach/.
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
    c.groups.length ? 'Group rooms (' + c.groups.length + '): ' + c.groups.map(function (g) { return g.name + (saved_(c.id).groupEvents && saved_(c.id).groupEvents[g.key] ? ' (exists)' : ' (would be made)'); }).join(', ') : 'No groups, so no group rooms.',
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
  waitForMeet_(event.id);

  var rooms = ensureGroupRooms_(c);
  if (c.groups.length) console.log(groupRoomLines(c, rooms));

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

  // The group rooms
  var groupEvents = s.groupEvents || {};
  var rooms = {};
  c.groups.forEach(function (g) {
    if (!groupEvents[g.key]) { bad('No room made yet for ' + g.name + '. Run setupCohort("' + c.id + '").'); return; }
    var ge = null;
    try { ge = Calendar.Events.get('primary', groupEvents[g.key]); } catch (e) { bad('The room for ' + g.name + ' could not be found (' + e.message + ').'); return; }
    var link = meetLinkOf(ge);
    if (ge.status === 'cancelled') bad('The room for ' + g.name + ' was cancelled.');
    else if (link) { ok(g.name + ' has its own room: ' + link); rooms[g.key] = link; }
    else bad('The room for ' + g.name + ' has no Meet link yet.');
  });
  if (c.groups.length) note(groupRoomLines(c, rooms).split('\n').join('\n           '));

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
