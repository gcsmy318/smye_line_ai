const { db } = require("../config/firebase");
const { client } = require("../config/line");
const admin = require("firebase-admin");

let lastRunDate = null;

function getTodayString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function isSevenAM() {
  const now = new Date();
  return now.getHours() === 7 && now.getMinutes() === 0;
}

async function sendMessage(groupId, text) {
  await client.pushMessage(groupId, {
    type: "text",
    text
  });
}

async function handleReminders() {
  const snapshot = await db.collection("reminders").get();
  const today = new Date();
  const todayStr = getTodayString();

  const todayList = [];
  const sevenDayList = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const eventDate = data.eventDate.toDate();

    const diffDays = Math.ceil(
      (eventDate - today) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      todayList.push(data);
    }

    if (diffDays === 7) {
      sevenDayList.push(data);
    }
  });

  if (sevenDayList.length > 0) {
    let msg = "🔔 แจ้งเตือนล่วงหน้า 7 วัน\n\n";
    sevenDayList.forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });
    await sendMessage(sevenDayList[0].groupId, msg);
  }

  if (todayList.length > 0) {
    let msg = "📌 วันนี้มีรายการสำคัญ\n\n";
    todayList.forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });
    await sendMessage(todayList[0].groupId, msg);
  }
}

async function handleProvinceReminder() {
  const todayStr = getTodayString();
  const doc = await db.collection("weeklyProvinceStats").doc(todayStr).get();

  if (!doc.exists) {
    await sendMessage("YOUR_GROUP_ID", 
      "📢 แจ้งเตือนรายงานจังหวัด\nวันนี้ยังไม่มีจังหวัดส่งสถิติ");
  }
}

async function scheduler() {
  if (!isSevenAM()) return;

  const todayStr = getTodayString();
  if (lastRunDate === todayStr) return;

  lastRunDate = todayStr;

  await handleReminders();
  await handleProvinceReminder();
}

function startScheduler() {
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };