const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;

let history = [];
let wins = 0;
let losses = 0;
let lastPrediction = null;

/* ===========================
   Helper: Send Telegram Msg
=========================== */
async function send(chatId, text) {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: text
    });
}

/* ===========================
   AI Analysis Logic
=========================== */
function analyze(data) {
    let big = 0;
    let small = 0;

    data.forEach(n => {
        if (n >= 5) big++;
        else small++;
    });

    let size;
    let confidence;

    if (big > small) {
        size = "Small"; // reversal logic
        confidence = Math.round((big / data.length) * 100);
    } else {
        size = "Big";
        confidence = Math.round((small / data.length) * 100);
    }

    let number = size === "Big"
        ? Math.floor(Math.random() * 5) + 5
        : Math.floor(Math.random() * 5);

    return { size, number, confidence };
}

/* ===========================
   WEBHOOK
=========================== */
app.post("/webhook", async (req, res) => {

    const msg = req.body.message;
    if (!msg || !msg.text) return res.sendStatus(200);

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    /* ===== RESET ===== */
    if (text === "/reset") {
        history = [];
        wins = 0;
        losses = 0;
        lastPrediction = null;
        await send(chatId, "✅ History, Wins, Losses cleared successfully");
        return res.sendStatus(200);
    }

    /* ===== STATS ===== */
    if (text === "/stats") {
        await send(chatId,
            `📊 Stats\n\n` +
            `Total Stored: ${history.length}\n` +
            `Wins: ${wins}\n` +
            `Losses: ${losses}`
        );
        return res.sendStatus(200);
    }

    /* ===== PREDICT ===== */
    if (text === "/predict") {

        if (history.length < 5) {
            await send(chatId, "⚠ Not enough history. Send at least 5 results.");
            return res.sendStatus(200);
        }

        lastPrediction = analyze(history);

        await send(chatId,
            `🎯 Prediction\n\n` +
            `Size: ${lastPrediction.size}\n` +
            `Number: ${lastPrediction.number}\n` +
            `Confidence: ${lastPrediction.confidence}%`
        );

        return res.sendStatus(200);
    }

    /* ===== HANDLE RESULTS (Single OR Bulk) ===== */

    // Extract all digits from message
    const numbers = text.match(/\d/g);

    if (numbers) {

        const parsed = numbers.map(n => parseInt(n));

        // If only ONE number → possible win/loss check
        if (parsed.length === 1) {

            const actual = parsed[0];

            if (lastPrediction) {
                const actualSize = actual >= 5 ? "Big" : "Small";

                if (actualSize === lastPrediction.size) {
                    wins++;
                    await send(chatId, "✅ WIN 🎉");
                } else {
                    losses++;
                    await send(chatId, "❌ LOSS");
                }

                lastPrediction = null;
            }

            history.push(actual);

            if (history.length > 50)
                history = history.slice(-50);

            await send(chatId, "✔ 1 result added");

            return res.sendStatus(200);
        }

        // If MULTIPLE numbers → bulk history add
        parsed.forEach(n => history.push(n));

        if (history.length > 50)
            history = history.slice(-50);

        await send(chatId, `✔ ${parsed.length} results added (Max 50 stored)`);

        return res.sendStatus(200);
    }

    res.sendStatus(200);
});

/* ===========================
   ROOT CHECK
=========================== */
app.get("/", (req, res) => {
    res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
