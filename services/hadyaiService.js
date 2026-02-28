const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

async function handle(event, group) {
  const db = getDB();
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  const weekKey = getWeekKey();
  const docId = `${weekKey}_${groupId}`;

  const updates = parseStats(text);

  if (!updates) return;

  await db.collection("weeklyHatyaiStats").doc(docId).set({
    stats: updates
  }, { merge: true });

  const doc = await db.collection("weeklyHatyaiStats").doc(docId).get();
  const stats = doc.exists ? doc.data().stats || {} : {};

  let message = `ขอบคุณครับ\n`;
  message += `รบกวนหัวหน้าแคร์กรอกสถิติด้วยครับ\n`;

  group.units.forEach(u => {
    message += stats[u]
      ? `-${u}=${stats[u]}\n`
      : `-${u}\n`;
  });

  return reply(event.replyToken, message);
}

function parseStats(text) {
  const matches = text.match(/([a-zA-Z0-9]+)\s*=\s*(\d+)/g);
  if (!matches) return null;

  const result = {};
  matches.forEach(m => {
    const [key, value] = m.split("=");
    result[key.trim()] = parseInt(value.trim());
  });

  return result;
}

function helpMessage() {
  return `🤖 ระบบสถิติหาดใหญ่

พิมพ์:
pro=20
หรือ
pro=20 stb=10

แจ้งเตือนทุกวันอาทิตย์ 13:00`;
}

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

module.exports = { handle, helpMessage };