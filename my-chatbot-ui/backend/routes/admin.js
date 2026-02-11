const express = require("express");
const db = require("../db");

const router = express.Router();


router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.json({ success: false, message: "Email and password required" });
  }

  db.query(
    "SELECT * FROM admin WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Admin login DB error:", err);
        return res.json({
          success: false,
          message: "DB error",
          error: err.code || err.message,
        });
      }

      if (results.length === 0)
        return res.json({ success: false, message: "Admin not found" });

      if (results[0].password !== password)
        return res.json({ success: false, message: "Wrong password" });

      res.json({
        success: true,
        admin: {
          name: results[0].name,
          email: results[0].email,
        },
      });
    }
  );
});

router.get("/users", (req, res) => {
  const query =
    "SELECT u.name, u.email, u.is_active, " +
    "COUNT(c.id) AS chat_count, MAX(c.created_at) AS last_message_at " +
    "FROM users u " +
    "LEFT JOIN chat_messages c ON c.user_email = u.email " +
    "GROUP BY u.name, u.email, u.is_active " +
    "ORDER BY last_message_at DESC";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Admin users DB error:", err);
      return res.json({
        success: false,
        message: "DB error",
        error: err.code || err.message,
      });
    }
    res.json({ success: true, users: results });
  });
});

router.get("/users/:email", (req, res) => {
  const { email } = req.params;

  db.query(
    "SELECT name, email, is_active FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        console.error("Admin user detail DB error:", err);
        return res.json({
          success: false,
          message: "DB error",
          error: err.code || err.message,
        });
      }
      if (results.length === 0)
        return res.json({ success: false, message: "User not found" });

      res.json({ success: true, user: results[0] });
    }
  );
});

router.get("/users/:email/chats", (req, res) => {
  const { email } = req.params;
  const limit = Number.parseInt(req.query.limit, 10) || 200;

  db.query(
    "SELECT id, sender, message, created_at FROM chat_messages WHERE user_email = ? ORDER BY created_at DESC LIMIT ?",
    [email, limit],
    (err, results) => {
      if (err) {
        console.error("Admin chat list DB error:", err);
        return res.json({
          success: false,
          message: "DB error",
          error: err.code || err.message,
        });
      }
      res.json({ success: true, chats: results });
    }
  );
});

router.patch("/users/:email/deactivate", (req, res) => {
  const { email } = req.params;

  db.query(
    "UPDATE users SET is_active = 0 WHERE email = ?",
    [email],
    (err, result) => {
      if (err) {
        console.error("Admin deactivate DB error:", err);
        return res.json({
          success: false,
          message: "DB error",
          error: err.code || err.message,
        });
      }
      if (result.affectedRows === 0)
        return res.json({ success: false, message: "User not found" });

      res.json({ success: true });
    }
  );
});

router.patch("/users/:email/activate", (req, res) => {
  const { email } = req.params;

  db.query(
    "UPDATE users SET is_active = 1 WHERE email = ?",
    [email],
    (err, result) => {
      if (err) {
        console.error("Admin activate DB error:", err);
        return res.json({
          success: false,
          message: "DB error",
          error: err.code || err.message,
        });
      }
      if (result.affectedRows === 0)
        return res.json({ success: false, message: "User not found" });

      res.json({ success: true });
    }
  );
});

module.exports = router;
