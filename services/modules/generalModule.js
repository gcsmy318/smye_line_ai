const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

/* ตารางที่ใช้ใน Scheduler ต้อง key ตรงกัน */
const SCHEDULE_MAP = {
  "ศุกร์12": "fri12",
  "อาทิตย์9": "sun9",
  "อาทิตย์1130": "sun1130",
  "จันทร์12": "mon12",
  "เสาร์15": "sat15",
  "สถิติ8": "stats8" // 🔥 เพิ่มตรงนี้
};

const SCHEDULE_TEXT = {
  fri12: "ศุกร์ 12.00 - ซ้อมนมัสการ 16.30 น.",
  sun9: "อาทิตย์ 09.00 - แจ้ง hope channel",
  sun1130: "อาทิตย์ 11.30 - เพลงตอบสนอง",
  mon12: "จันทร์ 12.00 - โปรแกรมวันอาทิตย์",
  sat15: "เสาร์ 15.00 - ชั้นสร้าง 18.00 น.",
  stats8: "08.00 (อา/จ/อ/ศ) - แจ้งส่งสถิติ" // 🔥 เพิ่มตรงนี้
};

async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();
  const data = doc.data() || {};
  const settings = data.generalSettings || {};

  /* ===============================
     ดูตาราง
  ================================ */
  if (text === "ดูตาราง") {

    let msg = "📢 ตารางแจ้งเตือนทั่วไป\n\n";

    Object.keys(SCHEDULE_TEXT).forEach(key => {
      const status = settings[key] === false ? "❌ ปิด" : "✔ เปิด";
      msg += `${status} - ${SCHEDULE_TEXT[key]}\n`;
    });

    msg += "\nตัวอย่างคำสั่ง:\nเปิด ศุกร์12\nปิด ศุกร์12\nเปิด สถิติ8\nปิด สถิติ8";

    return reply(event.replyToken, msg);
  }

  /* ===============================
     เปิด/ปิด ภาษาไทย
  ================================ */
  if (text.startsWith("เปิด ") || text.startsWith("ปิด ")) {

    const parts = text.split(" ");
    const action = parts[0];
    const label = parts[1];

    const key = SCHEDULE_MAP[label];

    if (!key) {
      return reply(event.replyToken, "❌ ไม่พบรายการ เช่น เปิด ศุกร์12");
    }

    const value = action === "เปิด";

    await docRef.set({
      generalSettings: {
        ...settings,
        [key]: value
      }
    }, { merge: true });

    return reply(
      event.replyToken,
      `✅ ${action} ${SCHEDULE_TEXT[key]} เรียบร้อยแล้ว`
    );
  }

  return false;
}

module.exports = { handle };