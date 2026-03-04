const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");
const { handleReminders } = require("../modules/reminderModule");

/* ===================================================== */

const TARGET_GROUP = "C8a88d6ad8fc5984939d59de795c719d6";

/* ===================================================== */
/* 🔥 MASTER LOG */
/* ===================================================== */

async function logToMaster(message) {
  try {
    await client.pushMessage(TARGET_GROUP, {
      type: "text",
      text: `📡 SYSTEM LOG\n${message}`
    });
  } catch (err) {
    console.error("Master Log Error:", err.message);
  }
}

/* =====================================================
   UTIL
===================================================== */

function getNextSunday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + diff);
  return nextSunday;
}

function formatThaiDate(date) {
  const day = date.getDate();
  const month = date.toLocaleDateString("th-TH", { month: "short" });
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}


/* =====================================================
   TEMPLATE ข้อความ
===================================================== */

function buildFriday12() {
  return `🔔 แจ้งเตือนวันนี้ ซ้อมนมัสการ 16.30 นะครับ`;
}

function buildSunday9() {
  return `🔔 แจ้งเตือนเช้าวันอาทิตย์
hope channel มีไหมครับ ???
เพลงตอบสนอง เพลงอะไรครับ ???`;
}

function buildSunday1130() {
  return `🎵 เตรียมก่อนเทศนา เพลงตอบสนอง เพลงอะไรครับ ???`;
}

function buildMondayProgram() {

  const sunday = getNextSunday();
  const dateStr = formatThaiDate(sunday);

  return `---------------------------------------
โปรแกรมวันอาทิตย์ ${dateStr}
**************************
1. teaser Sustainable
2. อธิฐาน นมัสการ -
3. เคลื่อนไหว : -
4. มหาสนิท : - เพลง -
5. ถวายทรัพย์ - เพลง -
6. ต้อนรับ / VIP - เพลง -
   1.
   2.
   3.
7. hope channel -
8. คำพยานสด นำโดย -
   1.
   2.
9. อนุสรณ์พระพร นำโดย - เพลง -
10. VTR แนะนำผู้เทศน์
11. เทศนา โดย -
12. เพลงตอบสนอง -
13. อธิฐานปิด
******งานเบื้องหลัง*******
ผู้จัดการรอบ -
mixer / mic -
Support คอมฯ : -
BS :
โต๊ะต้อนรับ -
คจ.เด็ก -
*****งานนมัสการ********
กีต้าไฟฟ้า -
กลอง -
เบส -
คีบอร์ด -
คอรัส -
**********************`;
}

function buildSaturday15() {
  return `📣 แจ้งเตือน ชั้นสร้าง เจอกัน 18.00 น.`;
}

function buildMorningStats() {
  return `📢 รบกวนผู้นำทุกท่านส่งสถิติด้วยนะครับ ขอบคุณครับ`;
}

/* =====================================================
   BROADCAST
===================================================== */

async function broadcast(message, settingKey) {

  const db = getDB();
  if (!db) return;

  const groups = await db.collection("groups").get();

  let sentCount = 0;
  let groupList = [];

  for (const g of groups.docs) {

    const data = g.data();

    if (!data.modules?.general) continue;

    const settings = data.generalSettings || {};
    if (settings[settingKey] === false) continue;

    await client.pushMessage(g.id, {
      type: "text",
      text: message
    });

    sentCount++;
    groupList.push(g.id);

    console.log("📤 General sent:", settingKey, g.id);
  }

  // 🔥 เพิ่ม log (ไม่แตะของเดิม)
  await logToMaster(
    `📢 General: ${settingKey}\nส่ง ${sentCount} กลุ่ม\n${groupList.join("\n")}`
  );
}

/* =====================================================
   START SCHEDULER
===================================================== */

function startGeneralScheduler() {

  console.log("⏰ General Scheduler Started");
  logToMaster("🚀 General Scheduler Started");

  // ศุกร์ 12:00
  cron.schedule("0 12 * * 5", async () => {
    await logToMaster("⏰ Trigger fri12");
    await broadcast(buildFriday12(), "fri12");
  }, { timezone: "Asia/Bangkok" });

  // อาทิตย์ 09:00
  cron.schedule("0 9 * * 0", async () => {
    await logToMaster("⏰ Trigger sun9");
    await broadcast(buildSunday9(), "sun9");
  }, { timezone: "Asia/Bangkok" });

  // อาทิตย์ 11:30
  cron.schedule("30 11 * * 0", async () => {
    await logToMaster("⏰ Trigger sun1130");
    await broadcast(buildSunday1130(), "sun1130");
  }, { timezone: "Asia/Bangkok" });

  // จันทร์ 12:00
  cron.schedule("0 12 * * 1", async () => {
    await logToMaster("⏰ Trigger mon12");
    await broadcast(buildMondayProgram(), "mon12");
  }, { timezone: "Asia/Bangkok" });

  // เสาร์ 15:00
  cron.schedule("0 15 * * 6", async () => {
    await logToMaster("⏰ Trigger sat15");
    await broadcast(buildSaturday15(), "sat15");
  }, { timezone: "Asia/Bangkok" });

  // 🔥 8 โมงเช้า
  cron.schedule("0 8 * * 0,1,2,5", async () => {
    await logToMaster("⏰ Trigger stats8");
    await broadcast(buildMorningStats(), "stats8");
  }, { timezone: "Asia/Bangkok" });

  // 🔔 7 Reminder
  cron.schedule("50 7 * * *", async () => {
    await logToMaster("🔔 Trigger handleReminders()");
    await handleReminders();
    await logToMaster("✅ handleReminders เสร็จแล้ว");
  }, { timezone: "Asia/Bangkok" });

}

module.exports = { startGeneralScheduler };