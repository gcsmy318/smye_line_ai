const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const admin = require("firebase-admin");

/* ===============================
   UTIL: WEEK KEY
================================= */
function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

function formatWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString("th-TH", { month: "short" })} ${start.getFullYear()}`;
}

/* ===============================
   HANDLE
================================= */
async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const userId = event.source.userId;
  const db = getDB();

  const weekKey = getWeekKey();
  const docId = `${weekKey}_${groupId}`;
  const docRef = db.collection("weeklyServiceReports").doc(docId);

  /* ===== 1️⃣ บันทึก ===== */
  if (text.startsWith("รายงานการรับใช้")) {

    const content = text.replace("รายงานการรับใช้", "").trim();
    if (!content) return false;

    await docRef.set({
      reports: admin.firestore.FieldValue.arrayUnion({
        userId,
        content,
        createdAt: new Date()
      })
    }, { merge: true });

    return reply(event.replyToken, "✅ บันทึกความดีของท่านแล้ว");
  }

  /* ===== 2️⃣ แสดงรายงาน ===== */
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
        const date = new Date(r.createdAt.seconds ? r.createdAt.seconds * 1000 : r.createdAt);
        msg += `${index + 1}. ${date.toLocaleDateString("th-TH")} - ${r.content}\n`;
      });
    }

    msg += "---------------------------------";

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };