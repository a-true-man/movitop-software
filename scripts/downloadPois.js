const axios = require("axios");
const fs = require("fs");
const path = require("path");

// פונקציית עזר לחישוב מרחק (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // מטרים
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// שאילתה 1: נקודות עניין
const queryPOIs = `
[out:json][timeout:120];
(
  node["amenity"~"hospital|clinic|pharmacy|school|university|college|police|post_office|townhall|bank"](29.3,34.0,33.5,35.9);
  way["amenity"~"hospital|clinic|pharmacy|school|university|college|police|post_office|townhall|bank"](29.3,34.0,33.5,35.9);
  node["shop"~"supermarket|mall|department_store"](29.3,34.0,33.5,35.9);
  way["shop"~"supermarket|mall|department_store"](29.3,34.0,33.5,35.9);
  node["leisure"~"park|sports_centre"](29.3,34.0,33.5,35.9);
  way["leisure"~"park|sports_centre"](29.3,34.0,33.5,35.9);
  node["tourism"~"attraction|museum|hotel"](29.3,34.0,33.5,35.9);
  way["tourism"~"attraction|museum|hotel"](29.3,34.0,33.5,35.9);
);
out center;
`;

// שאילתה 2: רחובות ראשיים ומשניים בישראל
const queryStreets = `
[out:json][timeout:120];
way["highway"]["name"](29.3,34.0,33.5,35.9);
out geom;
`;

// שאילתה 3: רשימת כל היישובים (ערים, כפרים, מושבים)
// זה יאפשר לנו למצוא את העיר הקרובה ביותר אם אין תגית עיר
const queryPlaces = `
[out:json][timeout:60];
node["place"~"city|town|village|hamlet|kibbutz|moshav"](29.3,34.0,33.5,35.9);
out body;
`;

const getCategory = (tags) => {
  if (tags.amenity) {
    if (["hospital", "clinic", "pharmacy"].includes(tags.amenity)) return "H";
    if (["school", "university", "college"].includes(tags.amenity)) return "E";
    if (["police", "post_office", "townhall", "bank"].includes(tags.amenity))
      return "G";
  }
  if (tags.shop) return "S";
  if (tags.leisure) return "L";
  if (tags.tourism) return "T";
  return "O";
};

const run = async () => {
  try {
    // 1. הורדת POIs
    console.log("1. Downloading POIs...");
    const resPois = await axios.post(
      "https://overpass-api.de/api/interpreter",
      queryPOIs
    );
    const rawPois = resPois.data.elements;
    console.log(`   Fetched ${rawPois.length} POIs.`);

    // 2. הורדת רחובות
    console.log("2. Downloading Streets map...");
    const resStreets = await axios.post(
      "https://overpass-api.de/api/interpreter",
      queryStreets
    );
    const rawStreets = resStreets.data.elements;
    console.log(`   Fetched ${rawStreets.length} street segments.`);

    // 3. הורדת יישובים
    console.log("3. Downloading Cities/Towns data...");
    const resPlaces = await axios.post(
      "https://overpass-api.de/api/interpreter",
      queryPlaces
    );
    const rawPlaces = resPlaces.data.elements.map((p) => ({
      name: p.tags["name:he"] || p.tags.name,
      lat: p.lat,
      lon: p.lon,
    }));
    console.log(`   Fetched ${rawPlaces.length} places.`);

    // ארגון הרחובות במבנה נתונים יעיל (Grid)
    const streetGrid = {};
    const gridSize = 0.01;

    rawStreets.forEach((street) => {
      const lat = street.geometry[0].lat;
      const lon = street.geometry[0].lon;
      const key = `${Math.floor(lat / gridSize)}_${Math.floor(lon / gridSize)}`;

      if (!streetGrid[key]) streetGrid[key] = [];
      streetGrid[key].push({
        name: street.tags["name:he"] || street.tags.name,
        points: street.geometry,
      });
    });

    console.log("4. Processing: Matching streets and finding cities...");
    const cleanedData = [];
    let matchedStreetCount = 0;
    let matchedCityCount = 0;

    rawPois.forEach((el) => {
      const name = el.tags["name:he"] || el.tags.name;
      if (!name) return;

      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) return;

      const category = getCategory(el.tags);

      // --- שלב א: זיהוי עיר ---
      let city = el.tags["addr:city"] || el.tags["city:he"];

      if (!city) {
        // אם אין עיר מוגדרת, מחפשים את היישוב הקרוב ביותר
        let minDist = 100000; // מרחק גדול מאוד להתחלה
        let closestPlace = null;

        // עוברים על כל היישובים (בישראל יש כ-1200, זה חישוב מהיר מאוד למחשב)
        for (const place of rawPlaces) {
          const d = getDistance(lat, lon, place.lat, place.lon);
          if (d < minDist) {
            minDist = d;
            closestPlace = place.name;
          }
        }

        // אם מצאנו יישוב ברדיוס סביר (נניח 10 ק"מ, כדי לכסות אזורי תעשייה מבודדים)
        if (closestPlace && minDist < 10000) {
          city = closestPlace;
          matchedCityCount++;
        }
      }

      // --- שלב ב: זיהוי רחוב ---
      let street = el.tags["addr:street"] || el.tags["street:he"];
      const houseNum = el.tags["addr:housenumber"];

      if (!street) {
        const gridKey = `${Math.floor(lat / gridSize)}_${Math.floor(
          lon / gridSize
        )}`;
        const candidates = [];
        [0, 1, -1].forEach((dLat) => {
          [0, 1, -1].forEach((dLon) => {
            const neighborKey = `${Math.floor(lat / gridSize) + dLat}_${
              Math.floor(lon / gridSize) + dLon
            }`;
            if (streetGrid[neighborKey]) {
              candidates.push(...streetGrid[neighborKey]);
            }
          });
        });

        if (candidates.length > 0) {
          let minDistance = 10000;
          let closestStreetName = null;

          for (const s of candidates) {
            for (const p of s.points) {
              const d = getDistance(lat, lon, p.lat, p.lon);
              if (d < minDistance) {
                minDistance = d;
                closestStreetName = s.name;
              }
            }
          }

          if (minDistance < 100 && closestStreetName) {
            street = closestStreetName;
            matchedStreetCount++;
          }
        }
      }

      // --- שלב ג: בניית הכתובת הסופית ---
      let fullAddress = "";
      if (street) {
        fullAddress += street + (houseNum ? " " + houseNum : "");
      }

      // הוספת העיר לכתובת אם קיימת
      if (city) {
        if (fullAddress) fullAddress += ", ";
        fullAddress += city;
      }

      cleanedData.push({
        n: name,
        l: parseFloat(lat.toFixed(4)),
        o: parseFloat(lon.toFixed(4)),
        c: category,
        a: fullAddress, // הכתובת המלאה כולל עיר
        ci: city, // שדה חדש רק עבור העיר (לשימוש נוח בקוד צד לקוח)
      });
    });

    // סינון כפילויות
    const uniqueData = cleanedData.filter(
      (v, i, a) =>
        a.findIndex((t) => t.n === v.n && Math.abs(t.l - v.l) < 0.001) === i
    );

    console.log(`Done. Total POIs: ${uniqueData.length}.`);
    console.log(`Inferred Streets for: ${matchedStreetCount} items.`);
    console.log(`Inferred Cities for: ${matchedCityCount} items.`);

    const outputPath = path.join(__dirname, "../src/data/poi.json");
    fs.writeFileSync(outputPath, JSON.stringify(uniqueData));
    console.log(`Saved to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

run();
