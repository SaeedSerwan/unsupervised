/*!
 * Unsupervised Lab — K-means page
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { M, DS, Plot, $ } = UL;
  const C = UL.color, S = UL.shape;

  const DATA = {
    blobs3: () => DS.blobs({ n: 150, k: 3, sd: 0.95, seed: 1 }),
    blobs4: () => DS.blobs({ n: 200, seed: 2, centers: [[-3.2, 3], [3, 3.3], [-3, -3], [3.4, -2.6]], sd: 1.05 }),
    blobs5: () => DS.blobs({ n: 220, seed: 12, centers: [[-3, 2], [0, 2.6], [3, 2], [-1.5, -1.2], [1.8, -1.4]], sd: 0.75 }),
    many: () => DS.many({}),
    varied: () => DS.varied({}),
    aniso: () => DS.aniso({}),
    moons: () => DS.moons({ n: 200, noise: 0.07 }),
    circles: () => DS.circles({ n: 220 }),
    uniform: () => DS.uniform({ n: 150 }),
  };
  const TRUEK = { blobs3: 3, blobs4: 4, blobs5: 5, many: 15, varied: 3, aniso: 3, moons: 2, circles: 2, uniform: 3 };
  const XY = (pts) => pts.map((p) => [p.x, p.y]);
  const W = (X, labels, k) => 2 * M.sse(X, labels, M.centroids(X, labels, k)); // lecture objective (pairwise form)
  const fmt = (v) => M.fmt(v, v < 100 ? 1 : 0);
  const drawPts = (plot, pts, labels, o = {}) => pts.forEach((p, i) => {
    const k = labels ? labels[i] : -1;
    plot.marker(p.x, p.y, { fill: k < 0 ? '#9a9a96' : C(k), shape: k < 0 ? 'circle' : S(k), r: o.r || 3.9, alpha: o.alpha });
  });
  const drawCentroids = (plot, Cs, o = {}) => Cs.forEach((c, k) => { if (c) plot.marker(c[0], c[1], { shape: 'cross', fill: o.ink ? UL.INK : C(k), r: o.r || 7, lw: 3 }); });

  /* ======================================================= be the algorithm */
  (function () {
    const plot = new Plot('#be-plot', { w: 560, h: 420, label: 'Drag the centroids' });
    const stats = $('#be-stats'), bars = $('#be-bars'), msg = $('#be-msg');
    let pts, X, cents, best = null, revealed = false, drag = -1, seed = 5, anim = null;
    const kR = UL.range('be-k', () => { reset(); });
    $('#be-data').addEventListener('change', () => { load(); reset(); });
    function load() { pts = DATA[$('#be-data').value](); X = XY(pts); plot.fit(pts, 0.08, true); }
    function reset() {
      const r = UL.rng(seed++), [x0, x1, y0, y1] = plot.dom;
      cents = Array.from({ length: kR.v }, () => [x0 + (x1 - x0) * (0.2 + 0.6 * r()), y0 + (y1 - y0) * (0.2 + 0.6 * r())]);
      best = M.kmeansBest(X, kR.v, 12, 3); revealed = false; draw();
    }
    function draw() {
      const labels = M.assign(X, cents), means = M.centroids(X, labels, kR.v);
      plot.clear();
      plot.regions((x, y) => M.assign([[x, y]], cents)[0], 7, 0.09);
      plot.frame();
      drawPts(plot, pts, labels);
      means.forEach((m, k) => { if (m) { plot.ctx.save(); plot.ctx.setLineDash([3, 3]); plot.marker(m[0], m[1], { shape: 'circle', r: 7, ring: false, stroke: C(k), lw: 1.6 }); plot.ctx.restore(); } });
      drawCentroids(plot, cents, { r: 8 });
      const per = means.map((_, k) => 2 * X.reduce((s, x, i) => s + (labels[i] === k ? M.d2(x, means[k]) : 0), 0));
      const tot = per.reduce((a, b) => a + b, 0), bW = W(X, best.labels, kR.v);
      stats.innerHTML = `<div class="stat"><span class="k">your total W</span><span class="v">${fmt(tot)}</span></div>` +
        `<div class="stat"><span class="k">K-means best</span><span class="v">${revealed ? fmt(bW) : '?'}</span></div>` +
        `<div class="stat"><span class="k">gap</span><span class="v">${revealed ? '+' + ((tot / bW - 1) * 100).toFixed(1) + '%' : '?'}</span></div>`;
      const mx = Math.max(...per, 1);
      bars.innerHTML = per.map((w, k) => `<div style="display:grid;grid-template-columns:5.5rem 1fr 4.5rem;align-items:center;gap:.6rem;font:.78rem var(--mono);margin:.25rem 0"><span style="color:var(--muted)">W(C<sub>${k + 1}</sub>)</span><span style="height:8px;border-radius:0 4px 4px 0;background:${C(k)};width:${(w / mx) * 100}%"></span><span style="text-align:right">${fmt(w)}</span></div>`).join('');
      msg.innerHTML = revealed ? 'The ✕ markers now sit at the best clustering K-means found (best of 12 starts). Notice each ✕ lies on top of its dashed ring.'
        : 'The <b>dashed ring</b> is the true mean of each coloured cluster. Moving a ✕ onto its ring, then letting points re-join, is exactly what K-means does.';
    }
    plot.cv.addEventListener('pointerdown', (e) => {
      const [px, py] = plot.pointer(e); let bd = 22 * 22; drag = -1;
      cents.forEach((c, k) => { const d = (plot.sx(c[0]) - px) ** 2 + (plot.sy(c[1]) - py) ** 2; if (d < bd) { bd = d; drag = k; } });
      if (drag >= 0) { plot.cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    plot.cv.addEventListener('pointermove', (e) => {
      const [px, py] = plot.pointer(e);
      if (drag < 0) { plot.cv.style.cursor = cents.some((c) => (plot.sx(c[0]) - px) ** 2 + (plot.sy(c[1]) - py) ** 2 < 22 * 22) ? 'grab' : 'default'; return; }
      plot.cv.style.cursor = 'grabbing'; cents[drag] = [plot.ix(px), plot.iy(py)]; revealed = false; draw();
    });
    plot.cv.addEventListener('pointerup', () => { drag = -1; });
    $('#be-shuffle').addEventListener('click', reset);
    $('#be-best').addEventListener('click', () => {
      const from = cents.map((c) => c.slice()), to = M.matchLabels(best.labels, M.assign(X, cents));
      // map best centroids to the user's colours so the animation is smooth
      const target = from.map((c, k) => { const idx = best.labels.findIndex((_, i) => to[i] === k); return idx >= 0 ? best.C[best.labels[idx]] : c; });
      const t0 = performance.now(); cancelAnimationFrame(anim);
      const tick = (t) => {
        const u = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - u, 3);
        cents = from.map((c, k) => [c[0] + (target[k][0] - c[0]) * e, c[1] + (target[k][1] - c[1]) * e]);
        revealed = u >= 1; draw(); if (u < 1) anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    });
    load(); reset();
  })();

  /* ======================================================= counting splits */
  (function () {
    const st = $('#cnt-stats'), foot = $('#cnt-foot');
    const big = (b) => { const s = b.toString(); return s.length <= 15 ? Number(b).toLocaleString('en-US') : `${s[0]}.${s.slice(1, 3)} × 10<sup>${s.length - 1}</sup>`; };
    let n = 10, k = 3;
    const draw = () => {
      const lab = BigInt(k) ** BigInt(n), part = M.stirling2(n, k);
      const secs = Number(part) / 1e9, yrs = secs / 3.156e7;
      let t; const ps = part.toString();
      if (ps.length > 30) t = `about 10<sup>${ps.length - 1 - 9 - 7}</sup> years`;
      else if (yrs > 1) t = `${M.fmt(yrs, 0)} years`; else if (secs > 1) t = `${M.fmt(secs, 1)} seconds`; else t = 'less than a second';
      st.innerHTML = `<div class="stat"><span class="k">ways to give each point a label (K<sup>n</sup>)</span><span class="v">${big(lab)}</span></div>` +
        `<div class="stat"><span class="k">distinct groupings (Stirling S(n, K))</span><span class="v">${big(part)}</span></div>` +
        `<div class="stat"><span class="k">time to check them all at 10⁹ per second</span><span class="v" style="font-size:1rem">${t}</span></div>`;
      foot.innerHTML = `With only <b>${n}</b> points and <b>${k}</b> clusters there are ${big(lab)} ways to hand out labels. Many of them describe the same grouping with the names swapped, so the number of truly different groupings is about K<sup>n</sup> / K! (a Stirling number of the second kind). Either way, it explodes.`;
    };
    UL.range('cnt-n', (v) => { n = v; draw(); }); UL.range('cnt-k', (v) => { k = v; draw(); }); draw();
  })();

  /* ============================================================= stepper */
  (function () {
    const plot = new Plot('#st-plot', { w: 560, h: 440, label: 'K-means animation' });
    const objP = new Plot('#st-obj', { w: 420, h: 150, pad: { l: 40, r: 10, t: 8, b: 24 } });
    const phaseEl = $('#st-phase'), expl = $('#st-explain'), stats = $('#st-stats');
    let pts, X, k, labels, cents, phase, iter, hist, trails, changed, seed = 11, timer = null;
    const kR = UL.range('st-k', () => reset());
    const sel = $('#st-data'), init = $('#st-init');
    sel.addEventListener('change', () => { kR.set(TRUEK[sel.value]); load(); reset(); });
    init.addEventListener('change', () => reset());
    $('#st-regions').addEventListener('change', draw); $('#st-trails').addEventListener('change', draw);
    function load() { pts = DATA[sel.value](); X = XY(pts); plot.fit(pts, 0.07, true); }
    function reset() {
      stop(); k = kR.v; labels = null; cents = null; phase = 'data'; iter = 0; hist = []; trails = []; changed = null; seed++;
      draw();
    }
    function record() { trails.push(cents.map((c) => (c ? c.slice() : null))); }
    function step() {
      const r = UL.rng(seed * 7 + 1), first = init.value === 'partition' ? 'update' : 'assign';
      if (phase === 'data') {
        if (init.value === 'partition') { labels = M.initRandomPartition(X.length, k, r); phase = 'random'; }
        else { cents = init.value === 'plusplus' ? M.initPlusPlus(X, k, r) : M.initForgy(X, k, r); phase = 'seeded'; record(); }
      } else if (phase === 'random' || phase === 'assign') {
        if (first === 'update') iter++;
        cents = M.centroids(X, labels, k).map((c, l) => c || (cents && cents[l]) || X[l % X.length].slice());
        phase = 'update'; record();
      } else if (phase === 'update' || phase === 'seeded') {
        if (first === 'assign') iter++;
        const nl = M.assign(X, cents);
        changed = labels ? nl.reduce((s, l, i) => s + (l !== labels[i] ? 1 : 0), 0) : X.length;
        labels = nl;
        hist.push(W(X, labels, k));
        if (changed === 0) { phase = 'done'; stop(); } else phase = 'assign';
      }
      draw();
    }
    function draw() {
      plot.clear();
      if (cents && $('#st-regions').checked) plot.regions((x, y) => M.assign([[x, y]], cents)[0], 7, 0.08);
      plot.frame();
      drawPts(plot, pts, labels);
      if (cents && $('#st-trails').checked && trails.length > 1) {
        for (let c = 0; c < k; c++) plot.poly(trails.map((t) => t[c]).filter(Boolean), { color: C(c), w: 1.6, dash: [4, 4], alpha: 0.9 });
      }
      if (cents) drawCentroids(plot, cents, { r: 8.5 });
      const P = {
        data: ['Raw data', 'No colours, no labels. Press <b>Step</b> to start.'],
        random: ['Step 1 · random labels', 'Every point gets a random cluster. It looks like a mess, and that is fine.'],
        seeded: ['Step 1 · starting centroids', init.value === 'plusplus' ? 'K-means++ chose spread-out starting centroids.' : 'K random data points became the starting centroids.'],
        update: [`Iteration ${iter} · Step 2a: update`, 'Each ✕ moves to the average (centroid) of its points.' + (iter === 1 && init.value === 'partition' ? ' Because the labels were random, all centroids start near the middle.' : '')],
        assign: [`Iteration ${iter} · Step 2b: assign`, `Every point joins its nearest ✕. <b>${changed}</b> point${changed === 1 ? '' : 's'} changed cluster.`],
        done: [`Converged after ${iter} iterations`, `A full round passed and no point changed cluster, so the algorithm stops. Total W = <b>${hist.length ? fmt(hist[hist.length - 1]) : ''}</b>.`],
      }[phase];
      phaseEl.innerHTML = P[0]; expl.innerHTML = P[1];
      stats.innerHTML = `<div class="stat"><span class="k">iteration</span><span class="v">${iter}</span></div>` +
        `<div class="stat"><span class="k">changed</span><span class="v">${changed == null ? '—' : changed}</span></div>` +
        `<div class="stat"><span class="k">total W</span><span class="v">${hist.length ? fmt(hist[hist.length - 1]) : '—'}</span></div>`;
      // objective chart
      objP.clear();
      if (hist.length) {
        const top = Math.max(...hist) * 1.08, lo = Math.min(...hist) * 0.92;
        objP.domain(0.5, Math.max(6, hist.length) + 0.5, lo, top, false).axes({ nx: Math.min(8, Math.max(6, hist.length)), ny: 3, fx: (v) => (Number.isInteger(v) ? v : ''), fy: (v) => M.fmt(v, 0) });
        objP.poly(hist.map((v, i) => [i + 1, v]), { color: UL.INK, w: 2 });
        hist.forEach((v, i) => objP.marker(i + 1, v, { fill: UL.INK, r: 3.6 }));
      } else { objP.textPx('the objective appears after the first assignment step', objP.W / 2, objP.H / 2, { color: UL.FAINT, font: '11px "IBM Plex Sans"' }); }
      $('#st-step').disabled = phase === 'done';
    }
    function stop() { clearInterval(timer); timer = null; $('#st-play').textContent = 'Play'; }
    $('#st-step').addEventListener('click', () => { stop(); step(); });
    $('#st-reset').addEventListener('click', reset);
    $('#st-play').addEventListener('click', () => {
      if (timer) return stop();
      if (phase === 'done') reset();
      $('#st-play').textContent = 'Pause';
      timer = setInterval(() => { step(); if (phase === 'done') stop(); }, 650);
    });
    load(); reset();
  })();

  /* ========================================================= local minima */
  (function () {
    const grid = $('#lm-grid'), foot = $('#lm-foot');
    const plots = Array.from({ length: 6 }, (_, i) => { const d = document.createElement('div'); d.className = 'plot'; grid.appendChild(d); return new Plot(d, { w: 320, h: 250, pad: { l: 8, r: 8, t: 28, b: 8 } }); });
    let base = 1;
    const kR = UL.range('lm-k', run);
    const sel = $('#lm-data');
    sel.addEventListener('change', () => { kR.set(TRUEK[sel.value]); run(); });
    $('#lm-init').addEventListener('change', run);
    $('#lm-run').addEventListener('click', () => { base += 6; run(); });
    function run() {
      const pts = DATA[sel.value](), X = XY(pts), k = kR.v;
      const res = plots.map((_, i) => M.kmeans(X, k, { seed: base + i * 13, init: $('#lm-init').value }));
      const objs = res.map((r) => W(X, r.labels, k)), bestV = Math.min(...objs);
      const ref = res[objs.indexOf(bestV)].labels;
      plots.forEach((p, i) => {
        const lab = M.matchLabels(res[i].labels, ref), isBest = objs[i] - bestV < 1e-6;
        p.clear().fit(pts, 0.05, true);
        drawPts(p, pts, lab, { r: 2.8 });
        p.ctx.strokeStyle = isBest ? UL.INK : UL.LINE; p.ctx.lineWidth = isBest ? 2 : 1;
        p.ctx.strokeRect(p.pad.l, p.pad.t, p.W - p.pad.l - p.pad.r, p.H - p.pad.t - p.pad.b);
        p.textPx(`W = ${fmt(objs[i])}`, p.pad.l, 14, { align: 'left', font: `${isBest ? 500 : 400} 12px "IBM Plex Mono"`, color: isBest ? UL.INK : UL.MUTED });
        if (isBest) p.textPx('best', p.W - p.pad.r, 14, { align: 'right', font: '500 11px "IBM Plex Mono"' });
      });
      const nBest = objs.filter((o) => o - bestV < 1e-6).length;
      foot.innerHTML = `<b>${nBest} of 6</b> starts reached the lowest objective (${fmt(bestV)}). ${nBest < 6 ? 'The others got stuck at a worse local minimum with different clusters.' : 'Try more clusters or the 15-blob data to see starts get stuck.'}`;
    }
    run();
  })();

  /* ============================================================ choosing K */
  (function () {
    const elbow = new Plot('#ck-elbow', { w: 420, h: 260, pad: { l: 52, r: 14, t: 14, b: 36 } });
    const sil = new Plot('#ck-sil', { w: 420, h: 260, pad: { l: 44, r: 14, t: 14, b: 36 } });
    const sc = new Plot('#ck-scatter', { w: 420, h: 300 });
    const sb = new Plot('#ck-silbars', { w: 420, h: 300, pad: { l: 30, r: 14, t: 10, b: 30 } });
    const status = $('#ck-status'), foot = $('#ck-foot'), cap = $('#ck-cap');
    const KMAX = 10; let pts, X, res, sils, selK, elbowK, silK;
    const sel = $('#ck-data');
    sel.addEventListener('change', compute);
    function compute() {
      pts = DATA[sel.value](); X = XY(pts);
      res = []; sils = [];
      for (let k = 1; k <= KMAX; k++) { const r = M.kmeansBest(X, k, 8, 5); res.push(r); sils.push(k > 1 ? M.silhouette(X, r.labels) : null); }
      const w = res.map((r) => 2 * r.sse);
      // elbow: point farthest from the straight line joining K=1 and K=KMAX (normalised)
      let bd = -1; elbowK = 2;
      for (let k = 2; k < KMAX; k++) {
        const xn = (k - 1) / (KMAX - 1), yn = (w[k - 1] - w[KMAX - 1]) / (w[0] - w[KMAX - 1]);
        const d = Math.abs(yn - (1 - xn)) / Math.SQRT2; if (d > bd) { bd = d; elbowK = k; }
      }
      silK = 2; sils.forEach((s, i) => { if (s && s.mean > sils[silK - 1].mean) silK = i + 1; });
      selK = silK;
      status.innerHTML = `elbow suggests <b>K = ${elbowK}</b> · best silhouette <b>K = ${silK}</b>`;
      draw();
    }
    function draw() {
      const w = res.map((r) => 2 * r.sse);
      elbow.clear().domain(0.5, KMAX + 0.5, 0, Math.max(...w) * 1.08, false).axes({ nx: KMAX, ny: 4, xlabel: 'K', fy: (v) => M.fmt(v, 0) });
      elbow.poly(w.map((v, i) => [i + 1, v]), { color: UL.INK, w: 2 });
      w.forEach((v, i) => elbow.marker(i + 1, v, { fill: i + 1 === selK ? UL.COLORS[0] : UL.INK, r: i + 1 === selK ? 6 : 3.8 }));
      elbow.text('elbow', elbowK, w[elbowK - 1], { align: 'left', color: UL.MUTED, font: '11px "IBM Plex Mono"', halo: true, base: 'bottom' });
      sil.clear().domain(0.5, KMAX + 0.5, 0, Math.max(0.8, ...sils.filter(Boolean).map((s) => s.mean)) * 1.05, false).axes({ nx: KMAX, ny: 4, xlabel: 'K' });
      sils.forEach((s, i) => {
        if (!s) return; const k = i + 1, x0 = sil.sx(k - 0.32), x1 = sil.sx(k + 0.32), y = sil.sy(Math.max(0, s.mean)), y0 = sil.sy(0);
        sil.ctx.fillStyle = k === selK ? UL.COLORS[0] : '#cfcfca'; sil.ctx.beginPath();
        sil.ctx.roundRect ? sil.ctx.roundRect(x0, y, x1 - x0, y0 - y, [4, 4, 0, 0]) : sil.ctx.rect(x0, y, x1 - x0, y0 - y); sil.ctx.fill();
        if (k === selK) sil.textPx(s.mean.toFixed(2), (x0 + x1) / 2, y - 8, { font: '500 11px "IBM Plex Mono"' });
      });
      const r = res[selK - 1];
      sc.clear().fit(pts, 0.06, true).frame(); sc.regions((x, y) => M.assign([[x, y]], r.C)[0], 7, 0.07);
      drawPts(sc, pts, r.labels, { r: 3.4 }); drawCentroids(sc, r.C, { r: 7 });
      cap.innerHTML = `<b>K = ${selK}</b>: total W = ${fmt(2 * r.sse)}${sils[selK - 1] ? `, silhouette = ${sils[selK - 1].mean.toFixed(2)}` : ''}`;
      sb.clear();
      if (selK < 2) { sb.textPx('silhouette needs at least 2 clusters', sb.W / 2, sb.H / 2, { color: UL.FAINT, font: '12px "IBM Plex Sans"' }); }
      else {
        const s = sils[selK - 1], n = X.length, gap = 6, rows = n + gap * (selK - 1);
        sb.domain(-0.3, 1, 0, rows, false).axes({ y: false, nx: 6 });
        let y = rows;
        for (let k = 0; k < selK; k++) {
          const vals = s.s.filter((_, i) => r.labels[i] === k).sort((a, b) => b - a);
          vals.forEach((v) => { const Y = sb.sy(y); sb.ctx.fillStyle = C(k); sb.ctx.fillRect(sb.sx(Math.min(0, v)), Y, Math.abs(sb.sx(v) - sb.sx(0)), Math.max(1, sb.sy(y - 1) - Y)); y--; });
          y -= gap;
        }
        sb.line(0, 0, 0, rows, { color: UL.INK, w: 1 });
        sb.line(s.mean, 0, s.mean, rows, { color: UL.INK, w: 1.2, dash: [4, 4] });
        sb.text(`mean ${s.mean.toFixed(2)}`, s.mean, rows * 0.02, { align: 'left', font: '11px "IBM Plex Mono"', halo: true });
      }
      const msgs = {
        uniform: 'There are no real groups here, yet both tools still "suggest" a K. The silhouette values are low (around 0.3–0.4), which is the real warning sign.',
        moons: 'The two moons are not round, so K-means splits them badly at K = 2 and the tools point to more clusters. Methods matter more than K here.',
      };
      foot.innerHTML = msgs[sel.value] || `Thin or negative bars in the silhouette plot are points sitting between clusters. A good K gives wide bars in every cluster.`;
    }
    const pick = (plot) => (e) => { const [px] = plot.pointer(e); const k = Math.round(plot.ix(px)); if (k >= 1 && k <= KMAX) { selK = k; draw(); } };
    elbow.cv.addEventListener('click', pick(elbow)); sil.cv.addEventListener('click', pick(sil));
    elbow.cv.style.cursor = sil.cv.style.cursor = 'pointer';
    compute();
  })();

  /* =============================================================== scaling */
  (function () {
    const plot = new Plot('#sc-plot', { w: 560, h: 400, pad: { l: 56, r: 16, t: 14, b: 40 } });
    const pts = DS.customers({}), X = XY(pts), truth = pts.map((p) => p.t);
    const raw = M.matchLabels(M.kmeansBest(X, 4, 10, 2).labels, truth);
    const Z = M.standardize(X).X, std = M.matchLabels(M.kmeansBest(Z, 4, 10, 2).labels, truth);
    const acc = (lab) => lab.filter((l, i) => l === truth[i]).length / lab.length;
    const sdI = Math.sqrt(M.variance(X.map((x) => x[0]))), sdA = Math.sqrt(M.variance(X.map((x) => x[1])));
    const mode = UL.seg('sc-mode', draw), view = $('#sc-view');
    view.addEventListener('change', draw);
    function draw() {
      const lab = mode.value === 'raw' ? raw : std, equal = view.checked;
      if (equal && mode.value === 'raw') plot.fit(pts, 0.05, true); else if (equal) { // standardised space
        const zp = Z.map((z) => ({ x: z[0], y: z[1] })); plot.fit(zp, 0.08, true);
      } else plot.fit(pts, 0.08, false);
      const useZ = equal && mode.value === 'std';
      plot.clear().axes({ xlabel: useZ ? 'income (z-score)' : 'monthly income (BD)', ylabel: useZ ? 'age (z-score)' : 'age (years)' });
      pts.forEach((p, i) => { const x = useZ ? Z[i][0] : p.x, y = useZ ? Z[i][1] : p.y; plot.marker(x, y, { fill: C(lab[i]), shape: S(lab[i]), r: 4.2 }); });
      $('#sc-stats').innerHTML = `<div class="stat"><span class="k">spread of income</span><span class="v">${M.fmt(sdI, 0)} <small>BD</small></span></div>` +
        `<div class="stat"><span class="k">spread of age</span><span class="v">${M.fmt(sdA, 1)} <small>yrs</small></span></div>` +
        `<div class="stat"><span class="k">matches true segments</span><span class="v">${(acc(lab) * 100).toFixed(0)}%</span></div>`;
      $('#sc-msg').innerHTML = mode.value === 'raw'
        ? `Income varies about <b>${Math.round(sdI / sdA)}×</b> more than age, so K-means only "sees" income: it cuts the data into vertical slices and ignores age completely.${equal ? ' Drawn with equal scales, as K-means sees it, the age axis is squashed flat.' : ' Tick "show in the space K-means sees" to understand why.'}`
        : 'After standardising, both features have spread 1 and get an equal vote. K-means now finds the four real segments: young and older customers, each with low or high income.';
    }
    draw();
  })();

  /* ========================================================== failure grid */
  (function () {
    const grid = $('#fail-grid');
    const cases = [
      ['blobs3', 3, true, 'Round, similar blobs: works well'],
      ['varied', 3, false, 'Different spreads: the wide group is cut up'],
      ['aniso', 3, false, 'Stretched blobs: cuts across them'],
      ['moons', 2, false, 'Two moons: straight cut, wrong groups'],
      ['circles', 2, false, 'Nested circles: impossible for centres'],
      ['uniform', 3, false, 'No structure: still returns 3 "clusters"'],
    ];
    cases.forEach(([name, k, ok, note]) => {
      const wrap = document.createElement('div'); grid.appendChild(wrap);
      const d = document.createElement('div'); d.className = 'plot'; wrap.appendChild(d);
      const cap = document.createElement('p'); cap.className = 'plot-cap'; wrap.appendChild(cap);
      const pts = DATA[name](), X = XY(pts), r = M.kmeansBest(X, k, 10, 3);
      const lab = name === 'uniform' ? r.labels : M.matchLabels(r.labels, pts.map((p) => p.t));
      const p = new Plot(d, { w: 320, h: 250 }); p.fit(pts, 0.06, true);
      p.regions((x, y) => M.assign([[x, y]], r.C)[0], 6, 0.08); p.frame();
      drawPts(p, pts, lab, { r: 2.9 }); drawCentroids(p, r.C, { r: 6 });
      const acc = name === 'uniform' ? null : lab.filter((l, i) => l === pts[i].t).length / lab.length;
      cap.innerHTML = `<b>${ok ? '✓' : '✗'} ${note}</b>${acc != null ? ` · ${(acc * 100).toFixed(0)}% match` : ''}`;
    });
  })();

  /* ============================================================ K-means++ */
  (function () {
    const plot = new Plot('#pp-plot', { w: 560, h: 400 });
    let pts, X, cents, r, seed = 3;
    const sel = $('#pp-data'); sel.addEventListener('change', reset);
    function reset() { pts = DATA[sel.value](); X = XY(pts); plot.fit(pts, 0.06, true); r = UL.rng(seed++); cents = [X[r.int(X.length)].slice()]; draw(); }
    function next() {
      const D = X.map((x) => Math.min(...cents.map((c) => M.d2(x, c)))), tot = D.reduce((a, b) => a + b, 0);
      let u = r() * tot, i = 0; while (u > D[i] && i < X.length - 1) { u -= D[i]; i++; }
      cents.push(X[i].slice()); draw();
    }
    function draw() {
      const D = X.map((x) => Math.min(...cents.map((c) => M.d2(x, c)))), tot = D.reduce((a, b) => a + b, 0), mx = Math.max(...D);
      plot.clear().frame();
      pts.forEach((p, i) => { const q = D[i] / mx; plot.marker(p.x, p.y, { fill: UL.INK, r: 1.6 + 5.5 * Math.sqrt(q), alpha: 0.15 + 0.75 * q, ring: false }); });
      cents.forEach((c, k) => plot.marker(c[0], c[1], { shape: 'cross', fill: C(k), r: 8, lw: 3 }));
      cents.forEach((c, k) => plot.text(String(k + 1), c[0], c[1], { font: '500 11px "IBM Plex Mono"', align: 'left', base: 'bottom', halo: true }));
      $('#pp-stats').innerHTML = `<div class="stat"><span class="k">centres chosen</span><span class="v">${cents.length}</span></div>` +
        `<div class="stat"><span class="k">most likely next point</span><span class="v">${((mx / tot) * 100).toFixed(1)}%</span></div>` +
        `<div class="stat"><span class="k">sum of D²</span><span class="v">${fmt(tot)}</span></div>`;
      $('#pp-msg').innerHTML = cents.length === 1 ? 'The first centre is a random point. Every other point is now drawn bigger and darker the farther it is from it: those are the likely next picks.'
        : `Points near an existing centre are almost never picked (their D² is tiny). New centres land in groups that have no centre yet, so the start is already close to a good answer.`;
      $('#pp-next').disabled = cents.length >= 15;
    }
    $('#pp-next').addEventListener('click', next); $('#pp-reset').addEventListener('click', reset);
    reset();
  })();

  /* ================================================================= iris */
  (function () {
    const D = window.UL_DATA.iris, names = ['setosa', 'versicolor', 'virginica'];
    const nice = (c) => c.replace('_', ' ') + ' (cm)';
    const sx = $('#ir-x'), sy = $('#ir-y');
    D.cols.forEach((c, j) => { sx.add(new Option(nice(c), j)); sy.add(new Option(nice(c), j)); });
    sx.value = 2; sy.value = 3;
    const pk = new Plot('#ir-km', { w: 420, h: 320, pad: { l: 50, r: 12, t: 12, b: 36 } });
    const pt = new Plot('#ir-true', { w: 420, h: 320, pad: { l: 50, r: 12, t: 12, b: 36 } });
    [sx, sy, $('#ir-std')].forEach((e) => e.addEventListener('change', draw));
    function draw() {
      const Xin = $('#ir-std').checked ? M.standardize(D.X).X : D.X;
      const km = M.matchLabels(M.kmeansBest(Xin, 3, 10, 1).labels, D.y);
      const j = +sx.value, k = +sy.value, pts = D.X.map((x) => ({ x: x[j], y: x[k] }));
      [[pk, km], [pt, D.y]].forEach(([p, lab]) => {
        p.clear().fit(pts, 0.08, false).axes({ xlabel: nice(D.cols[j]), ylabel: nice(D.cols[k]), nx: 5, ny: 4 });
        pts.forEach((q, i) => p.marker(q.x, q.y, { fill: C(lab[i]), shape: S(lab[i]), r: 3.8, alpha: 0.9 }));
      });
      let h = '<thead><tr><th>true ↓ / cluster →</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody>', right = 0;
      for (let t = 0; t < 3; t++) {
        h += `<tr><th style="text-align:left"><span style="color:${C(t)}">●</span> ${names[t]}</th>`;
        for (let c = 0; c < 3; c++) { const n = D.y.filter((y, i) => y === t && km[i] === c).length; if (t === c) right += n; h += `<td${t === c ? ' class="min"' : ''}>${n}</td>`; }
        h += '</tr>';
      }
      $('#ir-conf').innerHTML = h + '</tbody>';
      $('#ir-msg').innerHTML = `K-means agrees with the true species for <b>${right} of 150</b> flowers (${((right / 150) * 100).toFixed(0)}%), without ever seeing a label. Cluster colours were matched to species afterwards; K-means itself only says "group 1, 2, 3".`;
    }
    draw();
  })();

  UL.quiz('quiz-box', [
    { q: 'K-means minimises…', o: ['the number of clusters', 'the total within-cluster variation', 'the distance between centroids', 'the silhouette score'], a: 1, why: 'The objective is the sum of W(C_k) over all clusters: how tight the clusters are.' },
    { q: 'A cluster contains (1, 1), (3, 1) and (2, 4). Its centroid is…', o: ['(2, 2)', '(3, 4)', '(2, 1)', '(1.5, 2)'], a: 0, why: 'Average each coordinate: x = (1+3+2)/3 = 2, y = (1+1+4)/3 = 2.' },
    { q: 'Two runs of K-means on the same data give different clusters. Why?', o: ['The data changed', 'K-means finds a local minimum that depends on the random start', 'K-means is not deterministic even with a fixed start', 'K was too small'], a: 1, why: 'Each run starts from a different random state and stops at a local minimum. Run many times and keep the lowest objective (n_init).' },
    { q: 'Income is in BD (hundreds) and age in years (tens). Before K-means you should…', o: ['drop age', 'standardise both features', 'multiply age by 100 by hand', 'nothing: K-means handles scale'], a: 1, why: 'Euclidean distance lets the large-scale feature dominate. Standardising gives each feature an equal vote.' },
    { q: 'On the elbow plot, the total W always falls as K grows. So we choose K…', o: ['as large as possible', 'where the curve stops dropping fast', 'where W reaches zero', 'K = 2 always'], a: 1, why: 'W reaches 0 when every point is its own cluster, which is useless. The elbow is where adding clusters stops paying off.' },
    { q: 'K-means is a poor choice for the "two moons" dataset because…', o: ['it is too slow', 'it always looks for round groups around a centre', 'it needs labels', 'moons have no centroid'], a: 1, why: 'Assigning to the nearest centre gives straight-edged, roughly round regions, which cannot follow curved shapes.' },
    { q: 'How does K-means++ choose the second starting centroid?', o: ['The point closest to the first', 'A random point, more likely the farther it is from the first', 'The data mean', 'The farthest point, always'], a: 1, why: 'Probability is proportional to D(x)², so far points are favoured but the choice is still random.' },
  ]);

  UL.start();
})();
