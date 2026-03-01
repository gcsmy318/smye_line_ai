require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { middleware } = require("@line/bot-sdk");

const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");
const { startGeneralScheduler } = require("./services/schedulers/generalScheduler");

const app = express();

/* =====================================================
   🔥 START SERVER
===================================================== */

console.log("🚀 Starting server...");

// 🔥 ต้อง init Firebase ก่อน
initFirebase();
console.log("✅ Firebase initialized");

/* =====================================================
   🔥 START GENERAL SCHEDULER
===================================================== */

startGeneralScheduler();
console.log("⏰ General Scheduler started");

/* =====================================================
   🔥 LOAD MASTER SCHEDULER
===================================================== */

try {
  console.log("🔄 Loading Master Scheduler...");

  const { startScheduler } = require("./services/schedulers/masterScheduler");

  startScheduler();

  console.log("✅ Master Scheduler loaded successfully");

} catch (err) {
  console.error("❌ Master Scheduler failed to load:", err);
}

/* =====================================================
   🔥 STATIC
===================================================== */

app.use(express.static(path.join(__dirname, "public")));

/* =====================================================
   🔥 WEBHOOK
===================================================== */

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {
    try {

      const events = req.body.events || [];

      for (const event of events) {
        if (event.type === "message" && event.message.type === "text") {
          await handleMessage(event);
        }
      }

      res.sendStatus(200);

    } catch (err) {
      console.error("❌ Webhook Error:", err);
      res.sendStatus(500);
    }
  }
);

/* =====================================================
   🔥 HEALTH CHECK
===================================================== */

app.get("/health", (req, res) => {
  res.send("OK");
});

/* =====================================================
   🔥 START LISTEN
===================================================== */

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🔥 Server started on port ${PORT}`);
});