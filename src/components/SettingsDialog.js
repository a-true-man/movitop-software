import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  TextField,
  Typography,
  Stack,
  Alert,
  IconButton,
  Divider,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MapIcon from "@mui/icons-material/Map";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import StorageIcon from "@mui/icons-material/Storage";
import SaveIcon from "@mui/icons-material/Save";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CircularProgress from "@mui/material/CircularProgress";

import { useSettings } from "../contexts/SettingsContext";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
      style={{ height: "100%", overflow: "hidden" }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: "100%", overflowY: "auto" }}>{children}</Box>
      )}
    </div>
  );
}

export default function SettingsDialog({ open, onClose }) {
  const theme = useTheme();
  const { settings, saveSettings, handleMapFileSelect, localMapFile } =
    useSettings();

  const [tabValue, setTabValue] = useState(0);
  const [styleJsonString, setStyleJsonString] = useState("");
  const [routerConfigString, setRouterConfigString] = useState("");
  const [otpUrl, setOtpUrl] = useState(settings.otpUrl);

  const [loadingData, setLoadingData] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    if (open) {
      loadCurrentData();
    }
  }, [open]);

  const loadCurrentData = async () => {
    setLoadingData(true);

    // 1. טעינת סגנון מפה
    try {
      if (settings.customMapStyle) {
        setStyleJsonString(JSON.stringify(settings.customMapStyle, null, 2));
      } else {
        const res = await fetch(settings.mapStylePath);
        const json = await res.json();
        setStyleJsonString(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      setStyleJsonString("{}");
    }

    // 2. טעינת קונפיגורציית נתב
    try {
      if (window.electronAPI) {
        // קריאה מהדיסק האמיתי
        const content = await window.electronAPI.readConfigFile(
          "router-config.json"
        );
        if (content) {
          setRouterConfigString(content);
        } else {
          // אם הקובץ לא קיים פיזית, נציג ברירת מחדל
          setRouterConfigString(
            JSON.stringify(
              {
                note: "File not found on disk, creating new default.",
                routingDefaults: {
                  walkSpeed: 1.3,
                  transferSlack: 120,
                },
              },
              null,
              2
            )
          );
        }
      } else {
        // מצב דפדפן
        setRouterConfigString(settings.routerConfig || "{}");
      }
    } catch (e) {
      console.error(e);
      setRouterConfigString("{}");
    }

    setLoadingData(false);
  };

  const handleSave = async () => {
    let parsedStyle = null;
    try {
      parsedStyle = JSON.parse(styleJsonString);
      JSON.parse(routerConfigString); // בדיקת תקינות בלבד
      setJsonError(null);
    } catch (e) {
      setJsonError("שגיאת תחביר ב-JSON: " + e.message);
      return;
    }

    if (window.electronAPI) {
      // שמירה לדיסק
      await window.electronAPI.writeConfigFile(
        "router-config.json",
        routerConfigString
      );
    }

    saveSettings({
      ...settings,
      otpUrl: otpUrl,
      customMapStyle: parsedStyle,
      routerConfig: routerConfigString,
    });

    onClose();
  };

  const handleGraphReplace = async () => {
    if (!window.electronAPI) {
      alert(
        "פעולה זו זמינה רק בגרסת הדסקטופ המותקנת, מכיוון שהדפדפן אינו רשאי לגשת לקבצי המערכת."
      );
      return;
    }

    const filePath = await window.electronAPI.selectGraphFile();
    if (!filePath) return;

    if (window.confirm("האם להחליף את הגרף? השרת יופעל מחדש.")) {
      setIsReplacing(true);
      await window.electronAPI.replaceGraphAndRestart(filePath);
      setIsReplacing(false);
      alert("הגרף הוחלף בהצלחה.");
    }
  };

  // --- פונקציה חדשה לטיפול חכם בבחירת מפה (תיקון ה-Persistence) ---
  const handleMapSelection = async (event) => {
    // 1. נתיב לתוכנה (Electron) - שמירה קבועה
    if (window.electronAPI) {
      const filePath = await window.electronAPI.selectMapFile();
      if (!filePath) return;

      // המרה לנתיב URL תקין (חשוב מאוד!)
      const fileUrl = "file:///" + filePath.replace(/\\/g, "/");
      const finalUrl = `pmtiles://${fileUrl}`;

      // שמירה ישירה להגדרות
      saveSettings({
        ...settings,
        tilesUrl: finalUrl,
      });

      alert("המפה נטענה בהצלחה ותישמר להפעלה הבאה.");
    }
    // 2. נתיב לדפדפן - שמירה זמנית
    else {
      const file = event.target.files[0];
      if (file) {
        handleMapFileSelect(file);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          bgcolor: theme.palette.primary.main,
          color: "white",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">הגדרות מתקדמות</Typography>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ display: "flex", height: "70vh" }}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{
            borderRight: 1,
            borderColor: "divider",
            minWidth: 200,
            bgcolor: "#f8fafc",
          }}
        >
          <Tab
            icon={<MapIcon />}
            iconPosition="start"
            label="עיצוב מפה"
            sx={{ justifyContent: "flex-start", minHeight: 60 }}
          />
          <Tab
            icon={<SettingsEthernetIcon />}
            iconPosition="start"
            label="הגדרות נתב (OTP)"
            sx={{ justifyContent: "flex-start", minHeight: 60 }}
          />
          <Tab
            icon={<StorageIcon />}
            iconPosition="start"
            label="ניהול קבצים"
            sx={{ justifyContent: "flex-start", minHeight: 60 }}
          />
        </Tabs>

        {loadingData ? (
          <Box
            sx={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ flex: 1, bgcolor: "white" }}>
            {/* Tab 1: Map Style */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                עורך סגנון מפה (map_style.json)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                ערוך את ה-JSON כדי לשנות צבעים, עובי קווים ושכבות.
              </Typography>
              <TextField
                multiline
                fullWidth
                rows={20}
                value={styleJsonString}
                onChange={(e) => setStyleJsonString(e.target.value)}
                sx={{
                  direction: "ltr", // Fix: LTR Text
                  textAlign: "left", // Fix: Align Left
                  fontFamily: "monospace",
                  "& .MuiInputBase-root": {
                    fontFamily: "Consolas, monospace",
                    fontSize: 13,
                    bgcolor: "#1e293b",
                    color: "#e2e8f0",
                  },
                }}
              />
            </TabPanel>

            {/* Tab 2: Router Config */}
            <TabPanel value={tabValue} index={1}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6">כתובת השרת</Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={otpUrl}
                    onChange={(e) => setOtpUrl(e.target.value)}
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography variant="h6" gutterBottom>
                    קונפיגורציית שרת (router-config.json)
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    paragraph
                  >
                    קובץ זה נטען מהדיסק המקומי (AppData/otp-data). שינוי דורש
                    הפעלה מחדש של השרת.
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    rows={15}
                    value={routerConfigString}
                    onChange={(e) => setRouterConfigString(e.target.value)}
                    sx={{
                      direction: "ltr", // Fix: LTR Text
                      textAlign: "left", // Fix: Align Left
                      fontFamily: "monospace",
                      "& .MuiInputBase-root": {
                        fontFamily: "Consolas, monospace",
                        fontSize: 13,
                        bgcolor: "#f1f5f9",
                      },
                    }}
                  />
                </Box>
              </Stack>
            </TabPanel>

            {/* Tab 3: Files */}
            <TabPanel value={tabValue} index={2}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2">
                    החלפת גרף (Graph.obj)
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    paragraph
                  >
                    נתיב הנתונים:{" "}
                    {window.electronAPI
                      ? "תיקיית AppData המקומית"
                      : "לא זמין בדפדפן"}
                  </Typography>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={handleGraphReplace}
                    startIcon={
                      isReplacing ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AutorenewIcon />
                      )
                    }
                    disabled={isReplacing}
                  >
                    {isReplacing ? "מבצע החלפה..." : "בחר קובץ והחלף"}
                  </Button>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="subtitle2">
                    טעינת מפה (PMTiles)
                  </Typography>
                  <Typography variant="caption">
                    הקובץ הנוכחי: {localMapFile?.name || settings.tilesUrl}
                  </Typography>
                  <br />
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileIcon />}
                    sx={{ mt: 1 }}
                    // שינוי לטיפול בבחירה מותאמת ל-Electron
                    onClick={(e) => {
                      if (window.electronAPI) {
                        e.preventDefault();
                        handleMapSelection();
                      }
                    }}
                  >
                    טען קובץ מפה
                    {!window.electronAPI && (
                      <input
                        type="file"
                        hidden
                        accept=".pmtiles"
                        onChange={handleMapSelection}
                      />
                    )}
                  </Button>
                </Box>
              </Stack>
            </TabPanel>
          </Box>
        )}
      </Box>

      {jsonError && (
        <Alert severity="error" sx={{ mx: 2 }}>
          {jsonError}
        </Alert>
      )}

      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9" }}>
        <Button onClick={onClose}>ביטול</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loadingData}
        >
          שמור שינויים
        </Button>
      </DialogActions>
    </Dialog>
  );
}
