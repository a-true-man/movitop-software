// src/App.js
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
import { Paper, ThemeProvider, createTheme } from "@mui/material";
import { request, gql } from "graphql-request";
import polyline from "@mapbox/polyline";

// Services & Utils
import {
  loadStopsData,
  searchLocation,
  getStopsGeoJson,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "./services/searchService";
import { getLegColor } from "./utils/transitUtils";

// Components
import StationDialog from "./components/StationDialog";
import SearchSidebar from "./components/SearchSidebar";
import ResultsList from "./components/ResultsList";

// --- הגדרות מפה ---
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

const MAP_STYLE_ONLINE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

function App() {
  const mapRef = useRef(null);

  // View State
  const [viewState, setViewState] = useState({
    longitude: 34.7818,
    latitude: 32.0853,
    zoom: 14,
  });

  // Search State
  const [fromLoc, setFromLoc] = useState(null);
  const [toLoc, setToLoc] = useState(null);
  const [fromInputValue, setFromInputValue] = useState("");
  const [toInputValue, setToInputValue] = useState("");
  const [fromOptions, setFromOptions] = useState([]);
  const [toOptions, setToOptions] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Settings State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toTimeString().substring(0, 5));
  const [walkReluctance, setWalkReluctance] = useState(2);
  const [transferReluctance, setTransferReluctance] = useState(2);

  // Results State
  const [itineraries, setItineraries] = useState([]);
  const [selectedItineraryIndex, setSelectedItineraryIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // UI State
  const [stopsGeoJson, setStopsGeoJson] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

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
          numItineraries: 5  
          transportModes: [{mode: BUS}, {mode: TRAM}, {mode: RAIL}, {mode: WALK}]
          walkReluctance: ${walkPenalty}
          waitReluctance: ${waitPenalty}
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

  // UI Events
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

  // Route Rendering Logic
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
        {/* Sidebar + Results Container */}
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
            walkReluctance={walkReluctance}
            setWalkReluctance={setWalkReluctance}
            transferReluctance={transferReluctance}
            setTransferReluctance={setTransferReluctance}
            handleSearch={handleSearch}
            loading={loading}
            hasResults={itineraries.length > 0}
          />

          <ResultsList
            itineraries={itineraries}
            selectedIndex={selectedItineraryIndex}
            onItineraryClick={handleItineraryClick}
          />
        </Paper>

        {/* Map */}
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
