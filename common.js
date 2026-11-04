(function () {
  'use strict';

  var MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  var DAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function longDate(s) { var d = parseIso(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function addMin(hhmm, mins) { var p = hhmm.split(':'), t = +p[0] * 60 + +p[1] + mins; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function durText(m) { return m < 60 ? m + ' minuten' : (m % 60 === 0 ? (m / 60) + ' uur' : (m / 60) + ' uur'); }

  function apiNet(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'same-origin' };
    if (opts.body) { init.method = 'POST'; init.headers = { 'Content-Type': 'application/json' }; init.body = JSON.stringify(opts.body); }
    return fetch(path, init).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
  }

  /* Statische versie (GitHub Pages): geen server, formulieren via FormSubmit */
  var STATIC_CFG = {"rooms":[{"description":"Pioneer XDJ-AZ met twee boothmonitoren.","name":"DJ-studio","id":"zaal-1","comingSoon":true,"image":""},{"description":"EVE Audio-monitoren, Audient iD14 MKII, keyboard met 88 toetsen en vocal booth.","name":"Produce-studio","id":"zaal-2","comingSoon":true,"image":""}],"maxDaysAhead":90,"expectedOpening":"","openingHours":{"0":{"open":"12:00","close":"20:00"},"1":{"open":"10:00","close":"21:00"},"2":{"open":"10:00","close":"21:00"},"3":{"open":"10:00","close":"21:00"},"4":{"open":"10:00","close":"21:00"},"5":{"open":"10:00","close":"21:00"},"6":{"open":"10:00","close":"21:00"}},"slotMinutes":30,"studioEmail":"studioklassiek.db@gmail.com"};
  var TYPE_NAMES = { kennismaking: 'Kennismaking', dj: 'DJ-les', produce: 'Produce-les' };
  function jsonRes(status, body) { return Promise.resolve({ status: status, body: body }); }
  function formPost(name, fields) {
    var data = {
      _subject: name === 'reservering' ? 'Nieuwe aanvraag ' + fields.reservering + ' - ' + fields.naam : 'Houd me op de hoogte: nieuwe aanmelding',
      _template: 'table', _captcha: 'false', _honey: fields['bot-field'] || ''
    };
    Object.keys(fields).forEach(function (k) { if (k !== 'bot-field') data[k] = fields[k] == null ? '' : String(fields[k]); });
    if (name === 'reservering') data._autoresponse = 'Bedankt voor je aanvraag bij Studio Klassiek. We bevestigen de afspraak zo snel mogelijk per e-mail. Reserveringsnummer: ' + fields.reservering;
    return fetch('https://formsubmit.co/ajax/' + STATIC_CFG.studioEmail, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) });
  }  function api(path, opts) {
    opts = opts || {};
    var url = new URL(path, location.origin), p = url.pathname, q = url.searchParams;
    if (p === '/api/me') return jsonRes(200, { ok: true, user: null, bookings: [] });
    if (p === '/api/config') return jsonRes(200, STATIC_CFG);
    if (p === '/api/slots') {
      var d = parseIso(q.get('date')), dur = +q.get('duration'), h = STATIC_CFG.openingHours[String(d.getDay())];
      if (!h) return jsonRes(200, { ok: true, slots: [] });
      var o = h.open.split(':'), c = h.close.split(':'), open = +o[0] * 60 + +o[1], close = +c[0] * 60 + +c[1], earliest = Date.now() + 24 * 3600 * 1000, slots = [];
      for (var s = open; s + dur <= close; s += STATIC_CFG.slotMinutes) {
        var t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, s).getTime();
        slots.push({ time: pad(Math.floor(s / 60)) + ':' + pad(s % 60), free: t >= earliest });
      }
      return jsonRes(200, { ok: true, slots: slots });
    }
    if (p === '/api/book' && opts.body) {
      var b = opts.body, id = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase(), end = addMin(b.start, b.duration);
      return formPost('reservering', { 'bot-field': '', reservering: id, type: TYPE_NAMES[b.type] || '', datum: longDate(b.date), datum_iso: b.date, start: b.start, eind: end, duur_minuten: b.duration, naam: b.name, email: b.email, telefoon: b.phone, opmerking: b.note, sleutelovereenkomst: b.keyAgree ? 'akkoord' : '' })
        .then(function (r) {
          if (!r.ok) return { status: 500, body: { ok: false, error: 'Versturen is niet gelukt. Probeer het later opnieuw of mail ons.' } };
          return { status: 200, body: { ok: true, id: id, requested: true, mailSent: false, studioEmail: STATIC_CFG.studioEmail, summary: { type: TYPE_NAMES[b.type], room: '', date: longDate(b.date), start: b.start, end: end, duration: b.duration } } };
        }).catch(function () { return { status: 500, body: { ok: false, error: 'Er is geen verbinding. Probeer het opnieuw.' } }; });
    }
    if (p === '/api/early' && opts.body) {
      return formPost('early-access', { 'bot-field': '', email: opts.body.email }).then(function (r) {
        return r.ok ? { status: 200, body: { ok: true } } : { status: 500, body: { ok: false, error: 'Aanmelden is niet gelukt. Probeer het later opnieuw.' } };
      }).catch(function () { return { status: 500, body: { ok: false, error: 'Er is geen verbinding. Probeer het opnieuw.' } }; });
    }
    return jsonRes(404, { ok: false, error: 'Niet beschikbaar.' });
  }
  /* Menu en header */
  var burger = document.getElementById('burger'), menu = document.getElementById('menu'), header = document.querySelector('.site-header');
  var backdrop = null, closeTimer = null, mq = window.matchMedia('(max-width: 760px)');
  function buildMenu() {
    var foot = document.createElement('div'); foot.className = 'menu-foot';
    var lab = document.createElement('small'); lab.textContent = 'Bel of mail ons'; foot.appendChild(lab);
    var tel = document.createElement('a'); tel.href = 'tel:+31626232734'; tel.textContent = '06 26232734'; foot.appendChild(tel);
    var mail = document.createElement('a'); mail.href = 'mailto:studioklassiek.db@gmail.com'; mail.textContent = 'studioklassiek.db@gmail.com'; foot.appendChild(mail);
    menu.appendChild(foot);
    backdrop = document.createElement('div'); backdrop.className = 'menu-backdrop'; backdrop.hidden = true;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function () { setMenu(false); });
  }
  function setMenu(open) {
    clearTimeout(closeTimer);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('menu-open', open && mq.matches);
    if (open) {
      menu.hidden = false; backdrop.hidden = false;
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add('open'); backdrop.classList.add('open'); }); });
    } else {
      menu.classList.remove('open'); backdrop.classList.remove('open');
      closeTimer = setTimeout(function () { menu.hidden = true; backdrop.hidden = true; }, 280);
    }
  }
  if (burger && menu) {
    buildMenu();
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
  }  function onScroll() { if (header) header.classList.toggle('solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Foto's: zolang een foto nog niet is toegevoegd, tonen we een sfeervolle plek ervoor */
  document.querySelectorAll('img[data-photo]').forEach(function (img) {
    var box = img.parentNode;
    function missing() { box.classList.add('missing'); }
    function found() { box.classList.remove('missing'); }
    if (img.complete && img.naturalWidth) found(); else missing();
    img.addEventListener('error', missing);
    img.addEventListener('load', found);
  });

  /* Ingelogd? Label van account-links aanpassen */
  var me = api('/api/me').then(function (r) { return r.body; }).catch(function () { return { user: null, bookings: [] }; });
  me.then(function (data) {
    document.querySelectorAll('[data-account]').forEach(function (a) {
      a.setAttribute('aria-label', data.user ? 'Mijn account' : 'Inloggen');
      if (a.dataset.account === 'text') a.textContent = data.user ? 'Mijn account' : 'Account';
      if (data.user) a.classList.add('is-in');
    });
  });

  /* Kalender + tijdsloten, gedeeld door lesreservering en self-service */
  function createCalendar(o) {
    var st = { date: null, start: null, month: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
    var calEl = o.calEl, slotsEl = o.slotsEl, headEl = o.headEl, req = 0;

    function render() {
      var m = st.month, today = new Date(); today.setHours(0, 0, 0, 0);
      var max = new Date(today); max.setDate(max.getDate() + o.config.maxDaysAhead);
      var offset = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
      var days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      var h = '<div class="cal-head"><button type="button" class="cal-nav" data-dir="-1" aria-label="Vorige maand">&lsaquo;</button><strong>' + MONTHS[m.getMonth()] + ' ' + m.getFullYear() + '</strong><button type="button" class="cal-nav" data-dir="1" aria-label="Volgende maand">&rsaquo;</button></div><div class="cal-grid">';
      ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].forEach(function (d) { h += '<span class="cal-dow">' + d + '</span>'; });
      for (var i = 0; i < offset; i++) h += '<span></span>';
      for (var d = 1; d <= days; d++) {
        var dt = new Date(m.getFullYear(), m.getMonth(), d), key = iso(dt);
        var off = dt < today || dt > max || !o.config.openingHours[String(dt.getDay())];
        h += '<button type="button" class="cal-day" data-date="' + key + '"' + (off ? ' disabled' : '') + ' aria-pressed="' + (st.date === key) + '" aria-label="' + longDate(key) + '">' + d + '</button>';
      }
      calEl.innerHTML = h + '</div>';
      var prev = new Date(m.getFullYear(), m.getMonth(), 0), next = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      calEl.querySelector('[data-dir="-1"]').disabled = prev < today;
      calEl.querySelector('[data-dir="1"]').disabled = next > max;
    }

    function loadSlots() {
      if (!st.date) { slotsEl.innerHTML = ''; headEl.textContent = 'Kies eerst een dag.'; return; }
      if (o.needs && !o.needs()) { slotsEl.innerHTML = ''; headEl.textContent = o.needsText || 'Maak eerst een keuze.'; return; }
      var my = ++req;
      headEl.textContent = 'Tijden op ' + longDate(st.date);
      slotsEl.innerHTML = '<p class="slots-empty">Tijden laden...</p>';
      var url = '/api/slots?date=' + st.date + '&duration=' + o.getDuration() + (o.getRoom ? '&room=' + encodeURIComponent(o.getRoom()) : '');
      api(url).then(function (res) {
        if (my !== req) return;
        var slots = (res.body.slots || []).filter(function (s) { return /^\d{2}:\d{2}$/.test(s.time); });
        if (!slots.length) { slotsEl.innerHTML = '<p class="slots-empty">Op deze dag zijn geen tijden beschikbaar.</p>'; return; }
        var any = slots.some(function (s) { return s.free; });
        slotsEl.innerHTML = (any ? '' : '<p class="slots-empty">Alle tijden op deze dag zijn bezet. Kies een andere dag.</p>') + slots.map(function (s) {
          return '<button type="button" class="slot" data-time="' + s.time + '"' + (s.free ? '' : ' disabled') + ' aria-pressed="' + (st.start === s.time) + '">' + s.time + '</button>';
        }).join('');
      }).catch(function () { if (my === req) slotsEl.innerHTML = '<p class="slots-empty">Tijden laden is mislukt. Probeer het opnieuw.</p>'; });
    }

    calEl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.dir) { st.month = new Date(st.month.getFullYear(), st.month.getMonth() + +b.dataset.dir, 1); render(); }
      else if (b.dataset.date) { st.date = b.dataset.date; st.start = null; render(); loadSlots(); o.onChange(st); }
    });
    slotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.slot'); if (!b || b.disabled) return;
      st.start = b.dataset.time;
      slotsEl.querySelectorAll('.slot').forEach(function (s) { s.setAttribute('aria-pressed', String(s === b)); });
      o.onChange(st);
    });

    render(); loadSlots();
    return {
      state: st,
      reload: function (clearTime) { if (clearTime) st.start = null; loadSlots(); o.onChange(st); }
    };
  }

  window.SK = { api: api, me: me, longDate: longDate, addMin: addMin, durText: durText, createCalendar: createCalendar, pad: pad };
})();
