const { client } = require("../config/line");

const queue = [];
let running = false;

const RATE_LIMIT = 3000; // 3 sec / message
const RETRY_DELAY = 15000;

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

  while (queue.length > 0) {

    const job = queue.shift();

    try {

      console.log("📤 sending:", job.to);

      await client.pushMessage(job.to, job.message);  // ⭐ แก้ตรงนี้

      console.log("📨 sent:", job.to);

    } catch (err) {

      console.error("Push error:", err.statusCode, err.message);

      if (err.statusCode === 429) {

        console.log("⚠ 429 hit → wait 15s");

        await wait(RETRY_DELAY);

        queue.unshift(job);

        continue;

      }

      if (err.statusCode === 403) {

        console.log("❌ bot not in group:", job.to);

      }

    }

    await wait(RATE_LIMIT);

  }

  running = false;

  console.log("✅ queue finished");

}

function push(to, message) {

  if (!to) {
    console.log("⚠ queue skip: target undefined");
    return;
  }

  queue.push({ to, message });
  console.log("📥 queue add:", to, "queueSize:", queue.length);
  processQueue();
}

module.exports = { push, isBusy };