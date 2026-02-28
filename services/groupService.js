
const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const province = require("./modules/provinceModule");
const hatyai = require("./modules/hatyaiModule");
const reminder = require("./modules/reminderModule");
const note = require("./modules/permanentNoteModule");
const report = require("./modules/serviceReportModule");
const registry = require("./modules/registryModule");

async function handleMessage(event) {
  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;
  const text = event.message.text.trim();

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      modules: {
        province: true,
        hatyai: true,
        reminder: true,
        permanentNote: true,
        serviceReport: true,
        registry: true
      }
    });
  }

  const group = (await docRef.get()).data();

  if (await province.handle(event, group)) return;
  if (await hatyai.handle(event, group)) return;
  if (await reminder.handle(event, group)) return;
  if (await note.handle(event, group)) return;
  if (await report.handle(event, group)) return;
  if (await registry.handle(event, group)) return;

if (text === "help") {
  return reply(event.replyToken, buildHelp(modules));
}
}


function buildHelp(modules) {

  let msg = "🤖 Spirit AI\n";
  msg += "---------------------------------\n";
  msg += "ระบบที่สามารถทำได้:\n\n";

  msg += "1️⃣ ระบบรายงานสถิติ จังหวัด\n";
  msg += "   พิมพ์: สงขลา ส่งสถิติแล้ว\n\n";

  msg += "2️⃣ ระบบรายงานสถิติ หาดใหญ่\n";
  msg += "   พิมพ์: pro=20 หรือ pro=20 stb=10\n\n";

  msg += "3️⃣ ระบบแจ้งเตือนทั่วไป\n";
  msg += "   แจ้งเตือนตามวัน/เวลาที่ตั้งไว้\n\n";

  msg += "4️⃣ ระบบแจ้งเตือนล่วงหน้า\n";
  msg += "   พิมพ์: แจ้งเตือน ค่าย 1/3/2569\n\n";

  msg += "5️⃣ ระบบบันทึกถาวร\n";
  msg += "   พิมพ์: บันทึกลา สมาย 12/03/2026\n";
  msg += "   ดูรายการ: บันทึกถาวร\n\n";

  msg += "6️⃣ ระบบรายงานการรับใช้\n";
  msg += "   พิมพ์: รายงานการรับใช้ วันนี้ไปเยี่ยมคน\n";
  msg += "   ดูรายการ: บันทึกรายงานการรับใช้\n\n";

  msg += "7️⃣ ระบบทะเบียน\n";
  msg += "   พิมพ์: ลงทะเบียน สมาย 19/10/1993 เบอร์โทรติดต่อ 0653565669\n";
  msg += "   ค้นหา: ขอข้อมูลทะเบียนเดือน10\n\n";

  msg += "---------------------------------\n";
  msg += "📌 วิธีตั้งค่าเมื่อเพิ่มเข้ากลุ่มใหม่\n\n";

  msg += "1. พิมพ์: เปิด province (สำหรับกลุ่มจังหวัด)\n";
  msg += "2. พิมพ์: เปิด hatyai (สำหรับกลุ่มหาดใหญ่)\n";
  msg += "3. พิมพ์: เปิด reminder\n";
  msg += "4. พิมพ์: เปิด permanentNote\n";
  msg += "5. พิมพ์: เปิด serviceReport\n";
  msg += "6. พิมพ์: เปิด registry\n\n";

  msg += "📘 ระบบที่เปิดอยู่ในกลุ่มนี้:\n";

  Object.keys(modules).forEach(k => {
    msg += modules[k]
      ? `✔ ${k}\n`
      : `✖ ${k}\n`;
  });

  return msg;
}

module.exports = { handleMessage };
