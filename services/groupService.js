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
/* 🔒 MASTER LOCK (กันเรียกซ้ำ) */
/* ===================================================== */

let masterRecallLock = false;

/* ===================================================== */
/* 🔥 PUSH + LOG */
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
/* 🔥 MASTER RECALL */
/* ===================================================== */

async function runMasterRecall() {

  if (masterRecallLock) {
    console.log("⚠️ Master Recall skipped (already running)");
    return false;
  }

  masterRecallLock = true;

  try {

    console.log("🚀 Master Recall Started");

    if (typeof reminder.runMissedReminderAllGroups === "function") {
      await reminder.runMissedReminderAllGroups();
    }

    if (typeof general.runMissedGeneralAllGroups === "function") {
      await general.runMissedGeneralAllGroups();
    }

    console.log("✅ Master Recall Completed");

    return true;

  } catch (err) {
    console.error("Master Recall Error:", err);
    return false;
  }

  finally {
    setTimeout(() => {
      masterRecallLock = false;
      console.log("🔓 Master Recall Unlock");
    }, 60000); // กันยิงซ้ำ 1 นาที
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
       🔥 เรียกแจ้งเตือน Master
    ================================ */

    if (
      groupId === TARGET_GROUP &&
      normalized === "เรียกแจ้งเตือน"
    ) {
      try {

        const success = await runMasterRecall();

        if (success) {
          return safeReply(
            "✅ เรียกแจ้งเตือนครบ (วันนี้ + ย้อนหลัง + ล่วงหน้า 3 วัน) ทุกกลุ่มเรียบร้อยแล้ว"
          );
        }

        return safeReply("⚠️ ระบบกำลังทำงานอยู่ กรุณารอสักครู่");

      } catch (err) {
        console.error(err);
        return safeReply("❌ เกิดข้อผิดพลาดในการเรียก Master Recall");
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