const inquirer = require("inquirer");
const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const { DownloaderHelper } = require("node-downloader-helper");
const byteSize = require("byte-size");

const BASE_DIR = path.join(__dirname, "..");
const BACKEND_DIR = path.join(BASE_DIR, "backend");
const DATA_DIR = path.join(BACKEND_DIR, "data");

// הגדרת קבצים
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

// פונקציית הורדה עם פרוגרס בר משופר
const downloadWithProgress = (url, saveDir, fileName) => {
  return new Promise((resolve, reject) => {
    const dl = new DownloaderHelper(url, saveDir, {
      fileName: fileName,
      override: true,
    });

    dl.on("start", () => console.log(`⬇️  Starting download: ${fileName}`));

    dl.on("progress", (stats) => {
      const progress = Math.round(stats.progress);
      const downloaded = byteSize(stats.downloaded);
      const total = byteSize(stats.total);
      const speed = byteSize(stats.speed);

      // שימוש ב-readline כדי לעדכן את אותה שורה
      try {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        const barLength = 20;
        const filled = Math.floor((progress / 100) * barLength);
        const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
        process.stdout.write(
          `[${bar}] ${progress}% | ${downloaded}/${total} | 🚀 ${speed}/s`
        );
      } catch (e) {
        // במקרה של שגיאת טרמינל, לא נדפיס כלום כדי לא לשבור
      }
    });

    dl.on("end", () => {
      process.stdout.clearLine(); // ניקוי שורת הפרוגרס
      process.stdout.cursorTo(0);
      console.log(`✅ Download Complete: ${fileName}`);
      resolve();
    });

    dl.on("error", (err) => {
      console.error(`❌ Error downloading ${fileName}:`, err);
      reject(err);
    });

    dl.start().catch((err) => reject(err));
  });
};

async function main() {
  console.log("🚀 Starting Transit App Build Pipeline...\n");

  // --- שלב 1: הורדות ---
  const { downloadFiles } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "downloadFiles",
      message: "Select files to download (Space to select, Enter to confirm):",
      choices: [
        { name: "otp.jar (OTP Server)", value: "otp" },
        { name: "osm.pbf (Map Data)", value: "osm" },
        { name: "gtfs.zip (Transport Data)", value: "gtfs" },
      ],
    },
  ]);

  // יצירת תיקיית Data אם לא קיימת
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (downloadFiles.length > 0) {
    for (const fileKey of downloadFiles) {
      try {
        await downloadWithProgress(
          FILES[fileKey].url,
          DATA_DIR,
          FILES[fileKey].name
        );
      } catch (e) {
        console.error("Download failed. Exiting.");
        process.exit(1);
      }
    }
  } else {
    console.log("⏩ Skipping downloads (No files selected).");
  }

  // --- שלב ביניים: סידור קבצים (הזזת otp.jar) ---
  // המטרה: otp.jar צריך להיות ב-backend, והנתונים ב-backend/data
  const otpInData = path.join(DATA_DIR, "otp.jar");
  const otpInBackend = path.join(BACKEND_DIR, "otp.jar");

  if (fs.existsSync(otpInData)) {
    console.log("📦 Moving otp.jar to backend root (recommended structure)...");
    try {
      // אם כבר קיים ב-backend, נמחק אותו קודם
      if (fs.existsSync(otpInBackend)) fs.unlinkSync(otpInBackend);
      fs.renameSync(otpInData, otpInBackend);
    } catch (e) {
      console.error("❌ Failed to move otp.jar:", e);
    }
  }

  // --- שלב 2: תיקון GTFS ---
  // נבדוק אם יש קובץ GTFS, ואם כן נשאל האם לתקן
  const gtfsPath = path.join(DATA_DIR, "gtfs.zip");

  if (fs.existsSync(gtfsPath)) {
    console.log("\n--- GTFS Fixer ---");
    const { runFixer } = await inquirer.prompt([
      {
        type: "list", // שיניתי ל-List כדי שיהיה ברור יותר
        name: "runFixer",
        message: "Do you want to run the Python GTFS Fixer script?",
        choices: [
          { name: "Yes (Recommended for Israel data)", value: true },
          { name: "No (Skip)", value: false },
        ],
      },
    ]);

    if (runFixer) {
      console.log("🐍 Running Python script...");
      shell.cd(BACKEND_DIR);
      const pyCmd = shell.which("python3") ? "python3" : "python";

      // הרצה ובדיקת שגיאות
      if (shell.exec(`${pyCmd} ../scripts/fix_gtfs.py`).code !== 0) {
        console.error("❌ Python script failed! Stopping.");
        process.exit(1);
      }
      shell.cd(BASE_DIR);
    } else {
      console.log("⏩ Skipped GTFS Fixer.");
    }
  } else {
    console.log("⚠️  No GTFS file found in data folder. Skipping fixer.");
  }

  // --- שלב 3: בניית הגרף ---
  console.log("\n--- Graph Build ---");
  const { ramSize } = await inquirer.prompt([
    {
      type: "input",
      name: "ramSize",
      message: "Allocated RAM? (e.g. 12)",
      default: "12",
    },
  ]);

  // תיקון אוטומטי ל-RAM
  let memory = ramSize.toUpperCase().trim();
  if (!memory.endsWith("G") && !memory.endsWith("M")) {
    memory += "G";
  }

  // הגדרת הנתיב הנכון ל-JAR
  // עכשיו אנחנו בודקים איפה הוא באמת נמצא
  let jarPathToUse = "";
  if (fs.existsSync(otpInBackend)) {
    jarPathToUse = "backend/otp.jar"; // הנתיב המועדף
  } else if (fs.existsSync(otpInData)) {
    jarPathToUse = "backend/data/otp.jar"; // נתיב גיבוי (אם ההעברה נכשלה)
  } else {
    console.error(
      "❌ Error: otp.jar not found in 'backend' or 'backend/data'!"
    );
    console.error("Please download otp.jar first.");
    process.exit(1);
  }

  // יצירת קובץ קונפיגורציה
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

  console.log(
    `\n☕ Building Graph with ${memory} RAM using ${jarPathToUse}...`
  );

  // הפקודה המדויקת:
  // 1. jarPathToUse -> המיקום האמיתי של הקובץ
  // 2. --build --save backend/data -> אומר לו לקחת את הנתונים מתיקיית הדאטה
  const buildCmd = `java -Xmx${memory} -jar "${jarPathToUse}" --build --save backend/data`;

  if (shell.exec(buildCmd).code !== 0) {
    console.error("❌ Graph build failed!");
    process.exit(1);
  }

  // הזזת הגרף שנוצר (הוא נוצר איפה שהדאטה נמצא) למיקום הראשי
  const graphInData = path.join(DATA_DIR, "graph.obj");
  const graphInBackend = path.join(BACKEND_DIR, "graph.obj");

  if (fs.existsSync(graphInData)) {
    console.log("🚚 Moving graph.obj to backend root...");
    try {
      if (fs.existsSync(graphInBackend)) fs.unlinkSync(graphInBackend);
      fs.renameSync(graphInData, graphInBackend);
    } catch (e) {
      console.error("Warning: Could not move graph.obj:", e);
    }
  }

  // --- שלב 4: יצירת JSON לריאקט ---
  console.log("\n⚡ Generating stops.json...");
  if (shell.exec("node scripts/generate_stops.js").code !== 0) {
    console.error("❌ Stops generation failed!");
    process.exit(1);
  }

  // --- שלב 5: ניקוי ---
  console.log("\n🧹 Cleaning up raw files...");
  const cleanupPath = [
    path.join(BACKEND_DIR, "data/gtfs.zip"),
    path.join(BACKEND_DIR, "data/israel-and-palestine.osm.pbf"),
  ];

  cleanupPath.forEach((f) => {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
        console.log(`Deleted: ${path.basename(f)}`);
      } catch (e) {
        // מתעלם משגיאות מחיקה
      }
    }
  });

  console.log("\n✅✅✅ BUILD COMPLETE!");
}

main();
