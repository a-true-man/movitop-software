import Fuse from "fuse.js";
// אנו מייבאים את הקובץ שיצרנו בסקריפט האוטומטי
// וודא שהקובץ קיים בנתיב הזה (src/data/stops.json)
import stopsDataRaw from "../data/stops.json";

let stopsIndex = [];
let fuseEngine = null;

// --- 1. טעינת נתונים (מהירה) ---
export const loadStopsData = async () => {
  if (stopsIndex.length > 0) return;

  try {
    console.log("Loading stops from JSON...");

    // המרת הנתונים המקוצרים (Minified) למבנה נוח לעבודה
    // הסקריפט שלנו שמר אותם כ: n=name, c=code, l=lat, o=lon, i=id
    stopsIndex = stopsDataRaw.map((s) => ({
      name: s.n,
      code: s.c,
      lat: s.l,
      lon: s.o,
      desc: s.d || "",
      id: s.i,
      type: "STOP",
    }));

    // הגדרת מנוע החיפוש
    fuseEngine = new Fuse(stopsIndex, {
      keys: ["name", "code"], // חפש לפי שם או מק"ט
      threshold: 0.3, // גמישות בחיפוש (0 = מדויק, 1 = כל דבר)
      limit: 20, // מקסימום תוצאות
      distance: 100, // העדפה לתוצאות קרובות לתחילת המחרוזת
    });

    console.log(`Loaded ${stopsIndex.length} stops successfully.`);
  } catch (error) {
    console.error("Error parsing stops JSON:", error);
  }
};

// --- 2. חיפוש משולב (תחנות + רחובות) ---
export const searchLocation = async (query) => {
  if (!query || query.length < 2) return [];

  // א. חיפוש תחנות (אופליין - מהיר מאוד)
  const stopResults = fuseEngine
    ? fuseEngine.search(query).map((r) => r.item)
    : [];

  // ב. חיפוש רחובות (Nominatim - דורש אינטרנט, אבל חינמי ועובד מעולה)
  // אם אתה רוצה 100% אופליין, תמחק את החלק הזה, אבל אז לא תוכל לחפש כתובות כמו "דיזנגוף 50"
  let addressResults = [];
  try {
    // נחפש רחובות רק אם יש אינטרנט
    if (navigator.onLine) {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=il&limit=3`;
      const res = await fetch(url);
      const data = await res.json();

      addressResults = data.map((item) => ({
        name: item.display_name, // שם הכתובת המלא
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: "ADDRESS",
        id: item.place_id,
      }));
    }
  } catch (e) {
    console.warn("Address search failed (offline?)", e);
  }

  // איחוד תוצאות: קודם כתובות, אחר כך תחנות
  return [...addressResults, ...stopResults];
};

// --- 3. יצירת GeoJSON למפה ---
let cachedGeoJson = null;

export const getStopsGeoJson = () => {
  if (stopsIndex.length === 0) return null;
  if (cachedGeoJson) return cachedGeoJson;

  cachedGeoJson = {
    type: "FeatureCollection",
    features: stopsIndex.map((stop) => ({
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
  // מניעת כפילויות
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
