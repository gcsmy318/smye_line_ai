
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0,10);
}

async function handle(event) {
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  if (text.startsWith("รายงานการรับใช้")) {
    const content = text.replace("รายงานการรับใช้","").trim();

    await getDB().collection("weeklyServiceReports")
      .doc(`${getWeekKey()}_${groupId}`)
      .set({
        reports: [{ content, date: new Date() }]
      }, { merge:true });

    return reply(event.replyToken, "บันทึกความดีของท่านแล้ว");
  }

  return false;
}

module.exports = { handle };
