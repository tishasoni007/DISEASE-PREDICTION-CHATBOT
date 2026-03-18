const express = require("express");
const db = require("../db");

const router = express.Router();

/* ===============================
   CREATE NEW SESSION
=============================== */
router.post("/new", (req, res) => {
  const { userEmail } = req.body;

  if (!userEmail)
    return res.json({ success: false, message: "User email required" });

  db.query(
    "INSERT INTO chat_sessions (user_email, title) VALUES (?, ?)",
    [userEmail, "New Chat"],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      res.json({
        success: true,
        sessionId: result.insertId
      });
    }
  );
});

/* ===============================
   GET SESSION MESSAGES (PUT FIRST!)
=============================== */
router.get("/messages/:sessionId", (req, res) => {
  db.query(
    "SELECT sender, message FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
    [req.params.sessionId],
    (err, messages) => {
      if (err) return res.json({ success: false });

      res.json({ success: true, messages });
    }
  );
});

/* ===============================
   GET USER SESSIONS
=============================== */
router.get("/:email", (req, res) => {
  const query = `
    SELECT 
      s.id,
      s.title,
      MAX(m.created_at) AS last_message_time
    FROM chat_sessions s
    LEFT JOIN chat_messages m ON s.id = m.session_id
    WHERE s.user_email = ?
    GROUP BY s.id
    ORDER BY last_message_time DESC
  `;

  db.query(query, [req.params.email], (err, sessions) => {
    if (err) return res.json({ success: false });

    res.json({ success: true, sessions });
  });
});

/* ===============================
   DELETE SESSION
=============================== */
router.delete("/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const userEmail = (req.body && req.body.userEmail) || req.query.userEmail;

  if (!sessionId || !userEmail) {
    return res.json({ success: false, message: "sessionId and userEmail are required" });
  }

  db.query(
    "DELETE FROM chat_messages WHERE session_id = ?",
    [sessionId],
    (messagesErr) => {
      if (messagesErr) {
        console.error(messagesErr);
        return res.json({ success: false, message: "Unable to delete session messages" });
      }

      db.query(
        "DELETE FROM chat_sessions WHERE id = ? AND user_email = ?",
        [sessionId, userEmail],
        (sessionErr, result) => {
          if (sessionErr) {
            console.error(sessionErr);
            return res.json({ success: false, message: "Unable to delete session" });
          }

          if (result.affectedRows === 0) {
            return res.json({ success: false, message: "Session not found" });
          }

          return res.json({ success: true, message: "Session deleted" });
        }
      );
    }
  );
});

module.exports = router;
