/* De golfvorm onderin de hero: "die track in je hoofd". Wordt één keer opgebouwd en blijft daarna stilstaan. */
(function () {
  'use strict';

  var cv = document.getElementById('heroWave');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CREAM = '254, 247, 223', BRASS = '217, 178, 122';
  var PLAY = 0.38;                       /* waar de afspeelstreep staat (0 tot 1) */
  var W = 0, H = 0, bars = [], raf = 0, timer = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* Opbouw van een nummer: intro, opbouw, drop, break, drop, uitloop */
  function envelope(x) {
    if (x < 0.12) return 0.18 + x * 1.2;
    if (x < 0.30) return 0.32 + (x - 0.12) * 2.4;
    if (x < 0.48) return 0.8;
    if (x < 0.58) return 0.34;
    if (x < 0.62) return 0.34 + (x - 0.58) * 11;
    if (x < 0.90) return 0.86;
    return Math.max(0.2, 0.86 - (x - 0.9) * 7);
  }
  function build() {
    var n = Math.max(24, Math.floor(W / 6)), r = rng(11);
    bars = [];
    for (var i = 0; i < n; i++) {
      var a = envelope(i / n) * (0.55 + 0.45 * r());
      if (i % 8 === 0) a *= 1.15;
      bars.push(Math.max(0.05, Math.min(1, a)));
    }
  }
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), rect = cv.getBoundingClientRect();
    W = Math.round(rect.width); H = Math.round(rect.height);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function draw(p) {
    ctx.clearRect(0, 0, W, H);
    var ruler = 36, waveH = H - ruler, mid = waveH / 2, n = bars.length, step = W / n, bw = Math.max(1.5, step * 0.36);
    for (var i = 0; i < n; i++) {
      var x = i * step, fx = i / n;
      var grow = ease(Math.max(0, Math.min(1, (p * 1.3 - fx) * 5)));
      if (grow <= 0) continue;
      var edge = Math.min(1, fx / 0.06, (1 - fx) / 0.1);
      var h = Math.max(2, bars[i] * (waveH - 8) * grow);
      var played = fx < PLAY;
      ctx.fillStyle = 'rgba(' + (played ? BRASS : CREAM) + ',' + ((played ? 0.62 : 0.15) * edge).toFixed(3) + ')';
      ctx.fillRect(x, mid - h / 2, bw, h);
    }
    /* tijdliniaal */
    ctx.fillStyle = 'rgba(' + CREAM + ',0.16)';
    ctx.fillRect(0, waveH + 10, W, 1);
    for (var k = 0, tx = 0; tx <= W; k++, tx += 24) {
      var major = k % 5 === 0;
      ctx.fillStyle = 'rgba(' + CREAM + ',' + (major ? 0.34 : 0.18) + ')';
      ctx.fillRect(tx, waveH + 11, 1, major ? 12 : 6);
    }
    /* afspeelstreep */
    var px = Math.round(PLAY * W);
    ctx.fillStyle = 'rgba(' + CREAM + ',0.5)';
    ctx.fillRect(px, 0, 1, waveH + 24);
    ctx.fillStyle = 'rgba(' + BRASS + ',0.85)';
    ctx.beginPath(); ctx.moveTo(px - 6, 0); ctx.lineTo(px + 7, 0); ctx.lineTo(px + 0.5, 9); ctx.closePath(); ctx.fill();
  }

  function play() {
    cancelAnimationFrame(raf);
    if (reduce) { draw(1); return; }
    var t0 = 0, dur = 1500;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      draw(p);
      if (p < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  size(); play();
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { cancelAnimationFrame(raf); size(); draw(1); }, 150);
  });
})();
