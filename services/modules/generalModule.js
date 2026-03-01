const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");

async function broadcast(message, settingKey) {

  const db = getDB();
  if (!db) return;

  const groups = await db.collection("groups").get();

  for (const g of groups.docs) {

    const data = g.data();

    if (!data.modules?.general) continue;

    const settings = data.generalSettings || {};
    if (settings[settingKey] === false) continue;

    await client.pushMessage(g.id, {
      type: "text",
      text: message
    });

    console.log("📤 General sent:", settingKey, g.id);
  }
}

function startGeneralScheduler() {

  console.log("⏰ General Scheduler Started");

  cron.schedule("0 12 * * 5", async () => {
    await broadcast("ซ้อมนมัสการ 16.30 นะครับ", "fri12");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 9 * * 0", async () => {
    await broadcast("แจ้งเตือน hope channel มีไหมครับ ???", "sun9");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("30 11 * * 0", async () => {
    await broadcast("เพลงตอบสนอง เพลงอะไร ???", "sun1130");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 12 * * 1", async () => {
    await broadcast("โปรแกรมวันอาทิตย์...", "mon12");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 8 * * 5,6", async () => {
    await broadcast("นัดประชุม 10.00-12.00", "fri8");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 15 * * 6", async () => {
    await broadcast("ชั้นสร้าง เจอกัน 18.00น.", "sat15");
  }, { timezone: "Asia/Bangkok" });
}

module.exports = { startGeneralScheduler };