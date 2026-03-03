const { getDB } = require("../config/firebase");
const { client } = require("../config/line");


const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");
const general = require("./modules/generalModule");

/* ===================================================== */

const TARGET_GROUP = "C8a88d6ad8fc5984939d59de795c719d6";

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
/* 🔥 PUSH + LOG (console อย่างเดียว) */
/* ===================================================== */

async function safeReply(message) {
  try {

    if (!message) return;

    await client.pushMessage(TARGET_GROUP, {
      type: "text",
      text: message
    });

    console.log("📤 Sent to:", TARGET_GROUP);
    console.log("📝 Message:", message);

  } catch (err) {
    console.error("Push Error:", err.message);
  }
}

/* ===================================================== */
/* ENTRY POINT */
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
       🔥 เรียกแจ้งเตือนที่อาจพลาด (เฉพาะกลุ่มนี้เท่านั้น)
    ================================ */

    if (
      groupId === TARGET_GROUP &&
      normalized === "เรียกแจ้งเตือน"
    ) {
      try {
        if (typeof reminder.runMissedReminder === "function") {
          await reminder.runMissedReminder(groupId);
          return safeReply("✅ ระบบตรวจสอบแจ้งเตือนที่อาจพลาดไปแล้ว");
        } else {
          return safeReply("⚠️ ระบบยังไม่รองรับฟังก์ชัน runMissedReminder");
        }
      } catch (err) {
        console.error(err);
        return safeReply("❌ เกิดข้อผิดพลาดในการเรียกแจ้งเตือน");
      }
    }

    /* ===============================
       HELP
    ================================ */

    const helpMatch = normalized.match(/^help\s*([1-8])$/);
    if (helpMatch) {
      return safeReply(buildModuleDetail(helpMatch[1], groupId));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(buildMainMenu());
    }

    /* ===============================
       DB
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

    /* ===============================
       SET COMMAND
    ================================ */

    if (normalized.startsWith("smile")) {

      const command = normalized.replace("smile", "").trim();

      if (command.startsWith("เซ็ต")) {
        return handleSetCommand(command, docRef);
      }
    }

    /* ===============================
       ROUTER MODULE (เหมือนเดิม)
    ================================ */


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
/* HANDLE SET */
/* ===================================================== */

async function handleSetCommand(text, docRef) {

  const setMap = {
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
    return safeReply(buildStatus(group));
  }

  await docRef.set({
    modules: { [moduleName]: true }
  }, { merge: true });

  const updated = (await docRef.get()).data() || {};

  let msg = `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว\n\n`;
  msg += buildStatus(updated);

  return safeReply(msg);
}

/* ===================================================== */
/* MENU */
/* ===================================================== */

function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก

Smile เซ็ต1 - เซ็ต8 เปิดระบบ
help 1 - help 8 ดูรายละเอียด
`;
}

/* ===================================================== */
/* HELP DETAIL */
/* ===================================================== */

function buildModuleDetail(number, groupId) {

  switch (number) {

    case "3":

      if (groupId === TARGET_GROUP) {
        return `
⏰ ระบบแจ้งเตือนล่วงหน้า

พิมพ์:
แจ้งเตือน ประชุมทีม 25/3/2026

รองรับรูปแบบวันที่:
1/3/2026
01/03/2026
1/3/2569

คำสั่ง:
ดูแจ้งเตือน
ดูแจ้งเตือนที่ผ่านไปแล้ว
ลบแจ้งเตือน <ID>

🔥 คำสั่งพิเศษ (เฉพาะกลุ่มนี้):
พิมพ์:
เรียกแจ้งเตือน

ใช้สำหรับให้ระบบตรวจสอบแจ้งเตือนที่อาจพลาดไปทันที
กรณี cron ไม่ทำงานหรือ server รีสตาร์ท

`;
      }

      return `
⏰ ระบบแจ้งเตือนล่วงหน้า

พิมพ์:
แจ้งเตือน ประชุมทีม 25/3/2026

รองรับรูปแบบวันที่:
1/3/2026
01/03/2026
1/3/2569

คำสั่ง:
ดูแจ้งเตือน
ดูแจ้งเตือนที่ผ่านไปแล้ว
ลบแจ้งเตือน <ID>
`;

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
      return `📢 ระบบแจ้งเตือนทั่วไป

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
/* STATUS */
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