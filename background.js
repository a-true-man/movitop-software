const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// משתנים גלובליים
let mainWindow;
let otpProcess;
const isDev = !app.isPackaged;

// --- הגדרת נתיבים חכמה (מבוסס על הקוד שלך) ---

// 1. נתיב לקבצים המקוריים (בתוך ה-EXE/Resources) - לקריאה בלבד
const RESOURCES_PATH = isDev ? __dirname : process.resourcesPath;

// 2. נתיב לתיקיית הנתונים החיצונית (AppData) - לכתיבה וקריאה
// כאן נשמור את הגרף כדי שנוכל להחליף אותו
const USER_DATA_DIR = path.join(app.getPath("userData"), "otp-data");
const WRITABLE_GRAPH_PATH = path.join(USER_DATA_DIR, "Graph.obj");

// פונקציה למציאת ה-Java (מהקוד המקורי שלך)
function getJavaPath() {
  let javaBinPath = "java"; // ברירת מחדל

  if (!isDev) {
    const platform = process.platform;
    const execName = platform === "win32" ? "java.exe" : "java";
    javaBinPath = path.join(RESOURCES_PATH, "jre", "bin", execName);
  } else {
    // לוגיקה לפיתוח
    const localJavaWin = path.join(
      RESOURCES_PATH,
      "jre",
      "win",
      "bin",
      "java.exe"
    );
    if (process.platform === "win32" && fs.existsSync(localJavaWin)) {
      javaBinPath = localJavaWin;
    }
  }
  return javaBinPath;
}

// פונקציה להכנת הסביבה (העתקת הגרף בפעם הראשונה)
function ensureDataExists() {
  // 1. יצירת התיקייה
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  // 2. העתקת הגרף (Graph.obj)
  if (!fs.existsSync(WRITABLE_GRAPH_PATH)) {
    const bundledGraph = path.join(RESOURCES_PATH, "backend", "Graph.obj");
    if (fs.existsSync(bundledGraph)) {
      console.log("Copying bundled Graph.obj...");
      fs.copyFileSync(bundledGraph, WRITABLE_GRAPH_PATH);
    }
  }

  // 3. העתקת קובץ הקונפיגורציה (router-config.json) - התיקון החדש!
  const writableConfig = path.join(USER_DATA_DIR, "router-config.json");
  if (!fs.existsSync(writableConfig)) {
    const bundledConfig = path.join(
      RESOURCES_PATH,
      "backend",
      "router-config.json"
    );

    if (fs.existsSync(bundledConfig)) {
      console.log("Copying bundled router-config.json...");
      fs.copyFileSync(bundledConfig, writableConfig);
    } else {
      // אם אין קובץ מקור, ניצור קובץ ברירת מחדל כדי שהמשתמש יראה משהו
      const defaultConfig = {
        routingDefaults: {
          walkSpeed: 1.3,
          transferSlack: 120,
          maxTransfers: 4,
          waitReluctance: 0.4,
          walkReluctance: 1.75,
          stairsReluctance: 1.65,
          walkBoardCost: 540,
        },
      };
      fs.writeFileSync(writableConfig, JSON.stringify(defaultConfig, null, 2));
    }
  }
}

// --- ניהול השרת ---

function startOtpServer() {
  if (otpProcess) return;

  const javaPath = getJavaPath();
  const otpJarPath = path.join(RESOURCES_PATH, "backend", "otp.jar"); // ה-JAR נשאר במקום המקורי

  // וידוא שהגרף קיים במקום שניתן לכתיבה
  ensureDataExists();

  console.log("--- Starting OTP Backend ---");
  console.log(`Java: ${javaPath}`);
  console.log(`Jar: ${otpJarPath}`);
  console.log(`Data Dir: ${USER_DATA_DIR}`);

  // שים לב: אנחנו טוענים את הגרף מ-USER_DATA_DIR ולא מ-backend
  const args = [
    "-Xmx4G",
    "-jar",
    otpJarPath,
    "--load",
    USER_DATA_DIR,
    "--port",
    "8080",
  ];

  otpProcess = spawn(javaPath, args);

  otpProcess.stdout.on("data", (data) => console.log(`OTP: ${data}`));
  otpProcess.stderr.on("data", (data) => console.error(`OTP Error: ${data}`));

  otpProcess.on("close", (code) => {
    console.log(`OTP exited with code ${code}`);
    otpProcess = null;
  });
}

function stopOtpServer() {
  return new Promise((resolve) => {
    if (!otpProcess) {
      resolve();
      return;
    }
    console.log("Stopping OTP process...");
    otpProcess.kill();
    otpProcess = null;
    setTimeout(resolve, 2000); // המתנה לכיבוי בטוח
  });
}

// --- IPC Handlers (התקשורת החדשה עם ה-React) ---

ipcMain.handle("dialog:select-graph", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "OTP Graph", extensions: ["obj"] }],
  });
  if (canceled) return null;
  return filePaths[0];
});

// בחירת קובץ מפה (PMTiles)
ipcMain.handle("dialog:select-map-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "PMTiles Map", extensions: ["pmtiles"] }],
  });
  if (canceled) return null;
  return filePaths[0]; // מחזיר את הנתיב המלא: C:\Users\...\israel.pmtiles
});

ipcMain.handle("app:replace-graph", async (event, newFilePath) => {
  try {
    console.log("Replacing Graph...");

    // 1. עוצרים את השרת
    await stopOtpServer();

    // 2. דורסים את הגרף בתיקיית ה-AppData
    fs.copyFileSync(newFilePath, WRITABLE_GRAPH_PATH);
    console.log("Graph file replaced successfully.");

    // 3. מניעים מחדש
    startOtpServer();

    return { success: true };
  } catch (error) {
    console.error("Replace Error:", error);
    return { success: false, error: error.message };
  }
});

// --- יצירת החלון ---

function createWindow() {
  // קודם כל מפעילים את השרת
  startOtpServer();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Movitop Pro",
    webPreferences: {
      // ⚠️ חשוב מאוד: שיניתי את זה כדי לתמוך ב-preload
      // הקוד הקודם שלך השתמש ב-nodeIntegration: true וזה בעייתי אבטחתית וגם מונע שימוש ב-contextBridge
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"), // וודא שיש לך את הקובץ הזה ליד ה-background.js
    },
  });

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "build/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }
}

// --- ניהול קבצי קונפיגורציה (Router Config & Map Style) ---

// קריאת קובץ מתיקיית הנתונים (עבור router-config.json)
ipcMain.handle("config:read-file", async (event, fileName) => {
  try {
    const targetPath = path.join(USER_DATA_DIR, fileName);
    if (fs.existsSync(targetPath)) {
      return fs.readFileSync(targetPath, "utf-8");
    }
    return null; // הקובץ לא קיים
  } catch (e) {
    console.error("Read Error:", e);
    return null;
  }
});

// כתיבת קובץ לתיקיית הנתונים
ipcMain.handle("config:write-file", async (event, fileName, content) => {
  try {
    const targetPath = path.join(USER_DATA_DIR, fileName);
    fs.writeFileSync(targetPath, content, "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- אירועי מערכת ---

app.whenReady().then(createWindow);

app.on("window-all-closed", async () => {
  // קודם עוצרים את השרת ואז יוצאים
  await stopOtpServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", async () => {
  await stopOtpServer();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
