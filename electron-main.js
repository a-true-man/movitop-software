const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// משתנים גלובליים כדי שהתהליכים לא ימותו בגלל Garbage Collection
let mainWindow;
let otpProcess;

// בדיקה האם אנחנו במצב פיתוח או בתוכנה ארוזה
const isDev = !app.isPackaged;

function getPaths() {
  // בייצור (Production), הקבצים נמצאים בתיקיית resources
  // בפיתוח (Dev), הם נמצאים בתיקיית השורש של הפרויקט
  const basePath = isDev ? __dirname : process.resourcesPath;

  // זיהוי מערכת הפעלה כדי לדעת לאיזה תיקיית JRE לגשת
  const platform = process.platform;
  let javaBinPath = "";

  if (isDev) {
    // בפיתוח: הנתיב הוא לפי התיקיות שיצרת ידנית
    if (platform === "win32") {
      javaBinPath = path.join(basePath, "jre", "win", "bin", "java.exe");
    } else if (platform === "darwin") {
      javaBinPath = path.join(
        basePath,
        "jre",
        "mac",
        "Contents",
        "Home",
        "bin",
        "java"
      );
    } else {
      javaBinPath = "java"; // לינוקס או ברירת מחדל
    }
  } else {
    // בייצור: האריזה (electron-builder) מעתיקה את תיקיית ה-OS הספציפית לתוך 'jre' שטוחה
    // (לפי ההגדרות שנתתי לך בשלב הקודם ב-package.json)
    const execName = platform === "win32" ? "java.exe" : "java";
    javaBinPath = path.join(basePath, "jre", "bin", execName);
  }

  return {
    java: javaBinPath,
    otpJar: path.join(basePath, "backend", "otp.jar"),
    graphDir: path.join(basePath, "backend"), // התיקייה שבה נמצא graph.obj
  };
}

function startOtpServer() {
  const paths = getPaths();

  console.log("--- Starting OTP Backend ---");
  console.log(`Java Path: ${paths.java}`);
  console.log(`Jar Path: ${paths.otpJar}`);
  console.log(`Graph Dir: ${paths.graphDir}`);

  // פקודת ההרצה של השרת
  // שים לב: אנחנו משתמשים ב--load כדי לטעון גרף קיים ולא לבנות מחדש
  const args = [
    "-Xmx4G", // הקצאת זיכרון (אפשר לשנות לפי הצורך)
    "-jar",
    paths.otpJar, // קובץ ה-JAR
    "--load",
    paths.graphDir, // טעינת הגרף מהתיקייה
    "--port",
    "8080", // פורט השרת
    "--securePort",
    "8081", // פורט HTTPS
  ];

  otpProcess = spawn(paths.java, args);

  // האזנה ללוגים מהשרת (חשוב לדיבוג)
  otpProcess.stdout.on("data", (data) => {
    console.log(`OTP: ${data}`);
  });

  otpProcess.stderr.on("data", (data) => {
    console.error(`OTP Error: ${data}`);
  });

  otpProcess.on("close", (code) => {
    console.log(`OTP process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "My Transit App",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // מאפשר שימוש ב-Node.js בתוך ה-React (אופציונלי)
    },
  });

  // טעינת ה-React:
  // בפיתוח - טוען משרת ה-Web המקומי
  // בייצור - טוען את קובץ ה-HTML שנבנה
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // פתיחת כלי פיתוח (רק במצב פיתוח)
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// === מחזור חיים של האפליקציה ===

app.whenReady().then(() => {
  startOtpServer(); // 1. הפעלת השרת
  createWindow(); // 2. פתיחת החלון
});

// סגירה מלאה של האפליקציה
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// חשוב מאוד: לוודא שתהליך הג'אווה נהרג כשהאפליקציה נסגרת
app.on("will-quit", () => {
  if (otpProcess) {
    console.log("Killing OTP process...");
    otpProcess.kill();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
