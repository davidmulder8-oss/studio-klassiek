/* De wiel op de pagina Studio huren: tik om hem te laten draaien, tik opnieuw om te stoppen. Zonder geluid. */
(function () {
  'use strict';

  var btn = document.getElementById('wheel');
  if (!btn) return;
  var wrap = btn.parentNode, hint = document.getElementById('wheelHint');

  /* Fijne streepjes op de messing rand */
  var ticks = document.getElementById('wheelTicks');
  if (ticks) {
    var NS = 'http://www.w3.org/2000/svg', html = '';
    for (var i = 0; i < 120; i++) {
      var a = i * 3 * Math.PI / 180, major = i % 5 === 0, r1 = major ? 45.9 : 46.8, r2 = 49.2;
      html += '<line x1="' + (50 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (50 - r1 * Math.cos(a)).toFixed(2) +
        '" x2="' + (50 + r2 * Math.sin(a)).toFixed(2) + '" y2="' + (50 - r2 * Math.cos(a)).toFixed(2) + '"/>';
    }
    var g = document.createElementNS(NS, 'g'); g.innerHTML = html; ticks.appendChild(g);
  }

  btn.addEventListener('click', function () {
    var on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Stop de wiel' : 'Laat de wiel draaien');
    btn.classList.toggle('is-spinning', on);
    wrap.classList.toggle('is-spinning', on);
    if (hint) hint.textContent = on ? 'Tik op de wiel om te stoppen' : 'Tik op de wiel om te draaien';
  });
})();
