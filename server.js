const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

let history = [];

// Add Result API
app.post("/add-result", (req, res) => {
  const { number } = req.body;

  if (number === undefined) {
    return res.status(400).json({ error: "Number required" });
  }

  const size = number >= 5 ? "Big" : "Small";
  const color = number % 2 === 0 ? "Red" : "Green";

  history.push({ number, size, color });

  if (history.length > 100) history.shift();

  res.json({ message: "Result added" });
});

// Prediction Logic
function generatePrediction() {
  if (history.length < 5) return null;

  let last5 = history.slice(-5);

  let bigCount = last5.filter(r => r.size === "Big").length;
  let smallCount = last5.filter(r => r.size === "Small").length;

  let greenCount = last5.filter(r => r.color === "Green").length;
  let redCount = last5.filter(r => r.color === "Red").length;

  let predictedSize = smallCount > bigCount ? "Big" : "Small";
  let predictedColor = greenCount > redCount ? "Red" : "Green";

  let predictedNumber =
    predictedSize === "Big"
      ? Math.floor(Math.random() * 5) + 5
      : Math.floor(Math.random() * 5);

  return {
    number: predictedNumber,
    size: predictedSize,
    color: predictedColor
  };
}

// Telegram Webhook
app.post("/", async (req, res) => {
  const message = req.body.message;

  if (message && message.text === "/predict") {
    const chatId = message.chat.id;

    const prediction = generatePrediction();

    if (!prediction) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "Not enough data. Add at least 5 results first."
      });
    } else {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: `🎯 Prediction:\nNumber: ${prediction.number}\nSize: ${prediction.size}\nColor: ${prediction.color}`
      });
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot running..."));
