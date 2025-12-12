// scripts/generate_stops.js
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const Papa = require("papaparse");

// נתיבים דינמיים
const DATA_DIR = path.join(__dirname, "../backend/data");
const GTFS_PATH = path.join(DATA_DIR, "gtfs.zip");
const OUTPUT_DIR = path.join(__dirname, "../src/data");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "stops.json");

async function convert() {
  if (!fs.existsSync(GTFS_PATH)) {
    console.error(`Error: GTFS file not found at ${GTFS_PATH}`);
    process.exit(1);
  }

  console.log("Reading GTFS Zip...");
  const data = fs.readFileSync(GTFS_PATH);
  const zip = await JSZip.loadAsync(data);

  if (!zip.file("stops.txt")) {
    console.error("Error: stops.txt not found inside zip!");
    process.exit(1);
  }

  console.log("Extracting stops.txt...");
  const stopsText = await zip.file("stops.txt").async("string");

  console.log("Parsing CSV...");
  const parsed = Papa.parse(stopsText, { header: true, skipEmptyLines: true });

  console.log("Minifying data...");
  const miniStops = parsed.data
    .filter((s) => s.stop_name && s.stop_lat)
    .map((s) => ({
      n: s.stop_name,
      c: s.stop_code,
      l: parseFloat(s.stop_lat),
      o: parseFloat(s.stop_lon),
      d: s.stop_desc || "",
      i: s.stop_id,
    }));

  // יצירת התיקייה אם לא קיימת
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Writing ${miniStops.length} stops to JSON...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(miniStops));

  console.log("✅ Stops JSON generated successfully.");
}

convert();
