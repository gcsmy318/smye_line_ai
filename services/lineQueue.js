const { client } = require("../config/line");

const queue = [];
let running = false;

const RATE_LIMIT = 10000; // ⭐ 5 วินาที ต่อข้อความ
const RETRY_DELAY = 60000;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function isBusy() {
  return running || queue.length > 0;
}

async function processQueue() {

  if (running) return;

  running = true;

  console.log("🚀 queue start");

  await wait(5000); // ⭐ รอก่อนส่งข้อความแรก

  while (queue.length > 0) {

    const job = queue.shift();

    try {

      console.log("📤 sending:", job.to);

      await client.pushMessage(job.to, job.message);

      console.log("📨 sent:", job.to);

    } catch (err) {

      console.error("Push error:", err.statusCode, err.message);

      if (err.statusCode === 429) {

        console.log("⚠ 429 hit → wait 60s");

        await wait(RETRY_DELAY);

        queue.unshift(job);

        continue;

      }

    }

    await wait(RATE_LIMIT);

  }

  running = false;

  console.log("✅ queue finished");

}

function push(to, message) {

  if (!to) return;

  queue.push({ to, message });

  console.log("📥 queue add:", to, "queueSize:", queue.length);

  if (!running) {
    processQueue();
  }

}

module.exports = { push, isBusy };