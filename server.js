const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

let history = [];
let session = {
  wins: 0,
  losses: 0,
  total: 0,
  lossStreak: 0,
  lastPrediction: null
};

function send(chatId, text) {
  return axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: chatId,
    text
  });
}

function classify(n) {
  return n >= 5 ? "BIG" : "SMALL";
}

function analyze() {
  if (history.length < 20) return null;

  const last20 = history.slice(-20);
  const last10 = history.slice(-10);
  const last5 = history.slice(-5);

  const big20 = last20.filter(x => x === "BIG").length;
  const small20 = 20 - big20;

  const big10 = last10.filter(x => x === "BIG").length;
  const small10 = 10 - big10;

  let streak = 1;
  for (let i = history.length - 1; i > 0; i--) {
    if (history[i] === history[i - 1]) streak++;
    else break;
  }

  let prediction;
  let confidence = 55;

  // 1️⃣ Strong streak reversal
  if (streak >= 4) {
    prediction = history[history.length - 1] === "BIG" ? "SMALL" : "BIG";
    confidence = 65;
  }

  // 2️⃣ Extreme bias reversal
  else if (big20 >= 14) {
    prediction = "SMALL";
    confidence = 63;
  } else if (small20 >= 14) {
    prediction = "BIG";
    confidence = 63;
  }

  // 3️⃣ Strong short momentum
  else if (big10 >= 7) {
    prediction = "BIG";
    confidence = 60;
  } else if (small10 >= 7) {
    prediction = "SMALL";
    confidence = 60;
  }

  // 4️⃣ Mild bias fallback (almost no skip)
  else {
    prediction = big20 >= small20 ? "BIG" : "SMALL";
    confidence = 56;
  }

  return { prediction, confidence };
}

app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === "/reset") {
    history = [];
    session = {
      wins: 0,
      losses: 0,
      total: 0,
      lossStreak: 0,
      lastPrediction: null
    };
    await send(chatId, "Session Reset ✅");
    return res.sendStatus(200);
  }

  if (text === "/stats") {
    const winRate =
      session.total > 0
        ? ((session.wins / session.total) * 100).toFixed(1)
        : 0;

    await send(
      chatId,
      `📊 Session Stats\nWins: ${session.wins}\nLosses: ${session.losses}\nWinRate: ${winRate}%\nLoss Streak: ${session.lossStreak}`
    );
    return res.sendStatus(200);
  }

  if (text === "/predict") {
    const result = analyze();

    if (!result) {
      await send(chatId, "Need 20+ results");
      return res.sendStatus(200);
    }

    session.lastPrediction = result.prediction;

    await send(
      chatId,
      `🎯 Prediction: ${result.prediction}\nConfidence: ${result.confidence}%`
    );

    return res.sendStatus(200);
  }

  const numberMatch = text.match(/\d/);
  if (numberMatch) {
    const num = parseInt(numberMatch[0]);

    if (!isNaN(num) && num >= 0 && num <= 9) {
      const type = classify(num);
      history.push(type);

      if (history.length > 50) history = history.slice(-50);

      if (session.lastPrediction) {
        session.total++;

        if (session.lastPrediction === type) {
          session.wins++;
          session.lossStreak = 0;
          await send(chatId, "✅ WIN");
        } else {
          session.losses++;
          session.lossStreak++;
          await send(chatId, "❌ LOSS");
        }

        session.lastPrediction = null;

        if (session.lossStreak >= 3) {
          await send(chatId, "⚠ 3 Loss Streak — Consider Pause");
        }
      }
    }
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Low-Skip Probability Engine Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Running"));
