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

  return db;
}

function getDB() {
  if (!db) {
    throw new Error("Firestore not initialized. Call initFirebase() first.");
  }
  return db;
}

module.exports = {
  initFirebase,
  getDB
};