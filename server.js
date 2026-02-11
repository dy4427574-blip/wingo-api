const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let history = [];

/* ========= PREDICTION LOGIC ========= */

function predictNext() {
  if (history.length < 5) {
    return {
      number: 5,
      size: "Big",
      color: "Green"
    };
  }

  let last = history.slice(-10);

  let big = last.filter(n => n >= 5).length;
  let small = last.filter(n => n < 5).length;

  let predictionNumber;

  if (big > small) {
    predictionNumber = Math.floor(Math.random() * 5);
  } else {
    predictionNumber = Math.floor(Math.random() * 5) + 5;
  }

  return {
    number: predictionNumber,
    size: predictionNumber >= 5 ? "Big" : "Small",
    color: predictionNumber % 2 === 0 ? "Red" : "Green"
  };
}

/* ========= ADD RESULT ========= */

app.post("/add-result", (req, res) => {
  const { number } = req.body;

  if (number === undefined) {
    return res.status(400).json({ error: "Number required" });
  }

  history.push(Number(number));

  if (history.length > 100) {
    history.shift();
  }

  res.json({
    message: "Result stored",
    total: history.length
  });
});

/* ========= GET PREDICTION ========= */

app.get("/predict", (req, res) => {
  res.json(predictNext());
});

/* ========= TELEGRAM WEBHOOK ========= */

app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === "/predict") {
    const prediction = predictNext();

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `🎯 Prediction:
Number: ${prediction.number}
Size: ${prediction.size}
Color: ${prediction.color}`
    });
  }

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Server running...");
});
