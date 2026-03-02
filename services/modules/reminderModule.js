const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

/* =========================================
   MAIN HANDLE
========================================= */
async function handle(event) {
  const text = event.message.text.trim();
  const normalized = text.toLowerCase();
  const groupId = event.source.groupId || event.source.userId;

  if (normalized.startsWith("แจ้งเตือน ")) {
    return createReminder(event, groupId);
  }

  if (
    normalized === "แจ้งเตือนทั้งหมด" ||
    normalized === "ดูแจ้งเตือน"
  ) {
    return listReminders(event, groupId);
  }

  if (normalized.startsWith("ลบแจ้งเตือน ")) {
    return deleteReminder(event, groupId);
  }

  return false;
}

/* =========================================
   CREATE REMINDER
========================================= */
async function createReminder(event, groupId) {
  const text = event.message.text.trim();
  const db = getDB();

  const parts = text.replace("แจ้งเตือน", "").trim().split(" ");
  if (parts.length < 2) {
    return reply(event.replyToken, "รูปแบบ: แจ้งเตือน เรื่อง dd/mm/yyyy");
  }

  const dateStr = parts.pop();
  const title = parts.join(" ");

  const parsedDate = parseDate(dateStr);
  if (!parsedDate) {
    return reply(event.replyToken, "รูปแบบวันที่ไม่ถูกต้อง");
  }

  // generate ID แบบ 001,002
  const snapshot = await db.collection("reminders")
    .where("groupId", "==", groupId)
    .get();

  const id = String(snapshot.size + 1).padStart(3, "0");

  await db.collection("reminders").doc(id).set({
    groupId,
    title,
    originalDate: dateStr,
    targetDate: parsedDate,
    createdAt: new Date()
  });

  return listReminders(event, groupId);
}

/* =========================================
   LIST REMINDERS (ครบทุกอันในข้อความเดียว)
========================================= */
async function listReminders(event, groupId) {
  const db = getDB();

  const snapshot = await db.collection("reminders")
    .where("groupId", "==", groupId)
    .get();

  if (snapshot.empty) {
    return reply(event.replyToken, "ยังไม่มีรายการแจ้งเตือน");
  }

  let msg = "📌 แจ้งเตือน\n";
  msg += "----------------------------------\n";

  snapshot.forEach(doc => {
    const data = doc.data();

    const dateText =
      data.originalDate ||
      data.date ||
      (data.targetDate
        ? formatDate(data.targetDate.toDate
            ? data.targetDate.toDate()
            : new Date(data.targetDate))
        : "-");

    msg += `- ID ${doc.id} ${data.title} วันที่ ${dateText}\n`;
  });

  msg += "----------------------------------\n";
  msg += "ลบโดยพิมพ์: ลบแจ้งเตือน <ID>";

  return reply(event.replyToken, msg);
}

function formatDate(d) {
  return d.toLocaleDateString("th-TH");
}

/* =========================================
   DELETE REMINDER
========================================= */
async function deleteReminder(event, groupId) {
  const text = event.message.text.trim();
  const id = text.replace("ลบแจ้งเตือน", "").trim();
  const db = getDB();

  if (!id) {
    return reply(event.replyToken, "กรุณาระบุ ID");
  }

  const docRef = db.collection("reminders").doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return reply(event.replyToken, "ไม่พบ ID นี้");
  }

  if (doc.data().groupId !== groupId) {
    return reply(event.replyToken, "ไม่สามารถลบของกลุ่มอื่นได้");
  }

  await docRef.delete();

  return reply(event.replyToken, `ลบแจ้งเตือน ID ${id} แล้ว`);
}

/* =========================================
   PARSE DATE (รองรับ พ.ศ. / ค.ศ.)
========================================= */
function parseDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  let day = parseInt(match[1]);
  let month = parseInt(match[2]) - 1;
  let year = parseInt(match[3]);

  // ถ้าเป็น พ.ศ. (มากกว่า 2400) แปลงเป็น ค.ศ.
  if (year > 2400) {
    year -= 543;
  }

  const date = new Date(year, month, day);

  if (isNaN(date.getTime())) return null;

  return date;
}

module.exports = { handle };