const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

/* =========================================
   ตาราง Hardcode
========================================= */
const SCHEDULE_TABLE = {
  fri12: "ศุกร์ 12.00 - ซ้อมนมัสการ 16.30 น.",
  sun9: "อาทิตย์ 09.00 - แจ้ง hope channel",
  sun1130: "อาทิตย์ 11.30 - เพลงตอบสนอง",
  mon12: "จันทร์ 12.00 - โปรแกรมวันอาทิตย์",
  fri8: "ศุกร์/เสาร์ 08.00 - นัดประชุม 10.00-12.00",
  sat15: "เสาร์ 15.00 - ชั้นสร้าง เจอกัน 18.00น."
};

/* =========================================
   HANDLE
========================================= */
async function handle(event, group) {

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

    Object.keys(SCHEDULE_TABLE).forEach(key => {
      const status = settings[key] === false ? "❌ ปิด" : "✔ เปิด";
      msg += `${status} - ${SCHEDULE_TABLE[key]}\n`;
    });

    return reply(event.replyToken, msg);
  }

  /* ===============================
     เปิด/ปิด รายการ
     ตัวอย่าง:
     เปิด fri12
     ปิด fri12
  ================================ */
  if (text.startsWith("เปิด ") || text.startsWith("ปิด ")) {

    const parts = text.split(" ");
    const action = parts[0];
    const key = parts[1];

    if (!SCHEDULE_TABLE[key]) {
      return reply(event.replyToken, "❌ ไม่พบรายการในตาราง");
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
      `✅ ${action} ${SCHEDULE_TABLE[key]} เรียบร้อยแล้ว`
    );
  }

  return false;
}

module.exports = { handle };