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

    /* ===== HELP ===== */
    const helpMatch = normalized.match(/^help\s*([1-8])$/);
    if (helpMatch) {
      return safeReply(event.replyToken, buildModuleDetail(helpMatch[1]));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    /* ===== ใช้ DB หลังจากนี้ ===== */
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

    /* ===== ดูแจ้งเตือน ===== */
    if (normalized === "ดูแจ้งเตือน") {
      return showReminders(db, groupId, event);
    }

    if (normalized === "ดูรายงานแจ้งเตือน") {
      return showNotificationLogs(db, groupId, event);
    }

    /* =====================================================
       🔥 ดูตาราง (GENERAL SCHEDULE)
    ===================================================== */
    if (normalized === "ดูตาราง") {

      const groupData = (await docRef.get()).data() || {};
      const settings = groupData.generalSettings || {};

      let msg = "📢 ตารางแจ้งเตือนทั่วไป\n\n";

      const scheduleList = {
        fri12: "ศุกร์ 12.00 ซ้อมนมัสการ",
        sun9: "อาทิตย์ 09.00 Hope Channel",
        sun1130: "อาทิตย์ 11.30 เพลงตอบสนอง",
        mon12: "จันทร์ 12.00 โปรแกรมวันอาทิตย์",
        fri8: "ศุกร์/เสาร์ 08.00 นัดประชุม",
        sat15: "เสาร์ 15.00 ชั้นสร้าง"
      };

      Object.keys(scheduleList).forEach(key => {
        const status = settings[key] === false ? "❌ ปิด" : "✔ เปิด";
        msg += `${status} - ${scheduleList[key]}\n`;
      });

      return safeReply(event.replyToken, msg);
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

  try {

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

  } catch (err) {
    console.error("Set Error:", err);
  }
}

/* ===================================================== */
async function showReminders(db, groupId, event) {

  const snapshot = await db
    .collection("reminders")
    .where("groupId", "==", groupId)
    .get();

  if (snapshot.empty) {
    return safeReply(event.replyToken, "📭 ไม่มีรายการแจ้งเตือนสำหรับกลุ่มนี้");
  }

  let msg = "📌 รายการแจ้งเตือน\n\n";

  snapshot.forEach(doc => {
    const data = doc.data();
    msg += `- ${data.title || "-"}\n`;
  });

  return safeReply(event.replyToken, msg);
}

/* ===================================================== */
async function showNotificationLogs(db, groupId, event) {

  const snapshot = await db
    .collection("notificationLogs")
    .where("groupId", "==", groupId)
    .get();

  if (snapshot.empty) {
    return safeReply(event.replyToken, "📭 ยังไม่มีประวัติแจ้งเตือน");
  }

  let msg = "📊 รายงานแจ้งเตือน\n\n";

  snapshot.forEach(doc => {
    const data = doc.data();
    msg += `- ${data.type || "-"}\n`;
  });

  return safeReply(event.replyToken, msg);
}

/* ===================================================== */
function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก

Smile เซ็ต1 - เซ็ต8 เปิดระบบ
help 1 - help 8 ดูรายละเอียด
ดูแจ้งเตือน
ดูรายงานแจ้งเตือน
ดูตาราง
`;
}

function buildModuleDetail(number) {
  return "ใช้ help 1-8 เพื่อดูรายละเอียดแต่ละระบบ";
}

function buildStatus(group) {
  let msg = "📊 สถานะระบบ\n\n";
  const modules = group.modules || {};
  Object.keys(DEFAULT_MODULES).forEach(k => {
    msg += modules[k] ? `✔ ${k}\n` : `✖ ${k}\n`;
  });
  return msg;
}

function isHelpCommand(text) {
  if (text === "help") return true;
  const keywords = ["menu","เมนู","คำสั่ง","setup"];
  return keywords.includes(text);
}

module.exports = { handleMessage };