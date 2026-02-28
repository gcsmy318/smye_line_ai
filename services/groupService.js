const { getDB } = require("../config/firebase");
const { reply } = require("../config/line");

const provinceModule = require("./modules/provinceModule");
const subprovinceModule = require("./modules/subprovinceModule");
const worshipModule = require("./modules/worshipModule");
const meetingModule = require("./modules/meetingModule");
const programModule = require("./modules/programModule");
const reminderModule = require("./modules/reminderModule");
const permanentNoteModule = require("./modules/permanentNoteModule");
const serviceReportModule = require("./modules/serviceReportModule");
const registryModule = require("./modules/registryModule");

async function handleMessage(event) {

  const db = getDB();
  const text = event.message.text.trim().toLowerCase();
  const groupId = event.source.groupId || event.source.userId;

  const docRef = db.collection("groups").doc(groupId);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      modules: {
        province: false,
        subprovince: false,
        worship: false,
        meeting: false,
        program: false,
        reminder: false,
        permanentNote: false,
        serviceReport: false,
        registry: false
      }
    });

    return reply(event.replyToken,
`🤖 Spirit AI พร้อมใช้งาน
พิมพ์ help เพื่อดูคำสั่ง`);
  }

  const group = doc.data();
  const modules = group.modules || {};

  if (text === "help") {
    return reply(event.replyToken, buildHelp(modules));
  }

  // เปิด module
  if (text.startsWith("เปิด ")) {
    const moduleName = text.replace("เปิด ", "");
    if (modules.hasOwnProperty(moduleName)) {
      await docRef.update({
        [`modules.${moduleName}`]: true
      });
      return reply(event.replyToken, `✅ เปิด ${moduleName} แล้ว`);
    }
  }

  // routing
  if (modules.province) await provinceModule.handle(event);
  if (modules.subprovince) await subprovinceModule.handle(event);
  if (modules.worship) await worshipModule.handle(event);
  if (modules.meeting) await meetingModule.handle(event);
  if (modules.program) await programModule.handle(event);
  if (modules.reminder) await reminderModule.handle(event);
  if (modules.permanentNote) await permanentNoteModule.handle(event);
  if (modules.serviceReport) await serviceReportModule.handle(event);
  if (modules.registry) await registryModule.handle(event);
}

function buildHelp(modules) {
  let msg = "📘 ระบบที่เปิดอยู่:\n\n";
  Object.keys(modules).forEach(k => {
    if (modules[k]) msg += `✔ ${k}\n`;
  });
  return msg;
}

module.exports = { handleMessage };