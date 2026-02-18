const TelegramBot = require("node-telegram-bot-api");
const http = require("http");

// 🔑 TOKEN
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// 🧠 history
let history = [];

// 🎯 prediction
function predict() {
  if (history.length < 10) return null;

  let last10 = history.slice(-10);
  let big = last10.filter(n => n >= 5).length;
  let small = last10.filter(n => n < 5).length;

  if (big > small) return "SMALL";
  if (small > big) return "BIG";

  return Math.random() > 0.5 ? "BIG" : "SMALL";
}

// /start
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, "✅ Bot ready\nSend numbers");
});

// /reset
bot.onText(/\/reset/, msg => {
  history = [];
  bot.sendMessage(msg.chat.id, "♻️ Reset done");
});

// /stats
bot.onText(/\/stats/, msg => {
  let big = history.filter(n => n >= 5).length;
  let small = history.filter(n => n < 5).length;

  bot.sendMessage(msg.chat.id, `📊 Total: ${history.length}\nBIG: ${big}\nSMALL: ${small}`);
});

// numbers input
bot.on("message", msg => {
  const text = msg.text.trim();
  if (text.startsWith("/")) return;

  const nums = text
    .split(/[\s,]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  if (!nums.length) return;

  nums.forEach(n => {
    history.push(n);
    if (history.length > 50) history.shift();
  });

  bot.sendMessage(msg.chat.id, `✅ Added (${history.length})`);

  const p = predict();
  if (!p) return bot.sendMessage(msg.chat.id, "⏳ Need more data");

  bot.sendMessage(msg.chat.id, `🎯 Prediction: ${p}`);
});

// 🌐 web server for render
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot running");
}).listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
