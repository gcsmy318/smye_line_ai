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

function getThaiTimeString() {
  return getThaiNow().toLocaleTimeString("th-TH");
}

function isSevenAMThai() {
  const thai = getThaiNow();
  return thai.getHours() === 7 && thai.getMinutes() === 0;
}

function isEightAMThai() {
  const now = getThaiNow();
  return now.getHours() === 8 && now.getMinutes() === 0;
}

function isReportDay(date) {
  const day = date.getDay(); 
  return [0,1,2,5].includes(day); // อา จ อ ศ
}

/* =====================================================
   🔔 รวมการแจ้งเตือนทั้งหมด (ล่วงหน้า 3 วัน)
===================================================== */

async function collectNotifications() {
  const nowThai = getThaiNow();
  const todayStr = getThaiDateString();

  const groupMessageMap = {};

  /* ================= REMINDER ================= */

  const reminderSnap = await db.collection("reminders").get();

  reminderSnap.forEach(doc => {
    const data = doc.data();
    if (!data.eventDate || !data.groupId) return;

    const eventDate = data.eventDate.toDate();

    const diffDays = Math.ceil(
      (eventDate - nowThai) / (1000 * 60 * 60 * 24)
    );

    if (!groupMessageMap[data.groupId]) {
      groupMessageMap[data.groupId] = [];
    }

    if (diffDays === 0) {
      groupMessageMap[data.groupId].push(
        `📌 วันนี้: ${data.title}`
      );
    }

    // 🔥 เปลี่ยนจาก 7 เป็น 3 วัน
    if (diffDays === 3) {
      groupMessageMap[data.groupId].push(
        `⏳ อีก 3 วัน: ${data.title}`
      );
    }
  });

  /* ================= PROVINCE ================= */

  const provinceDoc = await db
    .collection("weeklyProvinceStats")
    .doc(todayStr)
    .get();

  if (!provinceDoc.exists) {
    const groupsSnap = await db.collection("groups").get();

    groupsSnap.forEach(groupDoc => {
      const groupData = groupDoc.data();

      if (groupData.modules?.province) {

        if (!groupMessageMap[groupDoc.id]) {
          groupMessageMap[groupDoc.id] = [];
        }

        groupMessageMap[groupDoc.id].push(
          "📢 วันนี้ยังไม่มีจังหวัดส่งสถิติ"
        );
      }
    });
  }

  return groupMessageMap;
}

/* =====================================================
   📤 ส่งข้อความรวม
===================================================== */

async function sendGroupedNotifications(showTime = false) {

  const groupMessageMap = await collectNotifications();

  for (const groupId in groupMessageMap) {

    const messages = groupMessageMap[groupId];

    if (!messages.length) continue;

    let finalMessage = "🔔 แจ้งเตือนประจำวัน\n\n";

    messages.forEach((msg, index) => {
      finalMessage += `${index + 1}. ${msg}\n`;
    });

    if (showTime) {
      finalMessage += `\n⏰ แจ้งเมื่อ: ${getThaiTimeString()}`;
    }

    console.log("📤 Sending grouped notification to:", groupId);

    await client.pushMessage(groupId, {
      type: "text",
      text: finalMessage
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
  if (lastRunDate === todayStr) return;


  console.log("🔔 7AM Scheduler Running:", todayStr);

	if (isEightAMThai() && isReportDay(getThaiNow())) {
	   await sendProvinceReminder();
	}

  await sendGroupedNotifications(true);

  lastRunDate = todayStr;
}

/* =====================================================
   🚀 RUN WHEN DEPLOY
===================================================== */

async function runOnStartup() {
  console.log("🚀 Startup check running...");
  await sendGroupedNotifications(true);
  console.log("✅ Startup check completed");
}

/* =====================================================
   START
===================================================== */

function startScheduler() {
  console.log("⏰ Scheduler started (checking every 60s)");

  runOnStartup();      // ยิงตอน deploy ใหม่
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };