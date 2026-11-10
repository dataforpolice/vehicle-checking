/* Officer dashboard: login, filters, map, PS/beat summary, table, CSV */
(function () {
  'use strict';
  const { t, CATEGORIES, SENSITIVITY, cfg, esc } = RM;
  const $ = (id) => document.getElementById(id);
  const sb = RM.getClient();

  let all = [], filtered = [], map = null, cluster = null, markers = {};
  const F = { ps: '', beat: '', cat: '', sens: '', from: '', to: '', q: '' };
  let fitNext = true;

  const beatKey = r => String(r.beat_no || '').trim().toUpperCase();
  const fmtDate = s => { try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return s; } };

  // ---------- language ----------
  function renderLangBtn() { $('langBtn').textContent = t('lang_switch'); }
  $('langBtn').addEventListener('click', () => RM.setLang(RM.lang === 'hi' ? 'en' : 'hi'));
  document.addEventListener('langchange', () => { renderLangBtn(); if (all.length || map) { buildFilterOptions(); render(); } });

  function msg(text, kind) { const m = $('dashMsg'); if (!text) { m.className = 'alert hidden'; return; } m.className = 'alert alert-' + kind; m.textContent = text; }

  // ---------- auth ----------
  async function init() {
    RM.applyI18n(); renderLangBtn();
    $('districtName').textContent = cfg.DISTRICT_NAME || '';
    if (!sb) {
      const show = () => { $('configWarn').textContent = '⚠️ ' + t('not_configured') + ' — ' + RM.configProblem(); };
      show(); document.addEventListener('langchange', show);
      $('configWarn').classList.remove('hidden'); return;
    }
    const { data } = await sb.auth.getSession();
    if (data && data.session) startApp(data.session); else showLogin();
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') showLogin(); });
  }
  function showLogin() {
    $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden');
    $('logoutBtn').classList.add('hidden'); $('userEmail').classList.add('hidden');
  }
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); $('loginMsg').classList.add('hidden');
    const { data, error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) { $('loginMsg').textContent = t('login_err'); $('loginMsg').classList.remove('hidden'); return; }
    startApp(data.session);
  });
  $('logoutBtn').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

  async function startApp(session) {
    $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
    $('logoutBtn').classList.remove('hidden');
    $('userEmail').textContent = (session && session.user && session.user.email) || ''; $('userEmail').classList.remove('hidden');
    initMap();
    const chk = await sb.rpc('is_officer');
    if (chk.error || chk.data !== true) { msg(t('not_officer'), 'err'); return; }
    await loadData();
  }

  // ---------- data ----------
  async function loadData() {
    msg(t('loading'), 'info');
    const rows = []; const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await sb.from('resources').select('*').order('created_at', { ascending: false }).range(from, from + page - 1);
      if (error) { msg(error.message, 'err'); return; }
      rows.push(...data);
      if (data.length < page) break;
    }
    all = rows; msg('');
    fitNext = true; buildFilterOptions(); render();
  }
  $('refreshBtn').addEventListener('click', loadData);

  // ---------- filters ----------
  function opt(v, text, cur) { return `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(text)}</option>`; }
  function buildFilterOptions() {
    const psCount = {};
    all.forEach(r => { psCount[r.ps_name] = (psCount[r.ps_name] || 0) + 1; });
    const psList = Array.from(new Set([...(cfg.POLICE_STATIONS || []), ...Object.keys(psCount)])).filter(Boolean).sort();
    $('fPs').innerHTML = opt('', t('all_ps'), F.ps) + psList.map(p => opt(p, `${p} (${psCount[p] || 0})`, F.ps)).join('');

    const beats = {};
    all.filter(r => !F.ps || r.ps_name === F.ps).forEach(r => {
      const k = beatKey(r); if (!beats[k]) beats[k] = { name: r.beat_name || '', n: 0 }; beats[k].n++;
      if (!beats[k].name && r.beat_name) beats[k].name = r.beat_name;
    });
    const bk = Object.keys(beats).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (F.beat && !beats[F.beat]) F.beat = '';
    $('fBeat').innerHTML = opt('', t('all_beats'), F.beat) + bk.map(k => opt(k, `${t('beat_no')} ${k}${beats[k].name ? ' – ' + beats[k].name : ''} (${beats[k].n})`, F.beat)).join('');

    $('fCat').innerHTML = opt('', t('all_cats'), F.cat) + CATEGORIES.map(c => opt(c.id, `${c.icon} ${RM.label(c)}`, F.cat)).join('');
    $('fSens').innerHTML = opt('', t('all_sens'), F.sens) + SENSITIVITY.map(s => opt(s.id, RM.label(s), F.sens)).join('');
  }
  function onFilter() { fitNext = true; render(); }
  $('fPs').addEventListener('change', e => { F.ps = e.target.value; F.beat = ''; buildFilterOptions(); onFilter(); });
  $('fBeat').addEventListener('change', e => { F.beat = e.target.value; onFilter(); });
  $('fCat').addEventListener('change', e => { F.cat = e.target.value; onFilter(); });
  $('fSens').addEventListener('change', e => { F.sens = e.target.value; onFilter(); });
  $('fFrom').addEventListener('change', e => { F.from = e.target.value; onFilter(); });
  $('fTo').addEventListener('change', e => { F.to = e.target.value; onFilter(); });
  let qTimer; $('fQ').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { F.q = e.target.value.trim().toLowerCase(); onFilter(); }, 250); });
  $('clearBtn').addEventListener('click', () => {
    Object.keys(F).forEach(k => { F[k] = ''; }); $('fFrom').value = ''; $('fTo').value = ''; $('fQ').value = '';
    buildFilterOptions(); onFilter();
  });

  function applyFilters() {
    const from = F.from ? new Date(F.from + 'T00:00:00') : null;
    const to = F.to ? new Date(F.to + 'T23:59:59') : null;
    filtered = all.filter(r => {
      if (F.ps && r.ps_name !== F.ps) return false;
      if (F.beat && beatKey(r) !== F.beat) return false;
      if (F.cat && r.category !== F.cat) return false;
      if (F.sens && r.sensitivity !== F.sens) return false;
      const d = new Date(r.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (F.q) {
        const hay = [r.place_name, r.address, r.staff_name, r.contact_person, r.remarks, r.beat_name, r.ps_name].join(' ').toLowerCase();
        if (!hay.includes(F.q)) return false;
      }
      return true;
    });
  }

  function render() { applyFilters(); renderStats(); renderMap(); renderSummary(); renderTable(); }

  // ---------- stats ----------
  function renderStats() {
    const ps = new Set(filtered.map(r => r.ps_name)).size;
    const beats = new Set(filtered.map(r => r.ps_name + '|' + beatKey(r))).size;
    const high = filtered.filter(r => r.sensitivity === 'high').length;
    $('stats').innerHTML = [
      [t('total'), filtered.length, ''], [t('ps_count'), ps, ''], [t('beat_count'), beats, ''], [t('high_sens'), high, 'danger']
    ].map(([l, n, cls]) => `<div class="stat ${cls}"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`).join('');

    const cnt = {}; filtered.forEach(r => { cnt[r.category] = (cnt[r.category] || 0) + 1; });
    $('catChips').innerHTML = CATEGORIES.filter(c => cnt[c.id] || F.cat === c.id).map(c =>
      `<button type="button" class="chip${F.cat === c.id ? ' on' : ''}" data-id="${c.id}" style="--c:${c.color}">${c.icon} ${esc(RM.label(c))} <b>${cnt[c.id] || 0}</b></button>`).join('');
  }
  $('catChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    F.cat = F.cat === b.dataset.id ? '' : b.dataset.id; buildFilterOptions(); onFilter();
  });

  // ---------- map ----------
  function initMap() {
    if (map) return;
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '© Esri' });
    map = L.map('map', { layers: [street] }).setView(cfg.MAP_CENTER || [22.6, 79.0], cfg.MAP_ZOOM || 5);
    L.control.layers({ [t('layer_street')]: street, [t('layer_sat')]: sat }).addTo(map);
    cluster = L.markerClusterGroup({ maxClusterRadius: 40, disableClusteringAtZoom: 17 });
    map.addLayer(cluster);
    map.on('popupopen', e => wirePopup(e.popup));
    addLegend();
  }
  function addLegend() {
    const lg = L.control({ position: 'bottomleft' });
    lg.onAdd = () => {
      const d = L.DomUtil.create('div', 'legend');
      d.innerHTML = SENSITIVITY.map(s => `<span><i style="border-color:${s.color}"></i>${esc(RM.label(s))}</span>`).join('');
      return d;
    };
    lg.addTo(map);
  }
  function iconFor(r) {
    const c = RM.catById(r.category); const s = RM.sensById(r.sensitivity);
    return L.divIcon({
      className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -14],
      html: `<div class="pin${r.verified ? ' ver' : ''}" style="background:${c.color};border-color:${s.color}">${c.icon}</div>`
    });
  }
  function renderMap() {
    if (!map) return;
    cluster.clearLayers(); markers = {};
    const list = filtered.filter(r => isFinite(r.latitude) && isFinite(r.longitude));
    list.forEach(r => {
      const m = L.marker([r.latitude, r.longitude], { icon: iconFor(r) });
      m.bindPopup(() => popupHtml(r), { maxWidth: 300, minWidth: 240 });
      markers[r.id] = m; cluster.addLayer(m);
    });
    if (fitNext && list.length) {
      map.fitBounds(L.latLngBounds(list.map(r => [r.latitude, r.longitude])), { padding: [30, 30], maxZoom: 16 });
    }
    fitNext = false;
  }
  function popupHtml(r) {
    const c = RM.catById(r.category); const s = RM.sensById(r.sensitivity);
    const row = (k, v) => v ? `<div><b>${esc(k)}:</b> ${esc(v)}</div>` : '';
    return `<div class="pop" data-id="${r.id}">
      <div class="pop-h" style="background:${c.color}">${c.icon} ${esc(RM.label(c))}</div>
      <div class="pop-b">
        <div class="pop-name">${esc(r.place_name)}</div>
        <div><span class="tag" style="background:${s.color}">${esc(RM.label(s))}</span>${r.verified ? ` <span class="tag" style="background:#0f766e">✓ ${esc(t('verified'))}</span>` : ''}</div>
        ${row(t('ps'), r.ps_name)}
        ${row(t('beat_no'), beatKey(r) + (r.beat_name ? ' – ' + r.beat_name : ''))}
        ${row(t('address'), r.address)}
        ${row(t('contact'), [r.contact_person, r.contact_phone].filter(Boolean).join(' · '))}
        ${row(t('remarks'), r.remarks)}
        ${row(t('col_staff'), [r.staff_name, r.staff_mobile].filter(Boolean).join(' · '))}
        ${row(t('col_date'), fmtDate(r.created_at))}
        ${row(t('gps_label'), `${(+r.latitude).toFixed(6)}, ${(+r.longitude).toFixed(6)}${r.gps_accuracy ? ' (±' + r.gps_accuracy + 'm)' : ''}`)}
        <div class="pop-photo"></div>
        <div class="pop-actions">
          ${r.photo_path ? `<button type="button" class="btn btn-xs" data-act="photo">${esc(t('view_photo'))}</button>` : ''}
          <a class="btn btn-xs" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${r.latitude},${r.longitude}">${esc(t('open_gmaps'))}</a>
          <button type="button" class="btn btn-xs" data-act="verify">${esc(t(r.verified ? 'unverify' : 'verify'))}</button>
          <button type="button" class="btn btn-xs btn-danger" data-act="delete">${esc(t('delete'))}</button>
        </div>
      </div></div>`;
  }
  function wirePopup(popup) {
    const el = popup.getElement(); if (!el) return;
    const box = el.querySelector('.pop'); if (!box) return;
    const id = +box.dataset.id; const r = all.find(x => x.id === id); if (!r) return;
    box.querySelectorAll('[data-act]').forEach(btn => {
      btn.onclick = async () => {
        const act = btn.dataset.act;
        if (act === 'photo') {
          btn.disabled = true;
          const { data, error } = await sb.storage.from('photos').createSignedUrl(r.photo_path, 3600);
          if (error) { btn.textContent = error.message; return; }
          box.querySelector('.pop-photo').innerHTML = `<a href="${esc(data.signedUrl)}" target="_blank" rel="noopener"><img src="${esc(data.signedUrl)}" alt=""></a>`;
          btn.remove(); popup.update();
        } else if (act === 'verify') {
          const nv = !r.verified;
          const { error } = await sb.from('resources').update({ verified: nv }).eq('id', id);
          if (error) { alert(error.message); return; }
          r.verified = nv; popup.setContent(popupHtml(r)); wirePopup(popup);
          if (markers[id]) { const m = markers[id]; m.once('popupclose', () => m.setIcon(iconFor(r))); }
          renderTable();
        } else if (act === 'delete') {
          if (!confirm(t('confirm_delete'))) return;
          const { error } = await sb.from('resources').delete().eq('id', id);
          if (error) { alert(error.message); return; }
          if (r.photo_path) await sb.storage.from('photos').remove([r.photo_path]);
          map.closePopup(); all = all.filter(x => x.id !== id); buildFilterOptions(); render();
        }
      };
    });
  }
  function focusRecord(id) {
    const m = markers[id]; if (!m) return;
    $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    cluster.zoomToShowLayer(m, () => m.openPopup());
  }

  // ---------- PS / beat summary ----------
  function renderSummary() {
    const g = {};
    filtered.forEach(r => {
      const ps = r.ps_name || '-'; const bk = beatKey(r) || '-';
      g[ps] = g[ps] || { n: 0, high: 0, beats: {}, cats: {} };
      const P = g[ps]; P.n++; if (r.sensitivity === 'high') P.high++;
      P.cats[r.category] = (P.cats[r.category] || 0) + 1;
      P.beats[bk] = P.beats[bk] || { name: r.beat_name || '', n: 0, high: 0, cats: {} };
      const B = P.beats[bk]; B.n++; if (r.sensitivity === 'high') B.high++;
      if (!B.name && r.beat_name) B.name = r.beat_name;
      B.cats[r.category] = (B.cats[r.category] || 0) + 1;
    });
    const items = cats => Object.entries(cats).sort((a, b) => b[1] - a[1])
      .map(([id, n]) => { const c = RM.catById(id); return `<span class="mini" title="${esc(RM.label(c))}">${c.icon}${n}</span>`; }).join('');
    const psNames = Object.keys(g).sort();
    if (!psNames.length) { $('summary').innerHTML = `<p class="muted">${esc(t('no_data'))}</p>`; return; }
    let html = `<table class="tbl"><thead><tr><th>${esc(t('col_ps'))} / ${esc(t('col_beat'))}</th><th>${esc(t('total'))}</th><th>⚠️</th><th>${esc(t('col_items'))}</th></tr></thead><tbody>`;
    psNames.forEach(ps => {
      const P = g[ps];
      html += `<tr class="ps-row" data-ps="${esc(ps)}" data-beat=""><td><b>${esc(ps)}</b></td><td><b>${P.n}</b></td><td>${P.high || ''}</td><td>${items(P.cats)}</td></tr>`;
      Object.keys(P.beats).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(bk => {
        const B = P.beats[bk];
        html += `<tr class="beat-row" data-ps="${esc(ps)}" data-beat="${esc(bk)}"><td>↳ ${esc(t('beat_no'))} ${esc(bk)}${B.name ? ' – ' + esc(B.name) : ''}</td><td>${B.n}</td><td>${B.high || ''}</td><td>${items(B.cats)}</td></tr>`;
      });
    });
    $('summary').innerHTML = html + '</tbody></table>';
  }
  $('summary').addEventListener('click', e => {
    const tr = e.target.closest('tr[data-ps]'); if (!tr) return;
    F.ps = tr.dataset.ps; F.beat = tr.dataset.beat; buildFilterOptions(); onFilter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------- records table ----------
  function renderTable() {
    $('recCount').textContent = filtered.length;
    $('recNote').classList.toggle('hidden', filtered.length <= 500);
    if (!filtered.length) { $('records').innerHTML = `<p class="muted">${esc(t('no_data'))}</p>`; return; }
    const rows = filtered.slice(0, 500).map(r => {
      const c = RM.catById(r.category); const s = RM.sensById(r.sensitivity);
      return `<tr data-id="${r.id}">
        <td class="nowrap">${esc(fmtDate(r.created_at))}</td>
        <td class="nowrap">${c.icon} ${esc(RM.label(c))}</td>
        <td>${esc(r.place_name)}${r.photo_path ? ' 📷' : ''}${r.verified ? ' <span title="verified">✅</span>' : ''}</td>
        <td>${esc(r.ps_name)}</td>
        <td>${esc(beatKey(r))}${r.beat_name ? ' – ' + esc(r.beat_name) : ''}</td>
        <td><span class="tag" style="background:${s.color}">${esc(RM.label(s))}</span></td>
        <td>${esc(r.staff_name)}</td></tr>`;
    }).join('');
    $('records').innerHTML = `<table class="tbl click"><thead><tr>
      <th>${esc(t('col_date'))}</th><th>${esc(t('col_cat'))}</th><th>${esc(t('col_name'))}</th><th>${esc(t('col_ps'))}</th>
      <th>${esc(t('col_beat'))}</th><th>${esc(t('col_sens'))}</th><th>${esc(t('col_staff'))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  $('records').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) focusRecord(+tr.dataset.id); });

  // ---------- staff PIN ----------
  $('pinBtn').addEventListener('click', async () => {
    const cur = await sb.from('app_settings').select('value').eq('key', 'entry_code').maybeSingle();
    if (cur.error) { msg(cur.error.message, 'err'); return; }
    const np = prompt(t('pin_prompt'), (cur.data && cur.data.value) || '');
    if (np === null) return;
    const pin = np.trim();
    if (pin.length < 4) { msg(t('pin_short'), 'err'); return; }
    if (cur.data && pin === cur.data.value) return;
    const up = await sb.from('app_settings').update({ value: pin }).eq('key', 'entry_code');
    if (up.error) { msg(up.error.message, 'err'); return; }
    msg(t('pin_saved') + '  →  ' + pin, 'ok');
  });

  // ---------- CSV export (opens in Excel, Hindi safe) ----------
  $('csvBtn').addEventListener('click', () => {
    const cols = [
      ['id', r => r.id], ['date_time', r => fmtDate(r.created_at)], ['police_station', r => r.ps_name],
      ['beat_no', r => beatKey(r)], ['beat_name', r => r.beat_name], ['category', r => RM.catById(r.category).en],
      ['category_hindi', r => RM.catById(r.category).hi], ['place_name', r => r.place_name], ['address', r => r.address],
      ['contact_person', r => r.contact_person], ['contact_phone', r => r.contact_phone],
      ['sensitivity', r => RM.sensById(r.sensitivity).en], ['remarks', r => r.remarks],
      ['latitude', r => r.latitude], ['longitude', r => r.longitude], ['gps_accuracy_m', r => r.gps_accuracy],
      ['google_maps', r => `https://www.google.com/maps?q=${r.latitude},${r.longitude}`],
      ['entered_by', r => r.staff_name], ['staff_mobile', r => r.staff_mobile],
      ['verified', r => r.verified ? 'Yes' : 'No'], ['has_photo', r => r.photo_path ? 'Yes' : 'No']
    ];
    const q = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.map(c => c[0]).join(','), ...filtered.map(r => cols.map(c => q(c[1](r))).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `resource_mapping_${F.ps || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`.replace(/\s+/g, '_');
    document.body.appendChild(a); a.click(); a.remove();
  });

  init();
})();
