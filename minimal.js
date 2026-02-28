require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const { middleware } = require("@line/bot-sdk");

const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");
const { startProvinceScheduler } = require("./services/provinceScheduler");

const app = express();
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/admin", adminRoutes);
app.use(express.static("public"));
initFirebase();
startProvinceScheduler();

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {

    const events = req.body.events;

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        try {
          await handleMessage(event);
        } catch (err) {
          console.error("WEBHOOK ERROR:", err);
        }
      }
    }

    res.sendStatus(200);
  }
);

app.get("/ping", (req, res) => {
  res.status(200).send("ฉันตื่นอยู่");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});