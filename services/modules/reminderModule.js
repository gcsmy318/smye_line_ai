const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");
const { v4: uuidv4 } = require("uuid");
const queue = require("../lineQueue");

/* 🔧 lock กัน reminder ซ้อน */
let reminderRunning = false;

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

/* ===================================================== */
/* 🔥 เพิ่ม parser รองรับทุก format (ไม่กระทบของเดิม) */
/* ===================================================== */

function parseSlashDate(str) {
  if (!str || typeof str !== "string") return null;

  const parts = str.split("/");
  if (parts.length !== 3) return new Date(str);

  let [day, month, year] = parts.map(Number);

  if (year > 2500) {
    year = year - 543;
  }

  return new Date(year, month - 1, day);
}

function resolveEventDate(data) {

  if (data.targetDate) {
    if (typeof data.targetDate.toDate === "function") {
      return data.targetDate.toDate();
    }
    return new Date(data.targetDate);
  }

  if (data.originalDate) {
    return parseSlashDate(data.originalDate);
  }

  if (data.date) {
    return parseSlashDate(data.date);
  }

  return null;
}

/* ================= CHAT COMMAND ================= */

async function handle(event) {

  if (!event.message || event.message.type !== "text") return false;

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

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
      originalDate: dateStr,
      targetDate: parseSlashDate(dateStr),
      createdAt: new Date()
    });

    return reply(event.replyToken, `✅ บันทึกแจ้งเตือนแล้ว (ID: ${id})`);
  }

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
      msg += `• ${d.title} (${d.originalDate || d.date})\n   ID: ${d.id}\n`;
    });

    return reply(event.replyToken, msg);
  }

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

  if (reminderRunning) {
    console.log("⚠ reminder already running");
    return;
  }

  reminderRunning = true;

  try {

    const db = getDB();
    if (!db) return;

    const nowThai = getThaiNow();
    const todayOnly = toThaiDateOnly(nowThai);

    const snapshot = await db.collection("reminders").get();

    console.log("📥 reminders loaded:", snapshot.size);  // 🔧 เพิ่ม log

    const groupMap = {};

    snapshot.forEach(doc => {

      const data = doc.data();

      console.log("🔍 checking reminder:", data.title); // 🔧 เพิ่ม log

      if (!data.groupId) return;

      const eventDate = resolveEventDate(data);
      if (!eventDate) return;

      const eventOnly = toThaiDateOnly(eventDate);

      const diffDays = Math.floor(
        (eventOnly - todayOnly) / (1000 * 60 * 60 * 24)
      );

      console.log("📅 diffDays =", diffDays); // 🔧 เพิ่ม log

      if (!groupMap[data.groupId]) {
        groupMap[data.groupId] = [];
      }

      if (diffDays === 0)
        groupMap[data.groupId].push(`📌 วันนี้: ${data.title}`);

      if (diffDays === 3)
        groupMap[data.groupId].push(`⏳ อีก 3 วัน: ${data.title}`);

      if (diffDays === 2)
        groupMap[data.groupId].push(`⏳ อีก 2 วัน: ${data.title}`);

      if (diffDays === 1)
        groupMap[data.groupId].push(`⏳ อีก 1 วัน: ${data.title}`);

    });

    if (Object.keys(groupMap).length === 0) {
      console.log("📭 no reminder today"); // 🔧 เพิ่ม log
      return;
    }

    const wait = ms => new Promise(r => setTimeout(r, ms));

    for (const groupId in groupMap) {

      if (!groupMap[groupId].length) continue;

      let msg = "🔔 แจ้งเตือนประจำวัน\n\n";

      groupMap[groupId].forEach((m, i) => {
        msg += `${i + 1}. ${m}\n`;
      });


      console.log("📤 reminder send to:", groupId); // 🔧 เพิ่ม log

      queue.push(groupId, {
        type: "text",
        text: msg
      });

      await wait(800);

    }

  } catch (err) {
    console.error("Reminder Error:", err);
  }

  reminderRunning = false;
}

module.exports = { handle, handleReminders };