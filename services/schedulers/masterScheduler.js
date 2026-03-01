const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");

/* ================= TIME ================= */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function getThaiDateString() {
  return getThaiNow().toISOString().split("T")[0];
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
    const snapshot = await db.collection("reminders").get();

    const groupMap = {};

    snapshot.forEach(doc => {

      const data = doc.data();
      if (!data.eventDate || !data.groupId) return;

      const eventDate = data.eventDate.toDate();

      const diffDays = Math.ceil(
        (eventDate - nowThai) / (1000 * 60 * 60 * 24)
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

/* ================= PROVINCE ================= */

async function handleProvinceReminder() {

  try {

    const db = getDB();
    if (!db) return;

    const today = getThaiNow();
    if (!isReportDay(today)) return;

    const todayStr = getThaiDateString();

    const doc = await db
      .collection("weeklyProvinceStats")
      .doc(todayStr)
      .get();

    if (doc.exists) return;

    const groups = await db.collection("groups").get();

    for (const g of groups.docs) {

      const data = g.data();

      if (!data.modules?.province) continue;

      await client.pushMessage(g.id, {
        type: "text",
        text: "📢 วันนี้ยังไม่มีจังหวัดส่งสถิติ"
      });

      console.log("📤 Province reminder sent:", g.id);
    }

  } catch (err) {
    console.error("Province Reminder Error:", err);
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
    await handleReminders();
    await handleProvinceReminder();
  }, 5000);
}

module.exports = { startScheduler };