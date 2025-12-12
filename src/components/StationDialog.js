import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Chip,
  Stack,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TramIcon from "@mui/icons-material/Tram";
import TrainIcon from "@mui/icons-material/Train";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { motion, AnimatePresence } from "framer-motion";
import { request, gql } from "graphql-request";

const OTP_URL = "http://localhost:8080/otp/routers/default/index/graphql";

// קומפוננטה לפריט מקובץ (קו אחד עם מספר זמנים)
const GroupedScheduleItem = ({ route, times, index }) => {
  let color = "#3b82f6";
  let Icon = DirectionsBusIcon;
  if (route.mode === "TRAM") {
    color = "#ec4899";
    Icon = TramIcon;
  }
  if (route.mode === "RAIL") {
    color = "#ef4444";
    Icon = TrainIcon;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{ marginBottom: "12px" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          bgcolor: "white",
          p: 1.5,
          borderRadius: 3,
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          border: "1px solid #f1f5f9",
        }}
      >
        {/* מספר הקו */}
        <Box
          sx={{
            bgcolor: color,
            color: "white",
            borderRadius: 2,
            minWidth: 50,
            height: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            mr: 2,
            boxShadow: `0 4px 10px ${color}40`,
          }}
        >
          <Typography fontWeight="900" variant="h6" lineHeight={1}>
            {route.shortName}
          </Typography>
          <Icon sx={{ fontSize: 12, opacity: 0.8 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ mb: 1, fontWeight: 500 }}
          >
            {route.longName}
          </Typography>

          {/* רשימת הזמנים הבאים */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ overflowX: "auto", pb: 0.5 }}
          >
            {times.map((t, i) => (
              <Chip
                key={i}
                label={new Date(t * 1000).toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}
                size="small"
                variant={i === 0 ? "filled" : "outlined"} // הראשון מלא, השאר חלולים
                sx={{
                  bgcolor: i === 0 ? "#eff6ff" : "transparent",
                  color: i === 0 ? "#1e40af" : "text.secondary",
                  fontWeight: "bold",
                  borderColor: "#e2e8f0",
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>
    </motion.div>
  );
};

export default function StationDialog({ open, onClose, stop }) {
  const [groupedSchedule, setGroupedSchedule] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !stop) return;
    setLoading(true);
    setGroupedSchedule([]);

    const fetchTimes = async () => {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const currentSeconds =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const cleanName = stop.name.replace(/"/g, '\\"');

      const query = gql`
        query {
            stops(name: "${cleanName}") {
            lat lon
            stoptimesForServiceDate(date: "${dateStr}") {
                stoptimes { 
                scheduledDeparture
                trip { route { shortName longName mode } }
                }
            }
            }
        }
        `;

      try {
        const data = await request(OTP_URL, query);
        if (data.stops?.length) {
          // מציאת התחנה הקרובה ביותר פיזית (למקרה שיש כפילויות שמות)
          const chosen = data.stops.sort((a, b) => {
            const da = Math.hypot(a.lat - stop.lat, a.lon - stop.lon);
            const db = Math.hypot(b.lat - stop.lat, b.lon - stop.lon);
            return da - db;
          })[0];

          const allTimes = chosen.stoptimesForServiceDate.flatMap(
            (pg) => pg.stoptimes
          );

          // סינון זמנים שעברו ומיון
          const futureTimes = allTimes
            .filter((t) => t.scheduledDeparture >= currentSeconds)
            .sort((a, b) => a.scheduledDeparture - b.scheduledDeparture);

          // --- לוגיקת איחוד קווים (Grouping) ---
          const groups = {};
          futureTimes.forEach((item) => {
            const key = `${item.trip.route.shortName}-${item.trip.route.mode}`;
            if (!groups[key]) {
              groups[key] = {
                route: item.trip.route,
                times: [],
              };
            }
            // שומרים עד 4 זמנים לכל קו
            if (groups[key].times.length < 4) {
              groups[key].times.push(item.scheduledDeparture);
            }
          });

          // המרה למערך ומיון לפי הזמן הקרוב ביותר של כל קו
          const sortedGroups = Object.values(groups).sort(
            (a, b) => a.times[0] - b.times[0]
          );
          setGroupedSchedule(sortedGroups);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    fetchTimes();
  }, [open, stop]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: { borderRadius: 4, bgcolor: "#f8fafc", overflow: "hidden" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          p: 3,
          pb: 6,
          color: "white",
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 8, left: 8, color: "white" }}
        >
          <CloseIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="800" sx={{ mt: 1 }}>
          {stop?.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, opacity: 0.9 }}>
          <Chip
            label={`מספר תחנה: ${stop?.code}`}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
          />
        </Stack>
      </Box>

      <DialogContent
        sx={{
          p: 2,
          mt: -3,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          bgcolor: "#f8fafc",
          minHeight: 300,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : groupedSchedule.length === 0 ? (
          <Box textAlign="center" mt={4}>
            <Typography color="text.secondary">
              אין נסיעות קרובות היום
            </Typography>
          </Box>
        ) : (
          <Box>
            <AnimatePresence>
              {groupedSchedule.map((group, i) => (
                <GroupedScheduleItem
                  key={i}
                  route={group.route}
                  times={group.times}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
