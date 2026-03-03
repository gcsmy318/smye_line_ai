const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");

/* ================= TIME ================= */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function toThaiDateOnly(date) {
  const d = new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ================= REMINDER ================= */

async function handleReminders() {

  try {

    const db = getDB();
    if (!db) return;

    const nowThai = getThaiNow();
    const todayOnly = toThaiDateOnly(nowThai);

    const snapshot = await db.collection("reminders").get();

    const groupMap = {};

    snapshot.forEach(doc => {

      const data = doc.data();
      if (!data.groupId) return;

      const rawDate =
        data.targetDate ||
        data.eventDate ||
        data.date;

      if (!rawDate) return;

      const eventDate = rawDate.toDate
        ? rawDate.toDate()
        : new Date(rawDate);

      const eventOnly = toThaiDateOnly(eventDate);

      const diffDays = Math.round(
        (eventOnly - todayOnly) / (1000 * 60 * 60 * 24)
      );

      if (!groupMap[data.groupId]) {
        groupMap[data.groupId] = [];
      }

      if (diffDays === 0)
        groupMap[data.groupId].push(`📌 วันนี้: ${data.title}`);

      if (diffDays === 3)
        groupMap[data.groupId].push(`⏳ อีก 3 วัน: ${data.title}`);
    });

    for (const groupId in groupMap) {

      if (!groupMap[groupId].length) continue;

      let msg = "🔔 แจ้งเตือนประจำวัน\n\n";

      groupMap[groupId].forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });

      await client.pushMessage(groupId, {
        type: "text",
        text: msg
      });

      console.log("📤 Reminder sent:", groupId);
    }

  } catch (err) {
    console.error("Reminder Error:", err);
  }
}

module.exports = { handleReminders };