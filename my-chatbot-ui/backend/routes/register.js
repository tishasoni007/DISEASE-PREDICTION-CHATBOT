const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, password, region, phone, age } = req.body;

  if (!name || !email || !password || !region) {
    return res.json({ success: false, message: "All required fields needed" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (result.length > 0) {
      return res.json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, region, phone, age) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, region, phone, age],
      (err) => {
        if (err) return res.json({ success: false, message: "Insert failed" });
        res.json({ success: true });
      }
    );
  });
});

module.exports = router;
