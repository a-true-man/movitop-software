import React, { createContext, useState, useEffect, useContext } from "react";

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

// הגדרות ברירת מחדל
const defaultSettings = {
  otpUrl: "http://localhost:8080/otp/routers/default/index/graphql",
  // אלו הגדרות למצב שבו הקבצים יושבים בתיקיית Public (ברירת מחדל)
  mapStylePath: "/map_style.json",
  tilesUrl: "pmtiles:///israel.pmtiles", // ה-URL שיוזרק לתוך ה-Style
  customMapStyle: null,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  // משתנה זמני לשמירת קובץ המפה בזיכרון (בדפדפן בלבד)
  const [localMapFile, setLocalMapFile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("movitop_settings");
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setLoading(false);
  }, []);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    // אנחנו לא שומרים את ה-blobUrl ב-LocalStorage כי הוא זמני ומתבטל ברענון
    // לכן שומרים רק את ההגדרות הטקסטואליות
    const { tilesBlobUrl, ...settingsToSave } = newSettings;
    localStorage.setItem("movitop_settings", JSON.stringify(settingsToSave));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setLocalMapFile(null);
    localStorage.removeItem("movitop_settings");
  };

  // פונקציה מיוחדת לטיפול בטעינת קובץ מפה מהדפדפן
  const handleMapFileSelect = (file) => {
    if (!file) return;

    // יצירת כתובת URL זמנית לקובץ המקומי
    const blobUrl = URL.createObjectURL(file);
    setLocalMapFile(file); // שמירה בזיכרון

    // עדכון ההגדרות כך שהמפה תשתמש ב-URL החדש
    // הפורמט pmtiles://URL הוא מה שהפרוטוקול מצפה לו
    const newTilesUrl = `pmtiles://${blobUrl}`;

    setSettings((prev) => ({
      ...prev,
      tilesUrl: newTilesUrl,
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        saveSettings,
        resetSettings,
        loading,
        handleMapFileSelect, // מייצאים את הפונקציה החוצה
        localMapFile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
