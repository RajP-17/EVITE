/**
 * =============================================================================
 * Parsattom's 75th — RSVP backend (Google Apps Script)
 * =============================================================================
 *
 * This turns a plain Google Sheet into the RSVP database for the invite site.
 * Free, no server, no account for guests, and you can read the responses in a
 * spreadsheet like any other.
 *
 * ------------------------------------ SETUP ---------------------------------
 *  1. Go to https://sheets.new  → name it "Parsattom 75th RSVPs".
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

/** Passphrase for reading RSVPs back (host dashboard + CSV). CHANGE THIS. */
var ADMIN_KEY = 'change-me-before-you-deploy';

/** Tab the RSVPs are written to. Created automatically. */
var SHEET_NAME = 'RSVPs';

var HEADERS = [
  'Timestamp',
  'Name',
  'Attending',
  'Adults',
  'Kids',
  'Total',
  'Email',
  'Phone',
  'Guest names',
  'Dietary',
  'Dietary notes',
  'Message for Parsattom',
  'Notes for hosts',
  'Superseded'
];


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

    var adults = attending === 'Yes' ? toInt(payload.adults, 1) : 0;
    var kids   = attending === 'Yes' ? toInt(payload.kids, 0)   : 0;

    var sheet = getSheet();

    // A repeat RSVP under the same name replaces the earlier one: we mark the
    // old rows "superseded" rather than deleting, so nothing is ever lost.
    markPreviousAsSuperseded(sheet, name);

    sheet.appendRow([
      new Date(),
      name,
      attending,
      adults,
      kids,
      adults + kids,
      String(payload.email || '').trim(),
      String(payload.phone || '').trim(),
      String(payload.guestNames || '').trim(),
      Array.isArray(payload.dietary) ? payload.dietary.join(', ') : String(payload.dietary || ''),
      String(payload.dietaryNotes || '').trim(),
      String(payload.message || '').trim(),
      String(payload.notes || '').trim(),
      ''
    ]);

    notifyHost(name, attending, adults + kids, payload);

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
    if (String(r[13]).trim() !== '') continue;   // superseded

    rows.push({
      timestamp:    r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name:         String(r[1]),
      attending:    String(r[2]),
      adults:       Number(r[3]) || 0,
      kids:         Number(r[4]) || 0,
      total:        Number(r[5]) || 0,
      email:        String(r[6]),
      phone:        String(r[7]),
      guestNames:   String(r[8]),
      dietary:      String(r[9]),
      dietaryNotes: String(r[10]),
      message:      String(r[11]),
      notes:        String(r[12])
    });
  }

  return json({ ok: true, count: rows.length, rsvps: rows });
}


/* ================================ HELPERS ================================= */

function setup() {
  getSheet();
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
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#f3ead2');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 190);
    sheet.setColumnWidth(12, 320);
  }

  return sheet;
}

/** Mark earlier rows for this person as superseded so counts stay honest. */
function markPreviousAsSuperseded(sheet, name) {
  var last = sheet.getLastRow();
  if (last < 2) return;

  var names = sheet.getRange(2, 2, last - 1, 1).getValues();
  var flags = sheet.getRange(2, 14, last - 1, 1).getValues();
  var target = name.toLowerCase();
  var changed = false;

  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === target && !flags[i][0]) {
      flags[i][0] = 'replaced';
      changed = true;
    }
  }

  if (changed) sheet.getRange(2, 14, last - 1, 1).setValues(flags);
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
      'Headcount: ' + total + '\n' +
      'Email: ' + (payload.email || '—') + '\n' +
      'Phone: ' + (payload.phone || '—') + '\n' +
      'With: ' + (payload.guestNames || '—') + '\n' +
      'Dietary: ' + (Array.isArray(payload.dietary) ? payload.dietary.join(', ') : (payload.dietary || '—')) + '\n' +
      'Dietary notes: ' + (payload.dietaryNotes || '—') + '\n\n' +
      'Message for Parsattom:\n' + (payload.message || '—') + '\n\n' +
      'Notes for hosts:\n' + (payload.notes || '—') + '\n';

    MailApp.sendEmail(to, subject, body);
  } catch (err) {
    // Never let a mail failure lose an RSVP.
  }
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
