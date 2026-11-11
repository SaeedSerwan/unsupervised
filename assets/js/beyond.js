/*!
 * Unsupervised Lab — Beyond the lecture: DBSCAN, Gaussian mixtures, comparison grid
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { M, DS, Plot, $ } = UL;
  const C = UL.color, S = UL.shape;
  const XY = (pts) => pts.map((p) => [p.x, p.y]);

  const SETS = {
    moons: () => DS.moons({ n: 220, noise: 0.07 }),
    circles: () => DS.circles({ n: 240 }),
    noisy: () => DS.noisy({}),
    blobs: () => DS.blobs({ n: 180, k: 3, sd: 0.9, seed: 1 }),
    aniso: () => DS.aniso({}),
    varied: () => DS.varied({}),
    overlap: () => DS.blobs({ n: 240, seed: 14, centers: [[-1.6, 0.4], [1.4, 1.2], [0.2, -1.8]], sds: [1.1, 0.9, 1.0] }),
    uniform: () => DS.uniform({ n: 150 }),
  };
  const EPS = { moons: 0.75, circles: 0.9, noisy: 0.6, blobs: 0.8, aniso: 0.6, varied: 0.6, uniform: 0.6 };

  /* ================================================================ DBSCAN */
  (function () {
    const plot = new Plot('#db-plot', { w: 540, h: 420 });
    const kp = new Plot('#db-k', { w: 420, h: 170, pad: { l: 40, r: 10, t: 10, b: 26 } });
    let pts, X, res, hover = -1, kd;
    const eps = UL.range('db-eps', run, (v) => (v / 100).toFixed(2)), minS = UL.range('db-min', run);
    $('#db-data').addEventListener('change', () => { load(); eps.set(Math.round(EPS[$('#db-data').value] * 100)); run(); });
    function load() { pts = SETS[$('#db-data').value](); X = XY(pts); plot.fit(pts, 0.07, true); }
    function run() {
      const e = eps.v / 100, m = minS.v;
      res = M.dbscan(X, e, m);
      kd = X.map((x) => { const d = X.map((y) => M.dist(x, y)).sort((a, b) => a - b); return d[Math.min(m - 1, d.length - 1)]; }).sort((a, b) => a - b);
      draw();
    }
    function draw() {
      const e = eps.v / 100;
      plot.clear().frame();
      if (hover >= 0) plot.circle(X[hover][0], X[hover][1], e, { fill: 'rgba(17,17,17,0.05)', color: UL.INK, w: 1.2, dash: [4, 3] });
      pts.forEach((p, i) => {
        const l = res.labels[i];
        if (l < 0) plot.marker(p.x, p.y, { shape: 'x', fill: '#a3a3a0', r: 3.2, lw: 1.6, ring: false });
        else if (res.core[i]) plot.marker(p.x, p.y, { fill: C(l), shape: S(l), r: 4.4 });
        else plot.marker(p.x, p.y, { fill: '#fff', stroke: C(l), lw: 1.6, r: 3.6, ring: false, shape: S(l) });
      });
      if (hover >= 0) plot.marker(X[hover][0], X[hover][1], { fill: UL.INK, r: 4 });
      const noise = res.labels.filter((l) => l < 0).length, core = res.core.filter(Boolean).length;
      $('#db-stats').innerHTML = `<div class="stat"><span class="k">clusters found</span><span class="v">${res.k}</span></div>` +
        `<div class="stat"><span class="k">core points</span><span class="v">${core}</span></div>` +
        `<div class="stat"><span class="k">noise points</span><span class="v">${noise}</span></div>`;
      UL.legend($('#db-legend'), [{ color: UL.COLORS[0], label: 'core (filled)' }, { color: '#fff;border:1.5px solid ' + UL.COLORS[0], label: 'border (hollow)' }, { color: '#a3a3a0', label: 'noise (✕)' }]);
      // k-distance
      const top = kd[kd.length - 1] * 1.05;
      kp.clear().domain(0, kd.length, 0, top, false).axes({ nx: 4, ny: 3, fy: (v) => v.toFixed(1) });
      kp.poly(kd.map((d, i) => [i, d]), { color: UL.INK, w: 1.8 });
      kp.line(0, e, kd.length, e, { color: UL.COLORS[1], w: 1.4, dash: [5, 4] });
      kp.text(`ε = ${e.toFixed(2)}`, 2, e, { align: 'left', base: 'bottom', font: '500 10.5px "IBM Plex Mono"', color: '#c2501f', halo: true });
      const name = $('#db-data').value;
      $('#db-foot').innerHTML = res.k === 0 ? 'ε is so small that no point is dense enough: everything is noise. Move ε up towards the knee of the k-distance curve.'
        : res.k === 1 && name !== 'uniform' ? 'ε is so large that the dense regions touch and merge into one cluster. Move ε down.'
        : name === 'moons' || name === 'circles' ? `DBSCAN follows the curved shapes that K-means could not. ${res.k === 2 ? 'Two clusters, as our eyes see.' : 'Adjust ε until you get exactly two clusters.'}`
        : name === 'noisy' ? 'The scattered background points are labelled noise instead of being forced into a cluster. K-means cannot do that.'
        : name === 'varied' ? 'The wide, sparse group and the tight groups need different ε values. With one ε, DBSCAN either fragments the wide group or merges the tight ones: its main weakness.'
        : 'Hover any point to see its ε-neighbourhood. Count the points inside: if there are at least min_samples, it is a core point.';
    }
    plot.cv.addEventListener('pointermove', (e) => { const h = plot.nearest(pts, e, 12); if (h !== hover) { hover = h; draw(); } });
    plot.cv.addEventListener('pointerleave', () => { hover = -1; draw(); });
    load(); run();
  })();

  /* ======================================================== Gaussian mixture */
  (function () {
    const plot = new Plot('#gm-plot', { w: 540, h: 420 });
    const llp = new Plot('#gm-ll', { w: 420, h: 150, pad: { l: 48, r: 10, t: 8, b: 22 } });
    let pts, X, st, it, hist, timer = null, seed = 1, hover = -1;
    const kR = UL.range('gm-k', () => reset(true));
    const view = UL.seg('gm-view', () => draw());
    $('#gm-data').addEventListener('change', () => { load(); reset(true); });
    function load() { pts = SETS[$('#gm-data').value](); X = XY(pts); plot.fit(pts, 0.1, true); }
    function bestSeed() { // choose a start that EM can finish well, so the default run is a good one
      let best = 1, bl = -Infinity;
      for (let s = 1; s <= 12; s++) { const t = M.gmm.init(X, kR.v, s); for (let i = 0; i < 200; i++) { M.gmm.eStep(X, t); M.gmm.mStep(X, t); } M.gmm.eStep(X, t); if (t.ll > bl + 1e-6) { bl = t.ll; best = s; } }
      return best;
    }
    function reset(good) {
      stop(); seed = good ? bestSeed() : seed + 1;
      st = M.gmm.init(X, kR.v, seed); M.gmm.eStep(X, st); it = 0; hist = [st.ll]; draw();
    }
    function step() { M.gmm.mStep(X, st); M.gmm.eStep(X, st); it++; hist.push(st.ll); draw(); if (it > 2 && Math.abs(hist[hist.length - 1] - hist[hist.length - 2]) < 1e-4) stop(); }
    function draw() {
      plot.clear().frame();
      const soft = view.value === 'soft';
      pts.forEach((p, i) => {
        const r = st.R[i], k = r.indexOf(Math.max(...r));
        plot.marker(p.x, p.y, { fill: soft ? UL.mix(r) : C(k), shape: soft ? 'circle' : S(k), r: i === hover ? 6 : 3.8 });
      });
      st.comps.forEach((c, k) => {
        [1, 2].forEach((nsd) => { const e = M.ellipse(c.S, nsd); plot.ellipse(c.mu[0], c.mu[1], e.rx, e.ry, e.angle, { color: C(k), w: nsd === 1 ? 2 : 1.2, dash: nsd === 2 ? [5, 4] : null }); });
        plot.marker(c.mu[0], c.mu[1], { shape: 'plus', fill: UL.INK, r: 6, lw: 2.2 });
      });
      $('#gm-stats').innerHTML = `<div class="stat"><span class="k">EM iterations</span><span class="v">${it}</span></div>` +
        `<div class="stat"><span class="k">log-likelihood</span><span class="v">${st.ll.toFixed(1)}</span></div>` +
        `<div class="stat"><span class="k">weights</span><span class="v" style="font-size:.9rem">${st.comps.map((c) => Math.round(c.w * 100) + '%').join(' · ')}</span></div>`;
      llp.clear();
      const lo = Math.min(...hist), hi = Math.max(...hist), pad = Math.max(1, (hi - lo) * 0.08);
      llp.domain(0, Math.max(10, hist.length - 1), lo - pad, hi + pad, false).axes({ nx: 5, ny: 3, fy: (v) => v.toFixed(0) });
      llp.poly(hist.map((v, i) => [i, v]), { color: UL.INK, w: 1.8 });
      llp.marker(hist.length - 1, hist[hist.length - 1], { fill: UL.INK, r: 3.5 });
      $('#gm-msg').innerHTML = it === 0 ? 'Start: round Gaussians placed by K-means++. Press <b>E + M step</b> or <b>Play</b>: the ellipses will stretch and turn to fit the data.'
        : timer ? 'Each step the log-likelihood goes up (or stays the same), just as the K-means objective only goes down.'
        : `Converged after ${it} steps. ${$('#gm-data').value === 'aniso' ? 'The ellipses follow the stretched groups, which K-means could not.' : $('#gm-data').value === 'moons' ? 'Moons are not Gaussian: a GMM approximates them with ellipses and splits them imperfectly. No method fits every shape.' : 'Blended colours mark points that are genuinely uncertain: they sit where two Gaussians overlap.'}`;
    }
    function stop() { clearInterval(timer); timer = null; $('#gm-play').textContent = 'Play'; }
    $('#gm-step').addEventListener('click', () => { stop(); step(); });
    $('#gm-reset').addEventListener('click', () => reset(false));
    $('#gm-play').addEventListener('click', () => { if (timer) return stop(); $('#gm-play').textContent = 'Pause'; timer = setInterval(() => { step(); if (timer) step(); if (it > 400) stop(); }, 120); });
    plot.cv.addEventListener('pointermove', (e) => {
      const i = plot.nearest(pts, e, 10); if (i !== hover) { hover = i; draw(); }
      if (i < 0) return UL.tip.hide();
      UL.tip.show(e, st.R[i].map((p, k) => `${UL.sw(k)}cluster ${k + 1}: <b>${(p * 100).toFixed(0)}%</b>`).join('<br>'));
    });
    plot.cv.addEventListener('pointerleave', () => { hover = -1; UL.tip.hide(); draw(); });
    load(); reset(true);
  })();

  /* ========================================================= comparison grid */
  (function () {
    const grid = $('#cmp');
    const ROWS = [['blobs', 3, 'round blobs'], ['aniso', 3, 'stretched'], ['varied', 3, 'uneven'], ['moons', 2, 'two moons'], ['circles', 2, 'circles'], ['uniform', 3, 'no structure']];
    const COLS = ['K-means', 'Ward', 'Single linkage', 'DBSCAN', 'Gaussian mixture'];
    grid.innerHTML = '<div></div>' + COLS.map((c) => `<div style="font-size:.78rem;font-weight:600;text-align:center">${c}</div>`).join('');
    const jobs = [];
    ROWS.forEach(([name, k, label]) => {
      const lab = document.createElement('div'); lab.style.cssText = 'font-size:.78rem;color:var(--muted)'; lab.textContent = label; grid.appendChild(lab);
      COLS.forEach((method) => { const d = document.createElement('div'); d.className = 'plot'; grid.appendChild(d); jobs.push({ d, name, k, method }); });
    });
    const cache = {};
    function cluster(name, k, method) {
      const pts = cache[name] || (cache[name] = SETS[name]()), X = XY(pts);
      let labels;
      if (method === 'K-means') labels = M.kmeansBest(X, k, 8, 2).labels;
      else if (method === 'Ward' || method === 'Single linkage') labels = M.cutK(M.hclust(X, method === 'Ward' ? 'ward' : 'single'), X.length, k);
      else if (method === 'DBSCAN') labels = M.dbscan(X, EPS[name], 5).labels;
      else {
        let best = null;
        for (let s = 1; s <= 12; s++) { const st = M.gmm.init(X, k, s); for (let i = 0; i < 200; i++) { M.gmm.eStep(X, st); M.gmm.mStep(X, st); } M.gmm.eStep(X, st); if (!best || st.ll > best.ll) best = st; }
        labels = best.R.map((r) => r.indexOf(Math.max(...r)));
      }
      const t = pts.map((p) => p.t);
      const nt = name === 'uniform' ? labels : M.matchLabels(labels, t);
      return { pts, labels: nt };
    }
    let started = false;
    UL.onVisible(grid, (vis) => {
      if (!vis || started) return; started = true;
      let i = 0;
      const next = () => { // draw one panel per frame so the page stays responsive
        if (i >= jobs.length) return;
        const j = jobs[i++], r = cluster(j.name, j.k, j.method), p = new Plot(j.d, { w: 200, h: 160, pad: { l: 6, r: 6, t: 6, b: 6 } });
        p.fit(r.pts, 0.06, true).frame();
        r.pts.forEach((q, n) => { const l = r.labels[n]; if (l < 0) p.marker(q.x, q.y, { shape: 'x', fill: '#b5b5b0', r: 2.2, lw: 1.2, ring: false }); else p.marker(q.x, q.y, { fill: C(l), r: 2.2, ring: false }); });
        const nClusters = new Set(r.labels.filter((l) => l >= 0)).size;
        p.textPx(`${nClusters}`, p.W - 10, 14, { align: 'right', font: '500 10px "IBM Plex Mono"', color: UL.MUTED });
        requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    });
  })();

  UL.quiz('quiz-box', [
    { q: 'DBSCAN needs which settings?', o: ['K only', 'ε (radius) and min_samples', 'a linkage and a cut height', 'the number of components'], a: 1, why: 'DBSCAN discovers the number of clusters from density, defined by a radius ε and a minimum count of neighbours.' },
    { q: 'A point has only 2 neighbours within ε (min_samples = 5) but one of them is a core point. It is…', o: ['a core point', 'a border point', 'noise', 'a centroid'], a: 1, why: 'Not dense enough to be core, but within ε of a core point, so it joins that cluster as a border point.' },
    { q: 'Which method can label outliers as "noise" instead of forcing them into a cluster?', o: ['K-means', 'Ward linkage', 'DBSCAN', 'PCA'], a: 2, why: 'Points that are neither core nor border are left unassigned (label −1 in scikit-learn).' },
    { q: 'In a Gaussian mixture, a point can be 60% cluster 1 and 40% cluster 2. This is…', o: ['hard clustering', 'soft clustering', 'a bug', 'dimensionality reduction'], a: 1, why: 'GMMs give probabilities of membership: soft clustering.' },
    { q: 'Why can a GMM fit stretched clusters that K-means cuts across?', o: ['It uses more iterations', 'Each Gaussian has its own covariance (shape and orientation)', 'It needs no K', 'It standardises the data'], a: 1, why: 'K-means implicitly assumes round, equal clusters. A GMM learns a full covariance matrix per cluster.' },
    { q: 'You have 60 columns and want to cluster. A sensible first step is…', o: ['DBSCAN on the raw columns', 'standardise, then PCA to a few components', 'drop half the rows', 'single linkage'], a: 1, why: 'In high dimensions distances lose meaning. Standardise and reduce with PCA, then cluster the component scores.' },
  ]);

  UL.start();
})();
