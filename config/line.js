const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

/* =====================================================
   SAFE REPLY
===================================================== */
async function reply(replyToken, message) {

  if (!replyToken || !message) return;

  const payload =
    typeof message === "string"
      ? { type: "text", text: message }
      : message;

  return client.replyMessage(replyToken, payload);
}

module.exports = {
  client,
  reply
};