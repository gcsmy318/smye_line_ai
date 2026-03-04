const { client } = require("../config/line");

const queue = [];
let running = false;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* 🔧 เพิ่มเพื่อให้ groupService เช็คว่า queue กำลังทำงานอยู่ไหม */
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

      queue.push(job.to, job.message);

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

    await wait(1500); // throttle

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