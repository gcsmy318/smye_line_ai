const cron = require("node-cron");
const { client } = require("../../config/line");
const { checkStatSheet } = require("../modules/statSheetChecker");

const STAT_GROUP = "C094d3624ddb25a8158cd5b992d58bdaa";

/* =========================================
   START SCHEDULER
========================================= */

function startStatScheduler() {

  cron.schedule("0 8 * * 0,1,3,5", async () => {

    try {

      console.log("📊 STAT SCHEDULER RUN");

      const result = await checkStatSheet();

      if (!result || result.provinces.length === 0) {
        console.log("✅ ทุกจังหวัดส่งสถิติแล้ว");
        return;
      }

      let msg = "⚠️ จังหวัดที่ยังไม่ส่งสถิติ\n\n";

      for (const province in result.detail) {

        msg += province + "\n";

        result.detail[province].forEach(name => {
          msg += "- " + name + "\n";
        });

        msg += "\n";

      }

      await client.pushMessage(STAT_GROUP, {
        type: "text",
        text: msg
      });

      console.log("✅ STAT MESSAGE SENT");

    } catch (err) {

      console.error("stat scheduler error", err);

    }

  });

}

module.exports = {
  startStatScheduler
};