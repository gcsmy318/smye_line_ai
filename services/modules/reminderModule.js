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

if (normalized === "ดูแจ้งเตือนที่ผ่านไปแล้ว") {
  return listPastReminders(event, groupId);
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

  const db = getDB();
  const eventId = event.message.id;

  // 🔒 กัน duplicate event
  const exist = await db.collection("processedEvents")
    .doc(eventId)
    .get();

  if (exist.exists) {
    console.log("Duplicate blocked:", eventId);
    return;
  }

  const text = event.message.text.trim();
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

  // ใช้ auto id
  const docRef = db.collection("reminders").doc();
  const id = docRef.id;

  await docRef.set({
    groupId,
    title,
    originalDate: dateStr,
    targetDate: parsedDate,
    createdAt: new Date()
  });

  // บันทึกว่า event นี้ใช้แล้ว
  await db.collection("processedEvents").doc(eventId).set({
    createdAt: new Date()
  });

  // ✅ แสดงแค่รายการเดียว
  return reply(
    event.replyToken,
    `✅ บันทึกแจ้งเตือนแล้ว ID ${id} ${title} `
  );
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

async function listPastReminders(event, groupId) {

  const db = getDB();
  const now = new Date();

  const snapshot = await db.collection("reminders")
    .where("groupId", "==", groupId)
    .get();

  if (snapshot.empty) {
    return reply(event.replyToken, "ยังไม่มีรายการแจ้งเตือน");
  }

  let msg = "📜 แจ้งเตือนที่ผ่านมา\n";
  msg += "----------------------------------\n";

  let found = false;

  snapshot.forEach(doc => {

    const data = doc.data();
    if (!data.targetDate) return;

    const target = data.targetDate.toDate
      ? data.targetDate.toDate()
      : new Date(data.targetDate);

    if (target < now) {
      found = true;
      msg += `- ${data.title} (${data.originalDate || "-"})\n`;
    }
  });

  if (!found) {
    msg += "ไม่มีรายการที่ผ่านมา";
  }

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

  if (!dateStr) return null;

  const clean = dateStr.trim();

  // รองรับ 1/3/2026 หรือ 01/03/2569
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);

  // ถ้าเป็น พ.ศ.
  if (year > 2400) {
    year -= 543;
  }

  const date = new Date(year, month, day, 7, 0, 0);

  if (isNaN(date.getTime())) return null;

  return date;
}

module.exports = { handle };