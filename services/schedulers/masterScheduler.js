const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

let started = false;

function startSchedulers() {

  if (started) return;
  started = true;

  console.log("🔥 Reminder Scheduler Started");

  setInterval(async () => {

    const thaiNow = getThaiNow();
    console.log("🟢 Scheduler tick (TH)", thaiNow.toLocaleString("th-TH"));

    try {
      await runReminder(thaiNow);
    } catch (err) {
      console.error("Scheduler Error:", err);
    }

  }, 60000);
}

async function runReminder(thaiNow) {

  const thaiHour = thaiNow.getHours();
  if (thaiHour < 7) return;

  const db = getDB();
  const todayKey = getThaiDateKey(thaiNow);

  const snapshot = await db.collection("reminders").get();

  for (const doc of snapshot.docs) {

    const data = doc.data();
    const groupId = data.groupId;
    const scheduleDate = data.date;

    if (!groupId || !scheduleDate) continue;

    const schedule = parseDate(scheduleDate);
    if (!schedule) continue;

    const diff = diffInDays(schedule, thaiNow);

    console.log("DEBUG Diff:", diff, scheduleDate);

    if (diff !== 0) continue; // ยิงเฉพาะวันนี้

    const logId = `${todayKey}_${groupId}_reminder`;
    const logRef = db.collection("schedulerLogs").doc(logId);
    const logDoc = await logRef.get();

    if (logDoc.exists) continue;

    const message =
      `📌 แจ้งเตือนวันนี้\n${data.title}\nวันที่ ${scheduleDate}`;

    await pushMessage(groupId, message);

    await logRef.set({
      groupId,
      type: "reminder",
      sentAt: new Date()
    });

    console.log("✅ Reminder sent:", groupId);
  }
}

/* ======================= Helpers ======================= */

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
  const [d,m,y] = str.split("/").map(Number);
  return new Date(y, m-1, d);
}

function diffInDays(a, b) {
  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const diffTime = dateA.getTime() - dateB.getTime(); // ✅ ถูกด้านแล้ว
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = { startSchedulers };