const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Store last 100 results
let history = [];

/*
Result format expected:
{
  number: 7,
  size: "B"  // or "S"
}
*/

app.post("/add-result", (req, res) => {
  const { number, size } = req.body;

  if (!number && number !== 0) {
    return res.status(400).json({ error: "Number required" });
  }

  const finalSize = size || (number >= 5 ? "B" : "S");

  history.unshift({
    number: Number(number),
    size: finalSize
  });

  if (history.length > 100) {
    history.pop();
  }

  res.json({ message: "Result added", totalStored: history.length });
});

app.get("/predict", (req, res) => {
  if (history.length < 10) {
    return res.json({
      message: "Need at least 10 results",
      stored: history.length
    });
  }

  const last50 = history.slice(0, 50);

  let bigCount = 0;
  let smallCount = 0;

  last50.forEach(r => {
    if (r.size === "B") bigCount++;
    else smallCount++;
  });

  const freqBig = bigCount / last50.length;
  const freqSmall = smallCount / last50.length;

  // Streak detection
  let streakSize = history[0].size;
  let streakCount = 1;

  for (let i = 1; i < history.length; i++) {
    if (history[i].size === streakSize) {
      streakCount++;
    } else break;
  }

  let streakBig = 0;
  let streakSmall = 0;

  if (streakSize === "B") {
    streakBig = streakCount >= 3 ? 1 : 0;
  } else {
    streakSmall = streakCount >= 3 ? 1 : 0;
  }

  // Transition probability
  let transBig = 0;
  let transSmall = 0;

  for (let i = 0; i < last50.length - 1; i++) {
    if (last50[i + 1].size === "B" && last50[i].size === "B") transBig++;
    if (last50[i + 1].size === "S" && last50[i].size === "S") transSmall++;
  }

  const transBigRatio = transBig / last50.length;
  const transSmallRatio = transSmall / last50.length;

  const scoreBig =
    freqBig * 0.4 +
    streakSmall * 0.3 +
    transBigRatio * 0.3;

  const scoreSmall =
    freqSmall * 0.4 +
    streakBig * 0.3 +
    transSmallRatio * 0.3;

  const prediction = scoreBig > scoreSmall ? "BIG" : "SMALL";

  const confidence = Math.abs(scoreBig - scoreSmall) * 100;

  res.json({
    prediction,
    confidence: confidence.toFixed(2) + "%",
    bigScore: scoreBig.toFixed(3),
    smallScore: scoreSmall.toFixed(3)
  });
});

app.get("/", (req, res) => {
  res.send("Auto Hybrid Prediction Engine Running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
