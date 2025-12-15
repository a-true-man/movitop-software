import React from "react";
import { Box, Stack, Link, Typography } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import GitHubIcon from "@mui/icons-material/GitHub";

// מקבלים את הפונקציה onOpenSettings כ-prop
export default function Footer({ onOpenSettings }) {
  return (
    <Box
      sx={{
        p: 2,
        mt: "auto",
        borderTop: "1px solid #e2e8f0",
        bgcolor: "#f8fafc",
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={2}
        justifyContent="center"
        alignItems="center"
      >
        {/* ✅ הכפתור החדש שמחליף את כרטיסי מוביט */}
        <Link
          component="button"
          variant="caption"
          color="text.secondary"
          underline="hover"
          onClick={onOpenSettings}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            verticalAlign: "middle",
          }}
        >
          <SettingsIcon sx={{ fontSize: 16 }} />
          הגדרות
        </Link>

        <Link
          href="https://github.com/a-true-man/movitop-software?tab=readme-ov-file"
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          color="text.secondary"
          variant="caption"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5, // רווח קטן בין האייקון לטקסט
          }}
        >
          <GitHubIcon fontSize="inherit" />{" "}
          {/* אייקון שמותאם לגודל ה-caption */}
          הדרכה
        </Link>
        <Link
          href="#"
          underline="hover"
          color="text.secondary"
          variant="caption"
        >
          מדיניות פרטיות
        </Link>
        <Link
          href="https://mitmachim.top/topic/90912/%D7%9E%D7%95%D7%91%D7%99%D7%98%D7%95%D7%A4-%D7%96%D7%9E%D7%A0%D7%99-%D7%AA%D7%97%D7%91%D7%95%D7%A8%D7%94-%D7%90%D7%95%D7%A4%D7%9C%D7%99%D7%9F-%D7%94%D7%AA%D7%95%D7%9B%D7%A0%D7%94-%D7%91%D7%A4%D7%99%D7%AA%D7%95%D7%97" // החלף את ה-# בכתובת אמיתית
          target="_blank" // זה מה שפותח בדפדפן חדש
          rel="noopener noreferrer" // מומלץ תמיד בשימוש עם target="_blank"
          underline="hover"
          color="text.secondary"
          variant="caption"
        >
          צור קשר
        </Link>
        <Link
          href="#"
          underline="hover"
          color="text.secondary"
          variant="caption"
        >
          הצהרת נגישות
        </Link>
      </Stack>
      <Typography
        variant="caption"
        display="block"
        textAlign="center"
        sx={{ mt: 2, color: "#94a3b8" }}
      >
        © 2025 איש אמת
      </Typography>
    </Box>
  );
}
