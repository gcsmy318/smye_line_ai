const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // ใส่ path key ของคุณ

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/* ===============================
   แปลง string dd/mm/yyyy → Date
================================= */
function parseThaiDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  let day = parseInt(match[1]);
  let month = parseInt(match[2]) - 1;
  let year = parseInt(match[3]);

  if (year > 2400) year -= 543;

  return new Date(year, month, day, 7, 0, 0); // ตั้งเวลา 07:00
}

/* ===============================
   MIGRATE
================================= */
async function migrate() {

  const snapshot = await db.collection("reminders").get();

  for (const doc of snapshot.docs) {

    const data = doc.data();

    // ถ้ามี targetDate อยู่แล้ว = ข้าม
    if (data.targetDate) continue;

    if (!data.date) continue;

    const parsed = parseThaiDate(data.date);
    if (!parsed) continue;

    await doc.ref.update({
      originalDate: data.date,
      targetDate: parsed,
      createdAt: new Date()
    });

    console.log("Updated:", doc.id);
  }

  console.log("Migration complete.");
  process.exit();
}

migrate();