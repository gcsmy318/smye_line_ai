const { google } = require("googleapis");

const provinces = {
  "พัทลุง": ["อ.เก๋", "พี่รัตน์"],
  "สงขลา": ["อ.ดิว", "พี่รุ้ง", "พี่อัลฟ่า"],
  "สตูล": ["อ.เช้าตรู่", "อ.เดช"],
  "นรา": ["อ.ดอน"],
  "ยะลา": ["พี่ทิม"],
  "ปัตตานี": ["พี่ฝน"]
};

async function checkStat(sheets) {

  const spreadsheetId = "1mjRq5Nj5DCQwZTPrqyMdC0Fge-V3OF-EsQOkiW9vKIQ";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A1:Z200"
  });

  const rows = res.data.values;

  const today = new Date().toLocaleDateString("th-TH");

  const missingProvince = new Set();

  for (let i = 1; i < rows.length; i++) {

    const row = rows[i];

    const date = row[0];
    const name = row[1];
    const status = row[2];

    if (date === today && status === "x") {

      for (const province in provinces) {
        if (provinces[province].includes(name)) {
          missingProvince.add(province);
        }
      }

    }

  }

  return [...missingProvince];

}

module.exports = { checkStat };