/* Staff entry form */
(function () {
  'use strict';
  const { t, store, CATEGORIES, SENSITIVITY, cfg, esc } = RM;
  const $ = (id) => document.getElementById(id);
  const sb = RM.getClient({ auth: { persistSession: false } });

  const state = { cat: null, sens: 'normal', lat: null, lng: null, acc: null, src: null, photo: null, gps: 'none' };
  let map = null, marker = null, accCircle = null, watchId = null, watchTimer = null, syncing = false;

  // ---------- PIN ----------
  // (a link with ?pin=1234 also works, but staff can simply type the PIN)
  const qs = new URLSearchParams(location.search);
  const urlPin = qs.get('pin') || qs.get('code');
  if (urlPin) store.set('entry_code', urlPin.trim());
  function getCode() { return (store.get('entry_code', '') || '').trim(); }

  function showPinScreen(message) {
    $('mainView').classList.add('hidden'); $('pinView').classList.remove('hidden');
    $('pinInput').value = '';
    const m = $('pinMsg');
    if (message) { m.textContent = message; m.classList.remove('hidden'); } else m.classList.add('hidden');
    window.scrollTo({ top: 0 });
    setTimeout(() => $('pinInput').focus(), 100);
  }
  function showMain() {
    $('pinView').classList.add('hidden'); $('mainView').classList.remove('hidden');
    if (map) setTimeout(() => map.invalidateSize(), 50);
  }
  $('pinView').addEventListener('submit', async e => {
    e.preventDefault();
    const pin = $('pinInput').value.trim();
    if (!pin) { showPinScreen(t('pin_empty')); return; }
    const btn = $('pinBtn'); btn.disabled = true; btn.textContent = t('pin_checking');
    let ok = true;   // offline: accept now, the server checks it again on Submit
    try {
      if (sb && navigator.onLine) {
        const res = await sb.rpc('check_pin', { p_code: pin });
        if (!res.error) ok = res.data === true;
      }
    } catch (err) { /* network problem – accept for now */ }
    btn.disabled = false; btn.textContent = t('pin_open');
    if (!ok) { showPinScreen(t('pin_wrong')); return; }
    store.set('entry_code', pin);
    showMain(); syncPending(false);
  });
  $('lockBtn').addEventListener('click', () => { store.del('entry_code'); showPinScreen(); });

  // ---------- language ----------
  function renderLangBtn() { $('langBtn').textContent = t('lang_switch'); }
  $('langBtn').addEventListener('click', () => RM.setLang(RM.lang === 'hi' ? 'en' : 'hi'));
  document.addEventListener('langchange', () => {
    renderLangBtn(); renderPS(); renderBeatPick(); renderCats(); renderSens(); renderGps(); renderPending();
  });

  // ---------- police station & beat ----------
  function renderPS() {
    const sel = $('ps_name'); const cur = sel.value || store.get('prefs', {}).ps_name || '';
    const list = (cfg.POLICE_STATIONS || []).slice();
    if (cur && !list.includes(cur)) list.push(cur);
    sel.innerHTML = `<option value="">${esc(t('select_ps'))}</option>` +
      list.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    sel.value = cur;
  }
  function beatsFor(ps) { return (cfg.BEATS && cfg.BEATS[ps]) || null; }
  function renderBeatPick() {
    const list = beatsFor($('ps_name').value);
    const wrap = $('beatPickWrap'), pick = $('beat_pick');
    if (!list || !list.length) {
      wrap.classList.add('hidden'); $('beatFreeWrap').classList.remove('hidden');
      $('beat_no').readOnly = false; $('beat_name').readOnly = false; return;
    }
    wrap.classList.remove('hidden');
    const curNo = $('beat_no').value.trim();
    pick.innerHTML = `<option value="">${esc(t('select_beat'))}</option>` +
      list.map((b, i) => `<option value="${i}">${esc(b[0])}${b[1] ? ' – ' + esc(b[1]) : ''}</option>`).join('') +
      `<option value="other">${esc(t('beat_other'))}</option>`;
    const idx = list.findIndex(b => String(b[0]) === curNo);
    if (idx >= 0) { pick.value = String(idx); } else if (curNo) { pick.value = 'other'; } else { pick.value = ''; }
    onBeatPick();
  }
  function onBeatPick() {
    const list = beatsFor($('ps_name').value) || [];
    const v = $('beat_pick').value;
    if (v === 'other') {
      $('beatFreeWrap').classList.remove('hidden'); $('beat_no').readOnly = false; $('beat_name').readOnly = false;
    } else {
      $('beatFreeWrap').classList.add('hidden');
      const b = list[+v];
      $('beat_no').value = b ? String(b[0]) : ''; $('beat_name').value = b ? (b[1] || '') : '';
    }
  }
  $('ps_name').addEventListener('change', () => { $('beat_no').value = ''; $('beat_name').value = ''; renderBeatPick(); });
  $('beat_pick').addEventListener('change', onBeatPick);

  // ---------- categories & sensitivity ----------
  function renderCats() {
    $('catGrid').innerHTML = CATEGORIES.map(c =>
      `<button type="button" class="cat-btn${state.cat === c.id ? ' selected' : ''}" data-id="${c.id}" style="--c:${c.color}">
        <span class="cat-ic">${c.icon}</span><span class="cat-lb">${esc(RM.label(c))}</span><span class="cat-sub">${esc(RM.otherLabel(c))}</span>
      </button>`).join('');
  }
  $('catGrid').addEventListener('click', e => {
    const b = e.target.closest('.cat-btn'); if (!b) return;
    state.cat = b.dataset.id;
    if (state.cat === 'crime_hotspot' || state.cat === 'sensitive_area') { if (state.sens === 'normal') state.sens = 'high'; renderSens(); }
    renderCats();
  });
  function renderSens() {
    $('sensSeg').innerHTML = SENSITIVITY.map(s =>
      `<button type="button" class="seg-btn${state.sens === s.id ? ' selected' : ''}" data-id="${s.id}" style="--c:${s.color}">${esc(RM.label(s))}</button>`).join('');
  }
  $('sensSeg').addEventListener('click', e => {
    const b = e.target.closest('.seg-btn'); if (!b) return; state.sens = b.dataset.id; renderSens();
  });

  // ---------- location ----------
  function ensureMap() {
    if (map) return;
    $('pickMap').classList.remove('hidden'); $('gpsTip').classList.remove('hidden');
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '© Esri' });
    map = L.map('pickMap', { layers: [street] }).setView(cfg.MAP_CENTER || [22.6, 79.0], cfg.MAP_CENTER ? 15 : 5);
    L.control.layers({ [t('layer_street')]: street, [t('layer_sat')]: sat }).addTo(map);
    map.on('click', e => setLocation(e.latlng.lat, e.latlng.lng, null, 'manual', false));
    setTimeout(() => map.invalidateSize(), 50);
  }
  const pinIcon = L.divIcon({ className: '', html: '<div class="drop-pin"></div>', iconSize: [30, 42], iconAnchor: [15, 42] });
  function setLocation(lat, lng, acc, src, pan) {
    state.lat = +lat.toFixed(7); state.lng = +lng.toFixed(7);
    state.acc = acc == null ? null : Math.round(acc); state.src = src;
    state.gps = src === 'manual' ? 'manual' : 'ok';
    ensureMap();
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on('dragend', () => { const p = marker.getLatLng(); setLocation(p.lat, p.lng, null, 'manual', false); });
    } else marker.setLatLng([lat, lng]);
    if (accCircle) { map.removeLayer(accCircle); accCircle = null; }
    if (state.acc) accCircle = L.circle([lat, lng], { radius: state.acc, color: '#2563eb', weight: 1, fillOpacity: 0.1 }).addTo(map);
    if (pan) map.setView([lat, lng], 18);
    renderGps();
  }
  function renderGps() {
    const el = $('gpsStatus');
    if (state.gps === 'wait') { el.className = 'gps-status info'; el.textContent = t('gps_wait'); return; }
    if (state.gps === 'err') { el.className = 'gps-status err'; el.textContent = t('gps_err'); return; }
    if (state.lat == null) { el.className = 'gps-status'; el.textContent = t('gps_none'); return; }
    const coords = `${state.lat.toFixed(6)}, ${state.lng.toFixed(6)}`;
    if (state.src === 'manual') { el.className = 'gps-status ok'; el.textContent = `✔ ${t('gps_manual')}: ${coords}`; return; }
    const weak = state.acc != null && state.acc > 50;
    el.className = 'gps-status ' + (weak ? 'warn' : 'ok');
    el.textContent = `✔ ${t('gps_ok')}: ${coords} · ${t('accuracy')} ±${state.acc} ${t('meters')}` + (weak ? ` — ${t('gps_weak')}` : '');
  }
  function stopWatch() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (watchTimer) { clearTimeout(watchTimer); watchTimer = null; }
    $('gpsBtn').disabled = false;
    if (state.gps === 'wait') { state.gps = state.lat == null ? 'err' : 'ok'; renderGps(); }
  }
  $('gpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { state.gps = 'err'; renderGps(); return; }
    stopWatch(); state.gps = 'wait'; renderGps(); $('gpsBtn').disabled = true;
    let best = null; const started = Date.now();
    watchId = navigator.geolocation.watchPosition(pos => {
      const c = pos.coords;
      if (!best || c.accuracy < best.accuracy) {
        best = c; setLocation(c.latitude, c.longitude, c.accuracy, 'gps', true); state.gps = 'wait'; renderGps();
      }
      if (c.accuracy <= 15 || Date.now() - started > 15000) { state.gps = 'ok'; stopWatch(); renderGps(); }
    }, () => { if (!best) state.gps = 'err'; stopWatch(); renderGps(); },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    watchTimer = setTimeout(() => { if (best) state.gps = 'ok'; stopWatch(); renderGps(); }, 20000);
  });
  $('mapBtn').addEventListener('click', () => {
    ensureMap();
    if (state.lat == null) { const c = map.getCenter(); setLocation(c.lat, c.lng, null, 'manual', false); }
    $('pickMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---------- photo ----------
  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * s), h = Math.round(img.height * s);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error('compress failed')), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      img.src = url;
    });
  }
  $('photoInput').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      state.photo = await compressImage(f, 1280, 0.7);
      $('photoPreview').src = URL.createObjectURL(state.photo);
      $('photoBox').classList.remove('hidden');
    } catch (err) { state.photo = null; showMsg(t('err_generic'), 'err'); }
  });
  function clearPhoto() { state.photo = null; $('photoInput').value = ''; $('photoBox').classList.add('hidden'); }
  $('photoRemove').addEventListener('click', clearPhoto);

  // ---------- messages ----------
  function showMsg(text, kind) { const m = $('formMsg'); m.className = 'alert alert-' + kind; m.textContent = text; m.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function hideMsg() { $('formMsg').className = 'alert hidden'; }

  // ---------- submit ----------
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  const val = id => $(id).value.trim();
  function validate() {
    const miss = [];
    if (!val('staff_name')) miss.push(t('staff_name'));
    if (!val('ps_name')) miss.push(t('ps'));
    if (!val('beat_no')) miss.push(t('beat_no'));
    if (!state.cat) miss.push(t('err_category'));
    if (!val('place_name')) miss.push(t('place_name'));
    if (state.lat == null) miss.push(t('err_location'));
    return miss;
  }
  function savePrefs() {
    store.set('prefs', { staff_name: val('staff_name'), staff_mobile: val('staff_mobile'), ps_name: val('ps_name'), beat_no: val('beat_no'), beat_name: val('beat_name') });
  }
  function buildEntry() {
    return {
      client_uid: uuid(), category: state.cat, place_name: val('place_name'),
      ps_name: val('ps_name'), beat_no: val('beat_no'), beat_name: val('beat_name'),
      latitude: state.lat, longitude: state.lng, gps_accuracy: state.acc, location_source: state.src,
      address: val('address'), contact_person: val('contact_person'), contact_phone: val('contact_phone'),
      sensitivity: state.sens, remarks: val('remarks'),
      staff_name: val('staff_name'), staff_mobile: val('staff_mobile'),
      client_time: new Date().toISOString()
    };
  }
  const isNetErr = err => !navigator.onLine || err.message === 'OFFLINE' ||
    /failed to fetch|networkerror|network request failed|load failed|timeout|fetch/i.test((err && err.message) || '');
  const isCodeErr = err => /INVALID_CODE/.test((err && err.message) || '');

  async function sendEntry(data, photoBlob) {
    if (!sb) throw new Error('NOT_CONFIGURED');
    if (!navigator.onLine) throw new Error('OFFLINE');
    const payload = Object.assign({}, data, { photo_path: data.photo_path || null });
    if (photoBlob && !payload.photo_path) {
      const path = `${new Date().toISOString().slice(0, 7)}/${data.client_uid}.jpg`;
      const up = await sb.storage.from('photos').upload(path, photoBlob, { contentType: 'image/jpeg', upsert: false });
      if (up.error && !/exists|duplicate/i.test(up.error.message || '')) throw up.error;
      payload.photo_path = path;
    }
    const res = await sb.rpc('add_resource', { p_code: getCode(), p_data: payload });
    if (res.error) throw res.error;
    bumpToday();
    return res.data;
  }

  function bumpToday() {
    const d = new Date().toISOString().slice(0, 10); const c = store.get('today', { d, n: 0 });
    store.set('today', c.d === d ? { d, n: c.n + 1 } : { d, n: 1 });
  }
  function todayCount() { const d = new Date().toISOString().slice(0, 10); const c = store.get('today', { d, n: 0 }); return c.d === d ? c.n : 0; }

  function setBusy(b) { const btn = $('submitBtn'); btn.disabled = b; btn.textContent = t(b ? 'submitting' : 'submit'); }

  $('form').addEventListener('submit', async e => {
    e.preventDefault(); hideMsg();
    const miss = validate();
    if (miss.length) { showMsg(t('err_required') + ' ' + miss.join(', '), 'err'); return; }
    savePrefs();
    const entry = buildEntry(); const photo = state.photo;
    setBusy(true);
    try {
      await sendEntry(entry, photo);
      showSuccess(t('success'), entry);
    } catch (err) {
      if (isCodeErr(err)) { store.del('entry_code'); showPinScreen(t('pin_changed')); }
      else if (err.message === 'NOT_CONFIGURED') { showMsg(t('not_configured') + ' — ' + RM.configProblem(), 'err'); }
      else if (isNetErr(err)) { await queueEntry(entry, photo); showSuccess(t('saved_offline'), entry); }
      else { showMsg(t('err_generic') + ' (' + (err.message || err) + ')', 'err'); }
    } finally { setBusy(false); }
  });

  function showSuccess(msg, entry) {
    const c = RM.catById(entry.category);
    $('successMsg').textContent = msg;
    $('successWhat').textContent = `${c.icon} ${RM.label(c)} — ${entry.place_name} (${entry.ps_name}, ${t('beat_no')} ${entry.beat_no})`;
    $('todayCount').textContent = todayCount();
    $('form').classList.add('hidden'); $('successView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('addAnother').addEventListener('click', () => {
    ['place_name', 'address', 'contact_person', 'contact_phone', 'remarks'].forEach(id => { $(id).value = ''; });
    state.cat = null; state.sens = 'normal'; state.lat = state.lng = state.acc = state.src = null; state.gps = 'none';
    if (marker) { map.removeLayer(marker); marker = null; }
    if (accCircle) { map.removeLayer(accCircle); accCircle = null; }
    clearPhoto(); renderCats(); renderSens(); renderGps(); hideMsg();
    $('successView').classList.add('hidden'); $('form').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------- offline queue ----------
  const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  function dataURLToBlob(u) {
    const [head, b64] = u.split(','); const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  async function queueEntry(entry, photo) {
    const q = store.get('pending', []);
    let ph = null; if (photo) { try { ph = await blobToDataURL(photo); } catch (e) { ph = null; } }
    q.push({ entry, photo: ph });
    if (!store.set('pending', q)) { q[q.length - 1].photo = null; store.set('pending', q); }
    renderPending();
  }
  function renderPending() {
    const n = store.get('pending', []).length;
    $('pendingCount').textContent = n; $('pendingBar').classList.toggle('hidden', n === 0);
  }
  async function syncPending(manual) {
    if (!sb || syncing || !getCode()) return;
    let q = store.get('pending', []); if (!q.length) return;
    syncing = true; $('syncBtn').disabled = true;
    try {
      while (q.length) {
        const item = q[0];
        try {
          await sendEntry(item.entry, item.photo ? dataURLToBlob(item.photo) : null);
        } catch (err) {
          if (isCodeErr(err)) { store.del('entry_code'); showPinScreen(t('pin_changed')); }
          else if (!isNetErr(err) && manual) { showMsg(t('err_generic') + ' (' + (err.message || err) + ')', 'err'); }
          break;
        }
        q = q.slice(1); store.set('pending', q); renderPending();
      }
      if (!q.length && manual) showMsg(t('sync_done'), 'ok');
    } finally { syncing = false; $('syncBtn').disabled = false; renderPending(); }
  }
  $('syncBtn').addEventListener('click', () => syncPending(true));
  window.addEventListener('online', () => syncPending(false));

  function showConfigProblem() {
    const p = RM.configProblem(); const w = $('configWarn');
    w.textContent = p ? '⚠️ ' + t('not_configured') + ' — ' + p : ''; w.classList.toggle('hidden', !p);
  }
  document.addEventListener('langchange', showConfigProblem);

  // ---------- init ----------
  function init() {
    RM.applyI18n(); renderLangBtn();
    $('districtName').textContent = cfg.DISTRICT_NAME || '';
    showConfigProblem();
    const p = store.get('prefs', {});
    ['staff_name', 'staff_mobile', 'beat_no', 'beat_name'].forEach(k => { if (p[k]) $(k).value = p[k]; });
    renderPS(); renderBeatPick(); renderCats(); renderSens(); renderGps(); renderPending();
    if (getCode()) showMain(); else showPinScreen();
    setTimeout(() => syncPending(false), 1500);
  }
  init();
})();
