const { getDB } = require("../config/firebase");
const { client } = require("../config/line");

const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");
const general = require("./modules/generalModule");

/* 🔥 เพิ่มเพื่อรองรับ callapi */
const scheduler = require("./schedulers/generalScheduler");

/* 🔥 ใช้ queue */
const queue = require("./lineQueue");

/* 🔥 STAT MODULE */
const { checkStatSheet } = require("./modules/statSheetChecker");
/* ================================= */

const TARGET_GROUP = "C8a88d6ad8fc5984939d59de795c719d6";
const STAT_GROUP = "C094d3624ddb25a8158cd5b992d58bdaa";

/* 🔧 เพิ่ม lock กัน callapi ซ้ำ */
let callApiRunning = false;
let callApiStart = 0;

/* 🔥 NEW: กัน event ซ้ำ */
const processedEvents = new Set();

function isDuplicateEvent(event) {
  const id = event.message?.id;
  if (!id) return false;

  if (processedEvents.has(id)) {
    console.log("⚠ duplicate event:", id);
    return true;
  }

  processedEvents.add(id);

  // เคลียร์ memory กัน leak
  setTimeout(() => {
    processedEvents.delete(id);
  }, 5 * 60 * 1000);

  return false;
}

const DEFAULT_MODULES = {
  reminder: false,
  permanentNote: false,
  serviceReport: false,
  registry: false,
  general: false
};

/* ===================================================== */
/* SAFE REPLY */
/* ===================================================== */

async function safeReply(event, message) {

  try {

    if (!message) return;

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: message
    });

  } catch (err) {

    console.log("⚠ reply fail → fallback push");

    const to = event?.source?.groupId || event?.source?.userId;

    if (!to) return;

    queue.push(to,{
      type:"text",
      text:message
    });

  }

}

/* ===================================================== */
/* 🔧 ป้องกัน broadcast ค้าง */
/* ===================================================== */

function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("broadcast timeout")), ms)
    )
  ]);
}

/* ===================================================== */

async function handleMessage(event) {

  try {

    if (!event || !event.message || event.message.type !== "text") return;

    /* 🔥 กัน event ซ้ำ */
    if (isDuplicateEvent(event)) return;

    const groupId = event.source?.groupId || event.source?.userId;
    if (!groupId) return;

    const text = event.message.text?.trim();
    if (!text) return;

    const normalized = text.toLowerCase();

    /* ===============================
       🔥 NEW COMMAND (ดูหน้าที่)
    ================================ */

    if (normalized === "ดูหน้าที่") {

      try {

        const msg = scheduler.buildMondayProgram();

        return safeReply(event, msg);

      } catch (err) {

        console.error("ดูหน้าที่ error", err);
        return safeReply(event, "❌ โหลดโปรแกรมไม่สำเร็จ");

      }

    }

    /* ===============================
       STAT COMMAND
    ================================ */

    if (normalized === "สถิติ") {

      const STAT_GROUPS = [TARGET_GROUP, STAT_GROUP];

      if (!STAT_GROUPS.includes(groupId)) return;

      try {

        const result = await checkStatSheet();

        let msg;

        if (!result || result.provinces.length === 0) {

          msg = "✅ วันนี้ทุกจังหวัดส่งสถิติแล้ว";

        } else {

          msg = "⚠️ จังหวัดที่ยังไม่ส่งสถิติ\n\n";

         for (const province in result.detail) {

           const owners = result.detail[province].owners;
           const dates = result.detail[province].dates;

           msg += `${province} (${owners.join(" ")})\n`;

           dates.forEach(d => {
             msg += `- ${d}\n`;
           });

           msg += "\n";

         }

        }

        return safeReply(event, msg);

      } catch (err) {

        console.error("stat command error", err);

        return safeReply(event, "❌ ตรวจสอบสถิติไม่สำเร็จ");

      }

    }

    /* =====================================================
       🔥 CALL API MANUAL TRIGGER
    ===================================================== */

    console.log("CALLAPI GROUP:", groupId);
    console.log("TARGET GROUP:", TARGET_GROUP);


    const helpMatch = normalized.match(/^help\s*([3-8])$/);

    if (helpMatch) {
      return safeReply(event, buildModuleDetail(helpMatch[1]));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(event, buildMainMenu());
    }

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

      if (command.includes("เซ็ต")) {
        return handleSetCommand(event, command, docRef);
      }
    }

    /* ===============================
       ROUTER
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

async function handleSetCommand(event, text, docRef) {

  const setMap = {
    "เซ็ต3": "reminder",
    "เซ็ต4": "permanentNote",
    "เซ็ต5": "serviceReport",
    "เซ็ต6": "registry",
    "เซ็ต7": "general",
    "เซ็ต8": "status"
  };

  const key = Object.keys(setMap).find(k => text.replace(/\s/g,"").includes(k));

  if (!key) {
    return safeReply(event, "ไม่พบคำสั่งเซ็ต");
  }

  const moduleName = setMap[key];

  if (moduleName === "status") {

    const group = (await docRef.get()).data() || {};
    return safeReply(event, buildStatus(group));

  }

  await docRef.set({
    modules: { [moduleName]: true }
  }, { merge: true });

  const updated = (await docRef.get()).data() || {};

  let msg = `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว\n\n`;
  msg += buildStatus(updated);

  return safeReply(event, msg);
}

/* ===================================================== */

function buildMainMenu() {

  return `
🤖 Spirit AI เมนูหลัก

📌 การเปิดระบบ:
Smile เซ็ต3  → เปิดระบบแจ้งเตือน
Smile เซ็ต4  → เปิดระบบบันทึกถาวร
Smile เซ็ต5  → เปิดระบบรายงานการรับใช้
Smile เซ็ต6  → เปิดระบบทะเบียนสมาชิก
Smile เซ็ต7  → เปิดระบบแจ้งเตือนทั่วไป
Smile เซ็ต8  → ดูสถานะระบบ

📖 ดูวิธีใช้งาน:
help 3 - help 8
`;

}

/* ===================================================== */

function buildModuleDetail(number) {

  switch (number) {

    case "3":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า

📌 วิธีเปิด:
Smile เซ็ต3

📌 ตัวอย่างคำสั่ง:
แจ้งเตือน ประชุมทีม 25/3/2026
ดูแจ้งเตือน
ลบแจ้งเตือน <ID>
`;

    case "4":
      return `
📝 ระบบบันทึกถาวร

📌 วิธีเปิด:
Smile เซ็ต4

📌 ตัวอย่างคำสั่ง:
บันทึก วันนี้ประชุม 18.00
ดูบันทึก
`;

    case "5":
      return `
📘 ระบบรายงานการรับใช้

📌 วิธีเปิด:
Smile เซ็ต5

📌 ตัวอย่างคำสั่ง:
รายงานการรับใช้ แจกถุงยังชีพ 20 ชุด
สรุปรายสัปดาห์
`;

    case "6":
      return `
👤 ระบบทะเบียนสมาชิก

📌 วิธีเปิด:
Smile เซ็ต6

📌 ตัวอย่างคำสั่ง:
ลงทะเบียน สมชาย ใจดี ...
คนเกิดเดือน 3
`;

    case "7":
      return `
📢 ระบบแจ้งเตือนทั่วไป

📌 วิธีเปิด:
Smile เซ็ต7

📌 เปิด/ปิดตาราง:
เปิด ศุกร์12
ปิด ศุกร์12
เปิด สถิติ8
ปิด สถิติ8

📌 ดูตาราง:
ดูตาราง
`;

    case "8":
      return `
📊 ดูสถานะระบบ

คำสั่ง:
Smile เซ็ต8
`;

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

  return ["Help","help","menu","เมนู","คำสั่ง","setup"].includes(text);

}

module.exports = { handleMessage };