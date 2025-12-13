// src/components/SearchSidebar.js
//קומפוננטת סרגל החיפוש
//סרגל הצד עם החיפוש, המועדפים וההגדרות.
import React from "react";
import {
  Box,
  Typography,
  Stack,
  Autocomplete,
  TextField,
  IconButton,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";

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
  walkReluctance,
  setWalkReluctance,
  transferReluctance,
  setTransferReluctance,
  handleSearch,
  loading,
  hasResults, // כדי לדעת אם להסתיר את המועדפים
}) {
  return (
    <Box sx={{ p: 2, bgcolor: "white", borderBottom: "1px solid #e0e0e0" }}>
      <Typography
        variant="h6"
        color="primary"
        sx={{ fontWeight: "bold", mb: 2 }}
      >
        מוביטופ - זמני תחבורה אופליין
      </Typography>

      <Stack spacing={2}>
        {/* מוצא */}
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
            {isFav(fromLoc, fromInputValue) ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
        </Stack>

        {/* יעד */}
        <Stack direction="row" spacing={1}>
          <Autocomplete
            fullWidth
            freeSolo
            options={toOptions}
            inputValue={toInputValue}
            onInputChange={(e, val) =>
              onInputChange(val, setToOptions, setToInputValue, toLoc, setToLoc)
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
            {isFav(toLoc, toInputValue) ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
        </Stack>

        {/* מועדפים מהירים */}
        {favorites.length > 0 && !hasResults && (
          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
            {favorites.map((fav, i) => (
              <Chip
                key={i}
                icon={<HomeIcon fontSize="small" />}
                label={fav.name}
                onClick={() => {
                  if (!fromLoc)
                    handleSelectLocation(fav, setFromLoc, setFromInputValue);
                  else handleSelectLocation(fav, setToLoc, setToInputValue);
                }}
                size="small"
              />
            ))}
          </Stack>
        )}

        {/* תאריך ושעה */}
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

        {/* הגדרות (סליידרים) */}
        <Stack spacing={1} sx={{ bgcolor: "#f1f5f9", p: 1.5, borderRadius: 2 }}>
          {/* הליכה */}
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

          {/* החלפות */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <TransferWithinAStationIcon color="action" fontSize="small" />
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
                  setTransferReluctance(Math.max(1, transferReluctance - 1))
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
                  setTransferReluctance(Math.min(10, transferReluctance + 1))
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
  );
}
