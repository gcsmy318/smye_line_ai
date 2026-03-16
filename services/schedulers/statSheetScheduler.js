const cron = require("node-cron");
const { client } = require("../../config/line");
const { checkStatSheet } = require("../modules/statSheetChecker");

/* =========================================
   START SCHEDULER
========================================= */

function startStatSheetScheduler(groupId) {

  console.log("📊 STAT SCHEDULER INITIALIZED →", groupId);

  cron.schedule("0 9 * * 0,1,3,5", async () => {

    try {

      console.log("📊 STAT SCHEDULER RUN →", groupId);

      const result = await checkStatSheet();

      if (!result || result.provinces.length === 0) {
        console.log("✅ ทุกจังหวัดส่งสถิติแล้ว");
        return;
      }

      let msg = "⚠️ จังหวัดที่ยังไม่ส่งสถิติ\n\n";

      for (const province in result.detail) {

        const owners = result.detail[province].owners;
        const dates = result.detail[province].dates;

        msg += `${province} (${owners.join(" ")})\n`;

        dates.forEach(d => {
          msg += `- ${d}\n`;
        });

        msg += "\n";

      }

      await client.pushMessage(groupId, {
        type: "text",
        text: msg
      });

      console.log("✅ STAT MESSAGE SENT →", groupId);

    } catch (err) {

      console.error("stat scheduler error", err);

    }

  }, { timezone: "Asia/Bangkok" });

}

module.exports = {
  startStatSheetScheduler
};