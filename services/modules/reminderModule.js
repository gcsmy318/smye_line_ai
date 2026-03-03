const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { client } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");

/* ================= TIME ================= */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function toThaiDateOnly(date) {
  const d = new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ================= CHAT COMMAND ================= */

async function handle(event) {

  if (!event.message || event.message.type !== "text") return false;

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  /* ===============================
     เพิ่มแจ้งเตือน
     รูปแบบ:
     แจ้งเตือน ประชุมทีม 25/3/2026
  ================================ */
  if (text.startsWith("แจ้งเตือน ")) {

    const raw = text.replace("แจ้งเตือน", "").trim();
    const parts = raw.split(" ");

    if (parts.length < 2) {
      return reply(event.replyToken, "รูปแบบ: แจ้งเตือน หัวข้อ 25/3/2026");
    }

    const dateStr = parts.pop();
    const title = parts.join(" ");

    const id = uuidv4().slice(0, 5);

    await db.collection("reminders").doc(id).set({
      id,
      groupId,
      title,
      date: dateStr,
      createdAt: new Date()
    });

    return reply(event.replyToken, `✅ บันทึกแจ้งเตือนแล้ว (ID: ${id})`);
  }

  /* ===============================
     ดูแจ้งเตือน
  ================================ */
  if (text === "ดูแจ้งเตือน") {

    const snapshot = await db.collection("reminders")
      .where("groupId", "==", groupId)
      .get();

    if (snapshot.empty) {
      return reply(event.replyToken, "ยังไม่มีแจ้งเตือน");
    }

    let msg = "📋 รายการแจ้งเตือน\n\n";

    snapshot.forEach(doc => {
      const d = doc.data();
      msg += `• ${d.title} (${d.date})\n   ID: ${d.id}\n`;
    });

    return reply(event.replyToken, msg);
  }

  /* ===============================
     ลบแจ้งเตือน
     รูปแบบ:
     ลบแจ้งเตือน abc12
  ================================ */
  if (text.startsWith("ลบแจ้งเตือน ")) {

    const id = text.replace("ลบแจ้งเตือน", "").trim();

    if (!id || id.length !== 5) {
      return reply(event.replyToken, "กรุณาระบุ ID 5 ตัว เช่น ลบแจ้งเตือน a1b2c");
    }

    const docRef = db.collection("reminders").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return reply(event.replyToken, "ไม่พบแจ้งเตือนนี้");
    }

    await docRef.delete();

    return reply(event.replyToken, "🗑 ลบแจ้งเตือนเรียบร้อย");
  }

  return false;
}

/* ================= SCHEDULER FUNCTION ================= */

async function handleReminders() {

  try {

    const db = getDB();
    if (!db) return;

    const nowThai = getThaiNow();
    const todayOnly = toThaiDateOnly(nowThai);

    const snapshot = await db.collection("reminders").get();

    const groupMap = {};

    snapshot.forEach(doc => {

      const data = doc.data();
      if (!data.groupId || !data.date) return;

      const eventDate = new Date(data.date);
      const eventOnly = toThaiDateOnly(eventDate);

      const diffDays = Math.round(
        (eventOnly - todayOnly) / (1000 * 60 * 60 * 24)
      );

      if (!groupMap[data.groupId]) {
        groupMap[data.groupId] = [];
      }

      if (diffDays === 0)
        groupMap[data.groupId].push(`📌 วันนี้: ${data.title}`);

      if (diffDays === 3)
        groupMap[data.groupId].push(`⏳ อีก 3 วัน: ${data.title}`);
    });

    for (const groupId in groupMap) {

      if (!groupMap[groupId].length) continue;

      let msg = "🔔 แจ้งเตือนประจำวัน\n\n";

      groupMap[groupId].forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });

      await client.pushMessage(groupId, {
        type: "text",
        text: msg
      });
    }

  } catch (err) {
    console.error("Reminder Error:", err);
  }
}

module.exports = { handle, handleReminders };