const { client } = require("../config/line");

const queue = [];
let running = false;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function processQueue() {

  if (running) return;
  running = true;

  while (queue.length) {

    const job = queue.shift();

    try {

      await client.pushMessage(job.to, job.message);

    } catch (err) {

      if (err.statusCode === 429) {

        console.log("⚠ 429 hit, waiting...");
        await wait(5000);

        queue.unshift(job);
        continue;

      } else {

        console.error("Push error:", err.message);

      }

    }

    await wait(900); // ⭐ throttle global

  }

  running = false;

}

function push(to, message) {

  queue.push({ to, message });
  processQueue();

}

module.exports = { push };