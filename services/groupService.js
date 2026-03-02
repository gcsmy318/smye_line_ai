const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");
const general = require("./modules/generalModule");

const DEFAULT_MODULES = {
  province: false,
  hatyai: false,
  reminder: false,
  permanentNote: false,
  serviceReport: false,
  registry: false,
  general: false
};

/* ===================================================== */
async function safeReply(token, message) {
  try {
    if (!token || !message) return;
    await reply(token, message);
  } catch (err) {
    console.error("Reply Error:", err.message);
  }
}

/* ===================================================== */
async function handleMessage(event) {

  try {

    if (!event || !event.message || event.message.type !== "text") return;

    const groupId = event.source?.groupId || event.source?.userId;
    if (!groupId) return;

    const text = event.message.text?.trim();
    if (!text) return;

    const normalized = text.toLowerCase();

    /* ===============================
       HELP รองรับ help7 / help 7
    ================================ */
    const helpMatch = normalized.match(/^help\s*([1-8])$/);
    if (helpMatch) {
      return safeReply(event.replyToken, buildModuleDetail(helpMatch[1]));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    /* ===============================
       ใช้ DB หลังจากนี้
    ================================ */
    const db = getDB();
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

    /* ===== SET COMMAND ===== */
    if (normalized.startsWith("smile")) {
      const command = normalized.replace("smile", "").trim();
      if (command.startsWith("เซ็ต")) {
        return handleSetCommand(command, docRef, event);
      }
    }



    if (normalized === "ดูตาราง") {
      return safeReply(event.replyToken,
        "ใช้ help 7 เพื่อดูรายละเอียดระบบแจ้งเตือนทั่วไป");
    }

    /* ===== ROUTER MODULE ===== */
    try { if (modules.province && await province.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.hatyai && await hatyai.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.reminder && await reminder.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.permanentNote && await note.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.serviceReport && await report.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.registry && await registry.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.general && await general.handle(event, group)) return; } catch(e){ console.error(e); }

  } catch (error) {
    console.error("Fatal Error:", error);
  }
}

/* ===================================================== */
async function handleSetCommand(text, docRef, event) {

  const setMap = {
    "เซ็ต1": "province",
    "เซ็ต2": "hatyai",
    "เซ็ต3": "reminder",
    "เซ็ต4": "permanentNote",
    "เซ็ต5": "serviceReport",
    "เซ็ต6": "registry",
    "เซ็ต7": "general",
    "เซ็ต8": "status"
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

  const updated = (await docRef.get()).data() || {};

  let msg = `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว\n\n`;
  msg += buildStatus(updated);

  return safeReply(event.replyToken, msg);
}

/* ===================================================== */
function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก

Smile เซ็ต1 - เซ็ต8 เปิดระบบ
help 1 - help 8 ดูรายละเอียดแต่ละระบบ
ดูแจ้งเตือน
ดูรายงานแจ้งเตือน
`;
}

/* ===================================================== */
function buildModuleDetail(number) {

  switch (number) {

    case "1":
      return `📊 ระบบรายงานจังหวัด
คำสั่ง:
สงขลา ส่งสถิติแล้ว
สตูล ส่งสถิติแล้ว`;

    case "2":
      return `📊 ระบบสถิติหาดใหญ่
คำสั่ง:
หาดใหญ่ 120 คน
เด็ก 30 คน`;

    case "3":
      return `⏰ ระบบแจ้งเตือนล่วงหน้า
คำสั่ง:
เตือน ประชุมทีม 25/03/2026
ดูแจ้งเตือน`;

    case "4":
      return `📝 ระบบบันทึกถาวร
คำสั่ง:
บันทึก วันนี้ประชุม 18.00
ดูบันทึก`;

    case "5":
      return `📘 ระบบรายงานการรับใช้
คำสั่ง:
รายงานการรับใช้ แจกถุงยังชีพ 20 ชุด
สรุปรายสัปดาห์`;

    case "6":
      return `👤 ระบบทะเบียนสมาชิก
คำสั่ง:
ลงทะเบียน สมชาย ใจดี`;

    case "7":
      return `📢 ระบบแจ้งเตือนทั่วไป (General)

แจ้งเตือนอัตโนมัติ:
ศุกร์ 12.00 ซ้อมนมัสการ
อาทิตย์ 09.00 Hope Channel
อาทิตย์ 11.30 เพลงตอบสนอง
จันทร์ 12.00 โปรแกรมวันอาทิตย์
ศุกร์/เสาร์ 08.00 นัดประชุม
เสาร์ 15.00 ชั้นสร้าง

คำสั่ง:
ดูตาราง
เปิด fri12
ปิด fri12`;

    case "8":
      return `📊 ดูสถานะระบบ
คำสั่ง:
Smile เซ็ต8`;

    default:
      return "ไม่พบระบบนี้";
  }
}

/* ===================================================== */
function buildStatus(group) {
  let msg = "📊 สถานะระบบ\n\n";
  const modules = group.modules || {};
  Object.keys(DEFAULT_MODULES).forEach(k => {
    msg += modules[k] ? `✔ ${k}\n` : `✖ ${k}\n`;
  });
  return msg;
}

function isHelpCommand(text) {
  return ["help","menu","เมนู","คำสั่ง","setup"].includes(text);
}

module.exports = { handleMessage };