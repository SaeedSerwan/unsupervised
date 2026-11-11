/*!
 * Unsupervised Lab — Overview page
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { M, DS, Plot, $, color, shape, rgba } = Object.assign({}, UL, { color: UL.color, shape: UL.shape });

  /* ------------------------------------------------ 1. take the answers away */
  (function () {
    const plot = new Plot('#sup-plot', { w: 560, h: 400, label: 'Scatter plot of the data' });
    let seed = 3, pts, found;
    const tbl = $('#sup-table'), cap = $('#sup-cap');
    const LAB = ['A', 'B', 'C'];
    const mode = UL.seg('sup-mode', draw);
    function make() {
      pts = DS.blobs({ n: 90, k: 3, sd: 1.05, seed });
      const X = pts.map((p) => [p.x, p.y]);
      found = M.matchLabels(M.kmeansBest(X, 3, 10, seed).labels, pts.map((p) => p.t));
      plot.fit(pts, 0.1, true);
    }
    function draw() {
      const m = mode.value;
      plot.clear().frame();
      pts.forEach((p, i) => {
        const k = m === 'sup' ? p.t : m === 'found' ? found[i] : -1;
        plot.marker(p.x, p.y, { fill: k < 0 ? '#8d8d89' : color(k), shape: k < 0 ? 'circle' : shape(k), r: 4.6 });
      });
      const head = m === 'sup' ? '<th>x₁</th><th>x₂</th><th style="color:var(--ink)">y (label)</th>'
        : m === 'unsup' ? '<th>x₁</th><th>x₂</th><th>y</th>' : '<th>x₁</th><th>x₂</th><th style="color:var(--ink)">cluster (found)</th>';
      const rows = pts.filter((_, i) => i % 15 === 0).slice(0, 6).map((p) => {
        const i = pts.indexOf(p);
        const last = m === 'sup' ? `<span style="color:${color(p.t)}">●</span> ${LAB[p.t]}` : m === 'unsup' ? '<span style="color:var(--faint)">?</span>' : `<span style="color:${color(found[i])}">●</span> group ${found[i] + 1}`;
        return `<tr><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td><td>${last}</td></tr>`;
      }).join('');
      tbl.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${rows}<tr><td colspan="3" style="text-align:center;color:var(--faint)">… ${pts.length - 6} more rows</td></tr></tbody>`;
      cap.innerHTML = m === 'sup' ? '<b>Supervised.</b> Every row comes with its answer (A, B or C). A model learns to copy the answers.'
        : m === 'unsup' ? '<b>Unsupervised.</b> Same points, but the answer column is gone. Are there groups? How many?'
        : '<b>K-means found three groups</b> using only x₁ and x₂. The group numbers have no meaning until a human interprets them.';
    }
    $('#sup-new').addEventListener('click', () => { seed++; make(); draw(); });
    make(); draw();
  })();

  /* ------------------------------------------------------------ 2. course map */
  (function () {
    const el = $('#course-map');
    const W = 880, H = 300, bw = 196, bh = 58;
    const nodes = [
      { id: 'root', x: 440, y: 34, t: ['Do you have labelled data?'], w: 250, h: 44 },
      { id: 'sup', x: 220, y: 128, t: ['Supervised learning', 'done in earlier lectures'], dim: true, w: 210, h: 50 },
      { id: 'uns', x: 660, y: 128, t: ['Unsupervised learning', 'this lecture'], hot: true, w: 210, h: 50 },
      { id: 'cls', x: 112, y: 244, t: ['Predict a category', 'Classification: KNN, SVM, trees'], dim: true },
      { id: 'reg', x: 328, y: 244, t: ['Predict a number', 'Regression: linear, ridge, lasso'], dim: true, href: 'https://saeedserwan.github.io/regression/' },
      { id: 'clu', x: 552, y: 244, t: ['Group the rows', 'Clustering: K-means, hierarchical'], hot: true, href: 'kmeans.html' },
      { id: 'dim', x: 768, y: 244, t: ['Use fewer columns', 'Dim. reduction: PCA'], hot: true, href: 'pca.html' },
    ];
    const N = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const edge = (a, b, lab) => {
      const A = N[a], B = N[b], y0 = A.y + (A.h || bh) / 2, y1 = B.y - (B.h || bh) / 2, ym = (y0 + y1) / 2;
      return `<path d="M${A.x},${y0} V${ym} H${B.x} V${y1}" fill="none" stroke="${B.dim ? '#d6d6d2' : '#111'}" stroke-width="${B.dim ? 1 : 1.4}"/>` +
        (lab ? `<text x="${(A.x + B.x) / 2 + (B.x < A.x ? -8 : 8)}" y="${ym - 6}" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" fill="#6b6b68">${lab}</text>` : '');
    };
    const box = (n) => {
      const w = n.w || bw, h = n.h || bh;
      const inner = `<g class="node${n.hot ? ' hot' : ''}${n.dim ? ' dim' : ''}"><rect x="${n.x - w / 2}" y="${n.y - h / 2}" width="${w}" height="${h}" rx="8"/>` +
        `<text x="${n.x}" y="${n.y + (n.t[1] ? -5 : 4)}" text-anchor="middle" font-family="IBM Plex Sans" font-size="13" font-weight="600" fill="#111">${n.t[0]}</text>` +
        (n.t[1] ? `<text x="${n.x}" y="${n.y + 13}" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="#6b6b68">${n.t[1]}</text>` : '') + '</g>';
      return n.href ? `<a href="${n.href}">${inner}</a>` : inner;
    };
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Course map: supervised versus unsupervised learning">` +
      edge('root', 'sup', 'yes') + edge('root', 'uns', 'no') + edge('sup', 'cls') + edge('sup', 'reg') + edge('uns', 'clu') + edge('uns', 'dim') +
      nodes.map(box).join('') + '</svg>';
  })();

  /* ---------------------------------------------------- 3. rows or columns */
  (function () {
    const r = UL.rng(21), cols = ['study h/wk', 'sleep h', 'coffee/day', 'attendance %', 'quizzes done'];
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const keen = i % 3 !== 0 ? 1 : 0, mid = i % 3 === 2;
      const s = keen ? (mid ? 9 : 14) + r.normal() * 1.6 : 4 + r.normal() * 1.4;
      rows.push([s, 7.5 - s * 0.09 + r.normal() * 0.4, 0.6 + s * 0.17 + r.normal() * 0.5, Math.min(100, 55 + s * 2.8 + r.normal() * 4), Math.round(s * 0.65 + r.normal())].map((v, j) => (j === 4 ? Math.max(0, v) : v)));
    }
    const Z = M.standardize(rows).X;
    const km = M.kmeansBest(Z, 3, 10, 4), lab = M.relabelBySize(km.labels);
    const pc = M.pca(rows, { scale: true });
    const keep = (pc.pve[0] + pc.pve[1]) * 100;
    const tbl = $('#job-table'), foot = $('#job-foot');
    const fmt = (v, j) => (j === 3 ? v.toFixed(0) : j === 4 ? v.toFixed(0) : v.toFixed(1));
    function draw(m) {
      const extra = m === 'cluster' ? '<th style="color:var(--ink)">group</th>' : m === 'reduce' ? '<th class="hi-col" style="color:var(--ink)">Z₁</th><th class="hi-col" style="color:var(--ink)">Z₂</th>' : '';
      const fade = m === 'reduce' ? ' style="opacity:.35"' : '';
      let h = `<thead><tr><th>#</th>${cols.map((c) => `<th${fade}>${c}</th>`).join('')}${extra}</tr></thead><tbody>`;
      rows.forEach((row, i) => {
        const bg = m === 'cluster' ? ` style="background:${rgba(UL.color(lab[i]), 0.08)}"` : '';
        h += `<tr${bg}><td style="color:var(--faint)">${i + 1}</td>${row.map((v, j) => `<td${fade}>${fmt(v, j)}</td>`).join('')}`;
        if (m === 'cluster') h += `<td><span style="color:${UL.color(lab[i])}">●</span> ${['A', 'B', 'C'][lab[i]]}</td>`;
        if (m === 'reduce') h += `<td class="hi-col">${pc.scores[i][0].toFixed(2)}</td><td class="hi-col">${pc.scores[i][1].toFixed(2)}</td>`;
        h += '</tr>';
      });
      tbl.innerHTML = h + '</tbody>';
      foot.innerHTML = m === 'raw' ? 'Ten rows, five columns, and no answer column. Pick a job above.'
        : m === 'cluster' ? '<strong>Clustering</strong> kept all five columns and added a <em>group</em> to each row (K-means, K = 3, on standardised data). Same number of columns, fewer <em>types</em> of rows.'
        : `<strong>PCA</strong> replaced five columns with two new ones, Z₁ and Z₂, that together keep <strong>${keep.toFixed(0)}%</strong> of the information (variance). Same rows, fewer columns, and now we can plot them in 2D.`;
    }
    UL.seg('job-mode', draw); draw('raw');
  })();

  /* --------------------------------------------------------- 4. shapes toy */
  (function () {
    const el = $('#shape-svg'), foot = $('#shape-foot');
    const W = 760, H = 300, forms = ['circle', 'square', 'triangle'], cols = [0, 1, 2, 3];
    const items = [];
    cols.forEach((c) => forms.forEach((f) => items.push({ c, f })));
    const r = UL.rng(5);
    const raw = items.map((_, i) => [70 + (i % 6) * 120 + (r() - 0.5) * 50, 80 + Math.floor(i / 6) * 130 + (r() - 0.5) * 50]);
    const glyph = (f, c) => {
      const fill = UL.color(c);
      if (f === 'circle') return `<circle r="17" fill="${fill}"/>`;
      if (f === 'square') return `<rect x="-15" y="-15" width="30" height="30" rx="3" fill="${fill}"/>`;
      return `<path d="M0,-19 L18,13 L-18,13 Z" fill="${fill}"/>`;
    };
    // new point for classification: orange triangle
    const newIdx = items.findIndex((it) => it.c === 1 && it.f === 'triangle');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Twelve shapes in four colours and three forms"><g id="sh-boxes"></g>` +
      items.map((it, i) => `<g class="sh" data-i="${i}" style="transition:transform .7s cubic-bezier(.3,.7,.2,1)">${glyph(it.f, it.c)}${i === newIdx ? '<text class="q" y="5" text-anchor="middle" font-family="IBM Plex Sans" font-weight="600" font-size="15" fill="#fff" opacity="0" style="transition:opacity .4s">?</text>' : ''}</g>`).join('') + '</svg>';
    const g = UL.$$('.sh', el), boxes = $('#sh-boxes', el);
    const boxSvg = (x, y, w, h, label) => `<g style="animation:fade .5s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#d6d6d2" stroke-dasharray="4 4"/><text x="${x + 12}" y="${y + 20}" font-family="IBM Plex Mono" font-size="11" fill="#6b6b68">${label}</text></g>`;
    function layout(groups, labels, gx) { // groups: array of arrays of item indices
      const pos = new Array(items.length), n = groups.length, gw = (W - 30) / n;
      let b = '';
      groups.forEach((grp, k) => {
        const x0 = 15 + k * gw, cx = x0 + gw / 2, per = Math.min(3, grp.length);
        b += boxSvg(x0 + 6, 18, gw - 12, H - 36, labels[k]);
        grp.forEach((idx, j) => {
          const colN = j % per, rowN = Math.floor(j / per);
          pos[idx] = [cx + (colN - (per - 1) / 2) * 52, 82 + rowN * 58];
        });
      });
      if (gx) b += gx;
      boxes.innerHTML = b;
      return pos;
    }
    function draw(m) {
      let pos;
      const q = el.querySelector('.q');
      q.setAttribute('opacity', 0);
      if (m === 'raw') { pos = raw; boxes.innerHTML = ''; foot.innerHTML = 'Twelve shapes, two features each: <strong>colour</strong> and <strong>form</strong>. How would you group them?'; }
      else if (m === 'colour') { pos = layout(cols.map((c) => items.map((it, i) => (it.c === c ? i : -1)).filter((i) => i >= 0)), ['cluster A', 'cluster B', 'cluster C', 'cluster D']); foot.innerHTML = '<strong>Clustering by colour</strong> gives four groups. Nobody said there should be four: in K-means <em>you</em> must choose that number.'; }
      else if (m === 'form') { pos = layout(forms.map((f) => items.map((it, i) => (it.f === f ? i : -1)).filter((i) => i >= 0)), ['cluster 1', 'cluster 2', 'cluster 3']); foot.innerHTML = '<strong>Clustering by shape</strong> gives three different, equally valid groups. The result depends on which features and which distance we use.'; }
      else {
        const A = items.map((it, i) => (it.c === 0 || it.c === 2 ? i : -1)).filter((i) => i >= 0);
        const B = items.map((it, i) => ((it.c === 1 || it.c === 3) && i !== newIdx ? i : -1)).filter((i) => i >= 0);
        const gw = (W - 30) / 3;
        pos = new Array(items.length);
        let b = boxSvg(21, 18, gw - 12, H - 36, 'Class A (given)') + boxSvg(15 + 2 * gw + 6, 18, gw - 12, H - 36, 'Class B (given)');
        b += `<text x="${W / 2}" y="${H / 2 + 48}" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" fill="#6b6b68">new shape: A or B?</text>`;
        A.forEach((idx, j) => { pos[idx] = [15 + gw / 2 + ((j % 3) - 1) * 52, 82 + Math.floor(j / 3) * 58]; });
        B.forEach((idx, j) => { pos[idx] = [15 + 2.5 * gw + ((j % 3) - 1) * 52, 82 + Math.floor(j / 3) * 58]; });
        pos[newIdx] = [W / 2, H / 2];
        boxes.innerHTML = b;
        q.setAttribute('opacity', 1);
        foot.innerHTML = '<strong>Classification.</strong> Someone already sorted the training shapes into Class A and Class B. A new shape arrives: which class? We know the classes and what they mean. That is supervised learning.';
      }
      g.forEach((node, i) => { node.style.transform = `translate(${pos[i][0]}px, ${pos[i][1]}px)`; });
    }
    const st = document.createElement('style'); st.textContent = '@keyframes fade{from{opacity:0}to{opacity:1}}'; document.head.appendChild(st);
    UL.seg('shape-mode', draw); draw('raw');
  })();

  /* ------------------------------------------------------- benchmark images */
  (function () {
    [['#bench-many', DS.many({})], ['#bench-moons', DS.moons({ n: 300, noise: 0.06 })]].forEach(([id, pts]) => {
      const p = new Plot(id, { w: 420, h: 300 }); p.fit(pts, 0.06, true).frame();
      pts.forEach((q) => p.marker(q.x, q.y, { fill: '#3d3d3b', r: 2.8, ring: false, alpha: 0.75 }));
    });
  })();

  /* --------------------------------------------------- curse of dimensionality */
  (function () {
    const DIMS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000], cache = {};
    const plot = new Plot('#curse-plot', { w: 560, h: 320, pad: { l: 44, r: 14, t: 14, b: 40 } });
    const stats = $('#curse-stats');
    function compute(d) {
      if (cache[d]) return cache[d];
      const r = UL.rng(99 + d), n = 200, P = Array.from({ length: n }, () => Float64Array.from({ length: d }, () => r()));
      const D = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let s = 0; const a = P[i], b = P[j]; for (let k = 0; k < d; k++) { const t = a[k] - b[k]; s += t * t; } D.push(Math.sqrt(s)); }
      let mn = Infinity, mx = 0; D.forEach((v) => { if (v < mn) mn = v; if (v > mx) mx = v; });
      const bins = new Array(40).fill(0); D.forEach((v) => { bins[Math.min(39, Math.floor((v / mx) * 40))]++; });
      return (cache[d] = { mn, mx, bins, n: D.length });
    }
    function draw(i) {
      const d = DIMS[i], c = compute(d), top = Math.max(...c.bins);
      plot.clear().domain(0, 1, 0, top / c.n * 1.12, false).axes({ xlabel: 'distance ÷ largest distance', ylabel: 'share of pairs', fy: (v) => (v * 100).toFixed(0) + '%', nx: 5, ny: 4 });
      const ctx = plot.ctx;
      c.bins.forEach((b, k) => {
        const x0 = plot.sx(k / 40) + 1, x1 = plot.sx((k + 1) / 40) - 1, y = plot.sy(b / c.n), y0 = plot.sy(0);
        if (b === 0) return;
        ctx.fillStyle = UL.COLORS[0]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y, x1 - x0, y0 - y, [3, 3, 0, 0]) : ctx.rect(x0, y, x1 - x0, y0 - y); ctx.fill();
      });
      const contrast = (c.mx - c.mn) / c.mn;
      stats.innerHTML = `<div class="stat"><span class="k">dimensions</span><span class="v">${d}</span></div>` +
        `<div class="stat"><span class="k">nearest pair</span><span class="v">${c.mn.toFixed(3)}</span></div>` +
        `<div class="stat"><span class="k">farthest pair</span><span class="v">${c.mx.toFixed(2)}</span></div>` +
        `<div class="stat"><span class="k">contrast</span><span class="v">${contrast > 100 ? contrast.toExponential(1) : contrast.toFixed(2)}</span></div>`;
    }
    UL.range('curse-d', draw, (v) => DIMS[v]);
    draw(1);
  })();

  /* ------------------------------------------------------ hard vs soft bars */
  (function () {
    const bar = (parts) => `<div style="display:flex;height:30px;border-radius:6px;overflow:hidden;gap:2px">${parts.map((p) => `<div style="flex:${p[0]};background:${p[1]};color:#fff;font:500 .78rem var(--mono);display:flex;align-items:center;padding:0 .6rem;white-space:nowrap">${p[2]}</div>`).join('')}</div>`;
    $('#hard-bar').innerHTML = bar([[100, UL.COLORS[0], 'Student 100%']]);
    $('#soft-bar').innerHTML = bar([[70, UL.COLORS[0], 'Student 70%'], [30, UL.COLORS[1], 'Family 30%']]);
  })();

  /* ------------------------------------------------------------------- quiz */
  UL.quiz('quiz-box', [
    { q: 'A hospital has thousands of tumour samples but no diagnosis labels. It wants to know whether there are natural subgroups. This is…', o: ['Classification', 'Regression', 'Clustering', 'Dimensionality reduction'], a: 2, why: 'There is no answer column and the goal is to group the rows (samples): clustering.' },
    { q: 'A dataset has 20,000 gene measurements per sample and you want to plot it in 2D. Which family?', o: ['Clustering', 'Dimensionality reduction', 'Supervised regression', 'None: it cannot be plotted'], a: 1, why: 'We want fewer columns, not groups of rows: dimensionality reduction (for example PCA).' },
    { q: 'Why can we not compute "accuracy" for a clustering of real, unlabelled data?', o: ['Clustering is too fast', 'There is no answer key to compare with', 'Accuracy only works for regression', 'Clusters are always correct'], a: 1, why: 'Accuracy compares predictions with known answers. Unsupervised data has none, so we judge results by whether they are sensible and useful.' },
    { q: 'The twelve shapes could be grouped by colour or by shape. What does that illustrate?', o: ['The goal of unsupervised learning is fuzzy', 'Clustering is impossible', 'Shapes are not data', 'Colour is always the right feature'], a: 0, why: 'Different features and distances give different, equally valid groupings: the "fuzzy goal" problem.' },
    { q: 'As the number of dimensions grows, the nearest and farthest neighbours of a point…', o: ['get further apart in contrast', 'become almost the same distance away', 'swap places', 'are unaffected'], a: 1, why: 'Distances concentrate in high dimensions (the curse of dimensionality), so "near" and "far" lose meaning.' },
    { q: 'A customer is assigned 70% to "student" and 30% to "family". This is…', o: ['Hard clustering', 'Soft clustering', 'Classification', 'PCA'], a: 1, why: 'Partial membership in several clusters is soft clustering, as in Gaussian mixture models.' },
  ]);

  UL.start();
})();
