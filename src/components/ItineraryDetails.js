import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Collapse,
  Divider,
  Chip,
} from "@mui/material";
// Icons
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TramIcon from "@mui/icons-material/Tram";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PinDropIcon from "@mui/icons-material/PinDrop";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Navigation Icons
import TurnRightIcon from "@mui/icons-material/TurnRight";
import TurnLeftIcon from "@mui/icons-material/TurnLeft";
import TurnSlightRightIcon from "@mui/icons-material/TurnSlightRight";
import TurnSlightLeftIcon from "@mui/icons-material/TurnSlightLeft";
import StraightIcon from "@mui/icons-material/Straight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";
import UTurnLeftIcon from "@mui/icons-material/UTurnLeft";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ElevatorIcon from "@mui/icons-material/Elevator";
import StartIcon from "@mui/icons-material/Start";

import {
  getLegColor,
  formatDuration,
  getInstructionString,
  getLegStopsWithRealTimes,
} from "../utils/transitUtils";

const getInstructionIcon = (relativeDirection) => {
  const style = { fontSize: 20, color: "#64748b", marginTop: "2px" };
  switch (relativeDirection) {
    case "DEPART":
      return <StartIcon sx={style} />;
    case "HARD_LEFT":
    case "LEFT":
      return <TurnLeftIcon sx={style} />;
    case "SLIGHTLY_LEFT":
    case "SLIGHT_LEFT":
      return <TurnSlightLeftIcon sx={style} />;
    case "CONTINUE":
      return <StraightIcon sx={style} />;
    case "SLIGHTLY_RIGHT":
    case "SLIGHT_RIGHT":
      return <TurnSlightRightIcon sx={style} />;
    case "HARD_RIGHT":
    case "RIGHT":
      return <TurnRightIcon sx={style} />;
    case "CIRCLE_CLOCKWISE":
    case "CIRCLE_COUNTERCLOCKWISE":
      return <RadioButtonUncheckedIcon sx={style} />;
    case "UTURN_LEFT":
      return <UTurnLeftIcon sx={style} />;
    case "UTURN_RIGHT":
      return <UTurnRightIcon sx={style} />;
    case "ELEVATOR":
      return <ElevatorIcon sx={style} />;
    default:
      return <StraightIcon sx={style} />;
  }
};

const LegDetail = ({ leg, isLast, onLegFocus }) => {
  const [expanded, setExpanded] = useState(false);
  const elementRef = useRef(null); // רפרנס לאלמנט לצורך גלילה

  const color = getLegColor(leg);
  const isWalk = leg.mode === "WALK";

  // שליפת הנתונים + בדיקה האם הם משוערים
  const { stops, isEstimated } = useMemo(
    () => getLegStopsWithRealTimes(leg),
    [leg]
  );

  // פונקציה לטיפול בלחיצה על כותרת המקטע
  const handleExpandClick = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // 1. מיקוד המפה על המקטע
    if (onLegFocus) {
      onLegFocus(leg);
    }

    // 2. גלילה אוטומטית
    if (newExpanded && elementRef.current) {
      setTimeout(() => {
        elementRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center", // ממרכז את האלמנט במסך
        });
      }, 300); // דיליי קטן כדי לתת ל-Collapse להיפתח
    }
  };

  const ModeIcon =
    leg.mode === "TRAM"
      ? TramIcon
      : leg.mode === "RAIL"
      ? DirectionsBusIcon
      : isWalk
      ? DirectionsWalkIcon
      : DirectionsBusIcon;

  return (
    <Box ref={elementRef} sx={{ position: "relative", pr: 2, pb: 0 }}>
      {!isLast && (
        <Box
          sx={{
            position: "absolute",
            right: 11,
            top: 30,
            bottom: -10,
            width: 4,
            bgcolor: isWalk ? "#e2e8f0" : color,
            zIndex: 0,
            backgroundImage: isWalk
              ? "linear-gradient(to bottom, #94a3b8 50%, rgba(255,255,255,0) 0%)"
              : "none",
            backgroundSize: isWalk ? "4px 10px" : "auto",
            backgroundRepeat: "repeat-y",
          }}
        />
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            zIndex: 1,
            bgcolor: "white",
            border: `2px solid ${isWalk ? "#94a3b8" : color}`,
            borderRadius: "50%",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 0.5,
          }}
        >
          <ModeIcon sx={{ fontSize: 14, color: isWalk ? "#64748b" : color }} />
        </Box>

        <Box sx={{ flex: 1, pb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {new Date(leg.startTime).toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
          <Typography variant="body1" fontWeight="500">
            {leg.from.name}
          </Typography>

          <Box
            sx={{
              mt: 1,
              bgcolor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                p: 1.5,
                bgcolor: isWalk ? "#f8fafc" : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={handleExpandClick}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                {isWalk ? (
                  <>
                    <DirectionsWalkIcon
                      sx={{ fontSize: 20, color: "#64748b" }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        לך {Math.round(leg.distance)} מ'
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        כ-{Math.round(leg.duration / 60)} דקות
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box
                      sx={{
                        bgcolor: color,
                        color: "white",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: "bold",
                        fontSize: "0.85rem",
                        minWidth: 40,
                        textAlign: "center",
                      }}
                    >
                      {leg.route.shortName}
                    </Box>
                    <Box sx={{ overflow: "hidden" }}>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        לכיוון {leg.route.longName?.split("-")[0] || "היעד"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stops.length} תחנות • {Math.round(leg.duration / 60)}{" "}
                        דק'
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
              <IconButton size="small">
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>

            <Collapse in={expanded}>
              <Divider />
              <Box sx={{ p: 2, bgcolor: "#f8fafc" }}>
                {isWalk ? (
                  <Stack spacing={2}>
                    {leg.steps.map((step, i) => (
                      <Stack
                        key={i}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        {getInstructionIcon(step.relativeDirection)}
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            fontWeight="500"
                          >
                            {getInstructionString(step)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(step.distance)} מ'
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Stack spacing={0}>
                    {/* חיווי זמנים משוערים */}
                    {isEstimated && stops.length > 0 && (
                      <Chip
                        icon={<WarningAmberIcon />}
                        label="זמנים משוערים (אין מידע בזמן אמת)"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ mb: 2, width: "fit-content" }}
                      />
                    )}

                    {stops.map((stop, i) => (
                      <Box
                        key={i}
                        sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            border: "2px solid #cbd5e1",
                            bgcolor: "white",
                            mr: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            width: 40,
                            textAlign: "left",
                            color: "#64748b",
                            fontWeight: "bold",
                          }}
                        >
                          {new Date(stop.arrival).toLocaleTimeString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {stop.name}
                        </Typography>
                      </Box>
                    ))}
                    {stops.length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        לא נמצאו תחנות ביניים
                      </Typography>
                    )}
                  </Stack>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>
      </Stack>

      {isLast && (
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              zIndex: 1,
              bgcolor: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PinDropIcon sx={{ fontSize: 16 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {new Date(leg.endTime).toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {leg.to.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              הגעת ליעד
            </Typography>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default function ItineraryDetails({ itinerary, onBack, onLegFocus }) {
  if (!itinerary) return null;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f3f4f6",
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: "white",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <IconButton onClick={onBack} size="small" sx={{ bgcolor: "#f1f5f9" }}>
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="h6" lineHeight={1.2}>
            פירוט מסלול
          </Typography>
          <Typography variant="caption" color="text.secondary">
            משך כולל: {formatDuration(itinerary.duration)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 2 }}>
        {itinerary.legs.map((leg, index) => (
          <LegDetail
            key={index}
            leg={leg}
            isLast={index === itinerary.legs.length - 1}
            onLegFocus={onLegFocus} // העברת הפונקציה לילד
          />
        ))}
      </Box>
    </Box>
  );
}
