/* Shared helpers: categories, Hindi/English text, storage, Supabase client */
(function () {
  'use strict';
  const cfg = window.APP_CONFIG || {};

  const CATEGORIES = [
    { id: 'atm',            en: 'ATM',                   hi: 'एटीएम',                 icon: '🏧', color: '#2563eb' },
    { id: 'bank',           en: 'Bank',                  hi: 'बैंक',                   icon: '🏦', color: '#1e40af' },
    { id: 'school',         en: 'School / College',      hi: 'स्कूल / कॉलेज',          icon: '🏫', color: '#16a34a' },
    { id: 'bus_stand',      en: 'Bus Stand',             hi: 'बस स्टैंड',               icon: '🚌', color: '#0891b2' },
    { id: 'railway',        en: 'Railway Station',       hi: 'रेलवे स्टेशन',            icon: '🚉', color: '#0e7490' },
    { id: 'temple',         en: 'Temple',                hi: 'मंदिर',                  icon: '🛕', color: '#ea580c' },
    { id: 'mosque',         en: 'Mosque / Dargah',       hi: 'मस्जिद / दरगाह',          icon: '🕌', color: '#047857' },
    { id: 'church',         en: 'Church',                hi: 'चर्च',                   icon: '⛪', color: '#7c3aed' },
    { id: 'gurudwara',      en: 'Gurudwara',             hi: 'गुरुद्वारा',              icon: '🙏', color: '#d97706' },
    { id: 'hospital',       en: 'Hospital / Clinic',     hi: 'अस्पताल / क्लिनिक',        icon: '🏥', color: '#db2777' },
    { id: 'petrol_pump',    en: 'Petrol Pump',           hi: 'पेट्रोल पंप',             icon: '⛽', color: '#65a30d' },
    { id: 'market',         en: 'Market / Mall',         hi: 'बाज़ार / मॉल',            icon: '🛒', color: '#ca8a04' },
    { id: 'jewellery',      en: 'Jewellery Shop',        hi: 'ज्वेलरी दुकान',           icon: '💍', color: '#a16207' },
    { id: 'hotel',          en: 'Hotel / Lodge / Dhaba', hi: 'होटल / लॉज / ढाबा',       icon: '🏨', color: '#9333ea' },
    { id: 'liquor',         en: 'Liquor Shop',           hi: 'शराब दुकान',             icon: '🍾', color: '#78350f' },
    { id: 'govt_office',    en: 'Govt. Office',          hi: 'सरकारी कार्यालय',         icon: '🏛️', color: '#475569' },
    { id: 'cctv',           en: 'CCTV Camera',           hi: 'सीसीटीवी कैमरा',          icon: '📹', color: '#334155' },
    { id: 'crime_hotspot',  en: 'Crime Hotspot',         hi: 'अपराध हॉटस्पॉट',          icon: '🚨', color: '#dc2626' },
    { id: 'sensitive_area', en: 'Sensitive Area',        hi: 'संवेदनशील क्षेत्र',        icon: '⚠️', color: '#b91c1c' },
    { id: 'accident_spot',  en: 'Accident Black Spot',   hi: 'दुर्घटना संभावित स्थान',   icon: '💥', color: '#9f1239' },
    { id: 'other',          en: 'Other',                 hi: 'अन्य',                   icon: '📍', color: '#6b7280' }
  ];

  const SENSITIVITY = [
    { id: 'normal', en: 'Normal', hi: 'सामान्य',       color: '#16a34a' },
    { id: 'medium', en: 'Medium', hi: 'मध्यम',          color: '#f59e0b' },
    { id: 'high',   en: 'High',   hi: 'अति संवेदनशील', color: '#dc2626' }
  ];

  const S = {
    // ---------- common ----------
    app_title:      { en: 'Beat Resource Mapping', hi: 'बीट संसाधन मानचित्रण' },
    not_configured: { en: 'App is not set up yet. Fill SUPABASE_URL and key in config.js.', hi: 'ऐप अभी सेट नहीं है। config.js में SUPABASE_URL और key भरें।' },
    lang_switch:    { en: 'हिंदी', hi: 'English' },

    // ---------- staff form ----------
    help_title:   { en: 'How to fill? (tap to read)', hi: 'कैसे भरें? (पढ़ने के लिए टैप करें)' },
    help_1:       { en: 'Go and stand at the place (ATM, school, temple etc.).', hi: 'उस स्थान (एटीएम, स्कूल, मंदिर आदि) पर जाकर खड़े हों।' },
    help_2:       { en: 'Select Police Station, Beat and type of place.', hi: 'थाना, बीट और स्थान का प्रकार चुनें।' },
    help_3:       { en: 'Press "Get my location" and wait till the pin appears on map.', hi: '"मेरी लोकेशन लें" दबाएँ और नक्शे पर पिन आने तक रुकें।' },
    help_4:       { en: 'Take a photo if possible, then press Submit.', hi: 'हो सके तो फोटो लें, फिर "जमा करें" दबाएँ।' },
    help_5:       { en: 'No internet? Don\'t worry – entry is saved on phone and sent later.', hi: 'इंटरनेट नहीं है? चिंता न करें – एंट्री फोन में सेव होकर बाद में चली जाएगी।' },

    sec_staff:    { en: '1. Your details', hi: '1. आपकी जानकारी' },
    staff_name:   { en: 'Name & Rank', hi: 'नाम व पद' },
    staff_name_ph:{ en: 'e.g. HC Ramesh Kumar', hi: 'जैसे – प्र.आ. रमेश कुमार' },
    staff_mobile: { en: 'Mobile / Belt No.', hi: 'मोबाइल / बेल्ट नंबर' },

    sec_beat:     { en: '2. Police Station & Beat', hi: '2. थाना व बीट' },
    ps:           { en: 'Police Station', hi: 'थाना' },
    select_ps:    { en: '-- Select Police Station --', hi: '-- थाना चुनें --' },
    select_beat:  { en: '-- Select Beat --', hi: '-- बीट चुनें --' },
    beat_other:   { en: 'Other / not in list', hi: 'अन्य / सूची में नहीं' },
    beat_no:      { en: 'Beat No.', hi: 'बीट नंबर' },
    beat_name:    { en: 'Beat Name', hi: 'बीट का नाम' },

    sec_cat:      { en: '3. What is this place?', hi: '3. यह स्थान क्या है?' },

    sec_details:  { en: '4. Place details', hi: '4. स्थान का विवरण' },
    place_name:   { en: 'Name of place', hi: 'स्थान का नाम' },
    place_name_ph:{ en: 'e.g. SBI ATM, Govt. Girls School', hi: 'जैसे – SBI एटीएम, शासकीय कन्या शाला' },
    address:      { en: 'Address / Landmark', hi: 'पता / पहचान चिन्ह' },
    address_ph:   { en: 'Near water tank, main road', hi: 'पानी की टंकी के पास, मुख्य सड़क' },
    contact_person:{ en: 'Contact person (owner / manager / priest)', hi: 'संपर्क व्यक्ति (मालिक / प्रबंधक / पुजारी)' },
    contact_phone:{ en: 'Contact phone', hi: 'संपर्क फोन' },
    sensitivity:  { en: 'Sensitivity', hi: 'संवेदनशीलता' },
    remarks:      { en: 'Remarks', hi: 'टिप्पणी' },
    remarks_ph:   { en: 'CCTV? Guard? Past incident? Crowd timings?', hi: 'सीसीटीवी है? गार्ड है? कोई पुरानी घटना? भीड़ का समय?' },

    sec_loc:      { en: '5. Location (stand at the place)', hi: '5. लोकेशन (स्थान पर खड़े होकर लें)' },
    get_gps:      { en: '📍 Get my location', hi: '📍 मेरी लोकेशन लें' },
    pick_map:     { en: '🗺️ Mark on map', hi: '🗺️ नक्शे पर चिन्हित करें' },
    gps_wait:     { en: 'Getting location… please wait 10–15 seconds', hi: 'लोकेशन ली जा रही है… 10–15 सेकंड रुकें' },
    gps_ok:       { en: 'Location captured', hi: 'लोकेशन मिल गई' },
    gps_manual:   { en: 'Location marked on map', hi: 'लोकेशन नक्शे पर चिन्हित' },
    accuracy:     { en: 'Accuracy', hi: 'सटीकता' },
    meters:       { en: 'm', hi: 'मीटर' },
    gps_weak:     { en: 'Weak GPS – go in open area and press again, or drag pin.', hi: 'GPS कमज़ोर है – खुले में जाकर फिर दबाएँ, या पिन खिसकाएँ।' },
    gps_tip:      { en: 'If pin is wrong, drag it or tap the correct spot on map.', hi: 'पिन गलत हो तो उसे खिसकाएँ या नक्शे पर सही जगह टैप करें।' },
    gps_err:      { en: 'Could not get location. Turn ON phone Location/GPS, allow permission and try again. Or use "Mark on map".', hi: 'लोकेशन नहीं मिली। फोन की Location/GPS चालू करें, अनुमति (Allow) दें और फिर प्रयास करें। या "नक्शे पर चिन्हित करें" दबाएँ।' },
    gps_none:     { en: 'Location not taken yet', hi: 'अभी लोकेशन नहीं ली गई' },

    sec_photo:    { en: '6. Photo (optional)', hi: '6. फोटो (वैकल्पिक)' },
    take_photo:   { en: '📷 Take / choose photo', hi: '📷 फोटो लें / चुनें' },
    remove_photo: { en: 'Remove', hi: 'हटाएँ' },

    pin_title:    { en: 'Enter PIN', hi: 'पिन डालें' },
    pin_sub:      { en: 'Enter the PIN given by your office. You need to enter it only once on this phone.', hi: 'कार्यालय द्वारा दिया गया पिन डालें। इस फोन पर केवल एक बार डालना होगा।' },
    pin_open:     { en: 'Open form →', hi: 'फॉर्म खोलें →' },
    pin_checking: { en: 'Checking…', hi: 'जाँच हो रही है…' },
    pin_wrong:    { en: 'Wrong PIN. Ask your office for the correct PIN.', hi: 'पिन गलत है। सही पिन कार्यालय से लें।' },
    pin_changed:  { en: 'PIN has been changed by office. Enter the new PIN, then press Submit again.', hi: 'कार्यालय ने पिन बदल दिया है। नया पिन डालें, फिर दोबारा "जमा करें" दबाएँ।' },
    pin_empty:    { en: 'Please type the PIN.', hi: 'कृपया पिन लिखें।' },
    lock:         { en: '🔒 Change PIN / lock', hi: '🔒 पिन बदलें / लॉक करें' },
    staff_pin:    { en: '🔑 Staff PIN', hi: '🔑 स्टाफ पिन' },
    pin_prompt:   { en: 'Current staff PIN is shown below. Type a new PIN (at least 4 characters) and press OK:', hi: 'नीचे वर्तमान स्टाफ पिन है। नया पिन (कम से कम 4 अंक) लिखें और OK दबाएँ:' },
    pin_saved:    { en: 'Staff PIN changed. Tell your staff the new PIN.', hi: 'स्टाफ पिन बदल दिया गया। स्टाफ को नया पिन बताएँ।' },
    pin_short:    { en: 'PIN must be at least 4 characters.', hi: 'पिन कम से कम 4 अंक का होना चाहिए।' },
    submit:       { en: '✅ Submit', hi: '✅ जमा करें' },
    submitting:   { en: 'Submitting…', hi: 'जमा हो रहा है…' },
    success:      { en: 'Saved successfully! Thank you.', hi: 'सफलतापूर्वक जमा हो गया! धन्यवाद।' },
    saved_offline:{ en: 'No internet. Entry is saved in phone and will be sent automatically when internet comes.', hi: 'इंटरनेट नहीं है। एंट्री फोन में सेव है, इंटरनेट आने पर अपने-आप भेज दी जाएगी।' },
    add_another:  { en: '➕ Add next place', hi: '➕ अगला स्थान जोड़ें' },
    pending:      { en: 'entries saved in phone, not yet sent', hi: 'एंट्री फोन में सेव हैं, अभी भेजी नहीं गईं' },
    sync_now:     { en: 'Send now', hi: 'अभी भेजें' },
    sync_done:    { en: 'All saved entries have been sent.', hi: 'सभी सेव एंट्री भेज दी गईं।' },
    err_required: { en: 'Please fill:', hi: 'कृपया भरें:' },
    err_location: { en: 'Location', hi: 'लोकेशन' },
    err_category: { en: 'Type of place', hi: 'स्थान का प्रकार' },
    err_generic:  { en: 'Could not save. Please try again.', hi: 'जमा नहीं हुआ। कृपया फिर प्रयास करें।' },
    today_count:  { en: 'Entries sent from this phone today:', hi: 'आज इस फोन से भेजी गई एंट्री:' },

    // ---------- dashboard ----------
    dash_title:   { en: 'Resource Mapping Dashboard', hi: 'संसाधन मानचित्रण डैशबोर्ड' },
    login_title:  { en: 'Officer Login', hi: 'अधिकारी लॉगिन' },
    email:        { en: 'Email', hi: 'ईमेल' },
    password:     { en: 'Password', hi: 'पासवर्ड' },
    login:        { en: 'Login', hi: 'लॉगिन' },
    logout:       { en: 'Logout', hi: 'लॉगआउट' },
    login_err:    { en: 'Wrong email or password.', hi: 'ईमेल या पासवर्ड गलत है।' },
    not_officer:  { en: 'This email is not in the officers list. Add it to the "officers" table in Supabase.', hi: 'यह ईमेल अधिकारी सूची में नहीं है। Supabase की "officers" तालिका में जोड़ें।' },
    all_ps:       { en: 'All Police Stations', hi: 'सभी थाने' },
    all_beats:    { en: 'All Beats', hi: 'सभी बीट' },
    all_cats:     { en: 'All Categories', hi: 'सभी श्रेणियाँ' },
    all_sens:     { en: 'All Sensitivity', hi: 'सभी संवेदनशीलता' },
    date_from:    { en: 'From', hi: 'से' },
    date_to:      { en: 'To', hi: 'तक' },
    search_ph:    { en: 'Search name, address, staff…', hi: 'नाम, पता, कर्मचारी खोजें…' },
    refresh:      { en: '⟳ Refresh', hi: '⟳ रिफ्रेश' },
    export_csv:   { en: '⬇ Excel / CSV', hi: '⬇ एक्सेल / CSV' },
    clear:        { en: 'Clear filters', hi: 'फ़िल्टर हटाएँ' },
    total:        { en: 'Total', hi: 'कुल' },
    high_sens:    { en: 'Highly sensitive', hi: 'अति संवेदनशील' },
    ps_count:     { en: 'Police Stations', hi: 'थाने' },
    beat_count:   { en: 'Beats', hi: 'बीट' },
    summary_title:{ en: 'PS / Beat-wise summary', hi: 'थाना / बीट वार सारांश' },
    records_title:{ en: 'Entries', hi: 'एंट्री' },
    col_date:     { en: 'Date', hi: 'दिनांक' },
    col_cat:      { en: 'Category', hi: 'श्रेणी' },
    col_name:     { en: 'Place', hi: 'स्थान' },
    col_ps:       { en: 'PS', hi: 'थाना' },
    col_beat:     { en: 'Beat', hi: 'बीट' },
    col_staff:    { en: 'Entered by', hi: 'दर्ज करने वाला' },
    col_sens:     { en: 'Sensitivity', hi: 'संवेदनशीलता' },
    col_items:    { en: 'Resources', hi: 'संसाधन' },
    view_photo:   { en: '📷 Photo', hi: '📷 फोटो' },
    open_gmaps:   { en: 'Google Maps', hi: 'गूगल मैप' },
    verify:       { en: '✓ Mark verified', hi: '✓ सत्यापित करें' },
    unverify:     { en: 'Un-verify', hi: 'सत्यापन हटाएँ' },
    verified:     { en: 'Verified', hi: 'सत्यापित' },
    delete:       { en: '🗑 Delete', hi: '🗑 हटाएँ' },
    confirm_delete:{ en: 'Delete this entry permanently?', hi: 'यह एंट्री हमेशा के लिए हटाएँ?' },
    loading:      { en: 'Loading…', hi: 'लोड हो रहा है…' },
    no_data:      { en: 'No entries found.', hi: 'कोई एंट्री नहीं मिली।' },
    showing_first:{ en: 'Showing first 500 rows. Use Excel/CSV download for all.', hi: 'पहली 500 पंक्तियाँ दिख रही हैं। सभी के लिए एक्सेल/CSV डाउनलोड करें।' },
    layer_street: { en: 'Street map', hi: 'सड़क नक्शा' },
    layer_sat:    { en: 'Satellite', hi: 'सैटेलाइट' },
    contact:      { en: 'Contact', hi: 'संपर्क' },
    gps_label:    { en: 'GPS', hi: 'GPS' },
    staff_link:   { en: 'Staff link', hi: 'स्टाफ लिंक' }
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('rm_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rm_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('rm_' + k); } catch (e) { /* ignore */ } }
  };

  let lang = store.get('lang', 'hi');

  function t(key) { const s = S[key]; return s ? (s[lang] || s.en) : key; }
  function label(obj) { return obj ? (obj[lang] || obj.en) : ''; }
  function otherLabel(obj) { return obj ? (lang === 'hi' ? obj.en : obj.hi) : ''; }

  function applyI18n(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.documentElement.lang = lang;
  }
  function setLang(l) {
    lang = l; store.set('lang', l); applyI18n();
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  function catById(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]; }
  function sensById(id) { return SENSITIVITY.find(s => s.id === id) || SENSITIVITY[0]; }

  function isConfigured() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
      !cfg.SUPABASE_URL.includes('YOUR-PROJECT') && !cfg.SUPABASE_ANON_KEY.includes('YOUR-'));
  }
  // Exact reason why the app is not ready (shown on screen to help setup)
  function configProblem() {
    const H = (en, hi) => (lang === 'hi' ? hi : en);
    if (!window.APP_CONFIG) return H(
      'config.js did not load or has a typo (missing quote " or comma ,). Open config.js on GitHub and compare with the sample.',
      'config.js लोड नहीं हुई या उसमें टाइपिंग की गलती है (कोई " या , छूट गया है)। GitHub पर config.js खोलकर नमूने से मिलाएँ।');
    const url = String(cfg.SUPABASE_URL || '').trim(), key = String(cfg.SUPABASE_ANON_KEY || '').trim();
    if (!url || url.includes('YOUR-PROJECT')) return H(
      'SUPABASE_URL is still the sample value. Paste your Project URL (https://xxxx.supabase.co) in config.js.',
      'SUPABASE_URL अभी भी नमूने वाला है। config.js में अपना Project URL (https://xxxx.supabase.co) डालें।');
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return H(
      'SUPABASE_URL looks wrong: "' + url + '". It must be exactly like https://abcdxyz.supabase.co (nothing after .co).',
      'SUPABASE_URL गलत लग रहा है: "' + url + '"। यह बिल्कुल https://abcdxyz.supabase.co जैसा होना चाहिए (.co के बाद कुछ नहीं)।');
    if (!key || key.includes('YOUR-')) return H(
      'SUPABASE_ANON_KEY is still the sample value. Paste the anon / publishable key in config.js.',
      'SUPABASE_ANON_KEY अभी भी नमूने वाली है। config.js में anon / publishable key डालें।');
    if (/^sb_secret_/.test(key) || /service_role/.test(atobSafe(key.split('.')[1]))) return H(
      'You pasted the SECRET / service_role key. Never use it here! Use the anon / publishable key instead.',
      'आपने SECRET / service_role key डाल दी है। इसे यहाँ कभी न डालें! इसकी जगह anon / publishable key डालें।');
    if (!window.supabase) return H(
      'Supabase library could not load. Check internet and reload the page.',
      'Supabase लाइब्रेरी लोड नहीं हुई। इंटरनेट जाँचें और पेज रीलोड करें।');
    return '';
  }
  function atobSafe(s) { try { return atob((s || '').replace(/-/g, '+').replace(/_/g, '/')); } catch (e) { return ''; } }

  function getClient(opts) {
    if (configProblem()) return null;
    return window.supabase.createClient(String(cfg.SUPABASE_URL).trim().replace(/\/$/, ''), String(cfg.SUPABASE_ANON_KEY).trim(), opts || {});
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.RM = {
    cfg, CATEGORIES, SENSITIVITY, store, t, label, otherLabel, applyI18n, setLang,
    catById, sensById, getClient, isConfigured, configProblem, esc,
    get lang() { return lang; }
  };
})();
