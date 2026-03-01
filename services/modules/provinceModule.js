const { db } = require("../../config/firebase");

const PROVINCES = [
  "สงขลา",
  "สตูล",
  "ปัตตานี",
  "ยะลา",
  "นราธิวาส",
  "พัทลุง"
];

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${year}-W${week}`;
}

function formatThaiDate(date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

async function handleProvinceMessage(text, groupId) {

  const province = PROVINCES.find(p => text.startsWith(p));
  if (!province || !text.includes("ส่งสถิติแล้ว")) return null;

  const today = getThaiNow();
  const weekKey = getWeekKey(today);
  const dateKey = today.toISOString().split("T")[0];

  const docRef = db
    .collection("provinceReports")
    .doc(weekKey)
    .collection("days")
    .doc(dateKey);

  const doc = await docRef.get();

  let data;

  if (!doc.exists) {
    data = {
      provinces: PROVINCES.reduce((acc, p) => {
        acc[p] = false;
        return acc;
      }, {})
    };
  } else {
    data = doc.data();
  }

  data.provinces[province] = true;

  await docRef.set(data);

  let message =
    `ขอบคุณ${province} ส่งสถิติแล้ว ${formatThaiDate(today)}\n\n`;

  PROVINCES.forEach(p => {
    if (data.provinces[p]) {
      message += `-${p} (ส่งสถิติแล้ว)\n`;
    } else {
      message += `-${p}\n`;
    }
  });

  return message;
}

module.exports = { handleProvinceMessage };