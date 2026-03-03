const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanModules() {

  const snapshot = await db.collection("groups").get();

  for (const doc of snapshot.docs) {

    console.log("Cleaning:", doc.id);

    await doc.ref.update({
      "modules.province": admin.firestore.FieldValue.delete(),
      "modules.hatyai": admin.firestore.FieldValue.delete()
    });

  }

  console.log("✅ Clean complete");
  process.exit();
}

cleanModules();