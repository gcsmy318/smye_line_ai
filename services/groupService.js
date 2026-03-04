const { getDB } = require("../config/firebase");
const { client } = require("../config/line");

const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");
const general = require("./modules/generalModule");

/* 🔥 เพิ่มเพื่อรองรับ callapi */
const scheduler = require("./schedulers/generalScheduler");
/* ================================= */

const TARGET_GROUP = "C8a88d6ad8fc5984939d59de795c719d6";

/* 🔧 เพิ่ม lock กัน callapi ซ้ำ */
let callApiRunning = false;
let callApiStart = 0;

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

    try {

      await client.pushMessage(TARGET_GROUP, {
        type: "text",
        text: message
      });

      await new Promise(r => setTimeout(r, 200));

    } catch (pushErr) {

      console.error("Push Error:", pushErr.message);

    }
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

    /* =====================================================
       🔥 CALL API MANUAL TRIGGER
    ===================================================== */

    console.log("CALLAPI GROUP:", groupId);
    console.log("TARGET GROUP:", TARGET_GROUP);

    if (normalized === "callapi") {

      if (groupId !== TARGET_GROUP) {
        console.log("❌ not master group");
        return;
      }

      const now = Date.now();

      /* 🔧 reset lock ถ้า process restart */
      if (!callApiStart) {
        callApiRunning = false;
      }

      /* 🔧 ถ้าเกิน 3 นาที ปลด lock */
      if (callApiRunning && now - callApiStart > 180000) {
        console.log("⚠ force reset callapi lock");
        callApiRunning = false;
      }

      if (callApiRunning) {
        console.log("⚠ callapi already running");
        return safeReply(event, "⏳ ระบบกำลังส่งอยู่ รอสักครู่");
      }

      callApiRunning = true;
      callApiStart = now;

      try {

        console.log("📞 Manual callapi triggered");

        const wait = ms => new Promise(r => setTimeout(r, ms));

        console.log("📞 Manual callapi buildFriday12");
        await scheduler.broadcast(scheduler.buildFriday12(), "fri12");
        await wait(1000);

        console.log("📞 Manual callapi buildSunday9");
        await scheduler.broadcast(scheduler.buildSunday9(), "sun9");
        await wait(1000);

        console.log("📞 Manual callapi buildSunday1130");
        await scheduler.broadcast(scheduler.buildSunday1130(), "sun1130");
        await wait(1000);

        console.log("📞 Manual callapi buildMondayProgram");
        await scheduler.broadcast(scheduler.buildMondayProgram(), "mon12");
        await wait(1000);

        console.log("📞 Manual callapi buildSaturday15");
        await scheduler.broadcast(scheduler.buildSaturday15(), "sat15");
        await wait(1000);

        console.log("📞 Manual callapi buildMorningStats");
        await scheduler.broadcast(scheduler.buildMorningStats(), "stats8");
        await wait(1000);

        console.log("📞 Manual callapi handleReminders");
        await reminder.handleReminders();

        console.log("✅ CALLAPI DONE");

        return safeReply(event, "✅ เรียก scheduler ทั้งหมดเรียบร้อยแล้ว");

      } finally {

        /* 🔧 reset lock */
        callApiRunning = false;

      }
    }

    /* ===============================
       HELP
    ================================ */

    const helpMatch = normalized.match(/^help\s*([3-8])$/);

    if (helpMatch) {
      return safeReply(event, buildModuleDetail(helpMatch[1]));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(event, buildMainMenu());
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

      const command = text.replace(/smile/i, "").trim();

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

  const key = Object.keys(setMap).find(k => text.includes(k));

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

  return ["help","menu","เมนู","คำสั่ง","setup"].includes(text);

}

module.exports = { handleMessage };