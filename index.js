require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

// เปิดให้ serve public folder
app.use(express.static(path.join(__dirname, "public")));

// webhook
app.post("/webhook", ...);

app.listen(process.env.PORT || 8080);