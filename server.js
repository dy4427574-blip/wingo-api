const TelegramBot = require("node-telegram-bot-api");

if (!process.env.BOT_TOKEN) {
  console.log("BOT_TOKEN missing");
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

let history = [];

function predict(data) {
  if (data.length < 10) return "WAIT";

  let big = data.filter(n => n >= 5).length;
  let small = data.filter(n => n < 5).length;

  return big > small ? "SMALL" : "BIG";
}

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, "Send results (space separated)");
});

bot.on("message", msg => {
  if (msg.text.startsWith("/")) return;

  const nums = msg.text
    .split(/[\s,]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  if (!nums.length) return;

  history.push(...nums);
  history = history.slice(-50);

  const p = predict(history);

  bot.sendMessage(msg.chat.id, `Stored: ${history.length}\nPrediction: ${p}`);
});

console.log("Bot running");
