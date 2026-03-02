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

  // 🔒 กัน duplicate event จาก LINE
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

  // 🔢 สร้าง ID 5 หลัก
  const id = await generateShortId(db);

  await db.collection("reminders").doc(id).set({
    groupId,
    title,
    originalDate: dateStr,
    targetDate: parsedDate,
    createdAt: new Date()
  });

  await db.collection("processedEvents").doc(eventId).set({
    createdAt: new Date()
  });

  console.log("Reminder created:", id, title);

  // ✅ แสดงแค่รายการเดียว
  return reply(
    event.replyToken,
    `✅ บันทึกแจ้งเตือนแล้ว\nID ${id} - ${title}`
  );
}

/* =========================================
   LIST REMINDERS
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

/* =========================================
   LIST PAST REMINDERS
========================================= */
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
      msg += `- ID ${doc.id} ${data.title} (${data.originalDate || "-"})\n`;
    }
  });

  if (!found) {
    msg += "ไม่มีรายการที่ผ่านมา";
  }

  return reply(event.replyToken, msg);
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

  console.log("Reminder deleted:", id);

  return reply(event.replyToken, `ลบแจ้งเตือน ID ${id} แล้ว`);
}

/* =========================================
   GENERATE 5-CHAR ID
========================================= */
async function generateShortId(db) {

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  while (true) {

    let id = "";

    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const exist = await db.collection("reminders").doc(id).get();

    if (!exist.exists) {
      return id;
    }
  }
}

/* =========================================
   PARSE DATE (รองรับหลาย format)
========================================= */
function parseDate(dateStr) {

  if (!dateStr) return null;

  const clean = dateStr.trim();

  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  let day = parseInt(match[1], 10);
  let month = parseInt(match[2], 10) - 1;
  let year = parseInt(match[3], 10);

  // รองรับ พ.ศ.
  if (year > 2400) {
    year -= 543;
  }

  const date = new Date(year, month, day, 7, 0, 0);

  if (isNaN(date.getTime())) return null;

  return date;
}

function formatDate(d) {
  return d.toLocaleDateString("th-TH");
}

module.exports = { handle };