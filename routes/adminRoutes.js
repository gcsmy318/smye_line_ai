const express = require("express");
const { getDB } = require("../config/firebase");

const router = express.Router();

router.get("/groups", async (req, res) => {
  const db = getDB();
  const snap = await db.collection("groups").get();

  const groups = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  res.json(groups);
});

router.get("/province-status/:groupId", async (req, res) => {
  const db = getDB();
  const { groupId } = req.params;

  const weekKey = getWeekKey();
  const docId = `${weekKey}_${groupId}`;

  const doc = await db.collection("weeklyProvinceStats").doc(docId).get();

  res.json(doc.exists ? doc.data() : {});
});

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

module.exports = router;