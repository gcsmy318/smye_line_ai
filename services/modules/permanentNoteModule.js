const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");

async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  /* ===============================
     บันทึก
  ================================ */
  if (text.startsWith("บันทึก ")) {

    const content = text.replace("บันทึก", "").trim();

    if (!content) {
      return reply(event.replyToken, "กรุณาพิมพ์: บันทึก ข้อความ");
    }

    const id = uuidv4().slice(0, 5);

    await db.collection("permanentNotes").doc(id).set({
      groupId,
      content,
      createdAt: new Date()
    });

    return reply(event.replyToken, "✅ บันทึกเรียบร้อยแล้ว");
  }

  /* ===============================
     ดูบันทึก
  ================================ */
  if (text === "ดูบันทึก") {

    const snap = await db.collection("permanentNotes")
      .where("groupId", "==", groupId)
      .get();

    if (snap.empty) {
      return reply(event.replyToken, "ยังไม่มีบันทึก");
    }

    let msg = "📝 บันทึกถาวร\n";
    msg += "--------------------------\n";

    snap.forEach((doc, index) => {
      const data = doc.data();
      msg += `${index + 1}. ${data.content}\n`;
    });

    msg += "--------------------------";

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };