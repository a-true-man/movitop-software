// src/components/ResultsList.js
//קומפוננטת רשימת התוצאות
// רשימת התוצאות (הכרטיסיות).
import React from "react";
import { Box, Typography, Stack, Card, CardActionArea } from "@mui/material";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TramIcon from "@mui/icons-material/Tram";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CurrencyShekelIcon from "@mui/icons-material/MonetizationOn";

// ייבוא פונקציות העזר
import {
  getLegColor,
  calculateTotalFare,
  formatDuration,
  getDepartureStrings,
} from "../utils/transitUtils";

export default function ResultsList({
  itineraries,
  selectedIndex,
  onItineraryClick,
}) {
  if (!itineraries || itineraries.length === 0) return null;

  return (
    <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#f3f4f6", p: 1.5 }}>
      {itineraries.map((itin, index) => {
        const isSelected = index === selectedIndex;
        const endTime = new Date(itin.endTime);
        const departureInfo = getDepartureStrings(itin.startTime);
        const price = calculateTotalFare(itin.legs);

        return (
          <Card
            key={index}
            sx={{
              mb: 2,
              border: isSelected ? "2px solid #2563eb" : "none",
              borderRadius: 2,
            }}
          >
            <CardActionArea
              onClick={() => onItineraryClick(index)}
              sx={{ p: 2 }}
            >
              {/* כותרת כרטיסייה: זמן, שעה ומחיר */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {formatDuration(itin.duration)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  •
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  הגעה ב-
                  {endTime.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Stack
                  direction="row"
                  alignItems="center"
                  sx={{ bgcolor: "#e0f2fe", px: 1, borderRadius: 1 }}
                >
                  <CurrencyShekelIcon sx={{ fontSize: 14, color: "#0288d1" }} />
                  <Typography variant="body2" fontWeight="bold" color="#0288d1">
                    {price.toFixed(1)}
                  </Typography>
                </Stack>
              </Stack>

              {/* ויזואליזציה של המקטעים (אוטובוסים/הליכה) */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ mb: 2, flexWrap: "wrap" }}
              >
                {itin.legs.map((leg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <ArrowBackIosNewIcon
                        sx={{
                          fontSize: 10,
                          color: "#9ca3af",
                          transform: "rotate(180deg)",
                          mx: 0.5,
                        }}
                      />
                    )}
                    {leg.mode === "WALK" ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          color: "#6b7280",
                        }}
                      >
                        <DirectionsWalkIcon sx={{ fontSize: 18 }} />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          {Math.round(leg.duration / 60)}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${getLegColor(leg)}`,
                          borderRadius: 1,
                          bgcolor: "white",
                          height: 24,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            bgcolor: getLegColor(leg),
                            width: 6,
                            height: "100%",
                          }}
                        />
                        <Box
                          sx={{
                            px: 0.8,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {leg.mode === "TRAM" ? (
                            <TramIcon
                              sx={{
                                fontSize: 14,
                                mr: 0.5,
                                color: getLegColor(leg),
                              }}
                            />
                          ) : (
                            <DirectionsBusIcon
                              sx={{
                                fontSize: 14,
                                mr: 0.5,
                                color: getLegColor(leg),
                              }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            sx={{ color: "#334155" }}
                          >
                            {leg.route?.shortName}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </Stack>

              {/* מידע על יציאה */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <ScheduleIcon
                  sx={{ fontSize: 16, color: departureInfo.color }}
                />
                <span
                  style={{ color: departureInfo.color, fontWeight: "bold" }}
                >
                  {departureInfo.text}
                </span>
                <span>
                  מתחנת{" "}
                  {itin.legs.find((l) => l.mode !== "WALK")?.from?.name ||
                    "המוצא"}
                </span>
              </Typography>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
