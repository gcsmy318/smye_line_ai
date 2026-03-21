const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_SETTINGS = {
  mon12: false,
  sun1130: false,
  sun9: false,
  stats8: false,
  sat15: false,
  fri12: false
};

const runUpdate = async () => {
  const snapshot = await db
    .collection("groups") // ✅ จากรูปคือ groups
    .where("type", "==", "general")
    .get();

  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // 🔥 merge ของเก่า + ของใหม่
    const newSettings = {
      ...DEFAULT_SETTINGS,
      ...(data.generalSettings || {})
    };

    batch.set(doc.ref, { generalSettings: newSettings }, { merge: true });

    console.log("update:", doc.id);

    count++;

    if (count === 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log("✅ เสร็จทั้งหมด");
};

runUpdate().catch(console.error);