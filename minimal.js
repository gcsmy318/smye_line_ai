require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { middleware, Client } = require("@line/bot-sdk");
const admin = require("firebase-admin");
const cron = require("node-cron");

const app = express();

/* ===============================
   🔥 FIREBASE INIT (Cloud Run Ready)
================================= */

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

/* ===============================
   🔥 LINE INIT
================================= */

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

/* ===============================
   🔥 LINE WEBHOOK
================================= */

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {
    console.log("🔥 LINE WEBHOOK HIT");

    const events = req.body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        await handleMessage(event);
      }
    }

    res.sendStatus(200);
  }
);

/* ===============================
   🔥 HANDLE MESSAGE
================================= */

async function handleMessage(event) {
  const text = event.message.text;
  const groupId = event.source.groupId;

  if (!groupId) return;

  console.log("📩 MESSAGE:", text);
  console.log("📍 GROUP:", groupId);

  // ===== เพิ่มแจ้งเตือน =====
  if (text.startsWith("แจ้งเตือน")) {
    const reminderId = Math.floor(Math.random() * 1000).toString();

    await db.collection("reminders").add({
      id: reminderId,
      groupId,
      message: text.replace("แจ้งเตือน", "").trim(),
      type: "DAILY",
      notifyTime: "08:00",
      active: true
    });

    await client.pushMessage(groupId, {
      type: "text",
      text: `✅ เพิ่มแจ้งเตือนแล้ว\nID: ${reminderId}\nเวลา: 08:00`
    });

    return;
  }

  // ===== ยกเลิก =====
  if (text.startsWith("ยกเลิก")) {
    const id = text.split(" ")[1];

    const snap = await db
      .collection("reminders")
      .where("id", "==", id)
      .get();

    snap.forEach(doc => doc.ref.update({ active: false }));

    await client.pushMessage(groupId, {
      type: "text",
      text: `❌ ยกเลิก ID ${id} แล้ว`
    });

    return;
  }

  // ===== ทดสอบ =====
  await client.replyMessage(event.replyToken, {
    type: "text",
    text: "BOT ALIVE ✅"
  });
}

/* ===============================
   🔥 SCHEDULER (ทุก 1 นาที)
================================= */

cron.schedule("* * * * *", async () => {
  console.log("⏰ Checking reminders...");

  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  const snapshot = await db
    .collection("reminders")
    .where("active", "==", true)
    .where("notifyTime", "==", currentTime)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    await client.pushMessage(data.groupId, {
      type: "text",
      text: `🔔 แจ้งเตือน:\n${data.message}`
    });
  }
});

/* ===============================
   🔥 HEALTH CHECK
================================= */

app.get("/ping", (req, res) => {
  res.send("pong");
});

/* ===============================
   🔥 START SERVER
================================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});