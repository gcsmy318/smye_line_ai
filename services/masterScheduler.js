const cron = require("node-cron");
const { getDB } = require("../config/firebase");
const { push } = require("../config/line");

function startMasterScheduler() {

  cron.schedule("0 8 * * *", async () => {
    console.log("Daily scheduler running...");
  }, { timezone: "Asia/Bangkok" });

}

module.exports = { startMasterScheduler };
