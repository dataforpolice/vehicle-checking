// =====================================================================
//  वाहन जाँच — SETTINGS FOR THE WEBSITE
//  After deploying the Apps Script, paste its Web app URL (ending in /exec) below.
//  ⚠ Do NOT put PINs or any personal data in this file – it is public on GitHub.
// =====================================================================
window.VJ = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx7velMliXRhcfBsZ89BTE2bv3TFhWCpuqK1XfFf3o2ZVC-1-zGvzzp1uj0tULcIPgijg/exec',

  TITLE_HI: 'वाहन जाँच',
  TITLE_EN: 'Vehicle Checking',
  ORG_HI: '',            // optional second line, e.g. 'ज़िला पुलिस करनाल'
  ORG_EN: '',            // e.g. 'District Police Karnal'

  // Dashboard: checks made within this many metres of each other (by GPS) are counted as ONE naka,
  // even if staff typed the naka name differently. 50 suits most nakas; use 100 for a big junction.
  CLUB_METERS: 50
  NAKA_ALIASES: {
    'Highway traffic ps': ['Ps highway karnal'],
  }
};
