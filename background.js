const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let otpProcess;

const isDev = !app.isPackaged;

function getPaths() {
  // בייצור: resourcesPath, בפיתוח: התיקייה הנוכחית
  const basePath = isDev ? __dirname : process.resourcesPath;

  // נתיב לג'אווה
  let javaBinPath = "java"; // ברירת מחדל (אם מותקן במערכת)

  // אם אנחנו בייצור (ארוז), נחפש את הג'אווה הניידת
  if (!isDev) {
    const platform = process.platform;
    const execName = platform === "win32" ? "java.exe" : "java";
    javaBinPath = path.join(basePath, "jre", "bin", execName);
  } else {
    // בפיתוח: ננסה להשתמש בג'אווה מהתיקייה jre אם קיימת, אחרת מהמערכת
    // (אופציונלי - אם ה-java הרגיל במחשב שלך עובד, זה מספיק)
    const localJavaWin = path.join(basePath, "jre", "win", "bin", "java.exe");
    const localJavaMac = path.join(
      basePath,
      "jre",
      "mac",
      "Contents",
      "Home",
      "bin",
      "java"
    );

    if (
      process.platform === "win32" &&
      require("fs").existsSync(localJavaWin)
    ) {
      javaBinPath = localJavaWin;
    } else if (
      process.platform === "darwin" &&
      require("fs").existsSync(localJavaMac)
    ) {
      javaBinPath = localJavaMac;
    }
  }

  return {
    java: javaBinPath,
    // לפי מה שאמרת: ה-jar והגרף נמצאים ישירות ב-backend
    otpJar: path.join(basePath, "backend", "otp.jar"),
    graphDir: path.join(basePath, "backend"),
  };
}

function startOtpServer() {
  const paths = getPaths();

  console.log("--- Starting OTP Backend ---");
  console.log(`Java: ${paths.java}`);
  console.log(`Jar: ${paths.otpJar}`);
  console.log(`Graph: ${paths.graphDir}`);

  // הפקודה המדויקת שעבדה לך ידנית:
  // java -Xmx4G -jar backend/otp.jar --load backend --port 8080
  const args = [
    "-Xmx4G",
    "-jar",
    paths.otpJar,
    "--load",
    paths.graphDir,
    "--port",
    "8080",
  ];

  otpProcess = spawn(paths.java, args);

  otpProcess.stdout.on("data", (data) => {
    // מציג את הלוגים של השרת בטרמינל של VS Code
    console.log(`OTP: ${data}`);
  });

  otpProcess.stderr.on("data", (data) => {
    console.error(`OTP Error: ${data}`);
  });
}

function createWindow() {
  startOtpServer(); // הפעלת השרת ברקע

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "My Transit App",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "build/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    // mainWindow.webContents.openDevTools(); // פתח כלי פיתוח אם צריך
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

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
