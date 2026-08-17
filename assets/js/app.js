/* =============================================================================
 * app.js: invitation page behaviour
 *
 * Everything party-specific comes from config.js. Nothing here needs editing.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.EVITE_CONFIG;
  if (!CFG) { console.error('config.js did not load'); return; }

  var EV   = CFG.event;
  var TZ   = EV.timeZone || 'America/New_York';
  var START = new Date(EV.start);
  var END   = new Date(EV.end);
  var DEADLINE = new Date(EV.rsvpDeadline);

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function setText(sel, value, hideWhenEmpty) {
    var el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    if (hideWhenEmpty && !value) { el.hidden = true; return; }
    el.textContent = value;
    if (hideWhenEmpty) el.hidden = false;
  }

  /* ------------------------------------------------------ date helpers -- */
  function fmt(date, opts) {
    try {
      return new Intl.DateTimeFormat('en-US',
        Object.assign({ timeZone: TZ }, opts)).format(date);
    } catch (e) {
      return new Intl.DateTimeFormat('en-US', opts).format(date);
    }
  }
  var monthLong  = function (d) { return fmt(d, { month: 'long' }); };
  var weekdayLong = function (d) { return fmt(d, { weekday: 'long' }); };
  var dayNum     = function (d) { return fmt(d, { day: 'numeric' }); };

  function timeShort(d) {
    return fmt(d, { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(':00', '')
      .replace(/\s?([AP])M/i, ' $1M');
  }

  function ordinal(n) {
    n = Number(n);
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  var deadlineLabel = monthLong(DEADLINE) + ' ' + ordinal(dayNum(DEADLINE));

  /* ==================================================================== */
  /* 1. Render the invitation from config                                 */
  /* ==================================================================== */
  function render() {
    document.title = EV.honoreePossessive + ' ' + EV.occasion + ' RSVP';

    var pv = CFG.share || {};
    if (pv.previewTitle) {
      var t = $('#ogTitle'); if (t) t.setAttribute('content', pv.previewTitle);
    }
    if (pv.previewDescription) {
      var d = $('#ogDesc'); if (d) d.setAttribute('content', pv.previewDescription);
    }

    setText('#heroName', EV.honoreePossessive);
    setText('#heroOccasion', EV.occasion);
    setText('#heroMonth', monthLong(START));
    setText('#heroWeekday', weekdayLong(START));
    setText('#heroDay', dayNum(START));
    setText('#heroTime', timeShort(START));
    setText('#heroVenue', EV.venueName, true);
    setText('#heroAddr1', EV.addressLine1);
    setText('#heroAddr2', EV.addressLine2);
    setText('#heroDress', EV.dressCode);
    setText('#heroDeadline', deadlineLabel);
    setText('#rsvpDeadlineInline', deadlineLabel);
    setText('#messageLabel', 'A birthday message for ' + EV.honoreeName);

    if (EV.isSurprise) $('#surpriseTag').hidden = false;

    /* --- details cards --- */
    setText('#detWhen',
      weekdayLong(START) + ', ' + monthLong(START) + ' ' + dayNum(START) +
      ', ' + fmt(START, { year: 'numeric' }) + '\n' +
      timeShort(START) + ' – ' + timeShort(END));

    if (EV.isSurprise && EV.guestArrival) {
      setText('#detArrival',
        'Please arrive by ' + EV.guestArrival + '. ' + EV.honoreeNickname +
        ' walks in at ' + (EV.surpriseMoment || timeShort(START)) +
        '. Everyone needs to be inside before then.', true);
    }

    setText('#detWhere',
      [EV.venueName, EV.addressLine1, EV.addressLine2].filter(Boolean).join('\n'));
    setText('#detParking', EV.parkingNote, true);
    setText('#detDress', EV.dressCode);
    setText('#detDressNote', EV.dressCodeNote, true);

    if (EV.foodNote)  { $('#cardFood').hidden = false;  setText('#detFood', EV.foodNote); }
    if (EV.giftsNote) { $('#cardGifts').hidden = false; setText('#detGifts', EV.giftsNote); }

    if (EV.isSurprise) {
      $('#cardSecret').hidden = false;
      setText('#detSecret',
        'This is a surprise. Please don\'t mention it to ' + EV.honoreeNickname +
        ', don\'t post about it, and don\'t tag the address anywhere until after ' +
        'the party. If he asks what you\'re doing that evening, you\'re busy.');
    }

    /* --- maps --- */
    var q = encodeURIComponent(
      [EV.venueName, EV.addressLine1, EV.addressLine2].filter(Boolean).join(', '));
    $('#linkGoogleMaps').href = 'https://www.google.com/maps/search/?api=1&query=' + q;
    $('#linkAppleMaps').href  = 'https://maps.apple.com/?q=' + q;

    /* --- footer --- */
    setText('#footHost', EV.hostedBy ? 'From ' + EV.hostedBy : '');

    var contact = $('#footContact');
    var bits = [];
    if (EV.contactEmail) {
      bits.push('<a href="mailto:' + esc(EV.contactEmail) + '">' + esc(EV.contactEmail) + '</a>');
    }
    if (EV.contactPhone) {
      bits.push('<a href="tel:' + esc(EV.contactPhone.replace(/[^\d+]/g, '')) + '">' +
                esc(EV.contactPhone) + '</a>');
    }
    contact.innerHTML = bits.length
      ? (EV.contactName ? esc(EV.contactName) + ' · ' : '') + bits.join(' · ')
      : '';

    /* --- FAQ --- */
    var list = $('#faqList');
    (CFG.faq || []).forEach(function (item) {
      var d = document.createElement('details');
      d.className = 'faq__item';
      var s = document.createElement('summary');
      s.textContent = item.q;
      var a = document.createElement('div');
      a.className = 'faq__a';
      a.textContent = item.a;
      d.appendChild(s); d.appendChild(a);
      list.appendChild(d);
    });

    /* --- deadline notice --- */
    if (Date.now() > DEADLINE.getTime()) $('#deadlinePassed').hidden = false;

    /* --- demo-mode warning --- */
    if (mode() === 'demo') $('#setupBanner').hidden = false;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mode() {
    var m = (CFG.rsvp && CFG.rsvp.mode) || 'demo';
    if (m === 'appsscript' && !CFG.rsvp.endpoint) return 'demo';
    if (m === 'formspree'  && !CFG.rsvp.formspreeId) return 'demo';
    return m;
  }

  /* ==================================================================== */
  /* 2. Confetti                                                          */
  /* ==================================================================== */
  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var host = $('.confetti');
    if (!host) return;

    var colors = ['#D4AF37', '#E8CE7B', '#F6E27A', '#FFFFFF', '#C9A227', '#EFE3BE'];
    var count = window.innerWidth < 700 ? 20 : 38;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      var w = 4 + Math.random() * 6;
      s.style.left = (Math.random() * 100) + '%';
      s.style.width = w + 'px';
      s.style.height = (w * (0.4 + Math.random() * 1.1)) + 'px';
      s.style.background = colors[(Math.random() * colors.length) | 0];
      s.style.animationDuration = (7 + Math.random() * 9) + 's';
      s.style.animationDelay = (-Math.random() * 14) + 's';
      s.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
      frag.appendChild(s);
    }
    host.appendChild(frag);
  }

  /* ==================================================================== */
  /* 3. Countdown                                                         */
  /* ==================================================================== */
  function countdown() {
    var elD = $('#cdD'), elH = $('#cdH'), elM = $('#cdM'), elS = $('#cdS');
    var note = $('#countdownNote');
    var wrap = $('#countdown');

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function tick() {
      var now = Date.now();
      var diff = START.getTime() - now;

      if (diff <= 0) {
        if (now < END.getTime()) {
          wrap.innerHTML = '<p class="cd__n" style="font-family:var(--font-script);' +
            'font-size:clamp(2rem,1.2rem+4vw,3.5rem)">It\'s happening right now</p>';
          note.textContent = 'Hope you made it.';
        } else {
          wrap.innerHTML = '<p class="cd__n" style="font-family:var(--font-script);' +
            'font-size:clamp(2rem,1.2rem+4vw,3.5rem)">What a night</p>';
          note.textContent = 'Thank you to everyone who came and kept the secret.';
        }
        clearInterval(timer);
        return;
      }

      var s = Math.floor(diff / 1000);
      elD.textContent = Math.floor(s / 86400);
      elH.textContent = pad(Math.floor(s / 3600) % 24);
      elM.textContent = pad(Math.floor(s / 60) % 60);
      elS.textContent = pad(s % 60);
    }

    var daysToDeadline = Math.ceil((DEADLINE.getTime() - Date.now()) / 86400000);
    if (daysToDeadline > 0) {
      note.textContent = daysToDeadline === 1
        ? 'Today is the last day to RSVP.'
        : daysToDeadline + ' days left to RSVP. The deadline is ' + deadlineLabel + '.';
    } else if (Date.now() < START.getTime()) {
      note.textContent = 'RSVPs closed on ' + deadlineLabel + ', but late replies are still welcome.';
    }

    tick();
    var timer = setInterval(tick, 1000);
  }

  /* ==================================================================== */
  /* 4. Calendar                                                          */
  /* ==================================================================== */
  function calTitle() {
    return (EV.isSurprise ? 'Surprise: ' : '') +
           EV.honoreePossessive + ' ' + EV.occasion;
  }

  function calDescription() {
    var lines = [];
    if (EV.isSurprise && EV.guestArrival) {
      lines.push('Arrive by ' + EV.guestArrival + '. ' + EV.honoreeNickname +
                 ' arrives at ' + (EV.surpriseMoment || timeShort(START)) + '.');
      lines.push('It\'s a surprise, please keep it quiet.');
    }
    if (EV.dressCode) lines.push('Dress code: ' + EV.dressCode + '.');
    if (EV.contactEmail || EV.contactPhone) {
      lines.push('Questions: ' +
        [EV.contactName, EV.contactEmail, EV.contactPhone].filter(Boolean).join(' · '));
    }
    lines.push(location.href.split('#')[0]);
    return lines.join('\n');
  }

  function calLocation() {
    return [EV.venueName, EV.addressLine1, EV.addressLine2].filter(Boolean).join(', ');
  }

  function icsStamp(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function googleCalUrl() {
    var p = new URLSearchParams({
      action: 'TEMPLATE',
      text: calTitle(),
      dates: icsStamp(START) + '/' + icsStamp(END),
      details: calDescription(),
      location: calLocation(),
      ctz: TZ
    });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }

  function icsBlobUrl() {
    function fold(line) {
      // RFC 5545 says wrap at 75 octets; be conservative and simple.
      var out = [], s = line;
      while (s.length > 73) { out.push(s.slice(0, 73)); s = ' ' + s.slice(73); }
      out.push(s);
      return out.join('\r\n');
    }
    function escICS(s) {
      return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
                      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    }

    var uid = 'parsattom75-' + icsStamp(START) + '@evite.local';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Parsottam Dada 75th//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + icsStamp(new Date()),
      'DTSTART:' + icsStamp(START),
      'DTEND:' + icsStamp(END),
      fold('SUMMARY:' + escICS(calTitle())),
      fold('DESCRIPTION:' + escICS(calDescription())),
      fold('LOCATION:' + escICS(calLocation())),
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      fold('DESCRIPTION:' + escICS(calTitle()) + ' is tomorrow'),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return URL.createObjectURL(
      new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
  }

  function addToCalendar() {
    var isApplePlatform = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

    if (isApplePlatform) {
      var url = icsBlobUrl();
      var a = document.createElement('a');
      a.href = url;
      a.download = 'parsattom-75th-birthday.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return;
    }
    window.open(googleCalUrl(), '_blank', 'noopener');
  }

  /* ==================================================================== */
  /* 5. Share                                                             */
  /* ==================================================================== */
  function share(btn) {
    var url = location.href.split('#')[0];
    var text = ((CFG.share && CFG.share.shareText) || 'You\'re invited!') +
               (EV.isSurprise ? ' (It\'s a surprise, please don\'t post about it.)' : '');

    if (navigator.share) {
      navigator.share({ title: (CFG.share && CFG.share.previewTitle) || document.title,
                        text: text, url: url })
        .catch(function () { /* user dismissed */ });
      return;
    }

    var payload = text + ' ' + url;
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'Link copied';
      setTimeout(function () { btn.textContent = old; }, 2200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(done, function () { window.prompt('Copy this link:', payload); });
    } else {
      window.prompt('Copy this link:', payload);
    }
  }

  /* ==================================================================== */
  /* 6. The RSVP form                                                     */
  /* ==================================================================== */
  var LOCAL_KEY = 'evite.myrsvp';
  var DEMO_KEY  = 'evite.demo.rsvps';

  function form() {
    var f = $('#rsvpForm');
    var yesBlock = $('#ifYes');
    var status = $('#formStatus');
    var submitBtn = $('#submitBtn');
    var sending = false;
    var returning = false;   // true once we've prefilled a previous RSVP

    /* --- show/hide the guest-count block --- */
    function syncAttending() {
      var picked = f.querySelector('input[name="attending"]:checked');
      yesBlock.hidden = !picked || picked.value !== 'yes';
      submitBtn.textContent = picked && picked.value === 'no'
        ? (returning ? 'Update my regrets' : 'Send my regrets')
        : (returning ? 'Update my RSVP' : 'Send my RSVP');
    }
    $$('input[name="attending"]', f).forEach(function (r) {
      r.addEventListener('change', function () { syncAttending(); clearErr('attending'); });
    });

    $('#guests').addEventListener('input', function () { clearErr('guests'); });

    /* --- validation --- */
    function showErr(field, msg) {
      var e = $('#err-' + field);
      if (e) { e.textContent = msg; e.hidden = false; }
      var input = f.querySelector('[name="' + field + '"]');
      if (input) input.setAttribute('aria-invalid', 'true');
    }
    function clearErr(field) {
      var e = $('#err-' + field);
      if (e) { e.hidden = true; e.textContent = ''; }
      var input = f.querySelector('[name="' + field + '"]');
      if (input) input.removeAttribute('aria-invalid');
    }

    $('#name').addEventListener('input', function () { clearErr('name'); });
    $('#email').addEventListener('input', function () { clearErr('email'); });

    function collect() {
      var picked = f.querySelector('input[name="attending"]:checked');
      var attending = picked ? picked.value : '';
      var yes = attending === 'yes';

      return {
        name:         $('#name').value.trim(),
        attending:    attending,
        guests:       yes ? Math.max(0, parseInt($('#guests').value, 10) || 0) : 0,
        guestNames:   yes ? $('#guestNames').value.trim() : '',
        dietary:      yes ? $$('input[name="dietary"]:checked', f).map(function (c) { return c.value; }) : [],
        dietaryNotes: yes ? $('#dietaryNotes').value.trim() : '',
        message:      $('#message').value.trim(),
        email:        $('#email').value.trim(),
        phone:        $('#phone').value.trim(),
        notes:        $('#notes').value.trim(),
        website:      $('#website').value,
        submittedAt:  new Date().toISOString()
      };
    }

    function validate(data) {
      var firstBad = null;

      if (!data.name) { showErr('name', 'We need a name for the list.'); firstBad = firstBad || $('#name'); }
      if (!data.attending) {
        showErr('attending', 'Let us know either way. A "no" is still helpful.');
        firstBad = firstBad || f.querySelector('input[name="attending"]');
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
        showErr('email', 'That email looks off. Check it, or leave it blank.');
        firstBad = firstBad || $('#email');
      }
      if (data.attending === 'yes' && data.guests < 1) {
        showErr('guests', 'If you\'re coming, that needs to be at least 1.');
        firstBad = firstBad || $('#guests');
      }

      if (firstBad) {
        firstBad.focus();
        if (firstBad.scrollIntoView) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
      }
      return true;
    }

    /* --- transports --- */
    function sendAppsScript(data) {
      // No custom Content-Type header: keeps it a CORS "simple request" so the
      // browser skips the preflight that Apps Script can't answer.
      return fetch(CFG.rsvp.endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        redirect: 'follow'
      })
      .then(function (res) { return res.json(); })
      .then(function (out) {
        if (out && out.ok === false) throw new Error(out.error || 'Server said no.');
        return { delivered: true };
      })
      .catch(function (err) {
        // A CORS/redirect hiccup means we can't READ the reply, but the write
        // very likely landed. Retry opaquely so the RSVP isn't lost, then say so.
        if (err instanceof TypeError) {
          return fetch(CFG.rsvp.endpoint, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
          }).then(function () { return { delivered: true, unconfirmed: true }; });
        }
        throw err;
      });
    }

    function sendFormspree(data) {
      var flat = Object.assign({}, data, { dietary: data.dietary.join(', ') });
      delete flat.website;
      return fetch('https://formspree.io/f/' + CFG.rsvp.formspreeId, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(flat)
      }).then(function (res) {
        if (!res.ok) throw new Error('Formspree rejected that (' + res.status + ').');
        return { delivered: true };
      });
    }

    function sendDemo(data) {
      var all = [];
      try { all = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'); } catch (e) {}
      all.push(data);
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(all)); } catch (e) {}
      return new Promise(function (r) {
        setTimeout(function () { r({ delivered: false, demo: true }); }, 450);
      });
    }

    /* --- submit --- */
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      var data = collect();

      // Honeypot tripped: pretend everything is fine, save nothing.
      if (data.website) { showThanks(data, { delivered: true }); return; }

      if (!validate(data)) return;
      delete data.website;

      sending = true;
      submitBtn.disabled = true;
      status.dataset.tone = 'working';
      status.textContent = 'Sending…';

      var m = mode();
      var send = m === 'appsscript' ? sendAppsScript
               : m === 'formspree'  ? sendFormspree
                                    : sendDemo;

      send(data).then(function (result) {
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (err) {}
        showThanks(data, result);
      }).catch(function (err) {
        sending = false;
        submitBtn.disabled = false;
        status.dataset.tone = 'error';
        status.innerHTML = 'That didn\'t go through. ' + esc(err.message || 'Network trouble') +
          '. Please try again, or email <a href="mailto:' + esc(EV.contactEmail || '') + '">' +
          esc(EV.contactEmail || 'the hosts') + '</a>.';
      });
    });

    /* --- thank you --- */
    function showThanks(data, result) {
      var yes = data.attending === 'yes';
      var head = yes ? 'See you there' : 'Thank you for telling us';
      var total = data.guests;

      var msg;
      if (yes) {
        msg = 'You\'re on the list' + (total > 1 ? ' for ' + total + ' people' : '') + '. ' +
              'We\'ll send a reminder closer to the day.';
      } else {
        msg = 'We\'ll miss you, and ' + EV.honoreeNickname +
              ' will hear that you were thinking of him.';
      }

      if (result && result.demo) {
        msg = 'Saved to this browser only. The site isn\'t connected to a backend yet, ' +
              'so nobody has received this. See README.md.';
      } else if (result && result.unconfirmed) {
        msg += ' (We couldn\'t read the confirmation back, so if you don\'t hear from us in ' +
               'a day or two, give us a nudge.)';
      }

      $('#thanksH').textContent = head;
      $('#thanksP').textContent = msg;

      if (EV.isSurprise && yes) {
        var secret = $('#thanksSecret');
        secret.textContent = '🤫 One last thing: not a word to ' + EV.honoreeNickname +
          '. Please arrive by ' + (EV.guestArrival || timeShort(START)) + '.';
        secret.hidden = false;
      }

      $('#btnCalendarThanks').hidden = !yes;

      f.hidden = true;
      var t = $('#thanks');
      t.hidden = false;
      t.focus();
      t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    /* --- "change my answer" --- */
    $('#btnEdit').addEventListener('click', function () {
      sending = false;
      submitBtn.disabled = false;
      status.textContent = '';
      status.removeAttribute('data-tone');
      $('#thanks').hidden = true;
      f.hidden = false;
      returning = true;
      syncAttending();
      $('#name').focus();
      f.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    /* --- prefill from a previous RSVP on this device --- */
    try {
      var prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
      if (prev && prev.name) {
        $('#name').value = prev.name || '';
        $('#email').value = prev.email || '';
        $('#phone').value = prev.phone || '';
        var radio = f.querySelector('input[name="attending"][value="' + prev.attending + '"]');
        if (radio) radio.checked = true;
        if (prev.attending === 'yes') {
          $('#guests').value = prev.guests != null ? prev.guests : 1;
          $('#guestNames').value = prev.guestNames || '';
          $('#dietaryNotes').value = prev.dietaryNotes || '';
          (prev.dietary || []).forEach(function (v) {
            var c = f.querySelector('input[name="dietary"][value="' + v.replace(/"/g, '\\"') + '"]');
            if (c) c.checked = true;
          });
        }
        returning = true;
        $('#rsvpBlurb').textContent =
          'Welcome back, ' + prev.name.split(' ')[0] + '. Change anything you need to and send it again. ' +
          'Your latest answer is the one that counts.';
      }
    } catch (e) { /* nothing saved, or storage blocked */ }

    syncAttending();
  }

  /* ==================================================================== */
  /* 7. Wire up + go                                                      */
  /* ==================================================================== */
  render();
  confetti();
  countdown();
  form();

  ['#btnCalendar', '#btnCalendarTop', '#btnCalendarThanks'].forEach(function (sel) {
    var el = $(sel);
    if (el) el.addEventListener('click', addToCalendar);
  });

  $('#btnShare').addEventListener('click', function () { share(this); });

})();
