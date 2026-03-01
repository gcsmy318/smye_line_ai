const { db } = require("../../config/firebase");
const { client } = require("../../config/line");
const admin = require("firebase-admin");

/* =====================================================
   🔥 TIME UTIL (Thailand Time)
===================================================== */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function getThaiDateString() {
  return getThaiNow().toISOString().split("T")[0];
}

/* =====================================================
   🔥 SAFE PUSH MESSAGE
===================================================== */

async function sendMessage(groupId, text) {
  try {
    await client.pushMessage(groupId, {
      type: "text",
      text,
    });
  } catch (err) {
    console.error("PushMessage Error:", err.message);
  }
}

/* =====================================================
   🔔 REMINDER HANDLER
===================================================== */

async function handleReminders() {
  const snapshot = await db.collection("reminders").get();
  const nowThai = getThaiNow();

  const groupMapToday = {};
  const groupMapSeven = {};

  snapshot.forEach((doc) => {
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

  // 🔔 แจ้งล่วงหน้า
  for (const groupId in groupMapSeven) {
    let msg = "🔔 แจ้งเตือนล่วงหน้า 7 วัน\n\n";

    groupMapSeven[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await sendMessage(groupId, msg);
  }

  // 📌 แจ้งวันจริง
  for (const groupId in groupMapToday) {
    let msg = "📌 วันนี้มีรายการสำคัญ\n\n";

    groupMapToday[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await sendMessage(groupId, msg);
  }
}

/* =====================================================
   📢 PROVINCE REMINDER
   - ถ้าวันนี้ยังไม่มีรายงาน
   - และ module เปิดอยู่
===================================================== */

async function handleProvinceReminder() {
  const todayStr = getThaiDateString();

  const statDoc = await db
    .collection("weeklyProvinceStats")
    .doc(todayStr)
    .get();

  if (statDoc.exists) return;

  const groupsSnapshot = await db.collection("groups").get();

  for (const groupDoc of groupsSnapshot.docs) {
    const groupData = groupDoc.data();

    if (groupData.modules?.province) {
      await sendMessage(
        groupDoc.id,
        "📢 แจ้งเตือนรายงานจังหวัด\nวันนี้ยังไม่มีจังหวัดส่งสถิติ"
      );
    }
  }
}

/* =====================================================
   🔥 MAIN SCHEDULER
   - ยิงตอน 7:00 - 7:59 ไทย
   - ไม่ยิงซ้ำแม้ restart
===================================================== */

async function scheduler() {
  const nowThai = getThaiNow();

  // ยิงเฉพาะชั่วโมง 7 โมงเช้า
  if (nowThai.getHours() !== 7) return;

  const todayStr = getThaiDateString();

  const logRef = db.collection("schedulerLogs").doc(todayStr);
  const logDoc = await logRef.get();

  // ถ้าวันนี้รันแล้ว → หยุด
  if (logDoc.exists) return;

  console.log("🔔 Running Scheduler:", todayStr);

  try {
    await handleReminders();
    await handleProvinceReminder();

    await logRef.set({
      ranAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Scheduler Completed");
  } catch (err) {
    console.error("Scheduler Error:", err);
  }
}

/* =====================================================
   🔄 START SCHEDULER LOOP
===================================================== */

function startScheduler() {
  console.log("⏰ Scheduler started (checking every 60s)");
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };