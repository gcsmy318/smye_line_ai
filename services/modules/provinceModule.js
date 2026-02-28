
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

const provinces = ["สงขลา","สตูล","ปัตตานี","ยะลา","นราธิวาส","พัทลุง"];

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0,10);
}

async function handle(event) {
  const text = event.message.text.trim();
  const groupId = event.source.groupId;
  const province = provinces.find(p => text.includes(p));

  if (!province || !text.includes("ส่งสถิติแล้ว")) return false;

  const db = getDB();
  const docId = `${getWeekKey()}_${groupId}`;

  await db.collection("weeklyProvinceStats").doc(docId).set({
    status: { [province]: true }
  }, { merge: true });

  return reply(event.replyToken, `ขอบคุณ${province} ส่งสถิติแล้ว`);
}

module.exports = { handle };
