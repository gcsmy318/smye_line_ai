const { getDB } = require("../config/firebase");
const { reply, getProfile } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");

const DEFAULT_MODULES = {
  province: false,
  hatyai: false,
  reminder: false,
  permanentNote: false,
  serviceReport: false,
  registry: false
};

/* ========================================
   ENTRY POINT
======================================== */
async function handleMessage(event) {

  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;
  const userId = event.source.userId;
  const text = event.message.text.trim();
  const normalized = text.toLowerCase();

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      type: "general",
      modules: DEFAULT_MODULES
    });
  }

  const group = (await docRef.get()).data();
  const modules = group.modules || DEFAULT_MODULES;

  /* ===============================
     HELP MENU
  ================================ */
  if (isHelpCommand(normalized)) {
    return reply(event.replyToken, buildMainMenu(group));
  }

  /* ===============================
     เซ็ต1 - เซ็ต7 (เฉพาะ Smile)
  ================================ */
  if (normalized.startsWith("เซ็ต")) {

    const profile = await getProfile(userId);
    const displayName = profile.displayName || "";

    if (displayName !== "Smile") {
      return reply(event.replyToken,
        "⛔ คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลระบบเท่านั้น"
      );
    }

    return handleSetCommand(normalized, docRef, event);
  }

  /* ===============================
     HELP DETAIL
  ================================ */
if (normalized.startsWith("help ")) {

  const number = normalized.replace("help ", "").trim();

  if (["1","2","3","4","5","6"].includes(number)) {
    return reply(event.replyToken, buildModuleDetail(number));
  }

  return reply(event.replyToken, "พิมพ์ help 1 - help 6 เท่านั้น");
}
  /* ===============================
     ROUTER
  ================================ */
  if (modules.province && await province.handle(event, group)) return;
  if (modules.hatyai && await hatyai.handle(event, group)) return;
  if (modules.reminder && await reminder.handle(event, group)) return;
  if (modules.permanentNote && await note.handle(event, group)) return;
  if (modules.serviceReport && await report.handle(event, group)) return;
  if (modules.registry && await registry.handle(event, group)) return;
}

/* ========================================
   HANDLE SET COMMAND
======================================== */
async function handleSetCommand(text, docRef, event) {

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
    const group = (await docRef.get()).data();
    return reply(event.replyToken, buildStatus(group));
  }

  await docRef.set({
    modules: { [moduleName]: true }
  }, { merge: true });

  return reply(
    event.replyToken,
    `✅ เปิดระบบ ${moduleName} แล้ว`
  );
}

/* ========================================
   MAIN MENU
======================================== */
function buildMainMenu(group) {

  return `
🤖 Spirit AI เมนูหลัก
============================

พิมพ์ เซ็ต1 - เซ็ต7 เพื่อเปิดระบบ (ผู้ดูแลเท่านั้น)

เซ็ต1️⃣  ระบบรายงานจังหวัด
ติดตามการส่งสถิติ 6 จังหวัด
แจ้งเตือนอัตโนมัติทุกสัปดาห์

เซ็ต2️⃣  ระบบสถิติหาดใหญ่
กรอก pro=20 stb=10 ได้ทันที
สรุปตัวเลขแบบเรียลไทม์

เซ็ต3️⃣  ระบบแจ้งเตือนล่วงหน้า
บันทึกวันงาน ระบบเตือนก่อน 3 วัน
ไม่พลาดกิจกรรมสำคัญ

เซ็ต4️⃣  ระบบบันทึกถาวร
เก็บข้อมูลลาและบันทึกสำคัญ
ดูย้อนหลังได้เสมอ

เซ็ต5️⃣  ระบบรายงานการรับใช้
บันทึกสิ่งที่ทำแต่ละสัปดาห์
สร้างวัฒนธรรมการรับใช้

เซ็ต6️⃣  ระบบทะเบียนสมาชิก
เก็บวันเกิด + เบอร์โทร
ค้นหาตามเดือนเกิดได้

เซ็ต7️⃣  ดูสถานะระบบ
ตรวจสอบว่ากลุ่มนี้เปิดอะไรอยู่

พิมพ์ help 1
เพื่อดูรายละเอียดแบบเต็ม
`;
}

/* ========================================
   DETAIL HELP
======================================== */
function buildModuleDetail(number) {

  switch (number) {

    case "1":
      return `
📊 ระบบรายงานจังหวัด (รายละเอียด)

แจ้งเตือน: อา จ อ ศ เวลา 08:00
จังหวัด: สงขลา สตูล ปัตตานี ยะลา นราธิวาส พัทลุง

วิธีส่ง:
สงขลา ส่งสถิติแล้ว
`;

    case "2":
      return `
📊 ระบบสถิติหาดใหญ่ (รายละเอียด)

แจ้งเตือน: ทุกวันอาทิตย์ 13:00

วิธีส่ง:
pro=20
pro=20 stb=10
`;

    case "3":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า (รายละเอียด)

พิมพ์:
แจ้งเตือน ค่าย 1/3/2569

ระบบจะเตือนล่วงหน้า 3 วัน เวลา 08:00
`;

    case "4":
      return `
📝 ระบบบันทึกถาวร (รายละเอียด)

พิมพ์:
บันทึกลา สมาย 12/03/2026

ดูทั้งหมด:
บันทึกถาวร
`;

    case "5":
      return `
📘 ระบบรายงานการรับใช้ (รายละเอียด)

พิมพ์:
รายงานการรับใช้ วันนี้ไปดูแลคน

ดูรายงาน:
บันทึกรายงานการรับใช้
`;

    case "6":
      return `
👤 ระบบทะเบียนสมาชิก (รายละเอียด)

พิมพ์:
ลงทะเบียน สมาย 19/10/1993 เบอร์...

ค้นหา:
ขอข้อมูลทะเบียนเดือน10
`;

    default:
      return "ไม่พบระบบนี้";
  }
}

/* ========================================
   STATUS
======================================== */
function buildStatus(group) {

  let msg = "📊 สถานะระบบในกลุ่มนี้\n\n";

  Object.keys(group.modules).forEach(k => {
    msg += group.modules[k]
      ? `✔ ${k}\n`
      : `✖ ${k}\n`;
  });

  return msg;
}

/* ========================================
   UTIL
======================================== */
function isHelpCommand(text) {
  const keywords = ["help","menu","เมนู","คำสั่ง","setup"];
  return keywords.some(k => text.includes(k));
}

module.exports = {
  handleMessage
};