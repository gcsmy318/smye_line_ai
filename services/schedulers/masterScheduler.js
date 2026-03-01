const { db } = require("../../config/firebase");
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

function isSevenAMThai() {
  const thai = getThaiNow();
  return thai.getHours() === 7 && thai.getMinutes() === 0;
}

/* =====================================================
   🔔 REMINDER LOGIC
===================================================== */

async function handleReminders() {
  console.log("📂 Fetching reminders from Firestore...");

  const snapshot = await db.collection("reminders").get();
  const nowThai = getThaiNow();

  console.log("🕒 Thai Time:", nowThai);

  const groupMapToday = {};
  const groupMapSeven = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.eventDate || !data.groupId) return;

    const eventDate = data.eventDate.toDate();

    const diffDays = Math.ceil(
      (eventDate - nowThai) / (1000 * 60 * 60 * 24)
    );

    console.log("📌 Checking:", data.title, "diffDays:", diffDays);

    if (diffDays === 0) {
      if (!groupMapToday[data.groupId]) {
        groupMapToday[data.groupId] = [];
      }
      groupMapToday[data.groupId].push(data);
    }

    if (diffDays === 7) {
      if (!groupMapSeven[data.groupId]) {
        groupMapSeven[data.groupId] = [];
      }
      groupMapSeven[data.groupId].push(data);
    }
  });

  // แจ้งล่วงหน้า
  for (const groupId in groupMapSeven) {
    let msg = "🔔 แจ้งเตือนล่วงหน้า 7 วัน\n\n";

    groupMapSeven[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    console.log("📤 Sending 7-day reminder to:", groupId);

    await client.pushMessage(groupId, {
      type: "text",
      text: msg
    });
  }

  // แจ้งวันจริง
  for (const groupId in groupMapToday) {
    let msg = "📌 วันนี้มีรายการสำคัญ\n\n";

    groupMapToday[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    console.log("📤 Sending today reminder to:", groupId);

    await client.pushMessage(groupId, {
      type: "text",
      text: msg
    });
  }

  console.log("✅ Reminder check completed");
}

/* =====================================================
   🔄 SCHEDULER LOOP
===================================================== */

let lastRunDate = null;

async function scheduler() {
  if (!isSevenAMThai()) return;

  const todayStr = getThaiDateString();

  if (lastRunDate === todayStr) {
    console.log("⏩ Already ran today, skipping...");
    return;
  }

  console.log("🔔 Running Scheduler for:", todayStr);

  try {
    await handleReminders();
    lastRunDate = todayStr;
    console.log("🎉 Scheduler finished successfully");
  } catch (err) {
    console.error("❌ Scheduler error:", err);
  }
}

function startScheduler() {
  console.log("⏰ Scheduler started (checking every 60 seconds)");
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };