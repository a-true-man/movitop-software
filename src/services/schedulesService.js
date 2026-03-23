// src/services/schedulesService.js

const OTP_BASE_URL = "http://localhost:8080/otp/routers/default";
const GRAPHQL_URL = `${OTP_BASE_URL}/index/graphql`;

// 1. שליפת כל הקווים
export const fetchAllRoutes = async () => {
  try {
    const response = await fetch(`${OTP_BASE_URL}/index/routes`);
    return await response.json();
  } catch (e) {
    return [];
  }
};

// 2. שליפת פאטרנים
export const fetchRoutePatterns = async (routeId) => {
  try {
    const encodedId = encodeURIComponent(routeId);
    const response = await fetch(
      `${OTP_BASE_URL}/index/patterns?routeId=${encodedId}`
    );
    const allPatterns = await response.json();
    if (!Array.isArray(allPatterns)) return [];
    const filtered = allPatterns.filter((p) => p.routeId === routeId);
    return filtered.length > 0 ? filtered : allPatterns.slice(0, 50);
  } catch (e) {
    return [];
  }
};

// 3. שליפת מבנה הקו בלבד (תחנות) - הפונקציה שהייתה חסרה!
export const fetchPatternStops = async (patternId) => {
  const query = `
    query ($id: String!) {
      pattern(id: $id) {
        id
        headsign
        stops {
          id
          name
          gtfsId
          code
        }
      }
    }
  `;
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: patternId } }),
    });
    const json = await response.json();
    return json.data?.pattern || null;
  } catch (error) {
    return null;
  }
};

// 4. שליפת פרטים מלאים (עבור התצוגה הראשית של ה-Drawer)
export const fetchPatternDetails = async (patternId) => {
  const query = `
    query ($id: String!) {
      pattern(id: $id) {
        id
        headsign
        stops {
          id
          name
          gtfsId
          code
        }
        trips {
          id
          serviceId 
          stoptimes {
            stop {
              id
            }
            scheduledArrival
            pickupType
            dropoffType
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: patternId } }),
    });

    const json = await response.json();
    if (json.errors || !json.data || !json.data.pattern) return null;

    const data = json.data.pattern;

    const sortedTrips = data.trips.sort((a, b) => {
      const timeA = a.stoptimes?.[0]?.scheduledArrival || 0;
      const timeB = b.stoptimes?.[0]?.scheduledArrival || 0;
      return timeA - timeB;
    });

    // דה-דופליקציה
    const uniqueTrips = [];
    const seenStartTimes = new Set();
    sortedTrips.forEach((trip) => {
      const startTime = trip.stoptimes?.[0]?.scheduledArrival;
      if (startTime !== undefined && !seenStartTimes.has(startTime)) {
        seenStartTimes.add(startTime);
        uniqueTrips.push(trip);
      }
    });

    const tripsWithData = uniqueTrips.map((trip) => {
      const stopsData = trip.stoptimes || [];
      return {
        service: { id: trip.serviceId },
        stopTimes: stopsData.map((st) => ({
          scheduledArrival: st.scheduledArrival,
          pickupType: st.pickupType,
          dropoffType: st.dropoffType,
          stopId: st.stop.id,
        })),
      };
    });

    return {
      pattern: {
        id: data.id,
        headsign: data.headsign,
        desc: data.headsign,
        stops: data.stops,
      },
      trips: tripsWithData,
    };
  } catch (error) {
    return null;
  }
};

// 5. שליפת לו"ז ספציפי לתחנה (עבור הדיאלוג) - כולל לוגים לדיבוג
export const fetchStopSchedule = async (stopId, date, routeShortName) => {
  const formattedDate =
    date.length === 8
      ? `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(
          6,
          8
        )}`
      : date;

  // --- התיקון בשאילתה: נכנסים לתוך stoptimes ---
  const query = `
      query ($stopId: String!, $date: String!) {
        stop(id: $stopId) {
          stoptimesForServiceDate(date: $date) {
            pattern {
                id
            }
            stoptimes {
                scheduledArrival
                trip {
                  id
                  route {
                    shortName
                  }
                }
            }
          }
        }
      }
    `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        variables: { stopId, date: formattedDate },
      }),
    });

    const json = await response.json();

    if (json.errors) {
      if (process.env.NODE_ENV !== "production") {
        console.error("GraphQL Errors:", json.errors);
      }
      return [];
    }
    if (
      !json.data ||
      !json.data.stop ||
      !json.data.stop.stoptimesForServiceDate
    ) {
      return [];
    }

    // --- התיקון בעיבוד הנתונים ---
    // השרת מחזיר מערך של קבוצות (Patterns).
    // אנחנו צריכים לאחד (Flatten) את כל ה-stoptimes מכל הקבוצות לרשימה אחת גדולה.
    const patternGroups = json.data.stop.stoptimesForServiceDate;

    let allStopTimes = [];
    patternGroups.forEach((group) => {
      if (group.stoptimes) {
        allStopTimes = [...allStopTimes, ...group.stoptimes];
      }
    });

    // --- סינון לפי מספר קו ---
    const filteredTimes = allStopTimes.filter((st) => {
      const serverName = String(st.trip.route.shortName || "").trim();
      const targetName = String(routeShortName || "").trim();
      return serverName === targetName;
    });

    // מחזירים רק את הזמנים, ממוינים
    return filteredTimes.map((st) => st.scheduledArrival).sort((a, b) => a - b);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in fetchStopSchedule:", error);
    }
    return [];
  }
};
