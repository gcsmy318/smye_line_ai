const { getDB } = require("../../config/firebase");
const { reply } = require("../../config/line");

/* ===============================
   แปลงวันเกิด → ค.ศ.
================================= */
function convertToAD(dateStr) {
  if (!dateStr) return "";

  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";

  let [d, m, y] = parts.map(s => s.trim());

  d = parseInt(d);
  m = parseInt(m);
  y = parseInt(y);

  if (y > 2400) y -= 543;
  if (y < 100) y = 2000 + y;

  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

async function handle(event) {
  if (!event.message || event.message.type !== "text") return false;

  const text = event.message.text.trim();
  const groupId = event.source.groupId || event.source.userId;
  const db = getDB();

  /* ===============================
     ลงทะเบียน
  ================================ */
  if (text.startsWith("ลงทะเบียน")) {

    const eventId = event.webhookEventId;

    const dupEvent = await db
      .collection("registry")
      .where("eventId","==",eventId)
      .get();

    if (!dupEvent.empty) return false;

    const raw = text.replace("ลงทะเบียน","").trim();
    const parts = raw.split(/\s+/);

    if (parts.length < 6) {
      return reply(event.replyToken,"รูปแบบไม่ถูกต้อง");
    }

    const [firstName,lastName,nickName,birthDate,care,phone] = parts;

    const birthAD = convertToAD(birthDate);

    const exist = await db.collection("registry")
      .where("groupId","==",groupId)
      .where("firstName","==",firstName)
      .where("lastName","==",lastName)
      .where("birthDate","==",birthAD)
      .get();

    if (!exist.empty) {
      return reply(event.replyToken,"มีข้อมูลนี้อยู่แล้ว");
    }

    await db.collection("registry").add({
      groupId,
      firstName,
      lastName,
      nickName,
      birthDate: birthAD,
      care,
      phone,
      createdAt: new Date(),
      eventId
    });

    return reply(event.replyToken,"ลงทะเบียนเรียบร้อย ✅");
  }

  /* ===============================
     คนเกิดเดือน X
  ================================ */
  if (text.startsWith("คนเกิดเดือน")) {

    const month = parseInt(text.replace("คนเกิดเดือน","").trim());

    const snapshot = await db.collection("registry")
      .where("groupId","==",groupId)
      .get();

    let result = [];

    snapshot.forEach(doc=>{
      const d = doc.data();
      if (!d.birthDate) return;

      const split = d.birthDate.split("/");
      const m = parseInt(split[1]);

      if (m === month) {
        result.push(`${d.firstName} (${d.nickName}) - ${d.birthDate}`);
      }
    });

    if (result.length === 0) {
      return reply(event.replyToken,"ไม่พบข้อมูล");
    }

    return reply(event.replyToken,
      `🎂 คนเกิดเดือน ${month}\n\n${result.join("\n")}`
    );
  }

  return false;
}

module.exports = { handle };