(function () {
  'use strict';
  var form = document.getElementById('earlyForm'), msg = document.getElementById('earlyMsg');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = form.elements.email.value.trim();
    msg.classList.remove('bad');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { msg.classList.add('bad'); msg.textContent = 'Vul een geldig e-mailadres in.'; return; }
    var btn = form.querySelector('button'); btn.disabled = true;
    SK.api('/api/early', { body: { email: email } }).then(function (res) {
      btn.disabled = false;
      if (res.body.ok) { form.reset(); msg.textContent = 'Bedankt, je staat op de lijst.'; }
      else { msg.classList.add('bad'); msg.textContent = res.body.error || 'Aanmelden is niet gelukt.'; }
    }).catch(function () { btn.disabled = false; msg.classList.add('bad'); msg.textContent = 'Er is geen verbinding met de server.'; });
  });
})();