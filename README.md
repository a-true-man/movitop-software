# 🚌 מוביטופ - זמני תחבורה אופליין - תוכנה


<img width="1392" height="912" alt="תדמית" src="https://github.com/user-attachments/assets/fe47ca28-fd00-4205-9a0c-db137ca72e16" />

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron&logoColor=white)
![OTP](https://img.shields.io/badge/OpenTripPlanner-2.5-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-gray?style=flat-square)

**מערכת מתקדמת לתכנון נסיעות בתחבורה ציבורית בישראל – ללא צורך בחיבור לאינטרנט.**
האפליקציה משלבת מנוע חיפוש מסלולים חכם (OTP), ממשק מודרני (Material UI) ומפות וקטוריות (MapLibre).

---

## ✨ פיצ'רים עיקריים

- 🚀 **Full Offline:** אופליין מלא (כולל מפות וחיפוש מסלולים).
- 🗺️ **Interactive Map:** מפה וקטורית מהירה ומדויקת.
- 📅 **Schedule Engine:** מבוסס על נתוני GTFS רשמיים של משרד התחבורה.
- 💻 **Cross-Platform:** תמיכה ב-Windows וב-macOS.

---

##🛠️ דרישות מוקדמות (Prerequisites)

* ליצירת גרף מינימום 12 GB RAM פנויים ולהרצת רילייס מספיק 4GB




לפני שמתחילים, וודא שיש לך את הרכיבים הבאים:

1.  **Node.js** (גרסה 18 ומעלה) - [להורדה](https://nodejs.org/).
2.  **Java 21 JRE** (גרסה ניידת) - נדרש להרצת מנוע ה-OTP.

---

## 🚀 הוראות התקנה (Quick Start)

### 1. שכפול המאגר והתקנת תלויות

```bash
git clone https://github.com/a-true-man/movitop-software.git
cd movitop-software
npm install
```

### 2\. הגדרת Java (חובה\!)

כדי לשמור על הפרויקט קליל, לא העלינו את הג'אווה לגיט. יש להוסיף אותה ידנית:

1.  הורד את **Java 21 JRE (Portable)** מאתר [Adoptium](https://www.google.com/search?q=https://adoptium.net/temurin/releases/%3Fversion%3D21%26package%3Djre). \* **Windows:** הורד `.zip`
    | **Mac:** הורד `.tar.gz`.

2.  חלץ את הקבצים.
3.  מקם אותם במבנה הבא בתוך תיקיית הפרויקט:

> **Windows:** `movitop-software/jre/win`
>
> **Mac:** `movitop-software/jre/mac`

### 3\. הגדרת מפות (אופציונלי)

להצגת מפה ללא אינטרנט:

1.  הורד את הקובץ `israel.pmtiles` (מאתר [Protomaps](https://protomaps.com/) או מקור אחר).
2.  העבר אותו לתיקייה: `public/israel.pmtiles`.

---

## ⚙️ בניית הנתונים (Automation)

הרצת סקריפט חכם שמוריד את ה-GTFS, מתקן אותו ובונה את הגרף אוטומטית.

הרץ בטרמינל:

```bash
npm run deploy
```

🔍 **אתם שואלים, מה הסקריפט עושה?!**

1.  מוריד GTFS ו-OTP עדכניים.
2.  מתקן באגים בקבצי ה-GTFS.
3.  בונה את `graph.obj` באמצעות Java.
4.  מייצר קובץ `stops.json` קליל עבור החיפוש תחנות.

---

## ▶️ הרצה ושימוש

### מצב פיתוח (Development)

מריץ את ה-React ואת ה-Electron במקביל:

```bash
npm start
```

### יצירת קובץ התקנה (Build)

אריזת התוכנה לקובץ `.exe` (כולל הג'אווה והגרף בפנים):

```bash
npm run dist:win
```

אריזת התוכנה לקובץ `.dmg או .app` (כולל הג'אווה והגרף בפנים):

```bash
npm run dist:mac
```

_(הקובץ המוכן יחכה לך בתיקיית `dist`)_

ג. הרשאות (Permissions)
במק, כשמריצים סקריפטים (כמו otp.jar או java), המערכת לפעמים חוסמת אותם. אם האפליקציה הארוזה לא נפתחת, נסה לתת הרשאות ריצה לקובץ הג'אווה לפני האריזה:

```bash
chmod +x jre/mac/Contents/Home/bin/java
```

---

## 📂 מבנה הפרויקט

```text
movitop-software/
├── 📂 backend/        # OTP Server & Graph data
├── 📂 jre/            # Portable Java Runtime (win/mac)
├── 📂 public/         # Static assets & Offline Map
├── 📂 scripts/        # Automation scripts (Node.js + Python)
├── 📂 src/            # React Source Code
│   ├── 📂 components  # UI Components
│   ├── 📂 services    # Logic & Search
│   └── App.js         # Main Application
├── electron-main.js   # Electron Entry Point
└── package.json       # Dependencies & Scripts
```

---

\<div align="center"\>
\<sub\>נבנה באהבה באמצעות React, Electron & OpenTripPlanner ❤️\</sub\>
\</div\>

```
איש אמת ביזבז על זה לילה, תעריכו...
```
