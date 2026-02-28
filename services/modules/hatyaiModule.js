
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

function parseStats(text) {
  const matches = text.match(/([a-zA-Z0-9]+)\s*=\s*(\d+)/g);
  if (!matches) return null;
  const result = {};
  matches.forEach(m => {
    const [k,v] = m.split("=");
    result[k.trim()] = parseInt(v.trim());
  });
  return result;
}

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
  const stats = parseStats(text);
  if (!stats) return false;

  const db = getDB();
  const docId = `${getWeekKey()}_${groupId}`;

  await db.collection("weeklyHatyaiStats").doc(docId).set({
    stats
  }, { merge: true });

  return reply(event.replyToken, "บันทึกสถิติหาดใหญ่แล้ว");
}

module.exports = { handle };
