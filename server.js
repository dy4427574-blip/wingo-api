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
  lastSignal: null
};

// Send message
async function send(chatId, text) {
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// Size helper
function getSize(n) {
  return n >= 5 ? "BIG" : "SMALL";
}

// Hybrid analysis
function analyze() {
  if (history.length < 10) return null;

  const last10 = history.slice(-10).map(getSize);
  const last20 = history.slice(-20).map(getSize);

  const big10 = last10.filter(x => x === "BIG").length;
  const small10 = 10 - big10;

  const big20 = last20.filter(x => x === "BIG").length;
  const small20 = last20.length - big20;

  let streak = 1;
  for (let i = history.length - 1; i > 0; i--) {
    if (getSize(history[i]) === getSize(history[i - 1])) streak++;
    else break;
  }

  let prediction = null;
  let confidence = 50;

  // Reversal mode
  if (streak >= 4) {
    const last = getSize(history[history.length - 1]);
    prediction = last === "BIG" ? "SMALL" : "BIG";
    confidence = 65 + Math.min(streak * 2, 10);
  }
  // Momentum mode
  else if (big10 >= 6 && big20 / last20.length >= 0.6) {
    prediction = "BIG";
    confidence = 60 + Math.floor((big10 - 5) * 3);
  }
  else if (small10 >= 6 && small20 / last20.length >= 0.6) {
    prediction = "SMALL";
    confidence = 60 + Math.floor((small10 - 5) * 3);
  }

  if (!prediction) return null;

  return { prediction, confidence };
}

app.post("/webhook", async (req, res) => {

  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // RESET
  if (text === "/reset") {
    history = [];
    session = {
      profit: 0,
      wins: 0,
      losses: 0,
      lossStreak: 0,
      active: true,
      lastSignal: null
    };
    await send(chatId, "Session Reset ✅");
    return res.sendStatus(200);
  }

  // STATUS
  if (text === "/stats") {
    await send(chatId,
      `📊 Session Stats\n\n` +
      `Profit: ₹${session.profit}\n` +
      `Wins: ${session.wins}\n` +
      `Losses: ${session.losses}\n` +
      `Loss Streak: ${session.lossStreak}`
    );
    return res.sendStatus(200);
  }

  // PREDICT
  if (text === "/predict") {

    if (!session.active) {
      await send(chatId, "🚫 Session Closed. Use /reset");
      return res.sendStatus(200);
    }

    const result = analyze();

    if (!result) {
      await send(chatId, "⚠ No Trade (No Clear Edge)");
      return res.sendStatus(200);
    }

    session.lastSignal = result.prediction;

    await send(chatId,
      `🎯 Signal: ${result.prediction}\nConfidence: ${result.confidence}%`
    );

    return res.sendStatus(200);
  }

  // RESULT INPUT
  const numbers = text.match(/\d/g);
  if (numbers) {

    const num = parseInt(numbers[0]);
    history.push(num);
    if (history.length > 50) history = history.slice(-50);

    if (session.lastSignal && session.active) {

      const actual = getSize(num);

      if (actual === session.lastSignal) {
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

      session.lastSignal = null;

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
        await send(chatId, "⚠ 3 Consecutive Losses. Session Stopped.");
      }
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Hybrid Safe Big/Small Engine Running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running");
});
