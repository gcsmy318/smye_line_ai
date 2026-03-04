const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");
const { handleReminders } = require("../modules/reminderModule");

/* ===================================================== */

const TARGET_GROUP = "C8a88d6ad8fc5984939d59de795c719d6";

/* 🔧 กัน broadcast ซ้อน */
let broadcastRunning = false;

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

  const day = new Date().getDay();

  if (day !== 5 && day !== 6) return null;

  return `🔔 แจ้งเตือนวันเสาร์ ซ้อมนมัสการ 16.30 นะครับ`;
}

function buildSunday9() {

  const day = new Date().getDay();

  if (day !== 0) return null;

  return `🔔 แจ้งเตือนเช้าวันอาทิตย์
hope channel มีไหมครับ ???
เพลงตอบสนอง เพลงอะไรครับ ???`;
}

function buildSunday1130() {

  const day = new Date().getDay();

  if (day !== 0) return null;

  return `🎵 เตรียมก่อนเทศนา เพลงตอบสนอง เพลงอะไรครับ ???`;
}

function buildMondayProgram() {

  const day = new Date().getDay();

  if (day !== 1) return null;

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

  const day = new Date().getDay();

  if (day !== 5 && day !== 6) return null;

  return `📣 แจ้งเตือน ชั้นสร้าง วันเสาร์ เจอกัน 18.00 น.`;
}

function buildMorningStats() {

  const day = new Date().getDay();

  if (![1,3,5].includes(day)) return null;

  return `📢 รบกวนผู้นำทุกท่านส่งสถิติด้วยนะครับ ขอบคุณครับ`;
}

/* =====================================================
   BROADCAST
===================================================== */

async function broadcast(message, settingKey) {

  if (!message) return;

  if (broadcastRunning) {
    console.log("⚠ broadcast already running");
    return;
  }

  broadcastRunning = true;

  try {

    const db = getDB();
    if (!db) return;

    const groups = await db.collection("groups").get();

    const wait = ms => new Promise(r => setTimeout(r, ms));

    let sentCount = 0;
    let groupList = [];

    for (const g of groups.docs) {

      const data = g.data();

      if (!data.modules?.general) continue;

      const settings = data.generalSettings || {};
      if (settings[settingKey] === false) continue;

      let sent = false;

      for (let retry = 0; retry < 5 && !sent; retry++) {

        try {

          await client.pushMessage(g.id, {
            type: "text",
            text: message
          });

          sent = true;

        } catch (err) {

          if (err.statusCode === 429) {

            console.log("⚠ 429 hit, waiting...");
            await wait(5000);

          } else {

            console.error("Broadcast error:", err.message);
            break;

          }

        }

      }

      await wait(700); // ⭐ throttle ต่อ group

      sentCount++;
      groupList.push(g.id);

      console.log("📤 General sent:", settingKey, g.id);
    }

    console.log(`📢 General: ${settingKey}\nส่ง ${sentCount} กลุ่ม\n${groupList.join("\n")}`);

  } finally {

    broadcastRunning = false;

  }

}

/* =====================================================
   START SCHEDULER
===================================================== */

function startGeneralScheduler() {

  console.log("⏰ General Scheduler Started");

  cron.schedule("0 12 * * 5", async () => {
    console.log("⏰ Trigger fri12");
    await broadcast(buildFriday12(), "fri12");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 9 * * 0", async () => {
    console.log("⏰ Trigger sun9");
    await broadcast(buildSunday9(), "sun9");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("30 11 * * 0", async () => {
    console.log("⏰ Trigger sun1130");
    await broadcast(buildSunday1130(), "sun1130");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 12 * * 1", async () => {
    console.log("⏰ Trigger mon12");
    await broadcast(buildMondayProgram(), "mon12");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 15 * * 6", async () => {
    console.log("⏰ Trigger sat15");
    await broadcast(buildSaturday15(), "sat15");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 8 * * 0,1,2,5", async () => {
    console.log("⏰ Trigger stats8");
    await broadcast(buildMorningStats(), "stats8");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 7 * * *", async () => {
    console.log("🔔 Trigger handleReminders()");
    await handleReminders();
    console.log("✅ handleReminders เสร็จแล้ว");
  }, { timezone: "Asia/Bangkok" });
}

module.exports = {
  startGeneralScheduler,
  broadcast,
  buildMorningStats,
  buildFriday12,
  buildSunday9,
  buildSunday1130,
  buildMondayProgram,
  buildSaturday15
};