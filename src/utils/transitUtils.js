import polyline from "@mapbox/polyline";

// --- מנוע חישוב מרחקים ---
const deg2rad = (deg) => deg * (Math.PI / 180);

export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
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

export const calculateTotalFare = (legs) => {
  let totalPrice = 0;
  let activeTicket = null;
  for (let leg of legs) {
    if (leg.mode === "WALK") continue;
    const distKm = getDistanceFromLatLonInKm(
      leg.from.lat,
      leg.from.lon,
      leg.to.lat,
      leg.to.lon
    );
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

export const getLegColor = (leg) => {
  if (leg.mode === "WALK") return "#9ca3af";
  if (leg.route?.color) return `#${leg.route.color}`;
  const colors = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#84cc16",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#d946ef",
    "#f43f5e",
  ];
  const name = leg.route?.shortName || leg.mode;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const formatDuration = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} דק'`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0
    ? `${hours} שע' ו-${remainingMins} דק'`
    : `${hours} שעות`;
};

export const getDepartureStrings = (startTime) => {
  const now = new Date();
  const departure = new Date(startTime);
  const diff = Math.floor((departure - now) / 60000);

  const timeString = departure.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diff < 0) return { text: "יצא", color: "grey" };
  if (diff === 0) return { text: "עכשיו", color: "#d32f2f" };
  if (diff > 59) return { text: `צא ב-${timeString}`, color: "grey" };
  if (diff <= 5) return { text: `בעוד ${diff} דק'`, color: "#d32f2f" };
  if (diff > 15) return { text: `בעוד ${diff} דק'`, color: "grey" };
  return { text: `בעוד ${diff} דק'`, color: "#2e7d32" };
};

// --- לוגיקת תרגום שמות והוראות ---

const translateStreetName = (name) => {
  if (!name) return "שביל";
  const lower = name.toLowerCase().trim();

  // תרגום מונחי OTP גנריים
  if (lower === "origin" || lower === "start") return "נקודת המוצא";
  if (lower === "destination" || lower === "end") return "היעד";

  if (lower === "path" || lower === "footway") return "שביל הליכה";
  if (lower === "sidewalk") return "מדרכה";
  if (lower === "track") return "דרך עפר";
  if (lower === "steps" || lower === "stairs") return "מדרגות";
  if (lower === "service road" || lower === "road" || lower === "unnamed road")
    return "כביש שירות";
  if (lower === "pedestrian") return "מדרחוב";
  if (lower === "cycleway") return "שביל אופניים";
  if (lower === "crossing") return "מעבר חציה";
  if (lower === "roundabout") return "כיכר";

  return name;
};

export const getInstructionString = (step) => {
  const dir = step.relativeDirection;

  // טיפול בשמות גנריים או חסרים
  let rawStreet = step.streetName || (step.area ? "אזור הליכה" : "שביל");

  // אם השם הוא "Origin" או "Destination" (קורה לעיתים ב-API), נתרגם ידנית
  if (rawStreet === "Origin") rawStreet = "נקודת המוצא";
  if (rawStreet === "Destination") rawStreet = "היעד";

  const street = translateStreetName(rawStreet);

  // בדיקה אם זה כיכר
  const isRoundabout = dir.startsWith("CIRCLE");
  // בדיקה אם שם הרחוב בכיכר הוא גנרי ומבלבל ("כביש שירות")
  const isGenericRoundabout =
    isRoundabout && (street === "כביש שירות" || street === "כיכר");

  const dict = {
    DEPART: `צא מ-${street}`,
    HARD_LEFT: `פנה בחדות שמאלה ל-${street}`,
    LEFT: `פנה שמאלה ל-${street}`,
    SLIGHTLY_LEFT: `פנה מעט שמאלה ל-${street}`,
    SLIGHT_LEFT: `פנה מעט שמאלה ל-${street}`,
    CONTINUE: `המשך ישר ב-${street}`,
    SLIGHTLY_RIGHT: `פנה מעט ימינה ל-${street}`,
    SLIGHT_RIGHT: `פנה מעט ימינה ל-${street}`,
    RIGHT: `פנה ימינה ל-${street}`,
    HARD_RIGHT: `פנה בחדות ימינה ל-${street}`,

    // בכיכר: אם הרחוב הוא סתם "כביש שירות", נכתוב רק "צא ביציאה"
    CIRCLE_CLOCKWISE: isGenericRoundabout
      ? `בכיכר, צא ביציאה והמשך`
      : `בכיכר, צא ל-${street}`,
    CIRCLE_COUNTERCLOCKWISE: isGenericRoundabout
      ? `בכיכר, צא ביציאה והמשך`
      : `בכיכר, צא ל-${street}`,

    ELEVATOR: `קח מעלית ל-${street}`,
    UTURN_LEFT: `בצע פניית פרסה ל-${street}`,
    UTURN_RIGHT: `בצע פניית פרסה ל-${street}`,
  };

  return dict[dir] || `${dir} לכיוון ${street}`;
};

// --- חישוב זמנים והחזרת סטטוס (אמת/משוער) ---
export const getLegStopsWithRealTimes = (leg) => {
  if (leg.mode === "WALK") return { stops: [], isEstimated: false };

  // 1. נסיון GTFS (אמת)
  if (leg.trip && leg.trip.stoptimes) {
    const allStops = leg.trip.stoptimes;
    const fromId = leg.from?.stop?.gtfsId;
    const toId = leg.to?.stop?.gtfsId;
    const fromName = leg.from?.name;
    const toName = leg.to?.name;

    let startIndex = -1;
    let endIndex = -1;

    if (fromId && toId) {
      startIndex = allStops.findIndex((s) => s.stop.gtfsId === fromId);
      endIndex = allStops.findIndex((s) => s.stop.gtfsId === toId);
    }

    if (startIndex === -1) {
      startIndex = allStops.findIndex((s) => s.stop.name === fromName);
    }
    if (endIndex === -1) {
      const searchFrom = startIndex === -1 ? 0 : startIndex;
      const foundAfter = allStops
        .slice(searchFrom)
        .findIndex((s) => s.stop.name === toName);
      if (foundAfter !== -1) {
        endIndex = searchFrom + foundAfter;
      }
    }

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
      const baseDate = new Date(leg.startTime);
      baseDate.setHours(0, 0, 0, 0);
      const baseTimestamp = baseDate.getTime();
      const realStops = allStops.slice(startIndex + 1, endIndex);

      if (realStops.length > 0) {
        return {
          stops: realStops.map((item) => ({
            name: item.stop.name,
            lat: item.stop.lat,
            lon: item.stop.lon,
            arrival: baseTimestamp + item.scheduledArrival * 1000,
          })),
          isEstimated: false, // מידע אמין
        };
      }
    }
  }

  // 2. Fallback (משוער)
  const stops = leg.intermediateStops || [];
  if (stops.length === 0) return { stops: [], isEstimated: false };

  const allPoints = [leg.from, ...stops, leg.to];
  let totalDist = 0;
  const dists = [];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const d = getDistanceFromLatLonInKm(
      allPoints[i].lat,
      allPoints[i].lon,
      allPoints[i + 1].lat,
      allPoints[i + 1].lon
    );
    totalDist += d;
    dists.push(d);
  }

  const legDuration = leg.endTime - leg.startTime;
  let currentAccumulatedDist = 0;

  const calculatedStops = stops.map((stop, i) => {
    currentAccumulatedDist += dists[i];
    let ratio =
      totalDist > 0
        ? currentAccumulatedDist / totalDist
        : (i + 1) / (stops.length + 1);

    return {
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      arrival: leg.startTime + legDuration * ratio,
    };
  });

  return {
    stops: calculatedStops,
    isEstimated: true, // סימון שהמידע מחושב
  };
};
