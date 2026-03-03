const cron = require("node-cron");
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

function isReportDay(date) {
  return [0, 1, 2, 5].includes(date.getDay());
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

/* ===================================================== */
/* 🔥 MASTER ยิงย้อนหลังทุกกลุ่ม */
/* ===================================================== */

async function runMissedReminderAllGroups() {

  try {

    const db = getDB();
    const groups = await db.collection("groups").get();

    const nowThai = getThaiNow();
    const todayOnly = toThaiDateOnly(nowThai);

    for (const g of groups.docs) {

      const snapshot = await db
        .collection("reminders")
        .where("groupId", "==", g.id)
        .get();

      const messages = [];

      snapshot.forEach(doc => {

        const data = doc.data();

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

        if (diffDays <= 0)
          messages.push(`📌 (ย้อนหลัง) ${data.title}`);
      });

      if (!messages.length) continue;

      let msg = "🔔 แจ้งเตือนย้อนหลัง\n\n";

      messages.forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });

      await client.pushMessage(g.id, {
        type: "text",
        text: msg
      });

      console.log("📤 Missed Reminder sent:", g.id);
    }

  } catch (err) {
    console.error("Missed Reminder Error:", err);
  }
}

/* ================= START ================= */

function startScheduler() {

  console.log("⏰ Master Scheduler Started");

  cron.schedule("0 7 * * *", async () => {
    console.log("🔔 7AM Reminder");
    await handleReminders();
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 8 * * 0,1,2,5", async () => {
    console.log("📢 8AM Province");
    await handleProvinceReminder();
  }, { timezone: "Asia/Bangkok" });

  setTimeout(async () => {
    console.log("🚀 Startup Check");
  }, 5000);
}

module.exports = {
  startScheduler,
  runMissedReminderAllGroups
};