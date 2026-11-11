/*!
 * Unsupervised Lab — Hierarchical clustering page
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { M, DS, Plot, $ } = UL;
  const C = UL.color, S = UL.shape;
  const XY = (pts) => pts.map((p) => [p.x, p.y]);

  /* labels for a cut, numbered left-to-right along the dendrogram so colours stay stable */
  function cutLabels(merges, n, k, order) {
    const raw = M.cutK(merges, n, k), map = new Map(), out = new Array(n);
    order.forEach((leaf) => { if (!map.has(raw[leaf])) map.set(raw[leaf], map.size); });
    for (let i = 0; i < n; i++) out[i] = map.get(raw[i]);
    return out;
  }
  // which cluster (or -1 = above the cut) each merge node belongs to
  function nodeColours(merges, n, k, labels) {
    const col = {}, cutAt = n - k; // first n-k merges are below the cut
    merges.forEach((m, s) => { col[m.id] = s < cutAt ? labels[m.members[0]] : -1; });
    return col;
  }
  /* draw a dendrogram. o: {k, labels, upto, hi (merge id), leafLabels, hiLeaves, maxH} */
  function drawTree(plot, merges, n, lay, o = {}) {
    const upto = o.upto == null ? merges.length : o.upto;
    const maxH = o.maxH || Math.max(...merges.map((m) => m.h)) * 1.06 || 1;
    plot.clear().domain(-0.6, n - 0.4, 0, maxH, false).axes({ x: false, ny: 4, fy: (v) => +v.toFixed(2) });
    const col = o.labels ? nodeColours(merges, n, o.k, o.labels) : {};
    const ctx = plot.ctx;
    for (let s = 0; s < upto; s++) {
      const m = merges[s], xa = lay.x[m.a], xb = lay.x[m.b], ya = lay.y[m.a], yb = lay.y[m.b];
      const c = col[m.id] == null || col[m.id] < 0 ? (o.labels ? '#3d3d3b' : UL.INK) : C(col[m.id]);
      const isHi = o.hi === m.id;
      ctx.save(); ctx.strokeStyle = isHi ? UL.INK : c; ctx.lineWidth = isHi ? 3 : o.thin ? 1.1 : 1.6; ctx.lineJoin = 'miter';
      ctx.beginPath(); ctx.moveTo(plot.sx(xa), plot.sy(ya)); ctx.lineTo(plot.sx(xa), plot.sy(m.h)); ctx.lineTo(plot.sx(xb), plot.sy(m.h)); ctx.lineTo(plot.sx(xb), plot.sy(yb)); ctx.stroke(); ctx.restore();
      if (isHi) { plot.marker(lay.x[m.id], m.h, { fill: UL.INK, r: 4.5 }); plot.text(`height ${m.h.toFixed(2)}`, lay.x[m.id], m.h, { base: 'bottom', font: '500 11px "IBM Plex Mono"', halo: true, align: 'center' }); }
    }
    if (o.leafLabels) lay.order.forEach((leaf, i) => {
      const on = o.hiLeaves && o.hiLeaves.includes(leaf);
      plot.textPx(String(leaf + 1), plot.sx(i), plot.H - plot.pad.b + 11, { font: `${on ? 600 : 400} 11px "IBM Plex Mono"`, color: on ? UL.INK : UL.MUTED });
      if (on) { plot.ctx.fillStyle = UL.INK; plot.ctx.fillRect(plot.sx(i) - 7, plot.H - plot.pad.b + 19, 14, 2); }
    });
    return maxH;
  }

  /* ======================================================= 1. reading the tree */
  (function () {
    const tree = new Plot('#rd-tree', { w: 440, h: 330, pad: { l: 40, r: 10, t: 22, b: 30 } });
    const sc = new Plot('#rd-scatter', { w: 440, h: 330, pad: { l: 18, r: 18, t: 18, b: 18 } });
    let pts, X, merges, lay, sel = [], seed = 4, hover = -1;
    const n = 10;
    function make() {
      const r = UL.rng(seed);
      pts = Array.from({ length: n }, () => ({ x: r.normal() * 1.6 + (r() < 0.5 ? -1.8 : 1.8), y: r.normal() * 1.4 }));
      X = XY(pts); merges = M.hclust(X, 'complete'); lay = M.dendroLayout(merges, n); sc.fit(pts, 0.15, true); trap();
    }
    function fusion(a, b) { return merges.find((m) => m.members.includes(a) && m.members.includes(b)); }
    function trap() { // adjacent leaves with the highest fusion
      let best = null;
      for (let i = 0; i < n - 1; i++) { const a = lay.order[i], b = lay.order[i + 1], f = fusion(a, b); if (!best || f.h > best.h) best = { a, b, h: f.h }; }
      sel = [best.a, best.b];
    }
    function draw() {
      const f = sel.length === 2 ? fusion(sel[0], sel[1]) : null;
      drawTree(tree, merges, n, lay, { leafLabels: true, hi: f && f.id, hiLeaves: sel.concat(hover >= 0 ? [hover] : []) });
      sc.clear().frame();
      if (f) sc.line(pts[sel[0]].x, pts[sel[0]].y, pts[sel[1]].x, pts[sel[1]].y, { color: UL.INK, w: 1.4, dash: [5, 4] });
      pts.forEach((p, i) => {
        const on = sel.includes(i) || i === hover;
        sc.marker(p.x, p.y, { fill: on ? UL.INK : '#8d8d89', r: on ? 10 : 9 });
        sc.text(String(i + 1), p.x, p.y, { color: '#fff', font: '600 11px "IBM Plex Mono"' });
      });
      const minM = merges[0];
      const foot = $('#rd-foot'), st = $('#rd-status');
      if (f) {
        const lowest = f.h <= merges[Math.floor(merges.length / 3)].h;
        const posA = lay.order.indexOf(sel[0]), posB = lay.order.indexOf(sel[1]);
        st.innerHTML = `points <b>${sel[0] + 1}</b> and <b>${sel[1] + 1}</b> first join at height <b>${f.h.toFixed(2)}</b>`;
        foot.innerHTML = Math.abs(posA - posB) === 1 && !lowest
          ? `Points ${sel[0] + 1} and ${sel[1] + 1} sit <b>next to each other</b> at the bottom of the tree, yet their branches only meet at height ${f.h.toFixed(2)}, near the top. The scatter confirms they are far apart. Neighbouring leaves are not necessarily similar.`
          : lowest ? `A low fusion: points ${sel[0] + 1} and ${sel[1] + 1} are genuinely similar.` : `They join at height ${f.h.toFixed(2)}: the dashed line on the right is (at most) that long, because complete linkage uses the farthest pair.`;
      } else { st.innerHTML = sel.length ? `point <b>${sel[0] + 1}</b> selected: click a second one` : 'click two points'; foot.innerHTML = `Which two points look most similar? The pair that joins lowest: points <b>${minM.a + 1}</b> and <b>${minM.b + 1}</b> at height ${minM.h.toFixed(2)}.`; }
    }
    function choose(i) { if (i < 0) return; if (sel.length >= 2 || sel.includes(i)) sel = []; sel.push(i); draw(); }
    const leafAt = (e) => { const [px, py] = tree.pointer(e); if (py < tree.H - tree.pad.b - 10) return -1; const i = Math.round(tree.ix(px)); return i >= 0 && i < n ? lay.order[i] : -1; };
    sc.cv.addEventListener('click', (e) => choose(sc.nearest(pts, e, 16)));
    tree.cv.addEventListener('click', (e) => choose(leafAt(e)));
    sc.cv.addEventListener('pointermove', (e) => { const h = sc.nearest(pts, e, 16); sc.cv.style.cursor = h >= 0 ? 'pointer' : 'default'; if (h !== hover) { hover = h; draw(); } });
    tree.cv.addEventListener('pointermove', (e) => { const h = leafAt(e); tree.cv.style.cursor = h >= 0 ? 'pointer' : 'default'; if (h !== hover) { hover = h; draw(); } });
    $('#rd-new').addEventListener('click', () => { seed++; make(); draw(); });
    $('#rd-trap').addEventListener('click', () => { trap(); draw(); });
    make(); draw();
  })();

  /* ============================================================ 2. cut the tree */
  const SETS = {
    blobs3: (n) => DS.blobs({ n, k: 3, sd: 0.85, seed: 1 }),
    blobs4: (n) => DS.blobs({ n, seed: 2, centers: [[-3.2, 3], [3, 3.3], [-3, -3], [3.4, -2.6]], sd: 1 }),
    varied: (n) => DS.varied({ n }),
    moons: (n) => DS.moons({ n, noise: 0.05 }),
    circles: (n) => DS.circles({ n }),
    uniform: (n) => DS.uniform({ n }),
    noisy: () => DS.noisy({}),
  };
  (function () {
    const tree = new Plot('#ct-tree', { w: 560, h: 360, pad: { l: 44, r: 10, t: 14, b: 14 } });
    const sc = new Plot('#ct-scatter', { w: 440, h: 360 });
    let pts, X, merges, lay, k = 3, drag = false, maxH;
    const nR = UL.range('ct-n', build), kR = UL.range('ct-k', (v) => { k = v; draw(); });
    $('#ct-data').addEventListener('change', build); $('#ct-link').addEventListener('change', build);
    function build() {
      pts = SETS[$('#ct-data').value](nR.v); X = XY(pts); merges = M.hclust(X, $('#ct-link').value); lay = M.dendroLayout(merges, X.length); sc.fit(pts, 0.08, true); draw();
    }
    function cutHeight() { // halfway between the merge that stays and the next one
      const n = X.length, lo = k >= n ? 0 : merges[n - k - 1] ? merges[n - k - 1].h : 0, hi = merges[n - k] ? merges[n - k].h : maxH;
      return (lo + hi) / 2;
    }
    function draw() {
      const n = X.length, labels = cutLabels(merges, n, k, lay.order);
      maxH = drawTree(tree, merges, n, lay, { k, labels, thin: n > 50 });
      const h = cutHeight();
      tree.line(-0.6, h, n - 0.4, h, { color: UL.INK, w: 1.5, dash: [6, 5] });
      tree.text(`cut · ${k} cluster${k > 1 ? 's' : ''}`, n - 0.5, h, { align: 'right', base: 'bottom', font: '500 11px "IBM Plex Mono"', halo: true });
      sc.clear().frame();
      pts.forEach((p, i) => sc.marker(p.x, p.y, { fill: C(labels[i]), shape: S(labels[i]), r: 4.4 }));
      const sizes = new Array(k).fill(0); labels.forEach((l) => sizes[l]++);
      $('#ct-cap').innerHTML = `<b>${k} cluster${k > 1 ? 's' : ''}</b> · sizes ${sizes.join(', ')}`;
    }
    const setFromY = (e) => {
      const [, py] = tree.pointer(e), h = tree.iy(py), n = X.length;
      let kk = n; merges.forEach((m) => { if (m.h <= h) kk--; });
      kk = Math.max(1, Math.min(10, kk)); if (kk !== k) { k = kk; kR.set(k); draw(); }
    };
    tree.cv.addEventListener('pointerdown', (e) => { drag = true; tree.cv.setPointerCapture(e.pointerId); setFromY(e); });
    tree.cv.addEventListener('pointermove', (e) => { tree.cv.style.cursor = 'ns-resize'; if (drag) setFromY(e); });
    tree.cv.addEventListener('pointerup', () => { drag = false; });
    build();
  })();

  /* ===================================================== 3. build bottom-up */
  (function () {
    const sc = new Plot('#bd-scatter', { w: 440, h: 320 });
    const tree = new Plot('#bd-tree', { w: 440, h: 320, pad: { l: 40, r: 10, t: 22, b: 30 } });
    const n = 7; let pts, X, merges, lay, step = 0, seed = 9;
    $('#bd-link').addEventListener('change', () => { build(); });
    function make() {
      const r = UL.rng(seed);
      pts = Array.from({ length: n }, (_, i) => ({ x: Math.round((r() * 8 + (i % 2) * 1.5) * 2) / 2, y: Math.round(r() * 6 * 2) / 2 }));
      X = XY(pts); sc.fit(pts, 0.18, true); build();
    }
    function build() { merges = M.hclust(X, $('#bd-link').value); lay = M.dendroLayout(merges, n); step = 0; draw(); }
    function linkD(A, B) {
      const link = $('#bd-link').value;
      if (link === 'centroid') { const ca = M.centroids(X, X.map((_, i) => (A.includes(i) ? 0 : -1)), 1)[0], cb = M.centroids(X, X.map((_, i) => (B.includes(i) ? 0 : -1)), 1)[0]; return M.dist(ca, cb); }
      const ds = []; A.forEach((a) => B.forEach((b) => ds.push(M.dist(X[a], X[b]))));
      return link === 'single' ? Math.min(...ds) : link === 'complete' ? Math.max(...ds) : M.mean(ds);
    }
    function clustersAt(s) {
      let cl = Array.from({ length: n }, (_, i) => ({ id: i, m: [i] }));
      for (let t = 0; t < s; t++) { const mg = merges[t]; cl = cl.filter((c) => c.id !== mg.a && c.id !== mg.b); cl.push({ id: mg.id, m: mg.members.slice() }); }
      return cl.sort((a, b) => Math.min(...a.m) - Math.min(...b.m));
    }
    const name = (c) => (c.m.length === 1 ? String(c.m[0] + 1) : '{' + c.m.map((i) => i + 1).sort((a, b) => a - b).join(',') + '}');
    function draw() {
      const cl = clustersAt(step), last = step > 0 ? merges[step - 1] : null, next = step < n - 1 ? merges[step] : null;
      sc.clear().frame();
      // groups as soft blobs
      let gi = 0;
      cl.forEach((c) => {
        if (c.m.length < 2) return;
        const col = C(gi++), isNew = last && c.id === last.id;
        const cx = M.mean(c.m.map((i) => pts[i].x)), cy = M.mean(c.m.map((i) => pts[i].y)), R = Math.max(...c.m.map((i) => Math.hypot(pts[i].x - cx, pts[i].y - cy))) + 0.45;
        sc.circle(cx, cy, R, { fill: UL.rgba(col, 0.12), color: isNew ? UL.INK : col, w: isNew ? 2 : 1.2 });
      });
      if (next) { // preview of the next merge
        const A = clustersAt(step).find((c) => c.id === next.a), B = clustersAt(step).find((c) => c.id === next.b);
        let best = [0, 0], bd = $('#bd-link').value === 'single' ? Infinity : -Infinity;
        A.m.forEach((a) => B.m.forEach((b) => { const d = M.dist(X[a], X[b]); if ($('#bd-link').value === 'single' ? d < bd : d > bd) { bd = d; best = [a, b]; } }));
        if ($('#bd-link').value !== 'average' && $('#bd-link').value !== 'centroid') sc.line(pts[best[0]].x, pts[best[0]].y, pts[best[1]].x, pts[best[1]].y, { color: UL.INK, w: 1.3, dash: [4, 4] });
      }
      pts.forEach((p, i) => { sc.marker(p.x, p.y, { fill: '#3d3d3b', r: 8 }); sc.text(String(i + 1), p.x, p.y, { color: '#fff', font: '500 10px "IBM Plex Mono"' }); });
      drawTree(tree, merges, n, lay, { upto: step, leafLabels: true, hi: last && last.id, maxH: merges[n - 2].h * 1.08 });
      // distance matrix of current clusters
      let h = '<thead><tr><th></th>' + cl.map((c) => `<th>${name(c)}</th>`).join('') + '</tr></thead><tbody>';
      cl.forEach((a, i) => {
        h += `<tr><th>${name(a)}</th>`;
        cl.forEach((b, j) => {
          if (j >= i) { h += '<td class="dead">·</td>'; return; }
          const d = linkD(a.m, b.m), isMin = next && ((a.id === next.a && b.id === next.b) || (a.id === next.b && b.id === next.a));
          h += `<td${isMin ? ' class="min"' : ''}>${d.toFixed(2)}</td>`;
        });
        h += '</tr>';
      });
      $('#bd-matrix').innerHTML = cl.length > 1 ? h + '</tbody>' : '<tbody><tr><td>one cluster: the root</td></tr></tbody>';
      $('#bd-n').textContent = `${step} of ${n - 1} · ${cl.length} cluster${cl.length > 1 ? 's' : ''}`;
      const nm = (id) => name(cl.find((c) => c.id === id) || { m: merges.find((mm) => mm.id === id) ? merges.find((mm) => mm.id === id).members : [id] });
      $('#bd-msg').innerHTML = !last ? `Every point is its own cluster. The matrix holds all pairwise distances. The smallest (framed) is ${next.h.toFixed(2)}, so ${nm(next.a)} and ${nm(next.b)} merge first. Press <b>Merge next</b>.`
        : !next ? `Done: after ${n - 1} merges everything is one cluster, the root of the tree.`
        : `Merged into ${name(cl.find((c) => c.id === last.id))} at height ${last.h.toFixed(2)}. Distances to the new cluster were updated with <b>${$('#bd-link').value}</b> linkage. Next: ${nm(next.a)} + ${nm(next.b)} at ${next.h.toFixed(2)}.`;
      $('#bd-step').disabled = !next; $('#bd-back').disabled = step === 0;
    }
    $('#bd-step').addEventListener('click', () => { if (step < n - 1) { step++; draw(); } });
    $('#bd-back').addEventListener('click', () => { if (step > 0) { step--; draw(); } });
    $('#bd-new').addEventListener('click', () => { seed++; make(); });
    make();
  })();

  /* ====================================================== 4. linkage explorer */
  (function () {
    const plot = new Plot('#lk-plot', { w: 520, h: 360 });
    const A = [[-3.2, 1.6], [-2.2, 2.6], [-1.6, 1.2], [-2.8, 0.4], [-1.2, 2.4]], B = [[1.4, -0.8], [2.6, -0.2], [2.2, -1.8], [3.4, -1.2], [1.2, -2.2]];
    const all = () => A.map((p) => ({ x: p[0], y: p[1], g: 0 })).concat(B.map((p) => ({ x: p[0], y: p[1], g: 1 })));
    plot.domain(-5, 5, -3.6, 3.6, true);
    const mode = UL.seg('lk-mode', draw);
    let drag = null;
    function vals() {
      const ds = []; let mn = [Infinity], mx = [-Infinity];
      A.forEach((a, i) => B.forEach((b, j) => { const d = M.dist(a, b); ds.push(d); if (d < mn[0]) mn = [d, i, j]; if (d > mx[0]) mx = [d, i, j]; }));
      const ca = [M.mean(A.map((p) => p[0])), M.mean(A.map((p) => p[1]))], cb = [M.mean(B.map((p) => p[0])), M.mean(B.map((p) => p[1]))];
      return { mn, mx, avg: M.mean(ds), ca, cb, cen: M.dist(ca, cb) };
    }
    function draw() {
      const v = vals(), m = mode.value;
      plot.clear().frame();
      if (m === 'average') A.forEach((a) => B.forEach((b) => plot.line(a[0], a[1], b[0], b[1], { color: UL.MUTED, w: 0.8, dash: [3, 3], alpha: 0.6 })));
      if (m === 'single') plot.line(A[v.mn[1]][0], A[v.mn[1]][1], B[v.mn[2]][0], B[v.mn[2]][1], { color: UL.INK, w: 2, dash: [6, 4] });
      if (m === 'complete') plot.line(A[v.mx[1]][0], A[v.mx[1]][1], B[v.mx[2]][0], B[v.mx[2]][1], { color: UL.INK, w: 2, dash: [6, 4] });
      if (m === 'centroid') plot.line(v.ca[0], v.ca[1], v.cb[0], v.cb[1], { color: UL.INK, w: 2, dash: [6, 4] });
      all().forEach((p) => plot.marker(p.x, p.y, { fill: C(p.g === 0 ? 0 : 2), shape: S(p.g === 0 ? 0 : 2), r: 7 }));
      if (m === 'centroid') [v.ca, v.cb].forEach((c, g) => plot.marker(c[0], c[1], { shape: 'star', fill: C(g === 0 ? 0 : 2), r: 8, stroke: UL.INK, lw: 1.2 }));
      plot.textPx('group A', 16, 18, { align: 'left', color: C(0), font: '500 12px "IBM Plex Sans"' });
      plot.textPx('group B', plot.W - 16, plot.H - 18, { align: 'right', color: '#0f7a54', font: '500 12px "IBM Plex Sans"' });
      const cell = (key, label, val) => `<div class="stat${key === m ? ' hi' : ''}" style="${key === m ? 'background:var(--soft)' : ''}"><span class="k">${label}</span><span class="v">${val.toFixed(2)}</span></div>`;
      $('#lk-stats').innerHTML = cell('complete', 'complete (max)', v.mx[0]) + cell('single', 'single (min)', v.mn[0]) + cell('average', 'average (all 25)', v.avg) + cell('centroid', 'centroid', v.cen);
      $('#lk-msg').innerHTML = {
        complete: 'Complete linkage uses the two <b>farthest</b> points. Two groups are only "close" if <em>every</em> pair is close, which keeps clusters compact.',
        single: 'Single linkage uses the two <b>closest</b> points. One near pair is enough to merge, which creates long chains, and lets it follow curved shapes.',
        average: 'Average linkage computes <b>all 25</b> point-to-point distances between the groups and averages them: a compromise between single and complete.',
        centroid: 'Centroid linkage finds the centre of each group (the stars) and measures between the centres.',
      }[m] + ' Drag a point to see how the four numbers react.';
    }
    plot.cv.addEventListener('pointerdown', (e) => {
      const i = plot.nearest(all(), e, 16); if (i < 0) return;
      drag = i < A.length ? [A, i] : [B, i - A.length]; plot.cv.setPointerCapture(e.pointerId);
    });
    plot.cv.addEventListener('pointermove', (e) => {
      if (!drag) { plot.cv.style.cursor = plot.nearest(all(), e, 16) >= 0 ? 'grab' : 'default'; return; }
      const [px, py] = plot.pointer(e); drag[0][drag[1]] = [plot.ix(px), plot.iy(py)]; draw();
    });
    plot.cv.addEventListener('pointerup', () => { drag = null; });
    draw();
  })();

  /* ================================================== 5. linkages side by side */
  (function () {
    const grid = $('#cmp-grid'), foot = $('#cmp-foot');
    const LINKS = [['complete', 'Complete'], ['average', 'Average'], ['single', 'Single'], ['ward', 'Ward']];
    const cells = LINKS.map(() => {
      const w = document.createElement('div'); grid.appendChild(w);
      const t = document.createElement('div'); t.className = 'plot'; w.appendChild(t);
      const s = document.createElement('div'); s.className = 'plot'; s.style.marginTop = '.4rem'; w.appendChild(s);
      const c = document.createElement('p'); c.className = 'plot-cap'; w.appendChild(c);
      return { tree: new Plot(t, { w: 300, h: 190, pad: { l: 34, r: 6, t: 20, b: 6 } }), sc: new Plot(s, { w: 300, h: 230 }), cap: c };
    });
    const K = { blobs3: 3, moons: 2, circles: 2, varied: 3, noisy: 3 };
    function run() {
      const name = $('#cmp-data').value, pts = name === 'noisy' ? SETS.noisy() : SETS[name](name === 'blobs3' ? 120 : 160), X = XY(pts), k = K[name];
      const res = [];
      LINKS.forEach(([link, label], i) => {
        const merges = M.hclust(X, link), lay = M.dendroLayout(merges, X.length);
        let labels = cutLabels(merges, X.length, k, lay.order);
        const truth = pts.map((p) => p.t);
        const matched = M.matchLabels(labels, truth.map((t) => (t < 0 ? 0 : t)));
        const ok = pts.filter((p, j) => p.t >= 0).filter((p, j) => true);
        const acc = pts.reduce((s, p, j) => s + (p.t >= 0 && matched[j] === p.t ? 1 : 0), 0) / pts.filter((p) => p.t >= 0).length;
        const c = cells[i];
        drawTree(c.tree, merges, X.length, lay, { k, labels: matched.map((l) => l), thin: true });
        c.tree.textPx(label, c.tree.pad.l + 4, 10, { align: 'left', font: '600 12px "IBM Plex Sans"' });
        c.sc.clear().fit(pts, 0.06, true).frame();
        pts.forEach((p, j) => c.sc.marker(p.x, p.y, { fill: C(matched[j]), shape: S(matched[j]), r: 2.9 }));
        c.cap.innerHTML = `<b>${label}</b> · ${(acc * 100).toFixed(0)}% match`;
        res.push([label, acc]);
        void ok;
      });
      const best = res.slice().sort((a, b) => b[1] - a[1])[0];
      foot.innerHTML = {
        blobs3: 'On round blobs complete, average and Ward agree. Single linkage may peel off a few stray points as their own "cluster".',
        moons: `Single linkage follows the chain of close neighbours along each moon. Best here: <b>${best[0]}</b>.`,
        circles: `Only single linkage can separate nested rings, because every point has a close neighbour on its own ring. Best here: <b>${best[0]}</b>.`,
        varied: `Uneven spreads: the wide group is hard for every method. Best here: <b>${best[0]}</b>.`,
        noisy: 'Noise points act as bridges. Single linkage chains through them and merges everything; complete, average and Ward hold up better. (DBSCAN can label the noise explicitly: see Beyond the lecture.)',
      }[name];
    }
    $('#cmp-data').addEventListener('change', run);
    run();
  })();

  /* ================================================================ 6. cost */
  (function () {
    const NS = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000];
    const bytes = (b) => (b < 1e6 ? (b / 1e3).toFixed(0) + ' KB' : b < 1e9 ? (b / 1e6).toFixed(0) + ' MB' : b < 1e12 ? (b / 1e9).toFixed(0) + ' GB' : (b / 1e12).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' TB');
    UL.range('cs-n', (i) => {
      const n = NS[i], pairs = (n * (n - 1)) / 2;
      $('#cs-stats').innerHTML = `<div class="stat"><span class="k">points</span><span class="v">${n.toLocaleString('en-US')}</span></div>` +
        `<div class="stat"><span class="k">pairwise distances n(n−1)/2</span><span class="v">${pairs >= 1e9 ? M.fmt(pairs, 0) : pairs.toLocaleString('en-US')}</span></div>` +
        `<div class="stat"><span class="k">memory to store them (8 bytes each)</span><span class="v">${bytes(pairs * 8)}</span></div>`;
    }, (i) => NS[i].toLocaleString('en-US'));
    $('#cs-n').dispatchEvent(new Event('input'));
  })();

  UL.quiz('quiz-box', [
    { q: 'Which method needs K before it starts?', o: ['Hierarchical clustering', 'K-means', 'Both', 'Neither'], a: 1, why: 'K-means needs K first. Hierarchical clustering builds the whole tree; you choose K later by cutting it.' },
    { q: 'In a dendrogram, what tells you how similar two points are?', o: ['How close their leaves are at the bottom', 'The height where their branches first join', 'The colour of the branches', 'The number of leaves between them'], a: 1, why: 'Only the fusion height matters. Leaf order is partly arbitrary: any branch can be flipped.' },
    { q: 'Which linkage tends to make long chains?', o: ['Complete', 'Average', 'Single', 'Centroid'], a: 2, why: 'Single linkage merges groups as soon as any one pair is close, so clusters grow point by point along chains.' },
    { q: 'With 8 points, how many merges until we reach the root?', o: ['8', '7', '28', '4'], a: 1, why: 'Each merge reduces the number of clusters by one: from 8 to 1 takes n − 1 = 7 merges.' },
    { q: 'You cut a dendrogram with a horizontal line and it crosses 4 vertical branches. You get…', o: ['4 clusters', '3 clusters', '5 clusters', 'it depends on the linkage'], a: 0, why: 'Every branch the cut line crosses becomes one cluster.' },
    { q: 'Complete linkage measures the distance between two groups as…', o: ['the distance between their closest points', 'the distance between their farthest points', 'the average of all pairwise distances', 'the distance between their centres'], a: 1, why: 'Complete = maximum pairwise distance, which favours compact, balanced clusters.' },
    { q: 'Why is hierarchical clustering impractical for 1 million points?', o: ['It needs labels', 'It needs about 5 × 10¹¹ pairwise distances', 'It only works in 2D', 'It cannot handle more than 10 clusters'], a: 1, why: 'n(n−1)/2 distances is about 5 × 10¹¹ for a million points: terabytes of memory.' },
  ]);

  UL.start();
})();
