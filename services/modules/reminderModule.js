
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");

async function handle(event) {
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  if (!text.startsWith("แจ้งเตือน")) return false;

  const parts = text.replace("แจ้งเตือน","").trim().split(" ");
  if (parts.length < 2) return false;

  const title = parts.slice(0,-1).join(" ");
  const dateStr = parts[parts.length-1];

  const db = getDB();
  const id = uuidv4().slice(0,5);

  await db.collection("reminders").doc(id).set({
    groupId,
    title,
    date: dateStr
  });

  return reply(event.replyToken, `บันทึกแจ้งเตือน ID ${id}`);
}

module.exports = { handle };
