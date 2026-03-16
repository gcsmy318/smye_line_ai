const { google } = require("googleapis");

/* =========================================
   ผู้รับผิดชอบ
========================================= */

const provinces = {
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
    range: "A1:Z200"
  });

  const rows = res.data.values || [];

  const today = getThaiNow();

  const result = {};

  const header = rows[2];

  const dateColumns = [];

  for (let c = 4; c < header.length; c++) {

    const date = parseSheetDate(header[c]);

    if (!date) continue;

    if (date <= today) {

      dateColumns.push({
        col: c,
        label: header[c]
      });

    }

  }

  for (let r = 3; r < rows.length; r++) {

    const row = rows[r];
    const province = row[1];

    if (!province) continue;

    for (const d of dateColumns) {

      const value = row[d.col];

      if (!value) continue;

      const clean = value.toString().trim().toUpperCase();

      if (clean === "X") {

        if (!result[province]) {
          result[province] = [];
        }

        result[province].push(d.label);

      }

    }

  }

  const provincesList = [];
  const detail = {};

  for (const province in result) {

    provincesList.push(province);

    detail[province] = {
      owners: provinces[province] || [],
      dates: result[province]
    };

  }

  return {
    provinces: provincesList,
    detail
  };

}

module.exports = {
  checkStatSheet
};