const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

let started = false;

function startSchedulers() {

  if (started) return;
  started = true;

  console.log("🔥 Reminder Scheduler Started (Simple Retry Mode)");

  setInterval(() => {

    const thaiNow = getThaiNow();
    console.log("🟢 Scheduler tick (TH)", thaiNow.toLocaleString("th-TH"));

    runReminderAllToday(thaiNow)
      .catch(err => console.error("Scheduler Error:", err));

  }, 60000);

}

async function runReminderAllToday(thaiNow) {

  const thaiHour = thaiNow.getHours();
  if (thaiHour < 7) return;  // ถ้ายังไม่ถึง 07:00

  const db = getDB();
  const todayKey = getThaiDateKey(thaiNow);

  const snapshot = await db.collection("reminders").get();
  if (snapshot.empty) {
    console.log("📭 No reminders found");
    return;
  }

  for (const doc of snapshot.docs) {

    const data = doc.data();
    const groupId = data.groupId;
    const scheduleDate = data.scheduleDate;

    // ถ้าไม่มี scheduleDate หรือไม่มี groupId ให้ข้าม
    if (!scheduleDate || !groupId) continue;

    // ดูว่ากลุ่มนี้ยิงไปแล้ววันนี้หรือยัง
    const logId = `${todayKey}_${groupId}_reminder`;
    const logRef = db.collection("schedulerLogs").doc(logId);
    const logDoc = await logRef.get();

    if (logDoc.exists) {
      continue;
    }

    // ยิงทุกคนที่ยังไม่มี log วันนี้
    const message = `🔔 วันนี้ ${scheduleDate} มีแจ้งเตือนที่ยังไม่ถูกส่ง\n`;

    await pushMessage(groupId, message);

    console.log("✅ Reminder sent to (catch-up):", groupId);

    // บันทึกว่าได้ยิงแล้ววันนี้
    await logRef.set({
      groupId,
      type: "reminder",
      sentAt: new Date()
    });
  }
}

/* ============================
   Time Helpers
============================ */

function getThaiNow() {
  const thaiTimeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok"
  });
  return new Date(thaiTimeString);
}

function getThaiDateKey(thaiNow) {
  return thaiNow.toLocaleDateString("sv-SE");
}

module.exports = { startSchedulers };