/* =============================================================================
 * rsvps.js: host dashboard
 *
 * Reads back from whatever config.js points at:
 *   mode "appsscript" → GET the Web App with ?key=<passphrase>
 *   mode "demo"       → read this browser's localStorage
 *   mode "formspree"  → not readable from here; we say so and link out
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.EVITE_CONFIG || {};
  var EV  = CFG.event || {};
  var RS  = CFG.rsvp || {};
  var DEMO_KEY = 'evite.demo.rsvps';
  var SESSION_KEY = 'evite.adminkey';

  var $  = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var rows = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mode() {
    var m = RS.mode || 'demo';
    if (m === 'appsscript' && !RS.endpoint) return 'demo';
    return m;
  }

  if (EV.honoreePossessive) {
    document.title = 'RSVPs for ' + EV.honoreePossessive + ' ' + (EV.occasion || '');
  }

  /* ------------------------------------------------------------ fetch -- */
  function load(key) {
    var m = mode();

    if (m === 'formspree') {
      return Promise.reject(new Error(
        'Formspree mode stores RSVPs on formspree.io. Open your dashboard there. ' +
        'Switch config.js to "appsscript" if you want this page to work.'));
    }

    if (m === 'demo') {
      var local = [];
      try { local = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) {}
      return Promise.resolve(local.map(function (r) {
        return {
          timestamp: r.submittedAt,
          name: r.name,
          attending: r.attending === 'yes' ? 'Yes' : 'No',
          total: r.guests || 0,
          email: r.email || '',
          phone: r.phone || '',
          guestNames: r.guestNames || '',
          dietary: (r.dietary || []).join(', '),
          dietaryNotes: r.dietaryNotes || '',
          message: r.message || '',
          notes: r.notes || ''
        };
      }));
    }

    var url = RS.endpoint + (RS.endpoint.indexOf('?') > -1 ? '&' : '?') +
              'key=' + encodeURIComponent(key);

    return fetch(url, { redirect: 'follow' })
      .then(function (res) { return res.json(); })
      .then(function (out) {
        if (!out || out.ok === false) {
          throw new Error((out && out.error) || 'The server refused that.');
        }
        return out.rsvps || [];
      })
      .catch(function (err) {
        if (err instanceof TypeError) {
          throw new Error('Couldn\'t reach the Apps Script endpoint. Check that the ' +
                          'Web App is deployed with access set to "Anyone".');
        }
        throw err;
      });
    }

  /* ----------------------------------------------------------- render -- */
  function renderStats() {
    var yes = rows.filter(function (r) { return r.attending === 'Yes'; });
    var no  = rows.filter(function (r) { return r.attending !== 'Yes'; });
    var heads  = yes.reduce(function (a, r) { return a + (r.total || 0); }, 0);
    var diet   = yes.filter(function (r) { return r.dietary || r.dietaryNotes; }).length;

    var cards = [
      ['stat--hero', heads, 'people coming'],
      ['', yes.length, 'households in'],
      ['', no.length, 'no'],
      ['', diet, 'dietary needs']
    ];

    $('#stats').innerHTML = cards.map(function (c) {
      return '<div class="stat ' + c[0] + '"><span class="stat__n">' + c[1] +
             '</span><span class="stat__l">' + c[2] + '</span></div>';
    }).join('');
  }

  function renderTable(filter) {
    var q = (filter || '').trim().toLowerCase();
    var shown = !q ? rows : rows.filter(function (r) {
      return [r.name, r.email, r.phone, r.guestNames, r.dietary,
              r.dietaryNotes, r.notes, r.message]
        .join(' ').toLowerCase().indexOf(q) > -1;
    });

    $('#empty').hidden = shown.length > 0;

    $('#tbody').innerHTML = shown.map(function (r) {
      var when = '';
      try { when = new Date(r.timestamp).toLocaleDateString('en-US',
                    { month: 'short', day: 'numeric' }); } catch (e) {}

      var contact = [
        r.email ? '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '',
        r.phone ? '<a href="tel:' + esc(r.phone.replace(/[^\d+]/g, '')) + '">' + esc(r.phone) + '</a>' : ''
      ].filter(Boolean).join('<br>');

      var diet = [r.dietary, r.dietaryNotes].filter(Boolean).join(', ');

      return '<tr>' +
        '<td><strong>' + esc(r.name) + '</strong></td>' +
        '<td><span class="pill pill--' + (r.attending === 'Yes' ? 'yes' : 'no') + '">' +
          esc(r.attending) + '</span></td>' +
        '<td><strong>' + (r.attending === 'Yes' ? r.total : '—') + '</strong></td>' +
        '<td class="cell-msg">' + esc(r.guestNames) + '</td>' +
        '<td class="cell-msg">' + esc(diet) + '</td>' +
        '<td class="cell-msg">' + contact + '</td>' +
        '<td class="cell-msg">' + esc(r.notes) + '</td>' +
        '<td>' + esc(when) + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderMessages() {
    var withMsg = rows.filter(function (r) { return (r.message || '').trim(); });
    $('#messages').hidden = withMsg.length === 0;
    $('#msgList').innerHTML = withMsg.map(function (r) {
      return '<div class="msg"><p class="msg__q">“' + esc(r.message) +
             '”</p><p class="msg__a">' + esc(r.name) + '</p></div>';
    }).join('');
  }

  function renderAll() {
    rows.sort(function (a, b) {
      if (a.attending !== b.attending) return a.attending === 'Yes' ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
    renderStats();
    renderTable($('#search').value);
    renderMessages();
  }

  /* -------------------------------------------------------------- csv -- */
  function csv() {
    var cols = ['Name', 'Attending', 'People', 'Email', 'Phone',
                'Bringing', 'Dietary', 'Dietary notes', 'Notes', 'Message', 'RSVP date'];

    function cell(v) {
      var s = String(v == null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    var lines = [cols.join(',')];
    rows.forEach(function (r) {
      lines.push([r.name, r.attending, r.total, r.email, r.phone,
                  r.guestNames, r.dietary, r.dietaryNotes, r.notes, r.message,
                  r.timestamp].map(cell).join(','));
    });

    // BOM so Excel opens UTF-8 names correctly.
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rsvps.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ------------------------------------------------------------- gate -- */
  function unlock(key) {
    var btn = $('#gateBtn');
    var err = $('#gateErr');
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Checking…';

    load(key).then(function (data) {
      rows = data;
      try { sessionStorage.setItem(SESSION_KEY, key); } catch (e) {}
      $('#gate').hidden = true;
      $('#panel').hidden = false;
      renderAll();
    }).catch(function (e) {
      err.textContent = e.message;
      err.hidden = false;
      $('#key').focus();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Show me the list';
    });
  }

  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    unlock($('#key').value);
  });

  $('#search').addEventListener('input', function () { renderTable(this.value); });
  $('#btnCsv').addEventListener('click', csv);
  $('#btnPrint').addEventListener('click', function () { window.print(); });

  $('#btnRefresh').addEventListener('click', function () {
    var btn = this;
    btn.textContent = 'Refreshing…';
    var key = '';
    try { key = sessionStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
    load(key).then(function (data) { rows = data; renderAll(); })
             .catch(function (err) { alert(err.message); })
             .then(function () { btn.textContent = 'Refresh'; });
  });

  $('#btnLogout').addEventListener('click', function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    location.reload();
  });

  /* Demo mode needs no passphrase, nothing is on a server to protect. */
  if (mode() === 'demo') {
    unlock('');
  } else {
    var saved = '';
    try { saved = sessionStorage.getItem(SESSION_KEY) || ''; } catch (e) {}
    if (saved) unlock(saved);
  }

})();
