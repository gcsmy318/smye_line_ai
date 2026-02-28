const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { pushMessage } = require("../../config/line");

function parseDate(str) {
  const [d,m,y] = str.split("/").map(Number);
  return new Date(y, m-1, d);
}

function diffInDays(a,b) {
  const ms = a - new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor(ms / (1000*60*60*24));
}

function startSchedulers() {

  // 🔔 เช็คทุกวัน 07:00
  cron.schedule("0 7 * * *", async () => {

    const db = getDB();
    const today = new Date();

    const snapshot = await db.collection("reminders").get();

    const grouped = {};

    for (const doc of snapshot.docs) {

      const data = doc.data();
      const schedule = parseDate(data.scheduleDate);
      const diff = diffInDays(schedule, today);

      let type = null;

      if (diff === 3 && !data.notifiedBefore) type = "before";
      if (diff === 0 && !data.notifiedToday) type = "today";

      if (!type) continue;

      if (!grouped[data.groupId]) grouped[data.groupId] = [];
      grouped[data.groupId].push({ ...data, docRef: doc.ref, type });
    }

    for (const groupId in grouped) {

      const items = grouped[groupId];

      let header = items[0].type === "before"
        ? "🔔 แจ้งเตือนล่วงหน้า 3 วัน\n\n"
        : "📌 แจ้งเตือนวันนี้\n\n";

      let message = header;

      items.forEach(item => {
        message += `ID ${item.id} ${item.title} (${item.scheduleDate})\n`;
      });

      await pushMessage(groupId, message);

      // กันยิงซ้ำ
      for (const item of items) {
        if (item.type === "before") {
          await item.docRef.update({ notifiedBefore: true });
        }
        if (item.type === "today") {
          await item.docRef.update({ notifiedToday: true });
        }
      }
    }

  }, { timezone: "Asia/Bangkok" });
}

module.exports = { startSchedulers };