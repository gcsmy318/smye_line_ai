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

    /* ===== HELP (ไม่ใช้ DB) ===== */
    const helpMatch = normalized.match(/^help\s*([1-8])$/);
    if (helpMatch) {
      return safeReply(event.replyToken, buildModuleDetail(helpMatch[1]));
    }

    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    /* ===== หลังจากนี้ใช้ DB ===== */
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


  /* ===== 3️⃣ สรุปรายสัปดาห์ ===== */
  if (text === "สรุปรายสัปดาห์") {

    const doc = await docRef.get();
    const reports = doc.exists ? doc.data().reports || [] : [];

    let msg = `📊 สรุปรายสัปดาห์\n`;
    msg += `ช่วงวันที่ ${formatWeekRange()}\n`;
    msg += "---------------------------------\n";

    if (reports.length === 0) {
      msg += "ยังไม่มีรายงานในสัปดาห์นี้\n";
    } else {

      msg += `รวมทั้งหมด ${reports.length} รายการ\n\n`;

      reports.forEach((r, index) => {
        const date = new Date(
          r.createdAt.seconds
            ? r.createdAt.seconds * 1000
            : r.createdAt
        );

        msg += `${index + 1}. ${date.toLocaleDateString("th-TH")} - ${r.content}\n`;
      });
    }

    msg += "---------------------------------";

    return reply(event.replyToken, msg);
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
`;
}

function buildModuleDetail(number) {

  switch (number) {

    case "1":
      return `
📊 ระบบรายงานจังหวัด (Province Module)

ใช้สำหรับแจ้งเตือนให้ส่งสถิติ และบันทึกสถานะจังหวัด

🔹 แจ้งเตือนอัตโนมัติ:
- วันอาทิตย์
- วันจันทร์
- วันอังคาร
- วันศุกร์
เวลา 08.00 น.

🔹 คำสั่งใช้งาน:
สงขลา ส่งสถิติแล้ว
สตูล ส่งสถิติแล้ว

🔹 ตัวอย่าง:
สงขลา ส่งสถิติแล้ว

ระบบจะตอบกลับและทำเครื่องหมายว่า
- สงขลา (ส่งสถิติแล้ว)
`;

    case "2":
      return `
📊 ระบบสถิติหาดใหญ่ (Hatyai Module)

ใช้บันทึกและสรุปสถิติของพื้นที่หาดใหญ่

🔹 ตัวอย่างคำสั่ง:
หาดใหญ่ 120 คน
เด็ก 30 คน

🔹 ระบบสามารถสรุปผลรายสัปดาห์ได้
`;

    case "3":
      return `
⏰ ระบบแจ้งเตือนล่วงหน้า (Reminder Module)

ใช้ตั้งแจ้งเตือนกิจกรรมล่วงหน้า 3 วัน และวันจริง

🔹 ตัวอย่างคำสั่ง:
เตือน ประชุมทีม 25/03/2026
เตือน ค่ายเยาวชน 01/04/2026

🔹 ระบบจะ:
- แจ้งล่วงหน้า 3 วัน เวลา 07.00
- แจ้งวันจริง เวลา 07.00

🔹 คำสั่งดูรายการ:
ดูแจ้งเตือน
`;

    case "4":
      return `
📝 ระบบบันทึกถาวร (Permanent Note Module)

ใช้เก็บข้อความสำคัญไว้ดูย้อนหลังได้

🔹 ตัวอย่างคำสั่ง:
บันทึก วันนี้ประชุมทีมเวลา 18.00
บันทึก เป้าหมายปีนี้ 200 คน

🔹 คำสั่งดูย้อนหลัง:
ดูบันทึก
`;

    case "5":
      return `
📘 ระบบรายงานการรับใช้ (Service Report Module)

ใช้บันทึกรายงานการรับใช้รายสัปดาห์

🔹 ตัวอย่างคำสั่ง:
รายงาน วันนี้ออกเยี่ยม 5 หลังคา
รายงาน แจกถุงยังชีพ 20 ชุด

🔹 คำสั่งสรุป:
สรุปรายสัปดาห์
`;

    case "6":
      return `
👤 ระบบทะเบียนสมาชิก (Registry Module)

ใช้ลงทะเบียนสมาชิกหรือผู้ร่วมกิจกรรม

🔹 ตัวอย่างคำสั่ง:
ลงทะเบียน สมชาย ใจดี
ลงทะเบียน นางสาวพรทิพย์

🔹 ระบบจะบันทึกข้อมูลลงฐานข้อมูล
`;

    case "7":
      return `
📢 ระบบแจ้งเตือนทั่วไป (General Scheduler)

ระบบแจ้งเตือนอัตโนมัติตามตาราง

🔹 ตัวอย่างแจ้งเตือน:
- ศุกร์ 12.00 ซ้อมนมัสการ
- อาทิตย์ 09.00 แจ้ง hope channel
- จันทร์ 12.00 โปรแกรมวันอาทิตย์

🔹 คำสั่งเปิด/ปิดบางรายการ:
เปิด ศุกร์12
ปิด ศุกร์12
ดูตาราง
`;

    case "8":
      return `
📊 ดูสถานะระบบ

ใช้ตรวจสอบว่าในกลุ่มเปิดระบบอะไรอยู่บ้าง

🔹 ตัวอย่างคำสั่ง:
Smile เซ็ต8

ระบบจะแสดง:
✔ province
✔ reminder
✖ registry
`;

    default:
      return "ไม่พบระบบนี้";
  }
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