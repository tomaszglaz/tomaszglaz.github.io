/* ─────────────────────────────────────────────────────────────
   Tile canvas animations — homepage feature tiles
   1. statsCanvas  — bell curve + histogram
   2. tileCandles  — mini live candlestick chart
   3. emailCanvas  — typing email animation
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function isLight() {
    return document.documentElement.dataset.theme === 'light';
  }

  function watchTheme(cb) {
    new MutationObserver(cb).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
  }

  function onVisible(el, cb) {
    new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) cb(); });
    }, { threshold: 0.15 }).observe(el);
  }

  /* ── 1. Stats tile — cycling statistical visualizations ───── */
  (function initStats() {
    const canvas = document.getElementById('statsCanvas');
    if (!canvas) return;

    let started = false;
    const DRAW_MS = 1800, HOLD_MS = 4000, FADE_MS = 480;

    /* ── stable random data (generated once) ── */
    function randn() {
      const u = Math.random() || 1e-9, v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /* scatter: y ≈ 0.60·x + noise, sorted by x for draw-in */
    const scatterPts = Array.from({ length: 38 }, () => {
      const x = (Math.random() - 0.5) * 3.8;
      return { x, y: 0.60 * x + randn() * 0.68 };
    }).sort((a, b) => a.x - b.x);

    /* pearson r & regression coefficients */
    const smx = scatterPts.reduce((s, p) => s + p.x, 0) / scatterPts.length;
    const smy = scatterPts.reduce((s, p) => s + p.y, 0) / scatterPts.length;
    const snum = scatterPts.reduce((s, p) => s + (p.x - smx) * (p.y - smy), 0);
    const sden = Math.sqrt(
      scatterPts.reduce((s, p) => s + (p.x - smx) ** 2, 0) *
      scatterPts.reduce((s, p) => s + (p.y - smy) ** 2, 0)
    );
    const pearsonR = sden ? snum / sden : 0;
    const slope = snum / (scatterPts.reduce((s, p) => s + (p.x - smx) ** 2, 0) || 1);
    const intercept = smy - slope * smx;

    /* box data: two groups */
    const boxA = Array.from({ length: 55 }, () => randn() * 0.80 + 0.40).sort((a, b) => a - b);
    const boxB = Array.from({ length: 55 }, () => randn() * 1.05 - 0.50).sort((a, b) => a - b);
    function qtls(arr) {
      const q = p => { const i = p * (arr.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return arr[lo] + (arr[hi] - arr[lo]) * (i - lo); };
      return { min: arr[0], q1: q(0.25), med: q(0.5), q3: q(0.75), max: arr[arr.length - 1] };
    }
    const qA = qtls(boxA), qB = qtls(boxB);

    function gauss(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

    /* ── canvas resize ── */
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.parentElement.getBoundingClientRect();
      canvas.width  = Math.round(r.width  * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width  = r.width  + 'px';
      canvas.style.height = r.height + 'px';
    }
    function wh() {
      const dpr = window.devicePixelRatio || 1;
      return { W: canvas.width / dpr, H: canvas.height / dpr, dpr };
    }

    /* ── VIEW A: bell curve + histogram ── */
    function viewBell(ctx, W, H, frac) {
      const lt = isLight(), teal = lt ? '22,148,136' : '38,166,154';
      const P = { t: 28, r: 22, b: 42, l: 22 };
      const cW = W - P.l - P.r, cH = H - P.t - P.b;
      const xMin = -3.5, xMax = 3.5, maxY = gauss(0);
      const tx = x => P.l + ((x - xMin) / (xMax - xMin)) * cW;
      const ty = y => P.t + cH * (1 - y / (maxY * 1.18));
      const BARS = 16, bSlot = cW / BARS;

      for (let i = 0; i < BARS; i++) {
        const prog = frac * BARS - i; if (prog <= 0) break;
        const lf = Math.min(1, prog);
        const xc = xMin + (i + 0.5) * (xMax - xMin) / BARS;
        const bH = (gauss(xc) / (maxY * 1.18)) * cH * lf;
        ctx.fillStyle = `rgba(${teal},${0.22 * lf})`;
        ctx.fillRect(tx(xc) - bSlot * 0.38, P.t + cH - bH, bSlot * 0.76, bH);
      }

      const STEPS = 220, drawn = Math.floor(frac * STEPS);
      if (drawn > 1) {
        ctx.beginPath();
        for (let i = 0; i <= drawn; i++) { const x = xMin + (i / STEPS) * (xMax - xMin); i === 0 ? ctx.moveTo(tx(x), ty(gauss(x))) : ctx.lineTo(tx(x), ty(gauss(x))); }
        ctx.lineTo(tx(xMin + (drawn / STEPS) * (xMax - xMin)), P.t + cH);
        ctx.lineTo(tx(xMin), P.t + cH); ctx.closePath();
        const g = ctx.createLinearGradient(0, P.t, 0, P.t + cH);
        g.addColorStop(0, `rgba(${teal},0.36)`); g.addColorStop(1, `rgba(${teal},0.04)`);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath();
        for (let i = 0; i <= drawn; i++) { const x = xMin + (i / STEPS) * (xMax - xMin); i === 0 ? ctx.moveTo(tx(x), ty(gauss(x))) : ctx.lineTo(tx(x), ty(gauss(x))); }
        ctx.strokeStyle = `rgba(${teal},0.90)`; ctx.lineWidth = 2; ctx.stroke();
      }

      if (frac > 0.60) {
        const sf = Math.min(1, (frac - 0.60) / 0.40);
        ctx.save(); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        [-2, -1, 1, 2].forEach(s => {
          ctx.strokeStyle = lt ? `rgba(0,0,0,${0.12*sf})` : `rgba(255,255,255,${0.13*sf})`;
          ctx.beginPath(); ctx.moveTo(tx(s), P.t); ctx.lineTo(tx(s), P.t + cH); ctx.stroke();
          ctx.fillStyle = lt ? `rgba(0,0,0,${0.40*sf})` : `rgba(255,255,255,${0.40*sf})`;
          ctx.font = '10px var(--font-mono,monospace)'; ctx.textAlign = 'center';
          ctx.fillText(`${s}σ`, tx(s), P.t + cH + 16);
        });
        ctx.restore();
      }
      const aa = Math.min(1, frac * 2.5);
      ctx.strokeStyle = lt ? `rgba(0,0,0,${0.18*aa})` : `rgba(255,255,255,${0.18*aa})`;
      ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(P.l, P.t + cH); ctx.lineTo(P.l + cW, P.t + cH); ctx.stroke();
    }

    /* ── VIEW B: scatter plot + regression line ── */
    function viewScatter(ctx, W, H, frac) {
      const lt = isLight(), teal = lt ? '22,148,136' : '38,166,154';
      const P = { t: 24, r: 24, b: 30, l: 28 };
      const cW = W - P.l - P.r, cH = H - P.t - P.b;
      const xMin = -2.4, xMax = 2.4, yMin = -2.4, yMax = 2.4;
      const tx = x => P.l + ((x - xMin) / (xMax - xMin)) * cW;
      const ty = y => P.t + cH * (1 - (y - yMin) / (yMax - yMin));
      const ga = Math.min(1, frac * 4);

      /* grid */
      ctx.save(); ctx.setLineDash([2, 4]); ctx.lineWidth = 0.5;
      [-2,-1,0,1,2].forEach(v => {
        ctx.strokeStyle = lt ? `rgba(0,0,0,${0.07*ga})` : `rgba(255,255,255,${0.07*ga})`;
        ctx.beginPath(); ctx.moveTo(tx(v), P.t);     ctx.lineTo(tx(v), P.t+cH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P.l,   ty(v));   ctx.lineTo(P.l+cW, ty(v)); ctx.stroke();
      });
      ctx.restore();

      /* axis numbers */
      ctx.font = '9px var(--font-mono,monospace)'; ctx.textAlign = 'center';
      [-2,-1,0,1,2].forEach(v => {
        ctx.fillStyle = lt ? `rgba(0,0,0,${0.30*ga})` : `rgba(255,255,255,${0.30*ga})`;
        ctx.fillText(v, tx(v), P.t + cH + 14);
      });

      /* points appear left-to-right (0–70 % of frac) */
      const ptFrac = Math.min(1, frac / 0.70);
      const nShow  = Math.floor(ptFrac * scatterPts.length);
      for (let i = 0; i < nShow; i++) {
        const p  = scatterPts[i];
        const lf = (i === nShow - 1) ? (ptFrac * scatterPts.length - i) : 1;
        ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), 2.8, 0, 2 * Math.PI);
        ctx.fillStyle = lt ? `rgba(22,148,136,${0.60*lf})` : `rgba(38,166,154,${0.70*lf})`;
        ctx.fill();
      }

      /* regression line draws itself (70–100 %) */
      if (frac > 0.70) {
        const rf = Math.min(1, (frac - 0.70) / 0.30);
        const x0 = xMin, x1 = xMin + (xMax - xMin) * rf;
        ctx.beginPath();
        ctx.moveTo(tx(x0), ty(slope * x0 + intercept));
        ctx.lineTo(tx(x1), ty(slope * x1 + intercept));
        ctx.strokeStyle = lt ? 'rgba(22,148,136,0.85)' : 'rgba(38,166,154,0.90)';
        ctx.lineWidth = 2; ctx.stroke();
        /* r label */
        ctx.fillStyle = lt ? `rgba(22,148,136,${0.85*rf})` : `rgba(38,166,154,${0.95*rf})`;
        ctx.font = '10px var(--font-mono,monospace)'; ctx.textAlign = 'right';
        ctx.fillText(`r = ${pearsonR.toFixed(2)}`, P.l + cW - 2, P.t + 14);
      }
    }

    /* ── VIEW C: box-and-whisker (2 groups) ── */
    function viewBoxPlot(ctx, W, H, frac) {
      const lt = isLight(), teal = lt ? '22,148,136' : '38,166,154';
      const P = { t: 40, r: 30, b: 34, l: 38 };
      const cW = W - P.l - P.r, cH = H - P.t - P.b;
      const valMin = -3.5, valMax = 3.5;
      const tv  = v => P.l + ((v - valMin) / (valMax - valMin)) * cW;
      const boxH = Math.min(36, cH * 0.22);
      const ga   = Math.min(1, frac * 4);

      /* vertical grid lines */
      ctx.save(); ctx.setLineDash([2, 5]); ctx.lineWidth = 0.5;
      [-3,-2,-1,0,1,2,3].forEach(v => {
        ctx.strokeStyle = lt ? `rgba(0,0,0,${0.06*ga})` : `rgba(255,255,255,${0.06*ga})`;
        ctx.beginPath(); ctx.moveTo(tv(v), P.t); ctx.lineTo(tv(v), P.t+cH); ctx.stroke();
      });
      ctx.restore();
      ctx.font = '9px var(--font-mono,monospace)'; ctx.textAlign = 'center';
      [-2,-1,0,1,2].forEach(v => {
        ctx.fillStyle = lt ? `rgba(0,0,0,${0.30*ga})` : `rgba(255,255,255,${0.30*ga})`;
        ctx.fillText(v, tv(v), P.t + cH + 16);
      });

      /* two box plots staggered in time */
      [
        { q: qA, label: 'A  μ≈+0.4', y: P.t + cH * 0.30 },
        { q: qB, label: 'B  μ≈−0.5', y: P.t + cH * 0.70 },
      ].forEach(({ q, label, y }, gi) => {
        const gf = Math.min(1, Math.max(0, (frac - gi * 0.16) / 0.84));
        if (gf <= 0) return;
        const wf = Math.min(1, gf / 0.35);
        const bf = Math.min(1, Math.max(0, (gf - 0.35) / 0.45));
        const mf = Math.min(1, Math.max(0, (gf - 0.80) / 0.20));

        /* whiskers */
        const minX = tv(q.q1 - (q.q1 - q.min) * wf);
        const maxX = tv(q.q3 + (q.max - q.q3) * wf);
        ctx.strokeStyle = lt ? `rgba(22,148,136,${0.65*wf})` : `rgba(38,166,154,${0.72*wf})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tv(q.q1), y); ctx.lineTo(minX, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tv(q.q3), y); ctx.lineTo(maxX, y); ctx.stroke();
        if (wf > 0.5) {
          const cf = (wf - 0.5) * 2;
          ctx.strokeStyle = lt ? `rgba(22,148,136,${0.45*cf})` : `rgba(38,166,154,${0.50*cf})`;
          ctx.beginPath(); ctx.moveTo(minX, y - boxH*0.28); ctx.lineTo(minX, y + boxH*0.28); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(maxX, y - boxH*0.28); ctx.lineTo(maxX, y + boxH*0.28); ctx.stroke();
        }

        /* box grows from median outward */
        if (bf > 0) {
          const bL = tv(q.med - (q.med - q.q1) * bf);
          const bR = tv(q.med + (q.q3 - q.med) * bf);
          ctx.fillStyle   = lt ? `rgba(22,148,136,${0.15*bf})` : `rgba(38,166,154,${0.18*bf})`;
          ctx.strokeStyle = lt ? `rgba(22,148,136,${0.65*bf})` : `rgba(38,166,154,${0.72*bf})`;
          ctx.lineWidth = 1.5;
          ctx.fillRect(bL, y - boxH/2, bR - bL, boxH);
          ctx.strokeRect(bL, y - boxH/2, bR - bL, boxH);
        }

        /* median line */
        if (mf > 0) {
          ctx.strokeStyle = lt ? `rgba(22,148,136,${mf})` : `rgba(38,166,154,${mf})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tv(q.med), y - boxH/2 * mf); ctx.lineTo(tv(q.med), y + boxH/2 * mf);
          ctx.stroke();
        }

        /* row label */
        ctx.fillStyle = lt ? `rgba(0,0,0,${0.36*gf})` : `rgba(255,255,255,${0.36*gf})`;
        ctx.font = '9px var(--font-mono,monospace)'; ctx.textAlign = 'right';
        ctx.fillText(label, P.l - 4, y + 4);
      });
    }

    /* ── animation engine ── */
    const VIEWS = [viewBell, viewScatter, viewBoxPlot];
    let viewIdx = 0, holdTO = null;

    function runCycle(idx) {
      viewIdx = idx % VIEWS.length;
      const fn = VIEWS[viewIdx];
      let drawStart = null;

      function animIn(ts) {
        if (!drawStart) drawStart = ts;
        const t = Math.min(1, (ts - drawStart) / DRAW_MS);
        const ease = 1 - Math.pow(1 - t, 3);
        const { W, H, dpr } = wh();
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        fn(ctx, W, H, ease);
        if (t < 1) { requestAnimationFrame(animIn); }
        else { holdTO = setTimeout(startFade, HOLD_MS); }
      }

      function startFade() {
        let fadeStart = null;
        function animOut(ts) {
          if (!fadeStart) fadeStart = ts;
          const t = Math.min(1, (ts - fadeStart) / FADE_MS);
          const { W, H, dpr } = wh();
          const ctx = canvas.getContext('2d');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W, H);
          ctx.globalAlpha = 1 - t;
          fn(ctx, W, H, 1);
          ctx.globalAlpha = 1;
          if (t < 1) { requestAnimationFrame(animOut); }
          else { runCycle(viewIdx + 1); }
        }
        requestAnimationFrame(animOut);
      }

      requestAnimationFrame(animIn);
    }

    onVisible(canvas, () => {
      if (started) return;
      started = true;
      resize();
      runCycle(0);
    });
    watchTheme(() => { /* colors re-read on next draw frame */ });
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (started) resize(); }, 150);
    });
  })();

  /* ── 2. Candle tile — mini live chart ──────────────────────── */
  (function initTileCandles() {
    const canvas = document.getElementById('tileCandles');
    if (!canvas) return;

    const N = 30, MA = 7, BODY = 0.50;
    const DRAW_MS = 1600, LIVE_INT = 2800, NOISE = 0.10;
    let candles = [], live = 0, lastTs = 0;
    let started = false, animStart = null, raf = null;
    let W = 0, H = 0;

    function makeC(p, i) {
      const b   = Math.sin(i / 6) * 0.6 + Math.sin(i / 15) * 0.4;
      const vol = 1.5 + Math.abs(b) * 0.8;
      const d   = Math.random() > 0.5 - b * 0.12 ? 1 : -1;
      const body = (Math.random() * vol + 0.3) * d;
      const o = p + (Math.random() - 0.5) * 0.2, cl = o + body;
      return {
        open: o, close: cl,
        high: Math.max(o, cl) + Math.random() * Math.abs(body) * 0.6 + 0.1,
        low:  Math.min(o, cl) - Math.random() * Math.abs(body) * 0.6 + 0.1,
      };
    }

    function resize() {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render(frac) {
      const ctx  = canvas.getContext('2d');
      const lt   = isLight();
      const BULL = lt ? 'rgba(22,148,136,0.88)' : 'rgba(38,166,154,0.90)';
      const BEAR = lt ? 'rgba(200,55,50,0.85)'  : 'rgba(239,83,80,0.90)';
      const MACLR = lt ? 'rgba(180,130,0,0.70)' : 'rgba(255,210,50,0.75)';
      const PAD  = { top: 12, right: 8, bottom: 10, left: 8 };
      const cW   = W - PAD.left - PAD.right;
      const cH   = H - PAD.top  - PAD.bottom;
      ctx.clearRect(0, 0, W, H);

      const disp = candles.map((c, i) =>
        i === candles.length - 1 && live
          ? { ...c, close: live, high: Math.max(c.high, live), low: Math.min(c.low, live) }
          : c
      );

      let lo = Infinity, hi = -Infinity;
      disp.forEach(c => { if (c.low < lo) lo = c.low; if (c.high > hi) hi = c.high; });
      const pr  = (hi - lo) || 1;
      const plo = lo - pr * 0.06, phi = hi + pr * 0.06;
      const py  = p => PAD.top + cH * (1 - (p - plo) / (phi - plo));

      const slotW = cW / N;
      const bodyW = Math.max(1.5, slotW * BODY);
      const raw   = frac * N;
      const full  = Math.floor(raw);
      const pf    = raw - full;
      const total = Math.min(N, full + (frac < 1 ? 1 : 0));

      /* MA line */
      ctx.beginPath(); ctx.strokeStyle = MACLR; ctx.lineWidth = 1.2;
      let mm = false;
      for (let i = 0; i < total; i++) {
        if (i < MA - 1) continue;
        const sl = disp.slice(i - MA + 1, i + 1);
        const ma = sl.reduce((s, c) => s + c.close, 0) / MA;
        const x = PAD.left + (i + 0.5) * slotW, y = py(ma);
        mm ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), mm = true);
      }
      ctx.stroke();

      /* Candles */
      for (let i = 0; i < total; i++) {
        const c    = disp[i];
        const bull = c.close >= c.open;
        const x    = PAD.left + (i + 0.5) * slotW;
        let   sy   = 1;
        if (i === full && frac < 1) {
          const t = pf;
          sy = t < 0.7 ? t / 0.7 : 1 + Math.sin((t - 0.7) / 0.3 * Math.PI) * 0.08;
          sy = Math.max(0, sy);
        }
        ctx.strokeStyle = bull ? BULL : BEAR;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(x, py(c.high)); ctx.lineTo(x, py(c.low)); ctx.stroke();
        const top = py(Math.max(c.open, c.close));
        const bot = py(Math.min(c.open, c.close));
        const bh  = Math.max(1.5, bot - top);
        const mid = top + bh / 2;
        ctx.save();
        ctx.translate(x, mid); ctx.scale(1, sy); ctx.translate(-x, -mid);
        ctx.fillStyle = bull ? BULL : BEAR;
        ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
        ctx.restore();
      }
    }

    function animDraw(ts) {
      if (!animStart) animStart = ts;
      const t = Math.min(1, (ts - animStart) / DRAW_MS);
      render(1 - Math.pow(1 - t, 3));
      if (t < 1) {
        raf = requestAnimationFrame(animDraw);
      } else {
        live = candles[candles.length - 1].close;
        lastTs = ts;
        raf = requestAnimationFrame(animLive);
      }
    }

    function animLive(ts) {
      const last = candles[candles.length - 1];
      live += (Math.random() - 0.499) * NOISE;
      live = Math.max(last.low - 0.3, Math.min(last.high + 0.3, live));
      if (ts - lastTs > LIVE_INT) {
        const nc = makeC(live, candles.length);
        candles.push(nc);
        if (candles.length > N) candles.shift();
        live = nc.close; lastTs = ts;
      }
      render(1);
      raf = requestAnimationFrame(animLive);
    }

    onVisible(canvas, () => {
      if (started) return;
      started = true;
      let p = 130 + Math.random() * 20;
      for (let i = 0; i < N; i++) { const c = makeC(p, i); candles.push(c); p = c.close; }
      resize();
      raf = requestAnimationFrame(animDraw);
    });
    watchTheme(() => { if (started) render(1); });
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (started) { resize(); render(1); } }, 150);
    });
  })();

  /* ── 3. Email tile — typing animation ──────────────────────── */
  (function initEmail() {
    const canvas = document.getElementById('emailCanvas');
    if (!canvas) return;

    let started = false, animStart = null;
    const ANIM_MS = 2600;

    const LINES = [
      { t: 'From: tomasz@glaz.dev',                   type: 'hdr'  },
      { t: 'To: recruiter@company.com',                type: 'hdr'  },
      { t: 'Subject: RL / Python — Portfolio',         type: 'subj' },
      { t: '',                                         type: 'gap'  },
      { t: 'Hi,',                                      type: 'body' },
      { t: '',                                         type: 'gap'  },
      { t: "I'm a Financial Analytics student",        type: 'body' },
      { t: 'building trading bots with Deep RL',       type: 'body' },
      { t: 'and Python financial analyses.',           type: 'body' },
      { t: '',                                         type: 'gap'  },
      { t: 'Portfolio: github.com/tglaz',              type: 'link' },
      { t: 'Attached: CV_Tomasz_Glaz.pdf',             type: 'link' },
    ];

    function draw(frac, showCursor) {
      const dpr  = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const lt     = isLight();
      const PAD    = { top: 26, left: 22, right: 22, bottom: 16 };
      const LINE_H = 20;
      const FONT   = "11px 'Courier New', 'ui-monospace', monospace";
      const revealed = frac * (LINES.length + 1);

      LINES.forEach((line, i) => {
        if (i >= revealed || line.type === 'gap') return;
        const lf = Math.min(1, revealed - i);
        const y  = PAD.top + i * LINE_H;

        let alpha;
        if      (line.type === 'hdr')  alpha = 0.50 * lf;
        else if (line.type === 'subj') alpha = 0.80 * lf;
        else if (line.type === 'body') alpha = 0.64 * lf;
        else                           alpha = 0.88 * lf;   /* link */

        const color = line.type === 'link'
          ? `rgba(38,166,154,${alpha})`
          : (lt ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);

        /* Partial text while line is being typed */
        let text = line.t;
        if (i === Math.floor(revealed) - 1 && lf < 1 && line.t.length > 0) {
          text = line.t.slice(0, Math.floor(lf * line.t.length));
        }

        ctx.font      = FONT;
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(text, PAD.left, y + LINE_H * 0.72);

        /* Thin separator under subject block */
        if (line.type === 'subj') {
          ctx.strokeStyle = lt
            ? `rgba(0,0,0,${0.12 * lf})`
            : `rgba(255,255,255,${0.12 * lf})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(PAD.left, y + LINE_H);
          ctx.lineTo(W - PAD.right, y + LINE_H);
          ctx.stroke();
        }
      });

      /* Blinking text cursor */
      if (showCursor) {
        const ci = Math.min(LINES.length - 1, Math.floor(revealed));
        const cy = PAD.top + ci * LINE_H;
        const lf = Math.min(1, revealed - ci);
        const lineText = LINES[ci]?.t || '';
        ctx.font = FONT;
        const partial = frac < 1
          ? lineText.slice(0, Math.floor(lf * lineText.length))
          : lineText;
        const tw = ctx.measureText(partial).width;
        ctx.fillStyle = lt ? 'rgba(22,148,136,0.85)' : 'rgba(38,166,154,0.85)';
        ctx.fillRect(PAD.left + tw + 1, cy + 3, 1.5, LINE_H - 6);
      }
    }

    function animate(ts) {
      if (!animStart) animStart = ts;
      const t    = Math.min(1, (ts - animStart) / ANIM_MS);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      draw(ease, true);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        /* Keep cursor blinking after animation finishes */
        let visible = true;
        function blink() {
          draw(1, visible);
          visible = !visible;
          setTimeout(() => requestAnimationFrame(blink), 520);
        }
        requestAnimationFrame(blink);
      }
    }

    onVisible(canvas, () => {
      if (started) return;
      started = true;
      requestAnimationFrame(animate);
    });
    watchTheme(() => { if (started) draw(1, false); });
    window.addEventListener('resize', () => { if (started) draw(1, false); });
  })();

})();
