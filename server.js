const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

const BET_AMOUNT = 50;
const TARGET_PROFIT = 300;
const STOP_LOSS = -500;

let history = [];
let session = {
  profit: 0,
  wins: 0,
  losses: 0,
  streakLoss: 0,
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

// Size helper
function getSize(num) {
  return num >= 5 ? "Big" : "Small";
}

// Smart Entry Logic
function shouldEnter() {
  if (history.length < 5) return false;

  const last4 = history.slice(-4);
  const sizes = last4.map(getSize);

  // Entry only if last 4 same
  return sizes.every(s => s === sizes[0]);
}

// Predict opposite of streak
function predict() {
  const lastSize = getSize(history[history.length - 1]);
  const predictedSize = lastSize === "Big" ? "Small" : "Big";

  const number = predictedSize === "Big"
    ? Math.floor(Math.random() * 5) + 5
    : Math.floor(Math.random() * 5);

  return { size: predictedSize, number };
}

// Webhook
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Reset Session
  if (text === "/reset") {
    session = {
      profit: 0,
      wins: 0,
      losses: 0,
      streakLoss: 0,
      active: true,
      lastPrediction: null
    };
    history = [];
    await send(chatId, "Session Reset ✅");
    return res.sendStatus(200);
  }

  // Stats
  if (text === "/stats") {
    const winRate = session.wins + session.losses === 0
      ? 0
      : ((session.wins / (session.wins + session.losses)) * 100).toFixed(1);

    await send(chatId,
      `📊 Session Stats\n\n` +
      `Profit: ₹${session.profit}\n` +
      `Wins: ${session.wins}\n` +
      `Losses: ${session.losses}\n` +
      `Win Rate: ${winRate}%\n` +
      `Loss Streak: ${session.streakLoss}`
    );
    return res.sendStatus(200);
  }

  // Prediction
  if (text === "/predict") {

    if (!session.active) {
      await send(chatId, "🚫 Session Closed. Use /reset");
      return res.sendStatus(200);
    }

    if (!shouldEnter()) {
      await send(chatId, "⚠ Skip Round (No strong streak)");
      return res.sendStatus(200);
    }

    const p = predict();
    session.lastPrediction = p;

    await send(chatId,
      `🎯 ENTRY\n` +
      `Size: ${p.size}\n` +
      `Number: ${p.number}\n` +
      `Bet: ₹${BET_AMOUNT}`
    );

    return res.sendStatus(200);
  }

  // Handle result input
  const numbers = text.match(/\d/g);
  if (numbers) {
    const num = parseInt(numbers[0]);

    history.push(num);
    if (history.length > 50) history = history.slice(-50);

    if (session.lastPrediction && session.active) {
      const actualSize = getSize(num);

      if (actualSize === session.lastPrediction.size) {
        session.wins++;
        session.profit += BET_AMOUNT;
        session.streakLoss = 0;
        await send(chatId, "✅ WIN");
      } else {
        session.losses++;
        session.profit -= BET_AMOUNT;
        session.streakLoss++;
        await send(chatId, "❌ LOSS");
      }

      session.lastPrediction = null;

      // Stop Conditions
      if (session.profit >= TARGET_PROFIT) {
        session.active = false;
        await send(chatId, "🎯 TARGET HIT. STOP SESSION.");
      }

      if (session.profit <= STOP_LOSS) {
        session.active = false;
        await send(chatId, "🚨 STOP LOSS HIT. SESSION CLOSED.");
      }

      if (session.streakLoss >= 3) {
        await send(chatId, "⚠ 3 Loss Streak. Skip Next 2 Rounds.");
      }
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Pro Session Prediction Engine Running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
