/* DeepBeam STM — hình minh họa SVG.
   Chỉ dựng hình học từ dữ liệu nhập; không chứa công thức tính toán kết cấu. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function E(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const num = v => (typeof v === 'number' && isFinite(v)) ? v : NaN;
  const pos = v => num(v) > 0;
  function fmt(v, dec) {
    if (!isFinite(v)) return '–';
    const p = Math.pow(10, dec == null ? 1 : dec);
    const r = Math.round(v * p) / p;
    return String(r).replace('.', ',');
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

  /* ---------- geometry (mm) ---------- */
  function geom(s) {
    const D = num(s.D), L = num(s.Ltot), Ls = num(s.Ls), b = num(s.b);
    if (!(D > 0 && L > 0 && Ls > 0 && Ls <= L && b > 0)) return null;
    const d = pos(s.d) && s.d < D ? s.d : 0.9 * D;
    const x1 = (L - Ls) / 2, x2 = x1 + Ls;
    let a = s.loadType === '1p' ? Ls / 2 : num(s.a);
    if (!(a > 0) || a > Ls / 2) a = Ls / 3;
    const loads = s.loadType === '1p' ? [L / 2] : [x1 + a, x2 - a];

    const shape = s.oShape;
    let w, h;
    if (shape === 'circle') w = h = num(s.odia);
    else if (shape === 'square') w = h = num(s.ox);
    else { w = num(s.ox); h = num(s.oy); }
    const xo = s.oPos === 'center' ? a / 2 : num(s.xo);
    const cy = D / 2 - (num(s.ey) || 0);
    const ops = [];
    if (w > 0 && h > 0 && xo > 0) {
      ops.push({ cx: x1 + xo, cy, w, h, shape, side: 'L' });
      if (s.oSym) ops.push({ cx: x2 - xo, cy, w, h, shape, side: 'R' });
    }

    const c = pos(s.cover) ? s.cover : 30;
    const dv = pos(+s.dv) ? +s.dv : 8, dh = pos(+s.dh) ? +s.dh : 8;
    const dBar = pos(+s.dBar) ? +s.dBar : 20, dTop = pos(+s.dTop) ? +s.dTop : 10;
    const layers = Math.max(1, Math.min(4, Math.round(num(+s.layers)) || 1));
    const nBar = Math.max(1, Math.round(num(s.nBar)) || 1);
    const nTop = Math.max(0, Math.round(num(s.nTop)) || 0);
    const nh = Math.max(1, Math.round(num(+s.nh)) || 2);
    const yt = c + dv + dTop / 2;
    const yb = D - c - dv - dBar / 2;

    const sh = num(s.sh), sv = num(s.sv);
    const hLevels = [];
    if (sh > 0 && D / sh <= 80) for (let y = yb - sh; y > yt + 0.35 * sh; y -= sh) hLevels.push(y);
    const vPos = [];
    if (sv > 0 && L / sv <= 400) {
      const n = Math.floor((L - 2 * c - dv) / sv);
      const st = (L - n * sv) / 2;
      for (let i = 0; i <= n; i++) vPos.push(st + i * sv);
    }
    return {
      b, D, d, L, Ls, x1, x2, a, loads, ops, c, dv, dh, dBar, dTop, layers, nBar, nTop, nh,
      yt, yb, hLevels, vPos, ls: pos(s.ls) ? s.ls : 0, lb: pos(s.lb) ? s.lb : 0,
    };
  }

  function spanAtY(op, y, clr) {
    if (op.shape === 'circle') {
      const r = op.w / 2 + clr, dy = y - op.cy;
      if (Math.abs(dy) >= r) return null;
      const hw = Math.sqrt(r * r - dy * dy);
      return [op.cx - hw, op.cx + hw];
    }
    if (Math.abs(y - op.cy) >= op.h / 2 + clr) return null;
    return [op.cx - op.w / 2 - clr, op.cx + op.w / 2 + clr];
  }
  function spanAtX(op, x, clr) {
    if (op.shape === 'circle') {
      const r = op.w / 2 + clr, dx = x - op.cx;
      if (Math.abs(dx) >= r) return null;
      const hh = Math.sqrt(r * r - dx * dx);
      return [op.cy - hh, op.cy + hh];
    }
    if (Math.abs(x - op.cx) >= op.w / 2 + clr) return null;
    return [op.cy - op.h / 2 - clr, op.cy + op.h / 2 + clr];
  }
  function cut(a, b, spans) {
    spans = spans.filter(Boolean).sort((p, q) => p[0] - q[0]);
    const out = [];
    let cur = a;
    for (const [s0, s1] of spans) {
      if (s1 <= cur) continue;
      if (s0 >= b) break;
      if (s0 > cur) out.push([cur, s0]);
      cur = Math.max(cur, s1);
    }
    if (cur < b) out.push([cur, b]);
    return out.filter(seg => seg[1] - seg[0] > 1);
  }

  function defs(svg, pre) {
    const d = E('defs', null, svg);
    const p = E('pattern', { id: pre + 'conc', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, d);
    E('rect', { width: 16, height: 16, class: 'conc-bg' }, p);
    E('circle', { cx: 3, cy: 4, r: 0.9, class: 'conc-dot' }, p);
    E('circle', { cx: 11, cy: 9, r: 0.7, class: 'conc-dot' }, p);
    E('circle', { cx: 6.5, cy: 13, r: 0.55, class: 'conc-dot' }, p);
    E('path', { d: 'M13 2.5l1.4 1.2-1.6.6z', class: 'conc-dot' }, p);
    const m = E('marker', { id: pre + 'arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, d);
    E('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrow-head' }, m);
  }

  /* ---------- elevation ---------- */
  function elevation(svg, s, opt) {
    clear(svg);
    const R = svg.getBoundingClientRect();
    const W = R.width, H = R.height;
    if (W < 80 || H < 80) return null;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const g = geom(s);
    if (!g) {
      E('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'empty-msg' }, svg, 'Nhập kích thước dầm hợp lệ để hiển thị hình minh họa');
      return null;
    }
    const pre = 'e_';
    defs(svg, pre);
    const ml = 66, mr = 66, mt = 92, mb = opt.dims ? 128 : 62;
    const sc = Math.min((W - ml - mr) / g.L, (H - mt - mb) / g.D);
    if (!(sc > 0)) return null;
    const ox = ml + ((W - ml - mr) - g.L * sc) / 2;
    const oy = mt + ((H - mt - mb) - g.D * sc) / 2;
    const X = v => ox + v * sc, Y = v => oy + v * sc;
    const sw = v => Math.max(1.2, Math.min(5, v * sc));

    const gC = E('g', { class: 'lyr-concrete' }, svg);
    const gR = opt.rebar ? E('g', { class: 'lyr-rebar' }, svg) : null;
    const gS = opt.stm ? E('g', { class: 'lyr-stm' }, svg) : null;
    const gB = E('g', { class: 'lyr-bc' }, svg);
    const gD = opt.dims ? E('g', { class: 'lyr-dims' }, svg) : null;

    /* concrete + openings */
    E('rect', { x: X(0), y: Y(0), width: g.L * sc, height: g.D * sc, class: 'beam hl-beam', fill: `url(#${pre}conc)` }, gC);
    E('line', { x1: X(g.L / 2), y1: Y(0) - 22, x2: X(g.L / 2), y2: Y(g.D) + 16, class: 'cl' }, gC);
    E('text', { x: X(g.L / 2) + 4, y: Y(g.D) + 16, class: 'cl-tx' }, gC, 'CL');
    g.ops.forEach(op => {
      const go = E('g', { class: 'opening hl-open' }, gC);
      if (op.shape === 'circle') {
        const r = op.w / 2 * sc, k = r * Math.SQRT1_2;
        E('circle', { cx: X(op.cx), cy: Y(op.cy), r, class: 'hole' }, go);
        E('line', { x1: X(op.cx) - k, y1: Y(op.cy) - k, x2: X(op.cx) + k, y2: Y(op.cy) + k, class: 'open-x' }, go);
        E('line', { x1: X(op.cx) - k, y1: Y(op.cy) + k, x2: X(op.cx) + k, y2: Y(op.cy) - k, class: 'open-x' }, go);
      } else {
        const x0 = X(op.cx - op.w / 2), y0 = Y(op.cy - op.h / 2), ww = op.w * sc, hh = op.h * sc;
        E('rect', { x: x0, y: y0, width: ww, height: hh, class: 'hole' }, go);
        E('line', { x1: x0, y1: y0, x2: x0 + ww, y2: y0 + hh, class: 'open-x' }, go);
        E('line', { x1: x0, y1: y0 + hh, x2: x0 + ww, y2: y0, class: 'open-x' }, go);
      }
    });

    /* reinforcement */
    if (gR) {
      const clr = 20;
      const gv = E('g', { class: 'bar-v hl-webv' }, gR);
      const yv1 = g.c + g.dv / 2, yv2 = g.D - g.c - g.dv / 2;
      g.vPos.forEach(x => cut(yv1, yv2, g.ops.map(op => spanAtX(op, x, clr))).forEach(([p, q]) =>
        E('line', { x1: X(x), y1: Y(p), x2: X(x), y2: Y(q), 'stroke-width': sw(g.dv) }, gv)));

      const gh = E('g', { class: 'bar-h hl-webh' }, gR);
      const xh1 = g.c + g.dv, xh2 = g.L - g.c - g.dv;
      g.hLevels.forEach(y => cut(xh1, xh2, g.ops.map(op => spanAtY(op, y, clr))).forEach(([p, q]) =>
        E('line', { x1: X(p), y1: Y(y), x2: X(q), y2: Y(y), 'stroke-width': sw(g.dh) }, gh)));

      if (g.nTop > 0) {
        const gt = E('g', { class: 'bar-top hl-top' }, gR);
        E('line', { x1: X(g.c + g.dv), y1: Y(g.yt), x2: X(g.L - g.c - g.dv), y2: Y(g.yt), 'stroke-width': sw(g.dTop) }, gt);
      }

      const gb = E('g', { class: 'bar-bot hl-bot' }, gR);
      const xb1 = g.c + g.dv + g.dBar / 2, xb2 = g.L - xb1;
      for (let i = 0; i < g.layers; i++) {
        const y = g.yb - i * (g.dBar + 25);
        let dp;
        if (i === 0 && s.anchor === 'hook90') {
          const hk = Math.min(12 * g.dBar, 0.45 * g.D);
          dp = `M${X(xb1)},${Y(y - hk)} L${X(xb1)},${Y(y)} L${X(xb2)},${Y(y)} L${X(xb2)},${Y(y - hk)}`;
        } else if (i === 0 && s.anchor === 'hook180') {
          const rr = 2.5 * g.dBar, R2 = rr * sc;
          dp = `M${X(xb1 + rr + 4 * g.dBar)},${Y(y - 2 * rr)} L${X(xb1 + rr)},${Y(y - 2 * rr)} A${R2},${R2} 0 0 0 ${X(xb1 + rr)},${Y(y)} ` +
               `L${X(xb2 - rr)},${Y(y)} A${R2},${R2} 0 0 0 ${X(xb2 - rr)},${Y(y - 2 * rr)} L${X(xb2 - rr - 4 * g.dBar)},${Y(y - 2 * rr)}`;
        } else {
          dp = `M${X(xb1)},${Y(y)} L${X(xb2)},${Y(y)}`;
        }
        E('path', { d: dp, 'stroke-width': sw(g.dBar) }, gb);
        if (i === 0 && s.anchor === 'plate') {
          [xb1, xb2].forEach(x => E('rect', { x: X(x) - 2.5, y: Y(y - 2.5 * g.dBar), width: 5, height: 5 * g.dBar * sc, class: 'anchor-plate' }, gb));
        }
      }

      if (s.trimOn && g.ops.length) {
        const gt = E('g', { class: 'bar-trim hl-trim' }, gR);
        const dt = pos(+s.dTrim) ? +s.dTrim : 10, ext = pos(s.extTrim) ? s.extTrim : 300, off = 25 + dt / 2;
        g.ops.forEach(op => {
          const xa = Math.max(g.c + g.dv, op.cx - op.w / 2 - ext), xb = Math.min(g.L - g.c - g.dv, op.cx + op.w / 2 + ext);
          const ya = Math.max(g.c + g.dv, op.cy - op.h / 2 - ext), yb = Math.min(g.D - g.c - g.dv, op.cy + op.h / 2 + ext);
          [op.cy - op.h / 2 - off, op.cy + op.h / 2 + off].forEach(y =>
            E('line', { x1: X(xa), y1: Y(y), x2: X(xb), y2: Y(y), 'stroke-width': sw(dt) }, gt));
          [op.cx - op.w / 2 - off, op.cx + op.w / 2 + off].forEach(x =>
            E('line', { x1: X(x), y1: Y(ya), x2: X(x), y2: Y(yb), 'stroke-width': sw(dt) }, gt));
        });
      }
      if (s.diagOn && g.ops.length) {
        const gd = E('g', { class: 'bar-trim hl-diag' }, gR);
        const dd = pos(+s.dDiag) ? +s.dDiag : 10;
        const ang = (num(s.angDiag) > 0 && s.angDiag < 90 ? s.angDiag : 45) * Math.PI / 180;
        g.ops.forEach(op => {
          const len = Math.min(40 * dd, 0.9 * Math.max(op.w, op.h));
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
            const px = op.shape === 'circle' ? op.cx + sx * op.w / 2 * Math.SQRT1_2 : op.cx + sx * op.w / 2;
            const py = op.shape === 'circle' ? op.cy + sy * op.h / 2 * Math.SQRT1_2 : op.cy + sy * op.h / 2;
            const o = (30 + dd) * Math.SQRT1_2;
            const cx = px + sx * o, cy = py + sy * o;
            const dx = Math.cos(ang), dy = (sx * sy > 0 ? -1 : 1) * Math.sin(ang);
            E('line', { x1: X(cx - dx * len / 2), y1: Y(cy - dy * len / 2), x2: X(cx + dx * len / 2), y2: Y(cy + dy * len / 2), 'stroke-width': sw(dd) }, gd);
          });
        });
      }
    }

    /* strut-and-tie geometry (schematic only) */
    if (gS) {
      const yC = Math.min(0.1 * g.D, g.yt), yA = g.d;
      E('line', { x1: X(g.x1), y1: Y(yA), x2: X(g.x2), y2: Y(yA), class: 'tie' }, gS);
      const Cs = g.loads.map(p => [p, yC]);
      if (Cs.length === 2) E('line', { x1: X(Cs[0][0]), y1: Y(yC), x2: X(Cs[1][0]), y2: Y(yC), class: 'strut' }, gS);
      const line = (p, q) => E('line', { x1: X(p[0]), y1: Y(p[1]), x2: X(q[0]), y2: Y(q[1]), class: 'strut' }, gS);
      const nodes = [];
      [
        { A: [g.x1, yA], C: Cs[0], op: g.ops.find(o => o.side === 'L'), dir: 1, lab: true },
        { A: [g.x2, yA], C: Cs[Cs.length - 1], op: g.ops.find(o => o.side === 'R'), dir: -1, lab: false },
      ].forEach(sd => {
        if (sd.op) {
          const o = sd.op;
          let B, Dn;
          if (o.shape === 'circle') {
            const k = o.w / 2 * Math.SQRT1_2;
            B = [o.cx - sd.dir * k, o.cy - k]; Dn = [o.cx + sd.dir * k, o.cy + k];
          } else {
            B = [o.cx - sd.dir * o.w / 2, o.cy - o.h / 2]; Dn = [o.cx + sd.dir * o.w / 2, o.cy + o.h / 2];
          }
          line(sd.A, B); line(B, sd.C); line(sd.A, Dn); line(Dn, sd.C);
          nodes.push([B, sd.lab ? 'B' : ''], [Dn, sd.lab ? 'D' : '']);
        } else {
          line(sd.A, sd.C);
        }
        nodes.push([sd.A, sd.lab ? 'A' : ''], [sd.C, sd.lab ? 'C' : '']);
      });
      nodes.forEach(([p, lab]) => {
        E('circle', { cx: X(p[0]), cy: Y(p[1]), r: 4.5, class: 'node' }, gS);
        if (lab) E('text', { x: X(p[0]) + 8, y: Y(p[1]) - 7, class: 'node-tx' }, gS, lab);
      });
    }

    /* supports */
    const gsup = E('g', { class: 'hl-support' }, gB);
    [g.x1, g.x2].forEach((x, i) => {
      const yb = Y(g.D);
      if (g.ls > 0) E('rect', { x: X(x - g.ls / 2), y: yb, width: g.ls * sc, height: 6, class: 'plate' }, gsup);
      E('path', { d: `M${X(x)},${yb + 6} L${X(x) - 12},${yb + 25} L${X(x) + 12},${yb + 25} Z`, class: 'sup' }, gsup);
      let yg = yb + 25;
      if (i === 1) {
        E('circle', { cx: X(x) - 6, cy: yb + 29, r: 3.6, class: 'roller' }, gsup);
        E('circle', { cx: X(x) + 6, cy: yb + 29, r: 3.6, class: 'roller' }, gsup);
        yg = yb + 33;
      }
      E('line', { x1: X(x) - 19, y1: yg, x2: X(x) + 19, y2: yg, class: 'ground' }, gsup);
      for (let k = -16; k <= 14; k += 6) E('line', { x1: X(x) + k, y1: yg + 6, x2: X(x) + k + 5, y2: yg, class: 'ground-h' }, gsup);
    });

    /* loads */
    const gl = E('g', { class: 'hl-load' }, gB);
    const vu = num(s.Vu);
    g.loads.forEach(p => {
      if (g.lb > 0) E('rect', { x: X(p - g.lb / 2), y: Y(0) - 6, width: g.lb * sc, height: 6, class: 'plate' }, gl);
      E('line', { x1: X(p), y1: Y(0) - 56, x2: X(p), y2: Y(0) - 8, class: 'load-line', 'marker-end': `url(#${pre}arrow)` }, gl);
      const t = E('text', { x: X(p), y: Y(0) - 62, 'text-anchor': 'middle', class: 'load-tx' }, gl, g.loads.length === 1 ? '2V' : 'V');
      if (vu > 0 && g.loads.length === 2) E('tspan', { class: 'v', dx: 4 }, t, `= ${fmt(vu)} kN`);
    });
    if (vu > 0 && g.loads.length === 1) {
      E('text', { x: X(g.L / 2) + 10, y: Y(0) - 36, class: 'load-tx' }, gl).appendChild(E('tspan', { class: 'v' }, null, `Vu = ${fmt(vu)} kN`));
    }

    /* section mark 1–1 */
    const op0 = g.ops[0];
    if (op0) {
      const xs = X(op0.cx);
      E('line', { x1: xs, y1: Y(0) - 44, x2: xs, y2: Y(0) - 34, class: 'sec-mark' }, gB);
      E('text', { x: xs - 9, y: Y(0) - 35, class: 'sec-tx', 'text-anchor': 'end' }, gB, '1');
      E('line', { x1: xs, y1: Y(g.D) + 10, x2: xs, y2: Y(g.D) + 20, class: 'sec-mark' }, gB);
      E('text', { x: xs - 9, y: Y(g.D) + 20, class: 'sec-tx', 'text-anchor': 'end' }, gB, '1');
    }

    /* dimensions */
    if (gD) {
      const tw = t => t.length * 6.7 + 8;
      const dimH = (xa, xb, y, txt, extFrom, cls) => {
        const A = X(xa), B = X(xb);
        if (B - A < 2) return;
        const gg = E('g', { class: 'dim ' + (cls || '') }, gD);
        E('line', { x1: A, y1: y, x2: B, y2: y, class: 'dl' }, gg);
        [A, B].forEach(x => {
          E('line', { x1: x - 3.5, y1: y + 3.5, x2: x + 3.5, y2: y - 3.5, class: 'dt' }, gg);
          if (extFrom != null) E('line', { x1: x, y1: extFrom, x2: x, y2: y + (y > extFrom ? 4 : -4), class: 'de' }, gg);
        });
        const fits = (B - A) > tw(txt);
        E('text', { x: (A + B) / 2, y: fits ? y - 4 : y - 14, 'text-anchor': 'middle', class: 'dtx' + (fits ? '' : ' small') }, gg, txt);
      };
      const dimV = (ya, yb, x, txt, extFrom, cls) => {
        const A = Y(ya), B = Y(yb);
        if (B - A < 2) return;
        const gg = E('g', { class: 'dim ' + (cls || '') }, gD);
        E('line', { x1: x, y1: A, x2: x, y2: B, class: 'dl' }, gg);
        [A, B].forEach(y => {
          E('line', { x1: x - 3.5, y1: y + 3.5, x2: x + 3.5, y2: y - 3.5, class: 'dt' }, gg);
          if (extFrom != null) E('line', { x1: extFrom, y1: y, x2: x + (x > extFrom ? 4 : -4), y2: y, class: 'de' }, gg);
        });
        const cy = (A + B) / 2, tx = x - 5;
        E('text', { x: tx, y: cy, 'text-anchor': 'middle', transform: `rotate(-90 ${tx} ${cy})`, class: 'dtx' + ((B - A) > tw(txt) ? '' : ' small') }, gg, txt);
      };

      const base = Y(g.D) + 56;
      const pts = [0, g.x1, ...g.loads, g.x2, g.L];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        if (q - p < 0.5) continue;
        const isA = g.loads.length === 2 && (i === 1 || i === pts.length - 3);
        dimH(p, q, base, isA ? `a = ${fmt(q - p)}` : fmt(q - p), Y(g.D) + 4, isA ? 'dim-a' : '');
      }
      dimH(g.x1, g.x2, base + 26, `L₀ = ${fmt(g.Ls)}`, base);
      dimH(0, g.L, base + 52, `L = ${fmt(g.L)}`, base + 26);
      dimV(0, g.D, X(0) - 30, `D = ${fmt(g.D)}`, X(0) - 4);
      dimV(0, g.d, X(g.L) + 30, `d = ${fmt(g.d)}`, X(g.L) + 4);

      if (op0) {
        const top = op0.cy - op0.h / 2;
        if (op0.shape === 'circle') {
          E('text', { x: X(op0.cx), y: Y(top) - 7, 'text-anchor': 'middle', class: 'dtx' }, E('g', { class: 'dim dim-open' }, gD), `Ø${fmt(op0.w)}`);
        } else {
          dimH(op0.cx - op0.w / 2, op0.cx + op0.w / 2, Y(top) - 9, fmt(op0.w), null, 'dim-open');
          dimV(top, top + op0.h, X(op0.cx - op0.w / 2) - 9, fmt(op0.h), null, 'dim-open');
        }
        E('line', { x1: X(op0.cx), y1: Y(0) - 16, x2: X(op0.cx), y2: Y(op0.cy), class: 'cl' }, gD);
        dimH(g.x1, op0.cx, Y(0) - 12, `x₀ = ${fmt(op0.cx - g.x1)}`, null, 'dim-open');
      }
    }
    return { scale: sc };
  }

  /* ---------- cross-section through the opening ---------- */
  function section(svg, s) {
    clear(svg);
    const R = svg.getBoundingClientRect();
    const W = R.width, H = R.height;
    if (W < 60 || H < 60) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const g = geom(s);
    if (!g) return;
    const pre = 's_';
    defs(svg, pre);
    const pl = 36, pr = 98, pt = 8, pb = 26;
    const sc = Math.min((W - pl - pr) / g.b, (H - pt - pb) / g.D);
    if (!(sc > 0)) return;
    const ox = pl + ((W - pl - pr) - g.b * sc) / 2, oy = pt + ((H - pt - pb) - g.D * sc) / 2;
    const X = v => ox + v * sc, Y = v => oy + v * sc;
    const op = g.ops[0];

    E('rect', { x: X(0), y: Y(0), width: g.b * sc, height: g.D * sc, class: 'beam hl-beam', fill: `url(#${pre}conc)` }, svg);
    const ci = g.c + g.dv / 2;
    if (g.b - 2 * ci > 0) {
      E('rect', { x: X(ci), y: Y(ci), width: (g.b - 2 * ci) * sc, height: (g.D - 2 * ci) * sc, rx: Math.max(2, 2 * g.dv * sc), class: 'stirrup hl-webv', 'stroke-width': Math.max(1.1, g.dv * sc) }, svg);
    }
    const row = (n, dia, y, cls) => {
      if (n <= 0) return;
      const x0 = g.c + g.dv + dia / 2, x1 = g.b - x0;
      for (let j = 0; j < n; j++) {
        const x = n === 1 ? g.b / 2 : x0 + j * (x1 - x0) / (n - 1);
        E('circle', { cx: X(x), cy: Y(y), r: Math.max(2, dia / 2 * sc), class: cls }, svg);
      }
    };
    let firstWeb = null;
    g.hLevels.forEach(y => {
      if (op && spanAtY(op, y, 20)) return;
      if (firstWeb == null) firstWeb = y;
      const xs = g.nh >= 2 ? [g.c + g.dv + g.dh / 2, g.b - g.c - g.dv - g.dh / 2] : [g.c + g.dv + g.dh / 2];
      xs.forEach(x => E('circle', { cx: X(x), cy: Y(y), r: Math.max(1.6, g.dh / 2 * sc), class: 'dot-h hl-webh' }, svg));
    });
    row(g.nTop, g.dTop, g.yt, 'dot-top hl-top');
    let rem = g.nBar;
    const per = Math.ceil(g.nBar / g.layers);
    for (let i = 0; i < g.layers && rem > 0; i++) {
      const k = Math.min(per, rem);
      rem -= k;
      row(k, g.dBar, g.yb - i * (g.dBar + 25), 'dot-bot hl-bot');
    }
    if (op) {
      const top = op.cy - op.h / 2;
      const gg = E('g', { class: 'hl-open opening' }, svg);
      E('rect', { x: X(0), y: Y(top), width: g.b * sc, height: op.h * sc, class: 'hole sect-hole' }, gg);
      E('line', { x1: X(0), y1: Y(top), x2: X(g.b), y2: Y(top + op.h), class: 'open-x' }, gg);
      E('line', { x1: X(0), y1: Y(top + op.h), x2: X(g.b), y2: Y(top), class: 'open-x' }, gg);
    }

    /* labels */
    const lx = X(g.b) + 10;
    const lab = (y, txt, cls) => {
      E('line', { x1: X(g.b) - 2, y1: Y(y), x2: lx - 2, y2: Y(y), class: 'sx-lead' }, svg);
      E('text', { x: lx, y: Y(y) + 3.5, class: 'sx-tx ' + cls }, svg, txt);
    };
    if (g.nTop > 0) lab(g.yt, `${g.nTop}Ø${fmt(g.dTop)}`, 'top');
    lab(g.yb, `${g.nBar}Ø${fmt(g.dBar)}${g.layers > 1 ? ` (${g.layers} lớp)` : ''}`, 'bot');
    if (firstWeb != null && Math.abs(Y(firstWeb) - Y(g.yt)) > 12) lab(firstWeb, `Ø${fmt(g.dh)}@${fmt(num(s.sh))}`, 'h');
    E('text', { x: lx, y: Y(g.yb) - 14, class: 'sx-tx v' }, svg, `đai Ø${fmt(g.dv)}@${fmt(num(s.sv))}`);
    if (op) E('text', { x: lx, y: Y(op.cy) + 3.5, class: 'sx-tx' }, svg, op.shape === 'circle' ? `lỗ Ø${fmt(op.w)}` : `lỗ cao ${fmt(op.h)}`);

    /* dims */
    const gd = E('g', { class: 'dim' }, svg);
    const yB = Y(g.D) + 13;
    E('line', { x1: X(0), y1: yB, x2: X(g.b), y2: yB, class: 'dl' }, gd);
    [X(0), X(g.b)].forEach(x => E('line', { x1: x - 3, y1: yB + 3, x2: x + 3, y2: yB - 3, class: 'dt' }, gd));
    E('text', { x: (X(0) + X(g.b)) / 2, y: yB + 11, 'text-anchor': 'middle', class: 'dtx small' }, gd, `b = ${fmt(g.b)}`);
    const xL = X(0) - 13;
    E('line', { x1: xL, y1: Y(0), x2: xL, y2: Y(g.D), class: 'dl' }, gd);
    [Y(0), Y(g.D)].forEach(y => E('line', { x1: xL - 3, y1: y + 3, x2: xL + 3, y2: y - 3, class: 'dt' }, gd));
    const cy = (Y(0) + Y(g.D)) / 2;
    E('text', { x: xL - 4, y: cy, 'text-anchor': 'middle', transform: `rotate(-90 ${xL - 4} ${cy})`, class: 'dtx small' }, gd, `D = ${fmt(g.D)}`);
  }

  global.DBDraw = { geom, elevation, section, fmt };
})(window);
