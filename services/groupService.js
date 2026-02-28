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

    const text = event.message.text?.trim();
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

    /* ================= HELP ================= */
    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    if (normalized.startsWith("help ")) {
      const number = normalized.replace("help ", "").trim();
      if (["1","2","3","4","5","6"].includes(number)) {
        return safeReply(event.replyToken, buildModuleDetail(number));
      }
      return safeReply(event.replyToken, "พิมพ์ help 1 - help 6 เท่านั้น");
    }

    /* ================= ดูแจ้งเตือน ================= */
    if (normalized === "ดูแจ้งเตือน") {
      return showReminders(docRef, event);
    }

    /* ================= ดูรายงานแจ้งเตือน ================= */
    if (normalized === "ดูรายงานแจ้งเตือน") {
      return showNotificationLogs(docRef, event);
    }

    /* ================= Smile เซ็ต ================= */
    if (normalized.startsWith("smile")) {
      const command = normalized.replace("smile", "").trim();
      if (command.startsWith("เซ็ต")) {
        return handleSetCommand(command, docRef, event);
      }
    }

    /* ================= ROUTER ================= */
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

    const updated = (await docRef.get()).data() || {};

    let msg = `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว\n\n`;
    msg += buildStatus(updated);

    return safeReply(event.replyToken, msg);

  } catch (err) {
    console.error("Set Error:", err);
  }
}

/* =====================================================
   SHOW REMINDERS (แก้ปัญหาไม่ขึ้น)
===================================================== */
async function showReminders(docRef, event) {

  try {

    const snapshot = await docRef.collection("reminders").get();

    if (snapshot.empty) {
      return safeReply(event.replyToken, "📭 ไม่มีรายการแจ้งเตือนในระบบ");
    }

    let msg = "📌 รายการแจ้งเตือนที่ตั้งไว้\n\n";

    snapshot.forEach(doc => {

      const data = doc.data() || {};

      const title =
        data.title ||
        data.message ||
        data.name ||
        "ไม่ระบุหัวข้อ";

      const date =
        data.date ||
        data.rawDate ||
        "-";

      msg += `- ${title} (${date})\n`;
    });

    return safeReply(event.replyToken, msg);

  } catch (err) {
    console.error("ShowReminders Error:", err);
    return safeReply(event.replyToken, "เกิดข้อผิดพลาดในการดึงแจ้งเตือน");
  }
}

/* =====================================================
   SHOW NOTIFICATION LOGS
===================================================== */
async function showNotificationLogs(docRef, event) {

  try {

    const snapshot = await docRef.collection("notificationLogs").get();

    if (snapshot.empty) {
      return safeReply(event.replyToken, "📭 ยังไม่มีประวัติแจ้งเตือน");
    }

    let msg = "📊 รายงานแจ้งเตือน\n\n";

    snapshot.forEach(doc => {

      const data = doc.data() || {};

      const type = data.type || "-";
      const date = data.createdAt
        ? new Date(data.createdAt.seconds * 1000).toLocaleString("th-TH")
        : "-";

      msg += `- ${date} (${type})\n`;
    });

    return safeReply(event.replyToken, msg);

  } catch (err) {
    console.error("Log Error:", err);
    return safeReply(event.replyToken, "เกิดข้อผิดพลาดในการดึงรายงาน");
  }
}

/* =====================================================
   MENU
===================================================== */
function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก

Smile เซ็ต1 - เซ็ต7 เปิดระบบ
help 1 - help 6 ดูรายละเอียด

ดูแจ้งเตือน
ดูรายงานแจ้งเตือน
`;
}

/* =====================================================
   DETAIL
===================================================== */
function buildModuleDetail(number) {
  switch (number) {
    case "1": return "📊 ระบบรายงานจังหวัด";
    case "2": return "📊 ระบบสถิติหาดใหญ่";
    case "3": return "⏰ ระบบแจ้งเตือนล่วงหน้า";
    case "4": return "📝 ระบบบันทึกถาวร";
    case "5": return "📘 ระบบรายงานการรับใช้";
    case "6": return "👤 ระบบทะเบียนสมาชิก";
    default: return "ไม่พบระบบนี้";
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
