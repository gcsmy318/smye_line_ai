const { client } = require("../config/line");

const queue = [];
let running = false;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue() {

  if (running) return;
  running = true;

  while (queue.length > 0) {

    const job = queue.shift();

    try {

      await client.pushMessage(job.to, job.message);

      console.log("📨 sent:", job.to);

    } catch (err) {

      if (err.statusCode === 429) {

        console.log("⚠ 429 hit, waiting...");
        await wait(8000);

        queue.unshift(job);
        continue;

      } else {

        console.error("Push error:", err.message);

      }

    }

    await wait(1500);   // ⭐ throttle เพิ่ม

  }

  running = false;

}

function push(to, message) {

  queue.push({ to, message });
  processQueue();

}

module.exports = { push };