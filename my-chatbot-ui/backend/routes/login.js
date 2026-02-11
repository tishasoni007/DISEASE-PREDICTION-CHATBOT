const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) return res.json({ success: false, message: "DB error" });

      if (results.length === 0)
        return res.json({ success: false, message: "User not found" });

      if (results[0].is_active === 0)
        return res.json({ success: false, message: "Account deactivated" });

      if (results[0].password !== password)
        return res.json({ success: false, message: "Wrong password" });

      res.json({
        success: true,
        user: {
          name: results[0].name,
          email: results[0].email,
        },
      });
    }
  );
});

module.exports = router;
