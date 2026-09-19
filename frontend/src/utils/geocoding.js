import L from 'leaflet';

// 1. Comprehensive English & Malayalam Location Dictionary
const LOCATION_DICTIONARY = {
  // Malayalam Script Lookups
  "ആറ്റുകാൽ": [8.4728, 76.9535],        // Attukal
  "പൊങ്കാല": [8.4728, 76.9535],
  "ഗുരുവായൂർ": [10.5946, 76.0410],     // Guruvayur
  "ഗുരുവായൂര്": [10.5946, 76.0410],
  "ചോറ്റാനിക്കര": [9.9324, 76.3980],   // Chottanikkara
  "വയനാട്": [11.6854, 76.1320],        // Wayanad
  "മൂകാംബിക": [13.8644, 74.8142],      // Mookambika Kollur
  "നെല്ലിയാമ്പതി": [10.5358, 76.6936],  // Nelliyampathy
  "മൂന്നാർ": [10.0889, 77.0595],        // Munnar
  "ഇല്ലിക്കൽ": [9.7342, 76.8153],       // Illikkal Kallu
  "വണ്ടർലാ": [9.9818, 76.3579],        // Wonderla
  "തിരുവനന്തപുരം": [8.5241, 76.9366],
  "കോഴിക്കോട്": [11.2588, 75.7804],
  "പാലക്കാട്": [10.7867, 76.6548],

  // Kolkata Circular & Suburban Railway
  "majerhat": [22.5186, 88.3283],
  "b.b.d bag": [22.5714, 88.3456],
  "hasnabad": [22.5724, 88.9213],
  "naihati": [22.8911, 88.4215],
  "bimanbandar": [22.6531, 88.4451],
  "duttapukur": [22.7719, 88.5447],
  "habra": [22.8361, 88.6300],
  "ranaghat": [23.1812, 88.5815],
  "barrackpore": [22.7639, 88.3703],
  "sealdah": [22.5670, 88.3712],
  "howrah": [22.5838, 88.3426],
  "ghutiari shariff": [22.3214, 88.6251],

  // South Indian Tour & Transit Points
  "aatukal": [8.4728, 76.9535],
  "attukal": [8.4728, 76.9535],
  "guruvayoor": [10.5946, 76.0410],
  "chotanikkara": [9.9324, 76.3980],
  "wayanad": [11.6854, 76.1320],
  "mukambika": [13.8644, 74.8142],
  "wonderla": [9.9818, 76.3579],
  "nelliyampathy": [10.5358, 76.6936],
  "munnar": [10.0889, 77.0595],
  "illikkal": [9.7342, 76.8153],

  // Major International Airport Hubs
  "frankfurt": [50.1109, 8.6821],
  "milan": [45.4642, 9.1900],
  "london": [51.5074, -0.1278],
  "rome": [41.9028, 12.4964],
  "amsterdam": [52.3676, 4.9041],
  "moscow": [55.7558, 37.6173],
  "lisbon": [38.7223, -9.1393],
  "manchester": [53.4808, -2.2426],
  "stockholm": [59.3293, 18.0686]
};

const geocodeCache = new Map();

/**
 * Clean OCR text by removing noise, prices, brackets, and trip tags
 */
export function sanitizeStopName(rawName) {
  if (!rawName) return "";
  return String(rawName)
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[*#]/g, "")
    .replace(/\b(spl|express|exp|via|bus|fare|train|no|day|days|rs|inr)\b/gi, "")
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Multi-Tier Geocoder Engine
 */
export async function geocodeStop(rawStopName) {
  if (!rawStopName) return null;

  const cleanName = sanitizeStopName(rawStopName);
  const searchKey = cleanName.toLowerCase();

  if (searchKey.length < 2) return null;

  // Tier 1: Check Offline Dictionary
  for (const [key, coords] of Object.entries(LOCATION_DICTIONARY)) {
    if (cleanName.includes(key) || searchKey.includes(key)) {
      return { name: rawStopName, lat: coords[0], lng: coords[1], resolved: true };
    }
  }

  // Check Memory Cache
  if (geocodeCache.has(searchKey)) {
    return { name: rawStopName, ...geocodeCache.get(searchKey), resolved: true };
  }

  // Tier 2: Dynamic Search via OpenStreetMap Nominatim
  try {
    // Fixed URL interpolation from markdown artifact and added email to satisfy OSM strict policy
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanName)}&limit=1&email=hello@anavandi.app`;
    
    // We omit the User-Agent header in fetch to prevent CORS Preflight failure in browsers
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(searchKey, coords);
      return { name: rawStopName, ...coords, resolved: true };
    }
  } catch (err) {
    console.warn(`OSM Geocoding failed for '${cleanName}':`, err);
  }

  return { name: rawStopName, resolved: false };
}

/**
 * Sequential Geocoder with Linear Path Interpolation
 */
export async function resolveFullRouteGeometry(stopNames) {
  if (!stopNames || stopNames.length === 0) return [];

  const rawResults = [];

  // 1. Process stops sequentially with 1000ms buffer to respect OSM API limits (changed from 150ms to 1000ms)
  for (const name of stopNames) {
    const res = await geocodeStop(name);
    rawResults.push(res);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 2. Interpolate unresolved intermediate stops along vector paths
  const validStops = rawResults.filter(s => s && s.resolved);
  if (validStops.length === 0) return [];

  const firstValid = validStops[0];
  const lastValid = validStops[validStops.length - 1];

  for (let i = 0; i < rawResults.length; i++) {
    if (!rawResults[i] || !rawResults[i].resolved) {
      let prev = null;
      for (let j = i - 1; j >= 0; j--) {
        if (rawResults[j] && rawResults[j].resolved) { prev = rawResults[j]; break; }
      }

      let next = null;
      for (let j = i + 1; j < rawResults.length; j++) {
        if (rawResults[j] && rawResults[j].resolved) { next = rawResults[j]; break; }
      }

      const pAnchor = prev || firstValid;
      const nAnchor = next || lastValid || firstValid;

      rawResults[i] = {
        name: stopNames[i],
        lat: (pAnchor.lat + nAnchor.lat) / 2 + (Math.random() * 0.006 - 0.003),
        lng: (pAnchor.lng + nAnchor.lng) / 2 + (Math.random() * 0.006 - 0.003),
        resolved: true,
        interpolated: true
      };
    }
  }

  return rawResults;
}

/**
 * Generate Circular Numbered Badges (1, 2, 3...)
 */
export const createNumberedStopIcon = (stopNumber, isTerminal = false) => {
  const bgColor = isTerminal ? '#0C382B' : '#0F4D3A';
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: #FFFFFF;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(12, 56, 43, 0.4);
        font-family: system-ui, sans-serif;
      ">
        ${stopNumber}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};
