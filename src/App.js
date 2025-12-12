import React, { useState, useEffect, useMemo, useRef } from "react";
import Map, {
  NavigationControl,
  Marker,
  Source,
  Layer,
  Popup,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardActionArea,
  TextField,
  IconButton,
  Autocomplete,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { request, gql } from "graphql-request";
import polyline from "@mapbox/polyline";

// Services
import {
  loadStopsData,
  searchLocation,
  getStopsGeoJson,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./services/searchService";
import StationDialog from "./components/StationDialog";

// Icons
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TramIcon from "@mui/icons-material/Tram";
import TrainIcon from "@mui/icons-material/Train";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CurrencyShekelIcon from "@mui/icons-material/MonetizationOn";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HomeIcon from "@mui/icons-material/Home";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation"; // אייקון להחלפות

// --- הגדרת מפה ---
let protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
  null,
  true
);

const OTP_URL = "http://localhost:8080/otp/routers/default/index/graphql";

const lightTheme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: { main: "#2563eb" },
    secondary: { main: "#f50057" },
    background: { default: "#f1f5f9", paper: "#ffffff" },
  },
  typography: { fontFamily: "Rubik, sans-serif" },
  shape: { borderRadius: 12 },
});

const MAP_STYLE_OFFLINE = {
  version: 8,
  sources: {
    protomaps: {
      type: "vector",
      url: "pmtiles://israel.pmtiles",
      attribution: "OpenStreetMap",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#eef2f6" },
    },
    {
      id: "water",
      source: "protomaps",
      "source-layer": "water",
      type: "fill",
      paint: { "fill-color": "#a5bfdd" },
    },
    {
      id: "buildings",
      source: "protomaps",
      "source-layer": "buildings",
      type: "fill",
      paint: { "fill-color": "#d1d5db" },
    },
    {
      id: "roads",
      source: "protomaps",
      "source-layer": "roads",
      type: "line",
      paint: { "line-color": "#ffffff", "line-width": 1.5 },
    },
    {
      id: "places",
      source: "protomaps",
      "source-layer": "places",
      type: "symbol",
      layout: { "text-field": "{name:latin}", "text-size": 12 },
      paint: { "text-color": "#000" },
    },
  ],
};
const MAP_STYLE_ONLINE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// --- מנוע חישוב עלויות ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const deg2rad = (deg) => deg * (Math.PI / 180);

const getLegPrice = (mode, distKm) => {
  if (mode === "RAIL") {
    if (distKm <= 15) return 11.5;
    if (distKm <= 40) return 21.0;
    if (distKm <= 75) return 27.0;
    if (distKm <= 120) return 30.5;
    if (distKm <= 225) return 52.5;
    return 74.0;
  } else {
    if (distKm <= 15) return 8.0;
    if (distKm <= 40) return 14.5;
    if (distKm <= 120) return 19.0;
    if (distKm <= 225) return 30.5;
    return 74.0;
  }
};

// פונקציה שמחזירה צבע ייחודי לכל קו
const getLegColor = (leg) => {
  if (leg.mode === "WALK") return "#9ca3af"; // אפור להליכה

  // 1. אם יש צבע מקורי מה-GTFS, נשתמש בו
  if (leg.route?.color) {
    return `#${leg.route.color}`;
  }

  // 2. אם אין, נייצר צבע עקבי לפי מספר הקו (Hash)
  const colors = [
    "#ef4444", // אדום
    "#f97316", // כתום
    "#f59e0b", // ענבר
    "#84cc16", // ליים
    "#10b981", // ירוק
    "#06b6d4", // טורקיז
    "#3b82f6", // כחול
    "#6366f1", // אינדיגו
    "#8b5cf6", // סגול
    "#d946ef", // מגנטה
    "#f43f5e", // ורוד
  ];

  const name = leg.route?.shortName || leg.mode;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // בוחר צבע מהרשימה לפי המספר שיצא
  return colors[Math.abs(hash) % colors.length];
};

const calculateTotalFare = (legs) => {
  let totalPrice = 0;
  let activeTicket = null;
  for (let leg of legs) {
    if (leg.mode === "WALK") continue;
    const distKm = (leg.distance || 0) / 1000;
    const price = getLegPrice(leg.mode, distKm);
    if ((leg.mode === "BUS" || leg.mode === "TRAM") && distKm <= 15) {
      let isFreeTransfer = false;
      if (activeTicket) {
        const timeDiffMinutes =
          (leg.startTime - activeTicket.startTime) / 60000;
        const distFromOrigin = getDistanceFromLatLonInKm(
          activeTicket.originLat,
          activeTicket.originLon,
          leg.from.lat,
          leg.from.lon
        );
        if (timeDiffMinutes <= 90 && distFromOrigin <= 15)
          isFreeTransfer = true;
      }
      if (!isFreeTransfer) {
        totalPrice += price;
        activeTicket = {
          startTime: leg.startTime,
          originLat: leg.from.lat,
          originLon: leg.from.lon,
        };
      }
    } else {
      totalPrice += price;
    }
  }
  return totalPrice;
};

const formatDuration = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} דק'`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0
    ? `${hours} שע' ו-${remainingMins} דק'`
    : `${hours} שעות`;
};

// --- עדכון לוגיקת פורמט הזמנים ---
const getDepartureStrings = (startTime) => {
  const now = new Date();
  const departure = new Date(startTime);
  const diff = Math.floor((departure - now) / 60000);

  // פורמט שעה (למשל 14:30)
  const timeString = departure.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diff < 0) return { text: "יצא", color: "grey" };
  if (diff === 0) return { text: "עכשיו", color: "#d32f2f" }; // אדום

  // מעל 59 דקות
  if (diff > 59) {
    return { text: `צא ב-${timeString}`, color: "grey" }; // אפור
  }

  // מתחת ל-5 דקות
  if (diff <= 5) {
    return { text: `בעוד ${diff} דק'`, color: "#d32f2f" }; // אדום
  }

  // מעל 15 דקות (ובין 59)
  if (diff > 15) {
    return { text: `בעוד ${diff} דק'`, color: "grey" }; // אפור
  }

  // ברירת מחדל (בין 5 ל-15 דקות) - ירוק/רגיל
  return { text: `בעוד ${diff} דק'`, color: "#2e7d32" }; // ירוק
};

// --- קומפוננטה ראשית ---
function App() {
  const mapRef = useRef(null);

  // View State
  const [viewState, setViewState] = useState({
    longitude: 34.7818,
    latitude: 32.0853,
    zoom: 14,
  });
  const [fromLoc, setFromLoc] = useState(null);
  const [toLoc, setToLoc] = useState(null);
  const [fromInputValue, setFromInputValue] = useState("");
  const [toInputValue, setToInputValue] = useState("");
  const [fromOptions, setFromOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Results State
  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [walkReluctance, setWalkReluctance] = useState(2); // 1-10 (הליכה)
  const [transferReluctance, setTransferReluctance] = useState(2); // 1-10 (החלפות) - חדש!

  // UI State
  const [stopsGeoJson, setStopsGeoJson] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));

  // Init
  useEffect(() => {
    loadStopsData().then(() => {
      setTimeout(() => setStopsGeoJson(getStopsGeoJson()), 500);
    });
    setFavorites(getFavorites());
  }, []);

  // Map Helpers
  const flyToLocation = (loc) => {
    if (mapRef.current && loc && !isNaN(loc.lat) && !isNaN(loc.lon)) {
      mapRef.current.flyTo({
        center: [loc.lon, loc.lat],
        zoom: 16,
        speed: 1.5,
      });
    }
  };

  const handleItineraryClick = (index) => {
    setSelectedItineraryIndex(index);
    const itin = itineraries[index];
    if (itin && mapRef.current) {
      const allPoints = itin.legs.flatMap((leg) => {
        const decoded = polyline.decode(leg.legGeometry.points);
        return decoded.map((p) => [p[1], p[0]]);
      });
      if (allPoints.length > 0) {
        const bounds = allPoints.reduce(
          (bounds, coord) => bounds.extend(coord),
          new maplibregl.LngLatBounds(allPoints[0], allPoints[0])
        );
        mapRef.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 450, right: 50 },
          duration: 1500,
        });
      }
    }
  };

  const onInputChange = async (
    value,
    setOptions,
    setInputVal,
    currentLoc,
    setLoc
  ) => {
    setInputVal(value);
    if (!value) {
      setLoc(null);
      setOptions([]);
      return;
    }
    const res = await searchLocation(value);
    setOptions(res);
  };

  const handleSelectLocation = (val, setLoc, setInputVal) => {
    if (val && !isNaN(val.lat)) {
      setLoc(val);
      setInputVal(val.name);
      flyToLocation(val);
    }
  };

  const toggleFavorite = (loc) => {
    if (!loc) return;
    const exists = favorites.find((f) => f.name === loc.name);
    let newFavs;
    if (exists) newFavs = removeFavorite(loc);
    else newFavs = addFavorite(loc);
    setFavorites(newFavs);
  };

  const isFav = (loc, inputVal) =>
    loc && favorites.some((f) => f.name === loc.name) && loc.name === inputVal;

  const handleSearch = async () => {
    if (!fromLoc || !toLoc) return;
    setLoading(true);
    setItineraries([]);
    setSelectedItineraryIndex(null);

    // --- חישוב עונשים ---
    // הליכה: ככל שהמספר גבוה, נמנע יותר
    const walkPenalty = walkReluctance * 4;

    // החלפות: אנו משתמשים ב-waitReluctance כדי למנוע החלפות
    // החלפה תמיד דורשת המתנה. אם נגיד לו שאנחנו שונאים להמתין (ציון גבוה), הוא יעדיף קו ישיר.
    const waitPenalty = transferReluctance * 3.5;

    // מרחק מקסימלי
    const maxWalk = walkReluctance > 7 ? 400 : walkReluctance > 4 ? 1200 : 3500;

    const query = gql`
      query {
        plan(
          from: { lat: ${fromLoc.lat}, lon: ${fromLoc.lon} }
          to: { lat: ${toLoc.lat}, lon: ${toLoc.lon} }
          date: "${date}" 
          time: "${time}"
          numItineraries: 5  
          transportModes: [{mode: BUS}, {mode: TRAM}, {mode: RAIL}, {mode: WALK}]
          
          walkReluctance: ${walkPenalty}
          waitReluctance: ${waitPenalty}    # הוספנו את פרמטר ההמתנה/החלפות
          maxWalkDistance: ${maxWalk}
        ) {
          itineraries {
            duration startTime endTime
            legs {
              mode duration startTime distance 
              from { name lat lon } to { name lat lon }
              route { shortName agency { name } }
              legGeometry { points } 
            }
          }
        }
      }
    `;

    try {
      const data = await request(OTP_URL, query);
      if (data.plan?.itineraries) setItineraries(data.plan.itineraries);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleMapClick = (e) => {
    if (
      e.features &&
      e.features.length > 0 &&
      e.features[0].layer.id === "stops-layer"
    ) {
      const p = e.features[0].properties;
      const coords = e.features[0].geometry.coordinates;
      setSelectedStop({
        name: p.name,
        code: p.code,
        lat: coords[1],
        lon: coords[0],
      });
      setIsScheduleOpen(true);
      return;
    }
    const { lng, lat } = e.lngLat;
    if (isNaN(lng) || isNaN(lat)) return;
    const clickedLoc = { lat, lon: lng, name: "נקודה במפה" };

    if (!fromLoc) {
      setFromLoc(clickedLoc);
      setFromInputValue("נקודה במפה");
      flyToLocation(clickedLoc);
    } else if (!toLoc) {
      setToLoc(clickedLoc);
      setToInputValue("נקודה במפה");
      flyToLocation(clickedLoc);
    } else {
      setFromLoc(clickedLoc);
      setFromInputValue("נקודה במפה");
      setToLoc(null);
      setToInputValue("");
      setItineraries([]);
      flyToLocation(clickedLoc);
    }
  };

  const routeGeoJson = useMemo(() => {
    if (selectedItineraryIndex === null || !itineraries[selectedItineraryIndex])
      return null;
    return {
      type: "FeatureCollection",
      features: itineraries[selectedItineraryIndex].legs.map((leg) => ({
        type: "Feature",
        properties: {
          // --- השינוי כאן: קריאה לפונקציה החדשה ---
          color: getLegColor(leg),
        },
        geometry: {
          type: "LineString",
          coordinates: polyline
            .decode(leg.legGeometry.points)
            .map((pt) => [pt[1], pt[0]]),
        },
      })),
    };
  }, [itineraries, selectedItineraryIndex]);

  return (
    <ThemeProvider theme={lightTheme}>
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
        }}
        dir="rtl"
      >
        {/* Sidebar */}
        <Paper
          elevation={4}
          style={{
            width: "420px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            borderRadius: 0,
          }}
        >
          <Box
            sx={{ p: 2, bgcolor: "white", borderBottom: "1px solid #e0e0e0" }}
          >
            <Typography
              variant="h6"
              color="primary"
              sx={{ fontWeight: "bold", mb: 2 }}
            >
              מוביטופ - זמני תחבורה אופליין
            </Typography>

            <Stack spacing={2}>
              {/* Inputs */}
              <Stack direction="row" spacing={1}>
                <Autocomplete
                  fullWidth
                  freeSolo
                  options={fromOptions}
                  inputValue={fromInputValue}
                  onInputChange={(e, val) =>
                    onInputChange(
                      val,
                      setFromOptions,
                      setFromInputValue,
                      fromLoc,
                      setFromLoc
                    )
                  }
                  onChange={(e, val) =>
                    handleSelectLocation(val, setFromLoc, setFromInputValue)
                  }
                  getOptionLabel={(o) => o.name || ""}
                  renderInput={(params) => (
                    <TextField {...params} label="מוצא" size="small" />
                  )}
                />
                <IconButton
                  onClick={() => toggleFavorite(fromLoc)}
                  color={isFav(fromLoc, fromInputValue) ? "warning" : "default"}
                >
                  {isFav(fromLoc, fromInputValue) ? (
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
                  inputValue={toInputValue}
                  onInputChange={(e, val) =>
                    onInputChange(
                      val,
                      setToOptions,
                      setToInputValue,
                      toLoc,
                      setToLoc
                    )
                  }
                  onChange={(e, val) =>
                    handleSelectLocation(val, setToLoc, setToInputValue)
                  }
                  getOptionLabel={(o) => o.name || ""}
                  renderInput={(params) => (
                    <TextField {...params} label="יעד" size="small" />
                  )}
                />
                <IconButton
                  onClick={() => toggleFavorite(toLoc)}
                  color={isFav(toLoc, toInputValue) ? "warning" : "default"}
                >
                  {isFav(toLoc, toInputValue) ? (
                    <StarIcon />
                  ) : (
                    <StarBorderIcon />
                  )}
                </IconButton>
              </Stack>

              {/* Favorites */}
              {favorites.length > 0 && !itineraries.length && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ overflowX: "auto", pb: 1 }}
                >
                  {favorites.map((fav, i) => (
                    <Chip
                      key={i}
                      icon={<HomeIcon fontSize="small" />}
                      label={fav.name}
                      onClick={() => {
                        if (!fromLoc)
                          handleSelectLocation(
                            fav,
                            setFromLoc,
                            setFromInputValue
                          );
                        else
                          handleSelectLocation(fav, setToLoc, setToInputValue);
                      }}
                      size="small"
                    />
                  ))}
                </Stack>
              )}

              <Stack direction="row" spacing={1}>
                <TextField
                  type="date"
                  size="small"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                />
                <TextField
                  type="time"
                  size="small"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  fullWidth
                />
              </Stack>

              {/* Sliders Container */}
              <Stack
                spacing={1}
                sx={{ bgcolor: "#f1f5f9", p: 1.5, borderRadius: 2 }}
              >
                {/* Walk Slider */}
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

                {/* Transfer Slider (New!) */}
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

              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                size="large"
                sx={{ borderRadius: 2 }}
              >
                {loading ? "מחשב..." : "חפש מסלול"}
              </Button>
            </Stack>
          </Box>

          {/* Results */}
          <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#f3f4f6", p: 1.5 }}>
            {itineraries.map((itin, index) => {
              const isSelected = index === selectedItineraryIndex;
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
                    onClick={() => handleItineraryClick(index)}
                    sx={{ p: 2 }}
                  >
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
                        <CurrencyShekelIcon
                          sx={{ fontSize: 14, color: "#0288d1" }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="#0288d1"
                        >
                          {price.toFixed(1)}
                        </Typography>
                      </Stack>
                    </Stack>

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
                                border: `1px solid ${getLegColor(leg)}`, // מסגרת בצבע הקו
                                borderRadius: 1,
                                bgcolor: "white",
                                height: 24,
                                overflow: "hidden",
                              }}
                            >
                              {/* החלק הצבוע בצד ימין */}
                              <Box
                                sx={{
                                  bgcolor: getLegColor(leg), // מילוי בצבע הקו
                                  width: 6, // פס צבע עבה יותר שיראו אותו
                                  height: "100%",
                                }}
                              />

                              {/* הטקסט והאייקון */}
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

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <ScheduleIcon
                        sx={{ fontSize: 16, color: departureInfo.color }}
                      />
                      <span
                        style={{
                          color: departureInfo.color,
                          fontWeight: "bold",
                        }}
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
        </Paper>

        <div style={{ flex: 1, position: "relative" }}>
          <Map
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle={MAP_STYLE_ONLINE}
            interactiveLayerIds={["stops-layer"]}
            onClick={handleMapClick}
            onMouseEnter={() => (document.body.style.cursor = "pointer")}
            onMouseLeave={() => (document.body.style.cursor = "")}
          >
            <NavigationControl position="top-right" />
            {stopsGeoJson && (
              <Source id="stops-source" type="geojson" data={stopsGeoJson}>
                <Layer
                  id="stops-layer"
                  type="circle"
                  minzoom={14}
                  paint={{
                    "circle-radius": 6,
                    "circle-color": "#fff",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#64748b",
                  }}
                />
              </Source>
            )}
            {fromLoc && (
              <Marker
                longitude={fromLoc.lon}
                latitude={fromLoc.lat}
                color="#10b981"
              />
            )}
            {toLoc && (
              <Marker
                longitude={toLoc.lon}
                latitude={toLoc.lat}
                color="#ef4444"
              />
            )}
            {routeGeoJson && (
              <Source id="route-source" type="geojson" data={routeGeoJson}>
                <Layer
                  id="route-layer"
                  type="line"
                  paint={{
                    "line-width": 5,
                    "line-color": ["get", "color"],
                    "line-opacity": 0.8,
                  }}
                />
              </Source>
            )}
          </Map>
        </div>
        <StationDialog
          open={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          stop={selectedStop}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
