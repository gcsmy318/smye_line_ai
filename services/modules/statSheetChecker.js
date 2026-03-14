const { google } = require("googleapis");

/* =========================================
   ผู้รับผิดชอบ
========================================= */

const provinceOwners = {
  "พัทลุง": ["อ.เก๋", "พี่รัตน์"],
  "สงขลา": ["อ.ดิว", "พี่รุ้ง", "พี่อัลฟ่า"],
  "สตูล": ["อ.เช้าตรู่", "อ.เดช"],
  "นราธิวาส": ["อ.ดอน"],
  "ยะลา": ["พี่ทิม"],
  "ปัตตานี": ["พี่ฝน"]
};

/* =========================================
   TIME
========================================= */

function getThaiNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}

/* =========================================
   DATE PARSER
========================================= */

function parseSheetDate(text) {

  if (!text) return null;

  const parts = text.split("/");

  if (parts.length !== 2) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);

  const year = getThaiNow().getFullYear();

  return new Date(year, month - 1, day);

}

/* =========================================
   MAIN
========================================= */

async function checkStatSheet() {

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  const spreadsheetId = "1mjRq5Nj5DCQwZTPrqyMdC0Fge-V3OF-EsQOkiW9vKIQ";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ใต้ 5'"
  });

  const rows = res.data.values || [];

  console.log("================================");
  console.log("📊 STAT SHEET DEBUG");
  console.log("ROWS =", rows.length);
  console.log("ROW0 =", rows[0]);
  console.log("ROW1 =", rows[1]);
  console.log("ROW2 =", rows[2]);
  console.log("ROW3 =", rows[3]);
  console.log("================================");

  const today = getThaiNow();

  const result = {};

  /* ===============================
     หา header วันที่อัตโนมัติ
  ================================ */

  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    for (const cell of row) {

      if (cell && cell.includes("/") && cell.length <= 5) {
        headerRowIndex = i;
        break;
      }

    }

    if (headerRowIndex !== -1) break;

  }

  if (headerRowIndex === -1) {
    console.log("❌ ไม่พบ header วันที่");
    return {};
  }

  console.log("HEADER ROW =", headerRowIndex);

  const header = rows[headerRowIndex];

  const dateColumns = [];

  for (let c = 0; c < header.length; c++) {

    const date = parseSheetDate(header[c]);

    if (!date) continue;

    if (date <= today) {

      dateColumns.push({
        col: c,
        label: header[c]
      });

    }

  }

  console.log("DATE COLUMNS =", dateColumns);

  /* ===============================
     ตรวจทุกจังหวัด
  ================================ */

  console.log("📊 STAT CHECK");

  for (let r = headerRowIndex + 1; r < rows.length; r++) {

    const row = rows[r];
    const province = row[0];

    if (!province) continue;

    console.log("\n" + province);

    for (const d of dateColumns) {

      const value = row[d.col];

      console.log(`${d.label} = ${value || "-"}`);

      if (!value) continue;

      if (value.toString().toUpperCase() === "X") {

        if (!result[province]) {
          result[province] = [];
        }

        result[province].push(d.label);

      }

    }

  }

  /* ===============================
     แปลงผลลัพธ์
  ================================ */

  const detail = {};

  for (const province in result) {

    const owners = provinceOwners[province] || [];

    detail[province] = {
      owners,
      dates: result[province]
    };

  }

  console.log("RESULT =", detail);

  return detail;

}

module.exports = {
  checkStatSheet
};