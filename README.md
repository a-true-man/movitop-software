<p align="center">
  <img width="1392" height="912" alt="תדמית - מוביטופ" src="https://github.com/user-attachments/assets/fe47ca28-fd00-4205-9a0c-db137ca72e16" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Electron-28-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/OpenTripPlanner-2.5-green?style=for-the-badge" alt="OTP" />
  <img src="https://img.shields.io/badge/license-MIT-gray?style=for-the-badge" alt="License" />
</p>

---

<h1 align="center">🚌 מוביטופ – זמני תחבורה אופליין</h1>
<h3 align="center">מערכת מתקדמת לתכנון נסיעות בתחבורה ציבורית בישראל – ללא צורך בחיבור לאינטרנט</h3>

<p align="center">
  האפליקציה משלבת מנוע חיפוש מסלולים חכם (OTP), ממשק מודרני (Material UI) ומפות וקטוריות (MapLibre).
</p>

---

## ✅ רשימת בדיקה לפריסה חדשה

לפני שמתחילים, ודאו שסימנתם את כל הסעיפים:

- [ ] **Node.js** גרסה 18 ומעלה מותקן
- [ ] **Java 21** ממוקמת בתיקיית `jre/win` או `jre/mac`
- [ ] **Python 3** מותקן (לתיקון GTFS)
- [ ] **פונטי Noto** – שלושת התיקיות תחת `public/fonts/`
- [ ] **לפחות 12 GB RAM** פנויים לבניית המנוע
- [ ] (אופציונלי) קובץ **israel.pmtiles** בתיקיית `public/`

---

## ✨ פיצ'רים עיקריים

| פיצ'ר | תיאור |
|-------|--------|
| 🚀 **אופליין מלא** | חיפוש מסלולים ומפות ללא אינטרנט |
| 🗺️ **מפה אינטראקטיבית** | מפה וקטורית מהירה ומדויקת |
| 📅 **מערכת לוח זמנים** | מבוססת נתוני GTFS רשמיים של משרד התחבורה |
| 💻 **הרצה במחשב** | תמיכה ב‑Windows וב‑macOS |

---

## ⚠️ דרישות מערכת – חשוב לקרוא לפני שמתחילים

לפני שמתקינים את הפרויקט, צריך לוודא שלמחשב יש את המשאבים הבאים:

| שלב | דרישת RAM מינימלית | הסבר |
|-----|---------------------|------|
| **בניית מנוע הניווט** | **לפחות 12 GB** | בעת בניית גרף מסלולי התחבורה, התהליך צורך זיכרון רב. ללא 12 GB הזיכרון הפנוי – התהליך עלול להיכשל או להתקע. |
| **הרצת התוכנה** | **לפחות 4 GB** | להרצה רגילה של מוביטופ די ב‑4 GB זיכרון פנוי. |

---

## 🛠️ דרישות מוקדמות – מה צריך להתקין

הנה רשימת כל התוכנות שנדרשות להתקנת הפרויקט מההתחלה:

### 1. Node.js (גרסה 18 ומעלה)
*תוכנה להרצת JavaScript במחשב – נדרשת לבניית האפליקציה*

- **הורדה:** [https://nodejs.org/](https://nodejs.org/)
- **בדיקה:** פתחו טרמינל והקלידו `node --version` – אם מופיע מספר גרסה, ההתקנה הצליחה.

---

### 2. Java 21 (JRE)
*המנוע לחישוב מסלולי התחבורה רץ על Java – חובה להתקנה*

הפרויקט לא כולל את Java כדי להוריד את נפח הגיטהאב. צריך להוריד ולהציב אותה ידנית.

| מערכת הפעלה | סוג קובץ להורדה | תיקיית יעד בפרויקט |
|-------------|------------------|----------------------|
| **Windows** | קובץ `.zip` | `movitop-software/jre/win` |
| **Mac** | קובץ `.tar.gz` | `movitop-software/jre/mac` |

**הורדה:** [Adoptium Temurin 21 JRE](https://adoptium.net/temurin/releases/?version=21&package=jre)

**שלבי ההתקנה:**
1. הורידו את הקובץ המתאים למערכת שלכם (Windows: `.zip`, Mac: `.tar.gz`)
2. חילצו את הקבצים מהארכיון
3. העתיקו את כל תוכן התיקייה שחולצה לתיקייה:
   - **Windows:** `movitop-software/jre/win`
   - **Mac:** `movitop-software/jre/mac`

---

### 3. Python 3
*נדרש לתיקון אוטומטי של קבצי הנתונים הישראלים*

- **Windows:** [https://www.python.org/downloads/](https://www.python.org/downloads/) – בזמן ההתקנה סמנו "Add Python to PATH"
- **Mac:** לרוב מותקן מראש. לבדיקה: `python3 --version`

---

### 4. פונטים Noto (חובה)
*נדרשים להצגת טקסט עברי במפה*

יש להוריד את ספריית הפונטים **Noto** של גוגל ולהניח את **שלושת התיקיות** הבאות תחת `public/fonts/`:

- `Noto Sans Bold`
- `Noto Sans Italic`
- `Noto Sans Regular`

**מבנה נכון:**
```
movitop-software/
└── public/
    └── fonts/
        ├── Noto Sans Bold/
        ├── Noto Sans Italic/
        └── Noto Sans Regular/
```

---

### 5. מפת ישראל אופליין (אופציונלי)
*להצגת מפה ללא חיבור אינטרנט*

1. הורידו את הקובץ `israel.pmtiles` (למשל מ־[Protomaps](https://protomaps.com/) או מקור אחר)
2. העתיקו אותו לתיקייה: `public/israel.pmtiles`

> 💡 אם אין קובץ מוכן להורדה, אפשר ליצור מפה חדשה עם `planetiler.jar` מקובץ `osm.pbf`.

---

## 🚀 פריסה חדשה – הוראות צעד־אחר־צעד

מסמך זה מתאר התקנה נקייה מההתחלה במחשב חדש.

### שלב 1: שכפול הפרויקט והתקנת תלויות

בטרמינל (או ב־Command Prompt ב־Windows):

```bash
git clone https://github.com/a-true-man/movitop-software.git
cd movitop-software
npm install
```

> ⏳ `npm install` עלול להימשך כמה דקות – זה תקין.

---

### שלב 2: הגדרת Java (חובה)

כפי שמפורט בסעיף "דרישות מוקדמות", יש להוריד את Java 21 JRE ולהציב אותה ב־`jre/win` (Windows) או ב־`jre/mac` (Mac).

---

### שלב 3: הגדרת פונטים (חובה)

כפי שמפורט בסעיף "דרישות מוקדמות", יש להוסיף את שלושת תיקיות הפונטים `Noto Sans` תחת `public/fonts/`.

---

### שלב 4: בניית מנוע הניווט (הגרף)

> ⚠️ **חשוב:** במהלך בניית המנוע מומלץ לפחות **12 GB RAM פנויים**. סגרו תוכנות כבדות אם אפשר.

```bash
npm run deploy
```

הסקריפט יעשה את הדברים הבאים:
1. יבקש לבחור מה להוריד – מומלץ לבחור את כולם (otp.jar, osm.pbf, gtfs.zip)
2. יתקן באגים בקבצי GTFS הישראלים (דורש Python)
3. יבנה את גרף המסלולים (זה השלב שצורך הרבה זיכרון)
4. ייצור קובץ `stops.json` לחיפוש תחנות
5. ינקה קבצים זמניים

> ⏳ בניית הגרף עשויה להימשך **20–60 דקות** – זה תקין.

---

### שלב 5 (אופציונלי): יצירת קובץ נקודות עניין

לחיפוש מהיר של כתובות ונקודות עניין:

```bash
node scripts/downloadPois.js
```

---

### שלב 6: הרצת התוכנה במצב פיתוח

פתחו **שני חלונות טרמינל**:

**טרמינל 1 – ממשק האפליקציה:**
```bash
npm start
```

**טרמינל 2 – מנוע הניווט:**
```bash
java -Xmx4G -jar backend/otp.jar --load backend --port 8080
```

אחרי ששניהם רצים, האפליקציה תיפתח אוטומטית.

---

### שלב 7: יצירת קובץ התקנה להפצה

לאחר שהמנוע והנתונים בנויים, ניתן ליצור קובץ התקנה:

| מערכת הפעלה | פקודה | קבצי פלט |
|-------------|--------|----------|
| **Windows** | `npm run dist:win` | `.exe` בתיקיית `dist/` |
| **Mac** | `npm run dist:mac` | `מוביטופ-0.1.0.dmg` ו־`מוביטופ-0.1.0.pkg` בתיקיית `dist/` |

---

## 📂 מבנה הפרויקט

```
movitop-software/
├── 📂 backend/           מנוע OTP וגרף הנתונים
│   ├── otp.jar          (נוצר ע"י npm run deploy)
│   ├── graph.obj        (נוצר ע"י npm run deploy)
│   └── router-config.json
├── 📂 jre/               Java – יש להוסיף ידנית
│   ├── win/             (Windows)
│   └── mac/             (Mac)
├── 📂 public/            קבצים סטטיים, מפות ופונטים
│   ├── fonts/           פונטים Noto (חובה)
│   └── israel.pmtiles   מפת אופליין (אופציונלי)
├── 📂 scripts/          סקריפטים אוטומטיים
│   ├── orchestrator.js  סקריפט ראשי – npm run deploy
│   ├── fix_gtfs.py      תיקון GTFS (Python)
│   ├── generate_stops.js
│   └── downloadPois.js
├── 📂 src/               קוד React
│   ├── components/
│   ├── services/
│   └── data/
├── background.js         נקודת הכניסה של Electron
├── preload.js
├── package.json
├── .gitignore           רשימת קבצים שלא יעלו לגיטהאב
└── .env.production      הגדרות build (ללא סודות)
```

---

## 📋 קבצי קונפיגורציה בפרויקט

קבצים אלה **נכללים** בשכפול ובפריסה – אין בהם קוד סודי:

| קובץ | תפקיד |
|------|--------|
| `.gitignore` | מגדיר אילו קבצים Git יתעלם מהם (למשל `node_modules`, קבצי build) |
| `.env.production` | הגדרות בנייה לייצור (אופטימיזציות – בלי API keys או סודות) |
| `package.json` / `package-lock.json` | רשימת חבילות ו־scripts להרצה |

> 💡 **שים לב:** הקבצים `.env` ו־`.env.local` **לא** נכללים – הם משמשים למפתחות מקומיים בלבד, אם תהיה צורך.

---

## ❓ שאלות נפוצות

### למה בניית המנוע לוקחת כל כך הרבה זמן?
בניית הגרף עובדת על מיליוני נתיבים ותחנות. התהליך עושה חישובים כבדים – 20–60 דקות הן טווח זמן רגיל.

### האם אפשר להריץ את מוביטופ בלי אינטרנט?
כן. אחרי שמוסיפים את המפה (`israel.pmtiles`) והנתונים נבנים, הכל פועל אופליין.

### איך מסירים את מוביטופ ב‑Mac?
1. קליק ימני על `מוביטופ.app` → "הצג את תוכן החבילה"
2. בתיקיית `Contents` הרצת הקובץ `הסרת מוביטופ.command`

### האפליקציה לא נפתחת ב‑Mac אחרי ההתקנה
ייתכן שהמערכת חוסמת הרצת סקריפטים. נסו להריץ:

```bash
chmod +x jre/mac/Contents/Home/bin/java
```

---

## 🙏 קרדיטים

נבנה בעזרת React, Electron ו־OpenTripPlanner ❤️

---

<p align="center">
  <sub>איש אמת ביזבז על זה לילה, תעריכו...</sub>
</p>
