const { getDB } = require("../../config/firebase");
const { reply, client } = require("../../config/line");

/* ตารางที่ใช้ใน Scheduler ต้อง key ตรงกัน */
const SCHEDULE_MAP = {
  "ศุกร์12": "fri12",
  "อาทิตย์9": "sun9",
  "อาทิตย์1130": "sun1130",
  "จันทร์12": "mon12",
  "เสาร์15": "sat15"
};

const SCHEDULE_TEXT = {
  fri12: "ศุกร์ 12.00 - ซ้อมนมัสการ 16.30 น.",
  sun9: "อาทิตย์ 09.00 - แจ้ง hope channel",
  sun1130: "อาทิตย์ 11.30 - เพลงตอบสนอง",
  mon12: "จันทร์ 12.00 - โปรแกรมวันอาทิตย์",
  sat15: "เสาร์ 15.00 - ชั้นสร้าง 18.00 น."
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

    msg += "\nตัวอย่างคำสั่ง:\nเปิด ศุกร์12\nปิด ศุกร์12";

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

/* ===================================================== */
/* 🔥 MASTER ยิงย้อนหลังทุกกลุ่ม */
/* ===================================================== */

async function runMissedGeneralAllGroups() {

  try {

    const db = getDB();
    const groups = await db.collection("groups").get();

    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    );

    const day = now.getDay();
    const hour = now.getHours();

    for (const g of groups.docs) {

      const data = g.data();
      const settings = data.generalSettings || {};

      const messages = [];

      if (settings.fri12 !== false && day === 5 && hour >= 12)
        messages.push(SCHEDULE_TEXT.fri12);

      if (settings.sun9 !== false && day === 0 && hour >= 9)
        messages.push(SCHEDULE_TEXT.sun9);

      if (settings.sun1130 !== false && day === 0 && hour >= 11)
        messages.push(SCHEDULE_TEXT.sun1130);

      if (settings.mon12 !== false && day === 1 && hour >= 12)
        messages.push(SCHEDULE_TEXT.mon12);

      if (settings.sat15 !== false && day === 6 && hour >= 15)
        messages.push(SCHEDULE_TEXT.sat15);

      if (!messages.length) continue;

      let msg = "🔔 แจ้งเตือนทั่วไป (ตรวจสอบย้อนหลัง)\n\n";

      messages.forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });

      await client.pushMessage(g.id, {
        type: "text",
        text: msg
      });

      console.log("📤 Missed General sent:", g.id);
    }

  } catch (err) {
    console.error("Missed General Error:", err);
  }
}

module.exports = { handle, runMissedGeneralAllGroups };