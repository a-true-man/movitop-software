import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, Paper } from "@mui/material";
import LandscapeIcon from "@mui/icons-material/Landscape";

// פונקציית עזר ליצירת נתונים מדומים (למקרה שאין DEM בשרת)
const generateMockElevation = (distance) => {
  const points = [];
  const segments = 10;
  for (let i = 0; i <= segments; i++) {
    // יוצר "גבעה" מלאכותית
    const x = (distance / segments) * i;
    const y = 20 + Math.sin((i / segments) * Math.PI) * 50 + Math.random() * 5;
    points.push({ distance: x, elevation: y });
  }
  return points;
};

export default function ElevationProfile({ legs }) {
  const chartData = useMemo(() => {
    let data = [];
    let cumulativeDistance = 0;

    legs.forEach((leg) => {
      // אם אין מידע מהשרת, נשתמש במידע מדומה (רק להדגמה)
      // בפרודקשן - אם השרת שלך מוגדר עם DEM, תמחק את ה- || generate...
      const elevationData =
        leg.elevation && leg.elevation.length > 0
          ? leg.elevation
          : generateMockElevation(leg.distance);

      // המרת המרחקים למצטבר
      const processedLegData = elevationData.map((point) => ({
        totalDist: (cumulativeDistance + point.distance) / 1000, // לק"מ
        elevation: point.elevation,
        mode: leg.mode, // כדי שנוכל לצבוע אחרת בעתיד
      }));

      data = [...data, ...processedLegData];
      cumulativeDistance += leg.distance;
    });

    return data;
  }, [legs]);

  // חישוב מינימום ומקסימום לציר הגובה כדי שהגרף יראה טוב
  const minElev = Math.min(...chartData.map((d) => d.elevation)) - 10;
  const maxElev = Math.max(...chartData.map((d) => d.elevation)) + 10;

  if (!legs || legs.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mt: 2,
        border: "1px solid #e2e8f0",
        bgcolor: "white",
        borderRadius: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <LandscapeIcon color="action" />
        <Typography variant="subtitle2" fontWeight="bold">
          פרופיל גבהים
        </Typography>
      </Box>

      <Box sx={{ height: 120, width: "100%", direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="totalDist"
              unit=" km"
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => val.toFixed(1)}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[Math.floor(minElev), Math.ceil(maxElev)]}
              hide={true} // מסתיר את המספרים בצד כדי לחסוך מקום
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                direction: "rtl",
                textAlign: "right",
              }}
              labelFormatter={(val) => `מרחק: ${val.toFixed(2)} ק"מ`}
              formatter={(value) => [`${Math.round(value)} מ'`, "גובה"]}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorElev)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          px: 1,
          mt: -1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          נמוך: {Math.round(minElev + 10)}מ'
        </Typography>
        <Typography variant="caption" color="text.secondary">
          גבוה: {Math.round(maxElev - 10)}מ'
        </Typography>
      </Box>
    </Paper>
  );
}
