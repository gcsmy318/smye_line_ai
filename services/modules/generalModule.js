const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

const DEFAULT_SETTINGS = {
  fri12: true,
  sun9: true,
  sun1130: true,
  mon12: true,
  fri8: true,
  sat8: true,
  sat15: true
};

const COMMAND_MAP = {
  "ศุกร์12": "fri12",
  "อาทิตย์9": "sun9",
  "อาทิตย์1130": "sun1130",
  "โปรแกรมจันทร์": "mon12",
  "ศุกร์8": "fri8",
  "เสาร์8": "sat8",
  "เสาร์15": "sat15"
};

async function handle(event, group) {

  const text = event.message.text.trim();
  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;

  const openMatch = text.match(/^เปิด\s+(.+)/);
  const closeMatch = text.match(/^ปิด\s+(.+)/);

  if (!openMatch && !closeMatch && text !== "ดูตาราง") return false;

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();
  const data = doc.data() || {};

  let settings = data.generalSettings || { ...DEFAULT_SETTINGS };

  if (text === "ดูตาราง") {
    let msg = "📅 ตารางแจ้งเตือนทั่วไป\n\n";
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      msg += settings[key] ? `✔ ${key}\n` : `✖ ${key}\n`;
    });
    await reply(event.replyToken, msg);
    return true;
  }

  const command = (openMatch || closeMatch)[1].trim();
  const key = COMMAND_MAP[command];

  if (!key) {
    await reply(event.replyToken, "ไม่พบรายการนี้");
    return true;
  }

  settings[key] = !!openMatch;

  await docRef.set({
    generalSettings: settings
  }, { merge: true });

  await reply(event.replyToken,
    `${openMatch ? "✅ เปิด" : "❌ ปิด"} ${command} เรียบร้อย`
  );

  return true;
}

module.exports = { handle };