(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var state = { roomId: '', roomName: '', user: null, config: null }, cal = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function duration() { var c = document.querySelector('[name=duration]:checked'); return c ? +c.value : 60; }
  function arrowBtn(label, tag) {
    var b = el(tag || 'button', 'btn');
    var s = el('span', '', label); var i = el('i', 'arrow'); i.setAttribute('aria-hidden', 'true');
    i.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    b.appendChild(s); b.appendChild(i); return b;
  }
  function showError(msg) { var e = $('#formError'); e.textContent = msg; e.hidden = !msg; if (msg) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  function updateSummary() {
    var s = cal ? cal.state : { date: null, start: null };
    $('#sRoom').textContent = state.roomName || 'Nog niet gekozen';
    $('#sDur').textContent = SK.durText(duration());
    $('#sDate').textContent = s.date ? SK.longDate(s.date) : 'Nog niet gekozen';
    $('#sTime').textContent = s.start ? s.start + ' tot ' + SK.addMin(s.start, duration()) : 'Nog niet gekozen';
  }

  function renderRooms() {
    var box = $('#rooms'); box.innerHTML = '';
    state.config.rooms.forEach(function (r, i) {
      var label = el('label', 'room');
      var input = el('input'); input.type = 'radio'; input.name = 'room'; input.value = r.id; if (r.comingSoon) { input.disabled = true; label.classList.add('soon'); }
      var card = el('span', 'room-card');
      var media = el('span', 'room-media');
      if (r.image) { var img = el('img'); img.src = r.image; img.alt = r.name; media.appendChild(img); }
      else if (!r.comingSoon) { media.appendChild(el('small', '', 'Foto volgt')); }
      if (r.comingSoon) media.appendChild(el('span', 'soon-badge', 'Opent binnenkort'));
      card.appendChild(media);
      card.appendChild(el('b', '', r.name));
      if (r.description) card.appendChild(el('small', 'room-desc', r.description));
      label.appendChild(input); label.appendChild(card); box.appendChild(label);
    });
    box.addEventListener('change', function (e) {
      if (e.target.name !== 'room') return;
      state.roomId = e.target.value;
      state.roomName = (state.config.rooms.filter(function (r) { return r.id === state.roomId; })[0] || {}).name || '';
      cal.reload(true);
    });
  }

  function renderGate() {
    var g = $('#gate'); g.innerHTML = '';
    if (!state.user) {
      g.appendChild(el('p', '', 'Voor self-service heb je een account nodig. Zo houden we bij wie de studio heeft gereserveerd.'));
      var row = el('div', 'done-actions');
      var next = encodeURIComponent('self-service.html');
      var a = arrowBtn('Inloggen', 'a'); a.href = 'account.html?next=' + next;
      var b = arrowBtn('Account maken', 'a'); b.href = 'account.html?mode=register&next=' + next;
      row.appendChild(a); row.appendChild(b); g.appendChild(row);
      return;
    }
    g.appendChild(el('p', 'soft', 'Ingelogd als ' + state.user.name + ' (' + state.user.email + ').'));
    var lab = el('label', 'field-one', 'Opmerking (optioneel)');
    var ta = el('textarea'); ta.id = 'note'; ta.rows = 2; ta.maxLength = 500; lab.appendChild(ta); g.appendChild(lab);
    var btn = arrowBtn('Studio reserveren'); btn.type = 'button'; btn.id = 'submitBtn';
    btn.addEventListener('click', submit); g.appendChild(btn);
  }

  function submit() {
    showError('');
    var s = cal.state;
    if (!state.roomId) return showError('Kies een studio.');
    if (!s.date) return showError('Kies een dag.');
    if (!s.start) return showError('Kies een tijdstip.');
    var btn = $('#submitBtn'); btn.disabled = true;
    var note = ($('#note') || { value: '' }).value.trim();
    SK.api('/api/zelf/book', { body: { room: state.roomId, date: s.date, start: s.start, duration: duration(), note: note } }).then(function (res) {
      btn.disabled = false;
      if (!res.body.ok) {
        if (res.status === 401) { state.user = null; renderGate(); }
        showError(res.body.error || 'Reserveren is niet gelukt.');
        if (res.status === 409) cal.reload(true);
        return;
      }
      showDone(res.body);
    }).catch(function () { btn.disabled = false; showError('Er is geen verbinding met de server. Probeer het opnieuw.'); });
  }

  function showDone(res) {
    var s = res.summary, done = $('#done');
    $('#doneTitle').textContent = 'Je studio is gereserveerd';
    $('#doneText').textContent = s.room + ' op ' + s.date + ', ' + s.start + ' tot ' + s.end + '. Reserveringsnummer ' + res.id + '. ' +
      (res.mailSent ? 'We hebben een bevestiging naar ' + state.user.email + ' gestuurd.' : 'Verstuur de reservering per e-mail naar Studio Klassiek zodat we de afspraak kunnen bevestigen.');
    var actions = $('#doneActions'); actions.innerHTML = '';
    if (!res.mailSent) {
      var body = 'Reservering ' + res.id + '\n\nType: Self-service\nStudio: ' + s.room + '\nDatum: ' + s.date + '\nTijd: ' + s.start + ' tot ' + s.end + ' (' + s.duration + ' minuten)\n\nNaam: ' + state.user.name + '\nE-mail: ' + state.user.email + '\nTelefoon: ' + state.user.phone;
      var a = arrowBtn('Verstuur per e-mail', 'a');
      a.href = 'mailto:' + res.studioEmail + '?subject=' + encodeURIComponent('Reservering ' + res.id + ' - ' + state.user.name) + '&body=' + encodeURIComponent(body);
      actions.appendChild(a);
    }
    var mine = arrowBtn('Mijn reserveringen', 'a'); mine.href = 'account.html'; actions.appendChild(mine);
    $('#ssBooking').hidden = true;
    done.hidden = false; done.focus(); done.scrollIntoView({ block: 'center' });
  }

  Promise.all([SK.api('/api/config').then(function (r) { return r.body; }), SK.me]).then(function (v) {
    state.config = v[0]; state.user = v[1].user;
    cal = SK.createCalendar({
      calEl: $('#cal'), slotsEl: $('#slots'), headEl: $('#slotHead'), config: state.config,
      getDuration: duration, getRoom: function () { return state.roomId; },
      needs: function () { return !!state.roomId; }, needsText: 'Kies eerst een studio.', onChange: updateSummary
    });
    renderRooms(); updateSummary(); renderGate();
    if (!state.config.rooms.some(function (r) { return !r.comingSoon; })) document.body.classList.add('no-rooms');
    if (state.config.expectedOpening && $('#openingDate')) { $('#openingDate').textContent = state.config.expectedOpening; $('#openingDate').classList.remove('todo'); }
    $('#durations').addEventListener('change', function () { cal.reload(true); });
  });
})();
