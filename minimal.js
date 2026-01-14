require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { middleware, Client } = require("@line/bot-sdk");

const app = express();

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// ⭐ LINE webhook ต้องใช้ RAW body เท่านั้น
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {
    console.log("🔥🔥🔥 LINE WEBHOOK HIT 🔥🔥🔥");
    console.log(JSON.stringify(req.body, null, 2));

    const event = req.body.events[0];

    if (event?.replyToken) {
      await client.replyMessage(event.replyToken, {
        type: "text",
        text: "BOT ALIVE ✅"
      });
    }

    res.sendStatus(200);
  }
);

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
