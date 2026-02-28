const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");

/* =====================================================
   DEFAULT MODULES
===================================================== */
const DEFAULT_MODULES = {
  province: false,
  hatyai: false,
  reminder: false,
  permanentNote: false,
  serviceReport: false,
  registry: false
};

/* =====================================================
   SAFE REPLY
===================================================== */
async function safeReply(token, message) {
  try {
    if (!token || !message) return;
    await reply(token, message);
  } catch (err) {
    console.error("Reply Error:", err.message);
  }
}

/* =====================================================
   ENTRY POINT
===================================================== */
async function handleMessage(event) {

  try {

    if (!event || !event.message || event.message.type !== "text") return;

    const db = getDB();
    const groupId = event.source?.groupId || event.source?.userId;
    if (!groupId) return;

    const rawText = event.message.text;
    if (!rawText) return;

    const text = rawText.trim();
    if (!text) return;

    const normalized = text.toLowerCase();

    const docRef = db.collection("groups").doc(groupId);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        type: "general",
        modules: { ...DEFAULT_MODULES }
      });
    }

    const group = (await docRef.get()).data() || {};
    const modules = group.modules || DEFAULT_MODULES;

    /* ===============================
       HELP MENU
    ================================ */
    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    /* ===============================
       HELP DETAIL
    ================================ */
    if (normalized.startsWith("help ")) {

      const number = normalized.replace("help ", "").trim();

      if (["1","2","3","4","5","6"].includes(number)) {
        return safeReply(event.replyToken, buildModuleDetail(number));
      }

      return safeReply(event.replyToken, "พิมพ์ help 1 - help 6 เท่านั้น");
    }

    /* ===============================
       ต้องขึ้นต้นด้วย Smile เท่านั้น
    ================================ */
    if (normalized.startsWith("smile")) {

      const command = normalized.replace("smile", "").trim();

      if (command.startsWith("เซ็ต")) {
        return handleSetCommand(command, docRef, event);
      }

      return;
    }

    /* ===============================
       ROUTER
    ================================ */
    try { if (modules.province && await province.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.hatyai && await hatyai.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.reminder && await reminder.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.permanentNote && await note.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.serviceReport && await report.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.registry && await registry.handle(event, group)) return; } catch(e){ console.error(e); }

  } catch (error) {
    console.error("Fatal Error:", error);
  }
}

/* =====================================================
   HANDLE SET
===================================================== */
async function handleSetCommand(text, docRef, event) {

  try {

    const setMap = {
      "เซ็ต1": "province",
      "เซ็ต2": "hatyai",
      "เซ็ต3": "reminder",
      "เซ็ต4": "permanentNote",
      "เซ็ต5": "serviceReport",
      "เซ็ต6": "registry",
      "เซ็ต7": "status"
    };

    const key = Object.keys(setMap).find(k => text.includes(k));
    if (!key) return;

    const moduleName = setMap[key];

    if (moduleName === "status") {
      const group = (await docRef.get()).data() || {};
      return safeReply(event.replyToken, buildStatus(group));
    }

    await docRef.set({
      modules: { [moduleName]: true }
    }, { merge: true });

    return safeReply(
      event.replyToken,
      `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว`
    );

  } catch (err) {
    console.error("SetCommand Error:", err.message);
  }
}

/* =====================================================
   เมนูหลัก (มีคำอธิบายครบ)
===================================================== */
function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก
=================================

เปิดระบบ (ต้องพิมพ์แบบนี้):

Smile เซ็ต1  → ระบบรายงานจังหวัด
ติดตามการส่งสถิติ 6 จังหวัด
แจ้งเตือนอัตโนมัติทุกสัปดาห์

Smile เซ็ต2  → ระบบสถิติหาดใหญ่
กรอก pro=20 stb=10 ได้ทันที
สรุปผลแบบเรียลไทม์

Smile เซ็ต3  → ระบบแจ้งเตือนล่วงหน้า
บันทึกวันงาน ระบบเตือนก่อน 3 วัน
ไม่พลาดกิจกรรมสำคัญ

Smile เซ็ต4  → ระบบบันทึกถาวร
เก็บข้อมูลลาและบันทึกสำคัญ
ดูย้อนหลังได้เสมอ

Smile เซ็ต5  → ระบบรายงานการรับใช้
บันทึกสิ่งที่ทำรายสัปดาห์
สร้างวัฒนธรรมการรับใช้

Smile เซ็ต6  → ระบบทะเบียนสมาชิก
บันทึกวันเกิดและเบอร์โทร
ค้นหาตามเดือนเกิดได้

Smile เซ็ต7  → ดูสถานะระบบ

พิมพ์ help 1 - help 6
เพื่อดูรายละเอียดแบบเต็ม
`;
}

/* =====================================================
   รายละเอียดเต็มแต่ละระบบ
===================================================== */
function buildModuleDetail(number) {

  switch (number) {

    case "1":
      return `
📊 ระบบรายงานจังหวัด (ละเอียด)

แจ้งเตือน: อา จ อ ศ เวลา 08:00
จังหวัด: สงขลา สตูล ปัตตานี ยะลา นราธิวาส พัทลุง

วิธีส่ง:
สงขลา ส่งสถิติแล้ว
`;

    case "2":
      return `
📊 ระบบสถิติหาดใหญ่ (ละเอียด)

แจ้งเตือน: ทุกวันอาทิตย์ 13:00

วิธีส่ง:
pro=20
pro=20 stb=10
`;

    case "3":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า (ละเอียด)

พิมพ์:
แจ้งเตือน ค่าย 1/3/2569

ระบบจะแจ้งเตือนล่วงหน้า 3 วัน เวลา 08:00
`;

    case "4":
      return `
📝 ระบบบันทึกถาวร (ละเอียด)

พิมพ์:
บันทึกลา สมาย 12/03/2026

ดูทั้งหมด:
บันทึกถาวร
`;

    case "5":
      return `
📘 ระบบรายงานการรับใช้ (ละเอียด)

พิมพ์:
รายงานการรับใช้ วันนี้ไปดูแลคน

ดูรายงาน:
บันทึกรายงานการรับใช้
`;

    case "6":
      return `
👤 ระบบทะเบียนสมาชิก (ละเอียด)

พิมพ์:
ลงทะเบียน สมาย 19/10/1993 เบอร์โทร...

ค้นหา:
ขอข้อมูลทะเบียนเดือน10
`;

    default:
      return "ไม่พบระบบนี้";
  }
}

/* =====================================================
   STATUS
===================================================== */
function buildStatus(group) {
  let msg = "📊 สถานะระบบ\n\n";
  const modules = group.modules || {};
  Object.keys(DEFAULT_MODULES).forEach(k => {
    msg += modules[k] ? `✔ ${k}\n` : `✖ ${k}\n`;
  });
  return msg;
}

/* =====================================================
   UTIL
===================================================== */
function isHelpCommand(text) {
  const keywords = ["help","menu","เมนู","คำสั่ง","setup"];
  return keywords.some(k => text.includes(k));
}

module.exports = {
  handleMessage
};