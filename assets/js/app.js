/* DeepBeam STM — điều khiển giao diện.
   Giai đoạn 1: chỉ giao diện. Không có công thức tính sức kháng cắt. */
(function () {
  'use strict';
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.DBDraw;
  const fmt = D.fmt;
  const STORE = 'deepbeam-ui-v1';

  /* ---------- default data (dầm DBSO-0.75-0.30) ---------- */
  const DEFAULTS = {
    projName: 'Dầm cao có lỗ mở', memberName: 'DBSO-0.75-0.30',
    m_tseng: true, m_tan: false, m_kong: false, m_ray: false,
    c_aci: true, c_aashto: false, c_ec2: false, c_fib: false,
    units: 'SI', resistType: 'nominal',
    b: 200, D: 500, d: 436, Ltot: 1300, Ls: 984,
    loadType: '2p', a: 327, ls: 150, lb: 150, Vu: '', Vexp: 302.5,
    oShape: 'rect', ox: 200, oy: 100, odia: 150, oPos: 'center', xo: 163.5, ey: 0, oSym: true,
    fcType: 'cube', fc: 38.79, conv: 0.8, EcMode: 'code', Ec: '',
    nBar: 5, dBar: 20, layers: 1, fy: 582,
    nTop: 2, dTop: 10, fyTop: 570,
    Es: 200000, cover: 30, anchor: 'hook90',
    dh: 8, nh: 2, sh: 165, fyh: 624,
    dv: 8, nv: 2, sv: 165, fyv: 624,
    trimOn: false, dTrim: 10, nTrim: 2, extTrim: 300, fyTrim: 570,
    diagOn: false, dDiag: 10, nDiag: 1, angDiag: 45, fyDiag: 570,
  };

  /* Dữ liệu nhập của 8 dầm thí nghiệm (Bảng 1, Bảng 3 – Rajprabhu & Appa Rao, 2026) */
  const TESTS = {
    'DBSO-0.75-0.30': { fc: 38.79, Vexp: 302.5 }, 'DBSO-0.75-0.40': { fc: 36.79, Vexp: 297 },
    'DBLO-0.75-0.30': { fc: 39.07, Vexp: 186.5 }, 'DBLO-0.75-0.40': { fc: 39.00, Vexp: 191.5 },
    'DBSO-1.50-0.30': { fc: 36.31, Vexp: 218.5 }, 'DBSO-1.50-0.40': { fc: 33.15, Vexp: 205.5 },
    'DBLO-1.50-0.30': { fc: 37.09, Vexp: 149.5 }, 'DBLO-1.50-0.40': { fc: 33.04, Vexp: 141.5 },
  };
  function preset(name) {
    const short = name.indexOf('0.75') > 0, small = name.indexOf('DBSO') === 0, h40 = /0\.40$/.test(name);
    return Object.assign({}, DEFAULTS, {
      projName: 'Rajprabhu & Appa Rao (2026)', memberName: name,
      Ltot: short ? 1300 : 2200, Ls: short ? 984 : 1758, a: short ? 327 : 654,
      ox: small ? 200 : 300, oy: small ? 100 : 150, xo: short ? 163.5 : 327,
      dh: h40 ? 10 : 8, sh: h40 ? 195 : 165, fyh: h40 ? 570 : 624,
    }, TESTS[name]);
  }

  /* ---------- field definitions ---------- */
  const BARS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40].map(v => [v, 'Ø' + v]);
  const aEff = s => s.loadType === '1p' ? s.Ls / 2 : s.a;
  const F = {
    units: { label: 'Hệ đơn vị', type: 'sel', opts: [['SI', 'SI — mm, MPa, kN']] },
    resistType: { label: 'Loại sức kháng', type: 'sel', opts: [['nominal', 'Danh nghĩa (không hệ số)'], ['design', 'Thiết kế (có hệ số φ)']] },

    b: { label: 'Bề rộng dầm', sym: 'b', unit: 'mm' },
    D: { label: 'Chiều cao dầm', sym: 'D', unit: 'mm' },
    d: { label: 'Chiều cao làm việc', sym: 'd', unit: 'mm' },
    Ltot: { label: 'Chiều dài dầm', sym: 'L', unit: 'mm' },
    Ls: { label: 'Nhịp tính toán', sym: 'L<sub>0</sub>', unit: 'mm', tip: 'Khoảng cách giữa tâm hai gối tựa' },
    loadType: { label: 'Sơ đồ tải trọng', type: 'sel', span: 2, opts: [['2p', '2 lực tập trung đối xứng'], ['1p', '1 lực tập trung giữa nhịp']] },
    a: { label: 'Nhịp cắt', sym: 'a', unit: 'mm', tip: 'Tâm gối → tâm điểm đặt tải', dis: s => s.loadType === '1p', auto: s => s.loadType === '1p' && s.Ls > 0 ? s.Ls / 2 : null },
    ls: { label: 'Bản gối', sym: 'l<sub>s</sub>', unit: 'mm' },
    lb: { label: 'Bản đặt tải', sym: 'l<sub>b</sub>', unit: 'mm' },
    Vu: { label: 'Lực cắt tác dụng', sym: 'V<sub>u</sub>', unit: 'kN', opt: true },
    Vexp: { label: 'Lực cắt thí nghiệm', sym: 'V<sub>exp</sub>', unit: 'kN', opt: true, tip: 'Dùng để đối chiếu V_exp/V_cal (nếu có)' },

    oShape: { label: 'Hình dạng lỗ', type: 'sel', opts: [['rect', 'Chữ nhật'], ['square', 'Vuông'], ['circle', 'Tròn']] },
    ox: { label: s => s.oShape === 'square' ? 'Cạnh lỗ' : 'Bề rộng lỗ', sym: 'x', unit: 'mm', show: s => s.oShape !== 'circle' },
    oy: { label: 'Chiều cao lỗ', sym: 'y', unit: 'mm', show: s => s.oShape === 'rect' },
    odia: { label: 'Đường kính lỗ', sym: 'd<sub>o</sub>', unit: 'mm', show: s => s.oShape === 'circle' },
    oPos: { label: 'Vị trí theo phương ngang', type: 'sel', opts: [['center', 'Giữa nhịp cắt'], ['custom', 'Tùy chỉnh']] },
    xo: { label: 'Tâm gối → tâm lỗ', sym: 'x<sub>0</sub>', unit: 'mm', dis: s => s.oPos === 'center', auto: s => s.oPos === 'center' && aEff(s) > 0 ? aEff(s) / 2 : null },
    ey: { label: 'Lệch tâm đứng (+ lên)', sym: 'e<sub>y</sub>', unit: 'mm' },
    oSym: { label: 'Bố trí lỗ mở đối xứng ở cả hai nhịp cắt', type: 'chk', span: 3 },

    fcType: { label: 'Loại mẫu thử', type: 'sel', opts: [['cyl', 'Trụ 150×300'], ['cube', 'Lập phương 150']] },
    fc: { label: s => s.fcType === 'cube' ? 'Cường độ lập phương' : 'Cường độ mẫu trụ', sym: s => s.fcType === 'cube' ? 'f<sub>ck</sub>' : 'f′<sub>c</sub>', unit: 'MPa' },
    conv: { label: 'Hệ số quy đổi → trụ', sym: 'k<sub>c</sub>', unit: '–', show: s => s.fcType === 'cube', tip: 'Hệ số quy đổi cường độ lập phương sang mẫu trụ' },
    EcMode: { label: 'Mô đun đàn hồi', type: 'sel', opts: [['code', 'Theo tiêu chuẩn'], ['manual', 'Nhập trực tiếp']] },
    Ec: { label: 'Mô đun đàn hồi', sym: 'E<sub>c</sub>', unit: 'MPa', show: s => s.EcMode === 'manual' },

    nBar: { label: 'Số thanh thép chịu kéo', int: true },
    dBar: { label: 'Đường kính thép chịu kéo', type: 'sel', numeric: true, opts: BARS },
    layers: { label: 'Số lớp thép chịu kéo', type: 'sel', numeric: true, opts: [[1, '1'], [2, '2'], [3, '3']] },
    fy: { label: 'Giới hạn chảy thép chịu kéo', sym: 'f<sub>y</sub>' },
    nTop: { label: 'Số thanh thép cấu tạo trên', int: true, zero: true },
    dTop: { label: 'Đường kính thép trên', type: 'sel', numeric: true, opts: BARS },
    fyTop: { label: 'Giới hạn chảy thép trên' },
    Es: { label: 'Mô đun đàn hồi thép', sym: 'E<sub>s</sub>', unit: 'MPa' },
    cover: { label: 'Lớp bê tông bảo vệ', sym: 'c', unit: 'mm' },
    anchor: { label: 'Neo thép chịu kéo', type: 'sel', opts: [['hook90', 'Móc 90°'], ['hook180', 'Móc 180°'], ['plate', 'Bản neo'], ['straight', 'Thẳng']] },

    dh: { label: 'Đường kính thép bụng ngang', type: 'sel', numeric: true, opts: BARS },
    nh: { label: 'Số nhánh thép bụng ngang', type: 'sel', numeric: true, opts: [[1, '1'], [2, '2']] },
    sh: { label: 'Khoảng cách thép bụng ngang', sym: 's<sub>h</sub>', cellUnit: 'mm' },
    fyh: { label: 'Giới hạn chảy thép bụng ngang' },
    dv: { label: 'Đường kính cốt đai', type: 'sel', numeric: true, opts: BARS },
    nv: { label: 'Số nhánh cốt đai', type: 'sel', numeric: true, opts: [[2, '2'], [4, '4']] },
    sv: { label: 'Khoảng cách cốt đai', sym: 's<sub>v</sub>', cellUnit: 'mm' },
    fyv: { label: 'Giới hạn chảy cốt đai' },

    trimOn: { label: 'Thanh viền lỗ', type: 'chk' },
    dTrim: { label: 'Đường kính thanh viền', type: 'sel', numeric: true, opts: BARS, dis: s => !s.trimOn },
    nTrim: { label: 'Số thanh viền mỗi cạnh', int: true, dis: s => !s.trimOn },
    extTrim: { label: 'Chiều dài neo thanh viền', cellUnit: 'mm', dis: s => !s.trimOn },
    fyTrim: { label: 'Giới hạn chảy thanh viền', dis: s => !s.trimOn },
    diagOn: { label: 'Thanh xiên góc lỗ', type: 'chk' },
    dDiag: { label: 'Đường kính thanh xiên', type: 'sel', numeric: true, opts: BARS, dis: s => !s.diagOn },
    nDiag: { label: 'Số thanh xiên mỗi góc', int: true, dis: s => !s.diagOn },
    angDiag: { label: 'Góc nghiêng thanh xiên', cellUnit: '°', dis: s => !s.diagOn },
    fyDiag: { label: 'Giới hạn chảy thanh xiên', dis: s => !s.diagOn },
  };

  const METHODS = [
    { k: 'm_tseng', name: 'Tseng et al. (2017)', tag: 'Khuyến nghị', kind: 'Giàn ảo (STM) – mô hình lò xo', desc: 'Cân bằng nút và tương thích chuyển vị; các thanh chống quanh lỗ được lý tưởng hóa thành lò xo. Dùng hệ số hiệu quả β theo tiêu chuẩn.' },
    { k: 'm_tan', name: 'Tan et al. (2003)', kind: 'Giàn ảo (STM) – lặp', desc: 'Mô hình giàn ảo nhất quán, lặp hệ số phân phối nút; xét cốt bụng ngang, đứng và xiên quanh lỗ.' },
    { k: 'm_kong', name: 'Kong & Sharp (1977)', kind: 'Thực nghiệm', desc: 'Đường truyền lực lý tưởng quanh lỗ chữ nhật; xét cốt thép cắt qua thanh chống tới hạn.' },
    { k: 'm_ray', name: 'Ray & Reddy (1979)', kind: 'Bán thực nghiệm', desc: 'Tiêu chuẩn phá hoại Mohr–Coulomb trên mặt phá hoại thanh chống tới hạn; chiều cao lỗ ≤ 0,6D.' },
  ];
  const CODES = [
    { k: 'c_aci', name: 'ACI 318-25', org: 'Hoa Kỳ · 2025' },
    { k: 'c_aashto', name: 'AASHTO LRFD', org: 'Hoa Kỳ · 2024' },
    { k: 'c_ec2', name: 'EN 1992-1-1:2023', org: 'Eurocode 2 · 2023' },
    { k: 'c_fib', name: 'fib Model Code 2020', org: 'fib · 2020' },
  ];
  const STEPS = {
    1: ['Tiêu chuẩn & phương pháp tính', 'Chọn mô hình dự báo sức kháng cắt và tiêu chuẩn cung cấp hệ số hiệu quả thanh chống β.'],
    2: ['Hình học dầm, lỗ mở & tải trọng', 'Kích thước dầm, sơ đồ gối – tải và vị trí lỗ mở trong nhịp cắt. Hình minh họa cập nhật theo dữ liệu nhập.'],
    3: ['Vật liệu & bố trí cốt thép', 'Đặc trưng bê tông, cốt thép dọc, cốt thép bụng và gia cường quanh lỗ mở.'],
    4: ['Kết quả tính toán', 'Tổng hợp dữ liệu đầu vào và khung trình bày kết quả sức kháng cắt.'],
  };
  /* field → nhóm phần tử được làm nổi bật trên hình */
  const HL = {
    b: 'beam', D: 'beam', d: 'beam', Ltot: 'beam', fcType: 'beam', fc: 'beam', conv: 'beam', EcMode: 'beam', Ec: 'beam',
    Ls: 'support', ls: 'support', loadType: 'load', a: 'load', lb: 'load', Vu: 'load', Vexp: 'load',
    oShape: 'open', ox: 'open', oy: 'open', odia: 'open', oPos: 'open', xo: 'open', ey: 'open', oSym: 'open',
    nBar: 'bot', dBar: 'bot', layers: 'bot', fy: 'bot', Es: 'bot', anchor: 'bot', cover: 'bot',
    nTop: 'top', dTop: 'top', fyTop: 'top', dh: 'webh', nh: 'webh', sh: 'webh', fyh: 'webh',
    dv: 'webv', nv: 'webv', sv: 'webv', fyv: 'webv',
    trimOn: 'trim', dTrim: 'trim', nTrim: 'trim', extTrim: 'trim', fyTrim: 'trim',
    diagOn: 'diag', dDiag: 'diag', nDiag: 'diag', angDiag: 'diag', fyDiag: 'diag',
  };
  const ICON = {
    method: '<path d="M3 13V3h10v10z M3 7h10 M7 7v6"/>',
    code: '<path d="M4 2.5h6l2.5 2.5v8.5H4z M6.5 7.5h4 M6.5 10h4"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2 M8 12.2v2 M1.8 8h2 M12.2 8h2 M3.6 3.6l1.4 1.4 M11 11l1.4 1.4 M3.6 12.4L5 11 M11 5l1.4-1.4"/>',
    beam: '<path d="M1.5 5h13v5h-13z M3 13l1.5-3 1.5 3 M10 13l1.5-3 1.5 3"/>',
    load: '<path d="M5 1.5v6 M3 5.5l2 2 2-2 M11 1.5v6 M9 5.5l2 2 2-2 M1.5 9.5h13v3h-13z"/>',
    open: '<path d="M1.5 3.5h13v9h-13z M5.5 6h5v4h-5z"/>',
    conc: '<path d="M2 13l6-10 6 10z"/><circle cx="7" cy="10" r=".6"/><circle cx="9.5" cy="11" r=".6"/>',
    bar: '<path d="M2 11.5h12 M2 4.5h12"/><circle cx="4" cy="11.5" r="1.2"/><circle cx="12" cy="11.5" r="1.2"/>',
    web: '<path d="M2 2.5v11 M6 2.5v11 M10 2.5v11 M14 2.5v11 M2 8h12"/>',
    trim: '<path d="M5 5h6v6H5z M2.5 3l3 3 M13.5 3l-3 3 M2.5 13l3-3 M13.5 13l-3-3"/>',
    table: '<path d="M2 3h12v10H2z M2 6.5h12 M6 6.5V13"/>',
    mech: '<path d="M2 13L8 3l6 10z M8 7v3 M8 11.6v.2"/>',
    param: '<path d="M3 13V3 M3 13h10 M5.5 10l2.5-3 2 2 3-4"/>',
    info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.2v4 M8 5v.2"/>',
    lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>',
    ok: '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 8.2l2 2 4-4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    err: '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.8v3.8 M8 10.8v.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    warn: '<path d="M8 2l6.3 11H1.7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.2v3.3 M8 11.4v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    pdf: '<path d="M4 1.5h5.5L12 4v10.5H4z M6 8h4 M6 10.5h4"/>',
    save: '<path d="M3 2.5h8l2 2v9H3z M5.5 2.5v3h5v-3 M5 13.5v-4h6v4"/>',
  };
  const svgI = (k, extra) => `<svg viewBox="0 0 16 16"${extra || ''}>${ICON[k]}</svg>`;

  /* ---------- state ---------- */
  let S = Object.assign({}, DEFAULTS);
  let cur = 1, maxSeen = 1, focusGrp = null, storageOk = true;
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const o = JSON.parse(raw);
      for (const k in DEFAULTS) if (k in o) S[k] = o[k];
      if (o._step >= 1 && o._step <= 4) cur = o._step;
      if (o._max >= 1 && o._max <= 4) maxSeen = o._max;
    }
  } catch (e) { storageOk = false; }
  const hm = /step=(\d)/.exec(location.hash);
  if (hm && +hm[1] >= 1 && +hm[1] <= 4) { cur = +hm[1]; maxSeen = Math.max(maxSeen, cur); }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(Object.assign({}, S, { _step: cur, _max: maxSeen }))); storageOk = true; }
    catch (e) { storageOk = false; }
    $('#autosave').classList.toggle('off', !storageOk);
    $('#autosave').textContent = storageOk ? 'Tự động lưu' : 'Không lưu được';
  }

  /* ---------- rendering of forms ---------- */
  const lbl = k => { const f = F[k]; return typeof f.label === 'function' ? f.label(S) : f.label; };
  const symOf = k => { const f = F[k]; return typeof f.sym === 'function' ? f.sym(S) : (f.sym || ''); };
  const optsHTML = f => f.opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');

  function fieldHTML(k) {
    const f = F[k];
    const span = f.span ? ` style="grid-column:span ${f.span}"` : '';
    const tip = f.tip ? ` title="${esc(f.tip)}"` : '';
    if (f.type === 'chk') {
      return `<label class="fld chk" data-f="${k}"${span}><input type="checkbox" data-k="${k}"><span data-lbl>${lbl(k)}</span></label>`;
    }
    const lab = `<label for="i_${k}"><span data-lbl>${lbl(k)}</span>${f.sym ? ` <span class="sym" data-sym>${symOf(k)}</span>` : ''}</label>`;
    const ctl = f.type === 'sel'
      ? `<div class="ctl"><select id="i_${k}" data-k="${k}">${optsHTML(f)}</select></div>`
      : `<div class="ctl"><input id="i_${k}" data-k="${k}" type="number" step="any" inputmode="decimal" autocomplete="off"${f.opt ? ' placeholder="tùy chọn"' : ''}>${f.unit ? `<span class="unit">${f.unit}</span>` : ''}</div>`;
    return `<div class="fld" data-f="${k}"${span}${tip}>${lab}${ctl}</div>`;
  }
  function cellHTML(k) {
    const f = F[k];
    const al = ` aria-label="${esc(lbl(k))}" title="${esc(lbl(k))}"`;
    const ctl = f.type === 'sel'
      ? `<div class="ctl"><select data-k="${k}"${al}>${optsHTML(f)}</select></div>`
      : `<div class="ctl"><input data-k="${k}" type="number" step="any" inputmode="decimal" autocomplete="off"${al}>${f.cellUnit ? `<span class="unit">${f.cellUnit}</span>` : ''}</div>`;
    return `<div class="fld cell" data-f="${k}">${ctl}</div>`;
  }
  function rtable(cols, rows) {
    return `<table class="rtable"><thead><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => `<tr><th>${r.chk ? `<label class="rchk" data-f="${r.chk}"><input type="checkbox" data-k="${r.chk}"><span>${r.label}</span></label>` : r.label}${r.sub ? `<small>${r.sub}</small>` : ''}</th>` +
        r.cells.map(k => k ? `<td>${cellHTML(k)}</td>` : '<td class="na">–</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }
  const group = (title, icon, inner, opts) => {
    opts = opts || {};
    return `<div class="group"${opts.id ? ` id="${opts.id}"` : ''}><div class="group-title"><span class="gi">${svgI(icon)}</span><span>${title}</span>${opts.hint ? `<span class="gt-hint">${opts.hint}</span>` : ''}</div>${inner}</div>`;
  };
  const grid = (keys, n) => `<div class="grid${n || 3}">${keys.map(fieldHTML).join('')}</div>`;

  function buildForms() {
    $('#pane1').innerHTML =
      group('Mô hình tính sức kháng cắt', 'method',
        `<div class="method-grid">${METHODS.map(m => `
          <label class="method-card"><input type="checkbox" data-k="${m.k}"><span class="cbox"></span>
            <span class="mc-head"><b>${m.name}</b>${m.tag ? `<span class="tag">${m.tag}</span>` : ''}</span>
            <span class="mc-kind">${m.kind}</span>
            <span class="mc-desc">${m.desc}</span>
          </label>`).join('')}</div>`, { hint: 'chọn một hoặc nhiều để so sánh' }) +
      group('Tiêu chuẩn – hệ số hiệu quả thanh chống β', 'code',
        `<div class="code-grid">${CODES.map(c => `
          <label class="code-chip"><input type="checkbox" data-k="${c.k}"><span class="cbox"></span><b>${c.name}</b><em>${c.org}</em></label>`).join('')}</div>
         <div class="code-note">Áp dụng cho mô hình Tseng et al. (2017). Giá trị β lấy theo Bảng 4 của tài liệu tham chiếu.</div>`, { id: 'grpCodes' }) +
      group('Thiết lập chung', 'gear', grid(['units', 'resistType'], 2)) +
      `<div class="note">${svgI('info')}<p><b>Phạm vi áp dụng.</b> Dầm cao BTCT kê đơn giản, chịu 2 lực tập trung đối xứng (hoặc 1 lực giữa nhịp); lỗ mở chữ nhật, vuông hoặc tròn nằm trong nhịp cắt; có cốt thép bụng. Cơ sở dữ liệu kiểm chứng gồm 154 dầm (a/d = 0,25–2,0; f′c = 16–100 MPa).</p></div>`;

    $('#pane2').innerHTML =
      group('Kích thước dầm', 'beam', grid(['b', 'D', 'd', 'Ltot', 'Ls'])) +
      group('Gối tựa & tải trọng', 'load', grid(['loadType', 'a', 'ls', 'lb', 'Vu', 'Vexp'])) +
      group('Lỗ mở trong nhịp cắt', 'open', grid(['oShape', 'ox', 'oy', 'odia', 'oPos', 'xo', 'ey', 'oSym']));

    $('#pane3').innerHTML =
      group('Bê tông', 'conc', grid(['fcType', 'fc', 'conv', 'EcMode', 'Ec'])) +
      group('Cốt thép dọc', 'bar',
        rtable(['Số thanh', 'Đường kính', 'Số lớp', 'f<sub>y</sub> (MPa)'], [
          { label: 'Chịu kéo (dưới)', sub: 'neo tại gối', cells: ['nBar', 'dBar', 'layers', 'fy'] },
          { label: 'Cấu tạo (trên)', sub: 'thanh treo', cells: ['nTop', 'dTop', null, 'fyTop'] },
        ]) + grid(['Es', 'cover', 'anchor'])) +
      group('Cốt thép bụng', 'web',
        rtable(['Đường kính', 'Số nhánh', 'Khoảng cách', 'f<sub>y</sub> (MPa)'], [
          { label: 'Ngang', sub: 'ρ<sub>h</sub> – song song trục dầm', cells: ['dh', 'nh', 'sh', 'fyh'] },
          { label: 'Đứng (cốt đai)', sub: 'ρ<sub>v</sub>', cells: ['dv', 'nv', 'sv', 'fyv'] },
        ])) +
      group('Gia cường quanh lỗ mở', 'trim',
        rtable(['Đường kính', 'Số thanh', 'Neo / Góc', 'f<sub>y</sub> (MPa)'], [
          { chk: 'trimOn', label: 'Thanh viền lỗ', sub: 'ngang & đứng, mỗi cạnh', cells: ['dTrim', 'nTrim', 'extTrim', 'fyTrim'] },
          { chk: 'diagOn', label: 'Thanh xiên góc', sub: 'tại 4 góc lỗ', cells: ['dDiag', 'nDiag', 'angDiag', 'fyDiag'] },
        ]), { hint: 'tùy chọn' });
  }

  function syncInputs() {
    $$('[data-k]').forEach(el => {
      const k = el.dataset.k;
      if (!(k in S)) return;
      if (el.type === 'checkbox') el.checked = !!S[k];
      else el.value = S[k] == null ? '' : S[k];
      delete el.dataset.auto;
    });
  }

  function updateConditional() {
    for (const k in F) {
      const f = F[k];
      const wrap = $(`.fld[data-f="${k}"]`);
      if (!wrap) continue;
      const inp = wrap.matches('[data-k]') ? wrap : wrap.querySelector('[data-k]');
      if (f.show) wrap.hidden = !f.show(S);
      const dis = f.dis ? !!f.dis(S) : false;
      if (inp) {
        inp.disabled = dis;
        wrap.classList.toggle('disabled', dis);
        if (f.auto) {
          const av = f.auto(S);
          if (dis && av != null) { inp.value = Math.round(av * 10) / 10; inp.dataset.auto = '1'; }
          else if (dis) { inp.value = ''; inp.dataset.auto = '1'; }
          else if (inp.dataset.auto) { delete inp.dataset.auto; inp.value = S[k]; }
        }
      }
      if (typeof f.label === 'function') { const l = wrap.querySelector('[data-lbl]'); if (l) l.textContent = f.label(S); }
      if (typeof f.sym === 'function') { const sy = wrap.querySelector('[data-sym]'); if (sy) sy.innerHTML = f.sym(S); }
    }
    const tseng = !!S.m_tseng;
    const gc = $('#grpCodes');
    gc.classList.toggle('is-disabled', !tseng);
    $$('#grpCodes input').forEach(i => { i.disabled = !tseng; });
  }

  /* ---------- input validation (dữ liệu nhập, không phải kiểm tra thiết kế) ---------- */
  const isNum = v => typeof v === 'number' && isFinite(v);
  function validate(step) {
    const s = S, out = [];
    const add = (lvl, msg, keys) => out.push({ lvl, msg, keys: keys || [] });
    const need = (keys, allowZero) => keys.forEach(k => {
      const v = s[k];
      if (v === '' || v == null) add('err', `Chưa nhập “${lbl(k)}”.`, [k]);
      else if (!isNum(+v) || (allowZero ? +v < 0 : +v <= 0)) add('err', `“${lbl(k)}” phải là số ${allowZero ? 'không âm' : 'dương'}.`, [k]);
      else if (F[k].int && Math.round(+v) !== +v) add('err', `“${lbl(k)}” phải là số nguyên.`, [k]);
    });
    const okAll = keys => keys.every(k => isNum(+s[k]) && s[k] !== '' && +s[k] > 0);

    if (step === 1) {
      if (!METHODS.some(m => s[m.k])) add('err', 'Chọn ít nhất một mô hình tính.', METHODS.map(m => m.k));
      if (s.m_tseng && !CODES.some(c => s[c.k])) add('err', 'Mô hình Tseng et al. cần ít nhất một tiêu chuẩn để lấy hệ số β.', CODES.map(c => c.k));
    }

    if (step === 2) {
      const req = ['b', 'D', 'd', 'Ltot', 'Ls', 'ls', 'lb'];
      if (s.loadType === '2p') req.push('a');
      if (s.oShape === 'circle') req.push('odia'); else req.push('ox');
      if (s.oShape === 'rect') req.push('oy');
      if (s.oPos === 'custom') req.push('xo');
      need(req);
      if (s.ey === '' || !isNum(s.ey)) add('err', 'Chưa nhập “Lệch tâm đứng” (nhập 0 nếu lỗ ở giữa chiều cao).', ['ey']);
      ['Vu', 'Vexp'].forEach(k => { if (s[k] !== '' && !(isNum(s[k]) && s[k] > 0)) add('err', `“${lbl(k)}” phải là số dương hoặc để trống.`, [k]); });

      if (okAll(req) && isNum(s.ey)) {
        if (s.d >= s.D) add('err', 'Chiều cao làm việc d phải nhỏ hơn chiều cao dầm D.', ['d']);
        else if (s.d < 0.6 * s.D) add('warn', 'Chiều cao làm việc d nhỏ bất thường (< 0,6D).', ['d']);
        if (s.Ls > s.Ltot) add('err', 'Nhịp tính toán L₀ không được lớn hơn chiều dài dầm L.', ['Ls', 'Ltot']);
        else if ((s.Ltot - s.Ls) / 2 < s.ls / 2) add('warn', 'Đoạn dầm ngoài tim gối nhỏ hơn một nửa bản gối.', ['Ls', 'ls']);
        if (s.loadType === '2p') {
          if (s.a >= s.Ls / 2) add('err', 'Nhịp cắt a phải nhỏ hơn L₀/2 để hai điểm đặt tải không trùng nhau.', ['a']);
          else if (s.Ls - 2 * s.a < s.lb) add('warn', 'Hai bản đặt tải chồng lên nhau.', ['a', 'lb']);
        }
        const g = D.geom(s);
        const op = g && g.ops[0];
        if (g && op) {
          const top = op.cy - op.h / 2, bot = op.cy + op.h / 2;
          const ok = ['oy', 'odia', 'ox', 'ey'];
          if (top <= 0 || bot >= s.D) add('err', 'Lỗ mở vượt ra ngoài chiều cao dầm.', ok);
          else if (bot > s.d) add('warn', 'Đáy lỗ mở thấp hơn trọng tâm cốt thép chịu kéo (d).', ok);
          const left = op.cx - op.w / 2, right = op.cx + op.w / 2;
          if (left <= 0) add('err', 'Lỗ mở vượt ra ngoài đầu dầm.', ['xo', 'ox', 'odia']);
          else if (left < g.x1 || right > g.loads[0]) add('warn', 'Lỗ mở vượt ra ngoài nhịp cắt (qua tim gối hoặc tim điểm đặt tải).', ['xo', 'ox', 'odia']);
          if (s.oSym && right >= s.Ltot / 2) add('err', 'Hai lỗ mở đối xứng chồng lên nhau tại giữa nhịp.', ['xo', 'ox', 'odia']);
          if (s.m_ray && op.h > 0.6 * s.D) add('warn', 'Chiều cao lỗ > 0,6D – ngoài phạm vi mô hình Ray & Reddy (1979).', ['oy', 'odia', 'ox']);
        }
      }
    }

    if (step === 3) {
      const req = ['fc', 'nBar', 'fy', 'dTop', 'fyTop', 'Es', 'cover', 'sh', 'fyh', 'sv', 'fyv'];
      if (s.fcType === 'cube') req.push('conv');
      if (s.EcMode === 'manual') req.push('Ec');
      if (s.trimOn) req.push('nTrim', 'extTrim', 'fyTrim');
      if (s.diagOn) req.push('nDiag', 'angDiag', 'fyDiag');
      need(req);
      need(['nTop'], true);
      if (isNum(s.fc) && s.fc > 0 && (s.fc < 15 || s.fc > 100)) add('warn', 'Cường độ bê tông nằm ngoài phạm vi cơ sở dữ liệu kiểm chứng (16–100 MPa).', ['fc']);
      if (s.fcType === 'cube' && isNum(s.conv) && s.conv > 0 && (s.conv < 0.6 || s.conv > 1)) add('warn', 'Hệ số quy đổi lập phương → trụ thường nằm trong khoảng 0,6–1,0.', ['conv']);
      if (isNum(s.nBar) && +s.layers > s.nBar) add('err', 'Số lớp thép chịu kéo lớn hơn số thanh.', ['layers', 'nBar']);
      if (isNum(s.cover) && isNum(s.D) && s.cover > s.D / 5) add('warn', 'Lớp bê tông bảo vệ lớn bất thường so với chiều cao dầm.', ['cover']);
      if (isNum(s.fy) && (s.fy < 200 || s.fy > 800)) add('warn', 'Giới hạn chảy thép chịu kéo nằm ngoài khoảng thông thường (200–800 MPa).', ['fy']);
      if (isNum(s.sh) && isNum(s.D) && s.sh > s.D / 2) add('warn', 'Khoảng cách thép bụng ngang lớn hơn D/2.', ['sh']);
      if (isNum(s.sv) && isNum(s.D) && s.sv > s.D / 2) add('warn', 'Khoảng cách cốt đai lớn hơn D/2.', ['sv']);
      if (s.diagOn && isNum(s.angDiag) && (s.angDiag <= 0 || s.angDiag >= 90)) add('err', 'Góc nghiêng thanh xiên phải trong khoảng 0–90°.', ['angDiag']);
    }
    return out;
  }

  function renderValidation(all) {
    $$('.fld.bad, .fld.warn, .rchk.bad').forEach(e => e.classList.remove('bad', 'warn'));
    [1, 2, 3].forEach(i => all[i].forEach(x => x.keys.forEach(k => {
      const w = $(`.fld[data-f="${k}"]`);
      if (w && !w.classList.contains('bad')) w.classList.add(x.lvl === 'err' ? 'bad' : 'warn');
    })));
    const steps = cur === 4 ? [1, 2, 3] : [cur];
    const issues = [];
    steps.forEach(i => all[i].forEach(x => issues.push(Object.assign({ step: i }, x))));
    const box = $('#validation');
    const ne = issues.filter(x => x.lvl === 'err').length, nw = issues.length - ne;
    if (!issues.length) {
      box.className = 'validation ok';
      box.innerHTML = `<div class="v-sum">${svgI('ok')} Dữ liệu ${cur === 4 ? 'đầu vào' : 'bước này'} hợp lệ</div>`;
    } else {
      box.className = 'validation ' + (ne ? 'has-err' : 'has-warn');
      box.innerHTML = `<div class="v-sum">${svgI(ne ? 'err' : 'warn')} ${ne ? `${ne} lỗi cần sửa` : ''}${ne && nw ? ' · ' : ''}${nw ? `${nw} cảnh báo` : ''}</div>` +
        `<ul>${issues.map(x => `<li class="${x.lvl}">${cur === 4 ? `<em>Bước ${x.step}</em>` : ''}${esc(x.msg)}</li>`).join('')}</ul>`;
    }
  }

  /* ---------- stepper & navigation ---------- */
  const hasErr = list => list.some(x => x.lvl === 'err');
  function renderStepper(all) {
    $$('.step').forEach(el => {
      const n = +el.dataset.go;
      const err = n < 4 && hasErr(all[n]);
      el.classList.toggle('active', n === cur);
      el.classList.toggle('done', n !== cur && n < 4 && n <= maxSeen && !err && n < Math.max(cur, maxSeen));
      el.classList.toggle('error', n !== cur && n <= maxSeen && err);
      el.setAttribute('aria-current', n === cur ? 'step' : 'false');
    });
    $$('.step-line').forEach(el => el.classList.toggle('done', +el.dataset.line < cur));
  }

  let shown = 0;
  function setStep(n) {
    const prev = shown;
    shown = n;
    cur = n;
    maxSeen = Math.max(maxSeen, n);
    document.body.dataset.step = n;
    $$('.step-pane').forEach(p => p.classList.toggle('on', +p.dataset.pane === n));
    $('#phStep').textContent = `BƯỚC ${n} / 4`;
    $('#stepTitle').textContent = STEPS[n][0];
    $('#stepDesc').textContent = STEPS[n][1];
    $('#footStep').textContent = `Bước ${n} / 4`;
    $('#btnPrev').disabled = n === 1;
    const nx = $('#btnNext');
    if (n === 4) {
      nx.disabled = true;
      nx.title = 'Mô-đun tính toán sẽ được triển khai ở giai đoạn sau';
      nx.innerHTML = `${svgI('lock')}Tính toán`;
    } else {
      nx.disabled = false;
      nx.title = '';
      nx.innerHTML = `${n === 3 ? 'Xem kết quả' : 'Tiếp theo'}<svg viewBox="0 0 16 16"><path d="M6 3l5 5-5 5"/></svg>`;
    }
    if (n === 4 && prev !== 4) $('#lyStm').checked = true;
    if (n !== 4 && prev === 4) $('#lyStm').checked = false;
    $('#panelBody').scrollTop = 0;
    try { history.replaceState(null, '', '#step=' + n); } catch (e) { /* file:// on some browsers */ }
    persist();
    refresh();
  }

  function go(n) {
    if (n < 1 || n > 4 || n === cur) return;
    if (n > cur) {
      for (let i = cur; i < n; i++) {
        if (hasErr(validate(i))) {
          if (i !== cur) setStep(i);
          const v = $('#validation');
          v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash');
          const b = $('#btnNext');
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          toast('Vui lòng sửa các lỗi dữ liệu trước khi sang bước tiếp theo.');
          return;
        }
      }
    }
    setStep(n);
  }

  /* ---------- side info ---------- */
  function renderChips() {
    const s = S, g = D.geom(s);
    const c = [];
    const add = (k, v, key) => c.push(`<span class="chip${key ? ' key' : ''}">${k}<b>${v}</b></span>`);
    add('b × D', `${fmt(s.b)} × ${fmt(s.D)}`);
    add('d', fmt(s.d));
    add('L₀', fmt(s.Ls));
    if (g) { add('a', fmt(g.a)); add('a/d', fmt(g.a / g.d, 2), true); }
    const op = g && g.ops[0];
    if (op) add('Lỗ mở', op.shape === 'circle' ? `Ø${fmt(op.w)}` : `${fmt(op.w)} × ${fmt(op.h)}`, true);
    add(s.fcType === 'cube' ? 'f<sub>ck</sub>' : 'f′<sub>c</sub>', `${fmt(s.fc, 2)} MPa`);
    add('Thép dọc', `${s.nBar}Ø${s.dBar}`);
    add('Thép trên', `${s.nTop}Ø${s.dTop}`);
    add('Bụng ngang', `Ø${s.dh}@${fmt(s.sh)}`);
    add('Đai đứng', `Ø${s.dv}@${fmt(s.sv)}`);
    if (isNum(s.Vexp)) add('V<sub>exp</sub>', `${fmt(s.Vexp)} kN`);
    $('#chips').innerHTML = c.join('');
  }

  /* ---------- step 4 (khung kết quả, chưa tính) ---------- */
  const MECH = [
    { sym: 'V<sub>1c</sub>', desc: 'Nén vỡ thanh chống BC tại nút C' },
    { sym: 'V<sub>2c</sub>', desc: 'Nén vỡ thanh chống AD tại nút A' },
    { sym: 'V<sub>3y</sub>', desc: 'Chảy dẻo cốt bụng ngang phía trên lỗ' },
    { sym: 'V<sub>4y</sub>', desc: 'Chảy dẻo cốt dọc & cốt bụng dưới lỗ' },
  ];
  const PARAMS = [['θ<sub>1</sub>', '°'], ['θ<sub>2</sub>', '°'], ['θ<sub>3</sub>', '°'], ['θ<sub>4</sub>', '°'], ['k<sub>r</sub>', '–'], ['kd', 'mm'], ['w<sub>st1</sub>', 'mm'], ['w<sub>st3</sub>', 'mm']];

  function renderResults() {
    const s = S, g = D.geom(s), op = g && g.ops[0];
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b title="${esc(String(v).replace(/<[^>]+>/g, ''))}">${v}</b></div>`;
    const models = METHODS.filter(m => s[m.k]);
    const codes = CODES.filter(c => s[c.k]);
    const rows = [];
    models.forEach(m => {
      if (m.k === 'm_tseng') codes.forEach(c => rows.push([m.name, c.name]));
      else rows.push([m.name, '–']);
    });
    const shapeTxt = { rect: 'Chữ nhật', square: 'Vuông', circle: 'Tròn' }[s.oShape];
    const vexp = isNum(s.Vexp);

    $('#pane4').innerHTML = `
      <div class="banner">${svgI('lock')}<div><b>Mô-đun tính toán chưa được kích hoạt</b>
        <p>Đây là bố cục trình bày kết quả. Các ô “—” sẽ hiển thị giá trị sau khi triển khai công thức ở giai đoạn tiếp theo.</p></div></div>

      <div class="sum-grid">
        <div class="sum-card"><h4>Phương pháp</h4>
          ${kv('Mô hình', models.length ? models.length + ' đã chọn' : '–')}
          ${kv('Tiêu chuẩn β', s.m_tseng ? (codes.map(c => c.name.split(' ')[0]).join(', ') || '–') : '–')}
          ${kv('Sức kháng', s.resistType === 'design' ? 'Thiết kế' : 'Danh nghĩa')}
          ${kv('Đơn vị', 'mm · MPa · kN')}</div>
        <div class="sum-card"><h4>Hình học</h4>
          ${kv('b × D', `${fmt(s.b)} × ${fmt(s.D)}`)}
          ${kv('d', fmt(s.d))}
          ${kv('L / L₀', `${fmt(s.Ltot)} / ${fmt(s.Ls)}`)}
          ${kv('a · a/d', g ? `${fmt(g.a)} · ${fmt(g.a / g.d, 2)}` : '–')}</div>
        <div class="sum-card"><h4>Lỗ mở</h4>
          ${kv('Hình dạng', shapeTxt)}
          ${kv('Kích thước', op ? (op.shape === 'circle' ? `Ø${fmt(op.w)}` : `${fmt(op.w)} × ${fmt(op.h)}`) : '–')}
          ${kv('x₀ · e<sub>y</sub>', op ? `${fmt(op.cx - g.x1)} · ${fmt(s.ey)}` : '–')}
          ${kv('Số lỗ', s.oSym ? '2 (đối xứng)' : '1')}</div>
        <div class="sum-card"><h4>Vật liệu & thép</h4>
          ${kv(s.fcType === 'cube' ? 'f<sub>ck</sub>' : 'f′<sub>c</sub>', `${fmt(s.fc, 2)} MPa`)}
          ${kv('Thép dọc', `${s.nBar}Ø${s.dBar} · ${fmt(s.fy)}`)}
          ${kv('Bụng ngang', `Ø${s.dh}@${fmt(s.sh)}`)}
          ${kv('Cốt đai', `Ø${s.dv}@${fmt(s.sv)}`)}</div>
      </div>

      ${group('Bảng tổng hợp sức kháng cắt', 'table', `
        <table class="res"><thead><tr>
          <th>Mô hình</th><th>Tiêu chuẩn β</th><th class="r">V<sub>cal</sub> (kN)</th><th>Cơ chế khống chế</th><th class="r">V<sub>exp</sub>/V<sub>cal</sub></th>
        </tr></thead><tbody>
        ${rows.length ? rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="r pend">—</td><td class="pend">—<span class="pend-tag">chờ tính</span></td><td class="r pend">${vexp ? '—' : 'n/a'}</td></tr>`).join('')
          : '<tr class="empty-row"><td colspan="5">Chưa chọn mô hình tính ở Bước 1.</td></tr>'}
        </tbody></table>`, { hint: vexp ? `V<sub>exp</sub> = ${fmt(s.Vexp)} kN` : '' })}

      ${s.m_tseng ? group('Cơ chế phá hoại – Tseng et al. (2017)', 'mech', `
        <div class="mech-grid">${MECH.map(m => `
          <div class="mech"><div class="mech-sym">${m.sym}</div><div class="mech-desc">${m.desc}</div>
          <div class="mech-val">— <small>kN</small></div><div class="mech-bar"></div></div>`).join('')}</div>`) : ''}

      ${group('Thông số trung gian của mô hình giàn ảo', 'param', `
        <div class="param-grid">${PARAMS.map(p => `<div class="param"><span>${p[0]}</span><b>—</b><small>${p[1]}</small></div>`).join('')}</div>`)}

      <div class="res-actions">
        <button class="btn primary" disabled title="Sẽ triển khai ở giai đoạn sau">${svgI('lock')}Tính toán</button>
        <button class="btn" disabled title="Sẽ triển khai ở giai đoạn sau">${svgI('pdf')}Xuất báo cáo</button>
        <button class="btn" data-act="save">${svgI('save')}Lưu dữ liệu (.json)</button>
      </div>`;
  }

  /* ---------- drawing ---------- */
  let raf = 0;
  function scheduleDraw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function draw() {
    const info = D.elevation($('#elev'), S, { dims: $('#lyDim').checked, rebar: $('#lyRebar').checked, stm: $('#lyStm').checked });
    D.section($('#sect'), S);
    applyFocus();
    $('#vizScale').textContent = info && info.scale ? `tỷ lệ ≈ 1:${Math.max(1, Math.round(1 / (info.scale * 0.2646) / 5) * 5)}` : '';
  }
  function applyFocus() {
    $$('.hl-on').forEach(e => e.classList.remove('hl-on'));
    if (focusGrp) $$('.hl-' + focusGrp).forEach(e => e.classList.add('hl-on'));
  }

  function refresh() {
    updateConditional();
    const all = { 1: validate(1), 2: validate(2), 3: validate(3) };
    renderValidation(all);
    renderStepper(all);
    renderChips();
    if (cur === 4) renderResults();
    scheduleDraw();
  }

  /* ---------- events ---------- */
  function onEdit(e) {
    const el = e.target;
    const k = el && el.dataset && el.dataset.k;
    if (!k || el.dataset.auto) return;
    const f = F[k];
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'number') { const t = el.value.trim(); v = t === '' ? '' : parseFloat(t); if (Number.isNaN(v)) v = ''; }
    else if (f && f.numeric) v = parseFloat(el.value);
    else v = el.value;
    if (S[k] === v) return;
    S[k] = v;
    if (k === 'oPos' && v === 'custom') {
      const a = aEff(S);
      if (isNum(a) && a > 0) { S.xo = Math.round(a / 2 * 10) / 10; const xi = $('#i_xo'); if (xi) { delete xi.dataset.auto; xi.value = S.xo; } }
    }
    persist();
    refresh();
  }

  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveFile() {
    const name = (S.memberName || 'dam-cao').toString().replace(/[^\w.-]+/g, '_');
    download(`deepbeam_${name}.json`, JSON.stringify({ app: 'DeepBeam STM', version: 1, data: S }, null, 2));
    toast('Đã xuất tệp dữ liệu.');
  }
  function loadData(obj, msg) {
    S = Object.assign({}, DEFAULTS);
    for (const k in DEFAULTS) if (obj && k in obj) S[k] = obj[k];
    syncInputs();
    persist();
    refresh();
    if (msg) toast(msg);
  }

  let toastT = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function init() {
    buildForms();
    syncInputs();
    document.addEventListener('input', onEdit);
    document.addEventListener('change', onEdit);
    document.addEventListener('focusin', e => {
      const k = e.target.dataset && e.target.dataset.k;
      focusGrp = (k && HL[k]) || null;
      applyFocus();
    });
    document.addEventListener('focusout', () => { focusGrp = null; applyFocus(); });
    document.addEventListener('click', e => { if (e.target.closest('[data-act="save"]')) saveFile(); });

    $('#btnNext').addEventListener('click', () => go(cur + 1));
    $('#btnPrev').addEventListener('click', () => go(cur - 1));
    $$('.step').forEach(el => el.addEventListener('click', () => go(+el.dataset.go)));
    ['#lyDim', '#lyRebar', '#lyStm'].forEach(id => $(id).addEventListener('change', scheduleDraw));

    $('#btnSave').addEventListener('click', saveFile);
    $('#btnOpen').addEventListener('click', () => $('#fileIn').click());
    $('#fileIn').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const o = JSON.parse(rd.result);
          loadData(o && o.data ? o.data : o, `Đã mở “${file.name}”.`);
        } catch (err) { toast('Tệp không hợp lệ – không đọc được dữ liệu JSON.'); }
      };
      rd.readAsText(file);
      e.target.value = '';
    });
    $('#btnReset').addEventListener('click', () => {
      if (confirm('Khôi phục toàn bộ dữ liệu nhập về giá trị mặc định?')) loadData(DEFAULTS, 'Đã khôi phục dữ liệu mặc định.');
    });
    $('#presetSel').addEventListener('change', e => {
      const v = e.target.value;
      if (v) loadData(preset(v), `Đã nạp dữ liệu dầm mẫu ${v}.`);
      e.target.value = '';
    });
    document.addEventListener('keydown', e => {
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); }
    });

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(scheduleDraw);
      ro.observe($('#elevWrap'));
      ro.observe($('.sect-wrap'));
    } else {
      window.addEventListener('resize', scheduleDraw);
    }
    setStep(cur);
  }

  init();
})();
