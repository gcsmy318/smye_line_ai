
const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");

async function handle(event) {
  const text = event.message.text.trim();
  const groupId = event.source.groupId;

  if (text.startsWith("บันทึกลา")) {
    const note = text.replace("บันทึกลา","").trim();
    const id = uuidv4().slice(0,5);

    await getDB().collection("permanentNotes").doc(id).set({
      groupId, note
    });

    return reply(event.replyToken, `บันทึกแล้ว ID ${id}`);
  }

  if (text === "บันทึกถาวร") {
    const snap = await getDB().collection("permanentNotes")
      .where("groupId","==",groupId).get();

    let msg = "บันทึกถาวร\n";
    snap.forEach(doc => {
      msg += `- ${doc.data().note}\n`;
    });

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };
