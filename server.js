const TelegramBot = require("node-telegram-bot-api");

// 🔑 Telegram Bot Token
const token = process.env.BOT_TOKEN || "PASTE_YOUR_TOKEN_HERE";

const bot = new TelegramBot(token, { polling: true });

// 🧠 history store
let history = [];

// 🎯 convert number → Big / Small
function getBS(n) {
  return n >= 5 ? "BIG" : "SMALL";
}

// 🧠 prediction logic
function predict() {
  if (history.length < 10) {
    return "Not enough data";
  }

  let last10 = history.slice(-10);

  let bigCount = last10.filter(n => n >= 5).length;
  let smallCount = last10.filter(n => n < 5).length;

  if (bigCount > smallCount) return "SMALL";
  if (smallCount > bigCount) return "BIG";

  return Math.random() > 0.5 ? "BIG" : "SMALL";
}

// 🧾 start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "✅ Bot ready\nSend past results (numbers)");
});

// 🔄 reset
bot.onText(/\/reset/, (msg) => {
  history = [];
  bot.sendMessage(msg.chat.id, "♻️ History reset");
});

// 📊 stats
bot.onText(/\/stats/, (msg) => {
  let big = history.filter(n => n >= 5).length;
  let small = history.filter(n => n < 5).length;

  bot.sendMessage(
    msg.chat.id,
    `📊 Stats\nTotal: ${history.length}\nBIG: ${big}\nSMALL: ${small}`
  );
});

// 📥 handle numbers (single ya multi line)
bot.on("message", (msg) => {
  const text = msg.text.trim();

  if (text.startsWith("/")) return;

  // split by space, comma, newline
  const numbers = text
    .split(/[\s,]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  if (numbers.length === 0) return;

  numbers.forEach(n => {
    history.push(n);
    if (history.length > 50) history.shift();
  });

  bot.sendMessage(
    msg.chat.id,
    `✅ Result added (Total stored: ${history.length})`
  );

  const p = predict();

  if (p === "Not enough data") {
    bot.sendMessage(msg.chat.id, "⏳ Need at least 10 results");
  } else {
    bot.sendMessage(msg.chat.id, `🎯 Next Prediction: ${p}`);
  }
});
