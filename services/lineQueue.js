const { client } = require("../config/line");

const queue = [];
let running = false;

const RATE_LIMIT = 10000; // ⭐ เว้น 10 วินาที ต่อข้อความ
const RETRY_DELAY = 60000;
const sentCache = new Map();
const DUPLICATE_TTL = 60 * 1000; // กันซ้ำ 1 นาที


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

  await wait(10000); // ⭐ เพิ่มเวลารอก่อนส่งครั้งแรก (เดิม 5s)

  while (queue.length > 0) {

    const job = queue.shift();

    try {

      await wait(2000); // ⭐ เพิ่ม delay เล็กน้อยก่อน push จริง

      console.log("📤 sending:", job.to);

      await client.pushMessage(job.to, job.message);

      console.log("📨 sent:", job.to);

    } catch (err) {

      console.error("Push error:", err.statusCode, err.message);

     if (err.statusCode === 429) {
        console.log("⚠ 429 monthly quota exceeded → drop old job");
        continue;
      }

    }

    await wait(RATE_LIMIT);

  }

  running = false;

  console.log("✅ queue finished");

}
/*
function push(to, message) {
  if (!to) return;

  // 🔍 ตรวจสอบว่ามี job เดียวกันใน queue แล้วหรือยัง
  const exists = queue.some(job =>
    job.to === to &&
    job.message.type === message.type &&
    job.message.text === message.text // เพิ่มเฉพาะกรณีข้อความเป็น text
  );

  if (exists) {
    console.log("⚠ duplicate job ignored:", to);
    return;
  }

  queue.push({ to, message });
  console.log("📥 queue add:", to, "queueSize:", queue.length);

  if (!running) {
    processQueue();
  }
}*/
function push(to, message) {
  if (!to) return;

  const text = message?.text || "";
  const key = `${to}_${message.type}_${text}`;

  const now = Date.now();

  // 🔥 เช็คเคยส่งไปแล้วไหม
  if (sentCache.has(key)) {
    const lastTime = sentCache.get(key);

    if (now - lastTime < DUPLICATE_TTL) {
      console.log("⚠ duplicate (sentCache) ignored:", to);
      return;
    }
  }

  // 🔥 บันทึกว่าเคยส่งแล้ว
  sentCache.set(key, now);

  // 🔥 เคลียร์ cache อัตโนมัติ
  setTimeout(() => {
    sentCache.delete(key);
  }, DUPLICATE_TTL);

  // 🔍 ตรวจสอบ queue เดิม
  const exists = queue.some(job =>
    job.to === to &&
    job.message.type === message.type &&
    (job.message.text || "") === text
  );

  if (exists) {
    console.log("⚠ duplicate job ignored:", to);
    return;
  }

  queue.push({ to, message });
  console.log("📥 queue add:", to, "queueSize:", queue.length);

  if (!running) {
    processQueue();
  }
}
module.exports = { push, isBusy };
