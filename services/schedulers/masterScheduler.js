const { db } = require("../../config/firebase");
const { client } = require("../../config/line");
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
  const todayThai = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );

  const groupMapToday = {};
  const groupMapSeven = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const eventDate = data.eventDate.toDate();

    const diffDays = Math.ceil(
      (eventDate - todayThai) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      if (!groupMapToday[data.groupId])
        groupMapToday[data.groupId] = [];
      groupMapToday[data.groupId].push(data);
    }

    if (diffDays === 7) {
      if (!groupMapSeven[data.groupId])
        groupMapSeven[data.groupId] = [];
      groupMapSeven[data.groupId].push(data);
    }
  });

  // แจ้งล่วงหน้า
  for (const groupId in groupMapSeven) {
    let msg = "🔔 แจ้งเตือนล่วงหน้า 7 วัน\n\n";
    groupMapSeven[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await sendMessage(groupId, msg);
  }

  // แจ้งวันจริง
  for (const groupId in groupMapToday) {
    let msg = "📌 วันนี้มีรายการสำคัญ\n\n";
    groupMapToday[groupId].forEach((r, i) => {
      msg += `${i + 1}. ${r.title}\n`;
    });

    await sendMessage(groupId, msg);
  }
}

async function handleProvinceReminder() {
  const todayStr = getTodayString();
  const doc = await db.collection("weeklyProvinceStats").doc(todayStr).get();

  if (doc.exists) return;

  const groupsSnapshot = await db.collection("groups").get();

  for (const g of groupsSnapshot.docs) {
    const data = g.data();

    if (data.modules?.province) {
      await sendMessage(
        g.id,
        "📢 แจ้งเตือนรายงานจังหวัด\nวันนี้ยังไม่มีจังหวัดส่งสถิติ"
      );
    }
  }
}
async function scheduler() {
  const nowThai = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );

  if (nowThai.getHours() !== 7) return;

  const todayStr = nowThai.toISOString().split("T")[0];

  const logRef = db.collection("schedulerLogs").doc(todayStr);
  const logDoc = await logRef.get();

  if (logDoc.exists) return;

  await handleReminders();
  await handleProvinceReminder();

  await logRef.set({
    ranAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

function startScheduler() {
  setInterval(scheduler, 60000);
}

module.exports = { startScheduler };