const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
app.use(express.json());

let results = [];

// number → BIG / SMALL
function getType(num) {
  return num >= 5 ? "BIG" : "SMALL";
}

// prediction logic (last 15 focus, last 7 high weight)
function predict() {
  if (results.length < 5) return "Not enough data";

  let last15 = results.slice(-15);
  let last7 = results.slice(-7);

  let bigScore = 0;
  let smallScore = 0;

  last15.forEach(n => {
    if (n >= 5) bigScore += 1;
    else smallScore += 1;
  });

  last7.forEach(n => {
    if (n >= 5) bigScore += 2;   // high weight
    else smallScore += 2;
  });

  return bigScore >= smallScore ? "BIG" : "SMALL";
}

// command: /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Wingo AI Bot Active\nSend number or /predict");
});

// command: /predict
bot.onText(/\/predict/, (msg) => {
  const prediction = predict();
  bot.sendMessage(msg.chat.id, `Prediction: ${prediction}`);
});

// command: /reset
bot.onText(/\/reset/, (msg) => {
  results = [];
  bot.sendMessage(msg.chat.id, "Data reset ✅");
});

// receive number
bot.on("message", (msg) => {
  const text = msg.text;

  if (!text) return;
  if (text.startsWith("/")) return;

  const num = parseInt(text);

  if (!isNaN(num) && num >= 0 && num <= 9) {
    results.push(num);

    if (results.length > 50) results.shift();

    bot.sendMessage(
      msg.chat.id,
      `Added: ${num} (${getType(num)})\nStored: ${results.length}`
    );
  }
});

// express server
app.get("/", (req, res) => {
  res.send("Wingo AI Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
