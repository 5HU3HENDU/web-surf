// web-surf v1: zoomable canvas of websites.
// Pan: drag. Zoom: mouse wheel, pinch, or +/- buttons. Tap a tile for details.
(function () {
  const TILE = 132, GAP = 16, PAD = 16, COLS = 16;
  const viewport = document.getElementById('viewport');
  const canvas = document.getElementById('canvas');
  const sheet = document.getElementById('sheet');
  const backdrop = document.getElementById('backdrop');
  const search = document.getElementById('search');
  const results = document.getElementById('results');
  const chipsEl = document.getElementById('chips');
  const sites = window.SITES || [];

  let scale = 1, tx = 0, ty = 0;
  let activeCat = 'All';

  const favicon = (s) =>
    'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(s.domain) + '&sz=128';

  // ---- build tiles ----
  const tileEls = sites.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.setAttribute('aria-label', s.name);
    b.dataset.idx = i;
    const img = document.createElement('img');
    img.src = favicon(s);
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => {
      const l = document.createElement('div');
      l.className = 'letter';
      l.textContent = s.name.charAt(0);
      img.replaceWith(l);
    };
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = s.name;
    b.append(img, name);
    canvas.appendChild(b);
    return b;
  });
  document.getElementById('count').textContent = sites.length + ' sites';

  // ---- build category chips ----
  const cats = ['All', ...new Set(sites.map((s) => s.cat))];
  cats.forEach((c) => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (c === 'All' ? ' active' : '');
    chip.textContent = c;
    chip.onclick = () => {
      activeCat = c;
      chipsEl.querySelectorAll('.chip').forEach((el) =>
        el.classList.toggle('active', el.textContent === c));
      tileEls.forEach((el, i) => {
        el.classList.toggle('dim', activeCat !== 'All' && sites[i].cat !== activeCat);
      });
    };
    chipsEl.appendChild(chip);
  });

  // ---- transform ----
  function apply() {
    canvas.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }
  function fitAll() {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    scale = Math.min(vw / w, vh / h) * 0.96;
    tx = (vw - w * scale) / 2;
    ty = (vh - h * scale) / 2;
    apply();
  }
  function zoomAt(f, cx, cy) {
    const ns = Math.min(3, Math.max(0.12, scale * f));
    tx = cx - (cx - tx) * (ns / scale);
    ty = cy - (cy - ty) * (ns / scale);
    scale = ns;
    apply();
  }
  function tileCenter(i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    return {
      x: PAD + col * (TILE + GAP) + TILE / 2,
      y: PAD + row * (TILE + GAP) + TILE / 2,
    };
  }
  function centerTile(i, open) {
    const c = tileCenter(i);
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    scale = Math.max(scale, 1.05);
    tx = vw / 2 - c.x * scale;
    ty = vh / 2 - c.y * scale;
    apply();
    const el = tileEls[i];
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    if (open) openSheet(sites[i]);
  }

  // ---- pan / pinch ----
  const pointers = new Map();
  let dragMoved = 0, lastPinch = 0, lastMid = null;
  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = 0; lastPinch = 0; lastMid = null;
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      tx += dx; ty += dy;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      apply();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = viewport.getBoundingClientRect();
      if (lastPinch) {
        zoomAt(d / lastPinch, mid.x - r.left, mid.y - r.top);
        if (lastMid) { tx += mid.x - lastMid.x; ty += mid.y - lastMid.y; apply(); }
      }
      lastPinch = d; lastMid = mid; dragMoved = 999;
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) { lastPinch = 0; lastMid = null; }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = viewport.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // tap (not drag) on a tile opens it
  canvas.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || dragMoved > 8) return;
    openSheet(sites[Number(tile.dataset.idx)]);
  });

  // ---- controls ----
  document.getElementById('zoomIn').onclick = () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(1.3, r.width / 2, r.height / 2);
  };
  document.getElementById('zoomOut').onclick = () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(1 / 1.3, r.width / 2, r.height / 2);
  };
  document.getElementById('zoomReset').onclick = fitAll;
  document.getElementById('random').onclick = () => {
    const i = Math.floor(Math.random() * sites.length);
    centerTile(i, true);
  };

  // ---- detail sheet ----
  function openSheet(s) {
    const icon = document.getElementById('sheetIcon');
    icon.src = favicon(s);
    icon.onerror = () => { icon.style.visibility = 'hidden'; };
    icon.onload = () => { icon.style.visibility = 'visible'; };
    document.getElementById('sheetName').textContent = s.name;
    document.getElementById('sheetDomain').textContent = s.domain;
    document.getElementById('sheetCat').textContent = s.cat;
    document.getElementById('sheetDesc').textContent = s.desc;
    const visit = document.getElementById('sheetVisit');
    visit.href = s.url;
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }
  function closeSheet() {
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
  }
  document.getElementById('sheetClose').onclick = closeSheet;
  backdrop.onclick = closeSheet;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  // ---- search ----
  function hideResults() { results.classList.remove('open'); results.innerHTML = ''; }
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (q.length < 2) { hideResults(); return; }
    const matches = sites
      .map((s, i) => ({ s, i }))
      .filter(({ s }) =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q))
      .slice(0, 8);
    if (!matches.length) { hideResults(); return; }
    results.innerHTML = '';
    matches.forEach(({ s, i }) => {
      const row = document.createElement('button');
      row.className = 'result';
      const img = document.createElement('img');
      img.src = favicon(s);
      img.alt = '';
      const txt = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = s.name;
      const small = document.createElement('small');
      small.textContent = s.domain + ' · ' + s.cat;
      txt.append(b, small);
      row.append(img, txt);
      row.onclick = () => {
        centerTile(i, true);
        search.value = '';
        hideResults();
        search.blur();
      };
      results.appendChild(row);
    });
    results.classList.add('open');
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.result');
      if (first) first.click();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchrow')) hideResults();
  });

  window.addEventListener('resize', fitAll);
  fitAll();
})();
