const cron = require("node-cron");
const { getDB } = require("../../config/firebase");
const { client } = require("../../config/line");

/* =====================================================
   📤 Broadcast แบบเช็ค setting
===================================================== */

async function broadcast(message, settingKey) {

  try {

    const db = getDB();
    const groups = await db.collection("groups").get();

    for (const g of groups.docs) {

      const data = g.data();

      // ต้องเปิด module general ก่อน
      if (!data.modules?.general) continue;

      const settings = data.generalSettings || {};

      // ถ้า setting ถูกปิดไว้
      if (settings[settingKey] === false) continue;

      await client.pushMessage(g.id, {
        type: "text",
        text: message
      });

      console.log(`📤 Sent ${settingKey} to group: ${g.id}`);
    }

  } catch (err) {
    console.error("General Broadcast Error:", err);
  }
}

/* =====================================================
   🔔 START GENERAL SCHEDULER
===================================================== */

function startGeneralScheduler() {

  console.log("⏰ General Scheduler Started");

  /* ===============================
     ศุกร์ 12:00
  ================================ */
  cron.schedule("0 12 * * 5", async () => {
    await broadcast("ซ้อมนมัสการ 16.30 นะครับ", "fri12");
  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     อาทิตย์ 09:00
  ================================ */
  cron.schedule("0 9 * * 0", async () => {
    await broadcast(
      "แจ้งเตือน hope channel มีไหมครับ ???\nเพลงตอบสนอง เพลงอะไร ???",
      "sun9"
    );
  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     อาทิตย์ 11:30
  ================================ */
  cron.schedule("30 11 * * 0", async () => {
    await broadcast("เพลงตอบสนอง เพลงอะไร ???", "sun1130");
  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     จันทร์ 12:00 (โปรแกรมใหญ่)
  ================================ */
  cron.schedule("0 12 * * 1", async () => {

    const message = `
โปรแกรมวันอาทิตย์
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
Support คอมฯ :
BS :
โต๊ะต้อนรับ -
คจ.เด็ก -

*****งานนมัสการ********
กีต้าไฟฟ้า -
กลอง -
เบส -
คีบอร์ด -
คอรัส -
**********************
`;

    await broadcast(message, "mon12");

  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     ศุกร์ และ เสาร์ 08:00
  ================================ */
  cron.schedule("0 8 * * 5,6", async () => {

    const message = `
พรุ่งนี้วันเสาร์ขออนุญาตนัดหมายประชุมเวลา 10.00-12:00 น. ครับ

ลงชื่อประชุม
1.
2.
3.

ลาประชุม ( ส่งรายงานในกลุ่ม )
1.
2.
3.
`;

    await broadcast(message, "fri8"); // ใช้ fri8 เป็น key หลัก

  }, { timezone: "Asia/Bangkok" });

  /* ===============================
     เสาร์ 15:00
  ================================ */
  cron.schedule("0 15 * * 6", async () => {
    await broadcast("ชั้นสร้าง เจอกัน 18.00น.", "sat15");
  }, { timezone: "Asia/Bangkok" });

}

module.exports = { startGeneralScheduler };