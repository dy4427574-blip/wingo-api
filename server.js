const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

let results = [];
let wins = 0;
let losses = 0;
let lastPrediction = null;

/* --------------------------
   Basic Analysis Function
---------------------------*/
function analyzeData(history) {
  let big = 0, small = 0;
  let green = 0, red = 0;

  history.forEach(r => {
    let num = parseInt(r);

    if (num >= 5) big++;
    else small++;

    if (num % 2 === 0) red++;
    else green++;
  });

  let size = big >= small ? "Big" : "Small";
  let color = green >= red ? "Green" : "Red";

  let number = Math.floor(Math.random() * 10);

  return { number, size, color };
}

/* --------------------------
   Telegram Webhook
---------------------------*/
app.post(`/webhook`, async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  // User sends 50 results history
  if (text.startsWith("HISTORY")) {
    let data = text.replace("HISTORY", "").trim().split("\n");
    results = data.slice(-50);

    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: "✅ History stored (last 50 results saved)"
    });
  }

  // Prediction
  else if (text === "/predict") {
    if (results.length < 5) {
      return axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ Not enough history. Send at least 5 results."
      });
    }

    let prediction = analyzeData(results);
    lastPrediction = prediction;

    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: chatId,
      text:
        `🎯 Prediction:\n` +
        `Number: ${prediction.number}\n` +
        `Size: ${prediction.size}\n` +
        `Color: ${prediction.color}`
    });
  }

  // User sends next result to check win/loss
  else if (/^[0-9]$/.test(text)) {
    let actual = parseInt(text);

    if (lastPrediction) {
      let win = false;

      if (lastPrediction.number == actual) win = true;

      if (win) wins++;
      else losses++;

      results.push(actual);
      if (results.length > 50) results.shift();

      await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: win ? "✅ WIN" : "❌ LOSS"
      });
    }
  }

  // Stats
  else if (text === "/stats") {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: chatId,
      text:
        `📊 Stats:\n` +
        `Stored Results: ${results.length}\n` +
        `Wins: ${wins}\n` +
        `Losses: ${losses}`
    });
  }

  res.sendStatus(200);
});

/* --------------------------
   Admin Panel
---------------------------*/
app.get("/admin", (req, res) => {
  if (req.query.key !== ADMIN_SECRET) {
    return res.status(403).send("Forbidden");
  }

  res.json({
    totalStoredResults: results.length,
    wins,
    losses,
    lastPrediction
  });
});

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
