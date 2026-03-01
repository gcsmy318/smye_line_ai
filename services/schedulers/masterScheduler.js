const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

let started = false;

function startSchedulers() {
  if (started) return;
  started = true;

  console.log("🔥 Reminder Scheduler Started for SMYE");

  setInterval(async () => {

    const thaiNow = getThaiNow();
    console.log("🟢 Scheduler tick (TH)", thaiNow.toLocaleString("th-TH"));

    try {
      await runReminder(thaiNow);
    } catch (err) {
      console.error("Scheduler Error:", err);
    }

  }, 60000); // every 1 min
}

async function runReminder(thaiNow) {

  const thaiHour = thaiNow.getHours();
  if (thaiHour < 7) return; // only after 07:00

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
    const scheduleDate = data.date; // match DB

    if (!groupId || !scheduleDate) continue;

    const schedule = parseDate(scheduleDate);
    if (!schedule) continue;

    const diff = diffInDays(schedule, thaiNow);

    // ถ้าผ่านวันแล้ว แต่ยังไม่เคยส่ง >> ส่งเลย
    if (diff > 0) continue; // future, ยังไม่ควรส่ง

    // ลบวิธีเช็ค diff === 0
    // ส่งทุก reminder ที่ date <= today

    const logId = `${todayKey}_${groupId}_reminder`;
    const logRef = db.collection("schedulerLogs").doc(logId);
    const logDoc = await logRef.get();

    if (logDoc.exists) {
      console.log("Already sent today:", groupId);
      continue;
    }

    // build message
    const message =
      `📌 แจ้งเตือนวันที่ ${scheduleDate}\n` +
      `${data.title || "-"}`;

    await pushMessage(groupId, message);

    console.log("✅ Reminder sent to:", groupId);

    await logRef.set({
      groupId,
      type: "reminder",
      sentAt: new Date()
    });
  }
}

/* =========================== Helpers ============================ */

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
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = { startSchedulers };