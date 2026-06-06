/* ─────────────────────────────────────────────────────────────
   Project page tile animations
   projCandles — RL policy network animation
   projStats   — cycling statistical visualizations
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function isLight() { return document.documentElement.dataset.theme === 'light'; }
  function onVisible(el, cb) {
    new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) cb(); });
    }, { threshold: 0.15 }).observe(el);
  }
  function watchTheme(cb) {
    new MutationObserver(cb).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
  }

  /* ── projCandles: RL policy network animation ─────────────── */
  (function () {
    const canvas = document.getElementById('projCandles');
    if (!canvas) return;

    let started = false, raf = null;
    let W = 0, H = 0;

    const layers = [4, 6, 5, 3];
    const actions = ['BUY', 'HOLD', 'SELL'];
    const rewards = [0.34, 0.58, 0.42, 0.76, 0.63, 0.86, 0.72, 0.91];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function nodePos(li, ni) {
      const padX = Math.max(34, W * 0.10);
      const padY = Math.max(30, H * 0.16);
      const x = padX + (li / (layers.length - 1)) * (W - padX * 2);
      const step = layers[li] > 1 ? (H - padY * 2) / (layers[li] - 1) : 0;
      return { x, y: padY + ni * step };
    }

    function render(ts) {
      const ctx = canvas.getContext('2d');
      const lt  = isLight();
      const teal = lt ? '22,148,136' : '38,166,154';
      const gold = lt ? '176,132,14' : '255,210,50';
      const red = lt ? '200,55,50' : '239,83,80';
      const text = lt ? '0,0,0' : '255,255,255';
      const t = ts * 0.001;
      ctx.clearRect(0, 0, W, H);

      for (let li = 0; li < layers.length - 1; li++) {
        for (let a = 0; a < layers[li]; a++) {
          const p1 = nodePos(li, a);
          for (let b = 0; b < layers[li + 1]; b++) {
            const p2 = nodePos(li + 1, b);
            const phase = (t * 0.75 + li * 0.34 + a * 0.11 + b * 0.07) % 1;
            const pulse = Math.max(0, 1 - Math.abs(phase - 0.5) * 5);
            ctx.strokeStyle = `rgba(${teal},${0.10 + pulse * 0.32})`;
            ctx.lineWidth = 0.7 + pulse * 1.1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      layers.forEach((count, li) => {
        for (let ni = 0; ni < count; ni++) {
          const { x, y } = nodePos(li, ni);
          const pulse = (Math.sin(t * 2.4 + li * 1.2 + ni * 0.8) + 1) / 2;
          ctx.beginPath();
          ctx.arc(x, y, 4.5 + pulse * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${teal},${0.20 + pulse * 0.36})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${teal},${0.55 + pulse * 0.30})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      const panelW = Math.min(148, W * 0.34);
      const panelX = W - panelW - Math.max(18, W * 0.05);
      const panelY = Math.max(20, H * 0.12);
      ctx.font = '10px var(--font-mono,monospace)';
      ctx.textAlign = 'left';
      actions.forEach((label, i) => {
        const active = (Math.floor(t * 1.6) + i) % actions.length === 0;
        const y = panelY + i * 24;
        const color = label === 'SELL' ? red : (label === 'HOLD' ? gold : teal);
        ctx.fillStyle = `rgba(${color},${active ? 0.22 : 0.08})`;
        ctx.fillRect(panelX, y, panelW, 16);
        ctx.fillStyle = `rgba(${color},${active ? 0.95 : 0.45})`;
        ctx.fillText(label, panelX + 8, y + 11);
        ctx.fillStyle = `rgba(${text},${active ? 0.55 : 0.28})`;
        ctx.textAlign = 'right';
        ctx.fillText((0.18 + ((Math.sin(t + i) + 1) / 2) * 0.72).toFixed(2), panelX + panelW - 8, y + 11);
        ctx.textAlign = 'left';
      });

      const baseX = Math.max(20, W * 0.06);
      const baseY = H - Math.max(50, H * 0.18);
      const barW = Math.min(18, W * 0.035);
      const maxH = Math.min(80, H * 0.28);
      rewards.forEach((v, i) => {
        const h = Math.max(4, (v + Math.sin(t * 1.4 + i * 0.7) * 0.08) * maxH);
        const x = baseX + i * (barW + 6);
        ctx.fillStyle = `rgba(${gold},0.16)`;
        ctx.fillRect(x, baseY - maxH, barW, maxH);
        ctx.fillStyle = `rgba(${gold},0.62)`;
        ctx.fillRect(x, baseY - h, barW, h);
      });

      ctx.fillStyle = `rgba(${text},0.38)`;
      ctx.font = '10px var(--font-mono,monospace)';
      ctx.fillText('policy gradient', baseX, baseY + 18);
    }

    function loop(ts) {
      render(ts);
      raf = requestAnimationFrame(loop);
    }

    onVisible(canvas, () => {
      if (started) return; started = true;
      resize();
      raf = requestAnimationFrame(loop);
    });
    watchTheme(() => { if (started) render(performance.now()); });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (started) resize(); }, 150); });
  })();

  /* ── projStats: cycling statistical visualizations ───────── */
  (function () {
    const canvas = document.getElementById('projStats');
    if (!canvas) return;

    let started = false;
    const DRAW_MS = 1800, HOLD_MS = 4000, FADE_MS = 480;

    function randn() { const u = Math.random() || 1e-9, v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    const scatterPts = Array.from({ length: 38 }, () => { const x = (Math.random() - 0.5) * 3.8; return { x, y: 0.60 * x + randn() * 0.68 }; }).sort((a, b) => a.x - b.x);
    const smx = scatterPts.reduce((s, p) => s + p.x, 0) / scatterPts.length;
    const smy = scatterPts.reduce((s, p) => s + p.y, 0) / scatterPts.length;
    const snum = scatterPts.reduce((s, p) => s + (p.x - smx) * (p.y - smy), 0);
    const sden = Math.sqrt(scatterPts.reduce((s, p) => s + (p.x - smx) ** 2, 0) * scatterPts.reduce((s, p) => s + (p.y - smy) ** 2, 0));
    const pearsonR = sden ? snum / sden : 0;
    const slope = snum / (scatterPts.reduce((s, p) => s + (p.x - smx) ** 2, 0) || 1);
    const intercept = smy - slope * smx;

    const boxA = Array.from({ length: 55 }, () => randn() * 0.80 + 0.40).sort((a, b) => a - b);
    const boxB = Array.from({ length: 55 }, () => randn() * 1.05 - 0.50).sort((a, b) => a - b);
    function qtls(arr) { const q = p => { const i = p * (arr.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return arr[lo] + (arr[hi] - arr[lo]) * (i - lo); }; return { min: arr[0], q1: q(0.25), med: q(0.5), q3: q(0.75), max: arr[arr.length - 1] }; }
    const qA = qtls(boxA), qB = qtls(boxB);

    function gauss(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); }

    function resize() {
      const dpr = window.devicePixelRatio || 1, r = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    }
    function wh() { const dpr = window.devicePixelRatio || 1; return { W: canvas.width / dpr, H: canvas.height / dpr, dpr }; }

    function viewBell(ctx, W, H, frac) {
      const lt = isLight(), teal = lt ? '22,148,136' : '38,166,154';
      const P = { t: 28, r: 22, b: 42, l: 22 }, cW = W - P.l - P.r, cH = H - P.t - P.b;
      const xMin = -3.5, xMax = 3.5, maxY = gauss(0);
      const tx = x => P.l + ((x - xMin) / (xMax - xMin)) * cW;
      const ty = y => P.t + cH * (1 - y / (maxY * 1.18));
      const BARS = 16, bSlot = cW / BARS;
      for (let i = 0; i < BARS; i++) {
        const prog = frac * BARS - i; if (prog <= 0) break;
        const lf = Math.min(1, prog), xc = xMin + (i + 0.5) * (xMax - xMin) / BARS;
        const bH = (gauss(xc) / (maxY * 1.18)) * cH * lf;
        ctx.fillStyle = `rgba(${teal},${0.22 * lf})`;
        ctx.fillRect(tx(xc) - bSlot * 0.38, P.t + cH - bH, bSlot * 0.76, bH);
      }
      const STEPS = 220, drawn = Math.floor(frac * STEPS);
      if (drawn > 1) {
        ctx.beginPath();
        for (let i = 0; i <= drawn; i++) { const x = xMin + (i / STEPS) * (xMax - xMin); i === 0 ? ctx.moveTo(tx(x), ty(gauss(x))) : ctx.lineTo(tx(x), ty(gauss(x))); }
        ctx.lineTo(tx(xMin + (drawn / STEPS) * (xMax - xMin)), P.t + cH); ctx.lineTo(tx(xMin), P.t + cH); ctx.closePath();
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
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.l, P.t + cH); ctx.lineTo(P.l + cW, P.t + cH); ctx.stroke();
    }

    function viewScatter(ctx, W, H, frac) {
      const lt = isLight(), teal = lt ? '22,148,136' : '38,166,154';
      const P = { t: 24, r: 24, b: 30, l: 28 }, cW = W - P.l - P.r, cH = H - P.t - P.b;
      const xMin = -2.4, xMax = 2.4, yMin = -2.4, yMax = 2.4;
      const tx = x => P.l + ((x - xMin) / (xMax - xMin)) * cW;
      const ty = y => P.t + cH * (1 - (y - yMin) / (yMax - yMin));
      const ga = Math.min(1, frac * 4);
      ctx.save(); ctx.setLineDash([2, 4]); ctx.lineWidth = 0.5;
      [-2,-1,0,1,2].forEach(v => {
        ctx.strokeStyle = lt ? `rgba(0,0,0,${0.07*ga})` : `rgba(255,255,255,${0.07*ga})`;
        ctx.beginPath(); ctx.moveTo(tx(v), P.t); ctx.lineTo(tx(v), P.t+cH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P.l, ty(v)); ctx.lineTo(P.l+cW, ty(v)); ctx.stroke();
      });
      ctx.restore();
      ctx.font = '9px var(--font-mono,monospace)'; ctx.textAlign = 'center';
      [-2,-1,0,1,2].forEach(v => {
        ctx.fillStyle = lt ? `rgba(0,0,0,${0.30*ga})` : `rgba(255,255,255,${0.30*ga})`;
        ctx.fillText(v, tx(v), P.t + cH + 14);
      });
      const ptFrac = Math.min(1, frac / 0.70), nShow = Math.floor(ptFrac * scatterPts.length);
      for (let i = 0; i < nShow; i++) {
        const p = scatterPts[i], lf = (i === nShow - 1) ? (ptFrac * scatterPts.length - i) : 1;
        ctx.beginPath(); ctx.arc(tx(p.x), ty(p.y), 2.8, 0, 2 * Math.PI);
        ctx.fillStyle = lt ? `rgba(22,148,136,${0.60*lf})` : `rgba(38,166,154,${0.70*lf})`; ctx.fill();
      }
      if (frac > 0.70) {
        const rf = Math.min(1, (frac - 0.70) / 0.30), x0 = xMin, x1 = xMin + (xMax - xMin) * rf;
        ctx.beginPath(); ctx.moveTo(tx(x0), ty(slope * x0 + intercept)); ctx.lineTo(tx(x1), ty(slope * x1 + intercept));
        ctx.strokeStyle = lt ? 'rgba(22,148,136,0.85)' : 'rgba(38,166,154,0.90)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = lt ? `rgba(22,148,136,${0.85*rf})` : `rgba(38,166,154,${0.95*rf})`;
        ctx.font = '10px var(--font-mono,monospace)'; ctx.textAlign = 'right';
        ctx.fillText(`r = ${pearsonR.toFixed(2)}`, P.l + cW - 2, P.t + 14);
      }
    }

    function viewBoxPlot(ctx, W, H, frac) {
      const lt = isLight();
      const P = { t: 40, r: 30, b: 34, l: 38 }, cW = W - P.l - P.r, cH = H - P.t - P.b;
      const valMin = -3.5, valMax = 3.5;
      const tv = v => P.l + ((v - valMin) / (valMax - valMin)) * cW;
      const boxH = Math.min(36, cH * 0.22), ga = Math.min(1, frac * 4);
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
      [{ q: qA, label: 'A  μ≈+0.4', y: P.t + cH * 0.30 }, { q: qB, label: 'B  μ≈−0.5', y: P.t + cH * 0.70 }].forEach(({ q, label, y }, gi) => {
        const gf = Math.min(1, Math.max(0, (frac - gi * 0.16) / 0.84));
        if (gf <= 0) return;
        const wf = Math.min(1, gf / 0.35), bf = Math.min(1, Math.max(0, (gf - 0.35) / 0.45)), mf = Math.min(1, Math.max(0, (gf - 0.80) / 0.20));
        const minX = tv(q.q1 - (q.q1 - q.min) * wf), maxX = tv(q.q3 + (q.max - q.q3) * wf);
        ctx.strokeStyle = lt ? `rgba(22,148,136,${0.65*wf})` : `rgba(38,166,154,${0.72*wf})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tv(q.q1), y); ctx.lineTo(minX, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tv(q.q3), y); ctx.lineTo(maxX, y); ctx.stroke();
        if (wf > 0.5) {
          const cf = (wf - 0.5) * 2;
          ctx.strokeStyle = lt ? `rgba(22,148,136,${0.45*cf})` : `rgba(38,166,154,${0.50*cf})`;
          ctx.beginPath(); ctx.moveTo(minX, y - boxH*0.28); ctx.lineTo(minX, y + boxH*0.28); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(maxX, y - boxH*0.28); ctx.lineTo(maxX, y + boxH*0.28); ctx.stroke();
        }
        if (bf > 0) {
          const bL = tv(q.med - (q.med - q.q1) * bf), bR = tv(q.med + (q.q3 - q.med) * bf);
          ctx.fillStyle = lt ? `rgba(22,148,136,${0.15*bf})` : `rgba(38,166,154,${0.18*bf})`;
          ctx.strokeStyle = lt ? `rgba(22,148,136,${0.65*bf})` : `rgba(38,166,154,${0.72*bf})`; ctx.lineWidth = 1.5;
          ctx.fillRect(bL, y - boxH/2, bR - bL, boxH); ctx.strokeRect(bL, y - boxH/2, bR - bL, boxH);
        }
        if (mf > 0) {
          ctx.strokeStyle = lt ? `rgba(22,148,136,${mf})` : `rgba(38,166,154,${mf})`; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(tv(q.med), y - boxH/2 * mf); ctx.lineTo(tv(q.med), y + boxH/2 * mf); ctx.stroke();
        }
        ctx.fillStyle = lt ? `rgba(0,0,0,${0.36*gf})` : `rgba(255,255,255,${0.36*gf})`;
        ctx.font = '9px var(--font-mono,monospace)'; ctx.textAlign = 'right';
        ctx.fillText(label, P.l - 4, y + 4);
      });
    }

    const VIEWS = [viewBell, viewScatter, viewBoxPlot];
    let viewIdx = 0, holdTO = null;

    function runCycle(idx) {
      viewIdx = idx % VIEWS.length;
      const fn = VIEWS[viewIdx];
      let drawStart = null;
      function animIn(ts) {
        if (!drawStart) drawStart = ts;
        const t = Math.min(1, (ts - drawStart) / DRAW_MS), ease = 1 - Math.pow(1 - t, 3);
        const { W, H, dpr } = wh(), ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        fn(ctx, W, H, ease);
        if (t < 1) { requestAnimationFrame(animIn); } else { holdTO = setTimeout(startFade, HOLD_MS); }
      }
      function startFade() {
        let fadeStart = null;
        function animOut(ts) {
          if (!fadeStart) fadeStart = ts;
          const t = Math.min(1, (ts - fadeStart) / FADE_MS);
          const { W, H, dpr } = wh(), ctx = canvas.getContext('2d');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
          ctx.globalAlpha = 1 - t; fn(ctx, W, H, 1); ctx.globalAlpha = 1;
          if (t < 1) { requestAnimationFrame(animOut); } else { runCycle(viewIdx + 1); }
        }
        requestAnimationFrame(animOut);
      }
      requestAnimationFrame(animIn);
    }

    onVisible(canvas, () => {
      if (started) return; started = true;
      resize(); runCycle(0);
    });
    watchTheme(() => {});
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (started) resize(); }, 150); });
  })();

})();
