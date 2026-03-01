const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");

async function handle(event) {

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  /* ===============================
     บันทึก
     ตัวอย่าง:
     บันทึก วันนี้ประชุม 18.00
  ================================ */
  if (text.startsWith("บันทึก")) {

    const content = text.replace("บันทึก","").trim();
    if (!content) {
      return reply(event.replyToken, "❗ กรุณาพิมพ์ข้อความหลังคำว่า บันทึก");
    }

    const id = uuidv4().slice(0,5);

    await db.collection("permanentNotes").doc(id).set({
      id,
      groupId,
      content,
      createdAt: new Date()
    });

    return reply(event.replyToken, `✅ บันทึกเรียบร้อย (ID: ${id})`);
  }

  /* ===============================
     แสดงทั้งหมด
     คำสั่ง:
     ดูบันทึก
  ================================ */
  if (text === "ดูบันทึก") {

    const snap = await db.collection("permanentNotes")
      .where("groupId","==",groupId)
      .orderBy("createdAt","desc")
      .get();

    if (snap.empty) {
      return reply(event.replyToken, "📭 ยังไม่มีบันทึก");
    }

    let msg = "📝 บันทึกทั้งหมด\n\n";

    snap.forEach(doc => {
      const data = doc.data();
      msg += `• ${data.content}\n`;
    });

    return reply(event.replyToken, msg);
  }

  return false;
}

module.exports = { handle };
