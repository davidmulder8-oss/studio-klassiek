/* De draaiende plaat op de pagina Studio huren: hier maken we alleen de fijne streepjes op de messing rand. */
(function () {
  'use strict';
  var ticks = document.getElementById('wheelTicks');
  if (!ticks) return;
  var NS = 'http://www.w3.org/2000/svg', html = '';
  for (var i = 0; i < 120; i++) {
    var a = i * 3 * Math.PI / 180, major = i % 5 === 0, r1 = major ? 45.9 : 46.8, r2 = 49.2;
    html += '<line x1="' + (50 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (50 - r1 * Math.cos(a)).toFixed(2) +
      '" x2="' + (50 + r2 * Math.sin(a)).toFixed(2) + '" y2="' + (50 - r2 * Math.cos(a)).toFixed(2) + '"/>';
  }
  var g = document.createElementNS(NS, 'g'); g.innerHTML = html; ticks.appendChild(g);
})();