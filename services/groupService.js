const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");

async function handleMessage(event) {

  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;
  const text = event.message.text.trim().toLowerCase();

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      modules: {
        province: false,
        hatyai: false,
        reminder: false,
        permanentNote: false,
        serviceReport: false,
        registry: false
      }
    });
  }

  const group = (await docRef.get()).data();
  const modules = group.modules || {};

  // ===== HELP =====
if (isHelpCommand(text)) {
  return reply(event.replyToken, buildHelp(modules));
}

  // ===== ROUTER =====
  if (modules.province) if (await province.handle(event, group)) return;
  if (modules.hatyai) if (await hatyai.handle(event, group)) return;
  if (modules.reminder) if (await reminder.handle(event, group)) return;
  if (modules.permanentNote) if (await note.handle(event, group)) return;
  if (modules.serviceReport) if (await report.handle(event, group)) return;
  if (modules.registry) if (await registry.handle(event, group)) return;
}

function buildHelp(modules) {

  let msg = "🤖 Spirit AI คู่มือการใช้งาน\n";
  msg += "=================================\n\n";

  msg += "📌 ระบบที่สามารถทำได้\n\n";

  msg += "1️⃣ ระบบรายงานสถิติ จังหวัด\n";
  msg += "   - ใช้สำหรับผู้นำจังหวัดรายงานสถิติประจำสัปดาห์\n";
  msg += "   - พิมพ์: สงขลา ส่งสถิติแล้ว\n\n";

  msg += "2️⃣ ระบบรายงานสถิติ หาดใหญ่\n";
  msg += "   - ใช้รายงานจำนวนคนในแต่ละแคร์\n";
  msg += "   - พิมพ์: pro=20 หรือ pro=20 stb=10\n\n";

  msg += "3️⃣ ระบบแจ้งเตือนทั่วไป\n";
  msg += "   - แจ้งเตือนอัตโนมัติตามวัน/เวลา เช่น ซ้อมนมัสการ\n\n";

  msg += "4️⃣ ระบบแจ้งเตือนล่วงหน้า\n";
  msg += "   - พิมพ์: แจ้งเตือน ค่าย 1/3/2569\n";
  msg += "   - ระบบจะแจ้งเตือนล่วงหน้า 3 วัน\n\n";

  msg += "5️⃣ ระบบบันทึกถาวร\n";
  msg += "   - พิมพ์: บันทึกลา สมาย 12/03/2026\n";
  msg += "   - ดูรายการ: บันทึกถาวร\n\n";

  msg += "6️⃣ ระบบรายงานการรับใช้\n";
  msg += "   - พิมพ์: รายงานการรับใช้ วันนี้ไปเยี่ยมคน\n";
  msg += "   - ดูรายการ: บันทึกรายงานการรับใช้\n\n";

  msg += "7️⃣ ระบบทะเบียนสมาชิก\n";
  msg += "   - พิมพ์: ลงทะเบียน สมาย 19/10/1993 เบอร์โทรติดต่อ 065xxxxxxx\n";
  msg += "   - ค้นหา: ขอข้อมูลทะเบียนเดือน10\n\n";

  msg += "=================================\n";
  msg += "📘 ระบบที่เปิดใช้งานในกลุ่มนี้:\n\n";

  Object.keys(modules).forEach(k => {
    msg += modules[k]
      ? `✔ ${k} (เปิดอยู่)\n`
      : `✖ ${k} (ยังไม่ได้เปิด)\n`;
  });

  msg += "\n=================================\n";
  msg += "📌 วิธีตั้งค่าเมื่อเพิ่มบอทเข้ากลุ่มใหม่\n";
  msg += "1. เชิญบอทเข้ากลุ่ม\n";
  msg += "2. พิมพ์ help เพื่อดูสถานะ\n";
  msg += "3. เปิดระบบที่ต้องการ เช่น:\n";
  msg += "   เปิด province\n";
  msg += "   เปิด hatyai\n";
  msg += "   เปิด reminder\n";
  msg += "   เปิด permanentNote\n";
  msg += "   เปิด serviceReport\n";
  msg += "   เปิด registry\n";

  return msg;
}

function isHelpCommand(text) {
  const normalized = text.trim().toLowerCase();

  const helpKeywords = [
    "help",
    "menu",
    "คำสั่ง",
    "วิธีใช้",
    "ช่วยเหลือ",
    "คู่มือ",
    "เมนู",
    "ใช้ยังไง",
    "ใช้อย่างไร"
  ];

  return helpKeywords.includes(normalized);
}

module.exports = { handleMessage };