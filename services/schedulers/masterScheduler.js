const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

/* =====================================================
   START SCHEDULER (ใช้ setInterval แทน cron)
===================================================== */
function startSchedulers() {

  console.log("🔥 Reminder Scheduler Started (Interval Mode)");

  setInterval(async () => {

    const now = new Date();
    console.log("🟢 Interval tick:", now.toLocaleString("th-TH"));

    try {

      const thaiHour = getThaiHour();

      // ยิงได้ตั้งแต่ 07:00 เป็นต้นไป
      if (thaiHour < 7) return;

      const db = getDB();
      const todayKey = getTodayKey();
      const today = new Date();

      const snapshot = await db.collection("reminders").get();

      if (snapshot.empty) {
        console.log("📭 No reminders found");
        return;
      }

      const grouped = {};

      for (const doc of snapshot.docs) {

        const data = doc.data();

        if (!data.scheduleDate || !data.groupId) continue;

        const schedule = parseDate(data.scheduleDate);
        if (!schedule) continue;

        const diff = diffInDays(schedule, today);

        let type = null;

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

        if (logDoc.exists) {
          console.log("Already sent today:", groupId);
          continue;
        }

        const items = grouped[groupId];

        let header = items[0].type === "before"
          ? "🔔 แจ้งเตือนล่วงหน้า 3 วัน\n\n"
          : "📌 แจ้งเตือนวันนี้\n\n";

        let message = header;

        items.forEach(item => {
          message += `ID ${item.id || "-"} ${item.title || "-"} (${item.scheduleDate})\n`;
        });

        await pushMessage(groupId, message);

        console.log("✅ Reminder sent to:", groupId);

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
      }

    } catch (err) {
      console.error("Scheduler Error:", err);
    }

  }, 60000); // ทุก 1 นาที
}

/* =====================================================
   Helper Functions
===================================================== */

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

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Bangkok"
  });
}

function getThaiHour() {
  const thaiTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok"
  });
  return new Date(thaiTime).getHours();
}

module.exports = { startSchedulers };