const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");
const { handleReminders } = require("../modules/reminderModule");
const queue = require("../lineQueue");

/* 🔥 เพิ่มตรงนี้ */
const XLSX = require("xlsx");
const path = require("path");

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

/* 🔥 helper แปลง date ให้ match excel */
function formatExcelDateKey(date) {
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  const year = date.getFullYear() + 543;
  return `${day}-${month}-${year}`;
}

/* 🔥 อ่าน Excel */
function readProgramFromExcel(targetDate) {
  try {
    const filePath = path.join(process.cwd(), "hope_program_2026.xlsx");
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const key = formatExcelDateKey(targetDate);

    const row = data.find(r => {

      for (const k in r) {

        const val = r[k];

        if (!val) continue;

        const str = String(val).trim();

        if (
          str.includes(key) ||          // 22-Mar-2569
          str.includes("/") ||         // 22/03/2026
          str.includes("-")            // fallback
        ) {
          if (str.includes(targetDate.getDate())) {
            return true;
          }
        }

      }
      return false;
    });

    if (!row) {
      console.log("❌ ไม่เจอข้อมูลวันที่:", key);
      return {};
    }

    console.log("✅ เจอ row:", row);

    return row;

  } catch (err) {
    console.error("❌ read excel error:", err);
    return {};
  }
}

/* =====================================================
   TEMPLATE ข้อความ
===================================================== */

function buildFriday12() {
  return `🔔 แจ้งเตือนวันเสาร์ ซ้อมนมัสการ 16.30 นะครับ`;
}

function buildSunday9() {
  return `🔔 แจ้งเตือนเช้าวันอาทิตย์
hope channel มีไหมครับ ???
เพลงตอบสนอง เพลงอะไรครับ ???`;
}

/*function buildSunday1130() {

  const day = new Date().getDay();

  if (day !== 0) return null;

  return `🎵 เตรียมก่อนเทศนา เพลงตอบสนอง เพลงอะไรครับ ???`;
}*/

function buildMondayProgram() {

  const day = new Date().getDay();
  const sunday = getNextSunday();
  const dateStr = formatThaiDate(sunday);

  /* 🔥 ดึงข้อมูลจาก Excel */
  const data = readProgramFromExcel(sunday);

  return `---------------------------
โปรแกรมวันอาทิตย์ ${dateStr}
*********************
1. teaser Sustainable
2. อธิฐาน นมัสการ (${data["นมัสการ"] || "-"})
3. เคลื่อนไหว : ผู้นำวันนั้น
4. มหาสนิท : ผู้นำวันนั้น เพลง ???
5. ถวายทรัพย์ ผู้นำวันนั้น เพลง ???
6. ต้อนรับ / VIP ผู้นำวันนั้น เพลง ???
   1.
   2.
   3.
7. hope channel ???
8. คำพยานสด นำโดย (${data["MC"] || "-"})
   1.
   2.
9. อนุสรณ์พระพร นำโดย ผู้นำวันนั้น เพลง ???
10. VTR แนะนำผู้เทศน์
11. เทศนา โดย ???
12. เพลงตอบสนอง โดย ผู้นำวันนั้น เพลง ???
13. อธิฐานปิด
******งานเบื้องหลัง*****
ผู้จัดการรอบ (${data["ผู้จัดการ"] || "-"})
mixer / mic (${data["MIXER"] || "-"})
Support คอมฯ : -
BS : (${data["BS1"] || "-"}) (${data["BS2"] || "-"})
โต๊ะต้อนรับ (${data["ต้อนรับ"] || "-"})
ถือมหาสนิท/ถุงถวาย (${data["ถือมหาสนิท/ถุงถวาย"] || "-"})

คจ.เด็ก (${data["คจ.เด็ก 1"] || "-"}) (${data["คจ.เด็ก 2"] || "-"})
*****งานนมัสการ******
กีต้าไฟฟ้า (${data["กีต้า"] || "-"})
กลอง (${data["กลอง"] || "-"})
เบส (${data["เบส"] || "-"})
คีบอร์ด (${data["คีบอร์ด"] || "-"})
คอรัส - (${data["คอรัส1"] || "-"}) (${data["คอรัส2"] || "-"})
*******************`;
}

function buildSaturday15() {
  return `📣 แจ้งเตือน ชั้นสร้าง วันเสาร์ เจอกัน 18.00 น.`;
}

function buildMorningStats() {
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

    let sentCount = 0;
    let groupList = [];

    for (const g of groups.docs) {

      const data = g.data();

      if (!data.modules?.general) continue;

      const settings = data.generalSettings || {};
      if (settings[settingKey] === false) continue;

      queue.push(g.id, {
        type: "text",
        text: message
      });

      sentCount++;
      groupList.push(g.id);

      console.log("📤 General sent:", settingKey, g.id);

    }

    console.log(`📢 General: ${settingKey}\nส่ง ${sentCount} กลุ่ม\n${groupList.join("\n")}`);

  } catch (err) {

    console.error("Broadcast error:", err);

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

/*  cron.schedule("30 11 * * 0", async () => {
    console.log("⏰ Trigger sun1130");
    await broadcast(buildSunday1130(), "sun1130");
  }, { timezone: "Asia/Bangkok" });*/

  cron.schedule("0 12 * * 1", async () => {
    console.log("⏰ Trigger mon12");
    await broadcast(buildMondayProgram(), "mon12");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 15 * * 6", async () => {
    console.log("⏰ Trigger sat15");
    await broadcast(buildSaturday15(), "sat15");
  }, { timezone: "Asia/Bangkok" });

  cron.schedule("0 8 * * 0,1,4,5", async () => {
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
  buildMondayProgram,
  buildSaturday15
};