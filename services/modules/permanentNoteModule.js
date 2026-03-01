const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  const collection = db.collection("permanentNotes");

  /* ===== บันทึก ===== */
  if (text.startsWith("บันทึก ")) {

    const content = text.replace("บันทึก", "").trim();
    if (!content) return false;

    await collection.add({
      groupId,
      content,
      createdAt: new Date()
    });

    return reply(event.replyToken, "✅ บันทึกเรียบร้อยแล้ว");
  }

  /* ===== ดูบันทึก ===== */
  if (text === "ดูบันทึก") {

    const snapshot = await collection
      .where("groupId", "==", groupId)
      .get();

    if (snapshot.empty) {
      return reply(event.replyToken, "📭 ยังไม่มีบันทึก");
    }

    let msg = "📝 บันทึกย้อนหลัง\n\n";

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      msg += `${index + 1}. ${data.content}\n`;
    });

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };
