const express = require("express");
const axios = require("axios");
const cors = require("cors");
const cheerio = require("cheerio");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Root check
app.get("/", (req, res) => {
  res.send("Wingo Mirror API Running");
});

// Exact mirror prediction
app.get("/prediction", async (req, res) => {
  try {
    const response = await axios.get(
      "https://wingoaisite.com/wingo-prediction/",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const $ = cheerio.load(response.data);

    // 🔥 Yaha actual prediction text nikalna hai
    // Ye generic extraction hai — page structure ke hisaab se adjust hoga

    const pageText = $("body").text();

    // Number extract
    const numberMatch = pageText.match(/\b\d\b/);
    const number = numberMatch ? numberMatch[0] : null;

    let size = null;
    if (number !== null) {
      size = parseInt(number) >= 5 ? "Big" : "Small";
    }

    let color = null;
    if (number !== null) {
      color = parseInt(number) % 2 === 0 ? "Red" : "Green";
    }

    res.json({
      number,
      size,
      color
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to mirror prediction"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
