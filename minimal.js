const { db } = require("../../config/firebase");
const { client } = require("../../config/line");

/* =====================================================
   🔥 เวลาไทย (Asia/Bangkok)
===================================================== */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function getThaiDateString() {
  return getThaiNow().toISOString().split("T")[0];
}

function isSevenAMThai() {
  const thai = getThaiNow();
  return thai.getHours() === 7 && thai.getMinutes() === 0;
}

/* =====================================================
   🔔 REMINDER HANDLER (ไม่เปลี่ยนโครงสร้าง)
===================================================== */

async function handleReminders() {
  const snapshot = await db.collection("reminders").get();
  const nowThai = getThaiNow();

  const groupMapToday = {};
  const groupMapSeven = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.eventDate || !data.groupId) return;

    const eventDate = data.eventDate.toDate();

    const diffDays = Math.ceil(
      (eventDate - nowThai) / (1000 * 60 * 60 * 24)
    );

    // วันจริง
    if (diffDays === 0) {
      if (!groupMapToday[data.groupId]) {
        groupMapToday[data.groupId] = [];
      }
      groupMapToday[data.groupId].push(data);
    }

    // ล่วงหน้า 7 วัน
    if (diffDays === 7) {
      if (!groupMapSeven[data.groupId]) {
        groupMapSeven[data.groupId] = [];
      }
      groupMapSeven[data.groupId].push(data);
    }
  });

  // 🔔 แจ้งล่วงหน้า 7 วัน
  for (const groupId in groupMapSeven) {
    let msg = "🔔 แจ้งเตือนล่วงหน้า 7 วัน\n\n";
    groupMapSeven[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await client.pushMessage(groupId, {
      type: "text",
      text: msg
    });
  }

  // 📌 แจ้งวันจริง
  for (const groupId in groupMapToday) {
    let msg = "📌 วันนี้มีรายการสำคัญ\n\n";
    groupMapToday[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await client.pushMessage(groupId, {
      type: "text",
      text: msg
    });
  }
}

/* =====================================================
   🔄 SCHEDULER LOOP
===================================================== */

let lastRunDate = null;

async function scheduler() {
  if (!isSevenAMThai()) return;

  const todayStr = getThaiDateString();

  // กันยิงซ้ำในวันเดียวกัน
  if (lastRunDate === todayStr) return;

  console.log("🔔 Running Reminder Scheduler:", todayStr);

  try {
    await handleReminders();
    lastRunDate = todayStr;
    console.log("✅ Reminder Scheduler Completed");
  } catch (err) {
    console.error("Reminder Scheduler Error:", err);
  }
}

function startScheduler() {
  console.log("⏰ Scheduler started (check every 60s)");
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };