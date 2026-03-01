const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");

/* =====================================================
   🇹🇭 เวลาไทย
===================================================== */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function getThaiDateString() {
  return getThaiNow().toISOString().split("T")[0];
}

function isReportDay(date) {
  const day = date.getDay(); // 0=อา 1=จ 2=อ 5=ศ
  return [0, 1, 2, 5].includes(day);
}

/* =====================================================
   🔔 REMINDER (7 โมงเช้า)
===================================================== */

async function handleReminders() {

  try {

    const db = getDB();
    const nowThai = getThaiNow();
    const todayStr = getThaiDateString();

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

      if (diffDays === 0) {
        groupMap[data.groupId].push(`📌 วันนี้: ${data.title}`);
      }

      if (diffDays === 3) {
        groupMap[data.groupId].push(`⏳ อีก 3 วัน: ${data.title}`);
      }

    });

    for (const groupId in groupMap) {

      if (!groupMap[groupId].length) continue;

      let msg = "🔔 แจ้งเตือนประจำวัน\n\n";

      groupMap[groupId].forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });

      msg += `\n⏰ แจ้งเมื่อ: ${nowThai.toLocaleTimeString("th-TH")}`;

      await client.pushMessage(groupId, {
        type: "text",
        text: msg
      });

      console.log("📤 Reminder sent to:", groupId);
    }

  } catch (err) {
    console.error("Reminder Error:", err);
  }
}

/* =====================================================
   📢 PROVINCE (8 โมง อา จ อ ศ)
===================================================== */

async function handleProvinceReminder() {

  try {

    const db = getDB();
    const today = getThaiNow();
    const todayStr = getThaiDateString();

    if (!isReportDay(today)) return;

    const provinceDoc = await db
      .collection("weeklyProvinceStats")
      .doc(todayStr)
      .get();

    if (provinceDoc.exists) return;

    const groups = await db.collection("groups").get();

    for (const g of groups.docs) {

      const data = g.data();

      if (!data.modules?.province) continue;

      await client.pushMessage(g.id, {
        type: "text",
        text: "📢 วันนี้ยังไม่มีจังหวัดส่งสถิติ"
      });

      console.log("📤 Province reminder sent to:", g.id);
    }

  } catch (err) {
    console.error("Province Reminder Error:", err);
  }
}

/* =====================================================
   🚀 START SCHEDULER
===================================================== */

function startScheduler() {

  console.log("⏰ Master Scheduler Started");

  /* ===============================
     7:00 REMINDER
  ================================ */
  cron.schedule("0 7 * * *", async () => {
    console.log("🔔 Running 7AM Reminder");
    await handleReminders();
  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     8:00 PROVINCE (อา จ อ ศ)
  ================================ */
  cron.schedule("0 8 * * 0,1,2,5", async () => {
    console.log("📢 Running 8AM Province Reminder");
    await handleProvinceReminder();
  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     RUN ON STARTUP
  ================================ */
  setTimeout(async () => {
    console.log("🚀 Startup Check Running...");
    await handleReminders();
    await handleProvinceReminder();
    console.log("✅ Startup Check Complete");
  }, 5000);
}

module.exports = { startScheduler };