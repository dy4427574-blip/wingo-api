const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let history = [];

function analyzePrediction(data) {
  if (data.length < 10) {
    return "Not enough data";
  }

  let bigCount = 0;
  let smallCount = 0;

  data.forEach(num => {
    if (num >= 5) bigCount++;
    else smallCount++;
  });

  if (bigCount > smallCount) return "SMALL";
  if (smallCount > bigCount) return "BIG";

  return Math.random() > 0.5 ? "BIG" : "SMALL";
}

bot.onText(/\/start/, msg => {
  bot.sendMessage(
    msg.chat.id,
    "✅ Bot ready\n\nSend last 50 results separated by space\nExample:\n1 4 7 3 9"
  );
});

bot.on("message", msg => {
  if (msg.text.startsWith("/")) return;

  const numbers = msg.text
    .split(/[\s,]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  if (numbers.length === 0) return;

  numbers.forEach(n => history.push(n));

  if (history.length > 50) {
    history = history.slice(-50);
  }

  const prediction = analyzePrediction(history);

  bot.sendMessage(
    msg.chat.id,
    `📊 Total stored: ${history.length}\n🔮 Next Prediction: ${prediction}`
  );
});

console.log("Bot running...");
