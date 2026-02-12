const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

const BET = 50;
const TARGET = 300;
const STOPLOSS = -500;

let history = [];
let session = {
  profit: 0,
  wins: 0,
  losses: 0,
  lossStreak: 0,
  active: true,
  lastPrediction: null
};

// Send Message
async function send(chatId, text) {
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// Helper
function size(n) {
  return n >= 5 ? "BIG" : "SMALL";
}

// Hybrid Logic
function hybridPrediction() {

  if (history.length < 6) return null;

  const last6 = history.slice(-6).map(size);
  const last15 = history.slice(-15).map(size);

  // Count momentum
  const big6 = last6.filter(x => x === "BIG").length;
  const small6 = last6.filter(x => x === "SMALL").length;

  const big15 = last15.filter(x => x === "BIG").length;
  const small15 = last15.filter(x => x === "SMALL").length;

  // Streak check
  let streak = 1;
  for (let i = history.length - 1; i > 0; i--) {
    if (size(history[i]) === size(history[i - 1])) streak++;
    else break;
  }

  // Reversal mode (4+ streak)
  if (streak >= 4) {
    const last = size(history[history.length - 1]);
    return last === "BIG" ? "SMALL" : "BIG";
  }

  // Momentum mode
  if (big6 >= 4 && big15 / last15.length >= 0.6) return "BIG";
  if (small6 >= 4 && small15 / last15.length >= 0.6) return "SMALL";

  return null; // Skip
}

// Webhook
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Reset
  if (text === "/reset") {
    history = [];
    session = {
      profit: 0,
      wins: 0,
      losses: 0,
      lossStreak: 0,
      active: true,
      lastPrediction: null
    };
    await send(chatId, "Session Reset ✅");
    return res.sendStatus(200);
  }

  // Stats
  if (text === "/stats") {
    await send(chatId,
      `📊 Session\nProfit: ₹${session.profit}\nWins: ${session.wins}\nLosses: ${session.losses}\nLoss Streak: ${session.lossStreak}`
    );
    return res.sendStatus(200);
  }

  // Predict
  if (text === "/predict") {

    if (!session.active) {
      await send(chatId, "🚫 Session Closed. Use /reset");
      return res.sendStatus(200);
    }

    const prediction = hybridPrediction();

    if (!prediction) {
      await send(chatId, "⚠️ Skip");
      return res.sendStatus(200);
    }

    session.lastPrediction = prediction;
    await send(chatId, `🎯 Prediction: ${prediction}`);

    return res.sendStatus(200);
  }

  // Result input
  const numbers = text.match(/\d/g);
  if (numbers) {

    const num = parseInt(numbers[0]);
    history.push(num);
    if (history.length > 50) history = history.slice(-50);

    if (session.lastPrediction && session.active) {

      const actual = size(num);

      if (actual === session.lastPrediction) {
        session.wins++;
        session.profit += BET;
        session.lossStreak = 0;
        await send(chatId, "✅ WIN");
      } else {
        session.losses++;
        session.profit -= BET;
        session.lossStreak++;
        await send(chatId, "❌ LOSS");
      }

      session.lastPrediction = null;

      // Stop conditions
      if (session.profit >= TARGET) {
        session.active = false;
        await send(chatId, "🎯 Target Hit. Stop.");
      }

      if (session.profit <= STOPLOSS) {
        session.active = false;
        await send(chatId, "🚨 Stop Loss Hit. Session Closed.");
      }

      if (session.lossStreak >= 3) {
        session.active = false;
        await send(chatId, "⚠️ 3 Loss Streak. Session Stopped.");
      }
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Hybrid Big/Small Engine Running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
