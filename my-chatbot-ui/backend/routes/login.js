const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");

const router = express.Router();

router.post("/", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (results.length === 0)
      return res.json({ success: false, message: "User not found" });

    if (results[0].is_active === 0)
      return res.json({ success: false, message: "Account deactivated" });

    const match = await bcrypt.compare(password, results[0].password);

    if (!match)
      return res.json({ success: false, message: "Wrong password" });

    res.json({
      success: true,
      user: {
        name: results[0].name,
        email: results[0].email,
        region: results[0].region,
        phone: results[0].phone,
        age: results[0].age
      }
    });
  });
});

module.exports = router;
