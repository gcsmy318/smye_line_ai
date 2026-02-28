
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
    return reply(event.replyToken, "Spirit AI Production Ready");
  }
}

module.exports = { handleMessage };
