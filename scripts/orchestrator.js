const inquirer = require("inquirer");
const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const { DownloaderHelper } = require("node-downloader-helper");
const byteSize = require("byte-size"); // להצגת גודל קובץ יפה (MB/GB)

const BASE_DIR = path.join(__dirname, "..");
const BACKEND_DIR = path.join(BASE_DIR, "backend");
const DATA_DIR = path.join(BACKEND_DIR, "data");

// --- כאן מוגדר מאיפה הקבצים יורדים ---
const FILES = {
  otp: {
    name: "otp.jar",
    url: "https://repo1.maven.org/maven2/org/opentripplanner/otp/2.5.0/otp-2.5.0-shaded.jar",
  },
  osm: {
    name: "israel-and-palestine.osm.pbf",
    url: "https://download.geofabrik.de/asia/israel-and-palestine-latest.osm.pbf",
  },
  gtfs: {
    name: "gtfs.zip",
    url: "https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip",
  },
};

// פונקציית עזר להורדה עם חיווי גרפי
const downloadWithProgress = (url, saveDir, fileName) => {
  return new Promise((resolve, reject) => {
    const dl = new DownloaderHelper(url, saveDir, {
      fileName: fileName,
      override: true, // דורס קובץ קיים אם יש
    });

    // משתנים לעיצוב
    let startTime = Date.now();

    dl.on("start", () => {
      console.log(`⬇️  Starting download: ${fileName}`);
    });

    dl.on("progress", (stats) => {
      // חישוב אחוזים
      const progress = Math.round(stats.progress);

      // המרת גדלים לפורמט קריא (למשל 15MB)
      const downloaded = byteSize(stats.downloaded);
      const total = byteSize(stats.total);
      const speed = byteSize(stats.speed); // מהירות לשנייה

      // נקה את השורה האחרונה בטרמינל וכתוב מחדש
      process.stdout.clearLine();
      process.stdout.cursorTo(0);

      // הפלט: [=====>   ] 50% | 120MB/240MB | 5.2 MB/s | ETA: 12s
      const barLength = 20;
      const filledBar = "█".repeat((progress / 100) * barLength);
      const emptyBar = "░".repeat(barLength - filledBar.length);

      process.stdout.write(
        `[${filledBar}${emptyBar}] ${progress}% | ` +
          `${downloaded}/${total} | ` +
          `🚀 ${speed}/s | ` +
          `⏳ ETA: ${Math.floor(stats.eta)}s`
      );
    });

    dl.on("end", () => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(`✅ Download Complete: ${fileName}\n`);
      resolve();
    });

    dl.on("error", (err) => {
      console.error("\n❌ Download Failed:", err);
      reject(err);
    });

    dl.start().catch((err) => reject(err));
  });
};

async function main() {
  console.log("🚀 Starting Transit App Build Pipeline...\n");

  // 1. שאלת המשתמש
  const { downloadFiles } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "downloadFiles",
      message: "איזה קבצים תרצה להוריד מחדש?",
      choices: [
        { name: "otp.jar (OTP Server - ~180MB)", value: "otp" },
        { name: "osm.pbf (Map Data - ~250MB)", value: "osm" },
        { name: "gtfs.zip (Transport Data - ~100MB)", value: "gtfs" },
      ],
    },
  ]);

  // יצירת התיקייה אם לא קיימת
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // ביצוע ההורדות
  for (const fileKey of downloadFiles) {
    const fileInfo = FILES[fileKey];
    try {
      await downloadWithProgress(fileInfo.url, DATA_DIR, fileInfo.name);
    } catch (e) {
      console.error("Critical error during download. Exiting.");
      process.exit(1);
    }
  }

  // 2. הרצת תיקון GTFS (Python)
  // רק אם הורדנו GTFS או אם המשתמש רוצה להריץ תיקון
  if (
    downloadFiles.includes("gtfs") ||
    fs.existsSync(path.join(DATA_DIR, "gtfs.zip"))
  ) {
    console.log("🐍 Running GTFS Fixer (Python)...");
    shell.cd(BACKEND_DIR);
    // שימוש ב-python3 או python תלוי במערכת
    const pyCmd = shell.which("python3") ? "python3" : "python";
    if (shell.exec(`${pyCmd} ../scripts/fix_gtfs.py`).code !== 0) {
      console.error("❌ Python script failed!");
      process.exit(1);
    }
    shell.cd(BASE_DIR);
  }

  // 3. בניית הגרף
  const { ramSize } = await inquirer.prompt([
    {
      type: "input",
      name: "ramSize",
      message: "כמה RAM להקצות לבניית הגרף? (לדוגמה: 12G, 8G)",
      default: "12G",
    },
  ]);

  // יצירת router-config.json
  const routerConfig = {
    routingDefaults: {
      walkSpeed: 1.3,
      transferSlack: 120,
      boardCost: 300,
      walkReluctance: 3.0,
      waitReluctance: 2.0,
    },
  };
  fs.writeFileSync(
    path.join(BACKEND_DIR, "router-config.json"),
    JSON.stringify(routerConfig, null, 2)
  );

  console.log(`\n☕ Building Graph with ${ramSize} RAM...`);

  // הפקודה לבניית הגרף (Java)
  // מניח ש-Java מותקן במחשב או בנתיב המערכת כרגע לצורך הבנייה
  if (
    shell.exec(
      `java -Xmx${ramSize} -jar backend/data/otp.jar --build --save backend/data`
    ).code !== 0
  ) {
    console.error("❌ Graph build failed!");
    process.exit(1);
  }

  // הזזת ה-Graph שנוצר למיקום הסופי
  if (fs.existsSync("backend/data/graph.obj")) {
    console.log("Moving graph.obj to backend folder...");
    shell.mv("backend/data/graph.obj", "backend/graph.obj");
  }

  // 4. יצירת Stops.json
  console.log("\n⚡ Generating stops.json for Frontend...");
  if (shell.exec("node scripts/generate_stops.js").code !== 0) {
    console.error("❌ Stops generation failed!");
    process.exit(1);
  }

  // 5. ניקוי
  console.log("\n🧹 Cleaning up raw files...");
  const filesToDelete = [
    path.join(BACKEND_DIR, "data/gtfs.zip"),
    path.join(BACKEND_DIR, "data/israel-and-palestine.osm.pbf"),
  ];
  filesToDelete.forEach((f) => {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`Deleted: ${path.basename(f)}`);
    }
  });

  console.log("\n✅✅✅ PROCESS COMPLETE! You can now run 'npm start'.");
}

main();
