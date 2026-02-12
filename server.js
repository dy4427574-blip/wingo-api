const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

let history = [];
let wins = 0;
let losses = 0;
let lastPrediction = null;

// ===== Helper Functions =====

function getSize(num) {
  return num >= 5 ? "Big" : "Small";
}

function analyzeHistory(data) {
  let big = 0;
  let small = 0;

  data.forEach(n => {
    if (n >= 5) big++;
    else small++;
  });

  const sizePrediction = big > small ? "Small" : "Big"; // reverse logic strategy

  const randomNumber =
    sizePrediction === "Big"
      ? Math.floor(Math.random() * 5) + 5
      : Math.floor(Math.random() * 5);

  return {
    number: randomNumber,
    size: sizePrediction
  };
}

function extractNumbers(text) {
  const matches = text.match(/\d+/g);
  if (!matches) return [];
  return matches.map(n => parseInt(n));
}

// ===== WEBHOOK =====

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    // ===== ADMIN CLEAR =====
    if (text.startsWith("/admin_clear")) {
      const parts = text.split(" ");
      const pass = parts[1];

      if (pass !== ADMIN_SECRET) {
        await axios.post(
          `https://api.telegram.org/bot${TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: "❌ Wrong admin password"
          }
        );
        return res.sendStatus(200);
      }

      history = [];
      wins = 0;
      losses = 0;
      lastPrediction = null;

      await axios.post(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text: "✅ History, Wins, Losses cleared successfully"
        }
      );

      return res.sendStatus(200);
    }

    // ===== STATS =====
    if (text === "/stats") {
      await axios.post(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text:
            `📊 Stats:\n` +
            `History Size: ${history.length}\n` +
            `Wins: ${wins}\n` +
            `Losses: ${losses}`
        }
      );
      return res.sendStatus(200);
    }

    // ===== PREDICTION =====
    if (text === "/predict") {
      if (history.length < 5) {
        await axios.post(
          `https://api.telegram.org/bot${TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: "⚠️ Send at least 5 results first."
          }
        );
        return res.sendStatus(200);
      }

      const prediction = analyzeHistory(history);
      lastPrediction = prediction;

      await axios.post(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text:
            `🎯 Prediction:\n` +
            `Number: ${prediction.number}\n` +
            `Size: ${prediction.size}`
        }
      );

      return res.sendStatus(200);
    }

    // ===== HISTORY INPUT (50 results in one message supported) =====
    const numbers = extractNumbers(text);

    if (numbers.length > 0) {
      numbers.forEach(n => {
        history.push(n);
      });

      // Keep max 50
      if (history.length > 50) {
        history = history.slice(-50);
      }

      // Win/Loss check if prediction exists and only 1 new result came
      if (lastPrediction && numbers.length === 1) {
        const actual = numbers[0];
        const actualSize = getSize(actual);

        if (actualSize === lastPrediction.size) {
          wins++;
          await axios.post(
            `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            {
              chat_id: chatId,
              text: "✅ WIN 🎉"
            }
          );
        } else {
          losses++;
          await axios.post(
            `https://api.telegram.org/bot${TOKEN}/sendMessage`,
            {
              chat_id: chatId,
              text: "❌ LOSS"
            }
          );
        }

        lastPrediction = null;
      } else {
        await axios.post(
          `https://api.telegram.org/bot${TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: `✅ ${numbers.length} result(s) stored.\nCurrent History: ${history.length}`
          }
        );
      }

      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ===== ROOT CHECK =====
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
