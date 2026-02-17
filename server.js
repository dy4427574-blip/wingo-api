const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN; // Telegram bot token
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

let history = [];

// ---------- Prediction Function ----------
function predictBigSmall(numbers) {
  if (!numbers || numbers.length < 20) {
    return { prediction: "WAIT", confidence: 0, mode: "Need more data" };
  }

  const last50 = numbers.slice(-50);
  const mapped = last50.map(n => (n >= 5 ? "BIG" : "SMALL"));

  const bigCount = mapped.filter(x => x === "BIG").length;
  const smallCount = mapped.filter(x => x === "SMALL").length;

  const last10 = mapped.slice(-10);
  const recentBig = last10.filter(x => x === "BIG").length;
  const recentSmall = last10.filter(x => x === "SMALL").length;

  let streakSide = mapped[mapped.length - 1];
  let streak = 1;
  for (let i = mapped.length - 2; i >= 0; i--) {
    if (mapped[i] === streakSide) streak++;
    else break;
  }

  const trendScore = bigCount - smallCount;
  const recentTrend = recentBig - recentSmall;

  let prediction;
  let mode;

  if (streak >= 4) {
    prediction = streakSide === "BIG" ? "SMALL" : "BIG";
    mode = "Streak Reversal";
  } else if (Math.abs(trendScore) >= 6) {
    prediction = trendScore > 0 ? "SMALL" : "BIG";
    mode = "Ratio Reversal";
  } else if (recentTrend > 0) {
    prediction = "BIG";
    mode = "Recent Trend";
  } else {
    prediction = "SMALL";
    mode = "Recent Trend";
  }

  let confidence = 50 + Math.abs(recentTrend) * 3 + Math.min(streak * 2, 10);
  if (confidence > 78) confidence = 78;

  return { prediction, confidence, mode };
}

// ---------- Send Message ----------
async function sendMessage(chatId, text) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

// ---------- Webhook ----------
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // Reset history
  if (text === "/reset") {
    history = [];
    await sendMessage(chatId, "History cleared ✅");
    return res.sendStatus(200);
  }

  // Prediction command
  if (text === "/predict") {
    const result = predictBigSmall(history);

    if (result.prediction === "WAIT") {
      await sendMessage(chatId, "⚠ Minimum 20 results needed");
      return res.sendStatus(200);
    }

    await sendMessage(
      chatId,
      `🎯 Prediction: ${result.prediction}
📊 Confidence: ${result.confidence}%
📈 Mode: ${result.mode}`
    );

    return res.sendStatus(200);
  }

  // Number input (result)
  const num = parseInt(text);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    history.push(num);

    if (history.length > 50) history = history.slice(-50);

    await sendMessage(chatId, `Result added ✅ (Total stored: ${history.length})`);
    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ---------- Root ----------
app.get("/", (req, res) => {
  res.send("Prediction Bot Running");
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
