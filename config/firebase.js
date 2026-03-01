const admin = require("firebase-admin");

let db;

function initFirebase() {
  if (!admin.apps.length) {
    console.log("🔥 Initializing Firebase...");

    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      ),
    });

    db = admin.firestore();
  }
}

module.exports = { initFirebase, db };