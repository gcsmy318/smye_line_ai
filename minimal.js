require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { middleware } = require("@line/bot-sdk");

const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");

const app = express();

console.log("🚀 Starting server...");
initFirebase();
console.log("✅ Firebase initialized");

/* LOAD SCHEDULER */
try {
  console.log("🔄 Loading Scheduler...");
  const { startScheduler } = require("./services/schedulers/masterScheduler");
  startScheduler();
  console.log("✅ Scheduler loaded successfully");
} catch (err) {
  console.error("❌ Scheduler failed to load:", err);
}

/* STATIC */
app.use(express.static(path.join(__dirname, "public")));

/* WEBHOOK */
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

app.get("/health", (req, res) => {
  res.send("OK");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🔥 Server started on port ${PORT}`);
});