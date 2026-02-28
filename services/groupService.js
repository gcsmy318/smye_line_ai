const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");

/* =====================================================
   🔐 กำหนด ADMIN USER ID (แนะนำใส่ใน .env)
   ADMIN_USER_ID=Uxxxxxxxxxxxxxxxxxxxx
===================================================== */
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

/* =====================================================
   📦 ค่าเริ่มต้นของ module
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
   🚀 ENTRY POINT
===================================================== */
async function handleMessage(event) {

  if (!event || !event.message || event.message.type !== "text") return;

  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;
  const userId = event.source.userId;

  const text = event.message.text.trim();
  const normalized = text.toLowerCase();

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  /* ============================
     สร้าง group ครั้งแรก
  ============================ */
  if (!doc.exists) {
    await docRef.set({
      type: "general",
      modules: { ...DEFAULT_MODULES }
    });
  }

  const group = (await docRef.get()).data();
  const modules = group.modules || DEFAULT_MODULES;

  /* =====================================================
     📘 เมนูหลัก
  ===================================================== */
  if (isHelpCommand(normalized)) {
    return reply(event.replyToken, buildMainMenu());
  }

  /* =====================================================
     🔎 help 1 - help 6 (รายละเอียดระบบ)
  ===================================================== */
  if (normalized.startsWith("help ")) {
    const number = normalized.replace("help ", "").trim();

    if (["1","2","3","4","5","6"].includes(number)) {
      return reply(event.replyToken, buildModuleDetail(number));
    }

    return reply(event.replyToken, "พิมพ์ help 1 - help 6 เท่านั้น");
  }

  /* =====================================================
     🔐 เซ็ต1 - เซ็ต7 (เฉพาะ ADMIN)
  ===================================================== */
  if (normalized.startsWith("เซ็ต")) {

    if (userId !== ADMIN_USER_ID) {
      return reply(event.replyToken,
        "⛔ คำสั่งนี้ใช้ได้เฉพาะผู้ดูแลระบบเท่านั้น"
      );
    }

    return handleSetCommand(normalized, docRef, event);
  }

  /* =====================================================
     📌 ROUTER ไปแต่ละ module
  ===================================================== */
  if (modules.province && await province.handle(event, group)) return;
  if (modules.hatyai && await hatyai.handle(event, group)) return;
  if (modules.reminder && await reminder.handle(event, group)) return;
  if (modules.permanentNote && await note.handle(event, group)) return;
  if (modules.serviceReport && await report.handle(event, group)) return;
  if (modules.registry && await registry.handle(event, group)) return;
}

/* =====================================================
   🔧 HANDLE เซ็ต1 - เซ็ต7
===================================================== */
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
    `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว\nพิมพ์ help ${key.replace("เซ็ต","")} เพื่อดูรายละเอียด`
  );
}

/* =====================================================
   📘 เมนูหลัก
===================================================== */
function buildMainMenu() {

  return `
🤖 Spirit AI เมนูหลัก
=================================

พิมพ์ เซ็ต1 - เซ็ต7 เพื่อเปิดระบบ (เฉพาะผู้ดูแล)

เซ็ต1️⃣  ระบบรายงานจังหวัด
แจ้งเตือนส่งสถิติ 6 จังหวัดอัตโนมัติ
ติดตามการรายงานครบถ้วนทุกสัปดาห์

เซ็ต2️⃣  ระบบสถิติหาดใหญ่
กรอก pro=20 stb=10 ได้ทันที
สรุปตัวเลขภาพรวมแบบเรียลไทม์

เซ็ต3️⃣  ระบบแจ้งเตือนล่วงหน้า
บันทึกวันงาน ระบบเตือนก่อน 3 วัน
ไม่พลาดกิจกรรมสำคัญ

เซ็ต4️⃣  ระบบบันทึกถาวร
เก็บข้อมูลลาและบันทึกสำคัญ
ค้นดูย้อนหลังได้เสมอ

เซ็ต5️⃣  ระบบรายงานการรับใช้
บันทึกสิ่งที่ทำในแต่ละสัปดาห์
สร้างวัฒนธรรมการรับใช้ร่วมกัน

เซ็ต6️⃣  ระบบทะเบียนสมาชิก
บันทึกวันเกิด + เบอร์โทร
ค้นหาตามเดือนเกิดได้ทันที

เซ็ต7️⃣  ดูสถานะระบบ
ตรวจสอบว่ากลุ่มนี้เปิดอะไรอยู่บ้าง

พิมพ์ help 1 - help 6
เพื่อดูรายละเอียดแบบเต็ม
`;
}

/* =====================================================
   📖 รายละเอียดแต่ละระบบ
===================================================== */
function buildModuleDetail(number) {

  switch (number) {

    case "1":
      return `
📊 ระบบรายงานจังหวัด

แจ้งเตือน: อา จ อ ศ เวลา 08:00
จังหวัด: สงขลา สตูล ปัตตานี ยะลา นราธิวาส พัทลุง

วิธีส่ง:
สงขลา ส่งสถิติแล้ว
`;

    case "2":
      return `
📊 ระบบสถิติหาดใหญ่

แจ้งเตือน: ทุกวันอาทิตย์ 13:00

วิธีส่ง:
pro=20
pro=20 stb=10
`;

    case "3":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า

พิมพ์:
แจ้งเตือน ค่าย 1/3/2569

ระบบจะเตือนล่วงหน้า 3 วัน เวลา 08:00
`;

    case "4":
      return `
📝 ระบบบันทึกถาวร

พิมพ์:
บันทึกลา สมาย 12/03/2026

ดูทั้งหมด:
บันทึกถาวร
`;

    case "5":
      return `
📘 ระบบรายงานการรับใช้

พิมพ์:
รายงานการรับใช้ วันนี้ไปดูแลคน

ดูรายงาน:
บันทึกรายงานการรับใช้
`;

    case "6":
      return `
👤 ระบบทะเบียนสมาชิก

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
   📊 แสดงสถานะระบบ
===================================================== */
function buildStatus(group) {

  let msg = "📊 สถานะระบบในกลุ่มนี้\n\n";

  Object.keys(group.modules).forEach(k => {
    msg += group.modules[k]
      ? `✔ ${k}\n`
      : `✖ ${k}\n`;
  });

  return msg;
}

/* =====================================================
   🧠 ตรวจสอบ help keyword
===================================================== */
function isHelpCommand(text) {
  const keywords = ["help","menu","เมนู","คำสั่ง","setup"];
  return keywords.some(k => text.includes(k));
}

module.exports = {
  handleMessage
};