
const { Client } = require("@line/bot-sdk");
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

async function reply(token, text) {
  return client.replyMessage(token, { type: "text", text });
}

async function push(to, text) {
  return client.pushMessage(to, { type: "text", text });
}

module.exports = { reply, push };
