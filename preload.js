const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // נותן ל-React יכולת לפתוח חלון בחירת קובץ
  selectGraphFile: () => ipcRenderer.invoke("dialog:select-graph"),

  selectMapFile: () => ipcRenderer.invoke("dialog:select-map-file"),

  // נותן ל-React יכולת להחליף את הגרף
  replaceGraphAndRestart: (filePath) =>
    ipcRenderer.invoke("app:replace-graph", filePath),

  readConfigFile: (fileName) =>
    ipcRenderer.invoke("config:read-file", fileName),
  writeConfigFile: (fileName, content) =>
    ipcRenderer.invoke("config:write-file", fileName, content),

  // סימון שאנחנו רצים בתוך התוכנה
  isElectron: true,
});
