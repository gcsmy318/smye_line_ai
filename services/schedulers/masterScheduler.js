const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

let started = false;

function startSchedulers() {

  if (started) return;
  started = true;

  console.log("🔥 Reminder Scheduler Started (DB Fixed Version)");

  setInterval(() => {

    const thaiNow = getThaiNow();
    console.log("🟢 Scheduler tick (TH)",
      thaiNow.toLocaleString("th-TH"));

    runReminder(thaiNow)
      .catch(err => console.error("Scheduler Error:", err));

  }, 60000);
}

async function runReminder(thaiNow) {

  const thaiHour = thaiNow.getHours();
  if (thaiHour < 7) return;

  const db = getDB();
  const todayKey = getThaiDateKey(thaiNow);

  const snapshot = await db.collection("reminders").get();

  if (snapshot.empty) {
    console.log("📭 No reminders in DB");
    return;
  }

  for (const doc of snapshot.docs) {

    const data = doc.data();

    const groupId = data.groupId;
    const scheduleDate = data.date; // ✅ ใช้ field date ตาม DB จริง

    if (!scheduleDate || !groupId) continue;

    const schedule = parseDate(scheduleDate);
    if (!schedule) continue;

    const diff = diffInDays(schedule, thaiNow);

    // ยิงเฉพาะวันนี้เท่านั้น
    if (diff !== 0) continue;

    const logId = `${todayKey}_${groupId}_reminder`;
    const logRef = db.collection("schedulerLogs").doc(logId);
    const logDoc = await logRef.get();

    if (logDoc.exists) {
      console.log("Already sent today:", groupId);
      continue;
    }

    const message =
      `📌 แจ้งเตือนวันนี้\n\n` +
      `${data.title}\n` +
      `วันที่ ${scheduleDate}`;

    await pushMessage(groupId, message);

    console.log("✅ Reminder sent to:", groupId);

    await logRef.set({
      groupId,
      type: "reminder",
      sentAt: new Date()
    });
  }
}

/* =======================
   Time Helpers
======================= */

function getThaiNow() {
  const thaiString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok"
  });
  return new Date(thaiString);
}

function getThaiDateKey(thaiNow) {
  return thaiNow.toLocaleDateString("sv-SE");
}

function parseDate(str) {
  const parts = str.split("/");
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map(Number);
  const year = y > 2500 ? y - 543 : y;

  return new Date(year, m - 1, d);
}

function diffInDays(a, b) {
  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate());

  const diffTime = dateA.getTime() - dateB.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = { startSchedulers };