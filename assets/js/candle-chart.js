/* ─────────────────────────────────────────────────────────────
   Candlestick chart — homepage section animation
   Triggers via IntersectionObserver, animates left→right,
   then enters live-tick mode with rolling new candles.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const canvas = document.getElementById('candleChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* ── Config ──────────────────────────────────────────────────── */
  const CANDLE_COUNT   = 60;
  const DRAW_MS        = 3200;   // reveal animation duration
  const LIVE_INTERVAL  = 7000;   // ms between new candles in live mode
  const LIVE_NOISE     = 0.06;   // live tick noise — visible movement
  const MA_PERIOD      = 10;
  const PAD            = { top: 14, right: 8, bottom: 8, left: 8 };
  const BULL           = '#26a69a';
  const BEAR           = '#ef5350';
  const BODY_RATIO     = 0.52;

  /* ── State ───────────────────────────────────────────────────── */
  let candles       = [];
  let liveClose     = 0;
  let lastCandleTs  = 0;
  let started       = false;
  let raf           = null;
  let drawStart     = null;
  let W = 0, H = 0, dpr = 1;

  /* ── Data generation ─────────────────────────────────────────── */
  function makeCandle(prevClose, idx) {
    /* Two sine waves create realistic-looking trend cycles */
    const bias = Math.sin(idx / 9) * 0.55 + Math.sin(idx / 22) * 0.35;
    const vol  = 1.6 + Math.abs(bias) * 0.9;
    const dir  = Math.random() > 0.5 - bias * 0.13 ? 1 : -1;
    const body = (Math.random() * vol + 0.35) * dir;
    const open  = prevClose + (Math.random() - 0.5) * 0.25;
    const close = open + body;
    const hi    = Math.max(open, close) + Math.random() * Math.abs(body) * 0.65 + 0.12;
    const lo    = Math.min(open, close) - Math.random() * Math.abs(body) * 0.65 + 0.12;
    return { open, high: hi, low: lo, close };
  }

  function buildHistory() {
    const out = [];
    let p = 130 + Math.random() * 30;
    for (let i = 0; i < CANDLE_COUNT; i++) {
      const c = makeCandle(p, i);
      out.push(c);
      p = c.close;
    }
    return out;
  }

  /* ── Theme ───────────────────────────────────────────────────── */
  function col() {
    const light = document.documentElement.dataset.theme === 'light';
    return {
      ma   : light ? 'rgba(180,130,0,0.60)'  : 'rgba(255,210,50,0.65)',
      bull : light ? 'rgba(22,148,136,0.88)' : 'rgba(38,166,154,0.90)',
      bear : light ? 'rgba(200,55,50,0.85)'  : 'rgba(239,83,80,0.90)',
    };
  }

  /* ── Sizing ──────────────────────────────────────────────────── */
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Render ──────────────────────────────────────────────────── */
  function render(globalFrac) {
    const c = col();
    const rightPad = Math.max(8, W * 0.14);   // keeps last candle clear of right fade
    const cW = W - PAD.left - rightPad;
    const cH = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    /* Live close override for last candle */
    const display = candles.map((cd, i) => {
      if (i === candles.length - 1 && liveClose !== 0) {
        const cl = liveClose;
        return { ...cd, close: cl, high: Math.max(cd.high, cl), low: Math.min(cd.low, cl) };
      }
      return cd;
    });

    /* Price range with padding */
    let lo = Infinity, hi = -Infinity;
    display.forEach(cd => { if (cd.low < lo) lo = cd.low; if (cd.high > hi) hi = cd.high; });
    const pr    = (hi - lo) || 1;
    const plo   = lo - pr * 0.07;
    const phi   = hi + pr * 0.07;
    const py    = p => PAD.top + cH * (1 - (p - plo) / (phi - plo));

    const slotW = cW / CANDLE_COUNT;
    const bodyW = Math.max(1.5, slotW * BODY_RATIO);

    /* How many candles to show — staggered with local pop fraction */
    const rawCount  = globalFrac * CANDLE_COUNT;
    const numFull   = Math.floor(rawCount);          // fully rendered
    const partialF  = rawCount - numFull;             // 0..1 for the arriving candle
    const total     = Math.min(CANDLE_COUNT, numFull + (globalFrac < 1 ? 1 : 0));

    /* Moving average line — subtle design accent */
    ctx.beginPath();
    ctx.strokeStyle = c.ma;
    ctx.lineWidth   = 1.2;
    let maMoved = false;
    for (let i = 0; i < total; i++) {
      if (i < MA_PERIOD - 1) continue;
      const slice = display.slice(i - MA_PERIOD + 1, i + 1);
      const ma    = slice.reduce((s, cd) => s + cd.close, 0) / MA_PERIOD;
      const x     = PAD.left + (i + 0.5) * slotW;
      const y     = py(ma);
      if (!maMoved) { ctx.moveTo(x, y); maMoved = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    /* Candles */
    for (let i = 0; i < total; i++) {
      const cd   = display[i];
      const bull = cd.close >= cd.open;
      const x    = PAD.left + (i + 0.5) * slotW;

      /* Local pop scale: arriving candle springs from 0 → 1.06 → 1 */
      let scaleY = 1;
      if (i === numFull && globalFrac < 1) {
        const t = partialF;
        /* Overshoot spring: goes past 1 then settles */
        scaleY = t < 0.7
          ? (t / 0.7)
          : 1 + Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.08;
        scaleY = Math.max(0, scaleY);
      }

      /* Wick */
      ctx.strokeStyle = bull ? c.bull : c.bear;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, py(cd.high));
      ctx.lineTo(x, py(cd.low));
      ctx.stroke();

      /* Body with Y-scale spring */
      const top = py(Math.max(cd.open, cd.close));
      const bot = py(Math.min(cd.open, cd.close));
      const bh  = Math.max(1.5, bot - top);
      const mid = top + bh / 2;

      ctx.save();
      ctx.translate(x, mid);
      ctx.scale(1, scaleY);
      ctx.translate(-x, -mid);
      ctx.fillStyle = bull ? c.bull : c.bear;
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      ctx.restore();

      /* Doji: flat horizontal line for near-zero body */
      if (bh <= 1.5) {
        ctx.strokeStyle = bull ? c.bull : c.bear;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - bodyW / 2, top);
        ctx.lineTo(x + bodyW / 2, top);
        ctx.stroke();
      }
    }

    /* ── Directional fades (destination-out) ──────────────────────── */
    ctx.globalCompositeOperation = 'destination-out';

    /* Left: heavy fade over text area, fades out at ~60% width.
       On narrow viewports (mobile) text fills full width, so use
       a lighter uniform fade instead of the sharp split. */
    const isMobile = W < 640;
    const lGr = ctx.createLinearGradient(0, 0, isMobile ? W : W * 0.62, 0);
    if (isMobile) {
      lGr.addColorStop(0, 'rgba(0,0,0,0.72)');
      lGr.addColorStop(1, 'rgba(0,0,0,0.30)');
    } else {
      lGr.addColorStop(0,    'rgba(0,0,0,0.92)');
      lGr.addColorStop(0.40, 'rgba(0,0,0,0.70)');
      lGr.addColorStop(0.75, 'rgba(0,0,0,0.18)');
      lGr.addColorStop(1,    'rgba(0,0,0,0)');
    }
    ctx.fillStyle = lGr;
    ctx.fillRect(0, 0, W, H);

    /* Right: fade covers empty space after last candle (~86% W) */
    const rGr = ctx.createLinearGradient(W * 0.86, 0, W * 0.99, 0);
    rGr.addColorStop(0, 'rgba(0,0,0,0)');
    rGr.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = rGr;
    ctx.fillRect(W * 0.86, 0, W * 0.14, H);

    /* Top: fade in from nav edge */
    const tGr = ctx.createLinearGradient(0, 0, 0, H * 0.18);
    tGr.addColorStop(0, 'rgba(0,0,0,1)');
    tGr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tGr;
    ctx.fillRect(0, 0, W, H * 0.18);

    /* Bottom: dissolve before the next section */
    const bGr = ctx.createLinearGradient(0, H * 0.48, 0, H);
    bGr.addColorStop(0, 'rgba(0,0,0,0)');
    bGr.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bGr;
    ctx.fillRect(0, H * 0.48, W, H * 0.52);

    ctx.globalCompositeOperation = 'source-over';
  }

  /* ── Reveal animation ────────────────────────────────────────── */
  function animReveal(ts) {
    if (!drawStart) drawStart = ts;
    const t    = Math.min(1, (ts - drawStart) / DRAW_MS);
    /* Ease-out cubic */
    const ease = 1 - Math.pow(1 - t, 3);

    render(ease);

    if (t < 1) {
      raf = requestAnimationFrame(animReveal);
    } else {
      /* Enter live mode */
      liveClose    = candles[candles.length - 1].close;
      lastCandleTs = ts;
      raf = requestAnimationFrame(animLive);
    }
  }

  /* ── Live tick mode ──────────────────────────────────────────── */
  function animLive(ts) {
    /* Micro-fluctuation on the last candle's close */
    const last = candles[candles.length - 1];
    liveClose += (Math.random() - 0.499) * LIVE_NOISE;
    /* Clamp to a sane range around the last candle */
    liveClose = Math.max(last.low  - 0.4, Math.min(last.high + 0.4, liveClose));

    /* Periodically advance: push new candle, scroll left */
    if (ts - lastCandleTs > LIVE_INTERVAL) {
      const newC = makeCandle(liveClose, candles.length);
      candles.push(newC);
      if (candles.length > CANDLE_COUNT) candles.shift();
      liveClose    = newC.close;
      lastCandleTs = ts;
    }

    render(1);
    raf = requestAnimationFrame(animLive);
  }

  /* ── Scroll trigger ──────────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started  = true;
        candles  = buildHistory();
        liveClose = candles[candles.length - 1].close;
        resize();
        raf = requestAnimationFrame(animReveal);
      }
    });
  }, { threshold: 0.15 });

  io.observe(canvas);

  /* ── Redraw on theme change ──────────────────────────────────── */
  new MutationObserver(() => {
    if (started) render(1);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-contrast'],
  });

  /* ── Resize ──────────────────────────────────────────────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (started) { resize(); render(1); }
    }, 150);
  });

})();
