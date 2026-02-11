const express = require("express");
const app = express();

app.use(express.json());

let history = [];

// Add Result API
app.post("/add-result", (req, res) => {
  const { number } = req.body;

  if (number === undefined) {
    return res.status(400).json({ error: "Number required" });
  }

  const size = number >= 5 ? "Big" : "Small";
  const color = number % 2 === 0 ? "Red" : "Green";

  history.push({ number, size, color });

  if (history.length > 100) {
    history.shift();
  }

  res.json({ message: "Result added", totalStored: history.length });
});

// Prediction Logic
app.get("/predict", (req, res) => {
  if (history.length < 5) {
    return res.json({ error: "Not enough data" });
  }

  let last5 = history.slice(-5);

  let bigCount = last5.filter(r => r.size === "Big").length;
  let smallCount = last5.filter(r => r.size === "Small").length;

  let greenCount = last5.filter(r => r.color === "Green").length;
  let redCount = last5.filter(r => r.color === "Red").length;

  let predictedSize = smallCount > bigCount ? "Big" : "Small";
  let predictedColor = greenCount > redCount ? "Red" : "Green";

  let predictedNumber;

  if (predictedSize === "Big") {
    predictedNumber = Math.floor(Math.random() * 5) + 5; // 5-9
  } else {
    predictedNumber = Math.floor(Math.random() * 5); // 0-4
  }

  res.json({
    prediction: {
      number: predictedNumber,
      size: predictedSize,
      color: predictedColor
    },
    analysis: {
      last5,
      bigCount,
      smallCount,
      greenCount,
      redCount
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
