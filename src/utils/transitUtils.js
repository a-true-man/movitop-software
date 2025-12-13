// src/utils/transitUtils.js
//כל הפונקציות של חישובי מחיר, צבעים וזמנים (לוגיקה טהורה).
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

// --- מנוע חישוב מחירים ---
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

// --- צבעים ועיצוב ---
export const getLegColor = (leg) => {
  if (leg.mode === "WALK") return "#9ca3af";

  if (leg.route?.color) {
    return `#${leg.route.color}`;
  }

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

// --- פורמט זמנים ---
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
