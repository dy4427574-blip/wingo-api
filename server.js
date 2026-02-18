import logging
from collections import deque
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters

TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"

data = deque(maxlen=50)

logging.basicConfig(level=logging.INFO)

def start(update, context):
    update.message.reply_text(
        "✅ Bot Ready\n\n"
        "/import numbers\n"
        "/add 5\n"
        "/predict\n"
        "/reset"
    )

def reset(update, context):
    data.clear()
    update.message.reply_text("✅ Data reset")

def import_data(update, context):
    try:
        nums = context.args
        added = 0
        for n in nums:
            if n.isdigit() and 0 <= int(n) <= 9:
                data.append(int(n))
                added += 1
        update.message.reply_text(f"✅ Imported {added} results\nStored: {len(data)}")
    except:
        update.message.reply_text("❌ Format: /import 1 2 3 4")

def add(update, context):
    if len(context.args) == 0:
        update.message.reply_text("❌ Use /add number")
        return
    n = context.args[0]
    if n.isdigit():
        data.append(int(n))
        update.message.reply_text(f"✅ Added {n}\nStored: {len(data)}")
    else:
        update.message.reply_text("❌ Invalid")

def predict(update, context):
    if len(data) < 10:
        update.message.reply_text("⚠️ Need more data")
        return

    recent = list(data)[-15:]
    big = sum(1 for x in recent if x >= 5)
    small = len(recent) - big

    if big > small:
        result = "BIG"
    elif small > big:
        result = "SMALL"
    else:
        result = "SKIP"

    update.message.reply_text(
        f"📊 Last 15 analysis\n"
        f"BIG: {big}\n"
        f"SMALL: {small}\n\n"
        f"👉 Prediction: {result}"
    )

def main():
    updater = Updater(TOKEN, use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("reset", reset))
    dp.add_handler(CommandHandler("import", import_data))
    dp.add_handler(CommandHandler("add", add))
    dp.add_handler(CommandHandler("predict", predict))

    updater.start_polling()
    updater.idle()

if __name__ == "__main__":
    main()
