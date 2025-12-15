import React, { useState, useEffect, useMemo, useRef } from "react";
import Map, {
  NavigationControl,
  Marker,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { Paper, ThemeProvider, createTheme, Box } from "@mui/material";
import { request, gql } from "graphql-request";
import polyline from "@mapbox/polyline";

// Imports - Services & Utils
import {
  loadStopsData,
  searchLocation,
  getStopsGeoJson,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./services/searchService";
import { getLegColor, getLegStopsWithRealTimes } from "./utils/transitUtils";

// Imports - Components
import StationDialog from "./components/StationDialog";
import SearchSidebar from "./components/SearchSidebar";
import ResultsList from "./components/ResultsList";
import Footer from "./components/Footer";
import ItineraryDetails from "./components/ItineraryDetails";
import SettingsDialog from "./components/SettingsDialog";
import LineSchedule from "./components/LineSchedule"; // <--- ייבוא חדש

// Imports - Contexts & Icons
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";

// --- פונקציית עזר להזרקת ה-Source URL לתוך ה-Style JSON ---
const injectSourceIntoStyle = (styleJson, tilesUrl) => {
  if (!styleJson || !tilesUrl) return styleJson;
  const newStyle = JSON.parse(JSON.stringify(styleJson));
  if (newStyle.sources && newStyle.sources.protomaps) {
    newStyle.sources.protomaps.url = tilesUrl;
  }
  return newStyle;
};

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

// --- 1. קומפוננטת עוטפת (Wrapper) ---
function App() {
  return (
    <SettingsProvider>
      <ThemeProvider theme={lightTheme}>
        <AppContent />
      </ThemeProvider>
    </SettingsProvider>
  );
}

// --- 2. הלוגיקה הראשית ---
function AppContent() {
  const { settings, loading: settingsLoading } = useSettings();
  const mapRef = useRef(null);

  const [baseStyle, setBaseStyle] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- State אפליקציה מקורי ---
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

  // --- ניהול זמן וחיפוש ---
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [arriveBy, setArriveBy] = useState(false);

  const [walkReluctance, setWalkReluctance] = useState(2);
  const [transferReluctance, setTransferReluctance] = useState(2);

  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);

  const [stopsGeoJson, setStopsGeoJson] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // --- State חדש לניהול לוח זמנים של קו ---
  const [selectedLineForSchedule, setSelectedLineForSchedule] = useState(null);

  // --- טעינת נתונים ראשונית ---
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", (request, callback) => {
      protocol.tile(request, callback);
    });

    if (maplibregl.getRTLTextPluginStatus() === "unavailable") {
      maplibregl.setRTLTextPlugin(
        "/mapbox-gl-rtl-text.min.js",
        (error) => {
          if (error) console.error("RTL Plugin Failed:", error);
        },
        true
      );
    }

    loadStopsData().then(() => {
      setTimeout(() => setStopsGeoJson(getStopsGeoJson()), 500);
    });

    setFavorites(getFavorites());

    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  // --- טעינת ה-Map Style ---
  useEffect(() => {
    const loadStyle = async () => {
      try {
        if (settings.customMapStyle) {
          setBaseStyle(settings.customMapStyle);
        } else {
          const res = await fetch(settings.mapStylePath);
          const json = await res.json();
          setBaseStyle(json);
        }
      } catch (e) {
        console.error("Failed to load map style", e);
      }
    };
    if (settings.mapStylePath || settings.customMapStyle) {
      loadStyle();
    }
  }, [settings.mapStylePath, settings.customMapStyle]);

  const finalMapStyle = useMemo(() => {
    if (!baseStyle) return null;
    return injectSourceIntoStyle(baseStyle, settings.tilesUrl);
  }, [baseStyle, settings.tilesUrl]);

  // --- פונקציות עזר ואינטראקציה ---
  const flyToLocation = (loc) => {
    if (mapRef.current && loc && !isNaN(loc.lat) && !isNaN(loc.lon)) {
      mapRef.current.flyTo({
        center: [loc.lon, loc.lat],
        zoom: 16,
        speed: 1.5,
      });
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
    if (hasSearched) setHasSearched(false);

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
      setHasSearched(false);
      setItineraries([]);
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

  // --- חיפוש מסלול (OTP) ---
  const handleSearch = async () => {
    if (!fromLoc || !toLoc) return;
    setLoading(true);
    setHasSearched(true);
    setItineraries([]);
    setSelectedItineraryIndex(null);

    const walkPenalty = walkReluctance * 4;
    const waitPenalty = transferReluctance * 3.5;
    const maxWalk = walkReluctance > 7 ? 400 : walkReluctance > 4 ? 1200 : 3500;

    const query = gql`
      query {
        plan(
          from: { lat: ${fromLoc.lat}, lon: ${fromLoc.lon} }
          to: { lat: ${toLoc.lat}, lon: ${toLoc.lon} }
          date: "${date}" 
          time: "${time}"
          arriveBy: ${arriveBy} 
          numItineraries: 5  
          transportModes: [{mode: BUS}, {mode: TRAM}, {mode: RAIL}, {mode: WALK}]
          walkReluctance: ${walkPenalty}
          waitReluctance: ${waitPenalty}
          maxWalkDistance: ${maxWalk}
        ) {
          itineraries {
            duration startTime endTime
            legs {
              mode duration startTime endTime distance 
              from { name lat lon stop { gtfsId } } 
              to { name lat lon stop { gtfsId } }
              route { shortName longName color agency { name } }
              legGeometry { points }
              intermediateStops { name lat lon } 
              trip {
                gtfsId
                stoptimes {
                  scheduledArrival
                  stop { name gtfsId lat lon }
                }
              }
              steps {
                distance streetName relativeDirection absoluteDirection stayOn area
              }
            }
          }
        }
      }
    `;

    try {
      const data = await request(settings.otpUrl, query);
      if (data.plan?.itineraries) setItineraries(data.plan.itineraries);
    } catch (error) {
      console.error("OTP Error:", error);
      alert("שגיאה בתקשורת עם שרת הניווט.");
    }
    setLoading(false);
  };

  // --- לוגיקה ללחיצה על קו ---
  const handleLineScheduleRequest = (line) => {
    // עדכון ה-State עם הקו שנבחר כדי לפתוח את הקומפוננטה LineSchedule
    setSelectedLineForSchedule(line);
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

    if (selectedItineraryIndex !== null) return;

    const { lng, lat } = e.lngLat;
    if (isNaN(lng) || isNaN(lat)) return;
    const clickedLoc = { lat, lon: lng, name: "נקודה במפה", type: "MAP_PIN" };

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
      setHasSearched(false);
      flyToLocation(clickedLoc);
    }
  };

  const handleLegFocus = (leg) => {
    if (!mapRef.current || !leg.legGeometry?.points) return;
    const points = polyline
      .decode(leg.legGeometry.points)
      .map((p) => [p[1], p[0]]);
    if (points.length > 0) {
      const bounds = points.reduce(
        (bounds, coord) => bounds.extend(coord),
        new maplibregl.LngLatBounds(points[0], points[0])
      );
      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 450 },
        duration: 1000,
      });
    }
  };

  const routeGeoJson = useMemo(() => {
    if (selectedItineraryIndex === null || !itineraries[selectedItineraryIndex])
      return null;
    return {
      type: "FeatureCollection",
      features: itineraries[selectedItineraryIndex].legs.map((leg) => ({
        type: "Feature",
        properties: { color: getLegColor(leg) },
        geometry: {
          type: "LineString",
          coordinates: polyline
            .decode(leg.legGeometry.points)
            .map((pt) => [pt[1], pt[0]]),
        },
      })),
    };
  }, [itineraries, selectedItineraryIndex]);

  const intermediateStopsGeoJson = useMemo(() => {
    if (selectedItineraryIndex === null || !itineraries[selectedItineraryIndex])
      return null;
    const features = [];
    itineraries[selectedItineraryIndex].legs.forEach((leg) => {
      const { stops } = getLegStopsWithRealTimes(leg);
      stops.forEach((stop) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [stop.lon, stop.lat] },
          properties: { name: stop.name, color: getLegColor(leg) },
        });
      });
    });
    return { type: "FeatureCollection", features };
  }, [itineraries, selectedItineraryIndex]);

  if (settingsLoading || !finalMapStyle) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>Loading Application...</div>
      </Box>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
      dir="rtl"
    >
      {/* סרגל צד */}
      <Paper
        elevation={4}
        style={{
          width: "420px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          height: "100%",
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedItineraryIndex === null ? (
            <SearchSidebar
              fromLoc={fromLoc}
              setFromLoc={setFromLoc}
              fromInputValue={fromInputValue}
              setFromInputValue={setFromInputValue}
              fromOptions={fromOptions}
              setFromOptions={setFromOptions}
              toLoc={toLoc}
              setToLoc={setToLoc}
              toInputValue={toInputValue}
              setToInputValue={setToInputValue}
              toOptions={toOptions}
              setToOptions={setToOptions}
              onInputChange={onInputChange}
              handleSelectLocation={handleSelectLocation}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              isFav={isFav}
              date={date}
              setDate={setDate}
              time={time}
              setTime={setTime}
              setArriveBy={setArriveBy}
              walkReluctance={walkReluctance}
              setWalkReluctance={setWalkReluctance}
              transferReluctance={transferReluctance}
              setTransferReluctance={setTransferReluctance}
              handleSearch={handleSearch}
              loading={loading}
              hasResults={itineraries.length > 0}
              searchError={hasSearched && !loading && itineraries.length === 0}
              // שליחת הפונקציה המעודכנת
              onLineScheduleRequest={handleLineScheduleRequest}
            >
              <ResultsList
                itineraries={itineraries}
                selectedIndex={selectedItineraryIndex}
                onItineraryClick={handleItineraryClick}
                onBackToResults={() => setSelectedItineraryIndex(null)}
              />
            </SearchSidebar>
          ) : (
            <ItineraryDetails
              itinerary={itineraries[selectedItineraryIndex]}
              onBack={() => setSelectedItineraryIndex(null)}
              onLegFocus={handleLegFocus}
            />
          )}
        </Box>
        <Footer onOpenSettings={() => setIsSettingsOpen(true)} />
      </Paper>

      {/* מפה */}
      <div style={{ flex: 1, position: "relative" }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle={finalMapStyle}
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
                  "circle-radius": 4,
                  "circle-color": "#fff",
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#94a3b8",
                }}
              />
            </Source>
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

          {intermediateStopsGeoJson && (
            <Source
              id="intermediate-stops-source"
              type="geojson"
              data={intermediateStopsGeoJson}
            >
              <Layer
                id="intermediate-stops-layer"
                type="circle"
                paint={{
                  "circle-radius": 3.5,
                  "circle-color": "#ffffff",
                  "circle-stroke-width": 2,
                  "circle-stroke-color": ["get", "color"],
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
        </Map>
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <StationDialog
        open={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        stop={selectedStop}
      />

      {/* קומפוננטת לוח זמנים לקו (תוצג רק אם נבחר קו) */}
      <LineSchedule
        selectedLine={selectedLineForSchedule}
        onClose={() => setSelectedLineForSchedule(null)}
      />
    </div>
  );
}

export default App;
