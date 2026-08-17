/**
 * =============================================================================
 * Parsottam Dada's 75th: RSVP backend (Google Apps Script)
 * =============================================================================
 *
 * This turns a plain Google Sheet into the RSVP database for the invite site.
 * Free, no server, no account for guests, and you can read the responses in a
 * spreadsheet like any other.
 *
 * ------------------------------------ SETUP ---------------------------------
 *  1. Go to https://sheets.new  → name it "Parsottam Dada 75th RSVPs".
 *  2. Extensions → Apps Script. Delete whatever is in Code.gs.
 *  3. Paste this entire file in.
 *  4. Change ADMIN_KEY below to a passphrase of your own.
 *  5. Save, then Run ▸ setup  (approve the permissions prompt the first time).
 *  6. Deploy ▸ New deployment ▸ type "Web app".
 *        Execute as:        Me
 *        Who has access:    Anyone            <-- must be "Anyone"
 *     Deploy, then copy the /exec URL.
 *  7. In assets/js/config.js set:
 *        rsvp: { mode: "appsscript", endpoint: "<paste the /exec URL>" }
 *
 *  Re-deploying after an edit: Deploy ▸ Manage deployments ▸ ✏️ ▸ Version:
 *  "New version" ▸ Deploy. The URL stays the same.
 * ========================================================================== */

/** Passphrase for reading RSVPs back (host dashboard + CSV). CHANGE THIS.
 *  Set the real value in the Apps Script editor only. Keep the placeholder
 *  here: this file gets published with the site, so a real passphrase in it
 *  would be readable by anyone. */
var ADMIN_KEY = 'change-me-before-you-deploy';

/** Tab the RSVPs are written to. Created automatically. */
var SHEET_NAME = 'RSVPs';

var HEADERS = [
  'Timestamp',
  'Name',
  'Attending',
  'People',
  'Email',
  'Phone',
  'Message for Parsottam Dada',
  'Notes for hosts',
  'Reminder sent',
  'Superseded'
];

/** 1-based columns, derived so they stay in step with HEADERS above. */
var REMINDER_COL   = HEADERS.indexOf('Reminder sent') + 1;
var SUPERSEDED_COL = HEADERS.indexOf('Superseded') + 1;

/** Details the reminder email quotes back. Keep in step with config.js. */
var EVENT = {
  honoree:    'Parsottam Dada',
  occasion:   '75th Birthday',
  dateLine:   'Saturday, September 19',
  arrival:    '5:30 PM',
  walksInAt:  '6:00 PM',
  venue:      'The Clubhouse',
  address:    '1519 Scenic Club Drive, Cary, NC 27519',
  dressCode:  'Indian Bandhini & Kurta Pyjama',
  contacts:   'Raj 919-523-4107 or Ravi 984-232-9943'
};


/* ============================ WRITE (guest RSVP) ========================== */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, error: 'busy' });
  }

  try {
    var payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (parseErr) {
      // Fall back to normal form-encoded parameters.
      payload = (e && e.parameter) || {};
    }

    // Honeypot: real people leave this empty. Bots fill it in.
    if (String(payload.website || '').trim() !== '') {
      return json({ ok: true, ignored: true });
    }

    var name = String(payload.name || '').trim();
    if (!name) return json({ ok: false, error: 'Name is required.' });

    var attending = String(payload.attending || '').trim().toLowerCase() === 'yes'
      ? 'Yes' : 'No';

    var guests = attending === 'Yes' ? toInt(payload.guests, 1) : 0;

    var sheet = getSheet();

    // A repeat RSVP under the same name replaces the earlier one: we mark the
    // old rows "superseded" rather than deleting, so nothing is ever lost.
    markPreviousAsSuperseded(sheet, name);

    sheet.appendRow([
      new Date(),
      name,
      attending,
      guests,
      String(payload.email || '').trim(),
      String(payload.phone || '').trim(),
      String(payload.message || '').trim(),
      String(payload.notes || '').trim(),
      '',                                  // Reminder sent
      ''                                   // Superseded
    ]);

    notifyHost(name, attending, guests, payload);

    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}


/* ======================= READ (host dashboard / CSV) ====================== */

function doGet(e) {
  var params = (e && e.parameter) || {};

  if (String(params.key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Wrong passphrase.' });
  }

  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();
  var rows = [];

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[1]) continue;                 // blank row
    if (String(r[SUPERSEDED_COL - 1]).trim() !== '') continue;   // superseded

    rows.push({
      timestamp:    r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name:         String(r[1]),
      attending:    String(r[2]),
      total:        Number(r[3]) || 0,
      email:        String(r[4]),
      phone:        String(r[5]),
      message:      String(r[6]),
      notes:        String(r[7])
    });
  }

  return json({ ok: true, count: rows.length, rsvps: rows });
}


/* ================================ HELPERS ================================= */

function setup() {
  var sheet = getSheet();
  writeHeaders(sheet);          // safe to re-run: only the header row is touched
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Sheet is ready. Now: Deploy ▸ New deployment ▸ Web app.', 'RSVP setup', 8);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    writeHeaders(sheet);
  }

  return sheet;
}

/** Write (or rewrite) the header row. Never touches the RSVPs below it. */
function writeHeaders(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
       .setValues([HEADERS])
       .setFontWeight('bold')
       .setBackground('#f3ead2');

  // Clear any leftover headings from an older, wider layout.
  var extra = sheet.getMaxColumns() - HEADERS.length;
  if (extra > 0) {
    sheet.getRange(1, HEADERS.length + 1, 1, extra).clearContent().clearFormat();
  }
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);   // Timestamp
  sheet.setColumnWidth(2, 190);   // Name
  sheet.setColumnWidth(7, 320);   // Message for Parsottam Dada
}

/** Mark earlier rows for this person as superseded so counts stay honest. */
function markPreviousAsSuperseded(sheet, name) {
  var last = sheet.getLastRow();
  if (last < 2) return;

  var names = sheet.getRange(2, 2, last - 1, 1).getValues();
  var flags = sheet.getRange(2, SUPERSEDED_COL, last - 1, 1).getValues();
  var target = name.toLowerCase();
  var changed = false;

  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === target && !flags[i][0]) {
      flags[i][0] = 'replaced';
      changed = true;
    }
  }

  if (changed) sheet.getRange(2, SUPERSEDED_COL, last - 1, 1).setValues(flags);
}

/** Email the host on every RSVP. Comment out the body to switch this off. */
function notifyHost(name, attending, total, payload) {
  try {
    var to = Session.getEffectiveUser().getEmail();
    if (!to) return;

    var subject = (attending === 'Yes')
      ? '✓ ' + name + ' is coming (' + total + ')'
      : '✗ ' + name + ' can\'t make it';

    var body =
      name + ' just RSVP\'d.\n\n' +
      'Attending: ' + attending + '\n' +
      'People from their household: ' + total + '\n' +
      'Email: ' + (payload.email || '—') + '\n' +
      'Phone: ' + (payload.phone || '—') + '\n' +

      'Message for Parsottam Dada:\n' + (payload.message || '—') + '\n\n' +
      'Notes for hosts:\n' + (payload.notes || '—') + '\n';

    MailApp.sendEmail(to, subject, body);
  } catch (err) {
    // Never let a mail failure lose an RSVP.
  }
}

/* ========================== REMINDERS (to guests) ========================= */
/*
 *  previewReminders()  tells you who would get one, sends nothing.
 *  sendReminders()     emails every confirmed guest who left an address, once.
 *
 *  Each row is stamped in "Reminder sent" as it goes out, so running this
 *  twice will not mail anybody twice. To deliberately re-send, clear that
 *  cell for the rows you want.
 *
 *  To schedule it: Apps Script ▸ Triggers ▸ Add trigger ▸ sendReminders
 *  ▸ Time-driven ▸ Specific date and time. Pick a few days before the party.
 *  A personal Gmail account can mail about 100 recipients a day.
 * ------------------------------------------------------------------------ */

function previewReminders() {
  var targets = reminderTargets();
  var lines = targets.map(function (t) { return t.name + '  <' + t.email + '>'; });

  var msg = targets.length
    ? targets.length + ' reminder(s) would go to:\n\n' + lines.join('\n')
    : 'Nobody to remind yet. Guests need to be attending, have an email, ' +
      'and not have been reminded already.';

  Logger.log(msg);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      targets.length + ' to remind. See View ▸ Logs for the list.', 'Reminders', 8);
  } catch (err) { /* running headless from a trigger */ }
  return msg;
}

function sendReminders() {
  var sheet = getSheet();
  var targets = reminderTargets();
  if (!targets.length) return 'Nobody to remind.';

  var quota = MailApp.getRemainingDailyQuota();
  if (quota < targets.length) {
    throw new Error('Only ' + quota + ' emails left today but ' + targets.length +
                    ' to send. Run this again tomorrow for the rest.');
  }

  var subject = EVENT.honoree + '\'s ' + EVENT.occasion + ' is on ' + EVENT.dateLine;
  var sent = 0;

  targets.forEach(function (t) {
    MailApp.sendEmail(t.email, subject, reminderBody(t.name));
    sheet.getRange(t.row, REMINDER_COL).setValue(new Date());
    sent++;
  });

  var msg = 'Sent ' + sent + ' reminder(s).';
  Logger.log(msg);
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Reminders', 8);
  } catch (err) { /* running headless from a trigger */ }
  return msg;
}

/** Confirmed guests with an email who have not been reminded yet. */
function reminderTargets() {
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return [];

  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var out = [];

  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (String(r[SUPERSEDED_COL - 1]).trim() !== '') continue;   // replaced
    if (String(r[2]).trim() !== 'Yes') continue;                 // not coming
    if (String(r[REMINDER_COL - 1]).trim() !== '') continue;     // already sent

    var email = String(r[4]).trim();
    if (!email) continue;                                        // no address

    out.push({ row: i + 2, name: String(r[1]).trim(), email: email });
  }

  return out;
}

function reminderBody(name) {
  var first = name.split(' ')[0] || name;

  return 'Hi ' + first + ',\n\n' +
    'A quick reminder about ' + EVENT.honoree + '\'s ' + EVENT.occasion + '.\n\n' +
    'When:   ' + EVENT.dateLine + '. Please arrive by ' + EVENT.arrival + '.\n' +
    '        ' + EVENT.honoree + ' walks in at ' + EVENT.walksInAt + ', so everyone\n' +
    '        needs to be inside before then.\n' +
    'Where:  ' + EVENT.venue + ', ' + EVENT.address + '.\n' +
    '        Park in any open spot.\n' +
    'Wear:   ' + EVENT.dressCode + '. Any festive outfit is welcome.\n\n' +
    'It is still a surprise, so please don\'t mention it to him, don\'t post\n' +
    'about it, and don\'t tag the address anywhere until after the party.\n\n' +
    'If anything changes, text ' + EVENT.contacts + '.\n\n' +
    'See you there.\n';
}


function toInt(v, fallback) {
  var n = parseInt(v, 10);
  if (isNaN(n) || n < 0) return fallback;
  return Math.min(n, 50);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
