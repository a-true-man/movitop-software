import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Collapse,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  Select,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/Circle";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import {
  fetchRoutePatterns,
  fetchPatternStops,
  fetchStopSchedule,
} from "../services/schedulesService";

// --- פונקציות עזר ---
const secondsToTime = (seconds) => {
  if (seconds === undefined || seconds === null) return "--:--";
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 5);
};

const getCurrentSecondsFromMidnight = () => {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
};

const getNext10Days = () => {
  const days = [];
  const options = { weekday: "long", month: "numeric", day: "numeric" };
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const label =
      i === 0
        ? "היום"
        : i === 1
        ? "מחר"
        : d.toLocaleDateString("he-IL", options);
    days.push({ value: `${yyyy}-${mm}-${dd}`, label: label });
  }
  return days;
};

export default function LineSchedule({ selectedLine, onClose }) {
  const [availablePatterns, setAvailablePatterns] = useState([]);
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [patternStops, setPatternStops] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStopId, setExpandedStopId] = useState(null);
  const [scheduleDialogData, setScheduleDialogData] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [daysList] = useState(getNext10Days());
  const [selectedDate, setSelectedDate] = useState(daysList[0].value);

  // 1. טעינת כיוונים
  useEffect(() => {
    const loadPatterns = async () => {
      if (!selectedLine) return;
      setLoading(true);
      setPatternStops(null);
      setAvailablePatterns([]);

      try {
        const idsToFetch = selectedLine.allIds || [selectedLine.id];
        let allPatterns = [];
        await Promise.all(
          idsToFetch.map(async (id) => {
            const res = await fetchRoutePatterns(id);
            if (res && Array.isArray(res))
              allPatterns = [...allPatterns, ...res];
          })
        );

        const unique = Array.from(
          new Map(allPatterns.map((p) => [p.id, p])).values()
        );
        if (unique.length > 0) {
          const safe = unique.slice(0, 10);
          setAvailablePatterns(safe);
          setSelectedPatternId(safe[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadPatterns();
  }, [selectedLine]);

  // 2. טעינת תחנות
  useEffect(() => {
    const loadStops = async () => {
      if (!selectedPatternId) return;
      setLoading(true);
      try {
        const data = await fetchPatternStops(selectedPatternId);
        setPatternStops(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStops();
  }, [selectedPatternId]);

  // 3. פתיחת דיאלוג לו"ז - כאן היה התיקון החשוב!
  const handleOpenSchedule = async (stop) => {
    setScheduleDialogData({ stop, times: [] });
    setLoadingSchedule(true);

    try {
      // --- התיקון: שימוש ב-gtfsId במקום id ---
      // ה-ID הרגיל (U3R...) הוא בפורמט Base64 שהשרת לא מקבל בפונקציה הזאת.
      // ה-gtfsId (1:38725) הוא הפורמט הנכון.
      const stopIdToFetch = stop.gtfsId || stop.id;

      const times = await fetchStopSchedule(
        stopIdToFetch,
        selectedDate,
        selectedLine.shortName
      );
      setScheduleDialogData({ stop, times });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // 4. עדכון תאריך
  useEffect(() => {
    if (scheduleDialogData?.stop) {
      handleOpenSchedule(scheduleDialogData.stop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleStopClick = (stopId) => {
    setExpandedStopId(expandedStopId === stopId ? null : stopId);
  };

  if (!selectedLine) return null;
  const stops = patternStops?.stops || [];

  return (
    <>
      <Drawer
        anchor="right"
        open={Boolean(selectedLine)}
        onClose={onClose}
        PaperProps={{ sx: { width: "100%", maxWidth: 450 } }}
      >
        <Box sx={{ bgcolor: "#0e2a5a", color: "white", direction: "rtl" }}>
          <Box
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "rgba(255,255,255,0.2)",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1.5,
                }}
              >
                <DirectionsBusIcon />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  קו {selectedLine.shortName}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {selectedLine.agencyName}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              bgcolor: "white",
              color: "#333",
              px: 2,
              py: 1.5,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CalendarTodayIcon
                sx={{ color: "#0e2a5a", fontSize: 20, ml: 1 }}
              />
              <Typography variant="body2" fontWeight="bold" sx={{ ml: 1 }}>
                {daysList.find((d) => d.value === selectedDate)?.label}
              </Typography>
            </Box>
            <FormControl size="small" variant="standard">
              <Select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disableUnderline
                sx={{
                  fontSize: "0.85rem",
                  color: "#0e2a5a",
                  fontWeight: "bold",
                  "& .MuiSelect-select": { py: 0, pr: 0 },
                  "& .MuiSelect-icon": { display: "none" },
                }}
                renderValue={() => (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#1976d2",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    שינוי יום
                  </Typography>
                )}
              >
                {daysList.map((day) => (
                  <MenuItem key={day.value} value={day.value} dir="rtl">
                    {day.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Divider />

          {availablePatterns.length > 0 && selectedPatternId && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <FormControl
                fullWidth
                size="small"
                sx={{ bgcolor: "white", borderRadius: 1 }}
              >
                <Select
                  value={selectedPatternId}
                  onChange={(e) => setSelectedPatternId(e.target.value)}
                  displayEmpty
                  sx={{
                    textAlign: "right",
                    direction: "rtl",
                    height: 36,
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                    },
                    "& .MuiSelect-icon": { left: 7, right: "auto" },
                  }}
                >
                  {availablePatterns.map((p) => (
                    <MenuItem
                      key={p.id}
                      value={p.id}
                      sx={{ direction: "rtl", justifyContent: "flex-start" }}
                    >
                      <SwapVertIcon
                        sx={{ ml: 1, fontSize: 18, color: "text.secondary" }}
                      />
                      {p.headsign || `מסלול ${p.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            bgcolor: "#f8fafc",
            direction: "rtl",
          }}
        >
          {loading && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mt: 8,
              }}
            >
              <CircularProgress />
              <Typography variant="caption" sx={{ mt: 2 }}>
                טוען נתונים...
              </Typography>
            </Box>
          )}

          {!loading && stops.length === 0 && (
            <Box sx={{ p: 4, textAlign: "center", opacity: 0.6 }}>
              <Typography>לא נמצא מידע</Typography>
            </Box>
          )}

          {!loading && stops.length > 0 && (
            <List component="div" disablePadding>
              {stops.map((stop, index) => {
                const isExpanded = expandedStopId === stop.id;

                return (
                  <React.Fragment key={stop.id || index}>
                    <ListItem disablePadding sx={{ display: "block" }}>
                      <ListItemButton
                        onClick={() => handleStopClick(stop.id)}
                        sx={{
                          bgcolor: isExpanded ? "#f1f5f9" : "white",
                          borderBottom: "1px solid #e2e8f0",
                          pl: 2,
                          py: 1.5,
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 40,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            ml: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 2,
                              height: 20,
                              bgcolor: index === 0 ? "transparent" : "#cbd5e1",
                              mb: 0,
                            }}
                          />
                          <CircleIcon
                            sx={{
                              fontSize: 14,
                              color: isExpanded ? "#0e2a5a" : "white",
                              border: "2px solid",
                              borderColor: isExpanded ? "#0e2a5a" : "#cbd5e1",
                              borderRadius: "50%",
                            }}
                          />
                          <Box
                            sx={{
                              width: 2,
                              height: 20,
                              bgcolor:
                                index === stops.length - 1
                                  ? "transparent"
                                  : "#cbd5e1",
                              mt: 0,
                            }}
                          />
                        </ListItemIcon>

                        <ListItemText
                          primary={stop.name}
                          secondary={stop.gtfsId?.split(":")[1] || stop.code}
                          primaryTypographyProps={{
                            variant: "body2",
                            fontWeight: 600,
                            color: "#1e293b",
                            textAlign: "right",
                          }}
                          secondaryTypographyProps={{
                            variant: "caption",
                            textAlign: "right",
                            display: "block",
                          }}
                        />
                        {isExpanded ? (
                          <ExpandLess color="action" />
                        ) : (
                          <ExpandMore color="action" />
                        )}
                      </ListItemButton>

                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            pr: 7,
                            pl: 2,
                            pb: 2,
                            pt: 1,
                            bgcolor: "#f1f5f9",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Chip
                              label="פעיל"
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                            <Button
                              variant="contained"
                              disableElevation
                              size="small"
                              startIcon={<ScheduleIcon />}
                              onClick={() => handleOpenSchedule(stop)}
                              sx={{ borderRadius: 2, textTransform: "none" }}
                            >
                              לוח זמנים מלא
                            </Button>
                          </Box>
                        </Box>
                      </Collapse>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={Boolean(scheduleDialogData)}
        onClose={() => setScheduleDialogData(null)}
        fullWidth
        maxWidth="xs"
        dir="rtl"
      >
        {scheduleDialogData && (
          <>
            <DialogTitle
              sx={{
                bgcolor: "#0e2a5a",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
              }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  לוח זמנים
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {daysList.find((d) => d.value === selectedDate)?.label} •{" "}
                  {scheduleDialogData.stop.name}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setScheduleDialogData(null)}
                sx={{ color: "white", p: 0.5 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: "#f8fafc", p: 2 }}>
              {loadingSchedule ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {scheduleDialogData.times.map((timeSec, i) => {
                    const timeStr = secondsToTime(timeSec);
                    const nowSec =
                      selectedDate === daysList[0].value
                        ? getCurrentSecondsFromMidnight()
                        : 0;
                    const isFuture = timeSec > nowSec;

                    return (
                      <Chip
                        key={i}
                        label={timeStr}
                        size="medium"
                        sx={{
                          fontWeight: "bold",
                          bgcolor: isFuture ? "#e6fffa" : "#e2e8f0",
                          color: isFuture ? "#009640" : "#94a3b8",
                          border: isFuture ? "1px solid #b2f5ea" : "none",
                        }}
                      />
                    );
                  })}
                  {scheduleDialogData.times.length === 0 && (
                    <Typography
                      color="text.secondary"
                      sx={{ width: "100%", textAlign: "center", mt: 2 }}
                    >
                      אין נסיעות בתאריך זה
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}
