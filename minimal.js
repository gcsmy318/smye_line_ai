require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { middleware, Client } = require("@line/bot-sdk");
const admin = require("firebase-admin");

const app = express();

/* ===============================
   🔥 FIREBASE INIT
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
  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;

  console.log("📩 TEXT:", text);

  // ===== HELP COMMAND =====
  if (text === "help" || text === "คำสั่ง") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`🤖 คำสั่งที่ใช้ได้

พิมพ์:
help → ดูคำสั่ง
ping → ทดสอบบอท
แจ้งเตือน <ข้อความ> → เพิ่มแจ้งเตือน
ยกเลิก <id> → ยกเลิกแจ้งเตือน

พิมพ์อะไรก็ได้ บอทจะตอบกลับ 😉`
    });
  }

  // ===== PING =====
  if (text === "ping") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "🏓 PONG! BOT ทำงานอยู่ ✅"
    });
  }

  // ===== ADD REMINDER =====
  if (text.startsWith("แจ้งเตือน")) {
    const reminderId = Math.floor(Math.random() * 1000).toString();
    const message = text.replace("แจ้งเตือน", "").trim();

    await db.collection("reminders").add({
      id: reminderId,
      groupId,
      message,
      type: "DAILY",
      notifyTime: "08:00",
      active: true
    });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `✅ เพิ่มแจ้งเตือนแล้ว\nID: ${reminderId}\nเวลา: 08:00`
    });
  }

  // ===== CANCEL =====
  if (text.startsWith("ยกเลิก")) {
    const id = text.split(" ")[1];

    const snap = await db
      .collection("reminders")
      .where("id", "==", id)
      .get();

    snap.forEach(doc => doc.ref.update({ active: false }));

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `❌ ยกเลิก ID ${id} แล้ว`
    });
  }

  // ===== DEFAULT REPLY (ตอบทุกข้อความ) =====
  return client.replyMessage(event.replyToken, {
    type: "text",
    text:
`🤖 คุณพิมพ์ว่า:
"${text}"

พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`
  });
}

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