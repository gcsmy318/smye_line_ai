const cron = require("node-cron");
const { getDB } = require("../config/firebase");
const { push } = require("../config/line");
const { buildProvinceMessage } = require("./provinceService");

function startProvinceScheduler() {

  cron.schedule("0 8 * * 0,1,2,5", async () => {

    try {
      const db = getDB();
      const todayKey = getTodayKey();

      const groups = await db.collection("groups")
        .where("type", "==", "province")
        .get();

      for (const doc of groups.docs) {

        const groupId = doc.id;
        const group = doc.data();

        const logId = `${todayKey}_${groupId}_province`;
        const logRef = db.collection("schedulerLogs").doc(logId);
        const logDoc = await logRef.get();

        // 🔒 กันยิงซ้ำ
        if (logDoc.exists) {
          console.log("Already sent today:", groupId);
          continue;
        }

        const message = await buildProvinceMessage(groupId, group);

        await push(groupId, message);

        // บันทึกว่าได้ยิงแล้ว
        await logRef.set({
          groupId,
          type: "province",
          sentAt: new Date()
        });

        console.log("Province reminder sent:", groupId);
      }

    } catch (err) {
      console.error("Scheduler Error:", err);
    }

  }, {
    timezone: "Asia/Bangkok"
  });

}

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Bangkok"
  });
}

module.exports = { startProvinceScheduler };