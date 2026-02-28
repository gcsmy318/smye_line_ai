const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

async function handle(event, group) {

  const text = event.message.text.trim();
  const normalized = text.toLowerCase();
  const db = getDB();
  const groupId = event.source.groupId || event.source.userId;

  // ================= บันทึก =================
  if (normalized.startsWith("แจ้งเตือน ")) {

    const parts = text.replace("แจ้งเตือน ", "").trim().split(" ");
    const date = parts.pop();
    const title = parts.join(" ");

    if (!title || !date) {
      return reply(event.replyToken, "รูปแบบ: แจ้งเตือน หัวข้อ dd/mm/yyyy");
    }

    // ดึง nextReminderId แบบ transaction กันชน
    const groupRef = db.collection("groups").doc(groupId);

    const newId = await db.runTransaction(async (t) => {
      const doc = await t.get(groupRef);
      const current = doc.exists ? doc.data().nextReminderId || 1 : 1;
      t.set(groupRef, { nextReminderId: current + 1 }, { merge: true });
      return current;
    });

    await db.collection("reminders").add({
      id: newId,
      groupId,
      title,
      scheduleDate: date,
      createdBy: event.source.userId,
      createdAt: new Date(),
      notifiedBefore: false,
      notifiedToday: false
    });

    return reply(event.replyToken, `บันทึกแจ้งเตือน ID ${newId}`);
  }

  // ================= ลบ =================
  if (normalized.startsWith("ลบ ")) {

    const id = parseInt(normalized.replace("ลบ ", "").trim());
    if (isNaN(id)) {
      return reply(event.replyToken, "กรุณาระบุเลข ID เช่น ลบ 3");
    }

    const snapshot = await db.collection("reminders")
      .where("groupId", "==", groupId)
      .where("id", "==", id)
      .get();

    if (snapshot.empty) {
      return reply(event.replyToken, "ไม่พบ ID นี้");
    }

    snapshot.forEach(doc => doc.ref.delete());

    return reply(event.replyToken, `ลบแจ้งเตือน ID ${id} เรียบร้อยแล้ว`);
  }

  return false;
}

module.exports = { handle };