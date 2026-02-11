const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/*
  YE API external website se prediction fetch karegi
  Aur sirf prediction output degi:
  number
  size
  color
*/

app.get("/prediction", async (req, res) => {
  try {
    const response = await axios.get(
      "https://wingoaisite.com/wp-json/wp/v2/posts?per_page=1"
    );

    const data = response.data[0];

    // Yaha tum future me exact parsing change kar sakte ho
    // Abhi demo structure bana rahe hain

    const title = data.title.rendered || "";

    // Example extract logic (customize karenge baad me)
    let number = title.match(/\d+/) ? title.match(/\d+/)[0] : "0";

    let size = parseInt(number) >= 5 ? "Big" : "Small";

    let color = parseInt(number) % 2 === 0 ? "Red" : "Green";

    res.json({
      number,
      size,
      color
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch prediction"
    });
  }
});

app.get("/", (req, res) => {
  res.send("Wingo API Running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
