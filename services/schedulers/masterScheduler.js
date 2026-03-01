const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

let started = false;

function startSchedulers() {

  if (started) return;
  started = true;

  console.log("🔥 Reminder Scheduler Started (Thai Time Mode)");

  setInterval(() => {

    const thaiNow = getThaiNow();

    console.log("🟢 Interval tick (TH):",
      thaiNow.toLocaleString("th-TH"));

    runReminderLogic(thaiNow)
      .catch(err => console.error("Scheduler Error:", err));

  }, 60000);
}


/* =====================================================
   MAIN LOGIC
===================================================== */

async function runReminderLogic(thaiNow) {

  const thaiHour = thaiNow.getHours();
  if (thaiHour < 7) return;

  const db = getDB();
  const todayKey = getThaiDateKey(thaiNow);

  const snapshot = await db.collection("reminders").get();

  if (snapshot.empty) return;

  const grouped = {};

  for (const doc of snapshot.docs) {

    const data = doc.data();

    if (!data.scheduleDate || !data.groupId) continue;

    const schedule = parseDate(data.scheduleDate);
    if (!schedule) continue;

    const diff = diffInDays(schedule, thaiNow);

    let type = null;

    // ยิงถ้าเป็นวันนี้ หรือเป็น 3 วันก่อน
    if (diff === 3 && !data.notifiedBefore) type = "before";
    if (diff === 0 && !data.notifiedToday) type = "today";

    if (!type) continue;

    if (!grouped[data.groupId]) grouped[data.groupId] = [];

    grouped[data.groupId].push({
      ...data,
      docRef: doc.ref,
      type
    });
  }

  for (const groupId in grouped) {

    const logId = `${todayKey}_${groupId}_reminder`;
    const logRef = db.collection("schedulerLogs").doc(logId);
    const logDoc = await logRef.get();

    // 🔥 ยิงย้อนหลังถ้ายังไม่มี log วันนี้
    if (logDoc.exists) continue;

    const items = grouped[groupId];

    let message = "📌 แจ้งเตือนที่ยังไม่ได้ส่งวันนี้\n\n";

    items.forEach(item => {
      message += `ID ${item.id || "-"} ${item.title || "-"} (${item.scheduleDate})\n`;
    });

    await pushMessage(groupId, message);

    await logRef.set({
      groupId,
      type: "reminder",
      sentAt: new Date()
    });

    for (const item of items) {

      if (item.type === "before") {
        await item.docRef.update({ notifiedBefore: true });
      }

      if (item.type === "today") {
        await item.docRef.update({ notifiedToday: true });
      }
    }

    console.log("🔥 Catch-up reminder sent:", groupId);
  }
}

/* =====================================================
   TIME HELPERS
===================================================== */

function getThaiNow() {

  const thaiTimeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok"
  });

  return new Date(thaiTimeString);
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