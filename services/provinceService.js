const { getDB } = require("../config/firebase");
const { reply, push } = require("../config/line");

/* ===============================
   HANDLE MESSAGE
================================= */
async function handle(event, group) {
  const db = getDB();
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  const province = group.provinces.find(p => text.includes(p));

  if (province && text.includes("ส่งสถิติแล้ว")) {

    const weekKey = getWeekKey();
    const docId = `${weekKey}_${groupId}`;
    const docRef = db.collection("weeklyProvinceStats").doc(docId);

    await docRef.set({
      status: { [province]: true }
    }, { merge: true });

    const message = await buildProvinceMessage(groupId, group, province);
    return reply(event.replyToken, message);
  }
}

/* ===============================
   BUILD MESSAGE
================================= */
async function buildProvinceMessage(groupId, group, updatedProvince = null) {

  const db = getDB();
  const weekKey = getWeekKey();
  const docId = `${weekKey}_${groupId}`;

  const doc = await db.collection("weeklyProvinceStats").doc(docId).get();
  const status = doc.exists ? doc.data().status || {} : {};

  const today = new Date();

  let message = 
`สัปดาห์นี้ ${formatWeekRange()}
---------------------------------------
`;

  if (updatedProvince) {
    message += `ขอบคุณ${updatedProvince} ส่งสถิติแล้ว\n`;
  } else {
    message += `รบกวนผู้นำทุกท่านกรอกสถิติด้วยครับ\n`;
  }

  message += `สถิติวัน${today.toLocaleDateString("th-TH")}
---------------------------------------
`;

  group.provinces.forEach(p => {
    message += status[p]
      ? `-${p} ( ส่งสถิติแล้ว )\n`
      : `-${p}\n`;
  });

  message += "---------------------------------------";

  return message;
}

/* ===============================
   SELF HEALING
================================= */
async function checkAndRecoverProvinceReminder(groupId, group) {

  const db = getDB();
  const todayKey = new Date().toISOString().slice(0, 10);

  const logId = `${todayKey}_${groupId}_province`;
  const logRef = db.collection("schedulerLogs").doc(logId);
  const logDoc = await logRef.get();

  const now = new Date();
  const hour = now.getHours();

  if (hour >= 8 && !logDoc.exists) {

    const message = await buildProvinceMessage(groupId, group);
    await push(groupId, message);

    await logRef.set({
      groupId,
      type: "province",
      sentAt: new Date(),
      recovered: true
    });
  }
}

/* ===============================
   HELP
================================= */
function helpMessage() {
  return `🤖 ระบบรายงานสถิติ (จังหวัด)

พิมพ์:
จังหวัด ส่งสถิติแล้ว

ระบบแจ้งเตือนทุก อา จ อ ศ เวลา 8:00`;
}

/* ===============================
   UTIL
================================= */
function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

function formatWeekRange() {
  const start = new Date();
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString("th-TH", { month: "short" })} ${start.getFullYear()}`;
}

module.exports = {
  handle,
  buildProvinceMessage,
  checkAndRecoverProvinceReminder,
  helpMessage
};