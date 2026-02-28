const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

/* ===============================
   IMPORT MODULES
================================= */
const provinceModule = require("./modules/provinceModule");
const subprovinceModule = require("./modules/subprovinceModule");
const worshipModule = require("./modules/worshipModule");
const meetingModule = require("./modules/meetingModule");
const programModule = require("./modules/programModule");
const reminderModule = require("./modules/reminderModule");
const permanentNoteModule = require("./modules/permanentNoteModule");
const serviceReportModule = require("./modules/serviceReportModule");
const registryModule = require("./modules/registryModule");

/* ===============================
   HANDLE GROUP JOIN (AUTO SETUP)
================================= */
async function handleGroupJoin(event) {
  const db = getDB();
  const groupId = event.source.groupId;

  if (!groupId) return;

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      name: "New Group",
      modules: {
        province: false,
        subprovince: false,
        worship: false,
        meeting: false,
        program: false,
        reminder: false,
        permanentNote: false,
        serviceReport: false,
        registry: false
      },
      createdAt: new Date()
    });

    await reply(
      event.replyToken,
`🤖 Spirit AI พร้อมใช้งาน

กรุณาเลือกเปิดระบบที่ต้องการใช้:

1️⃣ province — ระบบสถิติจังหวัด
แจ้งเตือน อา จ อ ศ 08:00
พิมพ์: สงขลา ส่งสถิติแล้ว

2️⃣ subprovince — ระบบสถิติหาดใหญ่
แจ้งเตือน อาทิตย์ 13:00
พิมพ์: pro=20

3️⃣ worship — ระบบงานนมัสการ
แจ้งเตือนซ้อม, เพลงตอบสนอง

4️⃣ meeting — ระบบประชุม
แจ้งเตือนประชุม + ลงชื่อ

5️⃣ program — โปรแกรมวันอาทิตย์

6️⃣ reminder — แจ้งเตือนล่วงหน้า 3 วัน

7️⃣ permanentNote — บันทึกถาวร

8️⃣ serviceReport — รายงานการรับใช้รายสัปดาห์

9️⃣ registry — ลงทะเบียนสมาชิก

พิมพ์:
เปิด province
หรือหลายอัน:
เปิด province worship meeting`
    );
  }
}
/* ===============================
   HANDLE MESSAGE
================================= */
async function handleMessage(event) {

  const db = getDB();
  const text = event.message.text.trim();
  const lowerText = text.toLowerCase();
  const groupId = event.source.groupId || event.source.userId;

  if (!groupId) return;

  const groupDoc = await db.collection("groups").doc(groupId).get();

  if (!groupDoc.exists) {
    return reply(event.replyToken, "กลุ่มนี้ยังไม่ได้ตั้งค่า");
  }

  const group = groupDoc.data();
  const modules = group.modules || {};

  /* ===============================
     MODULE CONFIGURATION
  ================================= */

if (lowerText.startsWith("เปิด ")) {

  const input = lowerText.replace("เปิด ", "").trim();
  const selectedModules = input.split(" ");

  let enabled = [];

  for (const m of selectedModules) {
    if (modules.hasOwnProperty(m)) {
      await db.collection("groups").doc(groupId).update({
        [`modules.${m}`]: true
      });
      enabled.push(m);
    }
  }

  if (enabled.length === 0) {
    return reply(event.replyToken, "ไม่พบโมดูลที่ถูกต้อง");
  }

  return reply(event.replyToken,
`✅ เปิดระบบเรียบร้อย:

${enabled.map(e => `✔ ${e}`).join("\n")}

พิมพ์ help เพื่อดูคำสั่งของระบบที่เปิด`
  );
}

  if (lowerText.startsWith("ปิด ")) {
    const moduleName = lowerText.replace("ปิด ", "").trim();

    if (!modules.hasOwnProperty(moduleName)) {
      return reply(event.replyToken, "ไม่พบโมดูลนี้");
    }

    await db.collection("groups").doc(groupId).update({
      [`modules.${moduleName}`]: false
    });

    return reply(event.replyToken, `❌ ปิด ${moduleName} แล้ว`);
  }

  /* ===============================
     HELP
  ================================= */

  if (lowerText === "help" || lowerText === "คำสั่ง") {
    return reply(event.replyToken, buildHelpMessage(modules));
  }

  /* ===============================
     MODULE ROUTING
  ================================= */

  try {

    if (modules.province) {
      await provinceModule.handle(event, group);
    }

    if (modules.subprovince) {
      await subprovinceModule.handle(event, group);
    }

    if (modules.worship) {
      await worshipModule.handle(event, group);
    }

    if (modules.meeting) {
      await meetingModule.handle(event, group);
    }

    if (modules.program) {
      await programModule.handle(event, group);
    }

    if (modules.reminder) {
      await reminderModule.handle(event, group);
    }

    if (modules.permanentNote) {
      await permanentNoteModule.handle(event, group);
    }

    if (modules.serviceReport) {
      await serviceReportModule.handle(event, group);
    }

    if (modules.registry) {
      await registryModule.handle(event, group);
    }

  } catch (err) {
    console.error("MODULE ERROR:", err);
  }

}

/* ===============================
   BUILD HELP MESSAGE
================================= */


function buildHelpMessage(modules) {

  let msg = "🤖 Spirit AI ระบบที่เปิดในกลุ่มนี้:\n\n";

  if (modules.province) {
    msg += "📍 province\n";
    msg += "พิมพ์: จังหวัด ส่งสถิติแล้ว\n\n";
  }

  if (modules.subprovince) {
    msg += "🏙 subprovince\n";
    msg += "พิมพ์: pro=20 stb=10\n\n";
  }

  if (modules.worship) {
    msg += "🎵 worship\n";
    msg += "แจ้งเตือนซ้อม + เพลงตอบสนอง\n\n";
  }

  if (modules.meeting) {
    msg += "📅 meeting\n";
    msg += "แจ้งประชุม + ลงชื่อ\n\n";
  }

  if (modules.program) {
    msg += "📋 program\n";
    msg += "โปรแกรมวันอาทิตย์\n\n";
  }

  if (modules.reminder) {
    msg += "⏰ reminder\n";
    msg += "แจ้งเตือนล่วงหน้า 3 วัน\n\n";
  }

  if (modules.permanentNote) {
    msg += "📝 permanentNote\n";
    msg += "บันทึกถาวร\n\n";
  }

  if (modules.serviceReport) {
    msg += "📖 serviceReport\n";
    msg += "รายงานการรับใช้\n\n";
  }

  if (modules.registry) {
    msg += "👤 registry\n";
    msg += "ลงทะเบียนสมาชิก\n\n";
  }

  return msg;
}

module.exports = { handleMessage, handleGroupJoin };