const { google } = require("googleapis");

/* =========================================
   ๅ
========================================= */

const provinces = {
  "พัทลุง": ["อ.เก๋", "พี่รัตน์"],
  "สงขลา": ["อ.ดิว", "พี่รุ้ง", "พี่อัลฟ่า"],
  "สตูล": ["อ.เช้าตรู่", "อ.เดช"],
  "นรา": ["อ.ดอน"],
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

function formatThaiDate(date) {
  return date.toLocaleDateString("th-TH");
}

/* =========================================
   MAIN CHECK
========================================= */

async function checkStatSheet() {

  try {

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
      range: "Sheet1!A1:Z500"
    });

    const rows = res.data.values || [];

    const today = formatThaiDate(getThaiNow());

    const missingProvince = {};
    const provinceList = [];

    for (let i = 1; i < rows.length; i++) {

      const row = rows[i];

      const date = row[0];
      const name = row[1];
      const status = row[2];

      if (!date || !name) continue;

      if (date === today && status === "x") {

        for (const province in provinces) {

          if (provinces[province].includes(name)) {

            if (!missingProvince[province]) {
              missingProvince[province] = [];
            }

            missingProvince[province].push(name);

            if (!provinceList.includes(province)) {
              provinceList.push(province);
            }

          }

        }

      }

    }

    return {
      provinces: provinceList,
      detail: missingProvince
    };

  } catch (err) {

    console.error("checkStatSheet error:", err);

    return {
      provinces: [],
      detail: {}
    };

  }

}

module.exports = {
  checkStatSheet
};