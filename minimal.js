require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { middleware } = require("@line/bot-sdk");

const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");

const app = express();

/* =====================================================
   🔥 START SERVER
===================================================== */

console.log("🚀 Starting server...");

initFirebase();
console.log("✅ Firebase initialized");

/* =====================================================
   🔥 LOAD SCHEDULER (SAFE LOAD)
===================================================== */

try {
  console.log("🔄 Loading Scheduler...");
  
  const schedulerPath = path.join(
    __dirname,
    "services",
    "schedulers",
    "masterScheduler"
  );

  const { startSchedulers } = require(schedulerPath);

  console.log("✅ Scheduler loaded successfully");

  startSchedulers();

} catch (err) {
  console.error("❌ Scheduler failed to load:", err);
}

/* =====================================================
   🔥 STATIC PUBLIC
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
      console.error("Webhook Error:", err);
      res.sendStatus(500);
    }
  }
);

/* =====================================================
   🔥 HEALTH CHECK (กัน Render sleep)
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