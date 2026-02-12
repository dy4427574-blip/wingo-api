const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

let history = [];
let wins = 0;
let losses = 0;
let lastPrediction = null;

/* =========================
   Utility Functions
========================= */

function getSize(num) {
  return num >= 5 ? "Big" : "Small";
}

function cleanInput(text) {
  return text
    .split(/\s+/)
    .map(x => x.replace(/[^\d]/g, ""))
    .filter(x => x !== "")
    .map(x => parseInt(x));
}

/* =========================
   Advanced Analysis Engine
========================= */

function analyzeAdvanced(data) {
  if (data.length < 5) return null;

  let big = 0, small = 0;
  let last10 = data.slice(-10);

  // Frequency
  data.forEach(n => {
    if (n >= 5) big++;
    else small++;
  });

  // Last 10 weighted
  let lastBig = 0, lastSmall = 0;
  last10.forEach(n => {
    if (n >= 5) lastBig++;
    else lastSmall++;
  });

  // Streak detection
  let streakCount = 1;
  for (let i = data.length - 1; i > 0; i--) {
    if (getSize(data[i]) === getSize(data[i - 1])) {
      streakCount++;
    } else break;
  }

  let predictionSize;

  // Reversal logic if streak >=3
  if (streakCount >= 3) {
    predictionSize = getSize(data[data.length - 1]) === "Big" ? "Small" : "Big";
  }
  // Weighted trend logic
  else if (lastBig > lastSmall) {
    predictionSize = "Small";
  } else if (lastSmall > lastBig) {
    predictionSize = "Big";
  }
  // Overall frequency logic
  else {
    predictionSize = big > small ? "Small" : "Big";
  }

  return {
    size: predictionSize,
    number: predictionSize === "Big"
      ? Math.floor(Math.random() * 5) + 5
      : Math.floor(Math.random() * 5),
    confidence: Math.min(80, 50 + Math.abs(lastBig - lastSmall) * 5)
  };
}

/* =========================
   Telegram Webhook
========================= */

app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  /* ==== ADMIN RESET ==== */
  if (text === `/reset ${ADMIN_SECRET}`) {
    history = [];
    wins = 0;
    losses = 0;
    lastPrediction = null;
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: "✅ System Reset Done"
    });
    return res.sendStatus(200);
  }

  /* ==== ADMIN STATS ==== */
  if (text === `/admin ${ADMIN_SECRET}`) {
    const winRate = wins + losses === 0
      ? 0
      : ((wins / (wins + losses)) * 100).toFixed(2);

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text:
        `📊 Admin Stats\n\n` +
        `Stored: ${history.length}\n` +
        `Wins: ${wins}\n` +
        `Losses: ${losses}\n` +
        `Win Rate: ${winRate}%`
    });
    return res.sendStatus(200);
  }

  /* ==== MULTI RESULT INPUT ==== */
  if (!text.startsWith("/predict")) {
    const numbers = cleanInput(text);

    if (numbers.length > 0) {
      numbers.forEach(n => {
        history.push(n);
        if (history.length > 50) history.shift();
      });

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `✅ ${numbers.length} results added`
      });
    }

    return res.sendStatus(200);
  }

  /* ==== PREDICTION ==== */
  const prediction = analyzeAdvanced(history);

  if (!prediction) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: "⚠️ Send at least 5 results first."
    });
    return res.sendStatus(200);
  }

  lastPrediction = prediction;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text:
      `🎯 Prediction\n\n` +
      `Size: ${prediction.size}\n` +
      `Number: ${prediction.number}\n` +
      `Confidence: ${prediction.confidence}%`
  });

  res.sendStatus(200);
});

/* ========================= */

app.get("/", (req, res) => {
  res.send("Advanced AI Bot Running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
