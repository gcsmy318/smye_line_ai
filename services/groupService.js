const { getDB } = require("../config/firebase");
const { reply, getProfile } = require("../config/line");

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
   SAFE REPLY (กัน error ตอน reply)
===================================================== */
async function safeReply(token, message) {
  try {
    if (!token) return;
    await reply(token, message);
  } catch (err) {
    console.error("Reply Error:", err.message);
  }
}

/* =====================================================
   ENTRY POINT (SAFE)
===================================================== */
async function handleMessage(event) {

  try {

    // กัน event พัง
    if (!event || !event.message || event.message.type !== "text") {
      return;
    }

    const db = getDB();
    const groupId = event.source?.groupId || event.source?.userId;
    const userId = event.source?.userId;

    if (!groupId || !userId) return;

    const text = event.message.text?.trim();
    if (!text) return;

    const normalized = text.toLowerCase();

    const docRef = db.collection("groups").doc(groupId);
    const doc = await docRef.get();

    // สร้าง group ครั้งแรก
    if (!doc.exists) {
      await docRef.set({
        type: "general",
        modules: { ...DEFAULT_MODULES }
      });
    }

    const group = (await docRef.get()).data() || {};
    const modules = group.modules || DEFAULT_MODULES;

    /* ===============================
       HELP MENU
    ================================ */
    if (isHelpCommand(normalized)) {
      return safeReply(event.replyToken, buildMainMenu());
    }

    /* ===============================
       HELP DETAIL
    ================================ */
    if (normalized.startsWith("help ")) {

      const number = normalized.replace("help ", "").trim();

      if (["1","2","3","4","5","6"].includes(number)) {
        return safeReply(event.replyToken, buildModuleDetail(number));
      }

      return safeReply(event.replyToken, "พิมพ์ help 1 - help 6 เท่านั้น");
    }

    /* ===============================
       เซ็ต1 - เซ็ต7 (เฉพาะชื่อ Smile)
    ================================ */
    if (normalized.startsWith("เซ็ต")) {

      try {

        const profile = await getProfile(userId);
        const displayName = (profile?.displayName || "").trim().toLowerCase();

        if (displayName !== "smile") {
          return safeReply(
            event.replyToken,
            "⛔ คำสั่งนี้ใช้ได้เฉพาะผู้ดูแล Smile เท่านั้น"
          );
        }

        return handleSetCommand(normalized, docRef, event);

      } catch (err) {
        console.error("Admin Check Error:", err);
        return safeReply(
          event.replyToken,
          "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์"
        );
      }
    }

    /* ===============================
       ROUTER (กัน module แตก)
    ================================ */
    try { if (modules.province && await province.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.hatyai && await hatyai.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.reminder && await reminder.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.permanentNote && await note.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.serviceReport && await report.handle(event, group)) return; } catch(e){ console.error(e); }
    try { if (modules.registry && await registry.handle(event, group)) return; } catch(e){ console.error(e); }

  } catch (error) {
    console.error("Fatal Error in handleMessage:", error);
  }
}

/* =====================================================
   HANDLE SET COMMAND
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

    return safeReply(
      event.replyToken,
      `✅ เปิดระบบ ${moduleName} เรียบร้อยแล้ว`
    );

  } catch (err) {
    console.error("SetCommand Error:", err);
  }
}

/* =====================================================
   MENU
===================================================== */
function buildMainMenu() {
  return `
🤖 Spirit AI เมนูหลัก
=================================

พิมพ์ เซ็ต1 - เซ็ต7 เพื่อเปิดระบบ (เฉพาะผู้ดูแล Smile)

เซ็ต1️⃣  ระบบรายงานจังหวัด
แจ้งเตือนส่งสถิติ 6 จังหวัด
ติดตามครบทุกสัปดาห์

เซ็ต2️⃣  ระบบสถิติหาดใหญ่
กรอก pro=20 stb=10 ได้ทันที
สรุปผลแบบเรียลไทม์

เซ็ต3️⃣  ระบบแจ้งเตือนล่วงหน้า
เตือนก่อนงาน 3 วัน
ไม่พลาดกิจกรรมสำคัญ

เซ็ต4️⃣  ระบบบันทึกถาวร
เก็บข้อมูลลาและบันทึกสำคัญ
ดูย้อนหลังได้เสมอ

เซ็ต5️⃣  ระบบรายงานการรับใช้
บันทึกสิ่งที่ทำรายสัปดาห์
สร้างวัฒนธรรมการรับใช้

เซ็ต6️⃣  ระบบทะเบียนสมาชิก
บันทึกวันเกิดและเบอร์โทร
ค้นหาตามเดือนเกิดได้

เซ็ต7️⃣  ดูสถานะระบบ

พิมพ์ help 1 - help 6
`;
}

/* =====================================================
   DETAIL
===================================================== */
function buildModuleDetail(number) {
  switch (number) {
    case "1": return "📊 ระบบรายงานจังหวัด\nแจ้งเตือน 08:00 อา จ อ ศ";
    case "2": return "📊 ระบบสถิติหาดใหญ่\nแจ้งเตือน อาทิตย์ 13:00";
    case "3": return "⏰ ระบบแจ้งเตือนล่วงหน้า\nเตือนก่อนงาน 3 วัน";
    case "4": return "📝 ระบบบันทึกถาวร\nบันทึกลาและข้อมูลสำคัญ";
    case "5": return "📘 ระบบรายงานการรับใช้\nบันทึกสิ่งที่ทำรายสัปดาห์";
    case "6": return "👤 ระบบทะเบียนสมาชิก\nบันทึกวันเกิดและเบอร์โทร";
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