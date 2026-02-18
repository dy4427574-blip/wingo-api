const TelegramBot = require("node-telegram-bot-api");
const http = require("http");

const token = process.env.BOT_TOKEN;
if (!token) {
  console.log("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

let history = [];

function predict(data) {
  if (data.length < 10) return "NOT ENOUGH DATA";

  const big = data.filter(n => n >= 5).length;
  const small = data.filter(n => n < 5).length;

  return big > small ? "SMALL" : "BIG";
}

// START
bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, "Send results or use /predict");
});

// RESET
bot.onText(/\/reset/, msg => {
  history = [];
  bot.sendMessage(msg.chat.id, "History cleared ✅");
});

// PREDICT
bot.onText(/\/predict/, msg => {
  const p = predict(history);
  bot.sendMessage(msg.chat.id, `Prediction: ${p}`);
});

// ADD RESULTS
bot.on("message", msg => {
  if (msg.text.startsWith("/")) return;

  const nums = msg.text
    .split(/[\s,]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  if (!nums.length) return;

  history.push(...nums);
  history = history.slice(-50);

  bot.sendMessage(msg.chat.id, `Added ${nums.length} results ✅\nStored: ${history.length}`);
});


// Render port fix
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot running");
}).listen(PORT, () => console.log("Server running"));
