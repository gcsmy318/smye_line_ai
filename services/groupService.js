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

/* ========================================
   ENTRY POINT
======================================== */
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

  /* ===============================
     HELP / MENU
  ================================ */
  if (isHelpCommand(normalized)) {
    return reply(event.replyToken, buildMainHelp(group));
  }

  if (normalized.startsWith("help ")) {
    const moduleName = normalized.replace("help ", "").trim();
    return reply(event.replyToken, buildModuleHelp(moduleName));
  }

  /* ===============================
     STATUS
  ================================ */
  if (normalized === "สถานะ" || normalized === "status") {
    return reply(event.replyToken, buildStatus(group));
  }

  /* ===============================
     SETUP TYPE
  ================================ */
  if (normalized.startsWith("ตั้งค่า type ")) {
    const type = normalized.replace("ตั้งค่า type ", "").trim();
    await docRef.set({ type }, { merge: true });
    return reply(event.replyToken, `ตั้งค่าประเภทกลุ่มเป็น ${type} แล้ว`);
  }

  /* ===============================
     ENABLE MODULE
  ================================ */
  if (normalized.startsWith("เปิด ")) {
    const moduleName = normalized.replace("เปิด ", "").trim();
    if (!DEFAULT_MODULES.hasOwnProperty(moduleName)) {
      return reply(event.replyToken, "ไม่พบชื่อระบบนี้");
    }

    await docRef.set({
      modules: { [moduleName]: true }
    }, { merge: true });

    return reply(event.replyToken, `เปิดระบบ ${moduleName} แล้ว`);
  }

  /* ===============================
     DISABLE MODULE
  ================================ */
  if (normalized.startsWith("ปิด ")) {
    const moduleName = normalized.replace("ปิด ", "").trim();
    if (!DEFAULT_MODULES.hasOwnProperty(moduleName)) {
      return reply(event.replyToken, "ไม่พบชื่อระบบนี้");
    }

    await docRef.set({
      modules: { [moduleName]: false }
    }, { merge: true });

    return reply(event.replyToken, `ปิดระบบ ${moduleName} แล้ว`);
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
   JOIN EVENT
======================================== */
async function handleJoin(event) {
  const groupId = event.source.groupId;
  const db = getDB();

  await db.collection("groups").doc(groupId).set({
    type: "general",
    modules: DEFAULT_MODULES
  });

  return reply(event.replyToken, `
🤖 Spirit AI พร้อมใช้งานแล้ว

ขั้นตอนการตั้งค่า:

1️⃣ พิมพ์ help
2️⃣ เปิดระบบ เช่น:
   เปิด province
   เปิด hatyai
3️⃣ พิมพ์ สถานะ เพื่อตรวจสอบ
`);
}

/* ========================================
   HELP BUILDERS
======================================== */

function buildMainHelp(group) {
  let msg = "🤖 Spirit AI เมนูหลัก\n";
  msg += "============================\n\n";

  msg += "📌 คำสั่งพื้นฐาน\n";
  msg += "- help / เมนู / คำสั่ง\n";
  msg += "- สถานะ\n";
  msg += "- เปิด province\n";
  msg += "- ปิด province\n\n";

  msg += "📘 ระบบที่เปิดใช้งาน:\n";

  Object.keys(group.modules).forEach(k => {
    msg += group.modules[k]
      ? `✔ ${k}\n`
      : `✖ ${k}\n`;
  });

  msg += "\nพิมพ์ help ชื่อระบบ เช่น:\n";
  msg += "help province\n";

  return msg;
}

function buildModuleHelp(moduleName) {
  switch (moduleName) {
    case "province":
      return `
📊 ระบบรายงานจังหวัด
พิมพ์:
สงขลา ส่งสถิติแล้ว

แจ้งเตือน:
อา จ อ ศ 08:00
`;

    case "hatyai":
      return `
📊 ระบบสถิติหาดใหญ่
พิมพ์:
pro=20 stb=10

แจ้งเตือน:
อาทิตย์ 13:00
`;

    case "reminder":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า
พิมพ์:
แจ้งเตือน ค่าย 1/3/2569
`;

    case "permanentNote":
      return `
📝 ระบบบันทึกถาวร
พิมพ์:
บันทึกลา สมาย 12/03/2026
`;

    case "serviceReport":
      return `
📘 ระบบรายงานการรับใช้
พิมพ์:
รายงานการรับใช้ วันนี้ไปดูแลคน
`;

    case "registry":
      return `
👤 ระบบทะเบียนสมาชิก
พิมพ์:
ลงทะเบียน สมาย 19/10/1993 เบอร์โทร...
`;

    default:
      return "ไม่พบระบบนี้";
  }
}

function buildStatus(group) {
  let msg = "📊 สถานะกลุ่มนี้\n";
  msg += `ประเภท: ${group.type}\n\n`;
  msg += "ระบบที่เปิดใช้งาน:\n";

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
  const keywords = [
    "help",
    "menu",
    "เมนู",
    "คำสั่ง",
    "คู่มือ",
    "วิธีใช้",
    "ช่วย",
    "setup",
    "ตั้งค่า"
  ];

  return keywords.some(k => text.includes(k));
}

module.exports = {
  handleMessage,
  handleJoin
};