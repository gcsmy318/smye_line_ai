const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

/* =====================================================
   🔥 START SCHEDULER
===================================================== */
function startSchedulers() {

  console.log("🔥 Reminder Scheduler Started");

  // ยิงทุก 1 นาที
  cron.schedule("* * * * *", async () => {

    console.log("🟢 Cron tick:", new Date().toLocaleString("th-TH"));

    try {

      const now = new Date();
      const hour = now.getHours();

      // ยิงได้ตั้งแต่ 07:00 เป็นต้นไป
      if (hour < 7) return;

      const db = getDB();
      const today = new Date();
      const todayKey = getTodayKey();

      console.log("⏰ Checking reminders at",
        now.toLocaleString("th-TH"));

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

        // 🔒 กันยิงซ้ำในวันเดียวกัน
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

        // บันทึก log
        await logRef.set({
          groupId,
          type: "reminder",
          sentAt: new Date()
        });

        // อัปเดต flag
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

  }, {
    timezone: "Asia/Bangkok"
  });
}

/* =====================================================
   Parse Date (รองรับ พ.ศ. / ค.ศ.)
===================================================== */
function parseDate(str) {

  if (!str) return null;

  const parts = str.split("/");
  if (parts.length !== 3) return null;

  const [d, m, y] = parts.map(Number);

  const year = y > 2500 ? y - 543 : y;

  return new Date(year, m - 1, d);
}

/* =====================================================
   Diff in Days (แม่น)
===================================================== */
function diffInDays(a, b) {

  const dateA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const dateB = new Date(b.getFullYear(), b.getMonth(), b.getDate());

  const diffTime = dateA.getTime() - dateB.getTime();

  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/* =====================================================
   Today Key (เวลาไทย)
===================================================== */
function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Bangkok"
  });
}

module.exports = { startSchedulers };