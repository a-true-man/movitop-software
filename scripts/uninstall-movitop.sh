#!/bin/bash
# סקריפט הסרת מוביטופ - מוחק את האפליקציה וכל הנתונים

set -e

APP_NAME="מוביטופ"
APP_BUNDLE="${APP_NAME}.app"
APP_SUPPORT="${HOME}/Library/Application Support/${APP_NAME}"
CACHES="${HOME}/Library/Caches/${APP_NAME}"
PREFS="${HOME}/Library/Preferences/com.mytrmovitop.app.plist"

echo "🔄 מסיר את ${APP_NAME}..."

# הסרת האפליקציה מתיקיית Applications
if [ -d "/Applications/${APP_BUNDLE}" ]; then
    rm -rf "/Applications/${APP_BUNDLE}"
    echo "✅ האפליקציה הוסרה מ־Applications"
fi

# הסרת נתוני האפליקציה (כולל otp-data)
if [ -d "${APP_SUPPORT}" ]; then
    rm -rf "${APP_SUPPORT}"
    echo "✅ נתוני האפליקציה הוסרו"
fi

# הסרת מטמון
if [ -d "${CACHES}" ]; then
    rm -rf "${CACHES}"
    echo "✅ מטמון הוסר"
fi

# הסרת העדפות
if [ -f "${PREFS}" ]; then
    rm -f "${PREFS}"
    echo "✅ העדפות הוסרו"
fi

echo ""
echo "✅ הסרת ${APP_NAME} הושלמה בהצלחה!"
echo ""
read -p "לחץ Enter לסגירה..."
