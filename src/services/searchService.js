// src/services/searchService.js

import Fuse from "fuse.js";
// טעינת קובץ התחנות
import stopsDataRaw from "../data/stops.json";
// טעינת קובץ נקודות העניין (POIs) - וודא שהקובץ הזה קיים בתיקייה data!
import poisDataRaw from "../data/poi.json";

let searchIndex = [];
let fuseEngine = null;

// מיפוי קוד קטגוריה לשם קריא (עבור נקודות העניין)
const categoryMap = {
  H: "בריאות",
  S: "קניות",
  E: "חינוך",
  G: "מוסד ציבורי",
  L: "פנאי",
  T: "תיירות",
  O: "כללי",
};

// --- 1. טעינת נתונים (תחנות + נקודות עניין) ---
export const loadStopsData = async () => {
  if (searchIndex.length > 0) return;

  try {
    console.log("Loading search data (Stops + POIs)...");

    // א. עיבוד תחנות
    const stops = stopsDataRaw.map((s) => ({
      name: s.n,
      code: s.c,
      lat: s.l,
      lon: s.o,
      desc: s.d || "",
      id: s.i,
      type: "STOP",
      // לתחנות אין "עיר" בפורמט הזה, אז נשאיר ריק או שנחלץ מהתיאור אם קיים
      subText: `תחנה ${s.c}`,
      city: "",
    }));

    // ב. עיבוד נקודות עניין (POI)
    // הנתונים החדשים: { n: name, l: lat, o: lon, c: category, a: address, ci: city }
    const pois = poisDataRaw.map((p) => {
      const catName = categoryMap[p.c] || "נקודת עניין";
      const cityName = p.ci || ""; // שליפת העיר מהקובץ החדש

      // יצירת תצוגה יפה: "קניות • ראשון לציון"
      const displaySubText = cityName ? `${catName} • ${cityName}` : catName;

      return {
        name: p.n,
        lat: p.l,
        lon: p.o,
        type: "POI",
        category: p.c,
        city: cityName, // שומרים את העיר לחיפוש
        subText: displaySubText, // מה שיוצג מתחת לשם בתוצאות
        address: p.a || "", // הכתובת המלאה (כולל רחוב)
      };
    });

    // איחוד הרשימות לרשימה אחת גדולה
    searchIndex = [...stops, ...pois];

    // הגדרת מנוע החיפוש
    fuseEngine = new Fuse(searchIndex, {
      // כאן הוספנו את "city" ו-"address" כדי שהחיפוש ימצא אותם
      keys: ["name", "code", "city", "address"],
      threshold: 0.3,
      limit: 20,
      distance: 100,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    console.log(
      `Loaded ${searchIndex.length} locations (${stops.length} stops, ${pois.length} POIs).`
    );
  } catch (error) {
    console.error("Error parsing data (Stops or POI json missing?):", error);
  }
};

// --- 2. חיפוש (אופליין מלא) ---
export const searchLocation = async (query) => {
  if (!query || query.length < 2) return [];

  const results = fuseEngine ? fuseEngine.search(query).map((r) => r.item) : [];
  return results;
};

// --- 3. יצירת GeoJSON למפה ---
let cachedGeoJson = null;

export const getStopsGeoJson = () => {
  if (searchIndex.length === 0) return null;
  if (cachedGeoJson) return cachedGeoJson;

  // מציגים רק תחנות על המפה כברירת מחדל
  const onlyStops = searchIndex.filter((item) => item.type === "STOP");

  cachedGeoJson = {
    type: "FeatureCollection",
    features: onlyStops.map((stop) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
      properties: { name: stop.name, code: stop.code, id: stop.id },
    })),
  };

  return cachedGeoJson;
};

// --- 4. ניהול מועדפים ---
const FAV_KEY = "transit_favorites";

export const getFavorites = () => {
  try {
    const data = localStorage.getItem(FAV_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const addFavorite = (location) => {
  const favs = getFavorites();
  if (favs.find((f) => f.name === location.name)) return favs;

  const newFavs = [...favs, { ...location, type: "FAVORITE" }];
  localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));
  return newFavs;
};

export const removeFavorite = (location) => {
  const favs = getFavorites();
  const newFavs = favs.filter((f) => f.name !== location.name);
  localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));
  return newFavs;
};
