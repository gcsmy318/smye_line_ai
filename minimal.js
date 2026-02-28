
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { middleware } = require("@line/bot-sdk");
const { initFirebase } = require("./config/firebase");
const { handleMessage } = require("./services/groupService");
const { startAllSchedulers } = require("./services/schedulers/masterScheduler");

const app = express();
initFirebase();
startAllSchedulers();

app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  middleware({ channelSecret: process.env.LINE_CHANNEL_SECRET }),
  async (req, res) => {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        await handleMessage(event);
      }
    }
    res.sendStatus(200);
  }
);

app.get("/ping", (req, res) => res.send("Spirit AI Production Running"));

app.listen(process.env.PORT || 8080);
