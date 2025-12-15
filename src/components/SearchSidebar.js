import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import {
  Box,
  Typography,
  Stack,
  Autocomplete,
  TextField,
  IconButton,
  Button,
  Divider,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Paper,
  CircularProgress,
  Chip,
} from "@mui/material";

// --- אייקונים ---
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import PlaceIcon from "@mui/icons-material/Place";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import DirectionsOffIcon from "@mui/icons-material/DirectionsOff";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TrainIcon from "@mui/icons-material/Train";
import TramIcon from "@mui/icons-material/Tram";
import LocalTaxiIcon from "@mui/icons-material/LocalTaxi";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import UpdateIcon from "@mui/icons-material/Update";
import EventIcon from "@mui/icons-material/Event";
import LastPageIcon from "@mui/icons-material/LastPage";

// --- אייקונים POI ---
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SchoolIcon from "@mui/icons-material/School";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ParkIcon from "@mui/icons-material/Park";
import HotelIcon from "@mui/icons-material/Hotel";

import { fetchAllRoutes } from "../services/schedulesService";

// --- פונקציות עזר (ללא שינוי) ---
const getAgencyColor = (agencyName) => {
  if (!agencyName) return "#64748b";
  const op = agencyName.trim();
  if (op.includes("אגד")) return "#009640";
  if (op.includes("דן")) return "#005EB8";
  if (op.includes("מטרופולין")) return "#F7941D";
  if (op.includes("קווים")) return "#3F2A55";
  if (op.includes("רכבת ישראל")) return "#1C3F94";
  if (op.includes("תבל") || op.includes("כפיר")) return "#E31B23";
  if (op.includes("אלקטרה") || op.includes("אפיקים")) return "#008C95";
  return "#0e2a5a";
};

const getTransportIcon = (mode, color = "inherit") => {
  switch (mode) {
    case "RAIL":
      return <TrainIcon sx={{ color }} />;
    case "TRAM":
      return <TramIcon sx={{ color }} />;
    case "SUBWAY":
      return <TramIcon sx={{ color }} />;
    case "Gondola":
      return <LocalTaxiIcon sx={{ color }} />;
    default:
      return <DirectionsBusIcon sx={{ color }} />;
  }
};

const getLocationIcon = (option) => {
  if (option.type === "STOP") return <DirectionsBusIcon color="action" />;
  switch (option.category) {
    case "H":
      return <LocalHospitalIcon color="error" />;
    case "E":
      return <SchoolIcon color="primary" />;
    case "S":
      return <ShoppingCartIcon color="secondary" />;
    case "G":
      return <AccountBalanceIcon color="action" />;
    case "L":
      return <ParkIcon color="success" />;
    case "T":
      return <HotelIcon color="warning" />;
    default:
      return <PlaceIcon color="action" />;
  }
};

const getOptionKey = (option) => {
  if (option.id) return `${option.type}_${option.id}`;
  return `${option.type}_${option.lat}_${option.lon}_${option.name}`;
};

const TIME_MODES = {
  NOW: { label: "יוצא עכשיו", value: "NOW", arriveBy: false },
  DEPART: { label: "שעת יציאה עתידית", value: "DEPART", arriveBy: false },
  ARRIVE: { label: "שעת הגעה רצויה", value: "ARRIVE", arriveBy: true },
  LAST: { label: "הקו האחרון להיום", value: "LAST", arriveBy: false },
};

const normalizeRouteName = (longName) => {
  if (!longName) return "";
  const parts = longName.split(/<->|↔|-/);
  return parts
    .map((p) => p.trim())
    .sort()
    .join(" ↔ ");
};

export default function SearchSidebar({
  fromLoc,
  setFromLoc,
  fromInputValue,
  setFromInputValue,
  fromOptions,
  setFromOptions,
  toLoc,
  setToLoc,
  toInputValue,
  setToInputValue,
  toOptions,
  setToOptions,
  onInputChange,
  handleSelectLocation,
  favorites,
  toggleFavorite,
  isFav,
  date,
  setDate,
  time,
  setTime,
  setArriveBy,
  walkReluctance,
  setWalkReluctance,
  transferReluctance,
  setTransferReluctance,
  handleSearch,
  loading,
  hasResults,
  searchError,
  children,
  onLineScheduleRequest,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [timeMode, setTimeMode] = useState(TIME_MODES.NOW);
  const [anchorEl, setAnchorEl] = useState(null);

  // --- ניהול קווים ---
  const [allLines, setAllLines] = useState([]);
  const [lineSearchQuery, setLineSearchQuery] = useState("");
  const deferredLineQuery = useDeferredValue(lineSearchQuery); // אופטימיזציה לחיפוש קווים
  const [loadingLines, setLoadingLines] = useState(false);

  // --- ניהול חיפוש מסלול (אופטימיזציה חדשה) ---
  // אנחנו יוצרים סטייט מקומי כדי שההקלדה תהיה מיידית, ולא תלויה בחיפוש הכבד
  const [localFromInput, setLocalFromInput] = useState(fromInputValue || "");
  const [localToInput, setLocalToInput] = useState(toInputValue || "");

  // יצירת ערכים מושהים (Deferred) לחיפוש
  const deferredFromInput = useDeferredValue(localFromInput);
  const deferredToInput = useDeferredValue(localToInput);

  // סנכרון התחלתי (למקרה שהערך מגיע מבחוץ, למשל מלחיצה על מועדפים)
  useEffect(() => {
    setLocalFromInput(fromInputValue || "");
  }, [fromInputValue]);
  useEffect(() => {
    setLocalToInput(toInputValue || "");
  }, [toInputValue]);

  // --- אפקט החיפוש הכבד (From) ---
  // ירוץ רק כשהמשתמש מפסיק להקליד לרגע והערך המושהה מתעדכן
  useEffect(() => {
    // קריאה לפונקציית החיפוש המקורית (של ההורה)
    // אנחנו מעבירים את הערך המושהה כדי לבצע את החיפוש בפועל
    if (deferredFromInput !== fromInputValue) {
      // מונע לופים מיותרים
      onInputChange(
        deferredFromInput,
        setFromOptions,
        setFromInputValue,
        fromLoc,
        setFromLoc
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredFromInput]);

  // --- אפקט החיפוש הכבד (To) ---
  useEffect(() => {
    if (deferredToInput !== toInputValue) {
      onInputChange(
        deferredToInput,
        setToOptions,
        setToInputValue,
        toLoc,
        setToLoc
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredToInput]);

  const openTimeMenu = Boolean(anchorEl);
  const showTimeControls = (fromLoc && toLoc) || hasResults || searchError;

  const getCurrentDate = () => new Date().toISOString().split("T")[0];
  const getCurrentTime = () =>
    new Date().toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  // טעינת קווים
  useEffect(() => {
    if (activeTab === 1 && allLines.length === 0) {
      setLoadingLines(true);
      fetchAllRoutes()
        .then((data) => setAllLines(data || []))
        .catch((err) => console.error(err))
        .finally(() => setLoadingLines(false));
    }
  }, [activeTab, allLines.length]);

  // איחוד קווים (כבד) - רץ פעם אחת
  const uniqueLines = useMemo(() => {
    if (allLines.length === 0) return [];
    const groupedMap = new Map();
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const normalizedName = normalizeRouteName(line.longName);
      const uniqueKey = `${line.shortName}-${line.agencyName}-${normalizedName}`;

      if (!groupedMap.has(uniqueKey)) {
        groupedMap.set(uniqueKey, {
          ...line,
          normalizedName: normalizedName,
          allIds: [line.id],
        });
      } else {
        groupedMap.get(uniqueKey).allIds.push(line.id);
      }
    }
    return Array.from(groupedMap.values());
  }, [allLines]);

  // סינון קווים (קל) עם הערך המושהה
  const filteredLines = useMemo(() => {
    if (!deferredLineQuery) return uniqueLines.slice(0, 50);
    const q = deferredLineQuery.toLowerCase();
    return uniqueLines
      .filter(
        (line) =>
          (line.shortName && line.shortName.toLowerCase().includes(q)) ||
          (line.longName && line.longName.includes(q)) ||
          (line.agencyName && line.agencyName.includes(q))
      )
      .slice(0, 50);
  }, [deferredLineQuery, uniqueLines]);

  // Event Handlers
  const handleTimeMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleTimeMenuClose = () => setAnchorEl(null);
  const handleSelectTimeMode = (modeKey) => {
    const mode = TIME_MODES[modeKey];
    setTimeMode(mode);
    if (setArriveBy) setArriveBy(mode.arriveBy);
    if (modeKey === "NOW") {
      setDate(getCurrentDate());
      setTime(getCurrentTime());
    }
    handleTimeMenuClose();
  };
  const handleTabChange = (event, newValue) => setActiveTab(newValue);
  const onSearchClick = () => {
    if (timeMode.value === "NOW") {
      setDate(getCurrentDate());
      setTime(getCurrentTime());
    }
    handleSearch();
  };
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    if (newDate === getCurrentDate() && time < getCurrentTime())
      setTime(getCurrentTime());
  };
  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    if (date === getCurrentDate() && newTime < getCurrentTime())
      setTime(getCurrentTime());
    else setTime(newTime);
  };
  const handleLineClick = (line) => {
    if (onLineScheduleRequest) onLineScheduleRequest(line);
  };

  const shouldShowPickers =
    timeMode.value === "DEPART" || timeMode.value === "ARRIVE";
  const isToday = date === getCurrentDate();

  return (
    <Box
      sx={{
        bgcolor: "white",
        borderBottom: "1px solid #e0e0e0",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="תכנון מסלול" />
          <Tab label="קווים" />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, pb: 12 }}>
        {activeTab === 0 && (
          <Stack spacing={2}>
            {/* שדות חיפוש עם אופטימיזציה */}
            <Stack direction="row" spacing={1}>
              <Autocomplete
                fullWidth
                freeSolo
                options={fromOptions}
                // שימוש בסטייט המקומי המהיר
                inputValue={localFromInput}
                isOptionEqualToValue={(o, v) =>
                  o.lat === v.lat && o.lon === v.lon
                }
                // עדכון מיידי של הסטייט המקומי בלבד
                onInputChange={(e, val) => setLocalFromInput(val)}
                onChange={(e, val) => {
                  // בחירה בפריט מהרשימה מתעדכנת מיד
                  setLocalFromInput(val?.name || "");
                  handleSelectLocation(val, setFromLoc, setFromInputValue);
                }}
                getOptionLabel={(o) => o.name || ""}
                renderOption={(props, option) => {
                  const uniqueKey = getOptionKey(option);
                  return (
                    <li {...props} key={uniqueKey}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ width: "100%" }}
                      >
                        {getLocationIcon(option)}
                        <Typography variant="body1" noWrap>
                          {option.name}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="מוצא" size="small" />
                )}
              />
              <IconButton
                onClick={() => toggleFavorite(fromLoc)}
                color={isFav(fromLoc, localFromInput) ? "warning" : "default"}
              >
                {isFav(fromLoc, localFromInput) ? (
                  <StarIcon />
                ) : (
                  <StarBorderIcon />
                )}
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Autocomplete
                fullWidth
                freeSolo
                options={toOptions}
                // שימוש בסטייט המקומי המהיר
                inputValue={localToInput}
                isOptionEqualToValue={(o, v) =>
                  o.lat === v.lat && o.lon === v.lon
                }
                // עדכון מיידי של הסטייט המקומי בלבד
                onInputChange={(e, val) => setLocalToInput(val)}
                onChange={(e, val) => {
                  setLocalToInput(val?.name || "");
                  handleSelectLocation(val, setToLoc, setToInputValue);
                }}
                getOptionLabel={(o) => o.name || ""}
                renderOption={(props, option) => {
                  const uniqueKey = getOptionKey(option);
                  return (
                    <li {...props} key={uniqueKey}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ width: "100%" }}
                      >
                        {getLocationIcon(option)}
                        <Typography variant="body1" noWrap>
                          {option.name}
                        </Typography>
                      </Stack>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField {...params} label="יעד" size="small" />
                )}
              />
              <IconButton
                onClick={() => toggleFavorite(toLoc)}
                color={isFav(toLoc, localToInput) ? "warning" : "default"}
              >
                {isFav(toLoc, localToInput) ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Stack>

            {favorites.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  overflowX: "auto",
                  py: 0.5,
                  pb: 1,
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {favorites.map((fav, i) => (
                  <Box
                    key={i}
                    // שימוש בפונקציה שמעדכנת גם את הסטייט המקומי
                    onClick={() => {
                      const targetSetLoc = !fromLoc ? setFromLoc : setToLoc;
                      const targetSetInput = !fromLoc
                        ? setLocalFromInput
                        : setLocalToInput; // עדכון מקומי
                      const targetSetGlobalInput = !fromLoc
                        ? setFromInputValue
                        : setToInputValue; // עדכון גלובלי

                      // עדכון ה-UI מיד
                      targetSetInput(fav.name);
                      // עדכון הלוגיקה
                      handleSelectLocation(
                        fav,
                        targetSetLoc,
                        targetSetGlobalInput
                      );
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      pl: 1,
                      pr: 1.5,
                      py: 0.5,
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "white",
                      cursor: "pointer",
                      minWidth: "fit-content",
                      "&:hover": { bgcolor: "#f8fafc" },
                    }}
                  >
                    <BookmarkBorderIcon
                      sx={{ fontSize: 16, color: "#64748b" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#334155",
                        fontSize: "0.75rem",
                      }}
                    >
                      {fav.name.split(" - ")[0]}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {showTimeControls && (
              <Box sx={{ mt: 1 }}>
                <Box
                  onClick={handleTimeMenuClick}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "#f1f5f9",
                    p: 1,
                    borderRadius: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "#e2e8f0" },
                  }}
                >
                  <AccessTimeIcon color="action" sx={{ mr: 1 }} />
                  <Typography
                    variant="body2"
                    sx={{ flexGrow: 1, fontWeight: 500 }}
                  >
                    {timeMode.label}
                  </Typography>
                  <KeyboardArrowDownIcon color="action" />
                </Box>
                <Menu
                  anchorEl={anchorEl}
                  open={openTimeMenu}
                  onClose={handleTimeMenuClose}
                  PaperProps={{
                    sx: { width: anchorEl ? anchorEl.clientWidth : undefined },
                  }}
                >
                  <MenuItem onClick={() => handleSelectTimeMode("NOW")}>
                    <ListItemIcon>
                      <UpdateIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>יוצא עכשיו</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectTimeMode("DEPART")}>
                    <ListItemIcon>
                      <EventIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>שעת יציאה עתידית</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectTimeMode("ARRIVE")}>
                    <ListItemIcon>
                      <EventIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>שעת הגעה רצויה</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectTimeMode("LAST")}>
                    <ListItemIcon>
                      <LastPageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>הקו האחרון להיום</ListItemText>
                  </MenuItem>
                </Menu>

                {shouldShowPickers && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <TextField
                      type="date"
                      size="small"
                      value={date}
                      onChange={handleDateChange}
                      fullWidth
                      inputProps={{ min: getCurrentDate() }}
                    />
                    <TextField
                      type="time"
                      size="small"
                      value={time}
                      onChange={handleTimeChange}
                      fullWidth
                      inputProps={{
                        min: isToday ? getCurrentTime() : undefined,
                      }}
                    />
                  </Stack>
                )}

                <Stack
                  spacing={1}
                  sx={{
                    bgcolor: "#f8fafc",
                    p: 1.5,
                    borderRadius: 2,
                    mt: 1,
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <EmojiPeopleIcon color="action" fontSize="small" />
                      <Typography variant="body2" fontWeight="bold">
                        סובלנות להליכה
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "#e2e8f0",
                        borderRadius: 20,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setWalkReluctance(Math.max(1, walkReluctance - 1))
                        }
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        sx={{
                          mx: 1,
                          fontWeight: "bold",
                          minWidth: 15,
                          textAlign: "center",
                        }}
                      >
                        {walkReluctance}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setWalkReluctance(Math.min(10, walkReluctance + 1))
                        }
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>
                  <Divider />
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TransferWithinAStationIcon
                        color="action"
                        fontSize="small"
                      />
                      <Typography variant="body2" fontWeight="bold">
                        סובלנות להחלפות
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "#e2e8f0",
                        borderRadius: 20,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          setTransferReluctance(
                            Math.max(1, transferReluctance - 1)
                          )
                        }
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        sx={{
                          mx: 1,
                          fontWeight: "bold",
                          minWidth: 15,
                          textAlign: "center",
                        }}
                      >
                        {transferReluctance}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setTransferReluctance(
                            Math.min(10, transferReluctance + 1)
                          )
                        }
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
            )}

            <Button
              variant="contained"
              onClick={onSearchClick}
              disabled={loading || !fromLoc || !toLoc}
              size="large"
              sx={{ borderRadius: 2, mt: 1 }}
            >
              {loading ? "מחשב..." : "חפש מסלול"}
            </Button>

            {searchError && !loading && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <DirectionsOffIcon
                  sx={{ fontSize: 60, color: "#cbd5e1", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  לא נמצא מסלול
                </Typography>
              </Box>
            )}
            {children}
          </Stack>
        )}

        {/* --- טאב קווים --- */}
        {activeTab === 1 && (
          <Box dir="rtl">
            <TextField
              fullWidth
              placeholder="חפש קו..."
              value={lineSearchQuery}
              onChange={(e) => setLineSearchQuery(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {loadingLines ? (
              <Box sx={{ textAlign: "center", mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredLines.map((line) => {
                  const agencyColor = getAgencyColor(line.agencyName);
                  return (
                    <Paper
                      key={line.id}
                      elevation={0}
                      onClick={() => handleLineClick(line)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1.5,
                        cursor: "pointer",
                        border: "1px solid #f1f5f9",
                        borderRadius: 3,
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: "#f8fafc",
                          borderColor: "#cbd5e1",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          ml: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: agencyColor,
                            color: "white",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          {getTransportIcon(line.mode, "white")}
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "bold", mt: -0.5 }}
                          >
                            {line.shortName}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{ flex: 1, overflow: "hidden", textAlign: "right" }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, color: "#1e293b" }}
                        >
                          {line.agencyName}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ fontSize: "0.85rem" }}
                        >
                          {line.normalizedName || line.longName}
                        </Typography>
                        {line.allIds.length > 1 && (
                          <Chip
                            label="מסלול דו-כיווני"
                            size="small"
                            sx={{ mt: 0.5, height: 20, fontSize: "0.65rem" }}
                          />
                        )}
                      </Box>
                      <ChevronLeftIcon
                        color="action"
                        fontSize="small"
                        sx={{ transform: "rotate(180deg)" }}
                      />
                    </Paper>
                  );
                })}
                {filteredLines.length === 0 && !loadingLines && (
                  <Box sx={{ textAlign: "center", mt: 4, opacity: 0.6 }}>
                    <Typography variant="body2">לא נמצאו קווים</Typography>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
