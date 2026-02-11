const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

let history = [];
let lastPrediction = null;

/* =========================
   CORE ANALYSIS ENGINE
========================= */

function analyzeAndPredict() {
  if (history.length < 10) return null;

  const last50 = history.slice(-50);
  const last5 = history.slice(-5);

  let bigCount = last50.filter(r => r.size === "B").length;
  let smallCount = last50.length - bigCount;

  let recentBig = last5.filter(r => r.size === "B").length;
  let recentSmall = last5.length - recentBig;

  // Base bias
  let scoreBig = bigCount * 0.4 + recentBig * 0.6;
  let scoreSmall = smallCount * 0.4 + recentSmall * 0.6;

  // Streak detection
  let streakSize = history[history.length - 1].size;
  let streak = 1;

  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].size === streakSize) streak++;
    else break;
  }

  if (streak >= 3) {
    if (streakSize === "B") scoreSmall += 5;
    else scoreBig += 5;
  }

  let predictedSize = scoreBig > scoreSmall ? "B" : "S";

  let predictedNumber;
  if (predictedSize === "B") {
    predictedNumber = Math.floor(Math.random() * 5) + 5;
  } else {
    predictedNumber = Math.floor(Math.random() * 5);
  }

  let predictedColor = predictedNumber % 2 === 0 ? "Red" : "Green";

  let confidence = Math.abs(scoreBig - scoreSmall).toFixed(2);

  return {
    number: predictedNumber,
    size: predictedSize === "B" ? "Big" : "Small",
    color: predictedColor,
    confidence: confidence
  };
}

/* =========================
   TELEGRAM WEBHOOK
========================= */

app.post("/", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  // INIT MODE
  if (text.startsWith("INIT")) {
    history = [];
    lastPrediction = null;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "Send last 50 results in format:\n6B\n4S\n2S"
    });

    return res.sendStatus(200);
  }

  // RESULT FORMAT (6B type)
  if (/^[0-9][BS]$/.test(text)) {
    const number = parseInt(text[0]);
    const size = text[1];

    history.push({ number, size });

    if (history.length > 50) history.shift();

    let replyText = "";

    if (lastPrediction) {
      const win =
        (lastPrediction.size === "Big" && size === "B") ||
        (lastPrediction.size === "Small" && size === "S");

      replyText += win ? "WIN ✅\n" : "LOSS ❌\n";
    }

    const prediction = analyzeAndPredict();

    if (!prediction) {
      replyText += "Not enough data yet.";
    } else {
      lastPrediction = prediction;
      replyText += `Prediction: ${prediction.size}
Number: ${prediction.number}
Color: ${prediction.color}
Confidence: ${prediction.confidence}%`;
    }

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: replyText
    });

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("AI Engine Running...");
});
