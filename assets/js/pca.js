/*!
 * Unsupervised Lab — PCA page
 * Author: Eng. Saeed Serwan Abdulsattar
 */
(function () {
  'use strict';
  const { M, Plot, $ } = UL;
  const C = UL.color;
  const PCC = [UL.COLORS[0], UL.COLORS[1], UL.COLORS[2]]; // PC1, PC2, PC3 colours
  const pct = (v, d = 0) => (v * 100).toFixed(d) + '%';

  /* ===================================================== tiny 3D renderer */
  class View3D {
    constructor(plot, o = {}) {
      this.p = plot; this.yaw = o.yaw == null ? 0.7 : o.yaw; this.pitch = o.pitch == null ? 0.35 : o.pitch; this.R = 3; this.spin = false; this.onchange = null;
      let drag = null;
      plot.cv.style.cursor = 'grab';
      plot.cv.addEventListener('pointerdown', (e) => { drag = plot.pointer(e); plot.cv.setPointerCapture(e.pointerId); plot.cv.style.cursor = 'grabbing'; this.dragging = true; });
      plot.cv.addEventListener('pointermove', (e) => {
        if (!drag) return; const q = plot.pointer(e);
        this.yaw += (q[0] - drag[0]) * 0.01; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + (q[1] - drag[1]) * 0.01)); drag = q;
        if (this.onchange) this.onchange();
      });
      const up = () => { drag = null; this.dragging = false; plot.cv.style.cursor = 'grab'; };
      plot.cv.addEventListener('pointerup', up); plot.cv.addEventListener('pointercancel', up);
    }
    proj(v) { // v = [x, y, z] (z up) -> [screenX, screenY, depth] in data units
      const ca = Math.cos(this.yaw), sa = Math.sin(this.yaw), cb = Math.cos(this.pitch), sb = Math.sin(this.pitch);
      const x1 = v[0] * ca - v[1] * sa, y1 = v[0] * sa + v[1] * ca;
      const y2 = y1 * cb - v[2] * sb, z2 = y1 * sb + v[2] * cb;
      return [x1, z2, y2];
    }
    frame(R) { this.R = R; this.p.domain(-R, R, -R, R, true); }
    seg(a, b, o) { const A = this.proj(a), B = this.proj(b); this.p.line(A[0], A[1], B[0], B[1], o); }
    render(o) {
      const p = this.p; p.clear();
      // axes through the origin
      (o.axes || []).forEach((name, j) => {
        const e = [0, 0, 0]; e[j] = this.R * 0.82; const n = e.map((v) => -v);
        this.seg(n, e, { color: '#d9d9d5', w: 1 });
        const P = this.proj(e); p.text(name, P[0], P[1], { color: UL.MUTED, font: '11px "IBM Plex Sans"', halo: true });
      });
      if (o.plane) { // parallelogram c ± a·u ± b·v
        const { u, v, a, b } = o.plane, cs = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([s, t]) => this.proj([0, 1, 2].map((j) => s * a * u[j] + t * b * v[j])));
        p.poly(cs.concat([cs[0]]).map((q) => [q[0], q[1]]), { fill: 'rgba(17,17,17,0.06)', color: '#bdbdb8', w: 1 });
      }
      if (o.line) { const { u, a } = o.line; this.seg(u.map((x) => -a * x), u.map((x) => a * x), { color: '#9a9a96', w: 2 }); }
      // points sorted back to front
      const items = [];
      (o.pts || []).forEach((v, i) => {
        const P = this.proj(v), Q = o.proj ? this.proj(o.proj[i]) : null;
        items.push({ d: P[2], f: () => {
          if (Q && o.drop) p.line(P[0], P[1], Q[0], Q[1], { color: '#8d8d89', w: 0.8, alpha: 0.6 });
          if (Q) p.marker(P[0], P[1], { fill: o.color(i), r: 2.6, alpha: 0.28, ring: false });
          const T = Q || P; p.marker(T[0], T[1], { fill: o.color(i), r: o.r || 3.6, alpha: 0.95, ringW: 0.8 });
        } });
      });
      items.sort((a, b) => b.d - a.d).forEach((it) => it.f());
      (o.arrows || []).forEach((ar) => { const E = this.proj(ar.v.map((x) => x * ar.len)); p.arrow(0, 0, E[0], E[1], { color: ar.color, label: ar.label, w: 2.6 }); });
    }
  }
  function spinLoop(view, el, enabled, draw) { // auto-rotation only while visible
    let vis = false, last = 0;
    UL.onVisible(el, (v) => { vis = v; });
    const tick = (t) => {
      if (vis && enabled() && !view.dragging && t - last > 30) { view.yaw += 0.006; draw(); last = t; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ============================================================ 3D datasets */
  function orthoBasis(a, b) { // orthonormal u, v, w from two rough directions
    const norm = (x) => { const l = Math.hypot(...x); return x.map((y) => y / l); };
    const u = norm(a), d = b.reduce((s, x, j) => s + x * u[j], 0), v = norm(b.map((x, j) => x - d * u[j]));
    const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    return [u, v, w];
  }
  const DS3 = {
    sheet() {
      const r = UL.rng(31), [u, v, w] = orthoBasis([1, -1, 0], [1, 1, -2]), X = [];
      for (let i = 0; i < 220; i++) { const a = r.normal() * 1.6, b = r.normal() * 1.3, c = r.normal() * 0.1; X.push([0, 1, 2].map((j) => a * u[j] + b * v[j] + c * w[j])); }
      return { cols: ['x₁', 'x₂', 'x₃'], X, name: 'flat sheet' };
    },
    cigar() {
      const r = UL.rng(32), [u, v, w] = orthoBasis([0.6, 0.5, 0.62], [0, 1, -0.4]), X = [];
      for (let i = 0; i < 200; i++) { const a = r.normal() * 1.8, b = r.normal() * 0.2, c = r.normal() * 0.16; X.push([0, 1, 2].map((j) => a * u[j] + b * v[j] + c * w[j])); }
      return { cols: ['x₁', 'x₂', 'x₃'], X, name: 'cigar' };
    },
    ball() {
      const r = UL.rng(33), X = [];
      for (let i = 0; i < 220; i++) X.push([r.normal(), r.normal(), r.normal()]);
      return { cols: ['x₁', 'x₂', 'x₃'], X, name: 'round ball' };
    },
    body() {
      const r = UL.rng(34), X = [];
      for (let i = 0; i < 200; i++) { const h = 170 + r.normal() * 9; X.push([h, h + r.normal() * 2.5, 70 + 0.95 * (h - 170) + r.normal() * 3.5]); }
      return { cols: ['height (cm)', 'arm span (cm)', 'weight (kg)'], X, name: 'body measurements' };
    },
    marks() {
      const r = UL.rng(35), X = [];
      for (let i = 0; i < 200; i++) { const sci = r.normal(); X.push([65 + 12 * sci + r.normal() * 5, 60 + 11 * sci + r.normal() * 6, 70 + r.normal() * 12]); }
      return { cols: ['maths', 'physics', 'art'], X, name: 'student marks' };
    },
    groups() {
      const r = UL.rng(36), X = [], g = [], dir = [1, 0.8, 0.6];
      for (let i = 0; i < 200; i++) { const s = i % 2 ? 1 : -1; g.push(i % 2); X.push([0, 1, 2].map((j) => s * 1.25 * dir[j] + r.normal() * 0.7)); }
      return { cols: ['x₁', 'x₂', 'x₃'], X, g, name: 'two groups' };
    },
    arc() { // a twisted ring: a 1D curve that PCA cannot flatten
      const r = UL.rng(37), X = [], t = [];
      for (let i = 0; i < 200; i++) { const a = (2 * Math.PI * 0.94 * i) / 199; t.push(i / 199); X.push([2 * Math.cos(a) + r.normal() * 0.06, 2 * Math.sin(a) + r.normal() * 0.06, 1.4 * Math.cos(2 * a) + r.normal() * 0.06]); }
      return { cols: ['x₁', 'x₂', 'x₃'], X, t, name: 'twisted ring' };
    },
  };
  const ramp = (q) => { // sequential blue ramp, light -> dark
    const a = [214, 230, 248], b = [16, 60, 125];
    return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * q)).join(',')})`;
  };

  /* ================================================== §02 picture: 3D -> 2D */
  (function () {
    const p3 = new Plot('#pic-3d', { w: 440, h: 360 }), p2 = new Plot('#pic-2d', { w: 440, h: 360, pad: { l: 40, r: 12, t: 12, b: 34 } });
    const view = new View3D(p3, { yaw: 0.4, pitch: 0.3 });
    const r = UL.rng(40), [u, v, w] = orthoBasis([1, 0.3, 0.5], [-0.2, 1, 0.3]), X = [], g = [];
    for (let i = 0; i < 160; i++) { const s = i % 2, a = (s ? 1.3 : -1.2) + r.normal() * 0.7, b = (s ? -0.5 : 0.6) + r.normal() * 0.65, c = r.normal() * 0.18; g.push(s); X.push([0, 1, 2].map((j) => a * u[j] + b * v[j] + c * w[j])); }
    const pc = M.pca(X), rec = M.reconstruct(pc, 2).map((x) => x.map((y, j) => y - pc.mu[j]));
    const Z = pc.Z, R = Math.max(...Z.map((x) => Math.hypot(...x))) * 1.05;
    view.frame(R);
    const a = 2.3 * Math.sqrt(pc.values[0]), b = 2.3 * Math.sqrt(pc.values[1]);
    function draw() {
      view.render({ pts: Z, proj: $('#pic-drop').checked ? rec : null, drop: true, color: (i) => C(g[i] ? 1 : 0), plane: { u: pc.vectors[0], v: pc.vectors[1], a, b }, axes: ['x₁', 'x₂', 'x₃'] });
    }
    p2.fit(pc.scores.map((s) => ({ x: s[0], y: s[1] })), 0.12, true).axes({ xlabel: 'PC1 score (Z₁)', ylabel: 'PC2 score (Z₂)', nx: 5, ny: 5 });
    pc.scores.forEach((s, i) => p2.marker(s[0], s[1], { fill: C(g[i] ? 1 : 0), shape: UL.shape(g[i] ? 1 : 0), r: 4 }));
    p2.textPx(`kept ${pct(pc.pve[0] + pc.pve[1], 1)} of the variance`, p2.W - 16, 24, { align: 'right', font: '500 11px "IBM Plex Mono"', halo: true });
    view.onchange = draw; $('#pic-drop').addEventListener('change', draw);
    spinLoop(view, p3.cv, () => $('#pic-spin').checked, draw);
    draw();
  })();

  /* ================================================ §04 rotate a line (PC1) */
  (function () {
    const plot = new Plot('#rot-plot', { w: 520, h: 420 });
    const curve = new Plot('#rot-curve', { w: 420, h: 150, pad: { l: 38, r: 10, t: 10, b: 24 } });
    let X, pc1, theta = 100, anim = null, names;
    const aR = UL.range('rot-a', (v) => { theta = v; draw(); }, (v) => v + '°');
    function load() {
      const r = UL.rng(50), kind = $('#rot-data').value, raw = [];
      for (let i = 0; i < 90; i++) {
        if (kind === 'tilted') { const a = r.normal() * 2.1, b = r.normal() * 0.7, t = 0.6; raw.push([a * Math.cos(t) - b * Math.sin(t), a * Math.sin(t) + b * Math.cos(t)]); }
        else if (kind === 'hw') { const h = 170 + r.normal() * 9; raw.push([h, 70 + 0.85 * (h - 170) + r.normal() * 6]); }
        else raw.push([r.normal() * 1.3, r.normal() * 1.3]);
      }
      names = kind === 'hw' ? ['height (z)', 'weight (z)'] : ['X₁', 'X₂'];
      X = kind === 'hw' ? M.standardize(raw).X : M.standardize(raw, true, false).X;
      const pc = M.pca(X); pc1 = (Math.atan2(pc.vectors[0][1], pc.vectors[0][0]) * 180) / Math.PI; pc1 = ((pc1 % 180) + 180) % 180;
      const R = Math.max(...X.map((x) => Math.hypot(...x))) * 1.08; plot.domain(-R, R, -R, R, true);
    }
    const stats = (th) => {
      const u = [Math.cos((th * Math.PI) / 180), Math.sin((th * Math.PI) / 180)];
      const t = X.map((x) => x[0] * u[0] + x[1] * u[1]);
      const kept = t.reduce((s, v) => s + v * v, 0) / (X.length - 1);
      const total = X.reduce((s, x) => s + x[0] * x[0] + x[1] * x[1], 0) / (X.length - 1);
      return { u, t, kept, lost: total - kept, total };
    };
    function draw() {
      const s = stats(theta), [x0, x1] = plot.dom, L = (x1 - x0);
      plot.clear().frame();
      plot.line(-L, 0, L, 0, { color: '#efefec', w: 1 }); plot.line(0, -L, 0, L, { color: '#efefec', w: 1 });
      X.forEach((x, i) => { const q = [s.t[i] * s.u[0], s.t[i] * s.u[1]]; plot.line(x[0], x[1], q[0], q[1], { color: UL.COLORS[1], w: 1, alpha: 0.55 }); });
      plot.clipped(() => plot.line(-L * s.u[0], -L * s.u[1], L * s.u[0], L * s.u[1], { color: UL.INK, w: 2 }));
      X.forEach((x) => plot.marker(x[0], x[1], { fill: '#a3a3a0', r: 3.4, ring: false }));
      X.forEach((x, i) => plot.marker(s.t[i] * s.u[0], s.t[i] * s.u[1], { fill: UL.COLORS[0], r: 3, ringW: 0.8 }));
      plot.textPx(names[0] + ' →', plot.W - 14, plot.sy(0) - 10, { align: 'right', color: UL.MUTED, font: '11px "IBM Plex Sans"' });
      plot.textPx('↑ ' + names[1], plot.sx(0) + 8, 18, { align: 'left', color: UL.MUTED, font: '11px "IBM Plex Sans"' });
      $('#rot-stats').innerHTML = `<div class="stat"><span class="k">variance kept (spread on line)</span><span class="v" style="color:${UL.COLORS[0]}">${s.kept.toFixed(3)}</span></div>` +
        `<div class="stat"><span class="k">variance lost (mean squared drop)</span><span class="v" style="color:#c2501f">${s.lost.toFixed(3)}</span></div>` +
        `<div class="stat"><span class="k">kept / total</span><span class="v">${pct(s.kept / s.total, 1)}</span></div>`;
      // curve
      const vals = []; for (let a = 0; a <= 180; a += 2) vals.push([a, stats(a).kept]);
      const top = Math.max(...vals.map((v) => v[1])) * 1.1;
      curve.clear().domain(0, 180, 0, top, false).axes({ nx: 6, ny: 3, fx: (v) => v + '°', fy: (v) => +v.toFixed(2) });
      curve.line(pc1, 0, pc1, top, { color: UL.INK, w: 1, dash: [3, 3] });
      curve.text('PC1', pc1, top * 0.95, { align: 'left', font: '500 10px "IBM Plex Mono"', halo: true });
      curve.poly(vals, { color: UL.COLORS[0], w: 2 });
      curve.marker(theta, s.kept, { fill: UL.INK, r: 4.5 });
      const f1 = s.u[0].toFixed(2), f2 = s.u[1].toFixed(2);
      $('#rot-formula').innerHTML = `Z₁ = ${f1}·${names[0].replace(' (z)', '')} ${s.u[1] < 0 ? '−' : '+'} ${Math.abs(s.u[1]).toFixed(2)}·${names[1].replace(' (z)', '')} &nbsp; (${f1}² + ${f2}² = 1)`;
      const off = Math.min(Math.abs(theta - pc1), 180 - Math.abs(theta - pc1));
      $('#rot-foot').innerHTML = $('#rot-data').value === 'round'
        ? 'A round cloud has the same spread in every direction: the curve is almost flat and PC1 is barely better than any other line. PCA cannot compress data like this.'
        : off < 2 ? `<b>This is PC1.</b> The blue dots on the line are as spread out as possible, and the orange drop lines are as short as possible. Kept + lost always equals the total variance; PCA just moves as much as it can into "kept".`
        : `The line is ${off.toFixed(0)}° away from PC1. Turn it until the blue projections spread out the most.`;
    }
    plot.cv.addEventListener('pointerdown', (e) => { plot.cv.setPointerCapture(e.pointerId); setA(e); plot.cv.dataset.d = 1; });
    plot.cv.addEventListener('pointermove', (e) => { plot.cv.style.cursor = 'crosshair'; if (plot.cv.dataset.d === '1') setA(e); });
    plot.cv.addEventListener('pointerup', () => { plot.cv.dataset.d = 0; });
    function setA(e) { const [px, py] = plot.pointer(e); let a = (Math.atan2(plot.iy(py), plot.ix(px)) * 180) / Math.PI; a = Math.round(((a % 180) + 180) % 180) % 180; theta = a; aR.set(a); draw(); }
    $('#rot-snap').addEventListener('click', () => {
      cancelAnimationFrame(anim); let from = theta, to = pc1; if (to - from > 90) to -= 180; if (from - to > 90) to += 180;
      const t0 = performance.now(), tick = (t) => { const u = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - u, 3); theta = (((from + (to - from) * e) % 180) + 180) % 180; aR.set(Math.round(theta)); draw(); if (u < 1) anim = requestAnimationFrame(tick); };
      anim = requestAnimationFrame(tick);
    });
    $('#rot-data').addEventListener('change', () => { load(); draw(); });
    load(); draw();
  })();

  /* ============================================ §06 shape the cloud: PC1, PC2 */
  (function () {
    const plot = new Plot('#sh-plot', { w: 520, h: 420 });
    let base;
    const newBase = (seed) => { const r = UL.rng(seed); base = Array.from({ length: 160 }, () => [r.normal(), r.normal()]); };
    let seed = 60; newBase(seed);
    const A = UL.range('sh-a', draw, (v) => (v / 10).toFixed(1)), B = UL.range('sh-b', draw, (v) => (v / 10).toFixed(1)), T = UL.range('sh-r', draw, (v) => v + '°');
    $('#sh-new').addEventListener('click', () => { newBase(++seed); draw(); });
    plot.domain(-6, 6, -5, 5, true);
    function draw() {
      const a = A.v / 10, b = B.v / 10, t = (T.v * Math.PI) / 180;
      const X = base.map(([u, v]) => [a * u * Math.cos(t) - b * v * Math.sin(t), a * u * Math.sin(t) + b * v * Math.cos(t)]);
      const pc = M.pca(X), mu = pc.mu;
      plot.clear().frame();
      X.forEach((x) => plot.marker(x[0], x[1], { fill: '#8d8d89', r: 3.2, ring: false, alpha: 0.7 }));
      [0, 1].forEach((m) => { const v = pc.vectors[m], L = 2 * Math.sqrt(pc.values[m]); plot.arrow(mu[0], mu[1], mu[0] + v[0] * L, mu[1] + v[1] * L, { color: PCC[m], label: 'PC' + (m + 1), w: 3 }); });
      const S = pc.S;
      $('#sh-cov').innerHTML = `<table class="matrix"><tr><th></th><th>X₁</th><th>X₂</th></tr><tr><th>X₁</th><td>${S[0][0].toFixed(2)}</td><td>${S[0][1].toFixed(2)}</td></tr><tr><th>X₂</th><td>${S[1][0].toFixed(2)}</td><td>${S[1][1].toFixed(2)}</td></tr></table>`;
      $('#sh-stats').innerHTML = `<div class="stat"><span class="k">λ₁ (variance on PC1)</span><span class="v">${pc.values[0].toFixed(2)}</span></div>` +
        `<div class="stat"><span class="k">λ₂ (variance on PC2)</span><span class="v">${pc.values[1].toFixed(2)}</span></div>` +
        `<div class="stat"><span class="k">PC1 loadings (φ₁₁, φ₂₁)</span><span class="v" style="font-size:.95rem">${pc.vectors[0][0].toFixed(2)}, ${pc.vectors[0][1].toFixed(2)}</span></div>`;
      $('#sh-bars').innerHTML = [0, 1].map((m) => `<div style="display:grid;grid-template-columns:3.5rem 1fr 3.5rem;gap:.6rem;align-items:center;font:.8rem var(--mono);margin:.3rem 0"><span>PC${m + 1}</span><span style="height:10px;border-radius:0 4px 4px 0;background:${PCC[m]};width:${pc.pve[m] * 100}%"></span><span style="text-align:right">${pct(pc.pve[m], 0)}</span></div>`).join('') +
        `<p style="font-size:.86rem;color:var(--ink-2);margin:.6rem 0 0">${pc.pve[0] > 0.9 ? 'Almost everything is along PC1: one number per point would be enough.' : pc.pve[0] < 0.6 ? 'The cloud is nearly round: both directions matter, so dropping PC2 would lose a lot.' : 'PC1 carries most of the spread; PC2 still adds a useful amount.'}</p>`;
    }
    draw();
  })();

  /* ================================================ §07 standardise first */
  (function () {
    const plot = new Plot('#un-plot', { w: 520, h: 400, pad: { l: 58, r: 14, t: 14, b: 40 } });
    const r = UL.rng(70), km = [], mins = [];
    for (let i = 0; i < 120; i++) { const d = Math.max(0.6, 12 + r.normal() * 5); km.push(d); mins.push(Math.max(3, 4 + 2.2 * d + r.normal() * 6)); }
    const units = UL.seg('un-units', draw), std = $('#un-std'); std.addEventListener('change', draw);
    function draw() {
      const m = units.value === 'm', X = km.map((d, i) => [m ? d * 1000 : d, mins[i]]), s = std.checked;
      const pc = M.pca(X, { scale: s }), v = pc.vectors[0];
      const show = s ? pc.Z : X, lab = [s ? 'distance (z-score)' : m ? 'distance (m)' : 'distance (km)', s ? 'time (z-score)' : 'time (minutes)'];
      const pts = show.map((x) => ({ x: x[0], y: x[1] }));
      plot.fit(pts, 0.08, s).clear().axes({ xlabel: lab[0], ylabel: lab[1], nx: 5, ny: 5 });
      pts.forEach((p) => plot.marker(p.x, p.y, { fill: '#8d8d89', r: 3.2, ring: false, alpha: 0.75 }));
      // PC1 direction in the drawn space
      const c = s ? [0, 0] : pc.mu, dir = v;
      const span = Math.max(plot.dom[1] - plot.dom[0], plot.dom[3] - plot.dom[2]) * 2;
      const ctx = plot.ctx; ctx.save(); ctx.beginPath(); ctx.rect(plot.pad.l, plot.pad.t, plot.W - plot.pad.l - plot.pad.r, plot.H - plot.pad.t - plot.pad.b); ctx.clip();
      plot.line(c[0] - dir[0] * span, c[1] - dir[1] * span, c[0] + dir[0] * span, c[1] + dir[1] * span, { color: PCC[0], w: 2.5 });
      ctx.restore();
      const vd = M.variance(X.map((x) => x[0])), vt = M.variance(X.map((x) => x[1]));
      $('#un-stats').innerHTML = `<div class="stat"><span class="k">variance of distance</span><span class="v">${M.fmt(s ? 1 : vd, s ? 2 : vd > 1e4 ? 0 : 1)}</span></div>` +
        `<div class="stat"><span class="k">variance of time</span><span class="v">${M.fmt(s ? 1 : vt, s ? 2 : 1)}</span></div>` +
        `<div class="stat"><span class="k">PC1 loadings (distance, time)</span><span class="v" style="font-size:.95rem">${v[0].toFixed(2)}, ${v[1].toFixed(2)}</span></div>` +
        `<div class="stat"><span class="k">PVE of PC1</span><span class="v">${pct(pc.pve[0], 1)}</span></div>`;
      $('#un-msg').innerHTML = s ? 'Standardised: both columns have variance 1, so PC1 weighs them about equally (≈ 0.71 each). The answer no longer depends on the units. <b>This is the one to trust.</b>'
        : m ? 'In metres the distance column has a variance in the millions. PC1 is almost exactly the distance axis (loading ≈ 1.00) and "explains" nearly 100%: an artefact of the units, not a discovery.'
        : 'In km, time (in minutes) has the bigger numbers, so PC1 leans towards time. Change the units to metres and the answer flips. That should worry you.';
    }
    draw();
  })();

  /* ======================================== §08 how many components (big lab) */
  // what each dataset teaches; c = cumulative PVE [1, 2, 3] on standardised data
  const WHY = {
    sheet: ['2', (c) => `Two PCs keep ${pct(c[1])}; PC3 is only the thickness of the sheet (noise). The 90% rule, the elbow and Kaiser all say 2.`],
    cigar: ['1', (c) => `One PC keeps ${pct(c[0])}: the points lie along a line, so 3 numbers per point become 1.`],
    ball: ['all 3', (c) => `Each PC holds roughly a third (${pct(c[0])} for PC1). The eigenvalues are all close to 1, there is no elbow, and the 90% rule needs all three: PCA cannot simplify a round cloud.`],
    body: ['1', (c) => `Height, arm span and weight move together: PC1 is "body size" (similar loadings on all three) and keeps ${pct(c[0])}.`],
    marks: ['2', (c) => `PC1 ≈ science ability (maths + physics), PC2 ≈ art. Two meaningful components keep ${pct(c[1])}; PC3 is noise.`],
    groups: ['1 for clustering, 2 by the 90% rule', (c) => `PC1 keeps ${pct(c[0])} and on its own already separates the two groups. The 90% rule asks for 2, but if your purpose is to find the groups, 1 is enough. Purpose beats percentages.`],
    arc: ['3 (PCA struggles)', (c) => `The points lie on a closed 1D curve, but PCA only finds flat directions, so it sees something close to a round ball (${pct(c[0])} → ${pct(c[1])} → 100%). With 1 or 2 PCs the curve folds onto itself: light and dark points land on top of each other. Non-linear methods (see Beyond the lecture) handle this.`],
  };
  const cumOf = (p) => { const c = []; p.pve.reduce((s, v, i) => (c[i] = s + v), 0); return c; };
  (function () {
    const p3 = new Plot('#hm-3d', { w: 440, h: 380 }), low = new Plot('#hm-low', { w: 440, h: 380, pad: { l: 40, r: 12, t: 14, b: 34 } });
    const scree = new Plot('#hm-scree', { w: 440, h: 260, pad: { l: 44, r: 14, t: 14, b: 32 } });
    const view = new View3D(p3, { yaw: 0.6, pitch: 0.32 });
    let D, pc, k = 2;
    const kSeg = UL.seg('hm-k', (v) => { k = +v; drawAll(); });
    $('#hm-data').addEventListener('change', load); $('#hm-std').addEventListener('change', load);
    const colour = (i) => (D.g ? C(D.g[i]) : D.t ? ramp(D.t[i]) : '#3d3d3b');
    function load() {
      D = DS3[$('#hm-data').value]();
      pc = M.pca(D.X, { scale: $('#hm-std').checked });
      view.frame(Math.max(...pc.Z.map((x) => Math.hypot(...x))) * 1.05);
      drawAll();
    }
    function rules(p) {
      const cum = []; p.pve.reduce((s, v, i) => (cum[i] = s + v), 0);
      const k90 = cum.findIndex((c) => c >= 0.9) + 1;
      const meanL = M.mean(p.values), kaiser = p.values.filter((v) => v > meanL).length; // = λ > 1 when standardised
      const drops = [p.pve[0] - p.pve[1], p.pve[1] - p.pve[2]];
      const elbow = Math.max(...drops) < 0.12 ? null : drops[0] >= drops[1] ? 1 : 2;
      return { cum, k90, kaiser, elbow };
    }
    function draw3() {
      const rec = k < 3 ? M.reconstruct(pc, k).map((x) => x.map((y, j) => (y - pc.mu[j]) / pc.sd[j])) : null;
      const sd = pc.values.map((v) => Math.sqrt(v));
      view.render({
        pts: pc.Z, proj: rec, drop: true, color: colour, r: 3.4,
        plane: k === 2 ? { u: pc.vectors[0], v: pc.vectors[1], a: 2.4 * sd[0], b: 2.4 * sd[1] } : null,
        line: k === 1 ? { u: pc.vectors[0], a: 2.8 * sd[0] } : null,
        arrows: [0, 1, 2].map((m) => ({ v: pc.vectors[m], len: 2 * sd[m], color: PCC[m], label: 'PC' + (m + 1) })).filter((_, m) => m < Math.max(k, 1) || k === 3),
        axes: D.cols.map((c) => c.replace(/ \(.*\)/, '')),
      });
    }
    function drawAll() {
      const R = rules(pc);
      draw3();
      $('#hm-3dcap').innerHTML = k === 3 ? '<b>All 3 PCs kept</b>: nothing is lost (just a rotation)' : `<b>Faint</b>: original points · <b>solid</b>: projected onto the ${k === 1 ? 'PC1 line' : 'PC1–PC2 plane'}`;
      // low-dimensional view
      low.clear();
      if (k === 1) {
        const z = pc.scores.map((s) => s[0]), r = UL.rng(3), jit = z.map(() => (r() - 0.5) * 0.5);
        const ext = Math.max(...z.map(Math.abs)) * 1.1;
        low.domain(-ext, ext, -1.5, 1.5, false).axes({ y: false, xlabel: 'PC1 score (the only number kept per point)', nx: 6 });
        low.line(-ext, 0, ext, 0, { color: UL.LINE, w: 1 });
        z.forEach((v, i) => low.marker(v, jit[i], { fill: colour(i), r: 3.6, alpha: 0.9 }));
        low.textPx('vertical spread is jitter only, to show overlapping points', low.W / 2, 24, { color: UL.FAINT, font: '11px "IBM Plex Sans"' });
      } else {
        const pts = pc.scores.map((s) => ({ x: s[0], y: s[1] }));
        low.fit(pts, 0.1, true).axes({ xlabel: 'PC1 score', ylabel: 'PC2 score', nx: 5, ny: 5 });
        pts.forEach((p, i) => low.marker(p.x, p.y, { fill: colour(i), r: 3.4, alpha: 0.9, shape: D.g ? UL.shape(D.g[i]) : 'circle' }));
      }
      $('#hm-lowcap').innerHTML = k === 1 ? `<b>3D → 1D</b>: each point is now one number · keeps ${pct(R.cum[0], 1)}`
        : k === 2 ? `<b>3D → 2D</b>: two numbers per point · keeps ${pct(R.cum[1], 1)}` : `<b>3 PCs</b> (PC1 vs PC2 shown) · keeps 100%`;
      // scree
      scree.clear().domain(0.4, 3.6, 0, 1.05, false).axes({ nx: 3, ny: 5, fx: (v) => (Number.isInteger(v) ? 'PC' + v : ''), fy: (v) => Math.round(v * 100) + '%' });
      const ctx = scree.ctx;
      pc.pve.forEach((v, m) => {
        const x0 = scree.sx(m + 1 - 0.28), x1 = scree.sx(m + 1 + 0.28), y = scree.sy(v), y0 = scree.sy(0);
        ctx.fillStyle = m < k ? PCC[m] : '#dcdcd7'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y, x1 - x0, y0 - y, [4, 4, 0, 0]) : ctx.rect(x0, y, x1 - x0, y0 - y); ctx.fill();
        scree.textPx(pct(v, 1), (x0 + x1) / 2, y - 9, { font: '500 11px "IBM Plex Mono"', color: m < k ? UL.INK : UL.MUTED });
      });
      scree.line(0.4, 0.9, 3.6, 0.9, { color: UL.MUTED, w: 1, dash: [4, 4] });
      scree.text('90%', 3.58, 0.9, { align: 'right', base: 'bottom', color: UL.MUTED, font: '10px "IBM Plex Mono"' });
      scree.poly(R.cum.map((c, m) => [m + 1, c]), { color: UL.INK, w: 1.8 });
      R.cum.forEach((c, m) => scree.marker(m + 1, c, { fill: UL.INK, r: 3.6 }));
      // rules table
      const row = (name, val, note) => `<tr><td>${name}</td><td style="font-family:var(--mono);font-weight:500">${val}</td><td style="color:var(--muted);font-size:.84rem">${note}</td></tr>`;
      const lam = pc.values.map((v) => v.toFixed(2)).join(', ');
      $('#hm-rules').innerHTML = '<tbody>' +
        row('90% cumulative', 'k = ' + R.k90, 'cumulative: ' + R.cum.map((c) => pct(c, 0)).join(' → ')) +
        row('Elbow', R.elbow ? 'k = ' + R.elbow : 'none', R.elbow ? 'biggest drop comes after PC' + R.elbow : 'bars are similar: no clear elbow') +
        row($('#hm-std').checked ? 'Kaiser (λ > 1)' : 'Kaiser (λ > mean λ)', 'k = ' + R.kaiser, 'λ = ' + lam) +
        row('<strong>You keep</strong>', 'k = ' + k, `kept ${pct(R.cum[k - 1], 1)} · lost ${pct(1 - R.cum[k - 1], 1)}`) + '</tbody>';
      // loadings
      let h = '<tr><th></th><th>PC1</th><th>PC2</th><th>PC3</th></tr>';
      D.cols.forEach((c, j) => {
        h += `<tr><th style="text-align:left">${c}</th>` + [0, 1, 2].map((m) => { const v = pc.vectors[m][j], col = v >= 0 ? UL.COLORS[0] : UL.COLORS[1]; return `<td style="background:${UL.rgba(col, Math.min(0.5, Math.abs(v) * 0.55))};${m >= k ? 'opacity:.45' : ''}">${v.toFixed(2)}</td>`; }).join('') + '</tr>';
      });
      $('#hm-load').innerHTML = h;
      $('#hm-foot').innerHTML = `<b>${D.name}:</b> ${WHY[$('#hm-data').value][1](cumOf(M.pca(D.X, { scale: true })))}`;
    }
    view.onchange = draw3;
    spinLoop(view, p3.cv, () => $('#hm-spin').checked, draw3);
    // summary table for all datasets (standardised)
    $('#hm-summary').innerHTML = Object.keys(DS3).map((key) => {
      const d = DS3[key](), p = M.pca(d.X, { scale: true }), cum = []; p.pve.reduce((s, v, i) => (cum[i] = s + v), 0);
      return `<tr><td><strong>${$(`#hm-data option[value="${key}"]`).textContent}</strong></td><td style="font-family:var(--mono)">${cum.map((c) => pct(c, 0)).join(' · ')}</td><td><strong>${WHY[key][0]}</strong></td><td style="color:var(--ink-2)">${WHY[key][1](cum)}</td></tr>`;
    }).join('');
    load();
  })();

  /* ====================================================== §10 wine 13 -> 2 */
  (function () {
    const W = window.UL_DATA.wine;
    const scree = new Plot('#wn-scree', { w: 440, h: 280, pad: { l: 44, r: 12, t: 14, b: 32 } });
    const bi = new Plot('#wn-bi', { w: 440, h: 420, pad: { l: 40, r: 12, t: 12, b: 34 } });
    let pc, k = 2;
    const kR = UL.range('wn-k', (v) => { k = v; drawScree(); });
    ['#wn-col', '#wn-arrows'].forEach((s) => $(s).addEventListener('change', drawBi));
    $('#wn-std').addEventListener('change', () => { fit(); drawScree(); drawBi(); });
    const nice = (c) => c.replace(/_/g, ' ');
    function fit() { pc = M.pca(W.X, { scale: $('#wn-std').checked }); }
    function drawScree() {
      const cum = []; pc.pve.reduce((s, v, i) => (cum[i] = s + v), 0);
      scree.clear().domain(0.3, 13.7, 0, 1.05, false).axes({ nx: 13, ny: 5, fx: (v) => (Number.isInteger(v) ? v : ''), fy: (v) => Math.round(v * 100) + '%', xlabel: 'component' });
      const ctx = scree.ctx;
      pc.pve.forEach((v, m) => {
        const x0 = scree.sx(m + 1 - 0.32), x1 = scree.sx(m + 1 + 0.32), y = scree.sy(v), y0 = scree.sy(0);
        ctx.fillStyle = m < k ? UL.COLORS[0] : '#dcdcd7'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y, x1 - x0, y0 - y, [3, 3, 0, 0]) : ctx.rect(x0, y, x1 - x0, y0 - y); ctx.fill();
      });
      [0.8, 0.9].forEach((t) => { scree.line(0.3, t, 13.7, t, { color: UL.MUTED, w: 1, dash: [4, 4] }); scree.text(Math.round(t * 100) + '%', 13.65, t, { align: 'right', base: 'bottom', font: '10px "IBM Plex Mono"', color: UL.MUTED }); });
      scree.poly(cum.map((c, m) => [m + 1, c]), { color: UL.INK, w: 1.8 });
      cum.forEach((c, m) => scree.marker(m + 1, c, { fill: m < k ? UL.INK : '#bdbdb8', r: 3.4 }));
      const k80 = cum.findIndex((c) => c >= 0.8) + 1, k90 = cum.findIndex((c) => c >= 0.9) + 1;
      const meanL = M.mean(pc.values), kai = pc.values.filter((v) => v > meanL).length;
      $('#wn-stats').innerHTML = `<div class="stat"><span class="k">kept with k = ${k}</span><span class="v">${pct(cum[k - 1], 1)}</span></div>` +
        `<div class="stat"><span class="k">80% rule</span><span class="v">k = ${k80}</span></div><div class="stat"><span class="k">90% rule</span><span class="v">k = ${k90}</span></div>` +
        `<div class="stat"><span class="k">Kaiser (λ > ${$('#wn-std').checked ? '1' : 'mean'})</span><span class="v">k = ${kai}</span></div>`;
      $('#wn-foot').innerHTML = $('#wn-std').checked
        ? `Thirteen columns, but the first two components already keep ${pct(cum[1], 0)}, enough for a 2D picture in which the three cultivars separate clearly. For a model, the rules suggest ${k80}–${k90} components (Kaiser: ${kai}). Notice there is no sharp elbow: real data is rarely as tidy as the toy sets.`
        : `Without standardising, proline (values in the hundreds to over a thousand) dominates: PC1 alone "explains" ${pct(pc.pve[0], 0)}, but it is mostly just proline. Tick standardise again.`;
    }
    function drawBi() {
      const pts = pc.scores.map((s) => ({ x: s[0], y: s[1] })), col = $('#wn-col').checked;
      bi.fit(pts, 0.1, true).clear().axes({ xlabel: `PC1 (${pct(pc.pve[0], 0)})`, ylabel: `PC2 (${pct(pc.pve[1], 0)})`, nx: 5, ny: 5 });
      pts.forEach((p, i) => bi.marker(p.x, p.y, { fill: col ? C(W.y[i]) : '#8d8d89', shape: col ? UL.shape(W.y[i]) : 'circle', r: 3.6, alpha: 0.85 }));
      if ($('#wn-arrows').checked) {
        const ext = Math.min(bi.dom[1], bi.dom[3]) * 0.85, L = W.cols.map((_, j) => Math.hypot(pc.vectors[0][j], pc.vectors[1][j])), sc = ext / Math.max(...L);
        const top = L.map((l, j) => [l, j]).sort((a, b) => b[0] - a[0]).slice(0, 8).map((x) => x[1]);
        W.cols.forEach((c, j) => {
          const x = pc.vectors[0][j] * sc, y = pc.vectors[1][j] * sc, on = top.includes(j);
          bi.arrow(0, 0, x, y, { color: on ? UL.INK : '#b5b5b0', w: on ? 1.5 : 1, head: 6 });
          if (on) bi.text(nice(c), x * 1.08, y * 1.08, { font: '500 10.5px "IBM Plex Sans"', halo: true, align: x >= 0 ? 'left' : 'right' });
        });
      }
    }
    bi.cv.addEventListener('pointermove', (e) => {
      const pts = pc.scores.map((s) => ({ x: s[0], y: s[1] })), i = bi.nearest(pts, e, 10);
      if (i < 0) return UL.tip.hide();
      UL.tip.show(e, `${UL.sw(W.y[i])}<b>wine #${i + 1}</b> · cultivar ${W.y[i] + 1}<br>PC1 ${pts[i].x.toFixed(2)} · PC2 ${pts[i].y.toFixed(2)}<br>alcohol ${W.X[i][0].toFixed(1)} · colour ${W.X[i][9].toFixed(1)}`);
    });
    bi.cv.addEventListener('pointerleave', () => UL.tip.hide());
    fit(); drawScree(); drawBi();
  })();

  /* ================================================== §11 image compression */
  (function () {
    const N = 96, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    // a procedural picture: sky, sun, hills, a building and some text
    const sky = g.createLinearGradient(0, 0, 0, N); sky.addColorStop(0, '#e9e9e9'); sky.addColorStop(1, '#7a7a7a'); g.fillStyle = sky; g.fillRect(0, 0, N, N);
    g.fillStyle = '#fafafa'; g.beginPath(); g.arc(70, 22, 11, 0, 7); g.fill();
    g.fillStyle = '#4a4a4a'; g.beginPath(); g.moveTo(0, 70); g.quadraticCurveTo(25, 46, 50, 66); g.quadraticCurveTo(72, 52, 96, 62); g.lineTo(96, 96); g.lineTo(0, 96); g.fill();
    g.fillStyle = '#1c1c1c'; g.fillRect(14, 40, 16, 40); g.fillRect(18, 30, 8, 10);
    g.fillStyle = '#d0d0d0'; for (let y = 44; y < 76; y += 7) { g.fillRect(17, y, 3, 4); g.fillRect(24, y, 3, 4); }
    g.fillStyle = '#111'; g.font = 'bold 22px "IBM Plex Sans", sans-serif'; g.textAlign = 'center'; g.fillText('PCA', 62, 90);
    const img = g.getImageData(0, 0, N, N).data, X = [];
    for (let y = 0; y < N; y++) { const row = []; for (let x = 0; x < N; x++) row.push(img[(y * N + x) * 4] / 255); X.push(row); }
    const pc = M.pca(X);
    const orig = new Plot('#im-orig', { w: 300, h: 300, pad: { l: 0, r: 0, t: 0, b: 0 } }), rec = new Plot('#im-rec', { w: 300, h: 300, pad: { l: 0, r: 0, t: 0, b: 0 } });
    const cum = new Plot('#im-cum', { w: 300, h: 150, pad: { l: 36, r: 8, t: 8, b: 22 } });
    const paint = (plot, A) => {
      const c2 = document.createElement('canvas'); c2.width = c2.height = N; const g2 = c2.getContext('2d'), d = g2.createImageData(N, N);
      A.forEach((row, y) => row.forEach((v, x) => { const q = Math.max(0, Math.min(255, Math.round(v * 255))), o = (y * N + x) * 4; d.data[o] = d.data[o + 1] = d.data[o + 2] = q; d.data[o + 3] = 255; }));
      g2.putImageData(d, 0, 0); plot.clear(); plot.ctx.imageSmoothingEnabled = false; plot.ctx.drawImage(c2, 0, 0, plot.W, plot.H);
    };
    paint(orig, X);
    const cumv = []; pc.pve.reduce((s, v, i) => (cumv[i] = s + v), 0);
    UL.range('im-k', (k) => {
      paint(rec, M.reconstruct(pc, k));
      const stored = k * N + k * N + N;
      $('#im-cap').innerHTML = `<b>Rebuilt from ${k} component${k > 1 ? 's' : ''}</b>`;
      $('#im-stats').innerHTML = `<div class="stat"><span class="k">variance kept</span><span class="v">${pct(cumv[k - 1], 1)}</span></div>` +
        `<div class="stat"><span class="k">numbers stored</span><span class="v">${stored.toLocaleString('en-US')}</span></div>` +
        `<div class="stat"><span class="k">vs original 9,216</span><span class="v">${pct(stored / (N * N), 0)}</span></div>`;
      cum.clear().domain(0.5, 60.5, Math.floor(cumv[0] * 10) / 10, 1.005, false).axes({ nx: 6, ny: 3, fy: (v) => Math.round(v * 100) + '%' });
      cum.poly(cumv.slice(0, 60).map((c, i) => [i + 1, c]), { color: UL.COLORS[0], w: 2 });
      cum.marker(k, cumv[k - 1], { fill: UL.INK, r: 4 });
    });
    $('#im-k').dispatchEvent(new Event('input'));
  })();

  UL.quiz('quiz-box', [
    { q: 'PCA chooses the first principal component to…', o: ['predict y as well as possible', 'have the largest possible variance', 'be equal to the most important original column', 'separate the clusters'], a: 1, why: 'PC1 is the normalised linear combination of the features with maximum variance. There is no y in PCA.' },
    { q: 'Why must the loadings satisfy Σφ² = 1?', o: ['To make PCA faster', 'Otherwise we could make the variance as large as we like with huge weights', 'So that the scores are positive', 'Because there are only two features'], a: 1, why: 'Fixing the length means only the direction is chosen, which makes the problem meaningful.' },
    { q: 'PC2 is…', o: ['the second largest original column', 'the direction of most remaining variance, orthogonal to PC1', 'PC1 with the sign flipped', 'always half of PC1'], a: 1, why: 'Each new component is uncorrelated with (perpendicular to) the previous ones and captures as much remaining variance as possible.' },
    { q: 'A distance is stored in metres instead of kilometres. Without scaling, PCA will…', o: ['give the same result', 'treat distance as far more important', 'ignore distance', 'fail with an error'], a: 1, why: 'The metre column has a million times larger variance, so it dominates PC1. Standardise first.' },
    { q: 'The cumulative PVE is 72%, 91%, 97%, 100% for 1–4 components. Using a 90% threshold, keep…', o: ['1', '2', '3', '4'], a: 1, why: 'The smallest k whose cumulative PVE reaches 90% is k = 2 (91%).' },
    { q: 'On standardised data, the Kaiser rule keeps components whose eigenvalue is…', o: ['greater than 0', 'greater than 1', 'the largest only', 'greater than 90%'], a: 1, why: 'Each standardised column has variance 1, so a component worth keeping should explain more than one original column: λ > 1.' },
    { q: 'All three PCs of a 3D dataset explain about 33% each. This means…', o: ['keep only PC1', 'the data is like a round ball: PCA cannot reduce it without losing a lot', 'the data has three clusters', 'you forgot to standardise'], a: 1, why: 'Equal variance in every direction means no direction is special, so dropping any of them loses a third of the information.' },
    { q: 'Points lie on a curved arc in 3D. One PC…', o: ['captures it perfectly', 'folds the curve onto itself because PCA only finds flat directions', 'is not defined', 'separates it into clusters'], a: 1, why: 'PCA is linear. A curve needs a non-linear method (kernel PCA, t-SNE, UMAP) to be unrolled into one dimension.' },
  ]);

  UL.start();
})();
