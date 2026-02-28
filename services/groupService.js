const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

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

/* ================================
   ENTRY POINT
================================ */
async function handleMessage(event) {
  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;
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

  /* ============================
     HELP MENU (แบบตัวเลข)
  ============================ */
  if (isHelpCommand(normalized)) {
    return reply(event.replyToken, buildMainMenu(group));
  }

  /* ============================
     เลือกเมนูด้วยตัวเลข
  ============================ */
  if (["1","2","3","4","5","6","7"].includes(normalized)) {
    return handleNumberMenu(normalized, docRef, event);
  }

  /* ============================
     HELP DETAIL
  ============================ */
  if (normalized.startsWith("help ")) {
    const moduleName = normalized.replace("help ", "").trim();
    return reply(event.replyToken, buildModuleDetail(moduleName));
  }

  /* ============================
     STATUS
  ============================ */
  if (normalized === "สถานะ" || normalized === "status") {
    return reply(event.replyToken, buildStatus(group));
  }

  /* ============================
     ROUTER
  ============================ */
  if (modules.province && await province.handle(event, group)) return;
  if (modules.hatyai && await hatyai.handle(event, group)) return;
  if (modules.reminder && await reminder.handle(event, group)) return;
  if (modules.permanentNote && await note.handle(event, group)) return;
  if (modules.serviceReport && await report.handle(event, group)) return;
  if (modules.registry && await registry.handle(event, group)) return;
}

/* ================================
   MENU HANDLER (ตัวเลข)
================================ */
async function handleNumberMenu(number, docRef, event) {

  const map = {
    "1": "province",
    "2": "hatyai",
    "3": "reminder",
    "4": "permanentNote",
    "5": "serviceReport",
    "6": "registry",
    "7": "status"
  };

  const moduleName = map[number];

  if (moduleName === "status") {
    const group = (await docRef.get()).data();
    return reply(event.replyToken, buildStatus(group));
  }

  await docRef.set({
    modules: { [moduleName]: true }
  }, { merge: true });

  return reply(event.replyToken,
    `✅ เปิดระบบ ${moduleName} แล้ว\nพิมพ์ help ${moduleName} เพื่อดูวิธีใช้แบบละเอียด`
  );
}

/* ================================
   MAIN MENU
================================ */
function buildMainMenu(group) {
  return `
🤖 Spirit AI เมนูหลัก

พิมพ์เลขเพื่อเปิดระบบ:

1️⃣ ระบบรายงานจังหวัด
   ➜ แจ้งเตือนส่งสถิติ 6 จังหวัด

2️⃣ ระบบสถิติหาดใหญ่
   ➜ รายงาน pro=20 stb=10

3️⃣ ระบบแจ้งเตือนล่วงหน้า
   ➜ เตือนก่อนงาน 3 วัน

4️⃣ ระบบบันทึกถาวร
   ➜ เก็บข้อมูลลา / บันทึกสำคัญ

5️⃣ ระบบรายงานการรับใช้
   ➜ บันทึกสิ่งที่ทำในแต่ละสัปดาห์

6️⃣ ระบบทะเบียนสมาชิก
   ➜ บันทึกวันเกิด + เบอร์โทร

7️⃣ ดูสถานะระบบ

พิมพ์ help province
เพื่อดูรายละเอียดแบบเต็ม
`;
}

/* ================================
   DETAIL HELP
================================ */
function buildModuleDetail(moduleName) {
  switch (moduleName) {
    case "province":
      return `
📊 ระบบรายงานจังหวัด (ละเอียด)

แจ้งเตือน:
อา จ อ ศ เวลา 08:00

จังหวัด:
สงขลา สตูล ปัตตานี ยะลา นราธิวาส พัทลุง

วิธีส่ง:
สงขลา ส่งสถิติแล้ว
`;

    case "hatyai":
      return `
📊 ระบบสถิติหาดใหญ่ (ละเอียด)

แจ้งเตือน:
ทุกวันอาทิตย์ 13:00

วิธีส่ง:
pro=20
pro=20 stb=10
`;

    case "reminder":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า

พิมพ์:
แจ้งเตือน ค่าย 1/3/2569

ระบบจะแจ้งเตือนล่วงหน้า 3 วัน
`;

    case "permanentNote":
      return `
📝 ระบบบันทึกถาวร

พิมพ์:
บันทึกลา สมาย 12/03/2026

ดูทั้งหมด:
บันทึกถาวร
`;

    case "serviceReport":
      return `
📘 ระบบรายงานการรับใช้

พิมพ์:
รายงานการรับใช้ วันนี้ไปดูแลคน

ดูรายงาน:
บันทึกรายงานการรับใช้
`;

    case "registry":
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

/* ================================
   STATUS
================================ */
function buildStatus(group) {
  let msg = "📊 สถานะกลุ่มนี้\n\n";
  Object.keys(group.modules).forEach(k => {
    msg += group.modules[k]
      ? `✔ ${k}\n`
      : `✖ ${k}\n`;
  });
  return msg;
}

/* ================================
   UTIL
================================ */
function isHelpCommand(text) {
  const keywords = [
    "help",
    "menu",
    "เมนู",
    "คำสั่ง",
    "setup"
  ];
  return keywords.some(k => text.includes(k));
}

module.exports = {
  handleMessage
};