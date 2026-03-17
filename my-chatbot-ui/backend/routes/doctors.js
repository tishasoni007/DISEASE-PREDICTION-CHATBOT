const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/user/:email", (req, res) => {
  const { email } = req.params;

  db.query(
    "SELECT region FROM users WHERE email = ?",
    [email],
    (err, userResult) => {
      if (err) return res.json({ success: false });

      if (userResult.length === 0)
        return res.json({ success: false });

      const region = userResult[0].region;

      db.query(
        "SELECT id, name, hospital, specialization, contact FROM doctors WHERE region = ? ORDER BY name ASC",
        [region],
        (err, doctors) => {
          if (err) return res.json({ success: false });

          res.json({
            success: true,
            doctors
          });
        }
      );
    }
  );
});

module.exports = router;
