# 🤖 Spirit AI - LINE Bot Automation System

Spirit AI คือระบบ LINE Bot สำหรับจัดการงานภายในกลุ่ม เช่น:

- 📊 รายงานจังหวัด
- 📊 สถิติหาดใหญ่
- ⏰ แจ้งเตือนล่วงหน้า
- 📝 บันทึกถาวร
- 📘 รายงานการรับใช้
- 👤 ระบบทะเบียนสมาชิก
- 📌 Admin Panel

---

# 🚀 ความสามารถของระบบ

## 1️⃣ ระบบรายงานจังหวัด (เซ็ต1)
แจ้งเตือน: อา จ อ ศ เวลา 08:00  
จังหวัด:
- สงขลา
- สตูล
- ปัตตานี
- ยะลา
- นราธิวาส
- พัทลุง

พิมพ์:
```
สงขลา ส่งสถิติแล้ว
```

---

## 2️⃣ ระบบสถิติหาดใหญ่ (เซ็ต2)

แจ้งเตือนทุกวันอาทิตย์ 13:00

พิมพ์:
```
pro=20
pro=20 stb=10
```

---

## 3️⃣ ระบบแจ้งเตือนล่วงหน้า (เซ็ต3)

พิมพ์:
```
แจ้งเตือน ค่าย 1/3/2569
```

ระบบจะเตือนก่อน 3 วัน เวลา 08:00

---

## 4️⃣ ระบบบันทึกถาวร (เซ็ต4)

พิมพ์:
```
บันทึกลา สมาย 12/03/2026
```

---

## 5️⃣ ระบบรายงานการรับใช้ (เซ็ต5)

พิมพ์:
```
รายงานการรับใช้ วันนี้ไปดูแลคน
```

---

## 6️⃣ ระบบทะเบียนสมาชิก (เซ็ต6)

พิมพ์:
```
ลงทะเบียน สมาย 19/10/1993 เบอร์โทร...
```

---

# 🧠 วิธีเปิดระบบในกลุ่ม

ต้องพิมพ์:

```
Smile เซ็ต1
Smile เซ็ต2
Smile เซ็ต7
```

---

# 📖 คำสั่งช่วยเหลือ

```
help
help 1
help 2
```

---

# 🛠 การติดตั้ง

## 1. ติดตั้ง package

```
npm install
```

## 2. ตั้งค่า .env

```
LINE_CHANNEL_SECRET=xxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxx
PORT=8080
```

## 3. รันระบบ

```
node index.js
```

---

# 🌍 Deploy บน Render

1. สร้าง Web Service
2. Build Command:
```
npm install
```
3. Start Command:
```
node index.js
```
4. ใส่ Environment Variables
5. ตั้ง Webhook URL:
```
https://your-app.onrender.com/webhook
```

---

# 🛡 ป้องกัน Render Sleep

เพิ่มใน index.js:

```js
app.get("/health", (req, res) => {
  res.send("OK");
});
```

ใช้ UptimeRobot ยิง:
```
https://your-app.onrender.com/health
```

ทุก 5 นาที

---

# 🗄 Firestore Structure

Collection:

```
groups/
   groupId
```

Document:

```json
{
  "type": "general",
  "modules": {
    "province": true,
    "hatyai": false
  }
}
```

---

# 🧑‍💻 Admin Panel

เข้า:
```
https://your-app.onrender.com/admin.html
```

สามารถ:
- ดูว่าบอทอยู่กลุ่มไหน
- ดู module ที่เปิด
- ลบกลุ่ม

---

# 🏆 Stability

✔ ป้องกัน event พัง  
✔ ป้องกัน module พัง  
✔ ป้องกัน reply error  
✔ ใช้ Production ได้  