const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "tis#1406",
  database: "shopsphere_db",
});

router.post("/", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) return res.json({ success: false, message: "DB error" });

      if (result.length > 0)
        return res.json({ success: false, message: "Email already exists" });

      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, password],
        (err) => {
          if (err)
            return res.json({ success: false, message: "Insert failed" });

          res.json({ success: true });
        }
      );
    }
  );
});

module.exports = router;
