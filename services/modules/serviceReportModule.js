const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const admin = require("firebase-admin");

/* 🔥 กันบันทึกซ้ำ */
const recentReports = new Map();

/* =====================================================
   UTIL: สร้าง key สัปดาห์ (เริ่มวันอาทิตย์)
===================================================== */
function getWeekKey() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

/* =====================================================
   UTIL: แสดงช่วงวันที่สัปดาห์
===================================================== */
function formatWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startStr = start.toLocaleDateString("th-TH");
  const endStr = end.toLocaleDateString("th-TH");

  return `${startStr} - ${endStr}`;
}

/* =====================================================
   HANDLE
===================================================== */
async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const userId = event.source.userId;

  const db = getDB();

  const weekKey = getWeekKey();
  const docId = `${weekKey}_${groupId}`;
  const docRef = db.collection("weeklyServiceReports").doc(docId);

  /* =====================================================
     1️⃣ บันทึก รายงานการรับใช้
     ตัวอย่าง:
     รายงานการรับใช้ แจกถุงยังชีพ 20 ชุด
  ===================================================== */
  if (text.startsWith("รายงานการรับใช้")) {

    const content = text.replace("รายงานการรับใช้", "").trim();
    if (!content) return false;

    /* 🔥 ตรวจ duplicate */
    const duplicateKey = `${userId}_${content}_${weekKey}`;
    const now = Date.now();

    if (recentReports.has(duplicateKey)) {

      const last = recentReports.get(duplicateKey);

      if (now - last < 5000) {
        console.log("⚠ duplicate report ignored");
        return true;
      }

    }

    recentReports.set(duplicateKey, now);

    setTimeout(() => {
      recentReports.delete(duplicateKey);
    }, 10000);

    await docRef.set({
      reports: admin.firestore.FieldValue.arrayUnion({
        userId,
        content,
        createdAt: new Date()
      })
    }, { merge: true });

    return reply(event.replyToken, "✅ บันทึกความดีของท่านแล้ว");
  }

  /* =====================================================
     2️⃣ แสดงรายการทั้งหมดในสัปดาห์
     คำสั่ง:
     บันทึกรายงานการรับใช้
  ===================================================== */
  if (text === "บันทึกรายงานการรับใช้") {

    const doc = await docRef.get();
    const reports = doc.exists ? doc.data().reports || [] : [];

    let msg = `📘 รายงานการรับใช้\n`;
    msg += `สัปดาห์นี้ ${formatWeekRange()}\n`;
    msg += "---------------------------------\n";

    if (reports.length === 0) {
      msg += "ยังไม่มีการบันทึก\n";
    } else {
      reports.forEach((r, index) => {

        const date = new Date(
          r.createdAt?.seconds
            ? r.createdAt.seconds * 1000
            : r.createdAt
        );

        msg += `${index + 1}. ${date.toLocaleDateString("th-TH")} - ${r.content}\n`;
      });
    }

    msg += "---------------------------------";

    return reply(event.replyToken, msg);
  }

  /* =====================================================
     3️⃣ สรุปรายสัปดาห์
     คำสั่ง:
     สรุปรายสัปดาห์
  ===================================================== */
  if (text === "สรุปรายสัปดาห์") {

    const doc = await docRef.get();
    const reports = doc.exists ? doc.data().reports || [] : [];

    let msg = `📊 สรุปรายสัปดาห์\n`;
    msg += `ช่วงวันที่ ${formatWeekRange()}\n`;
    msg += "---------------------------------\n";

    if (reports.length === 0) {

      msg += "ยังไม่มีรายงานในสัปดาห์นี้\n";

    } else {

      msg += `รวมทั้งหมด ${reports.length} รายการ\n\n`;

      reports.forEach((r, index) => {

        const date = new Date(
          r.createdAt?.seconds
            ? r.createdAt.seconds * 1000
            : r.createdAt
        );

        msg += `${index + 1}. ${date.toLocaleDateString("th-TH")} - ${r.content}\n`;
      });
    }

    msg += "---------------------------------";

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };