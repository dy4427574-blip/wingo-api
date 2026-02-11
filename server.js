const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;

let history = [];
let wins = 0;
let losses = 0;
let lastPrediction = null;

// ===== Helper: Convert number to B/S =====
function getSize(num) {
  return num >= 5 ? "Big" : "Small";
}

// ===== Prediction Logic (Frequency Based) =====
function analyzeHistory() {
  let countBig = 0;
  let countSmall = 0;

  history.forEach((num) => {
    if (num >= 5) countBig++;
    else countSmall++;
  });

  let size = countBig >= countSmall ? "Big" : "Small";
  let number = size === "Big"
    ? Math.floor(Math.random() * 5) + 5
    : Math.floor(Math.random() * 5);

  return {
    number,
    size,
  };
}

// ===== Telegram Webhook =====
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  // ===== START =====
  if (text === "/start") {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: "✅ Bot Ready!\n\nSend at least 5 results in one message.\nExample:\n6B\n4S\n2S\n9B"
    });
  }

  // ===== STATS =====
  else if (text === "/stats") {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: `📊 Stats\n\nStored: ${history.length}\nWins: ${wins}\nLosses: ${losses}`
    });
  }

  // ===== PREDICT =====
  else if (text === "/predict") {
    if (history.length < 5) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: "⚠️ Not enough history. Send at least 5 results."
      });
      return res.sendStatus(200);
    }

    const prediction = analyzeHistory();
    lastPrediction = prediction;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: `🎯 Prediction\n\nNumber: ${prediction.number}\nSize: ${prediction.size}`
    });
  }

  // ===== RESULTS INPUT (MULTIPLE IN ONE MESSAGE) =====
  else {
    const lines = text.split("\n");

    let added = 0;

    lines.forEach(line => {
      line = line.trim().toUpperCase();

      if (!line) return;

      let number = parseInt(line);

      if (!isNaN(number) && number >= 0 && number <= 9) {
        history.push(number);
        added++;
      }
    });

    if (added > 0) {
      if (history.length > 50) {
        history = history.slice(-50);
      }

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `✅ ${added} results added.\nTotal Stored: ${history.length}`
      });
    }

    // ===== Win/Loss Check =====
    if (lastPrediction && added === 1) {
      const actual = history[history.length - 1];
      const actualSize = getSize(actual);

      if (actualSize === lastPrediction.size) {
        wins++;
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "✅ WIN 🎉"
        });
      } else {
        losses++;
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: "❌ LOSS"
        });
      }

      lastPrediction = null;
    }
  }

  res.sendStatus(200);
});

// ===== Root Check =====
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
