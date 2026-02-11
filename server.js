const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// ===== In-memory store =====
let history = [];
let lastPrediction = null;

let stats = {
  total: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  longestWin: 0,
  longestLoss: 0
};

let engineConfig = {
  streakWeight: 5,
  momentumWeight: 0.6,
  baseWeight: 0.4,
  minData: 10,
  confidenceThreshold: 55,
  paused: false,
  force: null // "B" | "S" | null
};

let users = {}; // { chatId: { vip: false, banned: false } }

// ===== Core Analysis =====
function analyze() {
  if (engineConfig.paused) return null;
  if (history.length < engineConfig.minData) return null;

  const last50 = history.slice(-50);
  const last5 = history.slice(-5);

  let big = last50.filter(r => r.size === "B").length;
  let small = last50.length - big;

  let recentBig = last5.filter(r => r.size === "B").length;
  let recentSmall = last5.length - recentBig;

  let scoreBig = big * engineConfig.baseWeight + recentBig * engineConfig.momentumWeight;
  let scoreSmall = small * engineConfig.baseWeight + recentSmall * engineConfig.momentumWeight;

  // streak
  let streakSize = history[history.length - 1].size;
  let streak = 1;
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].size === streakSize) streak++;
    else break;
  }

  if (streak >= 3) {
    if (streakSize === "B") scoreSmall += engineConfig.streakWeight;
    else scoreBig += engineConfig.streakWeight;
  }

  let predictedSize = scoreBig > scoreSmall ? "B" : "S";
  let confidence = Math.abs(scoreBig - scoreSmall).toFixed(2);

  if (engineConfig.force) predictedSize = engineConfig.force;

  if (confidence < engineConfig.confidenceThreshold) return null;

  let number = predictedSize === "B"
    ? Math.floor(Math.random() * 5) + 5
    : Math.floor(Math.random() * 5);

  let color = number % 2 === 0 ? "Red" : "Green";

  return {
    size: predictedSize === "B" ? "Big" : "Small",
    number,
    color,
    confidence
  };
}

// ===== Telegram Webhook =====
app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();

  if (!users[chatId]) users[chatId] = { vip: false, banned: false };
  if (users[chatId].banned) return res.sendStatus(200);

  // Admin Telegram Commands
  if (chatId === ADMIN_CHAT_ID) {
    if (text === "/pause") engineConfig.paused = true;
    if (text === "/resume") engineConfig.paused = false;
    if (text === "/forceB") engineConfig.force = "B";
    if (text === "/forceS") engineConfig.force = "S";
    if (text === "/clearforce") engineConfig.force = null;
    if (text === "/reset") {
      history = [];
      stats = { total:0,wins:0,losses:0,currentStreak:0,longestWin:0,longestLoss:0 };
    }
    if (text === "/stats") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `Total: ${stats.total}\nWins: ${stats.wins}\nLosses: ${stats.losses}`
      });
    }
  }

  // Result input like 6B
  if (/^[0-9][BS]$/.test(text)) {
    const number = parseInt(text[0]);
    const size = text[1];

    history.push({ number, size });
    if (history.length > 50) history.shift();

    if (lastPrediction) {
      const win =
        (lastPrediction.size === "Big" && size === "B") ||
        (lastPrediction.size === "Small" && size === "S");

      stats.total++;
      if (win) {
        stats.wins++;
        stats.currentStreak++;
        stats.longestWin = Math.max(stats.longestWin, stats.currentStreak);
      } else {
        stats.losses++;
        stats.currentStreak = 0;
      }
    }

    const prediction = analyze();
    lastPrediction = prediction;

    let reply = prediction
      ? `Prediction: ${prediction.size}\nNumber: ${prediction.number}\nColor: ${prediction.color}\nConfidence: ${prediction.confidence}%`
      : `No Signal`;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: reply
    });
  }

  res.sendStatus(200);
});

// ===== Web Admin Dashboard =====
app.get("/admin", (req, res) => {
  if (req.query.key !== ADMIN_SECRET) return res.status(403).send("Forbidden");

  res.send(`
  <h2>Admin Panel</h2>
  <p>Total: ${stats.total}</p>
  <p>Wins: ${stats.wins}</p>
  <p>Losses: ${stats.losses}</p>
  <p>History Count: ${history.length}</p>
  <p>Paused: ${engineConfig.paused}</p>
  <p>Force: ${engineConfig.force || "None"}</p>
  `);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Admin + AI System Running");
});
