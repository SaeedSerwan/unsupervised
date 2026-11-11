/*!
 * Unsupervised Learning Lab — shared library
 * Random data, clustering and PCA algorithms, canvas plotting and page UI.
 * Everything runs in the browser; no dependencies.
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const UL = {};

  /* ================================================================ random */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.normal = function () {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    r.int = (n) => Math.floor(r() * n);
    return r;
  }
  UL.rng = rng;

  /* ================================================================ colours */
  UL.COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  UL.SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'star', 'tri-down', 'plus'];
  UL.INK = '#111111'; UL.MUTED = '#6b6b68'; UL.FAINT = '#a3a3a0'; UL.LINE = '#e7e7e4'; UL.GREY = '#c9c9c4';
  UL.color = (k) => (k < 0 ? UL.GREY : UL.COLORS[k % UL.COLORS.length]);
  UL.shape = (k) => (k < 0 ? 'circle' : UL.SHAPES[k % UL.SHAPES.length]);
  UL.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  UL.mix = function (weights) { // blend palette colours by weights (soft clustering)
    let r = 0, g = 0, b = 0, s = 0;
    weights.forEach((w, k) => {
      const n = parseInt(UL.color(k).slice(1), 16);
      r += w * ((n >> 16) & 255); g += w * ((n >> 8) & 255); b += w * (n & 255); s += w;
    });
    s = s || 1;
    return `rgb(${Math.round(r / s)},${Math.round(g / s)},${Math.round(b / s)})`;
  };

  /* ================================================================ datasets */
  const DS = {};
  DS.blobs = function (o = {}) {
    const r = rng(o.seed || 1), n = o.n || 150, k = o.k || 3, sd = o.sd || 0.9;
    const centers = o.centers || Array.from({ length: k }, (_, i) => {
      const a = (2 * Math.PI * i) / k + 0.6;
      return [Math.cos(a) * 3.6, Math.sin(a) * 3.6];
    });
    const sds = o.sds || centers.map(() => sd);
    const sizes = o.sizes || centers.map(() => 1);
    const tot = sizes.reduce((a, b) => a + b, 0);
    const pts = [];
    centers.forEach((c, i) => {
      const m = Math.round((n * sizes[i]) / tot);
      for (let j = 0; j < m; j++) pts.push({ x: c[0] + r.normal() * sds[i], y: c[1] + r.normal() * sds[i], t: i });
    });
    return pts;
  };
  DS.moons = function (o = {}) {
    const r = rng(o.seed || 2), n = o.n || 200, noise = o.noise == null ? 0.08 : o.noise, pts = [];
    for (let i = 0; i < n; i++) {
      const up = i % 2 === 0, a = Math.PI * r();
      const x = up ? Math.cos(a) : 1 - Math.cos(a), y = up ? Math.sin(a) : 0.5 - Math.sin(a);
      pts.push({ x: (x - 0.5) * 4 + r.normal() * noise * 4, y: (y - 0.25) * 4 + r.normal() * noise * 4, t: up ? 0 : 1 });
    }
    return pts;
  };
  DS.circles = function (o = {}) {
    const r = rng(o.seed || 3), n = o.n || 200, pts = [];
    for (let i = 0; i < n; i++) {
      const inner = i % 2 === 0, a = 2 * Math.PI * r(), R = inner ? 1.25 : 3.5;
      pts.push({ x: Math.cos(a) * R + r.normal() * 0.18, y: Math.sin(a) * R + r.normal() * 0.18, t: inner ? 1 : 0 });
    }
    return pts;
  };
  DS.aniso = function (o = {}) { // three long, thin, parallel groups (tilted)
    const r = rng(o.seed || 4), pts = [], a = 0.5, per = Math.round((o.n || 180) / 3);
    for (let t = 0; t < 3; t++) for (let i = 0; i < per; i++) {
      const x = r.normal() * 2.2 + (t - 1) * 0.8, y = (t - 1) * 1.5 + r.normal() * 0.3;
      pts.push({ x: Math.cos(a) * x - Math.sin(a) * y, y: Math.sin(a) * x + Math.cos(a) * y, t });
    }
    return pts;
  };
  DS.varied = function (o = {}) {
    return DS.blobs({ n: o.n || 180, seed: o.seed || 5, centers: [[-3.2, 0.6], [0.8, 0], [3.6, -0.4]], sds: [0.35, 2.3, 0.7] });
  };
  DS.uniform = function (o = {}) {
    const r = rng(o.seed || 6), n = o.n || 150, pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: (r() - 0.5) * 9, y: (r() - 0.5) * 9, t: 0 });
    return pts;
  };
  DS.many = function (o = {}) { // "about 15 groups" benchmark-style data
    const r = rng(o.seed || 7), centers = [];
    for (let i = 0; i < 15; i++) centers.push([((i % 5) - 2) * 3.2 + (r() - 0.5) * 1.4, (Math.floor(i / 5) - 1) * 3.4 + (r() - 0.5) * 1.4]);
    return DS.blobs({ n: o.n || 450, seed: (o.seed || 7) + 1, centers, sd: 0.42 });
  };
  DS.noisy = function (o = {}) { // blobs + background noise (for DBSCAN)
    const r = rng(o.seed || 8);
    const pts = DS.blobs({ n: 170, seed: 9, centers: [[-2.6, 2], [2.4, 1.6], [0, -2.6]], sd: 0.55 });
    for (let i = 0; i < 40; i++) pts.push({ x: (r() - 0.5) * 10, y: (r() - 0.5) * 9, t: -1 });
    return pts;
  };
  DS.customers = function (o = {}) { // income (BD/month) and age (years): very different scales
    const r = rng(o.seed || 11), pts = [];
    const groups = [[22, 450, 3, 90], [24, 1250, 3, 110], [55, 480, 4, 100], [52, 1300, 5, 120]];
    groups.forEach((g, t) => {
      for (let i = 0; i < 40; i++) pts.push({ x: g[1] + r.normal() * g[3], y: g[0] + r.normal() * g[2], t });
    });
    return pts;
  };
  UL.DS = DS;

  /* ================================================================ maths */
  const M = {};
  M.d2 = (a, b) => { let s = 0; for (let j = 0; j < a.length; j++) { const d = a[j] - b[j]; s += d * d; } return s; };
  M.dist = (a, b) => Math.sqrt(M.d2(a, b));
  M.mean = (v) => v.reduce((a, b) => a + b, 0) / (v.length || 1);
  M.variance = (v) => { const m = M.mean(v); return v.reduce((a, b) => a + (b - m) * (b - m), 0) / Math.max(1, v.length - 1); };
  M.cols = (X) => X[0].map((_, j) => X.map((r) => r[j]));
  M.standardize = function (X, center = true, scale = true) {
    const p = X[0].length, mu = [], sd = [];
    for (let j = 0; j < p; j++) {
      const c = X.map((r) => r[j]);
      mu.push(center ? M.mean(c) : 0);
      sd.push(scale ? Math.sqrt(M.variance(c)) || 1 : 1);
    }
    return { X: X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j])), mu, sd };
  };
  M.fmt = function (v, d = 2) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(1);
    return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  /* ---------------------------------------------------------- K-means */
  M.centroids = function (X, labels, k) {
    const p = X[0].length, C = Array.from({ length: k }, () => new Array(p).fill(0)), n = new Array(k).fill(0);
    X.forEach((x, i) => { const l = labels[i]; if (l < 0) return; n[l]++; for (let j = 0; j < p; j++) C[l][j] += x[j]; });
    return C.map((c, l) => (n[l] ? c.map((v) => v / n[l]) : null));
  };
  M.assign = function (X, C) {
    return X.map((x) => {
      let best = -1, bd = Infinity;
      C.forEach((c, l) => { if (!c) return; const d = M.d2(x, c); if (d < bd) { bd = d; best = l; } });
      return best;
    });
  };
  M.sse = function (X, labels, C) { // sum of squared distances to own centroid
    let s = 0; X.forEach((x, i) => { const c = C[labels[i]]; if (c) s += M.d2(x, c); }); return s;
  };
  M.initRandomPartition = function (n, k, r) { // lecture's Step 1
    const lab = Array.from({ length: n }, () => r.int(k));
    for (let l = 0; l < Math.min(k, n); l++) lab[r.int(n)] = l; // make sure no cluster starts empty
    return lab;
  };
  M.initForgy = (X, k, r) => { const idx = new Set(); while (idx.size < Math.min(k, X.length)) idx.add(r.int(X.length)); return [...idx].map((i) => X[i].slice()); };
  M.initPlusPlus = function (X, k, r) {
    const C = [X[r.int(X.length)].slice()];
    while (C.length < k) {
      const D = X.map((x) => Math.min(...C.map((c) => M.d2(x, c))));
      const tot = D.reduce((a, b) => a + b, 0);
      let u = r() * tot, i = 0;
      while (u > D[i] && i < X.length - 1) { u -= D[i]; i++; }
      C.push(X[i].slice());
    }
    return C;
  };
  M.kmeans = function (X, k, o = {}) {
    const r = rng(o.seed || 1);
    let C, labels;
    if (o.init === 'plusplus') C = M.initPlusPlus(X, k, r);
    else if (o.init === 'forgy') C = M.initForgy(X, k, r);
    else { labels = M.initRandomPartition(X.length, k, r); C = M.centroids(X, labels, k); }
    let it = 0;
    for (; it < (o.maxIter || 100); it++) {
      C = C.map((c) => c || X[r.int(X.length)].slice());
      const nl = M.assign(X, C);
      const changed = !labels || nl.some((l, i) => l !== labels[i]);
      labels = nl;
      C = M.centroids(X, labels, k);
      if (!changed) break;
    }
    C = C.map((c) => c || X[0].slice());
    return { labels, C, sse: M.sse(X, labels, C), iters: it + 1 };
  };
  M.kmeansBest = function (X, k, nInit = 10, seed = 1, init = 'plusplus') {
    let best = null;
    for (let s = 0; s < nInit; s++) {
      const res = M.kmeans(X, k, { seed: seed * 101 + s, init });
      if (!best || res.sse < best.sse - 1e-9) best = res;
    }
    return best;
  };
  M.silhouette = function (X, labels) {
    const n = X.length, k = Math.max(...labels) + 1, s = new Array(n).fill(0);
    if (k < 2) return { mean: 0, s };
    for (let i = 0; i < n; i++) {
      const sum = new Array(k).fill(0), cnt = new Array(k).fill(0);
      for (let j = 0; j < n; j++) { if (i === j || labels[j] < 0) continue; sum[labels[j]] += M.dist(X[i], X[j]); cnt[labels[j]]++; }
      const li = labels[i];
      if (li < 0 || cnt[li] === 0) { s[i] = 0; continue; }
      const a = sum[li] / cnt[li];
      let b = Infinity;
      for (let l = 0; l < k; l++) if (l !== li && cnt[l]) b = Math.min(b, sum[l] / cnt[l]);
      s[i] = b === Infinity ? 0 : (b - a) / Math.max(a, b);
    }
    return { mean: M.mean(s), s };
  };
  // number of ways to split n points into k non-empty groups (Stirling number of the 2nd kind), BigInt
  M.stirling2 = function (n, k) {
    let row = [1n];
    for (let i = 1; i <= n; i++) {
      const next = new Array(Math.min(i, k) + 1).fill(0n);
      for (let j = 1; j <= Math.min(i, k); j++) next[j] = BigInt(j) * (row[j] || 0n) + (row[j - 1] || 0n);
      row = next;
    }
    return row[k] || 0n;
  };

  /* ---------------------------------------------------- hierarchical */
  // returns n-1 merges {a, b, h, id, size}; cluster ids: 0..n-1 leaves, n.. merged
  M.hclust = function (X, linkage = 'complete') {
    const n = X.length;
    const D = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => M.dist(X[i], X[j])));
    const active = new Array(n).fill(true), ids = Array.from({ length: n }, (_, i) => i), size = new Array(n).fill(1);
    const cen = X.map((x) => x.slice()), members = X.map((_, i) => [i]);
    const merges = [];
    for (let step = 0; step < n - 1; step++) {
      let bi = -1, bj = -1, bd = Infinity;
      for (let i = 0; i < n; i++) if (active[i]) for (let j = i + 1; j < n; j++) if (active[j] && D[i][j] < bd) { bd = D[i][j]; bi = i; bj = j; }
      const na = size[bi], nb = size[bj];
      merges.push({ a: ids[bi], b: ids[bj], h: bd, id: n + step, size: na + nb, members: members[bi].concat(members[bj]) });
      const nc = cen[bi].map((v, d) => (v * na + cen[bj][d] * nb) / (na + nb));
      for (let k = 0; k < n; k++) {
        if (!active[k] || k === bi || k === bj) continue;
        let d;
        if (linkage === 'single') d = Math.min(D[bi][k], D[bj][k]);
        else if (linkage === 'complete') d = Math.max(D[bi][k], D[bj][k]);
        else if (linkage === 'average') d = (na * D[bi][k] + nb * D[bj][k]) / (na + nb);
        else if (linkage === 'centroid') d = M.dist(nc, cen[k]);
        else { const nk = size[k]; d = Math.sqrt((2 * (na + nb) * nk) / (na + nb + nk)) * M.dist(nc, cen[k]); } // ward
        D[bi][k] = D[k][bi] = d;
      }
      active[bj] = false; ids[bi] = n + step; size[bi] = na + nb; cen[bi] = nc; members[bi] = merges[step].members;
    }
    if (linkage === 'ward') { // first merge heights for ward are sqrt(2*1*1/2)*dist = dist; recompute consistently
      // (heights already follow scipy's ward convention: sqrt(2 na nb / (na+nb)) * ||ca - cb||)
    }
    return merges;
  };
  M.cutK = function (merges, n, k) { // labels for k clusters
    const parent = Array.from({ length: 2 * n }, (_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (let s = 0; s < n - k; s++) { const m = merges[s]; parent[find(m.a)] = m.id; parent[find(m.b)] = m.id; }
    return M.relabel(Array.from({ length: n }, (_, i) => find(i)));
  };
  M.cutH = function (merges, n, h) {
    let k = n; merges.forEach((m) => { if (m.h <= h) k--; });
    return M.cutK(merges, n, Math.max(1, k));
  };
  M.relabel = function (raw) { // relabel in order of first appearance -> 0,1,2…
    const map = new Map(); return raw.map((v) => { if (!map.has(v)) map.set(v, map.size); return map.get(v); });
  };
  M.relabelBySize = function (raw) {
    const cnt = new Map(); raw.forEach((v) => cnt.set(v, (cnt.get(v) || 0) + 1));
    const order = [...cnt.keys()].sort((a, b) => cnt.get(b) - cnt.get(a));
    const map = new Map(order.map((v, i) => [v, i]));
    return raw.map((v) => map.get(v));
  };
  // leaf order and node positions for drawing a dendrogram
  M.dendroLayout = function (merges, n) {
    const kids = {}; merges.forEach((m) => { kids[m.id] = [m.a, m.b, m.h]; });
    const order = [];
    const walk = (id) => { if (id < n) { order.push(id); return; } walk(kids[id][0]); walk(kids[id][1]); };
    walk(n + merges.length - 1 >= n ? n + merges.length - 1 : 0);
    const x = {}, y = {};
    order.forEach((leaf, i) => { x[leaf] = i; y[leaf] = 0; });
    merges.forEach((m) => { x[m.id] = (x[m.a] + x[m.b]) / 2; y[m.id] = m.h; });
    return { order, x, y };
  };
  // match labels of a clustering to a reference so colours line up (greedy on overlap)
  M.matchLabels = function (pred, ref) {
    const kp = Math.max(...pred) + 1, kr = Math.max(...ref) + 1, O = Array.from({ length: kp }, () => new Array(kr).fill(0));
    pred.forEach((p, i) => { if (p >= 0 && ref[i] >= 0) O[p][ref[i]]++; });
    const map = new Array(kp).fill(-1), usedR = new Set();
    const pairs = []; for (let a = 0; a < kp; a++) for (let b = 0; b < kr; b++) pairs.push([O[a][b], a, b]);
    pairs.sort((u, v) => v[0] - u[0]);
    pairs.forEach(([, a, b]) => { if (map[a] < 0 && !usedR.has(b)) { map[a] = b; usedR.add(b); } });
    let nxt = kr; for (let a = 0; a < kp; a++) if (map[a] < 0) map[a] = nxt++;
    return pred.map((p) => (p < 0 ? p : map[p]));
  };

  /* --------------------------------------------------------------- PCA */
  M.cov = function (X) {
    const n = X.length, p = X[0].length, mu = M.cols(X).map(M.mean);
    const S = Array.from({ length: p }, () => new Array(p).fill(0));
    X.forEach((x) => { for (let a = 0; a < p; a++) for (let b = a; b < p; b++) S[a][b] += (x[a] - mu[a]) * (x[b] - mu[b]); });
    for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { S[a][b] /= n - 1; S[b][a] = S[a][b]; }
    return { S, mu };
  };
  M.eigSym = function (A) { // Jacobi rotation for symmetric matrices; returns sorted values/vectors (vectors as columns -> arrays)
    const p = A.length, a = A.map((r) => r.slice()), V = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) off += a[i][j] * a[i][j];
      if (off < 1e-20) break;
      for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
        if (Math.abs(a[i][j]) < 1e-15) continue;
        const th = (a[j][j] - a[i][i]) / (2 * a[i][j]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < p; k++) { const aki = a[k][i], akj = a[k][j]; a[k][i] = c * aki - s * akj; a[k][j] = s * aki + c * akj; }
        for (let k = 0; k < p; k++) { const aik = a[i][k], ajk = a[j][k]; a[i][k] = c * aik - s * ajk; a[j][k] = s * aik + c * ajk; }
        for (let k = 0; k < p; k++) { const vki = V[k][i], vkj = V[k][j]; V[k][i] = c * vki - s * vkj; V[k][j] = s * vki + c * vkj; }
      }
    }
    const idx = Array.from({ length: p }, (_, i) => i).sort((u, v) => a[v][v] - a[u][u]);
    const values = idx.map((i) => Math.max(0, a[i][i]));
    const vectors = idx.map((i) => {
      const v = V.map((row) => row[i]);
      // sign convention: largest-magnitude loading positive (keeps arrows stable while sliders move)
      let m = 0; v.forEach((x, j) => { if (Math.abs(x) > Math.abs(v[m])) m = j; });
      return v[m] < 0 ? v.map((x) => -x) : v;
    });
    return { values, vectors };
  };
  M.pca = function (X, o = {}) {
    const st = M.standardize(X, true, !!o.scale);
    const { S } = M.cov(st.X);
    const { values, vectors } = M.eigSym(S);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const scores = st.X.map((x) => vectors.map((v) => v.reduce((s, w, j) => s + w * x[j], 0)));
    return { mu: st.mu, sd: st.sd, Z: st.X, S, values, vectors, pve: values.map((v) => v / total), scores, total };
  };
  M.reconstruct = function (pc, k) { // back to original units using the first k components
    return pc.scores.map((z) => pc.mu.map((m, j) => {
      let s = 0; for (let c = 0; c < k; c++) s += z[c] * pc.vectors[c][j];
      return m + s * pc.sd[j];
    }));
  };

  /* ------------------------------------------------------------ DBSCAN */
  M.dbscan = function (X, eps, minPts) {
    const n = X.length, e2 = eps * eps, nb = X.map((x) => { const r = []; X.forEach((y, j) => { if (M.d2(x, y) <= e2) r.push(j); }); return r; });
    const core = nb.map((r) => r.length >= minPts), labels = new Array(n).fill(-1);
    let c = 0;
    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1 || !core[i]) continue;
      const q = [i]; labels[i] = c;
      while (q.length) {
        const p = q.pop();
        if (!core[p]) continue;
        nb[p].forEach((j) => { if (labels[j] === -1) { labels[j] = c; q.push(j); } });
      }
      c++;
    }
    return { labels, core, k: c };
  };

  /* --------------------------------------------- Gaussian mixture (2D) */
  M.gmm = {
    init(X, k, seed) {
      const km = M.kmeans(X, k, { seed, init: 'plusplus' });
      const comps = km.C.map((c, l) => {
        const pts = X.filter((_, i) => km.labels[i] === l);
        const S = pts.length > 2 ? M.cov(pts).S : [[1, 0], [0, 1]];
        return { mu: c.slice(), S: [[S[0][0] + 0.05, S[0][1]], [S[1][0], S[1][1] + 0.05]], w: pts.length / X.length || 1 / k };
      });
      // start deliberately round so the EM steps are visible
      comps.forEach((c) => { const v = (c.S[0][0] + c.S[1][1]) / 2; c.S = [[v, 0], [0, v]]; c.w = 1 / k; });
      return { comps, R: null, ll: -Infinity };
    },
    pdf(x, c) {
      const [a, b] = c.S[0], d = c.S[1][1], det = a * d - b * b;
      const dx = x[0] - c.mu[0], dy = x[1] - c.mu[1];
      const q = (d * dx * dx - 2 * b * dx * dy + a * dy * dy) / det;
      return Math.exp(-0.5 * q) / (2 * Math.PI * Math.sqrt(Math.max(det, 1e-12)));
    },
    eStep(X, st) {
      let ll = 0;
      st.R = X.map((x) => {
        const p = st.comps.map((c) => c.w * M.gmm.pdf(x, c));
        const s = p.reduce((u, v) => u + v, 0) || 1e-300;
        ll += Math.log(s);
        return p.map((v) => v / s);
      });
      st.ll = ll;
    },
    mStep(X, st) {
      st.comps.forEach((c, k) => {
        let nk = 0, mx = 0, my = 0;
        X.forEach((x, i) => { const r = st.R[i][k]; nk += r; mx += r * x[0]; my += r * x[1]; });
        nk = Math.max(nk, 1e-9); mx /= nk; my /= nk;
        let a = 0, b = 0, d = 0;
        X.forEach((x, i) => { const r = st.R[i][k], dx = x[0] - mx, dy = x[1] - my; a += r * dx * dx; b += r * dx * dy; d += r * dy * dy; });
        c.mu = [mx, my]; c.S = [[a / nk + 1e-3, b / nk], [b / nk, d / nk + 1e-3]]; c.w = nk / X.length;
      });
    },
  };
  M.ellipse = function (S, nsd = 2) { // axes of the covariance ellipse
    const { values, vectors } = M.eigSym(S);
    return { rx: nsd * Math.sqrt(values[0]), ry: nsd * Math.sqrt(values[1]), angle: Math.atan2(vectors[0][1], vectors[0][0]) };
  };
  UL.M = M;

  /* ================================================================ plotting */
  class Plot {
    constructor(el, o = {}) {
      this.el = typeof el === 'string' ? document.querySelector(el) : el;
      this.W = o.w || 600; this.H = o.h || 420;
      this.pad = Object.assign({ l: 14, r: 14, t: 14, b: 14 }, o.pad || {});
      this.cv = document.createElement('canvas');
      this.dpr = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
      this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
      this.cv.style.aspectRatio = `${this.W} / ${this.H}`;
      this.cv.setAttribute('role', 'img');
      if (o.label) this.cv.setAttribute('aria-label', o.label);
      this.el.appendChild(this.cv);
      this.ctx = this.cv.getContext('2d');
      this.ctx.scale(this.dpr, this.dpr);
      this.dom = [0, 1, 0, 1];
    }
    domain(x0, x1, y0, y1, equal) {
      if (equal) { // same scale on both axes so circles look round
        const pw = this.W - this.pad.l - this.pad.r, ph = this.H - this.pad.t - this.pad.b;
        const sx = pw / (x1 - x0), sy = ph / (y1 - y0), s = Math.min(sx, sy);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        x0 = cx - pw / s / 2; x1 = cx + pw / s / 2; y0 = cy - ph / s / 2; y1 = cy + ph / s / 2;
      }
      this.dom = [x0, x1, y0, y1]; return this;
    }
    fit(pts, margin = 0.08, equal = true, fx = (p) => p.x, fy = (p) => p.y) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach((p) => { const x = fx(p), y = fy(p); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; });
      if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1; } if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
      const mx = (x1 - x0) * margin, my = (y1 - y0) * margin;
      return this.domain(x0 - mx, x1 + mx, y0 - my, y1 + my, equal);
    }
    sx(x) { const [a, b] = this.dom; return this.pad.l + ((x - a) / (b - a)) * (this.W - this.pad.l - this.pad.r); }
    sy(y) { const [, , c, d] = this.dom; return this.H - this.pad.b - ((y - c) / (d - c)) * (this.H - this.pad.t - this.pad.b); }
    ix(px) { const [a, b] = this.dom; return a + ((px - this.pad.l) / (this.W - this.pad.l - this.pad.r)) * (b - a); }
    iy(py) { const [, , c, d] = this.dom; return c + ((this.H - this.pad.b - py) / (this.H - this.pad.t - this.pad.b)) * (d - c); }
    clear() { this.ctx.clearRect(0, 0, this.W, this.H); return this; }
    clipped(fn) { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.pad.l, this.pad.t, this.W - this.pad.l - this.pad.r, this.H - this.pad.t - this.pad.b); c.clip(); fn(); c.restore(); }
    frame() {
      const c = this.ctx; c.strokeStyle = UL.LINE; c.lineWidth = 1;
      c.strokeRect(this.pad.l + 0.5, this.pad.t + 0.5, this.W - this.pad.l - this.pad.r - 1, this.H - this.pad.t - this.pad.b - 1);
      return this;
    }
    axes(o = {}) { // light grid + tick labels
      const c = this.ctx, [x0, x1, y0, y1] = this.dom;
      c.font = '10.5px "IBM Plex Mono", monospace'; c.fillStyle = UL.MUTED; c.lineWidth = 1;
      const ticks = (a, b, n) => { const step = niceStep((b - a) / n); const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return out; };
      if (o.x !== false) ticks(x0, x1, o.nx || 6).forEach((v) => {
        const X = Math.round(this.sx(v)) + 0.5; c.strokeStyle = '#f0f0ed'; c.beginPath(); c.moveTo(X, this.pad.t); c.lineTo(X, this.H - this.pad.b); c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(o.fx ? o.fx(v) : fmtTick(v), X, this.H - this.pad.b + 6);
      });
      if (o.y !== false) ticks(y0, y1, o.ny || 5).forEach((v) => {
        const Y = Math.round(this.sy(v)) + 0.5; c.strokeStyle = '#f0f0ed'; c.beginPath(); c.moveTo(this.pad.l, Y); c.lineTo(this.W - this.pad.r, Y); c.stroke();
        c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(o.fy ? o.fy(v) : fmtTick(v), this.pad.l - 6, Y);
      });
      c.strokeStyle = UL.GREY; c.beginPath(); c.moveTo(this.pad.l, this.H - this.pad.b + 0.5); c.lineTo(this.W - this.pad.r, this.H - this.pad.b + 0.5); c.stroke();
      if (o.xlabel) { c.fillStyle = UL.INK; c.font = '11.5px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(o.xlabel, (this.pad.l + this.W - this.pad.r) / 2, this.H - 2); }
      if (o.ylabel) { c.save(); c.fillStyle = UL.INK; c.font = '11.5px "IBM Plex Sans", sans-serif'; c.translate(10, (this.pad.t + this.H - this.pad.b) / 2); c.rotate(-Math.PI / 2); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.ylabel, 0, 0); c.restore(); }
      return this;
    }
    marker(x, y, o = {}) { drawMarker(this.ctx, this.sx(x), this.sy(y), o); }
    markerPx(X, Y, o = {}) { drawMarker(this.ctx, X, Y, o); }
    line(x0, y0, x1, y1, o = {}) {
      const c = this.ctx; c.save(); c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 1.5; c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.dash) c.setLineDash(o.dash);
      c.beginPath(); c.moveTo(this.sx(x0), this.sy(y0)); c.lineTo(this.sx(x1), this.sy(y1)); c.stroke(); c.restore();
    }
    poly(pts, o = {}) {
      const c = this.ctx; if (!pts.length) return; c.save(); c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 2; c.lineJoin = 'round'; c.lineCap = 'round';
      if (o.dash) c.setLineDash(o.dash); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(this.sx(p[0]), this.sy(p[1])) : c.moveTo(this.sx(p[0]), this.sy(p[1]))));
      if (o.fill) { c.fillStyle = o.fill; c.fill(); } if (o.w !== 0) c.stroke(); c.restore();
    }
    circle(x, y, R, o = {}) { // R in data units
      const c = this.ctx, rx = Math.abs(this.sx(x + R) - this.sx(x)); c.save(); c.beginPath(); c.arc(this.sx(x), this.sy(y), rx, 0, 2 * Math.PI);
      if (o.fill) { c.fillStyle = o.fill; c.fill(); } if (o.color) { c.strokeStyle = o.color; c.lineWidth = o.w || 1; if (o.dash) c.setLineDash(o.dash); c.stroke(); } c.restore();
    }
    ellipse(x, y, rx, ry, ang, o = {}) {
      const c = this.ctx, kx = Math.abs(this.sx(1) - this.sx(0)), ky = Math.abs(this.sy(1) - this.sy(0));
      c.save(); c.translate(this.sx(x), this.sy(y)); c.scale(kx, -ky); c.rotate(ang);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 2 * Math.PI); c.restore();
      c.save(); if (o.fill) { c.fillStyle = o.fill; c.fill(); } c.strokeStyle = o.color || UL.INK; c.lineWidth = o.w || 1.5; if (o.dash) c.setLineDash(o.dash); c.stroke(); c.restore();
    }
    arrow(x0, y0, x1, y1, o = {}) {
      const c = this.ctx, X0 = this.sx(x0), Y0 = this.sy(y0), X1 = this.sx(x1), Y1 = this.sy(y1), a = Math.atan2(Y1 - Y0, X1 - X0), h = o.head || 9;
      c.save(); c.strokeStyle = c.fillStyle = o.color || UL.INK; c.lineWidth = o.w || 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X0, Y0); c.lineTo(X1 - Math.cos(a) * h * 0.6, Y1 - Math.sin(a) * h * 0.6); c.stroke();
      c.beginPath(); c.moveTo(X1, Y1); c.lineTo(X1 - h * Math.cos(a - 0.4), Y1 - h * Math.sin(a - 0.4)); c.lineTo(X1 - h * Math.cos(a + 0.4), Y1 - h * Math.sin(a + 0.4)); c.closePath(); c.fill();
      if (o.label) { c.font = '500 12px "IBM Plex Sans", sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(o.label, X1 + 7 * Math.cos(a) + 3, Y1 + 9 * Math.sin(a)); }
      c.restore();
    }
    text(s, x, y, o = {}) { this.textPx(s, this.sx(x), this.sy(y), o); }
    textPx(s, X, Y, o = {}) {
      const c = this.ctx; c.save(); c.font = o.font || '11px "IBM Plex Mono", monospace'; c.fillStyle = o.color || UL.INK;
      c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
      if (o.halo) { c.lineWidth = 3.5; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.strokeText(s, X, Y); }
      c.fillText(s, X, Y); c.restore();
    }
    regions(fn, step = 6, alpha = 0.1) { // colour every patch by fn(x, y) -> cluster index
      const c = this.ctx; step = Math.round(step);
      for (let X = this.pad.l; X < this.W - this.pad.r; X += step) for (let Y = this.pad.t; Y < this.H - this.pad.b; Y += step) {
        const k = fn(this.ix(X + step / 2), this.iy(Y + step / 2));
        if (k == null || k < 0) continue;
        c.fillStyle = UL.rgba(UL.color(k), alpha); c.fillRect(X, Y, Math.min(step, this.W - this.pad.r - X), Math.min(step, this.H - this.pad.b - Y));
      }
    }
    pointer(e) { const r = this.cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * this.W, ((e.clientY - r.top) / r.height) * this.H]; }
    nearest(pts, e, maxPx = 12, fx = (p) => p.x, fy = (p) => p.y) {
      const [X, Y] = this.pointer(e); let best = -1, bd = maxPx * maxPx;
      pts.forEach((p, i) => { const dx = this.sx(fx(p)) - X, dy = this.sy(fy(p)) - Y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      return best;
    }
  }
  function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function fmtTick(v) { return Math.abs(v) >= 1000 ? v.toLocaleString('en-US') : String(+v.toFixed(3)); }
  function drawMarker(c, X, Y, o) {
    const r = o.r || 4.2, shape = o.shape || 'circle';
    c.save(); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.beginPath();
    if (shape === 'circle') c.arc(X, Y, r, 0, 2 * Math.PI);
    else if (shape === 'square') c.rect(X - r * 0.88, Y - r * 0.88, r * 1.76, r * 1.76);
    else if (shape === 'triangle') { c.moveTo(X, Y - r * 1.15); c.lineTo(X + r * 1.05, Y + r * 0.75); c.lineTo(X - r * 1.05, Y + r * 0.75); c.closePath(); }
    else if (shape === 'tri-down') { c.moveTo(X, Y + r * 1.15); c.lineTo(X + r * 1.05, Y - r * 0.75); c.lineTo(X - r * 1.05, Y - r * 0.75); c.closePath(); }
    else if (shape === 'diamond') { c.moveTo(X, Y - r * 1.25); c.lineTo(X + r * 1.05, Y); c.lineTo(X, Y + r * 1.25); c.lineTo(X - r * 1.05, Y); c.closePath(); }
    else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, R = i % 2 ? r * 0.55 : r * 1.3; c.lineTo(X + R * Math.cos(a), Y + R * Math.sin(a)); } c.closePath(); }
    else if (shape === 'cross' || shape === 'plus' || shape === 'x') {
      const k = r * 1.05; c.lineWidth = o.lw || 2.4; c.strokeStyle = o.fill || UL.INK; c.lineCap = 'round';
      if (shape === 'plus') { c.moveTo(X - k, Y); c.lineTo(X + k, Y); c.moveTo(X, Y - k); c.lineTo(X, Y + k); }
      else { c.moveTo(X - k, Y - k); c.lineTo(X + k, Y + k); c.moveTo(X + k, Y - k); c.lineTo(X - k, Y + k); }
      if (o.ring !== false) { c.save(); c.lineWidth = (o.lw || 2.4) + 2.5; c.strokeStyle = '#fff'; c.stroke(); c.restore(); }
      c.stroke(); c.restore(); return;
    }
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.ring !== false) { c.lineWidth = o.ringW || 1.2; c.strokeStyle = o.ringColor || '#fff'; c.stroke(); }
    if (o.stroke) { c.lineWidth = o.lw || 1.5; c.strokeStyle = o.stroke; c.stroke(); }
    c.restore();
  }
  UL.Plot = Plot;
  UL.drawMarker = drawMarker;

  /* ================================================================ UI */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  UL.$ = $; UL.$$ = $$;
  UL.range = function (id, cb, fmt = (v) => v) {
    const el = typeof id === 'string' ? document.getElementById(id) : id, out = el.parentElement.querySelector('output, .v');
    const upd = () => { const v = +el.value; if (out) out.textContent = fmt(v); cb && cb(v); };
    el.addEventListener('input', upd); if (out) out.textContent = fmt(+el.value);
    return { el, get v() { return +el.value; }, set(v) { el.value = v; if (out) out.textContent = fmt(+el.value); } };
  };
  UL.seg = function (id, cb) {
    const el = typeof id === 'string' ? document.getElementById(id) : id, btns = $$('button', el);
    const api = {
      value: (btns.find((b) => b.classList.contains('on')) || btns[0]).dataset.v,
      set(v, fire = true) { api.value = v; btns.forEach((b) => b.classList.toggle('on', b.dataset.v === v)); if (fire && cb) cb(v); },
    };
    btns.forEach((b) => b.addEventListener('click', () => api.set(b.dataset.v)));
    btns.forEach((b) => b.classList.toggle('on', b.dataset.v === api.value));
    return api;
  };
  UL.tip = {
    el: null,
    show(e, html) {
      if (!this.el) { this.el = document.createElement('div'); this.el.className = 'tooltip'; document.body.appendChild(this.el); }
      this.el.innerHTML = html; this.el.hidden = false;
      const x = e.clientX, y = e.clientY, w = this.el.offsetWidth;
      this.el.style.left = (x + w + 30 > window.innerWidth ? x - w - 24 : x) + 'px'; this.el.style.top = y + 'px';
    },
    hide() { if (this.el) this.el.hidden = true; },
  };
  UL.sw = (k) => `<span class="sw" style="background:${UL.color(k)}"></span>`;
  UL.legend = function (el, items) {
    el.innerHTML = items.map((it) => `<span><i class="${it.cls || ''}" style="background:${it.color}"></i>${it.label}</span>`).join('');
  };
  UL.copyText = async function (t) {
    try { await navigator.clipboard.writeText(t); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  };
  UL.tocSpy = function () {
    const links = $$('.toc a'); if (!links.length) return;
    const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const on = () => {
      let cur = secs[0];
      secs.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.3) cur = s; });
      links.forEach((a) => a.classList.toggle('active', cur && a.getAttribute('href') === '#' + cur.id));
    };
    window.addEventListener('scroll', on, { passive: true }); on();
  };
  UL.math = function () {
    if (window.renderMathInElement) renderMathInElement(document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'canvas'],
      throwOnError: false,
    });
  };
  UL.tex = function (el, src, display = false) {
    if (window.katex) katex.render(src, el, { throwOnError: false, displayMode: display }); else el.textContent = src;
  };
  UL.quiz = function (rootId, qs) {
    const root = document.getElementById(rootId); if (!root) return;
    const score = document.getElementById(rootId + '-score');
    let answered = 0, right = 0;
    root.innerHTML = qs.map((q, i) => `<div class="q" data-i="${i}"><p class="q-text"><span>${q.q}</span></p><div class="q-opts">${q.o.map((o, j) => `<button data-j="${j}">${o}</button>`).join('')}</div><p class="q-why">${q.why}</p></div>`).join('');
    $$('.q', root).forEach((qd) => {
      const q = qs[+qd.dataset.i];
      $$('button', qd).forEach((b) => b.addEventListener('click', () => {
        const j = +b.dataset.j; answered++; if (j === q.a) right++;
        $$('button', qd).forEach((x) => { x.disabled = true; if (+x.dataset.j === q.a) x.classList.add('right'); });
        if (j !== q.a) b.classList.add('wrong');
        qd.classList.add('done');
        if (score) score.textContent = `Score: ${right} / ${answered} answered (of ${qs.length})`;
      }));
    });
    UL.math();
  };
  UL.onVisible = function (el, fn) { // start animations only when on screen
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver((es) => es.forEach((e) => fn(e.isIntersecting)), { threshold: 0.05 }).observe(el);
  };
  UL.start = function () {
    UL.tocSpy();
    UL.math();
  };
  window.UL = UL;
})();
