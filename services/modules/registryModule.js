
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

async function handle(event) {
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  if (text.startsWith("ลงทะเบียน")) {
    const data = text.replace("ลงทะเบียน","").trim();
    await getDB().collection("registry").add({ groupId, data });
    return reply(event.replyToken, "ลงทะเบียนเรียบร้อย");
  }

  return false;
}

module.exports = { handle };
