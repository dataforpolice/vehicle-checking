# 🚔 वाहन जाँच — Vehicle Checking (GitHub Pages)

A naka (checkpoint) app for police staff plus a supervisor dashboard.
**This repository contains only the website's code — no data.** All checks and photos are saved in a private
Google Sheet / Google Drive belonging to the owner, through a small Google Apps Script "server".

| Page | Who uses it | Address |
|---|---|---|
| Field app | Naka staff (phone) | `https://<your-username>.github.io/<repo-name>/` |
| Dashboard | Supervisors | `https://<your-username>.github.io/<repo-name>/dashboard.html` |

---

## Setup (one time, about 20 minutes, on a computer)

### Part A — Google: the private data server
1. Use a **separate Gmail account** for this system (recommended).
2. Go to **sheets.google.com** → **Blank spreadsheet** → name it **Vahan Janch Data**.
3. **Extensions → Apps Script**. Delete everything in `Code.gs`, paste the full contents of **`Code.gs`**
   (from the `apps-script` folder of the download), and **Save**.
4. At the top of `Code.gs` fill in the settings:
   - `STAFF_PIN` — PIN for naka staff, **6 digits or more** (e.g. `'482913'`)
   - `SUPERVISOR_PIN` — a **different** PIN for supervisors
   - `ALERT_EMAILS` — email(s) for instant 🚨 watchlist alerts (optional)
   - `REPORT_EMAILS` — email(s) for the daily summary (optional)
   - `PHOTO_KEEP_DAYS` — photos older than this are deleted automatically to save space (default 180)
   - **Save**.
5. ⚙ **Project Settings** → Time zone **(GMT+05:30) India Standard Time**.
6. Go back to the Sheet, **reload it**, then menu **🚔 वाहन जाँच → ⚙ पहली बार सेटअप करें** → **Allow** when asked.
7. In Apps Script: **Deploy → New deployment** → ⚙ **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → **Allow** → **Copy** the **Web app URL** (ends with `/exec`).

### Part B — GitHub: the website
1. Create a free account at **github.com**.
2. **+ → New repository** → name e.g. **`vahan-janch`** → **Public** → **Create**.
   (Public is required for free GitHub Pages. Only code is public — never upload any data.)
3. **Add file → Upload files** → upload everything from the `site` folder
   (`index.html`, `dashboard.html`, `config.js`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`, `README.md`) → **Commit changes**.
4. Open **`config.js`** in GitHub → ✏️ edit → paste your Web app URL in place of
   `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` (keep the quotes) → optionally set `ORG_HI` / `ORG_EN` → **Commit changes**.
5. **Settings → Pages** → Source: **Deploy from a branch** → Branch **main** / **(root)** → **Save**.
6. After 1–2 minutes your site is live at `https://<your-username>.github.io/vahan-janch/`.

### Part C — Staff phones
1. Open the field-app link in **Chrome** → **⋮ → Add to Home screen** (works like an app, opens even without signal).
2. First time: enter the **staff PIN**, **your name / belt no.** and **naka name** → **Save**.
3. Supervisors open `…/dashboard.html` and enter the **supervisor PIN**.

---

## How it works at the naka
1. Type the **vehicle number** → the **past record appears instantly**: when and where it was last checked,
   driver, result, and the earlier photo (👁). 🚨 Watchlist vehicles show a red alert and the phone vibrates.
2. Tap the **vehicle type**, take **one photo** of the driver with the vehicle (compressed to about 40–70 KB).
3. Enter the **driver's name** (mobile optional), tap the **result** (OK / Challan / Warning / Seized / Further check) → **Submit**.
4. **No signal?** The check is saved on the phone and sent automatically when the network returns (⏳ badge shows pending).

## Supervisor dashboard
Hindi/English · period, point, time/shift, result, vehicle type, officer, state, status filters · vehicles checked
point-wise · charts · map · full list with photos · copy / WhatsApp / CSV summary · **add or remove watchlist entries** ·
Google Drive storage meter.

## Updating later
- **Server code changed:** paste the new `Code.gs` → **Deploy → Manage deployments → ✏️ → New version → Deploy** (URL stays the same).
- **Website changed:** edit or upload the file on GitHub; phones get it the next time they open the app online.
  For a guaranteed refresh, change `vahan-janch-v1` to `-v2` in `sw.js`.

## Storage
One check ≈ 50 KB. The free 15 GB holds roughly **250,000 checks with photos**. Old photos are removed after
`PHOTO_KEEP_DAYS` (the record stays). Deleted photos sit in Drive's Trash for 30 days, then disappear.

## Security
- PINs live **only** in `Code.gs` (Google), never in this repository.
- Use 6+ digit PINs and change them if a phone is lost.
- The data (names, mobiles, photos) stays in the owner's Google account. Do not share the Sheet or Drive folder widely.
- For an official, state-wide rollout, move hosting to NIC / State Data Centre with individual officer logins and a security audit.

## Troubleshooting
| Problem | Fix |
|---|---|
| "config.js में API_URL नहीं डाला गया" | Paste the `/exec` URL into `config.js` on GitHub |
| "सर्वर में PIN सेट नहीं" | Fill `STAFF_PIN` and `SUPERVISOR_PIN` in Code.gs → Save → Deploy new version |
| "PIN गलत है" | Check the PIN; the dashboard needs the **supervisor** PIN |
| Changes in Code.gs not working | Deploy → Manage deployments → ✏️ → **New version** → Deploy |
| Site shows 404 | Settings → Pages must be on branch **main**, folder **/(root)**; wait 2 minutes |
| No location | Turn on GPS and allow location for the site in Chrome |
