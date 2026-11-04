(function () {
  'use strict';
  var TYPES = { kennismaking: 'Kennismaking', dj: 'DJ-les', produce: 'Produce-les' };
  var PRICES = {
    kennismaking: { main: 'Kennismaking', note: 'Je betaalt nu niets. In de kennismaking kijken we samen welke lessen bij je passen.' },
    dj: { main: '5 lessen € 600<br>10 lessen € 1.050', note: 'Je betaalt nu niets. Dit is een aanvraag. Het lespakket spreken we af bij de bevestiging.' },
    produce: { main: '5 lessen € 875<br>10 lessen € 1.500', note: 'Je betaalt nu niets. Dit is een aanvraag. Het lespakket spreken we af bij de bevestiging.' }
  };
  var $ = function (s) { return document.querySelector(s); };
  var form = $('#bookForm'), cal = null;
  function val(name) { var el = form.querySelector('[name=' + name + ']:checked'); return el ? el.value : ''; }

  function updateSummary() {
    var s = cal ? cal.state : { date: null, start: null };
    $('#sType').textContent = TYPES[val('type')];
    var pr = PRICES[val('type')] || PRICES.kennismaking;
    if ($('#sPrice')) { $('#sPrice').innerHTML = pr.main; $('#sPriceNote').textContent = pr.note; }
    $('#sDur').textContent = val('duration') + ' minuten';
    $('#sDate').textContent = s.date ? SK.longDate(s.date) : 'Nog niet gekozen';
    $('#sTime').textContent = s.start ? s.start + ' tot ' + SK.addMin(s.start, +val('duration')) : 'Nog niet gekozen';
  }

  function showError(msg) { var el = $('#formError'); el.textContent = msg; el.hidden = !msg; if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  SK.api('/api/config').then(function (r) { return r.body; }).then(function (config) {
    cal = SK.createCalendar({
      calEl: $('#cal'), slotsEl: $('#slots'), headEl: $('#slotHead'), config: config,
      getDuration: function () { return +val('duration'); }, onChange: updateSummary
    });
    updateSummary();
  });

  form.addEventListener('change', function (e) {
    if (e.target.name === 'duration' && cal) cal.reload(true);
    updateSummary();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); showError('');
    form.querySelectorAll('.invalid').forEach(function (i) { i.classList.remove('invalid'); });
    var f = form.elements, s = cal.state;
    if (!s.date) return showError('Kies een dag.');
    if (!s.start) return showError('Kies een tijdstip.');
    var bad = null;
    if (f.name.value.trim().length < 2) bad = f.name;
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email.value.trim())) bad = f.email;
    else if (!/^[0-9+\-\s()]{6,25}$/.test(f.phone.value.trim())) bad = f.phone;
    if (bad) { bad.classList.add('invalid'); bad.focus(); return showError('Controleer je ' + (bad === f.name ? 'naam' : bad === f.email ? 'e-mailadres' : 'telefoonnummer') + '.'); }
    if (!f.consent.checked) return showError('Ga akkoord met het gebruik van je gegevens om door te gaan.');

    var btn = $('#submitBtn'); btn.disabled = true;
    var payload = { type: val('type'), duration: +val('duration'), date: s.date, start: s.start, name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), note: f.note.value.trim(), consent: f.consent.checked };
    SK.api('/api/book', { body: payload }).then(function (res) {
      btn.disabled = false;
      if (!res.body.ok) { showError(res.body.error || 'Reserveren is niet gelukt.'); if (res.status === 409) cal.reload(true); return; }
      showDone(res.body, payload);
    }).catch(function () { btn.disabled = false; showError('Er is geen verbinding met de server. Probeer het opnieuw.'); });
  });

  function showDone(res, p) {
    var s = res.summary, done = $('#done');
    $('#doneTitle').textContent = res.requested ? 'Aanvraag ontvangen' : 'Je tijdslot is vastgehouden';
    $('#doneText').textContent = s.type + ' op ' + s.date + ', ' + s.start + ' tot ' + s.end + '. Reserveringsnummer ' + res.id + '. ' +
      (res.requested ? 'We bevestigen de afspraak zo snel mogelijk per e-mail.' : res.mailSent ? 'We hebben een bevestiging naar ' + p.email + ' gestuurd.' : 'Verstuur de reservering per e-mail naar Studio Klassiek zodat we de afspraak kunnen bevestigen.');
    var actions = $('#doneActions'); actions.innerHTML = '';
    if (!res.mailSent && !res.requested) {
      var body = 'Reservering ' + res.id + '\n\nType: ' + s.type + '\nDatum: ' + s.date + '\nTijd: ' + s.start + ' tot ' + s.end + ' (' + s.duration + ' minuten)\n\nNaam: ' + p.name + '\nE-mail: ' + p.email + '\nTelefoon: ' + p.phone + '\nOpmerking: ' + p.note;
      var a = document.createElement('a');
      a.className = 'btn';
      a.href = 'mailto:' + res.studioEmail + '?subject=' + encodeURIComponent('Reservering ' + res.id + ' - ' + p.name) + '&body=' + encodeURIComponent(body);
      a.innerHTML = '<span>Verstuur per e-mail</span><i class="arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i>';
      actions.appendChild(a);
    }
    document.querySelector('.booking').hidden = true;
    done.hidden = false; done.focus(); done.scrollIntoView({ block: 'center' });
  }
})();
