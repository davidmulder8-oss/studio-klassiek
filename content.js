/* Haalt content.json op en vult de pagina. Zonder content.json blijft de tekst staan zoals hij in de HTML staat. */
(function () {
  'use strict';

  function get(o, path) {
    return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o);
  }
  function money(n) { return '€ ' + Number(n).toLocaleString('nl-NL'); }
  function phoneHref(p) {
    var d = String(p).replace(/[^\d+]/g, '');
    if (d.indexOf('+') === 0) return d;
    if (d.indexOf('00') === 0) return '+' + d.slice(2);
    if (d.charAt(0) === '0') return '+31' + d.slice(1);
    return d;
  }
  function expand(s, c) {
    var l = c.lessons || {};
    return s.replace(/\{(dj5|dj10|produce5|produce10)\}/g, function (m, k) {
      var map = { dj5: ['dj', 'price5'], dj10: ['dj', 'price10'], produce5: ['produce', 'price5'], produce10: ['produce', 'price10'] }[k];
      var v = l[map[0]] && l[map[0]][map[1]];
      return v == null || v === '' ? m : money(v);
    });
  }
  function filled(v) { return v != null && String(v).trim() !== ''; }
  function setText(el, v) { el.textContent = v; el.hidden = false; el.classList.remove('todo', 'todo-block'); }

  /* Velden die nog niet zijn ingevuld tonen we niet: ze verschijnen vanzelf zodra er iets staat */
  function hideEmpty() {
    document.querySelectorAll('.info dd, .facts-list dd').forEach(function (dd) {
      var row = dd.parentNode;
      if (row && row.tagName === 'DIV') row.hidden = dd.classList.contains('todo');
    });
    document.querySelectorAll('.facts-list').forEach(function (l) { l.hidden = !l.querySelector('div:not([hidden])'); });
    document.querySelectorAll('.person').forEach(function (p) {
      var note = p.querySelector('.todo-block'); if (note) note.hidden = true;
      p.hidden = !!p.querySelector('h3 .todo');
    });
    var team = document.getElementById('team');
    if (team) team.hidden = !team.querySelector('.person:not([hidden])');
    document.querySelectorAll('.st-open').forEach(function (s) {
      s.hidden = s.parentNode.classList.contains('is-open') || !!s.querySelector('[data-st-date].todo');
    });
  }
  function hideEmptyGallery() {
    var s = document.getElementById('studio');
    if (!s) {
      /* andere pagina's: toon de menuregel alleen als de hoofdfoto van de studio bestaat */
      var links = document.querySelectorAll('a[href$="#studio"]');
      links.forEach(function (a) { a.hidden = true; });
      var probe = new Image();
      probe.onload = function () { links.forEach(function (a) { a.hidden = false; }); };
      probe.src = 'assets/foto/studio-1.jpg';
      return;
    }
    var any = !!s.querySelector('.ph:not(.missing)');
    s.hidden = !any;
    document.querySelectorAll('a[href$="#studio"]').forEach(function (a) { a.hidden = !any; });
  }
  hideEmpty();
  if (document.readyState === 'complete') hideEmptyGallery(); else window.addEventListener('load', hideEmptyGallery);

  function apply(c) {
    document.querySelectorAll('[data-c]').forEach(function (el) {
      var v = get(c, el.getAttribute('data-c'));
      if (filled(v)) setText(el, expand(String(v), c));
    });
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var v = get(c, el.getAttribute('data-price'));
      if (filled(v) && !isNaN(Number(v))) el.textContent = money(v);
    });
    var ct = c.contact || {};
    document.querySelectorAll('[data-c-mail]').forEach(function (el) {
      if (filled(ct.email)) { el.href = 'mailto:' + ct.email; el.textContent = ct.email; }
    });
    document.querySelectorAll('[data-c-tel]').forEach(function (el) {
      if (filled(ct.phone)) { el.href = 'tel:' + phoneHref(ct.phone); el.textContent = ct.phone; }
    });
    document.querySelectorAll('iframe[data-c-map]').forEach(function (el) {
      if (filled(ct.mapQuery)) {
        el.src = 'https://www.google.com/maps?q=' + encodeURIComponent(ct.mapQuery) + '&output=embed';
        el.title = 'Kaart van ' + ct.mapQuery;
      }
    });
    document.querySelectorAll('[data-studio]').forEach(function (el) {
      var s = (c.studios || [])[+el.getAttribute('data-studio')];
      if (!s) return;
      var open = s.status === 'open';
      el.classList.toggle('is-open', open);
      var txt = el.querySelector('.st-text'), wrap = el.querySelector('.st-open'), date = el.querySelector('[data-st-date]');
      if (txt) txt.textContent = open ? 'Nu te boeken' : 'Opent binnenkort';
      if (wrap) wrap.hidden = open;
      if (date && filled(s.opening)) setText(date, s.opening);
    });
    document.querySelectorAll('[data-faq]').forEach(function (box) {
      if (!Array.isArray(c.faq) || !c.faq.length) return;
      var home = box.getAttribute('data-faq') === 'home';
      box.textContent = '';
      c.faq.filter(function (f) { return filled(f.q) && filled(f.a) && (!home || f.home); }).forEach(function (f) {
        var d = document.createElement('details'), s = document.createElement('summary'), p = document.createElement('p');
        s.textContent = f.q; p.textContent = expand(String(f.a), c);
        d.appendChild(s); d.appendChild(p); box.appendChild(d);
      });
    });
  }

  fetch('content.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) { if (c) { window.SK_CONTENT = c; apply(c); hideEmpty(); } })
    .catch(function () { /* geen content.json: de standaardtekst blijft staan */ });
})();
