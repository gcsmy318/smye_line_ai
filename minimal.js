require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { middleware } = require("@line/bot-sdk");

const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");
const { startGeneralScheduler } = require("./services/schedulers/generalScheduler");
const { startStatSheetScheduler } = require("./services/schedulers/statSheetScheduler");

const app = express();

/* =====================================================
   🚀 START SERVER
===================================================== */

console.log("🚀 Starting server...");

/* 🔥 1️⃣ Initialize Firebase ก่อน */
initFirebase();
console.log("✅ Firebase initialized");

/* 🔥 2️⃣ Start General Scheduler */
try {
  startGeneralScheduler();
  startStatScheduler();
  console.log("⏰ General Scheduler started");
} catch (err) {
  console.error("❌ Scheduler Error:", err);
}

/* =====================================================
   📂 STATIC FILES
===================================================== */

app.use(express.static(path.join(__dirname, "public")));

/* =====================================================
   📩 LINE WEBHOOK
===================================================== */

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {
    try {

      const events = req.body.events || [];

     for (const event of events) {
       await handleMessage(event);
     }

      res.sendStatus(200);

    } catch (err) {
      console.error("❌ Webhook Error:", err);
      res.sendStatus(500);
    }
  }
);

/* =====================================================
   🩺 HEALTH CHECK (กัน Render Sleep)
===================================================== */

app.get("/health", (req, res) => {
  res.send("OK");
});

/* =====================================================
   🌐 START LISTEN
===================================================== */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🔥 Server started on port ${PORT}`);
});