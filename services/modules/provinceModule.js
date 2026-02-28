const { reply } = require("../../config/line");

async function handle(event) {
  const text = event.message.text.trim();

  const provinces = [
    "สงขลา","สตูล","ปัตตานี",
    "ยะลา","นราธิวาส","พัทลุง"
  ];

  for (const p of provinces) {
    if (text === `${p} ส่งสถิติแล้ว`) {
      return reply(event.replyToken,
`ขอบคุณ${p} ส่งสถิติแล้ว`);
    }
  }
}

module.exports = { handle };