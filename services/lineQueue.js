const { client } = require("../config/line");

const queue = [];
let running = false;

const RATE_LIMIT = 3000; // ⭐ 3 วิ ต่อ 1 message

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBusy() {
  return running || queue.length > 0;
}

async function processQueue() {

  if (running) return;
  running = true;

  console.log("🚀 queue start");

  while (queue.length > 0) {

    const job = queue.shift();

    try {

      await client.pushMessage(job.to, job.message);

      console.log("📨 sent:", job.to);

    } catch (err) {

      if (err.statusCode === 429) {

        console.log("⚠ 429 hit, waiting 15s...");
        await wait(15000);

        queue.unshift(job);
        continue;

      } else {

        console.error("Push error:", err.message);

      }

    }

    await wait(RATE_LIMIT);

  }

  running = false;

  console.log("✅ queue finished");

}

function push(to, message) {

  queue.push({ to, message });

  console.log("📥 queue add:", to, "queueSize:", queue.length);

  processQueue();

}

module.exports = { push, isBusy };