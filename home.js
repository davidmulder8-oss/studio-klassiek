/* Startpagina en pakketten: tabs (DJ of Produce) en pijltjes bij de zwiepbare galerij */
(function () {
  'use strict';

  /* Tabs */
  var tabs = [].slice.call(document.querySelectorAll('.seg [role="tab"]'));
  if (tabs.length) {
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
        select(tabs[(i + step) % tabs.length], true);
      });
    });
    select(tabs[0]);
  }

  /* Galerij: pijltjes om een foto verder te gaan (zwiepen kan ook) */
  var gal = document.querySelector('#studio .gallery');
  if (gal) {
    var wrap = document.createElement('div');
    wrap.className = 'gallery-wrap';
    gal.parentNode.insertBefore(wrap, gal);
    wrap.appendChild(gal);
    var arrowSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var make = function (dir, label) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'g-nav g-' + (dir < 0 ? 'prev' : 'next'); b.setAttribute('aria-label', label); b.innerHTML = arrowSvg;
      b.addEventListener('click', function () { gal.scrollBy({ left: dir * Math.round(gal.clientWidth * 0.8), behavior: 'smooth' }); });
      wrap.appendChild(b); return b;
    };
    var prev = make(-1, 'Vorige foto'), next = make(1, 'Volgende foto');
    var update = function () {
      var max = gal.scrollWidth - gal.clientWidth - 2;
      prev.disabled = gal.scrollLeft <= 2; next.disabled = gal.scrollLeft >= max;
      wrap.classList.toggle('no-scroll', max <= 0);
    };
    gal.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
})();
